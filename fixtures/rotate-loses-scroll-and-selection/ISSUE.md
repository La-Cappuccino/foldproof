# rotate-loses-scroll-and-selection

**Failure class:** rotation state loss without a remount. An orientation-change handler "resets the layout":
`scrollTo(0, 0)` and `document.activeElement.blur()`. The DOM is untouched, every control keeps its node
identity and the typed text survives, so `no-remount` and a form-value check both pass — only the reading
position, focus and the caret selection are gone. A screenshot diff would show "a different scroll position"
and nothing more; the state oracle names the three losses.

**Real-world instances (docs/research/04 §1.2):** nextcloud/android #16251 "Settings scroll position resets
after device rotation" (2026-01-06, open) and thunderbird/thunderbird-android #11568 "Rotating the phone makes
drafts disappear" (2026-09-16, open); the wider "configuration-change recreation that drops state" cluster
(thunderbird #10950, organicmaps #13243, NewPipe #13963). Google adaptive guideline `Config_Changes`, test
T-Config_State, requires scroll position, typed text and keyboard state to be retained.

**Scenario:** profiles `google-pixel-10-pro` (portrait 427×876 → landscape 900×375) and `google-pixel-tablet`
(landscape 1280×800 → portrait 800×1280). The margin note sits inside the article after paragraph 11 so that it
is on screen together with paragraph 10; setup: `scrollTo #p10`, `fill #note "draft"`, `focus #note` with
selection `[1, 3]`; rotate → assert `[reachable, state-preserved, no-remount]`. Paragraphs are long on purpose:
the stretch before `#p10` is taller than every profile's viewport, so a jump to the top really scrolls the
anchor out of view on the tablet as well as on the phone.

**What foldproof must report:** broken/ fails `state-preserved` only, on both profiles —
`state lost: focus moved from #note to nothing; selection [1,3] → null; scroll position lost in window: anchor
#p10 scrolled out of view (top 1688 px; container 0–375 px)` — while `reachable` "Save note" and `no-remount`
`#save` pass. fixed/ passes every rule on both profiles.

**The fix:** remove the handler. The browser reflows the same DOM on rotation; Chromium's scroll anchoring keeps
the paragraph under the reader in view (verified: the fixed variant passes the `scroll: anchor` policy at
tolerance 0 on both profiles, including the 876 → 375 px height change), and focus and the selection in a
textarea are untouched by a resize. If an app must react to orientation, it should re-derive layout from the
new size and never touch scroll position or focus.
