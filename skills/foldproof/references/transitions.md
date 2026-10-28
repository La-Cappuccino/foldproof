# Transition catalogue

This reference lists the eight transition kinds the v0.1 web adapter can drive (`fold`, `unfold`, `posture`, `rotate`, `resize`, `split`, `keyboard-open`, `keyboard-close`) and, for each, what the adapter sends over the Chrome DevTools Protocol, what the result can and cannot establish, which signals the environment self-check compares, the real-world failure it targets, and the scenario YAML that requests it. Everything here is emulated in Chromium; nothing here is a physical-device result. Sources were inspected on 2026-10-28; CDP behaviour was verified locally with Playwright 1.64.1 and Chromium 156.

Contents

1. What every transition has in common
2. fold
3. unfold
4. posture
5. rotate
6. resize and split
7. keyboard-open
8. keyboard-close
9. Round trips and combinations
10. Sources

## 1. What every transition has in common

The adapter (`src/adapters/web/session.ts`) owns every metrics change. For each transition it resolves the target configuration from the profile (`src/core/configuration.ts`, `applyTransition`), then sends:

- `Emulation.setDeviceMetricsOverride` with `width`, `height`, `deviceScaleFactor`, `mobile`, `screenWidth`, `screenHeight`, `screenOrientation`, and the inline `displayFeature` when the posture names one. The inline field is the mechanism that works while Playwright's viewport emulation is active; the dedicated `Emulation.setDisplayFeaturesOverride` is a no-op there (research 00, verified).
- `Emulation.setTouchEmulationEnabled` from the profile's `inputs.touch`.
- `Emulation.setDevicePostureOverride` with `continuous` or `folded` from `postures[].web.posture`.
- `Emulation.setEmulatedMedia` with the `pointer` and `hover` features from `inputs`.

`page.setViewportSize` is never called: it resets DPR and drops the display feature (research 00 correction). After the change the recorder (installed with `addInitScript` before navigation) observes animation frames until `settle.quiet_frames` consecutive frames show no DOM mutation and no viewport or DPR change, capped at `settle.max_ms`. A timeout makes the step `open: did not settle`.

The self-check then compares expected and observed: `innerWidth`, `innerHeight`, DPR, CSS posture from a sentinel `matchMedia('(device-posture: folded)')`, `navigator.devicePosture` when present, segment count from the sentinel segment media queries, segment rectangles within 1 px, orientation, and secure context. Any mismatch makes dependent passes `open: emulation not effective`, never `pass`. The rule set after a transition defaults to `preset@1`: `reachable`, `state-preserved`, `no-remount`, `not-occluded-by-hinge`, `no-element-loss`.

What a transition can show: the page's CSS and JS reacted to the new metrics, posture and segments; declared state survived under the per-field policies; the declared controls remain hit-testable. What it cannot show: hinge sensor timing, OEM lifecycle behaviour, real IME geometry, touch latency, or anything on Firefox, WebKit or iOS.

## 2. fold

Resolution: panel becomes `outer` when the profile declares one, else the current panel; posture becomes `closed` if declared on that panel, else `half_opened`. The viewport, DPR and display feature come from the profile's `logical`, `usable` and `postures[].display_feature` for that panel.

Signals the self-check verifies: the outer panel's viewport and DPR, `continuous` posture and one segment for `closed`; `folded` and two segments for `half_opened`.

Typical failure: a layout decided once from the launch size (expo/expo #42294, `useWindowDimensions` frozen); number input dropped after a cover-to-main switch (flutter/flutter #190508).

```yaml
steps:
  - transition: fold
    assert: preset@1
```

Explicit target: `transition: { kind: fold, to: { panel: outer, posture: closed } }`.

## 3. unfold

Resolution: panel becomes `inner` when declared; posture `flat`. A profile without a `flat` posture on the inner panel makes the transition a resolve error (reported as `open`).

Signals: inner viewport and DPR, `continuous`, one segment. On Surface Duo the inner panel is the spanned pair, so `flat` still carries the 34 CSS px hinge feature and two segments; the profile's `postures[].web` is what the check reads.

Typical failure: the editor is re-rendered on the width-class change and the draft, caret and focus are lost (fixture `draft-lost-on-unfold`; Google adaptive `Config_Changes` test T-Config_State; the Flutter iPhone Duo cluster of Sep to Oct 2026).

```yaml
start: { posture: closed }
steps:
  - transition: unfold
    assert: preset@1
  - operate: { target: "#send", expect: { visible: "#sent" } }
```

## 4. posture

Resolution: `to.posture` is required and must be declared on the current panel (`closed`, `half_opened`, `flat`, `book`, `tabletop`, `tent`). The posture's `display_feature` decides the segment geometry; `book` uses a vertical feature in portrait coordinates and `tabletop` a horizontal feature in landscape coordinates for flexible-screen phones (see `profiles/README.md` for the Surface Duo reversal).

Signals: `folded` with two segments for `book` and `tabletop`; segment rectangles computed from `offset` and `maskLength`.

Typical failure: half of the window stops rendering in tabletop (signalapp/Signal-Android #14714); a control straddles the fold line (`straddles-fold-line` advisory, `review`).

```yaml
steps:
  - transition: { kind: posture, to: { posture: tabletop, orientation: landscape } }
    assert: [reachable, not-occluded-by-hinge, state-preserved]
```

Set `orientation` together with `tabletop`, otherwise the fold line lands at the wrong offset.

## 5. rotate

Resolution: orientation toggles unless `to.orientation` is given. If the profile has no published size for the target orientation, the resolver swaps width and height and reports a gap in the result.

Signals: swapped `innerWidth` and `innerHeight`, `screen.orientation.type` changing between `portrait-primary` and `landscape-primary`, same DPR. The display feature is not rotated by the resolver; a posture with a feature should be re-declared in the orientation its profile publishes it in.

Typical failure: draft disappears after rotating left and back (thunderbird/thunderbird-android #11568); settings scroll position resets (nextcloud/android #16251); orientation-locked layout letterboxes (fixture `orientation-locked-layout`; WCAG 2.2 1.3.4 relates to this).

```yaml
steps:
  - transition: rotate
    assert: preset@1
  - transition: rotate
    assert: preset@1
```

## 6. resize and split

Resolution: both require `to.viewport: { w, h }` in CSS px. `split` is the same driver labelled for a split-screen or desktop-window target (for example half of a tablet's width); the profile supplies DPR and inputs, the scenario supplies the rectangle because no registry publishes split sizes (research 02 section 7).

Signals: the requested `innerWidth` and `innerHeight`, unchanged DPR, orientation derived from the aspect.

Typical failure: chat history unusable in split-screen (signalapp/Signal-Android #14932); content collapsed into a phone-density box in freeform windows (expo/expo #46844); stale size after a drag ends (iPadOS 27 discrete resizing, TN3192).

```yaml
steps:
  - transition: { kind: split, to: { viewport: { w: 640, h: 800 } } }
    assert: preset@1
  - transition: { kind: resize, to: { viewport: { w: 1280, h: 800 } } }
    assert: [reachable, state-preserved]
```

## 7. keyboard-open

No desktop engine shows a soft keyboard. The adapter applies one of two labelled approximations, chosen from the page's `<meta name="viewport">`:

| Mode | Chosen when | What the adapter does | Approximates |
|---|---|---|---|
| `keyboard-shrink` | `interactive-widget=resizes-content` is declared | Reduces the layout viewport height by the keyboard height through `setDeviceMetricsOverride` | Firefox Android and opted-in Chrome behaviour |
| `keyboard-overlay-approx` | otherwise (Chrome 108+ and iOS Safari default `resizes-visual`) | Injects an opaque `position: fixed` element of the keyboard height at the bottom, `pointer-events: auto`, `aria-hidden`, so hit-testing sees it | Occlusion only; `visualViewport` is not shrunk |

Resolution: `to.keyboard.height` in CSS px, or the profile's `keyboard_height.max` when a cited measurement exists; otherwise a resolve error. `env(keyboard-inset-*)` cannot be injected and is not claimed (council finding).

Signals: `keyboard-shrink` expects the reduced `innerHeight`; `keyboard-overlay-approx` expects unchanged metrics plus the overlay element present. Both modes appear in the finding's `emulation` list.

Typical failure: the primary action sits under the keyboard (fixture `keyboard-covers-primary-action`, the most common class in research 04 section 1.2). A fixed footer above a shrunken layout viewport cannot fail `keyboard-shrink`; that case is why the overlay mode exists and why a default fixed-footer case stays `review` for the real-keyboard class.

```yaml
steps:
  - transition: { kind: keyboard-open, to: { keyboard: { height: 300 } } }
    assert: [reachable, state-preserved]
```

## 8. keyboard-close

Resolution: re-resolves the current configuration with the keyboard removed; the overlay is deleted or the layout viewport restored.

Signals: metrics equal to the pre-keyboard configuration; overlay absent.

Typical failure: a tab bar hidden when the window height changed never returns (ionic-team/ionic-framework #31642; fixture `tabbar-missing-after-keyboard-close`).

```yaml
steps:
  - transition: { kind: keyboard-open, to: { keyboard: { height: 300 } } }
    assert: [reachable]
  - transition: keyboard-close
    assert: preset@1
```

## 9. Round trips and combinations

Google's Tier 3 `Config_Combinations` test asks for sequences such as resize then rotate, or rotate then fold. Several verified issues only appear on the way back (ionic #31642) or after delayed async work (fixture `stale-async-layout-after-round-trip`). Write ordered `steps` with an assertion after each transition; the after-state of one step becomes the baseline of the next. Use `settle.min_ms` to outwait debounced handlers before accepting quiescence.

## 10. Sources

Inspected 2026-10-28.

- CDP Emulation domain: https://chromedevtools.github.io/devtools-protocol/tot/Emulation/
- Chromium `emulation_handler.cc`: https://chromium.googlesource.com/chromium/src/+/main/content/browser/devtools/protocol/emulation_handler.cc
- Playwright CDPSession: https://playwright.dev/docs/api/class-cdpsession
- Viewport Segments API shipped: https://developer.chrome.com/blog/viewport-segments-api-shipped
- Chrome viewport resize behaviour: https://developer.chrome.com/blog/viewport-resize-behavior
- VirtualKeyboard API: https://developer.chrome.com/docs/web-platform/virtual-keyboard
- Google adaptive Tier 3 (`Config_Changes`, `Config_Combinations`): https://developer.android.com/docs/quality-guidelines/adaptive-app-quality/tier-3
- WCAG 2.2 Understanding 1.3.4 Orientation: https://www.w3.org/WAI/WCAG22/Understanding/orientation.html
- Issues cited: https://github.com/expo/expo/issues/42294, https://github.com/flutter/flutter/issues/190508, https://github.com/signalapp/Signal-Android/issues/14714, https://github.com/signalapp/Signal-Android/issues/14932, https://github.com/thunderbird/thunderbird-android/issues/11568, https://github.com/nextcloud/android/issues/16251, https://github.com/expo/expo/issues/46844, https://github.com/ionic-team/ionic-framework/issues/31642
- Project research: `docs/research/00-perplexity-landscape.md` Q3 and corrections, `docs/research/03-testing-and-emulation-tooling.md` sections 1.5 and 1.6, `docs/plan/council-2026-10-28.md`
