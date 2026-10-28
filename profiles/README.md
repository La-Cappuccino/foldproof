# Profile corpus

Sourced, versioned descriptions of display configurations: phones, foldables in every posture, tablets, desktop windows, a TV and a car head unit. One JSON file per profile, filename = `id` + `.json`, validated against `src/core/schema.ts` (`Profile`). The files are generated from `scripts/gen-profiles-v0.1.py`; edit the generator, not the JSON, and regenerate.

Validate: `npx tsx src/cli.ts profiles validate`. List: `profiles list`. Inspect how the web adapter would emulate one: `profiles show <id>`.

Research behind the numbers: [docs/research/02-device-profile-sources.md](../docs/research/02-device-profile-sources.md). Licence: [LICENSE](LICENSE) (CC BY 4.0 for the corpus; upstream data keeps its own licence per source).

## Provenance kinds

Every value carries one of three kinds. The validator rejects a `derived` value without a `derivation`.

| Kind | Meaning | What must accompany it |
|---|---|---|
| `published` | Quoted from a source as-is (a registry entry, a spec page, a guideline). | `source_ref` to a declared source; `registry` string for registry entries so the exact entry can be re-read. |
| `derived` | Computed by us from published inputs. | `derivation`: the formula and its inputs, in words a reviewer can recompute. |
| `measured` | Observed at runtime by a tool we ran ourselves. | Source entry with `licence: "measured"`, the tool and the date. Never used for a number someone else measured. No measured values ship in v0.1. |

Rules the validator enforces:

- every source has an `id`, a URL, an inspection date and, where it exists, a `revision` (package version, commit, page revision); every `source_ref` points at a declared source;
- every length has a `unit` (`css_px`, `dp`, `pt`; `device_px` only in `panels.physical_px`);
- `unknowns` is required even when empty and is a list of `{ field, reason }`, so a gap names the field it belongs to;
- `logical` and `usable` may be empty for an inventory-only profile, but then `unknowns` must carry an entry whose `field` starts with `logical`;
- a posture's `web.segments` is 2 exactly when the posture names an active `display_feature`, otherwise 1; a `folded` posture must name one;
- `keyboard_height` appears only with a cited measurement; otherwise it is absent and listed in `unknowns`;
- registries that disagree are both recorded, linked through `conflicts_with`, never averaged;
- browser capability support is not stored in profiles; it is generated into `engines/` from MDN browser-compat-data.

## Profile kinds

- `device`: a retail device. Panel pixels come from the vendor where verified, otherwise derived from a registry and said so in `unknowns`.
- `emulator-profile`: an Android Studio hardware profile from AOSP `sdklib` XML. Reproducible without hardware; carries hinge geometry and posture angle ranges. Not device truth.
- `registry-entry`: one browser-emulation registry's view of a device (for example Chrome DevTools), kept separately when it disagrees with the device profile.

## What the web adapter needs

For each panel it emulates, a `logical` entry with `unit: "css_px"` and a `usable` entry with `unit: "css_px"` for the same panel. Android profiles also carry `dp` entries. A profile without `css_px` (`google-pixel-10-pro-fold`, `apple-iphone-duo`) is valid but inventory-only; the resolver reports the gap instead of inventing a value.

Display features are in CSS px when the adapter can emulate them. A `fold` with `occlusion: "none"` is a guideline (flexible screen); a `hinge` with `occlusion: "full"` must be avoided by controls (Surface Duo is the canonical fixture).

Feature bounds are written in the orientation the registry publishes them in, and the resolver does not rotate them. For book-fold phones a `vertical` fold uses portrait coordinates and a `horizontal` fold (tabletop) uses landscape coordinates, matching DevTools `vertical-spanned` and `horizontal-spanned`. Surface Duo is the reverse: its `vertical` hinge belongs to the 1114x720 landscape span and its `horizontal` hinge to the 720x1114 portrait span. A scenario that targets `tabletop` must set the matching `orientation`, otherwise the fold line lands at the wrong offset. Each feature's `derivation` names the orientation it assumes.

## Adding a profile

1. Pick the `id` (lowercase, digits, hyphens; the filename must equal it) and `kind`.
2. Declare `sources` first. Each needs `url`, `publisher`, `inspected` (YYYY-MM-DD, the day you read it), `licence` (SPDX id, `vendor-fact`, or `measured`), `kind`, and `revision` when the upstream has one. Put the verbatim text you used in `quote`.
3. Add `panels` (physical px, diagonal, ppi, Android density when known).
4. Add `logical` sizes per panel and orientation with `scale`. Registry values are `published` with a `registry` string; anything you computed is `derived` with the formula.
5. Add `usable` viewports. If you only know the panel, say so in `derivation` and set insets to 0; zero means "not published", never "none".
6. Foldables: add `display_features` (fold or hinge, bounds, unit, occlusion) and `postures` (`closed`, `flat`, `half_opened`, `book`, `tabletop`, `tent`) with `web: { posture, segments }` and, for Android, `android_state`. If the real fold bounds are unknown, derive a centre line, state the derivation, and list the real bounds in `unknowns`.
7. Fill `inputs` and, for cars, `operating_states`. Add `keyboard_height` only with a cited measurement URL.
8. If another profile or registry disagrees, add both and link them with `conflicts_with`. Do not pick a winner.
9. Write `unknowns` as `{ field, reason }`. Anything you wanted to record but could not source goes here.
10. Tag from `foldable`, `phone`, `tablet`, `desktop`, `tv`, `automotive`.
11. Run `profiles validate` and `profiles show <id>`; the `gaps` printed per posture should match your `unknowns`.

To correct a profile later, bump `revision` and set `supersedes` on a replacement rather than rewriting history silently.

## Corpus at v0.1

Slice 1 uses the first four in this order.

| id | kind | platform | panels | postures | tags | notes |
|---|---|---|---|---|---|---|
| microsoft-surface-duo | device | android | inner, single | closed, flat, book, tabletop | foldable, phone | 34 css_px opaque hinge, occlusion full; canonical occluded fixture |
| google-pixel-9-pro-fold | device | android | inner, outer | closed, flat, half_opened, book, tabletop | foldable, phone | Google px, DevTools css_px (fold x=418, w=0), AOSP hinge; conflicts with AOSP profile |
| samsung-galaxy-z-fold7 | device | android | inner, outer | closed, flat, half_opened, book, tabletop | foldable, phone | Playwright css_px; vendor resolution unverified; centre-line folds derived |
| google-pixel-10-pro | device | android | single | none | phone | Playwright; soft keyboard; keyboard height unknown |
| samsung-galaxy-z-fold6 | device | android | inner, outer | same as Fold7 | foldable, phone | Playwright; conflicts with the DevTools entry |
| chrome-devtools-galaxy-z-fold6 | registry-entry | android | inner, outer | same | foldable, phone | DevTools spanned sizes and fold lines |
| aosp-pixel-9-pro-fold | emulator-profile | android | inner, outer | closed, half_opened, book, flat | foldable, phone | nexus.xml, 390dpi, angle ranges |
| aosp-7-6-fold-in-outer-display | emulator-profile | android | inner, outer | closed, half_opened, book, flat | foldable, phone | devices.xml, 420dpi, hinge 884-0-1-2208 |
| asus-zenbook-fold | device | windows | inner, single | closed, flat, half_opened, book, tabletop | foldable, tablet | DevTools, 107 css_px translucent fold |
| google-pixel-10-pro-fold | device | android | inner, outer | closed, half_opened, book, flat | foldable, phone | vendor px and dp only; css_px unknown (inventory-only on web) |
| apple-iphone-17-pro | device | ios | single | none | phone | Playwright pt and css_px |
| google-pixel-tablet | device | android | single | none | tablet | AOSP dp; split-screen in unknowns |
| apple-ipad-pro-11 | device | ipados | single | none | tablet | Playwright; Stage Manager sizes unpublished |
| desktop-ultrawide-3440x1440 | device | web | single | none | desktop | LG panel, DPR 1 derived |
| desktop-tall-portrait-1080x1920 | device | web | single | none | desktop | pivoted Desktop Chrome screen |
| android-tv-1080p | emulator-profile | tv | single | none | tv | 960x540 dp, overscan insets 48/27 dp |
| android-automotive-1024p | emulator-profile | automotive | single | none | automotive | parked and driving operating states |
| apple-iphone-duo | device | ios | inner, outer | closed, flat | foldable, phone | Apple px only; no logical sizes (inventory-only) |
