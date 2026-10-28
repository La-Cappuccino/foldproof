# Responsiveness — project discussion and research

This project explores an **open-source effort to help interfaces remain usable across different displays, inputs, and operating states**, with AI assisting adaptation and testing. The ambition includes phones, tablets, foldables, tall and ultrawide screens, curved displays, portrait and landscape use, car displays, TVs, and projectors.

**Current state: documentation and exploration, 28 October 2026.** Open-source intent is confirmed. The package design, first platform, scenario format, milestone, and license remain proposals or open questions. This directory contains the discussion and research; it does not yet contain an implemented system.

## Read the project

| Document | Purpose |
|---|---|
| [Vision and user intent](docs/vision.md) | The problem, broad ambition, and what the user actually asked for. |
| [Conversation narrative](docs/conversation-narrative.md) | Every substantive question and correction, organized chronologically without repeated transcript deltas. |
| [Concepts and platform boundaries](docs/concepts.md) | Responsive/adaptive design, units, documented profiles, live observations, and corrections to the pasted explanation. |
| [Existing skills, agents, and evidence](docs/existing-work.md) | Actual packages, what their files provide, and what their tests establish. |
| [Proposed architecture](docs/proposed-architecture.md) | A candidate skill, references, profiles, adapters, and evidence model. |
| [Scenario and validation strategy](docs/validation.md) | Proposed tests for startup, transitions, input, state preservation, and accessibility. |
| [Decisions and next steps](docs/decisions-and-next-steps.md) | Confirmed intent, proposals, unresolved choices, and a suggested path forward. |
| [Source register](docs/sources.md) | Direct research links, inspection date, and source-specific limitations. |
| [Available conversation archive](docs/conversation-archive.md) | 55 available user and assistant message items, including overlapping voice transcripts and the full user-supplied explanation. |

For the shortest useful reading path: **vision → existing work → proposed architecture → decisions**. For the complete record, read the narrative alongside the archive.

## Two problems to keep visible

1. **Startup:** an app already fails when opened at a device's ordinary/full-screen configuration, whose dimensions may be documented.
2. **Transitions:** an app loses usability or user progress while folding, resizing, rotating, showing a keyboard, changing input, or entering a supported operating state.

Both belong in the project. A screenshot at one size cannot establish either complete task usability or correct behavior through a transition.

## How to read the evidence

The originating research inspected public documentation, package source, test code, public CI, research, and reports on **28 October 2026**. No reviewed tool package was installed or independently executed for this research. Package existence, infrastructure tests, application behavior, and independent effectiveness studies are kept separate in [the comparison](docs/existing-work.md).

The archive preserves available text, **not a complete verbatim audio recording**. Later corrections govern the thematic documents; earlier answers remain in the archive to preserve how the discussion changed. These files document an intended open-source project; they do not grant a license or claim universal device coverage.
