# Playwright setup on Linux

Contents: install · project matrix · config keys · webServer · reporters and traces · retries and workers · Docker · axe · time, init scripts, offline.

## Install

```sh
npm i -D @playwright/test @axe-core/playwright
npx playwright install --with-deps chromium webkit   # system deps need root once
npx playwright --version                              # must equal the package version
```
`--with-deps` pulls the apt packages WebKit needs; without it WebKit launches and dies with a library error. Firefox is optional; add it only if a user population justifies it.

## Project matrix (mobile + laptop, both engines)

```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },                      // auth/seed once, share via storageState
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } }, dependencies: ['setup'] },
    { name: 'Desktop Safari', use: { ...devices['Desktop Safari'] }, dependencies: ['setup'] },   // WebKit engine
    { name: 'Pixel 7',        use: { ...devices['Pixel 7'] }, dependencies: ['setup'] },          // mobile Chromium, touch, DPR 2.6
    { name: 'iPhone 14',      use: { ...devices['iPhone 14'] }, dependencies: ['setup'] },        // mobile WebKit, touch, DPR 3
  ],
});
```
Why 1280x720 for desktop: the short-laptop height is the one people forget and where no-scroll surfaces overflow. Device descriptors set `viewport`, `deviceScaleFactor`, `isMobile`, `hasTouch`, `userAgent` together; do not hand-roll them. Run one project with `--project="iPhone 14"`.

## Config keys that matter

```ts
use: {
  baseURL: 'http://localhost:5173',
  trace: 'on-first-retry',        // CI default; 'retain-on-failure' when debugging
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  colorScheme: 'light',           // add a dark project or emulateMedia per test
},
expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide', stylePath: './tests/snapshot-freeze.css' } },
retries: process.env.CI ? 2 : 0,
workers: process.env.CI ? 2 : undefined,
fullyParallel: true,
forbidOnly: !!process.env.CI,     // a leaked .only() fails CI instead of silently shrinking the suite
```
Per-test emulation: `await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })`. Other per-context keys: `locale`, `timezoneId`, `permissions`, `offline`, `javaScriptEnabled`.

## webServer - tests start the app

```ts
webServer: { command: 'npm run dev -- --port 5173', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI, timeout: 60_000 },
```
Wait on `url` (any 2xx-403), not the deprecated `port`. `reuseExistingServer` locally means a stale dev server serves stale code - restart it after server-side changes (the number-one false failure).

## Reporters and traces

```ts
reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }], ['html', { open: 'never' }]],
```
An agent reads `test-results/results.json` to learn what failed (`suites[].specs[].tests[].results[].status`, `error.message`, attachments). Then `npx playwright show-trace test-results/<test>/trace.zip` or unzip it and read the `resources/*.png` and `trace.trace` actions: before/after DOM snapshots, console, network, source call sites. Never `trace: 'on'` in CI (huge artifacts).

## Retries, workers, sharding

Outcomes are `passed`, `flaky` (passed after retry) and `failed`. Treat `flaky` as red for merge. `test.describe.configure({ mode: 'serial' })` only where tests genuinely share state. CI horizontal split: `--shard=1/3`.

## Docker (optional, for identical baselines)

`mcr.microsoft.com/playwright:v<exact>-noble` (Ubuntu 24.04). Run with `--ipc=host --init`; Chromium OOMs without `--ipc=host`. Pin the tag to the `@playwright/test` version or browsers are not found.

## Accessibility (axe)

```ts
import AxeBuilder from '@axe-core/playwright';
const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).exclude('#third-party-widget').analyze();
await testInfo.attach('axe', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });
expect(results.violations).toEqual([]);
```
Scope with `.include()` / `.exclude()`; disable a rule only with a comment naming why and an expiry. Axe finds roughly a third of accessibility problems; keyboard paths and screen-reader names still need explicit tests.

## Time, init scripts, offline

- `page.clock.install({ time: new Date('2026-01-01T09:00:00Z') })`, then `page.clock.fastForward('30:00')`, `pauseAt`, `runFor(ms)` - for timers, polling, date-dependent UI, animation frames.
- Establish the fake clock before navigation so app timers never straddle native and fake implementations. For a fixture that can load with time frozen, call `page.clock.pauseAt(fixtureTime)` before `goto` and timestamp mock state from the same clock. Do not install a running clock and then pause at the runner's `new Date()`: it can already be in the past by arrival. If startup needs running timers, use the documented earlier install time and later pause time, accounting for callbacks fired by that jump (including socket heartbeat expiry). Source: Two Chairs replay failures, 2026-09-10; https://playwright.dev/docs/api/class-clock#clock-pause-at and https://playwright.dev/docs/clock.
- `page.addInitScript(() => { localStorage.setItem('flag', '1'); })` runs before any app script, in every frame - seed feature flags, freeze `Math.random`, install fake APIs.
- Offline writes and cold offline startup are separate claims. For writes, use `context.setOffline(true)` on an already-loaded page and assert durable edits plus recovery after reconnect. For startup, first assert an activated service-worker controller and the required precache entries, then make the network unavailable and navigate a **new page** to the app in the same storage context. Assert both rendered persisted content and failure of an uncached network-only probe. An already-loaded editor is not cold-start evidence. Blocking service workers is suitable for ordinary request interception, never for the service-worker acceptance case.
- If driver offline mode fails cold navigation, retain the failing control and diagnose the actual worker/controller/cache state before changing application code. An independent control can stop the test's own origin server, await its exit, and navigate a new page while retaining the activated worker and storage. Stop only a process owned by that fixture. Report this as **origin unavailable**, not driver offline, device airplane mode, or physical Safari proof. Do not generalize one driver failure to every engine/version.
- Restart recovery: write, `await context.close()`, `browser.newContext({ storageState })`, reopen, assert the data is there unchanged. IndexedDB survives inside a context's storage dir only if you reuse the same persistent context (`chromium.launchPersistentContext(dir)`); plain contexts start empty - choose deliberately.

Observed source: Thinkering's 2026-09-07 Linux Playwright 1.63.0 / WebKit 26.6 acceptance. With the same activated controller and populated precache, `context.setOffline(true)` caused new-page navigation to fail with “WebKit encountered an internal error”; stopping the fixture-owned origin allowed cold navigation and persisted Markdown recovery, while an uncached API request failed. The negative/positive control is recorded in Thinkering `.artifacts/testing/webkit-offline-probe.json`; the durable fixture and assertions are `apps/web/tests/production/server.ts` and `offline.spec.ts`. Physical iPhone airplane mode remained NOT RUN.

Sources: https://playwright.dev/docs/best-practices · https://playwright.dev/docs/test-projects · https://playwright.dev/docs/emulation · https://playwright.dev/docs/test-webserver · https://playwright.dev/docs/test-reporters · https://playwright.dev/docs/trace-viewer · https://playwright.dev/docs/test-retries · https://playwright.dev/docs/browsers · https://playwright.dev/docs/docker · https://playwright.dev/docs/accessibility-testing · https://playwright.dev/docs/clock
