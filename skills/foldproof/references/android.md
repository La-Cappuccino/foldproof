# Android adapter recipes (planned for v0.2)

This reference collects the Android commands and libraries a future foldproof adapter would drive, and the Google acceptance criteria it would map rules onto. None of it is implemented in v0.1: the web adapter reports Android `dp`-only, car and TV profiles as `notApplicable`, and no Android SDK was present on the build machine, so every command below is cited to AOSP source or official documentation and marked unverified locally. Use it to plan native coverage or to run the checks by hand; do not cite it as something foldproof executed. Inspected 2026-10-28.

Contents

1. Status in v0.1
2. Emulator foldable AVDs
3. `adb emu` fold, unfold, posture, rotate, resize-display
4. `cmd device_state` on emulator and hardware
5. Rotation with `wm user-rotation`
6. Split screen with `am start --windowingMode 6`
7. Process death with `am kill`
8. Fold-aware unit tests with `androidx.window:window-testing`
9. Google adaptive Tier 3 as acceptance criteria
10. Sources

## 1. Status in v0.1

The adapter interface for Android is internal and marked unstable. Profiles already carry what a driver needs: `logical` and `usable` in `dp`, `display_features` with AOSP hinge bounds, `postures[].android_state` (`FLAT`, `HALF_OPENED`) and `hinge_angle_range_deg`, `inputs.keyboard`, and for cars `operating_states`. What v0.2 adds is a driver that issues the commands below, an in-app oracle (UiAutomator or an instrumented hook) for reachability and state, and a mapping of the result into the same SARIF record with `evidenceLevel: emulated` for AVDs and `physical` for attached hardware.

## 2. Emulator foldable AVDs

Android Studio ships hardware profiles from AOSP `sdklib` XML (`devices.xml`, `nexus.xml`): `7.6" Fold-in with outer display` (1768 by 2208 px at 420 dpi, folded region 884 by 2208), `8" Fold-out`, `6.7" Horizontal Fold-in` (flip), `7.4in Rollable` (two folded regions), `Resizable (Experimental)` (phone, unfolded, tablet presets), and the Pixel Fold, Pixel 9 Pro Fold and Pixel 10 Pro Fold definitions (2076 by 2152 px at 390 dpi, zero-width fold at x=1038). Posture list `1, 2, 3` maps to hinge angle ranges 0 to 30, 30 to 150 and 150 to 180 degrees. The corpus mirrors these as `emulator-profile` entries (`aosp-pixel-9-pro-fold`, `aosp-7-6-fold-in-outer-display`). Samsung published Z Fold 8 and Z Flip 8 emulator skins in September 2026. `resize-display` is unsupported in headless configurations.

## 3. `adb emu` fold, unfold, posture, rotate, resize-display

From the Android Developers Blog post of 31 August 2026 on emulator control for adaptive apps:

```bash
adb emu fold                 # smaller configuration, outer display on
adb emu unfold               # larger configuration, inner display on
adb emu posture              # lists 1 closed, 2 half-opened, 3 opened
adb emu posture 2            # tabletop or book depending on the AVD's hinge orientation
adb emu rotate               # rotates 90 degrees (direction wording differs between the blog and the console reference; verify per build)
adb emu resize-display 1     # Resizable AVD: 0 phone, 1 unfolded, 2 tablet
adb -s emulator-5554 emu fold
```

Postures 4 and 5 fail with "KO: Failed to set posture" on the Pixel Fold and Resizable AVDs. There is no `adb emu` command for split screen. The blog states the fold commands exist to "check quickly that an app keeps its state", which is the oracle foldproof would supply.

## 4. `cmd device_state` on emulator and hardware

From `DeviceStateManagerShellCommand.java` in `frameworks/base`:

```bash
adb shell cmd device_state print-states      # e.g. [0 CLOSED, 1 HALF_OPENED, 2 OPENED, ...]
adb shell cmd device_state print-state
adb shell cmd device_state state 1           # override
adb shell cmd device_state state reset       # back to sensors
adb shell cmd device_state base-state 2
```

Identifiers vary per model: BrowserStack's Galaxy Fold 7 documentation uses state 1 for folded and 2 for unfolded; Pixel Fold reports `OPENED`, `CLOSED`, `HALF_OPENED`, `REAR_DISPLAY_STATE`. A driver must read `print-states` first and record the mapping in the evidence. Requires the shell's `CONTROL_DEVICE_STATE` permission.

## 5. Rotation with `wm user-rotation`

From `WindowManagerShellCommand.java`:

```bash
adb shell wm user-rotation lock 1            # 0, 1, 2, 3 = 0, 90, 180, 270 degrees from natural orientation
adb shell wm user-rotation free
adb shell wm size 411dpx891dp | wm size reset
adb shell wm density 420 | wm density reset
adb shell wm folded-area LEFT,TOP,RIGHT,BOTTOM | wm folded-area reset
adb shell wm set-ignore-orientation-request true
```

The number is relative to the device's natural orientation, which is landscape on many tablets; record the `wm user-rotation` readback, not the number sent. The legacy pair `settings put system accelerometer_rotation 0` and `user_rotation 1` is equivalent.

## 6. Split screen with `am start --windowingMode 6`

`WindowConfiguration.java` constants: `WINDOWING_MODE_FULLSCREEN` 1, `PINNED` 2, `FREEFORM` 5, `MULTI_WINDOW` 6.

```bash
adb shell am supports-split-screen-multi-window
adb shell am start -n com.example/.MainActivity --windowingMode 6
adb shell settings put global enable_freeform_support 1 && adb shell am start -n com.example/.MainActivity --windowingMode 5
```

The constants changed between releases (freeform was 4 before multi-window existed); pin them by API level. Entering split screen from a running app has no stable adb command; UiAutomator's `pressRecentApps()` plus a drag is the documented route. `Activity.isInMultiWindowMode()` is the in-app oracle. On displays of at least 600 dp smallest width, apps targeting API 36 run in multi-window regardless of manifest restrictions.

## 7. Process death with `am kill`

Configuration changes recreate the Activity; `ViewModel` survives those but not process death. `rememberSaveable`, `SavedStateHandle` and `onSaveInstanceState` survive system-initiated process death; only persistent storage survives `finish()`.

```bash
adb shell input keyevent KEYCODE_HOME && adb shell am kill com.example     # foreground processes are not killable this way
adb shell am start -n com.example/.MainActivity                            # restore; assert draft, scroll, selection
```

`ActivityScenario.recreate()` exercises only the configuration-change path; Compose's `StateRestorationTester.emulateSavedInstanceStateRestore()` covers `rememberSaveable`. A foldproof Android scenario would treat process death as a further transition kind with the same state policies.

## 8. Fold-aware unit tests with `androidx.window:window-testing`

WindowManager 1.5 is stable (October 2025; 1.5.1 latest). `WindowLayoutInfoPublisherRule` overrides what `WindowInfoTracker` publishes; the `FoldingFeature(activity, center, size, state, orientation)` factory builds a `FoldingFeature` with `state` `FLAT` or `HALF_OPENED`, `orientation` `HORIZONTAL` (tabletop) or `VERTICAL` (book), `occlusionType` `NONE` or `FULL`, `isSeparating` and `bounds`. This is pure mocking: it exercises the app's layout branch for a posture but does not drive a transition, so it pairs with `adb emu posture` or `cmd device_state` for integration evidence. Hinge angle is not exposed. The Surface Duo Foldable Test Kit (`com.microsoft.dualscreen.testing`, alpha03) is archived and dual-screen only.

## 9. Google adaptive Tier 3 as acceptance criteria

The adaptive app quality guidelines (updated 2026-10-21) replaced the large-screen guidelines; legacy LS-* ids remain in the car guidelines. Tier 3 "Adaptive ready" is the floor and the rules foldproof already relates to:

| Guideline | Requirement (near-verbatim) | foldproof rule it relates to |
|---|---|---|
| `Config_Changes` (LS-C1), tests T-Config_Orientation and T-Config_State | App fills the display, is not letterboxed; handles rotation, folding, unfolding and window resizing; scroll position maintained, typed text retained and keyboard state restored, media playback resumes | `fills-viewport`, `state-preserved`, `no-remount` |
| `Config_Combinations` (LS-C2), T-Config_Combinations | Handles combinations such as resize then rotate, or rotate then fold | ordered `steps` with per-step asserts |
| `Multi-Window_Functionality` (LS-M1) | Fully functional in multi-window mode | `split` transition, `reachable`, `operate` |
| `Touch_Targets` (LS-U3, Tier 2) | Targets at least 48 dp, not obscured at any size or configuration | `reachable` hit-test, `target-size` diagnostic |
| LS-F1 (Tier 1) | Supports all foldable postures (tabletop, book, dual display) | `posture` transition, `not-occluded-by-hinge` |

Google's named test devices are a foldable at 841 by 701 dp, an 8-inch tablet at 1024 by 640 dp, a 10.5-inch tablet at 1280 by 800 dp, a 13-inch Chromebook at 1600 by 900 dp and a Googlebook at 160 ppi. A pass against these guidelines under emulation relates to the guideline; it is not a Play review outcome or a badge.

## 10. Sources

Inspected 2026-10-28; none executed locally.

- Emulator control for adaptive app development (31 Aug 2026): https://developer.android.com/blog/posts/emulator-control-for-adaptive-app-development
- Emulator console reference: https://developer.android.com/studio/run/emulator-console
- AOSP `DeviceStateManagerShellCommand.java`, `WindowManagerShellCommand.java`, `ActivityManagerShellCommand.java`, `WindowConfiguration.java`: https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/
- AOSP sdklib `devices.xml`: https://android.googlesource.com/platform/tools/base/+/refs/heads/mirror-goog-studio-main/sdklib/src/main/resources/com/android/sdklib/devices/devices.xml
- Jetpack WindowManager releases and 1.5 stable: https://developer.android.com/jetpack/androidx/releases/window, https://android-developers.googleblog.com/2025/10/jetpack-windowmanager-15-is-stable.html
- `window-testing` sources: https://github.com/androidx/androidx/tree/androidx-main/window/window-testing/src/main/java/androidx/window/testing/layout
- Save UI states: https://developer.android.com/topic/libraries/architecture/saving-states
- Multi-window support: https://developer.android.com/guide/topics/large-screens/multi-window-support
- Adaptive app quality Tier 3 and Tier 2: https://developer.android.com/docs/quality-guidelines/adaptive-app-quality/tier-3, https://developer.android.com/docs/quality-guidelines/adaptive-app-quality/tier-2
- BrowserStack foldable testing (`cmd device_state` on Galaxy Fold 7): https://www.browserstack.com/docs/app-automate/appium/test-on-foldable-devices
- Surface Duo test kit (archived): https://devblogs.microsoft.com/surface-duo/foldable-ui-test-kit/
- Project research: `docs/research/03-testing-and-emulation-tooling.md` section 2, `docs/research/04-evidence-standards-and-positioning.md` section 2.3
