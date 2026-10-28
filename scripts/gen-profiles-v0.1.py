"""Generate the v0.1 foldproof profile corpus from verified research numbers.

Reads scripts/data/playwright-deviceDescriptorsSource-2026-10-28.json (Apache-2.0 snapshot of the Playwright
registry, inspected 2026-10-28) for exact registry values. Every other number is typed in from the sources
named in docs/research/02-device-profile-sources.md, with the revision read on inspection day.
Run: python3 -I scripts/gen-profiles-v0.1.py && npx tsx src/cli.ts profiles validate
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'profiles')
os.makedirs(OUT, exist_ok=True)
PW = json.load(open(os.path.join(HERE, 'data', 'playwright-deviceDescriptorsSource-2026-10-28.json')))
D = '2026-10-28'
RESEARCH = 'https://github.com/La-Cappuccino/foldproof/blob/main/docs/research/02-device-profile-sources.md'

# revisions read on inspection day (GitHub API / gitiles)
REV_PW = 'main f9a841f968dd9a4e315df2ec2930da1952971667 (package 1.65.0-next; file last changed b80bcb5a 2026-10-23)'
REV_DT = 'main 89605581639d434b16692f9dec9482e443a45973 (file last changed 4c3993d1 2026-08-27)'
REV_BCD = 'v8.1.7 (main bf12f642f00a463ca4831b13005f1fbd21acdd1a)'
REV_AOSP = 'mirror-goog-studio-main b143674a31236684a225ec6d6d19a5c9b1ecef51 (2026-10-28)'


# ---------- shared sources ----------
def src(id, url, publisher, licence, kind='published', quote=None, note=None, revision=None):
    s = {'id': id, 'url': url, 'publisher': publisher, 'inspected': D, 'licence': licence, 'kind': kind}
    if revision: s['revision'] = revision
    if quote: s['quote'] = quote
    if note: s['note'] = note
    return s


S_PW = src('playwright', 'https://github.com/microsoft/playwright/blob/main/packages/isomorphic/deviceDescriptorsSource.json',
           'Microsoft (Playwright)', 'Apache-2.0', revision=REV_PW,
           note='207 entries on main at inspection; file moved here from playwright-core/src/server. viewport = layout viewport after browser UI; screen = full screen in CSS px.')
S_DT = src('chrome-devtools', 'https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/emulation/EmulatedDevices.ts',
           'Chromium (DevTools)', 'BSD-3-Clause', revision=REV_DT,
           note='screen.vertical/horizontal in CSS px, device-pixel-ratio, spanned modes with hinge rect {x,y,width,height} in CSS px.')
S_BCD = src('mdn-bcd', 'https://github.com/mdn/browser-compat-data', 'MDN', 'CC0-1.0', revision=REV_BCD,
            note='Navigator.devicePosture chrome 132, safari_ios 27 behind a flag, samsunginternet 16.2; Viewport.segments chrome 138; VisualViewport chrome 61 / safari 13 / firefox 91. Engine support lives in engines/, not in profiles.')
S_CHROME_KB = src('chrome-viewport-resize', 'https://developer.chrome.com/blog/viewport-resize-behavior', 'Google (Chrome Developers)', 'CC-BY-4.0',
                  quote='Chrome on Android will no longer resize the Layout Viewport',
                  note='Chrome 108 default interactive-widget=resizes-visual on Android; Safari iOS resizes visual viewport only; Firefox resizes both. No keyboard heights published.')
S_W3C_POSTURE = src('w3c-device-posture', 'https://www.w3.org/TR/device-posture/', 'W3C Devices and Sensors WG', 'W3C-document-licence',
                    revision='Candidate Recommendation Draft 2026-10-26', quote='continuous | folded',
                    note='continuous = flat or fully closed; folded = book or laptop posture.')
S_AX_FOLD = src('androidx-foldingfeature', 'https://android.googlesource.com/platform/frameworks/support/+/androidx-main/window/window/src/main/java/androidx/window/layout/FoldingFeature.kt',
                'AOSP (androidx.window)', 'Apache-2.0', revision='androidx-main (read 2026-10-28)',
                note='State FLAT | HALF_OPENED; Orientation VERTICAL | HORIZONTAL; OcclusionType NONE (flexible screen, treat as guideline) | FULL (hinge is part of the window); isSeparating true for hinges always and for folds when not FLAT.')
S_SAMSUNG_FLEX = src('samsung-flex-mode', 'https://developer.samsung.com/galaxy-z/flex-mode.html', 'Samsung Developers', 'vendor-fact',
                     note='Flex mode = FoldingFeature HALF_OPENED (POSTURE_HALF_OPENED); Samsung foldables report TYPE_FOLD; requires Jetpack WindowManager 1.0.0+. No hinge angle thresholds or screen dimensions published on the page.')
S_AOSP_DEVICES = src('aosp-devices-xml', 'https://android.googlesource.com/platform/tools/base/+/mirror-goog-studio-main/sdklib/src/main/resources/com/android/sdklib/devices/devices.xml',
                     'AOSP (platform/tools/base sdklib)', 'Apache-2.0', revision=REV_AOSP,
                     note='Emulator hardware profiles. hinge areas encoded x-y-w-h in device px of the unfolded panel; posture-list 1,2,3 = hinge-angles 0-30, 30-150, 150-180. Licence per AOSP repository NOTICE; the XML carries no header.')
S_AOSP_NEXUS = src('aosp-nexus-xml', 'https://android.googlesource.com/platform/tools/base/+/mirror-goog-studio-main/sdklib/src/main/resources/com/android/sdklib/devices/nexus.xml',
                   'AOSP (platform/tools/base sdklib)', 'Apache-2.0', revision=REV_AOSP,
                   note='Google device emulator profiles (Pixel Fold, Pixel 9 Pro Fold, Pixel 10 Pro Fold, Pixel Tablet, Pixel 10 Pro). One pixel-density per profile, applied to the folded region too.')
S_AOSP_TV = src('aosp-tv-xml', 'https://android.googlesource.com/platform/tools/base/+/mirror-goog-studio-main/sdklib/src/main/resources/com/android/sdklib/devices/tv.xml',
                'AOSP (platform/tools/base sdklib)', 'Apache-2.0', revision=REV_AOSP, quote='Television (1080p): 1920 x 1080, xhdpi, 55.0 in')
S_AOSP_AUTO = src('aosp-automotive-xml', 'https://android.googlesource.com/platform/tools/base/+/mirror-goog-studio-main/sdklib/src/main/resources/com/android/sdklib/devices/automotive.xml',
                  'AOSP (platform/tools/base sdklib)', 'Apache-2.0', revision=REV_AOSP, quote='Automotive (1024p landscape): 1024 x 768, mdpi, 8.4 in')
S_ANDROID_DENSITY = src('android-screen-densities', 'https://developer.android.com/training/multiscreen/screendensities', 'Google (Android Developers)', 'CC-BY-4.0',
                        quote='px = dp * (dpi / 160)', note='mdpi 160 = 1.0 baseline; xhdpi 320 = 2.0; xxhdpi 480 = 3.0; 420dpi = 2.625; 390dpi = 2.4375.')
S_GOOGLE_PIXEL = src('google-pixel-specs', 'https://support.google.com/pixelphone/answer/7158570', 'Google (Pixel Phone Help)', 'vendor-fact')
S_APPLE_DUO = src('apple-iphone-duo-specs', 'https://www.apple.com/iphone-duo/specs/', 'Apple', 'vendor-fact',
                  quote='7.6-inch (diagonal) all-screen OLED folding display; 1878-by-2670-pixel resolution at 430 ppi. 5.4-inch (diagonal) all-screen OLED display; 1398-by-2034-pixel resolution at 460 ppi.')
S_MS_DUO = src('microsoft-surface-duo-dimensions', 'https://learn.microsoft.com/en-us/previous-versions/dual-screen/android/surface-duo-dimensions', 'Microsoft Learn (archived)', 'CC-BY-4.0',
               revision='ms.date 2021-09-22, updated 2024-12-17, gitcommit e0dbafc31d8dd8882913c9fdea490f960ca85d2e',
               quote='Density Class: xxhdpiDensity; Factor: 2.5x; Full screen width including hinge mask: Surface Duo: 1,114dp / 2,784px', note='Page is archived (is_archived: true).')
S_LG = src('lg-34wq75c-b', 'https://www.lg.com/us/monitors/lg-34wq75c-b-ultrawide-monitor', 'LG', 'vendor-fact', quote='34" Curved QHD (3440 x 1440) IPS Display', note='Page states the model is discontinued; the panel spec stands.')
S_TV_LAYOUT = src('android-tv-layouts', 'https://developer.android.com/training/tv/playback/compose/layouts', 'Google (Android Developers)', 'CC-BY-4.0',
                  quote='Adding a 5% margin of 48 dp on the left and right edges and 27 dp on the top and bottom edges to a layout helps ensure that screen elements in the layout are within the overscan-safe area.',
                  note='720p = tvdpi, 1080p = xhdpi, 4K = xxxhdpi. D-pad remote; no swipe-only gestures; viewer at 10 feet.')
S_CAR_QUALITY = src('android-car-app-quality', 'https://developer.android.com/docs/quality-guidelines/car-app-quality', 'Google (Android Developers)', 'CC-BY-4.0',
                    note='DD-2/DD-3: video, games, browsers not launchable or visible while driving. UX-1..3 (Car differentiated): targets >= 64dp, >= 24dp apart, fonts >= 24sp. AC-1/DR-1: tasks within five screens, buttons respond within two seconds.')
S_CAR_PARKED = src('android-automotive-parked', 'https://developer.android.com/training/cars/parked/automotive-os', 'Google (Android Developers)', 'CC-BY-4.0',
                   quote='The only value provided by CarUxRestrictions that your app refers to is the return value of isRequiresDistractionOptimization', note='Do not infer restrictions from gear or speed; restrictions can vary per display. Parked apps must not set distractionOptimized.')
S_CAR_UX = src('android-car-ux-restrictions', 'https://developer.android.com/reference/android/car/drivingstate/CarUxRestrictions', 'Google (Android Developers)', 'CC-BY-4.0',
               quote='UX_RESTRICTIONS_FULLY_RESTRICTED = 511', note='Bit flags: NO_DIALPAD 1, NO_FILTERING 2, LIMIT_STRING_LENGTH 4, NO_KEYBOARD 8, NO_VIDEO 16, LIMIT_CONTENT 32, NO_SETUP 64, NO_TEXT_MESSAGE 128, NO_VOICE_TRANSCRIPTION 256. The active mask is OEM-configured and read at runtime.')
S_MULTIWINDOW = src('android-multi-window', 'https://developer.android.com/guide/topics/large-screens/multi-window-support', 'Google (Android Developers)', 'CC-BY-4.0',
                    note='On medium/expanded windows all apps run in multi-window; android:minWidth/minHeight in <layout> set minimums; target API 36 on sw >= 600dp ignores resize restrictions. No default split divider width is published.')
S_HIG_MULTI = src('apple-hig-multitasking', 'https://developer.apple.com/design/human-interface-guidelines/multitasking', 'Apple (Human Interface Guidelines)', 'vendor-fact',
                  quote="Apps don't control multitasking configurations or receive any indication of the ones that people choose.")
S_TN3192 = src('apple-tn3192', 'https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key', 'Apple', 'vendor-fact',
               note='UIRequiresFullScreen deprecated in iPadOS 26; from iOS/iPadOS 27 the key no longer opts out of resizing. sizeRestrictions.minimumSize is a preferred minimum (example 500 pt); no system minimum or maximum window size published.')
S_HIG_LAYOUT = src('apple-hig-layout', 'https://developer.apple.com/design/human-interface-guidelines/layout', 'Apple (Human Interface Guidelines)', 'vendor-fact',
                   quote="Respecting the safe area is essential to make sure system UI and hardware features like the Dynamic Island don't obstruct content and controls.", note='No numeric Dynamic Island or safe-area values on the page; no device dimension table (refers to Design Resources).')
S_DERIV = src('foldproof-derivation', RESEARCH, 'foldproof (this corpus)', 'CDLA-Permissive-2.0', kind='derived',
              note='Values computed by the corpus author from the other listed sources; each derived entry states its formula in `derivation`.')


# ---------- helpers ----------
def U(field, reason):
    return {'field': field, 'reason': reason}


U_KEYBOARD = U('keyboard_height', 'No published or cited community measurement of the soft keyboard height for this device; measure at test time (visualViewport.height delta or env(keyboard-inset-height)). Never defaulted.')
U_INSETS = U('usable.insets', 'System insets (status bar, navigation bar) and cutout geometry are not published; insets recorded as 0, meaning "not published", not "none".')


def pw_entry(name):
    return PW[name]


def pw_logical(name, panel, orientation, unit='css_px'):
    v = pw_entry(name)
    screen = v.get('screen') or v['viewport']
    return {'panel': panel, 'orientation': orientation, 'unit': unit, 'w': screen['width'], 'h': screen['height'],
            'scale': v['deviceScaleFactor'], 'kind': 'published', 'source_ref': 'playwright',
            'registry': f'playwright deviceDescriptorsSource.json: {name}'}


def pw_dp(name, panel, orientation):
    v = pw_entry(name)
    screen = v.get('screen') or v['viewport']
    return {'panel': panel, 'orientation': orientation, 'unit': 'dp', 'w': screen['width'], 'h': screen['height'],
            'scale': v['deviceScaleFactor'], 'kind': 'derived',
            'derivation': f'dp = css_px at 100% zoom: Chromium on Android reports devicePixelRatio equal to the Android density scale (Playwright Pixel 7 = 2.625 = 420dpi/160), so {screen["width"]}x{screen["height"]} css_px = {screen["width"]}x{screen["height"]} dp',
            'source_ref': 'playwright'}


def pw_usable(name, panel, orientation):
    v = pw_entry(name)
    vp = v['viewport']
    return {'panel': panel, 'orientation': orientation, 'unit': 'css_px', 'layout_viewport': {'w': vp['width'], 'h': vp['height']},
            'insets': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}, 'cutouts': [], 'kind': 'published',
            'derivation': 'layout_viewport is the Playwright `viewport` (screen minus browser UI); insets 0 = no separate system-inset data published, not a claim of none',
            'source_ref': 'playwright'}


def pw_panel(name_portrait, panel, diag=None, ppi=None, density=None, source_ref='playwright'):
    v = pw_entry(name_portrait)
    screen = v.get('screen') or v['viewport']
    p = {'name': panel, 'physical_px': {'w': screen['width'] * v['deviceScaleFactor'], 'h': screen['height'] * v['deviceScaleFactor']}, 'source_ref': source_ref}
    if diag: p['diagonal_in'] = diag
    if ppi: p['ppi'] = ppi
    if density: p['density_dpi'] = density
    return p


def inputs_touch(source_ref='playwright', keyboard='soft'):
    return {'pointer': 'coarse', 'hover': 'none', 'touch': True, 'keyboard': keyboard, 'source_ref': source_ref}


def posture(name, panel, web_posture, android_state, source_ref, feature=None, angles=None, orientation='portrait'):
    """orientation = the orientation this posture and its display feature are expressed in (resolver default)."""
    p = {'name': name, 'panel': panel, 'orientation': orientation, 'web': {'posture': web_posture, 'segments': 2 if feature else 1}, 'android_state': android_state}
    if angles: p['hinge_angle_range_deg'] = list(angles)
    if feature: p['display_feature'] = feature
    p['source_ref'] = source_ref
    return p


def profile(id, kind, platform, name, sources, panels, logical, usable, inputs, unknowns, vendor=None,
            display_features=None, postures=None, operating_states=None, conflicts=None, tags=None):
    p = {'$schema': '../schemas/profile.schema.json', 'id': id, 'revision': 1, 'kind': kind, 'platform': platform, 'name': name}
    if vendor: p['vendor'] = vendor
    p['sources'] = sources
    p['panels'] = panels
    p['logical'] = logical
    p['usable'] = usable
    p['display_features'] = display_features or []
    p['postures'] = postures or []
    p['inputs'] = inputs
    p['operating_states'] = operating_states or []
    p['conflicts_with'] = conflicts or []
    p['unknowns'] = unknowns
    p['tags'] = tags or []
    return p


def centre_folds(prefix, w_portrait, h_portrait, w_land, h_land, source_ref='foldproof-derivation', panel='inner'):
    """Derived zero-width centre-line folds for a flexible-screen foldable (occlusion none)."""
    return [
        {'id': f'{prefix}-fold-vertical', 'panel': panel, 'type': 'fold', 'orientation': 'vertical',
         'bounds': {'x': w_portrait / 2, 'y': 0, 'w': 0, 'h': h_portrait}, 'unit': 'css_px', 'occlusion': 'none', 'is_separating': True,
         'kind': 'derived', 'derivation': f'portrait coordinates: centre line of the portrait inner width {w_portrait} / 2 = {w_portrait / 2}; width 0 and occlusion none because FoldingFeature.OcclusionType is NONE for flexible screens; actual fold bounds are unmeasured (see unknowns)',
         'source_ref': source_ref},
        {'id': f'{prefix}-fold-horizontal', 'panel': panel, 'type': 'fold', 'orientation': 'horizontal',
         'bounds': {'x': 0, 'y': h_land / 2, 'w': w_land, 'h': 0}, 'unit': 'css_px', 'occlusion': 'none', 'is_separating': True,
         'kind': 'derived', 'derivation': f'landscape coordinates (tabletop = phone held landscape, fold stays at half the portrait width): centre line of the landscape screen height {h_land} / 2 = {h_land / 2}; width 0 and occlusion none per FoldingFeature.OcclusionType NONE. Offset is in screen coordinates; the Playwright landscape layout viewport is smaller than the screen, so the offset relative to the layout viewport depends on where the browser UI sits (unmeasured)',
         'source_ref': source_ref},
    ]


def foldable_postures(prefix, posture_src='samsung-flex-mode', angles=None):
    a = angles or {}
    return [
        posture('closed', 'outer', 'continuous', None, posture_src, angles=a.get('closed')),
        posture('flat', 'inner', 'continuous', 'FLAT', posture_src, angles=a.get('flat')),
        posture('half_opened', 'inner', 'folded', 'HALF_OPENED', posture_src, feature=f'{prefix}-fold-vertical', angles=a.get('half_opened')),
        posture('book', 'inner', 'folded', 'HALF_OPENED', posture_src, feature=f'{prefix}-fold-vertical', angles=a.get('half_opened')),
        posture('tabletop', 'inner', 'folded', 'HALF_OPENED', posture_src, feature=f'{prefix}-fold-horizontal', angles=a.get('half_opened'), orientation='landscape'),
    ]


AOSP_ANGLES = {'closed': [0, 30], 'half_opened': [30, 150], 'flat': [150, 180]}
U_FOLD_BOUNDS = U('display_features.bounds', 'Fold bounds on hardware are unmeasured; the display features are derived centre lines in screen coordinates (vertical in portrait, horizontal in landscape, because the fold stays at half the portrait width and reads as horizontal only when the phone is held landscape). The Playwright landscape layout viewport is smaller than the screen, so the fold offset relative to the layout viewport shifts by the browser UI height (unmeasured).')

profiles = []

# ---------- Microsoft Surface Duo (slice-1 priority 1) ----------
def dt_logical(panel, orientation, w, h, dpr, mode):
    return {'panel': panel, 'orientation': orientation, 'unit': 'css_px', 'w': w, 'h': h, 'scale': dpr, 'kind': 'published', 'source_ref': 'chrome-devtools',
            'registry': f'devtools-frontend EmulatedDevices.ts: {mode}'}


def dt_usable(panel, orientation, w, h):
    return {'panel': panel, 'orientation': orientation, 'unit': 'css_px', 'layout_viewport': {'w': w, 'h': h},
            'insets': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}, 'cutouts': [], 'kind': 'derived',
            'derivation': 'DevTools publishes screen size only; layout viewport = screen because browser UI height is not in the registry; insets 0 = not published', 'source_ref': 'chrome-devtools'}


def dt_hinge(id, panel, orientation, x, y, w, h, occlusion, note):
    return {'id': id, 'panel': panel, 'type': 'hinge' if occlusion == 'full' else 'fold', 'orientation': orientation,
            'bounds': {'x': x, 'y': y, 'w': w, 'h': h}, 'unit': 'css_px', 'occlusion': occlusion, 'is_separating': True,
            'kind': 'published', 'derivation': note, 'source_ref': 'chrome-devtools'}


profiles.append(profile(
    'microsoft-surface-duo', 'device', 'android', 'Microsoft Surface Duo (dual-screen)', vendor='Microsoft',
    sources=[S_DT, S_MS_DUO, S_AX_FOLD, S_W3C_POSTURE, S_CHROME_KB, S_DERIV],
    panels=[
        {'name': 'inner', 'physical_px': {'w': 2784, 'h': 1800}, 'density_dpi': 400, 'source_ref': 'microsoft-surface-duo-dimensions'},
        {'name': 'single', 'physical_px': {'w': 1350, 'h': 1800}, 'density_dpi': 400, 'source_ref': 'chrome-devtools'},
    ],
    logical=[
        dt_logical('inner', 'landscape', 1114, 720, 2.5, 'Surface Duo vertical-spanned (both screens side by side)'),
        dt_logical('inner', 'portrait', 720, 1114, 2.5, 'Surface Duo horizontal-spanned (both screens stacked)'),
        dt_logical('single', 'portrait', 540, 720, 2.5, 'Surface Duo vertical (one screen)'),
        dt_logical('single', 'landscape', 720, 540, 2.5, 'Surface Duo horizontal (one screen)'),
        {'panel': 'inner', 'orientation': 'landscape', 'unit': 'dp', 'w': 1114, 'h': 720, 'scale': 2.5, 'kind': 'published', 'source_ref': 'microsoft-surface-duo-dimensions',
         'registry': 'Microsoft Learn archived dimensions page: 1,114dp / 2,784px full width including hinge mask, 2.5x; height 720 dp from DevTools'},
    ],
    usable=[dt_usable('inner', 'landscape', 1114, 720), dt_usable('inner', 'portrait', 720, 1114), dt_usable('single', 'portrait', 540, 720), dt_usable('single', 'landscape', 720, 540)],
    display_features=[
        dt_hinge('duo-hinge-vertical', 'inner', 'vertical', 540, 0, 34, 720, 'full', 'landscape coordinates (1114x720 span): DevTools hinge {x:540,y:0,width:34,height:720} contentColor alpha 1.0 (opaque); 34 css_px x 2.5 = 85 device px, consistent with Microsoft 2,784 px total minus two 1,350 px screens = 84 px'),
        dt_hinge('duo-hinge-horizontal', 'inner', 'horizontal', 0, 540, 720, 34, 'full', 'portrait coordinates (720x1114 span): DevTools hinge {x:0,y:540,width:720,height:34}, opaque'),
    ],
    postures=[
        posture('closed', 'single', 'continuous', None, 'w3c-device-posture'),
        posture('flat', 'inner', 'continuous', 'FLAT', 'w3c-device-posture', feature='duo-hinge-vertical', orientation='landscape'),
        posture('book', 'inner', 'folded', 'HALF_OPENED', 'w3c-device-posture', feature='duo-hinge-vertical', orientation='landscape'),
        posture('tabletop', 'inner', 'folded', 'HALF_OPENED', 'w3c-device-posture', feature='duo-hinge-horizontal', orientation='portrait'),
    ],
    inputs=inputs_touch('chrome-devtools'),
    unknowns=[
        U('panels.single.physical_px', 'Derived from DevTools 540x720 @2.5; the Microsoft page only publishes the spanned total width.'),
        U('postures.closed', 'Means single-screen use (one display active). Microsoft publishes a 360-degree hinge with no posture angle ranges.'),
        U('panels.density_dpi', '400 is implied by Factor 2.5x (160 x 2.5); the page names the class xxhdpi.'),
        U('usable.layout_viewport', 'Browser UI height not in the registry; layout viewport equals the screen.'),
        U_INSETS, U_KEYBOARD,
    ],
    tags=['foldable', 'phone'],
))

# ---------- Google Pixel 9 Pro Fold (priority 2) ----------
profiles.append(profile(
    'google-pixel-9-pro-fold', 'device', 'android', 'Google Pixel 9 Pro Fold', vendor='Google',
    sources=[S_DT, S_GOOGLE_PIXEL, S_AOSP_NEXUS, S_ANDROID_DENSITY, S_AX_FOLD, S_W3C_POSTURE, S_CHROME_KB, S_DERIV],
    panels=[
        {'name': 'inner', 'physical_px': {'w': 2076, 'h': 2152}, 'diagonal_in': 8, 'ppi': 373, 'density_dpi': 390, 'source_ref': 'google-pixel-specs'},
        {'name': 'outer', 'physical_px': {'w': 1080, 'h': 2424}, 'diagonal_in': 6.3, 'ppi': 422, 'density_dpi': 390, 'source_ref': 'google-pixel-specs'},
    ],
    logical=[
        dt_logical('inner', 'portrait', 836, 842, 2.625, 'Pixel 9 Pro Fold vertical-spanned'), dt_logical('inner', 'landscape', 842, 836, 2.625, 'Pixel 9 Pro Fold horizontal-spanned'),
        dt_logical('outer', 'portrait', 412, 922, 2.625, 'Pixel 9 Pro Fold vertical'), dt_logical('outer', 'landscape', 922, 412, 2.625, 'Pixel 9 Pro Fold horizontal'),
        {'panel': 'inner', 'orientation': 'portrait', 'unit': 'dp', 'w': 851.69, 'h': 882.87, 'scale': 2.4375, 'kind': 'derived',
         'derivation': 'dp = px / (390 / 160): 2076 / 2.4375 = 851.69; 2152 / 2.4375 = 882.87 (AOSP nexus.xml pixel-density 390dpi; vendor px from Google)', 'source_ref': 'aosp-nexus-xml'},
        {'panel': 'outer', 'orientation': 'portrait', 'unit': 'dp', 'w': 443.08, 'h': 994.46, 'scale': 2.4375, 'kind': 'derived',
         'derivation': 'dp = px / 2.4375 using the single AOSP profile density (390dpi): 1080 / 2.4375 = 443.08; 2424 / 2.4375 = 994.46. The retail outer panel is 422 ppi, so the real density may differ', 'source_ref': 'aosp-nexus-xml'},
    ],
    usable=[dt_usable('inner', 'portrait', 836, 842), dt_usable('inner', 'landscape', 842, 836), dt_usable('outer', 'portrait', 412, 922), dt_usable('outer', 'landscape', 922, 412)],
    display_features=[
        dt_hinge('p9pf-fold-vertical', 'inner', 'vertical', 418, 0, 0, 842, 'none', 'portrait coordinates (836x842 span): DevTools hinge {x:418,y:0,width:0,height:842}, contentColor alpha 0.2 (translucent) = flexible fold'),
        dt_hinge('p9pf-fold-horizontal', 'inner', 'horizontal', 0, 418, 842, 0, 'none', 'landscape coordinates (842x836 span): DevTools hinge {x:0,y:418,width:842,height:0}, alpha 0.2'),
        {'id': 'p9pf-fold-vertical-dp', 'panel': 'inner', 'type': 'fold', 'orientation': 'vertical', 'bounds': {'x': 425.85, 'y': 0, 'w': 0, 'h': 882.87}, 'unit': 'dp', 'occlusion': 'none', 'is_separating': True,
         'kind': 'derived', 'derivation': 'AOSP nexus.xml hinge areas "1038-0-0-2152" (x-y-w-h device px) / 2.4375 = x 425.85, w 0, h 882.87', 'source_ref': 'aosp-nexus-xml'},
    ],
    postures=foldable_postures('p9pf', posture_src='aosp-nexus-xml', angles=AOSP_ANGLES),
    inputs=inputs_touch('aosp-nexus-xml'),
    conflicts=[
        {'profile_id': 'aosp-pixel-9-pro-fold', 'field': 'logical.inner', 'note': 'DevTools spanned 836x842 @2.625 implies 2194.5x2210.25 device px; Google and AOSP publish 2076x2152 at 390dpi (851.69x882.87 dp). DevTools entry matches neither the hardware px count nor the AOSP density. Kept side by side.'},
    ],
    unknowns=[
        U('logical.inner.css_px', 'Hardware CSS px for the inner panel in Chrome is unmeasured; the DevTools value conflicts with vendor px (see conflicts_with).'),
        U('display_features.bounds', 'Real fold bounds on hardware unmeasured; DevTools x=418 css_px and AOSP x=1038 device px are registry/emulator values.'),
        U('panels.outer.density_dpi', 'Outer panel density on hardware unknown; AOSP applies one density (390dpi) to both regions.'),
        U_INSETS, U_KEYBOARD,
    ],
    tags=['foldable', 'phone'],
))

# ---------- Samsung Galaxy Z Fold7 (priority 3) ----------
S_SAMSUNG_US = src('samsung-fold7-us-specs', 'https://www.samsung.com/us/smartphones/galaxy-z-fold7/specs/', 'Samsung', 'vendor-fact',
                   quote='spans 8" across', note='Only the 8-inch main screen and 8.9 mm folded thickness rendered; the specification table did not render to a plain fetch, so panel resolution is NOT vendor-verified here.')
fold7_in_p = pw_logical('Galaxy Z Fold 7', 'inner', 'portrait'); fold7_in_l = pw_logical('Galaxy Z Fold 7 landscape', 'inner', 'landscape')
profiles.append(profile(
    'samsung-galaxy-z-fold7', 'device', 'android', 'Samsung Galaxy Z Fold7', vendor='Samsung',
    sources=[S_PW, S_SAMSUNG_US, S_SAMSUNG_FLEX, S_AX_FOLD, S_W3C_POSTURE, S_CHROME_KB, S_DERIV],
    panels=[pw_panel('Galaxy Z Fold 7', 'inner', diag=8), pw_panel('Galaxy Z Fold 7 Cover', 'outer')],
    logical=[fold7_in_p, fold7_in_l, pw_logical('Galaxy Z Fold 7 Cover', 'outer', 'portrait'), pw_logical('Galaxy Z Fold 7 Cover landscape', 'outer', 'landscape'),
             pw_dp('Galaxy Z Fold 7', 'inner', 'portrait'), pw_dp('Galaxy Z Fold 7 Cover', 'outer', 'portrait')],
    usable=[pw_usable('Galaxy Z Fold 7', 'inner', 'portrait'), pw_usable('Galaxy Z Fold 7 landscape', 'inner', 'landscape'),
            pw_usable('Galaxy Z Fold 7 Cover', 'outer', 'portrait'), pw_usable('Galaxy Z Fold 7 Cover landscape', 'outer', 'landscape')],
    display_features=centre_folds('fold7', fold7_in_p['w'], fold7_in_p['h'], fold7_in_l['w'], fold7_in_l['h']),
    postures=foldable_postures('fold7'),
    inputs=inputs_touch(),
    unknowns=[
        U('panels.physical_px', 'Vendor panel resolutions are unverified: physical_px is css_px x deviceScaleFactor from Playwright (inner 984x1092 @2 = 1968x2184; cover 360x840 @3 = 1080x2520). The Samsung spec table did not render.'),
        U_FOLD_BOUNDS,
        U('postures.hinge_angle_range_deg', 'Samsung publishes no hinge-angle thresholds for Flex mode.'),
        U('logical.dp', 'Android density buckets per panel are unverified; dp entries assume Chromium css_px = dp.'),
        U('panels.outer.diagonal_in', 'Cover panel diagonal not verified from the vendor page.'),
        U_INSETS, U_KEYBOARD,
    ],
    tags=['foldable', 'phone'],
))

# ---------- Google Pixel 10 Pro (priority 4) ----------
profiles.append(profile(
    'google-pixel-10-pro', 'device', 'android', 'Google Pixel 10 Pro', vendor='Google',
    sources=[S_PW, S_AOSP_NEXUS, S_ANDROID_DENSITY, S_CHROME_KB, S_DERIV],
    panels=[{'name': 'single', 'physical_px': {'w': 1280, 'h': 2856}, 'diagonal_in': 6.3, 'density_dpi': 480, 'source_ref': 'aosp-nexus-xml'}],
    logical=[pw_logical('Pixel 10 Pro', 'single', 'portrait'), pw_logical('Pixel 10 Pro landscape', 'single', 'landscape'),
             {'panel': 'single', 'orientation': 'portrait', 'unit': 'dp', 'w': 426.67, 'h': 952, 'scale': 3, 'kind': 'derived', 'derivation': 'dp = px / (480 / 160) = px / 3: 1280 / 3 = 426.67; 2856 / 3 = 952 (AOSP nexus.xml pixel_10_pro xxhdpi)', 'source_ref': 'aosp-nexus-xml'}],
    usable=[pw_usable('Pixel 10 Pro', 'single', 'portrait'), pw_usable('Pixel 10 Pro landscape', 'single', 'landscape')],
    inputs=inputs_touch(),
    unknowns=[
        U('logical.single.w', 'Playwright reports 427 css_px width (1280 / 3 = 426.67 rounded up); the AOSP panel is 1280 px wide. Recorded as published registry value plus derived dp; not a conflict between profiles.'),
        U('keyboard_height', 'No published or cited measurement. Chrome 108+ default interactive-widget=resizes-visual: the layout viewport keeps its height and visualViewport.height shrinks; measure at test time.'),
        U_INSETS,
    ],
    tags=['phone'],
))

# ---------- Samsung Galaxy Z Fold6 + DevTools registry entry ----------
fold6_in_p = pw_logical('Galaxy Z Fold 6', 'inner', 'portrait'); fold6_in_l = pw_logical('Galaxy Z Fold 6 landscape', 'inner', 'landscape')
profiles.append(profile(
    'samsung-galaxy-z-fold6', 'device', 'android', 'Samsung Galaxy Z Fold6', vendor='Samsung',
    sources=[S_PW, S_SAMSUNG_FLEX, S_AX_FOLD, S_W3C_POSTURE, S_CHROME_KB, S_DERIV],
    panels=[pw_panel('Galaxy Z Fold 6', 'inner'), pw_panel('Galaxy Z Fold 6 Cover', 'outer')],
    logical=[fold6_in_p, fold6_in_l, pw_logical('Galaxy Z Fold 6 Cover', 'outer', 'portrait'), pw_logical('Galaxy Z Fold 6 Cover landscape', 'outer', 'landscape'),
             pw_dp('Galaxy Z Fold 6', 'inner', 'portrait'), pw_dp('Galaxy Z Fold 6 Cover', 'outer', 'portrait')],
    usable=[pw_usable('Galaxy Z Fold 6', 'inner', 'portrait'), pw_usable('Galaxy Z Fold 6 landscape', 'inner', 'landscape'),
            pw_usable('Galaxy Z Fold 6 Cover', 'outer', 'portrait'), pw_usable('Galaxy Z Fold 6 Cover landscape', 'outer', 'landscape')],
    display_features=centre_folds('fold6', fold6_in_p['w'], fold6_in_p['h'], fold6_in_l['w'], fold6_in_l['h']),
    postures=foldable_postures('fold6'),
    inputs=inputs_touch(),
    conflicts=[
        {'profile_id': 'chrome-devtools-galaxy-z-fold6', 'field': 'logical.inner', 'note': 'Playwright 928x1080 css_px @2 (=1856x2160 device px) vs DevTools spanned 744x860 @2.625 (=1953x2257.5 device px). About 100 device px apart; neither is vendor-verified. Kept side by side.'},
        {'profile_id': 'chrome-devtools-galaxy-z-fold6', 'field': 'logical.outer', 'note': 'Playwright cover 484x1188 @2 (=968x2376) vs DevTools default 412x968 @2.625 (=1081.5x2541). Kept side by side.'},
    ],
    unknowns=[
        U('panels.physical_px', 'Vendor panel resolutions unverified; physical_px derived from Playwright css_px x deviceScaleFactor.'),
        U_FOLD_BOUNDS,
        U('postures.hinge_angle_range_deg', 'Samsung publishes no hinge-angle thresholds.'),
        U_INSETS, U_KEYBOARD,
    ],
    tags=['foldable', 'phone'],
))

profiles.append(profile(
    'chrome-devtools-galaxy-z-fold6', 'registry-entry', 'android', 'Chrome DevTools emulated device: Galaxy Z Fold 6', vendor='Samsung',
    sources=[S_DT, S_AX_FOLD, S_W3C_POSTURE, S_CHROME_KB, S_DERIV],
    panels=[
        {'name': 'inner', 'physical_px': {'w': 744 * 2.625, 'h': 860 * 2.625}, 'source_ref': 'chrome-devtools'},
        {'name': 'outer', 'physical_px': {'w': 412 * 2.625, 'h': 968 * 2.625}, 'source_ref': 'chrome-devtools'},
    ],
    logical=[dt_logical('inner', 'portrait', 744, 860, 2.625, 'Galaxy Z Fold 6 vertical-spanned'), dt_logical('inner', 'landscape', 860, 744, 2.625, 'Galaxy Z Fold 6 horizontal-spanned'),
             dt_logical('outer', 'portrait', 412, 968, 2.625, 'Galaxy Z Fold 6 vertical'), dt_logical('outer', 'landscape', 968, 412, 2.625, 'Galaxy Z Fold 6 horizontal')],
    usable=[dt_usable('inner', 'portrait', 744, 860), dt_usable('inner', 'landscape', 860, 744), dt_usable('outer', 'portrait', 412, 968), dt_usable('outer', 'landscape', 968, 412)],
    display_features=[
        dt_hinge('dt-fold6-fold-vertical', 'inner', 'vertical', 372, 0, 0, 860, 'none', 'portrait coordinates (744x860 span): DevTools hinge {x:372,y:0,width:0,height:860} drawn with contentColor alpha 0.2 (translucent) = flexible fold, not an opaque hinge'),
        dt_hinge('dt-fold6-fold-horizontal', 'inner', 'horizontal', 0, 372, 860, 0, 'none', 'landscape coordinates (860x744 span): DevTools hinge {x:0,y:372,width:860,height:0}, alpha 0.2'),
    ],
    postures=foldable_postures('dt-fold6', posture_src='w3c-device-posture'),
    inputs=inputs_touch('chrome-devtools'),
    conflicts=[{'profile_id': 'samsung-galaxy-z-fold6', 'field': 'logical.inner', 'note': 'DevTools spanned 744x860 @2.625 vs Playwright 928x1080 @2; see the device profile for the device-px comparison.'}],
    unknowns=[
        U('panels.physical_px', 'Derived (css_px x device-pixel-ratio) and does not match Playwright; registry entry, not device truth.'),
        U('usable.layout_viewport', 'Browser UI height not in the registry.'),
        U_KEYBOARD,
    ],
    tags=['foldable', 'phone'],
))


# ---------- AOSP emulator foldables ----------
def aosp_foldable(id, name, src_ref, extra_sources, inner_px, outer_px, density_dpi, scale, diag, hinge_x_px, hinge_w_px, hinge_h_px, unknowns, tags, vendor=None):
    inner_dp = (round(inner_px[0] / scale, 2), round(inner_px[1] / scale, 2))
    outer_dp = (round(outer_px[0] / scale, 2), round(outer_px[1] / scale, 2))
    hx = round(hinge_x_px / scale, 2); hw = round(hinge_w_px / scale, 2); hh = round(hinge_h_px / scale, 2)

    def dp(panel, orient, w, h, px):
        return {'panel': panel, 'orientation': orient, 'unit': 'dp', 'w': w, 'h': h, 'scale': scale, 'kind': 'derived',
                'derivation': f'dp = px / ({density_dpi} / 160) = px / {scale}: {px[0]} / {scale} = {w}; {px[1]} / {scale} = {h}', 'source_ref': src_ref}

    def css(panel, orient, w, h):
        return {'panel': panel, 'orientation': orient, 'unit': 'css_px', 'w': w, 'h': h, 'scale': scale, 'kind': 'derived',
                'derivation': f'css_px = dp at 100% zoom (Chromium on Android devicePixelRatio = density scale {scale}); emulator value, not measured on hardware', 'source_ref': src_ref}

    def us(panel, orient, w, h, unit):
        return {'panel': panel, 'orientation': orient, 'unit': unit, 'layout_viewport': {'w': w, 'h': h}, 'insets': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}, 'cutouts': [],
                'kind': 'derived', 'derivation': 'full panel; emulator system bars and browser UI not modelled; insets 0 = not published', 'source_ref': src_ref}

    portrait_in = (min(inner_dp), max(inner_dp)); land_in = (max(inner_dp), min(inner_dp))
    portrait_out = (min(outer_dp), max(outer_dp)); land_out = (max(outer_dp), min(outer_dp))
    in_px_p = inner_px if inner_px[0] < inner_px[1] else (inner_px[1], inner_px[0])
    feats = [
        {'id': f'{id}-fold-vertical', 'panel': 'inner', 'type': 'fold', 'orientation': 'vertical', 'bounds': {'x': hx, 'y': 0, 'w': hw, 'h': hh}, 'unit': 'dp', 'occlusion': 'none', 'is_separating': True,
         'kind': 'derived', 'derivation': f'AOSP hinge areas "{hinge_x_px}-0-{hinge_w_px}-{hinge_h_px}" (x-y-w-h device px of the unfolded panel in its default state) / {scale}', 'source_ref': src_ref},
        {'id': f'{id}-fold-vertical-css', 'panel': 'inner', 'type': 'fold', 'orientation': 'vertical', 'bounds': {'x': hx, 'y': 0, 'w': hw, 'h': hh}, 'unit': 'css_px', 'occlusion': 'none', 'is_separating': True,
         'kind': 'derived', 'derivation': 'same geometry as the dp feature; css_px = dp at 100% zoom in Chromium on Android', 'source_ref': src_ref},
    ]
    postures = [
        posture('closed', 'outer', 'continuous', None, src_ref, angles=AOSP_ANGLES['closed']),
        posture('half_opened', 'inner', 'folded', 'HALF_OPENED', src_ref, feature=f'{id}-fold-vertical-css', angles=AOSP_ANGLES['half_opened']),
        posture('book', 'inner', 'folded', 'HALF_OPENED', src_ref, feature=f'{id}-fold-vertical-css', angles=AOSP_ANGLES['half_opened']),
        posture('flat', 'inner', 'continuous', 'FLAT', src_ref, angles=AOSP_ANGLES['flat']),
    ]
    return profile(
        id, 'emulator-profile', 'android', name, vendor=vendor,
        sources=[S_AOSP_NEXUS if src_ref == 'aosp-nexus-xml' else S_AOSP_DEVICES, S_ANDROID_DENSITY, S_AX_FOLD, S_W3C_POSTURE] + extra_sources,
        panels=[
            {'name': 'inner', 'physical_px': {'w': inner_px[0], 'h': inner_px[1]}, 'diagonal_in': diag, 'density_dpi': density_dpi, 'source_ref': src_ref},
            {'name': 'outer', 'physical_px': {'w': outer_px[0], 'h': outer_px[1]}, 'density_dpi': density_dpi, 'source_ref': src_ref},
        ],
        logical=[dp('inner', 'portrait', *portrait_in, in_px_p), dp('inner', 'landscape', *land_in, (in_px_p[1], in_px_p[0])),
                 dp('outer', 'portrait', *portrait_out, outer_px), dp('outer', 'landscape', *land_out, (outer_px[1], outer_px[0])),
                 css('inner', 'portrait', *portrait_in), css('inner', 'landscape', *land_in), css('outer', 'portrait', *portrait_out), css('outer', 'landscape', *land_out)],
        usable=[us('inner', 'portrait', *portrait_in, 'dp'), us('outer', 'portrait', *portrait_out, 'dp'), us('inner', 'portrait', *portrait_in, 'css_px'), us('inner', 'landscape', *land_in, 'css_px'),
                us('outer', 'portrait', *portrait_out, 'css_px'), us('outer', 'landscape', *land_out, 'css_px')],
        display_features=feats, postures=postures,
        inputs={'pointer': 'coarse', 'hover': 'none', 'touch': True, 'keyboard': 'soft', 'source_ref': src_ref},
        unknowns=unknowns + [U_KEYBOARD], tags=tags,
    )


profiles.append(aosp_foldable(
    'aosp-pixel-9-pro-fold', 'AOSP emulator profile: Pixel 9 Pro Fold', 'aosp-nexus-xml', [S_GOOGLE_PIXEL, S_DERIV],
    inner_px=(2076, 2152), outer_px=(1080, 2424), density_dpi=390, scale=2.4375, diag=8, hinge_x_px=1038, hinge_w_px=0, hinge_h_px=2152,
    unknowns=[U('panels.outer.density_dpi', 'AOSP applies 390dpi to the folded region too; the retail outer panel is 422 ppi (Google), so outer dp is emulator-only.'),
              U('display_features.bounds', 'The hinge "areas" row is a zero-width line at x=1038 px in the profile default (landscape) state; vendor fold bounds unmeasured.'),
              U('logical.css_px', 'css_px entries are emulator-derived, not measured in Chrome on hardware.')],
    tags=['foldable', 'phone'], vendor='Google'))

profiles.append(aosp_foldable(
    'aosp-7-6-fold-in-outer-display', 'AOSP emulator profile: 7.6" Fold-in with outer display', 'aosp-devices-xml', [S_DERIV],
    inner_px=(1768, 2208), outer_px=(884, 2208), density_dpi=420, scale=2.625, diag=7.59, hinge_x_px=884, hinge_w_px=1, hinge_h_px=2208,
    unknowns=[U('panels', 'Generic profile (id "7.6in Foldable"), not a retail device; the folded region shares the inner panel density.'),
              U('usable.insets', 'Default state is Portrait with keyboard-state keyssoft; no cutout or inset data in the profile.'),
              U('display_features.occlusion', 'Hinge "areas" 884-0-1-2208 is a 1 px line; occlusion none chosen because it is a flexible fold-in panel (type 1), unverified against emulator FoldingFeature output.')],
    tags=['foldable', 'phone']))

# ---------- Asus Zenbook Fold ----------
profiles.append(profile(
    'asus-zenbook-fold', 'device', 'windows', 'ASUS Zenbook 17 Fold OLED (UX9702)', vendor='ASUS',
    sources=[S_DT, S_W3C_POSTURE, S_DERIV],
    panels=[
        {'name': 'inner', 'physical_px': {'w': 1706 * 1.5, 'h': 1280 * 1.5}, 'source_ref': 'chrome-devtools'},
        {'name': 'single', 'physical_px': {'w': 853 * 1.5, 'h': 1280 * 1.5}, 'source_ref': 'chrome-devtools'},
    ],
    logical=[
        dt_logical('inner', 'landscape', 1706, 1280, 1.5, 'Asus Zenbook Fold vertical-spanned'), dt_logical('inner', 'portrait', 1280, 1706, 1.5, 'Asus Zenbook Fold horizontal-spanned'),
        dt_logical('single', 'portrait', 853, 1280, 1.5, 'Asus Zenbook Fold vertical'), dt_logical('single', 'landscape', 1280, 853, 1.5, 'Asus Zenbook Fold horizontal'),
    ],
    usable=[dt_usable('inner', 'landscape', 1706, 1280), dt_usable('inner', 'portrait', 1280, 1706), dt_usable('single', 'portrait', 853, 1280), dt_usable('single', 'landscape', 1280, 853)],
    display_features=[
        dt_hinge('zenbook-fold-vertical', 'inner', 'vertical', 800, 0, 107, 1280, 'none', 'landscape coordinates (1706x1280 span): DevTools hinge {x:800,y:0,width:107,height:1280} drawn with contentColor alpha 0.2 (translucent) unlike Surface Duo alpha 1.0; single flexible OLED so occlusion none, width 107 css_px kept as the registry fold region'),
        dt_hinge('zenbook-fold-horizontal', 'inner', 'horizontal', 0, 800, 1706, 107, 'none', 'portrait coordinates (1280x1706 span): DevTools hinge {x:0,y:800,width:1706,height:107}, alpha 0.2'),
    ],
    postures=[
        posture('closed', 'single', 'continuous', None, 'w3c-device-posture'),
        posture('flat', 'inner', 'continuous', None, 'w3c-device-posture', orientation='landscape'),
        posture('half_opened', 'inner', 'folded', None, 'w3c-device-posture', feature='zenbook-fold-vertical', orientation='landscape'),
        posture('book', 'inner', 'folded', None, 'w3c-device-posture', feature='zenbook-fold-vertical', orientation='landscape'),
        posture('tabletop', 'inner', 'folded', None, 'w3c-device-posture', feature='zenbook-fold-horizontal', orientation='portrait'),
    ],
    inputs={'pointer': 'coarse', 'hover': 'none', 'touch': True, 'keyboard': 'soft', 'source_ref': 'chrome-devtools'},
    unknowns=[
        U('inputs', 'DevTools lists capabilities ["touch"] only; the detachable hardware keyboard, touchpad and pen are not in the registry, so inputs record touch-only. A Windows session with a mouse would be pointer fine / hover.'),
        U('panels.physical_px', 'Vendor panel resolution and diagonal not verified; physical_px derived from DevTools css_px x 1.5.'),
        U('display_features.bounds', 'Fold region 107 css_px is the DevTools drawing, not a measured fold; whether Chrome on Windows exposes a 107 px segment gap is unmeasured.'),
        U('postures.web', 'Windows posture reporting (continuous vs folded) on this device is unmeasured.'),
        U_KEYBOARD,
    ],
    tags=['foldable', 'tablet'],
))

# ---------- Google Pixel 10 Pro Fold (vendor px, css unknown) ----------
profiles.append(profile(
    'google-pixel-10-pro-fold', 'device', 'android', 'Google Pixel 10 Pro Fold', vendor='Google',
    sources=[S_GOOGLE_PIXEL, S_AOSP_NEXUS, S_ANDROID_DENSITY, S_AX_FOLD, S_W3C_POSTURE, S_DERIV],
    panels=[
        {'name': 'inner', 'physical_px': {'w': 2076, 'h': 2152}, 'diagonal_in': 8, 'ppi': 373, 'density_dpi': 390, 'source_ref': 'google-pixel-specs'},
        {'name': 'outer', 'physical_px': {'w': 1080, 'h': 2364}, 'diagonal_in': 6.4, 'ppi': 408, 'density_dpi': 390, 'source_ref': 'google-pixel-specs'},
    ],
    logical=[
        {'panel': 'inner', 'orientation': 'portrait', 'unit': 'dp', 'w': 851.69, 'h': 882.87, 'scale': 2.4375, 'kind': 'derived', 'derivation': 'dp = px / (390 / 160): 2076 / 2.4375 = 851.69; 2152 / 2.4375 = 882.87 (density from AOSP nexus.xml pixel_10_pro_fold, px from Google)', 'source_ref': 'aosp-nexus-xml'},
        {'panel': 'inner', 'orientation': 'landscape', 'unit': 'dp', 'w': 882.87, 'h': 851.69, 'scale': 2.4375, 'kind': 'derived', 'derivation': 'swap of portrait dp', 'source_ref': 'aosp-nexus-xml'},
        {'panel': 'outer', 'orientation': 'portrait', 'unit': 'dp', 'w': 443.08, 'h': 969.85, 'scale': 2.4375, 'kind': 'derived', 'derivation': 'dp = px / 2.4375 using the single AOSP profile density: 1080 / 2.4375 = 443.08; 2364 / 2.4375 = 969.85; retail outer panel is 408 ppi so hardware density may differ', 'source_ref': 'aosp-nexus-xml'},
    ],
    usable=[
        {'panel': 'inner', 'orientation': 'portrait', 'unit': 'dp', 'layout_viewport': {'w': 851.69, 'h': 882.87}, 'insets': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}, 'cutouts': [], 'kind': 'derived', 'derivation': 'full panel in dp; system insets not published', 'source_ref': 'aosp-nexus-xml'},
        {'panel': 'outer', 'orientation': 'portrait', 'unit': 'dp', 'layout_viewport': {'w': 443.08, 'h': 969.85}, 'insets': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}, 'cutouts': [], 'kind': 'derived', 'derivation': 'full panel in dp; system insets not published', 'source_ref': 'aosp-nexus-xml'},
    ],
    display_features=[
        {'id': 'p10pf-fold-vertical', 'panel': 'inner', 'type': 'fold', 'orientation': 'vertical', 'bounds': {'x': 425.85, 'y': 0, 'w': 0, 'h': 882.87}, 'unit': 'dp', 'occlusion': 'none', 'is_separating': True,
         'kind': 'derived', 'derivation': 'AOSP nexus.xml hinge areas "1038-0-0-2152" / 2.4375 = x 425.85, w 0, h 882.87', 'source_ref': 'aosp-nexus-xml'},
    ],
    postures=[
        posture('closed', 'outer', 'continuous', None, 'aosp-nexus-xml', angles=AOSP_ANGLES['closed']),
        posture('half_opened', 'inner', 'folded', 'HALF_OPENED', 'aosp-nexus-xml', feature='p10pf-fold-vertical', angles=AOSP_ANGLES['half_opened']),
        posture('book', 'inner', 'folded', 'HALF_OPENED', 'aosp-nexus-xml', feature='p10pf-fold-vertical', angles=AOSP_ANGLES['half_opened']),
        posture('flat', 'inner', 'continuous', 'FLAT', 'aosp-nexus-xml', angles=AOSP_ANGLES['flat']),
    ],
    inputs=inputs_touch('aosp-nexus-xml'),
    unknowns=[
        U('logical.css_px', 'CSS px layout size in Chrome is unknown for both panels: neither Playwright nor DevTools has a Pixel 10 Pro Fold entry and no measurement exists. Inventory-only for the web adapter; it must report this gap rather than derive css_px from dp.'),
        U('display_features.bounds', 'Hardware fold bounds unmeasured; the dp feature is the AOSP emulator line.'),
        U('panels.outer.density_dpi', 'Outer panel density on hardware unknown; AOSP applies 390dpi to both regions.'),
        U('panels.dimensions_mm', 'Dimensions and weight are on the Google page (folded 155.2 x 76.3 x 10.8 mm; unfolded 155.2 x 150.4 x 5.2 mm; 258 g) but are not modelled in this schema.'),
        U_INSETS, U_KEYBOARD,
    ],
    tags=['foldable', 'phone'],
))


# ---------- Apple iPhone 17 Pro ----------
def pt_logical(name, panel, orientation):
    l = pw_logical(name, panel, orientation, unit='pt')
    l['registry'] += ' (CSS px in Safari equal points)'
    return l


profiles.append(profile(
    'apple-iphone-17-pro', 'device', 'ios', 'Apple iPhone 17 Pro', vendor='Apple',
    sources=[S_PW, S_HIG_LAYOUT, S_BCD, S_CHROME_KB, S_DERIV],
    panels=[pw_panel('iPhone 17 Pro', 'single')],
    logical=[pw_logical('iPhone 17 Pro', 'single', 'portrait'), pt_logical('iPhone 17 Pro', 'single', 'portrait'),
             {**pw_logical('iPhone 17 Pro landscape', 'single', 'landscape'), 'w': 874, 'h': 402, 'kind': 'derived', 'derivation': 'Playwright keeps screen 402x874 for the landscape entry; landscape logical size is the swap 874x402 (viewport 756x352 is published)'},
             {**pt_logical('iPhone 17 Pro landscape', 'single', 'landscape'), 'w': 874, 'h': 402, 'kind': 'derived', 'derivation': 'swap of portrait points'}],
    usable=[pw_usable('iPhone 17 Pro', 'single', 'portrait'), pw_usable('iPhone 17 Pro landscape', 'single', 'landscape')],
    inputs=inputs_touch(),
    unknowns=[
        U('logical.scale', 'Apple does not publish the scale factor or point dimensions on the tech-spec page; scale 3 and physical_px 1206x2622 are from Playwright (css_px x deviceScaleFactor).'),
        U('usable.insets', 'Dynamic Island metrics and safe-area insets are not published numerically (HIG Layout); insets recorded as 0 and must be measured via env(safe-area-inset-*).'),
        U('keyboard_height', 'No published or cited measurement; iOS Safari resizes the visual viewport only (Chrome Developers post), layout viewport unchanged. Measure at test time.'),
        U('postures', 'Not a foldable. Device Posture / Viewport Segments are not supported in Safari; BCD lists devicePosture for safari_ios 27 behind a flag only.'),
    ],
    tags=['phone'],
))

# ---------- Google Pixel Tablet ----------
profiles.append(profile(
    'google-pixel-tablet', 'device', 'android', 'Google Pixel Tablet', vendor='Google',
    sources=[S_AOSP_NEXUS, S_ANDROID_DENSITY, S_MULTIWINDOW, S_CHROME_KB, S_DERIV],
    panels=[{'name': 'single', 'physical_px': {'w': 2560, 'h': 1600}, 'diagonal_in': 10.95, 'density_dpi': 320, 'source_ref': 'aosp-nexus-xml'}],
    logical=[
        {'panel': 'single', 'orientation': 'landscape', 'unit': 'dp', 'w': 1280, 'h': 800, 'scale': 2, 'kind': 'derived', 'derivation': 'dp = px / (320 / 160) = px / 2: 2560 / 2 = 1280; 1600 / 2 = 800 (AOSP nexus.xml pixel_tablet xhdpi, default state Landscape)', 'source_ref': 'aosp-nexus-xml'},
        {'panel': 'single', 'orientation': 'portrait', 'unit': 'dp', 'w': 800, 'h': 1280, 'scale': 2, 'kind': 'derived', 'derivation': 'swap of landscape dp', 'source_ref': 'aosp-nexus-xml'},
        {'panel': 'single', 'orientation': 'landscape', 'unit': 'css_px', 'w': 1280, 'h': 800, 'scale': 2, 'kind': 'derived', 'derivation': 'css_px = dp at 100% zoom (Chromium on Android devicePixelRatio = density scale 2); no Playwright or DevTools entry exists for Pixel Tablet', 'source_ref': 'aosp-nexus-xml'},
        {'panel': 'single', 'orientation': 'portrait', 'unit': 'css_px', 'w': 800, 'h': 1280, 'scale': 2, 'kind': 'derived', 'derivation': 'swap of landscape css_px', 'source_ref': 'aosp-nexus-xml'},
    ],
    usable=[
        {'panel': 'single', 'orientation': 'landscape', 'unit': 'dp', 'layout_viewport': {'w': 1280, 'h': 800}, 'insets': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}, 'cutouts': [], 'kind': 'derived', 'derivation': 'full panel; system bars not published', 'source_ref': 'aosp-nexus-xml'},
        {'panel': 'single', 'orientation': 'landscape', 'unit': 'css_px', 'layout_viewport': {'w': 1280, 'h': 800}, 'insets': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}, 'cutouts': [], 'kind': 'derived', 'derivation': 'full panel; browser UI height unknown', 'source_ref': 'aosp-nexus-xml'},
        {'panel': 'single', 'orientation': 'portrait', 'unit': 'css_px', 'layout_viewport': {'w': 800, 'h': 1280}, 'insets': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}, 'cutouts': [], 'kind': 'derived', 'derivation': 'full panel; browser UI height unknown', 'source_ref': 'aosp-nexus-xml'},
    ],
    inputs=inputs_touch('aosp-nexus-xml'),
    unknowns=[
        U('logical.css_px', 'No Playwright or DevTools entry; css_px is derived from the AOSP profile and unmeasured in Chrome.'),
        U('usable.split_screen', 'A 50/50 landscape split gives about 640x800 dp per app (1280 / 2) minus an unpublished divider width; use a `split` transition with an explicit viewport and record the divider as measured.'),
        U('usable.insets', 'System bar insets and browser UI height not published; insets 0.'),
        U_KEYBOARD,
    ],
    tags=['tablet'],
))

# ---------- Apple iPad Pro 11 ----------
profiles.append(profile(
    'apple-ipad-pro-11', 'device', 'ipados', 'Apple iPad Pro 11-inch', vendor='Apple',
    sources=[S_PW, S_HIG_MULTI, S_TN3192, S_CHROME_KB, S_DERIV],
    panels=[pw_panel('iPad Pro 11', 'single')],
    logical=[pw_logical('iPad Pro 11', 'single', 'portrait'), pw_logical('iPad Pro 11 landscape', 'single', 'landscape'),
             pt_logical('iPad Pro 11', 'single', 'portrait'), pt_logical('iPad Pro 11 landscape', 'single', 'landscape')],
    usable=[pw_usable('iPad Pro 11', 'single', 'portrait'), pw_usable('iPad Pro 11 landscape', 'single', 'landscape')],
    inputs=inputs_touch(),
    unknowns=[
        U('usable.layout_viewport', 'Playwright has no separate screen field for this entry, so viewport = screen (browser UI height unknown).'),
        U('usable.stage_manager', 'Stage Manager / windowed sizes are not published: apps receive no indication of the multitasking configuration (HIG) and sizeRestrictions.minimumSize is only a preferred minimum (TN3192, example 500 pt). Use `resize` transitions with explicit viewports and label them illustrative.'),
        U('logical.scale', 'Apple scale factor not on the spec page; scale 2 and physical_px 1668x2388 from Playwright.'),
        U('inputs.keyboard', 'Hardware keyboard (Magic Keyboard) and trackpad are optional accessories; inputs record touch + soft keyboard only.'),
        U_KEYBOARD,
    ],
    tags=['tablet'],
))

# ---------- Desktop ultrawide ----------
profiles.append(profile(
    'desktop-ultrawide-3440x1440', 'device', 'web', 'Desktop ultrawide window 3440x1440 (LG 34WQ75C-B class)', vendor='LG',
    sources=[S_LG, S_PW, S_DERIV],
    panels=[{'name': 'single', 'physical_px': {'w': 3440, 'h': 1440}, 'diagonal_in': 34, 'source_ref': 'lg-34wq75c-b'}],
    logical=[{'panel': 'single', 'orientation': 'landscape', 'unit': 'css_px', 'w': 3440, 'h': 1440, 'scale': 1, 'kind': 'derived',
              'derivation': 'css_px = device_px / devicePixelRatio with DPR 1 at 100% OS scaling (Playwright Desktop Chrome uses deviceScaleFactor 1): 3440 / 1 x 1440 / 1', 'source_ref': 'foldproof-derivation'}],
    usable=[{'panel': 'single', 'orientation': 'landscape', 'unit': 'css_px', 'layout_viewport': {'w': 3440, 'h': 1440}, 'insets': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}, 'cutouts': [], 'kind': 'derived',
             'derivation': 'maximised window; browser UI and OS taskbar heights are not published so the layout viewport equals the panel; measure at test time', 'source_ref': 'foldproof-derivation'}],
    inputs={'pointer': 'fine', 'hover': 'hover', 'touch': False, 'keyboard': 'hardware', 'source_ref': 'playwright'},
    unknowns=[U('usable.layout_viewport', 'Browser chrome and OS taskbar heights are measured, not published.'),
              U('logical.scale', 'OS scaling other than 100% changes DPR; profile assumes DPR 1 and says so in the derivation.'),
              U('panels', 'LG lists the model as discontinued; the 3440x1440 panel class remains common.')],
    tags=['desktop'],
))

# ---------- Desktop tall portrait ----------
profiles.append(profile(
    'desktop-tall-portrait-1080x1920', 'device', 'web', 'Desktop portrait (pivoted) window 1080x1920',
    sources=[S_PW, S_DERIV],
    panels=[{'name': 'single', 'physical_px': {'w': 1080, 'h': 1920}, 'source_ref': 'playwright'}],
    logical=[{'panel': 'single', 'orientation': 'portrait', 'unit': 'css_px', 'w': 1080, 'h': 1920, 'scale': 1, 'kind': 'derived',
              'derivation': 'Playwright Desktop Chrome screen 1920x1080 @1 pivoted 90 degrees: w 1080, h 1920; css_px = device_px / 1', 'source_ref': 'playwright'}],
    usable=[{'panel': 'single', 'orientation': 'portrait', 'unit': 'css_px', 'layout_viewport': {'w': 1080, 'h': 1920}, 'insets': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}, 'cutouts': [], 'kind': 'derived',
             'derivation': 'maximised window; browser UI height not published; measure at test time', 'source_ref': 'playwright'}],
    inputs={'pointer': 'fine', 'hover': 'hover', 'touch': False, 'keyboard': 'hardware', 'source_ref': 'playwright'},
    unknowns=[U('panels', 'No vendor page for a specific pivot monitor was verified (Dell P2425H pivot is reseller-reported only); the panel is the Playwright Desktop Chrome 1920x1080 screen rotated.'),
              U('usable.layout_viewport', 'Browser UI height measured, not published.')],
    tags=['desktop'],
))

# ---------- Android TV 1080p ----------
profiles.append(profile(
    'android-tv-1080p', 'emulator-profile', 'tv', 'AOSP emulator profile: Television (1080p)',
    sources=[S_AOSP_TV, S_TV_LAYOUT, S_ANDROID_DENSITY, S_DERIV],
    panels=[{'name': 'single', 'physical_px': {'w': 1920, 'h': 1080}, 'diagonal_in': 55, 'density_dpi': 320, 'source_ref': 'aosp-tv-xml'}],
    logical=[
        {'panel': 'single', 'orientation': 'landscape', 'unit': 'dp', 'w': 960, 'h': 540, 'scale': 2, 'kind': 'derived', 'derivation': 'dp = px / (320 / 160): 1920 / 2 = 960; 1080 / 2 = 540 (tv.xml tv_1080p xhdpi; TV guide maps 1080p to xhdpi)', 'source_ref': 'aosp-tv-xml'},
        {'panel': 'single', 'orientation': 'landscape', 'unit': 'css_px', 'w': 960, 'h': 540, 'scale': 2, 'kind': 'derived', 'derivation': 'css_px = dp at 100% zoom if a Chromium browser runs on the TV; unmeasured', 'source_ref': 'aosp-tv-xml'},
    ],
    usable=[
        {'panel': 'single', 'orientation': 'landscape', 'unit': 'dp', 'layout_viewport': {'w': 960, 'h': 540}, 'insets': {'top': 27, 'right': 48, 'bottom': 27, 'left': 48}, 'cutouts': [], 'kind': 'published',
         'derivation': 'overscan-safe margins 48 dp left/right and 27 dp top/bottom from the TV layouts guide; safe area = 864 x 486 dp', 'source_ref': 'android-tv-layouts'},
        {'panel': 'single', 'orientation': 'landscape', 'unit': 'css_px', 'layout_viewport': {'w': 960, 'h': 540}, 'insets': {'top': 27, 'right': 48, 'bottom': 27, 'left': 48}, 'cutouts': [], 'kind': 'derived',
         'derivation': 'same as dp at scale 2 (css_px = dp)', 'source_ref': 'android-tv-layouts'},
    ],
    inputs={'pointer': 'none', 'hover': 'none', 'touch': False, 'keyboard': 'none', 'remote_dpad': True, 'source_ref': 'android-tv-layouts'},
    unknowns=[U('logical.css_px', 'Browser availability on Android TV is not modelled; css_px is a derived assumption that a Chromium browser would map dp 1:1.'),
              U('usable.insets', 'Real overscan varies per TV; the 48/27 dp margin is guidance, not a measurement.'),
              U('inputs.keyboard', 'An on-screen keyboard exists for text entry via D-pad; recorded as keyboard none because there is no soft keyboard occlusion model for TV.')],
    tags=['tv'],
))

# ---------- Android Automotive 1024p ----------
profiles.append(profile(
    'android-automotive-1024p', 'emulator-profile', 'automotive', 'AOSP emulator profile: Automotive (1024p landscape)',
    sources=[S_AOSP_AUTO, S_CAR_QUALITY, S_CAR_PARKED, S_CAR_UX, S_ANDROID_DENSITY, S_DERIV],
    panels=[{'name': 'single', 'physical_px': {'w': 1024, 'h': 768}, 'diagonal_in': 8.4, 'density_dpi': 160, 'source_ref': 'aosp-automotive-xml'}],
    logical=[
        {'panel': 'single', 'orientation': 'landscape', 'unit': 'dp', 'w': 1024, 'h': 768, 'scale': 1, 'kind': 'derived', 'derivation': 'dp = px / (160 / 160) = px: 1024 x 768 (automotive.xml mdpi)', 'source_ref': 'aosp-automotive-xml'},
        {'panel': 'single', 'orientation': 'landscape', 'unit': 'css_px', 'w': 1024, 'h': 768, 'scale': 1, 'kind': 'derived', 'derivation': 'css_px = dp at scale 1 if a browser runs on the head unit; browsers are a parked-only category (DD-2/DD-3) and web emulation of this profile is notApplicable while driving', 'source_ref': 'aosp-automotive-xml'},
    ],
    usable=[
        {'panel': 'single', 'orientation': 'landscape', 'unit': 'dp', 'layout_viewport': {'w': 1024, 'h': 768}, 'insets': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}, 'cutouts': [], 'kind': 'derived', 'derivation': 'full display; system bar allocation is OEM-specific and not published', 'source_ref': 'aosp-automotive-xml'},
        {'panel': 'single', 'orientation': 'landscape', 'unit': 'css_px', 'layout_viewport': {'w': 1024, 'h': 768}, 'insets': {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}, 'cutouts': [], 'kind': 'derived', 'derivation': 'same as dp at scale 1', 'source_ref': 'aosp-automotive-xml'},
    ],
    inputs={'pointer': 'coarse', 'hover': 'none', 'touch': True, 'keyboard': 'soft', 'rotary': False, 'voice': True, 'source_ref': 'android-car-app-quality'},
    operating_states=[
        {'name': 'parked', 'requires_distraction_optimization': False, 'ux_restrictions_mask': 0, 'source_ref': 'android-automotive-parked'},
        {'name': 'driving', 'requires_distraction_optimization': True, 'ux_restrictions_mask': 511, 'source_ref': 'android-car-ux-restrictions'},
    ],
    unknowns=[
        U('operating_states.driving.ux_restrictions_mask', '511 is UX_RESTRICTIONS_FULLY_RESTRICTED (the published OR of all flags); the active mask is OEM-configured per display and must be read from CarUxRestrictionsManager at runtime.'),
        U('operating_states.parked.ux_restrictions_mask', '0 is UX_RESTRICTIONS_BASELINE; baseline distraction guidelines still apply when isRequiresDistractionOptimization() is true.'),
        U('inputs.rotary', 'Rotary controller presence is OEM-specific; recorded false for the emulator profile. Voice true follows the car-app guidance that text entry is restricted while driving; not an emulator property.'),
        U('usable.insets', 'Head-unit system bar allocation and any browser UI are not published.'),
        U('panels', 'Emulator is not a Tesla or any specific OEM dashboard.'),
        U_KEYBOARD,
    ],
    tags=['automotive'],
))

# ---------- Apple iPhone Duo (inventory-only: no logical sizes) ----------
profiles.append(profile(
    'apple-iphone-duo', 'device', 'ios', 'Apple iPhone Duo', vendor='Apple',
    sources=[S_APPLE_DUO, S_HIG_LAYOUT, S_BCD, S_CHROME_KB],
    panels=[
        {'name': 'inner', 'physical_px': {'w': 1878, 'h': 2670}, 'diagonal_in': 7.6, 'ppi': 430, 'source_ref': 'apple-iphone-duo-specs'},
        {'name': 'outer', 'physical_px': {'w': 1398, 'h': 2034}, 'diagonal_in': 5.4, 'ppi': 460, 'source_ref': 'apple-iphone-duo-specs'},
    ],
    logical=[], usable=[],
    postures=[
        posture('closed', 'outer', 'continuous', None, 'apple-iphone-duo-specs'),
        posture('flat', 'inner', 'continuous', None, 'apple-iphone-duo-specs'),
    ],
    inputs=inputs_touch('apple-iphone-duo-specs'),
    unknowns=[
        U('logical', 'Point dimensions and scale factor are NOT published by Apple and no Playwright or DevTools entry exists; inventory-only until measured (Safari innerWidth/innerHeight, devicePixelRatio). No value is assumed.'),
        U('usable', 'CSS px layout viewport in Safari unmeasured; browser UI height unknown.'),
        U('postures.half_opened', 'No half-opened/book posture declared: Apple publishes no posture API, hinge geometry or fold bounds, and Safari has no Device Posture API (BCD: safari_ios 27 behind a flag only).'),
        U('usable.insets', 'Safe-area insets and Dynamic Island metrics unpublished.'),
        U('panels.dimensions_mm', 'Physical dimensions on the Apple page (open 164.6 x 117.8 x 5.2 mm; closed 84.1 x 117.8 x 11.3 mm; 254 g) are not modelled in this schema.'),
        U_KEYBOARD,
    ],
    tags=['foldable', 'phone'],
))

# ---------- write ----------
for p in profiles:
    with open(os.path.join(OUT, p['id'] + '.json'), 'w') as f:
        json.dump(p, f, indent=2, ensure_ascii=False)
        f.write('\n')
print(len(profiles), 'profiles written:', [p['id'] for p in profiles])
