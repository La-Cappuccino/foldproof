# 05 - last30days social signal

Captured 2026-10-28 by research-last30days. Two runs of the `/last30days` engine (v3.11.0), reproduced verbatim below, followed by the raw file paths. Run 1 is the main GENERAL query; run 2 is a cheap `--quick` companion on foldable layout complaints from the user side.

Raw files (engine output plus the WebSearch Supplemental Results appendix):

- `<local-last30days-dir>/ai-agent-skills-for-responsive-and-adaptive-ui-testing-on-foldables-and-large-screens-raw-v3.md`
- `<local-last30days-dir>/foldable-phone-app-layout-problems-raw-v3.md`

Engine invocation artifacts: `<local-tmp>/` (plan JSONs, engine stdout/stderr, run script).

---

## Run 1: AI agent skills for responsive and adaptive UI testing on foldables and large screens

Targeting: `--github-repo=pbakaus/impeccable,android/skills,microsoft/playwright --subreddits=androiddev,webdev,Frontend,reactnative,FlutterDev,ClaudeAI,ChatGPTCoding,GalaxyFold,PixelFold,LocalLLaMA --tiktok-hashtags=foldable,responsivedesign,webdev` plus a 4-subquery plan (primary, impeccable/frontend-design, Android adaptive, Playwright responsive).

🌐 last30days v3.11.0 · synced 2026-10-28

What I learned:

**Platform vendors shipped the foldable skills themselves this month** - The most concrete signal is Apple's App Resizability skill in Xcode 27.1, which [codewithbeto](https://www.instagram.com/reel/DeptPaOjOFx/) on Instagram says "caught issues I missed in my text-to-speech app": "A foldable can expose assumptions that have been sitting in your code for years: a fixed screen width, layout decisions based on orientation, or a check that treats every wide screen as an iPad." It exports to any coding agent with `xcrun agent skills export`. On the Android side, [android/skills](https://github.com/android/skills) (10.0K stars, live) ships a jetpack-compose/adaptive skill that Android Studio Agent Mode installs into `.skills/`, and Google I/O 2026 demoed a Studio agent that makes a UI adaptive automatically, per [Google I/O](https://io.google/2026/explore/technical-session-41).

**Impeccable is the web-side default, and /audit is the responsive gate** - [pbakaus/impeccable](https://github.com/pbakaus/impeccable) sits at 91K stars (live) and describes itself as "1 skill, 24 commands, live browser iteration, and 62 deterministic detector rules for AI-generated frontend design." [@FReza1984](https://x.com/FReza1984/status/2115308533772439586) summarises the workflow: "/critique reviews hierarchy and clarity; /audit checks accessibility, performance, and responsive quality; /polish runs the shipping pass." Its responsive reference covers mobile-first, fluid layouts, container queries, breakpoints and touch targets, per [Emelia](https://emelia.io/hub/impeccable-ai-design-skill).

**Playwright is the test harness, but foldables are a fixture, not a first-class target** - [microsoft/playwright](https://github.com/microsoft/playwright) is at 99K stars. The community skills built on it treat foldables as one more viewport: fcakyon's playwright-testing skill delegates to a responsive-tester agent across 7 breakpoints (375px to 1536px) flagging horizontal overflow and small touch targets, and pramoddutta's playwright-mobile-web skill adds a Galaxy Fold folded-state fixture, per [Playbooks](https://playbooks.com/skills/fcakyon/claude-codex-settings/playwright-testing). One analysis argues AI visual-regression tools are trained on flat-screen data and miss fold-seam issues, so a real or near-real foldable still belongs in the loop, per [mobileviewer](https://mobileviewer.github.io/ai-responsive-design-testing-2026).

**Android 17 turned "adaptive" from nice-to-have into a mandate** - Android 17 (API 37) ignores screenOrientation, resizeableActivity and aspect-ratio restrictions on displays over sw600dp, games exempt, with a practical deadline of August 2027 for API 37 targeting, per [Android Developers](https://developer.android.com/about/versions/17/changes/ff-restrictions-ignored). The official Flutter and Dart skills encode the same rule for agents: size from window space, never from device type or orientation, and never lock orientation because it letterboxes on foldables, per [DEV Community](https://dev.to/sayed_ali_alkamel/flutter-agent-skills-how-to-make-your-ai-agent-actually-good-at-flutter-3831). Community skills standardise on compact under 600, medium 600-840, expanded 840+.

**The vibe-coding crowd tests at 375px and stops there** - [@astr_oit](https://www.tiktok.com/@astr_oit/video/7701638858248604980) on TikTok: "Looks perfect on desktop. Then Claude says 'now open it on mobile.' ... Save this: test at 375px wide." [@tatiana.digital_](https://www.tiktok.com/@tatiana.digital_/video/7701051766544010528) makes the same point: "Everything that survives on a 375 px screen is what your users actually need. Desktop just gets more room to breathe." Nobody in the TikTok corpus mentions a fold posture, a tablet, or an expanded window class.

**Developer mood is wary of agents touching layout unsupervised** - r/webdev's top threads this month are [Manager thinks anything can be coded in 1 hour or less with AI](https://www.reddit.com/r/webdev/comments/1xh3ks9/manager_thinks_anything_can_be_coded_in_1_hour_or/) (356 pts) and [what's your process for blast radius containment when AI code breaks something?](https://www.reddit.com/r/webdev/comments/1xhjnc0/whats_your_process_for_blast_radius_containment/), while Hacker News carried Trail of Bits' [AI agent fixed the bug, but what else did it change?](https://blog.trailofbits.com/2026/10/21/your-ai-agent-fixed-the-bug-but-what-else-did-it-change/) and Ars Technica's [AI coding agents generate more code, but not more software](https://arstechnica.com/ai/2026/10/ai-coding-agents-generate-more-code-but-not-more-software/) (365 pts, 314 cmt). The practical read: responsive skills that verify (screenshots, detector rules, breakpoint sweeps) land better with this crowd than skills that only generate.

KEY PATTERNS from the research:
1. Vendor-authored foldable skills now exist on both platforms: Apple App Resizability (Xcode 27.1, exportable via xcrun) and android/skills jetpack-compose/adaptive - per [codewithbeto](https://www.instagram.com/reel/DeptPaOjOFx/) on Instagram
2. Size from window space, never from device type or orientation; orientation locks letterbox on foldables and Android 17 ignores them on sw600dp+ anyway - per [Android Developers](https://developer.android.com/about/versions/17/changes/ff-restrictions-ignored)
3. Impeccable's /audit plus 62 deterministic detector rules is the de facto responsive gate for web agents - per [@FReza1984](https://x.com/FReza1984/status/2115308533772439586)
4. Playwright skills converge on a 7-breakpoint sweep (375 to 1536px); foldables appear only as a Galaxy Fold fixture, never as posture or hinge states - per [Playbooks](https://playbooks.com/skills/fcakyon/claude-codex-settings/playwright-testing)
5. AI visual regression is weak on fold seams; keep an emulator or real device in the loop and keep un-run device checks explicit - per [mobileviewer](https://mobileviewer.github.io/ai-responsive-design-testing-2026)
6. Vibe-coders test at 375px and declare victory; large-screen and foldable states are absent from the TikTok corpus - per [@astr_oit](https://www.tiktok.com/@astr_oit/video/7701638858248604980) on TikTok

---
✅ All agents reported back!
├─ 🟠 Reddit: 15 threads │ 11,758 upvotes │ 2,595 comments
├─ 🔵 X: 6 posts │ 21 likes │ 4 reposts
├─ 🔴 YouTube: 2 videos │ 16,160 views │ 1/2 with transcripts
├─ 🎵 TikTok: 4 videos │ 1,107 views │ 30 likes
├─ 📸 Instagram: 1 reel │ 1,773 views │ 58 likes
├─ 🟡 HN: 12 storys │ 2,054 points │ 1,233 comments
├─ 🐙 GitHub: 3 items │ 199,864 stars │ 296 comments
├─ 🗣️ Top voices: @inSec8386, @FReza1984, @MR_0FFICIALL │ r/webdev, r/LocalLLaMA, r/androiddev
└─ 📎 Raw results saved to ~/Documents/Last30Days/ai-agent-skills-for-responsive-and-adaptive-ui-testing-on-foldables-and-large-screens-raw-v3.md
---

---
I'm now an expert on AI agent skills for responsive and adaptive UI testing on foldables and large screens. Some things I can help with:
- Map which of Apple App Resizability, android/skills adaptive, and Impeccable /audit checks a given skill should borrow for a web-first responsive tester
- Design a Playwright sweep that adds fold posture and 600/840dp window classes on top of the standard 375 to 1536px breakpoints
- Dig into why the Flutter skills forbid orientation locks and what the Android 17 compat flag changes for testing

I have all the links to the 15 Reddit threads, 6 X posts, 2 YouTube videos, 4 TikTok videos, 1 Instagram reel, 12 HN stories, and 3 GitHub items I pulled from. Just ask.

---

## Run 2 (--quick): foldable phone app layout problems

Targeting: `--quick --subreddits=GalaxyFold,PixelFold,androiddev,Android,foldables,webdev --tiktok-hashtags=foldable,galaxyzfold,pixelfold` plus a 2-subquery plan (user complaints, developer side).

🌐 last30days v3.11.0 · synced 2026-10-28

What I learned:

**iPhone Duo launched and reset the foldable-app conversation** - r/GalaxyFold's biggest thread of the month is a [24-hour iPhone Duo review from a Fold 8 owner](https://www.reddit.com/r/GalaxyFold/comments/1xe06eg/iphone_duo_24_hour_review_from_a_long_time/) (1,241 pts, 583 cmt). [u/not_the_common_mate](https://reddit.com/r/GalaxyFold/comments/1xe06eg/comment/19rl0bu2fyv8l/) (71 upvotes) nails the layout gap with a side-by-side of Readwise Reader: "Both phones have an 'unoptimised' version. But you see how Samsung ensured the app actually functions?" [u/Elegant-Ferret-8116](https://reddit.com/r/GalaxyFold/comments/1xe06eg/comment/19rkywc4dhswz/) (202 upvotes) sets the tone: "And yet in 5yrs people will say apple 'invented the foldable!'" On X, [@Joshua_WD](https://x.com/Joshua_WD/status/2113618066709840132) framed launch day as "Screen Sizes No iPhone Has Had. What to Check in Your App and Site."

**Users are tired of automatic adaptation masking lazy apps** - [We should demand more from app developers](https://www.reddit.com/r/GalaxyFold/comments/1xc0uq2/we_should_demand_more_from_app_developers/) (272 pts, 127 cmt) argues: "if the system assumes and adapts layouts automatically, it will never be as optimized as intended, users accepting this half baked adaptation means developers will not invest time in fixing it."

**The classic complaints are still the classic complaints** - F1 TV "squeezing multiview into a little 16:9 box on my Pixel Fold" drove one user to build [Apexview](https://www.reddit.com/r/GalaxyFold/comments/1xfmjtv/f1_tv_sucks_on_folding_phones_so_i_made_my_own_app/), a free open-source player with "up to 4 feeds anywhere on the screen, any size, with edges that snap together," cross-posted to r/PixelFold. Off Reddit the same shapes recur: Facebook stuck on the inner-screen layout after folding, per [TechIssuesToday](https://techissuestoday.com/facebook-app-layout-broken-on-foldables-fix); Discord "keeps showing chats and sidebars as if it were still twice as wide" after a fold or split-screen, per [Discord Support](https://support.discord.com/hc/es/community/posts/19290961918359-Layout-for-folding-phones-is-unoptimized); Bambu Handy scaling "obnoxiously large" on the unfolded screen, per [Bambu Lab Forum](https://forum.bambulab.com/t/folding-phone-app-issues/130084).

**Hope that Duo optimizations trickle down to Android foldables** - [When do we think iPhone Duo app optimizations will carry over to the Z Fold?](https://www.reddit.com/r/GalaxyFold/comments/1xdn6qx/when_do_we_think_iphone_duo_app_optimizations/) (53 cmt): "I've seen so many apps getting optimized for the Duo in the unfolded mode, and I'm wondering when (or if) we can expect app developers to port those layouts over to the Z Fold?"

KEY PATTERNS from the research:
1. "Unoptimised" means two different things: Samsung's system-level stretch keeps apps functional, Apple's letterbox exposes them - per [u/not_the_common_mate](https://reddit.com/r/GalaxyFold/comments/1xe06eg/comment/19rl0bu2fyv8l/)
2. Video and multiview trapped in a 16:9 box is the most-cited concrete failure on the inner display - per [r/GalaxyFold](https://www.reddit.com/r/GalaxyFold/comments/1xfmjtv/f1_tv_sucks_on_folding_phones_so_i_made_my_own_app/)
3. "Stuck layout after fold or unfold" (Facebook, Discord) is a state-transition bug, not a breakpoint bug - per [Discord Support](https://support.discord.com/hc/es/community/posts/19290961918359-Layout-for-folding-phones-is-unoptimized)
4. Users explicitly reject automatic adaptation as a substitute for real two-pane layouts - per [r/GalaxyFold](https://www.reddit.com/r/GalaxyFold/comments/1xc0uq2/we_should_demand_more_from_app_developers/)
5. The Duo launch is expected to pull Android foldable optimization along with it - per [r/GalaxyFold](https://www.reddit.com/r/GalaxyFold/comments/1xdn6qx/when_do_we_think_iphone_duo_app_optimizations/)

---
✅ All agents reported back!
├─ 🟠 Reddit: 6 threads │ 1,622 upvotes │ 841 comments
├─ 🔵 X: 2 posts │ 84 likes │ 3 reposts
├─ 🗣️ Top voices: @rodydavis, @Joshua_WD │ r/GalaxyFold, r/foldables, r/PixelFold
└─ 📎 Raw results saved to ~/Documents/Last30Days/foldable-phone-app-layout-problems-raw-v3.md
---

---
I'm now an expert on foldable phone app layout problems. Some things I can help with:
- Turn the Facebook and Discord "stuck after fold" reports into a fold/unfold state-transition test case
- Derive a 16:9-in-a-box detector for video and multiview surfaces from the F1 TV and Apexview thread
- Compare how Samsung's stretch and Apple's letterbox should each be simulated in a responsive test harness

I have all the links to the 6 Reddit threads and 2 X posts I pulled from. Just ask.
