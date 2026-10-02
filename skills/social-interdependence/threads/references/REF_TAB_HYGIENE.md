# REF - Tab Hygiene

Binding lesson from the Threads discovery incident (2026-09-30):
browser automation must not accumulate tabs, and must never touch the
user's tabs.

## Rules

1. One window per scan: the worker opens its OWN window
   (`Target.createTarget` with `newWindow`), never reuses an existing
   one, never opens a tab per profile.
2. Close the window when the work is done, every time, including on
   error paths.
3. Live targeting only: find the Like button by its current DOM
   signature (div[role=button] + svg title), never by cached selectors
   across DOM changes.
4. "Unlike" in the svg title means already-liked: report `already`,
   never click.
5. The harness's `TAB_HYGIENE` invariant is asserted by the adapter:
   every executor invocation must open in an isolated context and close
   it. A fixture mode that violates this fails the invariant check.

## Why it matters here

The executor boundary is the only place a browser exists in this
skill. The invariant keeps the skill's blast radius at exactly one
window, owned by the worker, for the duration of one action.
