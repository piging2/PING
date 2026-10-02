# AUTONOMOUS PORT LAW — 2026-09-24 ~05:49 MDT

Nolan accepted the unknown-outcome proof as proven mechanism evidence. Standing chain:

PROVEN != WIRED. WIRED != LIVE. LIVE != DURABLE. DURABLE != SAFE. SAFE ONCE != SAFE FOREVER.

## Port the proven mechanism into the real runtime

The owning lane continues now. Port through the existing runtime: registry
entries → delegate timeout branch → worker wrapper → scheduler/reconciliation
sweep. No new authority. No second effect system. No blind retry path left
behind. Preserve the existing event substrate.

### Port law

For every logical effect: stable logical operation identity + stable
idempotency key + durable execution evidence + explicit outcome state.

Required state semantics:
DISPATCHED → EXECUTING → SUCCEEDED / FAILED / UNKNOWN
UNKNOWN → RECONCILE
RECONCILE → RECOVER_SUCCEEDED / RECOVER_FAILED / SAFE_TO_RETRY / HOLD_UNKNOWN

Timeout is an observation. Timeout is not an effect outcome. No response is
not proof of no effect.

### Prove the port

Do not call it complete when the code compiles. Run the same six chaos
scenarios through the actual integrated path (coordinator dies before
receipt; result persistence fails; response lost; duplicate dispatch;
inconclusive probe → hold → recover; restart during reconciliation) and
require: 1 logical operation → exactly 1 consequential effect. Then add:
worker death during effect, scheduler death during sweep, DB reconnect,
duplicate reconciliation, stale worker response, late result after UNKNOWN,
two reconcilers race, repeated restart, retry storm, mission replay, same
mission resumed by replacement coordinator. Try hard to produce effect #2.

### Merge and test the merged state

TEST → ADVERSARIAL TEST → COMMIT → REVIEW → MERGE → TEST MERGED STATE →
RESTART TEST → RUNTIME TEST. Do not confuse worktree green with system green.

## Mission Control consumes this

Make unknown outcome visible: Mission, Run, Operation, Attempt, Effect,
Idempotency Key, Current State, Last Evidence, Reconciliation State, Retry
Eligibility, Criticality, Authority Requirement. The UI must never display
FAILED merely because a worker timed out. Display the truth: OUTCOME UNKNOWN
— RECONCILIATION IN PROGRESS.

Where authorized, Mission Control may eventually offer: inspect evidence,
request reconciliation, hold, resume after reconciliation, cancel future
work. Never offer "RETRY NOW" for unknown consequential effects unless the
backend has proven retry safe. UI CLAIM <= BACKEND PROOF.

## Generalize through real work

Do not build a giant generic effect framework. Apply the proven semantics to
real effect classes: filesystem mutation, Git mutation, database mutation,
deployment, connector write, external API mutation, website publish, message
preparation/execution, campaign publication, financial action. For each: what
identifies the logical operation? Can the provider accept an idempotency key?
Can the effect be queried? Can we reconcile? Is it reversible? What does
UNKNOWN mean? When is retry safe? When must we hold?

## Autonomy law

Every verified work item automatically emits its successor frontier.
Successor selection order: production correctness, canonical integrity,
security, durability/recovery, currently reachable product failure,
user-visible product capability, integration gap, performance bottleneck,
coverage gap, cleanup only when it removes real complexity. Semantically
dedupe before claim. CLAIM. EXECUTE. VERIFY. CONTINUE.

Do not ask Nolan: what should I do next? should I continue? should I
implement this? should I investigate this failure? should I run the tests?
should I merge the proven patch? Those are ordinary engineering decisions.
Make them.

## Mission Control keeps building

In parallel: TODAY, AGENTS, BUSINESS, OBJECT TRACE, NATURAL-LANGUAGE
COMMAND. Then expand from the same proven contracts into: Missions,
Customers, Leads, Sales, Marketing, Websites, Approvals, Projects,
Automations, Integrations, Software, Knowledge, Evidence, Activity, Lineage,
Memory, Technology, System Health, Security, Costs, Releases. Do not build
fake screens. A panel exists only when its backend state is honest. A control
exists only when its mutation is real and witnessed.

## Source trace, both directions

Reverse (Sanity chain): rendered value → projection field → object →
relationship where relevant → claim/observation → evidence → raw
snapshot/artifact → original source. Forward: source change → observation →
affected evidence/claim → affected object → affected projection → affected
website/UI. This makes PING explainable in both directions.

## Factory and harvest

Every factory failure is potential product work: bad mobile layout →
minimize → generic fixture → repair; unbound claim → evidence failure; bad
source → acquisition failure; owner correction lost → intent persistence
failure; wrong site structure → planning failure; generic site →
composition/design failure; agent duplicates work → orchestration failure;
result lost → reconciliation failure. Turn failure into durable leverage.

Keep harvesting repository/mechanism research against live needs: unknown
effect → durable effect/reconciliation mechanisms; connector resume →
cursor/checkpoint; Mission Control → truthful control-plane projections;
object graph → provenance/lineage; factory scale → incremental compilation;
memory → provenance-aware retrieval/invalidation. DISCOVER → VERIFY SOURCE →
TEST → COMPARE → HARVEST → INTEGRATE → USE.

Never done does not mean busywork. If something is proven healthy: reduce
active compute, keep a cheap watch, move capacity to the highest-value
unknown. If the frontier shrinks: search runtime evidence, test failures,
source changes, business changes, git changes, performance data, security
data, factory failures, connector failures, memory contradictions, ORCA
differentials, Mission Control gaps for new material work.

## Human boundary

Interrupt Nolan only for: credential/authentication action only he can
perform; external authorization; real financial spend; contacting/publishing
to real businesses; irreversible destructive action; canonical production
corruption risk; uncontained production P0; genuine product/business choice
with materially different outcomes.

Not: test failure, merge conflict, worker death, coordinator death,
dependency issue, build failure, stale branch, ordinary refactor, retryable
API failure, code archaeology, documentation, fixture failure, browser
failure. Solve those.

## Permanent loop

OBSERVE → DISCOVER → DEDUPE → PRIORITIZE → CLAIM → EXECUTE → CHECKPOINT →
VERIFY → FALSIFY → INTEGRATE → TEST MERGED STATE → RECORD EVIDENCE →
UPDATE MEMORY → DISCOVER SUCCESSOR → CLAIM AGAIN.

No terminal "DONE" state exists for PING. Only individual work items
terminate. If everything is green: observe. If something changes:
re-evaluate. If a failure appears: reproduce. If a generic cause exists: fix
it. If a capability is missing: harvest before inventing. If work is proven:
integrate it. If integrated: use it. If used: measure it. If measured:
improve the next bottleneck. Keep going autonomously. Always.
