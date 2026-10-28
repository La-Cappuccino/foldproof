# control-under-hinge

**Failure class:** transition (unfold / span) — on a dual-screen device with an opaque hinge
(Surface Duo: 34 CSS px mask at x = 540 of 1114) a toolbar centred on the whole viewport places its
middle control on the hinge. The control is still "reachable" to a hit-test (the hinge is not an element),
so only a geometry rule against the profile's display feature catches it.

**Real-world basis:** Microsoft dual-screen guidance ("avoid placing content or controls on the seam"),
Google adaptive LS-F1 ("supports all foldable postures"); DevTools and the Viewport Segments API expose the
geometry (`env(viewport-segment-*)`, research 02 §2.1, 03 §1.5).

**What foldproof must report:** `broken/` fails `not-occluded-by-hinge` for Bookmark (intersects the mask)
and nothing else; `fixed/` passes and the real `operate` on Bookmark changes its label.

**The fix:** size and position fixed toolbars with `env(viewport-segment-width 0 0)` under
`@media (horizontal-viewport-segments: 2)`; never centre across a known hinge.

**Note on fold lines:** on devices whose fold has no occlusion (Pixel Fold, Galaxy Z Fold: `maskLength: 0`)
the rule reports `notApplicable` and a separate advisory `straddles-fold-line` (`review`) in folded postures.
