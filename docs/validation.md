# Proposed scenario and validation strategy

[Start here](../README.md) · [Concepts](concepts.md) · [Proposed architecture](proposed-architecture.md) · [Existing work](existing-work.md)

Recorded 28 October 2026. **This is a proposal for future implementation and evaluation.** No scenario adapter, application fixture, or executable acceptance suite has been implemented or run as part of creating these documents. The user confirmed the broad problem and open-source intent; the formats, first adapter, milestone, and acceptance gates remain open decisions.

## What a result should establish

The useful question is whether a person can complete the intended task under the supported conditions while retaining their work. Layout fit is evidence for part of that claim. Functional interaction, state preservation, platform restrictions, accessibility, and appropriate physical testing may be needed for the rest.

A proposed result should identify the app/build, platform and software versions, scenario/profile revision, relevant measurements and units, initial state, actions, expected outcome, actual observations, artifacts, and limitations. An untested condition stays untested; it should not inherit a passing status from a nearby screen size or another platform.

## Always cover startup and transitions

| Test class | Example procedure | What it can reveal |
|---|---|---|
| Ordinary/full-screen startup | Launch directly at a documented ordinary configuration with its actual usable region and input. | A broken layout, hidden action, unsuitable density, or missing navigation before any state change. |
| Other supported startup configurations | Launch directly in split-screen, portrait, a narrow window, or another supported mode. | Initialization paths that assume a large or previous window. |
| In-task transition | Start editing, unfold, resize into split-screen, show the keyboard, then continue and save. | Lost draft, navigation reset, focus loss, occlusion, or a control becoming unreachable. |
| Reverse and repeated transition | Return to the original state and repeat supported changes. | Stale measurements, duplicated panes, reset scroll, or failures that appear only after successive changes. |

The first row preserves the user's central point: a known ordinary display size deserves a direct test even if the app never resizes. Transition checks complement that test.

## Broad coverage matrix

This is a proposed inventory, not a claim that every combination can already be automated. Select combinations according to the app's tasks and explicit support scope; document why a case was selected or omitted.

| Context | Startup conditions worth selecting | Transitions and interactions | Evidence still needed beyond simple viewport emulation |
|---|---|---|---|
| Phones and tablets | Compact and expanded space, portrait/landscape, text scale, system insets | Rotation, split-screen, keyboard appearance, zoom, switching input | Device/browser behavior, actual touch and accessibility checks where claimed |
| Foldables | Supported folded/unfolded or tabletop configurations, actual available pane and hinge bounds | Fold/unfold during editing, navigation, scrolling, playback, or focus | Physical hinge/posture reporting, gestures, and device-specific lifecycle behavior |
| Desktop and resizable windows | Narrow, short, ultrawide, tall, maximized, embedded panes | Resize through breakpoints, move between displays, change scale or input | Relevant OS/window-manager and multi-display configurations |
| Curved displays | Continuous layout at the documented usable area | Window and orientation changes where supported | Physical viewing/readability effects; curvature should not be invented as a software posture |
| Car displays | Supported app region, allowed category and operating state | Supported region changes and platform restriction changes | Authorized platform integration, real restriction handling, and applicable simulator/hardware evidence |
| TVs | Large display with remote or directional input and intended text density | Navigate, open/close dialogs, scroll, return, reconnect input | Actual focus behavior, remote behavior, and readability at viewing distance |
| Projectors | Intended presentation or task configuration | Change aspect ratio, output mode, or available area | Projection distance, room lighting, contrast, and physical image readability |

Combine geometry with input, content, accessibility settings, and state. Exhaustively multiplying every value is not a practical default. A small documented set of representative and boundary cases, expanded by known failures, is a proposed starting method.

## Proposed acceptance checks

Each app should define the task and observable pass condition before an agent changes the UI. The following are candidate checks, not a universal approved specification.

| Concern | Observable check | Qualification |
|---|---|---|
| Task completion | Perform the main task with the scenario's input; confirm the expected stored or displayed result. | A visible button or plausible screenshot alone does not prove the action works. |
| Content and layout | Inspect clipping, overlap, unintended overflow, readable text, and deliberate reflow at selected boundaries. | Some horizontal scrolling is intentional; define acceptable behavior for the component. |
| Reachable controls | Reach, activate, and dismiss required controls, including after changes. | Do not remove necessary functionality just to make a screenshot fit. |
| State preservation | Compare draft content, selection where applicable, navigation, scroll, and playback before and after transitions. | Specify which state must persist and which changes are intentional. |
| Keyboard and remote focus | Traverse meaningful controls, see current focus, activate them, and leave dialogs without traps. | Order and interaction expectations depend on platform and task. |
| Touch and pointer input | Exercise relevant taps, drags, scrolling, hover alternatives, and pointer use. | A mobile viewport or touch-capability flag does not prove a gesture succeeded. |
| Safe areas and hinges | Verify required content and controls avoid actual occluded regions or use panes deliberately. | Use observed or documented hinge bounds with provenance; equal screen halves are not a safe assumption. |
| Keyboard and zoom | Open the keyboard, focus fields, zoom or scale text, and confirm required content/actions remain reachable. | Record layout-space and visible-space measurements separately where available. |
| Accessibility preferences | Check supported font scaling, motion preferences, contrast requirements, and relevant assistive interaction. | A screenshot does not establish full accessibility conformance. |
| Operating restrictions | Exercise tasks allowed by the supported platform and verify restriction changes are handled. | Do not infer permissions from viewport size, a device model, or gear alone. |
| Transition behavior | Observe intermediate and final states where temporary loss could affect the task. | Only inspecting the final screenshot can miss interruption or state loss. |

The [concepts document](concepts.md) explains units, input-query limitations, and platform boundaries. The [source register](sources.md) records the primary references underlying these proposed concerns.

## Candidate fixtures and test procedures

A first collection could include deliberately reproducible failures. Each fixture should state what is wrong, how to trigger it, how a check detects it, and the expected corrected behavior. These examples are suggestions, not implemented fixtures or independently reproduced bugs:

1. **Broken at launch:** a fixed-width form places Save outside the ordinary available area. Launch directly in that configuration and attempt the task.
2. **Transition loses work:** start a draft, switch pane arrangement, and observe content or navigation reset. Check the state before and after.
3. **Keyboard blocks the action:** focus a lower field, show the on-screen keyboard, and attempt to save without losing input.
4. **Hinge obscures a control:** place the primary action in a documented or observed occluded region. Verify usable placement in the supported posture.
5. **Remote cannot reach an action:** navigate a TV-style screen using directional focus and confirm the action is unreachable or focus is trapped.
6. **Content pressure:** use long labels, localization, long unbroken content, large text, or dense data. Confirm the task remains possible under the stated content assumptions.
7. **Restriction change:** in a supported vehicle test environment, change the exposed restriction state and verify that the app follows the platform's allowed behavior while preserving appropriate work.

A useful proposed first milestone would show both failure detection and a verified correction, together with a known limitation. Include an already-correct example too, so overly aggressive checks do not count every deliberate layout choice as a defect.

## Evidence levels and reporting

| Evidence | What it supports | What it does not establish |
|---|---|---|
| Package or skill exists | Instructions and assets have been published. | Their correctness, execution, or effectiveness. |
| Source inspected | The inspected workflow contains specific rules, helpers, or scenarios. | That an agent followed them successfully. |
| Package/infrastructure tests or public CI | Tested code paths or integration infrastructure worked within that run's scope. | Reliable detection of responsiveness defects in arbitrary apps. |
| Application behavior checked | A specified task or condition passed or failed in a recorded environment. | Untested conditions, devices, or physical interactions. |
| Independent effectiveness study | Measured performance within a defined dataset and method. | Universal coverage, or validation of unrelated packages. |
| Physical hardware checked | Observed behavior on the identified configuration and procedure. | Every version, region, accessory, viewing condition, or future release. |

An AI-generated report should preserve failures, skipped checks, uncertain judgments, and artifacts. If a test healer changes assertions, removes coverage, or skips a persistent failure, report that explicitly. A green repaired suite does not prove an application defect was fixed. This matters for [Playwright's agents](https://playwright.dev/docs/test-agents), whose inspected healing workflow can skip persistently failing tests.

Possible result labels are `pass`, `fail`, `blocked`, `not run`, and `needs physical validation`; the exact schema remains open. Keep “expected to work from source inspection” separate from “observed to pass.” No named result schema has been adopted.

## Limits of emulation

- Setting a viewport establishes a test rectangle, not the device's physical dimensions, viewing distance, actual touch gestures, or native lifecycle behavior.
- Mocked posture or hinge data can exercise an application branch. It does not certify real folding behavior, hinge sensing, or interaction on the device.
- A screenshot comparison checks recorded visual differences. Functional checks are needed to establish whether controls work and the task survives.
- An Android Automotive emulator tests that platform's environment; it does not simulate Tesla's dashboard or grant access to its APIs.
- A projected or TV-sized layout on a desktop does not establish readability in the intended room or navigation with the actual remote.
- Browser automation cannot assume access to signals the browser or host platform does not expose. Record that gap instead of inventing a measurement.

The supplied research inspected packages, source, public CI, and reported studies; it did not install or independently execute those skill packages. Those findings belong in [existing work](existing-work.md), not in a claim that this project's proposed suite has passed.

## Decisions before implementation

The [decision and next-step notes](decisions-and-next-steps.md) track the open choices: initial platform and adapter, profile/scenario format, candidate fixtures, target tasks, acceptance thresholds, evidence storage, and contribution process. A web adapter is a possible first step, while the broad platform ambition remains visible. Selecting it would not establish support for native folds, TV remotes, projectors, or driving contexts.
