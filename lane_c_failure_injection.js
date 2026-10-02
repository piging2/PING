'use strict';
/**
 * LANE C failure-injection: event committed -> process dies BEFORE any mission exists.
 * Run on the Pig (has node + pg in /tmp/lanec/node_modules, scratch PG at 127.0.0.1:15439).
 *
 * Phase 1: commit an event with NO bridge subscriber. This is the observable
 *   equivalent of a process crash between UER.emit() persistence (step 6) and
 *   handler dispatch (step 7): the bridge is in-process only, so in that crash
 *   window the event is committed and zero handlers have run.
 * Phase 2: "restart" — fresh UER + MissionRuntime + EventToMissionBridge.start()
 *   (mirrors gateway bootstrap; bridge.start() only subscribes, no scan).
 *   A control event proves the bridge works for NEW emissions.
 * Phase 3: check whether the orphaned event gained a mission after restart.
 * Phase 4: mid-handler crash variant — bridge subscribed but missionRuntime.create
 *   throws (simulated kill mid-derivation); the throw is swallowed by emit's
 *   handler try/catch, leaving a committed event with no mission and no retry.
 */
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('/tmp/lanec/node_modules/pg');

const R = '/home/nolan/worktrees/constitutional-convergence-authority-law';
const { UnifiedEventRuntime } = require(path.join(R, 'ping-runtime/events/unified_event_runtime.js'));
const { MissionRuntime } = require(path.join(R, 'ping-runtime/orchestration/mission_runtime.js'));
const { EventToMissionBridge } = require(path.join(R, 'ping-runtime/orchestration/event_to_mission_bridge.js'));

const pool = new Pool({
  host: '127.0.0.1', port: 15439,
  user: 'lane_c_test', password: 'lane_c_test_pw', database: 'lane_c_test',
});

function expectedMissionId(missionType, eventId) {
  // Mirrors MissionRuntime.create(): sha256(`${missionType}:${event_id}`).slice(0,16)
  return crypto.createHash('sha256').update(missionType + ':' + eventId).digest('hex').slice(0, 16);
}

async function main() {
  // ---- PHASE 1: commit-then-die (no bridge subscriber) ----
  const uer1 = new UnifiedEventRuntime({ pool });
  await uer1.initialize();
  const r1 = await uer1.emit('REVIEW_RECEIVED', 'lane-c-probe', { review_id: 'r-orphan-1' }, { logical_id: 'lane-c-orphan-1' });
  if (r1.status !== 'ok') throw new Error('emit failed: ' + JSON.stringify(r1));
  const orphanEventId = r1.eventId;
  console.log('P1 committed event (no subscriber = crash window):', orphanEventId);
  const row1 = await pool.query('SELECT event_id, event_type, processed FROM ping_events WHERE event_id=$1', [orphanEventId]);
  console.log('P1 ping_events row present:', row1.rows.length === 1, '| processed flag:', row1.rows[0].processed);

  // ---- PHASE 2: restart (fresh process, bridge starts, control event) ----
  const uer2 = new UnifiedEventRuntime({ pool });
  await uer2.initialize();
  const missions = new MissionRuntime({ pool, eventRuntime: uer2 });
  await missions.initialize();
  const bridge = new EventToMissionBridge({ eventRuntime: uer2, missionRuntime: missions });
  bridge.start(); // subscribes only; does it scan ping_events? (watch PHASE 3)

  const r2 = await uer2.emit('REVIEW_RECEIVED', 'lane-c-probe', { review_id: 'r-live-1' }, { logical_id: 'lane-c-live-1' });
  const liveMissionId = expectedMissionId('REVIEW_RESPONSE', r2.eventId);
  const liveRow = await pool.query('SELECT mission_id FROM ping_missions WHERE mission_id=$1', [liveMissionId]);
  console.log('P2 control: bridge derives mission for NEW event:', liveRow.rows.length === 1, '| mission:', liveMissionId);

  // ---- PHASE 3: did the restart recover the orphan? ----
  const orphanMissionId = expectedMissionId('REVIEW_RESPONSE', orphanEventId);
  const orphanRow = await pool.query('SELECT mission_id FROM ping_missions WHERE mission_id=$1', [orphanMissionId]);
  const orphanStill = await pool.query('SELECT 1 FROM ping_events WHERE event_id=$1', [orphanEventId]);
  console.log('P3 mission for ORPHANED event after restart:', orphanRow.rows.length === 1 ? 'EXISTS' : 'ABSENT');
  console.log('P3 orphan event still in ping_events:', orphanStill.rows.length === 1);
  console.log('P3 bridge stats:', JSON.stringify(bridge.getStats()));

  // ---- PHASE 4: crash DURING derivation (handler throws mid-create) ----
  const uer3 = new UnifiedEventRuntime({ pool });
  const missions3 = new MissionRuntime({ pool, eventRuntime: uer3 });
  await missions3.initialize();
  const origCreate = missions3.create.bind(missions3);
  missions3.create = async () => { throw new Error('SIMULATED CRASH mid-mission-create'); };
  const bridge3 = new EventToMissionBridge({ eventRuntime: uer3, missionRuntime: missions3 });
  bridge3.start();
  const r4 = await uer3.emit('LEAD_CREATED', 'lane-c-probe', { lead_id: 'l-orphan-2' }, { logical_id: 'lane-c-orphan-2' });
  const orphan2Mission = expectedMissionId('LEAD_FOLLOWUP', r4.eventId);
  const orphan2Row = await pool.query('SELECT 1 FROM ping_missions WHERE mission_id=$1', [orphan2Mission]);
  console.log('P4 mid-derivation crash -> emit status:', r4.status, '| mission ABSENT:', orphan2Row.rows.length === 0, '| bridge failed:', bridge3.getStats().failed);
  missions3.create = origCreate; // restore; orphan2 is never retried (see P5)

  // ---- PHASE 5: second restart proves the orphans persist indefinitely ----
  const uer5 = new UnifiedEventRuntime({ pool });
  const missions5 = new MissionRuntime({ pool, eventRuntime: uer5 });
  await missions5.initialize();
  new EventToMissionBridge({ eventRuntime: uer5, missionRuntime: missions5 }).start();
  await new Promise(res => setTimeout(res, 1500)); // let any async scan run
  const o1 = await pool.query('SELECT 1 FROM ping_missions WHERE mission_id=$1', [orphanMissionId]);
  const o2 = await pool.query('SELECT 1 FROM ping_missions WHERE mission_id=$1', [orphan2Mission]);
  console.log('P5 after 2nd restart: orphan1 mission:', o1.rows.length === 1 ? 'EXISTS' : 'ABSENT',
              '| orphan2 mission:', o2.rows.length === 1 ? 'EXISTS' : 'ABSENT');

  await pool.end();
  console.log('DONE');
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
