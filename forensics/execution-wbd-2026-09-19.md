# Execution work-breakdown — 2026-09-18 (execution mode, operator-authorized)

Giant planning reports are capped. This file is the operative plan. Proof packets per unit, not plans.

## Operating loop (every unit)

SEARCH -> VERIFY -> CHOOSE HIGHEST-CONFIDENCE OBJECTIVE -> WRITE/PRESERVE INVARIANT TEST -> IMPLEMENT -> TEST -> FALSIFY -> COMMIT -> MERGE WHEN PROVEN -> TEST MERGED STATE -> PUSH -> DEPLOY WHEN CERTIFIED -> VERIFY RUNTIME -> CONTINUE

## Proof packet (required per unit, no exceptions)

OBJECTIVE / START SHA / FILES / INVARIANT / IMPLEMENTATION / TESTS / ADVERSARIAL TEST / COMMIT SHA / MERGE SHA / PUSH STATUS / RUNTIME STATUS / WHAT WAS FALSIFIED / NEXT BROKEN ARROW

## Lanes (one writer per mutable unit, isolated worktrees)

| Lane | Mandate | Worktree / branch | Writer | First task | Mutation gate |
|---|---|---|---|---|---|
| P | Event Authority 12-assertion proof (READ ONLY) | read-only everywhere | proof worker | P1-P12, each with VERDICT / EVIDENCE STATE / FILE / SYMBOL / CALLER / CALLEE / RUNTIME EVIDENCE / FALSIFIER; cheap fresh-grep re-verify of the falsified premises (do not trust blindly, do not re-investigate deeply) | read-only; never implements the repair |
| F | Independent falsification (READ ONLY; does NOT read P's conclusion first) | read-only everywhere | auditor | disprove "exactly one effective Event Authority"; bypass hunt (direct INSERT/UPDATE ping_events, alternate tables, EventRepository.append, ConstitutionalEventStore.append, emit, raw pg, SQLite/filesystem logs, test-only authority booted, generated-vs-source); falsification packet | read-only; never |
| W | Witness trigger protocol (READ ONLY until P-1 establishes sufficient upstream truth) | /home/nolan/worktrees/constitutional-convergence @ constitutional-convergence-v2 | sole writer only when authorized via writer packet | W-0 evidence only: H0/H1 with BEFORE/AT/AFTER/CURRENT SOURCE/CURRENT BUILD/CURRENT LIVE + the board question list | writer unit only via coordinator's writer authorization packet |
| C | ContextPack (READ ONLY) | read-only | auditor | which impl is EFFECTIVE? producer? consumer? identity? invalidation? source versions? stale-after-mutation? identity collision? replay reconstruction? canonical or derived? persistence? restart? smallest broken arrow | no mutation until assigned |
| T | Temporal classification (READ ONLY) | read-only | auditor | REQUIRED / OPTIONAL / DORMANT / LEGACY / CONFLICTING with crash-question evidence (Temporal disappears? PING dies after schedule before ack? worker completes but PING dies before result persistence? activity idempotency? duplicate delivery -> duplicate canonical events? second mission authority?) | no mutation until assigned |
| M | Mission Control phantom map (READ ONLY) | read-only | auditor | every visible surface; per field: REAL BACKEND / FIXTURE / MOCK / GENERATED / STALE / UNKNOWN; no UI polishing | no mutation until assigned |
| O | Oracle readiness forensics (READ ONLY; NO install, NO deploy, NO Docker install) | 129.146.60.17 via Pig SSH | investigator | SSH / ARM64 / HOST / MINIMUM STACK / IMAGE GATES / MEMORY BUDGET / DISK BUDGET / NETWORK / PERSISTENCE / BACKUP / RESTORE / BLOCKER / NEXT MUTATION | host mutation only at the install gate: SSH VERIFIED + ARM64 gates pass + minimum stack defined + persistence path defined + backup/rollback plan defined + no upstream blocker for the first slice |

Read-only lane terminal states: every audit packet terminates in PROVEN (no mutation required) / FALSIFIED (exact broken arrow) / BLOCKED (exact missing evidence or access) / WRITER UNIT READY (bounded implementation unit specified, not implemented). "More investigation needed" is not a terminal state unless genuinely BLOCKED.

## First units tonight (dependency order)

1. **P-1 artifact-parity proof** (read-only). Chain, each assertion separately: SOURCE -> BUILD ARTIFACT -> BOOTSTRAP -> REACHABILITY -> emit() -> canonicalization/identity -> INSERT ping_events -> durable commit -> readback -> IDENTITY -> RESTART -> downstream consumer -> ARTIFACT PARITY. One failed assertion falsifies the parity claim. Verdicts use the evidence states below.
2. **W-0 trigger protocol** (READ ONLY until P-1 establishes sufficient upstream truth; correction 3). H0 = 91e1337f4 did NOT disconnect the effective witness trigger; H1 = it changed reachable composition so the trigger ceased to execute. Establish BEFORE/AT/AFTER/CURRENT SOURCE/CURRENT BUILD/CURRENT LIVE. A removed import is not automatically an effective disconnection. Questions: who emits/consumes WITNESS_CREATED; consumer source/artifact/bootstrap/live reachability; retry -> second witness?; wall-clock in identity?; naked verified bypass?; EventGovernance validation?; event_type fallback changing meaning?; replay regenerating same witness?; omitted hash inputs?; truncated leaf?; algorithm version change? W-0 produces evidence only; if falsified, the coordinator authors the smallest W-1 writer unit. Treat the disconnect headline as INFERRED until this closes.
3. **W-1 attestation emission** (writer). Structural reliance on naked verified (establish what artifact Replay produces and Witness consumes; do not rename the boolean); wall-clock timestamp idempotence fix (retried WITNESS_CREATED must not mint a new event_id); EventGovernance schema enforcement for WITNESS_CREATED; close the event_type fallback semantics (the fabricated-witness-via-fallback route), not just the WITNESS_CREATE route; provenance checklist. Predecessor: W-0.
4. **W-2 replay kernel versioning** (writer). witness_algorithm_version + witness_input_schema_version; fail-closed truncation/skips in the provider; 12-leaf INTERIM INVARIANT (never destroy/rewrite/silently recompute existing 12-leaf roots; does NOT certify 12-leaf as canonical; do not invent an era). Predecessor: W-1.
5. **C-0 / T-0 / M-0 audits** (read-only, parallel). Converge to proposals; mutation assignments follow witness merge.
6. **O-0 SSH + ARM64 gates** (read-only probe first). Ladder walk follows: ARCHITECTURE_READY -> DEPLOYMENT_READY -> DEPLOYED -> RUNTIME_PROVEN -> RESTART_PROVEN -> REPLAY_PROVEN -> PERSISTENCE_PROVEN -> BACKUP_PROVEN -> RESTORE_PROVEN -> FAILURE_RECOVERY_PROVEN -> OBSERVABLE -> OPERABLE -> CONTINUITY_PROVEN -> BUSINESS_PATH_PROVEN. Provenance manifest mandatory (source SHA, branch/tag, build ID, image digest, arch, config version, schema/event/witness eras, deployment time, host, test/cert manifest; no secrets). Minimum-stack discipline: Postgres + gateway/runtime + required worker first; Temporal only when a real workflow is ready; Qdrant/Neo4j/ClickHouse/NATS/Ollama/Redis only on proven need.

## Merge law

Gate: authority semantics correct + focused tests green + relevant regression green + known failure cases exercised + no stronger conflicting implementation + diff bounded + identity semantics understood + dependency order correct + CROSS-LANE CONFLICT CHECK: did another lane discover evidence affecting this authority? Did HEAD move? Did the target implementation change? Does this create a second authority? Does this invalidate another lane's START SHA? Does the merged tree still satisfy the invariant? If any yes: REBASE THE EVIDENCE, NOT BLINDLY THE CODE, and re-run the relevant proof.

Then: COMMIT (bounded unit only) -> integration gate -> merged-state test -> coordinator push authorization (specific BRANCH + COMMIT SHA + REMOTE) -> push -> fetch/ls-remote -> verify remote SHA exactly. If remote SHA differs: STOP, do not repair history automatically. No lane pushes independently. No force push, no history rewrite, no broad reset/restore/clean. Public push is NOT automatic after a green unit. Coordinator is merge authority and push authority. Exception: oracle/deploy-2026-09-18 stays untouched without the operator's explicit word.

Commit law: only the bounded unit. Never git add -A / git add . / git reset / git clean / broad restore / force push / history rewrite. Preserve unrelated staged/unstaged work (modified CERTIFICATION.md, CONTRADICTIONS.md, evals repair, evidence/, tests/mc1-legacy-ingress/).

## Epistemics

Evidence states: DECLARED / INFERRED / SOURCE_VERIFIED / REACHABILITY_VERIFIED / LIVE_VERIFIED / FALSIFIED / BLOCKED, independent of severity P0-P3. Proof ladder: DECLARED -> EXISTENCE -> IMPORTABILITY -> REACHABILITY -> EXECUTION -> PERSISTENCE -> EVIDENCE -> REPLAY -> REPRODUCIBILITY -> CERTIFICATION. EFFECTIVE classes: PHANTOM / DORMANT / LEGACY_UNREACHABLE / EFFECTIVE. Epistemic rule: what is declared? observable? demonstrably effective? what evidence promotes it? Falsified premises (AcquisitionManager, ConstitutionalEventStore, EventRepository, IEventAuthority) are DISCARDED; every investigator reads the backlog's falsified-premises section before grepping.

SOURCE AUTHORITY != RUNTIME AUTHORITY. Every runtime claim tracks: SOURCE SHA + SOURCE PATH / BUILD INPUT SHA + BUILD/ARTIFACT ID / DEPLOYED ARTIFACT ID + DEPLOYED HOST / RUNTIME OBSERVATION + PERSISTED EVIDENCE. Never infer runtime-correct from source-correct. Artifact parity mandatory. A locally proven unit is not integration-proven.

## Guardrails (unchanged)

No destructive guessing. No secret disclosure (never print or read private key contents). No direct production database hacks. No fake certification. No test deletion to get green. No second authority. No shared-worktree collisions. No Pig reboot. HPP untouched. Public pushes only for proven converged work with remote SHA verification. Write aperture narrow: many parallel auditors, one writer per branch; multi-writer only after isolated workspaces, proposal artifacts, merge authority, replayable patches and deterministic promotion are certified.

## Events

Real only, through the certified authority path. Volume follows proof: 1 complete event, then 10, then 100, then sustained. Any path bypassing the certified Event Authority gets stopped and rewired.

## Dependency order (beats priority order)

Business priority never overrides dependency truth. No downstream mutation rests on unproven upstream authority.

1. P-1 Event Authority parity (12 assertions, read-only). The foundation everything else rests on.
2. W-0 witness trigger protocol (read-only until P-1 establishes sufficient upstream truth).
3. W-1 / W-2 writer units, authorized one at a time via writer authorization packet, only after W-0 evidence closes.
4. ContextPack, Temporal, Mission Control, Oracle forensics continue in parallel as read-only lanes; unrelated questions never block their evidence collection.
5. Approval/effect identity, crash-safe result rendezvous, ORCA durable objective/recovery, knowledge source/version graph + targeted invalidation follow in dependency order once the foundation is proven.
6. Oracle deployment walk (the ladder) begins only when the promotion gate has a certified SHA to build from and the install gate is satisfied.

## Parent/operator-owned (not staffed by this coordinator)

- Codex Desktop sandbox health check (one fresh minimal task against the WSL repo); reassign its lane on identical failure. Requires the parent's route.
- oracle/deploy-2026-09-18: untouched without explicit operator word.
- Stale 5-day agent b1e9b66f: out of session scope; outputs superseded.

## Standing rulings (operator, execution mode, 2026-09-18)

1. AUTHORITY CONFLICT ESCALATION (standing law): if investigation ever proves two components genuinely active AND semantically overlapping on one authority (not legacy/adapter/derived), the discovering agent STOPS and presents the conflict to the operator before choosing. Default is yes, always. This is the "genuinely distinct constitutional meanings" escalation lane. Note: the ConstitutionalEventStore-vs-EventRepository instance is MOOT; both are already classified (PHANTOM and LEGACY_UNREACHABLE respectively). The law stands for future cases.

2. RECORD vs FIX (phase-dependent): the "record it, don't fix it" rule belonged to the read-only phase. In execution mode: a discovering agent records a verified missing link as a LIVE_VERIFIED defect with its falsification evidence; it does NOT unilaterally patch it. The defect becomes a new execution unit that the coordinator scopes, staffs to the owning lane, and gates through the merge law. Note: the "AcquisitionManager creates events but nothing persists them" instance is MOOT; AcquisitionManager is PHANTOM/FALSIFIED.

3. REPO DOC WRITES: investigation findings accumulate ONLY in ~/workspace/forensics/ (evidence dir) and the goal's hidden_files. No investigation pass edits repo files directly, including OPERATING_SPEC.md or any doc in the PING repo. Repo mutations (code or docs) happen only through authorized execution units with proof packets, one writer per mutable unit.

4. SCOPE: after Event Authority artifact-parity (P-1) comes Witness (W-0 trigger protocol, then W-1/W-2). No deviation unless P-1 uncovers a more fundamental upstream authority conflict that would make Witness findings unreliable; that itself escalates under ruling 1.

## Operational note (2026-09-18, rogue-branch audit)

The rogue branch `feature/mission-control-truth` is the checked-out default in both Windows-side clones (`/mnt/c/Users/nolan/ping`, `/mnt/c/Users/nolan/PING`). Any agent working in a Windows clone must verify its branch before doing anything; the Pig worktrees are unaffected. Full audit: ~/workspace/forensics/recon-2026-09-19/recon-f-rogue-witness-audit.md.

## Falsification log

### Round 1 (2026-09-18, LANE-F, independent re-derivation from primary source)

1. **A3 (deployed artifact = certified revision): FALSIFIED.** Live container `unified_event_runtime.js` (md5 31d43523, 358 lines, old governance model, no identity_version) vs worktree (md5 a7abc593, 532 lines, IdentityAuthority + identity_version 2.0.0). Structural, not cosmetic. Old dual-emit EventBridge still required/started in the container. Consequence: LANE-P's proof is scoped to LOCAL_WORKTREE/LOCAL_BRANCH; any LIVE_RUNTIME parity claim is dead; the P0 promotion gate is confirmed blocking.
2. **Q3's decisive evidence ("worker authenticated by its canonical event_id"): FALSIFIED.** `WitnessWorker.handle` never authenticates its trigger against the canonical store; it reads `verified`/`witness_root` straight off the dispatch envelope. Consequence: W-1 cannot certify until the worker authenticates its trigger against the canonical store.
3. **Q4 terminal state ("PROVE ROUTE UNREACHABLE"): FALSIFIED.** The real route is unauthenticated `POST /missions` (gateway_runtime.js:812, no auth) -> MissionRuntime.create (zero missionType validation) -> scheduler poll -> `event_type: payload.event_type || mission.mission_type` fallback -> WorkerRuntime.dispatch -> WitnessWorker emits fabricated WITNESS_CREATED with attacker-chosen root. Full static trace verified. Consequence: Q4's work item is now "close the route" (auth on POST /missions, dispatch-time event_type/mission_type consistency, worker-side canonical authentication). This is a SECURITY finding, not a contract footnote. Plane split recorded: LIVE_RUNTIME runs the old connected trigger with the unverified bypass live; LOCAL_BRANCH is disconnected-but-forgeable. Reconcile before any witness rollout.
4. **H0 (trigger): FALSIFIED for branch HEAD.** H1 holds at HEAD: 91e1337f4 severed the previous effective trigger; no legitimate replacement. The "disconnected" headline is now SOURCE_VERIFIED at branch HEAD (two independent investigators agree); LIVE_RUNTIME state differs per (3).

Held: A1/A2 (cert commit shape; worktree file = certified revision), Q1 core (Option 4), Q2 core (Option D), each with recorded mishandled cases (attestation-label half-decision; re-attestation unrepresentable; Q2 portability and hash-authority-visibility gaps).

Harvest (mechanisms only, feeds P1): Restate awakeables for webhook-resumed approvals; Hatchet terminal-release idempotency keys + same-transaction ack; PG reaper heartbeat-with-locked_by guard; OTel span-links as the lineage edge model; JetStream two-sided exactly-once contract language.

### Round 2 (2026-09-18, LANE-F2, blind independent falsification of the Event Authority)

**"Exactly one effective Event Authority": FALSIFIED.** CanonicalEventEnvelope is a second EFFECTIVE event authority in the live runtime: live bootstrap `/app/gateway/bootstrap/gateway_runtime.js:480` instantiates, initializes, and mounts it at POST `/canonical-events` (`:794`) alongside UnifiedEventRuntime (`:513`, `/events` at `:790`). It mints its own IDs (deterministic UUID v5 from tenant/type/timestamp/sequence), runs its own per-tenant sequence, persists to its own table `canonical_events` (insert at `canonical_event_envelope.js:174`), serves its own reads. POST `/canonical-events` plus four live-mounted HPP authorities write through it, bypassing the event registry, governance, canonicalization, and IdentityAuthority. Headers make mutually exclusive claims ("Every event flows through here" vs "Every tenant emits events through this envelope"). The running EventBridge re-emits `canonical_events` rows through `UnifiedEventRuntime.emit()`, minting a NEW ID for one logical event (original survives only inside a mutated payload); same in the worktree's replacement adapter, by design. Coverage gap (live): HPP dotted event types (`review.flagged`, `project.created`, ...) absent from live `event_registry.json`; live emit has no registry exception, so the bridge rejects them forever and they never reach `ping_events` (persistence invisible to spine consumers). Deploy drift: live image (built 2026-09-16, source SHA unrecoverable, no labels) predates MC-1 convergence (2026-09-18); runs retired EventBridge, has no `legacy_ingress_adapter.js`; live emit honors boolean `_skipGovernance` the worktree closed, so live bridged events skip governance while direct events do not.

What held: UnifiedEventRuntime is the sole writer to `ping_events` (only non-test INSERT in live /app, exactly one live instance); EventRepository.appendEvent LEGACY_UNREACHABLE from the live bootstrap (`repository_events` table write-dormant); ConstitutionalEventStore and AcquisitionManager PHANTOM (zero code refs); IEventAuthority DORMANT; `append_orchestrator.js` DORMANT (present, unwired); no SQLite/filesystem/test-code authority in the boot chain.

Consequence: the claim holds only narrowed to **"ping_events has exactly one writer."** The worktree still wires the envelope as a live writer, so redeploying current source repairs the convergence mechanism but does NOT restore single-authority status. One item BLOCKED: live DB row counts (would require reading POSTGRES_PASSWORD; not authorized in this lane). Evidence: lane-f2-event-authority.md.

## Authority conflict packet: Event Authority (2026-09-18, from F2)

Two genuinely active, semantically overlapping components proven to own one authority (event emission / identity / persistence / reads):
- **A:** UnifiedEventRuntime -> PostgreSQL `ping_events` (certified source unit ce3f8687c5; sole writer to `ping_events` live).
- **B:** CanonicalEventEnvelope -> PostgreSQL `canonical_events` (live-mounted at POST `/canonical-events`; own ID scheme, own sequence, own table, own reads; bypasses registry/governance/canonicalization/IdentityAuthority).
- Competing truth, not specialization: mutually exclusive "every event flows through here" headers; two IDs minted for one logical event via the bridge; a coverage gap where live HPP event types can never reach `ping_events`.

**Status per the standing rule:** no Event-authority writer unit is authorized and none is active, so no writer lane freezes. W-1A (Witness authority, distinct) continues. Per the rule "if two genuinely active, semantically overlapping components are proven to own one authority, stop and present the conflict to Nolan before choosing": **the operator must resolve which authority owns event emission/identity going forward before any Event-authority writer unit, promotion, or convergence claim.** Added to the question queue as item 10. Independent read-only lanes continue.

Open: fabricated-witness route deserves a sandbox execution test in an isolated environment (authorized for LANE-W; never against production). LANE-P and LANE-W evidence files to be re-attacked on arrival.

## Writer authorization packet (required before any writer unit begins)

BROKEN ARROW / AUTHORITY OWNER / START SHA / BOUNDED FILE ALLOWLIST / INVARIANT / FAILURE TEST / EXPECTED FIX / REGRESSION SET / ROLLBACK. One writer owns that mutable authority; other lanes touching it stay read-only. A read-only agent never implements the repair; if a falsifying lane finds the broken arrow, the coordinator creates the bounded writer unit.

## Authority conflict: lane freeze, not program freeze (refines standing ruling 1)

If a writer lane hits a genuine authority conflict (two components genuinely active AND semantically overlapping on one authority, not legacy/adapter/derived), that lane FREEZES and sends a conflict packet to the coordinator. Independent read-only lanes continue. One ambiguous question never idles ContextPack, Temporal, Mission Control, Oracle forensics, or falsification.

## No fake progress

The following do NOT count without the next proof: file/class/interface exists; fixture passes; compose parses; container starts; endpoint returns 200; "agent says done". Do not demand CERTIFICATION from a unit whose job is only REACHABILITY. Promote evidence one rung at a time.

## Coordinator continuous loop

ASK -> DISPATCH -> RECEIVE EVIDENCE -> CHALLENGE -> CHOOSE -> AUTHORIZE ONE BOUNDED MUTATION -> PROVE -> INTEGRATE -> CONTINUE. Maintain the unanswered-question queue; questions never block unrelated evidence collection. Challenge every lane: what would falsify your conclusion? what is SOURCE-only vs LIVE? exact effective symbol? callers? artifact? SHA? restart? duplicate delivery? crash between side effect and ack? worker race? unreconstructible state? canonical vs derived? second authority? stale caller? generated-vs-source disagreement? what test would fail if you are wrong? what evidence can another lane independently falsify?

## Unanswered-question queue (seeded 2026-09-18)

1. Who installed Docker/Git on ping-core-01, and is the host state trusted? (O) — CLOSED 2026-09-18: all three installed 2026-09-15 03:56 UTC from official Ubuntu 24.04 apt packages (docker.io, docker-compose-v2, git). Docker provenance closed; Git provenance still open (who cloned what, where).
2. Source pin for Oracle build: which certified SHA? Blocked until the promotion gate produces one. (O)
3. Secrets delivery path for Postgres credentials. (O/operator) — OPEN; live /opt/ping/.env (0600) must not be reused by the certified path.
4. Pack-mandatory answering vs quarantine for the RAG bypass. (C/operator)
5. Drill D4 (Temporal server restart) authorization. (T/operator) — moot until real Temporal execution exists; Temporal classified DORMANT 2026-09-18.
6. Fabricated-witness sandbox execution test result. (W, authorized isolated)
7. Re-attestation representability under Option 4 (attestation-label half-decision). (W/F)
8. Codex Desktop sandbox health check. (parent-owned)
9. NEW 2026-09-18: Oracle host already runs a live compose project `oracle` (gateway, postgres:17-alpine, qdrant:v1.7.0, up 36-47h, config at /opt/ping/releases/bce92787.../ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml) from an earlier snapshot pipeline. It owns ports 8080/5432/6333, the volumes, and the project name. Deploying the certified stack needs an operator decision: retire the live stack after backup verification, or run the new stack on distinct ports/volumes/project name. (operator)
10. NEW 2026-09-18: F2 falsified "exactly one effective Event Authority." CanonicalEventEnvelope is a second EFFECTIVE event authority live (POST /canonical-events, own IDs, own sequence, own table canonical_events, bypasses registry/governance/canonicalization/IdentityAuthority). Two IDs for one logical event via the bridge; HPP dotted types can never reach ping_events live. Per the standing rule, the operator must resolve which authority owns event emission/identity before any Event-authority writer unit, promotion, or convergence claim. No Event-authority writer is authorized until then. (operator)

## Overnight execution order (operator-issued; cycle closes 2026-09-19 08:00 America/Denver)

Governing charter for the cycle. The 4 corrections below override the order's text where they conflict; everything else executes as written.

### Corrections applied before dispatch
1. **Section 17 hypotheses STALE.** The order lists as open: "ConstitutionalEventStore: SQLite persistence candidate, likely canonical storage authority" and "AcquisitionManager: creates events, persistence path not yet proven." Both were FALSIFIED tonight and are recorded in the backlog's falsified-premises section: AcquisitionManager = PHANTOM (zero executable-source hits), ConstitutionalEventStore = PHANTOM name (zero hits, CERTIFICATION.md only), EventRepository = LEGACY_UNREACHABLE, IEventAuthority = DORMANT (zero implementations). E-1..E-5 are NOT dispatched as live hypotheses. Re-scoped: E-1 (AcquisitionManager callers) and the ConstitutionalEventStore/EventRepository portions of E-2/E-3 CLOSED 2026-09-18 via P2's fresh reachability greps confirming the classifications. Investigative weight was and remains UnifiedEventRuntime -> PostgreSQL -> ping_events (P-1..P-12, complete). The order's sentence "These are hypotheses until source/runtime evidence closes them" is superseded: the evidence has closed them, subject only to cheap re-verification and F's independent falsification.
2. **Lane mapping (order codes -> board codes, recorded; no duplicate lanes).** Order P+E = board P (Event Authority artifact-parity). Order V+W = board W (Witness/Replay + writer units). One lane per authority either way; board codes kept.
3. **Section 16 is DECLARED, not verified.** "Identity Authority converged: gateway shim -> kernel IdentityAuthority" sits at evidence rung DECLARED (operator context), not as an established ruling. Treated as a hypothesis; do not assert as proven.
4. **Section 20 SSH "reportedly succeeded" is hearsay.** O re-verified independently: SSH REACHABLE (ubuntu@129.146.60.17, key auth, sudo NOPASSWD), 2026-09-18. No change to the no-install/no-deploy rule or the install gate.

### Cycle rules adopted (section 26 clarifications folded in)
- **BASELINE FREEZE:** the cycle baseline SHA is immutable once set. Evidence is never rewritten across SHAs; new evidence attaches to the SHA it was observed at.
- **NAMED RUNTIME:** no LIVE_VERIFIED claim without a named runtime. O and P must agree on the runtime identity (container name, image digest, host named explicitly).
- **W-0 UNLOCK SET:** P1/P3/P4/P5/P8 only. W-0 verdicts H1-H7; conditional W-1 charter: H1 -> W-1A (restore-trigger); H5 -> stop mutation; H6 -> no patch. Our W-0 (2026-09-18): H1 PROVEN at current source -> W-1A authorized, restore-trigger = proper trigger WITNESS_ATTEST.
- **WORKTREE PROVISIONING GATE:** `git worktree list --porcelain` before any writer start; dirty WIP preserved, never disturbed.
- **ORCA/COORDINATOR BOUNDARY:** coordination != domain authority. The coordinator sequences, gates, and integrates; it does not own domain semantics.
- **LANE-NAMESPACED EVIDENCE:** all evidence under lane-namespaced paths (convention already in force: lane-p2-*, lane-f2-*, w0-*, w1-*, lane-o2-*, lane-c2-*, lane-t2-*, lane-m-*).
- **INTEGRATION GATE V1:** published before the first writer commit (see below); sent to the W-1A writer 2026-09-18.
- **PRE-EXISTING-RED POLICY:** run the regression set on the unmodified START SHA first and record baseline reds. The unit is not blamed for identical baseline reds.
- **MERGED-STATE LAW:** certification belongs to the merged SHA. A branch commit is never certified; integration testing on the merged tree precedes any certification claim.
- **APOCALYPSE INTERRUPTS:** only apocalypse-class interrupts (list A-I) before 08:00; everything else waits for the cycle report.
- **FREEZE:** no new writer starts before close; no rushed 07:59 commits. A unit not proven by close is carried, not rushed.
- **CYCLE CLOSE:** final report once, in the section 36 format, at 2026-09-19 08:00 America/Denver.

### Integration Gate V1 (published 2026-09-18, before first writer commit)
The W-1A writer commits only when ALL hold:
1. START SHA verified (84da2d40c); `git worktree list --porcelain` clean of unrelated changes; dirty WIP preserved.
2. Only allowlisted files staged; the commit contains the bounded unit and nothing else (never `git add -A` / `git add .`).
3. Failure tests demonstrated fail-before (unmodified tree) and pass-after.
4. Regression set run on the unmodified START SHA first (baseline reds recorded); green after, modulo identical baseline reds (pre-existing-red policy).
5. No second authority created; invariant holds; 12-leaf roots untouched; no invented principal.
6. Proof packet complete: OBJECTIVE / START SHA / FILES / INVARIANT / IMPLEMENTATION / TESTS / ADVERSARIAL TEST / COMMIT SHA / WHAT WAS FALSIFIED / NEXT BROKEN ARROW; MERGE SHA / PUSH STATUS / RUNTIME STATUS = none / not deployed.
7. Promotion constraint stated: no live rollout until the three-pipeline split is reconciled; implementation assumes nothing about the live trigger topology.
If any item fails: no commit. Report the failure instead of forcing green.

### E-1..E-5 disposition (per correction 1)
- E-1 (AcquisitionManager callers): CLOSED 2026-09-18. Fresh grep, zero executable-source hits. PHANTOM confirmed.
- E-2/E-3 ConstitutionalEventStore portions: CLOSED 2026-09-18. Fresh grep, zero hits. PHANTOM name confirmed.
- E-2/E-3 EventRepository portions: CLOSED 2026-09-18. Fresh reachability grep. LEGACY_UNREACHABLE confirmed.
- Investigative weight: UnifiedEventRuntime -> PostgreSQL -> ping_events. P-1..P-12 complete 2026-09-18 (lane-p2-assertions.md). Terminal state FALSIFIED on artifact parity; broken arrow = certified -> running promotion gate; next writer unit = reproducible build from ce3f8687c5 with SHA in image labels + redeploy + verify BOOTED == cert blob (NOT authorized; awaits the operator's Oracle coexistence decision and upstream certification clearance).

### Cycle state at adoption (2026-09-18 19:28 MDT)
- Complete: P2, C2, T2, O2, M, W-0 (all evidence lane-namespaced under recon-2026-09-19/).
- Running: F2 (blind Event Authority falsification), W-1A writer (dispatched, Integration Gate V1 sent).
- Queued behind W-1A (same branch): ContextPack writer unit (land I2 + versioning + invalidation + RAG bypass as first-class). NOT started (freeze + dependency order).
- Blocked on operator: Oracle coexistence decision (live `oracle` compose project owns ports/volumes/name); secrets delivery path; promotion-gate source SHA (dirty tree, tree-sitter/temporal remediations unapplied).

### W-1A completed and independently verified (2026-09-18 19:41 MDT)
- Commit 98ef51c9cd8f96e115374e81b65f049b38b62469 on constitutional-convergence-v2, parent 84da2d40c (authorized START SHA). Verified: HEAD SHA, parent SHA, branch, exactly the 5 allowlisted files (gateway/routes/missions.js, ping-runtime/events/event_governance.js, ping-runtime/orchestration/event_to_mission_bridge.js, ping-runtime/orchestration/mission_scheduler.js, ping-runtime/workers/canonical_workers.js), unrelated WIP preserved (M CERTIFICATION.md, M CONTRADICTIONS.md, M EVAL-006 repair, ?? evidence/, ?? tests/mc1-legacy-ingress/). main untouched at 5b102c66425a346bd3074df0822b5bed184d13ba. No merge, no push, not deployed.
- Proof packet: w1-writer-packet.md. Invariant harness: w1a-invariant-harness.js (kept out of the repo). Fail-before 3 pass/15 fail -> pass-after 18/18; regressions match baseline exactly (baseline recorded on unmodified tree per pre-existing-red policy).
- Baseline anomaly noted for the cycle report: sequence/replay harness baseline was 70 pass / 0 fail / 1 blocked vs the certified 73/73. Covered by pre-existing-red policy (unit not blamed for identical baseline reds), but the 1 blocked test must be identified.
- Documented bounded seam: direct invocation with no attestation source and no mission metadata preserves the pre-W-1A envelope contract so EVAL-010 stays green as written; any mission-pipeline dispatch without a source fails closed.
- Promotion constraints in the packet: no live rollout until (1) the three-pipeline witness split is reconciled AND (2) the operator resolves the Event-authority conflict (question 10). Unit stays inside F2's narrowed holding scope (ping_events has exactly one writer); envelope untouched.
- **Merge decision: NOT merged to main tonight.** Per merged-state law, certification belongs to the merged SHA after integration testing on the merged tree; per the conflict rule, the Event-authority question (item 10) is unresolved and the unit's own promotion constraints reference it. The commit sits on constitutional-convergence-v2. Merge to main is an operator decision, recommended for cycle close alongside question 10.
- Next broken arrow (from the packet): W-2 witness versioning (honest kernel engine + leaf-count binding) and replay-provider silent-truncation fail-closed. Both outside the W-1A allowlist. NOT started (freeze + promotion constraints).
