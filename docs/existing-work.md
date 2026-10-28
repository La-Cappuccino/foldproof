# Existing skills, agents, tools, and evidence

[Start here](../README.md) · [Conversation narrative](conversation-narrative.md) · [Source register](sources.md) · [Validation strategy](validation.md)

**Research snapshot: 28 October 2026.** This document organizes the source inspection reported in the project conversation. The documentation task did not install or independently execute any of the packages below. Public test code and CI were inspected during that research; those observations must not be described as locally reproduced application results.

## Corrected conclusion

Dedicated adaptation skills and multi-file agent packages already exist. The initial answer focused too narrowly on platform primitives and general testing tools. The user challenged that answer, pointing to published skills, agent files, and supporting Markdown references. The broader investigation found direct matches, particularly Impeccable and Google's Android adaptive skill.

The corrected conclusion governs this project's thematic documents. The [conversation archive](conversation-archive.md) preserves the earlier answer and its correction as part of the discussion's evolution.

The evidence supports a real engineering problem and substantial existing work. It does not establish that one published skill reliably adapts every application to every display, input method, posture, and operating state. A possible contribution for this project is consistent scenario coverage and inspectable behavioral evidence. That remains a proposition to demonstrate, rather than an established advantage over existing tools.

## What the evidence establishes

| Evidence level | What it can establish | What it does not establish |
|---|---|---|
| Package existence | A repository or curated entry is published. | That its instructions are suitable or effective. |
| Source inspection | Actual instructions, references, agents, helpers, and declared scope can be read. | That an agent follows them reliably in practice. |
| Package and infrastructure tests | Retrieval, generation, compilation, harnesses, or integrations work under their tested conditions. | That the target application is usable across the required scenarios. |
| Application behavior checks | A particular task, layout, or transition passed explicit checks in a stated environment. | Untested states, physical hardware, or all applications. |
| Independent effectiveness evaluation | Measured detection or repair performance on a stated dataset and method. | Universal correctness or validation of unrelated skill packages. |
| Physical-device and contextual validation | Observations from named hardware, real input, or a permitted operating environment. | Coverage of devices or conditions that were not exercised. |

These are different types of evidence, not a single score. A source-review skill can be valuable without executing a browser. A successful screenshot workflow can be useful without verifying gestures. A green CI run is evidence only for the jobs and assertions that actually ran.

## Direct adaptation matches

### Impeccable

[Impeccable](https://github.com/pbakaus/impeccable) was the closest broad adaptation-and-audit match inspected. Its actual package contains a [core skill router](https://github.com/pbakaus/impeccable/blob/main/skill/SKILL.src.md), [web adaptation guidance](https://github.com/pbakaus/impeccable/blob/main/skill/reference/adapt.md), [native adaptation guidance](https://github.com/pbakaus/impeccable/blob/main/skill/reference/adapt.native.md), an [audit workflow](https://github.com/pbakaus/impeccable/blob/main/skill/reference/audit.md), and [specialist agent files](https://github.com/pbakaus/impeccable/tree/main/skill/agents).

The inspected guidance covers screen constraints, orientation, input methods, and usage context. It explicitly distinguishes layout/screenshot evidence from completed touch-gesture evidence. That distinction matters: seeing a control on a narrow capture does not prove that its interaction works.

The inspected [browser workflow tests](https://github.com/pbakaus/impeccable/blob/main/tests/skill-workflow-browser.test.mjs), [full-build workflow](https://github.com/pbakaus/impeccable/blob/main/tests/skill-workflow/full-build.test.mjs), and [assertion helpers](https://github.com/pbakaus/impeccable/blob/main/tests/skill-workflow/assertions.mjs) provide meaningful package/workflow evidence. The browser harness captures desktop at 1440 × 1000 and mobile at 390 × 844. Those two captures are not a comprehensive screen or transition matrix.

The LLM workflow CI suite is manually opted in and billed. Ordinary CI success does not establish that this suite ran. The research found no independently verified universal responsiveness benchmark for this package.

### Google's Android adaptive skill

[The Android adaptive skill](https://github.com/android/skills/blob/main/jetpack-compose/adaptive/SKILL.md), reported updated on 24 October 2026, is a direct Android-specific match. Its supporting references cover adaptive navigation, panes and grids, desktop input, folding, screenshot previews, and preservation of navigation, scroll, and playback state.

The workflow requires Compose throughout and Navigation 3. Some prescribed APIs and screenshot tooling are experimental; adopting them would require checking current compatibility. The [tabletop reference](https://github.com/android/skills/blob/main/jetpack-compose/adaptive/references/foldable-tabletop.md) retrieves actual hinge bounds rather than treating a fold as two equal halves. Its [screenshot-testing reference](https://github.com/android/skills/blob/main/jetpack-compose/adaptive/references/android/studio/preview/compose-screenshot-testing-with-testsuites.md) supplies concrete testing guidance.

The skill's description names TV, Auto, and XR, but the inspected workflow did not contain complete TV-focus or driving-policy matrices. A broad description cannot substitute for those behavior checks. No published effectiveness score was found for this specific adaptive skill.

### wshobson responsive-design

[The responsive-design skill](https://github.com/wshobson/agents/blob/main/plugins/ui-design/skills/responsive-design/SKILL.md) is an actual instruction/reference bundle addressing container queries, fluid typography, grids, navigation, and responsive tables. It is a direct instructional match for web layout work.

Its [evaluation documentation](https://github.com/wshobson/agents/blob/main/evals/README.md) describes work in progress, including LLM judges not validated against human labels. The research found no established responsiveness success rate for this skill.

## Execution and QA workflows

| Package | Inspected capability | Evidence and practical boundary |
|---|---|---|
| [OpenAI Playwright Interactive](https://github.com/openai/skills/blob/main/skills/.curated/playwright-interactive/SKILL.md) | Persistent desktop/mobile browser and Electron QA; inventories of controls, states, and claims; functional and visual checks; screenshots and explicit viewport-fit checks. | The actual curated listing was queried successfully. It supplies a concrete QA workflow, not a predefined universal fold/car matrix. App-specific tasks and suitable environments remain necessary. |
| [Playwright Test Agents](https://playwright.dev/docs/test-agents) | Planner, generator, and healer agents that explore an app, plan tests, produce executable tests, and repair tests. | Actual agent source, infrastructure tests, and a successful public MCP CI run were inspected. These establish functioning infrastructure, not a measured responsiveness-defect detection rate. |
| [Anthropic webapp-testing](https://github.com/anthropics/skills/blob/main/skills/webapp-testing/SKILL.md) | Python server helper and three examples for testing local web applications. | Useful executable support. The inspected package did not supply a default responsive/fold/car scenario matrix or an independent effectiveness evaluation. |
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Real references, datasets, Python generators, and a skill entry point. | Inspected retrieval/data regression tests and a preview browser smoke test do not establish correctness across widths, touch, or fold transitions. |
| [Vercel web-design-guidelines](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) | Source-review wrapper that retrieves current design guidance. | Useful review guidance; it is not itself a browser test runner. |

Playwright's [emulation](https://playwright.dev/docs/emulation) and [visual snapshots](https://playwright.dev/docs/test-snapshots) are useful building blocks. Setting viewport or emulated input properties does not certify physical hinges, real gestures, car restrictions, or projector viewing distance.

Playwright's healer can repair tests and may skip tests that persistently fail. A green repaired suite therefore requires inspection: it may reflect a changed test rather than a fixed application. Preserve the original failure and explain changed assertions or skipped coverage.

The research opened [a successful Playwright MCP CI run dated 28 October 2026](https://github.com/microsoft/playwright/actions/runs/40634207805), containing seven jobs, and inspected [agent initialization](https://github.com/microsoft/playwright/blob/main/tests/mcp/init-agents.spec.ts), planner, and generator infrastructure tests. This is public CI evidence, not local execution or an independent detection benchmark.

## Evidence that the underlying problem persists

### Bounded research

[ReFLAIR at FSE 2026](https://conf.researchr.org/details/fse-2026/fse-2026-research-papers/63/ReFLAIR-Detecting-Responsive-Layout-Reflow-Issues-using-Multimodal-Generative-AI) evaluates AI-assisted detection of information and functionality lost during web reflow. The conference abstract reports 24 webpages and comparisons with five techniques. This is measured research on a specific detection problem, not an evaluation of the skills listed above or a universal repair system.

A research agent read the [author-hosted PDF](https://seal.ics.uci.edu/publications/2026_FSE.pdf) and reported an expanded dataset; the parent conversation's PDF fetch timed out. The documentation does not combine the abstract's dataset with PDF results, quote improvement percentages, or treat the two versions as identical.

### Developer and user records

| Record | Status reported in the 28 October research | Interpretation |
|---|---|---|
| [Mindwtr foldable issue #1192](https://github.com/dongdongbh/mindwtr/issues/1192) | Open issue from 10 September, with implementation progress on 15 September. Emulator checks were recorded; physical foldable, iOS, and additional accessibility coverage remained outstanding. | Concrete maintainer evidence of work and validation gaps. It is not an independent product audit. |
| [Evernote foldable complaint](https://www.reddit.com/r/Evernote/comments/1xe1xfz/evernote_doesnt_switch_layouts_on_foldables/) | Firsthand report dated 24 October of layouts failing to switch through folding. | A useful signal and candidate scenario. It was not independently reproduced and does not establish prevalence. |
| [Flutter/Wonderous large-screen retrospective](https://flutter.dev/blog/developing-flutter-apps-for-large-screens) | Published 26 September 2023; describes fixes for fold/unfold state loss, split-screen letterboxing, and keyboard-focus issues. | Historical examples of real failure modes and repairs. These must not be presented as current unfixed Wonderous bugs. |
| [Multica issue #6539](https://github.com/multica-ai/multica/issues/6539) | Bot-authored report on 6 August with DOM measurements; closed as fixed on 7 August. | A historical fixed case. The reported measurements were not independently executed during this research. |
| [UI Bench](https://ui-bench.dev/) | Community benchmark whose responsiveness check uses static viewport/media-query/flex/grid signals. | Static signals do not establish fold-transition, hinge, or driving-context correctness. Do not conflate it with similarly named academic work. |

These sources make the problem concrete without proving how common every failure is. The discussion requested credible research and developer/user perspectives; no NIH result was established in the supplied research. Engineering-specific primary research supplied the bounded academic evidence.

## AI-generated UI is adjacent evidence

[Google's generative UI research](https://research.google/blog/generative-ui-a-rich-custom-visual-interactive-user-experience-for-any-prompt/) demonstrates generation of custom interactive interfaces. [Microsoft Project Solara](https://commandline.microsoft.com/project-solara-build-2026/) was discussed as an early platform effort exploring adaptation across sizes and interaction methods. Neither source establishes universal responsiveness correctness or independently validates the packages above.

## Implications for the proposed project

Build on existing work before duplicating it. A proposed first investigation is to choose an existing adaptation workflow, run it against known startup and transition failures, and keep the resulting evidence. The project could then identify missing scenarios, adapters, or assertions with actual examples.

The [proposed architecture](proposed-architecture.md) combines a small core skill, retrieved platform references, sourced/versioned scenarios, adapters, and observable acceptance tests. Neither that architecture nor any particular dependency has been approved as an implementation requirement. See [decisions and next steps](decisions-and-next-steps.md).
