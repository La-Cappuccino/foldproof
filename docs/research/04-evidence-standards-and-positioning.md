# Evidence, standards, and positioning

[Start here](../../README.md) · [Vision](../vision.md) · [Existing work](../existing-work.md) · [Validation strategy](../validation.md)

**Research snapshot: 28 October 2026.** Every URL below was opened on that date (WebFetch, WebSearch, `gh api`, `npm view`, `curl`). Nothing here was reproduced on hardware. Where a number comes from a secondary outlet rather than the publisher, it is labelled. Where something could not be verified, the gap is stated rather than filled.

Contents

1. [Prevalence evidence](#1-prevalence-evidence)
2. [Standards and policy as acceptance criteria](#2-standards-and-policy-as-acceptance-criteria)
3. [Developer pain, in their own words](#3-developer-pain-in-their-own-words)
4. [Positioning, names, and license](#4-positioning-names-and-license)
5. [Sources](#5-sources)

---

## 1. Prevalence evidence

### 1.1 Measured facts versus anecdotes

| Claim | Status | Evidence |
|---|---|---|
| Large-screen Android is a mass market | **Measured (Google's own figure)** | developer.android.com/adaptive-apps: "more than 580 million large screen Android devices, including premium flagship devices"; the same page's product-manager card says "over 500 million active large screen devices". Google adds that large-screen users "spend 9x more in dollar value than users who have only a phone". No separate tablet/foldable/Chromebook split was published. |
| Foldables are a small but growing unit segment | **Measured (IDC, Counterpoint)** | IDC, 9 Dec 2025: 20.6 M foldables in 2025 (+10 % YoY), +30 % forecast for 2026, 17 % CAGR to 2029, Apple ">22% of 2026 unit share". IDC's own words: "foldables will continue to be a niche segment from a volume perspective". Counterpoint, 2 Dec 2025: Q3 2025 was "the highest quarterly volume ever for the category", 2.5 % of global smartphone shipments. Counterpoint 2026 outlook: +21 % YoY; Samsung 40 % share in 2025, forecast 32 % in 2026; Apple 25 %; Huawei 24 %. |
| Samsung foldable units | **Derived, not published** | Samsung does not publish foldable units. 40 % (Counterpoint) of 20.6 M (IDC) is roughly 8 M units for 2025. Treat as an order-of-magnitude estimate from two different trackers. |
| Apple has shipped a foldable | **Measured** | iPhone Duo announced 9 Sep 2026, on sale 23 Oct 2026 in 70+ countries, 28 more on 30 Oct. US price from $1,999 (256 GB). Outer display 5.4 in (1398 × 2034), inner 7.6 in (1878 × 2670). Ships with iOS 27.1. Pre-order delivery estimates slipped "well into January 2027" within half an hour (MacRumors roundup). |
| Platforms now force adaptivity | **Measured (policy text)** | Android 16 ignores `screenOrientation`, `resizeableActivity`, `minAspectRatio`, `maxAspectRatio` on displays ≥ 600 dp for apps targeting API 36; the opt-out "won't apply when targeting API level 37". Google Play's published requirement (page updated 2026-10-16) is target API 36 by 31 Aug 2026 (extension to 1 Nov 2026); an API 37 / August 2027 deadline exists only as a *plan* in Google's Jan 2025 blog, not yet on the policy page. Full wording in [2.7](#27-android-1617-adaptive-mandate-verified-wording). Apple: "Starting April 2027, any apps or games submitted will need to include screenshots for iPhone Duo" and must be built with the iOS 27 SDK. The iPhone Duo tech talk states: "The inner display doesn't honor your supported interface orientations." |
| Store discovery rewards large-screen quality | **Measured (Google), ranking weight unverified** | 25 Jul 2023 Google post: "Apps and games that adhere to our large screen app quality guidelines will now be ranked higher in search" and on Apps/Games Home; apps with an 8 % user-perceived crash or ANR rate on the user's device get warnings "on your app details page" and reduced visibility. Q2 2026 Play roundup: "A new store badge now highlights high-quality apps specifically designed and optimized for tablets and foldables" (Play Store v51.2, spotted 28 Apr 2026). The badge is requested via a Google Form after completing adaptive Tier 2 or Tier 1. A claim that the badge is now a direct search-ranking signal (appsops.store) was **not** corroborated by any Google page. |
| Google's Apps Experience Program (AEP) requires adaptive Tier 2 | **Measured** | AEP form-factor guideline, updated 31 Aug 2026: "All apps are required to meet the Adaptive App Tier 2 guidelines and ensure availability on the default set of form factors: At enrollment: Phone, Tablet, Foldable, and XR. By March 1, 2027: Googlebook." |
| Foldable web APIs are shipped, usage is unmeasured | **Partly measured** | Device Posture API shipped in Chrome 132 (W3C device-apis list, Nov 2024); Viewport Segments API "available from Chrome 138" (Chrome blog, 9 Jun 2025; Edge 138 too). **No public foldable web-traffic share was found** from Google, Microsoft, or StatCounter. Treat any such number as unknown. |
| Failures are common in real OSS apps | **Measured (GitHub API)** | 44 issues verified by `gh api` on 28 Oct 2026, 30 of them created in the last 12 months; see 1.2. |
| App-store review complaints about foldable layouts | **Anecdotal only** | Not measured. Verified user-side signals (Arctic Shift mirror, 28 Oct 2026): r/GalaxyFold "iPhone Duo 24 hour review from a long time foldable user" (1,089 points / 544 comments, 23 Oct 2026): "So many apps are not optimised. A lot of them look terrible unfolded." https://www.reddit.com/r/GalaxyFold/comments/1xe06eg/ ; r/GalaxyFold "Z Fold 8 - Facebook App - Rotation Error when UnFolded" (9 Oct 2026): "My Facebook (Unfolded) keep rotating when i watch videos or search", reply: "Facebook and Instagram constantly have issues on my fold 7, they just don't care about android and especially not about folds" https://www.reddit.com/r/GalaxyFold/comments/1x1f4g0/ ; r/GalaxyFold "We should demand more from app developers" (272 points / 127 comments, 22 Oct 2026). A reported 1,241-point r/GalaxyFold Duo thread complaining of Facebook and Discord layouts "stuck" after fold/unfold **could not be located**: no r/GalaxyFold post since 15 Oct has that score, and none of ~430 post-launch comments containing "unfold" in r/GalaxyFold, r/iphone or r/apple mentions Facebook or Discord. Do not cite it until a URL is produced. A future pass could scrape Play/App Store reviews for "unfold", "fold", "split screen" terms. |

### 1.2 GitHub issue mining

Method: `gh search issues` scoped to ~30 popular OSS repositories (unscoped searches were dominated by tiny auto-generated repositories), then each selected issue re-read via `gh api repos/{owner}/{repo}/issues/{n}` for `created_at`, `state`, and body. Dates and states below come from the API, not search snippets. Full 44-row table is in [the mining report](#gh-mining-appendix) at the end of this file; the twelve most illustrative recent ones:

| Repo | Issue | Created | State | Failure | Class |
|---|---|---|---|---|---|
| flutter/flutter | [#195401](https://github.com/flutter/flutter/issues/195401) [iPhone Duo] Blank screen on unfolded cold start | 2026-10-27 | open | Cold start while unfolded renders nothing; CADisplayLink bound to `UIScreen.main` (outer display) | startup-size |
| thunderbird/thunderbird-android | [#11568](https://github.com/thunderbird/thunderbird-android/issues/11568) Rotating the phone makes drafts disappear | 2026-09-16 | open | ~10 min of typed draft lost after rotating left and back | rotation state loss |
| signalapp/Signal-Android | [#14714](https://github.com/signalapp/Signal-Android/issues/14714) Half Folded Portrait Mode Loses Half Of Display | 2026-04-11 | closed 2026-06-22 | Tabletop posture: half of the window stops rendering | fold/unfold |
| signalapp/Signal-Android | [#14932](https://github.com/signalapp/Signal-Android/issues/14932) Android Split-Screen breaks message and chat viewing | 2026-08-12 | open | Chat history unusable in split-screen | split-screen |
| flutter/flutter | [#190508](https://github.com/flutter/flutter/issues/190508) Number keyboard input silently dropped after a foldable switches displays | 2026-08-04 | open | Digits dropped after cover↔main display switch (Z Flip) | fold + input change |
| expo/expo | [#42294](https://github.com/expo/expo/issues/42294) useWindowDimensions not working properly on foldable devices | 2026-01-19 | closed 2026-09-29 | Dimensions frozen at launch size; folded and unfolded report the same | fold/unfold |
| expo/expo | [#46844](https://github.com/expo/expo/issues/46844) expo-router apps break on Samsung DeX / freeform windows | 2026-06-12 | closed | Content collapses into a `windowSize ÷ phoneDensity` box top-left | desktop mode |
| ionic-team/ionic-framework | [#31642](https://github.com/ionic-team/ionic-framework/issues/31642) ion-tab-bar stays hidden after keyboard closes once window height changed | 2026-10-23 | closed | After rotation / iPad Split View / unfold, tab bar never returns | keyboard + size change |
| dotnet/maui | [#39263](https://github.com/dotnet/maui/issues/39263) [iOS 27] Shell tab bar never re-evaluates More after a size class change | 2026-10-08 | closed 2026-10-10 | `traitCollectionDidChange` swallowed; tab count stale | size-class change |
| nextcloud/android | [#16251](https://github.com/nextcloud/android/issues/16251) Settings scroll position resets after device rotation | 2026-01-06 | open | Scroll position lost on config change | rotation state loss |
| jellyfin/jellyfin-android | [#2069](https://github.com/jellyfin/jellyfin-android/issues/2069) Portrait mode in video player forcing system bars on large devices | 2026-07-08 | closed 2026-07-23 | Pixel 10 Pro Fold inner screen: Android 16 ignoring `setRequestedOrientation` | large-screen + policy change |
| electron/electron | [#54627](https://github.com/electron/electron/issues/54627) Window contents painted with offset after moving between monitors with different DPI | 2026-10-02 | closed 2026-10-23 | Paint offset while hit-testing stays at old positions | DPI / resize |

Keyword totals (GitHub-wide `search/issues`, `is:issue`, created ≥ 2024-10-28 vs ≥ 2025-10-28). These are keyword matches, not confirmed defects, and are inflated by auto-generated repositories; use them as upper bounds:

| Query | 24 mo | 12 mo |
|---|---|---|
| `"foldable" layout` | 1,848 | 1,747 |
| `"fold" "unfold" layout` | 2,289 | 2,199 |
| `"split screen" layout` | 6,954 | 6,542 |
| `"keyboard covers"` | 6,103 | 5,874 |
| `"keyboard overlaps" input` | 343 | 290 |
| `"layout breaks" rotation` | 237 | 222 |
| `"ultrawide" layout` | 1,841 | 1,441 |
| `"large screen" tablet layout` | 3,125 | 2,583 |
| `"samsung dex"` | 501 | 386 |
| `"window size class"` | 1,646 | n/a |

Scoped counts (more trustworthy; `gh search issues --limit 100` across named repos): `foldable` 28 hits in 15 Android app repos and 75 in 11 framework repos; `split screen` 88 and 60; `keyboard covers` 82; `keyboard overlaps` 56; `large screen` 66; `desktop mode` 60; `window size class` 10.

**Pattern (inference from the 44 bodies):** failures cluster at *transitions* rather than steady states. Three recurring shapes: cold start in a non-default configuration (#195401, capacitor #8356, expo #46844, expo #37468); a one-time size or height change that is never re-read (#42294, #31642, #39263, avalonia #22089); and configuration-change recreation that drops state (#11568, thunderbird #10950, #16251, organicmaps #13243, NewPipe #13963). Keyboard overlap is the most common single class across every framework (MAUI, Capacitor, Ionic, Flutter, Expo). Fold/unfold is the fastest-growing: nearly all hits are 2025–2026, and Flutter alone has an 8-issue iPhone Duo cluster from Sep–Oct 2026.

This directly supports the two failure classes in [vision.md](../vision.md#two-distinct-failure-classes): a startup-size class that documented profiles can anticipate, and a transition class that needs before/during/after observation.

---

## 2. Standards and policy as acceptance criteria

### 2.1 WCAG 2.2 (W3C Recommendation, version of 12 December 2024)

| SC | Level | Normative text (abridged where marked) | Candidate assertion for this project |
|---|---|---|---|
| **1.3.4 Orientation** | AA | Content does not restrict its view and operation to a single display orientation, such as portrait or landscape, unless a specific display orientation is essential. (Examples of essential: bank check, piano app, projector slides, VR.) | For every supported profile, the task is completable in both orientations; a portrait lock is a *finding* unless the profile declares "essential". |
| **1.4.10 Reflow** | AA | "Content can be presented without loss of information or functionality, and without requiring scrolling in two dimensions" for vertical scrolling content at a width equivalent to 320 CSS px, or horizontal scrolling content at a height of 256 CSS px, except for parts that require two-dimensional layout (maps, diagrams, video, games, presentations, data tables, toolbars kept in view). | At 320 CSS px (and at 400 % zoom of a 1280 px viewport) no horizontal scrollbar on the document and no control outside the viewport. |
| **1.4.4 Resize Text** | AA | "text can be resized without assistive technology up to 200 percent without loss of content or functionality." | Run every scenario at 200 % text scale (and Android font scale 2.0, iOS AX sizes); the r/webdev "dad at 200 % zoom" complaint below is this criterion in the wild. |
| **2.5.8 Target Size (Minimum)** | AA | "The size of the target for pointer inputs is at least 24 by 24 CSS pixels, except when:" Spacing (24 px circle does not intersect another target), Equivalent, Inline, User agent control, Essential. | Every actionable element ≥ 24 × 24 CSS px, or 48 dp on Android (Google's stricter LS-U3 / `Touch_Targets`), measured *after* the transition, not just at launch. |

### 2.2 EN 301 549 V3.2.1 (2021-03) and the European Accessibility Act

Text extracted from the ETSI PDF (clause numbers and wording verbatim):

- **9.1.3.4 Orientation:** "Where ICT is a web page, it shall satisfy WCAG 2.1 Success Criterion 1.3.4 Orientation."
- **9.1.4.10 Reflow:** "Where ICT is a web page, it shall satisfy WCAG 2.1 Success Criterion 1.4.10 Reflow."
- **11.1.3.4 Orientation:** "Where ICT is non-web software that provides a user interface, it shall satisfy the WCAG 2.1 Success Criterion 1.3.4 Orientation."
- **11.1.4.10 Reflow:** "Where ICT is non-web software that provides a user interface it shall satisfy the success criterion in Table 11.2." Table 11.2: "Content can be presented without loss of information or functionality, and without requiring scrolling in two dimensions for: Vertical scrolling content at a width equivalent to 320 CSS pixels; Horizontal scrolling content at a height equivalent to 256 CSS pixels; Except for parts of the content which require two-dimensional layout for usage or meaning." NOTE 1 adds that 320 CSS px "is equivalent to a starting viewport width of 1 280 CSS pixels wide at 400 % zoom".
- **11.1.4.4.1 Resize text (open functionality):** non-web software that supports platform enlargement features "shall satisfy the WCAG 2.1 Success Criterion 1.4.4 Resize Text."

So native apps, not just web pages, carry orientation and reflow obligations in the EU standard. Status notes:

- **EAA (Directive (EU) 2019/882)** applies from **28 June 2025** to in-scope products and services (e-commerce, banking, e-books, transport, telecoms, among others). EN 301 549 is the harmonised standard giving presumption of conformity.
- **A newer EN 301 549 is being drafted** against WCAG 2.2 (ETSI issue tracker shows a v19 draft, Sep 2025, with debate on the 11.1.3.4 orientation precondition and a new 11.1.4.10 note for platforms that cannot reach WCAG's viewport dimensions). V3.2.1 remains the cited version until that lands.
- **Norway:** the SVW Digital Governance Tracker lists the EAA as "Under assessment by the EFTA-countries" and notes "Norwegian businesses offering products and services to the EU must comply". Domestic ICT accessibility already runs under likestillings- og diskrimineringsloven plus forskrift om universell utforming av IKT (WCAG 2.1 AA basis), enforced by Digdir/UU-tilsynet with daily fines in at least one 2025 case. The project should not claim an EEA incorporation date; none was found.

### 2.3 Google adaptive app quality guidelines (replaced the large-screen guidelines; last updated 2026-10-21)

Google's named test devices: Googlebook (160 ppi), foldable (841 × 701 dp), 8-inch tablet (1024 × 640 dp), 10.5-inch tablet (1280 × 800 dp), 13-inch Chromebook (1600 × 900 dp). The legacy LS-* IDs (archived 2026-01-21) are still referenced by the car guidelines, so both ID sets are listed.

**Tier 3, Adaptive ready** (required to avoid letterboxing/compat mode; the floor):

| Guideline ID | Legacy | Requirement (verbatim or near-verbatim) | Test |
|---|---|---|---|
| `Config_Changes` | LS-C1 | "App fills the available display area... App is not letterboxed; it does not run in compatibility mode." and "App handles configuration changes and retains or restores its state as the device goes through configuration changes such as device rotation, folding and unfolding, and window resizing in split-screen and desktop windowing modes": scroll position maintained, typed text retained and keyboard state restored, media playback resumes. | T-Config_Orientation, T-Config_State |
| `Config_Combinations` | LS-C2 | "App handles combinations of configuration changes, such as window resizing followed by device rotation, or rotation followed by device folding or unfolding." | T-Config_Combinations |
| `Multi-Window_Functionality` | LS-M1 | "App is fully functional in multi-window mode." | T-Multi-Window_Functionality |
| `Multi-Resume` | LS-M2 | App updates UI when not top-focused and "handles the loss of exclusive resources such as cameras and microphones in multi-window scenarios." | T-Multi-Window_Focus, T-Multi-Window_Resources |
| `Camera_Preview` | LS-CM1 | Camera preview correct in landscape/portrait, folded/unfolded, multi-window. | T-Camera_Preview |
| `Media_Projection` | LS-CM2 | Same for media projection. | T-Media_Projection |
| `Keyboard_Input` | LS-I1 | Text input via external keyboard; switches physical↔virtual "without relaunching the app". | T-Keyboard_Input |
| `Mouse_Trackpad_Basic` | LS-I2 | Click, select, scroll (vertical and horizontal). | T-Mouse_Trackpad_Basic |
| `Stylus_Basic` | LS-S1 | Select, manipulate, scroll with stylus. | T-Stylus_Basic |
| `Stylus_Text_Input` | LS-S1.1 | Android 14+ handwriting in text fields; ChromeOS M114+ in WebView. | T-Stylus_Text_Input |

**Tier 2, Adaptive optimized** (the badge and AEP threshold):

| Guideline ID | Legacy | Requirement |
|---|---|---|
| `Responsive_adaptive_layouts` | LS-U1 | "App has responsive and adaptive layouts designed for all screen sizes... Implementation of adaptive layouts is determined by window size classes." |
| `UI_Secondary_Elements` | LS-U2 | "Modals, context menus, and other secondary elements are properly formatted on all screen types and device states." (bottom sheets, buttons, text fields not full width on large screens; context menus next to the item; nav rail replaces nav bar) |
| `Touch_Targets` | LS-U3 | "Touch targets are at least 48dp." Test adds: "not hidden or obscured by other UI elements at all display sizes and configurations." |
| `Drawable_Focus` | LS-U4 | Custom interactive drawables are focusable outside Touch Mode with a visible focus state. |
| `Keyboard_Navigation` | LS-I3 | "The main task flows in the app support keyboard navigation, including Tab and arrow key navigation." |
| `Keyboard_Shortcuts` | LS-I4 | select, cut, copy, paste, undo, redo |
| `Keyboard_Media_Playback` | LS-I5 | Spacebar plays/pauses |
| `Keyboard_Send` | LS-I6 | Enter sends in communication apps |
| `Keyboard_Exit` | (new) | Esc closes modals, clears search, exits full-screen, etc. |
| `Context_Menus` | LS-I7 | right-click / secondary tap |
| `Content_Zoom` | LS-I8 | Ctrl+scroll and pinch |
| `Hover_States` | LS-I9 | hover states on actionable elements |

**Tier 1, Adaptive differentiated** (legacy IDs): LS-M3 multitasking (PiP, attachments in separate window), LS-M4 multi-instance, **LS-F1 "App supports all foldable postures (tabletop, book, dual display)"**, LS-F2 camera on folded/unfolded with front/back preview, LS-D1 drag and drop across windows, LS-I10..I16 desktop keyboard/mouse parity, LS-S2..S4 stylus, LS-P1 custom cursors.

Google's own emulator tooling for these checks (blog, 31 Aug 2026): `adb emu fold`, `adb emu unfold`, `adb emu rotate`, `adb emu posture 1|2|3` (closed, tabletop, opened), `adb emu resize-display 0|1|2` (phone, unfolded, tablet). The post says the fold/unfold commands exist to "check quickly that an app keeps its state". Pixel Fold and Resizable AVDs support postures 1–3 only. Samsung published Z Flip 8 / Z Fold 8 emulator skins in September 2026.

### 2.4 Android car app quality (last updated 2026-09-14)

Tiers: Tier 3 "Car ready" (large-screen compatible and usable while parked; parked categories must meet all Tier 3 to be accepted on Play), Tier 2 "Car optimized" (driving categories must meet all applicable Tier 2), Tier 1 "Car differentiated" (adapts across driving/parked, supports cluster/panoramic displays). Checks most relevant to this project:

| ID | Tier | Requirement (verbatim) |
|---|---|---|
| DD-3 | 3 | "The app must not be launchable or usable while driving and must not play any audio." (video, games, browsers) |
| DD-2 | 2 | "While driving, the app must not be launchable and the app's UI must not be visible. The app's audio must stop when the user starts driving and cannot be unpaused while driving." |
| DD-1 | 2 | "The navigation audio channel can only be used by navigation apps and for navigation instructions." |
| DR-1 / DR-2 / DR-3 | 2 | Buttons respond within 2 s; app launches within 10 s; content loads within 10 s. |
| AC-1 | 2 | "Users must be able to complete tasks in the app using five screens or fewer." |
| AN-1 | 3 | "Users can navigate through the app without encountering any dead ends." |
| UX-1 / UX-2 / UX-3 | 1 | Touch targets ≥ 64 dp; ≥ 24 dp apart and from edges; fonts ≥ 24 sp. |
| AR-1 | 3 | "interactive UI elements must not be obstructed by system bars or display cutouts." (AAOS) |
| DO-1 / DO-2 | 3 | Distributable to fixed-orientation displays (AAOS); games "not significantly pillarboxed" on landscape (Auto). |
| EP-2 | 3 | "When the app is relaunched from the home screen, the app must restore the app state as closely as possible to the previous state." |
| SA-1 / ST-1 | 2 | No animated elements; no auto-scrolling text. |
| Associated | 3 / 2 / 1 | LS-C1, LS-C2 (Tier 3); LS-M2, LS-U1, LS-U2 (ultrawide landscape), LS-U3 (Tier 2); LS-U4, LS-I3 (keyboard and rotary navigation, Tier 1). |

For this project the car rows translate into **operating-state scenarios**: the same screen must be checked in "parked" and "driving" states, with the driving state asserting either non-visibility (DD-2/DD-3) or a reduced interaction budget (AC-1, UX-1..3).

### 2.5 Android TV app quality (last updated 2026-06-29)

Relevant Tier 3 "TV Ready" checks: **TV-LO** "The app supports landscape orientation without vertical letterboxing or pillarboxing"; **TV-OV** "The app does not display any text or functionality that is partially cut off by the edges of the screen"; **TV-DP** "The app functionality is navigable using five-way D-pad controls"; **TV-DM** no dependence on a Menu button; **TV-DB** Back leads home; **TV-MT** touchscreen declared not required. Tier 2: **TV-4K** high-resolution assets. Tier 1: **TV-TO** "supports touch and click to enable compatibility with pointer remotes and touchscreen displays"; **TV-AX** enhanced accessibility. TV-SB (in-app search) was removed in May 2026.

TV becomes an **input-mode scenario**: every task must be completable with D-pad focus traversal only, and nothing may be clipped at the overscan edge.

### 2.6 Apple: iPhone Duo and iPad multitasking

Official statements (Apple Developer News and Tech Talk 111461, "Prepare your app for iPhone Duo"):

- "Starting April 2027, any apps or games submitted will need to include screenshots for iPhone Duo." (News, 5 Oct 2026)
- "Starting April 2027, apps and games uploaded to App Store Connect need to meet the following minimum requirements: iOS and iPadOS apps must be built with the iOS 27 & iPadOS 27 SDK or later" (News, 9 Sep 2026)
- Submitting Duo screenshots earns a product-page badge: "your App Store product page will display a badge to let people know your app is optimized for iPhone Duo."
- "Use Device Hub to visualize how your apps behave on iPhone Duo across all poses and orientations."
- "On the inner display... it has regular horizontal and vertical size classes." The outer display is compact-width/regular-height in portrait and compact/compact in landscape.
- "The inner display doesn't honor your supported interface orientations. As with Idiom, avoid checking interface orientation for layout decisions. Use size classes instead." The same talk also says "iPhone Duo respects your supported interface orientations, but your app will scale on the inner display, including in Split View multitasking." Both sentences are in the transcript; developers on r/iOSProgramming flagged the inconsistency. A sourced profile for Duo should record both and mark the behaviour as "verify on device".
- "iPhone Duo will continue to honor the UIRequiresFullScreen key, but your app will still resize when someone opens or closes their iPhone Duo."
- "Split View multitasking is no exception... Vertically laid-out content can appear on either side of your app."
- The transcript does not discuss state preservation across open/close; that gap is exactly the transition class this project targets.

Apple's HIG "Multitasking" page returned no body text to the fetcher; its requirements were **not** captured here and should be read directly before being cited. There is **no** Apple mandate that apps support all orientations; the community claim that Apple "will start denying app updates... after April" conflates the SDK and screenshot requirements above.

### 2.7 Android 16/17 adaptive mandate, verified wording

Checked 28 Oct 2026 against three Google pages. The claim "Android 17 ignores orientation, resizability and aspect-ratio restrictions on sw600dp+ screens (games exempt), practical deadline August 2027" is **mostly right, with two corrections**: the behaviour starts at API 36 (Android 16), not 17; and the August 2027 date is a published *plan*, not a current Play policy.

- **Scope** (behavior-changes-16, section "Ignore orientation, resizability, and aspect ratio restrictions"): "For apps targeting Android 16 (API level 36), orientation, resizability, and aspect ratio restrictions no longer apply on displays with smallest width >= 600dp. Apps fill the entire display window, regardless of aspect ratio or a user's preferred orientation, and pillarboxing isn't used."
- **Ignored**: `screenOrientation`, `resizableActivity`, `minAspectRatio`, `maxAspectRatio`, `setRequestedOrientation()`, `getRequestedOrientation()`; the portrait/landscape value families (`portrait`, `reversePortrait`, `sensorPortrait`, `userPortrait`, `landscape`, `reverseLandscape`, `sensorLandscape`, `userLandscape`) are ignored "across large screen devices in full-screen and multi-window modes".
- **Exceptions** (verbatim list): "Games (based on the `android:appCategory` flag)"; "Users explicitly opting in to the app's default behavior in aspect ratio settings of the device"; "Screens that are smaller than `sw600dp`".
- **Opt-out mechanism**: declare the manifest property `android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` with `android:value="true"` on an `<activity>` or, for the whole app, on `<application>`. Opting out "results in the previous behavior of being placed in compatibility mode". The device-compatibility-mode page adds caveats even for opted-out apps: "Orientation restrictions are overridden despite your app opting out" under manufacturer overrides, and "Users can override app aspect ratio in Settings even if your app opts out."
- **Expiry**: behavior-changes-16: "Important: The opt-out is temporary and won't apply when targeting API level 37 in a future Android release. That is, for apps targeting API level 37, orientation, resizability, and aspect ratio restrictions are ignored on displays that are at least `sw600dp`." device-compatibility-mode: "Warning: The Android framework will eliminate the opt-out capability in API level 37." behavior-changes-17: "this opt-out will no longer be available for apps that target Android 17 (API level 37) or higher."
- **Games under API 37**: the games exemption is documented on the Android 16 page; the Android 17 page does not restate or revoke it. Treat games as still exempt but re-verify when the API 37 page is finalised.
- **Deadlines**: Google Play target-API policy (support.google.com answer 11926878, and developer.android.com target-sdk page "Last updated 2026-10-16"): "Starting August 31 2026: New apps and app updates must target Android 16 (API level 36) or higher to be submitted to Google Play"; "you'll be able to request an extension to November 1, 2026". Neither page mentions API 37 or August 2027. The only source for "API 37 required August 2027" is the Jan 2025 Android Developers Blog post, which says Google Play *plans* to require API 36 in August 2026 and API 37 in August 2027. So: forced-adaptive on large screens is live now for any app that met the August 2026 target-API rule, unless it opted out; the opt-out disappears when apps are made to target API 37, expected but not yet published for August 2027.
- **Testing hook**: enable the `UNIVERSAL_RESIZABLE_BY_DEFAULT` compat flag via the app compatibility framework.

### 2.8 Consolidated acceptance-criteria seed

| Scenario family | Minimum assertions (traceable to a clause) |
|---|---|
| Startup at documented size | Fills window, not letterboxed (`Config_Changes`/LS-C1); no clipped controls (TV-OV, AR-1); targets ≥ 24 CSS px / 48 dp (WCAG 2.5.8, `Touch_Targets`); reflows at 320 CSS px (WCAG 1.4.10, EN 11.1.4.10). |
| Rotation | Both orientations work (WCAG 1.3.4, EN 11.1.3.4); state retained: scroll, typed text, keyboard state, playback (`Config_Changes` T-Config_State). |
| Fold / unfold / posture | Same state assertions; layout re-reads window size (expo #42294 class); tabletop posture supported where claimed (LS-F1); hinge/cutout not covering controls. |
| Resize / split-screen / desktop window | `Multi-Window_Functionality`; combinations such as resize→rotate→fold (`Config_Combinations`/LS-C2); no stale size after drag end (iPadOS 27 behaviour). |
| Keyboard appearance | Focused field visible; primary action reachable with keyboard open (recurring class in 1.2; `Keyboard_Input`); tab bar returns after keyboard closes (ionic #31642). |
| Input change | External keyboard attach/detach without relaunch (`Keyboard_Input`); D-pad-only completion (TV-DP); mouse hover/right-click where claimed (`Context_Menus`, `Hover_States`). |
| Operating state (car) | Driving state hides or restricts UI (DD-2/DD-3); ≤ 5 screens per task (AC-1); 64 dp targets (UX-1). |
| Text scale | 200 % text without loss (WCAG 1.4.4, EN 11.1.4.4.1). |

---

## 3. Developer pain, in their own words

All quotes are verbatim from pages fetched on 28 Oct 2026 (Reddit text via the Arctic Shift archive mirror because reddit.com blocks fetchers; permalinks are the real reddit.com URLs; Hacker News via the Algolia API).

1. **Economics of a new form factor.** "Lol, I can't even get clients to pay for an iPad layout. No way in hell is anyone paying for a Duo layout." — u/patiofurnature, r/iOSProgramming, 4 Oct 2026 (score 40). https://www.reddit.com/r/iOSProgramming/comments/1wx3cp9/are_you_looking_forward_to_making_apps_for_duo/pdq60le/
2. **Orientation explosion.** "it just took me literally. year to get it all working flawlessly lol and then they go and do this phone that has like 6 different orientations" — u/HappyTuesdayR1S, r/iOSProgramming, 10 Sep 2026. https://www.reddit.com/r/iOSProgramming/comments/1wbx0gr/your_thoughts_on_the_iphone_duo/p8w1ylk/
3. **Size-class flip bites in the simulator.** "the thing that actually bit me was the size class flip. inner display comes up regular/regular, so every layout i'd gated on orientation just... did the phone thing on what's basically an ipad canvas. and the safe areas arent symmetric across the fold." — u/Greysawpark, r/iOSProgramming, 24 Sep 2026. https://www.reddit.com/r/iOSProgramming/comments/1wjyo3v/official_iphone_duo_simulator_xcode_271_beta_now/pbrpebg/
4. **Config-change cost on Android.** "I am working on a really big app of somewhere around a thousand screens, supporting foldable in a way that kinda make sense, would require the team a year, prolly a mill+ for like close to 0 incentive." and "android has that quirck called the config changes and if one of those happen (ratio, size, orientation, language, darkmode, and even more), your activity (screen) is trashed by the system and you need to recreate it, that means restoring state, content etc" — u/kichi689, r/GalaxyFold, 22 Oct 2026. https://www.reddit.com/r/GalaxyFold/comments/1xc0uq2/we_should_demand_more_from_app_developers/19rhpfeeo1vvl/
5. **"Never worth it."** "90% of the apps will be stretched. Horizontally. The reality of it is, it's pretty much never worth it to make layouts that are specialised for foldables/tablets." — well_ackshually, Hacker News, 9 Sep 2026. https://news.ycombinator.com/item?id=49636018
6. **Keyboard overlap on the web.** "Who needs ways to reliably trigger the display of the touch platform-native keyboard, to be notified if it is displayed and to move the input field in view so it is not obscured by the keyboard? This is why the web is a terrible platform compared to Windows Forms for getting stuff done." — fodkodrasz, Hacker News, 21 Oct 2026. https://news.ycombinator.com/item?id=50176887
7. **Testing is tedious enough to build a tool.** "responsive testing across multiple devices was taking way too much time. I would fix something on desktop, then check mobile and notice something was off. After fixing mobile, tablet would need adjustments. Then I'd go back and recheck everything again. Most of the time I was just resizing the browser, switching between device modes, and trying to keep track of what broke where." — u/StrangeRevolution604, r/webdev, 23 May 2026. https://www.reddit.com/r/webdev/comments/1tlg3su/tired_of_responsive_testing_in_multiple_devices_i/
8. **Budgets kill multi-size testing.** "an additional 20% of base for each of the additional sizes —- and that budget really just goes to testing for the most part. And you watch how fast "responsive and accessible" from the RFP turns into, "Well let's just support desktop and one phone screen size and we won't bother to even spend 1 hour testing tablet or 4K or horizontal on any device or printed versions."" — dbg31415, Hacker News, 27 Oct 2026. https://news.ycombinator.com/item?id=50258117
9. **User settings are part of "responsive".** "It took me a while to figure out that he has his Android system zoom set to 200%. So now, apparently, "responsive design" also means "make sure your website survives my father's personal accessibility settings."" — u/mono_tony, r/webdev, 17 Aug 2026 (192 points, 181 comments). https://www.reddit.com/r/webdev/comments/1vqluc7/are_my_dad_and_gf_actually_edge_cases_or_am_i/
10. **Device-specific layout bugs take days.** "We had one bug last month only showing up on samsung devices with large display text. It took 4 days of asking users for screenshots. Should have taken minutes if we could just see the user's screen." — u/PatientlyNew, r/androiddev, 16 Apr 2026. https://www.reddit.com/r/androiddev/comments/1sn3dqt/mobile_app_crash_tracking_software_that_only/
11. **AI-generated UI is not responsive.** "UI does not behave responsively, elements overap on resize or too much space between them. Elements shift while values change, making text near unreadable (especially diagnostics)" — u/fremdspielen, r/ChatGPTCoding, 19 Oct 2026, answering "what are the biggest weaknesses of frontier agents". https://www.reddit.com/r/ChatGPTCoding/comments/1x9d1kp/what_are_the_biggest_weaknesses_of_frontier/phqa85s/
12. **"Working" is not "finished".** "AI can get me from an idea to a working interface incredibly quickly, but "working" and "finished" are very different things. The more the project grows, the more time I spend checking consistency, removing duplicated code, fixing responsive behavior, testing different states, and making sure one change hasn't broken something somewhere else." — u/Odd-Nebula-9360, r/Frontend, 13 Aug 2026. https://www.reddit.com/r/Frontend/comments/1vl74td/ai_is_making_frontend_development_faster_and/p3gp6sb/
13. **Vibe-coded tools break on phones.** "half of these vibe coded tools rely on keyboard shortcuts or wide layouts, so browsing them on a phone might just make them look broken" — u/Ivo-Sheera, r/vibecoding, 26 Oct 2026. https://www.reddit.com/r/vibecoding/comments/1xg72g9/i_built_tinder_for_vibecoded_sites_so_your_side/19rp8k7ulx4sh/
14. **Play policy pressure.** "Beginning in api 37 you will no longer be able to lock your app to portrait only (I think this is only for tablets?) How are you all preparing for this if you haven't already? Can we just have an empty layout with a text to tell user to rotate the screen to use the app?" — u/Specialist_Round9835, r/androiddev, 20 Jul 2026. https://www.reddit.com/r/androiddev/comments/1v1axay/orientation_lock/

Supporting signals (fetched, shorter): "I have been begging my design team to start designing responsively so we can support foldables/tablets, they see foldables as a single digit percentage of the Android user base" (u/yaaaaayPancakes, r/androiddev, 26 Apr 2026); "on iPadOS 27, apps built with the iOS 27 SDK can still resize with `UIRequiresFullScreen=YES`. The resize happens when the drag ends." (u/pickandplate, r/iOSProgramming, 23 Oct 2026); "Laggy in device hub and fails to render correctly in previews. Even when using Xcode 27.1 RC" (u/KickupKirby, 5 Oct 2026); "I'd probably toss a few hours at it once it hits around 2-3% of traffic" (u/Icy_Moment3522, r/webdev, 14 Sep 2026).

**What developers built or wish for** (the demand signal is behaviour more than phrasing: at least five side-tools were built in twelve months):

| Tool | What it does | Source |
|---|---|---|
| Responsive Device Viewer (Chrome ext) | side-by-side device previews with annotations | r/webdev, 23 May 2026 (quote 7) |
| Responsive Lab (Chrome ext) | quick size switching | https://www.reddit.com/r/webdev/comments/1svd23n/built_a_chrome_extension_to_test_responsive/ |
| PortSide (Go, OSS) | `*.localhost` + Wi-Fi sharing to test foldable layouts on real devices | https://www.reddit.com/r/webdev/comments/1wgdbo8/do_you_guys_include_foldables_in_your_responsive/p9wcbfi/ |
| HostScan (VS Code) | QR to open the dev server on a phone | https://news.ycombinator.com/item?id=45858603 |
| Phonebook (CLI) | Compose `@Preview` to static HTML grid; MCP suggests missing orientation states | https://www.reddit.com/r/androiddev/comments/1vy4vyy/i_built_a_small_opensource_tool_for_generating_a/ |
| Stateful-resize test plan (manual) | form half-filled → resize; keyboard+validation → resize; Split View → full | https://www.reddit.com/r/iOSProgramming/comments/1wbxxj3/iphone_duo_is_official_how_much_work_is_this/p9sb1tq/ |
| Wish: see the user's screen | Crashlytics traces "useless for device specific bugs" | quote 10 |

Unmet needs that recur: multi-viewport at once, **stateful transitions** (fold/rotate/keyboard mid-form), real user settings (zoom, font scale), and reliable foldable simulators.

---

## 4. Positioning, names, and license

### 4.1 Adjacent and competing products

| Product | What it does (verified) | Price (verified 28 Oct 2026) | Does **not** do |
|---|---|---|---|
| **BrowserStack Live / App Live / Automate** | Real-device cloud; "Responsiveness Testing" in Live; foldable posture on real **Galaxy Fold 7** via `cmd device_state state 1/2` (folded/unfolded) in App Automate, enabled on request. | Live Desktop $29/mo, Desktop & Mobile $39/mo, Team $150/mo; Automate Desktop $99/mo, Desktop & Mobile $175/mo, Pro $225/mo (annual). | Half-fold/tabletop ("only fully folded and unfolded states work"), split-screen on the unfolded display, landscape in interactive sessions; no state assertions; no sourced device profiles; no agent skill. |
| **Percy (BrowserStack)** | Visual diffs; DOM snapshot re-rendered at multiple widths and browsers; layout-shift detection. | Free 5,000 screenshots/mo; paid tiers not public. | Transitions (it snapshots independent states); keyboard/posture; native. |
| **Chromatic** | Storybook/Playwright/Cypress visual + interaction tests; "modes" for viewports. | Free 5,000 snapshots; Starter $179/mo (35k); Pro $399/mo (85k); extra $0.008/snapshot. | Fold/posture/keyboard; native apps; profile corpus. |
| **Applitools (Ultrafast Grid)** | One DOM capture re-rendered across browser/viewport/device combos; Visual AI. | Starter $667/mo annual (100k component or 1k page checkpoints); Professional/Enterprise by quote; real devices as Enterprise add-on. | Transition/state assertions; posture; agent-native. |
| **TestMu AI (formerly LambdaTest)** | Live/real-device/automation cloud; "Responsive Visual Testing" in SmartUI. | Virtual Live $15/mo; Real Device Plus Live $39/mo; Real Device Plus Automation Cloud $199/mo. | No foldable mention on pricing page; no transition assertions. |
| **Android Studio resizable emulator + adb emu** | `fold`/`unfold`/`rotate`/`posture 1-3`/`resize-display 0-2`; Layout Validation ("Visual Linting", 2022) flags issues across sizes; Samsung Z Fold 8 skins. | Free. | Not a test runner with pass/fail on state; no cross-platform or web; postures 4–5 unsupported on Pixel Fold/Resizable AVDs. |
| **Firebase Test Lab / Android Device Streaming** | Streamed physical Pixel Fold etc.; posture via `adb shell cmd device_state`. | Per-device-minute (not re-verified). | "no robots operating the phones": no physical hinge; no assertions library. |
| **Microsoft Surface Duo Test Kit** | `testing-kotlin` / `testing-compose` helpers: simulate folding features via Jetpack WindowManager testing, spanning gestures, test annotations. | Free, **archived** (docs dated 2022-11-09, moved to "previous versions"). | Maintained; web; iOS. The annotation idea (`@DualScreenTest`, `@FoldingFeature`) is worth borrowing. |
| **Polypane** | Desktop browser: unlimited synced viewports, device/network emulation, a11y audits, screenshots/video. | Individual and Business per-seat yearly plans; figures render client-side and were not captured. | CI/CLI, foldable postures, assertions, native apps. |
| **Responsively App** | OSS (AGPL-3.0, 25.5k stars) multi-device preview with mirrored interactions; ships an MCP server (`@responsively/mcp`: navigate, screenshot, click, type_text, read_page). | Free. | Assertions, CI pass/fail, device-posture emulation, sourced profiles. Closest OSS neighbour: it is a viewer with an agent surface, not a verifier. |
| **Sizzy** | Multi-device browser; agent panel that drives Claude Code / Codex CLI with device screenshots. | $15/mo, $12/mo annual, $499 lifetime. | CI/automation, foldables, assertions. |

**White space, as of today:** nobody sells or ships (a) assertions over a *transition* (state before → action → state after), (b) a sourced, versioned corpus of device/configuration profiles with citations, or (c) an agent-native skill that plans scenarios from those profiles and emits reproducible evidence. Responsively's MCP and Sizzy's agent panel show the agent surface is becoming table stakes; neither verifies anything.

### 4.2 Project name candidates

Availability checked 28 Oct 2026: `npm view <name>` (E404 = free), `gh search repos --match name`, `gh api users/<name>` (404 = handle free), PyPI JSON endpoint (404 = free).

| Name | npm | GitHub repos w/ that name | GitHub handle | PyPI | Rationale | Tagline |
|---|---|---|---|---|---|---|
| **foldproof** | free | 2 empty 0-star repos | free | free | "Proof" carries the project's promise (evidence, not vibes); "fold" names the hardest transition without excluding rotate/resize. Reads like "waterproof". | *Proof your UI survives the fold, the rotate, and the resize.* |
| **hingecheck** | free | 1 empty repo | free | free | The hinge is where state is lost; "check" says CI. Concrete and physical. | *The check that runs at the hinge.* |
| **reflowproof** | free | none | free | free | Ties directly to WCAG 1.4.10 / EN 11.1.4.10 "Reflow", which is the clause auditors already know. Broader than foldables. | *Reflow is a requirement. Prove it.* |
| **stillusable** | free | none | free | free | States the actual acceptance criterion from vision.md in two words: the task is still completable after the change. | *Still usable after fold, rotate, resize, keyboard.* |
| **everyfold** | free | none | free | free | Suggests full coverage across configurations and every fold/unfold; friendly, short, brandable. | *Every screen, every fold, evidence included.* |

Recommendation: **foldproof** for the CLI/skill (strongest memorability, clean on all four registries, and the two existing repos are empty). If the scope message should be "all transitions, not just foldables", **stillusable** is the most honest and is also completely clean. Avoid `crease`, `pleat`, `bellows`, `foldline`, `anyshape`, `screenproof`, `fitcheck` (all taken on npm).

### 4.3 License recommendation

**Code (CLI, skill, adapters): Apache-2.0.** Reasons: (1) it includes an explicit patent grant and defensive termination, which matters for a verifier that platform vendors or test-cloud companies might embed or clone; MIT is silent on patents. (2) Agent-skill ecosystems the project sits next to are mixed (Impeccable is MIT, Playwright is Apache-2.0, Android skills are Apache-2.0, Responsively is AGPL-3.0); Apache-2.0 is compatible with all of them for consumption. (3) Apache's NOTICE mechanism lets the project carry attribution for quoted vendor documentation in a structured way. (4) Corporate adoption friction is identical to MIT in practice. Do **not** use AGPL: it would block exactly the CI-service and agent-marketplace integrations that create distribution.

**Data corpus (sourced profiles, scenario matrices): CC BY 4.0, with a stated intent to relicense under CC0 if attribution becomes a burden for downstream agents.** Facts about screen sizes are not copyrightable, but the EU/EEA sui generis database right (Directive 96/9/EC, implemented in Norway's åndsverkloven § 24) can attach to a curated collection; a CC licence on the corpus removes that ambiguity for users. CC BY keeps the source chain visible, which is the corpus's whole value proposition. Keep a `SOURCES.md` per profile with the vendor URL and inspection date so the attribution is to the manufacturer document, not just to this project.

**Contributions:** no CLA; use the Developer Certificate of Origin (DCO) sign-off, which Apache-2.0 §5 already anticipates.

---

## 5. Sources

All inspected 28 October 2026.

Prevalence and market
- Google adaptive apps hub (580 M / 500 M large-screen devices, 9x spend): https://developer.android.com/adaptive-apps
- IDC press release, 9 Dec 2025 (20.6 M in 2025, +30 % 2026, 17 % CAGR): https://www.idc.com/resource-center/press-releases/worldwide-foldable-smartphone-market-to-grow-30-yoy-in-2026-boosted-by-the-first-apple-foldable-iphone-according-to-idc/
- Counterpoint Q3 2025 record quarter, 2 Dec 2025: https://counterpointresearch.com/en/insights/global-foldable-smartphone-market-q3-2025
- Counterpoint 2026 outlook (Samsung 40 % → 32 %, Apple 25 %): https://counterpointresearch.com/en/insights/samsung-to-retain-lead-as-global-foldable-market-set-for-21percent-yoy-growth
- iPhone Duo roundup (dates, prices, displays): https://www.macrumors.com/roundup/iphone-duo/
- Apple Developer News (5 Oct, 18 Sep, 16 Sep, 9 Sep 2026): https://developer.apple.com/news/
- Apple upcoming requirements page: https://developer.apple.com/news/upcoming-requirements/
- Apple Tech Talk 111461 "Prepare your app for iPhone Duo": https://developer.apple.com/videos/play/tech-talks/111461/
- Android 16 orientation/resizability blog, Jan 2025: https://android-developers.googleblog.com/2025/01/orientation-and-resizability-changes-in-android-16.html
- Android 17 behavior changes (opt-out removed): https://developer.android.com/about/versions/17/behavior-changes-17
- Android 16 behavior changes, "Ignore orientation, resizability, and aspect ratio restrictions": https://developer.android.com/about/versions/16/behavior-changes-16#ignore-orientation
- Device compatibility mode (opt-out property, caveats, API 37 warning): https://developer.android.com/guide/practices/device-compatibility-mode
- Google Play target API level policy (31 Aug 2026 / API 36): https://support.google.com/googleplay/android-developer/answer/11926878 and https://developer.android.com/google/play/requirements/target-sdk
- r/GalaxyFold Fold 8 Facebook rotation post (9 Oct 2026): https://www.reddit.com/r/GalaxyFold/comments/1x1f4g0/z_fold_8_facebook_app_rotation_error_when_unfolded/
- r/GalaxyFold Duo 24-hour review (23 Oct 2026): https://www.reddit.com/r/GalaxyFold/comments/1xe06eg/iphone_duo_24_hour_review_from_a_long_time/
- Google Play large-screen ranking, 25 Jul 2023: https://android-developers.googleblog.com/2023/07/introducing-new-play-store-for-large-screens.html
- Google Play Q2 2026 roundup (badge): https://google.play/the-latest/2026-q2/
- Android Authority, Play Store 51.2 badge, 28 Apr 2026: https://www.androidauthority.com/google-play-store-update-april-2026-3661331/
- AEP form-factor requirement: https://developer.android.com/distribute/aep/aep-req-form-factor-support
- Chrome Viewport Segments shipped (Chrome 138), 9 Jun 2025: https://developer.chrome.com/blog/viewport-segments-api-shipped
- Device Posture API ships in Chrome 132 (W3C list, Nov 2024): https://lists.w3.org/Archives/Public/public-device-apis/2024Nov/0009.html
- Foldable APIs origin trial (Chrome 125–128): https://developer.chrome.com/blog/foldable-apis-ot
- Uncorroborated ranking claim (flagged, not relied on): https://appsops.store/news/google-play-large-screen-tier-aso-discovery-fall-2026

Standards
- WCAG 2.2: https://www.w3.org/TR/WCAG22/ ; Understanding 2.5.8: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- EN 301 549 V3.2.1 (2021-03) PDF (clauses 9.1.3.4, 9.1.4.10, 11.1.3.4, 11.1.4.10, 11.1.4.4.1 extracted with pdftotext): https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf
- ETSI draft discussion for next EN (issue 660): https://labs.etsi.org/rep/HF/en301549/-/issues/660
- EAA in force 28 Jun 2025 (SGS summary): https://www.sgs.com/news/2025/09/safeguards-13925-european-accessibility-act-eaa-takes-effect-unifying-standards-across-the-eu
- Norway status "under assessment by the EFTA-countries": https://svw.no/en/svw-digital-governance-tracker/bigtech-regulations/european-accessibility-act-eaa/
- Norway enforcement example (daily fines): https://blog.usablenet.com/norways-helsami-case-daily-accessibility-fines-and-eaa-era-compliance
- Adaptive app quality overview: https://developer.android.com/docs/quality-guidelines/adaptive-app-quality ; Tier 3: https://developer.android.com/docs/quality-guidelines/adaptive-app-quality/tier-3 ; Tier 2: https://developer.android.com/docs/quality-guidelines/adaptive-app-quality/tier-2
- Archived large-screen guidelines (LS-* IDs): https://developer.android.com/docs/quality-guidelines/archive/adaptive/large-screen-app-quality
- Car app quality: https://developer.android.com/docs/quality-guidelines/car-app-quality
- TV app quality: https://developer.android.com/docs/quality-guidelines/tv-app-quality
- Emulator control for adaptive development, 31 Aug 2026: https://android-developers.googleblog.com/2026/08/emulator-adaptive.html
- Apple HIG Multitasking (body not retrievable by fetcher; read manually): https://developer.apple.com/design/human-interface-guidelines/multitasking

Developer voice
- See the URLs inline in section 3. Reddit text retrieved via https://arctic-shift.photon-reddit.com ; HN via https://hn.algolia.com/api/v1/ .

Competitors and tooling
- BrowserStack pricing: https://www.browserstack.com/pricing ; foldable doc: https://www.browserstack.com/docs/app-automate/appium/test-on-foldable-devices ; Percy: https://www.browserstack.com/percy
- Chromatic: https://www.chromatic.com/pricing
- Applitools: https://applitools.com/pricing/
- TestMu AI (LambdaTest): https://www.testmuai.com/pricing/
- Polypane: https://polypane.app/pricing/
- Sizzy: https://sizzy.co/pricing
- Responsively App: https://github.com/responsively-org/responsively-app
- Surface Duo Test Kit (archived): https://learn.microsoft.com/en-us/dual-screen/android/test-kit/
- Firebase device streaming / posture discussion (2023, secondary): https://redlib.hbubli.cc/r/androiddev/comments/16mvlsz/qa_googles_android_device_streaming_is_going/k1gl5ny/

Name checks
- `npm view foldproof|hingecheck|reflowproof|stillusable|everyfold` → E404; `gh api users/<name>` → 404; `https://pypi.org/pypi/<name>/json` → 404; `gh search repos <name> --match name` as tabulated in 4.2.

---

## Appendix: full GitHub mining table {#gh-mining-appendix}

All 44 rows verified via `gh api repos/{owner}/{repo}/issues/{n}` on 28 Oct 2026.

| # | Repo | Issue | Created | State | Failure | Class |
|---|---|---|---|---|---|---|
| 1 | flutter/flutter | [#195401](https://github.com/flutter/flutter/issues/195401) [iPhone Duo] Blank screen on unfolded cold start | 2026-10-27 | open | CADisplayLink bound to outer display never fires | startup-size |
| 2 | ionic-team/capacitor | [#8356](https://github.com/ionic-team/capacitor/issues/8356) Keyboard Space on Cold Start | 2026-02-24 | closed 2026-09-11 | keyboard-sized blank band on cold start until keyboard toggled | startup-size |
| 3 | expo/expo | [#46844](https://github.com/expo/expo/issues/46844) expo-router apps break on Samsung DeX / freeform | 2026-06-12 | closed | density mismatch collapses content | startup-size (desktop) |
| 4 | expo/expo | [#37468](https://github.com/expo/expo/issues/37468) Foldable devices do not resize screen when unfolded | 2025-06-16 | closed 2025-09-22 | stays at cover-screen size after unfolding | startup + fold |
| 5 | dotnet/maui | [#34441](https://github.com/dotnet/maui/issues/34441) Splash not visible in splitmode | 2026-03-12 | open | launched directly into split-screen | startup (split) |
| 6 | signalapp/Signal-Android | [#14714](https://github.com/signalapp/Signal-Android/issues/14714) Half Folded Portrait Mode Loses Half Of Display | 2026-04-11 | closed 2026-06-22 | tabletop: half window not rendered | fold/unfold |
| 7 | flutter/flutter | [#190508](https://github.com/flutter/flutter/issues/190508) Number keyboard input dropped after display switch | 2026-08-04 | open | digits dropped after cover↔main | fold + input |
| 8 | expo/expo | [#42294](https://github.com/expo/expo/issues/42294) useWindowDimensions not working on foldables | 2026-01-19 | closed 2026-09-29 | dimensions frozen at launch | fold/unfold |
| 9 | expo/expo | [#41808](https://github.com/expo/expo/issues/41808) linking error after unfolding Galaxy Fold 6 | 2025-12-22 | closed 2026-01-14 | template app errors on unfold | fold/unfold |
| 10 | flutter/flutter | [#194277](https://github.com/flutter/flutter/issues/194277) iPhone Duo rotates portrait-only app when unfolded | 2026-10-13 | closed 2026-10-19 | black bars, unexpected rotation | fold + letterbox |
| 11 | flutter/flutter | [#193208](https://github.com/flutter/flutter/issues/193208) Text field caret disappears after folding/unfolding | 2026-09-23 | open | focus caret lost across fold | fold/unfold |
| 12 | flutter/flutter | [#192667](https://github.com/flutter/flutter/issues/192667) MediaQuery.sizeOf reports whole screen in half-screen dialog | 2026-09-12 | open | size not adjusted for sub-screen | fold/unfold |
| 13 | thunderbird/thunderbird-android | [#9760](https://github.com/thunderbird/thunderbird-android/issues/9760) UI does not adapt to foldable screens | 2025-09-08 | closed 2026-01-28 | no list-detail on inner screen | large-screen |
| 14 | signalapp/Signal-Android | [#15006](https://github.com/signalapp/Signal-Android/issues/15006) On square displays, scrolling no longer works | 2026-09-13 | closed 2026-09-15 | regression on unfolded Pixel 9 Pro Fold | large-screen regression |
| 15 | thunderbird/thunderbird-android | [#11568](https://github.com/thunderbird/thunderbird-android/issues/11568) Rotating makes drafts disappear | 2026-09-16 | open | draft lost | rotation state loss |
| 16 | thunderbird/thunderbird-android | [#10950](https://github.com/thunderbird/thunderbird-android/issues/10950) Message body not displayed when rotating | 2026-04-27 | open | body disappears | rotation state loss |
| 17 | thunderbird/thunderbird-android | [#11302](https://github.com/thunderbird/thunderbird-android/issues/11302) Reply text disappears or crash on landscape | 2026-07-24 | closed 2026-10-13 | text lost / crash (Flip 6) | rotation state loss |
| 18 | nextcloud/android | [#16251](https://github.com/nextcloud/android/issues/16251) Settings scroll resets after rotation | 2026-01-06 | open | scroll lost | rotation state loss |
| 19 | TeamNewPipe/NewPipe | [#13963](https://github.com/TeamNewPipe/NewPipe/issues/13963) UI crashes on rotation (PlayQueueActivity NPE) | 2026-10-26 | open | crash on rotate | rotation (crash) |
| 20 | organicmaps/organicmaps | [#13243](https://github.com/organicmaps/organicmaps/issues/13243) Crash using export menu after rotating | 2026-07-29 | closed 2026-08-14 | stale bottom sheet after recreate | rotation state loss |
| 21 | dotnet/maui | [#39270](https://github.com/dotnet/maui/issues/39270) [iOS] CollectionView items disappear after orientation change | 2026-10-09 | closed 2026-10-10 | items vanish | rotation state loss |
| 22 | expo/expo | [#42459](https://github.com/expo/expo/issues/42459) SDK 55: layout does not reflow on resize/rotate (iOS) | 2026-01-23 | closed 2026-02-03 | stale dimensions | rotation + resize |
| 23 | expo/expo | [#48379](https://github.com/expo/expo/issues/48379) [iPad] Tab bar overlaps content after rotate-and-return | 2026-07-31 | closed | size-class change not handled | size-class |
| 24 | signalapp/Signal-Android | [#14932](https://github.com/signalapp/Signal-Android/issues/14932) Split-Screen breaks chat viewing | 2026-08-12 | open | unusable in split | split-screen |
| 25 | signalapp/Signal-Android | [#14414](https://github.com/signalapp/Signal-Android/issues/14414) Opening notifications resets split view on fold | 2025-11-10 | open | list-detail reset | split-screen (fold) |
| 26 | flutter/flutter | [#182231](https://github.com/flutter/flutter/issues/182231) AppBar stretches in split screen | 2026-02-11 | open | AppBar full height | split-screen |
| 27 | flutter/flutter | [#174269](https://github.com/flutter/flutter/issues/174269) MediaQuery.padding uses device height in split/floating | 2025-08-22 | closed 2025-08-25 | wrong insets | split-screen |
| 28 | organicmaps/organicmaps | [#10486](https://github.com/organicmaps/organicmaps/issues/10486) Split-screen taps mislocated | 2025-03-13 | open | hit-testing offset | split-screen |
| 29 | element-hq/element-x-android | [#4255](https://github.com/element-hq/element-x-android/issues/4255) Crash when resizing in a window | 2025-02-10 | closed 2025-10-10 | divider drag crashes | resize |
| 30 | tuskyapp/Tusky | [#5109](https://github.com/tuskyapp/Tusky/issues/5109) Adjusting split ratio reflows UI to top | 2025-05-06 | open | scroll lost on ratio change | resize |
| 31 | signalapp/Signal-Android | [#14650](https://github.com/signalapp/Signal-Android/issues/14650) Messages not marked read in large split window | 2026-03-05 | closed 2026-05-05 | list-detail semantics | large-screen |
| 32 | ionic-team/ionic-framework | [#31642](https://github.com/ionic-team/ionic-framework/issues/31642) ion-tab-bar stays hidden after keyboard closes once height changed | 2026-10-23 | closed | tab bar gone until restart | keyboard + size |
| 33 | signalapp/Signal-Android | [#15000](https://github.com/signalapp/Signal-Android/issues/15000) Keyboard covers bubble | 2026-09-09 | closed 2026-09-10 | input hidden | keyboard |
| 34 | expo/expo | [#46941](https://github.com/expo/expo/issues/46941) Keyboard hides text input in BottomSheet | 2026-06-16 | closed 2026-08-26 | input hidden | keyboard |
| 35 | ionic-team/capacitor | [#8166](https://github.com/ionic-team/capacitor/issues/8166) Android 15+: keyboard overlap persists with edge-to-edge | 2025-09-23 | closed 2026-02-24 | overlap | keyboard |
| 36 | dotnet/maui | [#32041](https://github.com/dotnet/maui/issues/32041) net 10 rc2 keyboard overlap android | 2025-10-17 | closed 2026-10-24 | bottom entries covered | keyboard |
| 37 | flutter/flutter | [#179503](https://github.com/flutter/flutter/issues/179503) SearchAnchor keyboard covers suggestions | 2025-12-05 | open | wrong bottom padding | keyboard |
| 38 | flutter/flutter | [#186336](https://github.com/flutter/flutter/issues/186336) iPadOS floating numeric keyboard overlaps TextField | 2026-05-11 | open | insets wrong | keyboard |
| 39 | electron/electron | [#54627](https://github.com/electron/electron/issues/54627) Paint offset after DPI change between monitors | 2026-10-02 | closed 2026-10-23 | paint vs hit-test mismatch | DPI / resize |
| 40 | AvaloniaUI/Avalonia | [#22089](https://github.com/AvaloniaUI/Avalonia/issues/22089) Embedded window does not update scaling on DPI change | 2026-08-28 | open | WM_DPICHANGED not propagated | DPI / resize |
| 41 | dotnet/maui | [#39263](https://github.com/dotnet/maui/issues/39263) [iOS 27] Shell tab bar never re-evaluates after size class change | 2026-10-08 | closed 2026-10-10 | trait change swallowed | size-class |
| 42 | jellyfin/jellyfin-web | [#7051](https://github.com/jellyfin/jellyfin-web/issues/7051) Display problem on ultrawide (32:9) | 2025-07-29 | closed 2026-01-04 | oversized posters at 5120×1440 | ultrawide |
| 43 | jellyfin/jellyfin-android | [#2069](https://github.com/jellyfin/jellyfin-android/issues/2069) Portrait video player forces system bars on large devices | 2026-07-08 | closed 2026-07-23 | Android 16 ignores requested orientation | large-screen + policy |
| 44 | home-assistant/android | [#5597](https://github.com/home-assistant/android/issues/5597) Graph legend mispositioned on tablets/foldables | 2025-07-27 | closed 2025-07-28 | popover far from anchor | large-screen |
