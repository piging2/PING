'use strict';
/**
 * Lane D adapter-call shim: thin transport to the EXISTING ExternalAgentAdapter.
 *
 * This shim owns NO decision. It parses argv, calls the real adapter's
 * functions, prints one JSON line on stdout, and exits. Every grant/deny
 * verdict and every validation result comes from the adapter module itself.
 *
 * Canonical adapter (arch-A): /home/nolan/workspace/orca-adapter/vendor/
 * external_agent_adapter.js. (The lane-D ledger pointed at the orca-autonomy
 * worktree copy; both expose the same authorize/issue/verify surface used
 * here, but the vendor copy is the canonical one. See writer notes.)
 *
 * CLI contract (owned by lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts
 * adapterCall): node adapter-call.js <op> [payload-json]
 *   op: profiles | authorize | issue | verify
 *   payload: a single argv JSON string (NOT a file path). `profiles` takes
 *   no payload.
 *
 * Exit 0 with {"ok":true,...} when the adapter returned a verdict.
 * Exit 0 with {"ok":false,"error":...,"code":...,"reason":...} when the
 * adapter threw (issue/verify: a throw IS the adapter's denial/invalid
 * signal, e.g. WORK_ORDER_DENIED; the caller maps ok:false to its own
 * failure branch).
 * Exit 2 on shim misuse (bad op, missing/unparseable payload, adapter
 * failed to load) and on an authorize-time throw: a crashed authorize is
 * not a verdict, so it must surface as a transport error, never as a
 * fabricated DENIED.
 *
 * E2 DIVERGENCE (2026-09-27, writer W2): retries must be byte-identical;
 * idempotency_key is a salt, not a request name. The mission layer (not the
 * adapter) owns retry identity: missionId derives from the idempotency key
 * as a salt in the hash, taskId = missionId + ':task:1', and work_order_id
 * = sha256('workorder:' + taskId)[0:16]. The shim forwards the issue
 * payload as-is, but the canonical vendor adapter SILENTLY IGNORES a
 * workOrderId override field (it has no stableWorkOrderId; only the
 * orca-autonomy worktree copy honors the override). Never assume the
 * override is honored. Future hardening: persist the idempotency key in
 * MC_MISSION_CREATED event_data so an audit can prove which key produced a
 * mission (today the key is hashed into the mission id but not stored).
 */
const ADAPTER_PATH = '/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js';

function fail(code, message) {
  process.stderr.write('adapter-call: ' + message + '\n');
  process.exit(code);
}

function out(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

const [op, payloadArg] = process.argv.slice(2);
if (!op || (op !== 'profiles' && op !== 'authorize' && op !== 'issue' && op !== 'verify')) {
  fail(2, 'usage: adapter-call.js <profiles|authorize|issue|verify> [payload-json]');
}

let payload;
if (op !== 'profiles') {
  if (payloadArg === undefined) fail(2, 'missing payload JSON for op "' + op + '"');
  try {
    payload = JSON.parse(payloadArg);
  } catch (e) {
    fail(2, 'payload is not valid JSON: ' + e.message);
  }
}

let adapter;
try {
  adapter = require(ADAPTER_PATH);
} catch (e) {
  fail(2, 'cannot load adapter at ' + ADAPTER_PATH + ': ' + e.message);
}

function thrown(e) {
  return {
    ok: false,
    error: String((e && e.message) || e),
    code: (e && e.code) || 'ADAPTER_THROW',
    reason: (e && e.reason) || null,
  };
}

try {
  if (op === 'profiles') {
    out({ ok: true, profiles: adapter.AGENT_PROFILES });
  } else if (op === 'authorize') {
    // authorizeWorkOrder returns a verdict object; it must not throw on a
    // well-formed request. A throw here is a transport failure, not a
    // decision, so it exits non-zero (caller: 503 adapter_error).
    let verdict;
    try {
      verdict = adapter.authorizeWorkOrder(payload);
    } catch (e) {
      fail(2, 'authorizeWorkOrder threw: ' + String((e && e.message) || e));
    }
    out({
      ok: true,
      granted: verdict.granted === true,
      reason: verdict.reason ?? null,
      agentId: verdict.agentId ?? null,
      capability: verdict.capability ?? null,
      namespace: verdict.namespace ?? null,
    });
  } else if (op === 'issue') {
    // issueWorkOrder throws WORK_ORDER_DENIED on denial: the throw carries
    // the verdict, so it is forwarded as ok:false (caller: issue_failed).
    // The payload is forwarded as-is; unknown fields (e.g. a future
    // workOrderId override) are passed through untouched. NOTE: the
    // canonical vendor adapter ignores a workOrderId override (it has no
    // stableWorkOrderId); only the orca-autonomy worktree copy honors it.
    // Do not assume the override is honored.
    try {
      out({ ok: true, workOrder: adapter.issueWorkOrder(payload) });
    } catch (e) {
      out(thrown(e));
    }
  } else {
    // verify
    // verifyResultEnvelope returns {valid:true,result_id} or
    // {valid:false,reason}; it does not throw on invalid envelopes.
    try {
      const v = adapter.verifyResultEnvelope(
        payload.result,
        payload.workOrder,
        { invokedAgentId: payload.invokedAgentId, verifiedAt: payload.verifiedAt },
      );
      out({
        ok: true,
        valid: v.valid === true,
        result_id: v.result_id ?? null,
        retryable: v.retryable ?? false,
        reason: v.reason ?? null,
        error: v.reason ?? null,
      });
    } catch (e) {
      out(thrown(e));
    }
  }
} catch (e) {
  // Last-resort: the shim itself broke after the adapter loaded.
  fail(2, 'shim failure: ' + String((e && e.message) || e));
}
