# W5 convergence decisions — Agent 12 observability + recovery inputs resolved

**Worker:** W5 (constitutional-sprint wave) · **Mode:** READ-ONLY; COMMITS CREATED: NONE; no live-runtime mutations, no patches applied · **Date:** 2026-09-24 ~05:20 MDT · **CWD:** `~/workspace/constitutional-sprint/`
**Scope:** resolves the five Agent 12 convergence inputs (OBSERVABILITY-RECOVERY.md §5 "Convergence-wave inputs") as decisions at 80%+ confidence. New file; FINDINGS-LOG.md and OBSERVABILITY-RECOVERY.md are NOT edited. New IDs F290–F299 used only here.
**Consumed IDs (dedupe):** F230 (dump.py diff + max-age proposal), F232–F241 (Agent 12's ten findings), plus F204/F63/F208 (journal durability, WAL, possession-based auth), F138 (noise vectors), F172 (echo loop), F69 (no DLQ route), F110/F124 (fresh-timestamp echo, unauthenticated POST). OBS1 P-T1 from `fleet/observability/obs1-mission-trace.md` (§P-T1, T1).

---

## D1 — Recovery owner [F290]

**F290 — RECOVERY AUTHORITY named: Nolan Geske (constitutional operator) owns all recovery decisions end-to-end; the machine keeps execution only under his explicit authorization [GOVERNANCE/RECOVERY] [P1]**

- WHY: Recovery decisions are currently UNOWNED (Agent 12 §3 U-1/U-2/U-3; Agent 20 map rows 19/20): no pg_dump schedule, archive_mode=off, RPO unbounded since 2026-09-16 (F204/F63); destructive recovery is possession-based — Pig SSH/docker = root of recovery, no gate, no role, no audit (F208); vector recovery has no re-embed path (F138); durable execution checkpoints reference a phantom authority (F235); DLQ replay is an undecided question (F234). These are not mechanisms to build; they are DECISIONS with no declared decision point.
- EVIDENCE: OBSERVABILITY-RECOVERY.md §3 UNOWNED inventory; GLOBAL-AUTHORITY-MAP.md rows 19/20 ("still UNOWNED; gap persists", §6 #11 expected Agent 12 to name the owner — this is that naming); SOUL.md §6 (one authoritative owner per architectural concern); Nolan's standing decision rule (destructive/irreversible operations come to him first; ALIGNMENT_SYNTHESIS.md); the standing authority law already routes system-governance decisions to Nolan as constitutional operator.
- DECISION: **Nolan Geske is named the Recovery Authority.** One-authority-per-decision justification: destructive recovery is destructive/irreversible by definition, and Nolan's standing rule already reserves destructive/irreversible decisions to him — naming a NEW code authority would create a second governance surface that itself needs authorization rules (violating the law's intent). The code slot already exists: `MissionExecutionAuthority`'s constructor accepts `checkpointAuthority` (F235) — the Recovery Authority is the named owner of that interface's POLICY when the mission lane is revived. The machine keeps EXECUTION (dump.py runs, backups run on the authorized schedule, DLQ rows accumulate); the owner keeps DECISION (authorize the schedule, authorize destructive restores, authorize DLQ replays, set RPO/RTO targets, approve the re-embed rebuild run). Mechanism ownership stays with the mechanism lanes — this is legitimate consumer/owner separation, not a competing authority.
- What is currently UNOWNED and now moves under them:
  - **Journal durability (U-1):** pg_dump schedule, WAL archiving (archive_mode=off), volume snapshot policy, RPO/RTO targets for `brain-postgres`/`ping_runtime` (re-anchored per W20-F2/F203 — not the old `ping-postgres` label).
  - **Destructive recovery authorization (U-2):** any restore/delete/rewrite requires the owner's explicit word + an audit row; possession-based access (F208) is no longer an acceptable decision path.
  - **Vector recovery (U-3):** the re-embed/rebuild job's recovery-decision wrapper (when to run, what snapshots to keep) — the mechanism itself belongs to the semantic lane (Agent 14 → Agent 04 canonical_hash + re-embed + rebuild handoff, W20-F4).
  - **Durable execution checkpoints (F235):** checkpoint policy (what counts as durable, retention) once the phantom module is decided.
  - **DLQ replay policy (F234):** authorization for the F292 escape hatch.
- PROOF-NEEDED: (1) the owner acknowledges the RPO/RTO targets and the backup schedule; (2) first authorized destructive-class operation is executed through the named gate with an audit row; (3) the checkpointAuthority slot is either implemented under this authority or the interface is deleted (F235 resolution).
- Confidence: **85%**. Nothing in this decision invents a new machine authority; it names the existing human decision point the standing rules already reserve.

---

## D2 — OBS1 P-T1 echo-loop fix direction [F291]

**F291 — ADOPT OBS1 P-T1 (dispatch only to the assigned worker) as the echo-loop fix direction, with kill-plan-first sequencing [MISSION/EXECUTION] [P0]**

- WHY: The mission echo loop is CONFIRMED UNBOUNDED via the dispatch-on-original-event-type contract (F172): every `REPLAY_VERIFY` mission re-runs the projection worker via `event_type` re-matching, and the projection worker's output re-mints the mission; fresh timestamps defeat the ON CONFLICT content-hash dedupe (F110). Ignitable by a single unauthenticated POST /missions (F124/F172, F243). It also poisons observability — inflated completed counts look like healthy throughput (OBS1 T1). W1 is designing the kill plan; this decision is the policy recommendation.
- EVIDENCE: `fleet/observability/obs1-mission-trace.md` P-T1 (mission_scheduler.js:24-32, :255; worker_runtime.js:97; canonical_workers.js:182, :708-709; event_to_mission_bridge.js:52; unified_event_runtime.js:80-83); F172 status "PROVEN mechanism (code)"; OBS3's proposed fix (remove self-subscription) was REFUTED — the registration it targets no longer exists — so P-T1 supersedes OBS3-P1; the alternative "do nothing" leaves the only confirmed-unbounded growth mechanism live with a remote trigger (S5-F1 unauthenticated POST).
- DECISION: **ADOPT.** In `MissionScheduler._dispatch`, dispatch the built event ONLY to the assigned worker (`workerName` from `MISSION_WORKER_MAP`); `event_type` on the dispatch event becomes data, not a routing broadcast. Invariant recorded in the [DOC-CONTRACT] comment: *a mission executes exactly its assigned worker.*
- Sequencing (binding, because the test itself ignites the loop): (1) route through Agent 20 FIRST — P-T1 touches the `[DOC-CONTRACT]` convergence-ledger entry (docs/P3_CONTRADICTION_CONVERGENCE_LEDGER.md audit A), per OBS1's open question; (2) W1's kill plan STAGED before any live test; (3) P-T1 applied; (4) run OBS1's proposed tests: synthetic `REPLAY_VERIFY` mission asserts only the replay worker ran and no `PROJECTION_CREATED` was emitted; bounded chain test asserts `ping_missions` returns to quiescent. **Never run the live-fire drill without (2) staged, and never apply P-T1 without (1) ruled.**
- PROOF-NEEDED: both OBS1 tests pass post-application; the drill's bounded-chain assertion holds; kill plan exists as a staged artifact even if never fired.
- Confidence: **90%**. The rejected alternative (OBS3-P1) is proven-not-to-fix; the adopt direction preserves the legitimate `PROJECTION_CREATE` initial-mission path that the alternative would break.

---

## D3 — DLQ replay arrow [F292]

**F292 — DLQ declared TERMINAL-BY-DESIGN; replay stays dormant machinery, wired only as a destructive-class operation requiring Recovery Authority authorization; an authorized replay mints a NEW mission, never re-dispatches the failed one [RECOVERY] [P2]**

- WHY: The DLQ is currently a terminal sink by accident (F234: `replayDeadLetter` zero live callers, no HTTP route per F69). The three options are: replay-into-pipeline with fencing, replay-as-audit-only, keep-terminal-with-explicit-policy. The decision must respect failure semantics: a dead letter means the mission failed 3 attempts with 5s backoff (OBS1 Q6) — re-injecting it unchanged is a retry-budget bypass of the class already violated by the reaper lease-resets (F174); and until P-T1 is applied (F291), re-dispatching a mission into the dispatch-re-match pipeline risks re-fueling unbounded growth.
- EVIDENCE: F234 PROVEN (code: grep finds only the definition site in dead_letter_authority.js); F69 (no HTTP route replays); 0 rows live (OBS1 Q6); per-attempt errors overwritten last-wins (M1 audit), so the DLQ row's failure_reason is the only durable error evidence; `MISSION_*` events are correlation-orphans (F238), so a replayed mission re-enters an unjoinable trace — provenance must be explicit on the new mission, not assumed.
- DECISION: **Keep-terminal-with-explicit-policy**, where the explicit policy is: (a) DLQ rows are the terminal durable state of a poisoned mission — "recovered" is not a lifecycle transition of the failed mission; (b) `replayDeadLetter` stays DORMANT machinery but is declared dormant-BY-DESIGN, not accidentally-unwired; (c) the only exit is an AUTHORIZED REPLAY as a destructive-class operation under F290's Recovery Authority (per-instance authorization, audit row); (d) an authorized replay MUST mint a new mission id with explicit `replay:{deadLetterId, authorizedBy, reason}` provenance and a FRESH retry budget — never re-dispatch the failed mission id (this is the fence: it also answers the send-eligibility precedence concern — structured state said FAILED; the new mission is a new decision, not a resurrection).
- Rejected: replay-into-pipeline with fencing as the DEFAULT arrow (rejected: replays without changed input are budget-bypass; unauthenticated wiring would be a new remote fuel path); replay-as-audit-only pure form (rejected: discards a legitimate recovery option; the F208 possession-based reality means someone will hand-run it anyway — better a named gate than an unowned escape).
- PROOF-NEEDED: policy recorded in the recovery/operations docs (replaces the accidental-sink status); DLQ list endpoint documents terminal semantics; any future replay path requires the authorization gate — zero unauthorized replays observable in the journal.
- Confidence: **82%**. Borderline because the authorized-replay mechanics are specified but the gate itself is unbuilt (depends on F290's acknowledgment).

---

## D4 — dump.py provenance remediation (propose-only) [F293]

**F293 — PROPOSAL: pin dump.py provenance, schedule regen on the Pig, and bound staleness with maxAgeSeconds=86400 (24h); read seam exposes stale:true as a signal [RECOVERY/PROVENANCE] [P1]**

- WHY: The one PROVEN recovery mechanism (R-1) is dirty in git since 2026-09-21, manual-only (no cron on Pig WSL, no Task Scheduler evidence), and last ran 2026-09-22 14:50 UTC (~48h stale at probe time) (F236). Max-age bound is NONE and the reader verifies digest but not age, so overlay staleness is invisible to the public page (F230/F240). F230's proposal is NOT APPLIED.
- EVIDENCE: F236 PROVEN (infra: git status, stat, ls -lt var/fyd-projections/, empty crontab); F230 (dumperVersion 1.1.0 on live outputs = the uncommitted +87/-9 diff produced them; SITES cfg has no age bound; read seam `getPingObjectGraph` verifies digest not age); F281; journal quiescent (F237, last write 2026-09-23 23:24 UTC) — staleness hurts less today, but the property is missing either way.
- DECISION (propose-only, no live changes): (1) **Provenance:** COMMIT the +87/-9 diff (F230 judged it a coherent presentation-intent layer with fail-closed validation), never revert it — live projections were already produced by this code, so reverting would make provenance WORSE (no committed source would match the live outputs). From that commit onward, every dump writes its git sha into `meta.dumperGitSha` alongside `dumperVersion` and `dumpedAt`. (2) **Cadence:** Pig WSL cron every 6h, with a journal-head idempotency guard (skip write when the journal head is unchanged since last dump — the journal is quiescent, so most runs are no-ops; bounded cost). (3) **Stale signal:** adopt F230's proposal — `maxAgeSeconds` in SITES cfg → `meta.maxAgeSeconds` on dump; the read seam exposes `stale:true` when `now - dumpedAt > maxAgeSeconds`. Signal, not trigger; no cron on the read side.
- **Staleness bound: 86400s (24h).** Rationale: 4x the 6h dump cadence (tolerates 3 consecutive missed runs before flagging); strictly under the ~48h staleness actually observed, so it would have tripped on the live evidence; the journal is quiescent so a 24h bound on a 6h cadence is cheap signal, not noise. A tighter bound (12h) would flag on a single missed overnight run; looser (48h) would bless the exact staleness we just found unacceptable.
- PROOF-NEEDED: (1) the diff is committed and live `dumperVersion`/`dumperGitSha` match a committed commit; (2) one cron-fired regen observed with the idempotency guard; (3) `stale:true` surfaces correctly on an artificially aged projection (synthetic test, no live journal write needed).
- Confidence: **85%**. The 24h bound is the only judgment call; the rest follows directly from the evidence.

---

## D5 — /health worker-pipeline addition (propose-only) [F294]

**F294 — PROPOSAL: register five pipeline checks on the existing /health (keep the 8); gateway reports "healthy" only when no check is DOWN [OBSERVABILITY] [P1]**

- WHY: Live `:8080/health` returns `"status":"healthy"` (uptime ~150475s) while covering NONE of MissionScheduler, WorkerRuntime, EventBridge, EventToMissionBridge, DeadLetterAuthority (F233, gateway_runtime.js:726-759) — false health certainty. T-G classification: THEATER.
- EVIDENCE: F233 PROVEN (live HTTP + code); session-scoped counters are the only pipeline visibility and die on restart (S-1..S-5), so health must read DURABLE state, not the in-memory `_stats`.
- DECISION (propose-only; exact shape):
  - Keep the 8 existing checks untouched (no regression surface).
  - Add five `registerHealthCheck` entries reading durable/session-bridged state:
    1. **scheduler:** `ping_missions` counts in `pending`/`retry_pending`; last-dispatch age; in-flight set size (`MissionScheduler._processing`, exposed read-only).
    2. **workers:** per-worker last-heartbeat age; per-worker consecutive-failure count.
    3. **bridge:** bridge cursor lag — last-consumed event timestamp vs `ping_events` head; in-memory error counter surfaced with a restart marker.
    4. **event-mission-bridge:** mapping misses since restart; last bridge-run age.
    5. **dead-letters:** unreviewed `repository_dead_letters` count.
  - Each check reports `ok | degraded | down` with thresholds; the endpoint aggregates: any `down` → status != "healthy".
  - Proposed thresholds (tunable, not verdicts): worker heartbeat stale > 300s → degraded; bridge lag > 600s → degraded; scheduler `pending` depth > 100 → degraded; unreviewed DLQ > 0 → **degraded** (never down — the DLQ is terminal-by-design per F292, backlog is operational, not a health failure); last dispatch age > 3600s while pending > 0 → down.
- PROOF-NEEDED: endpoint returns the five checks live; a synthetic stopped-scheduler state flips the aggregate status (test on a non-live instance; never intentionally degrade the live pipeline for the test).
- Confidence: **85%**. The shape follows the one-authority-per-decision law by making the gap VISIBLE rather than declaring a new authority.

---

## Generic-class entries (failures as classes)

**F295 — GENERIC CLASS G1: DORMANT-AS-PROVEN — recovery machinery that exists but has zero callers, counted as coverage [RECOVERY] [P2]**
- WHY: The inventory (Agent 12 §3 DORMANT) shows the pattern repeats: `replayDeadLetter` (F234), `backup_postgres.ps1`, `projection_replay.py`/`replay_worker.py`, `MissionEventBus`, the vestigial queue protocol (T-4, zero consumers). Each is "documented as the recovery story" for its domain while having zero live invocations.
- EVIDENCE: Pig grep (zero callers), 0 live DLQ rows, no cron/Task Scheduler evidence, compose `profiles: [dev]` with no container running.
- DECISION: classify, do not delete (per the lane rule); every DORMANT item gets an explicit label — dormant-BY-DESIGN (F292's replayDeadLetter) or dormant-UNWIRED (backup plan) — and unwired items stop being cited as recovery coverage.
- PROOF-NEEDED: an inventory sweep can re-derive the caller count for any listed item and reproduce the classification.
- Confidence: **95%**.

**F296 — GENERIC CLASS G2: THEATER-HEALTH — health endpoints that certify surfaces they do not probe [OBSERVABILITY] [P1]**
- WHY: `/health` "healthy" omits the pipeline (F233/T-G); `MissionControlHeader` hardcodes healthy + `Math.random()` metrics (T-H). The class is: a health surface whose checks are disjoint from the components whose failure matters.
- EVIDENCE: gateway_runtime.js:726-759 (8 checks, none on the pipeline); live :8080 read 2026-09-24.
- DECISION: F294's proposal is the class-level fix template; no new health surface may be added without naming the components it actually probes.
- PROOF-NEEDED: for any health endpoint, the check-to-component mapping is enumerable from the registration site.
- Confidence: **95%**.

**F297 — GENERIC CLASS G3: PHANTOM-AUTHORITY — constructor/declaration references an authority module that does not exist on disk [GOVERNANCE] [P2]**
- WHY: `MissionExecutionAuthority` accepts `checkpointAuthority` (mission_execution_authority.js:36-43); no `checkpoint_authority.js` exists anywhere under `gateway/` or `ping-runtime/` (F235/T-I). The pipeline "has a checkpoint step" that can never resolve.
- EVIDENCE: Pig grep for the module (absent); 0 rows ever persisted.
- DECISION: the Recovery Authority (F290) owns the resolution: implement the interface under this authority's policy, or delete the constructor parameter and the `checkpoint_id` column reference. Phantom references may not survive convergence.
- PROOF-NEEDED: grep over the tree shows either the module present or the reference gone.
- Confidence: **95%**.

**F298 — GENERIC CLASS G4: UNOWNED-AUTHORIZATION — destructive paths gated by possession instead of decision [SECURITY/GOVERNANCE] [P1]**
- WHY: F208: anyone with Pig SSH/docker can restore/delete/rewrite — no gate, no role, no confirmation, no audit. `destructive_recovery_certification.py` (D-2) deletes ALL Qdrant collections with no prompt and has never run — one careless run from catastrophe.
- EVIDENCE: RECOVERY.md §2; D-2 evidence line; F206.
- DECISION: F290's Recovery Authority is the decision point; until the gate is built, D-2-class scripts get an explicit confirmation prompt as the minimum mitigation (propose-only; the owner authorizes the gate design).
- PROOF-NEEDED: no destructive-class path is executable without an authorization record naming the owner.
- Confidence: **90%**.

**F299 — GENERIC CLASS G5: VOLATILE-OPERATIONS — session-scoped operational state on a system that claims durable lifecycle answerability [OBSERVABILITY] [P2]**
- WHY: Every "what's happening now" surface is session-scoped (S-1..S-5): scheduler/worker/bridge counters, the in-flight set, per-worker stats, bridge error counters — all wiped on restart. Lifecycle questions spanning a restart boundary can only be answered from tables (Agent 12 §2a).
- EVIDENCE: obs1 Q5; obs3 row table; "scope:'session'" in the /mc routes.
- DECISION: F294's health proposal reads durable state precisely to avoid certifying volatile counters; longer-term, the bridge error counter and in-flight set get durable homes or documented-volatile labels. The class rule: any operational surface that resets on restart must be labeled session-scoped at the read site.
- PROOF-NEEDED: each /mc read route documents whether its state survives restart.
- Confidence: **90%**.

---

## Cross-decision consistency check

- F290 → F292: the DLQ escape hatch's authorizer is the named Recovery Authority. No second authorization surface.
- F291 → F292: replay authorization is safe only after P-T1 is applied — replaying into the echo-prone pipeline today would re-fuel it. Sequencing dependency recorded.
- F290 → F293/F294: both are propose-only; the owner authorizes the schedule and the health thresholds.
- F295–F299 do not compete with any existing finding; they name the classes the findings instantiate. Deduped against: F230 (→F293), F232 (closed, cited), F233 (→F294/F296), F234 (→F292/F295), F235 (→F290/F297), F236 (→F293), F237 (info, cited in F293), F238 (cited in F292), F239 (cited), F240 (→F293), F241 (F290 owns the decision wrapper; mechanism handoff to the semantic lane).

## Questions genuinely needing Nolan

**None.** All five decisions clear the 80% bar:
- D1 (85%): naming Nolan follows directly from his standing destructive-decision rule; no new authority is invented.
- D2 (90%): P-T1 is the only fix whose target mechanism still exists; sequencing with W1's kill plan and Agent 20's DOC-CONTRACT ruling is specified.
- D3 (82%): terminal-by-design with an authorized escape hatch; the rejected options are documented with reasons. The 18 points of uncertainty are the unbuilt gate, which F290 assigns.
- D4 (85%): the 24h bound is reasoned (4x cadence, under the observed 48h staleness); the rest is evidence-forced.
- D5 (85%): shape reads durable state; thresholds are explicitly tunable.

Open items for the coordinator (not Nolan): (1) Agent 20 ruling on the [DOC-CONTRACT] touch before P-T1 is tested (F291 seq-1); (2) W1 kill-plan staging before any live-fire drill (F291 seq-2); (3) the convergence wave's commit-vs-revert ruling on dump.py's dirty diff — this file recommends COMMIT (F293) because live outputs already came from the uncommitted code.
