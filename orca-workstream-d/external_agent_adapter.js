'use strict';
/**
 * ExternalAgentAdapter — PING-side adapter for exterior agents (Hermes, Codex, OpenCode).
 *
 * Boundary (contract, proven live 2026-09-16/17):
 *   PING mission -> WorkerRuntime -> ExternalAgentAdapter -> scoped WorkOrder
 *   -> ONE external agent -> result envelope -> PING -> verification/evidence.
 *
 * The agent MUST NOT: emit canonical events, write mission state, decide
 * promotion, or bypass capability policy. Its sandbox boundary is its
 * authority boundary. PING records WORKER_COMPLETED or WORKER_FAILED through
 * its canonical event runtime after validating the result envelope.
 *
 * This module owns exactly ONE decision (single-authority-per-decision):
 *   "may PING issue work order W delegating capability C to external agent A
 *    under constraints K?"  -> authorizeWorkOrder(), fail-closed.
 * It does NOT duplicate:
 *   - CapabilityAuthority.authorize (live /app/gateway/capability_authority.js:230):
 *     "may agent A invoke capability C against PING?" (agent-initiated, /capabilities)
 *   - CanonicalizationService.authorizeNamespace: "may source S emit into namespace N?"
 *   - WorkerRuntime.dispatch: "which registered workers handle event E?" (routing)
 *
 * No commits, no pushes by this module. No secrets handled.
 */
/**
 * ORCA AUTONOMY port (2026-09-18, workstream d, branch feature/orca-autonomy).
 * Reference: worktrees/ping-harvest-12h/ping-runtime/external-agent/
 * (proven live 2026-09-16/17). Port is faithful except:
 *  - AGENT_PROFILES registers the four ORCA dispatcher families
 *    (cloud-subagent, hermes, ollama, copilot identities 1-4) as data.
 *  - Each profile carries status LIVE or PENDING_AUTH. authorizeWorkOrder
 *    denies PENDING_AUTH profiles: a family awaiting a one-time login is
 *    registered but never grantable.
 *  - NAMESPACE_RE prefers the canonicalization authority export when present;
 *    this branch does not export it yet, so the contract pattern is the
 *    fallback (multi-runtime-workorder-contract.md section 2).
 */

const crypto = require('crypto');

// NAMESPACE_RE: prefer the canonicalization authority's export when present.
// This branch's canonicalization_service.js does not export NAMESPACE_RE
// (branch drift vs the reference worktree), so fall back to the contract
// pattern. Never invent a third pattern.
const _canonicalization = require('../canonicalization/canonicalization_service.js');
const NAMESPACE_RE = _canonicalization.NAMESPACE_RE || /^(core|tenant)::[a-z0-9_.-]+$/;

/**
 * Exterior agent profiles. Data, not code. Mirrors the shape of the live
 * CapabilityAuthority agent profiles (/app/gateway/capability_authority.js:185).
 * An agent NOT listed here is unknown -> issuance DENIED (fail-closed).
 *
 * allowedCapabilities: work-order capabilities PING may delegate to this agent.
 * maxConstraints: the loosest constraints PING may grant (stricter is fine).
 * status: 'LIVE' (verified, grantable) or 'PENDING_AUTH' (registered for a
 *   family awaiting a one-time login; authorizeWorkOrder denies it).
 * family: dispatcher family this profile belongs to
 *   (cloud-subagent | hermes | ollama | copilot | codex | opencode).
 */
const AGENT_PROFILES = {
  hermes: {
    transport: 'oneshot-subprocess',
    // Proven live: hermes.exe -z PROMPT --safe-mode -t <toolsets> (Hermes Agent v0.21.2).
    // Windows-native: its working directory is C:\\Users\\nolan; it CANNOT see
    // WSL paths (verified 2026-09-16: FIXTURE.txt unreadable from WSL scratch).
    // Work orders to Hermes must carry input inline, not by file path.
    invocation: 'hermes.exe -z <prompt> --safe-mode -t <toolsets> < /dev/null',
    allowedCapabilities: ['fixture.read', 'text.transform', 'text.summarize'],
    maxConstraints: { read_only: true, no_writes: true, no_network: true },
    notes: 'Free model (openrouter). No quota risk. Toolsets restricted per work order.',
    status: 'LIVE',
    family: 'hermes',
  },
  codex: {
    transport: 'exec-subprocess',
    // Proven: /mnt/c/Users/nolan/.codex/bin/wsl/<id>/codex (ELF, v0.154.0-alpha.6.2)
    // with CODEX_HOME=/mnt/c/Users/nolan/.codex, flags:
    //   exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check
    // BLOCKED_EXTERNAL as of 2026-09-16 20:18 MDT: ChatGPT plan usage limit hit;
    // API error says retry at 2026-09-17 12:01 AM. Do not retry before then.
    invocation: 'codex exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check -C <dir> <prompt>',
    allowedCapabilities: ['fixture.read', 'text.transform', 'text.summarize'],
    maxConstraints: { read_only: true, no_writes: true, no_network: true },
    blockedExternal: { reason: 'ChatGPT plan usage exhausted (observed 2026-09-16).', blockedUntil: '2026-09-17T06:01:00Z' },
    notes: 'Hard OS-level read-only sandbox. Preferred when quota available.',
  },
  opencode: {
    transport: null,
    allowedCapabilities: [],
    blockedExternal: 'No headless CLI on the Pig; only OpenCode.exe desktop (Electron). No safe invocation path.',
  },
  // ORCA AUTONOMY dispatcher families (2026-09-18, workstream d). Data only:
  // no new machinery, no new authority. Registration is what lets
  // authorizeWorkOrder grant these families.
  'cloud-subagent': {
    transport: 'dispatcher-spawn',
    // PRIMARY fleet. The dispatcher spawns an ephemeral, replaceable cloud
    // subagent and embeds the WorkOrder input inline in the dispatch prompt.
    // No cross-environment file-path assumptions: the worker must never be
    // handed WSL/Pig paths it cannot see.
    invocation: 'cloud dispatcher spawn; input inline in dispatch prompt',
    allowedCapabilities: ['orchestration.plan', 'orchestration.review', 'text.transform', 'text.summarize', 'documentation.generate', 'dead_code.analyze', 'test.generate'],
    maxConstraints: { read_only: true, no_writes: true, no_network: true },
    status: 'LIVE',
    family: 'cloud-subagent',
    notes: 'Dispatcher maintains a capability allowlist per deployment. Result envelope returned in the worker final report; result_path stays PING-owned.',
  },
  ollama: {
    transport: 'oneshot-subprocess',
    // Proven live: ~/workspace/bin/prompt-ollama.sh takes the prompt string
    // and prints the result envelope on stdout. Default model
    // qwen2.5-coder:1.5b, ~3s responses. Keep tasks small-model appropriate.
    invocation: '~/workspace/bin/prompt-ollama.sh <prompt>',
    allowedCapabilities: ['text.transform', 'text.summarize', 'documentation.generate', 'dead_code.analyze', 'test.generate'],
    maxConstraints: { read_only: true, no_writes: true, no_network: true },
    status: 'LIVE',
    family: 'ollama',
    notes: 'Fast code/analysis. Evidence should name the model used.',
  },
  // Copilot broker (Pig WSL ~/copilot-broker): four pre-authorized OAuth
  // identities. Anything else fails closed. Quota gating is EXTERNAL to the
  // envelope: the dispatcher checks remaining >= cost + reserve before
  // issuing and fails closed on unknown/stale quota. No quota or credential
  // fields ever enter a WorkOrder.
  identity_1: {
    transport: 'broker-dispatch',
    invocation: 'copilot broker dispatch as identity_1 (piging2); coding task description inline',
    allowedCapabilities: ['test.generate', 'documentation.generate', 'dead_code.analyze'],
    maxConstraints: { read_only: true, no_writes: true, no_network: true },
    status: 'LIVE',
    family: 'copilot',
    notes: 'Evidence must record identityUsed. Broker resolves credentials at the process boundary; never in the WorkOrder.',
  },
  identity_2: {
    transport: 'broker-dispatch',
    invocation: 'copilot broker dispatch as identity_2 (nolangese-sudo); coding task description inline',
    allowedCapabilities: ['test.generate', 'documentation.generate', 'dead_code.analyze'],
    maxConstraints: { read_only: true, no_writes: true, no_network: true },
    status: 'LIVE',
    family: 'copilot',
    notes: 'Evidence must record identityUsed. Broker resolves credentials at the process boundary; never in the WorkOrder.',
  },
  identity_3: {
    transport: 'broker-dispatch',
    invocation: 'copilot broker dispatch as identity_3 (piging1); coding task description inline',
    allowedCapabilities: ['test.generate', 'documentation.generate', 'dead_code.analyze'],
    maxConstraints: { read_only: true, no_writes: true, no_network: true },
    status: 'LIVE',
    family: 'copilot',
    notes: 'Evidence must record identityUsed. Broker resolves credentials at the process boundary; never in the WorkOrder.',
  },
  identity_4: {
    transport: 'broker-dispatch',
    invocation: 'copilot broker dispatch as identity_4 (piging86); coding task description inline',
    allowedCapabilities: ['test.generate', 'documentation.generate', 'dead_code.analyze'],
    maxConstraints: { read_only: true, no_writes: true, no_network: true },
    status: 'LIVE',
    family: 'copilot',
    notes: 'Evidence must record identityUsed. Broker resolves credentials at the process boundary; never in the WorkOrder.',
  },
};

function workOrderId(taskId) {
  return crypto.createHash('sha256').update('workorder:' + taskId).digest('hex').slice(0, 16);
}

/**
 * THE decision this module owns: may PING issue this work order?
 * Fail-closed. Returns {granted:true} or {granted:false, reason}.
 */
function authorizeWorkOrder({ agentId, capability, namespace, constraints }) {
  const profile = AGENT_PROFILES[agentId];
  if (!profile) {
    return { granted: false, reason: `Unknown exterior agent: ${agentId}` };
  }
  if (profile.blockedExternal) {
    const _b = profile.blockedExternal;
    const _until = (typeof _b === 'object' && _b.blockedUntil) ? Date.parse(_b.blockedUntil) : NaN;
    if (Number.isNaN(_until) || Date.now() < _until) {
      const _reason = (typeof _b === 'object' && _b.reason) ? _b.reason : String(_b);
      return { granted: false, reason: `Agent unavailable: ${_reason}` };
    }
  }
  if (profile.status === 'PENDING_AUTH') {
    return { granted: false, reason: `Agent '${agentId}' is registered but pending one-time authorization; not grantable` };
  }
  if (!profile.allowedCapabilities.includes(capability)) {
    return { granted: false, reason: `Capability '${capability}' not allowed for agent '${agentId}'` };
  }
  if (!NAMESPACE_RE.test(namespace || '')) {
    return { granted: false, reason: `Invalid namespace '${namespace}' (must be core::<name> or tenant::<id>)` };
  }
  if (!constraints || typeof constraints !== 'object' || Array.isArray(constraints)) {
    return { granted: false, reason: 'Constraints must be an object' };
  }
  // Constraints may only tighten relative to the profile maximum.
  const max = profile.maxConstraints || {};
  for (const [k, v] of Object.entries(max)) {
    if (v === true && constraints[k] !== true) {
      return { granted: false, reason: `Constraint '${k}' must be true for agent '${agentId}'` };
    }
  }
  if (constraints.no_canonical_events !== true || constraints.no_mission_state_writes !== true) {
    return { granted: false, reason: 'Work order must forbid canonical events and mission-state writes' };
  }
  return { granted: true, agentId, capability, namespace };
}

/**
 * Build (but do not send) a WorkOrder envelope. Throws on authorization denial.
 */
function issueWorkOrder({ agentId, capability, namespace, taskId, missionId, correlationId, contextPackId, input, constraints, resultPath, deadline, causationId, attempt = 1 }) {
  const auth = authorizeWorkOrder({ agentId, capability, namespace, constraints });
  if (!auth.granted) {
    const err = new Error(`Work order denied: ${auth.reason}`);
    err.code = 'WORK_ORDER_DENIED';
    err.reason = auth.reason;
    throw err;
  }
  for (const [field, value] of Object.entries({ taskId, missionId, correlationId, contextPackId, resultPath, deadline })) {
    if (typeof value !== 'string' || value.length === 0) {
      const err = new Error(`Work order denied: ${field} must be a non-empty string`);
      err.code = 'WORK_ORDER_DENIED';
      throw err;
    }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const err = new Error('Work order denied: input must be an object');
    err.code = 'WORK_ORDER_DENIED';
    throw err;
  }
  if (!Number.isFinite(Date.parse(deadline))) {
    const err = new Error('Work order denied: deadline must be an ISO date-time');
    err.code = 'WORK_ORDER_DENIED';
    throw err;
  }
  if (!Number.isInteger(attempt) || attempt < 1) {
    const err = new Error('Work order denied: attempt must be a positive integer');
    err.code = 'WORK_ORDER_DENIED';
    throw err;
  }
  return {
    work_order_id: workOrderId(taskId),
    agent_id: agentId,
    mission_id: missionId,
    task_id: taskId,
    correlation_id: correlationId,
    context_pack_id: contextPackId,
    causation_id: causationId || null,
    attempt,
    principal: 'ping:external-agent-adapter',
    namespace,
    capability,
    input,
    constraints,
    result_path: resultPath,
    deadline,
  };
}

/**
 * Validate a result envelope against RESULT_SCHEMA.json semantics.
 * Returns {valid:true} or {valid:false, reason}. Validation failure is a
 * worker failure with retryable:false (contract section 2.6/2.7).
 */
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function resultIdentity(_result, workOrder) {
  const binding = {
    work_order_id: workOrder.work_order_id,
    mission_id: workOrder.mission_id,
    task_id: workOrder.task_id,
    attempt: workOrder.attempt,
    agent_id: workOrder.agent_id,
    capability: workOrder.capability,
    context_pack_id: workOrder.context_pack_id,
    namespace: workOrder.namespace,
  };
  return crypto.createHash('sha256').update(`external-result:${stableStringify(binding)}`).digest('hex');
}

function invalidResult(reason) {
  return { valid: false, reason, retryable: false };
}

function verifyResultEnvelope(result, workOrder, { invokedAgentId, verifiedAt } = {}) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return invalidResult('Result is not an object');
  if (!workOrder || typeof workOrder !== 'object' || Array.isArray(workOrder)) return invalidResult('Work order is not an object');

  for (const f of ['work_order_id', 'context_pack_id', 'agent_id', 'capability', 'status', 'output', 'evidence', 'error']) {
    if (!(f in result)) return invalidResult(`Missing field: ${f}`);
  }
  for (const f of ['work_order_id', 'context_pack_id', 'agent_id', 'capability', 'deadline']) {
    if (typeof workOrder[f] !== 'string' || workOrder[f].length === 0) return invalidResult(`Invalid work order field: ${f}`);
  }
  for (const f of ['work_order_id', 'context_pack_id', 'agent_id', 'capability', 'status']) {
    if (typeof result[f] !== 'string' || result[f].length === 0) return invalidResult(`Invalid result field: ${f}`);
  }
  if (!result.evidence || typeof result.evidence !== 'object' || Array.isArray(result.evidence)) {
    return invalidResult('evidence must be an object');
  }
  if (result.work_order_id !== workOrder.work_order_id) {
    return invalidResult('work_order_id mismatch (envelope does not match issued work order)');
  }
  if (result.context_pack_id !== workOrder.context_pack_id) {
    return invalidResult('context_pack_id mismatch (result does not match authorized context)');
  }
  if (typeof invokedAgentId !== 'string' || invokedAgentId.length === 0) {
    return invalidResult('invokedAgentId is required for executor binding');
  }
  if (workOrder.agent_id !== invokedAgentId || result.agent_id !== invokedAgentId) {
    return invalidResult('executor mismatch (authorized, invoked, and result agent must match)');
  }
  if (result.capability !== workOrder.capability) {
    return invalidResult('capability mismatch (result does not match authorized capability)');
  }
  if (!['completed', 'failed'].includes(result.status)) {
    return invalidResult(`Invalid status: ${result.status}`);
  }
  if (result.status === 'completed' && (result.output == null || result.error !== null)) {
    return invalidResult('completed result requires non-null output and null error');
  }
  if (result.status === 'failed' && (result.output !== null || result.error == null || result.error === '')) {
    return invalidResult('failed result requires null output and a non-empty error');
  }

  const deadlineMs = Date.parse(workOrder.deadline);
  const verifiedAtMs = Date.parse(verifiedAt);
  if (!Number.isFinite(deadlineMs)) return invalidResult('Work order deadline is invalid');
  if (typeof verifiedAt !== 'string' || !Number.isFinite(verifiedAtMs)) {
    return invalidResult('verifiedAt is required and must be an ISO date-time');
  }
  if (verifiedAtMs > deadlineMs) return invalidResult('Work order deadline exceeded');

  return { valid: true, retryable: false, result_id: resultIdentity(result, workOrder) };
}

/**
 * Verify an exterior result, then ask PING's canonical event authority to record
 * the worker outcome. The exterior process never receives the event runtime.
 */
async function recordVerifiedResult({ eventRuntime, result, workOrder, invokedAgentId, verifiedAt }) {
  const verification = verifyResultEnvelope(result, workOrder, { invokedAgentId, verifiedAt });
  if (!verification.valid) return verification;
  if (!eventRuntime || typeof eventRuntime.emit !== 'function') {
    return invalidResult('PING canonical event runtime is unavailable');
  }

  const eventType = result.status === 'completed' ? 'WORKER_COMPLETED' : 'WORKER_FAILED';
  const emitted = await eventRuntime.emit(
    eventType,
    'worker-runtime:external-agent-adapter',
    {
      mission_id: workOrder.mission_id,
      task_id: workOrder.task_id,
      work_order_id: workOrder.work_order_id,
      context_pack_id: workOrder.context_pack_id,
      result_id: verification.result_id,
      agent_id: workOrder.agent_id,
      capability: workOrder.capability,
      status: result.status,
      output: result.output,
      evidence: result.evidence,
      error: result.error,
    },
    {
      namespace: workOrder.namespace,
      logical_id: verification.result_id,
      correlation_id: workOrder.correlation_id,
      causation_id: workOrder.causation_id,
      metadata: {
        work_order_id: workOrder.work_order_id,
        context_pack_id: workOrder.context_pack_id,
        result_id: verification.result_id,
      },
    }
  );
  if (!emitted || emitted.status !== 'ok') {
    return invalidResult(`Canonical result event rejected: ${emitted?.error || 'unknown error'}`);
  }
  return { ...verification, event_type: eventType, event_id: emitted.eventId, deduplicated: emitted.deduplicated === true };
}

/**
 * Event identity: the adapter holds NO event-identity implementation.
 * Single authority: UnifiedEventRuntime.computeEventId (the spine).
 * The former canonicalEventId mirror was removed 2026-09-17
 * (zero production callers; tests retargeted to the spine function).
 */

module.exports = {
  AGENT_PROFILES,
  workOrderId,
  authorizeWorkOrder,
  issueWorkOrder,
  verifyResultEnvelope,
  resultIdentity,
  recordVerifiedResult,
};
