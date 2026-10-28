# stale-async-layout-after-round-trip

**Failure class:** repeated transitions with delayed work — a debounced layout job scheduled by the first
change captures the width class at schedule time and applies it after a later change has already moved the
viewport on. Unfold → fold → unfold within the debounce window leaves the editor rebuilt for the wrong
(narrow) layout and the draft gone, while the viewport is wide. A single-transition scenario can never
reproduce it; only a sequence with a minimum observation window can.

**Real-world basis:** the "stuck layout after fold/unfold" reports — Discord "keeps showing chats and sidebars
as if it were still twice as wide" after a fold or split-screen (Discord Support community post 19290961918359)
and Facebook stuck on the inner-screen layout after folding (techissuestoday.com, both via research 05) —
and Google adaptive `Config_Combinations` ("combinations of configuration changes, such as
window resizing followed by device rotation, or rotation followed by device folding or unfolding").
The quad-council (seats A and B) named this as the missing fixture class.

**What foldproof must report:** `broken/` fails `state-preserved` and `no-remount` on the third step only
(the first two steps assert nothing, by design), and nothing else; `fixed/` passes every step and the real
`operate` on Save. Both scenarios set `settle.min_ms: 1200` so the 700 ms job is inside the observation
window — without a minimum window the broken variant would be declared settled at ~50 ms and pass falsely.

**The fix:** make the width class a CSS concern; if JavaScript must react, read the *current* state when the
job runs and cancel pending jobs on every change (`clearTimeout`, or `AbortController`).
