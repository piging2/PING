#!/usr/bin/env python3
"""Swarm 08: append P-20260923-081..088 proposals to STATE.json (proposals only, no repo writes)."""
import json, copy

STATE = '/home/hatch/workspace/tenanos-wave/STATE.json'
TS = '2026-09-23T19:10:00-06:00'

base = {
    "base_commit": None, "branch": None, "commit": None,
    "decided_by": "swarm-08", "diff_ref": None, "failure_ledger": [],
    "integration_commit": None, "oracle_touch": False, "status": "proposed",
    "swarm": "08", "approved_by": None, "approved_at": None,
    "test_results": None, "worktree": None, "writer": None,
    "created_at": TS, "updated_at": TS,
}

defs = [
    ("P-20260923-081",
     "MissionControlHeader: replace fabricated status/metrics with UNKNOWN",
     ["/home/nolan/projects/constitutional-runtime/CascadeProjects/infra/ui-next/src/components/MissionControlHeader.tsx"],
     "P0 FAKE. Component hardcodes gateway:'healthy', ollama:'connected', model:'qwen3-coder' and simulates latency/contextUsage/tok-s with Math.random(); zero fetch calls in 93 lines; consumed by chat/page.tsx. Diff rewrites initial state to 'unknown'/null, deletes the simulation interval, renders 'unknown' until a real /mc/system-backed fetch exists. Target repo: /home/nolan/projects/constitutional-runtime (NOT the wave repo). No src/tenanos changes; no FYD contact.",
     "~/workspace/tenanos-wave/diffs/P-20260923-081.diff"),
    ("P-20260923-082",
     "engine.js getReport: mark closure/velocity percentages UNKNOWN",
     ["/home/nolan/ping/ping-runtime/orchestration/execution/engine.js"],
     "P0 FAKE. missionClosureRate/missionAcceptRate/closureRate computed over the engine's in-memory _missions session array, fed by the autonomous loop's fabricated 0.85-confidence findings (P-20260923-084). Served at GET /orchestration/engine/report. Diff nulls the three fields and adds a provenance pointer to canonical ping_missions via MissionRuntime.getStats(). Counts (total/pending/completed/failed) kept as session counts. Target repo: /home/nolan/ping gateway.",
     "~/workspace/tenanos-wave/diffs/P-20260923-082.diff"),
    ("P-20260923-083",
     "Deprecate competing /orchestration/missions* reads (410 + canonical pointer)",
     ["/home/nolan/ping/gateway/routes/orchestration.js"],
     "P0 competing authority. GET /orchestration/missions and GET /orchestration/missions/:id serve engine._missions (in-memory session array); canonical mission state is ping_missions via MissionRuntime (/missions/*, /mc/missions/*). Two mission counts = no single truth. Diff returns 410 Gone with canonical route pointers. POST /orchestration/missions (random-id, non-durable, no tenant) flagged in audit for follow-up; engine compile/loop/dispatch endpoints untouched (engine ops, not mission authority). Target repo: /home/nolan/ping gateway.",
     "~/workspace/tenanos-wave/diffs/P-20260923-083.diff"),
    ("P-20260923-084",
     "startAutonomousLoop: mark synthetic output, null the fabricated 0.85 confidence",
     ["/home/nolan/ping/ping-runtime/orchestration/execution/engine.js"],
     "P0 FAKE. The loop fabricates worker output inline with hardcoded confidence 0.85, which flows into collectWorkerOutput -> consensus -> getReport percentages. Diff adds synthetic:true, renames bypass_type to synthetic_placeholder, and nulls confidence. Caveat: collectWorkerOutput validation of null confidence unverified; writer should run the engine test suite. Target repo: /home/nolan/ping gateway.",
     "~/workspace/tenanos-wave/diffs/P-20260923-084.diff"),
    ("P-20260923-085",
     "system_authority collectMissions: stop hardcoding completed/failed, report UNKNOWN",
     ["/home/nolan/ping/ping-runtime/runtime/system_authority.js"],
     "P0 FAKE. collectMissions() counts MISSION_CREATED events and reports completed=total with queued/executing/failed/blocked hardcoded 0 — every created mission shown completed, always, under the /ops/dashboard authoritative banner. Diff returns status:'unknown' with reason + raw created-event count; per-status counts nulled. Proper fix (query ping_missions GROUP BY status) needs a MissionRuntime handle the collector lacks; noted in MC-AUDIT. Target repo: /home/nolan/ping gateway.",
     "~/workspace/tenanos-wave/diffs/P-20260923-085.diff"),
    ("P-20260923-086",
     "/ops/dashboard: drop always-empty organizational_health, remove blanket authority claim",
     ["/home/nolan/ping/gateway/routes/ops.js"],
     "FAKE-adjacent. organizational_health key occurs 0 times in SystemAuthority.getSystemState() — the section is always {}. generated_runtime_authoritative:true blankets per-section collectors of mixed provenance (session-scoped, UNKNOWN). Diff removes the empty section and replaces the claim with provenance:'per-section; no blanket runtime-authority claim'. Target repo: /home/nolan/ping gateway.",
     "~/workspace/tenanos-wave/diffs/P-20260923-086.diff"),
    ("P-20260923-087",
     "/mc/dashboard: expose clamped flags instead of silently zeroing negative counters",
     ["/home/nolan/ping/gateway/routes/mission_control.js"],
     "Honest-but-lossy. Business rollup derives counters from a 500-event/24h capped window and silently clamps negatives to 0, masking counter drift. Diff adds a clamped{} map to the response so UIs can distinguish a measured zero from a display floor; existing truncated/totalEvents/window metadata kept. Target repo: /home/nolan/ping gateway.",
     "~/workspace/tenanos-wave/diffs/P-20260923-087.diff"),
    ("P-20260923-088",
     "Tenant/namespace filters across Mission Control projections (spec, no diff)",
     ["/home/nolan/ping/gateway/routes/mission_control.js",
      "/home/nolan/ping/ping-runtime/events/unified_event_runtime.js",
      "/home/nolan/ping/ping-runtime/orchestration/mission_runtime.js",
      "/home/nolan/ping/ping-runtime/knowledge/knowledge_graph.js"],
     "P0 gap, no diff (new capability, not a removal; audit+proposal only per swarm charter). Zero tenant mentions in mission_control.js; unifiedEventRuntime.query() has no namespace param; ping_missions has no tenant column (tenant only inside JSONB payload.namespace); POST /missions takes no tenant; /mc/knowledge doesn't pass namespace though queryNodes() supports it. Full contract in PROJECTION-WIRING.md: query() gains namespace filter (default-deny), mission methods take tenantId (migration or GIN on payload->>'namespace'), POST /missions requires tenant_id, DLQ needs tenant column before per-tenant views. Suggested owner: swarm 01 (tenant reality/boundaries) — filed here as the MC-side contract, not a competing implementation.",
     None),
]

with open(STATE) as f:
    state = json.load(f)

existing = {p['id'] for p in state['proposals']}
new = []
for pid, title, files, notes, diff in defs:
    if pid in existing:
        print(f"SKIP {pid} already present")
        continue
    p = copy.deepcopy(base)
    p.update({"id": pid, "title": title,
              "claimed_areas": files, "files_touched": files,
              "notes": notes, "diff_ref": diff,
              "target_repo": "/home/nolan/projects/constitutional-runtime" if pid == "P-20260923-081" else "/home/nolan/ping"})
    new.append(p)

state['proposals'].extend(new)
state['updated_at'] = TS
state['updated_by'] = 'swarm-08'

with open(STATE, 'w') as f:
    json.dump(state, f, indent=2)
    f.write('\n')

print(f"appended {len(new)} proposals; total now {len(state['proposals'])}")
