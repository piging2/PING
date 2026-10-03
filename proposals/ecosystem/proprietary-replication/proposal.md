# Proprietary Replication: Clean-Room PING-Native Primitives

Status: design proposal for the piging2 harvest. All designs below are original,
derived from publicly observable product capabilities only. No proprietary code,
SDK internals, or documentation text was consulted or reproduced. Method per
family: state the public capability in one paragraph, state what PING already
has, then design the smallest original mechanism that closes the gap in PING
semantics (canonical bytes, digests, append-only journal, evidence refs,
fail-closed, UNKNOWN as a legitimate state).

Target kernels: trust-kernel, object-kernel, event-kernel, capability-kernel,
proposal-kernel, projection-kernel. Existing packages: ask, objects, owner,
proposals, react-renderer, sitespec, trust.

The 14 proofs: 1 ingest Happy Place; 2 ingest Coppersmith; 3 deterministic
evidence-backed graphs; 4 materially explainable SiteSpecs; 5 render
mobile+desktop; 6 Ask FYD answers from evidence; 7 owner corrects one fact;
8 regeneration preserves correction; 9 create one mission; 10 worker returns
result; 11 injected bad result is rejected; 12 fallback attempt succeeds;
13 mission VERIFIED only after independent verification; 14 replay reconstructs
relevant state.

## 1. WorkOS-style: identity-change audit events

### Public capability (observed)
WorkOS exposes an audit-log capability: lifecycle events for organizations,
users, and sessions (org created, member added/removed, role changed, session
created/revoked) recorded as immutable, schema-versioned, queryable audit
records with actor, target, timestamp, and metadata, suitable for compliance
review and forensic replay.

### What PING already has
The event-kernel provides the append-only journal with ordering, dedupe, and
replay. PING does not have a typed identity-lifecycle audit envelope, a
per-record tamper-evidence chain, or an audit query contract. This design adds
only that envelope; it does not build a second journal.

### Clean-room design
- Object model: `AuditRecord`, object type `audit.record/v1`. Fields: id,
  org_id, kind (enum: ORG_CREATED, MEMBER_ADDED, MEMBER_REMOVED, ROLE_CHANGED,
  SESSION_CREATED, SESSION_REVOKED, CREDENTIAL_ISSUED, CREDENTIAL_REVOKED,
  POLICY_ATTACHED, CORRECTION), actor_id (identity or `system`), target_id,
  occurred_at, detail (canonical JSON with detail_schema version), prev_hash,
  hash, signer signature.
- ID scheme: `aud_<uuid7>`; time-ordered, unique.
- State transitions: DRAFT -> RECORDED (appended to the journal; terminal and
  immutable). Corrections are new records with kind=CORRECTION referencing the
  original id; history is never rewritten.
- Authority boundary: the identity authority (or its PING-native equivalent)
  writes; any holder of a read capability queries; trust-kernel verifies
  signatures and chain integrity.
- Persistence semantics: journal append; the record's canonical bytes are the
  persisted form. prev_hash chains to the previous audit record for the same
  org, giving tamper evidence on replay.
- Evidence/receipts: the record itself is evidence. `verify_chain(org_id,
  head_id)` recomputes hashes from genesis and returns VALID or the first
  broken link.
- Retries/failures: append is idempotent on record id; a duplicate append
  returns the existing record. Out-of-order prev_hash is rejected at write.
- Revocation model: audit records are never revoked or deleted. Session and
  credential revocation are themselves audit records.
- Tests: chain verifies end to end; a single flipped byte breaks verification
  at exactly one link; duplicate append is idempotent; out-of-order append is
  rejected; CORRECTION references resolve.

### Verdict
ADAPT.

### Smallest missing primitive
`AuditRecord`: a hash-chained, schema-versioned identity-lifecycle audit
envelope over the existing event spine. Proof ids: 3, 14.

## 2. Stytch-style: workload identity tokens

### Public capability (observed)
Stytch offers machine-to-machine authentication: short-lived credentials issued
to workloads, bound to an intended audience, carrying scopes, and revocable
before expiry, so services authenticate to each other without long-lived
secrets.

### What PING already has
Capability-kernel evaluates actor/target/action/constraints to allow/deny, and
trust-kernel handles canonical bytes and signature verification. PING does not
have a first-class short-lived machine credential with audience binding and a
revocation projection. This design adds the credential object and the
revocation check; it does not invent a new authority.

### Clean-room design
- Object model: `WorkloadCredential`, object type `credential.workload/v1`.
  Fields: id, issuer (PING trust authority id), subject (worker/machine identity
  id), audience (string naming the intended service or mission class), scopes
  (capability references), issued_at, expires_at (short TTL, 5 to 60 minutes),
  nonce, signature over canonical bytes.
- ID scheme: `wlc_<uuid7>`; the nonce makes each issuance unique.
- State transitions: ISSUED -> ACTIVE -> EXPIRED (by time) or REVOKED (by
  revocation event). Revocation is a journal event `CredentialRevocation`
  carrying credential id, revoked_at, and reason.
- Authority boundary: trust-kernel issues and verifies; capability-kernel
  consumes the scopes at authorization time. No other component mints these.
- Persistence semantics: issuance and revocation are journal events; the token
  travels with the worker and is never stored as a retrievable secret.
- Evidence/receipts: issuance and revocation events are the receipts; a
  verifier needs only the token, the issuer key, the audience string, and the
  revocation projection.
- Retries/failures: issuance is idempotent on (subject, audience, nonce).
  Validation is a pure function
  `validate(token, audience, now)` returning VALID, EXPIRED, REVOKED,
  BAD_AUDIENCE, or BAD_SIGNATURE. Fail closed on any doubt; bounded clock-skew
  tolerance.
- Revocation model: revocation event appended to the journal; the validator
  consults a deterministic revocation projection (or per-issuer revocation
  epoch). A revoked credential fails validation even before expiry.
- Tests: expired token rejected; wrong audience rejected; tampered payload
  fails signature; revoked token rejected pre-expiry; validation is
  deterministic across replays; duplicate issuance with the same nonce returns
  the existing credential.

### Verdict
ADAPT.

### Smallest missing primitive
Short-lived, audience-bound, signed workload credential plus a revocation
projection consulted at validation time. Proof ids: 10, 12.

## 3. Arcade-style: tool authorization runtime

### Public capability (observed)
Arcade-style tool platforms let agents call tools on a user's behalf with a
per-call authorization check: the call proceeds only where the agent's granted
powers and the user's authorization intersect, and each authorized call leaves
an auditable authorization record.

### What PING already has
Capability-kernel already evaluates actor/target/action/constraints to
allow/deny. What is missing is the dual-principal intersection rule
(agent grant AND user grant) and a signed per-call receipt binding that
decision to its exact inputs. This design adds the rule and the receipt; the
evaluation machinery is reused, not rebuilt.

### Clean-room design
- Object model: `AuthorizationReceipt`, object type `authz.receipt/v1`.
  Fields: id, agent_id, user_id, tool_id, action, params_digest,
  policy_digest (versions of the agent grant and user grant evaluated),
  grant_digests (both sides), decision (ALLOW or DENY), reason_codes,
  issued_at, expires_at (short per-call TTL), signature over canonical bytes.
- ID scheme: `azr_<uuid7>`; one receipt per call, never reused.
- State transitions: EVALUATED -> RECORDED (appended to journal; immutable).
  A receipt is bound to its params_digest; different params require a new
  receipt.
- Authority boundary: capability-kernel owns the decision function
  `authorize_tool_call(agent_id, user_id, tool_id, action, params_digest,
  context)`. ALLOW requires all of: agent grant covers tool/action under
  constraints, user grant covers tool/action/scope, no active hold or
  revocation on either side. Trust-kernel signs the receipt.
- Persistence semantics: receipts appended to the journal as evidence for
  replay and audit.
- Evidence/receipts: the receipt binds decision to inputs; a verifier
  recomputes the digests and the signature without re-running policy.
- Retries/failures: every call is re-evaluated; there is no cached ALLOW.
  DENY never dispatches. Evaluation failure (missing grant data) fails closed
  to DENY with reason POLICY_UNAVAILABLE.
- Revocation model: user revokes a grant via journal event; subsequent calls
  deny; outstanding receipts expire by TTL and are never renewed implicitly.
- Tests: agent grant alone without user grant denies; user grant alone without
  agent grant denies; both present allows; receipt with altered params_digest
  fails verification; revoked grant denies on the next call; missing policy
  data denies fail-closed.

### Verdict
ADAPT.

### Smallest missing primitive
`AuthorizationReceipt`: a signed per-call dual-principal (agent grant
intersect user grant) decision record. Proof ids: 10, 13.

## 4. Composio-style: delegated external-action execution

### Public capability (observed)
Composio-style platforms hold connected third-party accounts (OAuth and
similar) so an agent can trigger real external actions through named tools;
the agent references an account handle and never holds raw credentials, and
each action is recorded with attribution to agent, account, and outcome.

### What PING already has
Mission execution, evidence refs, and the UNKNOWN-is-legitimate doctrine exist.
PING has no opaque connected-account handle and no external-action record with
provider-receipt binding and an honest UNKNOWN terminal. This design adds the
handle and the record; credential material stays inside trust-kernel and is
never journaled.

### Clean-room design
- Object model 1: `ConnectedAccount`, object type `account.connected/v1`.
  Fields: id, user_id, provider, scopes granted, credential_fingerprint
  (never the secret), status, connected_at, expires_at.
- Object model 2: `ExternalActionRecord`, object type `action.external/v1`.
  Fields: id, mission_id, agent_id, connected_account_id, tool/action name,
  params_digest, authorization_receipt_id (family 3 receipt, required before
  AUTHORIZED), idempotency_key, status, result_digest, provider_receipt_id
  (opaque provider-side id), timestamps.
- ID schemes: `cca_<uuid7>` for accounts, `xar_<uuid7>` for action records.
- State transitions, account: PENDING -> CONNECTED -> EXPIRED -> REVOKED;
  reconnect returns to PENDING. Action: REQUESTED -> AUTHORIZED -> EXECUTING
  -> COMPLETED or FAILED or UNKNOWN. UNKNOWN follows the standing
  UNKNOWN-to-HOLD-to-RECONCILE law: a reconciliation event moves it to
  COMPLETED or FAILED, or appends evidence and leaves it UNKNOWN.
- Authority boundary: capability-kernel authorizes the action (family 3
  receipt required); trust-kernel alone touches credential material;
  event-kernel persists the record.
- Persistence semantics: journal append for both objects and every transition;
  the journal holds handles and fingerprints only, never secrets.
- Evidence/receipts: the action record plus provider_receipt_id is the
  attribution evidence; authorization_receipt_id binds the dual-principal
  decision.
- Retries/failures: retry allowed only from FAILED or from UNKNOWN via
  reconcile; COMPLETED never re-executes (idempotency_key enforced, passed to
  the provider where supported). Duplicate REQUESTED with the same
  idempotency_key returns the existing record.
- Revocation model: account REVOKED blocks new authorizations immediately;
  in-flight EXECUTING actions transition to FAILED, or to UNKNOWN when
  provider-side state cannot be confirmed.
- Tests: agent-facing read of an account returns the handle only, never
  credential bytes; duplicate idempotency key returns the same record;
  UNKNOWN persists until a reconcile event; revoked account denies new
  actions; action without an authorization receipt is rejected at AUTHORIZED.

### Verdict
ADAPT.

### Smallest missing primitive
`ConnectedAccount` opaque handle plus `ExternalActionRecord` with UNKNOWN
terminal and provider-receipt binding; the agent never holds raw credentials.
Proof ids: 10, 13, 14.

## 5. Braintrust-style: evaluation receipts

### Public capability (observed)
Braintrust-style evaluation platforms run scorers over traces (input/output
pairs) and produce versioned verdicts: each score is bound to the trace it
scored, the scorer identity and version, and the resulting verdict, so results
are reproducible and comparable across scorer versions.

### What PING already has
Evidence refs and the journal exist. PING has no typed record binding a trace
to a versioned scorer verdict as first-class evidence. This is that binding;
scoring logic itself stays outside the kernel.

### Clean-room design
- Object model: `EvalReceipt`, object type `eval.receipt/v1`. Fields: id,
  mission_id or artifact_id, trace_digest (canonical input plus output),
  scorer_id, scorer_version, verdict (PASS or FAIL), scores (named numeric
  map), evidence_refs, computed_by, computed_at, supersedes (optional prior
  receipt id), signature.
- ID scheme: deterministic, `evr_` prefixed hash of (trace_digest,
  scorer_id, scorer_version); identical inputs always yield the identical
  receipt, giving natural dedupe.
- State transitions: COMPUTED -> RECORDED (immutable). A new scorer version
  produces a new receipt that optionally supersedes the old; verdicts are
  never mutated or revoked.
- Authority boundary: trust-kernel binds trace to verdict as evidence;
  object-kernel owns the record schema. Scorers are untrusted producers; the
  receipt is what the system trusts.
- Persistence semantics: journal append; deterministic ids make replays
  converge.
- Evidence/receipts: the receipt is evidence; anyone can recompute the
  trace_digest and confirm the verdict matches the scorer version's declared
  semantics.
- Retries/failures: scoring is deterministic given (trace, scorer_version);
  recompute is safe and idempotent. A scorer that crashes yields no receipt,
  never a partial one.
- Revocation model: verdicts are never revoked; they are superseded by newer
  scorer versions only.
- Tests: same inputs produce byte-identical receipt ids; scorer version bump
  produces a distinct receipt; tampered trace fails digest check; verdict is
  bound to the exact scorer version recorded.

### Verdict
ADAPT.

### Smallest missing primitive
`EvalReceipt`: a deterministic, versioned scorer-verdict binding trace to
verdict as first-class evidence. Proof ids: 11, 13.

## 6. Patronus-style: adversarial case records

### Public capability (observed)
Patronus-style adversarial testing defines attack scenarios, runs agent
outputs against them, and records a judge's verdict per case, with enough
information to reproduce the case later.

### What PING already has
Family 5's EvalReceipt covers trace plus scorer plus verdict. What it does not
cover is the adversarial specialization: a scenario taxonomy and a
seed-pinned reproduction recipe binding scenario, agent version, and judge
version together. This design is a narrow specialization of the eval receipt,
not a second eval system.

### Clean-room design
- Object model: `AdversarialCase`, object type `adversarial.case/v1`. Fields:
  id, scenario_class, scenario_digest (attack template), seed, agent_id,
  agent_version, params_digest, agent_output_digest, judge_id, judge_version,
  verdict (VULNERABLE, ROBUST, or INCONCLUSIVE), reproduction recipe
  (scenario_digest, seed, agent_version, params_digest), created_at,
  signature.
- ID scheme: `adv_<uuid7>`; or deterministic over (scenario_digest, seed,
  agent_version, judge_version) where dedupe is wanted.
- State transitions: STAGED -> EXECUTED -> JUDGED (terminal for the pinned
  versions). INCONCLUSIVE may be re-run; a change to agent_version or
  judge_version starts a new case rather than mutating the old.
- Authority boundary: trust-kernel binds the case as evidence; the judge is an
  untrusted producer like any scorer.
- Persistence semantics: journal append; artifact digests (not raw attack
  payloads or outputs) are what get persisted, keeping the record compact.
- Evidence/receipts: `reproduce(case_id)` re-runs the recipe and compares the
  output digest; the verdict is evidence only for the exact pinned versions.
- Retries/failures: INCONCLUSIVE is retryable; VULNERABLE and ROBUST are
  terminal per version pin. Judge crash yields no verdict.
- Revocation model: verdicts are never revoked; superseded only by a new case
  on new versions.
- Tests: identical seed and pinned versions reproduce an identical output
  digest; any version change yields a new case id; verdict references the
  exact judge version; reproduce detects drift.

### Verdict
ADAPT.

### Smallest missing primitive
`AdversarialCase`: scenario plus seed-pinned reproduction recipe plus
judge-versioned verdict. Proof ids: 11.

## 7. Reco-style: agent ecosystem graph edges

### Public capability (observed)
Reco-style platforms map the agent ecosystem: which agent identities exist,
what permissions they hold, and what activity they performed, presented as a
queryable identity-permission-activity graph for security review.

### What PING already has
Projection-kernel already turns events and objects into deterministic current
views, and proof 14 requires replay to reconstruct state. A second graph store
would be a duplicate authority and is rejected outright. What is missing is
only the typed edge schema and the lineage query contract over the existing
journal.

### Clean-room design
- Model: `AgentLineageEdge` is a projection view, not a stored object.
  Fields: from (identity id), to (identity id or target id), edge (enum:
  ACTED_AS, USED_CREDENTIAL, ACCESSED, DELEGATED_TO, AUTHORIZED_BY,
  READ_EVIDENCE), at (timestamp), via (journal event id pointing at the source
  event).
- ID scheme: none stored; edges are derived. The `via` pointer is the
  identity: every edge resolves to exactly one journal event.
- State transitions: none; the projection is a pure fold
  `build_lineage(since)` over the journal, deterministic across replays.
- Authority boundary: projection-kernel owns the fold and the query contract
  `lineage(identity_id)` returning inbound and outbound edges. No new
  authority, no new store.
- Persistence semantics: derived only; recomputed from the journal. Nothing
  new is persisted.
- Evidence/receipts: each edge carries its `via` event id, so any lineage
  claim is checkable against the journal.
- Retries/failures: the fold is total over the journal prefix; a corrupt event
  fails typed at read time per the standing corrupt-projection rule (rebuild
  or typed failure, never silent plausible state).
- Revocation model: revocation is itself a journal event, so the projection
  reflects it on the next fold; historical edges remain as history.
- Tests: the fold is byte-deterministic across replays; every emitted edge
  resolves to a real journal event; no edges are invented; revocation events
  change the current view but not history.

### Verdict
ADAPT for the edge schema and projection view; the graph STORE is REJECTED as
a duplicate of projection-kernel.

### Smallest missing primitive
Typed `AgentLineageEdge` schema plus a deterministic lineage projection over
the existing journal. No new store, no new authority. Proof ids: 3, 14.

## 8. Zenity-style: agent posture records

### Public capability (observed)
Zenity-style platforms compute a security posture for discovered agents
(permissions, data access, external actions, risk signals), attach policies to
agents, and can take runtime control actions such as requiring approval,
suspending, or revoking an agent.

### What PING already has
Capability-kernel already owns allow/deny and revocation: suspending or
revoking an agent is a grant revocation event, and requiring approval is a
constraint on the grant. Enterprise-wide agent discovery and risk scoring are a
security-product capability, not part of the FYD loop
(WEBSITE to EVIDENCE to OBJECTS to SITE SPEC to RENDERER to ASK FYD to OWNER
ACTION to EVENT to REGENERATION) and not required by proofs 9 through 14.
There is no honest proof_id for this family.

### Clean-room design
Not admitted. The enforcement subset (suspend, revoke, require approval) is
already expressible as capability-kernel grant transitions; the
discovery-plus-scoring subset has no proof_id and no FYD-loop consumer.
Designing a posture record would add a scoring authority PING does not need.

### Verdict
REJECT. Reasons: no proof_id; enforcement subset already exists in
capability-kernel; discovery/scoring is enterprise-security scope outside the
FYD loop and outside proofs 9-14.

### Smallest missing primitive
None admitted.
