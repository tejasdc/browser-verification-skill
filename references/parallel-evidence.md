# Parallel jobs without shared mutable test state

When fixtures reset shared state, keep one worker inside each isolated environment
and run independent device/profile environments concurrently. Give each job distinct
strict ports, database identity, browser origin/storage partition, bundler/transform
cache and artifact paths. Read one already-built application or identical verified
copies; do not let sibling jobs rebuild or empty the same output directory.

Use Playwright's native blob reporter and `merge-reports`, not hand-written test-JSON
merging. Keep every job's exit and blob, await failed siblings, and bind the aggregate
to one source/build identity. Refuse missing profiles, failed/flaky/skipped cases,
changed artifacts and filtered-run certification. A noisy sibling must not reset a
hung job's own inactivity watchdog. Preserve native per-test deadlines.

Source: Thinkering's 2026-09-07 six-profile implementation, `scripts/browser-parallel.mjs`
and `docs/runbooks/parallel-browser.md`. Actual simultaneous jobs exposed pending-save
failures that isolated controls passed; reports retained those failures instead of
raising deadlines or calling them load-related without a measured cause. Test both
successful combination and native failed-sibling merging before handing off the runner.
Official [Playwright blob/merge procedure](https://playwright.dev/docs/test-sharding#merging-reports-from-multiple-shards).
