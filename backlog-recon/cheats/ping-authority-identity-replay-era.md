1. **The audit's four Grill candidates (G1–G4) were never transferred to the Grill, and never recorded as deci
1. **The audit's four Grill candidates (G1–G4) were never transferred to the Grill, and never recorded as decisions.** They appear only in the audit file. G1 (append-only policy owner) was operationally resolved by the lane ("Trigger preserved per Nolan's law," design B); G3 (replay "verified" vocabulary) was operationally resolved by replay convergence (honest verdicts). But neither appears in GRILLING-BRIEF.md under ACTIVE or DECISIONS WORTH RE-GRILLING. Operational resolution is not the same as a recorded operator decision; a future auditor reading only the Grill will think these were never decided.

2. **"STATUS LANGUAGE MUST MATCH PROVEN MECHANISM" — the permanent rule the audit demanded — appears in none o
2. **"STATUS LANGUAGE MUST MATCH PROVEN MECHANISM" — the permanent rule the audit demanded — appears in none of the standing files.** Grep of AGENTS.md, MEMORY.md, GRILLING-BRIEF.md: zero hits. Its substance was partially enacted (Lane N MC-truth audit, UI truth fix, honest-health checks), but the rule itself was never installed as a standing law.

3. **The tenant registries disagree by design, not by accident (TEN-002), and the audit's TEN-001 verdict ("la
3. **The tenant registries disagree by design, not by accident (TEN-002), and the audit's TEN-001 verdict ("latent, one tenant") conflicts with Lane B's live-plane reality:** `/mc` and `/tenants` were publicly readable business-intelligence surfaces (SEC-001/002, runtime-proven 200 unauthenticated) until the sprint mounted exterior auth. The "one tenant, latent" framing understates that the single tenant's data was publicly exposed.

4. **Lane N's ledger double-booked FL-20260919-009**
4. **Lane N's ledger double-booked FL-20260919-009** (Math.random() suspected false-green vs. ping-agent-ops GitHub auth blocker); disambiguated in the ledger as 009-UI. Related: the lane's `/tmp`-wipe entry duplicated FL-20260919-014 (collision lane's T1 migration failure); renumbered 017. Append-only numbering collisions are a standing hazard.

5. **Lane 2 vs. Lane 3 on artifact drift:**
5. **Lane 2 vs. Lane 3 on artifact drift:** Lane 2's GENERATOR_CWD_PROOF.md recorded 3 artifacts (uuid_registry, law_router, execution_router) as DRIFT vs. tracked, but Lane 3's independent fresh-sandbox runs at current HEAD produce SHAs byte-identical to tracked. Queued as proof-hygiene; the untracking verdicts rest on the independent proofs.

6. **Capability vocabulary audit (2026-09-13):**
6. **Capability vocabulary audit (2026-09-13):** the profiles in the dead `capability_authority.js` deny `secrets/*`, `credentials/*`, `.env`, `*.pem`, `*.key` — but that model was committed, never wired, and the live exterior contract was just POST /events. The "protection" existed only in the unwired model.

7. **C-R3 ("zero UPDATEs repo-wide") vs. the certified artifact:**
7. **C-R3 ("zero UPDATEs repo-wide") vs. the certified artifact:** the convergence lane's own certified migration ran `UPDATE ping_events`, and its backfill used the exact MAX(sequence)+1 pattern the ce3f8687c contract forbade (AUTH-008/009/010). The ledger's premises were falsified by its own code; the documentary amendments were explicitly deferred ("documentary amendment; no operator judgment needed") but their landed status is unclear from these sources.

---

## ITEM CATALOG

### DOMAIN:
### DOMAIN: AUTHORITY CONVERGENCE

**AUTH-CONV-01 — Event Authority forensic pattern continuing into Witness/Mission/Context/Claim authorities**
- STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: The standing plan resolves Event Authority first, then applies the same forensic pattern (SEMANTICS RULED → PATCHED → TESTED → WIRED → DURABLE → REPLAYABLE → CERTIFIED) to Witness, Mission, Context, and Claim/Presentation authorities; total-system convergence must not be declared on Event Authority alone.
- EVIDENCE: memory 2026-09-18: "After Event Authority reaches SEMANTICS RULED, PATCHED, TESTED, WIRED, DURABLE, REPLAYABLE, CERTIFIED, the forensic pattern continues into Witness Authority, Mission Authority, Context Authority, and Claim/Presentation Authority. Total-system convergence must not be declared on Event Authority alone." Sprint: WITNESS_PROVEN claimed [PROVEN_SOURCE] for derived-attestation only; replay fidelity landed.
- DEPENDENCIES: EVENT-SPINE-01, REPLAY-01
- ACCEPTANCE: each subsequent authority reaches the 7-stage pattern with test evidence; a one-line status registry shows which authorities are at which stage.
- NEXT FALSIFICATION: attempt to write a claim citing Witness Authority semantics beyond derived attestation; the gap between claimed and proven witness semantics falsifies or confirms completion.

**AUTH-CONV-02 — Dormant-sovereignty inventory: EventWriteAuthority and the dead policy classifiers**
- STATUS: OPEN · PRIORITY: 2
- WHY: `EventWriteAuthority

### DOMAIN:
### DOMAIN: PING EVENT SPINE

**EVENT-SPINE-01 — Migration-vs-trigger pre-promotion gate (permanent)**
- STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: The Oracle outage was constitutionally caused: the certified migration's UPDATE collided with an out-of-band append-only trigger no gate could see (smoke never touches Postgres; CERTIFIED checked module membership only). The lane built the fixture gate (50/50 PASS, fail-before on the old migration); LANE-A-20260920-05 specified the `--with-db` smoke mode but it was "specified, not implemented — estimated >30min."
- EVIDENCE: audit OBS-005/OBS-006, REC-001/003; sprint Lane A (migration-certification 50/50 [PROVEN_TEST]); Lane A discovery item 05 ("the gate's name overstates its coverage"); backlog CERT-HARD-001 (arm64 gate had the same shape of hole).
- DEPENDENCIES: none
- ACCEPTANCE: every release-certify run executes a real migration against a trigger-enforcing scratch fixture (or records why not); the certification artifact records which smoke mode ran; a deliberately trigger-incompatible migration FAILS the gate.
- NEXT FALSIFICATION: run the current smoke with bogus POSTGRES_PASSWORD → if SMOKE PASS, the hole persists (the lane's own falsification).

**EVENT-SPINE-02 — CanonicalEventEnvelope silent-drop-on-collision (AUTH-013)**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: `getNextSequence`'s non-atomic MAX+1 plus `ON CONFLICT (tenant_id, sequence) DO NOTHING` with an unconditional success return meant accepted busi

### DOMAIN:
### DOMAIN: IDENTITY AUTHORITY

**IDENTITY-01 — Identity-era cutover: re-mints every event ID; cross-era dedup plan required (G2)**
**IDENTITY-01 — Identity-era cutover: re-mints every event ID; cross-era dedup plan required (G2)**
- STATUS: DECISION · PRIORITY: 1
- WHY: Live mints naked 64-hex `SHA-256(JSON.stringify({eventType, source, ...}))` (camelCase, insertion-order); certified mints `event_<16hex>` via IdentityAuthority + RFC-8785 canonicalization with `core::system` namespace default. Same logical event gets different IDs across cutover; `ON CONFLICT (event_id)` cannot match; lineage links keyed by event_id break; witness roots incomparable; Qdrant projections double-land. The audit framed it as an identity-era migration, not a path swap.
- EVIDENCE: audit AUTH-011 ("no cross-era dedup plan exists"; "GRILL CANDIDATE (era marker? dual-read dedup? or accept double-landing?)"); era census: 739 Era-H rows, 0 V1 rows.
- DEPENDENCIES: DECISION (G2: accept double-landing with era marker / define cross-era dedup key / defer cutover); ERA-02 (era census) as input
- ACCEPTANCE: Nolan's G2 decision recorded in the Grill; the chosen option implemented (era marker column, or a cross-era dedup key over logical identity material) with a scratch-DB proof that re-emitted pre-cutover events do not corrupt lineage.
- NEXT FALSIFICATION: none empirical — this is a genuine operator judgment; the falsifiable input is the era census (SELECT-only count of 64-hex vs `event_` IDs).

**IDENTITY-02 — V2 identity boundary: legacy frozen, new events on IdentityAuthority (F7)**
**IDENTITY-02 — V2 identity boundary: legacy frozen, new events on IdentityAuthority (F7)**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: Nolan's F7 requirements: preserve the old identity era, introduce a versioned identity domain, prove the new encoding injective over the admitted value domain, keep old events replayable under original rules; never patch the serializer blindly. Evidence picked IdentityAuthority.generateId → CanonicalBytes.serialize → CanonicalAuthority.hashBytes for new UER emits; old rows frozen with era marking.
- EVIDENCE: memory 2026-09-18/19 (F7 resolution); backlog O1 CERTIFIED (F7-B 48/48, MC-1 85/85); era census (739 distinct Era-H IDs).
- DEPENDENCIES: none
- ACCEPTANCE: 739 Era-H rows byte-identical through migration (Lane A cert: history hashes unchanged); new emits mint `event_<16hex>`.
- NEXT FALSIFICATION: n/a (DONE_VERIFIED).

**IDENTITY-03 — Never casually change ID format / no historical reminting (standing law)**
**IDENTITY-03 — Never casually change ID format / no historical reminting (standing law)**
- STATUS: HARVEST · PRIORITY: 2
- WHY: The CE-001 lane's constraints ("no historical reminting," "IdentityAuthority stays sole minter," "no new lifecycle states") and the 25-phase plan (Phase 6 historical data law, Phase 10 "remove reminting without removing bridges") are stated per-lane, not as a standing law. The identity-era cutover makes this load-bearing.
- EVIDENCE: sprint CE-001 forensics ("Must not change: IdentityAuthority as sole minter, no historical reminting"); memory 2026-09-19 (V2 boundary requirements).
- DEPENDENCIES: none
- ACCEPTANCE: the law is recorded in the standing rules (AGENTS.md or equivalent): ID formats change only via a versioned identity domain with a migration plan; historical rows are never reminted.
- NEXT FALSIFICATION: n/a — documentary; the test is whether the next identity change cites it.

**IDENTITY-04 — Canonical event-identity bytes, cross-runtime (RTC-001)**
**IDENTITY-04 — Canonical event-identity bytes, cross-runtime (RTC-001)**
- STATUS: OPEN · PRIORITY: 1
- WHY: Event identity is Node-`JSON.stringify`-bound (insertion-order, no whitespace, `1.0`→`"1"`); no non-Node producer can reproduce it byte-for-byte. Python uses a different identity domain (`observation_sha256` over raw UTF-8, linked only via sidecars). The HTTP ingestion path never accepts `logical_id`, so every Python-emitted event is hashed over the full payload including the Python-generated timestamp — two byte-identical logical observations emitted at different times hash differently at the gateway layer (masked today only by the Python sidecar guard).
- EVIDENCE: audit RTC-001 ("Define canonical event-identity bytes once (sorted-keys JSON, explicit float/Unicode rules), implement in JS, add a Python reference implementation, prove sha256 equality on a fixture corpus. Do not change the live hash until proven.").
- DEPENDENCIES: AUTH-CONV-03 (UER serializer bypass)
- ACCEPTANCE: a canonical-bytes spec exists; JS + Python reference implementations produce identical sha256 on a fixture corpus; live hash unchanged until proven.
- NEXT FALSIFICATION: emit the same logical observation from Python and JS at different timestamps; different event_ids confirm the defect persists.

**IDENTITY-05 — CE-001: deterministic MISSION_COMPLETED identity**
**IDENTITY-05 — CE-001: deterministic MISSION_COMPLETED identity**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: Completion identity was wall-clock-derived (duration_ms, completed_at in the preimage), so every re-completion minted a new event_id; a crash between DB UPDATE and emit lost the completion permanently (row completed, no event, no reconciler). Fix: `logical_id {kind:'mission-completion', mission_id}` on the emit; clocks stay as payload metadata; `reconcileLostCompletions()` re-emits idempotently on scheduler start.
- EVIDENCE: sprint CE-001 (fail-before 2 cases; post-fix 45/45 over 7 cases: clock-independence, retry, lease-expiry, restart, crash-after-accept a/b, reconciliation idempotency, no-over-collapsing).
- DEPENDENCIES: none
- ACCEPTANCE: the 45/45 suite green; coordinator ruling recorded (reconciler's read-path `generateId` use is legitimate, not a bypass).
- NEXT FALSIFICATION: n/a (DONE_VERIFIED).

**IDENTITY-06 — CE-002: attempt/lease fencing for mission completion**
**IDENTITY-06 — CE-002: attempt/lease fencing for mission completion**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: A stale worker could complete after lease reassignment (fail-before: wrong result won the row and the journal, indistinguishable from legitimate). Fix: additive `attempts` column; `assign()` bumps the token; `complete()` requires token match, else typed STALE_ATTEMPT before any write. The reconciler is the privileged recovery path (presents no token, transitions no state).
- EVIDENCE: sprint CE-002 (fail-before 18/27 fail; post-fix 46/46; CE-001 45/45 preserved).
- DEPENDENCIES: IDENTITY-05
- ACCEPTANCE: 46/46 CE-002 suite; adjacent evals 8/9 (EVAL-006 harness issue ledgered separately as FL-20260920-003, healed).
- NEXT FALSIFICATION: n/a (DONE_VERIFIED).

**IDENTITY-07 — Signature verification on the governed ingest path (INVALID_SIGNATURE)**
**IDENTITY-07 — Signature verification on the governed ingest path (INVALID_SIGNATURE)**
- STATUS: PROVE · PRIORITY: 2
- WHY: The 8081 P1 battery proved: valid signed event → 200, invalid signature → 400 INVALID_SIGNATURE (GRILLING-BRIEF GATEWAY-001). That proof is on the side-port candidate, not the live 8080 plane (which still ran pre-adapter source 84486f056 at brief time; GATEWAY-001 swap decided 2026-09-21 GO). Signature verification is the identity authority's enforcement edge; its live-plane status needs confirmation.
- EVIDENCE: GRILLING-BRIEF GATEWAY-001 ("valid signed event 200, invalid signature 400 INVALID_SIGNATURE"; swap DECIDED 2026-09-21).
- ACCEPTANCE: the same signed/unsigned probe pair run against the live 8080 plane post-swap: 200 / 400 INVALID_SIGNATURE.
- NEXT FALSIFICATION: an invalid-signature event accepted (2xx) on the live plane falsifies enforcement.

**IDENTITY-08 — Cross-era dedup key definition (post-G2)**
**IDENTITY-08 — Cross-era dedup key definition (post-G2)**
- STATUS: DEFERRED · PRIORITY: 2
- WHY: If G2 chooses the dedup-key option, the key must be defined over logical identity material that is stable across both identity eras (preimage fields present in Era-H 64-hex rows and V2 `event_` rows), then proven on a scratch DB.
- EVIDENCE: audit AUTH-011 NEXT ("define the cross-era dedup key").
- DEPENDENCIES: IDENTITY-01 (G2 decision)
- ACCEPTANCE: a documented cross-era dedup key; scratch-DB proof that a re-emitted pre-cutover event dedups instead of double-landing.
- NEXT FALSIFICATION: n/a until G2 is decided.

### DOMAIN:
### DOMAIN: REPLAY

**REPLAY-01 — Persisted-journal replay convergence (canonical bytes in, verdict out)**
**REPLAY-01 — Persisted-journal replay convergence (canonical bytes in, verdict out)**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: Replay synthesized its input: `_buildReplayEvents` carried the Postgres query only as a comment and repackaged the in-flight trigger event; the kernel reminted every event_id (`evt-ping-<i>-<sha12>`), remapped types, stamped silent current-era defaults, silently truncated at maxEvents — while `REPLAY_COMPLETED` rows carried `verified:true` + `witness_root` that WitnessWorker attested. Fix (1d18f9c95): correlation-group load from ping_events as the input (fail closed on load failure); canonical `event_` IDs survive the kernel; era with provenance; INCOMPLETE on truncation/skip; honest sha256 `canonical_input_hash`; engine/algorithm/completeness persisted on the verdict.
- EVIDENCE: audit F4; sprint replay/witness forensics + replay convergence (fail-before 8/8; post-fix 8/8; e2e 9/9 with legacy NULL-sequence rows in Lane A order; 12-leaf invariant undisturbed).
- DEPENDENCIES: EVENT-SPINE-01 (Lane A ordering contract)
- ACCEPTANCE: REPLAY_FIDELITY_PROVEN [PROVEN_TEST]; persisted 4-event correlation group replays with every event_id preserved, verdict hash matching independent computation, determinism across runs.
- NEXT FALSIFICATION: n/a (DONE_VERIFIED).

**REPLAY-02 — 'Unknown'-era rows replay with explicit labeling, not fail-closed**
**REPLAY-02 — 'Unknown'-era rows replay with explicit labeling, not fail-closed**
- STATUS: DONE_VERIFIED · PRIORITY: 2
- WHY: Design caveat from the replay lane: rows with absent schema_version (predating era stamping) replay with the era explicitly labeled rather than failing closed; only declared-but-unsupported eras fail closed. This keeps the entire pre-existing journal replayable — a deliberate tradeoff between strictness and history preservation.
- EVIDENCE: sprint replay convergence ("Design caveat... Keeps the entire pre-existing journal replayable").
- DEPENDENCIES: none
- ACCEPTANCE: a test pins the behavior: unknown-era row → verdict with era labeled, not INCOMPLETE; declared-unsupported era → fail closed.
- NEXT FALSIFICATION: n/a (DONE_VERIFIED); re-open only if era discipline requires strictness later.

**REPLAY-03 — What "replay verified" may claim (G3 vocabulary rule)**
**REPLAY-03 — What "replay verified" may claim (G3 vocabulary rule)**
- STATUS: DECISION · PRIORITY: 2
- WHY: The audit's G3 asked what `verified:true` may claim while replay executed synthetic envelopes. The replay lane answered operationally (`verified` now requires provider-ok + zero violations + COMPLETE; `payload.replay_events` is an explicitly labeled test-mode seam), but G3 was never recorded as a decision in the Grill — same gap as contradiction 1. Certification-language integrity is Nolan's lane by precedent.
- EVIDENCE: audit F4 + G3; sprint replay convergence (verdict semantics); contradiction 1 (G3 absent from GRILLING-BRIEF.md).
- DEPENDENCIES: REPLAY-01
- ACCEPTANCE: a recorded decision (Grill or standing rule) stating the exact conditions under which a REPLAY_COMPLETED row may carry `verified:true`.
- NEXT FALSIFICATION: none empirical — judgment call; the falsifiable check is whether new `verified:true` rows satisfy the stated conditions.

**REPLAY-04 — Witness as derived replay attestation (W-1A live; W-2 harvested)**
**REPLAY-04 — Witness as derived replay attestation (W-1A live; W-2 harvested)**
- STATUS: IN_PROGRESS · PRIORITY: 2
- WHY: WitnessWorker is faithful on the live path: authenticates the trigger against the canonical REPLAY_COMPLETED row, distrusts envelope claims, never re-runs the kernel, attests only on verified===true with non-empty witness_root, derives identity from logical_id (clock excluded). W-2 (engine/algorithm version binding, explicit INCOMPLETE) lived on another branch; the replay lane harvested its version-binding/INCOMPLETE mechanisms. Dormant `witness_worker.py` (uuid4 IDs, own table, non-UER emission) has zero live references: do not wire, do not execute, do not delete (adversarial-audit material).
- EVIDENCE: sprint replay/witness forensics ("W-1A (98ef51c9c) is an ancestor of HEAD"; "the witness stage is faithful; the thing it attests to is not canonical replay"); replay convergence (W-2 harvest).
- DEPENDENCIES: REPLAY-01
- ACCEPTANCE: WITNESS_PROVEN for the full derived-attestation property incl. version binding; a re-run forensics confirms no independent mutable witness authority on any live path.
- NEXT FALSIFICATION: any live emission path that writes witness material without a backing REPLAY_COMPLETED row falsifies the derived-attestation property.

**REPLAY-05 — Sequence_replay T1 failure (FL-20260919-014, OPEN)**
**REPLAY-05 — Sequence_replay T1 failure (FL-20260919-014, OPEN)**
- STATUS: OPEN · PRIORITY: 3
- WHY: The sequence_replay certification runs 64 pass / 6 fail / 1 blocked with an identical baseline on pristine code; the T1 legacy-migration-backfill failure is pre-existing and unrelated to the collision lane, ledgered OPEN and out of every lane's scope.
- EVIDENCE: sprint collision lane ("recorded as FL-20260919-014 (OPEN, not this lane's scope)"); Lane F re-cert ("replay 64/6fail (T1-only known class FL-20260919-014)").
- DEPENDENCIES: none
- ACCEPTANCE: T1 passes or is reclassified with a documented reason; the 6-fail class is eliminated or explicitly accepted.
- NEXT FALSIFICATION: re-run sequence_replay_cert on the current SHA; any change in the fail set re-opens the classification.

**REPLAY-06 — Projection digest determinism across governed rebuilds**
**REPLAY-06 — Projection digest determinism across governed rebuilds**
- STATUS: PROVE · PRIORITY: 3
- WHY: The 8081 P1 battery proved "projection digest deterministic across two governed rebuilds" — but on the side port, not the live plane. Deterministic projection rebuild is the replay-adjacent property the FYD product's evidence graph will depend on.
- EVIDENCE: GRILLING-BRIEF GATEWAY-001 evidence block.
- ACCEPTANCE: two governed projection rebuilds on the live plane produce byte-identical digests.
- NEXT FALSIFICATION: rebuild twice on live; digest mismatch falsifies determinism.

### DOMAIN:
### DOMAIN: ERA CONVERGENCE

**ERA-01 — Runtime tree vs. certified tree vs. deployed tree discipline**
**ERA-01 — Runtime tree vs. certified tree vs. deployed tree discipline**
- STATUS: IN_PROGRESS · PRIORITY: 1
- WHY: The sprint certified a9cad2663, deployed rc-4d522a6b (source 4d522a6bd) to Oracle, then the branch moved past the deployed SHA — per the release doctrine "a release is a certified closure of a specific revision," which is correct but requires the next release cycle to certify a newer SHA. Separately, GATEWAY-001 authorized a swap to candidate-3c5d280dd on 2026-09-21 (source 3c5d280dd, constitutional-dist compile fix), a third revision. Era discipline means every operational claim names its tree and revision.
- EVIDENCE: sprint (branch-moved-past-deployed note; "The next release cycle certifies a newer SHA later"); GRILLING-BRIEF GATEWAY-001 (decided GO 2026-09-21); memory: "Until cutover completes, every recovery and replay claim must be era-qualified."
- DEPENDENCIES: EVENT-SPINE-01 (certification ladder)
- ACCEPTANCE: a one-page tree/revision registry (runtime SHA, certified SHA, deployed SHA, rollback SHA) current within one deploy cycle; every status claim cites its revision.
- NEXT FALSIFICATION: find a status claim in any doc that is true of one tree and false of another without era qualification.

**ERA-02 — Pre-cutover era census on the canonical DB**
**ERA-02 — Pre-cutover era census on the canonical DB**
- STATUS: OPEN · PRIORITY: 1
- WHY: The G2 decision needs the era boundary sized: SELECT-only count of 64-hex vs `event_`-prefixed IDs on the canonical DB. The 09-18 freeze counted 739 Era-H rows on the worktree plane; Oracle had 2510 rows (41 sequenced / 2469 legacy NULL) post-deploy.
- EVIDENCE: audit AUTH-011 NEXT ("SELECT-only era census on the canonical DB (count 64-hex vs event_ IDs) before cutover"); audit top experiment 3.
- DEPENDENCIES: none (SELECT-only, read-only)
- ACCEPTANCE: the census numbers recorded with date; they become the double-landing risk sizing for G2.
- NEXT FALSIFICATION: n/a — measurement; the risk is acting on stale counts.

**ERA-03 — Cutover plan (identity-era migration, not a path swap)**
**ERA-03 — Cutover plan (identity-era migration, not a path swap)**
- STATUS: BLOCKED · PRIORITY: 1
- WHY: The cutover is an identity-era migration: ID format change, cross-era lineage breakage, Qdrant double-landing, witness-root incomparability. The 25-phase plan sequences it (identity convergence → cross-references → historical data law → migrate producers not data → no naive dual write). Blocked on the G2 decision.
- EVIDENCE: audit AUTH-011 ("the cutover is an identity-era migration, not a path swap"); memory 2026-09-19 (25-phase plan phases 4–10).
- DEPENDENCIES: IDENTITY-01 (G2)
- ACCEPTANCE: a written cutover plan with era markers, dual-read or dedup-key semantics, rollback criteria, and a rehearsal on scratch PG.
- NEXT FALSIFICATION: n/a until unblocked.

**ERA-04 — Era-qualify the standing laws**
**ERA-04 — Era-qualify the standing laws**
- STATUS: IN_PROGRESS · PRIORITY: 2
- WHY: Cross-domain pattern P4: "Two eras described by one law." "PostgreSQL sequence = authoritative ordering" is true of the certified worktree, false of the running system. "Zero UPDATEs repo-wide" is contradicted by the certified migration. "UnifiedEventRuntime = sole authority" needed the legacy-boundary qualification. Every operational claim must be era-qualified until cutover completes.
- EVIDENCE: audit P4; AUTH-014 (documentary fix scoped to certified artifact); AUTH-008 (C-R3 amendment deferred).
- DEPENDENCIES: EVENT-SPINE-09, EVENT-SPINE-11
- ACCEPTANCE: the three standing laws carry explicit era scoping in their canonical documents; a lint or review checklist requires era qualification on new operational claims.
- NEXT FALSIFICATION: pick any recovery/replay/ordering claim in current docs; if it is not era-qualified and differs by era, the item stays open.

**ERA-05 — Legacy NULL-ordering semantics (design B)**
**ERA-05 — Legacy NULL-ordering semantics (design B)**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: The Oracle schema carried the failed deploy's partial migration (sequence BIGINT NULLABLE, nextval default, no unique index; 41 sequenced / 2469 legacy NULL). Design B ratified: sequence for new events only; legacy rows keep NULL with explicit unknown-ordering semantics; backfill UPDATE removed; conditional SET NOT NULL; NULL-count invariant; replay delivers legacy rows first as an explicit LEGACY segment.
- EVIDENCE: sprint Lane A (design decision; migration-certification 50/50: trigger-intact, history hashes unchanged, legacy NULL, new emits strictly increasing, replay contract, idempotent re-run); Oracle deploy Phase 2 (2510 rows, exactly matching pre-deploy).
- DEPENDENCIES: none
- ACCEPTANCE: 50/50 cert; Oracle post-deploy row counts match pre-deploy; zero STARTUP_BLOCKED.
- NEXT FALSIFICATION: n/a (DONE_VERIFIED).

**ERA-06 — Cutover hazard list (redelivery flip, bridge remint, timestamp precedence)**
**ERA-06 — Cutover hazard list (redelivery flip, bridge remint, timestamp precedence)**
- STATUS: OPEN · PRIORITY: 2
- WHY: The audit explicitly assigned the redelivery flip (AUTH-012) to "the cutover hazard list in cert docs." The hazard list should also carry the bridge's namespace-stripping remint (AUTH-003) and the timestamp-authority ambiguity (RTC-002) as era-transition risks.
- EVIDENCE: audit AUTH-012 NEXT ("add the redelivery semantic to the cutover hazard list in cert docs; no grill needed").
- DEPENDENCIES: EVENT-SPINE-07
- ACCEPTANCE: the cert docs carry a cutover hazard list with at least these three entries and their mitigations.
- NEXT FALSIFICATION: n/a — documentary; open until the list exists.

### DOMAIN:
### DOMAIN: PRIVATE CONTEXT

**PRIV-01 — Agent↔tenant authority model (G4): namespace is a comment, not a boundary**
**PRIV-01 — Agent↔tenant authority model (G4): namespace is a comment, not a boundary**
- STATUS: DECISION · PRIORITY: 1
- WHY: No agent↔tenant binding exists anywhere; tenant is caller-asserted at every layer (`authorizeNamespace` = regex validation only); `GET /events` without a namespace returns all namespaces; Qdrant uses one shared `knowledge` collection with namespace as a payload field; namespace threads through mission→worker with nothing constraining a worker to it. The audit's G4 is the genuine constitutional/security decision (credential-scoped tenants, registry-owned principals, or explicit single-tenant-until-redesign). EXP-006 (tenant-scoped technician SOP knowledge) is blocked on it: with the boundary unenforced, a second tenant's SOPs would be readable/writable by any credentialed agent on day one.
- EVIDENCE: audit TEN-001 ("SEVERITY HIGH (latent; one tenant today)"; runtime state 177 `tenant::hpp` / 1018 `core::system` / 10 `core::owner`) + G4; sprint B2 ("TEN-001 genuinely BLOCKED pending Nolan's decision... AUTHENTICATED-only (401) shipped; AUTHORIZED/NAMESPACE_SCOPED deliberately not introduced").
- DEPENDENCIES: DECISION (G4)
- ACCEPTANCE: Nolan's G4 decision recorded in the Grill; the chosen model implemented with a cross-principal bleed proof (audit experiment 5) run before and after.
- NEXT FALSIFICATION: the authorized non-destructive experiment — authenticated `P

**PRIV-02 — Dual tenant registries, disconnected (TEN-002)**
**PRIV-02 — Dual tenant registries, disconnected (TEN-002)**
- STATUS: BLOCKED · PRIORITY: 2
- WHY: `tenant_registry` (public CRUD via `/tenants`, now 401'd) vs `tenants` (ingestion boundary, seed-only `hpp`): no join. Registering via the API does not authorize ingestion; ingestion tenants cannot be added via any API. Tenant onboarding is incoherent.
- EVIDENCE: audit TEN-002 ("fold into TEN-001's decision").
- DEPENDENCIES: PRIV-01 (G4)
- ACCEPTANCE: one registry owns tenant identity with a documented onboarding path, or the pair is explicitly classified with the join semantics written down.
- NEXT FALSIFICATION: n/a until G4 lands.

**PRIV-03 — Principal loss across hops (TEN-003)**
**PRIV-03 — Principal loss across hops (TEN-003)**
- STATUS: OPEN · PRIORITY: 2
- WHY: `req.authenticatedAgent` is attached by middleware but consumed by almost nothing (7 hits, all in routes, none in runtime/workers/evidence/replay). `/ingest` never records the agent (body `source` is free text). Event→mission→worker carries only namespace and free-text source. Replay and evidence attest to asserted sources — and worker identity is self-asserted on `/events/processed|/failed` (SEC-006: "who processed what" provenance is forgeable).
- EVIDENCE: audit TEN-003 + SEC-006 (NEXT: diff `submittedBy` vs `workerId` in `mission.workerOutputs` — audit experiment 12).
- DEPENDENCIES: none (safe to start before G4; binding the principal is additive)
- ACCEPTANCE: the authenticated principal is recorded in event metadata at the authed routes; a read-only scan diffs `submittedBy` vs `workerId` for mismatches (sizes the forge exposure).
- NEXT FALSIFICATION: emit via an authed route and inspect the stored event for the principal; absence keeps the item open.

**PRIV-04 — Replay/projection/evidence carry no tenant scoping or caller authorization**
**PRIV-04 — Replay/projection/evidence carry no tenant scoping or caller authorization**
- STATUS: OPEN · PRIORITY: 2
- WHY: `replay_verifier.js` and `materialized_views.js` contain zero `tenant` references; `evidence_authority.js` checks namespace consistency but never requester entitlement. A replay or projection over one tenant's journal is not constrained to that tenant's caller.
- EVIDENCE: audit TEN-004 ("SEVERITY LOW (latent)").
- DEPENDENCIES: PRIV-01 (G4; scoping needs the authority model)
- ACCEPTANCE: replay/verify/projection entry points accept a caller principal and scope to authorized namespaces; unauthorized-namespace replay fails closed.
- NEXT FALSIFICATION: request a replay scoped to `tenant::hpp` from a principal with no grant; success falsifies the fix.

**PRIV-05 — Agent memory / private owner context store: canonical journal vs. operational store**
**PRIV-05 — Agent memory / private owner context store: canonical journal vs. operational store**
- STATUS: DECISION · PRIORITY: 2
- WHY: The invariant is "private context never leaks into public objects or canonical events." Today the 5 `agent_memory_authority` write sites are DELIBERATELY UNANCHORED (fail closed) because adapting them would require forging canonical acceptance. The owning-lane decision is binary: UER-accept these lifecycle types as real canonical event types (an authority decision), or move agent memory to an operational store outside the canonical journal. Either way, the invariant needs a stated home.
- EVIDENCE: sprint caller adaptation ("adapting would require forging canonical acceptance... or inventing resolving correlation ids"; "move them to an operational store outside the canonical journal"); AUTH-CONV-04.
- ACCEPTANCE: a recorded decision naming the store for agent-private context, with the invariant (no leakage into public objects/canonical events) stated and a test or gate enforcing the boundary.
- NEXT FALSIFICATION: a private-context write landing in `ping_events` without an authority decision falsifies the invariant.

**PRIV-06 — Credential lifecycle: rotation/revocation path for `exterior_agent_credentials`**
**PRIV-06 — Credential lifecycle: rotation/revocation path for `exterior_agent_credentials`**
- STATUS: OPEN · PRIORITY: 2
- WHY: Credentials never expire (`expires_at = NULL`); no code route rotates or revokes (rotation = direct DB edit); leaked key = permanent access. The 2026-09-20 rotation succeeded (48-char credential, five consumers agree) but PG-001 records that loopback `trust` makes the password theater on loopback — held for the gateway cutover, then the next security patch. The rotation was an operator action, not a path.
- EVIDENCE: audit SEC-007; GRILLING-BRIEF PG-001 (status: HOLD for gateway cutover; "Do not leave loopback trust indefinitely").
- DEPENDENCIES: none
- ACCEPTANCE: a documented rotation/revocation procedure (or code path) exercised once without direct DB edits; PG-001 resolved (tighten or explicitly accept with a re-review date).
- NEXT FALSIFICATION: attempt a rotation using only documented surfaces; any direct-DB-edit step keeps the item open.

**PRIV-07 — Probe tenant row cleanup (audit integrity incident)**
**PRIV-07 — Probe tenant row cleanup (audit integrity incident)**
- STATUS: PROVE · PRIORITY: 3
- WHY: The security lane's accidental unauthenticated `POST /tenants` created row `tenant_id='probe'` in `tenant_registry` (2026-09-20 01:54 UTC); left in place per read-only rules; flagged for authorized cleanup + a FAILURE_LEDGER entry. The audit's unknown-list still asks "whether the `probe` tenant row has been removed and whether a ledger entry exists."
- EVIDENCE: audit INTEGRITY NOTES + SEC-001; unknown-list ("Whether the probe tenant row has been removed").
- DEPENDENCIES: none (needs an authorized operator action, not a lane)
- ACCEPTANCE: the row is gone (SELECT confirms) and the ledger entry exists.
- NEXT FALSIFICATION: SELECT on `tenant_registry` for `tenant_id='probe'`; a row means cleanup never happened.

**PRIV-08 — CG-001: tenant owner is the default human decision authority**
**PRIV-08 — CG-001: tenant owner is the default human decision authority**
- STATUS: DONE_VERIFIED · PRIORITY: 1
- WHY: Decided 2026-09-19, retained in the Grill as re-grillable: PING recommends, the authorized tenant owner decides, the decision becomes canonical history; system constitutional authority and tenant business decision authority are not collapsed into one identity. This is the private-context governance anchor for FYD's owner mode.
- EVIDENCE: GRILLING-BRIEF "DECISIONS WORTH RE-GRILLING: CG-001" (verbatim model above); Lane B G-LANEB-1 counterevidence cites it.
- ACCEPTANCE: decision recorded (done); re-grill only on challenge.
- NEXT FALSIFICATION: n/a (DONE_VERIFIED).

**PRIV-09 — Secret-denial protections exist only in the unwired capability model**
**PRIV-09 — Secret-denial protections exist only in the unwired capability model**
- STATUS: PROVE · PRIORITY: 3
- WHY: The 2026-09-13 capability audit found the gateway `CapabilityAuthority` agent profiles deny `secrets/*`, `credentials/*`, `.env`, `*.pem`, `*.key` — but that model was committed and never wired; the live exterior contract was just POST /events. Any claim that "agents cannot reach secrets" must rest on the live path's protections (exterior auth + workspace scoping), not the dead model.
- EVIDENCE: capability-vocabulary-audit §1A (profile `deniedPaths`); "The `/capabilities` surface is implemented but unmounted."
- ACCEPTANCE: a statement of which live mechanisms deny secret access to exterior agents, with a test proving a secret-path request fails closed on the live plane.
- NEXT FALSIFICATION: request `secrets/*` (or equivalent) through each live exterior contract; any success falsifies the protection claim.

---

## CROSS-CUTTING NOTES FOR THE PARENT

1. **Status roll-up (48 items):**
1. **Status roll-up (48 items):** DONE_VERIFIED 13 · DECISION 5 (G2, G3, G4, PRIV-05, AUTH-CONV-10 is OPEN not decision) — precisely: DECISION = IDENTITY-01, REPLAY-03, PRIV-01, PRIV-05, and EVENT-SPINE-03's drain semantic (embedded as dependency) · BLOCKED 4 (ERA-03, PRIV-02, EVENT-SPINE-06's real-PG re-cert, LANEB-005-analog Oracle SSH) · IN_PROGRESS 11 · OPEN 13 · PROVE 5 · HARVEST 2 · DEFERRED 1.

2. **The four 2026-09-19 Grill candidates (G1–G4) never reached the Grill.**
2. **The four 2026-09-19 Grill candidates (G1–G4) never reached the Grill.** G1 and G3 were operationally resolved by sprint lanes; G2 and G4 remain genuinely open. Recommend the parent confirm whether Nolan wants the resolutions recorded as decisions or accepts the operational record.

3. **The permanent rule "STATUS LANGUAGE MUST MATCH PROVEN MECHANISM" was never installed**
3. **The permanent rule "STATUS LANGUAGE MUST MATCH PROVEN MECHANISM" was never installed** as a standing rule despite being the audit's headline permanent recommendation. Its substance lives in scattered fixes; the rule itself does not.

4. **Highest-leverage next experiments**
4. **Highest-leverage next experiments** (from the audit's own ordered list, still unexecuted to my knowledge): (1) migration-vs-trigger fixture gate + `--with-db` smoke mode; (2) scratch-DB concurrency repro of the silent drop (now subsumed by the demotion — re-verify); (3) pre-cutover era census; (4) `/events/unprocessed` two-poll drain proof; (5) cross-principal bleed proof; (6) canonical identity bytes JS+Python fixture proof.