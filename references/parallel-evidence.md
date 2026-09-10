# Parallel jobs without shared mutable test state

Make writable state case-owned, then enable native case scheduling. A serial group
is only a temporary constraint for a fixture that cannot yet be isolated, with its
reason recorded. Share immutable assets and worker-scoped browser processes; give
cases separate databases, origins/storage partitions and output. Allocate server
ports through the OS. Do not let sibling jobs rebuild or empty the same directory.
Measure worker counts against the actual workload instead of imposing a universal cap.

Sequential invocations need isolation too. Playwright clears its configured output
directory at startup. Give every standalone focused run a unique `--output` outside
any retained run's parent directory, plus separate reporter destinations. Preserve
original reports, blobs and referenced attachments before a follow-up can clean them.
Recheck attachment paths before claiming a retained receipt is still verifiable;
an intact JSON report cannot replace missing images or blobs.

Evidence: Thinkering on 2026-09-07 retained the passing report for run
`6f509807-9c95-4662-a360-055136ba09ae`, but a subsequent standalone invocation
cleared the default `test-results` directory containing its four native blobs and
images. Separately archived focused outputs survived. The later complete gate
must supply fresh evidence; the historical report is not relabeled or reconstructed.

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
