# tabbar-missing-after-keyboard-close

**Failure class:** keyboard + size change — a one-time height read that is never re-read. The app caches
`innerHeight` at load as "the keyboard-closed height", hides the bottom tab bar when the viewport shrinks
(legitimate while the keyboard is up) and shows it again only when `innerHeight` is exactly the cached value.
Any size change between keyboard-open and keyboard-close (rotation, Split View, unfold) makes the closed height
differ from the cache, so the tab bar never returns. Navigation is lost although the DOM is intact.

**Real-world instances (docs/research/04 §1.2):** ionic-team/ionic-framework #31642 "ion-tab-bar stays hidden
after keyboard closes once window height changed" (2026-10-23) is this exact shape. Same family as dotnet/maui
#39263 (Shell tab bar never re-evaluates after a size-class change), expo/expo #42294 (dimensions frozen at
launch size) and avalonia #22089 — the "one-time size or height change that is never re-read" pattern.

**How foldproof emulates it:** both variants declare `interactive-widget=resizes-content`, so the adapter uses
`keyboard-shrink` (427×876 → 427×576); the keyboard persists through the rotation (900×375 → 900×100), then
keyboard-close restores 900×375. Steps 1 and 2 assert nothing — hiding the tab bar under the keyboard is
legitimate; the oracle speaks only at keyboard-close.

**What foldproof must report:** broken/ fails `reachable` on step 3 (keyboard-close) for `#tab-profile` only —
`"Profile" is not reachable: not visible; outside the viewport after scrollIntoView (rect
{"x":0,"y":0,"w":0,"h":0}, viewport 900x375); …` — while `#q` stays reachable and `no-element-loss` passes for
`#tab-profile`, `#q` and `role=navigation` (the nav is hidden with `display: none`, not removed; role and
accessible name are still present). fixed/ passes every rule.

**The fix:** never compare against a cached height. Derive "keyboard is up" from the current viewport relative
to the current screen on every resize (`innerHeight < screen.height * 0.75`), or do not hide the bar at all and
let `position: fixed; bottom: 0` ride up with the shrinking layout viewport.
