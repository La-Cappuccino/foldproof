# keyboard-covers-primary-action

**Failure class:** keyboard — the soft keyboard covers the primary action. The page keeps the engine default
`interactive-widget=resizes-visual` (Chrome 108+), so the layout viewport does not shrink when the keyboard
opens; a call to action pinned with `position: fixed; bottom: 0` stays at the bottom of the layout viewport,
under the keyboard. Typing still works and nothing crashes; the task (Pay) just cannot be finished without
dismissing the keyboard first, which is why a screenshot of the form looks fine and only a hit-test catches it.

**Real-world instances (docs/research/04 §1.2):** "Keyboard overlap is the most common single class across
every framework (MAUI, Capacitor, Ionic, Flutter, Expo)"; keyword hits `"keyboard covers"` 6,103 (24 mo) /
5,874 (12 mo) GitHub-wide, scoped `keyboard covers` 82 and `keyboard overlaps` 56 across the named repos.
Related: flutter/flutter #190508 (number keyboard input dropped after a foldable switches displays).

**How foldproof emulates it:** `google-pixel-10-pro` has no sourced keyboard height, so the scenario passes
`to: { keyboard: { height: 300 } }`. broken/ declares no `interactive-widget`, so the adapter uses
`keyboard-overlay-approx` — an opaque, hit-testable fixed overlay of the keyboard height (named in
`env-self-check` as `keyboard-overlay-approx`). fixed/ declares `interactive-widget=resizes-content`, so the
adapter uses `keyboard-shrink` (layout viewport 427×876 → 427×576).

**What foldproof must report:** broken/ fails `reachable` on step 1 (keyboard-open) only —
`"Pay" is not reachable: covered by "keyboard-overlay-approx"; actionability check failed: locator.click:
Timeout 1500ms exceeded.` — while `state-preserved` passes on the same step (amount, focus and caret survive)
and step 2 (keyboard-close) passes every rule. fixed/ passes every rule on both steps.

**The fix:** declare `interactive-widget=resizes-content` in the viewport meta so the layout viewport shrinks
with the keyboard, size the app to `100dvh`, and put the call to action at the end of a flex column (not
`position: fixed`) so it rises above the keyboard.

**Evidence level:** the overlay approximates a keyboard of the declared height; real keyboard heights vary per
IME and device. The verdict is "a control at this position is under a 300 px keyboard", not a measurement of a
specific keyboard.
