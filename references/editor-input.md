# Native editor input prerequisites

For structured-editor automation, wait for the actual native editor view before
deciding whether it is empty. Focus using the configured device modality, then
observe native selection before deleting or replacing text. If a procedure deletes
first, wait for the canonical document to reflect that deletion before typing.
An empty capture field does not need a preparatory Backspace. Keep exact text
assertions after input and separately after persistence/export/reload.

Do not infer touch solely from `navigator.maxTouchPoints`: Playwright 1.63.0 Linux
WebKit with the iPhone 14 profile reported zero despite configured `hasTouch: true`.
The native `(pointer: coarse)` query distinguished both phone profiles from both
desktop profiles in the measured four-profile control. Assert trusted pointer/touch
events against the configured device, independently of the helper's detection.
This is measured automation behavior, not a claim about every physical device.

Why: Thinkering's 2026-09-07 production-editor diagnosis observed actual 44→43 and
61→104 pre-acknowledgment discrepancies. Native CodeMirror's deferred iOS Backspace
and recent-focus selection handling were involved; the wrong canonical text was
then faithfully exported. Stock-editor controls reproduced the empty-Backspace
case. A modality/readiness helper correction does not repair or erase those native
negatives. Preserve intended/native/exported counts and digests, native event order,
and the exact failing build. Do not add delays, replay input, filter errors, mutate
private editor state, or install an application-owned key coordinator to obtain green.

Source: Thinkering `docs/runbooks/editor-input.md` and `UI-78` production regression;
locked `@codemirror/view` 6.43.11 `DOMObserver.readSelectionRange` and
`InputState.flushIOSKey`; upstream [DOM observer](https://github.com/codemirror/view/blob/main/src/domobserver.ts)
and [input handling](https://github.com/codemirror/view/blob/main/src/input.ts).
Physical iOS keyboard, dictation and IME behavior remains untested unless actually run.
