# Existing packages and agent-skill standards (live inspection)

**Inspection date: 28 October 2026.** Every repository below was cloned (shallow) into `/Users/echo/.claude/jobs/521762a0/tmp/pkgs/<name>` or read through the GitHub API with the authenticated `gh` CLI. Star counts, licenses and push dates come from `gh api repos/<owner>/<repo>` on that date. File trees, line counts and quoted rules come from the checked-out files, not from READMEs. Where a claim could not be verified against a primary source it is marked **unverified**.

This document goes deeper than [existing-work.md](../existing-work.md) and [sources.md](../sources.md): it records what each package *actually checks*, whether it has tests, whether it handles transitions, what the current skill-packaging standards require, what we may legally reuse, and the exact gaps left open.

---

## 1. Package inventory, ranked

### 1.1 Ranking table

Rank is by usefulness to *this* project (proving an interface works across display configurations **and** transitions), not by popularity. "Transitions" means fold/unfold, resize, rotate, keyboard appearance or input change exercised in a running app; "static viewports" means fixed-size captures or CSS guidance only.

| # | Package | Stars | License | Last push | Commit inspected | What it actually checks | Tests of the package | Transitions? |
|---|---|---|---|---|---|---|---|---|
| 1 | [android/skills `jetpack-compose/adaptive`](https://github.com/android/skills/blob/main/jetpack-compose/adaptive/SKILL.md) | 9,954 | Apache-2.0 | 2026-10-26 | `45fd173` (skill `last-updated: 2026-10-24`) | 8-step Compose workflow: form-factor screenshot previews (PHONE/FOLDABLE/TABLET/DESKTOP), adaptive nav, Nav3 multi-pane, adaptive grids, **state preservation across configuration changes** (`rememberSaveable`, scroll state, `rememberNavBackStack`, ExoPlayer position + `playWhenReady`), desktop input, **tabletop posture using real hinge bounds** | None for the skill itself; instructs running the app's screenshot tests and forbids updating goldens | **Yes, as code rules** for fold/unfold/rotate/resize (Step 6), and posture layout (Step 8). No harness executes the transition. |
| 2 | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 91,193 | Apache-2.0 | 2026-10-28 | `8409a56`, v4.8.0 | `adapt.md` (web) and `adapt.native.md`: context assessment, breakpoints, input-method queries, safe areas, custom-control gesture checks with **evidence honesty** ("say what produced the evidence… name what stayed untested"); `audit.md`: 5 dimensions scored 0–4 incl. Responsive (fixed widths, 24/44 px targets, horizontal scroll, text scaling); `android.md`/`ios.md`: capture via `adb exec-out screencap` / `xcrun simctl io`, dark theme + font scale passes | 56 test files; `tests/skill-workflow/browser.mjs` renders exactly two viewports (1440×1000 desktop, 390×844 mobile); LLM workflow suites are opt-in and billed | **No.** Native reference says "test folded, unfolded, and tabletop" but nothing drives a fold, rotation, keyboard or resize. |
| 3 | [OpenAI `playwright-interactive`](https://github.com/openai/skills/blob/main/skills/.curated/playwright-interactive/SKILL.md) | 28,359 (repo) | Apache-2.0 (skill-level `LICENSE.txt` + `NOTICE.txt`; repo root has no license file) | 2026-09-08 | `49f948f` | 693-line persistent `js_repl` Playwright workflow: desktop context 1600×900, mobile context 390×844 `isMobile`, native-window pass (`viewport: null`), Electron; **"Viewport Fit Checks (Required)"**: every required region must fit the startup viewport, plus a separate pass at the product's minimum supported size; one screenshot per user-visible claim | None | **Partial.** Explicit-viewport vs native-window are separate passes with a context reset; no fold/rotate/keyboard. |
| 4 | [jezweb/claude-skills `responsiveness-check`](https://github.com/jezweb/claude-skills/blob/main/plugins/dev-tools/skills/responsiveness-check/SKILL.md) | 1,084 | MIT | 2026-10-09 | API read | Resizes **one browser session** through 8 widths (320→2560) or a 160 px sweep; 8-check matrix (overflow, text, nav switch, stacking, media, touch targets, whitespace, CTA); **reports the exact width range where layout transitions happen**; severity levels; Markdown report template | None | **Width-resize only.** "Transition" here means layout change between widths, not device/posture/keyboard transitions. |
| 5 | [erkamyaman/capacitor-foldable](https://github.com/erkamyaman/capacitor-foldable) (+ bundled skill) | 54 | MIT | 2026-10-27 | `8f153cd`, npm v8.4.2 | Runtime plugin + **polyfill for Device Posture and Viewport Segments APIs** (`src/polyfill.ts`, `src/segments.ts`, `src/css.ts`); bundled `skills/capacitor-foldable` with `references/testing.md` giving concrete fold-testing commands for iPhone Duo (DeviceHub, `hinge` CLI, `simctl --display=3`) and Android (`adb emu fold/unfold`, `cmd device_state`, `sensor set hinge-angle0`) and a "what to actually check" list (both displays, nothing in the fold band, survives fold-shut-and-reopen) | 5 unit test files (`css`, `fold-state`, `keyboard`, `segments`, `size-class`) | **Yes, as runtime + manual recipe.** Best transition knowledge found. Capacitor-specific. |
| 6 | [yonatangross/orchestkit `responsive-patterns`](https://github.com/yonatangross/orchestkit/tree/main/plugins/ork/skills/responsive-patterns) | 298 | MIT | 2026-10-28 | API/clone | 208-line router + 10 rule files + 2 references + `test-cases.json`; `rules/responsive-foldables.md` covers `env(safe-area-inset-*)`, `horizontal/vertical-viewport-segments`, hinge-gap grid, DevTools Surface Duo / Galaxy Fold emulation | `test-cases.json` (prompt → expected behaviours, incl. a negative case) | **No** (CSS guidance only). |
| 7 | [mirzaaghazadeh/iphone-duo-skills](https://github.com/mirzaaghazadeh/iphone-duo-skills) | 244 | MIT (LICENSE file is MIT text; GitHub API reports NOASSERTION) | 2026-10-23 | clone | 11 skills: readiness router, adaptive-layout, hinge-and-scenes, vertical-bars, dual-pane, camera, games, capacitor, flutter, react-native, design-review; measured Duo sizes (inner 951×669 landscape, outer 466×678) | None | **Manual only.** Notes that scripted drivers cannot tap the Duo simulator. |
| 8 | [MADTeacher/mad-agents-skills `flutter-adaptive-ui`](https://github.com/MADTeacher/mad-agents-skills/tree/main/flutter-adaptive-ui) | 110 | MIT | 2026-05-01 | clone | 74-line SKILL + 6 references + 2 Dart assets; workflow step 6: "Keep scroll position, selected navigation destination, form input, and focus stable across resize/orientation/fold changes"; verification step: "no lost selected state, lost scroll position, or broken keyboard traversal" | None | **Named but not executed.** Best wording of state-preservation goals outside Google's skill. |
| 9 | [flutter/agent-plugins `flutter-build-responsive-layout`](https://github.com/flutter/agent-plugins/blob/main/skills/flutter-build-responsive-layout/SKILL.md) | 3,119 | BSD-3-Clause | 2026-10-26 | API read | Single SKILL.md: `LayoutBuilder`/`MediaQuery.sizeOf`, "Do not lock screen orientation… letterboxing on foldables", workflow "resize the application window → review layout transitions → fix overflow" | None | Resize mentioned, not scripted. |
| 10 | [wshobson/agents `responsive-design`](https://github.com/wshobson/agents/blob/main/plugins/ui-design/skills/responsive-design/SKILL.md) | 41,902 | MIT | 2026-10-26 | sparse clone | 44-line SKILL + 4 references (breakpoint-strategies, container-queries, details, fluid-layouts); best-practice and common-issue lists | `evals/static-score-snapshot.json`; README states LLM judge "not checked against human labels" | **No.** |
| 11 | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 141,801 | MIT | 2026-10-26 | `28b3b8d`, v2.15.0 | CSV knowledge base; `ux-guidelines.csv` rows 64–71 "Responsive" (test at 320/375/414/768/1024/1440, viewport meta, horizontal scroll, image scaling, tables) | 13 Python data-contract tests + CLI e2e specs (`preview.spec.ts`) | **No.** |
| 12 | [ehmo/platform-design-skills](https://github.com/ehmo/platform-design-skills) | 629 | MIT | 2026-03-19 | clone | Rule packs per platform; `android/SKILL.md` §3.1 window size classes, §3.4 foldable posture detection, rules R3.9/R3.10, checklist "Foldable hinge area respected" | None | **No.** |
| 13 | [CharlesWiltgen/Axiom `axiom-swiftui`](https://github.com/CharlesWiltgen/Axiom) | 1,230 | MIT | 2026-10-27 | API read | Routes "State lost on resize/rotation (scroll, selection, focus, drafts)" to `skills/layout.md` "State Survives the Transition"; dedicated iPhone Duo skill | Not inspected | iOS only, rules. |
| 14 | [spencerpauly/awesome-cursor-skills `responsive-testing`](https://github.com/spencerpauly/awesome-cursor-skills/blob/main/resources/responsive-testing/SKILL.md) | 869 | CC0-1.0 | 2026-08-02 | API read | 5 viewports (375/428/768/1280/1536), screenshot + aria snapshot per width, PASS/WARN report | None | **No.** |
| 15 | [Anthropic `webapp-testing`](https://github.com/anthropics/skills/blob/main/skills/webapp-testing/SKILL.md) | 184,371 (repo) | Apache-2.0 (skill `LICENSE.txt`) | 2026-10-09 | `dbd4588` | `scripts/with_server.py` + 3 Playwright examples; reconnaissance-then-action | None | **No viewport matrix at all.** |
| 16 | [Vercel `web-design-guidelines`](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) | 33,138 | **No LICENSE file at repo root** (GitHub API: null) | 2026-10-27 | `1a2c79d` | Fetches `web-interface-guidelines/main/command.md` at run time and reviews source files | `packages/react-best-practices-build` tests only | **No.** |
| 17 | [Playwright Test Agents](https://playwright.dev/docs/test-agents) | 83k+ (repo) | Apache-2.0 | 2026-10-28 | API read of `packages/playwright/src/agents` | planner / generator / healer `.agent.md` + `.prompt.md` + `generateAgents.ts`; `npx playwright init-agents --loop=vscode\|claude\|codex\|opencode`; healer emits a **skipped** test when it concludes the feature is broken | Playwright's own `tests/mcp/*.spec.ts` | Generic; not responsive-specific. |
| 18 | [getpopcraft/foldable-sim](https://github.com/getpopcraft/foldable-sim) | 1 | MIT | 2026-10-21 | README | Hosted iframe simulator: iPhone Duo closed 466×678, open 951×669, 40 px crease, plus iPhone 17 family, iPad mini/Pro 13, MacBook Air; `devices.js` corpus; deep links `?device=&posture=&orientation=` | None | **Posture switching in-browser.** Included despite 1 star for the unique idea. |
| 19 | [kylezantos/responsive-craft](https://github.com/kylezantos/responsive-craft) | 84 | **No license file** | 2026-04-04 | API read | SKILL + 5 refs + 3 workflows + `scripts/preview.js`, `snapshot.js`; `references/testing-checklist.md`: drag-resize 280→2560, 10-point check, edge cases (280 px Galaxy Fold inner, 200 % zoom, **keyboard open on mobile**, landscape phone) | None | Width only. **Cannot be copied** (unlicensed). Ideas only. |

Excluded after inspection (toy or no license, no unique idea): `Luqman-Ud-Din/blackbox-qa-agent` (0 stars, no license), `vellum-ai/vellum-client-qa` (1), `Podway-Cloud/podway` (0), `khadinakbarlabs/expo-mobile-app-builder` (3), `harrychuang/cursor-skills` (19, no license). `expo/skills` (3,335, MIT) has no foldable or orientation content. `currents-dev/playwright-best-practices-skill` (412, MIT) `advanced/mobile-testing.md` is generic `devices[]` usage.

Directory signal (skills.sh Algolia search for "responsive", 28 Oct 2026, install counts): `ui-ux-pro-max` 419,475; `impeccable` 366,804 (its `audit` 81,858 and `adapt` 81,720 are listed as separate skills); `flutter-build-responsive-layout` 42,894; wshobson `responsive-design` 21,255; `flutter-adaptive-ui` 2,000; jezweb `responsiveness-check` 1,797; orchestkit `responsive-patterns` 1,553. Install counts measure popularity, not correctness.

### 1.2 File trees of the direct matches

**Impeccable** (`skill/`): `SKILL.src.md` (router; built into `SKILL.md` per provider), `agents/` (4: asset-producer, documenter, finish-reviewer, manual-edit-applier), `reference/` (45 files, 5,410 lines; relevant: `adapt.md`, `adapt.native.md`, `audit.md`, `audit.native.md`, `android.md`, `ios.md`, `live.md`, `harden.md`), `scripts/` (`impeccable` launcher for a Rust engine binary, `live-browser*.js`, `command-metadata.json`, `VERSION`). Repo root also carries `.claude-plugin/{plugin.json,marketplace.json}`, `plugin/{agents,hooks,skills}`, `cursor-plugin/`, `.cursor-plugin/`, and pre-built provider trees `.claude/ .cursor/ .agents/ .gemini/ .codex/ .github/ .veto/ .grok/ .hermes/ .opencode/ …`. `scripts/build.js` transforms one source skill into every provider layout. `claude plugin validate ./plugin` passes with one warning (missing icon).

**Android adaptive** (`jetpack-compose/adaptive/`): `SKILL.md` (494 lines) and `references/` (17 files): Compose flexbox (4), grid (4), mediaquery (1), Nav3 `material-listdetail.md` and `save-state.md`, `compose-screenshot-testing-with-testsuites.md`, `custom_cursors.md`, `foldable-tabletop.md`, `keyboard_shortcuts.md`, `tooltips.md`. Frontmatter: `name`, `description`, `license: Complete terms in LICENSE.txt`, `metadata.author/last-updated/keywords`. Repo root has `.claude-plugin/marketplace.json` (`source: "./"`) and installs via `android skills add`, `/plugin marketplace add android/skills`, or `codex plugin marketplace add android/skills`.

**jezweb responsiveness-check**: `SKILL.md`, `references/breakpoints.md`, `references/report-template.md`. Frontmatter uses `compatibility: claude-code-only` and a trigger-phrase-heavy description. Report template has a Summary table per width, Critical/High issue blocks with "Fix suggestion", and a **Transition Analysis** table (transition, observed at, clean?, notes).

**capacitor-foldable** (`skills/capacitor-foldable/`): `SKILL.md`, `references/{android,api,css-layout,ionic,iphone-duo,testing}.md`. Frontmatter: `license: MIT`, `metadata.status: beta`, `metadata.checked: 2026-09, against Xcode 27.1, Capacitor 8.5, Play target API 36`. The `checked:` field is a good provenance pattern.

**orchestkit responsive-patterns**: `SKILL.md`, `references/{container-queries,fluid-typography}.md`, `rules/` (10 incl. `responsive-foldables.md`, `touch-interaction.md`), `test-cases.json`. Frontmatter uses `compatibility`, `allowed-tools`, `user-invocable: false`, `disable-model-invocation: true`, `metadata.owner-agent`.

### 1.3 Platform primitives inspected alongside the packages

| Primitive | Source (license) | What it gives us | Limit |
|---|---|---|---|
| Chrome DevTools emulated-device list | [`EmulatedDevices.ts`](https://raw.githubusercontent.com/ChromeDevTools/devtools-frontend/main/front_end/models/emulation/EmulatedDevices.ts) (BSD-3-Clause, Chromium Authors) | 40 devices with CSS size, DPR, type; **1 dual-screen** (Surface Duo 540×720, hinge rect) and **4 `foldable-screen`** entries with hinge geometry and spanned orientations: Pixel 9 Pro Fold (412×922), Galaxy Z Fold 6 (412×968), Galaxy Z Fold 5 (344×882), Asus Zenbook Fold (853×1280) | Only 5 fold-capable entries; no iPhone Duo; no posture angles |
| Playwright device descriptors | [`packages/isomorphic/deviceDescriptorsSource.json`](https://raw.githubusercontent.com/microsoft/playwright/main/packages/isomorphic/deviceDescriptorsSource.json) (Apache-2.0) | 207 descriptors / 107 base devices incl. Galaxy Z Fold 6/7 + Cover (Fold 7: 984×1016 @2; Cover 360×764 @3), Z Flip 6/7 + Cover (Flip 7 Cover 474×448), iPhone 17 family, Pixel 10 | Descriptor shape is only `viewport, screen, deviceScaleFactor, isMobile, hasTouch, userAgent, defaultBrowserType`; **no hinge, posture or segments** |
| CDP Emulation domain | [`browser_protocol.json`](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json) | `Emulation.setDevicePostureOverride({posture:{type:'continuous'\|'folded'}})`, `clearDevicePostureOverride`, `setDisplayFeaturesOverride({features:[{orientation:'vertical'\|'horizontal', offset, maskLength}]})`, `clearDisplayFeaturesOverride` (all **experimental**); `setDeviceMetricsOverride` still accepts `displayFeature`/`devicePosture` (deprecated) plus `screenOrientation` and `screenOrientationLockEmulation` | Chromium only; Playwright exposes it via `context.newCDPSession(page)`; Playwright issue search for "device posture" / "viewport segments" returned **zero** issues |
| Viewport Segments API | [Chrome blog, shipped Chrome 138 / Edge 138](https://developer.chrome.com/blog/viewport-segments-api-shipped), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Viewport_segments_API) | `window.viewport.segments` (DOMRect[]), CSS `horizontal-viewport-segments` / `vertical-viewport-segments`, `env(viewport-segment-width 0 0)` etc. | Firefox/Safari unsupported; MDN "Limited availability" |
| Device Posture API | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Device_Posture_API), [caniuse](https://caniuse.com/mdn-api_navigator_deviceposture) | `navigator.devicePosture.type` (`continuous`/`folded`) + `change` event; CSS `device-posture` media feature; caniuse: Chrome 132+, Edge 132+, Samsung Internet 17+, Firefox/Safari none, ~71.6 % global | Experimental per MDN |
| Android fold info | [make-your-app-fold-aware](https://developer.android.com/develop/ui/compose/layouts/adaptive/foldables/make-your-app-fold-aware) | `FoldingFeature.state` FLAT/HALF_OPENED, `orientation`, `occlusionType`, `isSeparating`, `bounds`; `currentWindowAdaptiveInfoV2().windowPosture` | **No hinge angle** exposed; emulator testing not covered on that page |
| Android emulator console | [emulator-console](https://developer.android.com/studio/run/emulator-console) | `fold`, `unfold`, `rotate`, `sensor set`, `resize-display`, via `telnet localhost 5554` or `adb emu <cmd>` | `posture` appears only as gRPC `setPosture`; `sensor set hinge-angle0` and `cmd device_state` are documented only by capacitor-foldable (**unverified against Google docs**) |
| iPhone Duo simulator | capacitor-foldable `references/testing.md`, iphone-duo-skills | Xcode 27.1 DeviceHub; `xcrun simctl io <udid> screenshot --display=3`; third-party `hinge` CLI sweeps angles; automation tools reportedly cannot tap the open Duo (cited bugs XcodeBuildMCP #537, claude-code #96941) | **Secondary sources, unverified**; Apple docs not fetched |

---

## 2. Correct structure for a standards-compliant skill package (late 2026)

### 2.1 Agent Skills open standard ([agentskills.io/specification](https://agentskills.io/specification), repo [agentskills/agentskills](https://github.com/agentskills/agentskills), Apache-2.0, 26,729 stars)

Directory: `skill-name/SKILL.md` (required) + optional `scripts/`, `references/`, `assets/`.

| Field | Required | Constraint |
|---|---|---|
| `name` | yes | 1–64 chars, `a-z0-9-`, no leading/trailing/double hyphen, **must match directory name** |
| `description` | yes | 1–1024 chars; what it does **and** when to use it, with trigger keywords |
| `license` | no | short name or "see LICENSE.txt" |
| `compatibility` | no | ≤500 chars; only if environment requirements exist |
| `metadata` | no | string→string map; use distinctive keys |
| `allowed-tools` | no | space-separated, experimental |

Body rules: whole `SKILL.md` loads on activation; keep it **under 500 lines / ~5,000 tokens**; move detail to `references/`; keep file references **one level deep**; tell the agent *when* to load each reference. Metadata (~100 tokens) loads at startup for all skills. Validate with `skills-ref validate ./my-skill` (Python reference lib in the spec repo).

Best practices ([best-practices.md](https://agentskills.io/skill-creation/best-practices.md)): start from real expertise (incident reports, review comments, failure cases), refine by execution traces, "add what the agent lacks, omit what it knows", gotchas section in `SKILL.md`, output-format templates in `assets/`, checklists, validation loops, **plan-validate-execute** with a validator script, bundle scripts once the agent reinvents logic.

Scripts ([using-scripts.md](https://agentskills.io/skill-creation/using-scripts.md)): paths relative to skill root; non-interactive; `--help`; structured stdout + diagnostics on stderr; idempotent; `--dry-run`; exit codes; bounded output with `--offset`; self-contained deps via PEP 723 (`uv run`), Deno `npm:` specifiers, or Bun auto-install; pin versions in one-off `npx pkg@ver`.

Evals ([evaluating-skills.md](https://agentskills.io/skill-creation/evaluating-skills.md)): `evals/evals.json` with `{skill_name, evals:[{id, prompt, expected_output, files, assertions[]}]}`; run with-skill vs without-skill into `<skill>-workspace/iteration-N/<eval>/{with_skill,without_skill}/{outputs,timing.json,grading.json}` + `benchmark.json`; Anthropic `skill-creator` automates this.

### 2.2 How each harness discovers skills

| Harness | Project path | User path | Extra frontmatter / notes | Source |
|---|---|---|---|---|
| Claude Code | `.claude/skills/<name>/SKILL.md` (also nested `<subdir>/.claude/skills`, parents up to repo root) | `~/.claude/skills/` | `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork`, `agent`, `hooks`, `paths`, `shell`; `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_ROOT}`; `!`cmd`` injection; after compaction keeps ≤5k tokens/skill, 25k total; plugin skills as `/plugin:skill` | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) |
| Codex | `.agents/skills/` in every dir from cwd to repo root | `~/.agents/skills/`, admin `/etc/codex/skills` | optional `agents/openai.yaml` (`interface.display_name/short_description/icon_*/brand_color/default_prompt`, `policy.allow_implicit_invocation`, `dependencies.tools`); invoke `$name` or `/skills`; skill list budget 2 % of context or 8,000 chars (`skills.max_context_tokens` ≤10k); `codex plugin marketplace add` | [learn.chatgpt.com/docs/build-skills](https://learn.chatgpt.com/docs/build-skills) |
| Cursor | `.agents/skills/`, `.cursor/skills/`; also reads `.claude/skills/`, `.codex/skills/` | `~/.agents/skills/`, `~/.cursor/skills/`, `~/.claude/skills/`, `~/.codex/skills/` | `paths` (glob scoping), `disable-model-invocation`, `icon`, `color`; recursive scan | [cursor.com/docs/context/skills](https://cursor.com/docs/context/skills) |
| Gemini CLI / Antigravity | `.gemini/skills/` or `.agents/skills/` (alias) | `~/.gemini/skills/` or `~/.agents/skills/` | `gemini skills install <git-url\|path> [--path sub] [--scope workspace]`; `/skills enable\|disable\|link`; page notes Gemini CLI was superseded by Antigravity CLI for free tiers on 2026-06-18 | [geminicli.com/docs/cli/skills](https://geminicli.com/docs/cli/skills/) |
| GitHub Copilot | `.agents/skills/` | `~/.copilot/skills/` | per `npx skills` agent table | [vercel-labs/skills docs/agents.md](https://github.com/vercel-labs/skills/blob/main/docs/agents.md) |
| OpenCode, Cline, Droid, Kilo, Amp, Zed, Warp… | `.agents/skills/` | varies (`~/.config/opencode/skills/`, `~/.agents/skills/`, …) | `.agents/skills/` is the de-facto **universal project path** | same |

Installer: [`npx skills add <owner/repo>[@skill] [-g] [-a claude-code]`](https://github.com/vercel-labs/skills) (MIT, Node ≥22.20) with `find`, `check`, `update`, `list`, `init`, `experimental_install` from `skills-lock.json`; directory at [skills.sh](https://skills.sh). A repo declares groupings in `skills.sh.json` (`$schema: https://skills.sh/schemas/skills.sh.schema.json`, as Vercel does).

### 2.3 Claude Code plugin packaging ([manifest reference](https://code.claude.com/docs/en/plugins-reference), [marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference))

- Manifest `.claude-plugin/plugin.json`: `name` (required, kebab-case, **must not start with `claude-`, `anthropic-`, `cc-plugin-`** or read as official), `displayName`, `version` (pins users until changed), `description`, `author{name,email,url}`, `homepage`, `repository`, `license` (SPDX), `keywords`, `skills` (adds to default `skills/` scan), `agents`, `commands`, `hooks`, `mcpServers`, `lspServers`, `userConfig`, `dependencies`, `experimental.evals`.
- Standard layout at plugin root: `skills/<name>/SKILL.md`, `agents/*.md`, `hooks/hooks.json`, `.mcp.json`, `bin/` (on PATH while enabled, **but claude.ai/Cowork refuse plugins with a top-level `bin/`**), `scripts/` (free-form), `settings.json`. A root `CLAUDE.md` is **not** loaded and triggers a validator warning. A repo with `SKILL.md` at root and no `skills/` loads as a single skill.
- Marketplace `.claude-plugin/marketplace.json`: `name` (reserved names list incl. `agent-skills`, `npm`, `github`), `owner{name}`, `plugins[]` with `name`, `source` (relative `./…`, or `{source: github|url|git-subdir|npm|archive|command, …}` with `ref`/`sha` pinning), `description`, `version`, `category`, `tags`, `strict`. Install: `/plugin marketplace add owner/repo` then `/plugin install name@marketplace`. Validate with `claude plugin validate <dir>` (`--strict` for CI). Evals live in `evals/` and run with `claude plugin eval`.
- Precedent: android/skills and anthropics/skills use `source: "./"` with `strict: false` + explicit `skills: [...]` lists; Impeccable uses `source: "./plugin"` and a separate `cursor-plugin/`.

### 2.4 Multi-file skills with scripts: packaging and versioning patterns observed

| Pattern | Who | How |
|---|---|---|
| One source skill → per-provider dist | Impeccable | `scripts/build.js` rewrites `SKILL.src.md` placeholders (`{{scripts_path}}`, `{{command_prefix}}`) into `.claude/`, `.cursor/`, `.agents/`, `.gemini/`, `.github/`, `dist/codex/`, universal zip; npm `bin` `impeccable` CLI with `init --providers=… --scope=project\|global`, `link`, `update`; engine is a downloaded Rust binary with `engine-checksums.txt`; `VERSION` file inside `scripts/` |
| Official CLI installer | android/skills | `android skills add <skill> --project=. --agent=…`, plus marketplace entries for Claude Code and Codex |
| Skill shipped inside an npm library | capacitor-foldable | `skills/` folder in the npm package; `npx skills add erkamyaman/capacitor-foldable@capacitor-foldable`; mirror repo for the standalone skill |
| Versioned via `metadata.version` + `last-updated`/`checked` | Vercel (`metadata.version: "1.0.0"`), Android (`metadata.last-updated`), capacitor-foldable (`metadata.checked`) | Cheap provenance in frontmatter; spec says `metadata` is free-form strings |
| Eval cases next to the skill | orchestkit (`test-cases.json`), Anthropic `skill-creator` (`evals/evals.json`), wshobson (`evals/static-score-snapshot.json`) | Prompt → expected behaviours; with/without-skill benchmark |

### 2.5 Recommended structure for this package

```
<package-name>/                         # repo root = marketplace root = plugin root
├── .claude-plugin/
│   ├── plugin.json                     # name (not claude-*/anthropic-*), version, license, skills: ["./skills"]
│   └── marketplace.json                # plugins: [{name, source: "./", strict: false, skills: [...]}]
├── skills/
│   └── <name>/                         # also the folder `npx skills add` copies into .agents/skills
│       ├── SKILL.md                    # router, <500 lines: scope, when-to-load table, gotchas, report contract
│       ├── references/
│       │   ├── web.md                  # CSS/JS signals: viewport, visualViewport, posture, segments, pointer/hover
│       │   ├── android.md              # window size classes, FoldingFeature, emulator fold/unfold, adb capture
│       │   ├── ios.md                  # size classes, Duo simulator limits, simctl capture
│       │   ├── transitions.md          # scenario catalogue: fold/unfold, rotate, resize, keyboard, input change
│       │   ├── state-assertions.md     # what must survive a transition and how to assert it
│       │   ├── evidence-report.md      # report template + provenance rules ("what produced the evidence")
│       │   └── device-profiles.md      # how to read/extend the corpus; provenance fields
│       ├── scripts/                    # non-interactive, --help, JSON on stdout, PEP 723 / npx-pinned deps
│       │   ├── run-matrix.mjs          # launch-at-size matrix via Playwright device descriptors + corpus
│       │   ├── transition.mjs          # CDP posture/display-feature overrides, resize, rotate, keyboard sim
│       │   ├── assert-state.mjs        # scroll/form/selection/focus/playback snapshots before vs after
│       │   └── report.mjs              # evidence + coverage report with "untested" section
│       ├── assets/
│       │   ├── device-profiles.json    # sourced corpus: id, class, css size, dpr, posture modes, hinge, source URL, retrieved date, license
│       │   ├── scenarios.yaml          # transition scenarios with preconditions and pass criteria
│       │   └── report-template.md
│       ├── agents/openai.yaml          # Codex UI metadata (optional)
│       └── evals/evals.json            # prompt → assertions, with-skill vs without-skill
├── agents/                             # optional Claude Code subagents (e.g. transition-runner)
├── fixtures/                           # minimal apps reproducing known failures (fold state loss, keyboard overlap…)
├── skills.sh.json                      # directory grouping
├── LICENSE                             # MIT or Apache-2.0
├── NOTICE                              # third-party: Chromium BSD-3 (device data), Playwright Apache-2.0
├── package.json                        # optional npm CLI: bin that shells to scripts/, "files" whitelist
└── tests/                              # unit tests for scripts + fixture-based regression tests
```

Rules baked into that layout: `name` equals directory; references one hop from `SKILL.md`; no `bin/` at plugin root (claude.ai compatibility); no root `CLAUDE.md`; scripts referenced by relative path (Codex) and optionally `${CLAUDE_SKILL_DIR}` in `allowed-tools` (Claude Code); `metadata.version`, `metadata.checked`, `metadata.corpus-version` in frontmatter; `claude plugin validate --strict` and `skills-ref validate` in CI.

---

## 3. Legal reuse map

Target license for our package: **MIT or Apache-2.0** (both permissive; Apache-2.0 adds an explicit patent grant and NOTICE handling). Compatibility below assumes we ship under one of those.

| Source | License | Reuse verdict | Obligation |
|---|---|---|---|
| Chrome DevTools `EmulatedDevices.ts` device + hinge data | BSD-3-Clause | **Reuse data** (transform to JSON, keep source URL + retrieval date) | Keep copyright notice + license text in NOTICE; no endorsement use of names |
| Playwright `deviceDescriptorsSource.json`, `devices[]` API, CDP session | Apache-2.0 | **Reuse** (depend on `playwright` at run time rather than vendoring the JSON) | Apache NOTICE if vendored |
| CDP protocol JSON | BSD-3-Clause (Chromium) | Reference only | None beyond attribution if copied |
| android/skills adaptive (state-preservation rules, tabletop recipe) | Apache-2.0 | **Reuse text/ideas with attribution**; prefer linking as "retrieved reference" | Keep LICENSE.txt notice; mark modifications |
| Impeccable (`adapt.md`, `audit.md` responsive dimension, evidence-honesty wording, build pipeline idea) | Apache-2.0 | **Reuse with attribution**; do not vendor the Rust engine | NOTICE entry; mark modifications |
| OpenAI playwright-interactive (viewport-fit check wording) | Apache-2.0 (skill LICENSE.txt + NOTICE.txt) | Reuse with attribution | Carry NOTICE.txt text |
| Anthropic webapp-testing `with_server.py` | Apache-2.0 | Reuse with attribution | NOTICE |
| jezweb responsiveness-check (width sweep, report template) | MIT | **Reuse with attribution** | Keep MIT notice |
| capacitor-foldable polyfill + testing recipes | MIT | **Reuse with attribution**; polyfill useful for fixtures, not for assertions | Keep MIT notice |
| iphone-duo-skills | MIT (LICENSE file text; API says NOASSERTION) | Reuse with attribution; **re-check LICENSE wording before copying** | Keep MIT notice |
| orchestkit responsive-foldables rule, test-cases.json pattern | MIT | Reuse with attribution | Keep MIT notice |
| flutter-build-responsive-layout | BSD-3-Clause | Reuse with attribution | Notice |
| wshobson responsive-design, ui-ux-pro-max CSVs, platform-design-skills, flutter-adaptive-ui, Axiom | MIT | Reuse with attribution (low value to copy) | Keep MIT notice |
| awesome-cursor-skills responsive-testing | CC0-1.0 | Free | None |
| foldable-sim `devices.js` (Duo measurements) | MIT | Reuse data with attribution; **measurements are from one simulator build, re-verify** | Keep MIT notice |
| **responsive-craft** | **none** | **Do not copy.** Ideas (drag-resize, keyboard-open edge case) can be re-derived from first principles | — |
| **vercel-labs/agent-skills** | **no LICENSE at root** | **Do not copy** until a license is confirmed; the skill only fetches an external doc anyway | — |
| Anthropic `docx/pdf/pptx/xlsx` | source-available, not open source | Not relevant; do not copy | — |

Must build ourselves: the device-profile corpus with provenance (no permissive source has posture+hinge for more than 5 devices), the transition driver, the state-preservation assertion layer, the evidence/coverage report, the failure fixtures, and the evals.

---

## 4. Gaps none of the inspected packages fill

| # | Gap | Closest existing coverage | Why it is still open |
|---|---|---|---|
| G1 | **Sourced device-profile corpus with provenance** (CSS size, DPR, posture modes, hinge/crease geometry, source URL, retrieval date, license) | Chrome `EmulatedDevices.ts` (5 fold-capable), Playwright (16 Fold/Flip descriptors, no hinge), foldable-sim `devices.js` (Duo only) | No package records where numbers came from or when; none covers Duo + Android folds + tablets + car/TV in one schema |
| G2 | **Transition scenarios executed in a running app**: fold/unfold mid-task, rotate, continuous resize, keyboard show/hide (`visualViewport`), input-modality change (touch→mouse/keyboard), window-posture change | Android skill (code rules), capacitor-foldable (manual recipe), jezweb (width sweep in one session), OpenAI (viewport vs native pass) | Nobody scripts a transition and checks the app *after* it; CDP `setDevicePostureOverride`/`setDisplayFeaturesOverride` is unused by every skill found |
| G3 | **State-preservation assertions** (scroll position, form draft, selection, focus, playback position, route/back stack survive the transition) | Android skill Step 6 (what to write in Compose), flutter-adaptive-ui step 6 (goal wording), Axiom "State Survives the Transition" | No web equivalent; no package snapshots state before/after and diffs it |
| G4 | **Evidence + coverage report** that names the engine, the emulation method, the device profile, and **what stayed untested** | Impeccable evidence-honesty rule (prose), OpenAI one-screenshot-per-claim, jezweb report template | No machine-readable coverage artifact; no "untested" section as a first-class output |
| G5 | **Fixtures that reproduce known failures** (fold layout not switching, letterboxing, keyboard covering fixed footer, lost scroll on rotate) | None | Every package tests the user's app only; no regression corpus to prove the skill detects anything |
| G6 | **Launch-at-documented-size matrix** beyond phone/desktop pairs | Impeccable 2 viewports; OpenAI 2 contexts + min size; jezweb 8 widths; responsive-testing 5 widths; Android 4 preview devices | Widths only (height, DPR, posture, orientation, tall/ultrawide/car/TV mostly absent); no link from a width to a *documented* device |
| G7 | **Car and TV scenarios** (parked-app restrictions, focus/D-pad navigation, 10-foot sizing) | Android cars + TV skills (policy/migration, Android-only) | No web/test-oriented scenario; no Tesla/AAOS browser profile |
| G8 | **Posture emulation portable across tools** | orchestkit points at the DevTools UI; capacitor-foldable polyfills at run time | No script that sets posture + display feature for Playwright/CDP and verifies `navigator.devicePosture`/`viewport.segments` respond |
| G9 | **Evals for responsiveness skills validated against ground truth** | orchestkit prompt-level cases; wshobson snapshot (judge unvalidated) | No dataset of real breakages with expected detections |
| G10 | **iOS foldable automation** | iphone-duo-skills + capacitor-foldable document that scripted drivers cannot tap the Duo | A real limit to state in the report, not to paper over |
| G11 | **Cross-harness script paths** | Impeccable's build pipeline | Claude-only `${CLAUDE_SKILL_DIR}` vs Codex relative paths; needs one convention plus a build or a launcher |

---

## 5. Sources (all accessed 2026-10-28)

**Packages (cloned or API-read)**
- https://github.com/pbakaus/impeccable (commit `8409a56`, v4.8.0; `skill/reference/adapt.md`, `adapt.native.md`, `audit.md`, `android.md`, `ios.md`; `tests/skill-workflow/browser.mjs`; `.claude-plugin/*`; `scripts/build.js`)
- https://github.com/android/skills (commit `45fd173`; `jetpack-compose/adaptive/SKILL.md`, `references/foldable-tabletop.md`, `references/android/guide/navigation/navigation-3/save-state.md`; `cars/android-for-cars-parked-apps/SKILL.md`; `tv/leanback-to-compose-tv-migration/SKILL.md`; `.claude-plugin/marketplace.json`)
- https://github.com/openai/skills (commit `49f948f`; `skills/.curated/playwright-interactive/{SKILL.md,agents/openai.yaml,LICENSE.txt,NOTICE.txt}`)
- https://github.com/anthropics/skills (commit `dbd4588`; `skills/webapp-testing`, `skills/skill-creator`, `template/SKILL.md`, `.claude-plugin/marketplace.json`)
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (commit `28b3b8d`; `skill.json`, `.claude/skills/ui-ux-pro-max/data/ux-guidelines.csv`, `scripts/tests/`, `cli/tests/e2e/`)
- https://github.com/vercel-labs/agent-skills (commit `1a2c79d`; `skills/web-design-guidelines/SKILL.md`, `skills.sh.json`, `AGENTS.md`)
- https://github.com/wshobson/agents (sparse; `plugins/ui-design/skills/responsive-design/`, `evals/README.md`, `.claude-plugin/marketplace.json`)
- https://github.com/yonatangross/orchestkit (`plugins/ork/skills/responsive-patterns/`)
- https://github.com/jezweb/claude-skills (`plugins/dev-tools/skills/responsiveness-check/`)
- https://github.com/erkamyaman/capacitor-foldable (commit `8f153cd`; `src/polyfill.ts`, `src/css.ts`, `skills/capacitor-foldable/references/testing.md`, `test/`)
- https://github.com/mirzaaghazadeh/iphone-duo-skills (`skills/*/SKILL.md`, `LICENSE`)
- https://github.com/MADTeacher/mad-agents-skills (commit `2fb67e3`; `flutter-adaptive-ui/`)
- https://github.com/flutter/agent-plugins (`skills/flutter-build-responsive-layout/SKILL.md`)
- https://github.com/ehmo/platform-design-skills (commit `dc2be82`; `skills/android/SKILL.md`, `skills/web/SKILL.md`)
- https://github.com/CharlesWiltgen/Axiom (`axiom-codex/skills/axiom-swiftui/SKILL.md`)
- https://github.com/spencerpauly/awesome-cursor-skills (`resources/responsive-testing/SKILL.md`)
- https://github.com/kylezantos/responsive-craft (`SKILL.md`, `references/testing-checklist.md`, `workflows/preview.md`; no license file)
- https://github.com/getpopcraft/foldable-sim (README)
- https://github.com/currents-dev/playwright-best-practices-skill (`playwright-best-practices/advanced/mobile-testing.md`)
- https://github.com/expo/skills (code search only)
- https://github.com/microsoft/playwright (`packages/playwright/src/agents/`, `packages/isomorphic/deviceDescriptors.ts`, `packages/isomorphic/deviceDescriptorsSource.json`; issue search "device posture", "viewport segments", "foldable")
- https://playwright.dev/docs/test-agents
- https://github.com/agentskills/agentskills (commit `69ef37e`; `skills-ref/README.md`, `docs/`)
- https://github.com/vercel-labs/skills and https://github.com/vercel-labs/skills/blob/main/docs/agents.md
- https://skills.sh/api/search?q=responsive

**Standards and harness docs**
- https://agentskills.io/specification, https://agentskills.io/skill-creation/best-practices.md, https://agentskills.io/skill-creation/using-scripts.md, https://agentskills.io/skill-creation/evaluating-skills.md, https://agentskills.io/llms.txt
- https://code.claude.com/docs/en/skills, https://code.claude.com/docs/en/plugins-reference, https://code.claude.com/docs/en/plugins/marketplace-reference
- https://learn.chatgpt.com/docs/build-skills (redirect target of developers.openai.com/codex/skills)
- https://cursor.com/docs/context/skills
- https://geminicli.com/docs/cli/skills/

**Platform primitives**
- https://raw.githubusercontent.com/ChromeDevTools/devtools-frontend/main/front_end/models/emulation/EmulatedDevices.ts (BSD-3-Clause)
- https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json (Emulation domain)
- https://developer.chrome.com/docs/devtools/device-mode
- https://developer.chrome.com/blog/viewport-segments-api-shipped (Chrome 138)
- https://developer.chrome.com/blog/foldable-apis-ot (origin trial Chrome 125–128)
- https://developer.mozilla.org/en-US/docs/Web/API/Viewport_segments_API
- https://developer.mozilla.org/en-US/docs/Web/API/Device_Posture_API
- https://caniuse.com/mdn-api_navigator_deviceposture
- https://developer.android.com/develop/ui/compose/layouts/adaptive/foldables/make-your-app-fold-aware
- https://developer.android.com/studio/run/emulator-console
- https://developer.android.com/studio/run/emulator-commandline

**Verification limits.** Local execution was limited to `claude plugin validate` on Impeccable's plugin directory and parsing of the device corpora; no package was run against an application. Install counts are from skills.sh on the inspection date and change daily. The iPhone Duo and Android `cmd device_state`/`hinge-angle0` commands come from capacitor-foldable's reference file and were not checked against Apple or Google documentation.

## Addendum (2026-10-28, verified via Perplexity against Apple primary sources) — Apple "App Resizability" skill

- **Exists.** Xcode 27.1 renames the Xcode 27 "app modernization" skill to **App Resizability** and adds SwiftUI + iPhone Duo support (Apple Tech Talk 111461, ~9:19–9:24). Export for other agents: `xcrun agent skills export` (creates Markdown files; WWDC26 session 278, ~14:07–15:05). Not named in the Xcode 27.1 release notes themselves.
- **What it checks (documented audit targets, "most issues, but not all"):** `UIScreen.main` usage; measuring only at launch / `viewIsAppearing`; `UIWindow(frame: UIScreen.main.bounds)` instead of `UIWindow(windowScene:)`; layout from `UIDevice.current.orientation` / `statusBarOrientation`; `.phone`/`.pad` idiom branches; hard-coded device dimensions; aspect-fill media cropping; UIKit scene-lifecycle migration.
- **What it is NOT:** no bundled runtime test, posture sweep, assertions or pass/fail record. Apple separates "run the skill → fix → test in iPhone Duo simulator / Device Hub (open, close, rotate, fold, Split View)". `UIRequiresFullScreen` is honoured on Duo but the app still resizes on fold.
- **Exported tree:** not documented by Apple; requires an actual Xcode 27.1 export to inspect.
- **iPhone Duo:** announced 2026-09-09, available 2026-10-23 (further regions 2026-10-30). Inner 7.6" 1878×2670 @430 ppi; outer 5.4" 1398×2034 @460 ppi; no point dimensions or posture API published.
- Sources: https://developer.apple.com/iphone-duo/prepare/ · https://developer.apple.com/videos/play/tech-talks/111461/ · https://developer.apple.com/videos/play/wwdc2026/278/ · https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/ · https://www.apple.com/iphone-duo/specs/ · https://developer.apple.com/documentation/xcode-release-notes/xcode-27_1-release-notes

**Implication for this project:** vendors now ship *code-audit* skills on both mobile platforms (Apple App Resizability, Google android/skills adaptive). None ships the *verification* layer: drive the transition, assert reachability + state, record coverage. That layer, cross-platform and sourced, is the open position.
