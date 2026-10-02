/**
 * LANE S SPIKE (part 2): principal resolution over resolved capability records.
 *
 * Discovery (detectors.js) answers "what could this business do".
 * This module answers "what may THIS principal be offered", and re-checks
 * at use time. It does NOT create a second authority: every rule below is
 * a projection of an EXISTING PING authority:
 *   - the policy gate in detectors.js (evidence/authorization/safety/owner/conflict),
 *   - src/fyd/ask/capabilities.ts (FORBIDDEN_AGENT_EFFECTS, fail-closed),
 *   - src/lib/ping/types.ts (FydGrant vocabulary),
 *   - lane-K's taxonomy (UNSUPPORTED = the business simply does not offer it).
 *
 * Pure JS, zero deps, no network, no model. Run: node --test spike/
 */
"use strict";

const crypto = require("crypto");

// --- Authority constants (mirrors, not replacements) -----------------------
// src/fyd/ask/capabilities.ts: effects an agent suggestion can NEVER authorize.
const FORBIDDEN_AGENT_EFFECTS = Object.freeze([
  "site.publish",
  "message.send",
  "purchase.make",
  "ad.buy",
  "provider.call",
  "business.mutate",
]);

// lane-T freshness: resolved but older than this is projected "stale".
const STALE_AFTER_MS = 30 * 24 * 3600 * 1000; // 30 days for contact-class capabilities

function sha16(s) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

/** Digest of a record's executable parameters: the TOCTOU anchor. */
function paramsDigest(record) {
  return "sha256:" + sha16(JSON.stringify(record.parameters));
}

/**
 * Enrich a gate-resolved record with the discovery-layer fields principals
 * need: visibility, existence sensitivity, required scope, approval class,
 * effects, reversibility, cost, preconditions. All of these are DATA on the
 * record; the resolution below reads them, it does not invent them.
 */
function finalizeRecord(resolved, opts) {
  const {
    description,
    visibility = "public",            // "public" | "owner"
    existenceSensitivity = "low",     // "low" | "high" (high => generic denials)
    requiredScope = null,             // FydGrant | null
    approvalClass = "auto",           // "auto" | "owner-approval" | "human-approval"
    effects = [],
    reversibility = "presentation-only; offering the affordance changes no world state",
    cost = "none",
  } = opts || {};
  const policyCheckNames = Object.keys(resolved.policy.checks)
    .map((k) => "policy." + k + "." + resolved.policy.checks[k]);
  return {
    ...resolved,
    description: description || (resolved.kind + " via " + resolved.channel),
    visibility,
    existenceSensitivity,
    requiredScope,
    approvalClass,
    effects,
    reversibility,
    cost,
    preconditions: policyCheckNames,
    lastChecked: resolved.policy.decidedAt,
  };
}

/**
 * Resolution for one principal.
 *
 * records: resolved+ registry records (any status; non-resolved are invisible).
 * ctx: {
 *   principal: { id, kind: "owner"|"visitor"|"agent", grants: FydGrant[], isAgent },
 *   contextObjectId,            // the business object the viewer is looking AT
 *   registry,                   // Map(capabilityId -> record), for existence checks
 * }
 *
 * Returns an array of { capabilityId, decision: "granted"|"denied"|"invisible",
 * reason, rule?, record? }. Denials for existence-sensitive capabilities are
 * GENERIC: they never name the capability.
 */
function resolveForPrincipal(records, ctx) {
  const out = [];
  for (const rec of records) {
    // R0: only resolved capabilities are offerable. Candidates are pipeline-
    // internal; withdrawn/need-review are tombstones/queue entries.
    if (rec.status !== "resolved") {
      out.push({ capabilityId: rec.capabilityId, decision: "invisible",
        reason: "status=" + rec.status + ": not offerable" });
      continue;
    }
    // R1: object binding. A capability belongs to its owning object. Reaching
    // business B through a relationship FROM business A does NOT surface B's
    // capabilities in A's context; the traversal yields only a "reference"
    // affordance (a separate, capability-free record).
    if (rec.objectId !== ctx.contextObjectId) {
      out.push({ capabilityId: rec.capabilityId, decision: "invisible",
        reason: "capability is bound to object " + rec.objectId +
          "; relationship traversal does not transfer capabilities",
        rule: "capability.object-binding" });
      continue;
    }
    // R2a: visibility for EXISTENCE-SENSITIVE capabilities is checked before
    // the agent boundary, so a denied agent never learns the capability exists.
    if (rec.visibility === "owner" && ctx.principal.kind !== "owner" &&
        rec.existenceSensitivity === "high") {
      out.push({ capabilityId: rec.capabilityId, decision: "denied",
        reason: "not available to this principal", rule: "visibility.owner.no-leak" });
      continue;
    }
    // R3: the agent boundary (src/fyd/ask/capabilities.ts, fail-closed).
    // Runs before the low-sensitivity visibility check so the agent gets the
    // EXACT policy rule cited; existence here is not sensitive (owner console
    // affordances are generic machinery), so no leak.
    if (ctx.principal.isAgent && rec.requiredScope &&
        FORBIDDEN_AGENT_EFFECTS.includes(rec.requiredScope)) {
      out.push({ capabilityId: rec.capabilityId, decision: "denied",
        reason: "Ask FYD agent boundary: '" + rec.requiredScope +
          "' is never agent-authorized.",
        rule: "agent.forbidden-effect (FORBIDDEN_AGENT_EFFECTS)" });
      continue;
    }
    // R2b: remaining visibility check (low sensitivity: naming is safe).
    if (rec.visibility === "owner" && ctx.principal.kind !== "owner") {
      out.push({ capabilityId: rec.capabilityId, decision: "denied",
        reason: "requires the owning business's owner principal",
        rule: "visibility.owner" });
      continue;
    }
    // R4: grants. A non-null requiredScope must be held by the principal.
    if (rec.requiredScope && !ctx.principal.grants.includes(rec.requiredScope)) {
      out.push({ capabilityId: rec.capabilityId, decision: "denied",
        reason: "requires grant '" + rec.requiredScope + "' which this principal does not hold",
        rule: "grant.missing" });
      continue;
    }
    out.push({ capabilityId: rec.capabilityId, decision: "granted",
      reason: "resolved and principal-authorized", record: rec });
  }
  return out;
}

/**
 * Execution-time guard (TOCTOU defense). Called at USE time, not resolve time:
 * re-reads the registry entry and refuses if the record is no longer resolved
 * or its parameters changed since resolution. Returns { ok: true } or
 * { ok: false, reason, rule }.
 */
function executeGuard(record, registry) {
  const live = registry.get(record.capabilityId);
  if (!live || live.status !== "resolved") {
    return { ok: false,
      reason: "capability " + record.capabilityId + " is not resolved " +
        "(status=" + (live ? live.status : "missing") + "); re-resolution required",
      rule: "execution.recheck-status" };
  }
  if (paramsDigest(live) !== paramsDigest(record)) {
    return { ok: false,
      reason: "capability parameters changed since resolution; re-resolution required",
      rule: "execution.recheck-params" };
  }
  return { ok: true };
}

/**
 * Registry query guard (enumeration defense). Cross-tenant kind queries are
 * business-intelligence harvesting: refused unless the principal holds the
 * admin grant. In-tenant/object-scoped queries are allowed but their results
 * still pass through resolveForPrincipal, so enumeration only ever returns
 * what the principal is individually granted.
 */
function queryCapabilities(registry, query, principal) {
  // query: { tenantId?, objectId?, kind? }
  if (!query.tenantId && !query.objectId) {
    if (!principal.grants.includes("admin")) {
      return { ok: false,
        reason: "cross-tenant capability enumeration requires the admin grant",
        rule: "enumeration.cross-tenant-denied" };
    }
  }
  const records = [];
  for (const rec of registry.values()) {
    if (query.tenantId && rec.tenantId !== query.tenantId) continue;
    if (query.objectId && rec.objectId !== query.objectId) continue;
    if (query.kind && rec.kind !== query.kind) continue;
    records.push(rec);
  }
  return { ok: true, records };
}

/**
 * Re-resolution across an observation refresh. prevRecords: the registry's
 * current records for this object. freshCandidates: detector output on the
 * refreshed observations. Returns the new registry records:
 *   - matched (same capabilityId)        -> resolved again (version+1, supersedes)
 *   - resolved record with no candidate   -> withdrawn (cause observation_absent)
 *   - fresh candidate whose (objectId,kind,channel) matches a WITHDRAWN record
 *     but with DIFFERENT parameters       -> needs_review (value-change velocity
 *     check: a dissimilar value does not auto-resolve; owner review required)
 *   - otherwise                            -> pass the fresh candidate to the gate
 */
function reresolve(prevRecords, freshCandidates, gateFn, gateCtx) {
  const freshById = new Map(freshCandidates.map((c) => [c.capabilityId, c]));
  const next = [];
  for (const prev of prevRecords) {
    if (prev.status !== "resolved") { next.push(prev); continue; }
    const fresh = freshById.get(prev.capabilityId);
    if (fresh) {
      const gated = gateFn(fresh, gateCtx);
      if (gated.status === "resolved") {
        next.push({ ...gated.record,
          version: prev.version + 1,
          lineage: { ...gated.record.lineage, supersedes: prev.capabilityId } });
      } else {
        next.push({ ...prev, status: "withdrawn",
          withdrawal: { cause: "gate_failed_on_refresh", failures: gated.failures,
            at: gateCtx.now, supersedes: null } });
      }
      freshById.delete(prev.capabilityId);
    } else {
      // No fresh candidate: the observation disappeared -> withdrawn, lineage kept.
      next.push({ ...prev, status: "withdrawn",
        withdrawal: { cause: "observation_absent", at: gateCtx.now, supersedes: null } });
    }
  }
  const withdrawnByKind = new Map();
  for (const r of next) {
    if (r.status === "withdrawn") {
      withdrawnByKind.set(r.objectId + "|" + r.kind + "|" + r.channel, r);
    }
  }
  for (const fresh of freshById.values()) {
    const pred = [...withdrawnByKind.values()].find((w) =>
      w.objectId === fresh.objectId &&
      w.kind === fresh.kind && w.channel === fresh.channel);
    const gated = gateFn(fresh, gateCtx);
    if (pred && gated.status === "resolved" &&
        paramsDigest({ parameters: pred.parameters }) !==
        paramsDigest({ parameters: gated.record.parameters })) {
      // Dissimilar value on a previously-withdrawn capability: owner review.
      next.push({ ...gated.record, status: "needs_review",
        review: { cause: "value_changed_since_withdrawal",
          previousDisplayValue: pred.parameters.displayValue, at: gateCtx.now } });
    } else if (gated.status === "resolved") {
      next.push(gated.record);
    } else {
      next.push({ ...fresh, status: "candidate",
        rejection: { failures: gated.failures, at: gateCtx.now } });
    }
  }
  return next;
}

/**
 * Lane-T status projection: resolved -> active | stale (freshness threshold),
 * withdrawn -> vanished. Candidates never leave the discovery layer.
 */
function projectStatus(record, nowMs) {
  if (record.status === "withdrawn") return "vanished";
  if (record.status !== "resolved") return record.status; // never "active"
  const age = nowMs - Date.parse(record.lastChecked);
  return age > STALE_AFTER_MS ? "stale" : "active";
}

module.exports = {
  FORBIDDEN_AGENT_EFFECTS,
  finalizeRecord,
  resolveForPrincipal,
  executeGuard,
  queryCapabilities,
  reresolve,
  projectStatus,
  paramsDigest,
};
