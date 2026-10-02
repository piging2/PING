#!/usr/bin/env python3
"""Surgical patch: external_agent_adapter.issueWorkOrder accepts a stable
workOrderId override (ORCA crash-safe remediation). Idempotent."""
import sys

p = '/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/external_agent_adapter.js'
s = open(p, encoding='utf-8').read()

old_sig = "function issueWorkOrder({ agentId, capability, namespace, taskId, missionId, correlationId, contextPackId, input, constraints, resultPath, deadline, causationId, attempt = 1 }) {"
new_sig = "function issueWorkOrder({ agentId, capability, namespace, taskId, missionId, correlationId, contextPackId, input, constraints, resultPath, deadline, causationId, attempt = 1, workOrderId = null }) {"
if new_sig in s:
    print('already patched (sig)')
else:
    assert s.count(old_sig) == 1, 'sig anchor not unique'
    s = s.replace(old_sig, new_sig)

old_mint = "    work_order_id: workOrderId(taskId),"
new_mint = "    work_order_id: stableWorkOrderId(workOrderId, taskId),"
if new_mint in s:
    print('already patched (mint)')
else:
    assert s.count(old_mint) == 1, 'mint anchor not unique'
    s = s.replace(old_mint, new_mint)

helper = '''
/**
 * Crash-safe identity (ORCA remediation 2026-09-18): the loop derives a
 * stable work_order_id from (objective_id, task_key) so a restart
 * rediscovers the same work order instead of minting a run-scoped one.
 * A caller-supplied override is validated, never minted; otherwise the
 * historical taskId-derived minter is preserved for backward compatibility.
 */
function stableWorkOrderId(explicit, taskId) {
  if (explicit === null || explicit === undefined) return workOrderId(taskId);
  if (typeof explicit !== 'string' || !/^[0-9a-f]{32,128}$/.test(explicit)) {
    const err = new Error('Work order denied: workOrderId override must be lowercase hex (32-128 chars)');
    err.code = 'WORK_ORDER_DENIED';
    throw err;
  }
  return explicit;
}

'''
anchor = "function workOrderId(taskId) {"
if 'function stableWorkOrderId(' in s:
    print('already patched (helper)')
else:
    assert s.count(anchor) == 1, 'helper anchor not unique'
    s = s.replace(anchor, helper + anchor)

old_exp = "  workOrderId,\n"
if '  stableWorkOrderId,\n' in s:
    print('already patched (export)')
else:
    assert s.count(old_exp) == 1, 'export anchor not unique'
    s = s.replace(old_exp, old_exp + "  stableWorkOrderId,\n")

open(p, 'w', encoding='utf-8').write(s)
print('patched ok')
