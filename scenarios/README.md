# Bundled scenarios

Examples you can copy. They reference the bundled fixtures (`npx foldproof fixtures serve` prints the base URL),
so they run out of the box:

```bash
npx foldproof fixtures serve --port 4800 &
npx foldproof run scenarios/examples --base-url http://localhost:4800 --out foldproof-report
```

- `examples/unfold-keeps-draft.yaml` — the headline case: a draft, a caret and the Send control survive unfolding, then Send really sends.
- `examples/duo-tabletop-and-back.yaml` — posture transitions with an opaque hinge: tabletop → flat on Surface Duo, controls never sit on the hinge.
- `examples/phone-keyboard-and-rotate.yaml` — keyboard open → rotate → keyboard close round trip on a phone; the primary action stays reachable.

The template with every field explained is `skills/foldproof/assets/scenario.template.yaml`.
