# Q17 — ONE MISSION / ONE AUDIT STORY

Mission picked: the single most recent real mission in the record:
`a32db704f0aa81c3`, run `integrate-coppersmith-20260930`, tenant `tenant::ping`,
created 2026-09-30T15:05:03.468Z (= 09:05 MDT). Trace assembled from 23 events in
the fork journal `/home/nolan/workspace/fyd-journal-gateway/events.jsonl`
(the events are ABSENT from the canonical :18199 journal — see Q17-8 below),
cross-checked against `/home/nolan/workspace/integrate-run-20260930/evidence/effect-ledger.json`
(2 rows). All reads read-only.

## The seven questions

### 1. WHAT WAS WANTED — ANSWERED
MC_MISSION_CREATED.event_data.request: "Run one real Coppersmith FYD generation
for the PING tenant, place one generated asset through media.placement, emit
stage evidence to the Mission Control journal." Requested by `integrate-run-driver`
under "Nolan binding order 2026-09-30 ~08:10 MDT".

### 2. WHAT EVIDENCE WAS USED — ANSWERED (with caveat)
Each MC_FYD_STAGE_COMPLETED carries `evidence_refs: [{kind: "run-log",
ref: "run-log:integrate-coppersmith-20260930.jsonl#<STAGE>"}]` and sha256
input/output refs per stage (e.g. RENDER output
2687a4af372d174c8f4fc12a38c8cab6d9260bda61cd3027e00a055e1512c52c).
CAVEAT: every stage event also carries `sink_status: "error"` /
`sink_error: "No persistence available: event not durably stored"`, and stages
are labeled "post-hoc instrumentation of the real pipeline envelope" —
reconstructed, not live-emitted. The referenced run-log file was not confirmed
on disk (find over workspace located no `*integrate-coppersmith*` files; the
evidence dir listing failed).

### 3. WHO AUTHORIZED — ANSWERED
MC_AGENT_AUTHORIZED: `authorized_by: "MissionScheduler._authorizeDispatch
(Lane AG eab4f714a)"`, `gate_branch: "no capability required (mission declares
no tenant-data capability)"`, `tenant_scope: "enforced: scheduler tenantId=ping"`.
Mission-level: requested by integrate-run-driver under Nolan's 2026-09-30 ~08:10
MDT binding order. No MC_APPROVAL_* events exist for this mission (approval
bypassed via the no-tenant-data-capability branch; media.placement was
separately granted — see 4).

### 4. WHAT CAPABILITY ALLOWED IT — ANSWERED
media.placement grant embedded in MC_AGENT_AUTHORIZED: `evaluated_by: "Lane C W5
validateGrant (media-placement-provider.js) - the owning authority for this
capability"`, verdict "authorized", grant {capability: "media.placement",
tenant: "ping", purpose: "operational", scope: "media.placement:placeAsset",
data_class: "public-presentation", principal: "integrate-r..."}.

### 5. WHAT EXECUTED — ANSWERED
MC_EXECUTION_STARTED {worker: "projection"}; six stages all SUCCEEDED:
ACQUIRE -> EXTRACT -> RESOLVE -> OBJECT_GRAPH -> SITE_SPEC -> RENDER
(durations: 1ms/4ms/~0/15ms/225ms), then MC_ARTIFACT_PUBLISHED, then
MC_RUN_SUCCEEDED listing the stages.

### 6. WHAT EFFECT OCCURRED — ANSWERED (at the ledger level)
MC_ARTIFACT_PUBLISHED: "coppersmith site spec + render" for site
coppersmith-plumbing; publication {capability: "media.placement",
placement_id: "mp_fc4b4742143efe40", slot: "hero", asset:
"coppersmith-hero-001", effect_ledger_id: "effect_2ac30f03c5bfa94e",
effect_state: "effect_effected"}. The provider's own effect ledger
(`.../integrate-run-20260930/evidence/effect-ledger.json`) independently records
{effect_id: "effect_2ac30f03c5bfa94e", dispatch_key: "a32db704f0aa81c3",
effect_state: "effect_effected", created_at: "2026-09-30T15:05:03.872Z"}.
So the claimed effect is corroborated by two independent records.
The follow-on synthetic mission 278093e4ba9cc2c8 ("post-effect-failure-injection",
injected lost response) correctly stayed MC_RUN_UNKNOWN / effect_unknown with
"do not retry, do not mark FAILED" — the system honored its own UNKNOWN law.

### 7. WHAT VERIFIED THE OUTCOME — UNKNOWN (from MC's read model); PARTIAL (forensically)
Forensically: MC_RUN_SUCCEEDED + MC_ARTIFACT_PUBLISHED + the effect-ledger file.
But no independent verifier attested the outcome; the "verification" is the
projector folding the mission's own stage events. From Mission Control's read
model the answer is UNKNOWN: the mission is INVISIBLE to every MC view.

## Q17-8. The projection FAIL (headline)
MC's read model cannot see this mission at all:
- The MC_MISSION_*/MC_RUN_*/MC_FYD_STAGE_*/MC_ARTIFACT_PUBLISHED events live in
  the fork journal `/home/nolan/workspace/fyd-journal-gateway/events.jsonl`
  (last write 2026-09-30 18:02). The canonical :18199 journal
  (`/home/nolan/projects/ping/data/fyd-journal/events.jsonl`, 67 events) has
  NO mission events — only FYD_SITE_OVERLAY + probes.
- /api/mc/agents and /api/mc/today read the fleet ledger
  (`~/workspace/ping-build-program/fleet/ledger.jsonl`) + inprogress dirs:
  grep for a32db704f0aa81c3 / integrate-coppersmith returns nothing.
- /api/mc/missions (mc-dispatch.ts journalPath()) now fail-closes on unset
  FYD_JOURNAL_STORE (commit 4ad9a7a); start-3100.sh sets no FYD_JOURNAL_STORE.
  Even with it set to the canonical path, the fork-held events are unreachable.
- MC nav has no route that folds MC_* journal events; the missions views render
  from /api/mc/agents only.
Result: the most recent real mission — full seven-question story answerable from
durable records — appears NOWHERE in Mission Control. REQUIRES a read-path fix
(point MC's mission projection at the one canonical journal AFTER the fork
events are classified/reconciled), NOT a new store.

## Stop-condition check
No fabricated approval rendered legitimate (no approval events exist for this
mission; the authorization chain names scheduler lane + grant authority).
No private/PING_ONLY/OWNER fields exposed in the reviewed records.
