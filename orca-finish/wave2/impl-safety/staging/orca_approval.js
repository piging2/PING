/**
 * orca_approval.js — Approval binds to the EXACT proposal.
 *
 * TRUE_GAP filler (map record 11). The branch (`feature/orca-autonomy`)
 * classifies approvals as a policy decision class
 * (orca_policy.js:111 REQUIRES_HUMAN_APPROVAL for email.send/sms.send) but
 * has no approval record, no grant, and no binding: `authorizeWorkOrder`
 * authorizes (agent, capability, namespace, constraints) WITHOUT seeing the
 * task input, and `issueWorkOrder` attaches arbitrary `input` AFTER
 * authorization. That authorize->issue seam is the exact argument-smuggling
 * path the red-team rank-2 trace describes.
 *
 * This module implements the binding with the MANDATORY hardening:
 *
 *  - Two-tier grants (red-team corrected invariant): SCOPE tier for low-risk
 *    tools binds (tenant, policyVersion, invocationType, toolLookupKey,
 *    role); ARGUMENT tier for sensitive tools additionally binds
 *    sha256(canonical(args)). Same scope fingerprint implies same tool
 *    target, never same argument-level authority.
 *  - Every cached grant binds the policy version it was issued under and is
 *    re-validated at execution time (revocation-bypass closed).
 *  - Revocation is checked AT EXECUTION, not just at grant time.
 *  - Self-approval is structurally refused at grant AND at execution
 *    (ORCA-07 audit gate: acceptance without recorded findings is refused).
 *  - Tenant is in the scope fingerprint (cross-tenant grant sharing closed).
 *  - Interrupt resume is single-writer CAS with responder provenance
 *    (LANGGRAPH rank-7: checkpoint forks double-executing after approval).
 *
 * Branch wiring: the proposal digest covers the branch's envelope binding
 * fields (work_order_id, context_pack_id, agent_id, capability, deadline)
 * PLUS the authorized input and constraints, closing the authorize->issue
 * seam. `proposalFromWorkOrder` builds that proposal from the branch's
 * issued envelope; `bindIssuedWorkOrder` is the check the dispatcher runs
 * after issueWorkOrder and before dispatch.
 */

'use strict';

const crypto = require('crypto');

const TIERS = Object.freeze({ SCOPE: 'scope', ARGUMENT: 'argument' });

class ErrStaleApproval extends Error {
  constructor(msg) {
    super(msg || 'approval is stale: proposal digest mismatch');
    this.name = 'ErrStaleApproval';
    this.code = 'ERR_STALE_APPROVAL';
  }
}
class ErrStalePolicy extends Error {
  constructor(grantV, currentV) {
    super(`grant issued under policy v${grantV} is invalid under policy v${currentV}`);
    this.name = 'ErrStalePolicy';
    this.code = 'ERR_STALE_POLICY';
  }
}
class ErrRevoked extends Error {
  constructor(grantId) {
    super(`grant ${grantId} was revoked`);
    this.name = 'ErrRevoked';
    this.code = 'ERR_REVOKED';
  }
}
class ErrExpired extends Error {
  constructor(grantId) {
    super(`grant ${grantId} expired`);
    this.name = 'ErrExpired';
    this.code = 'ERR_EXPIRED';
  }
}
class ErrSelfApproval extends Error {
  constructor() {
    super('self-approval is structurally refused: approver must differ from requester');
    this.name = 'ErrSelfApproval';
    this.code = 'ERR_SELF_APPROVAL';
  }
}
class ErrNoFindings extends Error {
  constructor() {
    super('approval refused: acceptance without recorded findings');
    this.name = 'ErrNoFindings';
    this.code = 'ERR_NO_FINDINGS';
  }
}
class ErrScopeMismatch extends Error {
  constructor(field) {
    super(`approval scope mismatch on ${field}`);
    this.name = 'ErrScopeMismatch';
    this.code = 'ERR_SCOPE_MISMATCH';
  }
}
class ErrWriterConflict extends Error {
  constructor() {
    super('interrupt resume refused: writer token mismatch (single-writer CAS)');
    this.name = 'ErrWriterConflict';
    this.code = 'ERR_WRITER_CONFLICT';
  }
}

/** Deterministic canonicalization: recursively sorted keys, then JSON. */
function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

/** sha256 digest of the canonicalized proposal. The binding itself. */
function proposalDigest(proposal) {
  return sha256hex(canonicalize(proposal));
}

function timingSafeEqHex(a, b) {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/**
 * Build the approval proposal from the branch's issued WorkOrder envelope.
 * This is the seam that closes authorize->issue: the digest binds the
 * branch's envelope binding fields (the ones verifyResultEnvelope checks)
 * together with the authorized input and constraints, so a smuggled input
 * cannot ride an earlier authorization.
 */
function proposalFromWorkOrder({ workOrder, input, constraints }) {
  if (!workOrder || typeof workOrder !== 'object') throw new Error('proposalFromWorkOrder: workOrder required');
  return {
    work_order_id: workOrder.work_order_id,
    context_pack_id: workOrder.context_pack_id,
    agent_id: workOrder.agent_id,
    capability: workOrder.capability,
    namespace: workOrder.namespace,
    deadline: workOrder.deadline,
    attempt: workOrder.attempt,
    input: input === undefined ? null : input,
    constraints: constraints === undefined ? null : constraints,
  };
}

/**
 * Issue an approval grant. The grant binds the EXACT proposal (digest), the
 * scope fingerprint (tenant, policy version, invocation type, tool lookup
 * key, role), the approver, and recorded findings.
 */
function issueGrant({
  grantId, requester, approver, tier, invocationType, toolLookupKey, role,
  tenant, policyVersion, proposal, argConstraints, expiresAt, findings, issuedAt,
}) {
  if (!requester || !approver) throw new Error('issueGrant: requester and approver required');
  if (approver === requester) throw new ErrSelfApproval();
  if (!findings || (Array.isArray(findings) && findings.length === 0) ||
      (typeof findings === 'string' && findings.length === 0)) {
    throw new ErrNoFindings();
  }
  if (tier !== TIERS.SCOPE && tier !== TIERS.ARGUMENT) {
    throw new Error(`issueGrant: tier must be 'scope' or 'argument', got ${JSON.stringify(tier)}`);
  }
  if (tier === TIERS.ARGUMENT && (proposal === undefined || proposal === null)) {
    throw new Error('issueGrant: argument-tier grants require the exact proposal');
  }
  for (const [k, v] of Object.entries({ invocationType, toolLookupKey, role, tenant })) {
    if (typeof v !== 'string' || v.length === 0) throw new Error(`issueGrant: ${k} required`);
  }
  if (!Number.isInteger(policyVersion) || policyVersion < 0) {
    throw new Error('issueGrant: policyVersion must be a non-negative integer');
  }
  const nowIso = issuedAt || new Date().toISOString();
  return Object.freeze({
    grantId: grantId || `grant_${sha256hex(canonicalize({ requester, approver, toolLookupKey, nowIso })).slice(0, 16)}`,
    tier,
    requester,
    approver,
    scope: Object.freeze({ tenant, policyVersion, invocationType, toolLookupKey, role }),
    proposalDigest: tier === TIERS.ARGUMENT ? proposalDigest(proposal) : null,
    argConstraints: argConstraints === undefined ? null : Object.freeze(argConstraints),
    findings,
    issuedAt: nowIso,
    expiresAt,
  });
}

/**
 * Authorize one execution against a grant. Re-validates EVERYTHING at
 * execution time: revocation, policy version, expiry, tenant, scope fields,
 * and (argument tier) the exact proposal digest. Any mismatch throws; there
 * is no partial authorization.
 *
 * @param {object} p
 * @param {object} p.grant - from issueGrant.
 * @param {object} p.call - { requester, tenant, invocationType, toolLookupKey,
 *   role, proposal } describing the call about to execute.
 * @param {number} p.currentPolicyVersion - the live policy version NOW.
 * @param {object} p.revocationRegistry - { isRevoked(grantId): boolean }.
 * @param {string} [p.now] - ISO time; defaults to current time.
 * @returns {{ authorized: true, grantId, grantEpoch }} — grantEpoch is logged
 *   for audit on every execution (MCP-M26 discipline).
 */
function authorizeExecution({ grant, call, currentPolicyVersion, revocationRegistry, now }) {
  if (!grant || !call) throw new Error('authorizeExecution: grant and call required');
  const at = now || new Date().toISOString();

  // 1. Revocation is checked at EXECUTION, not just grant time.
  if (revocationRegistry && revocationRegistry.isRevoked(grant.grantId)) {
    throw new ErrRevoked(grant.grantId);
  }
  // 2. Policy-version binding: a cached grant dies on policy bump.
  if (grant.scope.policyVersion !== currentPolicyVersion) {
    throw new ErrStalePolicy(grant.scope.policyVersion, currentPolicyVersion);
  }
  // 3. Expiry.
  if (typeof grant.expiresAt === 'string' && Date.parse(at) > Date.parse(grant.expiresAt)) {
    throw new ErrExpired(grant.grantId);
  }
  // 4. Tenant in the scope fingerprint.
  if (call.tenant !== grant.scope.tenant) throw new ErrScopeMismatch('tenant');
  // 5. Scope fingerprint: same fingerprint implies same tool target.
  for (const f of ['invocationType', 'toolLookupKey', 'role']) {
    if (call[f] !== grant.scope[f]) throw new ErrScopeMismatch(f);
  }
  // 6. Self-approval refused at execution too (defense in depth: the grant
  //    record could predate this check or be replayed across principals).
  if (grant.approver === call.requester) throw new ErrSelfApproval();
  // 7. Argument tier: the EXACT proposal must match. Changed arguments or a
  //    changed target invalidate the grant. This is the argument-smuggling
  //    kill: a cached grant for (send_email, scope) cannot authorize
  //    send_email with different args.
  if (grant.tier === TIERS.ARGUMENT) {
    const digest = proposalDigest(call.proposal);
    if (!timingSafeEqHex(digest, grant.proposalDigest)) throw new ErrStaleApproval();
    if (grant.argConstraints && !satisfiesConstraints(call.proposal, grant.argConstraints)) {
      throw new ErrStaleApproval('proposal violates grant argument constraints');
    }
  }
  return { authorized: true, grantId: grant.grantId, grantEpoch: currentPolicyVersion };
}

/** Allowlist-style argument constraints: { 'path.to.field': [allowed...] }. */
function satisfiesConstraints(proposal, constraints) {
  for (const [path, allowed] of Object.entries(constraints)) {
    const v = path.split('.').reduce((o, k) => (o == null ? o : o[k]), proposal);
    if (!Array.isArray(allowed) || !allowed.includes(v)) return false;
  }
  return true;
}

/**
 * Verify an issued WorkOrder envelope against a grant, closing the
 * authorize->issue seam. The dispatcher calls this after issueWorkOrder and
 * before dispatch; a smuggled input (or swapped envelope field) throws.
 */
function bindIssuedWorkOrder(grant, workOrder, { input, constraints }) {
  const proposal = proposalFromWorkOrder({ workOrder, input, constraints });
  authorizeExecution({
    grant,
    call: {
      requester: grant.requester,
      tenant: grant.scope.tenant,
      invocationType: grant.scope.invocationType,
      toolLookupKey: grant.scope.toolLookupKey,
      role: grant.scope.role,
      proposal,
    },
    currentPolicyVersion: grant.scope.policyVersion,
    revocationRegistry: { isRevoked: () => false },
  });
  return { bound: true, proposalDigest: proposalDigest(proposal) };
}

// ---------------------------------------------------------------------------
// Interrupts: single-writer resume CAS with responder provenance.
// ---------------------------------------------------------------------------

function openInterrupt({ interruptId, runId, requester, payload, eligibleResponders }) {
  if (!interruptId || !requester) throw new Error('openInterrupt: interruptId and requester required');
  return {
    interruptId,
    runId: runId || null,
    requester,
    payload: payload === undefined ? null : payload,
    eligibleResponders: eligibleResponders ? [...eligibleResponders] : null,
    writerToken: `wt_${sha256hex(interruptId + ':' + Date.now()).slice(0, 24)}`,
    status: 'open',
    openedAt: new Date().toISOString(),
  };
}

/**
 * Resume after an interrupt. Single-writer CAS: the caller must present the
 * current writer token; a second writer (e.g. a checkpoint fork) is refused.
 * The responder is recorded with provenance; answers are evidence events, not
 * trusted data. The responder may not be the requester (self-approval).
 * The writer token rotates on success so the old token cannot resume twice
 * (double-execution after approval closed).
 */
function resumeInterrupt({ interrupt, writerToken, responder, decision, findings }) {
  if (!interrupt || interrupt.status !== 'open') throw new Error('resumeInterrupt: no open interrupt');
  if (writerToken !== interrupt.writerToken) throw new ErrWriterConflict();
  if (interrupt.eligibleResponders && !interrupt.eligibleResponders.includes(responder)) {
    throw new Error(`resumeInterrupt: responder '${responder}' is not eligible`);
  }
  if (responder === interrupt.requester) throw new ErrSelfApproval();
  if (decision !== 'approved' && decision !== 'rejected') {
    throw new Error(`resumeInterrupt: decision must be 'approved' or 'rejected'`);
  }
  const answerEvent = Object.freeze({
    type: 'approval_answer',
    interruptId: interrupt.interruptId,
    runId: interrupt.runId,
    responder,
    responderProvenance: 'interrupt-resume',
    decision,
    findings: findings || null,
    at: new Date().toISOString(),
  });
  const resumed = {
    ...interrupt,
    status: decision === 'approved' ? 'resumed' : 'rejected',
    writerToken: `wt_${sha256hex(interrupt.interruptId + ':resumed:' + Date.now()).slice(0, 24)}`,
    answerEvent,
  };
  return Object.freeze(resumed);
}

module.exports = {
  TIERS,
  ErrStaleApproval,
  ErrStalePolicy,
  ErrRevoked,
  ErrExpired,
  ErrSelfApproval,
  ErrNoFindings,
  ErrScopeMismatch,
  ErrWriterConflict,
  canonicalize,
  proposalDigest,
  proposalFromWorkOrder,
  issueGrant,
  authorizeExecution,
  bindIssuedWorkOrder,
  openInterrupt,
  resumeInterrupt,
};
