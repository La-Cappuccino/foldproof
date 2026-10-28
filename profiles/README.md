# Profile corpus

Sourced, versioned descriptions of display configurations: phones, foldables in every posture, tablets, desktop windows, a TV and a car head unit. One JSON file per profile, filename = `id` + `.json`, validated against `src/core/schema.ts` (`Profile`).

Validate: `npx tsx src/cli.ts profiles validate`. List: `profiles list`. Inspect how the web adapter would emulate one: `profiles show <id>`.

Research behind the numbers: [docs/research/02-device-profile-sources.md](../docs/research/02-device-profile-sources.md). Licence: [LICENSE](LICENSE) (CC BY 4.0 for the corpus; upstream data keeps its own licence per source).

## Provenance kinds

Every value in a profile carries one of three kinds. The validator rejects a `derived` value without a `derivation`.

| Kind | Meaning | What must accompany it |
|---|---|---|
| `published` | Quoted from a source as-is (a registry entry, a spec page, a guideline). | `source_ref` to a declared source; `registry` string for registry entries so the exact entry can be re-read. |
| `derived` | Computed by us from published inputs. | `derivation`: the formula and its inputs, in words a reviewer can recompute. |
| `measured` | Observed at runtime by a tool on real or emulated hardware. | Source entry with `licence: "measured"`, the tool and the date. No measured values ship in v0.1. |

Rules the validator enforces:

- every source has an `id` and every `source_ref` points at a declared source;
- every length has a `unit` (`css_px`, `dp`, `pt`; `device_px` only in `panels.physical_px`);
- `unknowns` is required even when empty, so a gap is a statement rather than a missing field;
- registries that disagree are both recorded, linked through `conflicts_with`, never averaged;
- a posture with `web_posture: "folded"` needs at least one display feature.

## Profile kinds

- `device`: a retail device. Panel pixels come from the vendor where verified, otherwise derived from a registry and said so in `unknowns`.
- `emulator-profile`: an Android Studio hardware profile from AOSP `sdklib` XML. Reproducible without hardware; carries hinge geometry and posture angle ranges. Not device truth.
- `registry-entry`: one browser-emulation registry's view of a device (for example Chrome DevTools), kept separately when it disagrees with the device profile.

## What the web adapter needs

For each panel it emulates, a `logical` entry with `unit: "css_px"` and, ideally, a `usable` entry with `unit: "css_px"` for the same panel and orientation. Android profiles also carry `dp` entries. A profile without `css_px` (for example `google-pixel-10-pro-fold`, `apple-iphone-duo`) is valid; the resolver reports the gap instead of inventing a value.

Display features are in CSS px when the adapter can emulate them. A `fold` with `occlusion: "none"` is a guideline (flexible screen); a `hinge` with `occlusion: "full"` must be avoided by controls (Surface Duo is the canonical fixture).

Feature bounds are written in the orientation the registry publishes them in, and the resolver does not rotate them. For book-fold phones a `vertical` fold uses portrait coordinates and a `horizontal` fold (tabletop) uses landscape coordinates, matching DevTools `vertical-spanned` and `horizontal-spanned`. Surface Duo is the reverse: its `vertical` hinge belongs to the 1114x720 landscape span and its `horizontal` hinge to the 720x1114 portrait span. A scenario that targets `tabletop` must set the matching `orientation`, otherwise the fold line lands at the wrong offset. Each feature's `derivation` names the orientation it assumes.

## Adding a profile

1. Pick the `id` (lowercase, digits, hyphens) and `kind`.
2. Declare `sources` first. Each needs `url`, `publisher`, `inspected` (YYYY-MM-DD, the day you read it), `licence` (SPDX id, `vendor-fact`, or `measured`) and `kind`. Put the verbatim text you used in `quote`.
3. Add `panels` (physical px, diagonal, ppi, Android density when known).
4. Add `logical` sizes per panel and orientation with `scale`. Registry values are `published` with a `registry` string; anything you computed is `derived` with the formula.
5. Add `usable` viewports. If you only know the panel, say so in `derivation` and set insets to 0; zero means "not published", never "none".
6. Foldables: add `display_features` (fold or hinge, bounds, unit, occlusion) and `postures` (`closed`, `flat`, `half_opened`, `book`, `tabletop`, `tent`) with `web_posture` and, for Android, `android_state`. If the real fold bounds are unknown, derive a centre line, state the derivation, and list the real bounds in `unknowns`.
7. Fill `inputs`, `capabilities.web` (from MDN browser-compat-data), `operating_states` for cars.
8. If another profile or registry disagrees, add both and link them with `conflicts_with`. Do not pick a winner.
9. Write `unknowns`. Anything you wanted to record but could not source goes here.
10. Run `profiles validate` and `profiles show <id>`; the `gaps` printed per posture should match your `unknowns`.

To correct a profile later, bump `revision` and set `supersedes` on a replacement rather than rewriting history silently.

## Corpus at v0.1

| id | kind | platform | panels | postures | notes |
|---|---|---|---|---|---|
| samsung-galaxy-z-fold7 | device | android | inner, outer | closed, flat, half_opened, book, tabletop | Playwright css_px; vendor resolution unverified; centre-line folds derived |
| samsung-galaxy-z-fold6 | device | android | inner, outer | same | Playwright; conflicts with the DevTools entry |
| chrome-devtools-galaxy-z-fold6 | registry-entry | android | inner, outer | same | DevTools spanned sizes and fold lines |
| google-pixel-9-pro-fold | device | android | inner, outer | closed, flat, half_opened, book, tabletop | Google px, DevTools css_px, AOSP hinge; conflicts with AOSP profile |
| aosp-pixel-9-pro-fold | emulator-profile | android | inner, outer | closed, half_opened, book, flat | nexus.xml, 390dpi, angle ranges |
| aosp-7-6-fold-in-outer-display | emulator-profile | android | inner, outer | closed, half_opened, book, flat | devices.xml, 420dpi, hinge 884-0-1-2208 |
| microsoft-surface-duo | device | android | inner, single | closed, flat, book, tabletop | 34 css_px opaque hinge, occlusion full |
| asus-zenbook-fold | device | windows | inner, single | closed, flat, half_opened, book, tabletop | DevTools, 107 css_px translucent fold |
| google-pixel-10-pro-fold | device | android | inner, outer | closed, half_opened, book, flat | vendor px and dp only; css_px unknown |
| google-pixel-10-pro | device | android | single | none | Playwright; keyboard scenarios |
| apple-iphone-17-pro | device | ios | single | none | Playwright pt and css_px; WebKit capabilities |
| google-pixel-tablet | device | android | single | none | AOSP dp; split-screen in unknowns |
| apple-ipad-pro-11 | device | ipados | single | none | Playwright; Stage Manager sizes unpublished |
| desktop-ultrawide-3440x1440 | device | web | single | none | LG panel, DPR 1 derived |
| desktop-tall-portrait-1080x1920 | device | web | single | none | pivoted Desktop Chrome screen |
| android-tv-1080p | emulator-profile | tv | single | none | 960x540 dp, overscan insets 48/27 dp |
| android-automotive-1024p | emulator-profile | automotive | single | none | parked and driving operating states |
| apple-iphone-duo | device | ios | inner, outer | closed, flat | Apple px; points assumed at scale 3 and flagged |
