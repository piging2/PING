# IG Following-list empty-render: evidence package 2026-09-19

Directive: keep troubleshooting now, read-only first, identify the exact failure boundary.
Raw diagnostic artifact: `ig-following-diag-2026-09-19.result.json` (same directory).
Diagnostic script: `~/workspace/pig-fb/ig-following-diag.js` (strictly read-only: no clicks on Follow/Following/Unfollow/suggested, page closed on exit).

## Narrowest proven failure boundary

Instagram's following-list data endpoint is returning HTTP 302 (redirect) instead of the
following-list payload for this session. Instagram's own dialog UI therefore renders its
genuine empty state in the "People you follow" section, and only the separately-fetched
"Suggested for you" section populates. Every downstream worker behavior (enumeration,
exact-text "Following" gating, 3-miss stop, zero actions) was correct.

Failing endpoint (observed twice, both the initial page fetch):
`GET https://www.instagram.com/api/v1/friendships/286617703/following/?count=12` -> 302

## What proves it [EMPR]

Read-only diagnostic run 2026-09-19T15:02:35Z-15:04:05Z against the live ig-profile Chrome (CDP :9226):

| Phase | Observation |
|---|---|
| profile_header | Header shows "3,544" following; login gate healthy (Home nav present) |
| direct_url_nav | Direct navigation to /nolanpigi/following/ opens ZERO dialogs (confirms worker comment: IG no longer opens the dialog on direct URL nav) |
| click_open_t2s | Header-link click opens the dialog (dialogCount=1); "People you follow" section already shows Instagram's own text "Once you follow people, you'll see them here."; 0 profile links |
| click_open_t8s | 24 profile links, button counts {"Follow": 24}, ZERO "Following" buttons; empty-state text still present |
| scroll_hydration | 12 scrolls (snapshots at 3/6/9/12): link count frozen at 24, scrollHeight frozen at 2051, no new rows |
| sustained_t20s | +20s wait: identical, no late hydration |
| close_reopen | Escape + re-click: identical, 24 Follow rows, empty-state text present |
| net | 15 graphql/api responses ok; exactly 2 failures, both 302 on the following-list endpoint above |

Five independent observation windows (fresh open, timed waits, scroll sequence, sustained
wait, close/reopen) all show the identical state. The "empty" is Instagram's UI declaring
the section empty, not the worker terminating observation early.

## Hypothesis adjudication

1. Instagram surface/UI loading failure: SUPPORTED (server-side). The dialog shell loads;
   the list-data request is redirected and never populates the section.
2. DOM/render timing failure: FALSIFIED. t+2.5s, t+8s, 12 scrolls, +20s, close/reopen all identical.
3. Virtualized/infinite-list hydration failure: FALSIFIED. Scroller is real (scrollHeight 2051
   > clientHeight 309, scrollTop moves), but there is no data to virtualize.
4. Wrong dialog/container/selector: FALSIFIED. dialogCount=1 with the exact "Following |
   Search | People you follow" structure the worker targets; worker selectors match live elements.
5. Stale browser state: FALSIFIED. Fresh page and close/reopen reproduce identically.
6. Stale session/cookies: FALSIFIED. loginOk=true, header count renders, 15 other API calls return ok.
7. CDP/browser transport issue: FALSIFIED. CDP :9226 healthy; every evaluate/scroll succeeded; network events observed.
8. Pagination/scroll enumeration issue: FALSIFIED. 12 scrolls, zero new rows, scrollHeight constant.
9. List requiring additional interaction before rows hydrate: FALSIFIED for legitimate
   read-only interaction. Scroll (the standard hydration trigger) changes nothing.
10. Data through another legitimate UI/API-backed surface: OPEN but immaterial. The
    legitimate surface for this worker path is the endpoint above; it is the one failing.
11. Account/session-specific Instagram behavior: POSSIBLE, not falsified. Consistent with a
    soft throttle of this session's following-list fetch.
12. Worker enumeration logic defect: FALSIFIED. The worker's enumerateFollowing would find
    exactly what the diagnostic found (24 suggested links match the profile pattern); the
    exact-text "Following" gate correctly refused all of them ("button-not-found" x3 ->
    "3 consecutive failures; stopping"). Zero actions was the correct outcome.
13. Transient Instagram-side degradation: POSSIBLE, leading hypothesis. The 07:13 MDT
    recovery test enumerated OK ("enumerate ok" in ig-capability-state.json); by ~09:02 MDT
    the endpoint 302s. Header count still renders, so the account data exists server-side.

## What "empty" means (proven)

Genuinely zero Following rows rendered by Instagram's UI. Evidence: Instagram's own
empty-state sentence is present in the "People you follow" section in every snapshot, and
the button census is {"Follow": 24} with zero "Following" buttons. This is not "zero rows
observed before enumeration terminated."

## Reconciliation notes

- Header "3,544" vs dialog "0 following rows": irreconcilable through any observed surface
  right now; the 302 on the list-fetch endpoint is the mechanism.
- Diagnostic-script limitation (not IG evidence): per-row button association in rowSamples
  came back empty-string while the aggregate button census is authoritative ({"Follow": 24},
  confirmed by the dialog text head showing "| Follow |" after each name).
- State discrepancy: `instagram-unfollow/state.json` last_batch text still describes the
  pre-recovery BROWSER_WEDGE; `pig-fb/ig-capability-state.json` shows AVAILABLE since
  2026-09-19T13:13:01Z via the full-chain recovery test. The campaign state text is stale.

## Actions taken / not taken

- Taken: 7-phase read-only diagnostic; evidence recorded; zero mutations.
- Not taken (per directive and safety invariant): no clicks on Follow/Following/Unfollow or
  suggested accounts; no canary (enumeration is not safe, so the governed path forbids it);
  no browser restart/close (forbidden: the 2026-09-16 force-kill lost the session); no
  selector broadening; no gate weakening; no "try again tomorrow" deferral of diagnosis.
- Next re-test point for the transient hypothesis: the scheduled batch 2026-09-20 07:02 MDT,
  which opens with enumeration before any action.
