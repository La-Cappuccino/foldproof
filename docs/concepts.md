# Responsiveness, adaptation, and constraints

[Start here](../README.md) · [Vision](vision.md) · [Proposed validation](validation.md) · [Sources](sources.md)

Recorded 28 October 2026. This document organizes the discussion and supplied research. It describes concepts and platform boundaries; it does not establish an implemented system or certify device support.

## What the user means by responsiveness

The discussion began with a correction: the subject is **interface adaptation**, rather than how quickly a service replies. A responsive interface must remain useful as the space, shape, input method, or operating context changes. The broad ambition includes phones, tablets, foldables, ultrawide and tall displays, curved displays, portrait and landscape orientations, car screens, TVs, and projectors.

Fitting content inside a rectangle is one part of that problem. A control can fit and still be unreadable at viewing distance, inaccessible by remote, obscured by a keyboard, or inappropriate while driving. The [vision](vision.md) preserves this wider scope.

## Responsive and adaptive are overlapping approaches

Responsive web design commonly uses flexible sizing, wrapping, grids, and breakpoints to react to available space. Adaptive interfaces can also change composition or interaction: for example, switching between one pane and two panes, or changing navigation when space and inputs change. These terms do not impose a universal implementation boundary. Adaptive design does not inherently mean identifying a device through its user-agent string.

An application usually does not need a database of device models to choose an ordinary web layout. It needs rules appropriate to the content and the constraints its environment exposes. However, viewport width is not the only useful input:

| Signal | What it can help decide | Qualification |
|---|---|---|
| Viewport width and height | Reflow, pane arrangement, overflow, short-height handling | A browser window may occupy only part of a physical display. |
| Container size | How a component adapts within a sidebar, pane, or embedded region | Container queries let a component respond to its own available space. |
| Input capabilities | Hover behavior, pointer target treatment, keyboard alternatives | Capability queries are not reliable device identity. Multiple inputs can coexist. |
| User preferences and accessibility settings | Motion, contrast, text scale, zoom, and readable presentation | Support and the exact observable settings vary by platform. |
| Insets and visible area | Placement around system UI, cutouts, keyboards, and occlusion | Layout and currently visible viewport may differ. |
| Posture, hinges, and display features | Avoiding an obstructed region or arranging panes | Available APIs and browser support must be checked; absence is not proof of a flat device. |
| Platform operating restrictions | Which tasks and interactions are available in a vehicle or another constrained context | Consume the platform's supported restrictions; do not derive policy from width. |

These distinctions are grounded in [responsive web design guidance](https://web.dev/articles/responsive-web-design-basics), [CSS container queries](https://www.w3.org/TR/css-conditional-5/), [media features](https://www.w3.org/TR/mediaqueries-4/), and the evolving [Device Posture specification](https://www.w3.org/TR/device-posture/). A specification's existence does not establish support on every target.

### Correction to the competing explanation

The user supplied an external explanation during the conversation. Its useful central point was that ordinary responsive CSS can react to the available browser space without a device-model database. The later discussion corrected two overstatements: viewport width is not the sole relevant signal, and adaptive design is not synonymous with user-agent sniffing. The original user-supplied text is preserved in [archive message 23](conversation-archive.md#message-23-user); the written corrections appear in [message 25](conversation-archive.md#message-25-assistant) and [message 26](conversation-archive.md#message-26-assistant). See the [conversation narrative](conversation-narrative.md) for the readable chronology.

One specific correction matters for generated rules: `hover: none` does **not** establish that a device has a touchscreen. It describes the primary input's ability to hover; other input capabilities may coexist. Use capability observations for the behavior they actually describe. See [Media Queries Level 4](https://www.w3.org/TR/mediaqueries-4/).

## Documented profiles are useful knowledge

The user repeatedly pointed out that product pages, device specifications, manuals, and scenario documentation already publish dimensions, resolutions, configurations, and behavior. That is a valid proposed source of knowledge for AI-assisted preparation. It should not be discarded because runtime measurement also matters.

The two sources of knowledge serve different purposes:

| Documented profile | Runtime observation |
|---|---|
| Describes a known device, platform, or scenario, with provenance and applicable version. | Describes the constraints currently exposed to the running application. |
| Helps select test cases before hardware is available and identify ordinary launch configurations. | Helps choose layout and behavior for the current window, visible region, inputs, or restrictions. |
| May include physical dimensions, panel resolution, published modes, or a known hinge. | May include CSS viewport dimensions, native window bounds, insets, or supported display-feature information. |
| Can be incomplete, outdated, or expressed in units unsuitable for direct layout use. | Can be incomplete too: an ordinary browser cannot observe every hardware or vehicle-state signal. |

A useful proposed profile records the source URL, retrieval date, hardware and software scope, units, confidence, assumptions, and unknowns. It must distinguish published values from derived values and measured values. If a published profile disagrees with a live observation, retain the discrepancy as evidence rather than silently forcing the current environment to match the profile. The [proposed architecture](proposed-architecture.md) explains how profiles could be packaged.

### Units are part of the evidence

- **Physical pixels** describe the panel's hardware resolution. Physical inches describe its dimensions. Neither is automatically the application's usable layout width.
- **CSS pixels** are the web layout unit. A device's pixel density, browser configuration, scaling, and zoom affect the relationship to physical pixels. A mobile viewport declaration also affects web layout behavior. See [MDN's viewport reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport).
- **Android density-independent pixels (`dp`)** describe native layout space. Record native measurements in their actual units; do not relabel panel pixels as `dp` or assume a universal conversion to CSS pixels.
- **Layout viewport and visual viewport** can differ when zoom or an on-screen keyboard changes what is visible. See the [Visual Viewport API](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).

A panel resolution alone does not establish a reproducible browser test. A test needs the applicable layout-space dimensions and configuration, or an explicitly qualified approximation.

## Two distinct failure classes

The user explicitly separated an application that is already broken at its ordinary full-screen size from an application that breaks during a change. Both belong in the project:

1. **Startup or steady configuration:** launch directly in the documented configuration and check the task, content, controls, and input behavior. An app that starts with an unreachable Save button is defective even if no resize occurs.
2. **Transition:** begin a task, then resize, rotate, fold, unfold, open the keyboard, change input, or enter another supported operating state. Check usability and preservation of the user's work afterward and, where relevant, during the change.

These are distinct test classes, not necessarily separate layout implementations. A responsive rule may fix both; preserved navigation, focus, draft state, or playback may require additional application behavior. See the [validation strategy](validation.md).

## Platform boundaries

| Context | Relevant concerns | Boundary to preserve |
|---|---|---|
| Web windows and embedded components | Flexible layout, container queries, width and height, zoom, keyboard occlusion, available input | Use supported browser observations; a device name cannot stand in for current window geometry. |
| Android phones, tablets, and foldables | Window size, adaptive panes and navigation, system insets, folding features, state preservation | Native APIs and framework requirements differ from web APIs. Actual hinge bounds matter; do not assume equal halves. |
| Curved displays | Usable area, viewing conditions, and content readability | Physical curvature alone does not require a folded or segmented layout; some curved screens use ordinary continuous layouts. |
| Cars | Allocated app regions, supported app categories, permitted tasks, platform UX restrictions | Android Automotive guidance does not create access to Tesla dashboard APIs. A size change or gear value alone is not a complete policy signal. |
| TVs | Readability at distance, directional navigation, remote focus, focus visibility, Back behavior | A large browser screenshot does not establish remote usability. |
| Projectors | Projection area, content density, contrast, distance, and room conditions | A viewport can approximate geometry; it cannot certify a projected image in a physical room. |

Android's [adaptive-app guidance](https://developer.android.com/develop/adaptive-apps/guides/get-started-with-adaptive-apps), [system insets guidance](https://developer.android.com/develop/ui/compose/system/insets), and [different-screen testing guidance](https://developer.android.com/training/testing/different-screens) describe platform-specific tools. [TV navigation guidance](https://developer.android.com/training/tv/get-started/navigation) and [driver-app templates](https://developers.google.com/cars/design/create-apps/apps-for-drivers/build-with-templates) add interaction concerns beyond resizing.

### The Tesla example

The user's Tesla example illustrates an application receiving a different usable region and behavior changing between parked and driving contexts. The percentages mentioned in the conversation were illustrative, not verified allocations or requirements.

The inspected [Tesla Model 3 manual](https://www.tesla.com/ownersmanual/model3/en_gb/GUID-518C51C1-E9AC-4A68-AE12-07F4FF8C881E.html) describes dynamic car-status/visualization presentation and a full-screen Park view; details vary with model, region, and software. [Tesla's third-party access documentation](https://www.tesla.com/support/access-third-party-apps) concerns vehicle data and commands. It does not establish a native dashboard layout SDK for arbitrary websites.

A web application can react to the viewport it receives. Vehicle-state permissions require a separate, supported integration. Android Automotive apps should consume applicable [UX restrictions](https://developer.android.com/training/cars/parked/automotive-os); an [Android Automotive emulator](https://developer.android.com/training/cars/testing/emulator) is not a Tesla simulator.

## Where AI fits

AI can extract documented constraints, retain source provenance, propose layout rules, select scenarios, generate tests, run supported tools, inspect screenshots and interactions, and report failures with evidence. It can also make incorrect inferences or overlook missing coverage, so generated rules and test results need observable checks.

Ordinary layout engines can apply authored rules automatically as space changes. AI inference on every resize is not inherently required. The proposed value is maintained knowledge, useful adaptation work, and trustworthy validation. Existing packages already cover parts of this workflow; see [existing work](existing-work.md) before assuming a new universal system is needed.
