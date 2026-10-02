/**
 * orca_capability_gate.js — Per-call capability check with tool leases.
 *
 * ADAPT filler (map record 10, ORCA-01 + MCP-M26). The branch's
 * `authorizeWorkOrder` is a correct per-call gate for the *delegation*
 * direction (fail-closed: unknown agent, PENDING_AUTH, blockedExternal,
 * capability allowlist, namespace, tightening constraints), and the live
 * `CapabilityAuthority.authorize` owns the *agent-initiated* direction.
 * This module does NOT reimplement either. It is the lease layer around
 * them, implementing ORCA-01 + the MCP-M26 hardening:
 *
 *  - Tool leases: sha256-hashed Bearer <redacted> scoped to (principal, capability,
 *    scope) with a role and an expiry. Every call validates hash, revocation,
 *    expiry, principal match, capability match, and scope match.
 *  - Authorization is enforced at discovery AND at execution: the authority
 *    is resolved, then RE-RESOLVED immediately before the ALLOW decision is
 *    returned (MCP-M26 re-resolution discipline).
 *  - Default deny. Ambiguous denial: any error, any undecidable state, any
 *    malformed input resolves to DENY, never to ALLOW and never throws
 *    through to the caller. Forbidden tools are indistinguishable from
 *    absent ones (no existence leak in denial reasons beyond the coarse
 *    category).
 *  - No local-process exemption: every call carries its lease; there is no
 *    trusted-caller bypass.
 *  - The grant epoch is returned on every ALLOW for audit logging.
 *
 * Branch wiring: the existing authority is INJECTED, never copied.
 * `adaptBranchAdapter(branchAdapter)` wraps the branch's
 * `external_agent_adapter` (its `authorizeWorkOrder`) into the authority
 * shape this gate expects. A CapabilityAuthority-shaped object
 * (`{ get(capabilityId) }` per ICapabilityAuthority) plugs in directly for
 * the registry direction.
 */

'use strict';

const crypto = require('crypto');

const DECISIONS = Object.freeze({ ALLOW: 'allow', DENY: 'deny' });

const DENY_REASONS = Object.freeze({
  NO_LEASE: 'no_lease',
  UNKNOWN_LEASE: 'unknown_lease',
  BAD_TOKEN: 'bad_token',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  PRINCIPAL_MISMATCH: 'principal_mismatch',
  CAPABILITY_MISMATCH: 'capability_mismatch',
  SCOPE_MISMATCH: 'scope_mismatch',
  ROLE_MISMATCH: 'role_mismatch',
  UNKNOWN_CAPABILITY: 'unknown_capability',
  AUTHORITY_DENIED: 'authority_denied',
  AMBIGUOUS: 'ambiguous',
});

function sha256hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function timingSafeEqHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && ba.length > 0 && crypto.timingSafeEqual(ba, bb);
}

/**
 * Wrap the branch's external_agent_adapter into the authority shape the gate
 * expects. The branch module is passed in (read from its worktree); nothing
 * is copied. Shape: { check(call) -> { granted, reason } }.
 */
function adaptBranchAdapter(branchAdapter) {
  if (!branchAdapter || typeof branchAdapter.authorizeWorkOrder !== 'function') {
    throw new Error('adaptBranchAdapter: branch adapter with authorizeWorkOrder required');
  }
  return {
    kind: 'branch-workorder-adapter',
    check(call) {
      const r = branchAdapter.authorizeWorkOrder({
        agentId: call.agentId,
        capability: call.capabilityId,
        namespace: call.namespace,
        constraints: call.constraints,
      });
      return { granted: r.granted === true, reason: r.granted ? null : r.reason };
    },
  };
}

/**
 * Wrap an ICapabilityAuthority-shaped registry ({ get(capabilityId) }) into
 * the authority shape the gate expects.
 */
function adaptCapabilityRegistry(registry) {
  if (!registry || typeof registry.get !== 'function') {
    throw new Error('adaptCapabilityRegistry: registry with get(capabilityId) required');
  }
  return {
    kind: 'capability-registry',
    check(call) {
      const cap = registry.get(call.capabilityId);
      if (!cap) return { granted: false, reason: 'not registered' };
      return { granted: true, reason: null };
    },
  };
}

/**
 * @param {object} p
 * @param {object} p.authority - from adaptBranchAdapter / adaptCapabilityRegistry.
 * @param {object} p.leaseStore - { getLease(leaseId), isRevoked(leaseId) }.
 * @param {function} [p.now] - () => ISO string, injectable for tests.
 */
function createGate({ authority, leaseStore, now }) {
  if (!authority || typeof authority.check !== 'function') {
    throw new Error('createGate: authority with check(call) required');
  }
  if (!leaseStore || typeof leaseStore.getLease !== 'function' || typeof leaseStore.isRevoked !== 'function') {
    throw new Error('createGate: leaseStore with getLease/isRevoked required');
  }
  const nowFn = now || (() => new Date().toISOString());

  function deny(reason, detail) {
    return { decision: DECISIONS.DENY, reason, detail: detail || null };
  }

  /**
   * Per-call authorization. Never throws for authorization failures: every
   * failure mode resolves to a DENY record (ambiguous denial). Programmer
   * errors (missing gate wiring) throw at createGate time, not here.
   *
   * @param {object} p
   * @param {string} p.leaseId
   * @param {string} p.bearerToken - the raw Bearer <redacted>; only its hash is stored.
   * @param {object} p.call - { principal, capabilityId, scope, role?, agentId?,
   *   namespace?, constraints? } (extra fields pass through to the authority).
   */
  function authorizeCall({ leaseId, bearerToken, call }) {
    try {
      return authorizeCallInner({ leaseId, bearerToken, call });
    } catch (e) {
      // Ambiguous denial: anything undecidable denies. The error is recorded
      // as detail for audit; the decision is still DENY.
      return deny(DENY_REASONS.AMBIGUOUS, String((e && e.message) || e).slice(0, 300));
    }
  }

  function authorizeCallInner({ leaseId, bearerToken, call }) {
    if (!call || typeof call !== 'object') return deny(DENY_REASONS.AMBIGUOUS, 'call malformed');
    // 1. Lease must exist. Default deny: no lease, no call.
    const lease = leaseStore.getLease(leaseId);
    if (!lease) return deny(DENY_REASONS.UNKNOWN_LEASE);
    // 2. Bearer <redacted> hash check (ORCA-01: hash stored, Bearer <redacted> presented per call).
    if (typeof bearerToken !== 'string' || bearerToken.length === 0) return deny(DENY_REASONS.BAD_TOKEN);
    if (!timingSafeEqHex(sha256hex(bearerToken), lease.bearerHash)) return deny(DENY_REASONS.BAD_TOKEN);
    // 3. Expiry.
    if (typeof lease.expiresAt === 'string' && Date.parse(nowFn()) > Date.parse(lease.expiresAt)) {
      return deny(DENY_REASONS.EXPIRED);
    }
    // 4. Revocation, checked at execution (per-call), not just at issuance.
    if (leaseStore.isRevoked(leaseId)) return deny(DENY_REASONS.REVOKED);
    // 5. Principal / capability / scope / role binding.
    if (lease.principal !== call.principal) return deny(DENY_REASONS.PRINCIPAL_MISMATCH);
    if (lease.capabilityId !== call.capabilityId) return deny(DENY_REASONS.CAPABILITY_MISMATCH);
    if (lease.scope !== call.scope) return deny(DENY_REASONS.SCOPE_MISMATCH);
    if (lease.role && call.role && lease.role !== call.role) return deny(DENY_REASONS.ROLE_MISMATCH);
    // 6. Authority resolution at discovery: the EXISTING authority decides.
    const atDiscovery = authority.check(call);
    if (!atDiscovery || atDiscovery.granted !== true) {
      return deny(atDiscovery && atDiscovery.reason ? DENY_REASONS.AUTHORITY_DENIED : DENY_REASONS.UNKNOWN_CAPABILITY,
        atDiscovery ? atDiscovery.reason : null);
    }
    // 7. MCP-M26: re-resolve IMMEDIATELY before execution. A grant revoked or
    //    a profile changed between discovery and execution must fail closed.
    const atExecution = authority.check(call);
    if (!atExecution || atExecution.granted !== true) {
      return deny(DENY_REASONS.AUTHORITY_DENIED, atExecution ? atExecution.reason : 're-resolution failed');
    }
    if (leaseStore.isRevoked(leaseId)) return deny(DENY_REASONS.REVOKED);
    return {
      decision: DECISIONS.ALLOW,
      leaseId,
      capabilityId: call.capabilityId,
      principal: call.principal,
      grantEpoch: lease.issuedAt || null,
    };
  }

  /**
   * MCP-M26 long-handler re-verification: a handler that runs long must
   * re-verify its grant periodically. Same checks as authorizeCall.
   */
  function reverifyCall(args) {
    return authorizeCall(args);
  }

  return { authorizeCall, reverifyCall };
}

/** Mint a lease record (pure constructor; durable issuance belongs to the authority). */
function mintLease({ leaseId, principal, capabilityId, scope, role, bearerToken, issuedAt, expiresAt }) {
  if (!leaseId || !principal || !capabilityId || !scope || !bearerToken) {
    throw new Error('mintLease: leaseId, principal, capabilityId, scope, bearerToken required');
  }
  return Object.freeze({
    leaseId, principal, capabilityId, scope, role: role || null,
    bearerHash: sha256hex(bearerToken),
    issuedAt: issuedAt || new Date().toISOString(),
    expiresAt: expiresAt || null,
  });
}

module.exports = {
  DECISIONS,
  DENY_REASONS,
  createGate,
  adaptBranchAdapter,
  adaptCapabilityRegistry,
  mintLease,
};
