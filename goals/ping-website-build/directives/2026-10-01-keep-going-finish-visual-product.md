# KEEP GOING — FINISH THE VISUAL PRODUCT, THEN WIRE THE REAL SYSTEM INTO IT

Nolan directive, 2026-10-01 ~17:57 MDT. Filed verbatim.

The current direction is good.

DO NOT STOP AT "images load cleanly."

We paid for unusually good artwork. Finish turning it into an unusually good product experience.

The close bar is not:
WEBP → PAGE.

It is:
WEBP
→ EXPLANATION
→ REAL PRODUCT STATE
→ INTERACTION
→ EVIDENCE
→ ACTION.

## 1. FINISH THE CURRENT HOMEPAGE PASS FIRST

Complete the work already underway.

Do not redesign again.
Do not generate another image family.
Do not start a second visual branch.

Finish:
Continuity in hero;
Evidence in source/evidence explanation;
Knowledge in relationship/object explanation;
mobile hierarchy;
crop behavior;
interactive controls;
responsive sizing;
LCP behavior;
accessibility;
reduced-motion behavior;
/design regression;
homepage regression.

Then commit the coherent owned slice under Muse commit law.

## 2. THE HERO NEEDS TO EXPLAIN THE PRODUCT IN ~10 SECONDS

Right now the Continuity artwork is beautiful.
Make sure it also teaches.

The visitor should understand:
SOMETHING EXISTS IN THE WORLD
→ PING OBSERVES IT
→ PING UNDERSTANDS IT
→ THAT UNDERSTANDING SURVIVES ACROSS PROJECTIONS.

If the three hero controls correspond to meaningful stages, label them in product language rather than internal architecture jargon.
For example:
OBSERVE
UNDERSTAND
PROJECT
or whatever the actual product semantics support.

Selecting a stage should change more than the picture if useful:
headline/supporting sentence;
evidence/object/projection annotation;
subtle state indication.

Do not turn it into a carousel.
It should feel like inspecting one living system.

## 3. MAKE THE ART TRANSITION INTO REALITY

This is the most important improvement.

After the polished conceptual artwork, transition into an actual PING object.

The visitor should visually experience:
ABSTRACT EXPLANATION
↓
REAL OBJECT.

Show a real safe dogfood object with fields such as:
IDENTITY
LAST OBSERVED
EVIDENCE
RELATIONSHIPS
CAPABILITIES
HISTORY
PROJECTIONS.

Use existing reached data.
Do not manufacture impressive numbers.
UNKNOWN remains UNKNOWN.

This is where the site stops looking like a beautiful startup landing page and starts looking like PING.

## 4. EVIDENCE ART SHOULD RESOLVE INTO ACTUAL EVIDENCE

The Evidence artwork should not terminate with explanatory copy.

Follow it with a real claim/evidence interaction:
CLAIM
→ SUPPORT SET
→ SOURCE
→ OBSERVED AT
→ VERDICT.

Give the visitor a simple Why this? interaction.

The visual should communicate the concept.
The product interaction should prove it.

Reuse the same evidence binding used by FYD/Ask where reached.
NO DEMO-SPECIFIC EVIDENCE MODEL.

## 5. KNOWLEDGE ART SHOULD BECOME THE RELATIONSHIP EXPLORER

Same pattern.

Don't show a beautiful Knowledge illustration and then return to prose.

Transition:
KNOWLEDGE ART
→ REAL OBJECT
→ REAL RELATIONSHIPS.

Keep the interaction bounded.
We do not need a giant graph visualization.
A strong object inspector is probably better:
central object;
relationship type;
related object;
evidence;
direction;
confidence/status where already supported.

Selecting a relationship should explain why PING believes it exists.

## 6. ASK PING SHOULD BE THE PAYOFF

After the visitor has seen:
source;
evidence;
object;
relationships;
projections;
then let them interrogate the same object.

ASK PING should not feel like a chatbot embedded in the homepage.
It should feel like:
You just watched the system build this understanding. Ask it something about what you saw.

Seed a few useful questions from the actual object's supported information.
Answers remain evidence-bounded.
Supported → answer + evidence.
Partial → known versus unknown.
Unsupported → say the evidence doesn't establish it.
Conflicting → expose conflict.

The website thereby demonstrates the whole epistemic loop instead of merely claiming it.

## 7. FYD SHOULD APPEAR AS A PROJECTION, NOT A SECOND PRODUCT

Once the visitor understands the object:
show:
THIS OBJECT
→ FYD.

The generated website should visually appear as one projection of the same underlying entity understanding.
Make the connection obvious.
Source/evidence changes truth.
Owner corrections change authorized presentation.
SiteSpec determines presentation.
FYD renders the projection.

Don't explain all of that in architecture prose.
SHOW IT.

A strong transition could be:
object inspector on one side;
generated FYD page on the other;
a projection selector or simple connection between them.

## 8. THE WEBSITE SHOULD BEGIN BORROWING FROM MISSION CONTROL

Not by exposing internal operator UI publicly.
Borrow the visual language of inspectable state.

PING should increasingly look like something alive:
last observed;
evidence available;
relationships;
current projection;
known/unknown;
capability;
history.

That creates continuity between:
PUBLIC PING WEBSITE
and
MISSION CONTROL.

The public site says:
this is what PING understands.
Mission Control says:
this is what PING is doing and why.
FYD says:
this is what PING can project for an owner.

Three surfaces.
One object/evidence system.

## 9. TENANTOS: APPROVE THE NEXT ARCHAEOLOGY DECISIONS CONSERVATIVELY

The new findings are useful, but don't let TenantOS hijack the visual completion.

- Gateway rebuild: HOLD until visual slice commits unless required to prove current reached behavior.
- Mission Control rebuild: YES after visual ownership clears, because stale-journal-path diagnosis appears concrete.
- Mission schema changes: HOLD unless a reached PING mission proves the existing schema cannot represent required state.
- Placement eligibility: YES to bounded design/implementation after search-before-writing.
- /tenants unauthenticated write: SECURITY DEFECT. Close it surgically; do not turn it into tenant-management architecture.
- FYD-010: resolve/falsify before increasing private-data exposure.
- Pushes: NO.
- Vector tenancy: DEFER. One tenant. No reason to prove hypothetical vector isolation yet.

## 10. THE STALE MISSION CONTROL JOURNAL PATH IS HIGH VALUE

If Mission Control is DEGRADED because it reads a stale journal while the live gateway writes elsewhere, this is exactly the kind of convergence defect we want.

Search first.
Prove:
LIVE WRITER
→ CANONICAL JOURNAL LOCATION
versus
MISSION CONTROL
→ CURRENT READ LOCATION.

If mismatch is reproduced:
point Mission Control at the canonical reached owner.
Do not replicate/synchronize two journals.
Do not add adapter architecture.
ONE JOURNAL. ONE READ PATH.
Then rerun one real PING mission.

## 11. TENANTOS PLACEMENT SHOULD REMAIN BORING

The reported gap is:
(tenant, capability) → eligible execution target
does not yet exist.
Good.

Implement the smallest deterministic resolver only when the reached PING mission requires it.

Conceptually:
TENANT
+ REQUIRED CAPABILITY
+ ELIGIBLE TARGETS
+ POLICY
+ HEALTH
→ PLACEMENT DECISION.

The output is a decision/plan.
It does not execute.
Existing scheduler/execution authority remains responsible for authorized work.

For now:
tenant = PING.
We should be able to prove generality without inventing tenant-acme, tenant-foo, and tenant-bar.

## 12. ORCA SHOULD BECOME VISIBLE

When the visual pass is committed, I want ORCA represented in Mission Control as reasoning between intent and authorization, not as another magical agent.

Display:
HUMAN INTENT
↓
ORCA PROPOSAL
↓
REQUIRED CAPABILITY
↓
AUTHORIZATION
↓
PLACEMENT
↓
WORKER.

For ORCA's proposal expose:
objective;
evidence considered;
assumptions;
proposed next action;
required capability;
uncertainty;
alternatives if already available.

Do not expose hidden chain-of-thought.
Expose structured decision artifacts and evidence.

## 13. MISSION CONTROL SHOULD BE DESIGNED FOR A SKEPTIC

The operator's first question is not:
What are my agents doing?

It is:
Why should I believe this system?

Every consequential mission should eventually answer:
WHAT DID YOU WANT?
WHAT DID YOU KNOW?
WHAT DID ORCA PROPOSE?
WHO AUTHORIZED IT?
WHAT CAPABILITY DID IT REQUIRE?
WHERE DID TENANTOS PLACED IT?
WHAT ACTUALLY RAN?
WHAT DID THE WORKER CLAIM?
WHAT DID AN INDEPENDENT OBSERVER SEE?
WHAT HAPPENED AFTERWARD?
WHAT REMAINS UNKNOWN?
WHAT DID WE LEARN?

That should eventually be readable in one coherent mission screen.

## 14. DON'T LET THE NEW ART CREATE PERFORMANCE DEBT

We just recovered from a storage incident.
Keep visual discipline.

Measure:
total image transfer;
LCP asset;
LCP timing;
CLS;
mobile transfer;
decoded image dimensions;
duplicate asset hashes.

Preserve aspect ratios, set explicit dimensions, lazy-load below-fold assets, intentionally prioritize hero media, and avoid regenerating/duplicating good WebPs.

Don't optimize blindly.
Just don't turn three beautiful images into 30 MB of accidental product debt.

## 15. VISUAL FALSIFICATION

Before declaring the pass complete, test:
desktop wide;
laptop;
tablet-ish;
narrow mobile;
light/dark if both are supported;
reduced motion;
keyboard navigation;
slow network;
missing image;
long text;
JS disabled where graceful degradation is expected.

Look specifically for:
art swallowing content;
unreadable labels;
hero below fold;
clipped controls;
low-contrast text;
tiny tap targets;
layout shift;
animation fighting scroll;
mobile ordering problems.

Fix only reproduced problems.

## 16. COMMIT BEFORE EXPANDING

Current visual work is useful only when it becomes durable.

INSPECT STATUS
→ IDENTIFY OWNED FILES
→ TEST
→ REVIEW DIFF
→ STAGE OWNED FILES ONLY
→ COMMIT
→ REPORT SHA.

Do not absorb the surrounding dirty worktree.
Do not git add ..
Do not push.

After that commit, visual lane stops expanding unless there is a reproduced visual defect.

Then backend force returns to:
MISSION CONTROL
ORCA
PING-FIRST TENANTOS
FYD OWNER LOOP
ASK FYD.

## THE PRODUCT EXPERIENCE WE ARE AIMING AT

A visitor lands.
They see something beautiful.
The beauty explains a real concept.
The concept resolves into a real object.
The object exposes real evidence.
The evidence explains why PING believes something.
Relationships show what PING understands.
Ask PING lets them interrogate it.
FYD shows what that understanding becomes.
Mission Control shows what the system does with that understanding.
ORCA shows what it proposes next.
TenantOS shows where an authorized capability can run.
Verification shows what actually happened.
Learning shows what changed afterward.

That is one product story.
Do not split it into seven architectures.

GO.

## ADDITIONAL IMPROVEMENTS NOLAN WOULD PUSH HARD

- Make the Continuity/Evidence/Knowledge families a visual grammar, not three illustrations. If they're genuinely strong, their shapes, motion, spacing, line treatment, and state transitions should recur subtly throughout the product. Continuity can represent lifecycle/state transition; Evidence can represent support/provenance; Knowledge can represent objects/relationships. Then the site, FYD, and eventually Mission Control feel like manifestations of one system without requiring identical UIs.
- Use progressive disclosure aggressively. The homepage should not dump event sourcing, TenantOS, ORCA, evidence graphs, FYD, projections, capabilities, and journal semantics on a visitor. Start with the beautiful conceptual model. Let curiosity reveal the engineering. A senior engineer who clicks Evidence should get real evidence. A normal owner should never have to understand causation_id.
- Make every polished illustration earn a transition to proof. The key design test for the crew: What real product thing appears immediately after this artwork that proves what the artwork just claimed? If the answer is "more marketing copy," the section isn't finished.
- The central product distinction stands: don't make the WebPs the thing that makes PING seem advanced. Make the art the invitation; the startling part should be when the visitor realizes the beautiful conceptual object is backed by inspectable live state. That is much harder for competitors to imitate than a gorgeous landing page.

## COMMIT POSTURE ADDENDUM (Nolan, same message)

"I KNOW IT'S NOT BEST PRACTICES BUT I NEED YOU TO COMMIT LIKE EVERY TIME IT DOES ANYTHING"

Commit after every coherent unit of work, not just at milestones. Owned files only, never `git add .` / `-A`, never sweep unrelated dirty state, never push without Nolan's explicit word. Durability over ceremony.
