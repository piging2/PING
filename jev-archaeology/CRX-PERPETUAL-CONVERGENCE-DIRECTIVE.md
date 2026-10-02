# CRX PERPETUAL CONVERGENCE / AUTONOMY DIRECTIVE

Issued by Nolan, 2026-09-22 ~20:07 MDT. Verbatim record. This is the standing directive for the Jev/CRX lane: Jev is a SEPARATE PROGRAM from the FYD product sprint and must not block FYD's product loop.

## MISSION

You have completed deep convergence archaeology.

NOW ATTACK YOUR OWN FINDINGS.

Your job is no longer merely to find missing architecture.

Your job is to continuously convert:

UNKNOWN
CONTRADICTION
DUPLICATION
DORMANT VALUE
MISSING CONNECTION
WEAK PROOF
MISLEADING DOCUMENTATION
UNSAFE AUTONOMY
UNVERIFIED ASSUMPTION
FAILED TEST
STALE DESIGN
ORPHANED IMPLEMENTATION
PERFORMANCE WASTE
SECURITY GAP
RECOVERY GAP

into bounded, evidence-backed work.

DO NOT STOP WHEN THE CURRENT BACKLOG IS EMPTY.

An empty backlog means:

DISCOVER AGAIN.

## 0. CRITICAL CORRECTION TO YOUR OWN REPORT

Do not confuse:

ARCHAEOLOGY COMPLETE

with:

SYSTEM UNDERSTOOD.

The audit is a snapshot.

The repository is moving.
Runtime can differ from HEAD.
Worktrees diverge.
Documentation becomes stale.
Tests can prove the wrong invariant.
A green result can conceal an incomplete specification.

Therefore every conclusion has:

OBSERVED_AT
SOURCE_REVISION
RUNTIME_REVISION
EVIDENCE
CONFIDENCE
INVALIDATION CONDITIONS

A conclusion without invalidation conditions is not durable knowledge.

## 1. YOUR BIGGEST CURRENT FLAW

You have a sophisticated EVENT SYSTEM.

You do NOT yet have a sophisticated AUTONOMOUS WORK SYSTEM.

Do not mistake the two.

The event spine can answer substantial questions about:

EVENT -> EVENT -> EVENT

but autonomous engineering needs:

WHY WAS THIS WORK DISCOVERED?
WHO CLAIMED IT?
WHAT SNAPSHOT DID THEY RECEIVE?
WHAT MEMORY INFLUENCED THEM?
WHAT CAPABILITIES DID THEY HAVE?
WHAT DID THEY ATTEMPT?
WHAT EXTERNAL SIDE EFFECTS OCCURRED?
WHAT WAS VERIFIED?
WHAT REMAINS UNKNOWN?
WHO MAY RETRY?
HOW DOES ANOTHER WORKER RESUME?
WHAT NEW WORK DID THIS RESULT DISCOVER?

Until those questions are reconstructable, CRX has event provenance,
not complete agent provenance.

## 2. DO NOT BUILD A SECOND ORCHESTRATION UNIVERSE

The archaeology already found a reachable but quiescent ExecutionEngine
universe duplicating the canonical pipeline.

This is dangerous.

Do NOT respond by creating:

AutonomyEngine
AgentRuntimeV2
TaskRuntime
RunRuntime
MCPRuntime
MemoryRuntime
ObservabilityRuntime

as another parallel architecture.

HARVEST FIRST.

For every proposed primitive:

SEARCH
-> CLASSIFY EXISTING IMPLEMENTATIONS
-> FIND LIVE CALLERS
-> FIND TESTS
-> FIND HISTORY
-> FIND BETTER ORPHANED IMPLEMENTATIONS
-> FIND DUPLICATES
-> DECIDE SALVAGE / CONNECT / CONVERGE / RETIRE / CREATE

CREATE is last.

## 3. ATTACK THE CURRENT TOP-10 ITSELF

The Top-10 is not automatically correct because archaeology produced it.

For every item ask:

IS THIS ACTUALLY ON THE CRITICAL PATH?
DOES SOMETHING ELSE ALREADY SOLVE IT?
WHAT DEPENDS ON IT?
WHAT CAN IT BREAK?
DOES IT CREATE A SECOND AUTHORITY?
DOES IT IMPROVE AUTONOMOUS PRODUCTIVITY?
CAN ITS BENEFIT BE MEASURED?
IS THE PROPOSED ORDER CORRECT?
IS THERE A CHEAPER CONNECTION?
IS THERE AN UNMERGED IMPLEMENTATION ALREADY BETTER?

Attempt to falsify the ranking before execution.

## 4. P0 — AUTONOMOUS LOOP IS NOT AUTONOMY

The audit found:

ExecutionEngine.startAutonomousLoop

can synthesize worker findings with hardcoded confidence 0.85 and feed them
into ConsensusEngine.evaluate.

This is not acceptable evidence semantics.

Treat this as a high-priority containment problem.

Determine:

CAN THE ROUTE EXECUTE TODAY?
WHAT AUTH IS REQUIRED?
WHAT STATE CAN IT MUTATE?
WHAT EVENTS CAN IT CAUSE?
WHAT ARTIFACTS CAN IT CREATE?
CAN SYNTHETIC CONFIDENCE PROPAGATE INTO DURABLE KNOWLEDGE?
CAN IT REACH PATCH/COMMIT PATHS?
CAN ANOTHER COMPONENT CONSUME THE RESULT AS VERIFIED?
CAN REPLAY/WITNESS ACCIDENTALLY LAUNDER THIS SYNTHETIC CONFIDENCE INTO
APPARENTLY STRONG EVIDENCE?

Important:

"kernel_verified" must never mean:

"the original epistemic claim was true."

Replay verification and epistemic verification are different concepts.

Audit this distinction everywhere.

## 5. 63/63 IS NOT ENOUGH

The report says:

63 REPLAY_COMPLETED
63 WITNESS_CREATED
63 LINEAGE_CREATED
0 refusals

DO NOT CELEBRATE THIS YET.

That can mean:

excellent correctness

OR

weak invariants.

Attempt to generate cases that MUST be rejected.

Malformed causal chain.
Missing parent.
Wrong correlation.
Tampered payload.
Identity mismatch.
Reordered causal events.
Duplicate semantic event.
Unknown event type.
Invalid transition.
Stale observation.
Conflicting authority.
Forged evidence reference.
Invalid witness prerequisite.

If all adversarial inputs still produce witnesses:

THE VERIFIER IS NOT VERIFYING ENOUGH.

We want meaningful rejection coverage.

## 6. REPLAY IS CURRENTLY TOO SHALLOW

The report proves ReplayWorker currently builds replay from one triggering
event despite getCorrelationGroup already existing.

Fixing C1 may be small code.

But first define what replay means.

Do NOT blindly feed every correlated event into replay.

Test:

causation ordering
correlation grouping
cycles
missing parents
duplicate events
cross-mission contamination
cross-tenant contamination
extremely large groups
partial histories
late arrivals
retries
superseded events

A correlation ID is not automatically a valid replay boundary.

Define the smallest deterministic replay closure.

## 7. LINEAGE IS TOO SHALLOW

Persisted LineageWorker output currently appears to contain only:

causationChain:[metadata.causation_id]

while richer lineage exists internally.

This risks creating a false impression of provenance.

Determine whether persisted lineage can reconstruct:

root observation
derived claim
classification
recommendation
projection
replay
witness
lineage

If not:

do not call it complete lineage.

Find the minimum connection necessary to persist useful lineage without
creating a competing graph authority.

## 8. THE PIPELINE ORDER NEEDS CONTRADICTION REVIEW

The report contains two sequences that are not obviously identical.

The live bridge mapping says:

OBSERVATION
-> CLAIM
-> CLASSIFICATION
-> RECOMMENDATION
-> PROJECTION
-> REPLAY
-> WITNESS
-> LINEAGE

The recommended first slice later describes:

DOCUMENT_IMPORT
-> OBSERVATION
-> CLAIM
-> REPLAY
-> WITNESS
-> LINEAGE
-> PROJECTION

Reconcile this.

DO NOT allow documentation to silently redefine runtime order.

Classify:

ACTUAL RUNTIME ORDER
INTENDED ORDER
FIRST-SLICE ORDER

If different, explain why.

## 9. EVENT IDENTITY REMAINS A CONSTITUTIONAL RISK

Do not minimize this because the event writer itself is resolved.

Main emit() creates one ID law.

PATCH 7A/7B creates another.

A convergence branch creates another variant.

The worst possible sprint outcome is introducing a fourth.

Before touching identity:

construct compatibility vectors.

Same logical event
-> implementation A
-> implementation B
-> implementation C

Compare:

canonicalization
field ordering
Unicode
numbers
null/missing
timestamps
metadata
causation
correlation
binary content
large integers

Determine whether disagreement is:

FORMAT ONLY

or

SEMANTIC IDENTITY DISAGREEMENT.

Never rewrite historical IDs.

Any convergence must be forward-compatible and migration-aware.

## 10. HASH SPRAWL IS STILL REAL

The fake SHA issue is historical and low severity.

Good.

But the audit found ~67 hash sites with only ~3 through canonical authority.

That may be a much larger actual problem.

Classify every hash use by semantic purpose:

CONTENT IDENTITY
EVENT IDENTITY
CACHE KEY
INTEGRITY
SIGNATURE INPUT
PASSWORD/SECRET
DEDUPE
ETAG
TEST FIXTURE
NON-SECURITY CHECKSUM

Do NOT force all hashes through one function merely for aesthetic convergence.

Different semantic purposes can legitimately require different algorithms.

Converge only identical responsibilities.

## 11. SIGNATUREAUTHORITY MAY BE DOCUMENTATION FICTION

The report labels missing SignatureAuthority a dangerous gap.

Challenge that.

Ask:

WHAT ACTUAL REQUIREMENT NEEDS SIGNATURES?
WHO SIGNS?
WHAT TRUST ROOT?
WHAT ATTACK DOES THIS PREVENT?
WHAT CURRENT CLAIM FALSELY DEPENDS ON SIGNATURES?

If documentation promises signed artifacts and runtime does not:

fix the documentation OR implement the required capability.

Do not build cryptography because a stale YAML says CRITICAL.

## 12. HUMAN APPROVAL IS NOT JUST AN ENDPOINT

Do NOT solve human authority by adding:

POST /approvals/:id/approve

and declaring victory.

Approval requires semantics.

WHO MAY APPROVE?
WHAT EXACT OBJECT?
WHAT VERSION?
WHAT EVIDENCE WAS VISIBLE?
WHAT ACTION IS AUTHORIZED?
FOR HOW LONG?
CAN IT BE REVOKED?
CAN IT BE SUPERSEDED?
CAN IT BE REPLAYED?
CAN THE APPROVED OBJECT CHANGE AFTER APPROVAL?
CAN AN AGENT SUBMIT AND APPROVE ITS OWN request?
CAN A REPLAYED APPROVAL AUTHORIZE A NEW SIDE EFFECT?

Approval must bind to the exact decision/action/version being authorized.

Prevent TOCTOU:

APPROVE X
then mutate X
then execute using old approval.

## 13. "NOLAN IS THE HUMAN" IS NOT AN AUTH MODEL

The archaeology calls Nolan the safe default human.

That may be operationally true today.

It is not sufficient architecture.

Human identity must eventually be an authenticated principal.

Do not encode:

if user == Nolan

into canonical authority.

Model:

PRINCIPAL
ROLE
TENANT/DOMAIN
CAPABILITY
RESOURCE
ACTION
DECISION

even if the initial deployment has one operator.

Do not overbuild RBAC.

But do not make a person's name the authorization primitive.

## 14. KNOWLEDGE PROMOTION NEEDS ADVERSARIAL SEMANTICS

Before feeding approval events into KnowledgePromoter, test:

same fact approved twice
fact approved then rejected
fact corrected
source disappears
new stronger evidence contradicts old
two humans disagree
agent-generated approval-like event
replayed approval
cross-tenant event
stale approval
approval of version N after N+1 exists

Human approval is evidence.

It is not automatically eternal truth.

## 15. MEMORY MUST HAVE AUTHORITY ORDERING

Memory convergence must define precedence.

Candidate hierarchy to TEST, not blindly adopt:

explicit current owner correction
>
current verified authoritative source
>
prior approved statement
>
derived structured knowledge
>
agent inference
>
retrieval similarity
>
unverified external content

Conflicts must remain visible.

Do not flatten contradictions into one "best memory."

The worker should know:

WHAT IS KNOWN
WHAT IS CLAIMED
WHAT IS CONTESTED
WHAT IS STALE
WHAT IS UNKNOWN

## 16. MEMORY NEEDS CONTEXT PROVENANCE

For an important autonomous decision, record enough to reconstruct:

memory query
retrieval policy/version
candidate IDs
selected memory IDs
rejected/filtered IDs when materially relevant
authority levels
staleness
tenant scope
token/size truncation
final context references

Do NOT persist hidden chain-of-thought.

Persist INPUT EVIDENCE and DECISION ARTIFACTS.

## 17. MEMORY POISONING TESTS

Create adversarial tests for:

prompt injection stored as memory
README instructions masquerading as policy
malicious tool output
retrieved secrets
cross-tenant content
obsolete architecture docs
agent-written speculation
duplicate memory
contradictory memory
extremely high similarity but low authority
low similarity but explicit owner correction

Retrieval relevance must never silently outrank authority.

## 18. QDRANT MUST BE DISPOSABLE IF IT IS A PROJECTION

Prove:

DELETE QDRANT INDEX
-> REBUILD
-> SAME LOGICAL RETRIEVAL CORPUS

Not necessarily byte-identical ranking if embeddings changed.

But canonical knowledge must survive.

If deleting Qdrant destroys unique durable knowledge:

it is not merely a projection.

Classify honestly.

## 19. REMOVE FAKE EMBEDDINGS

If fallback vectors are meaningless:

do not preserve semantic availability by fabricating semantics.

Prefer:

SEMANTIC_RETRIEVAL_UNAVAILABLE

with structured/lexical fallback

over:

fake vector that returns confident nonsense.

Audit every fallback that substitutes invented data for unavailable data.

This pattern may exist beyond embeddings.

## 20. MCP MUST REMAIN AN ADAPTER

Do not create an MCP-centric constitution.

Canonical lifecycle:

ACTION INTENT
-> AUTHORIZATION
-> TOOL RESOLUTION
-> EXECUTION ATTEMPT
-> RECEIPT
-> OBSERVATION
-> DURABLE EFFECT EVIDENCE

Adapters:

MCP
HTTP
GitHub
filesystem
database
browser
local function
future protocols

Every adapter must produce compatible execution receipts.

## 21. EXACTLY-ONCE IS PROBABLY THE WRONG PROMISE

External side effects cannot generally be proven exactly once.

Design for:

AT-LEAST-ONCE ATTEMPTS
+
IDEMPOTENCY WHERE SUPPORTED
+
DURABLE RECEIPTS
+
UNKNOWN_OUTCOME

Example:

tool sends request
external system commits
network dies before response

CRX must NOT blindly retry.

State:

UNKNOWN_OUTCOME

then reconcile.

This is essential for autonomous agents.

## 22. TOOL RESULT != DURABLE EFFECT

Distinguish:

REQUEST SENT
RESPONSE RECEIVED
ACTION CLAIMED SUCCESS
DURABLE EFFECT OBSERVED
EFFECT VERIFIED

For GitHub:

"200 OK" is weaker than subsequently observing expected commit/PR state.

For databases:

returned success may be enough under transactional guarantees.

For browsers:

page text is not necessarily durable mutation evidence.

Model evidence strength.

## 23. CAPABILITY AUTHORITY NEEDS DENIAL PROOF

Do not only test authorized operations.

Test:

unauthorized tool
wrong tenant
wrong resource
expired grant
stale task
mutated arguments after approval
tool substitution
capability escalation
indirect tool invocation
worker impersonation

A capability system with no denial tests is not proven.

## 24. RUN MAY STILL BE UNNECESSARY

Before creating Run, attempt to model everything using:

MISSION
TASK
EXECUTION
EVENT CORRELATION

If that works cleanly:

do not add Run.

If not, write the exact invariant that Run uniquely provides.

NO ABSTRACTION WITHOUT A MISSING INVARIANT.

## 25. TASK CLAIMING NEEDS LEASE SEMANTICS

If autonomous workers continuously pull work:

prevent duplicate mutation.

Need semantics for:

CLAIM
LEASE
HEARTBEAT
EXPIRY
RECLAIM
COMPLETION
ABANDONMENT

Test:

worker dies before mutation
worker dies during mutation
worker dies after commit before reporting
lease expires while worker is alive
two coordinators race
clock disagreement
network partition

Do not rely on in-memory "busy" flags.

## 26. COORDINATOR FAILURE

The coordinator itself cannot be a single conversational state machine.

Ask:

WHAT IF COORDINATOR DIES?

Can another coordinator reconstruct:

open tasks
leases
dependencies
budgets
blocked work
unknown outcomes
pending approvals
integration queue?

If not:

the system is unattended, not autonomous.

## 27. BACKLOG POISONING

Autonomous agents generating their own work creates a new attack/failure mode.

Prevent:

infinite low-value tasks
duplicate tasks
self-generated busywork
priority inflation
recursive audits
"write report about report"
tiny cleanup dominating product work
agents manufacturing tasks to improve throughput metrics

Every generated task needs:

EVIDENCE
VALUE HYPOTHESIS
DUPLICATE CHECK
COST ESTIMATE
DEPENDENCY
STOP CONDITION

## 28. NEVER "KEEP BUSY" FOR ITS OWN SAKE

Important:

THE SYSTEM SHOULD NOT MAXIMIZE ACTIVITY.

It should maximize:

VERIFIED VALUE / COST / RISK.

If no worthwhile mutation is currently safe:

perform bounded discovery.

If discovery yields nothing:

perform contradiction checks.

If contradiction checks yield nothing:

perform dependency re-evaluation.

If nothing useful remains:

WAIT / SLEEP / POLL AT A SENSIBLE INTERVAL.

An autonomous system that cannot decide NOT to work is defective.

## 29. PRIORITY FUNCTION

Develop a deterministic baseline ranking using factors such as:

SEVERITY
USER VALUE
UNBLOCKING POWER
SECURITY
CORRECTNESS
EVIDENCE STRENGTH
CONFIDENCE
REVERSIBILITY
COST
DEPENDENCY CENTRALITY
STALE RISK

Agents may propose priority changes.

They may not arbitrarily promote their own task to P0.

## 30. PRODUCTIVITY METRICS CAN BE GAMED

Attack every proposed metric.

AUTONOMOUS TASKS CLOSED:
easy to game by splitting tasks.

HUMAN INTERRUPTIONS:
easy to lower by making unsafe assumptions.

TIME TO CLOSE:
encourages trivial work.

PATCH COUNT:
rewards churn.

TEST COUNT:
rewards shallow tests.

Therefore measure outcomes together.

Candidate composite evidence:

meaningful gaps closed
production-integrated improvements
regressions
rollbacks
human interventions
security violations
unknown outcomes
duplicate work
cost
latency
recovery success
percentage of autonomous work surviving adversarial review

Never optimize one number.

## 31. DOCUMENTATION MUST BECOME EVIDENCE-AWARE

This archaeology discovered nonexistent names being cited as though real:

Ledger 77
GOVERNANCE_AUDIT_PHASE_D_PROBE_MATRIX
ConstitutionalEventStore
AcquisitionManager
others

Create a documentation truth sweep.

Classify architectural claims:

RUNTIME_PROVEN
SOURCE_PRESENT
TEST_ONLY
DORMANT
UNMERGED
HISTORICAL
DOCUMENTED_ONLY
NONEXISTENT
DEPRECATED

Do not rewrite every document.

Start with documents most likely to mislead future agents.

## 32. DOCUMENTATION DECAY DETECTOR

Find ways to mechanically detect:

referenced file missing
referenced class missing
route missing
configuration variable unused
component called "live" with zero importers
authority name with multiple implementations
README path stale
test-only primitive described as production
unmerged branch described as canonical

Prefer cheap static checks before AI review.

## 33. WORKTREE HYGIENE

Thirteen worktrees plus rewritten history and unmerged convergence branches are
a major agent-confusion surface.

DO NOT DELETE THEM YET.

Build a disposition ledger:

WORKTREE
HEAD
MERGE BASE
UNIQUE COMMITS
UNIQUE VALUABLE FILES
DIRTY STATE
CURRENT CALLERS
SUPERSEDED?
SALVAGE ITEMS
KEEP / ARCHIVE / RETIRE / MERGE

An autonomous agent should not rediscover obsolete architecture because an
old worktree happened to contain authoritative-sounding documentation.

## 34. RUNTIME != HEAD

The running gateway is a Sep-16 snapshot while HEAD has changed.

This is a serious observability requirement.

Every runtime report should identify:

REPO SHA
BUILD SHA
IMAGE DIGEST
CONFIG VERSION
SCHEMA VERSION
STARTED_AT

Never say:

"the repository does X"

when the evidence only proves:

"the deployed Sep-16 image does X."

## 35. DEPLOYMENT DRIFT

Create a read-only drift check:

SOURCE EXPECTATION
vs
RUNNING IMAGE

for:

critical event writer
worker wiring
identity law
replay
witness
lineage
authorization
model provider

Do not automatically redeploy.

First make drift visible.

## 36. PROJECTIONWORKER CONTRADICTION

The report says:

LINEAGE_CREATED is terminal in the bridge

while ProjectionWorker handles it anyway.

Resolve whether this is:

dead handler
missing bridge edge
alternate dispatch path
documentation error
unfinished cycle

Do not patch until runtime flow is proven.

## 37. PROPOSAL INTO VOID

RecommendationWorker emits proposals but no live decision artifact consumes
them.

Trace exactly:

WHERE DOES THE PROPOSAL GO?
WHO READS IT?
WHAT STATE DOES IT CHANGE?

If nobody:

classify as terminal proposal.

Do not pretend PROPOSE->APPROVE exists.

Then determine the smallest connection that makes proposal evaluation real.

## 38. PATCHAUTHORITY IS HIGH RISK TO RESURRECT

There are two divergent PatchAuthority implementations.

Before selecting either:

compare contracts
callers
tests
rollback semantics
path validation
authority checks
atomicity
conflict detection
Git semantics
partial failure
recovery
security boundaries

Do not choose v2 because "v2."

Choose only by proven semantics.

## 39. MERGEGATE -> PATCHAUTHORITY IS NOT ENOUGH

Even if C5 is connected, ask:

WHAT EXACTLY IS BEING MERGED?
WHO AUTHORIZED THE PATCH?
WHAT COMMIT DOES THE PATCH TARGET?
WHAT IF HEAD MOVED?
WHAT TESTS MUST PASS?
WHAT FILE OWNERSHIP EXISTS?
WHAT IF APPLY PARTIALLY SUCCEEDS?
WHAT IF TESTS PASS BUT INTEGRATION CONFLICTS?
WHAT IF THE PATCH CHANGES ITS OWN AUTHORITY CODE?

Build policy around semantic ownership and stale-base rejection.

## 40. SELF-MODIFICATION NEEDS STRONGER LAW

An agent changing the machinery that authorizes agents is special.

Changes to:

event authority
identity authority
capability authority
approval authority
memory authority
orchestration authority
verification authority
credential handling

must receive elevated review.

Do not let ordinary autonomous patch permissions mutate their own trust root.

## 41. MODEL PROVIDER CONVERGENCE

Two live inference seams remain.

Do not simply merge filenames.

Define the stable contract:

REQUEST
MODEL/POLICY
INPUT REFERENCES
OUTPUT
USAGE
LATENCY
PROVIDER
MODEL VERSION
FAILURE
TRACE ID

Avoid provider-specific semantics leaking upward.

Ollama, Vercel, OpenAI, future local models should be replaceable behind the
same typed boundary where appropriate.

## 42. MODEL FAILURE MUST NOT BECOME SYSTEM TRUTH

Test:

malformed structured output
hallucinated IDs
invalid enum
NaN probability
probability outside [0,1]
timeout
partial stream
provider unavailable
model version change
prompt injection
oversized response

TypedDecisionProvider must fail closed.

Model output is a proposal.

Deterministic validation owns acceptance.

## 43. SHADOW MODE NEEDS A REAL EVALUATION DESIGN

Do not merely log:

MODEL DECISION
RULE DECISION

Define:

ground truth source
evaluation delay
agreement
false accept
false reject
abstention
calibration
confidence buckets
evidence quality
distribution shift

Otherwise shadow mode creates data without learning.

## 44. PROBABILITY IS NOT AUTHORITY

Do not allow:

0.99 confidence

to become:

permission to execute.

Separate:

EPISTEMIC CONFIDENCE

from:

EXECUTION AUTHORITY.

An agent can be extremely confident and still lack permission.

## 45. TENANT BOUNDARY

Audit whether tenant/project/customer scope is actually represented in:

events
memory
retrieval
tool capabilities
approvals
tasks
runs/executions
artifacts
lineage
logs

Namespace alone is not a privacy boundary.

Attempt cross-tenant retrieval and execution tests before multi-customer
autonomy.

## 46. SECRET BOUNDARY

Observability must not become credential exfiltration.

Define redaction before broad tracing.

Test:

API keys in tool arguments
Authorization headers
database URLs
cookies
OAuth tokens
private repo URLs
customer PII
model prompts containing secrets

Record references/digests where full payloads are unsafe.

## 47. OBSERVABILITY SHOULD HAVE NEGATIVE PROOF

Do not merely show spans exist.

Prove the system detects:

missing span
orphan span
wrong parent
duplicate execution
execution without authorization
authorization without execution
tool response without request
memory use without retrieval record
state mutation without causal event

Observability is useful when absence becomes detectable.

## 48. EVENT ON CONFLICT DO NOTHING

The canonical event INSERT uses ON CONFLICT DO NOTHING plus collision
handling.

Adversarially verify:

same ID + same semantics
same ID + different semantics
concurrent same event
concurrent conflicting event
retry after connection loss
transaction rollback
writer crash after insert before response

Do not assume idempotency from SQL syntax alone.

## 49. TEST THE BRIDGE GOVERNANCE BYPASS

EventBridge currently uses _skipGovernance:true.

Understand exactly what governance is skipped.

Ask:

WHY WAS THE ESCAPE HATCH CREATED?
CAN UNTRUSTED INPUT REACH IT?
WHAT VALIDATION OCCURS BEFORE IT?
CAN IT CREATE EVENT TYPES NORMAL CALLERS CANNOT?
CAN IT BYPASS CAPABILITY/AUTHORITY CHECKS?

Do not simply remove the flag if compatibility depends on it.

Prove the safe replacement.

## 50. /events/stats IS MISLEADING

If stats reads dormant repository_events before canonical ping_events:

fixing read order is probably cheap.

But search for every similar stale-read pattern.

A system can have one canonical writer while dashboards and agents still read
obsolete stores.

Canonical write authority without canonical read authority is incomplete
convergence.

## 51. READ AUTHORITY AUDIT

For each canonical domain identify:

WRITE AUTHORITY
READ AUTHORITY
DERIVED PROJECTION
CACHE
LEGACY READ

Especially:

events
identity
knowledge
missions
approvals
artifacts
workers
lineage
memory

Find places where agents read a stale replica and make decisions from it.

## 52. FAILURE-HONESTY LAW

Never turn:

UNKNOWN

into:

SUCCESS.

Never turn:

UNAVAILABLE

into:

EMPTY.

Never turn:

UNVERIFIED

into:

FALSE.

Never turn:

TIMEOUT

into:

RETRY SAFE.

Never turn:

NO RESULTS

into:

NO DATA EXISTS.

This applies to:

memory
tools
databases
GitHub
models
MCP
retrieval
approval
deployment checks

## 53. INTERRUPTION TEST

For every autonomous mutation lane eventually test:

kill worker before patch
kill worker during patch
kill worker after patch
kill worker during tests
kill worker after tests before checkpoint
kill coordinator
restart machine
restart database
restart model provider

Then verify:

no duplicated destructive action
task is recoverable
state is understandable
next worker knows what remains

## 54. LONG-RUNNING AUTONOMY MUST BE BOUNDED

"Forever" means recurring evidence-driven operation.

It does NOT mean one immortal process.

Use:

bounded iterations
durable checkpoints
leases
budgets
fresh snapshots
restartable workers

Workers should die routinely.

State should survive them.

## 55. RESEARCH / HARVEST LOOP

When implementation backlog becomes thin:

HARVEST.

But harvesting must answer a concrete capability gap.

For each external implementation:

PROBLEM SOLVED
CORE PRIMITIVE
WHY IT WORKS
FAILURE MODEL
SECURITY MODEL
WHAT CRX ALREADY HAS
WHAT CRX LACKS
SMALLEST HARVESTABLE IDEA
LICENSE
INTEGRATION COST
REJECT / WATCH / HARVEST

Never clone an architecture wholesale.

## 56. RECURSIVE GRILL

After every meaningful batch ask:

WHAT DID WE BELIEVE THAT IS NOW FALSE?
WHAT DID WE LEARN?
WHAT REMAINS UNPROVEN?
WHAT NEW CONTRADICTION APPEARED?
WHAT COMPONENT IS CLAIMED BUT NOT EXECUTED?
WHAT COMPONENT EXECUTES BUT IS UNDOCUMENTED?
WHAT DUPLICATION DID THIS PATCH CREATE?
WHAT NEW ATTACK SURFACE EXISTS?
WHAT WOULD A HOSTILE REVIEWER ATTACK FIRST?
WHAT WOULD FAIL AFTER 1,000 AUTONOMOUS TASKS?
WHAT WOULD FAIL WITH 1,000 CUSTOMERS?
WHAT WOULD FAIL AFTER A MODEL CHANGE?
WHAT WOULD FAIL AFTER A MACHINE RESTART?

Convert answers into deduplicated candidate work.

## 57. PERPETUAL QUEUE

Maintain queues:

P0 SAFETY
P1 CORRECTNESS
P1 AUTONOMY BLOCKERS
CONNECTIONS
CONVERGENCE
ADVERSARIAL TESTS
DOCUMENTATION TRUTH
HARVEST
PERFORMANCE
SECURITY
RECOVERY
COST
ARCHAEOLOGY
DEFERRED HUMAN DECISIONS

Every item contains:

ID
TYPE
EVIDENCE
SOURCE REVISION
VALUE
RISK
DEPENDENCIES
OWNER
STATE
ATTEMPTS
CHECKPOINT
PROOF GATE
INVALIDATION CONDITIONS

Deduplicate semantically.

## 58. TASK TERMINAL STATES

Use explicit states:

PROVEN_COMPLETE
REJECTED
SUPERSEDED
DUPLICATE
BLOCKED_EXTERNAL
BLOCKED_AUTHORITY
FAILED
UNKNOWN_OUTCOME
DEFERRED
STALE

Do not leave vague:

DONE
TODO
MAYBE

## 59. AUTONOMOUS NEXT-TASK SELECTION

After completing a task:

1. integrate evidence
2. update affected assumptions
3. invalidate stale backlog items
4. discover newly exposed gaps
5. deduplicate
6. recompute dependencies
7. rank eligible work
8. check authority
9. claim next task
10. continue

Do NOT return to Nolan merely because one patch finished.

## 60. WHEN TO ASK NOLAN

Ask only when blocked by:

irreversible destructive action
credentials
external authorization
real monetary commitment
legal/privacy policy
production release authority
genuinely ambiguous product intent
trust-root modification requiring explicit owner approval

Before asking:

show the evidence.

Collapse the decision.

Recommend a safe default where possible.

## 61. WHEN TO STOP AUTOMATICALLY

STOP MUTATION if:

canonical data is at risk
authority is ambiguous
tests reveal systemic corruption
security boundary is unclear
external side effect has UNKNOWN_OUTCOME
migration cannot be safely reversed
required credentials are unavailable
human approval is constitutionally required
working tree ownership conflicts
runtime differs materially from assumptions

Then:

CHECKPOINT
CLASSIFY
ROUTE TO OTHER SAFE WORK

Do not idle if independent safe work exists.

## 62. NEVER LET THE AUDITOR BECOME THE BOTTLENECK

Use independent bounded workers.

Example continuous fan-out:

WORKER A: runtime truth
WORKER B: tests/adversarial
WORKER C: history/archaeology
WORKER D: documentation contradiction
WORKER E: security
WORKER F: performance/cost
WORKER G: harvest/external patterns

Coordinator merges evidence.

Mutation workers begin only on non-overlapping proven work packets.

## 63. PROOF BEFORE PROMOTION

Every patch promotion packet should contain:

PROBLEM
PRE-PATCH REPRODUCTION
ROOT CAUSE
AUTHORITY OWNER
PATCH
TEST
ADVERSARIAL TEST
REGRESSION TEST
RUNTIME PROOF WHERE APPLICABLE
ROLLBACK
NEW RISKS
DOCUMENTATION IMPACT
BACKLOG IMPACT

No narrative-only "fixed."

## 64. FIRST EXECUTION ORDER

Do not blindly follow this if dependency evidence disagrees.

Start by attacking:

A. contain/falsify startAutonomousLoop safety risk
B. verify and strengthen replay semantics
C. reconcile pipeline-order contradiction
D. prove persisted lineage adequacy
E. canonical read-authority sweep
F. event idempotency/concurrency adversarial tests
G. EventBridge governance bypass
H. deployment HEAD/runtime drift visibility
I. inference seam convergence plan
J. identity compatibility vectors
K. approval semantics + authenticated entry-point design
L. KnowledgePromoter conflict semantics
M. memory authority/retrieval provenance
N. capability/tool receipt model
O. task lease/checkpoint/recovery model
P. continuous backlog selection

Each completed investigation may reorder the rest.

## 65. OFFICIAL 24-HOUR SPRINT PRECONDITION

Before the mutation sprint begins, produce a compact execution graph containing:

READY NOW
BLOCKED
HUMAN DECISION
DEPENDENCY
ONE-WRITER OWNER
PROOF GATE

Do not produce another 100-page architecture essay.

The archaeology is sufficient.

We now need executable work.

## 66. AFTER THE 24 HOURS

The process does not end.

Transition into recurring convergence mode:

OBSERVE
-> DISCOVER
-> PROVE
-> PRIORITIZE
-> CLAIM
-> EXECUTE
-> VERIFY
-> ADVERSARIAL REVIEW
-> INTEGRATE
-> CHECKPOINT
-> LEARN
-> RECONCILE BACKLOG
-> SELECT NEXT

Periodically:

RE-AUDIT ASSUMPTIONS
RE-AUDIT DOCUMENTATION
RE-AUDIT DUPLICATION
RE-AUDIT SECURITY
RE-AUDIT DEPLOYMENT DRIFT
RE-HARVEST EXTERNAL BEST PRACTICES

## FINAL LAW

DO NOT KEEP AGENTS BUSY.

KEEP THEM USEFUL.

DO NOT MAXIMIZE AGENT COUNT.

MAXIMIZE VERIFIED AUTONOMOUS THROUGHPUT.

DO NOT MAXIMIZE PATCHES.

MAXIMIZE CLOSED PRODUCT/CORRECTNESS GAPS.

DO NOT TRUST DOCUMENTATION.

PROVE IT.

DO NOT TRUST TESTS ALONE.

ATTACK THEM.

DO NOT TRUST "VERIFIED."

ASK WHAT WAS VERIFIED.

DO NOT CREATE AN AUTHORITY UNTIL YOU HAVE PROVEN ONE IS MISSING.

DO NOT LET AN AGENT'S CONFIDENCE BECOME AUTHORITY.

DO NOT LET RETRIEVAL RELEVANCE BECOME TRUTH.

DO NOT LET OBSERVABILITY BECOME A SECOND JOURNAL.

DO NOT LET MCP BECOME THE CONSTITUTION.

DO NOT LET MEMORY BECOME AN UNTRACEABLE PROMPT DUMP.

DO NOT LET AUTONOMY BECOME UNSUPERVISED SIDE EFFECTS.

AND DO NOT FINISH BECAUSE THE CURRENT TODO LIST IS EMPTY.

WHEN THE QUEUE IS EMPTY:

AUDIT.
FALSIFY.
HARVEST.
MEASURE.
RECONCILE.
DISCOVER.

WHEN USEFUL WORK EXISTS AND AUTHORITY PERMITS:

CONTINUE.

GO.

## Nolan's four immediate flaw corrections (same message)

1. Pipeline ordering contradiction: the verified bridge has projection before replay/witness/lineage, while the recommended first slice describes projection after lineage. An autonomy sprint cannot build against ambiguous causal ordering. Resolve immediately.

2. 63/63 with zero refusals is evidence of execution, not evidence that verification is strong. Replay is presently single-event structural even though correlation-group machinery exists. The adversarial lane should deliberately manufacture cases the verifier must reject.

3. startAutonomousLoop containment and provenance tracing is the first P0, not "improving" it into greater autonomy. It is an evidence-fabrication primitive: hardcoded 0.85 confidence synthesized before consensus evaluation.

4. Do not interpret the report's "three remaining operator decisions" as questions to ask Nolan now. Shadow mode, event-derived persistence, and local inference give a conservative route that keeps producing useful evidence without widening authority. Continue autonomously on everything reversible; preserve those decisions as explicit gates.

## Grill corrections from the same adjudication (Jev lane)

- Q35: do NOT invent a new Run concept. PING already has Mission -> Run -> Execution history. Reuse it or prove it unsuitable before another abstraction appears.
- Q36: the proposed ordering was backwards. Human approval is NOT the authority. Correct model: intent -> capability/policy evaluation -> proposal if consequence requires approval -> approval -> re-evaluate exact approved proposal -> effect. Otherwise you build an approval system that can "approve" something the actor was never authorized to do.
- JEV-KILL-001: do NOT kill PING/FYD based on Jev disagreement rate (wrong scope). Jev gets a separate falsification criterion; FYD kill/rethink criteria are product failures.
- JEV IS A SEPARATE PROGRAM. Do not let Jev block FYD's product loop.
