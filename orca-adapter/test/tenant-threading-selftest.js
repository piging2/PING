#!/usr/bin/env node
'use strict';
/**
 * tenant-threading-selftest.js — SYNTHETIC tests for lane B -> lane C
 * tenant threading. No real external effects (fake transport only).
 *
 * Convention (lane B, 2026-09-26): the scheduler dispatch event carries
 * authoritative `event.tenant_id`; `POST /missions` derives
 * `payload.namespace = 'tenant::<tenant_id>'` and fails closed (400) on
 * caller mismatch. This adapter threads the event's tenant_id into the
 * evidence artifact and fails closed the same way. Broker untouched.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const adapter = require('../adapter.js');
const { OUTCOME } = require('../outcomes.js');

const EVIDENCE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-adapter-tenant-'));
let failures = 0;

function check(name, cond, detail) {
  if (cond) console.log(`PASS  ${name}`);
  else { failures++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

const CONSTRAINTS = {
  read_only: true, no_writes: true, no_network: true,
  no_canonical_events: true, no_mission_state_writes: true,
  allowed_workspace: 'tenant::acme',
};

function baseOpts(overrides) {
  return {
    execution: { missionId: 'm-t', runId: 'r-t', executionId: 'e-t1', attempt: '1' },
    agentId: 'hermes',
    capability: 'text.summarize',
    namespace: 'tenant::acme',
    constraints: CONSTRAINTS,
    taskBrief: 'Summarize the input.',
    input: { text: 'hello' },
    evidenceDir: EVIDENCE_DIR,
    ...overrides,
  };
}

function fakeCompletedTransport(agentId, capability) {
  return (prompt) => {
    const wo = /"work_order_id": "([^"]+)"/.exec(prompt)[1];
    const ctx = /"context_pack_id": "([^"]+)"/.exec(prompt)[1];
    const env = {
      work_order_id: wo, context_pack_id: ctx, agent_id: agentId,
      capability, status: 'completed', output: { summary: 'ok' },
      evidence: { startedAt: 't0', endedAt: 't1', host: 'fake', capabilityPerformed: capability },
      error: null,
    };
    return { startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: 0, error: null,
             stdout: JSON.stringify(env), stderr: '' };
  };
}

(async () => {
  // --- resolveTenantId unit checks ---
  check('match -> resolved', adapter.resolveTenantId({ tenantId: 'acme', namespace: 'tenant::acme' }) === 'acme');
  check('derived from namespace', adapter.resolveTenantId({ tenantId: null, namespace: 'tenant::acme' }) === 'acme');
  check('core -> null', adapter.resolveTenantId({ tenantId: null, namespace: 'core::system' }) === null);
  let t1 = false;
  try { adapter.resolveTenantId({ tenantId: 'acme', namespace: 'tenant::other' }); } catch (e) { t1 = /tenant_namespace_mismatch/.test(e.message); }
  check('mismatch throws fail-closed', t1);
  let t2 = false;
  try { adapter.resolveTenantId({ tenantId: 'acme', namespace: 'core::system' }); } catch (e) { t2 = /tenant_namespace_mismatch/.test(e.message); }
  check('tenantId on core namespace throws', t2);
  let t3 = false;
  try { adapter.resolveTenantId({ tenantId: 'BAD!/../x', namespace: 'tenant::acme' }); } catch (e) { t3 = true; }
  check('malformed tenantId rejected', t3);

  // --- dispatchExecution threading ---
  const r1 = await adapter.dispatchExecution(baseOpts({
    tenantId: 'acme',
    transportFn: fakeCompletedTransport('hermes', 'text.summarize'),
  }));
  check('tenant dispatch completed', r1.outcome === OUTCOME.COMPLETED, JSON.stringify(r1));
  check('result carries tenant_id', r1.tenant_id === 'acme');
  const art1 = JSON.parse(fs.readFileSync(r1.artifactPath, 'utf8'));
  check('artifact carries tenant_id', art1.tenant_id === 'acme');

  // mismatch: transport must never be invoked
  let invoked = false;
  let threw = false;
  try {
    await adapter.dispatchExecution(baseOpts({
      tenantId: 'acme', namespace: 'tenant::victim',
      transportFn: () => { invoked = true; return {}; },
    }));
  } catch (e) { threw = /tenant_namespace_mismatch/.test(e.message); }
  check('mismatch throws before dispatch', threw);
  check('mismatch: no transport invoked', invoked === false);

  // tenantId on core namespace: fail closed
  invoked = false; threw = false;
  try {
    await adapter.dispatchExecution(baseOpts({
      tenantId: 'acme', namespace: 'core::system',
      constraints: { ...CONSTRAINTS, allowed_workspace: 'core::system' },
      transportFn: () => { invoked = true; return {}; },
    }));
  } catch (e) { threw = true; }
  check('core+tenantId throws', threw);
  check('core+tenantId: no transport invoked', invoked === false);

  // derived tenant (no explicit tenantId)
  const r4 = await adapter.dispatchExecution(baseOpts({
    execution: { missionId: 'm-t', runId: 'r-t', executionId: 'e-t4', attempt: '1' },
    transportFn: fakeCompletedTransport('hermes', 'text.summarize'),
  }));
  check('derived tenant_id in result', r4.tenant_id === 'acme', JSON.stringify(r4.tenant_id));
  const art4 = JSON.parse(fs.readFileSync(r4.artifactPath, 'utf8'));
  check('derived tenant_id in artifact', art4.tenant_id === 'acme');

  // core execution: tenant_id null
  const r5 = await adapter.dispatchExecution(baseOpts({
    execution: { missionId: 'm-t', runId: 'r-t', executionId: 'e-t5', attempt: '1' },
    namespace: 'core::system',
    constraints: { ...CONSTRAINTS, allowed_workspace: 'core::system' },
    transportFn: fakeCompletedTransport('hermes', 'text.summarize'),
  }));
  check('core tenant_id null', r5.tenant_id === null, JSON.stringify(r5.tenant_id));

  // prompt carries the tenant context line when present
  const wo = { work_order_id: 'w', context_pack_id: 'c', agent_id: 'hermes', capability: 'text.summarize', mission_id: 'm', task_id: 't', attempt: 1, input: {} };
  const p = adapter.buildWorkerPrompt(wo, 'brief', 'acme');
  check('prompt includes tenant line', p.includes('tenant: acme'));
  const p2 = adapter.buildWorkerPrompt(wo, 'brief', null);
  check('prompt omits tenant line for core', !p2.includes('tenant:'));

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('SELFTEST CRASH:', e); process.exit(1); });
