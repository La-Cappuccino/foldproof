# Platform boundaries

This reference states exactly what foldproof's emulation cannot establish in v0.1, so that a report is never read as more than it is. Every item below is either a verified limit of the engines (Playwright 1.64.1, Chromium 156, Firefox 157, WebKit 27.2, measured on 2026-10-28 and recorded in `docs/research/00-perplexity-landscape.md` and `docs/research/03-testing-and-emulation-tooling.md`) or a deliberate scope decision in `docs/SPEC-v1.md`. When one of these applies, the result kind is `open`, `review` or `notApplicable`, and the Markdown "Untested" section names it.

Contents

1. Chromium-only folds
2. No real keyboard
3. Firefox and WebKit: viewport only
4. iOS: review only
5. Car and TV: notApplicable
6. Secure context requirement
7. Rules the adapter itself obeys
8. What emulation never shows
9. Sources

## 1. Chromium-only folds

Device posture and viewport segments exist only in Chromium-based engines (Chrome and Edge 132 for posture, 138 for segments; Samsung Internet for posture). Firefox and desktop Safari have neither; Safari 27.1 is reported as a developer preview only. The CDP commands that emulate them (`Emulation.setDevicePostureOverride`, inline `displayFeature`) are marked experimental in the protocol and may change without deprecation. Chromium accepts a single display feature (crbug.com/40113439), so a tri-fold or a rollable with two folded regions cannot be emulated.

Consequence: a fold, unfold or posture step on a non-Chromium browser is not attempted; `attach` throws unless the context's browser is Chromium. Every finding lists its emulation methods (`cdp-metrics`, `cdp-displayFeature`, `cdp-posture`) in `properties.emulation`.

## 2. No real keyboard

No desktop engine shows a soft keyboard, and `navigator.virtualKeyboard` cannot be made to report geometry in headless Chromium. foldproof ships two labelled approximations and claims nothing beyond them:

- `keyboard-shrink`: the layout viewport is reduced by the declared height. This is the `interactive-widget=resizes-content` behaviour. A fixed footer rides above the shrunken viewport, so this mode cannot detect a footer the real keyboard would cover on a `resizes-visual` platform.
- `keyboard-overlay-approx`: an opaque, hit-testable, fixed element of the declared height is injected at the bottom. This approximates the occlusion of the Chrome-on-Android (108 and later) and iOS Safari default `resizes-visual` behaviour. It does not shrink `visualViewport`, does not fire `visualViewport` resize events, does not scroll the focused field into view the way a platform would, and does not reproduce IME accessory bars.

`env(keyboard-inset-*)` cannot be injected by a stylesheet (council finding) and is not claimed. Keyboard heights are not published by any vendor; a scenario must supply `to.keyboard.height` or the profile must carry a cited measurement. A default fixed-footer case therefore stays `review` for the real-keyboard class, and the mode used is recorded in every keyboard finding.

## 3. Firefox and WebKit: viewport only

Viewport, DPR, `isMobile`, `hasTouch`, rotation via a viewport swap, `screen.orientation` change events and `emulateMedia` work in all three engines (research 03 section 1.2 to 1.4). Posture, segments, safe-area overrides and the CDP metrics path do not. Only Chromium reports `navigator.maxTouchPoints` above zero under touch emulation, so touch feature detection by that property reads "no touch" in WebKit and Firefox emulation. v0.1 does not run those engines; when a later version does, their results must be labelled `viewport-only` in `emulation` and fold rules must be `notApplicable` for them.

## 4. iOS: review only

The iPhone Duo simulator can be folded and rotated only through private HID events verified against Xcode 27.1 (community tool, see `ios.md`); Xcode's device-interaction tools tap only the cover display; `simctl` has no rotate, fold or split-view subcommand; Stage Manager, Slide Over and Split View are not scriptable from the CLI. WebKit on macOS cannot show the iOS keyboard. No Xcode is present on the build machine. iOS and iPadOS profiles exist in the corpus; results for them are `review`, which never counts as pass and makes the exit code 2.

## 5. Car and TV: notApplicable

`android-automotive-1024p` and `android-tv-1080p` are AOSP emulator profiles kept as inventory for a future Android adapter. The web adapter reports every row for them as `notApplicable: profile not executable` with the reason. Parked and driving operating states, D-pad-only navigation and overscan are described in the profiles but not exercised. Any statement about car or TV behaviour from a v0.1 run is unsupported.

## 6. Secure context requirement

`navigator.devicePosture`, `navigator.virtualKeyboard` and `window.viewport` are exposed only in a secure context. `about:blank` content set with `setContent` is not one; the earlier research finding that the posture object was absent was this artefact. `http://localhost` is a potentially trustworthy origin and works; so does `https`. The self-check reports `page is not a secure context` and makes dependent results `open` otherwise. The CLI serves fixtures from localhost for this reason, and pages emulated with `mobile: true` must declare a viewport meta or Chromium lays them out at 980 px.

## 7. Rules the adapter itself obeys

- `page.setViewportSize` is never called. It re-sends Playwright's own metrics override without the display feature and resets DPR, which silently drops the fold. All metrics go through `Emulation.setDeviceMetricsOverride`.
- `Emulation.setDisplayFeaturesOverride` is not relied on. With Playwright's viewport emulation active it is accepted and ignored (`window.viewport.segments` stays at one); it only works in a `viewport: null` context. The adapter uses the inline `displayFeature` field, which is what Chrome DevTools Device Mode uses. A probe may try the dedicated command first so the code self-upgrades when a build honours it.
- Posture is asserted through a sentinel `matchMedia('(device-posture: folded)')` installed before navigation. A MediaQueryList created after the override reads `false`; the sentinel is what makes the live flip observable.
- Posture set inline on `setDeviceMetricsOverride` only takes effect before navigation; `setDevicePostureOverride` is the live mechanism after load.
- Touch emulation is set from the profile, not from Playwright's context defaults, so a metrics change does not change the pointer class.

## 8. What emulation never shows

Setting metrics establishes a test rectangle, not the device. Out of reach for any emulated run: hinge sensor timing and hysteresis, OEM device-state identifiers and skins (Samsung Flex Mode, DeX), real IME overlap and height, stylus and hover hardware, touch latency, thermal behaviour during rapid resizes, Dynamic Island occlusion fidelity, display routing between panels, and process death. A pass is "the page reacted correctly to the signals a real device would send, as far as those signals could be emulated". Physical validation is a separate evidence level (`EvidenceLevel: physical`) that no v0.1 record carries.

## 9. Sources

Inspected 2026-10-28.

- CDP Emulation domain (experimental markers): https://chromedevtools.github.io/devtools-protocol/tot/Emulation/
- Single display feature limit: https://crbug.com/40113439
- Device Posture API support: https://developer.mozilla.org/en-US/docs/Web/API/Device_Posture_API, https://caniuse.com/mdn-api_navigator_deviceposture
- Viewport Segments API: https://developer.mozilla.org/en-US/docs/Web/API/Viewport_segments_API
- Secure contexts and potentially trustworthy origins: https://w3c.github.io/webappsec-secure-contexts/
- Chrome viewport resize behaviour: https://developer.chrome.com/blog/viewport-resize-behavior
- VirtualKeyboard API: https://developer.chrome.com/docs/web-platform/virtual-keyboard
- Playwright emulation: https://playwright.dev/docs/emulation
- `XCUIDevice.orientation` (iOS rotation only): https://developer.apple.com/documentation/xcuiautomation/xcuidevice/orientation
- iPhone Duo simulator driver (private HID, Xcode 27.1): https://github.com/WhitenWhiten/iphone-duo-simulator-skill
- Project research: `docs/research/00-perplexity-landscape.md` (verified table and correction), `docs/research/03-testing-and-emulation-tooling.md` sections 1.5, 1.6, 2.10, 3; `docs/plan/council-2026-10-28.md`; `docs/validation.md` evidence levels
