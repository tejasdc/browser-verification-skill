# browser-verification

Doctrine for proving web-app changes in real browser engines on Linux with Playwright: Chromium and WebKit, phone and laptop device projects, screenshots as evidence, axe scans, failure triage, flake policy, and the rules that stop an agent from faking a green run.

## Why it exists

Created 2026-09-07 for Thinkering (local-first PWA, editor-heavy, mobile + laptop). Research (`tmp/reviews/browser-verification-research.md` in the journalmaxx vault at creation time) found no existing skill that covered the mobile+desktop engine matrix, PWA/offline, hydration races, and the assertion-weakening failure mode together. Sources are listed in `references/agent-discipline.md`.

## Organization

Router `SKILL.md` (critical rules, stack, workflow, report shape) plus four references split by domain, plus templates. Keep `SKILL.md` under 200 lines.

## Changing it

Progressive overload: one evidence-backed rule per commit, with its why and a source (an incident in a project, a doc page, a published post). Retire rules that stop earning their place. An agent may propose a diff; a human pushes it. Follow the catalog's OPERATIONS runbook for fetch/commit/push/sync.
