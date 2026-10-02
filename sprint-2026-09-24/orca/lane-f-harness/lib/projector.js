'use strict';
/**
 * Lane F harness — deterministic mission projector.
 *
 * FAITHFUL PORT of lane D's projectMissions
 * (/home/nolan/projects/ping/src/app/api/mc/_lib/mc-dispatch.ts),
 * derived read-only; no lane-D file is imported or modified.
 *
 * Equivalence check: the harness projects the journal events of a real
 * :3100 mission and compares field-by-field against
 * GET /api/mc/missions/<id> (see cases/refresh-replay.js). Any future lane-D
 * projection change that breaks equivalence fails the harness.
 *
 * One documented EXTENSION: MC_RUN_NO_MATCH -> status 'NO_MATCH'. Lane D's
 * real projector has no NO_MATCH rendering (its MissionStatus has no such
 * member); the harness renders it honestly and records the gap in the
 * design doc's interface table (D1). This is the ONLY divergence from the
 * ported logic, and it is deliberate: the 1B/1C discrimination proof needs
 * NO_MATCH to be first-class, not collapsed into FAILED or UNKNOWN.
 */
const { HarnessJournal } = require('./journal');

const DISPATCH_EVENT_TYPES = new Set([
  'MC_MISSION_CREATED',
  'MC_RUN_QUEUED',
  'MC_EXECUTION_STARTED',
  'MC_AGENT_AUTHORIZED',
  'MC_AGENT_DENIED',
  'MC_ARTIFACT_PUBLISHED',
  'MC_RUN_SUCCEEDED',
  'MC_RUN_FAILED',
  'MC_RUN_UNKNOWN',
  // Harness extension (see header): the design's D1 assumed a no-match event;
  // lane D never built one. Rendered honestly, never collapsed.
  'MC_RUN_NO_MATCH',
]);

function blankMission(missionId) {
  return {
    mission_id: missionId,
    run_id: null,
    execution_id: null,
    status: 'CREATED',
    status_event_id: null,
    agent: null,
    tenant: null,
    capability: null,
    capabilities_granted: [],
    work_order_id: null,
    context_pack_id: null,
    started_at: null,
    ended_at: null,
    result: { outcome: null, output_digest: null, output_chars: null, error: null },
    reconciliation_state: null,
    artifacts: [],
    evidence: [],
    events: [],
  };
}

/** Pure function of (events, asOf): journal bytes in, one JSON document out. */
function projectMissions(events, asOf) {
  const byId = new Map();
  const get = (missionId) => {
    let m = byId.get(missionId);
    if (!m) { m = blankMission(missionId); byId.set(missionId, m); }
    return m;
  };

  const ordered = [...events].sort((a, b) =>
    a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1
    : a.event_id < b.event_id ? -1 : a.event_id > b.event_id ? 1 : 0);

  for (const ev of ordered) {
    if (!DISPATCH_EVENT_TYPES.has(ev.event_type)) continue;
    const d = ev.event_data || {};
    const missionId = d.mission_id;
    if (!missionId || typeof missionId !== 'string') continue;
    const m = get(missionId);
    const summary = d.summary ?? null;
    m.events.push({ event_id: ev.event_id, event_type: ev.event_type, timestamp: ev.timestamp, summary });

    switch (ev.event_type) {
      case 'MC_MISSION_CREATED':
        m.status = 'CREATED';
        m.status_event_id = ev.event_id;
        m.agent = d.agent ?? null;
        m.tenant = d.tenant ?? null;
        m.capability = d.capability ?? null;
        m.context_pack_id = d.context_pack_id ?? null;
        m.started_at = d.source_timestamp ?? ev.timestamp;
        break;
      case 'MC_RUN_QUEUED':
        m.status = 'QUEUED';
        m.status_event_id = ev.event_id;
        m.run_id = d.run_id ?? m.run_id;
        break;
      case 'MC_EXECUTION_STARTED':
        m.status = 'RUNNING';
        m.status_event_id = ev.event_id;
        m.execution_id = d.execution_id ?? m.execution_id;
        break;
      case 'MC_AGENT_AUTHORIZED':
        m.capabilities_granted = d.capabilities_granted ?? [];
        m.work_order_id = d.work_order_id ?? null;
        break;
      case 'MC_AGENT_DENIED':
        m.status = 'DENIED';
        m.status_event_id = ev.event_id;
        m.ended_at = ev.timestamp;
        m.result.error = d.reason ?? 'denied';
        break;
      case 'MC_ARTIFACT_PUBLISHED':
        m.artifacts.push({
          kind: d.kind ?? 'artifact',
          path: d.path ?? '',
          sha256: d.sha256 ?? null,
          event_id: ev.event_id,
        });
        break;
      case 'MC_RUN_SUCCEEDED':
        m.status = 'SUCCEEDED';
        m.status_event_id = ev.event_id;
        m.ended_at = ev.timestamp;
        m.result.outcome = 'completed';
        m.result.output_digest = d.output_digest ?? null;
        m.result.output_chars = d.output_chars ?? null;
        m.reconciliation_state = null;
        break;
      case 'MC_RUN_FAILED':
        m.status = 'FAILED';
        m.status_event_id = ev.event_id;
        m.ended_at = ev.timestamp;
        m.result.outcome = 'failed';
        m.result.error = d.error ?? null;
        m.reconciliation_state = null;
        break;
      case 'MC_RUN_UNKNOWN':
        // FIRST-CLASS: outcome unknown. Never collapsed into FAILED.
        m.status = 'UNKNOWN';
        m.status_event_id = ev.event_id;
        m.ended_at = ev.timestamp;
        m.result.outcome = 'unknown';
        m.result.error = d.reason ?? null;
        m.reconciliation_state = d.reconciliation_state ?? 'RECONCILIATION IN PROGRESS';
        break;
      case 'MC_RUN_NO_MATCH':
        // Harness extension: explicit no-match. Terminal-informative, like
        // DENIED — a routing observation, never a failure verdict.
        m.status = 'NO_MATCH';
        m.status_event_id = ev.event_id;
        m.ended_at = ev.timestamp;
        m.result.outcome = 'no_match';
        m.result.error = d.reason ?? null;
        m.reconciliation_state = null;
        break;
    }

    const evd = d.evidence;
    if (evd && typeof evd === 'object') {
      m.evidence.push({ ...evd, event_id: ev.event_id, event_type: ev.event_type });
    }
  }

  const missions = [...byId.values()].sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''));
  return { as_of: asOf, missions };
}

/** Canonical JSON: recursively sorted keys, so byte-identical replay holds. */
function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
}

/** Project a journal file with a fixed as-of; returns the canonical document. */
function projectJournalFile(journalPath, asOf) {
  const j = new HarnessJournal(journalPath);
  return projectMissions(j.read(), asOf);
}

module.exports = { projectMissions, projectJournalFile, stableStringify, DISPATCH_EVENT_TYPES };
