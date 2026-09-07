# Navigation diagnostics and JavaScript failures

Treat `pageerror` as a failure until a bounded reproduction identifies what emitted
it. Playwright's Linux WebKit can emit a native fetch access-control diagnostic
while a document is departing, even when every fetch rejection is caught. That is
different from an uncaught window error or an unhandled promise rejection. Do not
infer this distinction from an error string alone.

When an otherwise passing reload test exposes this diagnostic:

1. Preserve the failing report. Reproduce with a minimal owned HTTP page, outside
   the application, service worker and storage library.
2. Observe both Playwright `pageerror` and native `window.error` /
   `unhandledrejection` events. Keep listeners installed before navigation. Add an
   intentional JavaScript exception as a negative control and verify it still fails.
3. If the reproduction proves a native navigation diagnostic, classify only the
   measured engine, exact owned endpoint/error and explicit navigation interval.
   Retain occurrences in a separate diagnostic receipt; do not silently discard them.
4. Continue failing all actual JavaScript errors, unhandled rejections and unmatched
   diagnostics. After reload, verify the application's real persistence/replication
   outcome. A browser diagnostic classification cannot excuse lost data or failed
   reconnection.

Do not install a blanket `Fetch API cannot load` exclusion. An identical message
during ordinary interaction may indicate a real CORS, authentication or network bug.
Scope classification to the observed lifecycle and recheck it after engine changes.

## Evidence and executable control

Thinkering composed acceptance, 2026-09-07, Playwright 1.63.0 on Linux:
five reloads of a bare HTML page issuing fully caught POST fetches produced ten
native WebKit access-control page errors, zero native window errors and zero
unhandled rejections. Chromium produced none. The intentional exception produced
one `pageerror` and one window error in each engine. No application or storage code
was involved. The product test then retained exact owned replication diagnostics
only during reload and still compared reopened SQLite state.

Run `node /path/to/references/probe-navigation.mjs` from a project with
`@playwright/test` and its matching Chromium/WebKit browsers installed. It starts
and closes an owned dynamic-port server and prints a synthetic-only JSON receipt.
The exact diagnostic count can vary; it is evidence to inspect, not a retry policy
or a cross-version promise.
