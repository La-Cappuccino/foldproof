# Proposed package and architecture

[Start here](../README.md) · [Vision](vision.md) · [Existing work](existing-work.md) · [Validation](validation.md) · [Open choices](decisions-and-next-steps.md)

**Status: proposal, not an agreed implementation specification.** This document organizes the package suggested in the conversation. No skill, adapter, schema, runtime, or test runner has been implemented here.

## Purpose of the proposed package

The user asked for a smart way to supply documented display knowledge to AI and distribute the result as open source. The suggested answer was a small reusable skill backed by platform references, source-backed scenarios, adapters, and observable checks. See [archive messages 40–41](conversation-archive.md#message-40-assistant).

The candidate flow is:

```text
User task and success criteria
           +
Relevant platform references and documented scenario profiles
           +
Observed capabilities and current conditions
           ↓
Select scenarios and propose adaptation rules
           ↓
Run appropriate tools and task checks
           ↓
Record results, evidence, and unavailable coverage
           ↓
Review or revise the rules and tests
```

This is an authoring and verification workflow. It does not require a model call for every layout change. A browser or native layout engine can respond to current constraints using the rules produced and checked through this workflow. Runtime AI selection remains a separate, unevaluated option.

## Candidate components

| Component | Proposed responsibility | Important boundary |
|---|---|---|
| Core skill | Understand the task; load relevant guidance; inspect constraints; select checks; adapt; report evidence. | Keep the entry instructions small enough to use; more agents or Markdown files do not establish better results. |
| Platform references | Retrieve web, Android, vehicle, TV, or other guidance when needed. | Preserve source/version context and support limitations; avoid assuming equivalent APIs across platforms. |
| Scenario profiles | Describe documented configurations, inputs, states, and transitions with provenance and units. | Useful for preparation and coverage; a model-specific entry does not override current observations. |
| Runtime adapters | Read signals the platform actually exposes, such as space, posture, insets, or restrictions. | Report unsupported or inaccessible signals explicitly; do not infer privileged vehicle data from a browser width. |
| Test adapters | Configure supported environments, exercise journeys and transitions, and collect observations. | Browser emulation, an Android emulator, and physical hardware establish different things. |
| Acceptance checks | Decide whether a named task and its required controls/state survive a scenario. | Visual comparison is one source of evidence, not a complete functional oracle. |
| Results and coverage record | Explain what ran, what passed or failed, and what could not be checked. | A package test or skipped scenario is not an application-level pass. |

The runtime and test adapter roles may be separate modules or combined in a small first implementation. Their distinction matters conceptually; a final API or module boundary has not been chosen.

## Documented profile information

A future format could capture the following concepts. These are **candidate fields, not a settled schema**.

| Information | Why it helps |
|---|---|
| Scenario identity and profile revision | Refer to the same case across runs and later corrections. |
| Source URL, publisher, inspection date, applicable model/software/region | Let contributors check where a claim came from and when it applies. |
| Measurement value and explicit unit | Separate physical inches/pixels, CSS pixels, and Android dp. |
| Display/window configuration and usable regions | Separate overall hardware from the area available to the app. |
| Insets, hinge bounds, posture, and occlusions where known | Exercise relevant obstructions without assuming symmetric halves. |
| Input methods and preferences | Cover keyboard, pointer, touch, remote focus, text scaling, or reduced motion where applicable. |
| Operating state and exposed restrictions | Describe conditions without inventing platform permissions. |
| Initial task state and transition sequence | Distinguish a fresh launch from continuity during a task. |
| Expected observable outcomes | Define what it means for the task to remain usable. |
| Assumptions and unresolved measurements | Keep uncertainty visible rather than turning it into a default fact. |

Product pages and manuals are valid candidate sources for hardware and documented scenarios. Platform/API documentation is needed to understand observable signals and permitted behavior. A missing physical-to-logical conversion should remain unknown until the relevant runtime scaling or platform measurement is known. [Concepts](concepts.md) covers this distinction.

For maintenance, a proposed profile process is to retain prior revisions and link corrections to newer evidence. This would help explain why a scenario changed without silently rewriting historical test results. The exact storage and versioning mechanism remains open.

## Layout selection and fallback

The proposed default is to express layout around available space, content, input, and supported capabilities. Source-backed device examples seed tests; they need not become a device-model allowlist controlling layout. This allows familiar capabilities on a newly released device to work without a new model entry, while keeping unusual documented behavior in the test corpus.

When a signal is unavailable, a future adapter should expose that limit and choose a documented fallback suitable for its platform. For example, a browser can test viewport fit without pretending to know the vehicle's driving restrictions. A fallback's visual success cannot certify a platform-specific policy the adapter never observed.

The Tesla example makes this boundary concrete: the user's fractional screen allocations were illustrative. The manual describes changing screen behavior, but neither the manual nor Tesla's third-party vehicle API establishes a native dashboard layout SDK for arbitrary websites. An Android Automotive emulator is a different platform. See [platform boundaries](concepts.md) and [sources](sources.md).

## Candidate package layout

The following tree is an illustration of a **possible future deliverable**. These files have not been created as part of this documentation task.

```text
SKILL.md                 small entry workflow
references/              retrieved or maintained platform guidance
profiles/                sourced, versioned scenarios
adapters/                platform observations and test execution
fixtures/                reproducible failures and corrected examples
results/                 inspectable evidence and coverage records
```

Markdown may suit guidance, while structured files may suit scenarios. JSON, YAML, another format, exact filenames, agent definitions, and distribution mechanisms are undecided. Existing packages may already provide much of the workflow; reuse and extension should be evaluated before duplicating them. Their licenses and compatibility would need review before incorporating code or content.

## Candidate first milestone

The assistant suggested a deliberately inspectable starting point:

1. Select a small group of reproducible failure cases, including a startup failure and a transition failure.
2. Define the minimum scenario information and expected task outcomes needed for those cases.
3. Use one test adapter to demonstrate the original failures and verify their fixes.
4. Add a core skill that selects cases, uses the adapter, and reports evidence and coverage gaps.

A web adapter was an implementation option, not a user decision. The first platform should follow the failure cases and available test environment. The broad vision remains intact even if the first measured slice is narrower.

Before claiming improvement, compare results against an appropriate existing workflow using the same tasks and constraints. Possible measurements include detected known failures, missed failures, false alarms, preserved state, reproducibility, and required human intervention. No baseline, threshold, dataset, or score has been selected. [Validation](validation.md) develops the candidate checks; [decisions](decisions-and-next-steps.md) records what still needs choosing.
