# Browser acceptance after server restoration

Read this when a browser keeps local records and replication checkpoints while its server
can restore an older backup. A fresh-client import test cannot prove recovery for an
existing client whose checkpoint is ahead of the restored server.

Use an isolated fixture and the application's actual backup/restore path:

1. Synchronize known records and take a server backup. Keep the browser's storage intact.
2. Make more browser changes and verify their exact records in the server database before
   restoring the older backup. Record the browser's last acknowledged state.
3. Restore into the supported destination and reconnect the same browser origin and storage.
   Assert convergence in the actual restored database, including exact immutable records or
   document contents, rather than relying on a local view or a zero-pending badge.
4. Create a new server-side record after restoration. Verify the existing browser receives it;
   recovering outgoing writes alone does not prove that an old pull checkpoint was repaired.
5. Reload and inspect both sides again. Include a normal server restart control so recovery
   behavior does not silently reset replication on every restart.

Keep the failing baseline and distinguish automatic product recovery from a test-only manual
reset. Use the replication library's supported lifecycle before introducing another scheduler;
this test does not prescribe a particular recovery design. Never clear the client's source
records to obtain a green run. State whether the library/engine/version was actually exercised.

Observed source: Thinkering, 2026-09-07, native RxDB/Dexie with Chromium and Linux WebKit.
Restoring a one-record server snapshot left an existing four-record browser reporting synced
with zero pending writes while the server retained only one record. A subsequent server record
was hidden behind the browser's old pull checkpoint. Removing and recreating only native RxDB
replication metadata recovered all five exact records in both engines; that manual control
established the failure mechanism, not completed automatic recovery. Private evidence contains
only synthetic records: Thinkering storage worker
`.artifacts/storage/checkpoint-restore-native-reset/receipt.json`. The reusable product cases
are routed through Thinkering `docs/runbooks/storage-regressions.md`.
