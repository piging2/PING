# Escalation classifier training corpus: Batch 6 (2026-09-26, Nolan's adjudication)

Source: `batch6-owner-disposition.md`, section "Batch 6 as classifier training data".
Lesson: not "Nolan answered 37 questions" but "which of these 37 should ever have interrupted Nolan?"
Status: 37 entries classified, zero artificial batch targets. The next batch is organic: it
returns exactly the questions that survive the classifier, even if that number is 0.

Entries marked `[classifier-assigned; disposition silent]` were not placed by the disposition
itself; the lane classified them using the disposition's adjudication text, and flagged them.

## The four classes

- TRUE_OWNER_AUTHORITY: money, publication, credentials/access, privacy posture, legal/business
  commitment, or genuine owner taste that evidence cannot resolve. The only class that may interrupt Nolan.
- CONSTITUTION_ALREADY_ANSWERED: a locked invariant, axiom, or prior Nolan decision resolves it.
  Resolve in-system via grill-20 checks 1-2. Never re-ask.
- NEEDS_RESEARCH_EVIDENCE: the question cannot be answered responsibly yet, but the next step is
  evidence gathering (measurement, classification work, professional/legal counsel), not an owner guess.
- PREMATURE_DEFAULT_SUFFICIENT: a >=80% safe default exists, or the question is premature
  (no product proof, no real customer, no measured signal). Decide in-system with the default.

---

## TRUE_OWNER_AUTHORITY (10)

Q13 PRICING TIERS: money commitment from a new business; disposition holds because pricing is
product discovery from real customer conversations, which only Nolan can conduct.

Q14 PING WEBSITE PUBLICATION: publication is listed as an external effect in the CONSEQUENCE
CLASS dimension; disposition requires explicit publication authorization.

Q15 FYD LAUNCH ANNOUNCEMENT: announcement timing is a publication and external-effect decision
tied to product proof readiness; disposition accepts the hold as the owner's call.

Q16 CUSTOMER MARKETING CONSENT POLICY (PORTFOLIO CONSENT): consent as capability/evidence with
revocation propagation to projections is a privacy posture decision only the owner sets.

Q24 REAL FIRST-CUSTOMER TERMS (MONUMENT VIEW TRIAL): scope, duration, data use, publication,
exit, and cost for a real first customer are a legal/business commitment, Nolan's signature class.

Q25 LICENSING POSTURE (PROPRIETARY HARVEST): keep-options-open vs proprietary harvesting with
dependency provenance and license-compatibility obligations is a business/licensing commitment.

Q32 BRAND BOUNDARIES: partially human taste by disposition; the conservative default auto-applies,
but brand-specific additions are reserved to Nolan.

Q33 ASK FYD IDENTITY [classifier-assigned; disposition silent]: the concierge's product voice and
honesty posture ("never impersonate owner/person"; distinguish fact from generated suggestion)
is genuine owner taste; disposition accepts it as YES.

Q35 PERSONAL-PROFILE OUTREACH (EXPAND SOCIAL TARGETING): disposition holds business-only; scope of
Nolan's own personal profile as an outreach surface is owner marketing judgment.

Q36 AUTONOMOUS PROSPECT REPLIES: disposition grades reply classes (FAQ factual vs pricing vs
contract vs complaint); delegating Nolan's own voice to autonomous replies is a commitment/taste
decision.

## CONSTITUTION_ALREADY_ANSWERED (11)

Q1 DISPATCH CONVERGENCE (MISSION CONTROL CUTOVER): disposition defaults to the narrow
MissionIntent contract (validate, authorize, dispatch, observe) with incremental migration;
that is O1/O2 (Mission Control projects authority) already decided.

Q2 MISSION WRAPPING (ENGAGEMENT AS MISSIONS): disposition corrects the model (engagement pass =
mission with child observations/decisions/receipts) per the existing mission/event architecture;
a modeling correction, not a new decision.

Q3 HERMES CAPABILITY PROGRESSION: disposition authorizes consequence classes, not "Hermes
generally"; that is O4 (Hermes executes, does not govern) plus the CONSEQUENCE CLASS dimension,
already decided.

Q4 HOST MUTATION (PIG ENVIRONMENT MUTATION): disposition defaults to policy classes (ephemeral
sandbox allowlisted = automatic; host install = approval required), a delegation structure from
O9/O11, not a per-case ask.

Q5 JEV AUTHORITY (JEV PROMOTION): O3 decides it directly (Jev classifies, does not authorize);
disposition only adds the calibrated promotion-rung mechanism under pre-authorized policy.

Q6 APPROVAL DELEGATION: disposition rejects "Nolan forever" and applies the standing
delegation primitive (explicit, scoped, revocable, expiring) from the batch-6 O1-O17 additions.

Q7 AUDIT SEMANTICS (AUDIT APPEND-ONLY): disposition accepts with the standing split (immutable
audit metadata vs erasable payload); decided by the constitutional correction, not tonight.

Q27 APPROVAL BINDING (APPROVAL SURFACE): disposition resolves two surfaces with the existing
model (chat and Mission Control present the SAME ApprovalRequest; neither surface owns approval).

Q28 SILENCE (APPROVAL TIMEOUT): the O-series law "POLICY CAN AUTHORIZE; SILENCE CANNOT" decides
it; disposition confirms HOLD as default with EXPIRE_* policies.

Q31 BATCH MECHANISM (37-QUESTION BATCHES) [classifier-assigned; disposition silent]: its
adjudication converts into standing operating law (classifier-only; optimize human decisions per
unit of consequence), which future runs apply directly instead of re-asking.

Q34 TENANCY: disposition answers with tenant/owner-scoped data model plus current single-tenant
enforcement and isolation tests before a second tenant; the tenancy stance was already established.

## NEEDS_RESEARCH_EVIDENCE (8)

Q8 IDENTITY STORAGE IMPLEMENTATION (OWNER IDENTITY STORE): disposition rejects the "Pig only"
prescription and demands minimizing stored evidence, so the implementation must be researched
against data-minimization guidance before any owner decision.

Q11 BACKUP DESTINATION (OFFSITE BACKUP): disposition requires backing up canonical
history/config plus a proven restore; the next step is evidence gathering on what is canonical
and restorable.

Q17 RETENTION DURATIONS (OBSERVATION RETENTION): disposition accepts lifecycle states
(ACTIVE/STALE/SUPERSEDED/SUPPRESSED/ERASURE_REQUESTED/ERASED) but refuses arbitrary durations;
durations need legal/operational evidence, not an owner guess.

Q18 CONVERSATION RETENTION DETAILS (VISITOR CONVERSATION VISIBILITY): disposition modifies to
purpose-limited classes (EPHEMERAL Q AND A / LEAD / SERVICE REQUEST / OWNER-HANDOFF /
SYSTEM DIAGNOSTIC); the detail work is classification research.

Q19 CURRENT DATA EGRESS (DATA LEAVING DEVICE): disposition replaces the blanket ban with a
data-classification by destination matrix (PUBLIC/OWNER/CONFIDENTIAL/SECRET/REGULATED), which
requires measuring actual egress first.

Q20 EXACT AI DISCLOSURE REQUIREMENTS (AI DISCLOSURE): disposition rejects the blanket banner
and asks for legal/product evidence distinguishing generated content from agentic interaction.

Q21 ENTITY STRUCTURE (LLC): disposition calls it a business/legal decision for qualified
counsel; resolved with professional advice, not architecture judgment.

Q23 TRADEMARK STRATEGY (TRADEMARK): disposition holds for clearance before investing in the
final brand; needs legal research later.

## PREMATURE_DEFAULT_SUFFICIENT (8)

Q9 LINKEDIN: disposition holds; not relevant to current product proof, no decision needed.

Q10 PUBLIC MC ACCESS (OFF-TAILNET MISSION CONTROL): disposition holds public exposure; the safe
default (authenticated private control channel; Tailscale as current implementation) already stands.

Q12 NUMERICAL POST-SPRINT CEILING (SPEND POLICY): disposition accepts but replaces fixed numbers
with the budget-capability primitive (token/money/wall-clock/tool-call budgets); no owner number
needed.

Q22 EXACT LEGAL PACKET MECHANICS (LEGAL PACKET): disposition separates product-research pilot
from commercial service; full packet mechanics wait for commercial launch.

Q26 NOTIFICATION EXPANSION (APPROVAL CHANNEL): disposition says use current chat/feed and
measure missed approvals and latency first; designing notification infrastructure from taste is
premature.

Q29 GENERALIZED CHALLENGE HANDLING (2FA WAIT POLICY): disposition generalizes to
AUTH_CHALLENGE_DETECTED to WAITING_HUMAN_AUTH for any provider; the existing pattern suffices,
no Instagram-specific carve-out.

Q30 UNIVERSAL INCIDENT ACTION (INCIDENT RESPONSE): disposition replaces "delete promptly" with
a classify-then-respond matrix (DELETE/CORRECT/APOLOGIZE/ESCALATE/NO_ACTION); no universal owner
action required.

Q37 FINAL TRIAL INFRASTRUCTURE (MONUMENT VIEW INFRASTRUCTURE): disposition accepts the pilot
default (FYD-owned temporary hostname) with conditions tied to owner value/authorization;
no infrastructure decision needed now.

---

## Classifier guidance

### Decision procedure (apply in this order)

1. CONSTITUTION FIRST (grill-20 checks 1-2): does a locked invariant, axiom (O1-O17), SOUL
   principle, or prior Nolan decision already decide this? If yes, resolve in-system. Never re-ask.
2. RESEARCH/EVIDENCE (grill-20 checks 3-4): can code/runtime evidence, measurement,
   classification work, or professional counsel resolve it? If yes, do that work; do not ask Nolan
   to guess.
3. PREMATURE-CHECK (grill-20 check 5): is there a >=80% safe default, or is the question
   premature (no product proof, no real customer, no measured signal)? If yes, decide in-system
   with the default. Never interrupt Nolan to pick numbers or design infrastructure from taste.
4. TRUE OWNER AUTHORITY LAST (grill-20 checks 6-10): only when the effect is irreversible,
   external, or boundary-crossing (money, publication, credentials, privacy posture,
   legal/business commitment, genuine owner taste) does the question survive to Nolan, and then
   only as the narrow question the failed check protects.

### Target behavior: organic batches, never padded

A batch returns exactly the questions that survive steps 1-4, even if that number is 0.
Mission Control optimizes HUMAN DECISIONS PER UNIT OF CONSEQUENCE, not NUMBER OF QUESTIONS
GENERATED. The success state is: the classifier knows the 35 questions it does not need to ask,
surfaces the 2 that actually require human judgment, and can explain exactly why. The
disposition orders: DO NOT BUILD BATCH 7; no more artificial fixed-size question batches.

### Worked examples

TRUE_OWNER_AUTHORITY: "May the PING website be published?" Publication is an external effect
(step 4 fails: not reversible, external, commitment). Survives. Escalate narrowly: authorize this
exact publication, nothing broader.

CONSTITUTION_ALREADY_ANSWERED: "Should Jev be allowed to authorize missions after N verified
cases?" O3 plus the grill-20 locked invariants decide it: Jev classifies, it does not authorize;
promotion happens under pre-authorized policy. Resolve in-system with the calibration mechanism.
Never ask.

NEEDS_RESEARCH_EVIDENCE: "Which model destinations may receive owner data?" The disposition
replaces the blanket ban with a data-classification by destination matrix. Next step: measure
current egress and draft the matrix. Asking Nolan tonight would get a guess, not a policy.

PREMATURE_DEFAULT_SUFFICIENT: "Should we build a LinkedIn presence?" No product proof yet, no
measured signal; disposition holds. Safe default: hold, revisit when the product loop demands it.
Never ask.
