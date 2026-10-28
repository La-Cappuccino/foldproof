# Source register

[Start here](../README.md) · [Existing work and evidence](existing-work.md) · [Concepts and boundaries](concepts.md)

## Provenance and verification limits

**Recorded research date: 28 October 2026.** The sources below were reported as inspected/read-only during the parent project conversation. This register preserves that research and its qualifications. Creating these Markdown files did not independently execute tool packages, reproduce reported application defects, or validate physical hardware.

The register includes standards, platform documentation, actual skill files, supporting tests, public CI, research, and developer/user reports. These evidence types are deliberately distinguished. Links to `main`, repository directories, mutable documentation, issue status, and specifications are snapshots by date rather than pinned content. No commit SHAs or archived source copies were supplied. Re-check current source and compatibility before adoption.

The [conversation archive](conversation-archive.md) records available project conversation text, including overlapping voice transcript excerpts. It is a conversation source, not a complete audio transcript. The [narrative](conversation-narrative.md) explains the evolution and corrections without treating every earlier assistant claim as a final finding.

## Web standards and browser behavior

| ID | Direct source | Use and qualification |
|---|---|---|
| W01 | [Responsive web design basics — web.dev](https://web.dev/articles/responsive-web-design-basics) | Flexible layouts and content-driven adaptation across available space. Ordinary responsive layout does not need a device-model database. |
| W02 | [CSS Conditional Rules Level 5 — W3C](https://www.w3.org/TR/css-conditional-5/) | Container queries: an element's available container can matter independently of the browser's total width. Specification and implementation support must be distinguished. |
| W03 | [Media Queries Level 4 — W3C](https://www.w3.org/TR/mediaqueries-4/) and its [interaction media features section](https://www.w3.org/TR/mediaqueries-4/#mf-interaction) | Pointer/hover and other media features. `hover: none` is not proof of touch; primary and available inputs can differ. The section link appeared in the original conversation. |
| W04 | [Device Posture API — W3C](https://www.w3.org/TR/device-posture/) | Evolving posture specification. Do not assume universal support, that posture supplies all hinge geometry, or that every curved display requires a non-flat layout. |
| W05 | [Viewport meta element — MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport) | Browser viewport and CSS-pixel behavior. Hardware resolution and physical inches are not interchangeable with CSS pixels. |
| W06 | [VisualViewport — MDN](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) | Visible versus layout viewport, including keyboard/zoom effects. Availability and specific behavior require runtime checks. |

## Android, vehicles, TV, and Tesla

| ID | Direct source | Use and qualification |
|---|---|---|
| P01 | [Get started with adaptive apps — Android](https://developer.android.com/develop/adaptive-apps/guides/get-started-with-adaptive-apps) | Adaptive layouts and window-based behavior; distinguish Android dp from hardware pixels and web CSS pixels. |
| P02 | [Window insets in Compose — Android](https://developer.android.com/develop/ui/compose/system/insets) | Account for system UI and usable content area. |
| P03 | [Test different screen sizes — Android](https://developer.android.com/training/testing/different-screens) | Platform guidance for screen/window testing. Emulation alone does not prove real hardware behavior. |
| P04 | [Build parked apps for Android Automotive OS — Android](https://developer.android.com/training/cars/parked/automotive-os) | Consume platform UX restrictions. Do not infer permission solely from allocated size or gear. This is Android Automotive guidance, not Tesla API documentation. |
| P05 | [Build with templates — Google for Developers](https://developers.google.com/cars/design/create-apps/apps-for-drivers/build-with-templates) | Driver-facing app constraints and platform templates. Platform-specific restrictions cannot be generalized to arbitrary web pages. |
| P06 | [Design tasks — Google for Developers](https://developers.google.com/cars/design/create-apps/apps-for-drivers/design-tasks) | Source linked in the initial discussion for driver-task design. The focused later reference is P05. |
| P07 | [Test using the Android Automotive OS emulator — Android](https://developer.android.com/training/cars/testing/emulator) | Android Automotive emulator support. It is not a Tesla simulator. |
| P08 | [TV navigation — Android](https://developer.android.com/training/tv/get-started/navigation) | Directional navigation and focus; fitting a television-sized rectangle does not verify remote usability. |
| P09 | [Touchscreen overview — Tesla Model 3 owner's manual](https://www.tesla.com/ownersmanual/model3/en_gb/GUID-518C51C1-E9AC-4A68-AE12-07F4FF8C881E.html) | Dynamic car-status/visualization region and full-screen Park view. Applicability varies with model, software, and region. The user's percentages were illustrative rather than verified measurements. |
| P10 | [Access to third-party apps — Tesla](https://www.tesla.com/support/access-third-party-apps) | Vehicle data/command API access does not establish native dashboard layout SDK access or arbitrary website access to vehicle-state signals. |

## Skills as a package and evaluation method

| ID | Direct source | Use and qualification |
|---|---|---|
| S01 | [Build skills — OpenAI](https://learn.chatgpt.com/docs/build-skills) | Official explanation of skills and supporting resources. A useful package can have a small entry point and multiple retrieved files. |
| S02 | [Evaluating skills — OpenAI Developers](https://developers.openai.com/blog/eval-skills) | Guidance for evaluating skill outcomes. The existence of such guidance is not evidence that a specific adaptation package has been independently evaluated. |

## Impeccable

| ID | Direct source | Use and qualification |
|---|---|---|
| I01 | [Repository](https://github.com/pbakaus/impeccable) | Closest broad adaptation/audit package inspected. Published package existence. |
| I02 | [Core skill source/router](https://github.com/pbakaus/impeccable/blob/main/skill/SKILL.src.md) | Actual entry point and workflow structure. |
| I03 | [Web adaptation reference](https://github.com/pbakaus/impeccable/blob/main/skill/reference/adapt.md) | Adaptation across contexts and inputs; distinguishes viewport/screenshot evidence from completed gestures. |
| I04 | [Native adaptation reference](https://github.com/pbakaus/impeccable/blob/main/skill/reference/adapt.native.md) | Native-specific guidance; do not assume web and native expose the same signals. |
| I05 | [Audit reference](https://github.com/pbakaus/impeccable/blob/main/skill/reference/audit.md) | Actual audit instructions. |
| I06 | [Agent directory](https://github.com/pbakaus/impeccable/tree/main/skill/agents) | Supporting specialist-agent files; direct evidence of a multi-file package. |
| I07 | [Browser workflow tests](https://github.com/pbakaus/impeccable/blob/main/tests/skill-workflow-browser.test.mjs) | Harness captures desktop 1440 × 1000 and mobile 390 × 844. This is bounded coverage. |
| I08 | [Full-build workflow test](https://github.com/pbakaus/impeccable/blob/main/tests/skill-workflow/full-build.test.mjs) | LLM workflow suite is manually opted in and billed; ordinary CI success does not establish its execution. |
| I09 | [Workflow assertion helpers](https://github.com/pbakaus/impeccable/blob/main/tests/skill-workflow/assertions.mjs) | Inspectable assertions; package/workflow tests are not a universal responsiveness benchmark. |

## Google Android adaptive skill

| ID | Direct source | Use and qualification |
|---|---|---|
| A01 | [Adaptive skill](https://github.com/android/skills/blob/main/jetpack-compose/adaptive/SKILL.md) | Reported updated 24 October 2026. Requires Compose throughout and Navigation 3. Broad folding/state/input scope; some prescribed APIs/tooling are experimental. Description names TV/Auto/XR, but complete focus/driving matrices were not found in the inspected workflow. |
| A02 | [Foldable tabletop reference](https://github.com/android/skills/blob/main/jetpack-compose/adaptive/references/foldable-tabletop.md) | Actual hinge bounds rather than assumed equal halves. |
| A03 | [Compose screenshot testsuites reference](https://github.com/android/skills/blob/main/jetpack-compose/adaptive/references/android/studio/preview/compose-screenshot-testing-with-testsuites.md) | Concrete screenshot-testing guidance; no published effectiveness scores found for this specific skill. |

## OpenAI and Playwright

| ID | Direct source | Use and qualification |
|---|---|---|
| T01 | [OpenAI Playwright Interactive skill](https://github.com/openai/skills/blob/main/skills/.curated/playwright-interactive/SKILL.md) | Actual curated listing queried. Persistent desktop/mobile browser/Electron QA, inventories, functional/visual checks, screenshots, and viewport-fit checks. No predefined universal fold/car matrix. |
| T02 | [Playwright Test Agents documentation](https://playwright.dev/docs/test-agents) | Planner/generator/healer workflows. A healer may repair or skip a failing test; this does not establish that the app defect was fixed. |
| T03 | [Playwright agent source directory](https://github.com/microsoft/playwright/tree/main/packages/playwright/src/agents) | Actual agent package source. |
| T04 | [Playwright emulation](https://playwright.dev/docs/emulation) | Browser/device emulation capabilities and their scope. |
| T05 | [Playwright visual snapshots](https://playwright.dev/docs/test-snapshots) | Visual comparison tools; require meaningful baselines and complementary behavioral checks. |
| T06 | [Agent initialization tests](https://github.com/microsoft/playwright/blob/main/tests/mcp/init-agents.spec.ts) | Infrastructure test source. The research also inspected planner.spec.ts and generator.spec.ts in the same directory. |
| T07 | [Planner tests](https://github.com/microsoft/playwright/blob/main/tests/mcp/planner.spec.ts) | Companion infrastructure source identified in the research record; not an application responsiveness benchmark. |
| T08 | [Generator tests](https://github.com/microsoft/playwright/blob/main/tests/mcp/generator.spec.ts) | Companion infrastructure source identified in the research record; not an application responsiveness benchmark. |
| T09 | [Successful public MCP CI run, 28 October 2026](https://github.com/microsoft/playwright/actions/runs/40634207805) | Public run was independently opened during parent research: seven jobs. Verifies tooling infrastructure within that run, not AI detection effectiveness or local execution. |

## Other inspected packages

| ID | Direct source | Use and qualification |
|---|---|---|
| O01 | [Anthropic webapp-testing skill](https://github.com/anthropics/skills/blob/main/skills/webapp-testing/SKILL.md) | Python server helper and three examples. No default responsive/fold/car matrix or independent effectiveness evaluation found. |
| O02 | [wshobson responsive-design skill](https://github.com/wshobson/agents/blob/main/plugins/ui-design/skills/responsive-design/SKILL.md) | Actual instruction/reference bundle for container queries, typography, grids, navigation, and tables. |
| O03 | [wshobson evaluation documentation](https://github.com/wshobson/agents/blob/main/evals/README.md) | Evaluation work in progress; LLM judges not validated against human labels. |
| O04 | [UI UX Pro Max repository](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Actual references, datasets, and Python generators. |
| O05 | [UI UX Pro Max skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md) | Actual workflow entry point. |
| O06 | [Text-layout resilience tests](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/scripts/tests/test_text_layout_resilience.py) | Inspected retrieval/data regression tests; do not establish multi-width/touch/fold correctness. |
| O07 | [Preview end-to-end test](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/cli/tests/e2e/preview.spec.ts) | Browser preview smoke test; broader adaptation behavior remains unproven by it. |
| O08 | [Vercel web-design-guidelines skill](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) | Source-review wrapper that fetches current guidance; not a browser test runner. |

## Research and reported failures

| ID | Direct source | Use and qualification |
|---|---|---|
| R01 | [ReFLAIR — FSE 2026 conference entry](https://conf.researchr.org/details/fse-2026/fse-2026-research-papers/63/ReFLAIR-Detecting-Responsive-Layout-Reflow-Issues-using-Multimodal-Generative-AI) | FSE July 2026; UC Irvine researchers. Bounded AI-assisted detection of information/functionality lost after web reflow. Abstract reports 24 webpages and five compared techniques. Does not validate the above skills. |
| R02 | [ReFLAIR author-hosted PDF](https://seal.ics.uci.edu/publications/2026_FSE.pdf) | Read by a research agent, which reported an expanded dataset. Parent fetch timed out. Preserve this difference in access/version evidence; do not combine dataset descriptions or quote unverified improvement percentages. |
| R03 | [Mindwtr issue #1192](https://github.com/dongdongbh/mindwtr/issues/1192) | Open 10 September; progress 15 September. Emulator checks documented while physical foldable/iOS/accessibility coverage remained outstanding in the research snapshot. Maintainer record, not independent audit. |
| R04 | [Evernote foldable complaint](https://www.reddit.com/r/Evernote/comments/1xe1xfz/evernote_doesnt_switch_layouts_on_foldables/) | Firsthand 24 October complaint. Not independently reproduced; not prevalence evidence. |
| R05 | [Developing Flutter apps for large screens](https://flutter.dev/blog/developing-flutter-apps-for-large-screens) | 26 September 2023 retrospective. Describes fixed Wonderous fold/unfold state loss, split-screen letterboxing, and keyboard-focus problems. Historical failure patterns, not current unfixed bugs. |
| R06 | [Multica issue #6539](https://github.com/multica-ai/multica/issues/6539) | Bot-authored 6 August report with DOM measurements; closed fixed 7 August. Measurements not independently executed in this research. |
| R07 | [UI Bench](https://ui-bench.dev/) | Community benchmark. Static viewport/media-query/flex/grid signals do not verify fold transitions, hinges, or driving context. Do not conflate similarly named academic work. |

## AI UI-generation examples

| ID | Direct source | Use and qualification |
|---|---|---|
| G01 | [Generative UI research — Google Research](https://research.google/blog/generative-ui-a-rich-custom-visual-interactive-user-experience-for-any-prompt/) | Demonstrates generation of custom interactive interfaces. Not proof of correct adaptation across every device. |
| G02 | [Project Solara — Microsoft](https://commandline.microsoft.com/project-solara-build-2026/) | Early platform effort discussed for adaptation across display/input conditions. Do not describe as universally shipped adaptation or an effectiveness evaluation of the listed skills. |

## How to use this register

Use platform documentation for the constraints that platform actually exposes. Use package source to understand its workflow. Use tests and CI to identify exactly what was exercised. Use research for measured claims within its dataset and method. Treat unreproduced issue reports as scenario candidates until reproduced.

When a future contributor adds a device specification, product page, or manual, retain the exact source, retrieval date, platform/software applicability, measurement units, assumptions, and any transformations into test coordinates. Those sources are valuable preparation material; they do not replace live observations of the current application's usable area. The [proposed scenario design](proposed-architecture.md) and [validation strategy](validation.md) explain that division.

No source in this register was supplied as independent proof of universal responsiveness. No package installation, local package execution, physical-hardware test, repository publication, or license selection occurred as part of this documentation task.
