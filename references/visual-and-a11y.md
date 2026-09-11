# Visual evidence and accessibility

Contents: stable screenshots · Linux baselines · semantic review of PNGs · overlap guard · no-scroll guard · data-attribute assertions over pixels · axe scoping.

## Stable screenshots

```ts
await expect(page).toHaveScreenshot('capture-mobile.png', {
  animations: 'disabled', caret: 'hide',
  mask: [page.getByTestId('timestamp'), page.locator('[data-user-content]')],
  maxDiffPixelRatio: 0.01,
});
```
Before capture: `await page.waitForFunction(() => document.fonts.ready.then(() => true))`; freeze the clock with `page.clock.install`; set `reducedMotion: 'reduce'`. `stylePath` injects `templates/snapshot-freeze.css` (kills animations/transitions/carets) during capture only. `maxDiffPixelRatio` scales with viewport and is more portable than `maxDiffPixels`.

## Baselines are per browser and platform

Playwright names baselines `name-<project>-<platform>.png` (`capture-mobile-iPhone-14-linux.png`). Generate and update them on the Linux box or the pinned Docker image: `npx playwright test --update-snapshots`. Commit the `-linux.png` files; add `*-darwin.png` to `.gitignore` so a laptop run never creates a parallel truth. A "missing snapshot" on a fresh machine means you are on the wrong platform, not that the test is new.

## Read the PNG (semantic review)

Pixel diffs answer "did it change"; they cannot answer "is it right". After a visual change, the agent reads the PNGs from `test-results/` or from an explicit `page.screenshot({ path })` with the file-reading tool, at the mobile and laptop sizes, and writes one line per image on what it shows (hierarchy, clipping, overlap, wrong state). A model can also be asked pointed questions about a screenshot ("is the primary action visible without scrolling at 390x844?") as a second lane when pixel diffs are too brittle. This lane never replaces the assertion lane.

For typography changes, inspect the heading and paragraph line endings as well as
overflow. `text-wrap: balance` and `pretty` can intentionally leave space where
the next word would fit; WebKit's `pretty` can redistribute an entire paragraph.
When a wrap looks premature, inspect computed wrapping, white-space, alignment,
and actual text nodes, then compare the same element with ordinary wrapping at
the same width and font. DOM Range rectangles reveal the changed line breaks;
measure characters or individual fragments because one hyphenated word can span
lines. Choose the behavior that serves the requested reading flow, rather than
assuming a named typography feature improves it. Report font fallback when the
reference font is unavailable: matching viewports alone cannot prove identical
wrapping.

Source: chann-app, September 11, 2026 — screenshots and fold-fit checks passed,
but the user rejected early heading and paragraph wraps introduced by `balance`
and `pretty`; same-element runtime comparisons confirmed both causes.
[WebKit's paragraph-wide pretty implementation](https://webkit.org/blog/16547/better-typography-with-text-wrap-pretty/).

## Overlap guard (controls colliding)

```ts
const overlaps = await page.evaluate(() => {
  const els = [...document.querySelectorAll('input,select,button,textarea,label,[role=button]')]
    .filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
  const boxes = els.map(e => ({ e, r: e.getBoundingClientRect() }));
  const hits: string[] = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
    const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (x >= 3 && y >= 3) hits.push(`${a.e.tagName}#${a.e.id} x ${b.e.tagName}#${b.e.id}`);
  }
  return hits;
});
expect(overlaps).toEqual([]);
```
Run it on every surface at every project. It catches the states nobody eyeballed (a Time field crushed under a Repeat dropdown at desktop width, in the origin incident).

## No-scroll guard

For any surface that must not scroll (a capture screen, a canvas):
```ts
const s = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight, ih: innerHeight }));
expect(s.sh).toBeLessThanOrEqual(s.ch + 1); expect(s.sh).toBeLessThanOrEqual(s.ih + 1);
```
Run at the phone projects and at 1280x720. Headless viewports have no browser chrome, so a pass here is necessary, not sufficient, for a phone; say so in `confidence_limits`.

## Assert data attributes, not pixels, for semantic state

Highlights, badges, selected blocks, "unsaved" markers: expose `data-*` (`data-selected`, `data-save-state="synced"`) and assert those; keep the screenshot as a supplement. Pixel tests answer "rendered at all"; attribute tests answer "rendered the right thing".

## Axe scoping

Run axe on representative rendered surfaces and newly introduced controls, including dialogs
that a closed-page audit cannot inspect. Select engine/input combinations through repository
policy. Keep a large-corpus performance case separate from a whole-page accessibility scan;
automatic teardown must not multiply that scan across unrelated interaction cases. Attach
`results.violations`; keep keyboard order, Escape and focus-return assertions where those
behaviors live. Disable a rule only with its identifier and a concrete scoped reason.

Source: Thinkering, September 10, 2026 — a 2,000-note interaction passed but its automatic
whole-page axe teardown timed out in WebKit. Separate scale and representative accessibility
cases preserved both oracles and passed across the four available configurations.

Sources: https://playwright.dev/docs/test-snapshots · https://playwright.dev/docs/accessibility-testing · https://argos-ci.com/blog/playwright-visual-regression-testing-ci · pwa-that-doesnt-suck `references/verification-stack.md` (overlap guard, no-scroll, look-at-your-own-screenshots).
