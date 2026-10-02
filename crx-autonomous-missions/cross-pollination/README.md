# Cross-pollination: mechanism combinations for CRX autonomous missions

Date: 2026-09-23. Lane: final synthesis. Read-only: nothing was built, patched,
deployed, or touched. No CRX, FYD, Jev, or Pig system was contacted.

This lane combines harvested mechanisms so that two or more together close (or
substantially narrow) one of CRX's proven gaps. Every combination absorbs the
red-team hardening verbatim (redteam/verdicts.jsonl, redteam/README.md section 4).
Mechanisms that were not among the 23 red-teamed candidates are flagged as
unreviewed in each combination's evidence grade; their invariants are
source-verified but carry no adversarial verdict.

One naming note: OBS-8CHECKS is the redteam's bundle identifier for the
observability lane's 8-check detection table (treated as one candidate in
verdicts.jsonl); it is not a mechanisms.jsonl record ID. It appears in
MECHANISM_IDS with this meaning, flagged in each record's evidence grade.

## How to read a combination

- GAP: the CRX baseline gap letter(s) from the 2026-09-22 audit, or the
  end-of-week proof requirement it serves.
- MECHANISM_IDS: library mechanisms, each with the specific contribution the
  others lack.
- HARDENING_ABSORBED: the red-team corrected invariants, quoted or precisely
  summarized. Empty means none of the member mechanisms were red-teamed.
- HOW_IT_WORKS: concrete record-level behavior. Who writes what record, what
  invariant is checked, what fails closed.
- DOES_NOT_SOLVE: residual risk, stated explicitly.
- EVIDENCE_GRADE: which claims are source-backed (mechanism record fields,
  redteam verdicts) vs inferred (the composition itself is always inferred;
  no lane tested these combinations together).

Hard constraints honored throughout: no second event system, scheduler,
evidence authority, identity authority, or orchestration universe. One writer
per durable state (the PG journal). Typed failures, never blind retry. Fail
closed on authorization. CRX owns meaning; infrastructure owns mechanics; no
framework is adopted, only mechanism shapes.

## Combinations, ordered by value toward the end-of-week proof

The proof: give CRX one nontrivial engineering mission, kill
workers/coordinator/provider/DB mid-run, reconstruct from durable state with
UNKNOWN_OUTCOME reconciliation (never blind retry), resolve contradictory
workers by evidence comparison, complete one patch, then auto-discover/rank/claim
the next task, and explain every important action afterward.

### 1. COMBO-DURABLE-RUN (gap a: no durable per-attempt Run identity)

Members: RESTATE-INVOCATION-ID, O-1, orka-write-once-execution-binding,
orka-single-control-authority, HATCHET-IDEMPOTENCY-CLAIM.

What each supplies: RESTATE-INVOCATION-ID names the attempt
(mission ID, attempt sequence, UUIDv7), the identity foundation everything else
keys off. O-1 gives the durable row with status-transitions-only mutation.
orka-write-once-execution-binding freezes the full execution context
(authorization snapshot, input digests, worker profile) before the first action
so authorization is verifiable after the fact. orka-single-control-authority
(the one SURVIVES verdict) forbids any auxiliary store from committing outside
the journal's fences. HATCHET-IDEMPOTENCY-CLAIM makes duplicate spawn requests
converge: atomic claim-with-TTL, exactly one winner, losers attach to the
winner's execution instead of double-spawning.

Hardening absorbed: lease (holder, expiry, fencing token) plus fencing-token
CAS on claim/resume, mandatory tenant_id, secret-free persisted prompt, PG
journal substrate (O-1); journal unique constraint on (invocation ID, step key),
IDs never bearer capabilities, tenant in the routing key (RESTATE); binding
creation is itself an authorized, evidenced canonical event with freshness bound
and single-holder lease; every action validates against binding AND lease AND
freshness, credential references only (orka binding); epoch/fence anchored
external to the fenced stores (single-control-authority).

How it works: coordinator emits RUN_BINDING to ping_events before dispatch.
Spawn claims via atomic claim(tenant, invocation_id, ttl). Workers mutate only
through status transitions; resuming a running row needs the fencing token.

Does not solve: coarse lease granularity (a hung worker holds the lease until
expiry); prompt redaction quality is assumed; crashed holders with overlong
leases need the supervised watcher from combination 6.

### 2. COMBO-STEP-JOURNAL (gap b: no real tool-execution path, record level)

Members: DBOS-STEP-RECORDING, oa-tool-invocation-ledger,
oa-tool-invocation-identity, orka-outcome-unknown-fail-closed, RESTATE-JOURNAL,
DBOS-ATOMIC-RECOVERY, MCP-M04, MCP-M06, OR_FAILURE_CLASSIFICATION.

What each supplies: DBOS-STEP-RECORDING labels every step with its effect class
(transactional / idempotent-external / at-least-once-external) and bounds
re-execution to the unrecorded suffix. oa-tool-invocation-ledger splits
executed into planned/dispatched/completed with write-once completions graded
verified-vs-claimed. oa-tool-invocation-identity supplies the semantic
fingerprint (exactness key) plus a separate retry-stable idempotency key.
orka-outcome-unknown-fail-closed makes ambiguity a terminal, evidence-citing
state and forbids replay past an uncrossed boundary. RESTATE-JOURNAL gives
journal-prefix replay: completed entries never re-execute. DBOS-ATOMIC-RECOVERY
makes recovery an enqueue through an atomic dequeue, never resume-in-place, so
concurrent recovery converges. MCP-M04 turns unconfirmed abandonment into
OutcomeUnknown (CANCELLED only on server confirmation). MCP-M06 adds the
host-enforced execution budget with kill and a TIMED_OUT terminal state.
OR_FAILURE_CLASSIFICATION gives the typed failure vocabulary; retryable=true
is the only license to retry.

Hardening absorbed: the load-bearing ledger split (planned/dispatched with
provider-ack dispatch marker; write-once completions; verified-vs-claimed
grading; per-flag recovery classification); fingerprint as exactness key with
separate idempotency scope keyed by (tenant, idempotency key); effect-class
labels, provider idempotency keys, writer-identity on step records; boundary by
externally observable ack with evidence-citing unknown records and a journal
check on no-replay; confirmed-cancel rule; host execution budget with kill.

How it works: TOOL_PLANNED (fingerprint, idempotency key, effect class) then
TOOL_DISPATCHED (only on transport/provider ack at the side-effect boundary)
then TOOL_RECEIPT (receipt digest or unverified-claim; write-once per call ID).
Recovery: planned-not-dispatched retries safely; dispatched-not-completed
becomes OutcomeUnknown, never replayed; completed replays the recorded result.

Does not solve: a lying provider ack defeats dispatched=True (needs combination
4's evaluator receipts). The live MCP transport itself is not in the library
(see INV-1 below); this is the durable record around the transport, provable
with a deterministic fake provider behind the same journal interface.

### 3. COMBO-ACTION-AUTH (gap c: no action-level authorization beyond ingress)

Members: MCP-M26, oa-approval-scope-fingerprint, LANGGRAPH-INTERRUPT,
RESTATE-AWAKEABLE, oa-guardrail-tripwire-audit, OBS-8CHECKS.

What each supplies: MCP-M26 checks authorization at discovery AND execution
against an authenticator-minted, session-bound context, with lease/epoch-bound
grants and no local-process exemption. oa-approval-scope-fingerprint gives
tiered grants: scope-level for low-risk tools, argument-bound for sensitive
tools, every cached grant bound to its policy version and re-validated at
execution. LANGGRAPH-INTERRUPT binds each approval to responder identity, shown
payload, and approved semantic fingerprint, with single-writer CAS resume.
RESTATE-AWAKEABLE suspends the attempt on a journaled awakeable with zero
worker held while awaiting approval. oa-guardrail-tripwire-audit makes trips
typed, non-retryable, server-side, sink-appended, with redacted excerpts.
OBS-8CHECKS contributes the preventive twins: dispatch-time authorization gate,
authority-emitted receipts, dispatcher-emitted execution events.

Hardening absorbed: the load-bearing fingerprint correction (same scope
fingerprint implies same tool target, NOT same authorization target; tiered
grants; policy-version binding plus execution-time re-check); lease-bound
grants with handler-start binding and long-handler re-verification,
authenticator-minted context, ambiguous denial, grant epoch logged per
execution; responder binding, resume provenance, single-writer CAS,
approved-fingerprint binding, unguessable IDs, answers as evidence events;
bounded sibling await with kill, non-retryable trip type, server-side
enforcement, redaction, sink-failure gap events.

How it works: dispatch path in order: discovery filtering (ambiguous denial),
dispatch gate (grant check: scope plus argument fingerprint, tenant, policy
version; authority-emitted receipts), handler-start re-check against
session-bound context, interrupt record for sensitive actions with journaled
awakeable suspension, execution-time fingerprint and policy re-validation,
server-side guardrails with typed non-retryable trips.

Does not solve: mint-time compromise (redteam finding B: a compromised
authorization authority vouches for attacks downstream). The check-to-start
race is narrowed, not closed. Human responder authentication on the approval
surface is assumed; no library mechanism covers it.

### 4. COMBO-CONTRADICTION-RESOLUTION (proof: resolve contradictory workers by evidence comparison)

Members: GRAPHITI-BITEMPORAL-INVALIDATE, SWEA-INDEPENDENT-EVALUATOR-RECEIPT,
orka-cas-verified-publication, HATCHET-IDEMPOTENCY-CLAIM,
orka-single-control-authority, DBOS-STEP-RECORDING, oa-tool-invocation-ledger.

What each supplies: GRAPHITI gives contested candidates and trust-gated
supersession with typed conflict events. SWEA gives the core trust primitive:
outcomes recorded by the evaluator, never asserted by the author; evaluator
failure is a failure outcome. orka-cas-verified-publication separates worker
completion from objective completion: a publish is complete only when
independently verified against expected content at the expected ref, with CAS
semantics and typed delivery outcomes including PublicationOutcomeUnknown.
HATCHET makes duplicate claimants attach to the winner. The single control
authority resolves; writer-identity step records defeat spoofing; verified-vs-
claimed grading keeps bare assertions labeled.

Hardening absorbed: the load-bearing trust gate (supersede only with
provenance trust at least equal and evidenced valid_at, else contested
candidate); exactly one writer resolves; step records owner-identity-bound;
completions write-once so a stale worker cannot overwrite a real result.

How it works: contradictory claims for the same (tenant, invocation_id,
step_key) both land with writer identity; a typed conflict event fires;
evaluator-recorded receipts outrank bare claimant assertions; resolution is a
single-writer decision event citing the winning evidence; the loser stays as a
contested candidate, never deleted. This is the direct answer to redteam
cross-cutting finding A (no harvested mechanism verifies worker claims against
independent evidence).

Does not solve: which evidence outranks which per domain is policy (INV-2). A
compromised evaluator defeats the scheme (finding B). Equal evidence stays
honestly unresolved; the mechanism refuses to force a winner.

### 5. COMBO-PATCH-LANDING (proof: complete one patch)

Members: BORS-PREFLIGHT-MERGE-GATE, BORS-HEAD-RACE-DETECTION,
BORS-TEST-EXACT-INTEGRATION-TREE, SWEA-INDEPENDENT-EVALUATOR-RECEIPT,
orka-cas-verified-publication.

What each supplies: the preflight gate binds approvals to the exact commit and
emits every unmet condition as a typed block event. Head-race detection
distinguishes :race (retryable) from :conflict (needs rebase) at assembly AND
at land time, with a single-writer queue lease. The exact-integration-tree
rule: what is tested is bit-for-bit what lands, with a tested-tree witness.
The evaluator records check outcomes independently. CAS publication verifies
the landed state by independent read-back.

Hardening absorbed: land-time SHA re-verification (CAS on the target ref: land
only if the ref still equals the tested SHA); sole-write-path enforcement;
single-writer queue lease; :race vs :conflict preserved through the land path.

How it works: synthesize candidate tree on current base, evaluator runs checks
against that exact tree and records the receipt, gate binds approvals to the
tree SHA, land is a CAS on the target ref, independent read-back verifies
content hash (VerifiedExact) or emits a typed delivery outcome.

Does not solve: evaluator environment integrity (who verifies the verifier).
Flaky tests produce honest failures by design; flakiness triage is out of
scope.

### 6. COMBO-CAUSATION-OBSERVABILITY (gaps e and g; proof: explain every important action)

Members: OBS-8CHECKS, ORCA-14, OR_ROUTE_EXPLAIN_ENDPOINT,
OR_COMBO_DECISION_TRACE, oa-guardrail-tripwire-audit.

What each supplies: OBS-8CHECKS provides the eight checks as specifications
with preventive twins (dispatch authorization gate, unique constraint on the
deterministic execution key, authority-emitted receipts, dispatcher-emitted
execution events, version-pinned receipts). ORCA-14 provides the live delivery
path durability alone cannot: a supervised watcher with durable cursor,
latency SLA bound to lease/approval windows, multiplexed per coordinator.
OR_ROUTE_EXPLAIN_ENDPOINT reports real emitted decisions, never recomputed
ones, metadata only. OR_COMBO_DECISION_TRACE explains with skip reasons from
a fixed allowlist and no bodies or credentials. The tripwire sink discipline
(sink-append before propagation; sink failure a loud gap event) makes
explanations audit-complete.

Hardening absorbed: preventive wherever the journal supports it;
authorizer-emitted receipts; dispatcher-emitted events; version-pinned
receipts; close the CRX preconditions (causation_id on lifecycle events, wired
observability classes, non-empty tables); supervised delivery with durable
cursor, latency SLA, idempotent consumers, per-coordinator multiplexing.

How it works: causation_id on every lifecycle event makes missing-parent a
preventive foreign-key violation; all events join on (tenant, invocation_id,
causation_id); checks run as PG constraints/triggers plus scheduled detective
anti-joins on tenant-scoped indexes; the supervised watcher drains the event
stream within the SLA; the explain surface assembles traces from emitted
events only.

Does not solve: paraphrase-level memory use without citation (undetectable by
set difference). The supervisor is a new liveness root, covered only by
coordinator-startup reaping. Detective queries need tenant-scoped indexes from
day one at scale.

### 7. COMBO-NEXT-TASK-CLAIM (proof: auto-discover/rank/claim the next task)

Members: OR_TASK_FITNESS_LAYERS, OR_DETERMINISTIC_ROUTE_PREVIEW,
OR_ADAPTIVE_ADMISSION, HATCHET-IDEMPOTENCY-CLAIM, OR_COMBO_DECISION_TRACE.

What each supplies: fitness layers give evidence-graded scoring with provenance
traveling on the score (user override beats measured performance beats catalog
tier beats neutral baseline; unknown is neutral, never a penalty; retired never
scores). The deterministic preview shows what would be claimed with zero side
effects and zero state mutation, advisory only. Adaptive admission sheds load
on capacity pressure (explicit off/shadow/enforce modes) and never decides
authorization. The atomic claim gives exactly one winner with loser rendezvous
and TTL eviction. The decision trace records scores, factors, and allowlisted
skip reasons.

Hardening absorbed: none; none of these five mechanisms were red-teamed. This
combination carries the highest unreviewed risk in the set.

How it works: score candidates with evidence-graded fitness, dry-run the
claim, claim the winner via atomic claim(tenant, task_key, ttl), shed excess
load at admission, record the trace for the explain step.

Does not solve: where candidate tasks come from (INV-3); for the first mission
the backlog is a seeded, human-approved list. Fitness evidence is only as good
as recorded outcomes.

### 8. COMBO-TRUSTED-MEMORY (gaps d, f, h, i)

Members: LETTA-GIT-MEMORY, GRAPHITI-BITEMPORAL-INVALIDATE, MEM0-EXPIRATION,
MEMORYBANK-EBBINGHAUS, CHAMNAN-REDACTOR, GRAPHITI-HYBRID-RRF,
LIGHTRAG-TOKEN-BUDGET.

What each supplies: LETTA gives versioned memory where every state is
recoverable by commit, with provenance on commits, per-block CAS, and
fail-closed behavior on backend outage. GRAPHITI gives append-only,
trust-gated supersession with evidenced valid_at, contested candidates, and
typed conflict events. MEM0 gives declarative expiration evaluated at
projection time with fail-closed quarantine on unparseable dates and
versioned, authority-bound expiration changes. EBBINGHAUS gives deterministic,
tombstoned decay scoped to the derived cache with trust-gated reinforcement
and capped initial strength. CHAMNAN gives measured redaction at every ingress
path with an adversarial corpus and scheduled re-measurement. Hybrid RRF and
the token budget make retrieval explicit, bounded, and non-vetoable by any
single signal.

Hardening absorbed: all five load-bearing memory hardenings verbatim:
fail-closed/queued correction writes with loud typed events, provenance
commits, pre-write redaction, per-block CAS, tenant scoping; trust-gated
invalidation with evidenced valid_at defaulting to ingestion time, never the
future; fail-closed quarantine, versioned expiration changes, authority rule
for shortening others'; deterministic derived-cache-only decay, tombstones,
trust-gated reinforcement, capped initial strength, seeded logged randomness;
every-ingress redaction, adversarial corpus with re-measurement, defense in
depth.

How it works: memory writes are journaled events (writer identity, trust tier,
evidence refs, causation_id). Retrieval during execution is itself a journaled
event (cited memory IDs, explicit strategy, declared token budget), which
closes gap d and makes the memory-use-without-retrieval check meaningful.
Corrections are new commits; projections compute "current" from the log, so
re-emission can never demote an approved node (gap h). Forgetting runs through
declarative expiration plus deterministic derived-cache decay with tombstones
(gap f). Ingestion is trust-gated: redaction, provenance tier, contested
candidates for contradictions (gap i).

Does not solve: paraphrase-level use without citation; read-time expiration
cannot retract already-retrieved context; append-only stores cannot purge
secrets (INV-4).

### 9. COMBO-PROVIDER-FAILOVER (proof: the provider-kill branch)

Members: OR_FAILURE_CLASSIFICATION, OR_DECLARATIVE_FALLBACK_CHAINS,
OR_SELF_HEALING_EXCLUSION, orka-outcome-unknown-fail-closed,
RESTATE-INVOCATION-ID.

What each supplies: typed failure classification (retryable=true is the only
license to retry; quota_exhausted never retried). The declared fallback chain
constrains rotation to an authorized, ordered, filter-only subsequence.
Self-healing exclusion cools the dead provider down with hysteresis and
narrows (never widens) under fleet-wide incident. Outcome-unknown semantics
keep undecidable dispatches honest instead of replayed. The stable invocation
ID plus the journal unique constraint prevent double execution across the
rotation.

How it works: provider death yields a typed receipt; rotation walks the
declared chain minus tried providers, keeping the same invocation ID; a step
whose boundary was provably uncrossed re-dispatches with the same idempotency
key, otherwise it settles to OutcomeUnknown with last-observed evidence.

Does not solve: the undecidable middle (died before vs after the side effect
with no ack) stays OutcomeUnknown; rotation does not resolve it.

## First-mission mechanism shortlist (minimal set enabling the proof)

The smallest set that makes the end-of-week proof possible, in dependency
order:

1. COMBO-DURABLE-RUN. Without a durable per-attempt identity nothing else has
   a stable subject; this is the foundation the RESTATE record names
   explicitly.
2. COMBO-STEP-JOURNAL. The kill-reconstruction core. INV-1 (live MCP
   transport) may be stubbed for mission 1 with a deterministic fake provider
   behind the same journal interface, as long as the planned/dispatched/
   completed boundary and the journal are real.
3. COMBO-ACTION-AUTH. The first mission executes tools; authorization must be
   preventive, not detective.
4. COMBO-CONTRADICTION-RESOLUTION. The proof requires resolving contradictory
   workers by evidence comparison; this is also the direct answer to redteam
   finding A (manufactured success).
5. COMBO-PATCH-LANDING. The proof requires completing one patch with an
   honest, verifiable landing.
6. COMBO-CAUSATION-OBSERVABILITY. The proof requires explaining every
   important action; causation_id is load-bearing for all combinations above.
7. COMBO-NEXT-TASK-CLAIM. The proof requires auto-discover/rank/claim of the
   next task; for mission 1 the discovery feed is a seeded, human-approved
   backlog (INV-3 stays open).
8. COMBO-TRUSTED-MEMORY (partial). The correction-survival plus ingestion
   trust gate are needed so reconstruction re-emission cannot demote approved
   nodes; full forgetting machinery (expiration sweep behavior, decay tuning)
   defers to phase 2.
9. COMBO-PROVIDER-FAILOVER. Needed for the provider-kill branch; rides on
   combination 2 plus a declared fallback chain stub.

Deferred to phase 2: full forgetting operations, fleet-scale watcher
multiplexing tuning, fitness-evidence quality loops.

## Invention required (not in the library; never presented as solved)

- INV-1: live MCP tool-execution transport in WorkerRuntime. The library
  covers auth (MCP-M26), cancel (MCP-M04), timeouts (MCP-M06), tool discovery
  as a trust event (oa-mcp-tools-span), and the durable record around
  execution (COMBO-STEP-JOURNAL), but no mechanism specifies the MCP session
  lifecycle (initialize/handshake, discovery events, request/response
  correlation, transport failure mapping) wired into a worker. Boundary:
  transport is infrastructure; record semantics stay CRX's.
- INV-2: domain evidence-comparison policy. COMBO-CONTRADICTION-RESOLUTION
  provides contested candidates, evaluator receipts, and CAS resolution, but
  "test receipt outranks worker assertion" generalizes only by policy: each
  domain needs an explicit ranking of what counts as independent evidence for
  its action types.
- INV-3: autonomous work discovery sources. Ranking and claiming are covered
  (COMBO-NEXT-TASK-CLAIM); the DISCOVER step's feed of candidate work
  (schedules, inboxes, monitors, delegation) has no library mechanism.
  orka-cron-child-task-scheduling covers recurring ticks, not discovery.
- INV-4: erasure/purge path for append-only memory. Redteam 4.16 notes
  bi-temporal invalidation never deletes; LETTA's hardening names a
  dual-control purge procedure but no mechanism specifies its event model.
  Needed for secrets and data-rights requests.
- INV-5: explanation narrator. Decision traces (OR_COMBO_DECISION_TRACE) and
  emitted events supply the raw material, but the "explain every important
  action afterward" surface needs a deterministic composer binding each
  explanation sentence to receipt IDs. Template-driven; no model invention.

## Global residual risks

- Mint-time trust (redteam finding B) is unaddressed by every combination:
  authorization authorities, binding minters, and evaluators are trusted
  roots. Compromise any of them and downstream rigor vouches for the attack.
  This is the single largest residual across the whole set.
- Manufactured success at the provider boundary: a lying provider ack defeats
  dispatched=True; only independent evaluator evidence (combination 4)
  counters it, and only where an evaluator exists for the domain.
- Time as a trust input (redteam finding C): lease expiries, valid_at,
  grant epochs, and poll intervals assume sane clocks; attacker-controlled
  timestamps and cross-worker skew have no dedicated mechanism.
- Tenant binding was added per combination per the hardening, but no
  combination was reviewed for cross-tenant leakage as a composed system;
  the composed claim pipeline (7) plus the composed memory store (8) deserve
  a dedicated adversarial pass before multi-tenant use.
- Five of the nine combinations depend on mechanisms no red-team pass
  reviewed (notably all of combination 7). Treat their risk as open until
  reviewed.

## Machine-readable record

combinations.jsonl: one record per combination with fields COMBINATION_ID,
GAP, MECHANISM_IDS, HARDENING_ABSORBED, HOW_IT_WORKS, DOES_NOT_SOLVE,
EVIDENCE_GRADE.

[combinations.jsonl](sandbox://workspace/crx-autonomous-missions/cross-pollination/combinations.jsonl)
