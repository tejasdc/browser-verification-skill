---
name: browser-verification
description: Use when a web app change must be proven in a real browser - "write an e2e test", "add Playwright", "test this on mobile and desktop", "does it work in WebKit/Safari", "screenshot the page", "visual regression", "accessibility scan", "the test is flaky", "verify the UI change", "set up browser testing", "test offline / PWA". Playwright on Linux - Chromium plus WebKit, phone and laptop device projects, screenshots as evidence, axe scans, failure triage, flake policy, and the rules that stop an agent from faking a green run. Do NOT use for iOS-native or real-device Safari verification, for API-only tests (use fetch and the project's test client), or for scraping third-party sites (use agent-browser).
---
# browser-verification

How an agent proves a web app works: in real browser engines, at the sizes users hold, with evidence it looked at. Written for Playwright on Linux (Chromium + WebKit); every command here runs headless on a server. Rules carry their why. Full detail lives in `references/`; drop-in files in `templates/`.

## Critical rules (the ones that get faked)

1. **Never weaken an assertion to make a test pass.** When a test fails, the fix is in the locator, the wait, the fixture data, or the app - never in what the test claims. If the product changed on purpose, rewrite the test in the same change as the product, and say so. Why: agents will happily rewrite `toHaveText('Saved')` into `toBeVisible()` and report green; a green bought that way is a lie that outlives the session (qaby.ai "Green-Pipeline Lie"; voidmatcha P0 list).
2. **Test the real path, then check the real state.** Drive the UI the way the user does and then assert the effect where it lives (storage, exported file, second page) - not the toast that says it happened. Why: WebArena/OSWorld evaluate environment state, not confirmation pages; a "Saved" badge is the UI's opinion.
3. **Look at your own screenshot before declaring done.** After a visual change, capture at the mobile and laptop projects and `Read` the PNGs. Evidence nobody looked at is not evidence. Why: Anthropic's harness work found agents shipping features that passed unit tests and curl but did not work end to end.
4. **Locator order: `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId` → never raw CSS/XPath.** Web-first assertions only (`await expect(locator).toBeVisible()`), never `expect(await locator.isVisible()).toBe(true)`. No `page.waitForTimeout()`; use `expect(...).toPass()` for custom polling. Why: role/name locators match what the screenshot shows and survive refactors; hard sleeps are the number-one flake source.
5. **One script, not thirty tool calls.** For anything multi-step, write a spec file (or a one-off `.mjs` that imports Playwright) and run it; use a browser MCP only for a single glance. Why: MCP serializes every click through the context window and cannot batch; a script gives traces, retries, and reproducibility (Sawyer Hood, vercel agent-browser).
6. **Flaky is red.** `retries: 2` only in CI; a test that flakes twice in a week gets `@quarantine` (out of the merge gate, still on nightly) with an owner and a seven-day fix-or-delete deadline. Never retry your way to green locally. Why: retries hide the race you were supposed to find.
7. **Linux baselines only.** Screenshot baselines are per browser and per platform; commit only `-linux.png`, generate them on the same Linux box or the pinned Playwright Docker image. Why: a Mac-captured baseline silently creates a second file and both "pass".

## The stack

| Layer | Catches | Tool |
|---|---|---|
| Unit / component | logic, reducers, pure UI state | Vitest (not this skill) |
| Interaction specs | flows, keyboard paths, editor behavior, persistence after reload | `@playwright/test` |
| Engine matrix | layout and input differences Chromium vs WebKit | projects: Desktop Chrome, Desktop Safari, Pixel 7, iPhone 14 (`references/playwright-setup.md`) |
| Visual baselines | "did it render at all" per viewport | `toHaveScreenshot` with animations disabled, caret hidden, dynamic regions masked |
| Overlap and no-scroll guards | controls colliding, forbidden scroll at short laptop heights | `page.evaluate` bounding-box walk (`references/visual-and-a11y.md`) |
| Accessibility | missing names, contrast, focus order | `@axe-core/playwright`, WCAG 2.1 AA tags |
| Offline / PWA | service-worker fallback, restart recovery | Activated worker + cold navigation with network unavailable; preserve storage and name the offline mechanism (`references/playwright-setup.md`) |
| Human eyeball | hierarchy, weight, copy | you, reading the PNGs |

Playwright's Linux WebKit is upstream WebKit, not Safari: it finds engine-level layout and input bugs, not iOS chrome, viewport-bar, or install behavior. Say "WebKit on Linux" in reports, never "tested on Safari".

## Workflow

1. **Classify.** Static page or dynamic app? Server already running? Which project(s) does the change touch (mobile, desktop, both)? Write the answer in one line before touching anything.
2. **Scaffold once** (`references/playwright-setup.md`): install with `npx playwright install --with-deps chromium webkit`, copy `templates/playwright.config.ts`, `templates/snapshot-freeze.css`, `templates/example.spec.ts`; wire `webServer` to the dev command so tests start the app themselves.
3. **Author with the browser open.** Write the spec while running it (`npx playwright test --project="Desktop Chrome" --headed` locally or `--ui`; on a server, run headless and read the trace). Verify each locator against the live page before committing an assertion. Use `npx playwright codegen URL` when a locator is unclear.
4. **Run the matrix.** `npx playwright test` runs all projects. For iteration, `--project` and `-g "name"` narrow to seconds; the full matrix is the end-of-change gate, run once or twice, never between edits.
5. **Read the failure, not just the message.** Open `test-results.json` (JSON reporter) to see what failed; then `npx playwright show-trace test-results/**/trace.zip` or read the trace's screenshots and DOM snapshots. Classify with the F-codes in `references/anti-patterns.md` before changing anything.
6. **Fix at the right layer** (rule 1). Selector drift → locator. Timing → web-first assertion or a state the app exposes (`data-state`). Data → fixture. Product change → rewrite test with the product, in the same change. App bug → fix the app.
7. **Look, then hand off.** Read the screenshots for the changed surfaces. Report in the format below.

## Evidence report (hand-off shape)

```yaml
verified:      # what ran, exact command, projects, pass counts
not_verified:  # surfaces or engines not exercised and why
screenshots:   # paths you looked at, with one line each on what you saw
flaky:         # tests that needed a retry, with the F-code and the owner/deadline
confidence_limits: # e.g. "WebKit on Linux, not Safari"; "offline tested by setOffline, not by killing the network"
```

## Common failures

- **`Executable doesn't exist`** → `npx playwright install --with-deps chromium webkit`; version in `package.json` must match installed browsers. In Docker use the exact `mcr.microsoft.com/playwright:v1.x-noble` tag.
- **Chromium crashes in a container** → run with `--ipc=host --init`.
- **Snapshot mismatch on a new machine** → you are comparing against another platform's baseline; regenerate on Linux with `--update-snapshots`, never commit `-darwin.png`.
- **Test passes on Chromium, fails on WebKit** → real engine difference until proven otherwise; check `min-width:0` on flex children, `100dvh`, input `font-size` under 16px, and composition events.
- **WebKit `pageerror` only during reload** → preserve it and reproduce outside the app. Distinguish native navigation diagnostics from window errors and unhandled rejections with a failing JavaScript control; never blanket-filter fetch errors (`references/navigation-diagnostics.md`).
- **Protected route "passes"** → the generic assertion matched the login page (P0 missing auth). Use a `setup` project with `storageState`.
- **Hydration race (F15)** → assert on an app-emitted ready state (`[data-hydrated="true"]`) before interacting, never `networkidle` alone for Vite/React.
- **Editor input differs from exported text** → retain intended, native-before-ack and exported text separately. Establish native input readiness, then also test continuous typing across structural keys without application-save/remount waits; helper-paced input can hide lost keystrokes (`references/editor-input.md`).

## References

- `references/playwright-setup.md` - install on Linux, the four-project config, webServer, reporters, trace, retries/workers, Docker, axe install; clock, init scripts, offline recipes.
- `references/replicated-storage-recovery.md` - when a replicated app restores an older server backup: retain the existing browser and prove both outgoing recovery and new incoming records against actual database state.
- `references/pwa-updates.md` - native worker updates across two tabs: preserve drafts and acknowledged records, bind actual revisions, and open an old lazy workspace after activation.
- `references/navigation-diagnostics.md` - narrowly classify a proven native navigation diagnostic while retaining receipts and failing real JavaScript errors; includes an executable two-engine control.
- `references/editor-input.md` - input modality, native editor readiness, and preserving evidence of pre-acknowledgment text discrepancies.
- `references/parallel-evidence.md` - concurrent profile jobs with isolated fixtures/caches and native blob merging that retains failed siblings.
- `references/anti-patterns.md` - P0/P1/P2 patterns that make a test silently pass, and the F1-F15 failure codes with the fix layer for each.
- `references/visual-and-a11y.md` - stable screenshots, Linux baselines, mask/freeze, semantic screenshot review, overlap and no-scroll guards, axe scoping, data-attribute assertions.
- `references/agent-discipline.md` - script vs MCP, reading JSON results and traces, evidence manifests across multiple browser configurations, the healer constraints, observer subagents, fossil-test audit after UX rewrites, sources.
- `templates/` - `playwright.config.ts`, `example.spec.ts`, `snapshot-freeze.css`, `quarantine.md`.

Related catalog skills: `local-test` (server lifecycle, API-vs-UI choice), `pwa-that-doesnt-suck` (verification ladder for iOS-facing PWAs, data-seeded visual matrix), `bug-reproduction-validator` (repro before fix), `structured-editor` (editor test matrix).
