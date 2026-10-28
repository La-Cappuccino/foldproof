# Concepts and units

This reference defines the vocabulary foldproof uses when it describes a display configuration and a failure: responsive versus adaptive, the two failure classes (startup and transition), the four length units and how they convert, layout versus visual viewport, posture versus segments, and why a hardware specification is not a usable-area measurement. Read it before writing a scenario or interpreting a profile, because every number in `profiles/` and every message in a report uses these terms. All sources were inspected on 2026-10-28.

Contents

1. Responsive versus adaptive
2. Two failure classes: startup and transition
3. Units: CSS px, device px, dp, pt, DPR
4. Layout viewport versus visual viewport
5. Posture versus segments
6. Why a hardware spec is not a usable area
7. Sources

## 1. Responsive versus adaptive

*Responsive* means one layout that reflows continuously with the available space (fluid widths, wrapping, container queries). *Adaptive* means the interface selects between discrete layouts at thresholds (Android window size classes, Apple size classes, CSS breakpoints). Both are legitimate; both fail the same way when the decision is taken once and never re-read. foldproof does not prefer one over the other. It asks a narrower question: after the space changes, can the declared task still be completed, and did the user's work survive.

Google's adaptive guidelines and Apple's iPhone Duo guidance both say to size from the window, never from the device type or orientation. Android 16 ignores orientation and resizability restrictions on displays of at least 600 dp smallest width for apps targeting API 36; the opt-out disappears at API 37 (https://developer.android.com/about/versions/16/behavior-changes-16#ignore-orientation, https://developer.android.com/about/versions/17/behavior-changes-17). Apple's tech talk on iPhone Duo says the inner display has regular horizontal and vertical size classes and asks developers to use size classes rather than orientation (https://developer.apple.com/videos/play/tech-talks/111461/).

## 2. Two failure classes: startup and transition

The 44 GitHub issues verified in `docs/research/04-evidence-standards-and-positioning.md` section 1.2 cluster into two shapes.

| Class | What goes wrong | Example | What foldproof runs |
|---|---|---|---|
| Startup | The app opens in a non-default configuration and lays out wrongly from the first frame: blank screen, letterbox, fixed-width page, controls outside the viewport. | flutter/flutter #195401, blank cold start unfolded on iPhone Duo | A scenario with `steps: []`: `env-self-check`, `reachable`, `fills-viewport`, plus opt-in static diagnostics. |
| Transition | The app was fine, the configuration changed mid-task, and something was lost or stopped responding: draft gone, scroll reset, tab bar missing, keyboard covering the primary action. | thunderbird-android #11568 (draft lost on rotate), ionic-framework #31642 (tab bar hidden after keyboard close), expo #42294 (dimensions frozen at launch) | A scenario with `steps`: checkpoint, transition, per-step assertions, optional `operate`. |

A startup check can be anticipated from a documented profile. A transition check needs a before-state, an observed change and an after-state decided at quiescence. The second class is the one no inspected package executes (research 01, gap G2).

## 3. Units: CSS px, device px, dp, pt, DPR

Every length in a profile carries one of four units. The validator rejects a number without one.

| Unit | Definition | Where it appears |
|---|---|---|
| `css_px` | The CSS reference pixel, 1/96 in. What `innerWidth`, `getBoundingClientRect` and media queries report. | Web layout, display features the adapter can emulate, `keyboard_height`. |
| `device_px` | Physical panel pixels. | `panels[].physical_px` only. |
| `dp` | Android density-independent pixel. | Android `logical` and `usable` entries. |
| `pt` | Apple point. On iOS Safari the CSS px width equals the width in points. | iOS and iPadOS entries. |

Conversion rules (research 02 section 3):

- `css_px = device_px / devicePixelRatio`, valid at 100 percent browser zoom with `width=device-width`. `window.devicePixelRatio` includes browser zoom, so a zoomed page reports a different DPR than the hardware factor.
- `dp = device_px / (density_dpi / 160)`. A 420 dpi bucket gives a factor of 2.625; 390 dpi gives 2.4375. `WindowMetrics.density` is the exact factor (https://developer.android.com/training/multiscreen/screendensities).
- `pt = device_px / scale`. Apple does not publish the scale on its tech-spec pages, so a profile takes it from a registry such as Playwright and marks it `derived` or leaves it in `unknowns`.
- Chromium on Android reports a DPR equal to the Android density factor (Pixel 7 at 420 dpi reports 2.625 in both the Playwright and DevTools registries).
- Inches and millimetres are physical. Never derive a layout size from a diagonal without the density.

Every converted number in a profile is `kind: derived` with the formula in `derivation`, so a reviewer can recompute it.

## 4. Layout viewport versus visual viewport

The *layout viewport* is the rectangle the initial containing block and viewport units (`vh`, `lvh`) are computed from; `innerWidth` and `innerHeight` report it. The *visual viewport* is the part currently visible after pinch zoom or a soft keyboard; `window.visualViewport` reports it (https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).

Whether a soft keyboard shrinks the layout viewport depends on the engine and the `interactive-widget` viewport directive (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport, https://developer.chrome.com/blog/viewport-resize-behavior):

| Behaviour | Layout viewport | Visual viewport | Default on |
|---|---|---|---|
| `resizes-visual` | unchanged | shrinks | Chrome on Android since 108; iOS Safari |
| `resizes-content` | shrinks | shrinks | Firefox on Android (resizes both) |
| `overlays-content` | unchanged | unchanged; use `env(keyboard-inset-*)` | opt-in, Chromium 94+ VirtualKeyboard API |

`dvh` tracks dynamic browser chrome, not the keyboard. A fixed footer rides above a shrunken layout viewport but is covered when only the visual viewport shrinks; that is why foldproof runs two labelled keyboard approximations (see `transitions.md` and `platform-boundaries.md`).

## 5. Posture versus segments

Two independent signals describe a foldable on the web (research 00 Q3, verified locally with Chromium 156):

- *Posture* is the Device Posture API: `continuous` (flat or fully closed) or `folded` (book or laptop angle). It is observable as `@media (device-posture: folded)` and `navigator.devicePosture.type` (https://www.w3.org/TR/device-posture/, Candidate Recommendation Draft 2026-10-26).
- *Segments* are the Viewport Segments API: `window.viewport.segments` holds one `DOMRect` per segment; `@media (horizontal-viewport-segments: 2)` and `env(viewport-segment-width 0 0)` follow (https://developer.chrome.com/blog/viewport-segments-api-shipped).

They are independent. A Surface Duo spanned across two screens has two segments and may still be `continuous`. A flexible-screen phone half-opened has two segments and is `folded`. A profile therefore records both per posture in `postures[].web: { posture, segments }`, and the environment self-check compares the observed values with those, not with a rule hard-coded in the adapter.

A *display feature* is the geometry that splits segments: `orientation` (`vertical` splits left and right), `offset` and `maskLength`. A `maskLength` of 0 is a fold line with no occlusion (flexible screen); a positive `maskLength` is an opaque hinge (Surface Duo, 34 CSS px). `not-occluded-by-hinge` only applies when the mask is positive.

## 6. Why a hardware spec is not a usable area

A vendor page gives panel pixels, a diagonal and sometimes a pixel density. None of that is the rectangle a web page lays out in. Between the panel and the page sit the density factor, the browser's own chrome, system bars, display cutouts, safe-area insets, the soft keyboard, and on foldables the hinge mask. Research 02 section 4.2 shows two registries disagreeing by about 100 px on the Galaxy Z Fold 6 inner panel, and the DevTools spanned size for the Pixel 9 Pro Fold matching neither the hardware pixel count nor the emulator density.

foldproof keeps these layers apart in the profile: `panels[].physical_px` (hardware), `logical[]` (CSS px, dp or pt at a stated scale), `usable[]` (layout viewport after insets, plus `visual_viewport` when a keyboard value was measured). A profile is executable on the web adapter only when it has `css_px` entries for both `logical` and `usable` on a panel. Where a registry supplies no usable viewport, the resolver falls back to the logical size and reports a gap ("browser UI height unknown") rather than inventing a number. Zero insets mean "not published", never "none".

## 7. Sources

Inspected 2026-10-28.

- MDN `<length>` and CSS px: https://developer.mozilla.org/en-US/docs/Web/CSS/length
- MDN VisualViewport: https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
- MDN viewport meta (`interactive-widget`): https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport
- Chrome viewport resize behaviour (Chrome 108): https://developer.chrome.com/blog/viewport-resize-behavior
- Android screen densities: https://developer.android.com/training/multiscreen/screendensities
- Android 16 and 17 behaviour changes: https://developer.android.com/about/versions/16/behavior-changes-16#ignore-orientation, https://developer.android.com/about/versions/17/behavior-changes-17
- W3C Device Posture API: https://www.w3.org/TR/device-posture/
- Viewport Segments API shipped (Chrome 138): https://developer.chrome.com/blog/viewport-segments-api-shipped
- Apple Tech Talk 111461, Prepare your app for iPhone Duo: https://developer.apple.com/videos/play/tech-talks/111461/
- Project research: `docs/research/02-device-profile-sources.md` sections 2 to 4, `docs/research/04-evidence-standards-and-positioning.md` section 1.2
