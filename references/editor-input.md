# Native editor input prerequisites

For structured-editor automation, wait for the actual native editor view before
deciding whether it is empty. Focus using the configured device modality, then
observe native selection before deleting or replacing text. If a procedure deletes
first, wait for the canonical document to reflect that deletion before typing.
An empty capture field does not need a preparatory Backspace. Keep exact text
assertions after input and separately after persistence/export/reload.

Those prerequisites establish an initial input target or intentional whole-document
replacement; they do not prove continuous writing. Also exercise structural keys such
as Enter and Tab followed immediately by more native typing, with no application-save,
new-row mount or focus assertion inserted between those user actions. Assert the complete
text, hierarchy and identities afterward, then persistence/reload. Repeat that sequence
while the actual write boundary is delayed or refuses a commit. A user does not pause
until a database checkpoint finishes before typing the next word.

Why: Thinkering's 2026-09-07 direct-outline test lost `Quick next` typed immediately
after Enter: stored bullets were `Quick first` and an empty child. The async structural
checkpoint replaced the old editor before the new editor owned subsequent input. A test
that awaited the new row would hide the loss. Preserve that negative; a prepared native
Y.Text/editor ownership correction passed the original no-wait sequence. See Thinkering
`docs/plans/2026-09-07-immediate-outliner.md` and its permanent outliner scenarios. Do not
replace the missing ownership with read-only intervals, synthetic key buffers or replay.

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
