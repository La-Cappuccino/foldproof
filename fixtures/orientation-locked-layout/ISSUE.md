# orientation-locked-layout

**Failure class:** transition (rotate) — the interface is only usable in one orientation and shows a
"please rotate your device" screen in the other. The task's controls are still in the DOM (so an
element-loss check passes) but are not visible or hit-testable.

**Standards it relates to:** WCAG 2.2 SC 1.3.4 Orientation (failure technique F97), EN 301 549 11.1.3.4
(native software), Android 16/17 ignoring orientation restrictions on sw600dp+ (research 04 §2).
Apple's iPhone Duo guidance: "The inner display doesn't honor your supported interface orientations".

**What foldproof must report:** `broken/` fails `reachable` ("not visible") for both controls after
`rotate` and nothing else (the typed card number and selection are preserved: `state-preserved` passes);
`fixed/` passes a rotate → rotate round trip and the real `operate` on Pay.

**The fix:** lay out for both orientations (here a two-column form in landscape); never gate the task on
orientation unless it is essential (WCAG 1.3.4 exception).
