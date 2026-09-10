# Anti-patterns and failure codes

Contents: P0 silent always-pass · P1 poor diagnostics · P2 maintenance · F1-F15 failure codes with fix layer · pre-commit checklist.

Adapted from voidmatcha/e2e-skills (https://github.com/voidmatcha/e2e-skills) and the Playwright best-practices page. The P0 list is the agent failure mode: a test that cannot fail is reported as passing.

## P0 - the test cannot fail (block the change)

| Pattern | Why it is silent | Fix |
|---|---|---|
| Name says "saves the note", body asserts only that a button is visible | assertion does not test the claim | assert the effect where it lives |
| No Then: actions with no `expect` | always passes | every test ends in a web-first assertion |
| `try { ... } catch {}` around actions or expects | swallows the failure | remove; let it throw |
| `force: true` on click/fill | bypasses actionability, hides an overlay or disabled state | find why it was not actionable |
| Conditional assertions (`if (await x.isVisible()) expect(...)`) | skips when the branch is missing | assert the branch deterministically |
| `.only()` left in | shrinks the suite | `forbidOnly` in CI |
| Retry-weakened assertion (`toBeVisible` replacing `toHaveText`) | claim got smaller to pass | restore the original claim (rule 1) |
| Protected route test with a generic assertion | login page matches too | `setup` project + `storageState`; assert something only the protected page has |
| Assertion after `page.waitForTimeout` | timing luck | web-first assertion |
| Invented JavaScript locator options, such as `getByRole('link', { current: 'location' })` | unsupported options can be silently ignored, so the locator selects every link | verify supported options; assert the named link's `aria-current` attribute, and count current links explicitly |

When an ARIA state has no supported role filter, scope by role/name first and narrow with an attribute selector for that state. For example, `nav.getByRole('link').and(page.locator('[aria-current="location"]'))` can assert that exactly one link is current. This is a justified state selector, not a replacement for semantic locators. Incident: resume contents verification, 2026-09-08 — the unsupported `current` option in a JavaScript Playwright probe matched all six links and caused a misleading strict-mode failure before the actual scroll bug could be tested.

## P1 - fails for the wrong reasons or gives no diagnosis

Raw CSS/XPath selectors · `nth()` without scoping · unscoped `getByText` on common words · missing `await` on `expect` or on an action · `page.click(sel)` instead of `locator.click()` · `expect.soft` everywhere · module-level mutable state shared across tests · real backend writes without cleanup · optimistic UI asserted without proof the request completed (`page.waitForResponse`) · hard-coded credentials.

## P2 - maintenance rot

Zombie specs for removed features · manually captured `storageState` that CI cannot regenerate · fixtures that ignore the app's render/hydration guard · screenshots of regions containing timestamps or user content without `mask`.

## Failure codes - classify before you fix

| Code | Name | Signature | Fix layer |
|---|---|---|---|
| F1 | Flaky/timing | passes on retry, timeout on first run | replace sleeps with web-first assertions; expose `data-state` from the app |
| F2 | Selector broken | "locator resolved to 0 elements" after a UI change | update locator (role/name), or rewrite the test with the product change |
| F3 | Network dependency | fails offline or when a third party is slow | `page.route` mock |
| F4 | Assertion mismatch | value differs deterministically | product bug or intended change - decide, never split the difference |
| F5 | Missing Then | test passes with no assertions | add the assertion the name promises |
| F6 | Condition branch missing | passes when a branch does not render | make the branch deterministic via fixture |
| F7 | Isolation failure | order-dependent, fails in parallel | per-test fixtures; no shared mutable state |
| F8 | Environment mismatch | passes local, fails CI | Docker image, fonts, viewport, baselines |
| F9 | Data dependency | depends on seed data that drifted | seed in `setup` project, assert the seed |
| F10 | Auth/session | redirected to login | `storageState` from setup |
| F11 | Async race | assertion runs before the effect | await the response or the state attribute |
| F12 | Locator drift | page object out of date | update the page object, one place |
| F13 | Error swallowing | failure hidden by catch | remove the catch |
| F14 | Animation race | element moves during click | `animations: 'disabled'`, `reducedMotion`, wait for `transitionend` state |
| F15 | Hydration race | click lands before React attaches handlers | wait for `[data-hydrated]`; never trust `networkidle` alone |

Codes F2 and F4 are where "healing" goes wrong: an agent asked to make the test green will change the locator and the claim. F2 permits a locator change; F4 requires a human decision or an explicit product-change note in the same commit.

## Checklist before declaring a spec done

- [ ] Every test name is a claim and the body asserts exactly that claim
- [ ] No `.only` or unawaited test promises; waits, forced input, catches and conditional branches have a behavioral reason and retain failure evidence
- [ ] Locators follow the role → label → placeholder → text → test id order
- [ ] Required cases and engine/input configurations match repository policy; missing or skipped coverage remains visible
- [ ] The effect is asserted at its source (storage, reload, export), not only in the toast
- [ ] Screenshots for changed surfaces were read by a person or the agent, and the report says what they showed
