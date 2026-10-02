'use strict';
/**
 * Lane F harness — journal emitter/reader.
 *
 * Uses the SAME envelope discipline as lane D's mc-dispatch.ts
 * appendDispatchEvent (read-only-derived, no lane-D files touched):
 *   - content-derived event_id ('mc-d-' + sha256(...)[0:12]); re-emitting the
 *     same event is a no-op (duplicate-skipped), like emit.py's refusal.
 *   - strictly increasing per-mission acceptance timestamps (+1ms bump on
 *     ties), so the (timestamp, event_id) projector order can never apply two
 *     same-mission events out of causal order (the lane-D ordering fix).
 *   - aggregate_id 'mc:mission:<mission_id>', aggregate_type 'mc_mission'.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function mintEventId(missionId, eventType, summary) {
  return 'mc-d-' + sha256hex(['dispatch', missionId, eventType, summary].join('|')).slice(0, 12);
}

function nowIso() {
  return new Date().toISOString();
}

class HarnessJournal {
  constructor(filePath) {
    this.filePath = filePath;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '', 'utf8');
  }

  maxMissionTimestamp(missionId) {
    const agg = `mc:mission:${missionId}`;
    let max = null;
    for (const line of fs.readFileSync(this.filePath, 'utf8').split('\n')) {
      if (!line.includes(agg)) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.aggregate_id === agg && typeof ev.timestamp === 'string') {
          if (max === null || ev.timestamp > max) max = ev.timestamp;
        }
      } catch { /* malformed line: skip, never fabricate */ }
    }
    return max;
  }

  journalHas(eventId) {
    const data = fs.readFileSync(this.filePath, 'utf8');
    return data.includes(`"event_id":"${eventId}"`);
  }

  appendEvent(eventType, missionId, summary, data = {}) {
    let ts = nowIso();
    const prev = this.maxMissionTimestamp(missionId);
    if (prev !== null && ts <= prev) {
      ts = new Date(Date.parse(prev) + 1).toISOString();
    }
    const event = {
      event_id: mintEventId(missionId, eventType, summary),
      timestamp: ts,
      event_type: eventType,
      aggregate_id: `mc:mission:${missionId}`,
      aggregate_type: 'mc_mission',
      event_data: {
        mission_id: missionId,
        backfill: false,
        source_timestamp: ts,
        observation_timestamp: ts,
        import_timestamp: ts,
        summary,
        ...data,
      },
    };
    if (this.journalHas(event.event_id)) return { event, disposition: 'duplicate-skipped' };
    fs.appendFileSync(this.filePath, JSON.stringify(event) + '\n', 'utf8');
    return { event, disposition: 'appended' };
  }

  /** Read all events, deterministic order: (timestamp, event_id). */
  read() {
    const events = [];
    const seen = new Set();
    for (const line of fs.readFileSync(this.filePath, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t) continue;
      try {
        const ev = JSON.parse(t);
        if (!ev.event_id || seen.has(ev.event_id)) continue;
        seen.add(ev.event_id);
        events.push(ev);
      } catch { /* malformed: skip */ }
    }
    events.sort((a, b) =>
      a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1
      : a.event_id < b.event_id ? -1 : a.event_id > b.event_id ? 1 : 0);
    return events;
  }

  eventsFor(missionId) {
    return this.read().filter((e) => e.aggregate_id === `mc:mission:${missionId}`);
  }
}

module.exports = { HarnessJournal, sha256hex, mintEventId, nowIso };
