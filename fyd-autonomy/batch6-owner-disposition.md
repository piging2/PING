# Batch 6 — Authority Adjudication (2026-09-26, authoritative, Nolan verbatim)

GOOD BATCH.

BUT DO NOT TURN "HUMAN CONSTITUTIONAL AUTHORITY" INTO:

"NOLAN MUST PERSONALLY APPROVE EVERYTHING FOREVER."

THAT WOULD BE A DESIGN FAILURE.

THE HUMAN DEFINES THE CONSTITUTION.

THE SYSTEM OPERATES INSIDE IT.

## MISGUIDED PRINCIPLE #1

"SOLE HUMAN AUTHORITY"
!=
"SOLE RUNTIME APPROVER."

Correct model:

NOLAN
↓
DEFINES POLICY / DELEGATION
↓
CAPABILITY AUTHORITY
↓
DETERMINISTIC POLICY
↓
AUTOMATIC LOW-RISK EXECUTION
OR
HUMAN APPROVAL.

The purpose of capability architecture is precisely to avoid asking the
human repeatedly about decisions the human has already made.

## MISGUIDED PRINCIPLE #2

"APPEND ONLY"
!=
"STORE EVERYTHING FOREVER."

Canonical audit events may be immutable.

Sensitive payloads do NOT therefore belong inside immutable events.

Prefer:

EVENT
{
action,
actor,
capability,
object_ref,
evidence_digest,
result,
timestamp
}

while sensitive material lives behind revocable references with an
appropriate retention lifecycle.

Never make:

PII
provider tokens
identity documents
visitor messages
secrets

undeletable merely because the event journal is append-only.

## MISGUIDED PRINCIPLE #3

"MISSION CONTROL FRONT DOOR"
!=
"MISSION CONTROL BECOMES AUTHORITY."

Maintain the axiom already established:

Mission Control projects authority.

It does not become authority.

Mission Control should submit:

INTENT.

Existing authorities decide:

IDENTITY
CAPABILITY
POLICY
EXECUTION
EVENT
PROJECTION.

DO NOT create:

MissionControlAuthority.

---

## Per-question adjudication

MISSION CONTROL CUTOVER — DECISION: YES — DEFAULT ACCEPTED WITH MODIFICATION.

Migrate incrementally.

Do NOT make every old subsystem call an enormous Mission Control service.

Define one narrow dispatch contract:

MissionIntent
→ validate
→ authorize
→ dispatch
→ observe.

Legacy callers become adapters to that contract.

Once a caller is migrated and replay-tested, direct bypass becomes
illegal for THAT mission class.

No flag day.

ENGAGEMENT AS MISSIONS — DECISION: YES — BUT MODEL THEM CORRECTLY.

Move them behind the mission/event spine.

Do NOT make every:

like
follow
page load
candidate inspection

a separate heavyweight mission.

Use:

ENGAGEMENT PASS = mission

with child:

observations
candidate decisions
external-effect attempts
receipts.

This keeps Mission Control useful instead of drowning it.

HERMES CONSEQUENTIAL EXECUTION — DECISION: DEFAULT ACCEPTED.

Transport proof alone is insufficient.

Require:

transport
timeout
nonzero exit
worker disappearance
retry
duplicate dispatch
effect-after-timeout
receipt recovery
UNKNOWN reconciliation.

Then authorize CONSEQUENCE CLASSES, not "Hermes generally."

Example:

filesystem patch in worktree:
AUTHORIZED

production deploy:
SEPARATE CLASS

social post:
SEPARATE CLASS

email:
SEPARATE CLASS.

PIG ENVIRONMENT MUTATION — DECISION: DEFAULT DENY ON SHARED HOST.

But do not require Nolan every time.

Create policy classes:

EPHERMERAL SANDBOX DEPENDENCY
→ automatic if allowlisted

WORKTREE PACKAGE DEPENDENCY
→ automatic under repo policy

HOST SOFTWARE INSTALL
→ approval required

OS/DRIVER/SECURITY CONFIG
→ approval required.

This preserves velocity without letting an agent mutate shared
infrastructure casually.

JEV PROMOTION — RECOMMENDATION AS WRITTEN IS TOO CONSERVATIVE.

Do NOT require Nolan to manually approve every future rung forever.

Instead Nolan approves the PROMOTION POLICY.

Example:

SHADOW
→ ADVISORY

requires:
N verified cases
calibration threshold
zero prohibited-effect violations
replay consistency.

ADVISORY
→ AUTOMATED_LOW_RISK

requires stricter criteria.

For the FIRST promotion of each consequential class:

Nolan approves.

After the mechanism itself is proven, purely low-risk classes may promote
under pre-authorized policy.

Authority remains Nolan's because Nolan authorized the rule.

APPROVAL DELEGATION — REJECT "SOLELY WITH NOLAN FOREVER."

Correct:

Nolan owns DELEGATION AUTHORITY.

He may delegate:

capability
scope
resource
effect class
spend
duration
revocation.

Example:

agent X may regenerate preview sites
for tenant Y
for 24 hours
with $2 intelligence ceiling
but may not publish.

This is one of PING's core primitives.

USE IT.

AUDIT APPEND-ONLY — ACCEPT WITH PRIVACY CORRECTION.

Canonical event history:

APPEND ONLY.

Corrections:

SUPERSEDING EVENTS.

But erasure/redaction cannot mean pretending data never existed.

Separate:

AUDIT METADATA

from:

ERASABLE PAYLOAD.

Example:

visitor requested deletion
→ sensitive payload deleted
→ audit event remains:

DATA_ERASURE_COMPLETED
subject_digest
policy
timestamp.

Never put secrets or unnecessary PII into immutable history.

OWNER IDENTITY STORE — REJECT IMPLEMENTATION PRESCRIPTION.

"Pig only" is not a constitutional decision.

The principle is:

MINIMIZE STORED IDENTITY EVIDENCE.

Where possible, do NOT retain identity documents at all.

Verify:
document / credential / provider assertion

then retain:

verification claim
method
issuer
assurance
timestamp
expiry
evidence digest/reference.

If raw evidence must exist:

encrypted
strict capability
bounded retention
erasable.

Do not design a permanent identity-document vault before proving we need
one.

LINKEDIN — HOLD.

Correct.

Not relevant to current product proof.

OFF-TAILNET MISSION CONTROL — HOLD PUBLIC EXPOSURE.

But don't constitutionalize Tailscale itself.

Requirement:

AUTHENTICATED PRIVATE CONTROL CHANNEL.

Current implementation:

TAILNET.

Future:

passkey/device-bound auth
VPN
private gateway
other strong mechanism.

Keep transport replaceable.

OFFSITE BACKUP — YES.

This one matters.

But back up:

canonical history
critical configuration
encrypted required state

rather than blindly imaging every cache/projection.

Mandatory proof:

RESTORE.

A backup that has never restored is not a backup.

SPEND POLICY — ACCEPT.

But the real primitive should be:

BUDGET CAPABILITY.

Mission receives:

token budget
money budget
wall-clock budget
tool-call budget
loop ceiling.

Executor cannot exceed it without escalation.

Eventually this becomes generic infrastructure for every agent.

PRICING TIERS — HOLD.

Do not burn Nolan's attention deciding three permanent tiers before a
real customer conversation.

Rule:

NO AUTOMATED SYSTEM MAY QUOTE AN UNAUTHORIZED PRICE.

Pricing itself remains product discovery.

PING WEBSITE PUBLICATION — ACCEPT.

Explicit publication authorization.

Publishing is a real external effect.

FYD LAUNCH ANNOUNCEMENT — ACCEPT HOLD.

Product proof first.

PORTFOLIO CONSENT — ACCEPT.

Explicit opt-in.

Record consent as capability/evidence.

Revocation must propagate to projections.

OBSERVATION RETENTION — ACCEPT PRINCIPLE.

But do not invent arbitrary retention periods tonight.

Implement lifecycle support:

ACTIVE
STALE
SUPERSEDED
SUPPRESSED
ERASURE_REQUESTED
ERASED.

Then policy chooses durations.

Observation metadata and provenance may outlive raw acquired content
where legally and operationally appropriate.

VISITOR CONVERSATION VISIBILITY — MODIFY.

Do not say:

"visible to site owner"

as an unconditional default.

A visitor may ask something that the owner has no need to retain.

Use purpose limitation.

Classify interaction:

EPHEMERAL Q&A
LEAD
SERVICE REQUEST
OWNER-HANDOFF
SYSTEM DIAGNOSTIC.

Retention follows purpose.

And:

NO TRAINING USE BY DEFAULT.

DATA LEAVING DEVICE — THE PROPOSED DEFAULT IS TOO ABSOLUTE.

If every ordinary model call containing public business data requires
Nolan approval, FYD becomes unusable.

Instead classify data:

PUBLIC
OWNER
CONFIDENTIAL
SECRET
REGULATED/SENSITIVE.

Then destinations have allowed classes.

Example:

public website content
→ approved model provider allowed

provider token
→ NEVER model context

private owner notes
→ only explicitly approved processors.

The human approves the DATA POLICY.

Not every packet.

AI DISCLOSURE — REJECT THE BLANKET REQUIREMENT.

Do not clutter every generated site with:

"THIS WEBSITE WAS AI GENERATED."

That is implementation provenance, not necessarily visitor-relevant
information.

Separate two questions:

CONTENT/SITE GENERATED WITH AI

versus

VISITOR IS INTERACTING WITH AN AI AGENT.

For Ask FYD:

transparent AI identity is sensible.

For static rendered website:

do not impose disclosure without legal/product evidence requiring it.

LLC — THIS IS A BUSINESS/LEGAL DECISION, NOT ARCHITECTURE.

Default recommendation remains:

resolve entity/contracting posture before accepting paying customers.

Do not let this block technical product proof.

LEGAL PACKET — YES BEFORE REAL CUSTOMER DATA/COMMERCIAL LAUNCH.

But "no real owner may onboard without full lawyer-authored packet" may
unnecessarily block a controlled prototype.

Separate:

PRODUCT RESEARCH PILOT

from:

COMMERCIAL SERVICE.

Get qualified counsel for actual legal commitments.

TRADEMARK — HOLD.

Not an engineering blocker.

Perform clearance before investing heavily in the final brand.

Human/legal decision later.

MONUMENT VIEW TRIAL — ACCEPT BOUNDED PILOT CONCEPT.

But minimize terms.

We need to learn.

Do not turn first user into procurement.

Define:

scope
duration
data use
publication
exit
cost.

Nothing more than necessary.

PROPRIETARY HARVEST — ACCEPT:

KEEP OPTIONS OPEN.

But immediately maintain dependency provenance and license compatibility.

"Proprietary" does NOT mean harvested code may be copied regardless of
license.

Every executable harvest keeps:

SOURCE
LICENSE
VERSION/SHA
PURPOSE
WRAPPER
TEST.

APPROVAL CHANNEL — THIS DOES NOT REQUIRE A CONSTITUTIONAL DECISION NOW.

Use current chat/feed.

Measure missed approvals and latency.

Then improve.

Do not ask Nolan to design notification infrastructure from taste.

APPROVAL SURFACE — MODIFY SIGNIFICANTLY.

There should not be TWO competing approval authorities.

Chat and Mission Control are PRESENTATIONS of the same pending approval
object.

Canonical model:

ApprovalRequest
{
id
proposal_digest
capability
actor
consequence
expires_at?
}

Chat:
approve(id)

Mission Control:
approve(id)

Both invoke SAME authorization transition.

Neither surface owns approval.

APPROVAL TIMEOUT — ACCEPT STRONGLY.

SILENCE IS NEVER APPROVAL.

Default:

HOLD.

Optional mission-class policy:

EXPIRE_DENY
EXPIRE_CANCEL
EXPIRE_REPLAN.

Never:

EXPIRE_APPROVE

unless an extremely specific pre-authorized policy can prove why that is
safe.

2FA WAIT POLICY — MODIFY.

Do not create an Instagram-specific constitutional carve-out.

Generalize:

AUTH_CHALLENGE_DETECTED
→ mission WAITING_HUMAN_AUTH
→ human completes authentication directly
→ executor resumes.

Agent never sees:

password
OTP
recovery code.

This should work for any provider.

INCIDENT RESPONSE — DEFAULT IS TOO SIMPLE.

"Delete promptly" may destroy useful context or worsen a public
conversation.

Classify:

incorrect factual statement
duplicate action
wrong recipient
offensive content
privacy disclosure
unauthorized commitment.

Then response policy:

DELETE
CORRECT
APOLOGIZE
ESCALATE
NO_ACTION.

Every remediation becomes another recorded external effect.

37-QUESTION BATCHES — YES.

CLASSIFIER ONLY.

THIS SHOULD BE THE LAST ARTIFICIAL 37-QUESTION EXERCISE.

Questions are a scarce human interrupt budget.

Mission Control should optimize:

HUMAN DECISIONS PER UNIT OF CONSEQUENCE,

not:

NUMBER OF QUESTIONS GENERATED.

BRAND BOUNDARIES — PARTIALLY HUMAN TASTE.

But don't ask Nolan to enumerate every dangerous topic.

Default conservative policy can automatically avoid:

political persuasion
religious persuasion
tragedy exploitation
personal attacks
unverified allegations
sensitive personal attributes.

Then Nolan defines brand-specific additions.

ASK FYD IDENTITY — YES.

"AI concierge for [business]" is a strong default.

Never impersonate owner/person.

More important:

the concierge must distinguish:

FACT FROM EVIDENCE

from:

GENERATED SUGGESTION.

TENANCY — YES TO TENANT-AWARE DATA MODEL.

NO TO OVERBUILDING MULTI-TENANT INFRASTRUCTURE NOW.

Every relevant:

mission
event
object
relationship
approval
capability

carries tenant/owner scope.

Then enforce current single tenant.

Before second external tenant:

run cross-tenant isolation tests and enforce storage/query boundaries.

EXPAND SOCIAL TARGETING — HOLD BUSINESS-ONLY.

Correct.

No need to expand while product loop itself remains the constraint.

AUTONOMOUS PROSPECT REPLIES — DRAFT-ONLY FOR NOW.

Correct.

But design for progressive delegation:

FAQ factual reply
→ candidate for future automation

pricing negotiation
→ human

contract commitment
→ human

complaint
→ human.

Again:

CLASSIFY CONSEQUENCE.

Do not make "all replies" one authority class.

MONUMENT VIEW INFRASTRUCTURE — DEFAULT ACCEPTED FOR PILOT.

FYD-owned temporary hostname.

Do not touch customer DNS until:

they see value
they authorize publication
handoff/rollback is clear.

---

## The constitutional correction

The most important correction is constitutional: human authority is not
the same as human micromanagement. Nolan should determine policy, risk
appetite, delegations, publication, money, credentials, privacy posture,
and irreversible commitments. Deterministic software should then operate
inside those boundaries. Modern agent systems are converging on exactly
this shape: sensitive calls can pause durably for approval while low-risk
calls can be decided programmatically; approval state can survive process
restarts. ATProto is independently moving toward granular and
progressively requested permissions rather than blanket authority.

THE BIG DISCOVERY IS NOT THE 37 ANSWERS.

IT IS THAT THE AUTHORITY MODEL NEEDS ONE MORE DIMENSION:

CONSEQUENCE CLASS.

Right now too many questions collapse into:

AUTOMATIC
vs
ASK NOLAN.

That is too crude.

Introduce a small policy concept:

CONSEQUENCE
{
reversibility
external_effect
money
publication
privacy
credential_access
destructive_scope
commitment
}

Then:

INTENT
↓
CAPABILITY
↓
CONSEQUENCE CLASSIFIER
↓
POLICY
/
AUTO APPROVAL
↓
NOLAN

Jev may help CLASSIFY ambiguous consequence.

Jev does NOT AUTHORIZE.

NO:

ConsequenceAuthority
ApprovalAuthority
PrivacyAuthority
SpendAuthority
PublicationAuthority.

These are POLICY INPUTS to the existing capability/authorization path.

Keep the rule of one.

Modern agent runtimes support durable interruption:

tool call
→ approval required
→ run pauses
→ approval/rejection
→ same run resumes.

HARVEST THE PATTERN.

DO NOT IMPORT ANOTHER ORCHESTRATOR.

Modern protocol permission systems are also moving toward:

GRANULAR RESOURCE PERMISSIONS
+
HUMAN-READABLE PERMISSION SETS
+
PROGRESSIVE PERMISSION REQUESTS.

HARVEST THAT IDEA FOR PING CAPABILITIES.

A user should not grant:

"FYD MAY CONTROL MY SOCIAL ACCOUNTS."

They should eventually see something like:

READ PUBLIC PROFILE

READ MY FOLLOWING

CREATE FYD RELATIONSHIPS

PUBLISH POSTS

LIKE/REACT

FOLLOW EXTERNAL ACCOUNTS.

Request the stronger capabilities only when the feature needs them.

The 37 questions reveal the minimum Mission Control model.

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

Mission Control should answer:

WHAT IS RUNNING?

WHY?

WHO REQUESTED IT?

WHAT MAY IT DO?

WHAT WILL IT COST?

WHAT CONSEQUENCE CLASS IS IT?

WHAT IS WAITING FOR ME?

WHAT ACTUALLY HAPPENED?

CAN IT BE STOPPED?

CAN IT BE REPLAYED/EXPLAINED?

That is enough.

---

## Why Nolan changed several defaults

Current ecosystem work strongly supports scoped authority rather than
permanent human bottlenecks. The OpenAI Agents SDK now treats approvals
as durable interruptions: sensitive tool calls can pause, serialize
state, and resume after approval, while policy callbacks can automatically
resolve calls that don't require a human. It also explicitly warns that
serialized approval state must remain server-controlled and authenticated
rather than being trusted from a browser. That maps very closely to
PING's proposal → approval → execution direction.

AT Protocol's current authorization design is even more directly useful.
It supports granular permissions tied to particular record collections/
actions, human-readable permission sets, and progressive scope requests
instead of asking users for everything up front. Harvest that UX model
for PING capabilities. A customer should connect a social account with
read-only identity/profile access first; follow/publish/media capabilities
should appear only when they actually invoke those features.

MCP's July 2026 specification is also moving in a direction useful to
PING: a stateless core, explicit authorization hardening, routable
request metadata, and long-running Tasks moved into an extension rather
than contaminating the core protocol. That's another argument for keeping
Mission Control orchestration outside the constitutional object/event
core.

Pushback on Q8's "store owner identity documents on the Pig": the better
design goal is not having the documents whenever a verification assertion
will do. NIST's current identity guidance emphasizes collecting only
what's needed, limiting retention, explicit notice, and manageable
alteration/deletion/selective disclosure. PING should store the smallest
durable proof that an ownership verification occurred, not automatically
become a vault full of passports and IDs.

Q34 is directionally right but should not trigger another multi-tenancy
architecture wave. Put tenant_id/owner scope into the semantic boundary
now and test default-deny isolation before the second external tenant.
PostgreSQL's row-level security is available later as one enforcement
layer and defaults to deny when RLS is enabled without an applicable
policy, but don't mistake RLS itself for the tenant authority model.

The biggest flaw Batch 6 uncovered is actually encouraging: the system is
mature enough that binary AUTO vs ASK NOLAN is now inadequate. The next
leverage is consequence-aware, scoped, revocable delegation, not another
37 decisions.

One other positive signal is important: the coordinator explicitly cut the
Jev ceiling increase, cloud standby, premature SLA, and hardware refresh
because current evidence did not justify interrupting Nolan. That is
exactly the behavior to reinforce. The next improvement is getting it
comfortable returning 7 real questions instead of 37 when only seven
actually survive the classifier.

---

## Batch 6 as classifier training data

Replay why these 37 reached Nolan. They should not all have. Classify
them:

TRUE OWNER AUTHORITY
13 pricing
14 PING publication
15 FYD announcement
16 customer marketing consent policy
24 real first-customer terms
25 licensing posture
32 brand boundaries
35 personal-profile outreach
36 autonomous prospect replies.

CONSTITUTION ALREADY MOSTLY ANSWERED
1 dispatch convergence
2 mission wrapping
3 Hermes capability progression
4 host mutation
5 Jev authority
6 approval delegation
7 audit semantics
27 approval binding
28 silence
34 tenancy.

NEEDS RESEARCH/EVIDENCE BEFORE OWNER DECISION
8 identity storage implementation
11 backup destination
17 retention durations
18 conversation retention details
19 current data egress
20 exact AI disclosure requirements
21 entity structure
23 trademark strategy.

PREMATURE / DEFAULT SUFFICIENT
9 LinkedIn
10 public MC access
12 numerical post-sprint ceiling
22 exact legal packet mechanics
26 notification expansion
29 generalized challenge handling
30 universal incident action
37 final trial infrastructure.

That is how the classifier gets better. Don't train it on "Nolan
answered 37 questions." Train it on "Which of these 37 should ever have
interrupted Nolan?"

---

## Wire everything through Mission Control

Do not wait for a grand cutover. Start producing reached paths.

Every active worktree must be visible to the coordinator:

repository
worktree
branch
HEAD
dirty state
semantic owner
active writer
associated mission
starting SHA
latest tested SHA
integration target
divergence from target
HOLD/UNKNOWN state.

PAY ATTENTION TO ALL WORKTREES DOES NOT MEAN MUTATE ALL WORKTREES.

It means observe them before every consequential write/integration
decision.

Before assigning a writer:

reobserve target worktree
reobserve sibling worktrees touching same semantic unit
inspect overlapping diffs
determine current authority
establish one writer.

A parallel implementation appearing is new evidence.

It can supersede the proposed patch.

### Worktree convergence loop

For every active worktree:

DISCOVER
→ HEAD/BRANCH
→ DIRTY/UNTRACKED
→ DIFF
→ SEMANTIC UNITS
→ OVERLAP
→ TEST STATUS
→ REACHABILITY
→ KEEP / HARVEST / SUPERSEDE / MERGE / RETIRE / UNKNOWN.

Never assume newest worktree is best.
Never assume main is best.
Never assume a passing test means reached runtime.
THE BEST CURRENT EVIDENCE WINS.
USE THE HEADLESS SWARM HARD.

Keep a rolling queue of at least 16 meaningful tasks while real work
exists. Healthy identities continuously consume:

archaeology
reachability tracing
worktree comparison
clean-checkout testing
hostile testing
provenance analysis
runtime/source comparison
TODO/FIXME classification
documentation drift
dependency/license review
website visual criticism
screenshot comparison
accessibility/performance testing
Mission Control bypass discovery
restart/recovery falsification
Jev shadow scoring.

Use expensive reasoning at:

authority forks
conflicting evidence
dangerous writes
privacy/security decisions
root-cause ambiguity
architecture convergence
product taste.

One writer per semantic unit.
Many investigators.
Many falsifiers.

### Mission Control acceptance

Do not declare Mission Control finished because its UI looks complete.

It becomes credible when real work proves:

A. A real observation enters canonical truth.
B. It causes/updates a real mission.
C. Mission Control displays it without inventing state.
D. Policy/capability permits or denies execution.
E. An actual executor (WorkerRuntime, Hermes, or another authorized
provider) receives it.
F. Executor result returns.
G. Potential external effect is classified correctly.
H. Independent verification can disagree with executor.
I. Evidence becomes inspectable.
J. HOLD actually prevents redispatch.
K. Restart preserves/reconstructs the state.
L. Replay explains the path.
M. Tenant isolation survives hostile tests.
N. Another dispatch path cannot silently bypass the canonical route for
a migrated mission class.

Then migrate the next surface.

### Website sprint continues in parallel

Do not let Mission Control eat the product.

The 24-hour design mission remains live.

Use its activity as Mission Control's richest workload:

harvest
screenshot
critique
candidate generation
comparison
revert
hardening
final candidate.

The final websites must be dramatically better than the procedural page
that triggered this sprint.

Keep the separation:

VISITOR = beautiful business presence
OWNER = conversational control
LAB = evidence/debugging
MISSION CONTROL = operational truth/control

Never leak raw graph machinery, capability verdicts, numbered Why-this
internals, demo-owner warnings, digest chatter, or engineering semantics
into the visitor page again.

---

## Continuous operating law

OBSERVE ALL WORKTREES.
WRITE TO ONE.
REOBSERVE BEFORE MERGE.
MISSION CONTROL PROJECTS AUTHORITY; IT DOES NOT INVENT IT.
JEV CLASSIFIES; IT DOES NOT AUTHORIZE.
HERMES EXECUTES; IT DOES NOT GOVERN.
POLICY CAN AUTHORIZE; SILENCE CANNOT.
AUDIT HISTORY IS IMMUTABLE; SECRETS/PII DO NOT BELONG IMMUTABLY INSIDE IT.
BACKUP IS UNPROVEN UNTIL RESTORE WORKS.
AN APPROVAL BINDS AN EXACT DIGEST, NOT A VAGUE YES.
EXTERNAL-EFFECT UNKNOWN MEANS HOLD.
IMPLEMENTER NEVER CERTIFIES ITSELF.
PARALLEL WORK IS EVIDENCE, NOT AN INCONVENIENCE.
THE BEST CURRENT EVIDENCE WINS.
NO MORE ARTIFICIAL 37-QUESTION TARGETS.
FINISH MISSION CONTROL THROUGH REAL REACHED PATHS.
KEEP THE WEBSITE SPRINT MOVING.
KEEP THE SWARM FED WHILE REAL WORK EXISTS.
GO.

---

## O1-O17 interpretations (binding additions from this adjudication)

MISSION CONTROL PROJECTS AUTHORITY; IT DOES NOT OWN IT.
JEV CLASSIFIES; IT DOES NOT AUTHORIZE.
HERMES EXECUTES; IT DOES NOT GOVERN.
HUMAN AUTHORITY DEFINES POLICY; IT IS NOT A SUBSTITUTE FOR POLICY.
SILENCE IS NOT CONSENT.
UNKNOWN IS A VALID TERMINAL/RECOVERY STATE.
PROSE IS NOT AUTHORITY.
OBSERVATION IS NOT AUTHORIZATION.
PROPOSAL IS NOT EXECUTION.
EXECUTION IS NOT SUCCESS.
SUCCESS WITHOUT DURABLE RECEIPT MAY BE UNKNOWN.
AUDIT IMMUTABILITY DOES NOT REQUIRE PII IMMUTABILITY.
DELEGATION IS EXPLICIT, SCOPED, REVOCABLE, AND EXPIRING.
BUDGET IS A CAPABILITY CONSTRAINT.
PUBLICATION IS AN EXTERNAL EFFECT.
OWNER DATA IS MINIMIZED BY DEFAULT.

## Standing directives from this adjudication

- DO NOT BUILD BATCH 7. No more artificial fixed-size question batches. Escalate organically when actual authority is required.
- Turn the per-question adjudications above into: consequence classification, scoped delegation, durable approval request, budget constraints, Mission Control projection, worktree-aware execution evidence. Then return to the product.
- Inventory all active worktrees and overlapping authority/runtime work. Preserve the currently proven FYD product branch and its tests.
- Build the narrow MissionIntent front door (validate → authorize → dispatch → observe). Add consequence metadata to policy evaluation — NOT a new authority.
- Project WAITING_APPROVAL into Mission Control. Chat and Mission Control resolve the SAME approval request (neither surface owns approval).
- Add mission budget constraints.
- Migrate ONE existing engagement pass through the spine. Prove: dispatch, hold, approve, deny, timeout, worker death, UNKNOWN, receipt, replay. Only then migrate the other engagement passes.
- Keep FYD product work moving independently.

THE SYSTEM IS NOT SUCCESSFUL WHEN IT CAN ASK NOLAN 37 PERFECT QUESTIONS.
THE SYSTEM IS SUCCESSFUL WHEN IT KNOWS THE 35 QUESTIONS IT DOES NOT NEED
TO ASK, SURFACES THE 2 THAT ACTUALLY REQUIRE HUMAN JUDGMENT, AND CAN
EXPLAIN EXACTLY WHY.
THAT IS MISSION CONTROL.
BUILD THAT.
