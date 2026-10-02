# MarketingOS Archaeology Synthesis (reader/falsifier deliverable, 2026-09-30)

Per owner decision Q19. Not a new audit. Compression of the 2026-09-30 forensic investigation
(`workspace/forensics/ping-intelligence-convergence-2026-09-30/`, seven reports), the deployment-convergence
program results, the Mission Control writer's ecosystem lens, and independent second-eyes verification.
The 18-arrow walkthrough found only bounded vocabulary, label, approval-record, acquisition-producer, and
analysis-behavior gaps. No missing foundational store or authority was found. MarketingOS rides the existing
event writer, identity path, ClaimWorker, MissionRuntime, KnowledgePromoter, mission store, knowledge graph,
and semantic projections.

Convergence rule (frozen): MarketingOS is not a fifth system. It is an intelligence loop projected from
PING's existing truth, mission, knowledge, evidence, and execution machinery.

Spine under test:

```text
OBSERVE -> EVIDENCE -> CLAIM -> KNOWLEDGE -> OPPORTUNITY -> MISSION
-> AUTHORIZATION -> WORKER -> VERIFIED EFFECT -> OUTCOME
-> LEARNING -> NEXT MISSION
```

Durable homes: `ping_events`, `ping_missions`, `knowledge_nodes` / `knowledge_edges`, Qdrant.

## 1. REACHED SPINE (proven working end-to-end, with evidence)

- **Event writer -> journal.** Pig plane live: `brain-postgres / ping_runtime.ping_events`, 2580 rows after the
  real mission. Append-only in practice. SELECT-only read paths proven (`default_transaction_read_only=on`,
  journal unchanged at 2580 across the MC verification battery).
- **Mission lifecycle.** `createLabeledMission(INTELLIGENCE_RESEARCH)` -> assign -> start -> complete, tenant-scoped
  (`ping-ops`). Mission `78c88729ceb51f38` completed 2026-09-30; lifecycle events `MISSION_CREATED / ASSIGNED /
  STARTED / COMPLETED` with `payload.missionId` linkage. `getTrace` resolves via correlation with missionId fallback.
- **Observation -> Claim -> Verdict.** 3 `OBSERVATION_CREATED`, 4 `CLAIM_CREATED` (3 CONFIRMED, 1 UNCLEAR) via the
  verdict vocabulary. Causation chain observation -> MISSION_CREATED, claim -> observation.
- **Compounding.** ClaimMissionChainer saw 4 claims, skipped 3 settled, reified the UNCLEAR claim into follow-up
  mission `3b0f430a06a41357` (INTELLIGENCE_RESEARCH, created, `causation_id` = the UNCLEAR claim event).
  The UNCLEAR -> NEXT MISSION arrow fires.
- **Contradiction analysis present.** ContradictionDetector saw 4 claims, surfaced 0. Present on the stream;
  adversarial proof pending (delta 2).
- **Read-only Mission Control projection.** Served `:3100` (ping-fyd-converged, `next-server`, owner nolan)
  projects the live journal: `GET /api/mc/marketingos`, `GET /api/mc/marketingos/missions`, MARKETING tab.
  Second-eyes verification 2026-09-30: wrong tenant -> 403 `cross_tenant_denied`; unknown mission -> 404;
  malformed id -> 400; injection-shaped id -> 400 `invalid_mission_id`. Deployment renders
  UNKNOWN / `SOURCE_TO_SERVED_CHAIN_NOT_CERTIFIED`, never hidden. Audience/opportunity/learning render
  NOT_STARTED with machine-readable reasons, never mocked. The UNCLEAR claim renders UNCLEAR, never green.
  Claim evidence renders as claim-attached support, never promoted to verified.
- **Tenant gate.** Same `x-mc-tenant` discipline as the sibling MC routes; operator view unchanged without the header.
- **Honest empty state.** No `mission_id` returns the contract section 5 shape byte-for-byte, with no journal
  access at all. Fail-closed: journal unreachable -> 503, never an invented empty state.

## 2. UNWIRED GOLD (proven to exist, not yet connected)

- **ContradictionDetector adversarial proof.** The detector is present and sees the stream, but `0 contradictions /
  4 claims` is neither PASS nor FAIL until two materially conflicting claims are proven to surface. (Owner Q12.)
- **Kernel Evidence verification path.** The archaeology found a real EvidenceAuthority verification path. It is
  unwired; the MC view renders `claim.evidence` only. Per owner Q14 the two states stay separate:
  CLAIM-SUPPLIED SUPPORT vs VERIFIED EVIDENCE.
- **Follow-up mission `3b0f430a06a41357`.** Created, UNCLAIMED. The compounding loop's next step is staged but not
  flowing. Claiming it via the existing research-capable WorkerRuntime path is the highest-value test available
  (owner Q9/Q10). The UNCLEAR input it reifies is now potentially resolvable: the rendering half it waited on
  has since been proven by the 8/8 served-route battery.
- **Acquisition producer.** Merged into `deploy/interval10-forensics-20260930 @ 67da6aab1`, pushed nowhere,
  served nowhere. `/ingest` remains an open door production has not proven it walks through. The scheduled
  Page-insights run (Thu 2026-10-01 08:21 MDT) answers the presence question under a strict observe-don't-rescue
  truth table (owner Q7/Q8).
- **`:3100` restart coverage.** None found: no systemd unit, no pm2, no cron; process launched via
  `sh -c next start -p 3100`. Same operational gap that killed `:18200`. Small runtime-ops delta, not a new
  supervisor framework (owner Q17).

## 3. DUPLICATION TO KILL

- **Oracle as parallel canonical journal.** RETIRED as a writer per owner decisions 2026-09-30: semantic before
  destructive. Stop canonical writes, remove routing/service-discovery eligibility, mark RETIRED / READ-ONLY /
  FORENSIC, prove no canonical caller reaches it, keep the evidence. Final retirement record (sequence, count,
  digests, schema/build identity, observation time, last writer, reason, snapshot location) goes in existing
  canonical operational evidence, never a new database. Note 2026-09-30 ~13:05: the coordinator stopped and
  renamed the Oracle gateway; owner authority supersedes toward observable READ-ONLY, correction in flight.
- **Approval vocabulary drift.** Contract prose says `ACTION_REJECTED`; forensics-fix record and live readback
  say `REJECTED`. Recorded as falsification input F1; one evidence-based contract revision after deployment
  truth and the remaining flags close. No serial edits.
- **Tenant-per-feature temptation.** Decided (owner Q28): keep `ping-ops` for the second mission. Tenant =
  ownership/isolation/security semantics, not feature organization. A mission type is not a tenant.
- **Second MC registry / sibling dashboard / parallel projection.** Forbidden by the projection contract section 8.
  One projection surface, never a canonical authority.

## 4. UNSAFE (must stay fenced)

- **Unmanned `/ingest` seam.** The archaeology established `/ingest` existed with zero production callers. Until
  the producer is served and observed, merged source is not acquisition capability. The hostile battery
  (`acquire-url.ts`: one real permitted URL -> bounded artifact/observation; redirects, private-address pivots,
  unsafe schemes fail closed) stays with the acquisition/PING coordinator, queued behind deployment truth.
- **Claim evidence promoted to verified.** Guarded by the Q14 state split. The UI must never render
  synthesis_tag or claim-attached support as EvidenceAuthority verification.
- **Rescue runs.** A manual POST after an ambiguous scheduled run destroys the diagnostic value of the proof.
  Ambiguous transport outcome = UNKNOWN, never FAILED, never rescued (owner Q8).
- **New subsystems.** Standing law: no new subsystem until an existing primitive is proven incapable of
  representing the requirement. No ResearchAgent authority, no MarketingOS database, no parallel Mission Control,
  no new store/registry/tenant.
- **Rewriting history.** Owner corrections and verdict changes are new events, never edits to the append-only
  record. The UNCLEAR -> CONFIRMED/REFUTED transition, when it comes, is a new claim event on the follow-up
  mission, not a mutation of `04dec8de`.

## 5. FIRST BROKEN MARKETINGOS ARROW

Against the spine, the arrows break in this order:

1. **NEXT MISSION -> MISSION (stalled, staged).** The chainer fired correctly, but `3b0f430a06a41357` sits
   UNCLAIMED. The compounding loop is proven through claim reification and not yet through claim resolution.
   This is the current first broken arrow and the milestone that matters.
2. **KNOWLEDGE -> OPPORTUNITY / AUDIENCE / LEARNING (not yet exercised).** Zero rows; honest NOT_STARTED.
   Correct scoping for a first research mission, but zero cannot stay permanent once the loop reaches those stages.
3. **SOURCE -> BUILD -> ARTIFACT -> DEPLOYMENT -> PROCESS -> SERVED BYTES -> SERVED BEHAVIOR (UNKNOWN).**
   The merged line is proven locally and observed in the journal, but the served gateway binary predates it.
   Explicitly represented as LOCAL CODE: PROVEN / JOURNAL OBSERVATION: PROVEN / SERVED BINARY: OLDER /
   DEPLOYMENT CONVERGENCE: OPEN.
4. **OBSERVE -> EVIDENCE for acquisition (unproven).** The scheduled producer is the next empirical answer.

Not broken: OBSERVE -> EVIDENCE -> CLAIM -> KNOWLEDGE for the research path; MISSION -> AUTHORIZATION
(nothing consequential was proposed, correctly); the projection's epistemic rendering (second-eyes PASS).

## 6. SMALLEST WIRING DELTAS (ceiling: 10)

| # | Product arrow | Existing primitive | Reached caller | Observed defect | Smallest delta | Owner | Proof | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | NEXT MISSION -> MISSION | WorkerRuntime (research-capable path) | claim-mission-chainer | Follow-up `3b0f430a06a41357` created, UNCLAIMED | Claim with minimal payload (claim ID, proposition, support, missing evidence, counterevidence, correlation/causation IDs, acquisition limits) | Research-capable WorkerRuntime | Mission completes with CONFIRMED/REFUTED/UNCLEAR + support; uncertainty moves or is preserved honestly | OPEN |
| 2 | CLAIM -> contradiction analysis | ContradictionDetector | mission stream | `0/4` uninterpretable | Bounded falsification: two materially conflicting claims, prove surfacing | Acquisition/PING coordinator | Known contradiction surfaced; else detector declared present-not-proven | OPEN |
| 3 | EVIDENCE status | Kernel Evidence verify path | MC journal adapter | Only `claim.evidence` reaches the view | Keep CLAIM-SUPPLIED SUPPORT vs VERIFIED EVIDENCE split in served JSON; wire verify path or keep labeled | MC writer | Served bytes distinguish the two states; no promotion | OPEN |
| 4 | OBSERVE -> EVIDENCE (acquisition) | `/ingest` + Page-insights producer | Pig cron 08:21 MDT | Producer merged, never served/observed | Observe 2026-10-01 run under the strict truth table; no rescue | Acquisition/PING coordinator | Scheduler invocation -> attempt -> admission -> identifiable observation -> no duplicates -> lifecycle respected | SCHEDULED |
| 5 | Acquisition safety | `acquire-url.ts` | Acquisition producer | Safety inherited as claim, not verified | Hostile battery: permitted URL -> bounded artifact; hostile URLs fail closed | Acquisition/PING coordinator | One real canonical acquisition + closed hostile set | QUEUED behind deployment truth |
| 6 | SOURCE -> SERVED BEHAVIOR | Existing sanctioned deploy mechanism | Deployment/runtime owner | Merged line `67da6aab1` built/deployed nowhere | Certify candidate, deploy, prove the full chain | Deployment/runtime owner | SOURCE -> BUILD -> ARTIFACT -> DEPLOYMENT -> PROCESS -> SERVED BYTES -> SERVED BEHAVIOR green | OPEN |
| 7 | Served MC survivability | Runtime operations (no new supervisor) | `next-server` on `:3100` | No restart coverage; same gap that killed `:18200` | Smallest durable restart/health coverage; prove behavior, not just TCP | Runtime operations | Kill process -> auto-restart -> served bytes return | OPEN |
| 8 | Journal compatibility | COALESCE read path + DEFAULT UNKNOWN | Deployment/convergence owner | Ordered, unproven | Four proofs (old read, new persist, replay, digest) + adversarial genuinely-missing -> UNKNOWN | Deployment/convergence owner | Proofs read by independent falsifier | OPEN |
| 9 | Oracle retirement | Existing canonical operational evidence | Deployment/runtime owner | Oracle stale but still a writer in discovery | Semantic retirement: stop writes, drop from discovery, label RETIRED/READ-ONLY/FORENSIC, record final sequence/count/digest | Deployment/runtime owner | No canonical caller reaches Oracle; retirement fact recorded | IN FLIGHT (correction dispatched) |
| 10 | Contract confirmation | Projection contract v1 | MarketingOS lane (reader/falsifier) | v1 PROVISIONAL; three flags open | One evidence-based revision after deployment truth + flags + a materially different mission projects clean | MarketingOS lane | Second mission projects without semantic lying | OPEN |

## What this synthesis does not do

- No new audit, no new subsystem, no new authority, no new store.
- No serial contract edits: the three flags (F1 vocabulary, F2 evidence status, F3 approval shape) are recorded
  inputs to the single future revision.
- No deployment claim: the merged line stays UNKNOWN until the certified chain in delta 6 closes.
- The coordinator owns the top-ten list against the next integration checkpoint; this document is the durable
  integration map it draws from.
