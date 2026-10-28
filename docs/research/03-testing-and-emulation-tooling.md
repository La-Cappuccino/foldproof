# Research 03 — Testing and emulation tooling (web, Android, iOS), oracles and evidence formats

Inspected 28 October 2026. Experiments ran on this Mac (Apple Silicon, macOS 25.6, Node 26.7.0) in
`<local-tmp>/pw-experiments` (scripts `exp1`–`exp7`, `report-shape/`).
Every snippet is tagged **VERIFIED** (executed here, output quoted) or **UNVERIFIED** (from docs or
source only). No Android SDK or Xcode is installed on this Mac (`adb`, `emulator`, `simctl` absent;
only Command Line Tools), so every Android/iOS command is UNVERIFIED and is cited to AOSP source
or official docs instead.

Companion docs: [validation strategy](../validation.md) · [Perplexity landscape](00-perplexity-landscape.md)
· [last30days signal](05-last30days-signal.md).

## 0. TL;DR

| Question | Answer (28 Oct 2026) |
|---|---|
| Playwright version | `playwright` / `@playwright/test` **1.64.1**; bundles Chromium 156.0.8078.4, Firefox 157.0, WebKit 27.2 |
| Viewport / DPR / mobile / touch / rotate mid-test | Works in all three engines (VERIFIED). Rotation = `page.setViewportSize` swapping w/h; `screen.orientation.type` and the `(orientation)` media query follow it; `screen.orientation` `change` event fires |
| Media preferences | `page.emulateMedia({ reducedMotion, colorScheme, forcedColors, contrast })` works in all three engines (VERIFIED) |
| Foldable posture (`(device-posture: folded)`) | Chromium only, via CDP `Emulation.setDevicePostureOverride` (VERIFIED). `navigator.devicePosture` JS object is **absent** in Chromium 156 on macOS headless/headed, only the media query responds |
| Hinge / viewport segments | Chromium only. `window.viewport.segments`, `(horizontal-viewport-segments: 2)` and `env(viewport-segment-width 0 0)` all respond (VERIFIED), **but** the new `Emulation.setDisplayFeaturesOverride` is silently ignored while Playwright's own viewport emulation is active; use the deprecated `displayFeature` parameter of `Emulation.setDeviceMetricsOverride`, or a `viewport: null` context. Playwright's `page.setViewportSize` clobbers the override (VERIFIED) |
| Virtual keyboard | Cannot be shown in any desktop engine. `navigator.virtualKeyboard` is absent in headless Chromium (VERIFIED). Simulate the two documented layouts: shrink the layout viewport (`resizes-content`) with `setViewportSize`, or inject `env(keyboard-inset-*)` via a stylesheet. `interactive-widget=resizes-visual` cannot be reproduced (CDP `viewport` param did not change `visualViewport`) |
| Safe areas | CDP `Emulation.setSafeAreaInsetsOverride` populates `env(safe-area-inset-*)` (VERIFIED, experimental) |
| Android | Emulator: `adb emu fold | unfold | rotate | posture <1-3> | resize-display <0-2>` (official blog, 31 Aug 2026). Device-state override: `adb shell cmd device_state state <id>` (AOSP source). Rotation: `adb shell wm user-rotation lock <0-3>` or `settings put system user_rotation`. Split screen: `am start --windowingMode 6` (`WINDOWING_MODE_MULTI_WINDOW = 6` in AOSP). Process death: `am kill <pkg>` after backgrounding. Unit-level fold mocking: `androidx.window:window-testing` `WindowLayoutInfoPublisherRule` + `FoldingFeature(...)` factory |
| iOS | Rotation only via XCUITest `XCUIDevice.shared.orientation`; `simctl` has no rotate/fold/split-view. Stage Manager, Slide Over and Split View are not scriptable from the CLI; real iPads needed for pointer/keyboard/hover claims |
| Visual/structural oracle research | ReFLAIR (FSE 2026): 24 pages (+12 extended), 1280 vs 320 CSS px, GPT-4.1, precision 80.49 % / recall 95.31 %, code public. ReDeCheck (2017) is the reproducible geometric baseline (5 failure types). Viser/Verve add a perceptibility filter |
| Evidence format recommendation | **SARIF 2.1.0** as the canonical record (has `kind: pass/fail/notApplicable/review/open`, rules, locations, attachments, property bags), produced from Playwright's JSON reporter; emit JUnit XML only as a CI side-channel; OpenTelemetry `test.*` attributes are still "Development" status |

## 1. Playwright 1.64.1 — what is driveable (web)

### 1.1 Setup used

```bash
mkdir -p ~/.claude/jobs/521762a0/tmp/pw-experiments && cd $_
npm i -D playwright@1.64.1 @playwright/test@1.64.1 @axe-core/playwright@4.14.0
npx playwright install chromium webkit firefox   # chromium-1248, webkit-2370, firefox-1555
```

`npm view playwright version` → `1.64.1` (28 Oct 2026). Release notes 1.60–1.64 add nothing for
touch/orientation/foldables; 1.63 added standalone `reducedMotion` / `forcedColors` / `contrast`
test options; **1.64 forwards the `screen` property from device descriptors** so `window.screen`
and media queries see the emulated screen size (opt out with `screen: undefined`).

### 1.2 Device preset, viewport, DPR, isMobile, hasTouch — VERIFIED (all three engines)

```js
import { chromium, webkit, firefox, devices } from 'playwright';
// devices['Pixel 7'] (1.64.1) =
// { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) ... Chrome/156.0.8078.4 Mobile Safari/537.36',
//   viewport: { width: 412, height: 839 }, screen: { width: 412, height: 915 },
//   deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, defaultBrowserType: 'chromium' }
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
const page = await ctx.newPage();
```

Observed inside the page (`exp1-basic.mjs`):

| Probe | Chromium 156 | WebKit 27.2 | Firefox 157 |
|---|---|---|---|
| `innerWidth x innerHeight` | 412×839 | 412×839 | 412×839 |
| `devicePixelRatio` | 2.625 | 2.625 | 2.625 |
| `navigator.maxTouchPoints` | 1 | **0** | **0** |
| `(pointer: coarse)` / `(hover: hover)` | true / false | true / false | true / false |
| `screen.width x height` | 412×915 (from `screen`) | 412×915 | **412×839** (screen not forwarded) |
| `screen.orientation.type` | portrait-primary | portrait-primary | portrait-primary |

Takeaways: `hasTouch` sets the coarse-pointer media queries everywhere but only Chromium reports
`maxTouchPoints > 0`; code that feature-detects touch via `maxTouchPoints` will see "no touch" in
WebKit/Firefox emulation. `isMobile` is honoured by all three (no error), contrary to older docs
that said Firefox lacks it.

### 1.3 Rotate mid-test with `page.setViewportSize` — VERIFIED (all three engines)

```js
await page.fill('#draft', 'my draft text');
await page.evaluate(() => scrollTo(0, 1500));
const vp = page.viewportSize();
await page.setViewportSize({ width: vp.height, height: vp.width });   // 839x412
// observed: screen.orientation.type -> 'landscape-primary', (orientation: landscape) -> true,
// events: ['orient:landscape-primary', 'resize:839x412'] in all three engines
// draft still 'my draft text'; scrollY 1518 (Chromium) / 1500 (WebKit) / 1517 (Firefox)
```

A desktop context resized across a CSS breakpoint (1280→500 px) hides the sidebar and keeps the
fixed Save button inside the viewport in all three engines. Note the `screen.orientation`
`change` event fires in all engines, so an app's orientation listeners get exercised; the
`screen.width/height` pair also swaps.

### 1.4 `page.emulateMedia` — VERIFIED (all three engines)

```js
await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark', forcedColors: 'active', contrast: 'more' });
// (prefers-reduced-motion: reduce) true, (prefers-color-scheme: dark) true,
// (forced-colors: active) true, (prefers-contrast: more) true  — Chromium, WebKit, Firefox
```

Per-project equivalents in `playwright.config`: `reducedMotion`, `colorScheme`, `forcedColors`,
`contrast` (1.63+).

### 1.5 Foldables via CDP — Chromium only

CDP Emulation domain (tip-of-tree `browser_protocol.json`, inspected 28 Oct 2026):

| Method | Status | Parameters |
|---|---|---|
| `Emulation.setDevicePostureOverride` | experimental | `posture: { type: 'continuous' \| 'folded' }` |
| `Emulation.clearDevicePostureOverride` | experimental | — |
| `Emulation.setDisplayFeaturesOverride` | experimental | `features: [{ orientation: 'vertical' \| 'horizontal', offset: int, maskLength: int }]` (Chromium accepts **one** feature only, `crbug.com/40113439`) |
| `Emulation.clearDisplayFeaturesOverride` | experimental | — |
| `Emulation.setDeviceMetricsOverride` | stable | `width, height, deviceScaleFactor, mobile`, plus experimental `screenOrientation {type, angle}`, `displayFeature` (deprecated → use setDisplayFeaturesOverride), `devicePosture` (deprecated → use setDevicePostureOverride), `viewport`, `screenWidth/Height`, `viewportMeta`, `textLayoutMode`, `screenOrientationLockEmulation` |
| `Emulation.setSafeAreaInsetsOverride` | experimental | `insets: { top, left, bottom, right, maximumTop, ... }` |
| `Emulation.setTouchEmulationEnabled` | stable | `enabled, maxTouchPoints` |
| `Emulation.setEmulatedMedia` | stable | `media, features[]` |

Platform status (web): Device Posture API shipped in **Chrome 132** (Jan 2025) after an origin
trial in 125–128; Viewport Segments API shipped in **Chrome 138** (June 2025) with `segments`
moved from `visualViewport` to the new `window.viewport` object. Neither exists in Firefox or
Safari (Safari 27.1 is reported as developer preview only).

**VERIFIED behaviour in Playwright 1.64.1 / Chromium 156** (`exp2`, `exp3`, `exp5`, `exp6`):

1. `setDevicePostureOverride({ type: 'folded' })` flips `(device-posture: folded)` to `true`
   immediately, headless and headed. `navigator.devicePosture` stays `undefined` on macOS
   Chromium 156 (also with `--enable-blink-features=DevicePosture,ViewportSegments` and
   `--enable-features=...`), so JS posture listeners cannot be exercised; only the CSS branch can.
2. `window.viewport.segments` exists and returns `[[0,0,1114,705]]` by default.
3. `setDisplayFeaturesOverride(...)` is accepted (`Success`) but **does not change segments**
   whenever Playwright's own device-metrics override is active (any context with a `viewport`,
   which is the default). Verified across headless/headed, before and after load, after reload, and
   with a preceding `setDeviceMetricsOverride`. In Chromium's `emulation_handler.cc` the new method
   calls `RenderWidgetHostView::OverrideDisplayFeatureForEmulation`, a view-level path that the
   active device-metrics emulation supersedes.
4. With a `viewport: null` context (no Playwright metrics override) `setDisplayFeaturesOverride`
   **works**: segments become `[[0,0,540,705],[574,0,540,705]]`, `(horizontal-viewport-segments: 2)`
   matches, `env(viewport-segment-width 0 0)` = `540px`.
5. The deprecated `displayFeature` + `devicePosture` parameters of `setDeviceMetricsOverride`
   work with a normal Playwright context, headless and headed.
6. `page.setViewportSize(...)` re-sends Playwright's own `setDeviceMetricsOverride` **without**
   the display feature, so segments collapse back to one. Re-apply the override after every
   Playwright-driven viewport change.

Working adapter snippet — VERIFIED (`exp2-foldable-cdp.mjs`, `exp5-features-reload.mjs`):

```js
// Galaxy Z Fold 5 class device, unfolded, vertical hinge (book posture). Chromium only.
const ctx = await browser.newContext({ viewport: { width: 1114, height: 705 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);

async function applyFold({ width, height, dpr, hinge, posture = 'continuous', orientation = 'landscapePrimary' }) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: dpr, mobile: true,
    screenOrientation: { type: orientation, angle: orientation.startsWith('landscape') ? 90 : 0 },
    displayFeature: hinge,                 // { orientation: 'vertical', offset: 540, maskLength: 34 }
    devicePosture: { type: posture },      // 'continuous' | 'folded'
  });
}
await page.setContent(html);
await applyFold({ width: 1114, height: 705, dpr: 2.5, hinge: { orientation: 'vertical', offset: 540, maskLength: 34 }, posture: 'folded' });
await page.evaluate(() => ({
  segs: window.viewport.segments.map(r => [r.x, r.y, r.width, r.height]),   // [[0,0,540,705],[574,0,540,705]]
  twoCols: matchMedia('(horizontal-viewport-segments: 2)').matches,         // true
  folded: matchMedia('(device-posture: folded)').matches,                   // true
  orient: screen.orientation.type + ':' + screen.orientation.angle,         // 'landscape-primary:90'
}));
// Tabletop (horizontal hinge): hinge = { orientation: 'horizontal', offset: 340, maskLength: 25 } -> vSegs [1,2]
// Unfold/flat: re-send without displayFeature/devicePosture, or Emulation.clearDisplayFeaturesOverride + clearDevicePostureOverride.
```

Alternative when the test does not need Playwright viewport emulation — VERIFIED (`exp6`):

```js
const ctx = await browser.newContext({ viewport: null });          // launch with args: ['--window-size=1114,705']
const cdp = await ctx.newCDPSession(await ctx.newPage());
await cdp.send('Emulation.setDisplayFeaturesOverride', { features: [{ orientation: 'vertical', offset: 540, maskLength: 34 }] });
// segments -> [[0,0,540,705],[574,0,540,705]] in headless and headed
```

Chrome DevTools foldable presets (from `front_end/models/emulation/EmulatedDevices.ts`,
devtools-frontend main, 28 Oct 2026). These are the numbers to put in device profiles; all are CSS px:

| Preset | Folded portrait | Unfolded (`vertical-spanned`) | Hinge (x, width) | DPR | Flag |
|---|---|---|---|---|---|
| Surface Duo | 540×720 | 1114×720 | x=540, w=34 (opaque) | 2.5 | `dual-screen: true` |
| Pixel 9 Pro Fold | 412×922 | 836×842 | x=418, w=0 (fold line) | 2.625 | `foldable-screen` |
| Galaxy Z Fold 6 | 412×968 | 744×860 | x=372, w=0 | 2.625 | `foldable-screen` |
| Galaxy Z Fold 5 | (see file, same shape) | — | — | 2.625 | `foldable-screen` |
| Asus Zenbook Fold | 853×1280 | 1706×1280 | x=800, w=107 | 1.5 | `foldable-screen` |

DevTools exposes these via the device toolbar ("Toggle dual-screen mode", posture drop-down
Continuous/Folded); the data file is Chromium-internal, not an API. The Chromium dev blog
recommends testing foldable CSS with the "Galaxy Z Fold 5" or "Asus Zenbook Fold" presets.

### 1.6 Virtual keyboard — what can be simulated — VERIFIED (`exp4-keyboard-safearea.mjs`)

Facts (Chrome docs): `interactive-widget` viewport-meta values are `resizes-visual` (default since
Chrome 108 on Android), `resizes-content`, `overlays-content`; not supported in Chrome on iOS.
VirtualKeyboard API (`navigator.virtualKeyboard`, `overlaysContent`, `boundingRect`,
`geometrychange`, `env(keyboard-inset-*)`) is "available from Chromium 94 on desktop and mobile".

Observed in Playwright Chromium 156 headless (Pixel-7-like context):

| Attempt | Result |
|---|---|
| `navigator.virtualKeyboard` present? | **false** — setting `overlaysContent` throws |
| Focus a `<textarea>` | nothing changes; no keyboard exists in headless |
| `page.setViewportSize({ height: 839 - 300 })` | `innerHeight` 839→539, `visualViewport` 539, `resize` fires — this **is** the `resizes-content` keyboard layout |
| CDP `setDeviceMetricsOverride` with `viewport: { height: 539 }` | `innerHeight` and `visualViewport` unchanged (839) — does **not** reproduce `resizes-visual` |
| CDP `setSafeAreaInsetsOverride({ top: 47, bottom: 34 })` | `env(safe-area-inset-bottom)` → `34px` |

Recommended adapter behaviour: for keyboard scenarios run two sub-cases, (a) shrink the layout
viewport by the documented keyboard height (resizes-content apps, Firefox-Android-like), and (b)
inject `env(keyboard-inset-height)` by adding a stylesheet that sets `--kb-inset` and checking the
app uses it; record both as "simulated keyboard, not real IME". The occlusion-only case
(`resizes-visual`, iOS Safari default) can only be approximated by overlaying an opaque
fixed-position element of keyboard height and checking that required controls are still clickable
above it. WebKit on macOS cannot show the iOS keyboard; this remains `needs physical validation`.

### 1.7 Touch gestures

Playwright has no high-level pinch/pan; the official touch-events guide dispatches synthetic
`touchstart/touchmove/touchend` via `locator.dispatchEvent` with `touches` arrays (docs,
UNVERIFIED here). CDP `Input.dispatchTouchEvent` is the lower-level alternative. A `hasTouch`
context proves media queries, not that a gesture succeeds.

### 1.8 Accessibility checks that matter for responsiveness — VERIFIED (`exp7-axe-state.mjs`)

axe-core **4.14.0** (`npm view`), `@axe-core/playwright` 4.14.0. Rule inventory from
`doc/rule-descriptions.md` (develop branch):

| Rule | WCAG | Default? | Note |
|---|---|---|---|
| `target-size` | 2.5.8 (wcag22aa) | **disabled by default** — enable with `withRules` or `withTags(['wcag22aa'])` | Flags 16×16 buttons, found `#a`, `#b` as `serious` in the experiment |
| `meta-viewport` | 1.4.4 | default | user-scalable / maximum-scale |
| `meta-viewport-large` | best-practice | default | |
| `css-orientation-lock` | 1.3.4 | **experimental, disabled** | only static CSS inspection |
| reflow 1.4.10 | — | **no axe rule** | must be an adapter-level check (320 CSS px vertical / 256 px horizontal, F102 "content disappears on reflow") |

```js
import { AxeBuilder } from '@axe-core/playwright';
const axe = await new AxeBuilder({ page }).withRules(['target-size', 'meta-viewport', 'css-orientation-lock']).analyze();
// axe-core 4.14.0 violations: [{ id: 'target-size', impact: 'serious', tags: ['wcag22aa','wcag258'], nodes: ['#a','#b'] }]
```

WCAG 2.2 normative anchors to cite in reports: **2.5.8** target ≥ 24×24 CSS px or a 24 px spacing
circle, with inline / equivalent / user-agent / essential exceptions (technique C42); **1.4.10**
reflow at 320 CSS px wide (1280 px at 400 % zoom) or 256 px tall, exceptions for inherently 2-D
content (maps, data tables, toolbars), failure F102, techniques C31/C32/C33/C38/G206; **1.3.4**
no single-orientation lock unless essential (piano app, cheque capture), failures F97 (lock) and
F100 (asking the user to rotate), technique G214.

### 1.9 State-preservation snapshot pattern (web) — VERIFIED (`exp7-axe-state.mjs`)

Serve the fixture from a real origin (`page.route('http://fixture.test/**', ...)`); `setContent`
on `about:blank` denies `localStorage`.

```js
const snapshot = () => ({
  url: location.href, historyState: JSON.stringify(history.state),
  scrollY: Math.round(scrollY), activeElementId: document.activeElement?.id || null,
  selection: (() => { const el = document.activeElement; return (el && 'selectionStart' in el) ? [el.selectionStart, el.selectionEnd] : null; })(),
  form: Object.fromEntries([...document.querySelectorAll('input,textarea,select')].map(e => [e.id, e.value])),
  localStorage: { ...localStorage }, sessionStorage: { ...sessionStorage },
  media: [...document.querySelectorAll('video,audio')].map(m => ({ id: m.id, t: m.currentTime, paused: m.paused })),
});
const before = await page.evaluate(snapshot);
await page.setViewportSize({ width: 839, height: 412 });          // the transition
const after = await page.evaluate(snapshot);
const changed = Object.keys(before).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
// observed: changed === []  (draft text, selection [2,7], select value, scrollY 1200, storage, history all survived)
```

Extend per scenario: `IndexedDB` keys, `document.visibilityState`, custom `window.__appState`
hooks the app exposes under test, and a `MutationObserver` log to detect remounts (a React
subtree that unmounts/remounts on resize loses focus even if values are restored). Complement
the final-state diff with intermediate sampling (`page.on('console')`, or poll every 50 ms during
the transition) because `validation.md` requires observing interruption, not just the end state.

### 1.10 Playwright test agents (healer caveat)

`npx playwright init-agents --loop=claude|vscode|opencode|codex` installs planner / generator /
healer. The healer's documented output is "a passing test, **or a skipped test** if the healer
believes that functionality is broken". Any adapter that lets the healer touch transition tests must
report skips as `blocked`/`not run`, never as pass (matches `validation.md` § Evidence levels).

## 2. Android — what is driveable (all UNVERIFIED locally; sources are AOSP main + official docs)

### 2.1 Emulator foldable AVDs

From `sdklib/.../devices.xml` (tools/base, `mirror-goog-studio-main`):

| Device definition `<d:name>` / id | Folded region (px) | Notes |
|---|---|---|
| `7.6" Fold-in with outer display` (`7.6in Foldable`) | 884×2208 | fold-in, outer display |
| `8" Fold-out` (`8in Foldable`) | 1148×2480 | `fold-at-posture 4`, hinge angle postures `180-330, 330-360` |
| `6.7" Horizontal Fold-in` (`6.7in Foldable`) | — | flip-style |
| `7.4in Rollable` | 1080×2428 → 1366×2428 | two folded regions |
| `resizable` | 1080×2092 | the Resizable AVD (phone / unfolded / tablet presets) |

Pixel Fold / Pixel 9 Pro Fold definitions ship with Android Studio's device catalogue (not in this
file). Compose preview constants (`ui-tooling-preview` `api/current.txt`): `Devices.PIXEL_FOLD =
"id:pixel_fold"`, `Devices.PIXEL_9_PRO_FOLD = "id:pixel_9_pro_fold"`, `Devices.FOLDABLE =
"spec:width=673dp,height=841dp"`, `Devices.DESKTOP = "spec:width=1920dp,height=1080dp,dpi=160"`,
`Devices.TV_1080p = "spec:width=1920dp,height=1080dp"`, `Devices.AUTOMOTIVE_1024p =
"id:automotive_1024p_landscape"`.

### 2.2 Emulator console / `adb emu` (official blog, Rob Orgiu, 31 Aug 2026)

```bash
adb emu fold              # smaller screen configuration, powers on the external display
adb emu unfold            # larger configuration, powers on the internal display
adb emu rotate            # rotates 90° clockwise (console reference text says counter-clockwise 45°; verify per emulator build)
adb emu posture           # lists: 1 closed, 2 half-opened, 3 opened  (4/5 "KO: Failed to set posture" on Pixel Fold / Resizable)
adb emu posture 2         # tabletop / book depends on hinge orientation of the AVD
adb emu resize-display    # Resizable AVD: 0 phone, 1 unfolded, 2 tablet
adb emu resize-display 1
adb -s emulator-5554 emu fold   # multiple emulators
```

Headless note: `resize-display` is "unsupported in headless configurations"; secondary
`multidisplay add` is not supported on fold profiles.

### 2.3 Device state (works on emulator and physical devices; requires shell's CONTROL_DEVICE_STATE)

From `DeviceStateManagerShellCommand.java` (frameworks/base main):

```bash
adb shell cmd device_state print-states          # supported states for THIS device, e.g. [0 CLOSED, 1 HALF_OPENED, 2 OPENED, ...]
adb shell cmd device_state print-state           # current identifier
adb shell cmd device_state state <id>            # override (fold/unfold/tabletop as the device defines them)
adb shell cmd device_state state reset           # back to sensors
adb shell cmd device_state base-state <id|reset> # override the physical base state
```

State identifiers vary per model (BrowserStack's Galaxy Fold 7 docs use `state 1` = folded,
`state 2` = unfolded; Pixel Fold reports `OPENED/CLOSED/HALF_OPENED/REAR_DISPLAY_STATE`). Always
read `print-states` first and record the mapping in the evidence.

### 2.4 Rotation, display size, density, folded area (`wm` and `settings`)

From `WindowManagerShellCommand.java` help text (main):

```bash
adb shell wm user-rotation lock 1          # [free|lock] [rotation]; 0=0°,1=90°,2=180°,3=270° relative to natural orientation
adb shell wm user-rotation free
adb shell wm size 1080x2400 | wm size 411dpx891dp | wm size reset      # "-d DISPLAY_ID" optional
adb shell wm density 420 | wm density reset
adb shell wm folded-area LEFT,TOP,RIGHT,BOTTOM | wm folded-area reset  # override the folded area
adb shell wm set-ignore-orientation-request true                        # large-screen behaviour (ignore app orientation lock)
adb shell wm set-multi-window-config --supportsNonResizable 1
# legacy equivalent of user-rotation:
adb shell settings put system accelerometer_rotation 0 && adb shell settings put system user_rotation 1
```

The numeric meaning of `user_rotation` is relative to the device's natural orientation (phones:
1 = landscape; tablets whose natural orientation is landscape invert). Record `wm user-rotation`
output, not the number you sent.

### 2.5 Split screen / multi-window launch

From `ActivityManagerShellCommand.java` help (`am start ... --windowingMode <WINDOWING_MODE>
--display <DISPLAY_ID>`) and `WindowConfiguration.java` constants (main):

| Constant | Value |
|---|---|
| `WINDOWING_MODE_UNDEFINED` | 0 |
| `WINDOWING_MODE_FULLSCREEN` | 1 |
| `WINDOWING_MODE_PINNED` | 2 |
| `WINDOWING_MODE_FREEFORM` | 5 |
| `WINDOWING_MODE_MULTI_WINDOW` | 6 |

```bash
adb shell am supports-split-screen-multi-window
adb shell am start -n com.example/.MainActivity --windowingMode 6     # generic multi-window (split pane)
adb shell am start -n com.example/.MainActivity --windowingMode 5     # freeform window (needs enable_freeform_support on some builds)
adb shell settings put global enable_freeform_support 1
```

The numbers changed between releases (freeform was 4 before multi-window existed), so pin the
constant by API level in the profile. Entering split screen from a running app has no documented
stable adb command; the docs describe Recents gestures, which UiAutomator can drive
(`UiDevice.pressRecentApps()` then a long-press/drag), or you can launch the second app with
`--windowingMode 6`. `Activity.isInMultiWindowMode()` is the in-app oracle.

### 2.6 Process death and state restoration

Official guidance (Save UI states page): `ViewModel` survives configuration change only;
`rememberSaveable` / `rememberSerializable` / `SavedStateHandle` / `onSaveInstanceState` survive
system-initiated process death; only persistent storage survives `finish()`. Saved state is written
only when the Activity stops, keep it small (Binder transaction limit).

```bash
# simulate system-initiated process death: background first, then kill (foreground processes are not killable this way)
adb shell input keyevent KEYCODE_HOME && adb shell am kill com.example
adb shell am start -n com.example/.MainActivity        # restore path; assert draft/scroll/selection
# alternative: Developer options -> "Don't keep activities" (destroys activities, keeps the process)
```

Instrumented tests: `ActivityScenario.recreate()` exercises the configuration-change path only
(ViewModel survives); it does not model process death. Compose: `StateRestorationTester`
(`androidx.compose.ui.test`) does `emulateSavedInstanceStateRestore()` for `rememberSaveable`.

### 2.7 Fold-aware unit tests — `androidx.window:window-testing`

From `WindowLayoutInfoPublisherRule.kt` and `DisplayFeatureTesting.kt` (androidx-main):

```kotlin
@get:Rule val publisherRule = WindowLayoutInfoPublisherRule()   // TestRule; overrideWindowLayoutInfo(info)

// factory, package androidx.window.testing.layout
fun FoldingFeature(activity: Activity, center: Int = FOLDING_FEATURE_CENTER_DEFAULT, size: Int = 0,
                   state: FoldingFeature.State = HALF_OPENED, orientation: FoldingFeature.Orientation = HORIZONTAL): FoldingFeature
fun FoldingFeature(windowBounds: Rect, center: Int = -1, size: Int = 0, state: State = HALF_OPENED, orientation: Orientation = HORIZONTAL): FoldingFeature
fun TestWindowLayoutInfo(displayFeatures: List<DisplayFeature>): WindowLayoutInfo

activityRule.scenario.onActivity { activity ->
  val fold = FoldingFeature(activity, state = FoldingFeature.State.HALF_OPENED, orientation = FoldingFeature.Orientation.HORIZONTAL)
  publisherRule.overrideWindowLayoutInfo(TestWindowLayoutInfo(listOf(fold)))
}
```

This mocks `WindowInfoTracker` output (state `FLAT`/`HALF_OPENED`, `orientation`, `occlusionType`
`NONE`/`FULL`, `isSeparating`, `bounds`); it does not drive a real posture change, so pair it with
`adb emu posture` / `cmd device_state` for integration evidence. Hinge angle is not exposed by
`FoldingFeature`.

### 2.8 Compose previews and screenshot tests

`@PreviewScreenSizes` (ui-tooling-preview `current.txt`) expands to: Phone (`Devices.PHONE`),
Phone-Landscape (`spec:width=411dp,height=891dp,orientation=landscape,dpi=420`), Unfolded
Foldable (`Devices.FOLDABLE`), Tablet (`spec:width=1280dp,height=800dp,dpi=240,orientation=portrait`),
Tablet-Landscape (`Devices.TABLET`), Desktop (`Devices.DESKTOP`), all `showSystemUi = true`.
`@PreviewFontScale` covers 85–200 %, `@PreviewLightDark`, `@PreviewDynamicColors`.

Compose Preview Screenshot Testing: plugin `com.android.compose.screenshot` `0.0.1-alpha16`,
tasks `./gradlew updateDebugScreenshotTest` / `validateDebugScreenshotTest`, references in
`src/screenshotTestDebug/reference`, report at `build/reports/screenshotTest/preview/debug/index.html`.
The docs now say the standalone plugin is **no longer maintained** and recommend AGP test suites
(AGP 9.5+). Screenshot tests prove static layout at a size, not transitions.

### 2.9 Assertion frameworks

| Tool | Transition driving | State assertions | Notes |
|---|---|---|---|
| Espresso + `ActivityScenario` | `recreate()`; rotation via `UiDevice.setOrientationLeft()` (UiAutomator) | `onView(...).check(matches(withText(...)))`, `SavedStateHandle` via ViewModel | in-process; no fold |
| UiAutomator | `UiDevice.executeShellCommand("cmd device_state state 2")`, `setOrientation*`, `pressRecentApps()` | text / bounds via `UiObject2` | works across apps and system UI |
| Appium UiAutomator2 | `mobile: shell` (needs `--allow-insecure=uiautomator2:adb_shell`), `mobile: activateApp/terminateApp`, `mobile: listWindows/listDisplays`, settings `enableMultiWindows` | WebDriver finds; `mobile: getDeclaredOrientation` only reads the manifest | no native fold extension; BrowserStack wraps `cmd device_state` on Galaxy Fold 7 (support-enabled add-on) |
| Maestro | `setOrientation` (portrait/landscape) only; no fold/resize/shell | `assertVisible`, `assertNotVisible`, `assertTrue`, `copyTextFrom`, `evalScript`, `stopApp`, `killApp`, `launchApp clearState` | fold must be driven out-of-band by adb between flows |

### 2.10 Requires a physical device

Real hinge sensor and angle ranges, rear-display and dual-screen modes, actual IME overlap and
keyboard height, stylus/hover, OEM-specific `device_state` identifiers and OEM multi-window
(Samsung Flex Mode, DeX), thermal/performance during rapid resizes, and any vendor skins.
Emulator postures 4/5 are unavailable on standard templates.

## 3. iOS / iPadOS — what is driveable (UNVERIFIED locally: no Xcode on this Mac)

| Capability | Mechanism | Limits |
|---|---|---|
| Rotation | XCUITest: `XCUIDevice.shared.orientation = .landscapeLeft` (read-write `UIDeviceOrientation`) | `xcrun simctl` has no rotate subcommand; third-party `@expo/serve-sim rotate` and `defaults write com.apple.iphonesimulator RotateWindowWhenSignaledByGuest` only script Simulator.app. Forum reports of first set failing (`kAXErrorServerNotFound`) and needing a retry |
| Size classes | Run XCUITest on iPad simulators; assert via `UITraitCollection` in-app hooks | Split View / Slide Over / Stage Manager have **no** simctl or XCUITest API; only gesture scripting through Appium `mobile:` drags, or real iPads (TestingBot/BrowserStack advertise Split View + Stage Manager) |
| Keyboard | XCUITest can type (`typeText`) so the simulator keyboard appears; assert via `app.keyboards.element.exists` and frames | Hardware-keyboard toggle (`⌘⇧K`) is UI-only; `simctl` cannot set it |
| Appearance / accessibility | `xcrun simctl ui <udid> appearance dark`, `simctl ui ... content_size extra-extra-large`, `increase_contrast` | these exist in Xcode 14+ (not verifiable here) |
| Cannot emulate | Hinge/fold (no Apple foldable yet), external display routing from the simulator, real touch latency, Dynamic Island occlusion fidelity, CarPlay restrictions beyond the CarPlay simulator |

## 4. Visual and structural oracles — research

### 4.1 ReFLAIR (FSE 2026, He, He, Huq, Malek, UC Irvine) — read from the PDF

- **Problem framing:** WCAG 1.4.10 reflow; a "reflow issue" = an informative widget (visible text,
  images with non-empty `alt`) or actionable widget (native controls, elements with click
  listeners) present at the original layout but missing at the reflowed one (F102).
- **Method (4 stages):** (1) widget extraction from DOM + screenshot with a three-step visibility
  filter (Selenium `is_displayed()`, viewport bounds, red-vs-white bounding-box screenshot
  diff); (2) functionality extraction by clicking each actionable widget and recording URL +
  before/after screenshots; (3) matching — exact text/alt match then LLM context check for
  duplicates, URL-base comparison for navigations, LLM 4-image comparison for in-page effects;
  (4) page exploration — `scrollIntoView` plus LLM-generated Selenium/JS code to expand collapsed
  menus (max 3 queries, error feedback loop).
- **Setup:** original 1280×1024 CSS px, reflowed 320×1024 CSS px; GPT-4.1 (`gpt-4.1-2025-04-14`).
- **Dataset:** primary 24 pages (12 popular, 7 from prior work incl. SALAD and ReDeCheck
  artifacts, 5 registered after the model's cutoff); extended 36 pages across 28 domains.
- **Results:** precision 80.49 %, recall 95.31 % (informative 81.06/95.69, actionable 80.46/95.18);
  second-best GenA11y 60.00 % precision, GPT-4.1-PE 39.91 % recall; ReDeCheck 7.29 %/4.23 %;
  WAVE and QualWeb 0/0 on this task; vs SALAD subset 74.90/96.41 vs 27.85/67.69. Extended
  dataset 84.62 % / 93.32 %.
- **Cost:** ≈562 K tokens and $1.18 per page (max multi-dollar), 3.23 h sequential / 2.04 h
  parallel per page; 4.54 h per page on the extended set. Ablation: removing exploration drops
  precision 40.08 points.
- **Reproducibility:** code and dataset public at `github.com/seal-hub/ReFLAIR` (HTML/Python,
  folders `Code`, `Ground Truth`, `Subject`, last push 2026-05-30, 1 star). Depends on an OpenAI key
  and Selenium; cost makes it unsuitable as a per-commit oracle but suitable as a reference judge
  for fixture ground truth.
- **Signals used:** element loss (information), functionality loss (action no longer achievable),
  hidden-behind-interaction discovery. It does **not** measure overflow, overlap, truncation or
  tap-target size directly.

### 4.2 ReDeCheck (Walsh, Kapfhammer, McMinn, ISSTA 2017; repo `redecheck/redecheck`)

Static, geometric, oracle-free: samples the DOM layout across a viewport-width range (default
480–1280 px) and reports five responsive layout failure (RLF) types — **element collision,
element protrusion, viewport protrusion, small-range layouts, wrapping elements**. Java +
Selenium; repo last pushed 2023-03-28 (18 stars). Reproducible but aged; the signal set is exactly
the "content and layout" row of `validation.md` and is cheap enough to run per profile.

### 4.3 Viser (Althomali, Kapfhammer, McMinn, ICST 2019) and Verve (STVR 2021)

Perceptibility filters on top of ReDeCheck: re-render a reported failure, change element opacity
and compare screenshots (Viser) or add histogram-based image comparison (Verve) to decide whether
a human would see the failure; Viser auto-classified all 117 ReDeCheck reports on 20 pages. Papers
available (White Rose eprints); no public GitHub repo located, so treat as a method, not a tool.

### 4.4 Others referenced by ReFLAIR

SALAD (USC, keyboard-user reflow issues; not publicly available), VFDetector (not available),
GenA11y (LLM WCAG checker, static), X-PERT and JANUS (cross-browser visual deltas), Walsh et al.
layout regression detection (compare two page versions' layouts across widths).

### 4.5 Which signals a slice-1 oracle should compute (cheap, deterministic, reproducible)

| Signal | Source | Compute from |
|---|---|---|
| Horizontal overflow / viewport protrusion | ReDeCheck | `document.scrollingElement.scrollWidth > innerWidth`; per-element `getBoundingClientRect().right > innerWidth` |
| Element collision / overlap | ReDeCheck | pairwise rect intersection of visible interactive elements, excluding ancestors |
| Element loss (information / functionality) | ReFLAIR, WCAG F102 | diff of accessible-tree names + roles before/after transition (`page.accessibility`-style snapshot via `aria` locators) |
| Text truncation / clipping | ReDeCheck "wrapping", common practice | `scrollWidth > clientWidth` with `overflow: hidden`, or line count increase |
| Target size | WCAG 2.5.8 | axe `target-size` |
| Reachability of the task's controls | validation.md | `expect(locator).toBeInViewport()` after scroll attempt + `isEnabled()` + actual click |
| Occluded by hinge | viewport segments | rect intersects the mask region `[offset, offset+maskLength]` |

An LLM judge (ReFLAIR-style) can be layered on later for semantic equivalence; keep it out of the
deterministic pass/fail path.

## 5. Evidence / coverage record format

### 5.1 Candidates inspected

| Format | Shape (verified) | Fit |
|---|---|---|
| **Playwright JSON reporter** (VERIFIED, `report-shape/`) | `{ config, suites[{ title, file, line, column, specs[{ title, ok, tags, id, file, line, column, tests[{ timeout, annotations[{type,description,location}], expectedStatus, projectId, projectName, status: expected\|unexpected\|flaky\|skipped, results[{ workerIndex, parallelIndex, status: passed\|failed\|timedOut\|skipped\|interrupted, duration, errors, stdout, stderr, retry, startTime, annotations, attachments[{name, contentType, path\|body}] }] }] }] }], errors, stats{ startTime, duration, expected, skipped, unexpected, flaky } }` | Rich (annotations carry `profile`, `transition`; attachments carry evidence files) but Playwright-specific; no "not applicable" or "needs physical validation" status; `skipped` conflates blocked/not-run |
| **JUnit XML** (VERIFIED) | `<testsuites tests failures skipped errors time><testsuite name timestamp hostname=project><testcase name classname time><properties><property name="profile" value="pixel7@rev3"/></properties><failure message type>…</failure><system-out>[[ATTACHMENT|path]]</system-out>` | Universal CI ingestion; annotations survive as `<property>`; attachments only as a text convention; three statuses only |
| **SARIF 2.1.0** (schema inspected) | `{ version: "2.1.0", $schema, runs[{ tool.driver{ name, version, rules[{ id, shortDescription, helpUri, properties }] }, invocations[{ executionSuccessful, ... }], artifacts[], results[{ ruleId, ruleIndex, kind: notApplicable\|pass\|fail\|review\|open\|informational (default fail), level: none\|note\|warning\|error (default warning), message, locations[{ physicalLocation{ artifactLocation{uri}, region }, logicalLocations }], attachments[], baselineState: new\|unchanged\|updated\|absent, fingerprints, suppressions, properties{} }] }] }` | Has first-class **pass / notApplicable / review / open** result kinds, rule catalogue (one rule per acceptance check, `helpUri` → WCAG), attachments, baselines, and property bags for profile/transition/units; GitHub code scanning and many viewers ingest it. Designed for code locations, so UI locations go in `logicalLocations` (selector/role) + `properties` |
| OpenTelemetry | semconv registry has `test.case.name`, `test.case.result.status` (pass/fail), `test.suite.name`, `test.suite.run.status` (success/failure/skipped/aborted/timed_out/in_progress), all **Development** stability | Good for timing/tracing a run, not as the durable record; no notion of rule, evidence or applicability |

### 5.2 Recommendation

Adopt **SARIF 2.1.0 as the canonical evidence record**, generated by the adapter (and derivable
from the Playwright JSON report via a small converter), and emit JUnit XML as a CI side-channel.
Mapping for the labels in `validation.md`:

| validation.md label | SARIF `kind` / `level` | Extra |
|---|---|---|
| `pass` | `kind: pass`, `level: none` | |
| `fail` | `kind: fail`, `level: error` (or `warning` for soft checks) | attachments: screenshots, state diff JSON, trace |
| `blocked` | `kind: open`, `level: warning` | `properties.blockedReason` |
| `not run` | `kind: notApplicable` | `properties.reason: "not selected"` |
| `needs physical validation` | `kind: review`, `level: note` | `properties.evidenceLevel: "emulated"` |

Each acceptance check (reachable controls, state preservation, reflow, target size, hinge
occlusion …) becomes a `rule` with `helpUri` pointing at the WCAG or project doc; each
(profile × transition × task) result carries `properties: { app, build, platform, engineVersion,
profileId, profileRevision, transition, units: 'CSS px', emulated: true, snapshotBefore,
snapshotAfter }`, and `baselineState` lets a later run say what changed. This also keeps the
"source inspected" vs "observed to pass" distinction explicit through `kind` rather than through
free text.

## 6. Recommended adapter stack for slice 1 (web first)

1. **Runner:** `@playwright/test` 1.64.1, projects per profile (`devices[...]` spread + explicit
   `viewport`, `deviceScaleFactor`, `isMobile`, `hasTouch`, `screen`), Chromium for foldable and
   posture branches, WebKit/Firefox for breakpoint/rotation/media parity.
2. **Transition drivers (Chromium adapter):** `page.setViewportSize` (rotate/resize/keyboard
   `resizes-content`), CDP `Emulation.setDeviceMetricsOverride` with `displayFeature` +
   `devicePosture` + `screenOrientation` (fold/unfold/tabletop), `setSafeAreaInsetsOverride`,
   `emulateMedia` (motion/contrast/scheme); re-apply the fold override after every Playwright
   viewport change; record `navigator.devicePosture` as unavailable.
3. **Oracles:** state-snapshot diff (§1.9) sampled before, during and after; reachability
   (`toBeInViewport` + click + stored result); ReDeCheck-style geometry (overflow, overlap,
   clipping, hinge-mask intersection); axe-core 4.14 with `target-size` and `meta-viewport`
   enabled; accessible-tree name/role diff for element loss.
4. **Evidence:** `testInfo.attach` for JSON snapshots and PNGs, Playwright trace on failure, and
   a converter to SARIF 2.1.0 (+ JUnit for CI). Skips from the healer map to `open`/`review`,
   never `pass`.
5. **Android (slice 2 candidate):** Gradle managed devices or a CI emulator with a foldable AVD,
   `adb emu fold/unfold/posture`, `cmd device_state`, `wm user-rotation`, `am start
   --windowingMode 6`, `am kill` for process death; UiAutomator for cross-app assertions;
   `window-testing` for unit-level posture branches. iOS stays `needs physical validation` beyond
   XCUITest rotation.

## 7. Sources (inspected 28 Oct 2026)

Playwright and Chromium
- npm registry: `npm view playwright version` → 1.64.1; `npm view axe-core version` → 4.14.0.
- Playwright release notes — https://playwright.dev/docs/release-notes
- Playwright emulation docs (via Context7 `/microsoft/playwright`) — https://playwright.dev/docs/emulation
- Playwright reporters — https://playwright.dev/docs/test-reporters
- Playwright test agents (healer behaviour) — https://playwright.dev/docs/test-agents
- Playwright touch events guide — https://playwright.dev/docs/touch-events
- CDP Emulation domain, tip-of-tree JSON — https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json
- Chromium `content/browser/devtools/protocol/emulation_handler.cc` (main) — https://chromium.googlesource.com/chromium/src/+/main/content/browser/devtools/protocol/emulation_handler.cc
- DevTools emulated device catalogue — https://chromium.googlesource.com/devtools/devtools-frontend/+/main/front_end/models/emulation/EmulatedDevices.ts
- Chrome DevTools device mode — https://developer.chrome.com/docs/devtools/device-mode
- Foldable APIs origin trial (Chrome 125–128) — https://developer.chrome.com/blog/foldable-apis-ot
- Viewport Segments API shipped (Chrome 138) — https://developer.chrome.com/blog/viewport-segments-api-shipped
- Device Posture API shipping (Chrome 132) — https://lists.w3.org/Archives/Public/public-device-apis/2024Nov/0009.html ; https://web-platform-dx.github.io/web-features-explorer/features/device-posture ; MDN https://developer.mozilla.org/en-US/docs/Web/API/DevicePosture
- Viewport resize behaviour / `interactive-widget` — https://developer.chrome.com/blog/viewport-resize-behavior
- VirtualKeyboard API — https://developer.chrome.com/docs/web-platform/virtual-keyboard

Accessibility
- axe-core rule descriptions — https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md
- WCAG 2.2 Understanding 2.5.8 — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WCAG 2.2 Understanding 1.4.10 — https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- WCAG 2.2 Understanding 1.3.4 — https://www.w3.org/WAI/WCAG22/Understanding/orientation.html

Android
- "Emulator control for adaptive app development", Android Developers Blog, 31 Aug 2026 — https://developer.android.com/blog/posts/emulator-control-for-adaptive-app-development
- Emulator console reference — https://developer.android.com/studio/run/emulator-console
- Emulator command line — https://developer.android.com/studio/run/emulator-commandline
- AOSP `DeviceStateManagerShellCommand.java`, `ActivityManagerShellCommand.java`, `WindowManagerShellCommand.java`, `WindowConfiguration.java` (frameworks/base, main) — https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/
- SDK device definitions `devices.xml` — https://android.googlesource.com/platform/tools/base/+/refs/heads/mirror-goog-studio-main/sdklib/src/main/resources/com/android/sdklib/devices/devices.xml
- Foldables overview — https://developer.android.com/guide/topics/large-screens/learn-about-foldables
- Compose foldable support (FoldingFeature) — https://developer.android.com/develop/ui/compose/layouts/adaptive/support-foldables
- Multi-window mode (testing checklist, `--windowingMode` absent there) — https://developer.android.com/develop/ui/views/layout/support-multi-window-mode
- Save UI states — https://developer.android.com/topic/libraries/architecture/saving-states
- androidx `window-testing` sources — https://github.com/androidx/androidx/tree/androidx-main/window/window-testing/src/main/java/androidx/window/testing/layout
- Compose `ui-tooling-preview` API surface (`current.txt`, `1.8.0-beta01.txt`) — https://github.com/androidx/androidx/tree/androidx-main/compose/ui/ui-tooling-preview/api
- Compose previews — https://developer.android.com/develop/ui/compose/tooling/previews
- Compose Preview Screenshot Testing — https://developer.android.com/studio/preview/compose-screenshot-testing
- Appium UiAutomator2 driver README — https://github.com/appium/appium-uiautomator2-driver
- Maestro commands — https://docs.maestro.dev/api-reference/commands
- BrowserStack foldable testing (Galaxy Fold 7, `cmd device_state`) — https://www.browserstack.com/docs/app-automate/appium/test-on-foldable-devices
- `user_rotation` / `accelerometer_rotation` community recipe (secondary) — https://stackoverflow.com/questions/25864385

iOS
- `XCUIDevice.orientation` — https://developer.apple.com/documentation/xcuiautomation/xcuidevice/orientation
- `@expo/serve-sim` rotate helper (secondary) — https://tessl.io/registry/skills/github/EvanBacon/serve-sim/serve-sim
- Apple forums on Stage Manager in simulator / split view limits (secondary) — https://developer.apple.com/forums/thread/708567 , https://developer.apple.com/forums/thread/4087

Research
- ReFLAIR, FSE 2026 (PDF read in full) — https://seal.ics.uci.edu/publications/2026_FSE.pdf ; code https://github.com/seal-hub/ReFLAIR ; DOI https://doi.org/10.1145/3808136
- ReDeCheck (ISSTA 2017) — https://github.com/redecheck/redecheck ; paper https://www.cs.allegheny.edu/sites/gkapfham/research/papers/Walsh2017
- Viser (ICST 2019) — https://eprints.whiterose.ac.uk/id/eprint/230100 ; Verve (STVR 2021) — https://eprints.whiterose.ac.uk/165542/

Formats
- SARIF 2.1.0 errata 01 schema — https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json ; spec https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html ; tutorial https://github.com/microsoft/sarif-tutorials/blob/main/docs/2-Basics.md
- OpenTelemetry semconv `test.*` attributes — https://opentelemetry.io/docs/specs/semconv/registry/attributes/test/

Local experiment scripts (VERIFIED outputs quoted above): `exp1-basic.mjs`, `exp2-foldable-cdp.mjs`,
`exp3-foldable-order-flags.mjs`, `exp4-keyboard-safearea.mjs`, `exp5-features-reload.mjs`,
`exp6-features-noviewport.mjs`, `exp7-axe-state.mjs`, `report-shape/` in
`<local-tmp>/pw-experiments/`.
