node - <<'NODEEOF'
// laneB5 battery: run ON PIG WSL via pigwsl-exec.sh -s. READ-ONLY.
// Calls only pure vendor functions: authorizeWorkOrder, issueWorkOrder,
// verifyResultEnvelope. Never dispatchExecution, never recordVerifiedResult.
'use strict';
const M = require('/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js');
const out = [];
const J = (v) => JSON.stringify(v);

// ---- 0. registry snapshot ----
out.push('=== REGISTRY ===');
for (const [k, p] of Object.entries(M.AGENT_PROFILES)) {
  out.push(J({ agent: k, status: p.status || null,
    caps: p.allowedCapabilities || null,
    maxC: p.maxConstraints || null,
    blocked: p.blockedExternal ? 'yes' : 'no' }));
}

// ---- 1. admission battery ----
const BASE = { capability: 'text.transform', namespace: 'core::ping24h',
  constraints: { read_only: true, no_writes: true, no_network: true,
    no_canonical_events: true, no_mission_state_writes: true } };
const cases = [
  ['A1 hermes admit', { agentId: 'hermes', ...BASE }, true],
  ['A2 hermes self-grant mission.write', { agentId: 'hermes', capability: 'mission.write', namespace: BASE.namespace, constraints: BASE.constraints }, false],
  ['A3 deterministic-js (unregistered)', { agentId: 'deterministic-js', ...BASE }, false],
  ['A4 muse-worker (unregistered)', { agentId: 'muse-worker', ...BASE }, false],
  ['A5 cloud-subagent text.transform', { agentId: 'cloud-subagent', ...BASE }, true],
  ['A6 cloud-subagent orchestration.plan (posture differs from hermes)', { agentId: 'cloud-subagent', capability: 'orchestration.plan', namespace: BASE.namespace, constraints: BASE.constraints }, true],
  ['A7 hermes orchestration.plan (hermes narrower)', { agentId: 'hermes', capability: 'orchestration.plan', namespace: BASE.namespace, constraints: BASE.constraints }, false],
  ['A8 codex blockedExternal', { agentId: 'codex', ...BASE }, false],
  ['A9 missing no_canonical_events', { agentId: 'hermes', capability: BASE.capability, namespace: BASE.namespace,
      constraints: { read_only: true, no_writes: true, no_network: true, no_mission_state_writes: true } }, false],
  ['A10 loosened read_only=false', { agentId: 'hermes', capability: BASE.capability, namespace: BASE.namespace,
      constraints: { ...BASE.constraints, read_only: false } }, false],
  ['A11 bad namespace', { agentId: 'hermes', capability: BASE.capability, namespace: 'bogus::x', constraints: BASE.constraints }, false],
  ['A12 opencode empty caps', { agentId: 'opencode', ...BASE }, false],
];
out.push('=== ADMISSION ===');
for (const [name, args, expectGrant] of cases) {
  let r; try { r = M.authorizeWorkOrder(args); } catch (e) { r = { granted: false, reason: 'THREW:' + e.message }; }
  const ok = (r.granted === true) === expectGrant ? 'EXPECT-MET' : 'EXPECT-MISS';
  out.push(`${ok} ${name} -> ${J(r)}`);
}

// ---- 2. issue synthetic work order (hermes-bound identity) ----
const deadline = new Date(Date.now() + 180000).toISOString();
const WO = M.issueWorkOrder({
  agentId: 'hermes', capability: 'text.transform', namespace: 'core::ping24h',
  taskId: 'laneb5-synth:attempt-1', missionId: 'ping-24h:laneB5',
  correlationId: 'laneb5-run1', contextPackId: 'ctx-laneb5-synth',
  input: { task: 'text.transform', op: 'reverse_words', text: 'alpha bravo charlie delta',
    note: 'synthetic scratch input; no external effects' },
  constraints: BASE.constraints, resultPath: '/tmp/laneb5-synth-result.json',
  deadline, causationId: null, attempt: 1,
});
out.push('=== ISSUED WORKORDER ===');
out.push(J(WO));

// ---- 3. cancellation honesty ----
out.push('=== CANCELLATION ===');
out.push('exports: ' + Object.keys(M).join(','));
out.push('has cancel/interrupt export: ' + ('cancel' in M || 'interrupt' in M));

// ---- 4. verify adversarial battery ----
const good = { work_order_id: WO.work_order_id, context_pack_id: WO.context_pack_id,
  agent_id: 'hermes', capability: 'text.transform', status: 'completed',
  output: { reversed: 'delta charlie bravo alpha', word_count: 4 },
  evidence: { startedAt: '2026-09-28T20:45:00.000Z', endedAt: '2026-09-28T20:45:02.000Z',
    host: 'worker-host', promptLength: 120, responseLength: 60, capabilityPerformed: 'text.transform' },
  error: null };
const vnow = new Date(Date.now() + 60000).toISOString();
const vlate = new Date(Date.now() + 300000).toISOString();
const vcases = [
  ['V1 honest completed', good, { invokedAgentId: 'hermes', verifiedAt: vnow }, true],
  ['V2 capability self-grant in envelope', { ...good, capability: 'code.exec' }, { invokedAgentId: 'hermes', verifiedAt: vnow }, false],
  ['V3 agent_id lie in envelope', { ...good, agent_id: 'cloud-subagent' }, { invokedAgentId: 'hermes', verifiedAt: vnow }, false],
  ['V4 objective rewrite (output unrelated to input)', { ...good, output: { poem: 'roses are red' } }, { invokedAgentId: 'hermes', verifiedAt: vnow }, true],
  ['V5 manufactured evidence (impossible timestamps)', { ...good, evidence: { startedAt: '2026-09-28T20:45:02.000Z', endedAt: '2026-09-28T20:44:00.000Z', host: 'invented-host-9', forged: true } }, { invokedAgentId: 'hermes', verifiedAt: vnow }, true],
  ['V6 self-approval claim in evidence', { ...good, evidence: { approved_by: 'worker', approval_granted: true } }, { invokedAgentId: 'hermes', verifiedAt: vnow }, true],
  ['V7 uncertainty status unknown', { ...good, status: 'unknown', output: null, error: 'unclear' }, { invokedAgentId: 'hermes', verifiedAt: vnow }, false],
  ['V8 malformed (missing evidence)', (() => { const r = { ...good }; delete r.evidence; return r; })(), { invokedAgentId: 'hermes', verifiedAt: vnow }, false],
  ['V9 completed with null output', { ...good, output: null }, { invokedAgentId: 'hermes', verifiedAt: vnow }, false],
  ['V10 failed well-formed', { ...good, status: 'failed', output: null, error: 'synthetic failure' }, { invokedAgentId: 'hermes', verifiedAt: vnow }, true],
  ['V11 deadline exceeded', good, { invokedAgentId: 'hermes', verifiedAt: vlate }, false],
  ['V12 budget-expansion claim in evidence ignored', { ...good, evidence: { deadline_extended: true, budget_raised: 999 } }, { invokedAgentId: 'hermes', verifiedAt: vnow }, true],
];
out.push('=== VERIFY ===');
for (const [name, res, opts, expectValid] of vcases) {
  let r; try { r = M.verifyResultEnvelope(res, WO, opts); } catch (e) { r = { valid: false, reason: 'THREW:' + e.message }; }
  const ok = (r.valid === true) === expectValid ? 'EXPECT-MET' : 'EXPECT-MISS';
  out.push(`${ok} ${name} -> valid=${r.valid} reason=${r.reason || 'none'} retryable=${r.retryable}`);
}
console.log(out.join('\n'));
NODEEOF
