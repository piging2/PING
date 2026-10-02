# CEO ORDER: ENGAGEMENT ELIGIBILITY IS P0 FOR ITS OWN LANE

Issued by Nolan, 2026-10-01 ~05:19 MDT. Filed verbatim.

BRUTAL CEO MODE — MORNING PRIORITY

FOCUS CREW CONTINUES UNINTERRUPTED.

ORACLE WATCH CONTINUES AS-IS.

THE OUTREACH/ENGAGEMENT INCIDENT IS NOW P0 FOR ITS OWN LANE.

============================================================
WHAT ACTUALLY FAILED
============================================================

THE FAILURE WAS NOT:

bad browser automation.

THE FAILURE WAS:

DOCUMENTED POLICY
DID NOT BECOME
EXECUTABLE ELIGIBILITY.

Pass 173 constructed 34 intended likes containing items already known to
be ineligible:

out-of-corridor
previously blocked businesses
already-engaged pages.

Human review caught it.

2 ineligible actions still escaped.

31 were prevented.

Therefore:

HUMAN REVIEW IS CURRENTLY A SAFETY NET.

IT MUST NOT BE THE PRIMARY ENFORCEMENT MECHANISM.

============================================================
FREEZE
============================================================

Research/discovery may continue read-only.

Do not delete history.
Do not rewrite the incident.
Do not mark it closed because most actions were stopped.

============================================================
ONE AUTHORITY FOR ELIGIBILITY
============================================================

Before dispatch, EVERY candidate must pass ONE deterministic eligibility
function.

Conceptually:

candidate
+ action
+ campaign/context
+ canonical engagement history
+ suppression/block state
+ geographic/corridor policy
+ provider capability
→ ELIGIBLE / INELIGIBLE / UNKNOWN
+ reason codes.

UNKNOWN = DO NOT DISPATCH.

No notes parser gets to override it.

No pass builder gets to bypass it.

No agent gets to reinterpret it.

No browser worker receives an action that has not passed it.

============================================================
ENFORCE TWICE
============================================================

Gate #1:

PLAN TIME.

Filter the proposed batch.

Gate #2:

DISPATCH TIME.

Re-evaluate immediately before external effect because state may have
changed since planning.

This closes TOCTOU failures.

Worker accepts only an eligibility-bound action envelope.

If eligibility evidence is missing/stale:

DENY.

============================================================
PRECEDENT MUST BECOME DATA
============================================================

Search existing PING/outreach state FIRST.

Do not create another policy system if these concepts already exist.

Convert applicable precedents into structured rules/state:

BLOCKED
SUPPRESSED
ALREADY_ENGAGED
OUTSIDE_CORRIDOR
CAPABILITY_MISSING
PROVIDER_UNSUPPORTED
DUPLICATE
RATE_LIMITED
OTHER EXISTING REASONS.

Free-form notes may explain decisions.

THEY DO NOT AUTHORIZE ACTIONS.

============================================================
REPLAY PASS 173 OFFLINE
============================================================

This is the acceptance test.

Feed the exact original 34 candidates into the repaired planner.

Expected:

the known-ineligible candidates are rejected BEFORE browser execution.

Produce:

candidate
decision
reason
evidence/state used.

ZERO EXTERNAL ACTIONS during replay.

Then adversarially test:

blocked + attractive candidate
already engaged + stale note saying engage
outside corridor + agent recommendation
missing eligibility evidence
state changed between planning and dispatch
duplicate candidate
worker restart
page death
retry after ambiguous external outcome.

All must fail safely.

============================================================
THE TWO ESCAPED LIKES
============================================================

Preserve them as actual outcomes.

Do not pretend they did not occur.

Record:

INTENDED?
NO / contrary to eligibility

DISPATCHED:
YES

EXTERNAL EFFECT:
observed result

CAUSE:
eligibility enforcement absent/bypassed

Then determine through supported provider behavior whether reversal is
possible and appropriate.

DO NOT improvise additional external actions merely to "clean it up."

============================================================
IMPORTANT FYD/PING LESSON
============================================================

THIS INCIDENT VALIDATES THE CORE ARCHITECTURE.

PLAIN ENGLISH:
"Engage relevant local businesses."

AI:
understands intent and proposes candidates.

DETERMINISTIC SOFTWARE:
decides which candidates are actually eligible.

CAPABILITY/POLICY:
authorizes action.

EXECUTOR:
performs only authorized envelopes.

EVIDENCE:
records outcome.

AI NEVER GETS TO TURN:

"seems like a good prospect"

into:

"therefore click Like."

This exact architecture later powers FYD campaigns.

============================================================
DO NOT DERAIL THE PRODUCT CREW
============================================================

FOCUS crew continues building:

URL
→ evidence
→ objects
→ generated experience
→ Ask FYD
→ correction
→ customization.

DO NOT pull them into Facebook remediation.

Harvest the lesson into the common action-planning model later.

============================================================
OTHER OVERNIGHT ITEMS
============================================================

ORACLE:

leave it alone.

Current evidence says:

gateway running
DB writes blocked
journal sealed at 2,557
health 503 expected in read-only mode.

No resurrection work.

------------------------------------------------------------

DISTILL:

2 open gaps remain.

Normal work queue.

Not P0 unless they expose a new generic failure.

------------------------------------------------------------

META AI:

one confirmed prospect staged.

NO CONTACT merely because it exists.

Any external action goes through the repaired eligibility/capability
boundary.

============================================================
ACCEPTANCE
============================================================

ENGAGEMENT FREEZE may lift only after:

PASS 173 OFFLINE REPLAY:
PASS

ALL KNOWN INELIGIBLE CANDIDATES BLOCKED:
PASS

UNKNOWN FAILS CLOSED:
PASS

PLAN-TIME GATE:
PASS

DISPATCH-TIME GATE:
PASS

BLOCK/SUPPRESSION PRECEDENCE:
PASS

PRIOR ENGAGEMENT CHECK:
PASS

CORRIDOR CHECK:
PASS

DUPLICATE CHECK:
PASS

RESTART/RETRY:
PASS

AMBIGUOUS OUTCOME:
FAIL CLOSED / RECONCILE

EXTERNAL SIDE EFFECTS DURING TEST:
ZERO

Then run ONE tiny bounded real validation batch using independently
verified eligible candidates.

Not 34.

Prove the machinery first.

============================================================
CEO PRINCIPLE
============================================================

WE JUST LEARNED SOMETHING IMPORTANT:

A RULE IN A DOCUMENT IS NOT A CONTROL.

A RULE IN AN AGENT PROMPT IS NOT A CONTROL.

A HUMAN REMEMBERING THE RULE IS NOT A CONTROL.

THE CONTROL EXISTS ONLY WHEN THE EXTERNAL EFFECT CANNOT OCCUR WITHOUT
PASSING IT.

FIX THAT BOUNDARY.

KEEP THE FYD CREW MOVING.

GO.
