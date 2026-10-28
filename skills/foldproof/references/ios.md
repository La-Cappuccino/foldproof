# iOS and iPadOS

This reference records what is known about resizing on Apple platforms as it affects foldproof: size classes rather than orientation, the facts of the iPhone Duo, Apple's App Resizability agent skill (a code audit, not a test), the limits of the iPhone Duo simulator for automation, and what foldproof reports for iOS profiles in v0.1 (`review`). No Xcode was present on the build machine; simulator claims are cited to Apple documentation or to community tools and are unverified locally. Inspected 2026-10-28.

Contents

1. Size classes, not orientation
2. iPhone Duo facts
3. Apple's App Resizability skill
4. Simulator and automation limits
5. What foldproof reports
6. Sources

## 1. Size classes, not orientation

`UIUserInterfaceSizeClass` has `unspecified`, `compact` and `regular`; the horizontal class says whether the app is narrow or wide, the vertical class short or tall. iPadOS apps are resizable, and "apps don't control multitasking configurations or receive any indication of the ones that people choose" (HIG Multitasking). `UIRequiresFullScreen` is deprecated in iPadOS 26; from iOS 27 and iPadOS 27 it no longer opts out of resizing and the system resizes such scenes discretely (TN3192). `UIWindowScene.sizeRestrictions` expresses a preferred minimum only (Apple's example is 500 pt wide); no system minimum or maximum window size is published, and Stage Manager window sizes are not published anywhere authoritative, so the corpus lists them in `unknowns`.

On iOS Safari the CSS px layout width equals the device width in points (iPhone 17 Pro: 402 by 874 at scale 3, from the Playwright registry). Apple's tech-spec pages do not state the scale factor; profiles take it from a registry and mark it `derived`.

## 2. iPhone Duo facts

Announced 9 September 2026, on sale 23 October 2026 in more than 70 countries with 28 more on 30 October, from 1,999 US dollars, shipping with iOS 27.1. From the Apple tech specs page: inner display 7.6 inch OLED, 1878 by 2670 px at 430 ppi; outer display 5.4 inch OLED, 1398 by 2034 px at 460 ppi; open 164.6 by 117.8 by 5.2 mm, closed 84.1 by 117.8 by 11.3 mm; 254 g. The page does not state scale factor or point dimensions, and neither Playwright nor Chrome DevTools has an entry, so `apple-iphone-duo` is inventory-only in the corpus. Community simulator measurements (951 by 669 pt open, 466 by 678 pt closed, 40 px crease) exist but come from one simulator build and are not ingested as published values.

From Apple's tech talk "Prepare your app for iPhone Duo" and developer news: the inner display has regular horizontal and vertical size classes; the outer display is compact width and regular height in portrait, compact in both in landscape; "the inner display doesn't honor your supported interface orientations", while the same transcript also says "iPhone Duo respects your supported interface orientations, but your app will scale on the inner display" (both sentences are present; a profile records both and marks the behaviour as verify on device); `UIRequiresFullScreen` is honoured but "your app will still resize when someone opens or closes their iPhone Duo"; Split View multitasking applies. Starting April 2027, submitted apps must include iPhone Duo screenshots and be built with the iOS 27 SDK; submitting Duo screenshots earns a product-page badge. There is no Apple mandate that apps support all orientations. The transcript does not discuss state preservation across open and close, which is exactly the transition class foldproof targets.

## 3. Apple's App Resizability skill

Xcode 27.1 renames the Xcode 27 app-modernization skill to App Resizability and adds SwiftUI and iPhone Duo support. Apple's page "Three steps to make your app shine on iPhone Duo" says to run it in Xcode's coding assistant or export it for another agent with `xcrun agent skills export`, and that it "finds most issues, but not all of them". Its content, read from three byte-identical third-party exports because no Xcode was available, is a code-migration workflow over UIKit: `UIScreen.main` to trait display scale or window scene, orientation checks to size classes and `windowScene(_:didUpdateEffectiveGeometry:)`, AppDelegate to SceneDelegate, asymmetric and changing safe areas with `keyboardLayoutGuide`, `userInterfaceIdiom` to size classes, plus read-only Info.plist prerequisites (launch screen keys, all four iPad orientations, `UIRequiresFullScreen`). It contains no runtime test, posture sweep, assertion or pass and fail record; Apple delegates testing to the resizable simulator, the iPhone Duo simulator, Device Hub and iPhone Mirroring. Its licence is unstated, so foldproof links to Apple's page and the export command rather than redistributing it. Run it before foldproof as the fix step; foldproof is the verification step that neither vendor ships.

## 4. Simulator and automation limits

- Rotation is scriptable only from XCUITest (`XCUIDevice.shared.orientation`); `xcrun simctl` has no rotate, fold or split-view subcommand.
- Split View, Slide Over and Stage Manager have no `simctl` or XCUITest API; only gesture scripting through Appium drags or real iPads.
- The iPhone Duo simulator (Xcode 27.1) can be folded, rotated and swept through hinge angles by a community tool that posts the same vendor-defined HID events as Device Hub's hinge slider through a compiled helper. It uses private simulator interfaces verified only against Xcode 27.1 build 27A9275, offers no hinge-angle readback, shows hysteresis, and notes that Xcode's device-interaction tools tap only the cover display and that `simctl io screenConfig` crash-loops SpringBoard. Other skills report that scripted drivers cannot tap the open Duo. Treat this as fragile and build-specific.
- XCUITest can show the simulator keyboard by typing; the hardware-keyboard toggle is UI-only.
- `simctl ui` can set appearance, content size and increased contrast (Xcode 14 and later, not verified here).
- WebKit on macOS cannot show the iOS keyboard, Dynamic Island occlusion or real touch latency.

## 5. What foldproof reports

For `ios` and `ipados` profiles the v0.1 web adapter does not run; every expected row for them is `review`, which never counts as a pass and sets the exit code to 2 unless the profile is excluded. For `apple-iphone-duo` specifically the profile is also inventory-only (no `css_px` sizes), so the resolver reports `notApplicable: profile not executable`. A WebKit run with viewport-only emulation is a candidate for a later version and would be labelled `viewport-only`; it would still not emulate the Duo's open and close. Any claim about iOS behaviour must come from the simulator or hardware and be recorded as a separate evidence level.

## 6. Sources

Inspected 2026-10-28.

- Apple iPhone Duo tech specs: https://www.apple.com/iphone-duo/specs/
- Apple newsroom, iPhone Duo unveiled: https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/
- Apple Tech Talk 111461, Prepare your app for iPhone Duo: https://developer.apple.com/videos/play/tech-talks/111461/
- Apple, Three steps to make your app shine on iPhone Duo (App Resizability skill, `xcrun agent skills export`): https://developer.apple.com/iphone-duo/prepare/
- Apple Developer News and upcoming requirements (April 2027 screenshots and SDK): https://developer.apple.com/news/, https://developer.apple.com/news/upcoming-requirements/
- WWDC26 session 278 (skill export): https://developer.apple.com/videos/play/wwdc2026/278/
- `UIUserInterfaceSizeClass`: https://developer.apple.com/documentation/uikit/uiuserinterfacesizeclass
- HIG Layout and Multitasking: https://developer.apple.com/design/human-interface-guidelines/layout, https://developer.apple.com/design/human-interface-guidelines/multitasking
- TN3192, migrating from `UIRequiresFullScreen`: https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key
- `XCUIDevice.orientation`: https://developer.apple.com/documentation/xcuiautomation/xcuidevice/orientation
- Exported skill mirrors (read-only, licence unstated): https://github.com/artemnovichkov/xcode-skills, https://github.com/mariusfanu/xcode-skills, https://github.com/funsiyuan/apple-app-resizability-skill
- iPhone Duo simulator driver (private HID, Xcode 27.1): https://github.com/WhitenWhiten/iphone-duo-simulator-skill
- Community Duo measurements (one simulator build): https://github.com/getpopcraft/foldable-sim, https://github.com/mirzaaghazadeh/iphone-duo-skills
- Market facts (MacRumors roundup, secondary): https://www.macrumors.com/roundup/iphone-duo/
- Project research: `docs/research/01-existing-packages-and-skill-standards.md` section 1.3 and addendum, `docs/research/02-device-profile-sources.md` section 2.3, `docs/research/03-testing-and-emulation-tooling.md` section 3, `docs/research/04-evidence-standards-and-positioning.md` sections 1.1 and 2.6
