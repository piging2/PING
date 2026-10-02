# Red-team adversarial review: CRX autonomous missions harvest

Date: 2026-09-23. Scope: the 22 REUSE/ADAPT/PATTERN candidates triangulated as
most promising across the campaign lanes, plus the observability lane's bundle
of 8 deterministic journal checks (treated as one candidate, `OBS-8CHECKS`).
23 verdicts total, one per candidate, in `verdicts.jsonl`.

Research and adversarial analysis only. Nothing was built, patched, deployed,
or touched. No CRX, FYD, Jev, or Pig system was contacted.

## 1. Attack methodology

For each candidate I pulled the full 16-field mechanism record from
`mechanisms.jsonl` (plus `FALSIFICATION_TEST`, `EXPECTED_VALUE`, and lane
README falsification logs where they exist) and attacked it against the
adversarial case list, in this order:

1. Process death mid-execution (worker, coordinator, database connection).
2. Network loss between execution and receipt.
3. Side effect performed but receipt never recorded (and the mirror:
   receipt recorded but side effect never happened, i.e. manufactured success).
4. Secret material in the record (what gets persisted, who can read it).
5. Privilege escalation (worker claims more authority than granted; replay of
   an old authorization).
6. Duplicate task execution (two workers claim the same task; retry after
   UNKNOWN_OUTCOME).
7. Memory poisoning (untrusted content projected into memory; contradiction
   without provenance).
8. Manufactured success (worker reports completion with fabricated evidence).
9. Scale: 1,000 concurrent tasks; 1,000 tenants (cross-tenant leakage,
   resource exhaustion, noisy neighbor).

Verdict meanings:

- SURVIVES: the candidate's stated invariant defeats every applicable attack
  as specified. The exact invariant that saves it is named.
- FAILS: the candidate cannot achieve its stated purpose; the core claim is
  false or the attack has no reasonable fix within the mechanism's shape.
  Concrete attack trace given.
- NEEDS-HARDENING: the core is sound but the library's invariant is wrong,
  incomplete, or assumes preconditions CRX does not meet. The minimal
  additional invariant is stated; without it, adoption as specified causes
  the traced harm.

Grounding rules followed: every claim rests on a mechanism record field or
the CRX baseline in the task brief. Where I needed a fact not in evidence, it
is marked ASSUMED inline. Lane falsification logs were treated as
authoritative corrections to the records (notably: the openai-agents-sdk lane
falsified "the SDK is durable" and qualified "approvals authorize actions";
the MCP lane found no idempotency keys anywhere in SDK v2 and no default
OAuth audience enforcement; the orka lane notes the project is experimental
and its session lock has no timeout).

## 2. Cross-cutting findings (apply to many candidates)

A. Manufactured success is unaddressed everywhere. No harvested mechanism
   verifies a worker's claim against independent evidence. The ledger's
   completed flag, DBOS stored step outputs, and the journal's
   receipt-existence checks all verify that the paperwork is complete, never
   that the claim is true. A worker that emits both the mutation event and
   the receipt event passes every check. CRX needs evidence-graded receipts
   (the CONFIRMED / STRONG / WEAK / UNKNOWN discipline already in Nolan's
   memory) before any of these become trustworthy.

B. Privilege escalation concentrates at mint time. M26's access context,
   the scope fingerprint's lookup keys, LangGraph interrupt answers, Orka
   binding creation, DBOS step-record writers: every authorization mechanism
   assumes a trusted minter and then reasons rigorously downstream. Attack
   the minter (compromised coordinator, caller-asserted context, unbound
   responder) and the downstream rigor vouches for the attack.

C. Time is a trust input everywhere and is under-specified everywhere:
   expiration dates, valid_at timestamps, lease expiries, grant epochs, poll
   intervals. Attacker-controlled timestamps (Graphiti valid_at, mem0
   expiration_date) and clock skew across workers are not handled by any
   record as specified.

D. Tenant binding is assumed, not specified, in nearly every record.
   Fingerprints, ledgers, bindings, invocation IDs, memories, watchers, and
   journal checks all need tenant in the key, the scope, or the join. Every
   adoption must add this explicitly; the cross-tenant risk field in
   `verdicts.jsonl` says for each candidate whether verbatim adoption leaks.

E. Determinism: the Ebbinghaus coin flip makes "what exists" depend on
   unlogged randomness, violating CRX's determinism rule for constitutional
   outputs. Any adoption must use thresholds or seeded, logged randomness.

F. The openai-agents-sdk lane falsified SDK durability as a native property:
   RunState is pause/resume, not crash recovery ("docs explicitly hand
   durable orchestration to Temporal/Dapr/Restate"). The oa-* identity,
   ledger, scope, and tripwire mechanisms are planning-layer aids. CRX's
   PostgreSQL journal must be the durable substrate; none of these survive
   transplantation onto anything weaker.

## 3. Per-candidate verdicts

### 3.1 Durable per-attempt Run identity family

#### O-1 (orca-cli/orca) : NEEDS-HARDENING

Attack trace: worker W1 starts run R; the SQLite row goes to status running.
W1 is SIGKILLed. The record admits no heartbeat or lease exists, so the row
stays running forever. Recovery spawns W2, which reads the row and resumes
the worktree. W1 was not actually dead (network partition or slow shutdown)
and also resumes. Both workers execute the same side-effecting steps; the
status-transition-only path has no claim or CAS, so the second claim silently
succeeds and side effects double. Separately, the row persists the raw prompt
(ASSUMED: prompts may carry secrets); the record admits any process with file
access can read and mutate runs, and there is no tenant column, so one
per-host file holds every tenant's prompts and run state.

Corrected invariant: every unit of agent execution has exactly one durable
identity row before it starts; status transitions are the only mutation path;
the row carries a tenant id and a lease (holder id, expiry, fencing token);
claiming or resuming a running row requires a fencing-token CAS; the persisted
prompt excludes secret material.

Hardening: lease plus expiry plus fencing token; claim/resume via CAS;
mandatory tenant_id; redact secrets from the persisted prompt. In CRX,
implement as a run-scoped namespace of the PG journal, not a second SQLite
writer (the record's own integration note says this).

#### oa-tool-invocation-identity (openai-agents-python) : NEEDS-HARDENING

Attack trace: W1 executes send_invoice(amount=100.00); the provider accepts
it but W1 dies before the receipt. The coordinator retries on W2. The
fingerprint hashes type, name, namespace, server_label, arguments,
environment, and caller. W2 runs under a different environment tag (ASSUMED:
pool workers carry distinct environment tags), so the retry hashes
differently, the ledger finds no match, and the invoice is sent twice. The
fingerprint is not retry-stable across workers. Separately, when arguments
fail JSON parsing, the normalizer falls back to hashing the raw string, so
two whitespace variants of identical semantics produce different fingerprints
and duplicate detection silently fails. The library invariant holds only for
JSON-parseable arguments of recognized types.

Corrected invariant: two invocations with identical normalized (type, name,
namespace, server_label, arguments) produce identical fingerprints regardless
of JSON key order or whitespace, for recognized types with JSON-parseable
arguments; unrecognized or unparseable arguments are hashed opaquely or
return None. The fingerprint is an exactness key, not a retry key:
retry-stable dedupe requires a separate idempotency scope excluding
environment and caller, or an explicit caller-supplied idempotency key.

Hardening: define the idempotency key separately from the semantic
fingerprint; bind tenant into the scope; key ledger lookups by
(tenant, idempotency key).

#### oa-tool-invocation-ledger (openai-agents-python) : NEEDS-HARDENING

Attack trace: crash between _mark_tool_invocation_executed and the actual
provider dispatch. On restore the ledger shows executed=True,
completed=False. The flag name says executed, so recovery reads it as "the
tool ran" and either skips the step (lost work) or re-runs it (duplicate side
effect). The ledger records the planning transition, not the side-effect
boundary, and defines no recovery classification. Manufactured success:
_mark_tool_call_completed is invoked by the worker itself, so a compromised
worker records completed=True with fabricated output and the ledger
permanently vouches for it; the lane notes the SDK has no signature, witness,
or hash concept. Replay: a stale worker re-sends an old provider call ID
with new output; completions are keyed by call ID with no write-once rule
stated, so the fabricated result can overwrite the real one.

Corrected invariant: planned, dispatched, and completed are distinct flags;
dispatched=True requires the provider/transport ack at the true side-effect
boundary; completed=True implies a claimant-recorded receipt labeled
unverified-claim until independently evidenced; completion entries are
write-once per call ID; on recovery, planned-and-not-dispatched is safe to
retry while dispatched-and-not-completed is OutcomeUnknown.

Hardening: split executed into planned/dispatched with the dispatch marker
at the provider ack; recovery classification per flag combination; write-once
completions; verified-vs-claimed receipt grading; extend the duplicate call-ID
loud failure to same-run replays.

#### orka-write-once-execution-binding (orka-agents/orka) : NEEDS-HARDENING

Attack trace, poisoned minting: the coordinator is compromised at dispatch
and mints a binding routing the attempt to an attacker-controlled runtime
with an elevated agent profile. Write-once immutability locks the attack in:
every worker action validates against the frozen binding and passes. The
record's security model covers only post-dispatch compromise, not malicious
creation. Duplicate holders: a dispatch is delivered twice; two workers both
present the same valid binding and both execute side effects, because the
binding is validated but never leased to a single holder. Stale binding: a
binding minted at t0 is acted on at t1 after the grant was revoked; nothing
re-checks freshness, so revocation is bypassed.

Corrected invariant: one binding per attempt, immutable once created,
created only under a recorded authorization with input digests (binding
creation is itself a canonical event with provenance); the binding carries a
freshness bound (policy/config versions, valid-until) and a single-holder
lease with fencing token; every worker action is validated against the frozen
binding AND the holder lease AND the freshness bound, never against live
coordinator state.

Hardening: authorize and evidence binding creation; freshness bound with
commit-time re-verification; single-holder lease with fencing token; credential
references (never secrets) in the binding; tenant bound into the binding
identity.

#### RESTATE-INVOCATION-ID (restatedev/restate) : NEEDS-HARDENING

Attack trace, bearer attach: the record states knowledge of an ID grants
attach/output access. If CRX adopts attach-by-ID rendezvous and partition
keys are predictable (tenant name, sequential mission numbers), tenant B
guesses tenant A's invocation IDs, attaches to A's executions, and reads
outputs. ID-only singularity: two workers act under one invocation ID after
a duplicate dispatch; the ID format does nothing to stop the second
execution. The record's invariant states the aspiration, not the enforcement.
(BSL-1.1 license: pattern only, do not vendor code.)

Corrected invariant: one invocation ID (mission ID, attempt sequence, UUIDv7)
names exactly one logical execution across retries and recoveries; singularity
is enforced by a journal unique constraint on (invocation ID, step key), the
ID merely makes the key stable and routable; IDs are never capabilities:
attach/output rendezvous requires an independent authorization check.

Hardening: pair the ID shape with journal unique constraints; never expose
bearer attach without authorization; embed tenant in the routing key.

### 3.2 OutcomeUnknown fail-closed

#### orka-outcome-unknown-fail-closed (orka-agents/orka) : NEEDS-HARDENING

Attack trace, boundary misclassification: a worker's request bytes leave the
socket but the process dies before the transport ack is processed locally;
the local state machine still reads Submitting, which the mechanism
classifies as pre-boundary and safe to requeue. Recovery re-submits; the
provider executes twice. The mechanism's correctness hinges on the boundary
being externally observable, but the record defines it by local
state-machine position. Evidence-free unknown: a compromised coordinator
marks an inconvenient failed attempt as OutcomeUnknown with no cited
evidence, laundering a failure into an honest-looking terminal state.

Corrected invariant: ambiguity is a terminal, explicitly named state, never
an absence of state. "May have been accepted" is determined by the last
externally observable boundary evidence (provider/transport ack), never by
local state-machine position; the OutcomeUnknown record cites that evidence.
A prompt past a boundary that cannot be proven uncrossed is never
re-submitted by recovery.

Hardening: define every side-effect boundary by externally observable ack,
recorded per step with its effect class; OutcomeUnknown records cite
last-observed evidence; enforce no-replay in the recovery path and cover it
with a journal check.

#### DBOS-STEP-RECORDING (dbos-inc/dbos-transact-py) : NEEDS-HARDENING

Attack trace, residual window: a worker executes a non-transactional external
call (payment API) and crashes before the step record commits. Recovery
replays the unrecorded suffix and the payment executes twice. The record
honestly admits this window, but the harvested invariant ("Recorded = done,
never re-executed") overclaims for external effects, where recorded means
claimed-done. Manufactured output: a compromised worker writes a fabricated
step output to the system DB; recovery returns the stored fabrication
forever, since step records are authoritative and carry no receipt
verification. Writer spoofing: a worker writes a completed step record for a
step owned by another attempt, causing recovery to skip work that never ran.

Corrected invariant: for transactional effects, the step record and the
effects commit atomically: recorded = done, never re-executed. For external
effects, the record is a claim: recorded = claimed-done, re-execution is
bounded to the unrecorded suffix, the step is labeled with its effect class
(transactional / idempotent-external / at-least-once-external), and
at-least-once steps carry provider idempotency keys so re-execution is safe.
Step records are written only by the step owner's identity; external-effect
outputs carry provider receipts or are labeled unverified-claim.

Hardening: per-step effect-class labels; provider idempotency keys on
external steps; writer-identity enforcement on step records; receipt
verification or claim labeling on stored outputs.

### 3.3 Approval-scope fingerprints and typed interrupts

#### oa-approval-scope-fingerprint (openai-agents-python) : NEEDS-HARDENING

Attack trace, argument smuggling: an always_approve grant is cached for scope
(send_email). A rogue worker invokes send_email with a different recipient
and exfiltrated content; the scope fingerprint is unchanged because arguments
are deliberately excluded, so the cached grant authorizes it. The library's
invariant ("same scope fingerprint implies same authorization target") is
false: same scope, different authority implications. The SDK lane
independently qualified this: approvals authorize invocations at call scope,
not actions, and there is no record of what the invocation did. Revocation
bypass: admin revokes send_email at t1 under policy P1; the agent retries a
call approved at t0; the cached grant carries no policy-version binding, so
it still applies under P1.

Corrected invariant: same scope fingerprint implies same tool target (type,
role, lookup key); it does not imply same argument-level authority or same
policy version. Grants are tiered: scope-level for low-risk tools,
argument-bound (semantic fingerprint or allowlist constraints) for sensitive
tools; every cached grant binds the policy/config version it was issued under
and is re-validated at execution time.

Hardening: two-tier grants with per-tool policy; policy-version binding on
cached grants plus execution-time re-check against current policy (the M26
discipline); tenant in the scope fingerprint.

#### LANGGRAPH-INTERRUPT (langchain-ai/langgraph) : NEEDS-HARDENING

Attack trace, self-approval: interrupt I1 (approve a wire transfer) is raised
with no bound responder. The attacker, able to submit resume commands, sends
Command(resume={I1: yes}); the checkpoint accepts it because the record
trusts the answer (its security model states none built-in). Checkpoint fork:
two coordinators resume from the same checkpoint after a crash; both
reproduce I1; two different humans answer; both branches proceed and the
transfer executes twice, because resume is not single-writer. Approval drift:
the approver sees the interrupt payload at t0; the tool arguments change
before execution at t1; the approval is honored for arguments the approver
never saw, because the interrupt record does not bind the approved semantic
fingerprint. (ASSUMED: interrupt IDs could be predictable; they must be
unguessable.)

Corrected invariant: interrupts are values in the checkpoint, not control
flow; each interrupt binds the authorized responder identity, the exact
payload shown, and the semantic fingerprint of the proposed action; resume is
a data command carrying responder provenance and is a single-writer CAS on
the checkpoint version; execution validates the action still matches the
approved fingerprint and the policy version current at approval; replaying
the checkpoint reproduces the interrupt instead of re-asking.

Hardening: responder-identity binding; provenance on resume commands;
single-writer resume CAS; approved-fingerprint binding between interrupt and
execution; policy-version binding; unguessable interrupt IDs. Do not inherit
the trusted-answer model: in CRX the answer becomes an evidence event (who
answered, what they saw, schema validation).

### 3.4 MCP execution: authorization, cancel, timeouts

#### MCP-M26 (PrefectHQ/fastmcp AuthorizationMiddleware) : NEEDS-HARDENING

Attack trace, revocation race: admin revokes the tool grant at t1; a request
that passed the execution re-check at t0 starts its handler at t2 and
executes without authority. The record admits the time-of-check race.
Long-handler drift: a 20-minute handler starts authorized; the grant is
revoked at minute 5; nothing re-checks mid-execution. STDIO inheritance: CRX
adopts the pattern including the documented STDIO exemption (skip auth for
local processes); a compromised local worker then invokes any tool with no
auth context, because "local" was treated as trusted. Forged context: the
re-check resolves the access context from caller-supplied claims rather than
a trusted authenticator (ASSUMED deployment gap; the MCP lane notes audience
and issuer enforcement is "up to the verifier" and default deployments do
not cryptographically verify), so a malicious caller mints its own authority.

Corrected invariant: authorization is checked at discovery AND at execution
against a context minted by the authentication layer and bound to the
transport session, never caller-asserted; missing context denies; forbidden
tools are indistinguishable from absent ones; grants are epoch/lease-bound
and long-running handlers re-verify; no local-process exemption exists in
CRX: every tool call carries an auth context.

Hardening: lease/epoch-bound grants with handler-start binding and periodic
re-verification for long handlers; authenticator-minted, session-bound auth
context; no STDIO-style exemption; ambiguous denial preserved; grant epoch
logged on every execution.

#### MCP-M04 (modelcontextprotocol/python-sdk, cancel_on_abandon) : NEEDS-HARDENING

Attack trace, unconfirmed cancel: the caller abandons a payment tool call;
notifications/cancelled is emitted but lost on a dead transport (the record
admits best-effort delivery). The server never sees it, completes the
payment, and the caller records CANCELLED. The journal shows CANCELLED while
the world shows the payment happened: an unrecorded side effect, the exact
failure the cancel path was meant to prevent. Retry-after-abandon: the caller
abandons, immediately retries as a new call, and the abandoned handler also
completes; the payment executes twice. The MCP lane found no idempotency
keys anywhere in SDK v2, so nothing makes the retry safe.

Corrected invariant: every abandonment emits a cancellation signal
(best-effort); signal delivery and handler termination are not guaranteed.
CANCELLED is a terminal state only on server-confirmed cancellation or proof
the handler never started; unconfirmed cancellations settle to
OutcomeUnknown. Tool calls carry idempotency keys so retry-after-abandon is
safe.

Hardening: server-confirmed cancellation before CANCELLED; unconfirmed
abandonment settles to OutcomeUnknown with last-observed evidence;
idempotency keys on all side-effecting tool calls; CANCELLED as a first-class
terminal state with a causation link to the abandoning event.

#### MCP-M06 (modelcontextprotocol/python-sdk, layered timeouts) : NEEDS-HARDENING

Attack trace, hung handler: a tool handler deadlocks waiting on a downstream
that never responds. The client's read_timeout fires (no data flowing), the
caller records TIMED_OUT and moves on, but the server-side handler has no
execution bound (the record admits none was found in SDK v2) and holds the
session forever. Repeated across tenants, hung handlers exhaust the session
pool: a noisy-neighbor denial of service that no read or idle timeout
prevents, because the timeouts cover reads and idleness, not execution. The
library invariant ("every wait has a bound") is factually wrong on this
point.

Corrected invariant: every network and idle wait has a bound, and disabling
a bound is an explicit, logged opt-out. Tool handler execution time is NOT
bounded by the SDK and must be bounded by the host: the worker enforces an
execution budget and kills over-budget handlers, emitting a canonical
TIMED_OUT event with causation.

Hardening: host-enforced execution budget (worker watchdog or execution
lease with kill) in addition to the SDK's read/idle timeouts; TIMED_OUT as a
terminal state distinct from FAILED with the budget recorded on the call;
explicit disables flagged in config review.

### 3.5 One-writer invariant

#### orka-single-control-authority (orka-agents/orka) : SURVIVES

Attack trace, attempted second authority: a developer adds an outbox table
with its own writer for performance. The invariant forbids it: the table may
only commit inside the authority's fenced transaction carrying the controller
epoch and session fence; there is no independent commit path, so the
"optimization" either goes through the fence or fails closed. Key loss: the
snapshot encryption key is lost; startup fails closed and loud instead of
minting a new key and silently orphaning snapshots. Both attacks are defeated
by construction, not by detection.

The exact invariant that saves it: there is exactly one control authority;
every auxiliary store commits under its fences or it does not commit. No
independent commit path exists, so competing truths cannot be created.

Assumption that must hold: the controller epoch and session fences are
anchored in a lease or consensus external to the fenced stores (K8s leader
election in Orka; the PG journal's single-writer discipline in CRX). If the
epoch lives in the same store it fences, the guarantee is circular.

#### BORS-PREFLIGHT-MERGE-GATE (bors-ng) : NEEDS-HARDENING

Attack trace, batch-window drift: patch P passes preflight at assembly
(approvals bound to head SHA abc123, checks green). The batch CI run takes 40
minutes. During the run the author force-pushes (head moves to def456) and a
required check's configuration changes. The batch lands because the gate was
evaluated at assembly time and the record states no land-time
re-verification; untested code merges under a stale approval. Queue bypass: a
maintainer pushes directly to the target ref, bypassing the serial queue
entirely; the preflight checklist is moot because the queue was never the
sole write path.

Corrected invariant: approval is meaningful only when bound to the exact
commit being merged; required checks must be present and green at gate time
AND re-verified at land time (CAS on the target ref: land only if the ref
still equals the SHA the batch was built and tested on); the queue is
effective only if it is the sole write path to the target ref (branch
protection at the hosting layer).

Hardening: land-time SHA re-verification (CAS on target ref); sole-write-path
enforcement via branch protection; every unmet condition remains a distinct
typed block event.

#### BORS-HEAD-RACE-DETECTION (bors-ng) : NEEDS-HARDENING

Attack trace: same batch-window drift as preflight: the head-SHA comparison
runs at batch assembly; a head move during the batch CI window is not
re-checked at land time, so :race detection covers assembly but not landing.
Two batchers: a misconfigured deployment runs two batcher instances; both
assemble batches from the same queue and both pass race detection against
the same heads, then interleave staging pushes. The one-writer property comes
from single deployment, not from the mechanism; the record's invariant does
not survive a second writer.

Corrected invariant: a patch is batchable only against the exact head SHA
reviewed and tested; head movement is detected before batch assembly (:race,
retryable, never conflated with :conflict) AND re-verified at land time;
batch assembly is single-writer (one batcher holds the queue lease), so the
SHA comparison is meaningful.

Hardening: land-time SHA re-verification; single-writer lease on the batch
queue; :race vs :conflict distinction preserved through the land path.

### 3.6 Wakeup / liveness

#### ORCA-14 (alex2481kobe/orca) : NEEDS-HARDENING

Attack trace, silent watcher death: the lane completes at 17:01 and enqueues
the durable wakeup event; the polling watcher was SIGKILLed at 16:58. The
record admits a killed watcher silently stops wakeups. The durable queue
holds the event but nothing drains it; the orchestrator never wakes;
settlement and follow-up never fire. The incident the pattern was meant to
fix recurs one layer down: durability without a live delivery path.
Poll-latency miss: the watcher polls every 60 seconds; an approval gate with
a 30-second expiry lapses before the orchestrator wakes, and the mission
fails for want of a timely wakeup. Restart duplicates: the watcher restarts
with no durable cursor (ASSUMED: the record states none) and re-prints the
last transition; the orchestrator double-handles the terminal transition
(double settlement).

Corrected invariant: every terminal transition is durably queued AND
delivered over a live path with its own liveness proof: the watcher runs
supervised (restart on death), carries a durable cursor (exactly-once
delivery per transition), and its poll interval is shorter than the shortest
lease or approval window it serves. Queue durability is necessary but never
sufficient: a durable queue without a live, supervised delivery path is a
liveness bug.

Hardening: supervised watcher (or push-with-ack delivery with redelivery
instead of poll-and-print); durable delivery cursor; wakeup-latency SLA bound
to lease and approval windows; idempotent consumers; multiplex one watcher
per coordinator over N lanes instead of one poller per orchestrator at scale.

### 3.7 Memory family

#### LETTA-GIT-MEMORY (letta-ai/letta, archive branch) : NEEDS-HARDENING

Attack trace, silent degradation: the git repo becomes unavailable (disk
full). The manager degrades to non-versioned writes without failing;
corrections now destructively overwrite history with no alarm, and the
correction-survival guarantee evaporates exactly under stress. Poison
versioning: a prompt-injected agent writes attacker content to a memory
block; git faithfully versions the poison (append-only history is not a
trust gate). Secret permanence: a missed secret lands in a block while the
redactor runs elsewhere or not at all; the secret is now in immutable git
history with no destructive rewrite path, so it can never be purged and
every clone carries it. Concurrent writers: two agents write the same block;
merge conflicts and PG cache races are unaddressed by the record.

Corrected invariant: every memory state is recoverable by commit; the cache
never invents a state git does not have; git unavailability fails correction
writes closed (or queues them) with a loud typed event, never silently
degrades to destructive writes; every commit carries provenance (causation
id, source event); redaction runs before the git write; per-block writes are
serialized by CAS on the expected commit.

Hardening: fail-closed (or queued) behavior on git unavailability with loud
alerting; provenance metadata on commits; redaction gate before the git
write; defined secret-purge procedure under dual control for the inevitable
miss; per-block write CAS; tenant-scoped repos or branches with hosting-layer
access control (git has no native per-tenant ACLs).

#### GRAPHITI-BITEMPORAL-INVALIDATE (getzep/graphiti) : NEEDS-HARDENING

Attack trace, poisoned supersession: the attacker plants a false refund
policy in tool output; the extraction pipeline creates edge E2 with valid_at
tomorrow. resolve_edge_contradictions applies pure timestamp logic:
E2.valid_at is greater than E1.valid_at, so the true edge E1 is stamped
invalid and the lie becomes current truth. The mechanism's determinism is not
correctness: it deterministically launders poison, and the record's security
model ("invalidation requires a contradicting edge from the same pipeline")
assumes the pipeline is trusted while CRX's proven gap is that untrusted
content reaches memory. Future-dated valid_at: the attacker asserts valid_at
far in the future; timestamp logic crowns it. Silent skip: two contradictory
edges with overlapping windows hit the skip branch and both remain
"current"; consumers see an unresolved contradiction with no conflict event.

Corrected invariant: supersession is append-only AND trust-gated: a
contradicting edge supersedes only with provenance trust at least equal to
the edge it supersedes and with evidenced valid_at (un-evidenced valid_at
defaults to ingestion time, never the future); otherwise it is recorded as a
contested candidate. Contradiction resolves to timestamp stamps, never to
mutation or deletion of the old edge; skipped overlaps emit a typed conflict
event for resolution.

Hardening: trust-gated invalidation (provenance trust comparison; human or
verified confirmation for high-trust edges); evidenced valid_at with no
future dating; typed conflict events on skipped overlaps. Note: bi-temporal
invalidation never deletes, so a separate erasure path is needed for secret
purge and data-rights requests.

#### MEM0-EXPIRATION (mem0ai/mem0) : NEEDS-HARDENING

Attack trace, fail-open immortality: a row's expiration_date becomes
unparseable (manual DB edit, writer bypassing validation). The record treats
unparseable stored dates as not-expired, so the row stays visible forever;
the forgetting guarantee is void for exactly the rows most likely to be
adversarial, and "conservative" here means fail-open on the forget path.
Writer-controlled soft delete: a malicious writer sets expiration_date to
yesterday on another writer's true memory; the truth disappears from default
reads with no authority check: a deletion primitive disguised as expiration.
Conversely, poison gets expiration_date 2099 and persists.

Corrected invariant: a memory past its expiration_date is invisible to
default reads and the row is retained for audit; any row whose
expiration_date cannot be parsed is treated as expired (fail-closed) and
quarantined with a typed event; expiration changes are versioned events with
writer identity, and shortening another writer's expiration requires explicit
authority.

Hardening: fail-closed on unparseable stored dates (quarantine plus typed
event); versioned expiration changes; authority rule for shortening others'
expirations. Note: read-time evaluation does not retract already-retrieved
content from agent context.

#### MEMORYBANK-EBBINGHAUS (MemoryBank-SiliconFriend) : NEEDS-HARDENING

Attack trace, evidence destruction: a fraud-evidence memory goes unrecalled
for months; the load-time sweep's coin flip deletes it from the JSON bank.
The deletion is destructive (pop, not tombstone), so audit and replay can
never recover it; applied to anything evidence-grade, this violates CRX's
evidence rules. Reinforcement laundering: an attacker (or a looping agent)
repeatedly retrieves a poisoned memory; each retrieval bumps strength and
resets last_recall, so the poison becomes the strongest, longest-lived record
in the bank: retrieval-as-consolidation amplifies the poison it should
forget. Writer-set importance: the writer sets maximum initial importance on
poison, flattening its decay curve. Nondeterminism: the load-time coin flip
makes "what exists" depend on unlogged randomness, violating CRX's
determinism rule for constitutional outputs.

Corrected invariant: retention is a deterministic function of
(time-since-recall, strength); decay applies only to derived-cache memories,
never to evidence-grade or provenance records, and deletion is a tombstone
(recoverable, auditable), never a destructive pop; reinforcement happens only
through retrieval in verified contexts and never on mere surfacing; initial
strength is capped unless evidenced; any randomness is seeded and logged for
replay.

Hardening: scope decay to derived cache; tombstone instead of delete;
trust-gated reinforcement; capped initial strength; deterministic or
replayable-logged decay decisions. Without these, the mechanism is a
liability to CRX's evidence model, not an asset.

#### CHAMNAN-REDACTOR (ArcticFox2029/chamnan) : NEEDS-HARDENING

Attack trace, novel shape miss: a secret arrives with a new key prefix
(sk-new-...) or split across lines or inside a base64 blob; the regex set has
no pattern for it, the measured recall was computed on a synthetic corpus
that never included the shape, and the secret persists into memory, then into
prompts and exports. The library honestly documents its ceiling, but adoption
as the sole gate treats a measured speed bump as a boundary. Ingress bypass:
a memory enters through the cache-sync or import path (compare LETTA's
sync_blocks_from_git) that does not call the ingestion function; the
invariant ("no string enters memory without passing the redactor") holds only
for the one code path, not the store. Stale corpus: new secret formats
appear after the corpus was built; recall silently decays with no regression
signal.

Corrected invariant: no string enters the memory store through any ingress
(API, sync, import, restore, backfill) without passing the redactor; redactor
quality is measured on a corpus that includes real-shape and adversarial
variants (split, encoded, prefixed), and recall is re-measured on a schedule
with regression alerting; the redactor is one layer in a defense-in-depth
(structured secret passing by reference, output-side scanning before external
projection), never the sole gate.

Hardening: enforce redaction at every ingress path; expand the corpus to
real-shape plus adversarial variants and re-measure on a schedule; one-time
backfill scan of existing memories plus periodic re-scans; pair with
by-reference secret passing and output-side scanning.

### 3.8 Negative observability invariants

#### OBS-8CHECKS (observability lane detection table) : NEEDS-HARDENING

The eight checks (execution without authorization, tool result without
request, memory use without retrieval, mutation without receipt, missing
parent, orphan task, duplicate execution, stale snapshot execution) are sound
as detective backstops and necessary as specifications. As the sole control
they fail.

Attack trace, detective-only bypass: a compromised worker executes a tool
call and simply never emits the execution-start event; the
execution-without-authorization anti-join finds no execution event and reports
nothing, because the check detects unauthorized events, not unrecorded
executions. Absence of evidence is invisible. Forged authorization: the
worker emits its own authorization receipt event citing a fabricated grant;
the anti-join matches execution to receipt and passes, because receipts are
verified for existence, not authorizer provenance. Paraphrase exfiltration:
the model uses retrieved memory without citing memory IDs; the
memory-use-without-retrieval set difference finds no cited IDs and passes.
Paperwork-complete fabrication: the worker emits a mutation event citing a
receipt ID for a receipt event it also fabricated; the mutation-without-receipt
check verifies the receipt exists, not that the world changed. All four prove
the paperwork is complete, never that the claims are true. Missing
preconditions: the CRX baseline states mission lifecycle events lack
causation_id and the observability classes and tables are unwired and empty,
so several checks have nothing to join on today.

Corrected invariant: the eight checks are detective backstops over the
canonical journal, but authorization and duplicate-execution checks must also
exist as preventive gates (dispatch-time authorization re-check; unique
constraint on the deterministic execution key, not just a detective query);
authorization receipts are emitted by the authorization authority, never by
the authorized party; execution-start events are emitted by the dispatcher,
not the worker; receipts pin policy, config, and snapshot versions so the
stale-snapshot check is non-vacuous; external-effect receipts carry
independent evidence or are labeled claims.

Hardening: preventive form wherever the journal supports it (unique
constraints, dispatch gates); authorizer-emitted receipts; dispatcher-emitted
execution events; version-pinned receipts; close the CRX preconditions the
checks assume but CRX lacks (causation_id on lifecycle events; wired
observability classes; non-empty tables). Residual: paraphrase-level memory
use without ID citation is undetectable by set difference.

### 3.9 Guardrail tripwire audit

#### oa-guardrail-tripwire-audit (openai-agents-python) : NEEDS-HARDENING

Attack trace, hung sibling: an output guardrail trips; a sibling guardrail is
stuck in an infinite loop. The runner awaits the cancelled sibling with no
bound stated, so the tripwire exception never propagates and the run
continues past a tripped guardrail. Sink outage: the results sink's database
is down; the tripwire still raises (safe), but the tripping record is lost
with no typed gap event, so the audit trail has a silent hole exactly when it
matters. Runner bypass: a worker invokes the tool directly, bypassing the
SDK runner; no guardrail ever runs, because tripwires protect only the paths
that invoke them. Catch-and-continue: a higher layer catches the tripwire
exception and retries it as a transient failure; the fail-closed becomes a
retry loop. Secret excerpts: the tripped result carries an input excerpt
containing a secret into the sink, which is exported to the observability
vendor (the record admits guardrail results may carry excerpts).

Corrected invariant: a tripped guardrail halts the run via a typed,
non-retryable exception; sibling guardrails are cancelled and awaited under a
bound (a hung sibling is killed and logged, never allowed to delay the trip);
every completed guardrail result is sink-appended before propagation, and
sink failure is itself a loud typed gap event that never un-trips the
guardrail; guardrails are enforced at the tool boundary (server side), not
only in the agent runner; result excerpts are redacted before sink.

Hardening: bounded sibling await with kill; tripwire exceptions excluded
from retry by type; server-side guardrail enforcement at the tool boundary;
redaction of excerpts before sink; sink-failure gap events; map tripwire
types onto CRX typed failures.

## 4. Library invariants that were wrong or incomplete

Consolidated list of corrections from section 3. Each replaces the
corresponding INVARIANT (or fills a gap in FAILURE_MODEL) in
`mechanisms.jsonl` before any adoption work:

1. O-1: add lease (holder, expiry, fencing token), fencing-token CAS on
   claim/resume, mandatory tenant_id, secret-free persisted prompt.
2. oa-tool-invocation-identity: fingerprint is an exactness key, not a retry
   key; whitespace-stability holds only for JSON-parseable recognized types;
   retry dedupe needs a separate idempotency scope excluding environment and
   caller.
3. oa-tool-invocation-ledger: executed must be split into planned/dispatched;
   dispatched requires the provider ack; completions are write-once and
   graded verified-vs-claimed; recovery classifies per flag combination.
4. orka-write-once-execution-binding: binding creation must be authorized and
   evidenced; add freshness bound and single-holder lease; validate binding
   AND lease AND freshness.
5. RESTATE-INVOCATION-ID: the ID names; the journal enforces singularity via
   unique constraint; IDs are never bearer capabilities.
6. orka-outcome-unknown-fail-closed: the side-effect boundary must be an
   externally observable ack, never a local state-machine position; the
   OutcomeUnknown record cites last-observed evidence.
7. DBOS-STEP-RECORDING: "recorded = done" holds only for transactional
   effects; external effects are claims labeled by effect class with
   idempotency keys; step writers are identity-bound.
8. oa-approval-scope-fingerprint: same scope fingerprint implies same tool
   target, NOT same authorization target; grants are tiered and
   policy-version-bound.
9. LANGGRAPH-INTERRUPT: interrupts bind responder identity, shown payload,
   and approved semantic fingerprint; resume is single-writer CAS with
   responder provenance; answers are evidence events, not trusted data.
10. MCP-M26: grants are epoch/lease-bound with handler-start binding and
    re-verification for long handlers; auth context is
    authenticator-minted and session-bound; no local-process exemption.
11. MCP-M04: cancellation signaling is best-effort; CANCELLED requires
    server confirmation; unconfirmed abandonment is OutcomeUnknown;
    idempotency keys on side-effecting calls.
12. MCP-M06: "every wait has a bound" is false for handler execution time;
    the host must enforce an execution budget with kill.
13. BORS-PREFLIGHT-MERGE-GATE and BORS-HEAD-RACE-DETECTION: assembly-time
    gates need land-time SHA re-verification (CAS on target ref) and a
    single-writer queue lease; the queue must be the sole write path.
14. ORCA-14: durability is not delivery; the wakeup path needs supervision,
    a durable cursor, and a latency SLA bound to lease/approval windows.
15. LETTA-GIT-MEMORY: git outage must fail correction writes closed with a
    loud event, never silently degrade; commits carry provenance; redaction
    precedes the git write; per-block CAS; tenant-scoped repos.
16. GRAPHITI-BITEMPORAL-INVALIDATE: supersession must be trust-gated with
    evidenced valid_at; otherwise the mechanism is a poisoning amplifier.
17. MEM0-EXPIRATION: unparseable stored dates fail closed (quarantine), not
    open; expiration changes are versioned and authority-bound.
18. MEMORYBANK-EBBINGHAUS: decay is deterministic, derived-cache-only, and
    tombstoned; reinforcement is trust-gated; initial strength is capped.
19. CHAMNAN-REDACTOR: every ingress path is gated, not just the main
    ingestion function; corpus includes adversarial variants with scheduled
    re-measurement; defense in depth, never the sole gate.
20. OBS-8CHECKS: detective checks need preventive twins (dispatch gates,
    unique constraints); receipts are authorizer-emitted; execution events
    are dispatcher-emitted; receipts pin versions.
21. oa-guardrail-tripwire-audit: tripwires are typed non-retryable; sibling
    await is bounded; sink failure is a loud gap event; enforcement is
    server-side; excerpts are redacted.

## 5. Ranked kill-list

DIE: none. All 23 candidates are real, source-verified mechanisms; none has
a core claim so false that no hardening can save it. The killing to do is of
library invariants, listed in section 4. What follows ranks the
NEEDS-HARDENING candidates by risk if adopted as specified (blast radius
times likelihood), then the survivors.

HARDEN (highest risk first):

1. GRAPHITI-BITEMPORAL-INVALIDATE: verbatim adoption is a poisoning
   amplifier. Deterministic timestamp logic launders attacker-planted edges
   into current truth with no trust gate. Load-bearing hardening: trust-gated
   invalidation, evidenced valid_at.
2. oa-approval-scope-fingerprint: verbatim adoption authorizes argument
   smuggling under cached scope grants and lets stale grants bypass
   revocation. Direct privilege escalation path. Load-bearing hardening:
   tiered argument-bound grants, policy-version binding.
3. MEMORYBANK-EBBINGHAUS: verbatim adoption destructively deletes
   potentially evidence-grade records on a coin flip and reinforces poison
   through retrieval. Load-bearing hardening: derived-cache scope,
   tombstones, trust-gated reinforcement, determinism.
4. oa-tool-invocation-ledger: verbatim adoption misleads recovery (the
   executed flag overclaims) and permanently vouches for worker-fabricated
   completions. Load-bearing hardening: planned/dispatched/completed split,
   write-once completions, verified-vs-claimed grading.
5. MEM0-EXPIRATION: verbatim adoption fails open on unparseable dates
   (forgetting void where it matters) and hands every writer a soft-delete
   primitive over others' memories. Load-bearing hardening: fail-closed
   quarantine, versioned authority-bound expiration changes.
6. orka-write-once-execution-binding: verbatim adoption locks in
   attacker-minted bindings (immutability as a weapon), allows duplicate
   holders, and honors stale bindings past revocation. Hardening: authorized
   creation, freshness bound, holder lease.
7. LANGGRAPH-INTERRUPT: verbatim adoption permits self-approval, checkpoint
   forks that double-execute, and approval drift. Hardening: responder
   binding, single-writer resume CAS, approved-fingerprint binding.
8. MCP-M26: verbatim adoption leaves the revocation race open and invites
   inheriting the STDIO exemption and caller-asserted contexts. Hardening:
   lease-bound grants, authenticator-minted session-bound context, no local
   exemption.
9. LETTA-GIT-MEMORY: verbatim adoption silently degrades to destructive
   writes under stress and permanently archives missed secrets in immutable
   history. Hardening: fail-closed degradation, pre-write redaction,
   purge procedure, provenance.
10. DBOS-STEP-RECORDING: verbatim adoption overclaims "recorded = done" for
    external effects and treats worker-written outputs as authoritative.
    Hardening: effect-class labels, idempotency keys, writer identity,
    receipt grading.
11. BORS-PREFLIGHT-MERGE-GATE: batch-window drift lands untested code under
    stale approvals; queue bypass voids the gate. Hardening: land-time CAS,
    sole write path.
12. BORS-HEAD-RACE-DETECTION: same window; a second batcher voids the
    invariant. Hardening: land-time re-verification, single-writer lease.
13. O-1: zombie running rows, unsafe resume with duplicate execution,
    secrets and multi-tenant state in one local file. Hardening: lease plus
    fencing CAS, tenant_id, redacted prompts, PG journal substrate.
14. oa-tool-invocation-identity: cross-worker retries duplicate side
    effects; cross-tenant fingerprint confusion. Hardening: separate
    idempotency key, tenant in scope.
15. RESTATE-INVOCATION-ID: bearer attach across predictable partition keys;
    ID shape mistaken for enforcement. Hardening: journal unique
    constraints, authorization on attach, tenant in key.
16. orka-outcome-unknown-fail-closed: boundary by local state-machine
    position misclassifies real submissions as safe to requeue. Hardening:
    externally observable boundary acks, evidence-citing unknown records.
17. oa-guardrail-tripwire-audit: hung siblings delay the trip; runner
    bypass skips guardrails; catch-and-continue defeats fail-closed; sink
    excerpts leak secrets. Hardening: bounded await, non-retryable type,
    server-side enforcement, redaction, gap events.
18. MCP-M04: unconfirmed cancellations recorded as CANCELLED hide real side
    effects; retry-after-abandon duplicates. Hardening: confirmed-cancel
    rule, OutcomeUnknown fallback, idempotency keys.
19. MCP-M06: handler execution time is unbounded by the SDK; hung handlers
    become cross-tenant noisy neighbors. Hardening: host-enforced execution
    budget with kill.
20. ORCA-14: the watcher's silent death recreates the incident one layer
    down; poll latency can miss approval windows. Hardening: supervision,
    durable cursor, latency SLA, multiplexing.
21. CHAMNAN-REDACTOR: novel secret shapes miss; non-ingestion paths bypass;
    corpus goes stale. Hardening: every-ingress enforcement, adversarial
    corpus with re-measurement, defense in depth.
22. OBS-8CHECKS: detective-only; forged receipts pass; unrecorded
    executions are invisible; CRX preconditions (causation_id, wired
    observability) are unmet. Hardening: preventive twins,
    authorizer-emitted receipts, dispatcher-emitted events, version-pinned
    receipts.

SURVIVE:

- orka-single-control-authority. The exact invariant that saves it: there is
  exactly one control authority and every auxiliary store commits under its
  fences or does not commit; no independent commit path exists. Assumption:
  the epoch/fence anchor is external to the fenced stores.

## 6. Scaling appendix (1k tasks / 1k tenants)

- Compute-cheap at scale: oa-tool-invocation-identity, oa-approval-scope-
  fingerprint, MCP-M04, RESTATE-INVOCATION-ID, CHAMNAN-REDACTOR, MEM0-
  EXPIRATION, orka-outcome-unknown-fail-closed, orka-single-control-authority
  (all O(1) or O(payload) per operation, no coordination).
- Needs indexing or budgeting at scale: DBOS-STEP-RECORDING (one PG row per
  step; index workflow plus step), OBS-8CHECKS (indexed anti-joins; tenant in
  join keys), LANGGRAPH-INTERRUPT (independent checkpoint rows),
  oa-tool-invocation-ledger (run-local; fine), oa-guardrail-tripwire-audit
  (concurrent per stage; fine), GRAPHITI-BITEMPORAL-INVALIDATE (bounded
  candidate scan), MEMORYBANK-EBBINGHAUS (per-bank load scan),
  LETTA-GIT-MEMORY (linear git history; tenant-scoped repos).
- Does not scale as specified: O-1 (single-writer SQLite, per-host file, no
  multi-machine story), MCP-M06 without host bound (hung handlers exhaust
  shared pools), ORCA-14 as specified (one poller per orchestrator hammers
  the read projection at 1k missions; multiplex or push required).
- Cross-tenant leakage on verbatim adoption: O-1, ORCA-14 (multiplexed
  watcher), LETTA-GIT-MEMORY, GRAPHITI-BITEMPORAL-INVALIDATE (if candidate
  search crosses tenants), MCP-M06 (noisy neighbor without per-tenant
  budgets), oa-tool-invocation-identity, oa-approval-scope-fingerprint,
  orka-write-once-execution-binding, RESTATE-INVOCATION-ID, LANGGRAPH-
  INTERRUPT, OBS-8CHECKS (if joins aggregate across tenants),
  oa-guardrail-tripwire-audit (if sink views cross tenants). Per-record
  detail is in the CROSS_TENANT_RISK field of `verdicts.jsonl`.

## 7. Files

- `verdicts.jsonl`: one record per candidate. Fields: MECHANISM_ID, VERDICT
  (SURVIVES / FAILS / NEEDS-HARDENING), ATTACK_TRACE (concrete sequence),
  CORRECTED_INVARIANT (empty string where the library invariant stands),
  HARDENING_REQUIRED, SCALING_RISK (1k-task / 1k-tenant assessment),
  CROSS_TENANT_RISK (yes/no plus why).
- `work/targets.jsonl`, `work/targets_readable.txt`, `work/targets_fals.txt`:
  extracted mechanism records used as evidence (scratch, kept for audit).

Result: 0 SURVIVES-without-note except orka-single-control-authority,
0 FAILS, 22 NEEDS-HARDENING. Nothing dies as a mechanism; 21 library
invariants need correction before adoption, and the hardening listed for
ranks 1 through 5 is load-bearing: adopting those five verbatim would
introduce live vulnerabilities (poisoning amplification, authorization
bypass, evidence destruction, recovery misdirection, fail-open forgetting)
rather than merely leaving gaps.
