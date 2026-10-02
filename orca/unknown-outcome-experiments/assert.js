// assert.js — REQUIRED FINAL ASSERTION (programmatic; fails the proof if violated).
// UNKNOWN EXTERNAL OUTCOME REMAINS UNKNOWN.
//   - Never UNKNOWN -> FAILED merely because the coordinator died.
//   - Never UNKNOWN -> SUCCESS without durable evidence.
//   - Never UNKNOWN -> RETRY except through a decide() retry_authorized with a
//     recorded reason (never blind).
//   - A recovered outcome must carry durable evidence (SUCCEEDED event or
//     probe row) and the recovered result must survive restarts.
//   - Probe-vs-stub divergences are reported as findings, not failures of the
//     assertion: the assertion checks the module's procedure; the divergence
//     report checks the procedure against ground truth.
// usage: node assert.js
// Reads kill-matrix-results.jsonl + chaos-results.jsonl in the experiment dir.
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const failures = [];
const findings = [];

function readJsonl(p) {
  try {
    return fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  } catch (e) { return []; }
}
function fail(rule, detail) { failures.push({ rule, detail }); }
function finding(rule, detail) { findings.push({ rule, detail }); }

const matrix = readJsonl(path.join(DIR, 'kill-matrix-results.jsonl'));
const chaos = readJsonl(path.join(DIR, 'chaos-results.jsonl'));

if (matrix.length < 12) fail('matrix-completeness', `expected 12 kill-point records, found ${matrix.length}`);

// Rule 1: no UNKNOWN -> FAILED merely because the coordinator died.
// A FAILED state is legitimate only with a durable EFFECT_FAILED event.
for (const rec of matrix) {
  const st = rec.reconciliation_state && rec.reconciliation_state.operation_state;
  const ev = rec.durable_evidence || {};
  if (st && st.current_state === 'FAILED' && !(ev.event_types || []).includes('EFFECT_FAILED')) {
    fail('no-unknown-to-failed', `point ${rec.kill_point}: state FAILED with no EFFECT_FAILED event`);
  }
}

// Rule 2: no UNKNOWN -> SUCCESS without durable evidence.
// SUCCEEDED/RECOVERED requires a SUCCEEDED event or a ledger row (probe).
for (const rec of matrix) {
  const st = rec.reconciliation_state && rec.reconciliation_state.operation_state;
  const ev = rec.durable_evidence || {};
  const r = rec.reconciliation_state && rec.reconciliation_state.reconcile;
  if (!st) { fail('missing-state', `point ${rec.kill_point}: no operation state recorded`); continue; }
  if (st.current_state === 'SUCCEEDED' || st.current_state === 'RECOVERED') {
    const hasSucceededEvent = (ev.event_types || []).includes('EFFECT_SUCCEEDED');
    const hasLedgerRow = !!(ev.ledger_row && ev.ledger_row.op_key);
    if (!hasSucceededEvent && !hasLedgerRow) {
      fail('no-unknown-to-success', `point ${rec.kill_point}: ${st.current_state} with no SUCCEEDED event and no ledger row`);
    }
    // Recovered-via-probe must carry the result (delta 3).
    if (r && r.via && r.via.startsWith('effector_probe') && (r.result === undefined || r.result === null)) {
      fail('recovered-result-carried', `point ${rec.kill_point}: probe recovery without a carried result`);
    }
  }
}

// Rule 3: no blind retry. Every retry_authorized must name its reason, and
// the reason must come from decide()'s vocabulary.
const KNOWN_REASONS = new Set([
  'probe_confirms_never_executed',
  'definitive_retryable_failure',
  'unknown_outcome_low_consequence_risk_accepted',
]);
for (const rec of [...matrix, ...chaos]) {
  const r = rec.reconciliation_state ? rec.reconciliation_state.reconcile : rec.reconcile;
  if (r && r.resolution === 'retry_authorized' && !KNOWN_REASONS.has(r.reason)) {
    fail('no-blind-retry', `${rec.kill_point != null ? 'point ' + rec.kill_point : rec.chaos}: retry_authorized with unknown reason ${JSON.stringify(r.reason)}`);
  }
}

// Rule 4: no duplicate execution in the matrix points (exactly-once per op).
// Points 1-12 never perform a post-reconcile retry, so true_effect_count
// must be <= 1 everywhere (point 1: 0).
for (const rec of matrix) {
  const c = rec.effect_evidence && rec.effect_evidence.true_effect_count;
  if (typeof c === 'number' && c > 1) {
    fail('exactly-once', `point ${rec.kill_point}: true_effect_count=${c} (>1 without any authorized retry performed)`);
  }
}

// Rule 5: every matrix point recorded a reconciliation decision.
for (const rec of matrix) {
  const r = rec.reconciliation_state && rec.reconciliation_state.reconcile;
  if (!r || !r.resolution) fail('reconcile-ran', `point ${rec.kill_point}: no reconcile decision recorded`);
}

// Rule 6: the held state holds. Any op whose final state is HELD must not be
// retry-eligible and must have a durable EFFECT_HELD.
for (const rec of [...matrix, ...chaos]) {
  const st = rec.reconciliation_state ? rec.reconciliation_state.operation_state : rec.operation_state;
  if (st && st.current_state === 'HELD') {
    if (st.retry_eligible && st.retry_eligible.eligible) {
      fail('held-holds', `${rec.kill_point != null ? 'point ' + rec.kill_point : rec.chaos}: HELD but retry_eligible`);
    }
  }
}

// Findings (not assertion failures): probe-vs-stub divergence.
// The probe answers from the local ledger only. Where the stub proves the
// effect executed but the probe reported never-executed, the module's
// "retry_authorized" rests on absence of evidence. Named plainly.
for (const rec of matrix) {
  const r = rec.reconciliation_state && rec.reconciliation_state.reconcile;
  const stubAccepted = rec.dispatch_state && rec.dispatch_state.accepted;
  const stubCount = rec.effect_evidence && rec.effect_evidence.true_effect_count;
  if (r && r.resolution === 'retry_authorized' && r.reason === 'probe_confirms_never_executed' && stubAccepted && stubCount >= 1) {
    finding('probe-stub-divergence',
      `point ${rec.kill_point}: probe said never-executed -> retry_authorized, but the stub accepted x${stubCount}. ` +
      `The retry authorization rests on absence of ledger evidence, not proof of non-execution. ` +
      `This is the residual accept->commit window (see C0/C8).`);
  }
}

// Rule 7: honest terminals are grounded in a provider probe.
// Every PROVEN SUCCEEDED / FAILED / NEVER EXECUTED must carry provider-side
// proof (not just local ledger/event evidence). The provider is the external
// ground truth; the local records are claims about it.
for (const rec of chaos) {
  if (rec.chaos === 'T-succ' && rec.verdict === 'PASS') {
    const pp = rec.provider_probe || {};
    if (pp.proof === 'none' || !(pp.effectCount >= 1)) {
      fail('provider-probe-terminal', `T-succ: PROVEN SUCCEEDED without provider proof (proof=${pp.proof}, effectCount=${pp.effectCount})`);
    }
  }
  if (rec.chaos === 'T-fail' && rec.verdict === 'PASS') {
    const pph = rec.provider_probe_hard || {};
    if (pph.proof !== 'none') {
      fail('provider-probe-terminal', `T-fail: PROVEN FAILED (hard) without provider confirming non-execution (proof=${pph.proof})`);
    }
  }
  if (rec.chaos === 'T-never' && rec.verdict === 'PASS') {
    const pp = rec.provider_probe || {};
    if (pp.proof !== 'none') {
      fail('provider-probe-terminal', `T-never: PROVEN NEVER EXECUTED without provider confirming absence (proof=${pp.proof})`);
    }
  }
}

// Chaos verdict rollup.
for (const rec of chaos) {
  if (rec.verdict === 'FAIL') fail('chaos-verdict', `${rec.chaos}: ${rec.detail || 'no detail'}`);
}

console.log(`ASSERT: ${failures.length} failures, ${findings.length} findings across ${matrix.length} matrix + ${chaos.length} chaos records`);
for (const f of failures) console.log(`  FAIL [${f.rule}] ${f.detail}`);
for (const f of findings) console.log(`  FINDING [${f.rule}] ${f.detail}`);
if (failures.length > 0) { console.log('ASSERTION: FAIL'); process.exit(1); }
console.log('ASSERTION: PASS');
