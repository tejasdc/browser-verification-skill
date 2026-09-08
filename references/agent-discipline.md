# Agent discipline

Contents: script vs MCP · reading results · healing without lying · observer subagents · fossil-test audit · flake quarantine · sources.

## Script, not tool-call swarm

A browser MCP is fine for one look at one page. Anything with more than three steps becomes a spec (`tests/*.spec.ts`) or a one-off script (`tmp/probe-*.mjs` importing `playwright`), run once, with a trace. Reasons: each MCP call is a round trip through the context window with no batching; a script gives retries, traces, and a reproducible artifact the next agent can rerun. When a probe proves useful, promote it into the suite; delete the rest.

## Reading results

1. `test-results/results.json` - which spec, which project, `status`, `error.message`, attachment paths.
2. The trace for the failed test - `npx playwright show-trace <zip>` when a display is available; on a headless box, unzip and read the action list and the before/after screenshots.
3. Console and network from the trace, not from guesses.
Then classify with an F-code (`anti-patterns.md`) and fix at that layer.

During a long run, distinguish cases completed from cases passed. Inspect failures across
the complete log or structured progress report; the latest case number and a tail of
successes do not count passes. Report a known failure while later independent cases run,
and use the terminal report and exit status before claiming a passing suite.
Source: Thinkering, 2026-09-07: an early WebKit failure remained outside the log tail while
later cases passed, leading to an inaccurate progress count before the final failed receipt.

If the page/context/browser closes unexpectedly, preserve native browser stderr, process
exit code/signal and page/context/disconnect timestamps. Record explicit owned cleanup
before calling close, so cleanup cannot be mistaken for the initiating failure. Keep
native logs private; avoid API/protocol logging that may include user content. A later
passing focused run does not explain the original closure or replace its failed receipt.
Source: Thinkering's complete-corpus run, 2026-09-07: all four SQLite stores remained exact
after a WebKit closure, but absent native logging left its cause UNKNOWN. Instrumented
normal/recovery runs and a deliberate unexpected-close control proved the diagnostic seam.

For native transaction faults, await the transaction's own terminal event before asserting
its event ledger. A rejected request/promise can precede the separately queued `abort`
event; rejection alone establishes neither that the event has fired nor a successful
write. Preserve the early observation and the unchanged exact identity, byte and reload
checks instead of adding sleeps or broad retries. Source: Thinkering's September7 native
Chromium/WebKit control observed request rejection first, then the intended abort with
zero stored records; see the [IndexedDB abort algorithm](https://www.w3.org/TR/IndexedDB-3/#abort-transaction).

## Evidence across multiple browser configurations

When a gate runs more than one browser configuration, collect each configuration's
report and referenced artifacts in the final evidence manifest. Check each report for
failed, flaky, skipped or missing expected projects before accepting it. One complete
development-harness report cannot stand in for a separate built-app/offline run.
Changing or deleting a required report or screenshot must invalidate the evidence.
Preserve the original bytes when carrying a verified build to another checkout; do not
rewrite reports to make old results look newly executed. Keep private real-data probes
outside ordinary synthetic report bundles and give them their own explicit evidence scope.
After changing a report producer or collector, run a focused real browser scenario through
both ends. Synthetic collector fixtures prove rejection logic, but can agree with the
collector while the actual producer emits a different attachment name or JSON shape.
Keep one documented evidence format; do not weaken accessibility assertions to accept it.

Source: Thinkering integration, 2026-09-07. Its gate executed a four-project harness
and a two-project production suite, but its collector originally hashed only the former.
The corrected collector includes both; focused tests reject absent/failed production
reports, a missing production engine, changed screenshots and accessibility violations.
The first complete gate then exposed that exact missing seam: all 252 browser cases passed,
but production emitted labeled raw axe arrays while collection required a named JSON object.
Standardizing the producer and collecting its real two-engine targeted report closed it.

## Healing without lying

Playwright's own healer agent replays a failing test and patches locators, waits and data. It is optimistic: if the product changed, it will rewrite the claim. Constrain yourself the same way a good prompt constrains it:
- Allowed: locator, wait strategy, fixture data, setup/auth, test isolation.
- Not allowed without a written product-change note in the same commit: the asserted value, the asserted element, removing an assertion, adding `soft`, adding a retry.
- If the app is broken, stop and report; do not make the test agree with the bug.

## Observer subagents

Screenshot reading and trace reading are cheap-model work. Hand a subagent the PNG paths and pointed questions; keep the reasoning session's context for the fix. The subagent's report is data to check against the assertions, not a verdict.

## Fossil-test audit after a UX rewrite

A suite that still targets removed controls trains everyone to ignore red. After any UX rewrite: run the suite; every failure caused by a removed or renamed control is rewritten or deleted in the same change (`// removed: feature X no longer exists`). Never `test.skip` a fossil to get green.

## Flake quarantine

- `retries: 2` in CI only. Locally zero, so the race is visible.
- Second flake in seven days: tag `@quarantine`, exclude from the merge gate (`--grep-invert @quarantine`), keep it in a nightly run, record owner and deadline in `templates/quarantine.md`.
- Seven days: fixed (F-code named) or deleted. Never "fixed" by loosening the assertion.

## Sources

- Anthropic, Effective harnesses for long-running agents (agents skip end-to-end checks unless given a browser) - https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Anthropic, Demystifying evals for AI agents (inspect environment state, not confirmation pages) - https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Sawyer Hood, Coding agents suck at using a browser; dev-browser - https://github.com/SawyerHood/dev-browser
- vercel-labs/agent-browser (ref-based CLI, persistent page) - https://github.com/vercel-labs/agent-browser
- Playwright test agents: planner, generator, healer - https://playwright.dev/docs/test-agents
- anthropics/skills webapp-testing (server lifecycle, reconnaissance-then-act) - https://github.com/anthropics/skills/tree/main/skills/webapp-testing
- voidmatcha/e2e-skills (P0/P1/P2 patterns, F1-F15 codes) - https://github.com/voidmatcha/e2e-skills
- lambdatest/agent-skills playwright-skill (locator order) - https://github.com/lambdatest/agent-skills
- qaby.ai, Claude Code + Playwright guide (Green-Pipeline Lie) - https://qaby.ai/blog/claude-code-playwright-tests-guide
- Mike Wacker, Just say no to more end-to-end tests (pyramid; fast, reliable, isolating) - https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html
- Flake policy: https://deflaky.com/blog/test-quarantine-pattern · https://www.minware.com/guide/best-practices/flaky-test-quarantine
- Gumroad flaky-test week (flake fixing as background-agent work with an ideas ledger) - https://read.readwise.io/read/01kms00qg8qw0sv3e1894f76qq
