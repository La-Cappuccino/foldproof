# Device and scenario profile sources

Research record for the sourced, versioned profile corpus. Inspected live on 2026-10-28 unless a row says otherwise. Every number below is tagged with where it came from; nothing is asserted from memory. Where a vendor page would not render or a value could not be verified, the row says **unverified** and the value must not ship.

Related: [concepts](../concepts.md) · [proposed architecture](../proposed-architecture.md)

## 1. Summary

- **Build the corpus from five legally clean sources:** Playwright device descriptors (Apache-2.0), Chrome DevTools emulated devices (BSD-3-Clause), MDN browser-compat-data (CC0-1.0), the AOSP emulator device definitions (`devices.xml`, `nexus.xml`, `tv.xml`, `automotive.xml`, Apache-2.0 AOSP), and first-party vendor tech-spec pages (Apple, Google, OnePlus, Microsoft archive) quoted as facts with URL and date.
- **Do not copy from** GSMArena (personal, non-commercial only, no reproduction without written permission), yesviz (all rights reserved), blisk (no licence stated), DeviceAtlas or 51Degrees (commercial). They are fine for cross-checking by hand, not for ingestion.
- **No database provides hinge bounds for flexible-screen foldables.** Playwright has no hinge concept. DevTools has a hinge rect per spanned mode, but its spanned sizes for Pixel 9 Pro Fold and Galaxy Z Fold 6 do not reconcile with the hardware pixel counts (section 4.2). The AOSP emulator definitions are the only sourced hinge geometry, and they describe emulator profiles, not retail phones.
- **Keyboard height, Stage Manager window sizes, Dynamic Island metrics and Apple foldable point dimensions are not published anywhere authoritative.** They must be `measured` fields, never `published` fields.
- **Platform APIs are now stable enough to anchor runtime adapters:** Device Posture API is a W3C Candidate Recommendation Draft (2026-10-26) shipped in Chrome 132; Viewport Segments shipped in Chrome 138; both are absent in Firefox and desktop Safari.

## 2. Platform sources and units

### 2.1 Web

Support data is from MDN browser-compat-data v8.1.7 (CC0) read directly from the repository JSON, plus caniuse for viewport-unit variants. "mirror" in BCD means the mobile or Chromium-derived browser follows the parent engine's version.

| Capability | Spec / status | What it exposes | Units | Chrome | Firefox | Safari | Other |
|---|---|---|---|---|---|---|---|
| Device Posture API | W3C Candidate Recommendation Draft, 2026-10-26 | `navigator.devicePosture.type` = `continuous` or `folded`; `change` event; CSS `@media (device-posture: folded)` | enum | 132 (Android, Edge mirror) | no | desktop no; iOS 27 behind a flag | Samsung Internet 16.2 |
| Viewport Segments | CSS Environment Variables Level 1, Editor's Draft 2026-10-08, plus Chrome 138 shipping post | `window.viewport.segments` (array of `DOMRect`, one segment when flat); `env(viewport-segment-width x y)` and `-height/-top/-left/-bottom/-right`, indices are column then row from 0; defined only when there are at least two segments; `@media (horizontal-viewport-segments: 2)` and `vertical-viewport-segments` | CSS px (`<length>`) | 138 (origin trial 125 to 128) | no | no | Edge 138 |
| Window Management API | Editor's Draft 2026-09-08 (Second Screen WG) | `window.getScreenDetails()`, `ScreenDetailed` with `left`, `top`, `availLeft`, `availTop`, `isPrimary`, `isInternal`, `devicePixelRatio`, `label`; `Screen.isExtended`; needs `window-management` permissions policy and secure context | screen-area coordinates; spec does not state CSS px for `left/top` | 100 | no | no | Edge mirror |
| Visual Viewport | Baseline widely available since 2021-08 | `offsetLeft/Top`, `pageLeft/Top`, `width`, `height`, `scale`; `resize`, `scroll`, `scrollend` | CSS px | 61 | 91 (Android 68) | 13 | |
| `interactive-widget` viewport directive | MDN meta reference | `resizes-visual` (default), `resizes-content`, `overlays-content`; resizing the layout viewport also resizes the initial containing block and viewport units | keyword | 108 changed Android default to `resizes-visual` | Android and iOS Firefox resize both viewports | iOS resizes visual viewport only | BCD has no compat entry for this directive (gap to note in the corpus) |
| VirtualKeyboard API and `env(keyboard-inset-height)` | MDN | keyboard geometry when `overlaysContent` is set | CSS px | 94 | no | no | |
| `env(safe-area-inset-*)` | CSS env Level 1 | four insets plus `safe-area-max-inset-*` | CSS px | 69 | 65 | 11 | |
| `svh` / `lvh` / `dvh` | CSS Values | small, large, dynamic viewport; `vh` equals `lvh`; `dvh` changes while scrolling | CSS px | 108 | 101 | 15.4 (iOS 15.4) | Samsung 21; 95.94% global (caniuse) |
| `pointer` / `hover` | Media Queries 4, Baseline since 2018-12 | primary input only; `any-pointer` / `any-hover` for all inputs | keyword | 41 / 38 | 64 | 9 | Edge 12. Chrome Android note: some Samsung devices wrongly match `(hover: hover)` |
| `prefers-reduced-motion` | Media Queries 5 | `reduce` / `no-preference` | keyword | 74 | 63 | 10.1 | |
| CSS `px` | CSS Values | 1px = 1/96 in; on high-density screens one CSS px covers several device px | reference pixel | all | all | all | |

Consequences for the corpus: a web profile must record CSS px for the layout viewport, `devicePixelRatio`, and separately the visual viewport after keyboard open. `device-posture` and segments are observable only in Chromium today, so a profile that claims "folded" has no runtime signal in Safari or Firefox.

### 2.2 Android

| Topic | Source | Facts verified |
|---|---|---|
| Window size classes | `androidx.window.core.layout.WindowSizeClass` source (androidx-main) and the Compose guide | Width lower bounds in dp: Medium 600, Expanded 840, Large 1200, Extra-large 1600. Height lower bounds: Medium 480, Expanded 900. Large and Extra-large require `currentWindowAdaptiveInfo(supportLargeAndXLargeWidth = true)`. `BREAKPOINTS_V1` is the five-class set, `BREAKPOINTS_V2` adds the two large classes. |
| WindowMetrics | `androidx.window.layout.WindowMetrics` source | `bounds` is a `Rect` in pixels including insets from all system decorations and can differ from `Display.getSize()`; `density` is the logical display density; `widthDp` and `heightDp` are provided. |
| FoldingFeature | `androidx.window.layout.FoldingFeature` source; reference page; Samsung Flex mode page | `state` is `FLAT` or `HALF_OPENED`; `orientation` is `HORIZONTAL` or `VERTICAL`; `occlusionType` is `NONE` (flexible screen, treat as guideline) or `FULL` (hinge is part of the window, avoid completely); `isSeparating` is true for hinges always and for folds when not `FLAT`; `bounds` is the feature rectangle within the window. Tabletop = `HALF_OPENED` + `HORIZONTAL`; book = `HALF_OPENED` + `VERTICAL`. Samsung reports foldables as `TYPE_FOLD` and asks for WindowManager 1.0.0 or later. No hinge angle numbers are published by Samsung. |
| Density and dp | Screen densities guide | `px = dp * (dpi / 160)`; buckets ldpi 120 (0.75), mdpi 160 (1.0 baseline), tvdpi ~213 (1.33), hdpi 240 (1.5), xhdpi 320 (2.0), xxhdpi 480 (3.0), xxxhdpi 640 (4.0). Use `TypedValue.applyDimension`, do not hardcode. |
| Display cutouts | Display cutout guide | `WindowInsetsCompat.getDisplayCutout()` gives safe insets and bounding rects. Modes `default`, `shortEdges`, `never`, `always`. Apps targeting SDK 35 on Android 15 are forced to `always` for non-floating windows. Developer options can simulate a cutout on API 28+. |
| Multi-window | Multi-window support guide | `<layout android:minWidth/minHeight>` set minimum sizes for split-screen and desktop windowing (API 24+). On medium and expanded windows all apps run in multi-window regardless of config. Target API 36 on displays with smallest width >= 600dp: orientation, aspect ratio and resizability restrictions are ignored. The guide does not state a default minimum size; record the split as measured. |
| Emulator device definitions | AOSP `platform/tools/base` sdklib resources `devices.xml`, `nexus.xml`, `tv.xml`, `automotive.xml` (branch `mirror-goog-studio-main`) | These XML files are the hardware profiles Android Studio ships. They contain `diagonal-length`, `pixel-density`, `dimensions`, `foldable-region` (folded offset and folded dimensions), and a `hinge` block with `ranges`, `defaults`, `areas`, `posture-list` and `hinge-angles-posture-definitions`. Values in section 4.4. The developer.android.com pages inspected (managing AVDs, emulator, extended controls, foldables overview) do not document this file; the Fold and Unfold buttons are documented. |
| Cars | Car app quality guidelines; Android Automotive parked-app guide; `CarUxRestrictions` reference | Driving restrictions: video, games and browsers must not be launchable or visible while driving (DD-2, DD-3); tasks within five screens, buttons respond within two seconds (AC-1, DR-1); no animation (SA-1), no auto-scrolling text (ST-1), no heads-up notifications (IN-2). Car differentiated tier: touch targets at least 64dp, 24dp spacing from each other and edges, fonts at least 24sp (UX-1 to UX-3). Runtime: `CarUxRestrictionsManager` and `CarUxRestrictions.isRequiresDistractionOptimization()`; restriction bit flags NO_DIALPAD 1, NO_FILTERING 2, LIMIT_STRING_LENGTH 4, NO_KEYBOARD 8, NO_VIDEO 16, LIMIT_CONTENT 32, NO_SETUP 64, NO_TEXT_MESSAGE 128, NO_VOICE_TRANSCRIPTION 256, FULLY_RESTRICTED 511. Do not infer restrictions from gear or speed; restrictions can differ per display. Activities are not distraction-optimized unless the `distractionOptimized` meta-data is set, and parked apps must not set it. |
| TV | Compose for TV layouts guide; design guides | Overscan: keep required elements inside a 48dp left/right and 27dp top/bottom margin (about 5%); do not clip background elements. Density mapping: 720p = tvdpi, 1080p = xhdpi, 4K = xxxhdpi. Design for a viewer 10 feet away; D-pad navigation, no swipe-only gestures; light text on dark background. Emulator profiles: Television (1080p) 1920x1080 xhdpi, (4K) 3840x2160 xxxhdpi, (720p) 1280x720 tvdpi. |

### 2.3 Apple

| Topic | Source | Facts verified |
|---|---|---|
| Size classes | `UIUserInterfaceSizeClass` reference; HIG Layout | Cases `unspecified`, `compact`, `regular`. HIG: horizontal class says whether the app is narrow or wide, vertical class says short or tall. The HIG Layout page no longer contains a device dimension table; it refers to Apple Design Resources. |
| Safe area and Dynamic Island | HIG Layout | Safe area is "the area within a window that isn't covered on the edge by a hardware feature or another view within the window". The Dynamic Island is listed as a hardware feature to respect. No numeric Dynamic Island metrics are published on the page. |
| Multitasking and Stage Manager | HIG Multitasking; TN3192 | iPadOS apps are resizable; "Apps don't control multitasking configurations or receive any indication of the ones that people choose." `UIRequiresFullScreen` deprecated in iPadOS 26; from iOS 27 and iPadOS 27 the key no longer opts out of resizing and the system resizes scenes discretely for such apps. `UIWindowScene.sizeRestrictions` is a preferred minimum (Apple example: 500 pt width), nil where unsupported. No system minimum or maximum window size is published. |
| Foldable | apple.com iPhone Duo tech specs | Apple sells a foldable, the iPhone Duo. Inner: 7.6-inch OLED, 1878-by-2670 px at 430 ppi. Outer: 5.4-inch OLED, 1398-by-2034 px at 460 ppi. Open 164.6 x 117.8 x 5.2 mm; closed 84.1 x 117.8 x 11.3 mm; 254 g. The spec page does not state scale factor or point dimensions, and neither Playwright nor DevTools has an entry yet. A developer-facing posture or hinge API for iOS was not found in this pass; treat as unknown, not absent. |
| Points | Playwright webkit entries | On iOS Safari the CSS px layout width equals the device width in points (for example iPhone 17 Pro 402 x 874 at scale 3). Apple's own scale factor is not on the tech-spec page; record scale as derived from Playwright or measured. |

### 2.4 Windows and dual-screen

| Topic | Source | Facts verified |
|---|---|---|
| TwoPaneView | Microsoft Learn, updated 2026-08-28, current | Modes `SinglePane`, `Wide`, `Tall`; `MinWideModeWidth` and `MinTallModeHeight` default 641 px; pane length uses auto and star sizing. |
| Surface Duo | Microsoft Learn previous-versions archive, `is_archived: true`, dated 2021-09-22 | Density class xxhdpi, factor 2.5x; full width including hinge mask Surface Duo 1,114dp / 2,784px, Surface Duo 2 1,100dp / 2,754px; 360-degree hinge with a hinge angle sensor API. Still useful as the canonical `occlusionType = FULL` case. |

## 3. Physical to logical conversion rules

| Layer | Rule | Source |
|---|---|---|
| CSS px | 1 CSS px = 1/96 in reference pixel. `window.devicePixelRatio` = device px per CSS px and includes browser zoom. `viewport CSS width = device px / devicePixelRatio` only at 100% zoom with `width=device-width`. | MDN `<length>`, MDN viewport meta |
| Layout vs visual viewport | Keyboard and pinch zoom change the visual viewport; whether the layout viewport changes depends on `interactive-widget` and browser (Chrome 108+ default visual only; iOS Safari visual only; Firefox both). Viewport units follow the layout viewport; `dvh` tracks dynamic browser UI, not the keyboard. | Chrome viewport resize post; MDN |
| Android dp | `dp = px / (dpi / 160)`; `WindowMetrics.density` is the exact factor; size classes are computed from `widthDp` and `heightDp` of the window, not the display. Emulator densities such as `420dpi` give 2.625; `390dpi` gives 2.4375. | Screen densities guide; WindowMetrics source |
| Chromium on Android | DPR follows Android density (Pixel 7 at 420dpi reports 2.625 in Playwright and DevTools). | Playwright and DevTools registries |
| iOS pt | `pt = px / scale`; Safari CSS px equals pt. Scale is not on Apple tech-spec pages; take it from Playwright (`deviceScaleFactor`) or measure. | Playwright |
| Inches | Diagonal inches and mm are physical; never derive layout from them without the density. | concepts.md |

Record every value with one of three provenance kinds: `published` (quoted from a source), `derived` (computed, state the formula and inputs), `measured` (observed at runtime, state the tool and date).

## 4. Device dimension databases

### 4.1 Licence and field comparison

| Source | Licence | Fields | Folded and unfolded | Hinge | Density | Verdict |
|---|---|---|---|---|---|---|
| Playwright `packages/isomorphic/deviceDescriptorsSource.json` (207 entries; file moved from `playwright-core/src/server`) | Apache-2.0 | `screen` (optional), `viewport`, `deviceScaleFactor`, `isMobile`, `hasTouch`, `defaultBrowserType`, `userAgent`; landscape variants | Yes for Galaxy Z Fold 6/7 and Flip 6/7 as separate `Cover` entries | No | DPR | Ingest |
| Chrome DevTools `front_end/models/emulation/EmulatedDevices.ts` | BSD-3-Clause | `screen.horizontal/vertical`, `device-pixel-ratio`, `vertical-spanned/horizontal-spanned` with `hinge {x,y,width,height}`, `capabilities`, `type`, UA, `dual-screen` / `foldable-screen` flags | Yes (default vs spanned modes) | Yes, in CSS px | DPR | Ingest, but flag spanned sizes (4.2) |
| MDN browser-compat-data | CC0-1.0 (v8.1.7) | per-feature support versions, flags, notes | n/a | n/a | n/a | Ingest for capability support |
| AOSP sdklib `devices.xml`, `nexus.xml`, `tv.xml`, `automotive.xml`, `wear.xml` | Apache-2.0 (AOSP tools/base; confirm NOTICE before shipping) | diagonal, density, px dimensions, foldable region, hinge ranges and posture definitions, default state, screen size bucket | Yes | Yes (`areas`, angle ranges) | dpi bucket | Ingest as emulator profiles |
| tobua/device-sizes (npm `device-sizes`) | MIT per package.json; no LICENSE file at `main` | width, height, size (in), density (ppi), scale, brand, camera, type | No | No | ppi and scale | Optional cross-check only |
| Vendor tech-spec pages (Apple, Google support, OnePlus, Microsoft archive, LG, Apple Studio Display) | Facts quoted with attribution; pages are copyrighted | panel px, inches, ppi, mm, g | Yes for foldables | No | ppi | Quote facts with URL and date; do not mirror pages |
| GSMArena | "solely for personal, informational, non-commercial purposes"; no reproduction without written permission | full specs | Yes | No | ppi | Do not ingest |
| yesviz | "All Rights Reserved", no licence | viewport CSS px, px, ppi, ratio, includes Fold 7 984 x 1092 | Yes | No | DPR | Do not ingest |
| blisk | terms not inspected; no licence on device page | viewport, pixel ratio | No foldables seen | No | DPR | Do not ingest |
| screensiz.es | unreachable (HTTP 504 twice on 2026-10-28) | unknown | unknown | unknown | unknown | Re-check later |
| DeviceAtlas, 51Degrees, Kaggle GSMArena scrapes | commercial or derived from GSMArena | full | Yes | No | ppi | Do not ingest |

### 4.2 Reconciliation of foldable entries across databases

| Device | Playwright (CSS px @ DPR) | DevTools (CSS px @ DPR) | Hardware px (vendor or emulator) | Reconciles? |
|---|---|---|---|---|
| Galaxy Z Fold 7 inner | 984 x 1092 @ 2 (viewport 984 x 1016) | not present | 1968 x 2184 derived from Playwright; Samsung specs page did not render (unverified) | Playwright self-consistent |
| Galaxy Z Fold 7 cover | 360 x 840 @ 3 (viewport 360 x 764) | not present | 1080 x 2520 derived | same |
| Galaxy Z Fold 6 inner | 928 x 1080 @ 2 | spanned 744 x 860 @ 2.625, hinge width 0 at x=372 | Playwright implies 1856 x 2160; DevTools implies 1953 x 2257 | **No.** Two registries disagree by about 100 px. Keep both with provenance; measure on hardware before trusting either. |
| Galaxy Z Fold 6 cover | 484 x 1188 @ 2 | 412 x 968 @ 2.625 | 968 x 2376 vs 1081 x 2541 | **No.** |
| Pixel 9 Pro Fold inner | not present | spanned 836 x 842 @ 2.625, hinge width 0 at x=418 | Google: 2076 x 2152; emulator density 390dpi gives 851.7 x 882.9 dp | **No.** DevTools spanned size matches neither the hardware px count nor the emulator density. |
| Pixel 9 Pro Fold outer | not present | 412 x 922 @ 2.625 | Google: 1080 x 2424; 1080/2.625 = 411.4 | Yes for width |
| Surface Duo | not present | 540 x 720 per screen @ 2.5; spanned 1114 x 720, hinge 34 CSS px at x=540 | Microsoft: 1,114dp / 2,784px full width at 2.5x | Yes (34 CSS px hinge = 85 px) |
| Asus Zenbook Fold | not present | 853 x 1280 @ 1.5; spanned 1706 x 1280, hinge 107 CSS px | not checked | n/a |

Lesson for the schema: a registry entry is `published` by that registry, not ground truth for the device. The corpus must store the registry name and commit alongside the value, and a `conflicts_with` link when two sources disagree.

### 4.3 Verified vendor numbers

| Device | Source | Inner panel | Outer panel | Dimensions | Weight |
|---|---|---|---|---|---|
| Google Pixel 10 Pro Fold (2025) | support.google.com hardware specs | 8-inch, 2076 x 2152, 373 ppi | 6.4-inch, 1080 x 2364, 408 ppi | folded 155.2 x 76.3 x 10.8 mm; unfolded 155.2 x 150.4 x 5.2 mm | 258 g |
| Google Pixel 9 Pro Fold (2024) | same | 8-inch, 2076 x 2152, 373 ppi | 6.3-inch, 1080 x 2424, 422 ppi | folded 155.2 x 77.1 x 10.5 mm; unfolded 155.2 x 150.2 x 5.1 mm | 257 g |
| Apple iPhone Duo | apple.com tech specs | 7.6-inch, 1878 x 2670, 430 ppi | 5.4-inch, 1398 x 2034, 460 ppi | open 164.6 x 117.8 x 5.2 mm; closed 84.1 x 117.8 x 11.3 mm | 254 g |
| OnePlus Open | oneplus.com specs | 7.82-inch, 2440 x 2268, 426 ppi, ratio 1.0758:1 | 6.31-inch, 2484 x 1116, 431 ppi | unfolded 153.4 x 143.1 x 5.8/5.9 mm; folded 153.4 x 73.3 x 11.7/11.9 mm | 239 / 245 g |
| Microsoft Surface Duo / Duo 2 | Microsoft Learn archive | full width incl. hinge mask 2,784 px / 1,114 dp (Duo), 2,754 px / 1,100 dp (Duo 2), 2.5x | n/a | not on page | not on page |
| Samsung Galaxy Z Fold7 | samsung.com US and UK specs pages rendered without the spec table; global page 404; newsroom timed out | **unverified** (third-party resellers report 2184 x 1968 and cover 2520 x 1080; consistent with Playwright but not vendor-confirmed) | unverified | US page states 8.9 mm folded thickness and an 8-inch main screen | unverified |
| Honor Magic V5 | honor.com global page and spec page rendered without values | 7.95-inch, resolution unverified | 6.43-inch, resolution unverified | 8.8 mm thick (state unspecified) | 217 g |
| Motorola razr | motorola.com store pages carry no spec table | unverified | unverified | unverified | unverified |
| LG 34WQ75C-B ultrawide | lg.com | 34-inch curved, 3440 x 1440 (page says discontinued) | | | |
| Apple Studio Display | apple.com | 27-inch, 5120 x 2880, 218 ppi | | | |
| Dell P2425H pivot monitor | only reseller pages found; dell.com page not located | 1920 x 1080, pivot reported by resellers | | | **unverified** |

### 4.4 AOSP emulator profiles with hinge data

All from `platform/tools/base` sdklib resources on `mirror-goog-studio-main`, inspected 2026-10-28. Posture list `1, 2, 3` maps to hinge-angle ranges `0-30, 30-150, 150-180` (closed, half-open, open). `areas` is the hinge rectangle encoded as `x-y-width-height` in px of the unfolded panel.

| Profile | Panel px | Density | dp (derived) | Folded region px | Hinge areas | Default state |
|---|---|---|---|---|---|---|
| 7.6" Fold-in with outer display | 1768 x 2208 | 420dpi (2.625) | 673.5 x 841.1 | 884 x 2208 at offset 0,0 | not in this profile's hinge block beyond ranges | Portrait |
| Pixel Fold | 2208 x 1840 | 420dpi | 841.1 x 701.0 | 1080 x 2092 | `1080-0-0-1840` (zero-width fold at x=1080) | Landscape, changes orientation on fold |
| Pixel 9 Pro Fold | 2076 x 2152 | 390dpi (2.4375) | 851.7 x 882.9 | 1080 x 2424 | `1038-0-0-2152` (zero-width fold at x=1038) | Landscape, changes orientation on fold |
| Pixel 10 Pro Fold | 2076 x 2152 | 390dpi | 851.7 x 882.9 | 1080 x 2364 | `1038-0-0-2152` | Landscape |
| Resizable (Experimental) | 1080 x 2400 | 420dpi | 411.4 x 914.3 | 1080 x 2092 | `1080-0-0-1840` | Portrait |
| Medium Tablet | 2560 x 1600 | xhdpi (2.0) | 1280 x 800 | n/a | n/a | Landscape |
| Pixel Tablet | 2560 x 1600 | xhdpi | 1280 x 800 | n/a | n/a | Landscape |
| Television (1080p) | 1920 x 1080 | xhdpi | 960 x 540 | n/a | n/a | Landscape |
| Television (4K) | 3840 x 2160 | xxxhdpi (4.0) | 960 x 540 | n/a | n/a | Landscape |
| Television (720p) | 1280 x 720 | tvdpi (1.33) | 962 x 541 | n/a | n/a | Landscape |
| Automotive (1024p landscape) | 1024 x 768 | mdpi (1.0) | 1024 x 768 | n/a | n/a | Landscape |
| Automotive (1408p landscape) | 1408 x 792 | mdpi | 1408 x 792 | n/a | n/a | Landscape |
| Automotive Portrait | 800 x 1280 | ldpi (0.75) | 1066.7 x 1706.7 | n/a | n/a | Portrait |
| Automotive Distant Display | 1080 x 600 | ldpi | 1440 x 800 | n/a | n/a | Landscape |
| Automotive Ultrawide | 3904 x 1320 | hdpi (1.5) | 2602.7 x 880 | n/a | n/a | Landscape |
| Automotive Large Portrait | 1280 x 1606 | mdpi | 1280 x 1606 | n/a | n/a | Portrait |

Note the single density per profile: the Pixel 9 Pro Fold profile applies 390dpi to the folded 1080 x 2424 region too, which is not what the retail outer panel reports (422 ppi physical). Record emulator values as `published by AOSP emulator profile`, not as device truth.

## 5. Proposed v1 profile schema

Minimal fields, each mapped to a source family above. Format (JSON or YAML) is still open per the architecture doc.

| Field | Type | Required | Maps to |
|---|---|---|---|
| `id`, `revision`, `supersedes` | string, int, id | yes | corpus versioning |
| `kind` | `device` / `emulator-profile` / `registry-entry` / `scenario` | yes | distinguishes retail hardware, AOSP profile, Playwright or DevTools entry, and a composed test scenario |
| `platform` | `web` / `android` / `ios` / `ipados` / `windows` / `automotive` / `tv` | yes | |
| `sources[]` | `{url, publisher, inspected, licence, kind: published|derived|measured, quote?}` | yes, at least one | section 7 |
| `panels[]` | `{name: inner|outer|single, physical_px: {w,h}, diagonal_in, ppi, density_dpi?, scale?}` | yes | vendor pages, AOSP |
| `logical[]` | `{unit: css_px|dp|pt, w, h, scale, derivation, source_ref}` | yes | Playwright, DevTools, derived |
| `usable` | `{layout_viewport: {w,h}, visual_viewport?: {w,h}, insets: {top,right,bottom,left}, cutouts[]: rect, unit}` | yes | Playwright `viewport`, Android insets, safe-area env |
| `display_features[]` | `{type: fold|hinge, bounds: rect, unit, orientation, occlusion: none|full, is_separating, source_ref}` | for foldables | FoldingFeature, DevTools hinge, AOSP `areas` |
| `postures[]` | `{name: closed|half_opened|flat|book|tabletop|tent, hinge_angle_range?, web_posture: continuous|folded, android_state: FLAT|HALF_OPENED}` | for foldables | Device Posture spec, FoldingFeature, AOSP posture ranges |
| `inputs[]` | `pointer: fine|coarse|none, hover: hover|none, touch, keyboard: hardware|soft, remote_dpad, rotary, voice` | yes | Media Queries 4, TV and car docs |
| `operating_state` | `{parked|driving, ux_restrictions_mask?, requires_distraction_optimization?}` | for cars | CarUxRestrictions |
| `transitions[]` | `{from_profile, to_profile, trigger: fold|unfold|rotate|resize|keyboard_open|keyboard_close|input_change|drive_start}` | for scenarios | validation.md |
| `capabilities` | `{device_posture_api, viewport_segments, window_management, visual_viewport, virtual_keyboard}` with browser and version | web only | BCD |
| `conflicts_with[]` | `{profile_id, field, note}` | when known | section 4.2 |
| `unknowns[]` | string list | yes, may be empty | keeps gaps visible |

## 6. Proposed v1 scenario set

Twelve scenarios. Numbers are tagged P (published), D (derived with formula shown), M (measured at test time, no published value exists).

| # | Scenario | Configuration | Postures / inputs / state | Provenance and gaps |
|---|---|---|---|---|
| 1 | Galaxy Z Fold 7, closed, cover screen, Chrome | 360 x 840 CSS px @ DPR 3, layout viewport 360 x 764 (P Playwright); 1080 x 2520 px (D) | `continuous`; coarse pointer, no hover | Vendor panel px unverified |
| 2 | Galaxy Z Fold 7, open flat, inner screen, Chrome | 984 x 1092 CSS px @ DPR 2, viewport 984 x 1016 (P Playwright); 1968 x 2184 px (D) | `continuous`; one viewport segment | Transition 1 -> 2 is the unfold test; 2 -> 1 the fold test |
| 3 | Galaxy Z Fold 7, half-opened (book), inner screen | same as 2 | `folded`; `horizontal-viewport-segments: 2`; FoldingFeature `HALF_OPENED` + `VERTICAL`, occlusion `NONE` | Hinge bounds M; no registry publishes them. Chrome 138+ only |
| 4 | AOSP "7.6 Fold-in with outer display" emulator | 1768 x 2208 px @ 420dpi = 673.5 x 841.1 dp; folded 884 x 2208 px = 336.8 x 841.1 dp (P AOSP, D dp) | postures 0-30 / 30-150 / 150-180 degrees (P) | Reproducible without hardware; window size class Medium -> Compact on fold |
| 5 | Pixel 10 Pro Fold, retail numbers | inner 2076 x 2152 px, 373 ppi; outer 1080 x 2364 px, 408 ppi (P Google); emulator density 390dpi gives 851.7 x 882.9 dp inner (D) | FoldingFeature zero-width fold at x=1038 px in the AOSP profile (P) | CSS px M; DevTools Pixel 9 Pro Fold entry flagged inconsistent, do not reuse |
| 6 | Pixel 10 Pro, portrait, soft keyboard open, Chrome | 427 x 952 CSS px @ DPR 3, viewport 427 x 876 (P Playwright) | Chrome 108+ default `resizes-visual`: layout viewport unchanged, `visualViewport.height` shrinks (P Chrome blog); keyboard height M | Variant with `interactive-widget=resizes-content` to test layout reflow |
| 7 | iPhone 17 Pro, portrait, keyboard open, Safari | 402 x 874 pt @ 3, viewport 402 x 681 (P Playwright) | Safari resizes visual viewport only (P Chrome blog) | Keyboard height M; Device Posture and segments unavailable |
| 8 | Pixel Tablet emulator, landscape, 50/50 split-screen | 2560 x 1600 px xhdpi = 1280 x 800 dp (P AOSP, D dp); each app about 640 x 800 dp minus divider (D) | Width class Medium per app (600 <= w < 840); `android:minWidth` honored or cropped | Divider width M; API 36 ignores resize restrictions on sw >= 600dp |
| 9 | iPad Pro 11, Stage Manager window | full screen 834 x 1194 pt @ 2 (P Playwright); windowed size M | Apps receive no multitasking-configuration signal (P HIG); `sizeRestrictions` preferred min only | Pick explicit test widths (for example 500 pt, Apple's example) and label them illustrative |
| 10 | Ultrawide desktop window, Chrome | 3440 x 1440 panel (P LG 34WQ75C-B); maximized viewport 3440 x (1440 minus browser UI) CSS px @ DPR 1 (D); Playwright default Desktop Chrome 1280 x 720 is not ultrawide | fine pointer, hover, hardware keyboard | Browser UI height M; also test a half-width 1720 px window |
| 11 | Tall portrait monitor | 1080 x 1920 CSS px @ DPR 1 (D from any pivoted 1920 x 1080 panel; vendor page for Dell P2425H unverified) | fine pointer, hover | Alternative with published source: AOSP "Automotive Large Portrait" 1280 x 1606 mdpi |
| 12 | Android Automotive, parked then driving | AOSP "Automotive (1024p landscape)" 1024 x 768 mdpi = 1024 x 768 dp; "Distant Display" 1080 x 600 ldpi = 1440 x 800 dp (P AOSP, D dp) | parked: `isRequiresDistractionOptimization() == false`; driving: true with mask such as NO_KEYBOARD 8 + NO_VIDEO 16 + LIMIT_STRING_LENGTH 4; targets >= 64dp, >= 24sp text (P) | Transition parked -> driving must pause video and hide text entry; emulator is not a Tesla |
| 13 | Android TV 1080p | 1920 x 1080 xhdpi = 960 x 540 dp; safe area 864 x 486 dp after 48/27 dp overscan margins (P AOSP, P TV guide, D safe area) | D-pad only, focus visible, viewer at 10 ft | No pointer; `pointer: none` on web TV browsers is M |
| 14 | Surface Duo spanned (legacy, full occlusion) | 540 x 720 CSS px per screen @ 2.5; spanned 1114 x 720 with 34 CSS px hinge at x=540 (P DevTools); 1,114dp / 2,784px (P Microsoft archive) | FoldingFeature occlusion `FULL`, `isSeparating` true; `horizontal-viewport-segments: 2` | Docs archived 2021; keep as the canonical occluded-hinge fixture |

Scenarios 1 to 3 plus 6 cover "foldable both postures" and "phone with keyboard"; 8 and 9 cover tablet split; 10 and 11 cover ultrawide and tall; 12 and 13 cover car and TV. Scenario 5 and a future iPhone Duo scenario (section 2.3) are blocked on measurement for CSS px and points.

## 7. Blockers and open items

1. **Samsung, Honor and Motorola spec pages are client-rendered** and returned no spec tables to a plain fetch. Verify with a real browser session or Samsung Developer "Remote Test Lab" before shipping Fold7, Magic V5 or razr numbers.
2. **DevTools foldable spanned sizes conflict with hardware** (section 4.2). Open a question upstream or measure on hardware; until then store both values with `conflicts_with`.
3. **No authoritative keyboard heights, Stage Manager window sizes, Dynamic Island metrics or iPhone Duo point dimensions exist.** These must be `measured` fields produced by the test adapter and dated.
4. **Device Posture and Viewport Segments are Chromium-only.** The web adapter must report "signal unavailable" on Firefox and Safari rather than infer flatness.
5. **BCD has no entry for `interactive-widget`.** Support must be recorded from the Chrome 108 post and MDN prose, not from BCD, until BCD adds it.
6. **AOSP licence check.** The sdklib XML files carry no licence header; confirm the `tools/base` NOTICE (expected Apache-2.0) before redistributing.
7. **screensiz.es unreachable** on inspection day; irrelevant unless it turns out to be openly licensed.

## 8. Sources

All inspected 2026-10-28. Licence column is for the data, not the page prose.

| Source | URL | Licence / terms |
|---|---|---|
| W3C Device Posture API, CR Draft 2026-10-26 | https://www.w3.org/TR/device-posture/ | W3C document licence |
| MDN Device Posture API | https://developer.mozilla.org/en-US/docs/Web/API/Device_Posture_API | CC-BY-SA 2.5 (prose) |
| MDN Viewport segments API | https://developer.mozilla.org/en-US/docs/Web/API/Viewport_segments_API | CC-BY-SA 2.5 |
| CSS Environment Variables Level 1, ED 2026-10-08 | https://drafts.csswg.org/css-env-1/ | W3C document licence |
| Chrome: Viewport Segments API shipped (Chrome 138) | https://developer.chrome.com/blog/viewport-segments-api-shipped | CC-BY 4.0 |
| Chrome: Origin trial for Foldable APIs (125 to 128) | https://developer.chrome.com/blog/foldable-apis-ot | CC-BY 4.0 |
| MDN Window Management API | https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API | CC-BY-SA 2.5 |
| W3C Window Management, ED 2026-09-08 | https://w3c.github.io/window-management/ | W3C document licence |
| MDN VisualViewport | https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport | CC-BY-SA 2.5 |
| MDN viewport meta (`interactive-widget`, `viewport-fit`) | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport | CC-BY-SA 2.5 |
| Chrome: viewport resize behavior (Chrome 108) | https://developer.chrome.com/blog/viewport-resize-behavior | CC-BY 4.0 |
| MDN `<length>` (px, svh/lvh/dvh) | https://developer.mozilla.org/en-US/docs/Web/CSS/length | CC-BY-SA 2.5 |
| caniuse viewport unit variants | https://caniuse.com/viewport-unit-variants | CC-BY 4.0 |
| MDN `pointer` media feature | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer | CC-BY-SA 2.5 |
| MDN browser-compat-data v8.1.7 (files: api/Navigator, api/DevicePosture, api/Viewport, api/Window, api/VisualViewport, api/VirtualKeyboard, css/at-rules/media, css/types/env) | https://github.com/mdn/browser-compat-data | CC0-1.0 |
| Android window size classes guide | https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes | CC-BY 4.0 (prose), Apache-2.0 (code) |
| androidx `WindowSizeClass.kt`, `WindowMetrics.kt`, `FoldingFeature.kt` | https://android.googlesource.com/platform/frameworks/support/+/androidx-main/window/ | Apache-2.0 |
| Android FoldingFeature reference | https://developer.android.com/reference/androidx/window/layout/FoldingFeature | CC-BY 4.0 |
| Android make your app fold-aware | https://developer.android.com/develop/ui/compose/layouts/adaptive/foldables/make-your-app-fold-aware | CC-BY 4.0 |
| Android foldables overview | https://developer.android.com/guide/topics/ui/foldables | CC-BY 4.0 |
| Android screen densities | https://developer.android.com/training/multiscreen/screendensities | CC-BY 4.0 |
| Android display cutout | https://developer.android.com/develop/ui/views/layout/display-cutout | CC-BY 4.0 |
| Android multi-window support | https://developer.android.com/guide/topics/large-screens/multi-window-support | CC-BY 4.0 |
| Android AVD management, emulator, extended controls | https://developer.android.com/studio/run/managing-avds , https://developer.android.com/studio/run/emulator , https://developer.android.com/studio/run/emulator-extended-controls | CC-BY 4.0 |
| AOSP sdklib device definitions (`devices.xml`, `nexus.xml`, `tv.xml`, `automotive.xml`, `wear.xml`) | https://android.googlesource.com/platform/tools/base/+/mirror-goog-studio-main/sdklib/src/main/resources/com/android/sdklib/devices/ | Apache-2.0 (AOSP; confirm NOTICE) |
| Samsung Flex mode | https://developer.samsung.com/galaxy-z/flex-mode.html | Samsung Developers terms |
| Android for Cars app quality | https://developer.android.com/docs/quality-guidelines/car-app-quality | CC-BY 4.0 |
| Android Automotive OS parked apps | https://developer.android.com/training/cars/parked/automotive-os | CC-BY 4.0 |
| `CarUxRestrictions` reference | https://developer.android.com/reference/android/car/drivingstate/CarUxRestrictions | CC-BY 4.0 |
| Compose for TV layouts (overscan) | https://developer.android.com/training/tv/playback/compose/layouts | CC-BY 4.0 |
| Apple HIG Layout | https://developer.apple.com/design/human-interface-guidelines/layout | Apple terms |
| Apple HIG Multitasking | https://developer.apple.com/design/human-interface-guidelines/multitasking | Apple terms |
| Apple `UIUserInterfaceSizeClass` | https://developer.apple.com/documentation/uikit/uiuserinterfacesizeclass | Apple terms |
| Apple TN3192 (UIRequiresFullScreen, discrete resizing) | https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key | Apple terms |
| Apple iPhone Duo tech specs | https://www.apple.com/iphone-duo/specs/ | Apple terms; facts quoted |
| Apple Studio Display specs | https://www.apple.com/studio-display/specs/ | Apple terms; facts quoted |
| Google Pixel hardware tech specs (Pixel 9 Pro Fold, Pixel 10 Pro Fold) | https://support.google.com/pixelphone/answer/7158570 | Google terms; facts quoted |
| OnePlus Open specs | https://www.oneplus.com/global/open/specs | OnePlus terms; facts quoted |
| Samsung Galaxy Z Fold7 specs (did not render) | https://www.samsung.com/us/smartphones/galaxy-z-fold7/specs/ | unverified |
| Honor Magic V5 (spec values did not render) | https://www.honor.com/global/phones/honor-magic-v5/ | unverified |
| LG 34WQ75C-B | https://www.lg.com/us/monitors/lg-34wq75c-b-ultrawide-monitor | LG terms; facts quoted |
| Microsoft Surface Duo screen dimensions (archived 2021-09-22) | https://learn.microsoft.com/en-us/previous-versions/dual-screen/android/surface-duo-dimensions | CC-BY 4.0 (MicrosoftDocs) |
| Microsoft TwoPaneView (updated 2026-08-28) | https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/two-pane-view | CC-BY 4.0 |
| Playwright device descriptors | https://github.com/microsoft/playwright/blob/main/packages/isomorphic/deviceDescriptorsSource.json | Apache-2.0 |
| Chrome DevTools emulated devices | https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/emulation/EmulatedDevices.ts | BSD-3-Clause |
| tobua/device-sizes | https://github.com/tobua/device-sizes | MIT (package.json; no LICENSE file at main) |
| GSMArena terms | https://www.gsmarena.com/terms.php3 | personal, non-commercial; no reproduction without permission |
| yesviz devices | https://yesviz.com/devices.php | All Rights Reserved |
| blisk devices | https://blisk.io/devices | no licence stated |
| screensiz.es | https://screensiz.es/ | unreachable (504) |
