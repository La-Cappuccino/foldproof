# foldproof

**Reproducible, emulated evidence that a web task survives the fold, the rotate, the resize and the keyboard.**

foldproof opens your page at a documented device configuration, drives a display transition (fold, unfold,
posture change, rotate, resize, split, soft keyboard), and checks that the task you declared is still doable:
the controls are still reachable, the user's draft, focus, selection and scroll place survived, nothing was
remounted, nothing sits on the hinge. It writes a SARIF 2.1.0 evidence record with an explicit **Untested**
list. It is built for CI and for AI coding agents (it ships as an Agent Skill).

It does not take screenshots at 375 px and call it a day. It does not click Send for real to see if Send is
there. It does not claim a pass when the emulation did not take effect. And it never says "proven".

## Why

- Google counts more than 580 million large-screen Android devices. From Android 16 (API 36) orientation,
  resizability and aspect-ratio restrictions no longer apply on screens of 600 dp and wider; the temporary
  opt-out ends when apps target API 37.
- Apple ships iPhone Duo (23 Oct 2026) and requires Duo screenshots from April 2027.
- Of the 19 responsive/adaptive packages we inspected, none executes a transition and asserts that state
  survived. Vendors ship code-audit skills; the verification layer was missing.
- The most common real-world failures are transitions, not breakpoints: keyboard overlap, draft lost on
  unfold, stuck layouts after fold/unfold, tab bars that never return (`docs/research/04`).

## Quick start (browser cached: about 2 minutes)

```bash
npm i -D foldproof playwright && npx playwright install chromium
npx foldproof doctor                      # probes Chromium: segments + posture emulation must be ok
npx foldproof profiles list --executable  # 16 sourced device profiles runnable on the web adapter
npx foldproof quick http://localhost:3000 # zero-config smoke: discover controls, unfold/fold across foldables
```

Then write a real scenario (copy `skills/foldproof/assets/scenario.template.yaml`):

```yaml
foldproof: 1
id: unfold-keeps-draft
title: Unfolding mid-draft keeps the draft; Send still works
profiles: [google-pixel-9-pro-fold, microsoft-surface-duo]
start: { posture: closed }
task:
  url: /compose
  ready: { selector: "#send" }
  controls: ["#send", "role=button[name='Save draft']"]
  state: { form: all, storage: ["draft"] }
  setup: [{ fill: "#body", value: "Hei Per, vedlagt er avtalen." }, { focus: "#body", select: [4, 7] }]
steps:
  - transition: unfold
    assert: preset@1          # reachable, state-preserved, no-remount, not-occluded-by-hinge, no-element-loss
  - operate: { target: "#send", expect: { visible: ".sent" } }
```

```bash
npx foldproof scenarios validate unfold-keeps-draft.yaml
npx foldproof run unfold-keeps-draft.yaml --base-url http://localhost:3000 --out foldproof-report
# foldproof-report/report.md · foldproof.sarif · junit.xml · run.json · artifacts/*.png
```

Exit codes: `0` all required checks pass · `1` a check failed · `2` required coverage inconclusive · `3` runner error.

### Inside an existing Playwright suite (authenticated apps)

```ts
import { test } from '@playwright/test';
import { attach } from 'foldproof/playwright';
import { loadProfiles } from 'foldproof';

test('draft survives unfolding', async ({ page }) => {
  const { items } = await loadProfiles('node_modules/foldproof/profiles');
  const fp = await attach(page, { profile: items.find((p) => p.id === 'microsoft-surface-duo')!, start: { posture: 'closed' } });
  await page.goto('/compose');                         // your login / seeding here
  const task = await fp.task({ controls: ['#send'], state: { storage: ['draft'] } });
  await task.checkpoint();
  await fp.transition('unfold');
  const findings = await task.assert('preset@1');       // never clicks for real
  await task.operate('#send', { visible: '.sent' });    // the one real click, with its declared outcome
  test.expect(findings.filter((f) => f.kind === 'fail')).toEqual([]);
});
```

## What it checks

| Rule | Meaning |
|---|---|
| `env-self-check` | after every configuration change the observed viewport, DPR, CSS posture and segment rectangles equal the profile's; otherwise dependent results are `open`, never `pass` |
| `reachable` | visible, in viewport after scroll, hit-test at centre + 4 corners resolves to the control, enabled, not inert, Playwright trial click ok |
| `state-preserved` | per-field *no-loss* policies: form exact, focus same element, selection exact, scroll anchor still visible, declared storage keys and history not lost, media not rewound. Legitimate change (autosave adds a key, video advances, reflow moves `scrollY`) is not loss |
| `no-remount` | the control is the same DOM node afterwards (identity, not attribute) |
| `not-occluded-by-hinge` | no control intersects an opaque hinge; zero-width fold lines report `notApplicable` plus an advisory |
| `no-element-loss` | controls and landmarks keep an element with the same role and accessible name |
| `operate` | the declared outcome of the one real click |
| `no-horizontal-overflow`, `target-size` | opt-in diagnostics (warning level) |

Evidence values (drafts, storage) are masked in exported records.

## The corpus and the benchmark

`profiles/` — 18 sourced device and registry profiles (Surface Duo, Pixel 9/10 Pro Fold, Galaxy Z Fold 6/7,
Zenbook Fold, AOSP foldables, Pixel 10 Pro, iPhone 17 Pro, Pixel Tablet, iPad Pro 11, ultrawide and tall
desktop windows, Android TV, Android Automotive, iPhone Duo). Every number carries a unit and a source with
URL, publisher, inspection date, licence and upstream revision. Registry conflicts are kept side by side, never
averaged. Unknowns are listed. `npx foldproof profiles show <id>` prints the resolved emulation per posture.
Licence CDLA-Permissive-2.0; upstream attribution in `NOTICE`.

`fixtures/` — the public benchmark: broken/fixed pairs that reproduce real failure classes, plus positive
controls that must pass. `npx foldproof fixtures verify` must report every broken variant failing on exactly
its named rules. Use it to score any tool, not just this one.

## Boundaries (read before trusting a result)

- Fold and posture emulation is **Chromium-only** (CDP). Firefox/WebKit get viewport and rotation parity, labelled.
- No desktop engine shows a real keyboard. Two labelled approximations: `keyboard-overlay-approx` (the
  Chrome-Android/iOS default) and `keyboard-shrink` (`interactive-widget=resizes-content`).
- Results are **emulated evidence**. No physical device was involved; rules *relate to* WCAG 2.2 1.3.4 / 1.4.10 /
  2.5.8, EN 301 549 and Google adaptive guidelines, they do not establish conformance.
- Android and iOS adapters are documented recipes for v0.2 (`skills/foldproof/references/android.md`, `ios.md`).

## Install as an Agent Skill

```bash
npx skills add La-Cappuccino/foldproof                       # Codex, Cursor, Gemini CLI, Copilot, OpenCode…
/plugin install foldproof --marketplace La-Cappuccino/foldproof   # Claude Code
```

The skill's launcher finds a local install, the repository build, or `npx foldproof@<pinned>`.

## Development

```bash
npm install && npx playwright install chromium
npm run typecheck && npm run test:unit && npm run test:fixtures
npx tsx src/cli.ts profiles validate && npx tsx src/cli.ts fixtures verify
```

Design and evidence: `docs/SPEC-v1.md`, `docs/research/` (verified 2026-10-28), the council review that
shaped v0.1 (`docs/plan/council-2026-10-28.md`). Contributing: `CONTRIBUTING.md` (DCO). Licence: Apache-2.0.
