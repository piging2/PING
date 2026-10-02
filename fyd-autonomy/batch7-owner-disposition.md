# Batch 7 — Final Owner Disposition

Saved verbatim from Nolan, 2026-09-26 ~20:12 MDT.
File: `~/workspace/fyd-autonomy/batch7-owner-disposition.md`

This message contained two parts: (1) a first adjudication draft Nolan wrote
for the coordinator, and (2) the complete final disposition. Both are preserved
below in the order received. The second is the authoritative final word.

The opening fragment ("favors granular resource/action permissions...") appears
to be a truncated sentence from another context Nolan was referencing; preserved
as received.

---

## PART 1 — First adjudication draft (as received)

favors granular resource/action permissions and progressive scope requests rather than blanket access, validating the direction of #4-5. Current MCP work similarly reinforces credential isolation, scope step-up, explicit authorization boundaries, stateless/request-scoped context, and conformance testing rather than ambient authority.

The important correction is that we should freeze semantics and invariants, not freeze every implementation shape forever. Here is the final adjudication I would give the coordinator.

Batch 7 — Final 37 Owner Adjudications
BATCH 7 — FINAL OWNER ADJUDICATION

THIS IS THE LAST 37-QUESTION BATCH.

AFTER THIS, STOP ASKING NOLAN QUESTIONS THAT CAN BE ANSWERED BY:

CONSTITUTION
→ EXISTING POLICY
→ EVIDENCE
→ DETERMINISTIC RULE
→ REVERSIBLE EXPERIMENT.

ESCALATE ONLY GENUINE OWNER AUTHORITY.

1. CONSEQUENCE SCHEMA

DECISION: APPROVE WITH VERSIONING.

Freeze CONSEQUENCE v1:

reversibility
external_effect
money
publication
privacy
credential_access
destructive_scope
commitment

Small enums only.

No free-text policy dimensions.

Do NOT make adding a future dimension an existential constitutional rewrite.

Instead:

CONSEQUENCE_V1 is immutable.

A semantic change requires CONSEQUENCE_V2 plus explicit migration and compatibility rules.

Old events retain the schema version under which they were evaluated.

Replay must never reinterpret v1 using v2 semantics.

2. AMBIGUOUS CONSEQUENCE CLASSIFICATION

DECISION: RULES FIRST.

Deterministic classifier first.

If:

CLASSIFICATION = AMBIGUOUS

then Jev may produce:

classification proposal
confidence/probability
reason/evidence.

Jev NEVER authorizes.

Pipeline:

INTENT
→ DETERMINISTIC CLASSIFIER
→ AMBIGUOUS?
→ JEV CLASSIFICATION PROPOSAL
→ POLICY
→ AUTHORIZATION.

Probability is evidence, not authority.

3. AUTO-AUTHORIZATION PROMOTION

DECISION: RECORD FIRST.

No new classifier gets auto-authorization merely because tests pass.

Stages:

RECORD
→ SHADOW
→ ADVISORY
→ ELIGIBLE_FOR_AUTO
→ AUTO.

Initially only:

REVERSIBLE
+
NO EXTERNAL EFFECT
+
NO MONEY
+
NO PUBLICATION
+
NO CREDENTIAL ACCESS
+
NO DESTRUCTIVE EFFECT

may eventually qualify.

Promotion requires evidence.

First promotion of any consequential class returns to Nolan.

4. CUSTOMER PERMISSION VOCABULARY

DECISION: APPROVE THE CONCEPT, MODIFY THE LIST.

Initial owner-facing vocabulary:

READ PUBLIC PROFILE
READ CONNECTED ACCOUNT DATA
CREATE FYD RELATIONSHIPS
PUBLISH CONTENT
LIKE / REACT
FOLLOW EXTERNAL ACCOUNTS.

Important:

FYD-native relationships and provider writes are different capabilities.

Do not imply:

FOLLOW ON FYD

means:

FOLLOW EVERYWHERE.

Provider-specific effects must remain explicit underneath the human wording.

5. PROGRESSIVE PERMISSION TIMING

DECISION: APPROVE.

Minimum connection permissions first.

Request stronger permissions only when the owner invokes the feature.

Pattern:

CONNECT
→ MINIMUM IDENTITY/READ ACCESS

then later:

"Publish this"
→ request publishing capability.

"Follow on Bluesky"
→ request relevant provider capability.

Never train users to approve everything during onboarding.

6. DELEGATION DURATION

DECISION: MODIFY.

30 days is acceptable for bounded low-risk read/delegation classes.

But 24 hours is too broad as the universal consequential default.

Use:

LOW-RISK READ:
30 days default.

REVERSIBLE INTERNAL ACTION:
session or bounded mission.

EXTERNAL WRITE / PUBLICATION:
single-use or tightly mission-scoped by default.

CAMPAIGN/BATCH EXTERNAL ACTION:
explicit campaign-scoped delegation with expiry.

MONEY:
explicit amount + purpose + expiry.

CREDENTIAL ACCESS:
do not delegate raw credentials.

Delegate brokered capability to USE the credential.

Never give agents the secret merely because they may invoke the provider.

7. REVOCATION

DECISION: APPROVE.

Revocation blocks new dispatch immediately.

In-flight execution checks revocation at every meaningful checkpoint before another effect.

For external effects already dispatched:

do NOT pretend revocation reverses history.

Record:

REVOKED AFTER DISPATCH.

Then reconcile outcome.

No new effects after revocation.

8. APPROVALREQUEST SCHEMA

DECISION: REJECT EXACT SIX-FIELD FREEZE.

The proposed six fields omit a critical isolation dimension.

ApprovalRequest v1 must include at least:

id
tenant_id
proposal_digest
capability
actor
consequence
expires_at.

Lifecycle state should remain event-derived if existing event infrastructure supports it.

Budget remains mission-owned.

Do not duplicate it.

The invariant to freeze is:

ONE APPROVAL OBJECT
+
EXACT PROPOSAL DIGEST
+
EXACT ACTOR
+
EXACT TENANT
+
EXACT CAPABILITY
+
EXACT CONSEQUENCE
+
EXPIRY.

Chat and Mission Control resolve the SAME approval.

9. CHAT "YES"

DECISION: APPROVE STRICT BINDING.

A bare:

YES

is not sufficient to select an arbitrary outstanding proposal.

Approval must resolve:

authenticated actor
+
approval id
+
proposal digest.

The UI may make this conversationally easy.

For example the product can render:

"Approve this change?"

and internally bind the reply to the displayed ApprovalRequest.

But ambient "yes" must never mean:

approve newest pending thing.

10. EXPIRY POLICY

DECISION: APPROVE WITH ONE CLARIFICATION.

Consequential:

EXPIRE_DENY.

Cancelable recurring/replannable work:

EXPIRE_CANCEL.

Internal non-effectful planning:

EXPIRE_REPLAN.

Never:

EXPIRE_APPROVE.

Silence creates zero new authority.

11. APPROVAL AFTER TERMINAL

DECISION: APPROVE.

First terminal transition wins.

Second identical approval:

NO-OP
+
DUPLICATE EVENT.

Denied/expired proposal cannot be resurrected.

Retrying intent requires a new proposal/digest.

12. AUTH CHALLENGE RESUME

DECISION: APPROVE DIGEST-GATED RESUME.

Auto-resume only if:

proposal digest identical
capability set identical
tenant identical
actor identical
consequence classification not increased
grant still valid.

Any material mutation:

NEW PROPOSAL.

Authentication proves identity.

It does not authorize changed intent.

13. BUDGET DIMENSIONS

DECISION: APPROVE V1.

Freeze Budget v1:

token
money
wall_clock
tool_calls
loop_count.

Money default:

$0.

No budget means no spend authority.

Like CONSEQUENCE:

version schemas rather than mutating historical semantics.

14. BUDGET SETTER AND EXHAUSTION

DECISION: APPROVE HOLD.

Mission author/coordinator may set budgets only within its delegated ceiling.

It cannot grant itself a larger ceiling.

At exhaustion:

HOLD.

Not:

FAIL
AUTO-EXTEND
SILENTLY SWITCH MODEL
IGNORE.

Continuation requires an authorized budget amendment.

15. MISSION CONTROL 12-ELEMENT MODEL

DECISION: FREEZE THE SEMANTIC MODEL, NOT DATABASE SHAPE.

The twelve concepts remain:

MISSION
ACTOR
TENANT
CAPABILITY
CONSEQUENCE
BUDGET
STATE
PROPOSAL
APPROVAL
EXECUTION
RECEIPT
EVENT.

No new domain authority merely because UI needs another concept.

A new projection/view/helper is allowed without constitutional escalation.

A proposed thirteenth canonical semantic primitive must prove why the existing twelve cannot represent it.

16. A THROUGH N CREDIBILITY BAR

DECISION: APPROVE.

A through N remain the Mission Control credibility gate.

UI completion is not completion.

Mission Control is credible only when reached runtime paths prove the authority model.

Do not let beautiful UI outrun truth.

17. JEV PROMOTION POLICY

DECISION: APPROVE MECHANISM, NOT MAGIC NUMBERS.

Required:

prediction/outcome dataset
calibration by class
zero prohibited-effect violations
replay consistency
independent falsification.

100 clean cases is a useful minimum evidence target, not a constitutional constant.

Higher-consequence classes require stronger evidence.

First consequential promotion returns to Nolan.

18. FIRST JEV PRIMARY CLASSES

DECISION: MODIFY.

DO NOT make engagement candidate scoring one of the first primary classes.

That is downstream of external social effects and not the current product bottleneck.

First two:

ASK FYD ANSWERABILITY / EVIDENCE SELECTION

"Can this question be answered from this graph, and which evidence supports it?"

AMBIGUOUS ENTITY / SOURCE SEMANTIC CLASSIFICATION

only after deterministic resolution returns ambiguous.

Both are semantic.

Neither authorizes an external effect.

Engagement scoring remains shadow/advisory until product need justifies it.

19. JEV $5/DAY

DECISION: KEEP HARD CEILING.

$5/day remains the global ceiling until evidence says otherwise.

Per-class accounting required.

At 80%:

WARN
+
THROTTLE OPTIONAL/NONCRITICAL USE.

At 100%:

HOLD MODEL-DEPENDENT WORK.

Do not silently substitute lower-quality decisions.

Deterministic fallbacks may continue only where they are independently valid.

20. HERMES BRIDGE REPAIR

DECISION: AUTHORIZE.

Bounded repair:

fix venv path
fix launcher
add effect-state dimension
rerun complete proof.

No executor promotion merely because repair passes.

Repair proves bridge health.

It does not grant authority.

21. INITIAL HERMES CONSEQUENCE CLASS

DECISION: APPROVE ONE CLASS.

FILESYSTEM PATCH INSIDE ASSIGNED WORKTREE.

No production.

No publication.

No email.

No social effect.

No host configuration.

No secrets.

No implied authority expansion.

22. FIRST REAL HERMES MISSION

DECISION: BORING FIRST.

Use:

read-only evidence gathering
test execution
screenshots
bounded worktree file operations.

No consequential external effects.

Make executor reliability boring before making it powerful.

23. TWO LANES TOUCH SAME AUTHORITY FILE

DECISION: COORDINATOR ARBITRATES SEMANTICS, EVIDENCE WINS.

Immediately stop concurrent semantic writes.

Compare:

intent
tests
callers
compatibility
canonical invariants
falsification evidence.

Assign one writer.

Do not merge two competing authority models together.

Escalate to Nolan only if the semantic choice itself remains genuinely unresolved after evidence.

24. WORKTREE RETIREMENT

DECISION: APPROVE EVIDENCE-GATED RETIREMENT.

Coordinator may retire only if:

clean

OR

all meaningful diff is harvested

OR

diff is explicitly superseded with evidence.

Unknown dirty work:

DO NOT DELETE.

No reset --hard.

No clean.

No irreversible retirement without explicit authorization.

25. T+24 CUTOVER GATES

DECISION: APPROVE FIVE, ADD SECURITY GATE.

Required:

clean-checkout one-click proof
visitor UI has zero engineering-semantics leakage
Ask FYD evidence-bounded or refuses
no fake contact/estimate submission
JSON-LD agrees with visible facts
hostile-source/render security gate passes.

That sixth gate is justified by the real javascript: href defect already found.

No cutover with executable untrusted-source content.

26. ASK FYD EVIDENCE MINIMUM

DECISION: APPROVE AND MAKE IT CORE.

Excellent means:

answer only from permitted object/evidence context
cite supporting evidence
distinguish direct / derived / inferred where material
state uncertainty
refuse unsupported factual claims.

A beautiful unsupported answer FAILS.

The killer question remains:

"What services does this business offer, and how do you know?"

27. CUTOVER AND ROLLBACK

DECISION: APPROVE.

Pin candidate.

Freeze candidate.

Run gates against exact pinned artifact.

Cut stable only after gates pass.

Keep known-good rollback artifact available for 7 days minimum.

Retirement after that follows normal evidence-gated process.

Do not confuse:

rollback artifact retention

with:

keeping obsolete infrastructure permanently live.

28. DATA CLASSIFICATION TAXONOMY

DECISION: APPROVE V1 WITH CAREFUL TERMINOLOGY.

PUBLIC
OWNER
CONFIDENTIAL
SECRET
REGULATED_SENSITIVE.

Stamp classification as early as practical.

SECRET never enters model context or public/canonical event payloads.

REGULATED_SENSITIVE handling is purpose/jurisdiction dependent.

Version the taxonomy.

Do not reinterpret old records when taxonomy evolves.

29. DATA DESTINATION RULES

DECISION: APPROVE PRINCIPLE, TIGHTEN OWNER DATA.

PUBLIC:
approved processors and public surfaces where purpose permits.

OWNER:
only processors permitted for the owner's chosen feature and disclosed handling.

CONFIDENTIAL:
explicitly approved processors only; minimize transmission and retention.

SECRET:
vault/broker only.
Never model context.
Never canonical/public journal.

REGULATED_SENSITIVE:
purpose-specific policy and jurisdiction-aware handling.

Important:

"owner consent" alone is not enough to make an unsafe destination safe.

Destination must also satisfy system policy.

30. BACKUP RESEARCH

DECISION: AUTHORIZE.

Research:

client-side encryption
incremental backup
credential isolation
retention
corruption detection
key recovery
RPO
RTO.

Definition of done:

REAL RESTORE TO SCRATCH ENVIRONMENT.

A comparison spreadsheet is not a backup.

Do not purchase or commit to a provider merely because research prefers it.

Return destination recommendation before money/long-term commitment.

31. ENGAGEMENT MIGRATION ORDER

DECISION: MODIFY PRIORITY.

Do NOT let engagement migration steal the FYD 24-hour product sprint.

For the execution-system proof, X-like/react may remain the first migrated external-effect class because it is relatively bounded.

But actual live migration remains behind:

executor proof
dedupe proof
UNKNOWN reconciliation
provider authorization
platform policy
exact live-action authorization.

No mass engagement.

No autonomous outreach expansion.

TikTok last remains sensible if ever needed.

32. OLD CRON DURING MIGRATION

DECISION: APPROVE SINGLE-WRITER HANDOFF.

Per class:

OLD owns window

then explicit handoff

then NEW owns future windows.

Never both.

Record handoff cursor/time/window.

No overlapping dispatch authority.

If ownership is ambiguous:

DO NOT DISPATCH.

33. SIX HOSTILE TENANT TESTS

DECISION: APPROVE AS BINDING GATE.

All six mandatory before second external tenant.

Especially prove:

tenant cannot come from untrusted request body.

Tenant identity must originate from trusted authenticated context.

Missing tenant context:

FAIL CLOSED.

Cross-tenant admin:

explicit capability only.

34. HISTORICAL TENANT SCOPE

DECISION: APPROVE ANNOTATION, NOT REWRITE.

New missions:

tenant stamped at front door.

Historical canonical events:

never mutate.

Add superseding/scoping annotation with:

target event/object
tenant assignment
basis
actor
timestamp
migration/version.

Do not pretend historical data always contained tenant information.

Projection may resolve effective tenant from original + annotation.

35. CLASSIFIER OPERATING TARGET

DECISION: APPROVE.

Optimize for:

NECESSARY HUMAN DECISIONS PER UNIT OF CONSEQUENCE.

Not:

number of questions.

Zero questions is success when everything is resolvable.

Seven is success when seven genuine owner decisions exist.

Thirty-seven is acceptable only if thirty-seven truly survive.

Never pad.

36. WEEKLY AUDIT

DECISION: APPROVE, BUT AUTOMATE IT.

Audit:

questions directed to Nolan
classifier disposition
escalation record
reason
consequence class
whether escalation was actually necessary
misclassification.

Report counts:

AUTONOMOUSLY RESOLVED
ESCALATED
HELD
MISCLASSIFIED
BYPASSED CLASSIFIER.

Any bypass is specifically named.

Do not make Nolan manually audit routine correctness.

37. COORDINATOR STANDING DELEGATION

DECISION: APPROVE BOUNDED DELEGATION.

Coordinator may authorize:

read-only research
tests
builds
analysis
reversible worktree modifications
non-production local services
non-public generated artifacts
bounded model/tool use inside mission budgets
harvesting/refactoring within assigned semantic ownership.

Coordinator may NOT independently authorize:

production deployment
public publication
external messages
social actions
purchases/spend outside explicit budget
credential disclosure/access beyond brokered capability
destructive shared-host operations
irreversible deletion
unknown dirty-worktree destruction
new consequential delegation
constitutional semantic changes.

When uncertain:

classify consequence.

Do not merely ask Nolan because uncertainty exists.

A. SCHEMA POLICY

Freeze versioned contracts.

Do NOT freeze implementation forever.

Historical meaning must remain replayable.

B. AUTHORITY POLICY

MODEL MAY:

classify
reason
recommend
propose.

POLICY/AUTHORITY:

authorizes.

EXECUTOR:

executes exactly the authorized transition.

C. CREDENTIAL POLICY

Agents should almost never receive raw credentials.

Use:

credential broker
→ scoped operation
→ receipt.

D. APPROVAL POLICY

Approval binds:

TENANT
+
ACTOR
+
PROPOSAL DIGEST
+
CAPABILITY
+
CONSEQUENCE
+
EXPIRY.

E. EXTERNAL EFFECT POLICY

After dispatch uncertainty:

RECONCILE BEFORE RETRY.

UNKNOWN IS A REAL STATE.

F. PRODUCT POLICY

THE CONSTITUTION EXISTS TO ENABLE THE PRODUCT.

It must make:

"Make this heading shorter"

feel nearly instant.

And:

"Send this to 2,000 people"

feel deliberately consequential.

Do not expose constitutional complexity to the customer.

G. FYD PRIORITY

THE 24-HOUR PRODUCT SPRINT NOW OUTRANKS FURTHER AUTHORITY THEORY.

Current customer loop:

URL
→ EVIDENCE
→ OBJECT GRAPH
→ GENERATED FYD
→ ASK FYD
→ OWNER CORRECTION
→ CONVERSATIONAL CUSTOMIZATION
→ SAFE REGENERATION.

The authority substrate supports this.

It does not replace it.

P0:

Protect certified audit/PII repair from staged regression.

P1:

Diagnose runtime refused-spawn by FIRST DENYING COMPONENT.

P2:

Repair/red-team execution boundary.

P3:

Choose ONE executor of record.

P4:

Dry-run one engagement migration through the canonical spine.

NO live external effect unless exact existing authorization covers it.

P5:

Return immediately to FYD product.

Current renderer/browser boundary is already closed.

Therefore next product boundary is:

RENDERED EXPERIENCE
→ ASK FYD
→ EVIDENCE.

Build that.

Then:

WHY THIS
→ OWNER CORRECTION
→ REGEN
→ NATURAL-LANGUAGE CUSTOMIZATION
→ APPROVAL WHERE CONSEQUENCE REQUIRES
→ SECOND OBSERVATION
→ CUSTOMIZATION SURVIVES.

AFTER THESE 37 DISPOSITIONS ARE INGESTED:

NO BATCH 8.

NO "ASK 37."

NO NEW GOVERNANCE ROADMAP.

THE CLASSIFIER NOW EARNS ITS KEEP.

Resolve autonomously whenever:

constitution answers it
existing policy answers it
evidence answers it
research answers it
a reversible experiment answers it.

ESCALATE ONLY:

REAL OWNER AUTHORITY
+
NEEDED NOW
+
CONSEQUENTIAL
+
NOT ALREADY DELEGATED.

FROM HERE:

BUILD
→ TEST
→ FALSIFY
→ FIX
→ DEMO
→ REAL OWNER.

BRUTAL CEO 24-HOUR SPRINT MODE BEGINS.

GO.

A few of those changes matter a lot. #8 needed tenant_id or the unified approval object could become a cross-tenant authorization footgun. #6 needed single-use/mission-scoped external-write delegation rather than casually allowing 24 hours of publishing authority. #18 should not put engagement optimization ahead of FYD's product loop. And #25 now needs the hostile-render gate because the team already found a real executable-URL sink; that is evidence, not theoretical security work.

The deeper architecture is now coherent: intelligence proposes, deterministic policy authorizes, a bounded executor acts, canonical history records, projections render, and the customer mostly experiences none of that machinery. Current ATProto permissions are a useful external validation of that direction: granular permissions can be restricted by resource/action and requested progressively rather than demanding broad account authority up front.

Now I would stop constitutional design. The next 24 hours should be overwhelmingly product execution.

---

## PART 2 — BATCH 7 FINAL OWNER DISPOSITION (complete, authoritative)

A lot of these 37 still should eventually become policy rather than CEO interrupts. But since you want one final adjudication before the brutal 24-hour execution sprint, here is the complete disposition.
BATCH 7 — FINAL OWNER DISPOSITION
1. Consequence schema
APPROVE THE CONCEPT, DO NOT CONSTITUTIONALLY FREEZE EXACTLY EIGHT FOREVER.
Start with:
reversibility
external_effect
money
publication
privacy
credential_access
destructive_scope
commitment
They are versioned policy vocabulary.
Adding/removing/redefining a dimension requires deliberate schema migration with replay compatibility. It does not require treating an implementation enum as eternal constitutional law.
The document correctly identifies this as load-bearing authorization input.    Pasted markdown
Rule:
Stable and versioned, not artificially immutable.

2. Ambiguous consequence classification
APPROVE DEFAULT.
Deterministic rules first.
If:
CLASSIFICATION = AMBIGUOUS
then Jev may produce:
ClassificationProposal
with reasoning/evidence/probability/calibration metadata.
Jev never grants the capability.
And ambiguity should generally increase conservatism, not decrease it:
AMBIGUOUS + consequential possibility → HOLD/ESCALATE
rather than probabilistically talking itself into permission.
3. Earning auto-authorization
MODIFY.
Record/shadow first is correct.
But "zero misclassifications" is not by itself a sufficient statistical criterion, and an arbitrary sample count isn't enough either.
Promotion needs:
- class-specific confusion/error analysis;
- sufficient representative cases;
- hostile/adversarial cases;
- calibration where probabilistic;
- zero prohibited-effect violations;
- replay consistency;
- distribution-shift detection;
- independent falsification.
For genuinely reversible/no-external-effect classes, policy can eventually promote without asking you about each execution.
First promotion into a consequential autonomous class comes to you.
4. Customer permission vocabulary
APPROVE THE PATTERN, NOT THIS EXACT LIST AS A PERMANENT PRODUCT CONTRACT.
Initial vocabulary can include:
READ PUBLIC PROFILE
READ MY FOLLOWING
CREATE FYD RELATIONSHIPS
PUBLISH POSTS
LIKE/REACT
FOLLOW EXTERNAL ACCOUNTS
But test the wording with actual humans.
Internal capabilities may be technically precise. Customer language must be understandable.
A plumber should see something like:
"Let FYD publish posts you approve."

not:
GRANT CAPABILITY_SOCIAL_PUBLISH_V3.

Product wording can evolve without changing the underlying authority.
5. Progressive permissions
APPROVE STRONGLY.
Request minimum access at the moment the user invokes the feature.
However, even "read-only identity/profile" should only be requested when actually required to connect the account.
Do not ask for permissions merely because onboarding is happening.
Law:
Permission follows demonstrated feature intent.

6. Delegation durations
REJECT THE ARBITRARY 30-DAY / 24-HOUR UNIVERSAL NUMBERS.
The principle is approved:
- explicit;
- scoped;
- revocable;
- expiring where appropriate;
- never silently broadened.
But duration belongs to the capability class and relationship semantics.
A standing authorization to maintain a customer's website is fundamentally different from a one-time authorization to publish a particular campaign.
Prefer:
ONE_SHOT
SESSION
UNTIL_TIMESTAMP
RECURRING_WITH_BOUND
UNTIL_REVOKED only where explicitly justified.
Don't create constant reauthorization fatigue in the name of safety. That trains humans to click blindly.
7. Revocation
APPROVE, WITH STRONGER EFFECT SEMANTICS.
Revocation blocks all new authorization immediately.
In-flight operations require classification:
- not externally committed → stop safely;
- externally committed → do not pretend revocation rewinds reality;
- cancellation supported → request cancellation;
- effect uncertain → UNKNOWN/HOLD/RECONCILE;
- irreversible effect already occurred → record reality.
A revoke button cannot promise "undo."
It promises:
No future authority from this grant, and best-effort safe handling of work already in motion.

8. ApprovalRequest schema
DO NOT FREEZE EXACTLY SIX FIELDS.
The six are a good minimum:
id
proposal_digest
capability
actor
consequence
expires_at
But an approval object will likely also need references such as tenant/mission/policy/schema version/creation state depending on existing authorities.
The invariant to freeze is:
An approval resolves one exact proposal under one exact authority context.

Do not force future correctness into six fields because we happened to name six tonight.
9. Chat "yes"
APPROVE STRICT BINDING.
A bare ambiguous "yes" authorizes nothing consequential.
Approval binds:
authenticated principal
+
approval_request_id
+
proposal_digest.
The UI can make that conversational:
"Approve proposal 184?"

"Yes."

The system can resolve that because there is one explicitly active approval context.
But an unscoped "yes" floating in chat cannot attach itself to the newest request.
10. Expiry
APPROVE PRINCIPLE; SIMPLIFY.
No expiry can mean approval.
Consequential unresolved approval normally becomes:
EXPIRED_DENIED or EXPIRED_NO_ACTION.
Internal planning may replan automatically.
Recurring jobs may create another proposal if policy permits.
Don't proliferate expiry vocabulary unless distinct states produce materially different behavior.
11. Duplicate/late approval
APPROVE.
Terminal means terminal.
Second identical terminal transition is idempotent/no-op and auditable.
A changed proposal requires a new digest and approval request.
No resurrection.
12. Resume after auth challenge
APPROVE WITH ONE CORRECTION.
Digest equality is necessary but may not be sufficient.
Resume only when:
proposal digest unchanged
+
capability unchanged
+
identity/session binding valid
+
grant still valid
+
budget still valid
+
policy hasn't invalidated execution.
Do not interpret completing authentication as approving the operation.
Authentication ≠ authorization.
13. Budget dimensions
APPROVE THE FIVE AS INITIAL STANDARD DIMENSIONS.
Token, money, wall-clock, tool calls, loop ceiling.
Money defaults to $0 unless a standing policy or mission explicitly grants spend.
That's an important distinction. A recurring authorized service can have a policy-defined budget; it doesn't need Nolan manually stamping every $0.003 model request.
Do not freeze five forever. Version the budget model.
14. Budget setter/exhaustion
MODIFY.
A mission author may request a budget.
It may not grant itself budget authority.
Effective budget comes from:
requested budget ∩ policy ceiling ∩ capability grant ∩ owner-defined spending authority.
Exhaustion stops additional budget-consuming operations.
Use a typed state such as BUDGET_EXHAUSTED/HOLD, not generic failure.
No automatic extension beyond policy.
15. Twelve-element Mission Control model
DO NOT CONSTITUTIONALLY FREEZE 12 DATABASE NOUNS.
The conceptual model is excellent:
MISSION / ACTOR / TENANT / CAPABILITY / CONSEQUENCE / BUDGET / STATE / PROPOSAL / APPROVAL / EXECUTION / RECEIPT / EVENT.
But "if something doesn't fit the twelve, the design is wrong" is exactly the kind of absolutism that creates tortured architecture later.
Freeze the authority boundaries, not tonight's count.
Mission Control remains a projection/control surface over existing authorities.
It does not earn authority merely by adding a thirteenth noun.
16. A-N Mission Control credibility gate
APPROVE.
This is a credibility gate, not necessarily a statement that Mission Control can never evolve afterward.
A real reached path must demonstrate A-N before we call the control-plane story credible.
UI completeness is irrelevant without reached-path proof.
17. Jev promotion mechanism
APPROVE MECHANISM. REJECT 100 AS A MAGIC NUMBER.
The document itself correctly notes that fixed numbers tonight would be fake rigor.    Pasted markdown
Promotion proposal should contain:
- prediction/outcome dataset;
- class distribution;
- calibration;
- false-positive/negative consequences;
- adversarial cases;
- policy violations;
- replay consistency;
- current distribution vs training/shadow distribution;
- confidence interval where meaningful;
- independent falsifier report.
Then decide.
18. First Jev primary decisions
PARTIAL APPROVAL.
Good first class:
Ask FYD evidence-support classification — whether available evidence supports answering, requires qualification, or requires refusal.
That is bounded and directly improves the product.
Engagement candidate quality should remain advisory/ranking initially because it sits nearer external actions.
Jev may rank candidates without thereby authorizing engagement.
So:
Primary first: evidence sufficiency / semantic classification.
Advisory next: engagement quality.
19. Jev $5/day
KEEP THE $5/DAY HARD CEILING FOR THIS SPRINT.
Do not silently degrade at exhaustion.
But 80% should be a warning, not necessarily an automatic pause.
At 100%:
BUDGET_EXHAUSTED.
Then work that requires Jev holds, replans through an already-authorized alternative, or waits.
No hidden fallback that changes semantic quality.
After the sprint, use actual value/spend evidence to decide the next ceiling.
20. Hermes bridge repair
AUTHORIZED.
This is exactly the sort of proven, bounded, reversible infrastructure defect that should not normally need CEO attention.
The document says the independent falsifier found the venv/exit-127 and missing effect-state issues.    Pasted markdown
Repair narrowly.
Then independently rerun the complete proof.
Repair does not equal promotion.
21. Initial Hermes consequence classes
MODIFY.
Read-only operations aren't really the interesting consequence grant.
Authorize:
bounded filesystem mutation inside an explicitly assigned worktree, constrained by mission path/scope, with no production deploy, external communication, host mutation, credentials, or destructive cleanup.
That gives us one real but reversible mutation class.
One writer rule remains.
22. Hermes first real mission
APPROVE BORING-FIRST.
Start read-only:
harvest, inspect, test, screenshot, compare, falsify.
Then use the bounded worktree mutation class.
No social effect or production deployment as the executor shakedown.
23. Conflicting authority-file lanes
APPROVE DEFAULT.
Coordinator resolves when evidence can resolve it.
Independent falsification compares both.
You only get interrupted when the semantic intention/authority is genuinely ambiguous.
Newest does not win.
Most LOC does not win.
Passing its own tests does not win.
Best current evidence wins.
24. Worktree retirement
APPROVE WITH STRONGER RULE.
Coordinator may retire only after proving there is no uniquely valuable unpreserved work.
Dirty does not automatically mean valuable.
Clean does not automatically mean safe to delete.
Retirement record should include:
HEAD
branch
diff disposition
unique commits
untracked disposition
harvest/supersession evidence
integration destination.
If unpreserved unknown work exists:
HOLD.
Do not make routine dirty-worktree cleanup another permanent Nolan interrupt. Resolve evidence first.
25. T+24 acceptance gates
APPROVE THE FIVE, PLUS VISUAL/RESPONSIVE QUALITY.
The proposed gates are excellent:
1. clean-checkout one-click proof;
2. zero engineering-semantic leakage;
3. evidence-bounded Ask FYD;
4. no fake submissions;
5. JSON-LD matches visible facts.
The source explicitly frames these as pinned-candidate gates rather than lane intuition.    Pasted markdown
Add:
6. visual acceptance at 375 / 390 / 1440 with no material responsive failure.
And the ultimate owner acceptance remains:
Would I choose this over the current Coppersmith site?

If not, do not cut over merely because technical gates pass.
26. Ask FYD evidence minimum
APPROVE, BUT ONE QUESTION IS A FLOOR, NOT EXCELLENCE.
For each demo:
- one known-answer question;
- one partially supported question;
- one unsupported/adversarial question.
Prove:
SUPPORTED → answer + evidence
PARTIAL → bounded answer + uncertainty
UNSUPPORTED → refusal / DATA NOT PRESENT.
Excellent means it behaves correctly when it doesn't know, not merely when it knows.
27. Cutover/rollback
APPROVE SEQUENCE.
Pin candidate → freeze candidate → gates → cutover → observe → rollback available.
Seven days is a reasonable operational starting point, but don't make seven constitutional.
Retain rollback until sufficient runtime evidence makes retirement safe.
Never delete the only known-good predecessor merely because a timer expired.
28. Data taxonomy
MODIFY SIGNIFICANTLY.
Start with:
PUBLIC
OWNER
CONFIDENTIAL
SECRET
SENSITIVE/REGULATED.
But classification alone cannot determine handling.
Purpose, tenant, jurisdiction, consent, provider and data subject can matter too.
Also:
SECRET never enters model context

is a strong default.
REGULATED never enters model context

is too absolute if future authorized customer workflows legitimately require a compliant processor.
So default-deny sensitive/regulated processing until a purpose-specific policy exists.
Do not hardcode an architectural impossibility.
29. Destination rules
MODIFY.
PUBLIC does not automatically mean "send it anywhere."
Public availability removes one confidentiality issue; it does not eliminate licensing, purpose, provider, retention or contractual concerns.
OWNER does not necessarily require consent for every processor interaction; the applicable authorization relationship matters.
Use:
DATA CLASS
× PURPOSE
× DESTINATION/PROCESSOR
× TENANT
× CAPABILITY
× RETENTION
× POLICY.
Default deny when material dimensions are unknown.
Secrets stay in appropriate secret authorities/vaults, not prompts/events.
No raw identifiable customer data for cross-business learning.
30. Backup research
APPROVE.
Research mandate is correct.
Add:
- backup authenticity/integrity;
- key-loss recovery;
- restore without production credentials where possible;
- version compatibility;
- deletion propagation;
- tenant/privacy implications;
- recovery time actually measured.
And yes:
A BACKUP THAT HAS NEVER RESTORED IS AN UNPROVEN BACKUP.
31. Engagement migration order
DO NOT MAKE NOLAN CHOOSE PLATFORM ORDER FROM TASTE.
The proposed X-first reasoning is plausible, but current runtime evidence should choose.
Select the first surface by:
lowest external-effect complexity
× best receipt/reconciliation quality
× best current provider health
× lowest ambiguity
× lowest blast radius.
If that currently evaluates to X likes, use X.
If evidence changes tomorrow, use the new best candidate.
TikTok's current rate-limit behavior is a good reason not to use it first.
This question should not have survived the classifier.
32. Old crons during migration
APPROVE HANDOFF SEMANTICS.
Exactly one dispatch authority for a given effect window.
Old path may remain active for unmigrated windows/classes.
At handoff:
old authority stops → checkpoint → new authority begins.
Never shadow-run real external effects.
Shadow the decision, not the effect.
33. Tenant hostile gate
APPROVE ALL SIX AS MINIMUM BINDING TESTS.
And don't stop at six forever.
They establish the minimum:
- A cannot read B;
- A approval cannot approve B;
- request body cannot substitute trusted tenant;
- missing context fails closed;
- cross-tenant admin requires explicit capability;
- projections don't leak.
Before second external tenant, also attack caches, vectors, logs, exports, backup/restore, replay and Ask FYD context construction.
The six are minimum acceptance, not complete proof of isolation.
34. Historical tenant scope
REJECT AUTOMATIC "DEFAULT TENANT" BACKFILL.
This is important.
If historical evidence does not prove tenant scope, do not invent it.
Use:
tenant_scope = UNKNOWN
or a typed legacy scope until provenance proves otherwise.
Where a deterministic mapping can be established, append a scoped annotation with provenance.
Never rewrite canonical history.
Never convert:
UNKNOWN → default Nolan tenant
just to make queries easier.
That violates the very rule we're protecting:
UNKNOWN > FICTION.
35. Classifier operating target
APPROVE STRONGLY.
No question quota.
No minimum.
No "37."
The objective is:
minimum human interruption subject to zero unauthorized authority assumptions.

Weekly metrics should include false escalations and missed escalations.
A classifier that asks zero questions because it silently assumes authority is worse than one that asks too many.
36. Weekly audit
APPROVE ADVERSARIAL FORMAT.
Include:
asked correctly
asked unnecessarily
should-have-asked-but-didn't
autonomously resolved correctly
held correctly
incorrect authority assumption
duplicate/repeated question
time-to-owner-decision
effect prevented by escalation.
First weekly audit date in the source is October 4, 2026.    Pasted markdown
Keep it concise unless anomalies require investigation.
37. Coordinator standing delegation
APPROVE, WITH THIS EXACT OPERATING BOUNDARY.
Coordinator may autonomously:
- inspect any relevant worktree;
- dispatch read-only investigators/falsifiers;
- run tests;
- perform bounded research/harvesting;
- classify backlog;
- create reversible changes inside explicitly assigned worktrees;
- select one writer per semantic unit;
- supersede a proposed patch when stronger evidence already exists;
- spend inside already-authorized mission/provider budgets;
- stop/HOLD work;
- retire work only after preservation/supersession proof;
- integrate changes when existing integration policy explicitly authorizes it and all required gates pass.
Coordinator may not invent authority for:
- public publication;
- external messages/actions outside standing policy;
- spending beyond budget;
- new credentials/access;
- secret-policy weakening;
- new privacy posture;
- production destructive operations;
- unresolved cross-tenant actions;
- irreversible deletion of unknown work;
- changing constitutional authority;
- granting itself additional delegation.
The source correctly identifies the core problem: an open-ended "implement it all" can itself become an accidental authority grant.    Pasted markdown
The coordinator is delegated execution and convergence, not sovereignty.
NOW CLOSE THE QUESTION ERA
And I mean actually close it.
Batch 7 says it is "the last batch," but it still produced exactly 37 questions.    Pasted markdown That is useful final training data because several of these should not have reached you.
Questions 2, 7, 9, 10, 11, 12, 14, 16, 20, 22, 23, 24, 26, 30, 31, 32, 33, 35 and 36 are largely derivable from existing constitutional rules, evidence, or reversible experimentation.
The classifier still has work to do.
Do not create Batch 8.
The next owner question should look like:
APPROVAL REQUIRED — PING Social candidate has passed all six gates. Publish SHA abc123 to the stable public URL?
YES / NO

or:
AUTHORITY REQUIRED — This customer requested FYD to publish posts autonomously for 30 days. Existing policy does not authorize this delegation class. Approve the scoped grant?
YES / NO / MODIFY

That is the product.
Not another essay containing 37 theoretically interesting choices.
BRUTAL CEO 24-HOUR SPRINT — EXECUTION ORDER
The second half of the file already identifies the right immediate sequence: protect the staged audit/PII repair, diagnose the runtime spawn refusal, repair/red-team the execution boundary, rerun migration proof, establish one executor, prove migration without effects, and keep live dispatch gated.    Pasted markdown
I would lock that, with one refinement:
P0 — Preserve truth before touching anything. The main checkout has staged material capable of regressing the certified audit/PII repair. No reset, clean, blind staging, commit, or overwrite. Capture HEAD/status/staged+unstaged diffs/ownership/certified SHA, reconcile surgically, rerun the independent falsifier. The file explicitly requires both the certified fix and unrelated owned work to survive.    Pasted markdown
P1 — Make spawn refusal explain itself. Find the first denying component. DENIED, FAILED, UNKNOWN, and RETRYABLE remain distinct. Don't retry until lucky. Then hostile-test capability absence, budget exhaustion, saturation, unavailable worker/adapter, spawn failure, timeout, cancellation, duplicate dispatch, and restart. That's the right runtime standard.    Pasted markdown
P2 — Establish one executor of record. Hermes or lane-C can win. Neither wins by name. The one satisfying the canonical execution contract with the strongest current evidence becomes executor for the bounded proof. No silent failover and no dual execution authority.    Pasted markdown
P3 — Prove to the external-effect boundary first. MissionIntent → classification → consequence → capability → budget → approval → executor → dry-run plan → expected effect → expected receipt. Then stop unless the exact real effect is already authorized.    Pasted markdown
P4 — Red-team external-effect uncertainty brutally. Especially crash-after-call, network disappearance, timeout, missing receipt and retry. Once dispatch may have happened, UNKNOWN means reconcile before retry. That's one of the highest-value invariants in the entire system.    Pasted markdown
P5 — Then hammer customer value. Don't let Mission Control become the product. The source correctly restates the actual loop as SOURCE → EVIDENCE → OBJECT GRAPH → GENERATED EXPERIENCE → ASK FYD → OWNER INTENT → PROPOSAL → APPROVAL → CHANGE → OUTCOME → LEARNING.    Pasted markdown
For the next 24 hours, the coordinator should keep the 16-lane rolling swarm saturated with real work, not synchronize everybody into waves. Every completion feeds verification or the next highest-leverage task. Expensive agents go to ambiguity, semantic review, security/privacy, root cause and product judgment; cheap/headless workers hammer archaeology, tests, worktree comparison, clean checkout, screenshots, reachability, hostile cases and provenance.
And the CEO scoreboard should be brutally small:
Customer-visible improvement. Broken invariants closed. Independent falsifications passed. UNKNOWNs resolved without fiction. Duplicate authorities removed. Worktrees converged without losing work. Reached runtime proofs. Spend. Remaining true owner blockers.
No score for files created.
No score for architectural nouns.
No score for agents being busy.
No score for questions generated.
No score for "implemented" without independent proof.
The file's final definition of NEVER DONE is the right one: it does not mean keep adding things; it means find the next broken invariant or customer bottleneck, fix it, falsify the fix, and move forward.    Pasted markdown
Batch era over. Brutal CEO execution mode starts now.
