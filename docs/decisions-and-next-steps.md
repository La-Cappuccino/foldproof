# Confirmed intent, proposals, and open questions

[Start here](../README.md) · [Vision](vision.md) · [Proposed architecture](proposed-architecture.md) · [Validation](validation.md) · [Conversation archive](conversation-archive.md)

**As of 28 October 2026.** These are local project notes. They are not formal architecture decision records, a final specification, or a license.

## Confirmed by the user

| Intent or instruction | Conversation evidence |
|---|---|
| Explore interface responsiveness/adaptation, rather than response latency. | [Message 1](conversation-archive.md#message-01-user). |
| Keep the ambition broad across changing display shapes, devices, inputs, and contexts. | [Message 1](conversation-archive.md#message-01-user), [message 11](conversation-archive.md#message-11-user), and [message 17](conversation-archive.md#message-17-user). |
| Investigate what AI can do, including existing skills, agents, and testing systems. | [Message 7](conversation-archive.md#message-07-user), [message 17](conversation-archive.md#message-17-user), and [message 28](conversation-archive.md#message-28-user). |
| Treat documented dimensions and scenarios as useful knowledge sources. | [Message 11](conversation-archive.md#message-11-user), [message 38](conversation-archive.md#message-38-user), and transcript in [message 42](conversation-archive.md#message-42-user). |
| Preserve the distinction between failure on ordinary/full-screen launch and failure during changes. | Additional user speech in [message 42](conversation-archive.md#message-42-user). |
| Intend to release an open-source effort. | [Message 42](conversation-archive.md#message-42-user). |
| Preserve and organize the discussion into multiple local Markdown files in the current directory. | [Message 46](conversation-archive.md#message-46-user), [message 48](conversation-archive.md#message-48-user), [message 50](conversation-archive.md#message-50-user), and [message 52](conversation-archive.md#message-52-user). |

The confirmed destination is `/Users/echo/Projects/active/responsivness`. The user's repeated clarification settled the location; no further destination approval was pending.

## Findings and corrections that guide these documents

These are research conclusions or conceptual corrections, not implementation decisions:

- Published adaptation skills and multi-file agent packages exist. The assistant's initial search understated direct matches; later source inspection corrected it.
- Ordinary responsive CSS usually needs no device-model database and can react automatically through the layout engine. Width is not its only possible input, and adaptive design is broader than user-agent sniffing.
- Documented hardware/scenario profiles and runtime measurements are complementary. Units and platform access determine what can be concluded.
- Public tests and CI establish bounded facts. No reviewed package was installed or independently executed during the research, and no universal cross-device effectiveness result was established.
- Evidence supports a real engineering problem. The value of this particular proposed project still needs to be demonstrated against existing work.

See [concepts](concepts.md), [existing work](existing-work.md), and the [source register](sources.md) for support and limits.

## Proposals still awaiting a project choice

| Proposal from the discussion | Current status |
|---|---|
| Charter centered on preserving task usability across configurations and changes. | Suggested wording, not formally adopted. |
| Small core skill plus references, scenario profiles, adapters, and acceptance tests. | Candidate architecture. |
| Open specification, shared scenarios, and reproducible results as the durable core. | Suggested distribution model. |
| Known failure fixtures, one adapter, and demonstrated failing/fixed examples as the first milestone. | Suggested milestone. |
| A web adapter as an initial implementation slice. | Possible starting point, not selected. |
| Specific coverage gates, result statuses, profile fields, and comparison metrics. | Design proposals in the thematic documents. |

## Open questions

1. Which first users and tasks should the project help: developers fixing web interfaces, Android teams, agent authors, or another concrete audience?
2. Which reproducible failures establish value beyond existing skills and test workflows?
3. Which platform and test environment are available for the first demonstrable slice? Which physical devices remain unavailable?
4. What is the minimum scenario format, provenance model, and result contract that the first cases need?
5. How should runtime observation and test control be divided, and which existing tools should provide them?
6. Which supported conditions and acceptance thresholds are practical for a first release, and how will untested conditions be reported?
7. What public name, repository location, license, contribution process, and maintenance commitments should be chosen?

Open-source intent does not settle licensing. No license was selected and no repository was initialized or published in this documentation task.

## Suggested next sequence

This sequence makes the proposals reviewable; it is not authorization to begin implementation or publishing.

1. Review the [vision](vision.md), [comparison](existing-work.md), and [proposed architecture](proposed-architecture.md), then choose a first task and platform.
2. Select a few reproducible startup and transition failures; record the expected user-visible outcome for each.
3. Run an appropriate existing workflow as a baseline, retaining failures, skips, artifacts, and required human intervention.
4. Implement only the profile and adapter behavior those cases require, if the user chooses to proceed.
5. Compare results using the same cases; expand only where the evidence exposes a useful gap.
6. Choose licensing and publication details before distributing a future package.

## Documentation handoff limits

The [archive](conversation-archive.md) preserves 55 available user/assistant message items, with raw transcript overlap. Missing speech cannot be invented. Research inspections are dated to the originating work on 28 October 2026; mutable source URLs are not a frozen dependency snapshot.

The present deliverable is the linked documentation set. Package execution, physical-device validation, independent benchmark evaluation, and implementation remain future work.
