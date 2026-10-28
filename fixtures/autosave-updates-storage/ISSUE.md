# autosave-updates-storage (positive control)

**What it proves:** an editor that autosaves on `input` and on `resize` rewrites `localStorage["draft"]` with
the same text and adds/updates `draft:savedAt` on every save. The storage policy compares declared keys only
("present before ⇒ present after with equal value; additions allowed"), so a rewrite with the same value plus a
new, undeclared key must not be reported as state loss.

**Scenario:** profile `google-pixel-9-pro-fold`; `start: { posture: closed }` (outer 412×922); setup fills
`#body`; unfold → preset@1 (inner 836×842); `state: { storage: [draft] }`; `expect: { verdict: pass }`.

**What foldproof must report:** pass. `state-preserved` "state preserved (form, focus, selection,
scroll-anchor, storage, history, media)"; the `#status` text the autosave writes during the transition is
absorbed by the settle (quiet frames), not reported.

**Why it matters:** Google adaptive Tier 3 `Config_Changes` test T-Config_State ("typed text retained") is the
goal; apps that persist drafts on every configuration change are doing the right thing and must stay green. A
naive "storage must be byte-identical" oracle would flag this.
