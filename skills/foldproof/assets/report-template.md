# How to summarise a foldproof run for a human (template for agents)

Read `report.md` (or `run.json`) first. Then write, in this order and nothing else:

1. **Verdict line.** `foldproof: <pass|fail|open> — <N> scenario(s) × <M> profile(s), exit <code>` and what the
   exit code means (0 all required pass · 1 fail · 2 required coverage inconclusive · 3 runner error).
2. **Failures** (if any). One bullet per failing rule: scenario @ profile, step label, the rule, the message
   verbatim, and the element (selector / accessible name). Never paraphrase a masked value.
3. **Untested.** Copy the "Untested" section: every `open`, `review`, `notApplicable` with its reason.
   If this list is non-empty, say explicitly that those checks did not reach pass or fail.
4. **Evidence boundary.** One sentence: "Evidence level: emulated (Chromium <version>, CDP); no physical
   device was used; results relate to, but do not establish conformance with, the cited clauses."
5. **Next action.** The smallest change that would turn the first failure into a pass, referencing the
   fixture ISSUE.md of the same failure class when one exists.

Do not say "passes", "proven", "compliant" or "works on <device>" for anything that is not `pass`.
