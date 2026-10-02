
## Fix 2 (2026-09-23 ~21:00 MDT): menu-button selector was an unverified assumption
- The 20:32 tick still failed to open the dialog with the "fixed" scripts.
- Root cause: the menu-button selector `[aria-label^="More options for <title-prefix>"]`
  assumed FB's aria-label format. That format was never verified; diag6 only confirmed
  two "More options" controls exist, not their exact label text. The prefix selector
  matched nothing -> menuBtn null -> Escape -> 3 attempts -> ABORT, deterministically.
- Fix: match loosely with `getByLabel(/more options/i)`, scoped to the listing row
  first (avoids the thumbnail's zero-size button), page-wide fallback only if the
  row-scoped search finds nothing. First non-zero-size hit wins either way.
- Runner hardening: re-check Pig-side fb-engage worker AFTER the slow deploy, right
  before enumerate. An engagement pass launched mid-tick (as happened ~20:30) would
  otherwise collide with enumeration. Fail closed = exit quietly, retry next tick.
- Also noted: run_pass.sh (pid 119907) died while its Pig-side engage.js kept running,
  leaving a stale fb-chrome.holder and a released flock. The Pig-side process-name
  check is the real backstop; the local lock alone is not sufficient.
- Not yet proven: corrected enumerate has still not completed a live run (browser
  busy with meta-pass.sh at time of fix). Next tick will deploy and retry.

## Handoff ordering note (2026-09-23 ~21:20 MDT)
- Received a STALE handoff for the 19:53:58 tick (ran 20:00:23), AFTER the
  20:23:58/20:32:25 handoff. It claims "9th consecutive failure" and "Avalon row
  not visible," flagging a genuine decision point.
- Assessment: the report predates the 21:00 menu-button selector fix, so its
  "blind retries unlikely to self-heal" conclusion does not account for the repair.
  The run_history (F F S S F S S F F S) does not support "9 consecutive" either.
  The "row not visible" observation is questionable: diag6 found the row live at
  ~20:20, and the old menu-button bug produces an identical external signature
  (ABORT dialog not opened). Escalating to Nolan on stale pre-fix evidence would
  be premature.
- Decision: hold escalation. The next tick deploys the fixed enumerate script and
  retries. If the fixed script also fails to open the dialog, THAT is the genuine
  decision point (fix proven insufficient) and gets surfaced.
- Browser busy at 21:20 (Pass 105 engage.js PID 3132 + meta-pass Pig-side PID 40516);
  no live test possible this turn. Local lock holders (14291, 11969) both stale.

## Four stacked bugs found and fixed (2026-09-23 ~23:30-23:55 MDT)
Live verification after the 23:27 tick still failed with the 21:00 fix:

1. MENU BUTTON SELECTOR (21:00 fix, enumerate only): the exact-prefix
   `[aria-label^="More options for <title>"]` assumption never matched.
   Replaced with `getByLabel(/more options/i)`, row-scoped then page-wide,
   first non-zero-size. BUT the action script had its OWN copy of the old
   selector in openDialog() — fixed there too (was missed at 21:00).

2. CHECKBOX SELECTOR (diag7): the dialog has ZERO `input[type="checkbox"]`
   and FIFTY `div[role="checkbox"]`. Both scripts used the input selector.
   Changed to `div[role="checkbox"]` in enumerate + action (enumerate and
   setChecked paths).

3. LABEL EXTRACTION (diag8/diag9): the enumerate passed a Playwright Locator
   (`dlg`) as an evaluate() arg. Locators are not serializable -> evaluate
   throws -> caught -> label always ''. Diag9 proved the checkbox div's OWN
   innerText holds the row text ("Group Name\n4.1K members\n...").
   Replaced with direct `cb.evaluate(el => el.innerText)` in both scripts
   (deleted the broken boxOf walker).

VERIFIED LIVE 23:55 MDT: enumerate returns RESULT ok rows=50 checked=0,
all 50 with real labels (group name + member count + visibility).
`checked=0` for all: no checked/pending groups in the dialog, so the
"uncheck 3 pending" leg will be a no-op; the picker will select up to 3 new
local groups by member count.

NOT YET VERIFIED end-to-end: the action leg (check boxes, Post, re-verify).
A Facebook engagement pass (run_pass.sh pid 23140) started at 23:32 MDT and
holds the browser; the runner correctly failed closed. Next tick deploys the
fixed scripts and runs the full flow. If THAT fails, it is the genuine
decision point.

## Tick 2026-09-24 05:23 MDT: second consecutive post-fix enumerate failure
- Same fixed scripts deployed OK (sha256 verified both), enumerate printed
  "RESULT: ABORT dialog not opened" -> enumerate failed, exit 1.
- Post-fix consecutive-failure count: 2. The selectors were verified live at
  23:55 MDT (rows=50, checked=0), so two back-to-back "dialog not opened" aborts
  point at the dialog-open step (menu button timing/page state), not the
  checkbox/label selectors. Still transient-plausible; the body's escalation
  criterion is repeated failures across 6+ ticks, not yet met. Next tick retries.
- Decision: hold escalation. If post-fix failures reach 6 consecutive, or a
  Facebook warning/checkpoint appears, surface as a genuine decision point.

## Tick 2026-09-24 08:23 MDT: third consecutive post-fix enumerate failure
- Same fixed scripts deployed OK (sha256 verified both), enumerate printed
  "RESULT: ABORT dialog not opened" -> enumerate failed, exit 1.
- Post-fix consecutive-failure count: 3. Selectors verified live 23:55 MDT
  2026-09-23 (rows=50, checked=0); failure signature is the dialog-open step
  (menu button timing/page state), not the fixed selectors. Transient-plausible;
  escalation criterion is 6+ consecutive post-fix failures, not yet met.
- Decision: hold escalation. Surface to Nolan if post-fix failures reach 6
  consecutive, a Facebook warning/checkpoint appears, or fewer than 3 eligible
  new groups are found. Next tick retries per body.

## Tick 2026-09-24 08:53 MDT: fourth consecutive post-fix enumerate failure
- Same fixed scripts deployed OK (sha256 verified both), enumerate printed
  "RESULT: ABORT dialog not opened" -> enumerate failed, exit 1.
- Post-fix consecutive-failure count: 4. Selectors verified live 23:55 MDT
  2026-09-23 (rows=50, checked=0); failure signature is the dialog-open step
  (menu button timing/page state), not the fixed selectors. Transient-plausible;
  escalation criterion is 6+ consecutive post-fix failures, not yet met.
- Decision: hold escalation. Surface to Nolan if post-fix failures reach 6
  consecutive, a Facebook warning/checkpoint appears, or fewer than 3 eligible
  new groups are found. Next tick retries per body.
## Tick 2026-09-24 11:53 MDT: fifth consecutive post-fix enumerate failure
  Scripts deployed to Pig and sha256-verified OK; enumerate aborted with
  "RESULT: ABORT dialog not opened" (same as ticks 05:23/08:23/08:53).
  Groups-done marker still absent. Escalation criterion is repeated failures
  across 6+ ticks, not yet met. Next tick retries per body.
## Tick 2026-09-24 15:33 MDT: sixth consecutive post-fix enumerate failure
- Same fixed scripts; enumerate printed "RESULT: ABORT dialog not opened" ->
  enumerate failed. No DONE marker, no group changes.
- Post-fix consecutive-failure count: 6. Failure signature remains the
  dialog-open step (menu button timing/page state), not the checkbox/label
  selectors verified live 23:55 MDT 2026-09-23. The 6+ tick escalation
  criterion is now MET. No Facebook warning/checkpoint observed on any tick.
- Decision: surface to Nolan as a genuine decision point. Options: keep
  retrying blind, Nolan manually opens the dialog once, or deeper
  investigation of the dialog-open step. Cron left running pending his call.

## 2026-09-24 ~15:37 MDT: ABANDONED per Nolan
- Nolan: "give up the marketplace listing it's good enough."
- car-listing-groups-retry cron removed. Listing stays as-is; no further
  group cross-post attempts. 6 consecutive post-fix dialog-open failures was
  the last observed state; no Facebook warning/checkpoint ever appeared.
