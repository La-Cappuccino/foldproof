# Research 00 — Perplexity landscape pass (2026-10-28)

Two Perplexity Pro queries (model: claude_sonnet via Perplexity, detailed intent). Conversation IDs
`b7827ba3-d971-4b10-b670-158f1d0d3881` and `c5b71899-4193-4177-8c29-6d1e96859d20`.
Everything below is a secondary source and is re-verified in research docs 01–04.

## Q1 — Tools for foldable / posture / transition testing (web + Android)

### Headline
No single open-source tool covers foldable posture, split-screen, rotation, keyboard overlap and
ultrawide testing end-to-end. The space splits into browser-engine emulation (Playwright, Chrome
DevTools), OS-level emulator control (`adb emu`), native test libraries (Jetpack WindowManager
testing) and a thin, immature layer of AI-agent skills.

### Web layer

| Tool | Adoption | Covers | Does NOT cover |
|---|---|---|---|
| Playwright (microsoft/playwright) | ~98.7k stars, daily commits | viewport, `devices[]`, DPR, isMobile/hasTouch, `emulateMedia`, landscape variants, raw CDP | No Device Posture / Viewport Segments emulation API; no foldable entries in device registry; no transition-state assertions |
| Chrome DevTools MCP (ChromeDevTools/chrome-devtools-mcp) | ~54.3k stars | Full CDP for agents; bundled skills (chrome-devtools, a11y-debugging, debug-optimize-lcp); **DevTools 142 added posture support for emulated foldables** and dual-screen Device Mode via `Emulation.setDeviceMetricsOverride` + `dual-screen`/`foldable-screen` device JSON | No responsive/foldable audit skill; dual-screen metadata in `EmulatedDevices.ts` is Chromium-internal, not a stable scripted API; no state-preservation model |
| Viewport Segments API + Device Posture API (W3C) | Chrome/Edge since **138**; Safari 27.1 dev preview | `navigator.devicePosture`, `window.viewport.segments`, CSS `horizontal/vertical-viewport-segments` | Platform capability, not a test tool. MDN: browser devtools "generally don't include emulation of the physical segmentation" |

### Android layer

| Tool | Status | Covers | Does NOT cover |
|---|---|---|---|
| `adb emu fold/unfold/rotate/posture <id>/resize-display <id>` | Official, documented Aug 2026 (android-developers.googleblog.com/2026/08/emulator-adaptive.html) | Scriptable fold, rotation, tabletop/book posture, phone/unfolded/tablet resize for CI | Posture IDs not standardised across AVDs (1–3 work on Pixel Fold / Resizable; 4–5 fail "KO: Failed to set posture"); no split-screen command; no state assertion |
| `androidx.window:window-testing` (WindowManager 1.5 stable Oct 2025, 1.5.1 latest) | Official | `TestWindowLayoutInfo`, mock `FoldingFeature` STATE_FLAT / HALF_OPENED for Views + Compose | Pure mocking; does not drive a real transition; no split-screen, keyboard or rotation helpers |
| Microsoft Surface Duo Foldable Test Kit (`com.microsoft.dualscreen.testing`) | alpha03, hardware discontinued | `FoldingFeatureHelper` for View/Compose tests | Maintenance risk; dual-screen only |
| Appium + BrowserStack real-device foldables | Hosted add-on | Fold/unfold on Galaxy Fold 7 via ADB executor; orientation in both postures; video/log capture | **No half-fold/tabletop**, **no split-screen**, no automated state-preservation checks (docs say to add `Thread.sleep` + own checks) |

### AI-agent skills layer (thin)

- Playwright CLI + skills (`playwright-cli install --skills`) — teach tool usage, not responsive heuristics.
- Chrome DevTools MCP skills — general debugging/a11y/perf, nothing foldable-specific.
- **facet / facet-check** (github.com/chndr-prksh/facet) — 2 stars, very early, but the closest
  purpose-fit: MCP server with `check_responsive`, `audit_responsive`, `compare_element`,
  `list_devices`; 292-device catalog incl. 14 foldables sourced from Apple specs, Chrome DevTools
  device list, yesviz.com, screensize.io, webmobilefirst.com; real CDP emulation; flags
  horizontal overflow, tap-target size, text-zoom. Chromium-only; Android dimensions marked ≈;
  no hinge segmentation; no transition/state model.
- Web Interface Guidelines / design-audit skills — static code review, not live emulation.

### Visual regression layer
BackstopJS (MIT, most adopted self-hosted), Percy, Chromatic — rectangular viewports only; no
posture, hinge or segment model.

### Gaps across the board (Perplexity's summary, matches our own research)
1. **Transition / state-preservation assertions** — nothing asserts that form input, scroll,
   playback or selection survive fold/unfold, rotation or split-screen. Tools give the trigger
   (`adb emu fold`) or the end-state mock (WindowManager testing); the check is left to the author.
2. **Sourced authoritative device profiles** — only facet documents sourcing; Playwright and
   DevTools registries ship no foldable entries; BrowserStack's foldable matrix is one device.
3. **Split-screen testing** — unsupported by BrowserStack foldable guide, absent in Playwright/CDP.

### Q1 sources (inspected via Perplexity 2026-10-28)
- https://github.com/microsoft/playwright · https://playwright.dev/docs/emulation
- https://developer.chrome.com/blog/new-in-devtools-142
- https://github.com/ChromeDevTools/chrome-devtools-mcp
- https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/emulation/EmulatedDevices.ts
- https://developer.mozilla.org/en-US/docs/Web/API/Viewport_segments_API/Using
- https://android-developers.googleblog.com/2026/08/emulator-adaptive.html
- https://developer.android.com/jetpack/androidx/releases/window
- https://android-developers.googleblog.com/2025/10/jetpack-windowmanager-15-is-stable.html
- https://devblogs.microsoft.com/surface-duo/foldable-ui-test-kit/
- https://www.browserstack.com/docs/app-automate/appium/test-on-foldable-devices
- https://github.com/chndr-prksh/facet
- https://developer.android.com/develop/adaptive-apps/quality-guidelines/adaptive-app-quality/experiences/foldables
- https://github.com/garris/BackstopJS

## Q2 — Agent Skills standard and how top repos package multi-file skills

### The standard
Agent Skills specification: https://agentskills.io/specification (Anthropic-authored, released as
vendor-neutral 2025-12-18; implemented by 26+ platforms incl. Claude, Codex, Gemini CLI, Copilot,
Cursor, VS Code). Reference library: github.com/agentskills/agentskills (`skills-ref validate`).

```
skill-name/
├── SKILL.md          # required: YAML frontmatter + Markdown instructions
├── scripts/          # executable code (invoke via interpreter in prose, never bare path)
├── references/       # prose docs loaded on demand; index any file >100 lines; one level deep
└── assets/           # templates, data files, JSON schemas, lookup tables, fixtures
```

Frontmatter: `name` (1–64 chars, lowercase, hyphens, must equal directory name), `description`
(1–1024 chars, what + when), optional `license`, `compatibility`, `metadata` (free-form; put
semver `version` here), experimental `allowed-tools`.

Progressive disclosure tiers: metadata (~100 tokens, always) → SKILL.md body (<500 lines /
<5k tokens, on activation) → resources (unbounded, on demand).

### How the big repos lay out files

| Repo | Layout | Versioning | Testing | Distribution |
|---|---|---|---|---|
| anthropics/skills | `.claude-plugin/`, `skills/<name>/`, `spec/`, `template/` | git history; optional `metadata.version` | none shown | `/plugin marketplace add anthropics/skills`; API Skills endpoint |
| vercel-labs/agent-skills | `.github/workflows/`, `skills/<name>/`, `skills.sh.json`, `AGENTS.md`, `CLAUDE.md` | immutable GitHub Release + discovery index per merge | CI builds index | `npx skills add vercel-labs/agent-skills` |
| pbakaus/impeccable | one canonical `skill/` tree mirrored into `.claude/skills`, `.codex/`, `.agents/skills/`, `plugin/skills/`; `scripts/impeccable` launcher + digest-checked binary engine | parallel tags `skill-vX`, `cli-vX`, `engine-vX` | 62 deterministic detector rules | `npx impeccable install`; git submodule vendoring |
| wshobson/agents | `plugins/<plugin>/skills/<skill>/`, `.claude-plugin/`, `.cursor-plugin/`, `evals/`, `Makefile` | repo-level | `make validate STRICT=1`, `plugin-eval` scorer, LLM-judge layer | marketplace, `gh skill install`, `npx skills add --skill` |
| obra/superpowers | flat `skills/<name>/`, `.claude-plugin/`, companion marketplace + evals repos | git | TDD-for-docs (RED/GREEN/REFACTOR with subagents), `npm test` | `obra/superpowers-marketplace` |

### Convergent checklist for our package
- CLI in `scripts/`, invoked by interpreter in prose.
- JSON Schemas + data corpus + fixtures in `assets/`, not `references/`.
- Explanatory prose >100 lines in `references/` with a contents index, one hop from SKILL.md.
- SKILL.md < 500 lines, acts as orchestration + triggers only.
- `metadata.version` semver in frontmatter; package versioned by git tag/release.
- `skills-ref validate ./<skill>` before publishing.
- Distribute via `.claude-plugin/marketplace.json` AND `npx skills add <owner>/<repo>`.

## Q3 — Exact CDP surface for foldable emulation (conversation `6fcb2d9b-be61-44da-811d-1a2b669de1fa`)

| Command | Params | Web effect |
|---|---|---|
| `Emulation.setDevicePostureOverride` | `posture: {type: "continuous" \| "folded"}` | `navigator.devicePosture.type`, `change` event, `@media (device-posture: folded)` |
| `Emulation.clearDevicePostureOverride` | — | revert |
| `Emulation.setDisplayFeaturesOverride` | `features: [{orientation: "vertical"\|"horizontal", offset: int, maskLength: int}]` | `window.viewport.segments` (one DOMRect per segment), `env(viewport-segment-* x y)`, `horizontal/vertical-viewport-segments` media features |
| `Emulation.clearDisplayFeaturesOverride` | — | revert |

- Both are **experimental** in the protocol (may change without deprecation).
- `offset` is x for a vertical hinge, y for a horizontal hinge; `maskLength` is the obscured hinge width/height (0 for a pure split).
- Posture and segment count are independent (dual-screen can be 2 segments + `continuous`).
- Playwright has no typed helper; `context.newCDPSession(page)` + `send()` works on Chromium only.
- Timeline: Chrome 122 DevTools posture UI; 132 Device Posture API stable; **138 Viewport Segments API stable**; 142 current DevTools posture/segment controls.
### VERIFIED locally 2026-10-28 (Playwright 1.64.1, bundled Chromium 156.0.8078.4, headless, macOS)

Experiment scripts: `verify.mjs`, `verify2.mjs`, `verify3.mjs` (job tmp dir; reproduced in `adapters/web/` tests).

| Mechanism | Result |
|---|---|
| `Emulation.setDevicePostureOverride {type:"folded"}` | **Works for CSS**: `@media (device-posture: folded)` matches and `change` fires. `navigator.devicePosture` JS object is **absent** (`'devicePosture' in navigator === false`) in this build, with or without `--enable-features=DevicePosture` / `--enable-experimental-web-platform-features`. |
| `Emulation.setDisplayFeaturesOverride {features:[…]}` (dedicated command) | **Does NOT take effect** in this build: `window.viewport.segments` stays at 1 segment, even after a subsequent resize, in default headless, `channel: 'chromium'`, mobile and desktop modes, with and without flags. |
| Inline `displayFeature` + `devicePosture` on `Emulation.setDeviceMetricsOverride` (marked deprecated in the protocol) | **Works**: vertical hinge `offset:490, maskLength:20` on a 1000×900 viewport → `window.viewport.segments = [[0,0,490,900],[510,0,490,900]]`, `env(viewport-segment-width 0 0)` = 490px, `@media (horizontal-viewport-segments: 2)` matches. Works in mobile and desktop mode. |
| Transition mid-session (re-send metrics without `displayFeature`, posture `continuous`) | **Works without reload**: segments collapse to `[[0,0,1000,900]]`, `matchMedia('(horizontal-viewport-segments: 2)')` fires `change` (false), posture query fires `change` (false). No `segmentschange` event observed on `window.viewport` in this build; `matchMedia` listeners are the reliable signal. |
| Horizontal hinge (tabletop) `orientation:"horizontal", offset:440, maskLength:20` | **Works**: segments `[[0,0,1000,440],[0,460,1000,440]]`. |

**Adapter decision:** the web adapter emulates folds via the inline `displayFeature`/`devicePosture`
fields of `Emulation.setDeviceMetricsOverride` (what Chrome DevTools Device Mode itself uses), and
attempts the dedicated commands first with a probe so the code self-upgrades when a Chromium build
honours them. Posture is asserted at the CSS level (`matchMedia`), never via `navigator.devicePosture`.
All of this is Chromium-only; WebKit/Firefox get viewport-only coverage and the report must say so.

Sources: https://chromedevtools.github.io/devtools-protocol/tot/Emulation/ ·
https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/Emulation.pdl ·
https://developer.chrome.com/blog/viewport-segments-api-shipped ·
https://developer.mozilla.org/en-US/docs/Web/API/Viewport_segments_API/Using ·
https://playwright.dev/docs/api/class-cdpsession · https://www.w3.org/TR/css-env-1

### Q2 sources (inspected via Perplexity 2026-10-28)
- https://agentskills.io/specification · https://agentskills.io/skill-creation/best-practices
- https://github.com/anthropics/skills · https://github.com/vercel-labs/agent-skills
- https://github.com/pbakaus/impeccable · https://github.com/pbakaus/impeccable/releases
- https://github.com/wshobson/agents · https://github.com/wshobson/agents/blob/main/docs/agent-skills.md
- https://github.com/obra/superpowers · https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md
- https://github.com/anthropics/claude-plugins-official/blob/main/plugins/plugin-dev/skills/plugin-structure/README.md
