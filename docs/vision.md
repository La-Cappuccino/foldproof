# Vision, problem, and user intent

[Start here](../README.md) · [Conversation narrative](conversation-narrative.md) · [Decisions and next steps](decisions-and-next-steps.md)

**Status:** a record of the user's intent and the discussion as of 28 October 2026. Suggested project language is labeled as a proposal.

## What responsiveness means here

The opening clarification was about **an interface adapting to the conditions in which it is used**, rather than how quickly a system responds. The user named screens that fold, widen, curve, become unusually tall, rotate, or belong to different environments. They asked whether adapting across this range is achievable, whether others have tried, and whether the problem is real. See [archive message 1](conversation-archive.md#message-01-user).

The useful outcome discussed was that someone can still complete the intended task when their available space, input, or operating context changes. Readability and fitting content into a rectangle are part of that outcome; so are reachable actions, usable navigation, preserved work, and appropriate platform behavior.

This ambition is deliberately broad:

| Environment or change | Concern raised or developed in the discussion |
|---|---|
| Phones and tablets | Ordinary/full-screen layouts, orientation, keyboards, readable controls. |
| Foldables | Folded and unfolded configurations, usable regions, hinges, and continuity of work. |
| Ultrawide, tall, portrait, and landscape displays | Rearrangement and readable content without treating every model as a separate design. |
| Curved displays | Determine whether curvature creates a relevant constraint; avoid assuming every curved panel requires special layout logic. |
| Cars | Allocated display regions and permitted interaction may change with operating state. |
| TVs | Task completion through remote navigation and focus, beyond visual fit. |
| Projectors | Readability in the actual viewing environment, including distance and lighting. |
| Changes during use | Resizing, split-screen, rotation, keyboard appearance, input changes, and supported operating-mode changes. |

The table describes the ambition and concerns, not a claim that a first release supports every row.

## Why documented device information matters

The user repeatedly pointed out that product descriptions, specifications, manuals, and platform documentation already provide dimensions, resolutions, and usage scenarios. They proposed giving that knowledge to AI so it can prepare intelligently. That is an affirmative part of the idea, not something the project should discard. See [message 11](conversation-archive.md#message-11-user), [message 38](conversation-archive.md#message-38-user), and the additional speech preserved in [message 42](conversation-archive.md#message-42-user).

The discussion developed two complementary roles:

- **Documented profiles** can supply source-backed configurations, units, capabilities, expected states, and useful tests before a device is available.
- **Runtime observations** describe the actual window, visible area, insets, input, or restrictions that the running platform exposes.

These roles complement each other. A hardware specification is not automatically a measurement of an app's current usable area. Likewise, a running browser's width measurement does not make source-backed test preparation unnecessary. [Concepts](concepts.md) explains the units and platform boundaries.

## Two distinct failure classes

The user's later clarification sharpened the problem: an app that is broken when opened at the device's ordinary/full-screen size is a different case from an app that breaks while resizing or folding. The first can often be anticipated using documented configurations. The second needs observation before, during, and after a transition.

For example, a save control may be unreachable immediately after launch on a known display. A different app may fit perfectly on launch, then lose an unsaved draft after unfolding. A project that checks only resizing can miss the first failure; one that compares only independent screenshots can miss the second. Both belong in [the proposed validation strategy](validation.md).

## What the user asked AI to contribute

The user challenged the implication that adaptation depends on humans manually designing every version: “Can't AI do anything about it?” See [message 7](conversation-archive.md#message-07-user).

The resulting proposal gave AI a substantial role: extract constraints from documentation, retrieve relevant platform references, author or inspect adaptation rules, choose scenarios, generate and run tests, evaluate results, and revise failures. Ordinary layout engines can apply resulting rules as conditions change; continual model inference on every resize is not inherently required.

This is a proposed division of responsibilities, not a decided runtime architecture. It leaves room for research into generated interfaces while requiring evidence for any claimed benefit.

## Existing work changes the opportunity

The user correctly challenged an initial search that underplayed published skills and multi-file agent packages. Later inspection found direct matches, especially Impeccable's adaptation/audit workflows and Google's Android adaptive skill, alongside Playwright's testing infrastructure. The project should begin from that corrected finding. [Existing work](existing-work.md) records the comparison and its limits.

The opportunity discussed is therefore **maintained knowledge, explicit coverage, and reproducible evidence across supported conditions**. It is not established that another package is needed, that no comparable work exists, or that a single agent can reliably solve every case. Those remain matters to demonstrate.

## Open-source direction

The user explicitly intends to make this open source: [message 42](conversation-archive.md#message-42-user). They then requested multiple Markdown documents preserving and organizing the entire available conversation in the current local project directory: [message 46](conversation-archive.md#message-46-user).

A **proposed charter**, offered during the discussion, is:

> Help developers and AI agents verify that an interface remains usable across supported display configurations and changes during a task.

That wording has not been adopted as a formal specification. Nor has the user selected a license, publication destination, package name, initial adapter, or release scope. The working directory retains its existing spelling, `responsivness`; that does not settle the project's eventual public name.

The [proposed architecture](proposed-architecture.md) and [next steps](decisions-and-next-steps.md) make the candidate approach concrete while leaving these choices open.
