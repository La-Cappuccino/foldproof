# nav-collapses-correctly (positive control)

**What it proves:** legitimate responsive behaviour must not be flagged. A header nav shows its links on a wide
layout and collapses them into a `#menu` button on a narrow one, with CSS only (same DOM,
`@media (max-width: 699px)`); on a dual-screen flat posture the two-column layout is sized to the viewport
segments and leaves the hinge empty (`env(viewport-segment-*)`). This is exactly the reflow WCAG 2.2 1.4.10 and
Google's adaptive `Config_Changes` guideline ask for.

**Scenario:** profiles `google-pixel-9-pro-fold` (flat/inner 836×842 → closed/outer 412×922 → flat) and
`microsoft-surface-duo` (flat/inner 1114×720 with an opaque 34 px hinge at x = 540 → closed/single 540×720 →
flat); `start: { posture: flat }`; fold → preset@1; unfold → preset@1; `expect: { verdict: pass }`.

**What foldproof must report:** pass on both profiles. `reachable` "Send" on every step; `state-preserved`;
`no-remount` for `#send`; `no-element-loss` for `#send` and `role=navigation` (the links are hidden by CSS and
the `nav` landmark keeps its role and accessible name); `not-occluded-by-hinge` "Send" clear of the hinge mask on
the Duo unfold step, and `notApplicable` where the configuration has no display feature (Pixel 9 Pro Fold
flat/closed, Duo closed) — the spec'd outcome, which does not make the verdict `open`.

**Why it matters:** a tool that flags a collapsing nav as element loss would be ignored within a week. The
element-loss oracle is scoped to declared controls and landmarks by role + accessible name, not to the whole
page, precisely so this stays green.
