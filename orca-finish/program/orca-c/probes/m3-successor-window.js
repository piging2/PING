'use strict';
// ORCA-C mission 3 probe: successor-work crash window.
// (a) STATIC: is there any durable "successor intent" concept? Search the real sources.
// (b) TEST: crash between t1 COMPLETED and t2 creation. Restart recomputes the
//     successor from LIVE state (source: "Build task-2 input from LIVE state at
//     follow-up time (not from the plan)"). If live state moved, the regenerated
//     successor differs from the pre-crash one -> derivation, not atomic creation.
const fs = require('fs');
const path = require('path');
const policy = require('../src/orca_policy.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

// (a) scan real sources for any durable successor concept
const srcDir = path.join(__dirname, '..', 'src');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));
let hits = [];
for (const f of files) {
  const t = fs.readFileSync(path.join(srcDir, f), 'utf8');
  const re = /successor|follow[-_]?up[-_]?intent|next[-_]?task[-_]?plan|planned[-_]?edge/gi;
  let m; while ((m = re.exec(t))) hits.push(`${f}: ${m[0]}`);
}
// follow-up classification exists; what we seek is a DURABLE edge written atomically
// with predecessor completion. classifyFollowUp is in-memory only (returns a record,
// saved to run evidence dir, not to the objective's durable state).
check('STATIC: no durable successor-intent edge concept in sources',
  hits.filter(h => /successor/i.test(h)).length === 0);

// (b) faithfully replicate the assessment's successor-target derivation from source:
//   target = observation.lastCompletedMission   (LIVE state)
//   followUpNeeded = chain-evidence check on target || non_terminal present
//   t2 input built from live trace at follow-up time
function deriveSuccessor({ t1Valid, lastCompletedMission, nonTerminal }) {
  const decision = policy.classifyFollowUp({ derivedFromVerified: !!t1Valid, followUpKind: 'evidence-chain-verification' });
  const followUpNeeded = !!(lastCompletedMission && lastCompletedMission.mission_id) || nonTerminal.length > 0;
  if (decision.decisionClass === policy.DECISION_CLASSES.REQUIRES_HUMAN_APPROVAL) return { t2: null, why: 'escalated' };
  if (!followUpNeeded) return { t2: null, why: 'not-needed' };
  return {
    t2: {
      taskKey: 't2-chain-verify', // stable identity
      input: {
        mission_under_verification: lastCompletedMission ? lastCompletedMission.mission_id : null,
        non_terminal_missions: nonTerminal,
      },
    },
    why: 'scheduled',
  };
}
const preCrashLive = { t1Valid: true, lastCompletedMission: { mission_id: 'm-100' }, nonTerminal: [] };
const sPre = deriveSuccessor(preCrashLive);
check('pre-crash: successor scheduled against live mission m-100',
  sPre.t2 && sPre.t2.input.mission_under_verification === 'm-100');

// crash: t1 durably COMPLETED, no t2 durable record. Live state moves before restart
// (another mission m-101 completes in the interim).
const postCrashLive = { t1Valid: true, lastCompletedMission: { mission_id: 'm-101' }, nonTerminal: [] };
const sPost = deriveSuccessor(postCrashLive);
check('VULN/note: post-restart successor verifies m-101 (DRIFT: live-state change altered successor content)',
  sPost.t2 && sPost.t2.input.mission_under_verification === 'm-101' &&
  sPost.t2.input.mission_under_verification !== sPre.t2.input.mission_under_verification);
check('identity stable across drift (same task key), content not',
  sPost.t2.taskKey === sPre.t2.taskKey);

// the fail-closed counterpart: t1 terminal NOT verifiable -> follow-up escalates, never fabricated
const sBad = deriveSuccessor({ t1Valid: false, lastCompletedMission: { mission_id: 'm-102' }, nonTerminal: [] });
check('unverified predecessor -> follow-up escalated, no successor fabricated', sBad.t2 === null && sBad.why === 'escalated');

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
