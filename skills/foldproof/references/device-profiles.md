# Device profiles

This reference explains the profile corpus in `profiles/`: the three provenance kinds, the required fields, how a posture declares the web signals the self-check expects, how conflicting registries and unknowns are recorded, which profiles the web adapter can execute, how to add a profile and what the validator rejects, and the licence terms. The schema is `src/core/schema.ts` (`Profile`) and the authoritative walk-through is `profiles/README.md`; this page is the short version for an agent choosing or extending profiles. Inspected 2026-10-28.

Contents

1. What a profile is and is not
2. Provenance kinds
3. Required fields
4. Postures and `postures[].web`
5. Conflicts and unknowns
6. Executable versus inventory-only
7. Adding a profile and the validator rules
8. The v0.1 corpus
9. Licence
10. Sources

## 1. What a profile is and is not

A profile holds sourced device or registry facts: panel pixels, logical sizes at a stated scale, usable viewports, display features, postures, inputs, operating states. It does not hold browser capabilities (those are generated into `engines/` from MDN browser-compat-data), illustrative window sizes, or test choices (those live in scenarios). A profile seeds tests; it is not an allowlist that drives layout.

Three kinds exist: `device` (retail hardware), `emulator-profile` (an Android Studio hardware definition from AOSP `sdklib`, reproducible without hardware, with hinge geometry and posture angle ranges, but not device truth), and `registry-entry` (one browser registry's view, kept separately when it disagrees with the device profile).

## 2. Provenance kinds

| Kind | Meaning | Must carry |
|---|---|---|
| `published` | Quoted from a source as-is | `source_ref` to a declared source; `registry` string for registry entries so the exact entry can be re-read |
| `derived` | Computed by the corpus author from published inputs | `derivation`: formula and inputs in words a reviewer can recompute; the validator rejects a derived value without one |
| `measured` | Observed at runtime by a tool this project ran | A source with `licence: "measured"`, the tool and the date. Never used for a number someone else measured. No measured values ship in v0.1 |

Keyboard heights, Stage Manager window sizes, Dynamic Island metrics and iPhone Duo point dimensions are not published anywhere authoritative (research 02 section 1); they are `unknowns` until measured.

## 3. Required fields

`id` (lowercase, digits, hyphens; equals the filename), `revision` (integer, bumped on correction; `supersedes` names the replaced id), `kind`, `platform` (`web`, `android`, `ios`, `ipados`, `windows`, `automotive`, `tv`), `name`, `sources[]` (at least one: `id`, `url`, `publisher`, `inspected` as YYYY-MM-DD, `licence` as an SPDX id or `vendor-fact` or `measured`, `kind`, optional `revision`, `quote`, `note`), `panels[]` (`inner`, `outer` or `single`; `physical_px`; optional diagonal, ppi, Android density), `inputs` (`pointer`, `hover`, `touch`, `keyboard`, optional `remote_dpad`, `rotary`, `voice`), and `unknowns[]` (required even when empty).

Optional geometry: `logical[]` (per panel and orientation, `unit` of `css_px`, `dp` or `pt`, `w`, `h`, `scale`), `usable[]` (`layout_viewport`, optional `visual_viewport`, `insets`, `cutouts`), `display_features[]` (`fold` or `hinge`, `orientation`, `bounds`, `unit`, `occlusion` of `none` or `full`, `is_separating`), `postures[]`, `operating_states[]` (`parked` or `driving` with `requires_distraction_optimization`), `conflicts_with[]`, `keyboard_height` (only with a cited measurement), `tags`.

Every length carries a unit; `device_px` is allowed only in `panels[].physical_px`. Zero insets mean "not published", never "none".

## 4. Postures and `postures[].web`

A posture (`closed`, `half_opened`, `flat`, `book`, `tabletop`, `tent`) belongs to a panel and declares `web: { posture: continuous | folded, segments: 1 | 2 }`. This is the expectation the environment self-check compares against after a transition, so the posture-to-signals mapping is data, not adapter code. The validator requires `segments: 2` exactly when the posture names an active `display_feature`, and a `folded` posture must name one. Optional `android_state` (`FLAT`, `HALF_OPENED`) and `hinge_angle_range_deg` carry the Android view for the v0.2 adapter.

Feature bounds are written in the orientation the registry publishes them in, and the resolver does not rotate them. For book-fold phones a `vertical` fold uses portrait coordinates and a `horizontal` fold (tabletop) uses landscape coordinates; Surface Duo is the reverse. A scenario targeting `tabletop` must set the matching `orientation`.

## 5. Conflicts and unknowns

Registries disagree. Playwright and Chrome DevTools differ by about 100 px on the Galaxy Z Fold 6 inner panel; the DevTools spanned size for the Pixel 9 Pro Fold matches neither the vendor pixel count nor the AOSP emulator density (research 02 section 4.2). The corpus records both, links them with `conflicts_with: [{ profile_id, field, note }]`, and never averages. A profile may therefore sit next to a `registry-entry` for the same handset.

`unknowns` is a typed list `{ field, reason }`. It is where a wanted but unsourced value goes: keyboard height, split-screen divider width, Samsung resolutions whose vendor page did not render. `profiles show <id>` prints the gaps the resolver sees per posture; they should match the profile's `unknowns`.

## 6. Executable versus inventory-only

The web adapter needs, for the panel it emulates, a `logical` entry with `unit: css_px` and a `usable` entry with `unit: css_px`. Profiles meeting that are executable; `run` emulates them. Profiles without (`google-pixel-10-pro-fold`, `apple-iphone-duo`, Android `dp`-only profiles, car and TV) are valid inventory; `run` reports every row for them as `notApplicable: profile not executable (reason)`. The corpus count and the executable count are reported separately. A `usable` entry missing for one orientation makes the resolver fall back to the logical size and record the gap "browser UI height unknown".

## 7. Adding a profile and the validator rules

The files are generated by `scripts/gen-profiles-v0.1.py`; edit the generator, then regenerate and run `npx tsx src/cli.ts profiles validate` and `profiles show <id>`. The steps, from `profiles/README.md`: pick `id` and `kind`; declare `sources` first with URL, publisher, inspection date, licence, kind, revision and a verbatim `quote`; add `panels`; add `logical` per panel and orientation with `scale` (registry values `published` with a `registry` string, computed ones `derived` with the formula); add `usable` (say so in `derivation` if you only know the panel); for foldables add `display_features` and `postures` with `web`; fill `inputs` and, for cars, `operating_states`; add `keyboard_height` only with a measurement URL; record disagreements with `conflicts_with`; write `unknowns`; tag.

The validator rejects: a `source_ref` that names no declared source; a derived value without `derivation`; a length without a unit; a posture whose `display_feature` is undeclared or on another panel; `web.segments` inconsistent with the feature; a `folded` posture without a feature; a `logical` or `usable` entry on an undeclared panel, or duplicated for the same panel, orientation and unit; a profile with no `logical` entries that does not list a `logical…` field in `unknowns`; `keyboard_height.min` above `max`; and any unknown key (schemas are strict). Mutation tests in `tests/` cover each of these (spec acceptance 2).

## 8. The v0.1 corpus

Twenty files as of 2026-10-28. Foldables: `microsoft-surface-duo` (34 CSS px opaque hinge, the canonical occluded fixture), `google-pixel-9-pro-fold` (vendor pixels, DevTools fold line at x=418, AOSP hinge), `samsung-galaxy-z-fold7`, `samsung-galaxy-z-fold6` with its DevTools `registry-entry`, `aosp-pixel-9-pro-fold`, `aosp-7-6-fold-in-outer-display`, `asus-zenbook-fold` (107 CSS px translucent fold), `google-pixel-10-pro-fold` (inventory-only), `apple-iphone-duo` (inventory-only). Phones and tablets: `google-pixel-10-pro` (keyboard scenarios; height unknown), `apple-iphone-17-pro`, `google-pixel-tablet`, `apple-ipad-pro-11`. Desktop: `desktop-ultrawide-3440x1440`, `desktop-tall-portrait-1080x1920`. Inventory for other adapters: `android-tv-1080p`, `android-automotive-1024p`. Scenario `profiles: { class: foldable | phone | tablet | desktop | all }` selects by tag.

Sources accepted for ingestion are Playwright device descriptors (Apache-2.0), Chrome DevTools `EmulatedDevices.ts` (BSD-3-Clause), MDN browser-compat-data (CC0-1.0), AOSP `sdklib` device XML (Apache-2.0), and vendor tech-spec pages quoted as facts. GSMArena, yesviz, blisk, DeviceAtlas and 51Degrees are not ingested for licence reasons (research 02 section 4.1).

## 9. Licence

The corpus is licensed under CDLA-Permissive-2.0 (council decision, `docs/plan/council-2026-10-28.md`; spec section 4), chosen because it is data-specific, permissive, and explicitly covers the EU and EEA sui generis database right (Directive 96/9/EC) that can attach to a curated collection even though individual screen facts are not copyrightable. Code is Apache-2.0; the SPDX expression for the package is `Apache-2.0 AND CDLA-Permissive-2.0`. The repository `NOTICE` carries the upstream terms: Chromium BSD-3-Clause, Playwright Apache-2.0, AOSP Apache-2.0, MDN CC0-1.0, and vendor facts cited as `vendor-fact`. Imported values keep their upstream terms per `sources[].licence`; transformed values are `derived` and covered by the corpus licence. Contributions use the Developer Certificate of Origin sign-off.

On 2026-10-28 the text in `profiles/LICENSE` still reads CC BY 4.0 while `NOTICE` and the spec say CDLA-Permissive-2.0; the file is expected to be aligned before publication.

## 10. Sources

Inspected 2026-10-28.

- CDLA-Permissive-2.0: https://cdla.dev/permissive-2-0/
- Directive 96/9/EC (database right): https://eur-lex.europa.eu/eli/dir/1996/9/oj
- Playwright device descriptors: https://github.com/microsoft/playwright/blob/main/packages/isomorphic/deviceDescriptorsSource.json
- Chrome DevTools emulated devices: https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/emulation/EmulatedDevices.ts
- AOSP sdklib device definitions: https://android.googlesource.com/platform/tools/base/+/mirror-goog-studio-main/sdklib/src/main/resources/com/android/sdklib/devices/
- MDN browser-compat-data: https://github.com/mdn/browser-compat-data
- Microsoft Surface Duo dimensions (archived): https://learn.microsoft.com/en-us/previous-versions/dual-screen/android/surface-duo-dimensions
- Google Pixel hardware specs: https://support.google.com/pixelphone/answer/7158570
- Apple iPhone Duo tech specs: https://www.apple.com/iphone-duo/specs/
- Project research: `docs/research/02-device-profile-sources.md`; `profiles/README.md`; `src/core/schema.ts`
