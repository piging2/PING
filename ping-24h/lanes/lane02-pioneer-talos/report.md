# Lane 02: Pioneer + Talos donor archaeology report

Session: b382e274-6578-4e1a-9254-d901299330cd. T+0 = 2026-09-28 14:26 MDT.
READ ONLY throughout. No commits, no pushes, no tree modifications.
Shallow clones (--depth 1) at ~/workspace/ping-24h/donors/{talos,pioneer}/.
Raw verification notes: [raw/verification-notes.md](raw/verification-notes.md).
Claim strength key: OBSERVED IN CODE (I read the pinned tree directly),
DEMONSTRATED BY TEST (test file present in pinned tree, not executed),
CLAIMED BY AUTHOR (docstring/README assertion), INFERRED, SPECULATIVE.

**STATUS: HYPOTHESIS until replayed from a clean checkout.**
The verifications here were done on my own shallow clones of the pinned SHAs,
not on an independently replayed clean checkout. Per the 2026-09-26 ask-lane
rule, a verifier's replay decides truth, not this report.

---

## DONOR CARD: Talos

- Repository: https://github.com/talos-kernel/talos
- License: MIT (Copyright (c) 2026 Talos contributors), OBSERVED IN CODE (LICENSE file)
- Pinned SHA: 8938f8958e304f96da87b4f5154c4bc3a2b4cfa2
- Version/date: 0.19.23-alpha (talos/__init__.py line 13); pinned commit 2026-09-25, message "chore: freeze beta baseline and start daily observation"
- Activity: single-user personal-agent project; beta frozen 2026-09-25
- Language: Python 3.11+, ~42k LOC in talos/ (149 modules) plus tests/
- Deployment model: single-user local agent with Telegram/WhatsApp/web channels; model proposes, deterministic kernel decides
- Persistence model: SQLite via talos/eventlog.py, append-only hash-chained event log (length-prefixed hashes, BEGIN IMMEDIATE), idempotency keys; anchor.py pins head hash+count to an external endpoint against tail truncation
- Authority model: deterministic PolicyKernel (talos/policy.py), default-deny, zero LLM involvement. ToolRequest = (tool, Principal identity, args, targets). Model output is syntax-repaired into a request (talos/proposal.py); it never decides.
- Permission/capability model: single-use capability tokens (talos/capability.py): HMAC-SHA256 Grant over (grant_id, tool, action_fp, issued/expires, human_approved flag, governor level); 30s TTL; action_fp = sha256 over canonical JSON of (tool, identity, args, declared targets, KERNEL-DERIVED targets). GrantedRunner is the only execution path: raw runners are enclosed inside it and __call__ redeems first.
- Delegation/attenuation: AutonomyGovernor levels 0-5. Every level is a ceiling combined via stricter(): can only narrow a kernel verdict (ALLOW->NEEDS_HUMAN->DENY), never widen. DENY survives every level. Tokens are bound to the governor level at issue; a level change invalidates outstanding tokens at redeem. Governor has no tool: set only via operator command path (/autonomy <n>), identity-checked.
- Revocation: single-use marks grant_id spent; TTL expiry; governor-level change invalidates at redeem; /stopall discards all open approvals in the DENY direction; approval TTL 5 min returns None.
- Audit: exec.intent write-ahead event BEFORE any effect; exec.result receipt bound to grant_id; grant.issued event; action_fp in receipt; receipts describe state AFTER the action (done_detail()), never the pre-action reason string; log-derived honesty note in talos/outcome.py (totals computed from exec.result events, not model prose).

## DONOR CARD: Pioneer

- Repository: https://github.com/pioneerdotai/pioneer
- License: MIT (Copyright (c) 2026 Alexander Oskin), OBSERVED IN CODE (LICENSE file)
- Pinned SHA: 44142ac6e6348490fab0c58b0c4370c897155a65 (merge of PR #4)
- Version/date: 0.54.0 (workspace Cargo.toml); pinned commit 2026-09-28 20:11:02 +0300
- Activity: high, same-day release cadence near-weekly; recent releases dominated by restart/recovery/compaction correctness
- Language: Rust throughout, 41 workspace crates; desktop GPUI, gateway daemon; no Node at root
- Deployment model: single-host persistent coordinator. One gateway process is the only mutator of state; desktop/mobile clients attach via JSON-RPC. Local-first: no cloud SDK lock-in for the gateway core.
- Persistence model: SQLite via sea-orm through a single CrudStore (reader pool query_only=ON + one serialized writer executor). Durable: turns, threads, task runs/triggers, MCP installations + secret refs + catalog snapshots, skill install records/receipts, settings, keystore secrets. Does NOT survive restart: MCP server processes, live tool catalogs, provider adapter instances, client sessions, tunnel state. Those are rebuilt lazily and re-probed, never trusted from disk.
- Authority model: immutable execution admission per task/turn: (admission workspace id, root thread id, initiating principal id, authority envelope JSON). ExecutionAuthorizationContext.load_for_turn validates the durable binding against live principal rows on resume.
- Permission/capability model: workspace-scoped provider isolation. ProviderRegistry caches provider adapters keyed by authority fingerprint = SHA256(key material + proxy + base_url + version tag + workspace + provider name). Every wrapper is an AuthorityBoundProvider with a revocation AtomicBool checked on every use (ensure_not_revoked).
- Delegation/attenuation: per-workspace authority scopes; invalidate_workspace_provider revokes exactly one (workspace, provider) scope while other tenants keep cached adapters.
- Revocation: revoke-before-replace fencing. In get_or_create_for_scope, a resolved-authority fingerprint mismatch revokes ALL older wrappers in that scope BEFORE the new adapter is constructed. Failure classification maps 401/token-expired/revoked/invalid_api_key to a typed AuthExpired class; recovery assigns RefreshProviderAuth with 1 attempt and 120s wall clock; agent loop calls invalidate_workspace_provider then re-resolves from the keystore. Nothing credential-shaped persists across restarts (in-memory cache only).
- Audit: task events (append_task_event, e.g. TaskBlocked with typed error code/class); 5s live reconciliation loop with idempotent emit_recovery_event_if_missing; recovery decision snapshots persisted.

---

## TALOS MECHANISM 1: Double-kernel capability mint with single execution funnel

PROBLEM: A policy decision made once, early, is later trusted downstream. Any
bug in the executor path can then turn a verdict it never held into an effect.
Classic confused-deputy surface: the executor asks "was this allowed?", a stale
or forged verdict says yes, the tool runs.

INVARIANT: **No execution exists without a capability token minted by the
issuer re-deciding the exact request at issue time; no execution path exists
outside the single GrantedRunner funnel.** DENY can never become a token
anywhere in the process, even through a buggy caller.

MECHANISM (OBSERVED IN CODE, talos/capability.py + talos/executor.py):
CapabilityMint.issue(req) runs self._policy.decide(req) itself. DENY raises
CapabilityError regardless of any human_approved=True flag passed in. The
executor calls mint.issue(req) AFTER snapshot+recheck, immediately before the
run. GrantedRunner.__call__(req, grant) redeems first (signature, TTL,
governor-level match, tool match, recomputed action_fp match, single-use)
then dispatches the raw runner. Raw runners live inside GrantedRunner; there
is no other caller.

WHY IT WORKS: Two independent decision points must agree on the same request
object. The mint cannot be reached with a lie because it does not accept a
verdict as input at all, only the request. The funnel cannot be bypassed
because the runners are encapsulated: a forgotten gate call yields no run,
not an ungated run. Forgery fails on HMAC (secret is process-local, never
leaves the mint).

FAILURE IT PREVENTS: executor bug / stale verdict leading to execution;
replay of a granted action; token bent to another target/tool/identity
(action_fp mismatch); operator tightening the leash mid-run while a stale
token still flies (governor-level binding).

ASSUMPTIONS: (1) The mint and the executor share the same policy instance
configuration (the mint asks ITS policy; a divergent policy object would be
a second authority). (2) The process memory boundary holds: Talos's own
docstring says this is not a sandbox; anyone who can execute arbitrary code
in the process reaches the mint. (3) HMAC secret is process-local; tokens do
not cross processes/tenants (foreign-mint rejection is by secret scoping,
not by design intent written in code).

PING EQUIVALENT: PING's CapabilityAuthority concept (declared in docs),
WorkOrders, ResultEnvelopes. The mechanism is the mechanical enforcement
PING's declaration currently lacks.

PING STRONGER-WEAKER-DIFFERENT: WEAKER at the mechanical level (declaration
vs code). PING is STRONGER on the constitutional layer (Rule of One,
sovereignty auditing), which Talos does not name. DIFFERENT in scope: Talos
is single-process single-user; PING needs this across processes and tenants,
where assumption (3) bites and secret scoping must be explicit, not
accidental.

TEST WE CAN STEAL: test_deny_yields_no_token_even_with_human_approved
(run_shell rm -rf / with human_approved=True, expects CapabilityError);
"mint distrusts caller": tamper the executor's verdict (or pass a lying
verdict object into issue) and assert mint.issue still DENYs. Both
DEMONSTRATED BY TEST in the donor tree (files present, not executed here).

CODE WE ACTUALLY NEED: none (PING's stack is different). What PING needs is
the invariant re-implemented against its own WorkOrder/issuer path: the
issuing point re-runs policy itself at issue time; all dispatch funnels
through one redeem point.

VERDICT: NEW INVARIANT FOUND

## TALOS MECHANISM 2: Kernel-derived action fingerprint binding + approval TOCTOU recheck

PROBLEM: Capabilities bound to what the agent DECLARED can be bent: the model
declares ~/notes.md, the kernel's target extractor sees ~/.bashrc. And a human
approval given at 14:00 on file state F can be executed at 14:05 on file state
F' after a swap.

INVARIANT: **A token or approval is bound to (tool, identity, args, declared
targets, KERNEL-DERIVED targets) at fingerprint time; any single changed byte
or any changed target state fails at redeem/execution time. The binding that
matters is the one recomputed at execution time, not the one shown at ask
time.**

MECHANISM (OBSERVED IN CODE): action_fingerprint() = sha256 over canonical
JSON of {tool, identity, args, declared, derived}, where derived =
guard_targets(req), the kernel's realpath-expanded extractor output.
redeem() recomputes it and compares with hmac.compare_digest. On the approval
side (talos/approval.py): park() stores the EXACT ToolRequest plus
( (realpath, sha256) ) per target at ask time; target_unchanged() recomputes
at "yes" time; drift -> abort. Approvals carry 5-min TTL, narrow affirmative
set {"yes","ja"} only (no "ok"/"go"/"sure"), atomic claim_if_current with
approval_id + principal match, /stopall discards in the DENY direction.

WHY IT WORKS: The kernel, not the model, names the targets, so the token is
bound to what will actually be touched. The fingerprint is recomputed from
the live request at redeem, so a bent token fails even if the attacker
controls the stored record. The ask/execute TOCTOU window is closed by
re-measuring the world at the moment of "yes".

FAILURE IT PREVENTS: confused deputy via target substitution; TOCTOU file
swap across the human-latency window; casual "ok" in chat arming a shell run;
a forgotten "yes" becoming an open door (TTL); a stop command flipping into
an approval.

ASSUMPTIONS: (1) guard_targets extractor is complete for the tool: a tool
without a target extractor is DENY by construction in policy.py, so this
assumption is mechanically enforced. (2) sha256 of a target file is a usable
pre-image of "what the user saw": works for files, not for APIs whose state
cannot be hashed (their shell tool is ask-always, fail-closed around this).
(3) realpath binding catches symlink swaps (verified in _hits: realpath-based).

PING EQUIVALENT: Mission Control's ApprovalRequest digest binding
(mission-control/approval_request.py, 498 lines; first-pass: approve() needs
id + expected digest, no approve-latest). PING binds the request; Talos binds
the request AND the kernel-derived targets AND re-checks at execution.

PING STRONGER-WEAKER-DIFFERENT: WEAKER mechanically: PING's digest binding
does not (per wave-1) re-verify kernel-derived targets at redeem or recheck
across the human window. STRONGER on silence: PING's no auto-approval posture
is constitutional; Talos matches it here but only as module discipline.

TEST WE CAN STEAL: TOCTOU across human window: fingerprint at ask, mutate
file, "yes" -> abort (donor test name implied; file test_approval.py
present). Bend test: one byte changed in args/targets fails redeem.
Narrow-affirmative test: "ok"/"go"/"sure" must NOT approve (redteam-covered
per donor comments).

CODE WE ACTUALLY NEED: none. Adopt the two checks into PING's approval and
capability redeem path: (a) digest includes kernel-derived targets, (b)
exec-time re-measurement before honoring an approval.

VERDICT: NEW INVARIANT FOUND

## TALOS MECHANISM 3: Monotonic-only autonomy governor with level-bound tokens

PROBLEM: Runtime "autonomy knobs" are usually second authority sources: a
level that can be raised mid-run silently widens rights, and outstanding
permissions granted under a looser setting survive the tightening.

INVARIANT: **The governor can only narrow a kernel verdict, never widen it;
outstanding tokens carry the governor level at issue and die at redeem if
the level changed. Stacked ceilings compose by taking the strictest, never
by negotiation.**

MECHANISM (OBSERVED IN CODE, talos/autonomy.py + talos/policy.py:537-545):
stricter(decision, ceiling) returns ceiling only if SEVERITY[ceiling] >
SEVERITY[decision]; it is structurally incapable of returning a milder
verdict than the input. GovernedKernel.decide() applies kernel, then
governor ceiling, then channel-trust ceiling, then unattended and delegated
ceilings, all through the same stricter(). The governor has no tool in the
manifest; it is set only via an operator command path with identity check.
redeem() rejects any token whose level != current level: "Der Regler ist
eine Notbremse: wer waehrend eines Laufs zudreht, soll nicht zusehen muessen,
wie ein Sekunden altes Recht noch durchgeht." restore_level(): an unreadable
log fails to MIN_LEVEL (safe), not to the remembered level.

WHY IT WORKS: Weakening is not a policy choice, it is a type impossibility:
every layer is a ceiling. In-flight rights are level-stamped, so tightening
the leash has immediate mechanical effect at the next redeem instead of
waiting for TTL. Crash recovery cannot silently loosen: no log means safest
level.

FAILURE IT PREVENTS: autonomy escalation via runtime knob; stale loose
tokens surviving a tightening; crash->restart silently restoring a looser
posture; a second permission source emerging beside the kernel.

ASSUMPTIONS: (1) SEVERITY ordering is total and correct (ALLOW <
NEEDS_HUMAN < DENY); a mislabeled verdict would silently mis-stack. (2) The
governor's level is itself authentic: set via command path with identity
check, persisted in the event log. (3) Tokens are redeemed quickly (30s
TTL), so level-change invalidation is a backstop, not the primary expiry.

PING EQUIVALENT: PING's authority ceilings conceptually (Rule of One); no
named equivalent of a runtime monotonic governor in the workspace trees the
first pass scanned (marked hypothesis).

PING STRONGER-WEAKER-DIFFERENT: DIFFERENT: PING's authority model is static
and constitutional; Talos adds a runtime operator-controlled tightening
lever that cannot widen. For PING's ORCA dispatch this is the missing shape
of "operator hits the brakes mid-run and every in-flight WorkOrder loses
its rights at the next boundary". PING's constitutional layer is STRONGER;
this mechanical lever is absent.

TEST WE CAN STEAL: property test over stricter(): for all (d1, d2),
severity(stricter(d1,d2)) >= severity(d1) and never milder than d1;
level-change mid-flight invalidates outstanding tokens at redeem;
unreadable-state store restores to safest level, never to remembered.

CODE WE ACTUALLY NEED: none. The shape to adopt: level-stamped rights +
strict-only composition at every ceiling application.

VERDICT: MECHANISM BENCHMARKED

## PIONEER MECHANISM 1: Credential-authority fingerprint with revoke-before-replace fencing

PROBLEM: Credential rotation in a live system usually overlaps: the new
credential is published while old holders are still usable, and under
concurrency two threads can hold adapters from different authority
generations with no fencing. A failed replacement can leave stale
credentials usable by existing holders.

INVARIANT: **A credential change revokes all live holders of the old
authority BEFORE any new holder is published. The cache key includes the
authority fingerprint, so two generations can never be confused, and every
use checks revocation.**

MECHANISM (OBSERVED IN CODE, crates/provider/src/registry.rs):
authority_fingerprint() = SHA256(version tag, workspace id, provider name
lowercased, key material, proxy URL, base URL), zero-byte separated.
ProviderCacheKey = (workspace_id, provider_name, authority_fingerprint).
get_or_create_for_scope() resolves the full effective authority under a
per-scope singleflight lock; if the resolved fingerprint differs from cached
keys in that scope, revoke_matching() sets every older wrapper's revocation
AtomicBool BEFORE the new adapter is constructed (code comment: "otherwise
a failed warm replacement would leave stale credentials usable by existing
holders"). Every wrapper is an AuthorityBoundProvider; ensure_not_revoked()
is checked on every use path (prepare_input_budget and the Provider trait
surface). invalidate_workspace_provider() revokes exactly one
(workspace, provider) scope; other tenants' cached adapters keep working.
Failure classification maps 401/token-expired/revoked/invalid_api_key to a
typed AuthExpired class; the recovery table assigns RefreshProviderAuth with
max 1 attempt and 120s wall clock; the agent loop then calls
invalidate_workspace_provider and re-resolves from the keystore. Nothing
credential-shaped persists across restarts: the cache is in-memory only.

WHY IT WORKS: The fingerprint makes "same provider, different authority" a
different cache key, so rotation is keyed, not guessed. Revocation is a
shared AtomicBool on the wrapper, so even a holder that grabbed its Arc
before rotation fails on next use. Fencing order (revoke first, construct
second) means a failed construction cannot leave the old generation alive.
The typed AuthExpired class with a 1-attempt recovery policy prevents retry
storms.

FAILURE IT PREVENTS: stale-credential use after rotation; cross-tenant
credential bleed during rotation (scope-fenced); retry storm on 401;
credential material surviving a restart in a durable cache; partial
replacement leaving old holders usable.

ASSUMPTIONS: (1) The key_resolver closure reads the latest keystore value at
each get_or_create (wave-1 confirmed the closure design reads "latest
keystore value" per a unit test; production wiring not fully traced: INFERRED
for the production path). (2) All provider use goes through the registry's
wrappers: a direct adapter construction elsewhere would bypass fencing (not
observed; not exhaustively proven). (3) In-memory cache is acceptable because
re-resolution from the keystore is cheap and correct on every cold start.

PING EQUIVALENT: PING's secret broker concept; the first-pass findings
already flagged this as "directly relevant ahead of the gateway credential
rotation running in parallel".

PING STRONGER-WEAKER-DIFFERENT: DIFFERENT and complementary: PING brokers
secrets with erasable-payload separation (first-pass: PING ALREADY STRONGER
vs Pioneer's unencrypted sqlite keystore). What PING lacks is the
fencing ORDER: revoke-old-before-publish-new with a fingerprint-keyed cache
and per-use revocation checks. PING's broker should adopt the fencing
mechanics without adopting Pioneer's plaintext-at-rest store.

TEST WE CAN STEAL: fencing under concurrency: two threads hold a provider
from get_or_create; authority changes; assert both old wrappers fail on next
use (ensure_not_revoked) and only the new wrapper succeeds. Plus: AuthExpired
classification triggers exactly one invalidate + re-resolve cycle (no retry
storm). Both were ABSENT in the donor (wave-1: "Pioneer has invalidate tests
but no old-holder-use-after-rotation test found").

CODE WE ACTUALLY NEED: none (Rust vs PING's stack; also PING must not copy
the unencrypted keystore). Harvest the invariant and the two missing tests.

VERDICT: NEW INVARIANT FOUND

## PIONEER MECHANISM 2: Execution-authority integrity gate at startup (quarantine, never synthesize)

PROBLEM: On resume, orchestrators typically trust persisted rows: a turn
marked ACTIVE is re-driven, a task marked RUNNING is re-owned. But the row's
authority (who admitted this execution, under which principal, in which
workspace, under which permission profile) may be missing, corrupt, dangling,
or from another root. Inferring authority from row shape is silent privilege
synthesis.

INVARIANT: **Before any listener, recovery worker, or task runtime observes
active executions, every active execution authority record is scanned; any
record with a missing or invalid authority envelope is set to Blocked; scan
failure aborts startup. Authority is never inferred from row shape; the
worker never synthesizes a grant; a later explicit restart must create a
fresh admission.**

MECHANISM (OBSERVED IN CODE + DEMONSTRATED BY TEST,
crates/gateway/src/database/startup/execution_authority_integrity.rs):
run() paginates all active execution authority records (turns and agent
tasks, batch 10k). validate_record() requires authority_envelope_json
present AND ExecutionAuthorizationContext::load_for_turn() to succeed
against live principal rows. Failure -> turn set to Blocked with reason
"execution quarantined: mandatory authority envelope is missing or
invalid"; failure to quarantine -> bail (aborts the whole gate). Task side:
appends TaskBlocked with typed error code execution_authority_integrity,
class Policy. The task validator additionally checks admission workspace ==
envelope workspace == root thread workspace, initiating principal id
valid, and that the execution root is not an internal child thread. Module
test startup_gate_scans_every_page_and_quarantines_every_invalid_binding
forces batch size 2 across the keyset boundary: 12 scanned, 10 quarantined;
valid records survive. Fixtures cover missing envelope, corrupt JSON,
unsupported authority kind, missing actor, dangling principal id, wrong
root, unknown actor.

WHY IT WORKS: The gate runs before managers/transports start, so no worker
can observe an unvalidated execution. Validation is positive: it re-derives
the authorization context from durable data and checks it against the live
principal store, rather than accepting the row's status column as proof.
Quarantine is a terminal, honest state (Blocked with a reason), not a
silent skip. Scan failure aborts startup rather than proceeding with
unvalidated executions.

FAILURE IT PREVENTS: resuming an execution whose principal was deleted
(dangling); executing under a forged or version-skewed authority envelope;
wrong-workspace execution after a restore; silent privilege synthesis from
row shape; recovery workers re-driving unvalidated work.

ASSUMPTIONS: (1) The authority envelope schema is versioned and the loader
rejects unknown kinds (observed: unsupported "system_grant" fixture
quarantined). (2) The principal store is the live source of truth at gate
time; a principal deleted between gate and dispatch is a residual race
(outside the gate's scope). (3) Blocked is terminal-enough that nothing
later re-admits the quarantined execution without an explicit restart
("A later explicit restart must create a fresh admission").

PING EQUIVALENT: PING's tenant-scoped identity and server-derived authority
re-resolved on resume (first-pass: PING ALREADY STRONGER on the doctrine).
The mechanical gate at the resume boundary is what PING's first-pass
"most important architectural gap" describes as missing: authority
re-checked at every boundary, never inferred from row shape.

PING STRONGER-WEAKER-DIFFERENT: PING STRONGER on doctrine (constitutional
tenant identity), WEAKER on mechanics: PING declares server-derived
re-resolution; Pioneer shows the concrete gate (scan-all-active,
positive-validation, quarantine-not-warn, abort-on-scan-failure) plus the
test that pins it. This is the donor-side proof of the first-pass
"most important gap" claim.

TEST WE CAN STEAL: the donor's own test shape is directly portable:
seed N active executions with fixtures for each corruption class (missing
envelope, corrupt envelope, dangling principal, wrong workspace/root,
unknown authority kind); run the resume gate with a tiny page size;
assert valid ones proceed and every invalid one is Blocked with the typed
reason; assert scan failure aborts resume. Wave-1 also noted the missing
negative test: persisted tool-catalog snapshot must NEVER be consulted for
tool materialization after restart.

CODE WE ACTUALLY NEED: none. Adopt the gate shape into ORCA/Mission Control
resume: scan, positive-validate, quarantine, abort-on-scan-failure.

VERDICT: NEW INVARIANT FOUND

## PIONEER MECHANISM 3: Durable external-execution binding preferred over replay

PROBLEM: A timed-out dispatch against an external executor (Codex, Claude
CLI, an MCP server) is UNKNOWN, not failed. The naive recovery replays the
tool call, but the external process may still be running: replay then
double-executes. Conversely, a missing or non-idempotent tool snapshot can
hide the still-running execution.

INVARIANT: **A durable record of external dispatch outranks any replay
policy. Rehydrate/observe first; replay only when dispatch is provably
absent.**

MECHANISM (OBSERVED IN CODE,
crates/gateway/src/resilience/recovery.rs::policy_for_timeout_candidate):
for a timeout candidate with Standard execution class + CommandExecution
item type, if a CLI-runtime turn binding exists in STARTING/RUNNING with a
non-empty native turn id, recovery chooses RehydrateTurnState (observe the
live external turn) instead of the tool replay policy. Code comment:
"Rehydrating an already-started native CLI turn is observation, not replay.
Prefer its durable binding over the tool replay policy so a missing or
non-idempotent tool snapshot cannot hide an execution that Codex/Claude
may still be running." Combined (wave-1, CLAIMED BY AUTHOR + partially
observed) with claim_task_run_execution_for_recovery: atomic claim where a
valid execution lease OR a terminal authority both block recovery ownership
and occurrence transition, i.e. lease expiry never resurrects a dispatched
unit; plus a 5s live reconciliation loop with idempotent
emit_recovery_event_if_missing.

WHY IT WORKS: The decision is keyed on the durable binding row, not on the
absence of a result. Observation is side-effect free by construction;
replay is the dangerous action, so the burden of proof is on replay
("prove dispatch absent"), not on observation. The atomic claim closes the
race between two recovery workers.

FAILURE IT PREVENTS: double execution after timeout; replay hiding a live
external run; lease expiry resurrecting a dispatched unit; duplicate
recovery jobs (idempotent enqueue).

ASSUMPTIONS: (1) The CLI-runtime binding row is written BEFORE the external
dispatch begins (outbox order); otherwise "dispatch provably absent" is
unprovable. Wave-1 notes an outbox contract (leg-attempt row with
pre-generated run_id inserted before start); I did not re-verify the write
ordering in this lane: INFERRED from the recovery code's reliance on it.
(2) The native turn id in the binding actually identifies the live external
turn (executor-internal resume semantics, not Pioneer's). (3) The 5s live
reconcile loop stays idempotent: wave-1 flags this as fragile (any
non-idempotent step becomes a 5-second corruption loop; batch cursor is
in-memory only).

PING EQUIVALENT: ORCA's UNKNOWN external effect -> HOLD -> reconciliation;
lease semantics ("lease expiry never turns UNKNOWN back into CREATED");
Nerve's drain-before-drive + validate-resume-target (first-pass harvests 3/4).

PING STRONGER-WEAKER-DIFFERENT: DIFFERENT, complementary to Nerve: Nerve
gave drain-before-drive and validate-the-resume-target; Pioneer adds the
decision RULE that picks observation over replay from the durable binding,
plus the atomic claim fencing lease-vs-terminal-authority. PING's UNKNOWN
doctrine is STRONGER as doctrine; Pioneer shows the concrete dispatch-side
decision rule. The 5s live loop is a cautionary shape, not a harvest: PING
should keep reconciliation event-driven or provably idempotent, not copy a
blind 5s full scan.

TEST WE CAN STEAL: lease-expiry resurrection: claim_for_recovery returns NO
ownership when a terminal authority exists even if the lease expired
(wave-1: code comment asserts this; no dedicated test found in donor).
Timed-out candidate with live binding -> observe, never replay; with no
binding and proven-absent dispatch -> replay allowed. Both are the exact
"UNKNOWN -> HOLD -> reconcile" unit tests PING needs.

CODE WE ACTUALLY NEED: none. Harvest the decision rule and the two missing
tests; do not copy the 5s loop.

VERDICT: MECHANISM BENCHMARKED

---

## Cross-cutting observations

1. Talos and Pioneer independently converge on the same principle from
opposite ends: Talos says "the mint asks the kernel itself, it believes no
caller"; Pioneer says "the gate validates the envelope against the live
principal store, it infers nothing from row shape." Both are refusals to
trust a carried verdict. PING's "most important architectural gap" (first
pass) is exactly the absence of this refusal as a mechanically reached
path.

2. Talos's honest-limits docstrings are themselves a harvestable practice:
capability.py states plainly "Was das NICHT ist: eine Sandbox"; eventlog.py
documents that end-truncation is invisible without the external anchor.
PING's candor standard should require the same per-mechanism limits block.

3. Pioneer's plaintext keystore (encryption_opts: None) and Talos's
process-local HMAC secret both assume a single-host threat model. PING's
secret broker is already stronger at rest; the harvest is the fencing
order, never the store.

4. Both donors are single-user systems. Every mechanism above needs
tenant scoping re-applied when ported to PING: Pioneer's registry already
does per-workspace scoping (the model to copy); Talos's mint secret is
process-global and would need per-tenant mint secrets or a tenant-bound
key derivation.

## Verdict summary

| # | Mechanism | Verdict |
|---|---|---|
| T1 | Double-kernel capability mint + single funnel | NEW INVARIANT FOUND |
| T2 | Kernel-derived action fingerprint + approval TOCTOU recheck | NEW INVARIANT FOUND |
| T3 | Monotonic-only governor, level-bound tokens | MECHANISM BENCHMARKED |
| P1 | Credential-authority fingerprint, revoke-before-replace fencing | NEW INVARIANT FOUND |
| P2 | Execution-authority integrity gate at startup | NEW INVARIANT FOUND |
| P3 | Durable external-execution binding preferred over replay | MECHANISM BENCHMARKED |

Nothing was rejected outright; the shells around the mechanisms (Talos
regex command floor, Pioneer 5s reconcile loop, Pioneer plaintext
keystore) are documented as do-not-harvest in the cards above.
