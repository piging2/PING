# MUSE External Runtime Harvest, First Pass Findings

Date: 2026-09-28 (read-only research coordination)
Program: PING / ORCA / MISSION CONTROL BECOME THE SUPERSET.
Source reports: `~/workspace/runtime-harvest/wave1-donor-reports.md` (594 lines, 11 donor lanes, all completed)

Dispositions used are exactly from Nolan's allowed set:
PING ALREADY STRONGER, HARVEST TEST, HARVEST INVARIANT, HARVEST ALGORITHM,
HARVEST UX, ADAPT IMPLEMENTATION, DEPEND ON LIBRARY, RESEARCH FURTHER, REJECT, UNKNOWN.

Grounding note: pin SHAs, dates, releases, and licenses for every donor are
in the source reports file. What follows is the cross-donor synthesis.

## Verification boundary (honest)

The canonical PING runtime tree (`/home/nolan/projects/ping`, branch
fyd-factory, per mission-control/STATE.md) is NOT reachable from this
environment, so the required verify-against-PING-source step was performed
against the workspace lane trees actually present: `mission-control/`
(approval_request.py, proposal_record.py, proposal_validate.py, payload_lifecycle.py,
emit.py, frontdoor_adapters.py, backfill.py, adapters/, staging/, tests/),
`orca/` (root experiment drivers, port/effect_adapters/, unknown-outcome-experiments/,
effect-classes/), `constitutional-sprint/`, and the standing docs. Every
"already stronger" and "deletable" claim below names the file it was checked
against. Claims that need the canonical tree are marked as hypotheses to
confirm.

## 10 mechanisms PING should harvest

1. **Single-use capability token with one execution funnel** (Talos, pinned
   8938f895, 0.19.23-alpha, MIT). Policy is re-run at capability mint; the
   token can only execute through one GrantedRunner funnel; it can never be
   redeemed twice. Disposition: HARVEST INVARIANT. PING has the authority
   concepts; this is the mechanical enforcement of them at issuance.

2. **Kernel-derived action fingerprint plus approval TOCTOU recheck**
   (Talos). The fingerprint binds tool, identity, arguments, declared
   targets, and kernel-derived targets. Human approval is bound to the exact
   request and target fingerprint, with a recheck at execution time.
   Disposition: HARVEST INVARIANT. Directly hardens the ApprovalRequest
   digest-binding primitive (mission-control/approval_request.py, 498 lines).

3. **Transactional outbox with pre-generated attempt IDs plus CAS terminal
   transitions** (Nerve, pinned f9566d0f, Apache-2.0). Insert the attempt
   with a pre-generated ID before dispatch; exactly one winner owns terminal
   side effects via compare-and-swap. Recovery recomputes spend from the
   ledger, never from cached counters. Disposition: HARVEST ALGORITHM.
   Note: Nerve's own cron catchup watermarks only successful runs, so the
   harvest is the outbox plus CAS, not Nerve's scheduler.

4. **Drain-before-drive recovery queue plus quiescence gate** (Nerve). On
   restart, drain in-flight attempts before driving new work; prove the old
   executor is dead before replacement dispatch; validate the resume target
   against its actual materialization. Disposition: HARVEST ALGORITHM.

5. **Three-valued claim liveness with evidence-derived completion labels**
   (POLYROB, pinned a869af97, 1.1.0, MIT). Alive, provably gone, or
   undetermined; verified versus unverified completion labels derived from
   evidence; unverified outcomes excluded from learning. Disposition:
   HARVEST INVARIANT. This is the correct operationalization of PING's
   UNKNOWN doctrine in the learning path.

6. **Change-gated wake fingerprint plus crash-surviving ReentryBudget**
   (POLYROB). Skip no-op wakes only after a successful baseline wake; the
   self-wake loop budget survives process crash. Disposition:
   HARVEST ALGORITHM.

7. **Credential-authority fingerprint with revoke-before-replace fencing
   plus typed AuthExpired refresh** (Pioneer, pinned 44142ac6, 0.54.0,
   MIT). Authority fingerprint = hash(key material + proxy + base_url +
   version tag); on change, all live holders of the old authority are
   revoked before any new holder is published; 401/token-expired maps to a
   typed AuthExpired class that triggers exactly one invalidate plus
   re-resolve cycle. Nothing credential-shaped persists across restarts.
   Disposition: HARVEST INVARIANT. Directly relevant ahead of the gateway
   credential rotation running in parallel.

8. **Execution-authority integrity gate at startup: quarantine, never
   synthesize** (Pioneer). Before any listener, recovery worker, or task
   runtime observes active executions, scan every active execution
   authority record; any with a missing or invalid authority envelope is
   set to Blocked; scan failure aborts startup. Disposition:
   HARVEST INVARIANT. Strictly stronger than Nerve's authority-on-resume
   warning; authority is never inferred from row shape.

9. **Standing-context routing invariant plus anti feedback-loop retrieval
   invariant** (Hivekeep, pinned 7d023c95, 1.10.0, MIT). One boundary test
   applied verbatim at every memory decision point: "Should this influence
   the agent's behavior in most future conversations, without anyone
   mentioning it? Yes goes to standing context, no goes to the archive."
   And: telemetry such as retrieval counts is recorded but must never
   multiply a ranking score (Hivekeep's v1 had a measured winner-take-all
   failure: one memory injected 330 times, half the corpus never surfaced).
   Relevance is the only ranking signal; recency breaks ties only.
   Disposition: HARVEST INVARIANT.

10. **Normalized external executor event envelope plus persisted
    executor-thread attachment** (MatrixClaw, pinned 83fa2971, v0.1.19,
    MIT). One normalized event shape across executor backends; the
    executor-thread attachment is persisted so resume re-binds to the live
    handle instead of re-dispatching; child approvals mirror to the parent
    with full provenance and deduplication. Disposition:
    ADAPT IMPLEMENTATION (adapt: PING keeps its own event schema; harvest
    the attachment-persistence and mirror-with-dedup pattern).

Also of record: AgentArk's typed promotion/rejection reports with stable
reason codes (ADAPT IMPLEMENTATION); Pernix's evidence-expiry machinery
(usage-epoch grace, failure-dominated retirement) (HARVEST ALGORITHM);
Pernix's counterfactual replay with decontamination (RESEARCH FURTHER,
with the LLM judge replaced by deterministic pass/fail); Goated's
handler-level readiness and stale-evidence rule (ADAPT IMPLEMENTATION).

## 10 things PING already does better

1. **Constitutional authority model.** Rule of one, declared authority must
   match enforced capability ownership, sovereignty audited by bypass
   paths. Disposition: PING ALREADY STRONGER vs Talos's narrower
   capability-token layer and every donor's implicit authority assumptions.

2. **UNKNOWN is a legitimate typed state.** Stale provisional outcomes are
   never converted to accepted. Disposition: PING ALREADY STRONGER vs
   AgentArk, whose stale provisionals eventually become accepted.

3. **Silence is never consent.** No veto-window auto-approval; no
   timer, retry, or expiry path transitions to APPROVED; an edit submitted
   without evidence refs is failed, not auto-completed. Verified in
   mission-control/approval_request.py. Disposition: PING ALREADY STRONGER
   vs Pernix's fail-open governance and harness-manufactured evidence.

4. **HOLD and SUPERSEDED work-item semantics.** Idle is not failure; no
   pressure on the model to invent work. Disposition: PING ALREADY STRONGER
   vs POLYROB's idle-as-failure planner and Pernix's continuation pressure.

5. **Tenant-scoped identity and memory boundaries.** Server-derived
   authority is re-resolved on resume. Disposition: PING ALREADY STRONGER
   vs Hivekeep's explicit no-tenant stance, Nerve's system-principal
   resume, and MyAgens's cross-agent shared plane.

6. **Append-only audit metadata with erasable-payload separation plus
   secret-class redaction.** Verified in mission-control/payload_lifecycle.py
   (metadata hashed into metadata_digest; SENSITIVE payloads only behind
   revocable payload_ref with a forward-only lifecycle). Disposition:
   PING ALREADY STRONGER vs Pioneer's unencrypted sqlite keystore and
   Hivekeep's unredacted memory extraction pipeline.

7. **Capability-eligibility executor selection with runtime health.**
   Workers are selected by capability eligibility, not by name; health is a
   live probe, not binary presence and not self-reported completion.
   Disposition: PING ALREADY STRONGER vs MatrixClaw's name-based worker
   selection and Goated's self-reported completion.

8. **Typed failure semantics.** Service failure never becomes an empty
   result; failures answer what failed, which boundary failed, whether it
   is retryable, and whether evidence remains valid. Disposition:
   PING ALREADY STRONGER vs MatrixClaw's swallowed errors, AgentArk's
   weighted scalar that can hide a regression in one dimension, and
   Hivekeep's fail-open degradation.

9. **Digest-bound human approval.** approve() requires the approval id AND
   the expected digest; a mismatch refuses with no state change; there is
   no approve-latest; approvals cannot be issued against a disposable
   process. Disposition: PING ALREADY STRONGER vs ForkScout's prompt-text
   self-restart authorization and its known-good tag advanced before the
   replacement proves healthy.

10. **Evidence authority.** Provenance narratives are derived from records,
    never LLM-generated; claim-to-evidence traces survive the sanitize
    step. Disposition: PING ALREADY STRONGER vs Hivekeep's LLM-written
    sourceContext and its stored-but-never-surfaced sourceMessageId, and
    vs MyAgens's flat hot/warm/cold memories with no provenance.

## 5 dangerous patterns PING must avoid

1. **Fail-open governance.** Veto-window auto-approval on human silence
   (Pernix, default 24h); stale provisional outcomes converting to
   accepted (AgentArk). PING's constitutional rule is the opposite and
   must stay that way: models propose, deterministic policy authorizes.

2. **Goal and budget self-mutation.** The agent rewording its own
   objective and raising its own token/time/continuation budgets with no
   owner check (Pernix goal_update at safety tier "caution"). User intent
   enforced at creation is fully porous at update time.

3. **Harness-manufactured evidence and prose rails as authority.**
   Auto-stamping `session:{id}` as admissible evidence when the model
   forgot its refs (Pernix contract.py); prompt prose standing in for tool
   authority (POLYROB's planner rails, Pernix's "only goal_complete
   finishes this goal"). Authority must live in code.

4. **Secrets at rest without encryption.** Pioneer's DbKeyStore opened
   with encryption_opts: None (filesystem permissions only); Goated's
   plaintext credential files under a personal single-user threat model;
   Hivekeep's raw conversation content into memory with no redaction step.
   PING brokers secrets; it must never replicate an unencrypted secret
   store as its secret authority.

5. **Destructive restart machinery.** Broad pkill -f and port-wide killing
   in the restart path (ForkScout, matching PING's own prior :3100 failure
   class); known-good tags advanced before the replacement proves healthy;
   smoke tests that kill the old process before validating the new one;
   cron catchup watermarking only successful runs so a crash causes
   duplicate execution (Nerve). The standing rule holds: lanes stop temp
   servers by PID only, never touch :3100 except through start-3100.sh.

## 5 missing tests exposed by donors

1. **Capability single-use and funnel test** (Talos): a minted capability
   cannot be redeemed twice; no execution path exists outside the single
   GrantedRunner funnel. Disposition: HARVEST TEST.

2. **Goal-drift and budget self-grant test** (Pernix): any agent-initiated
   mutation of a goal's objective emits an auditable event and requires
   owner co-sign; an executor never accepts a budget raise from the
   agent's own tool call. Disposition: HARVEST TEST.

3. **Lease-expiry resurrection test** (Pioneer): claim-for-recovery
   returns no ownership when a terminal authority exists even if the lease
   has expired; lease expiry never resurrects a dispatched unit; exactly
   one invalidate plus re-resolve cycle follows an AuthExpired
   classification. Disposition: HARVEST TEST.

4. **Resume authority quarantine test** (Pioneer): active executions with
   tampered or missing authority envelopes are blocked at startup; a scan
   failure aborts startup; a persisted tool-catalog snapshot is never
   consulted for tool materialization after restart. Disposition:
   HARVEST TEST.

5. **Provenance round-trip and retraction lifecycle test** (Hivekeep):
   every auto-extracted memory's consumer read path can return the source
   message id (evidence link), not just a generated context sentence; an
   update to canonical memory preserves the prior version with a reason
   link; retraction is a typed, timestamped state distinct from hard
   delete. Disposition: HARVEST TEST.

## 5 pieces of PING code that could be deleted if convergence succeeds

These were verified in the local workspace trees only. Each needs a final
deadness proof against the canonical `/home/nolan/projects/ping` tree
before deletion. Do not delete on this report alone.

1. **`mission-control/staging/mc/`** (Next.js staging tree: route.ts for
   agents, graph, object, search, today, trace-forward plus the
   mission-control page.tsx). Zero references from any doc, code, or test
   in mission-control/. The live surfaces are served from the ping repo's
   :3100 tree (STATE.md). Delete after diffing against the live tree to
   confirm nothing staged-only survives.

2. **One of the two ExternalAgentAdapter shims.** `mission-control/lane-d/
   adapter-call.js` and `mission-control/_adapter_shim.js` are parallel
   thin transports to the same authorize/issue surface; the top-level shim
   itself documents "Same shape as the lane-D adapter-call.js support
   glue." Keep the canonical one, delete the other.

3. **`mission-control/backfill.py`.** One-shot historical backfill runner.
   It is idempotent (content-derived event ids, skips present events), so
   it becomes dead once the journal confirms every backfilled event is
   durable and a re-run reports zero new writes.

4. **ORCA root file-scan analysis drivers.** `orca/verify-chaos.js`,
   `orca/verify-matrix.js`, and `orca/attribute-failures.js` re-scan
   assert.js output and chaos/kill-matrix jsonl files with run-id gating.
   Once the ORCA port-lane reconciler contract lands (per-operation
   idempotencyKey, reconciliationState, retryEligibility) and these
   histories are projected per operation, attribution lives in the
   projected per-operation record and the file re-scans are dead.

5. **`mission-control/emit.py` as an independent journal writer.**
   emit.py's dedupe-append machinery is the write path backfill.py and
   the approval primitive use. If convergence makes the journal gateway
   (:18199) the single journal authority, this module reduces to a thin
   client of the gateway or is deleted. This is the weakest of the five:
   confirm the gateway accepts every event type emit.py writes before
   touching it.

## 3 ORCA changes worth implementing immediately

1. **Atomic recovery claim with lease-plus-terminal-authority fencing**
   (Pioneer harvest). Recovery ownership of a task run requires no valid
   execution lease AND no terminal authority; lease expiry must never
   resurrect a dispatched unit; a timed-out candidate with a durable
   external-dispatch binding rehydrates/observes first and replays only
   when dispatch is provably absent (Nerve drain-before-drive +
   Pioneer's durable CLI binding preference). This closes the
   duplicate-execution class across ORCA restarts.

2. **Execution-authority integrity gate at coordinator resume** (Pioneer
   harvest). Before the coordinator's listeners, recovery workers, or task
   runtime observe active executions, every active execution authority
   record is scanned; any with a missing or invalid authority envelope is
   blocked; authority is never inferred from row shape; scan failure
   aborts the resume. This is the mechanical enforcement of PING's
   tenant-identity/server-derived rule at the resume boundary.

3. **Normalized external executor event envelope with persisted thread
   attachments** (MatrixClaw harvest). Every external dispatch emits one
   normalized event shape; executor-thread attachments persist so resume
   re-binds to the live handle instead of re-dispatching; child approvals
   mirror to the parent with full provenance and deduplication. This gives
   ORCA restart-safe external execution without a second event spine.

## 3 Mission Control changes worth implementing immediately

1. **Assert the standing-context routing invariant** (Hivekeep harvest).
   State it verbatim wherever promotion decisions are made: material that
   should influence behavior in most future conversations without anyone
   mentioning it becomes standing context; everything else stays in the
   evidence archive. Always-present context pays permanent rent from the
   token budget. This bounds the growth of what MC projects.

2. **Assert the anti feedback-loop retrieval invariant** (Hivekeep
   harvest). Usefulness-unproven signals (retrieval frequency, recency,
   importance self-ratings) must never be ranking multipliers; relevance
   is the only ranking signal and recency breaks ties only. Encode this in
   MC's search intent router and any ranked surface. Cheap to adopt,
   expensive to learn the hard way.

3. **Apply credential-authority fencing at the secret broker boundary**
   (Pioneer harvest). A credential change must revoke all live holders of
   the old authority before any new holder is published; credential
   expiration maps to a typed class with exactly one invalidate plus
   re-resolve cycle (no retry storm); nothing credential-shaped persists
   across restarts. MC's own technology tab already proved masked-health
   and missing-healthcheck risks on this host; this closes the equivalent
   credential-rotation gap before it becomes an incident.

## The most important architectural gap discovered

**PING's constitutional authority semantics are stronger than every
donor's, but the mechanical enforcement path is thinner than the donors
show is possible.** Every donor that earned a harvest had one thing in
common: the critical property is enforced by a mechanically reached path
from authoritative decision through issuance, dispatch, outcome
classification, reconciliation, and receipt. Talos re-runs policy at
capability mint and funnels all execution through one redeem path. Pioneer
quarantines executions whose authority cannot be positively validated at
startup and never synthesizes a grant. Nerve guarantees one winner owns
terminal side effects via CAS and recomputes from the ledger instead of
cached counters. In PING, the equivalent properties (authority boundaries,
UNKNOWN doctrine, silence-is-never-consent, digest-bound approval) are
declared across code and docs and verified in strong lanes, but the scan
did not find one mechanically reached path that re-verifies authority at
mint, redeem, dispatch, resume, and terminal transition the way the
donors do. Convergence should build exactly that path: one decision
through capability issuance, executor selection, dispatch, outcome
classification, reconciliation, and receipt, with authority re-checked at
every boundary and never inferred from row shape. Everything else in this
file is a detail of that gap.
