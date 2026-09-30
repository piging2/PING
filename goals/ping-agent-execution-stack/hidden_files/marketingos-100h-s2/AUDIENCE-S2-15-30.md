# MARKETINGOS SPRINT 2, BLOCK 15–30 — AUDIENCE CLUSTERS (2026-09-30)

## Method and lane law

Two clusters, built from observed behavior only. No demographics. No invented
personas. UNKNOWN stays UNKNOWN. The block's sibling deliverable
(`SIGNALS-S2-15-30.md`) produced the evidence-backed signals; this file
produces the audience half.

**What counts as observed behavior** (the only admissible sources):
1. The Pig journal, read read-only 2026-09-30 ~21:30–21:50 UTC
   (`docker exec brain-postgres psql -U postgres -d ping_runtime`; zero
   writes): mission types commissioned, INTELLIGENCE_RESEARCH questions
   posed (mission payloads), event and namespace census.
2. Nolan's verbatim binding directives on file:
   `PING-CORE-INTERROGATION-2026-09-30.md` (the 25-question charter,
   2026-09-30 ~14:07 MDT) and
   `MARKETINGOS-PLAN-NEXT-100-HOURS-2026-09-30.md` (2026-09-30 ~14:36 MDT).
3. Sprint-1 artifacts (`hidden_files/marketingos-100h/`): the attack plan,
   the falsifier attacks, the L6-style steelmans that LANDED (including
   D-F3), the self-caught fabrication record, the falsifier's nine-question
   certification.
4. The CRM/agentic harvest (`research_notes/crm-agentic-harvest-20260930/`):
   what 34 systems actually build is observed *market* behavior — usable for
   ecosystem beliefs/failure modes, explicitly NOT a proxy for our audience.

**What does NOT count:** the plan's target-audience paragraph (doctrine, not
data); the sprint-1 editorial 0-5 ratings (the falsifier's verdict: admitted
coordinator judgment); the signals worker's two audience-cluster seeds
(hypotheses, recorded as such in SIGNALS-S2-15-30.md, not materialized here —
the FYD battery's corridor businesses are the FYD lane's subjects, and this
lane consumes FYD reality as source material, not as its audience).

Epistemic status of every attribute below is stated inline: OBSERVED (with a
concrete reference) or UNKNOWN (with the observation that would resolve it).

---

## CLUSTER A — The Operator (n=1, fully observed)

**Definition.** Nolan, acting as the senior technical decision-maker and sole
approver in the loop. He charters the work, sets the evidence bar, kills
theses, and is the only human whose approval lets anything distribute (plan
block 60–70: the artifact goes out only from his explicit approval; the
sprint-1 headline remains "PARAMETERIZED — Nolan's pick pending" because he
has not picked it). Every artifact terminates at his one-line verdict:
APPROVE or DENY. He is not the external audience — he is the audience that
decides whether the external audience ever sees anything.

**Why he is a valid cluster.** The plan's audience doctrine demands the
reaction: *"These people actually built this, understand the failure modes,
measure what they claim, expose uncertainty, and teach me something I can
use."* That reaction was written FOR him, and the observed record is 30+
directives plus a 25-question interrogation program he chartered to punish
exactly the failure modes the external audience is assumed to punish. If the
material survives him, it has survived the hardest grader we can observe.

### A.1 QUESTIONS (observed)

He asks mechanism questions, never vibe questions:

1. **The 25 hostile questions** (charter, verbatim directive ~14:07 MDT).
   Representative: "What is PING, if every UI, agent name, and aspirational
   document is deleted from consideration?" / "Can PING distinguish 'we
   recorded something' from 'the world changed'?" / "Can PING tell the truth
   when absolutely nothing is known?" / "If everything disposable vanished
   tonight, what truth could PING deterministically recover tomorrow?" /
   "Where does human authority actually enter the machine?" Every question
   demands a reached path and a named falsifying observation.
2. **INTELLIGENCE_RESEARCH questions, committed before research**
   (journal missions `93a79e48accd23e3` and `8924ebeeb4094c37`, payloads read
   live): "Does ALTER ROLE ... SET default_transaction_read_only = on prevent
   role r from writing, or can r override the default per session / per
   transaction?" Every question is paired with `claims_to_verify` including
   a *stated prediction* ("predicted CONFIRMED") before any trial ran. The
   brief was committed to git (28c38d1) before research began.
3. **The novelty-detector questions** (plan, binding): "What does the audience
   already believe? What does the existing literature already explain well?
   What evidence do we possess that changes the picture? What can we
   demonstrate rather than merely argue? What claim could a skeptical senior
   engineer falsify?"
4. **The product-thinking questions** (plan): "Who needs this? What painful
   problem does it solve? What happens without it? How will the user know it
   worked? How will the business measure that value?"

### A.2 BELIEFS (evidenced)

1. **"SEARCH BEFORE DESIGN. TRACE BEFORE MATRIX. OBSERVE BEFORE REPAIR."**
   (charter). Observation precedes opinion as a standing rule.
2. **Names are not ownership.** "A class name is not ownership. A table is
   not ownership. An event is not automatically ownership. A UI is never
   ownership." (charter, Q2). The interrogation answers confirmed the belief:
   verdict PROVEN only where served-path callers were traced.
3. **Served truth and source truth are separate planes, never conflated.**
   (charter, Q10; interrogation corrections: checkout's scheduler repairs are
   NOT in the deployed image `repair-cert-20260924`; digest→commit on the
   journal plane is UNKNOWN, not proven.)
4. **UNKNOWN is a successful result.** Verdict vocabulary
   PROVEN/FALSIFIED/PARTIAL/UNKNOWN/NOT-REACHED; 16 of 24 verdicts landed
   PARTIAL/UNKNOWN/NOT-REACHED and were accepted as answers, not failures
   (ANSWERS file). Absence of evidence stays absence of evidence.
5. **Content without the chain intact is "content automation theater."**
   (plan, hour-100 demo). The chains (CLAIM→SUPPORT SET→EVIDENCE→SOURCE→
   VERDICT; PROPOSAL→AUTHORIZATION→ATTEMPT→RESULT→EFFECT→VERIFICATION→
   OUTCOME) are the product; attractive generated content is not.
6. **Credibility is a constraint, not a variable traded for reach.**
   (plan). "Never allow 'viral' to become the optimization target by
   accident."
7. **Information gain per artifact beats content volume.** (binding
   refinement). One artifact with a novel observation + reproducible
   evidence + explicit counterargument > ten generic posts.
8. **Falsification outranks velocity.** Lane self-reports are hypotheses until
   replayed from a clean checkout (2026-09-26 ask-lane case, standing law).
   "UNKNOWN is acceptable, a made-up root cause is not."
9. **Decide at 80% confidence; document; continue.** Below that, ask one
   concise question naming the uncertainty, the recommended default, and the
   cost of being wrong. (Standing operator posture, observed in directives.)

### A.3 FAILURE MODES HE PUNISHES (observed incidents)

1. **Fabricated evidence.** The 60-80 report's self-caught invention of
   `RETURNING id` values 7/8/12 — caught, fixed before assembly, recorded as
   the incident that "the honesty machinery worked under pressure"
   (BLOCK-60-80-REPORT.md §3; falsifier report §"F3"). Falsifier F1: a doc
   asserting an unmaterialized canonical learning residency. F2: two identity
   strings for the same learning across representations.
2. **Overclaim beyond scope.** The retirement doc's "read-only enforced at
   the database boundary... binds even superusers" vs trial T9b — recorded
   as contradiction K2, resolution forced into scope (BLOCK-20-40-REPORT).
3. **Self-attested authority.** `~/workspace/outreach/AUTHORITY.json`: prose
   `set_by` fields, no proposal digest, no tenant, `window: null` —
   interrogation Q6's finding: "A self-attested file takes the place of the
   approval record." The live `POST /api/mc/approvals` (unauthenticated,
   self-asserted approver) has a real APPROVED decision on record (Q7).
4. **Absence converted to falsehood.** The deployed scheduler converts falsy
   handler return → FAILED with a fabricated "no worker matched" reason;
   retries possibly-effected work (Q4, PARTIAL).
5. **Gaps turned into subsystem proposals.** "No reader is allowed to turn an
   interesting gap directly into a subsystem proposal." (charter)
6. **"Worked once" → "works."** The claim-ledger doctrine's forbidden
   conversions: correlation→causation, local measurement→universal claim,
   architecture intention→deployed behavior, unit test→production proof,
   registration→execution, worker result→verified external effect.
7. **Silent mutation** between approval and publish (plan, block 60-70).
8. **Dirty state treated as authority.** (Standing law; the pre-sprint
   authority-overlap search rule exists because of the
   8-competing-identity-authorities incident.)

### A.4 OBJECTIONS HE RAISES (all observed against our own material)

1. **D-F3 (LANDED):** "Nobody outside your team cares about your journal's
   config." Killed Thesis D as a standalone headline; the falsifier records
   it as "the only audience signal in the record — a steelman, not data."
2. **B-F2 (LANDED):** "This is a footnote; nobody's threat model depends on
   CREATE TEMP TABLE in a read-only transaction." Killed Thesis B as a
   headline; survives only as a supporting beat.
3. **C-F3 (LANDED PARTIALLY):** "REVOKE-based least privilege is the docs'
   own recommendation; you are rediscovering the manual." The contribution
   is the demonstrated contrast (T2 vs T10), not the recommendation.
4. **C-F2 (LANDED HARD):** the superuser wrinkle — our own journal runs as
   superuser, so the prescription is inapplicable to the system that
   motivated the research. Killed the universal C; the scoped form survived.
5. **"What would an L6 engineer say is naive here?"** (plan). Mandatory
   hostile review on every deep piece: STRONGEST OBJECTION / WHERE THE
   OBJECTION IS RIGHT / WHERE OUR EVIDENCE DIFFERS / REMAINING UNCERTAINTY.
6. **The four Q16 constructions** (charter): technically excellent piece
   with weak qualified response vs mediocre-looking with strong response;
   high reach with wrong audience; low reach with extraordinary target-audience
   response. Quality and outcome are separate variables; never conflate them.
7. **The nine certification questions** (plan, 95–100): which claims were
   made? what supports each? which were uncertain? was the approved artifact
   the published artifact? did distribution produce a receipt? are observed
   metrics real? does the claimed learning follow from them? what remains
   unknown?

### A.5 EVIDENCE STANDARDS HE ENFORCES

1. **The mandatory falsifying observation.** After every interrogation
   answer: "What observation would prove this answer wrong? If the
   investigator cannot name one, they are probably giving architecture
   rhetoric rather than a falsifiable description of the system." (charter)
2. **The 13-field claim ledger.** CLAIM / TYPE / SUPPORT SET / PRIMARY SOURCE
   / INDEPENDENT SUPPORT / EVIDENCE GRADE / CONFIRMED-REFUTED-UNCLEAR / SCOPE
   / TIME BOUND / COUNTEREVIDENCE / PUBLIC WORDING / MAXIMUM DEFENSIBLE
   WORDING (plan; `claim-ledger-40-60.json`, 23 claims, re-verified by the
   independent falsifier).
3. **The demonstration ladder.** ASSERTION < CODE < TEST < TRACE <
   REPRODUCTION < ADVERSARIAL REPRODUCTION < LIVE SYSTEM OBSERVATION <
   INDEPENDENT EFFECT VERIFICATION. "A live adversarial reproduction should
   be marketed differently from a unit-tested property." (plan)
4. **Questions and claims committed before research.** Brief committed
   pre-research (28c38d1); predictions stated in `claims_to_verify` before
   trials (journal payloads). Nothing reshapes the plan after the fact.
5. **The overclaim compiler.** Every strong word in the forbidden list
   (solves, guarantees, proves, always, never, production-ready,
   deterministic, secure, autonomous, self-healing, exactly-once,
   zero-downtime, fault-tolerant, verified, canonical) demands its evidence.
   "Maximum-strength wording that the evidence actually permits — confident
   without bullshit." (plan)
6. **Causally modest experiments.** Full treatment/control/window/confounder
   record; outcome states SUPPORTED / FALSIFIED / INCONCLUSIVE / UNOBSERVABLE
   / PENDING_WINDOW. "A result can update confidence. It cannot silently
   become policy." (plan)
7. **No magic engagement score.** Five outcome classes tracked separately:
   ATTENTION / INTELLECTUAL ENGAGEMENT / INTENT / AUTHORITY / BUSINESS.
   (plan)
8. **One DECISION, one SENTENCE, one EVIDENCE LINK, APPROVE or DENY.**
   Owner approval is the product proof and is never bypassed for eagerness.
   (Standing boundary.)

### A.6 What Cluster A CAN inform

- The approval gate: what the sole approver requires — exact proposal,
  digest-bound, claim ledger, overclaim pass, L6 steelman answered, honest
  UNKNOWNs listed, no silent mutation. This is the 60–70 block's real
  acceptance test, and it is fully specified.
- Voice: "confident without bullshit" = maximum-strength wording the
  evidence permits, with scope stated in the same sentence.
- The WE WERE WRONG family (hypothesis→falsification→smallest fix→what
  remains unknown): he chartered it as a first-class content type, and our
  own K1/K2/C-F2 material is the seed inventory.
- The three-layer structure (hook / mechanism / engineering proof):
  progressively disclose, never dumb down — matches how he reads (skim the
  verdict, drill the reached path, check the falsifier).
- Headline parameterization until his pick: the sprint-1 practice
  ("[NOLAN'S PICK — H1 / H2 / H3]") is his required presentation shape.

### A.7 What Cluster A CANNOT inform

- How the external technical audience (not Nolan) responds to anything. His
  bar is a proxy for the hardest grader, not a model of the market.
- Reach, channel, format, or demand preferences — zero observations exist.
- Whether the external audience shares his evidence standards; assuming so
  is doctrine, not data (see Cluster B).

---

## CLUSTER B — External senior technical audience: UNKNOWN

**Status: the cluster does not exist yet.** Per the sprint-1 falsifier
(BLOCK-80-100-FALSIFIER-REPORT.md, question 3): "None. Zero observed audience
data exists — no distributions, no audience observations, no engagement
signals. ... Any claim that the lane has validated audience fit would be a
fabrication; the lane does not make it." Nothing in this block changed that:
zero distributions, zero approvals, zero outcome windows opened (SIGNALS
S-8). The plan's target profile (senior engineers, staff/principal, technical
founders, infra/AI engineers, sophisticated technical buyers; credibility as
a constraint) is doctrine — an assumption about who we want, not evidence
about who they are.

**Ecosystem context (NOT audience data).** The 34-system harvest records what
the market builds, not what our audience wants:
- No surveyed system grades continuity A; the replayable slot is unoccupied
  in the market (harvest report executive summary).
- The industry has converged on pre-generation constraint injection,
  per-agent spend guardrails, permission-aware retrieval, and
  approval-gates/draft-by-default on external effects — all without evidence
  binding or replay.
- Evidence grades used throughout the survey: vendor-described vs
  independent vs unreplicated; counterparty risk is everywhere (three of nine
  agentic sales systems acquired by platform giants in 2026).
These are usable as ecosystem beliefs/failure modes for the 30–45 opportunity
block. They say nothing about our audience's questions, objections, or
standards.

**Honesty baseline (not target-audience data).** The journal holds 11
`platform_metric` observations (metric-ingest-producer, collected
2026-09-30 11:42 MDT): reach 0–37 views/post, zero engagement, zero
reactions, zero comments; the page identity is not resolved from the journal
rows (recorded page_id `1262592440277855`; whose page this is is UNKNOWN).
This is the current surface's honest zero — it confirms the audience has not
yet been found, nothing more.

**Why the signals worker's seeds are not materialized here.** SIGNALS-S2-15-30.md
records two "audience-cluster seeds": corridor home-service owners with weak
web presence (from the FYD battery), and technical buyers who need replayable
evidence (from the harvest NEED analysis). Both are hypotheses awaiting their
five dimensions; the first belongs to the FYD lane's user base, and the
second is a differentiation thesis, not an observed behavior. Per block law,
they stay seeds.

### B.1 QUESTIONS — UNKNOWN
Resolving observation: the first distributed artifact's comment intake,
classified through the plan's sensor taxonomy (QUESTION / CORRECTION /
COUNTEREXAMPLE / IMPLEMENTATION EXPERIENCE / REQUEST FOR PROOF / NEW FAILURE
MODE / ADJACENT PROBLEM / PURCHASE INTENT / LOW-SIGNAL REACTION). Repeated
questions become research missions (plan: "comments as sensor network").
Until the first real QUESTION arrives, this field is empty.

### B.2 BELIEFS — UNKNOWN
Resolving observation: AUTHORITY-class outcomes — technically sophisticated
people correcting, extending, referencing, or independently reproducing the
work (plan's outcome classes). Corrections and counterexamples become
evidence candidates; they reveal beliefs only when offered unprompted. The
plan's assumed belief ("senior developers punish overstatement much harder
than ordinary audiences") is doctrine, unverified.

### B.3 FAILURE MODES — UNKNOWN
Resolving observation: where the external audience punishes us — AUTHORITY-
class negative signals (public corrections, callouts, "rediscovering the
manual"-type objections from outside). Our internal steelmans (D-F3, B-F2,
C-F3) model this shape but are not evidence of it.

### B.4 OBJECTIONS — UNKNOWN
Resolving observation: real objections recorded verbatim from outside
readers, graded against the steelman battery we already ran. The resolving
test is whether external objections match our internal steelmans (we
predicted the grader) or land somewhere new (we did not).

### B.5 EVIDENCE STANDARDS — UNKNOWN
Resolving observation: what external readers cite, demand, or reproduce —
INTELLECTUAL ENGAGEMENT-class (saves, long technical comments, citations)
and AUTHORITY-class (independent reproduction) signals, with the five
outcome classes kept separate. Until then, we carry Cluster A's standards
over as a working hypothesis and mark the carryover ASSUMED, not observed.

### B.6 What Cluster B CAN inform today

Only the intake requirement: the first distribution (block 60–70) must go
through the canonical intake seam with the observation window preserved, the
five outcome classes separated, and comments classified by the sensor
taxonomy — because that is the machinery that will turn B from UNKNOWN into
observed. (The seam exists: sprint-1 block 80–100 built the validator;
fixtures are synthetic; zero real windows have opened.)

### B.7 What Cluster B CANNOT inform

Everything else: no content decision about the external audience is
evidence-backed today. Any playbook rule about them would be cargo-cult
growth heuristics, which the plan forbids.

---

## The single most-wanted observation from the first authorized distribution

One **AUTHORITY-class signal on the first distributed artifact**: a
technically sophisticated outsider correcting, extending, or independently
reproducing the work — ideally landing as a CORRECTION or COUNTEREXAMPLE in
the comment-sensor intake. It simultaneously populates B.2 (beliefs), B.3
(failure modes), B.4 (objections), and B.5 (evidence standards), and it
tests whether our internal steelmans predicted the real grader. Delivered
through the canonical intake seam with the five outcome classes separated
and the observation window preserved — not as a like count.

## Block report

- Read-only journal census (brain-postgres / ping_runtime), interrogation
  charter + answers, sprint-1 attack/falsifier artifacts, harvest report.
  No writes, no missions, no Oracle contact, no distribution.
- Deliverable: this file.
- Commit law: git status first, explicit pathspec, clear message, no push.
