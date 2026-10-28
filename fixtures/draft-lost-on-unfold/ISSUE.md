# draft-lost-on-unfold

**Failure class:** transition — a width-class change triggers a full re-render; the editor is remounted and the
user's draft, caret position and focus are lost. The task (send the reply) can still be *started*, which is why a
screenshot comparison passes and only a state-preservation oracle catches it.

**Real-world instances (docs/research/04 §1.2):** Expo #42294 (layout decided once from an initial size), the
Flutter iPhone Duo cluster (Sep–Oct 2026), Google adaptive guideline `Config_Changes` test T-Config_State
("typed text retained and keyboard state restored").

**What foldproof must report:** `broken/` fails `state-preserved` (form value, focus, selection) and `no-remount`
(the stamped `#send` node is a different node after the transition) and nothing else; `fixed/` passes every rule
including `operate` (Send produces `#sent`).

**The fix:** reflow the same DOM with CSS (`@media (min-width)` and, when segments exist,
`env(viewport-segment-*)`); never rebuild the tree on a size change.
