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

Run axe per surface and per project once; run it on every state that adds UI (dialogs, menus) because the page-level run misses them. Attach `results.violations` to the test. Disable a rule only with the rule id, the reason and a date. Axe covers roughly a third of WCAG; keyboard-only flows (Tab order, Escape closes, focus returns) are their own specs.

Sources: https://playwright.dev/docs/test-snapshots · https://playwright.dev/docs/accessibility-testing · https://argos-ci.com/blog/playwright-visual-regression-testing-ci · pwa-that-doesnt-suck `references/verification-stack.md` (overlap guard, no-scroll, look-at-your-own-screenshots).
