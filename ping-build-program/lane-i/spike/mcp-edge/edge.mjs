// MCP EDGE CORE — protocol-independent security boundary for lane I.
// PURE: no MCP SDK imports here. The SDK owns bytes on the wire; this module
// owns registration gating, per-call authorization, envelopes, proposals,
// and approval binding. PING keeps identity/events/objects/search/proposals;
// the edge translates, never decides.
//
// Rules enforced here (see MCP-EDGE-DESIGN.md section 5):
//  1. no raw DB, 2. no secrets, 3. no shell, 4. no direct canonical mutation,
//  5. no second identity/hash/event authority, 6. results are data, not instructions.
import { createHash } from "node:crypto";
import { z } from "zod";

// ---------------------------------------------------------------- canonical
export function canonical(value) {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => JSON.stringify(k) + ":" + canonical(value[k])).join(",")}}`;
  }
  return JSON.stringify(value);
}
export const sha256 = (s) => createHash("sha256").update(String(s), "utf8").digest("hex");
export const digestOf = (v) => sha256(canonical(v));

// ---------------------------------------------------------------- audit (lane J wiring point)
export const auditLog = [];
export function audit(event) {
  auditLog.push({ at: new Date().toISOString(), ...event });
}

// ---------------------------------------------------------------- live capability store
// Re-read at USE time (lane S TOCTOU rule): resolution is not a license to act later.
export class CapabilityStore {
  constructor(records) {
    this.records = new Map(records.map((r) => [r.capabilityId, structuredClone(r)]));
  }
  get(id) {
    const r = this.records.get(id);
    return r ? structuredClone(r) : null;
  }
  setStatus(id, status) {
    const r = this.records.get(id);
    if (r) r.status = status;
  }
}

// ---------------------------------------------------------------- resolution (lane S contract, R0/R1/R2a/R2b/R4)
const OWNER_GRANTS = ["business.mutate", "business.reports"];
export function resolveForPrincipal(record, { principal, contextObjectId }) {
  const cid = record?.capabilityId ?? null;
  const invisible = (rule) => ({ capabilityId: cid, decision: "invisible", reason: "not available to this principal", rule });
  if (!record || record.status !== "resolved") return invisible("capability.status"); // R0
  if (record.objectId !== contextObjectId) return invisible("capability.object-binding"); // R1
  const isOwner = principal === "owner";
  if (record.requiredPrincipal === "owner" && !isOwner) {
    if (record.existenceSensitivity === "high") {
      // R2a: generic denial; names NOTHING about the capability
      return { capabilityId: null, decision: "denied", reason: "not available to this principal", rule: "visibility.owner.no-leak" };
    }
    return { capabilityId: cid, decision: "denied", reason: "owner-only capability", rule: "visibility.owner" }; // R2b
  }
  if (record.requiredScope) {
    const grants = isOwner ? OWNER_GRANTS : [];
    if (!grants.includes(record.requiredScope)) {
      return { capabilityId: cid, decision: "denied", reason: `missing grant '${record.requiredScope}'`, rule: "grant.missing" }; // R4
    }
  }
  return { capabilityId: cid, decision: "granted", reason: "ok", rule: null };
}

// ---------------------------------------------------------------- description sanitization (RT1)
const INJECTION_PATTERNS = [
  /\b(ignore|disregard|forget)\b[^.!?]{0,80}\b(previous|prior|all)\s+instructions?\b/i,
  /\b(ignore|disregard)\b[^.!?]{0,80}\b(system|policy|safety)\b/i,
  /\byou\s+must\s+(approve|comply|obey|execute|run)\b/i,
  /\bapprove\s+proposal/i,
];
export function sanitizeDescription(desc) {
  const sentences = String(desc ?? "").split(/(?<=[.!?])\s+/);
  const kept = [];
  let redactedCount = 0;
  for (const s of sentences) {
    if (INJECTION_PATTERNS.some((p) => p.test(s))) redactedCount++;
    else kept.push(s);
  }
  const cleaned = kept.join(" ").trim();
  return { cleaned: cleaned || "[description withheld: contained instruction-like text]", redactedCount };
}

// ---------------------------------------------------------------- forbidden registration (hard negatives)
const FORBIDDEN_NAME_FRAGMENTS = /(^|_|-)(db|sql|database|query[_-]?raw|exec|shell|bash|sh|eval|command|secret|token|password|passwd|credential|apikey|api[_-]?key|private[_-]?key)($|_|-)/i;
const FORBIDDEN_ARG_NAME = /secret|token|password|passwd|credential|api[_-]?key|private[_-]?key/i;
const SECRET_VALUE = /\b(sk-live-[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|xox[bap]-[A-Za-z0-9-]+|ghp_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
export class RegistrationRejected extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.code = code;
  }
}
function scanSchemaArgs(shape, path = "") {
  for (const [k, v] of Object.entries(shape)) {
    if (FORBIDDEN_ARG_NAME.test(k)) {
      throw new RegistrationRejected("registry.secret-bearing-argument", `argument '${path}${k}' looks credential-bearing`);
    }
  }
}

// ---------------------------------------------------------------- tool registry
// A tool registers ONLY against a RESOLVED-ONLY lane-S record. The registry
// rejects: forbidden names/args (raw DB, shell, secrets), unresolved records,
// secret values in parameters, duplicate names (impersonation).
export class ToolRegistry {
  constructor(store) {
    this.store = store;
    this.tools = new Map();
  }
  register(def) {
    const { name, description, shape, capabilityId, objectId, handler, route } = def;
    if (this.tools.has(name)) {
      throw new RegistrationRejected("registry.name-conflict", `tool '${name}' is already registered (impersonation attempt?)`);
    }
    if (FORBIDDEN_NAME_FRAGMENTS.test(name)) {
      throw new RegistrationRejected(
        "registry.forbidden-tool",
        `tool '${name}' matches the forbidden list: no raw DB access, no shell, no secret handling at the MCP edge`
      );
    }
    scanSchemaArgs(shape);
    const record = this.store.get(capabilityId);
    if (!record || record.status !== "resolved") {
      throw new RegistrationRejected(
        "registry.unresolved-capability",
        `capability '${capabilityId}' is not resolved (status=${record?.status ?? "missing"}); candidates/withdrawn never register`
      );
    }
    if (SECRET_VALUE.test(JSON.stringify(record.parameters ?? {}))) {
      throw new RegistrationRejected("registry.secret-in-parameters", `capability '${capabilityId}' parameters carry secret-looking values`);
    }
    const { cleaned, redactedCount } = sanitizeDescription(description);
    if (redactedCount > 0) audit({ event: "description.sanitized", tool: name, redactedCount });
    const strictSchema = z.object(shape).strict(); // unknown args are REJECTED, not ignored
    const schemaDigest = digestOf({ name, shape: shapeDigest(shape) });
    const tool = { name, description: cleaned, shape, strictSchema, schemaDigest, capabilityId, objectId, handler, route, kind: record.kind, channel: record.channel };
    this.tools.set(name, tool);
    audit({ event: "tool.registered", tool: name, capabilityId, schemaDigest });
    return tool;
  }
  get(name) {
    return this.tools.get(name) ?? null;
  }
  // Tool discovery is principal-scoped: invisible capabilities never list, and
  // high-sensitivity owner-only capabilities are INVISIBLE to unauthorized
  // principals in every surface including discovery (no-leak). Low-sensitivity
  // denied tools stay listed: their existence is public, only the action is gated.
  listForPrincipal(principal) {
    const out = [];
    for (const tool of this.tools.values()) {
      const record = this.store.get(tool.capabilityId);
      const res = resolveForPrincipal(record, { principal, contextObjectId: tool.objectId });
      if (res.decision === "invisible") continue;
      if (res.decision === "denied" && res.rule === "visibility.owner.no-leak") continue;
      out.push(tool);
    }
    return out;
  }
}
function shapeDigest(shape) {
  const out = {};
  for (const [k, v] of Object.entries(shape)) out[k] = v._def?.typeName ?? "unknown";
  return out;
}

// ---------------------------------------------------------------- sessions
export function createSession(principal, store, opts = {}) {
  return {
    principal, // "owner" | "visitor" — set by the transport at spawn; NEVER from args
    store,
    calls: 0,
    frozen: false,
    rateLimit: Number(opts.rateLimit ?? process.env.EDGE_RATE_LIMIT ?? 300),
    exportBudget: Number(process.env.EDGE_EXPORT_BUDGET ?? 200),
  };
}

// ---------------------------------------------------------------- timeouts
const TOOL_TIMEOUT_MS = Number(process.env.EDGE_TOOL_TIMEOUT_MS ?? 8000);
export function withTimeout(promise, ms = TOOL_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(`tool-timeout after ${ms}ms`), { code: "timeout.tool-timeout" })), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
}

// ---------------------------------------------------------------- envelopes (lane G claim discipline)
const RESULT_ARRAY_CAP = 25;
function capArrays(answer) {
  if (Array.isArray(answer) && answer.length > RESULT_ARRAY_CAP) {
    return { items: answer.slice(0, RESULT_ARRAY_CAP), truncated: true, total: answer.length };
  }
  return answer;
}
function envelopeBase(tool, session, args) {
  return {
    envelope_version: "1",
    tool: tool.name,
    schema_digest: tool.schemaDigest,
    principal: `viewer:${session.principal}`,
    input_digest: digestOf(args),
  };
}
export function grantedEnvelope(tool, session, args, answer, { claims = [], redacted = [] } = {}) {
  const capped = capArrays(answer);
  const env = {
    ...envelopeBase(tool, session, args),
    decision: "granted",
    answer: capped,
    claims,
    evidence_refs: claims.flatMap((c) => c.evidence_refs ?? []),
    redacted,
    result_digest: digestOf({ answer: capped, claims }),
  };
  return env;
}
export function deniedEnvelope(tool, session, args, reason, rule, { leakDetail = false } = {}) {
  const env = {
    ...envelopeBase(tool, session, args),
    decision: "denied",
    denial: leakDetail ? { reason, rule } : { reason: "not available to this principal" },
    result_digest: digestOf({ reason }),
  };
  return env;
}

// ---------------------------------------------------------------- per-call authorization + dispatch
export async function callTool(session, registry, toolName, rawArgs) {
  if (session.frozen) {
    return deniedEnvelope({ name: toolName, schemaDigest: "n/a" }, session, {}, "session frozen after restriction", "rate.session-frozen", { leakDetail: true });
  }
  session.calls++;
  if (session.calls > session.rateLimit) {
    session.frozen = true; // restriction signal drops the session to 0 calls until re-auth
    audit({ event: "session.rate-exceeded", principal: session.principal, calls: session.calls });
    return deniedEnvelope({ name: toolName, schemaDigest: "n/a" }, session, {}, "rate limit exceeded; session frozen", "rate.session-exceeded", { leakDetail: true });
  }
  const tool = registry.get(toolName);
  if (!tool) {
    // No-leak: an unknown name gets the generic denial, nothing about real tools.
    audit({ event: "call.unknown-tool", principal: session.principal, tool: toolName });
    return deniedEnvelope({ name: toolName, schemaDigest: "n/a" }, session, {}, "not available to this principal", "tool.unknown");
  }
  // Confused-deputy defense: the principal ALWAYS comes from the session.
  // Any principal/viewer/role field smuggled in args is deleted, never trusted.
  const args = { ...(rawArgs ?? {}) };
  delete args.principal;
  delete args.viewer;
  delete args.role;
  const parsed = tool.strictSchema.safeParse(args);
  if (!parsed.success) {
    audit({ event: "call.schema-reject", principal: session.principal, tool: toolName });
    return deniedEnvelope(tool, session, args, `invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}`, "schema.invalid-argument", { leakDetail: true });
  }
  // TOCTOU re-check: re-read the LIVE record and re-resolve for the SESSION principal.
  const record = session.store.get(tool.capabilityId);
  const res = resolveForPrincipal(record, { principal: session.principal, contextObjectId: tool.objectId });
  if (res.decision !== "granted") {
    audit({ event: "call.denied", principal: session.principal, tool: toolName, rule: res.rule });
    return deniedEnvelope(tool, session, args, res.reason, res.rule, { leakDetail: res.rule !== "visibility.owner.no-leak" });
  }
  audit({ event: "call.granted", principal: session.principal, tool: toolName });
  const answer = await withTimeout(tool.handler(parsed.data, { session, record, registry }));
  return answer; // handlers return a full envelope
}

// ---------------------------------------------------------------- proposals (lane T binding: approval signs the exact digest)
export const proposalStore = new Map(); // proposal_id -> proposal (spike-local; production: OwnerProposal loop)
export const idempotencyStore = new Map(); // idempotency_key -> { proposal_id, args_digest }
export function draftProposal(tool, session, record, args) {
  const { idempotency_key, ...rest } = args;
  const argsDigest = digestOf(rest);
  if (idempotency_key) {
    const seen = idempotencyStore.get(`${session.principal}:${idempotency_key}`);
    if (seen) {
      if (seen.args_digest === argsDigest) {
        const existing = proposalStore.get(seen.proposal_id);
        audit({ event: "proposal.idempotent-replay", proposal_id: existing.proposal_id });
        return { replayed: true, proposal: existing };
      }
      throw Object.assign(new Error(`idempotency.conflict: key '${idempotency_key}' already used with different arguments`), { code: "idempotency.conflict" });
    }
  }
  const proposalDigest = digestOf({
    tool: tool.name,
    capabilityId: record.capabilityId,
    capabilityDigest: digestOf(record),
    objectId: record.objectId,
    args: rest,
  });
  const proposal = {
    proposal_id: "prop_" + sha256(proposalDigest).slice(0, 12),
    proposal_digest: proposalDigest,
    capability_id: record.capabilityId,
    capability_digest: digestOf(record),
    args: rest,
    status: "drafted",
    drafted_by: `viewer:${session.principal}`,
    drafted_at: new Date().toISOString(),
    approvals: [],
  };
  proposalStore.set(proposal.proposal_id, proposal);
  if (idempotency_key) idempotencyStore.set(`${session.principal}:${idempotency_key}`, { proposal_id: proposal.proposal_id, args_digest: argsDigest });
  audit({ event: "proposal.drafted", proposal_id: proposal.proposal_id, digest: proposalDigest });
  return { replayed: false, proposal };
}
// PROMOTION PATH ONLY — never registered as an MCP tool (design section 3).
// Approval binds the EXACT proposal digest (lane T); single-use; re-resolves first.
export function approveProposal(store, proposalId, approval) {
  const proposal = proposalStore.get(proposalId);
  if (!proposal) throw Object.assign(new Error("approval.unknown-proposal"), { code: "approval.unknown-proposal" });
  if (proposal.status !== "drafted") {
    throw Object.assign(new Error("approval.already-consumed: approvals are single-use"), { code: "approval.already-consumed" });
  }
  if (approval?.approver_principal !== "owner") {
    throw Object.assign(new Error("approval.not-owner: only the owner (or constitutional process) approves"), { code: "approval.not-owner" });
  }
  if (approval?.digest !== proposal.proposal_digest) {
    throw Object.assign(new Error("approval.digest-mismatch: approval does not bind this proposal's exact digest"), { code: "approval.digest-mismatch" });
  }
  // Lane T: execution re-resolves the capability first; vanished/changed => halt.
  const live = store.get(proposal.capability_id);
  if (!live || live.status !== "resolved") {
    throw Object.assign(new Error("approval.stale-capability: capability is no longer resolved"), { code: "approval.stale-capability" });
  }
  if (digestOf(live) !== proposal.capability_digest) {
    throw Object.assign(new Error("approval.capability-changed: capability changed since the proposal was drafted"), { code: "approval.capability-changed" });
  }
  proposal.status = "approved";
  proposal.approvals.push({ by: approval.approver_principal, at: new Date().toISOString() });
  audit({ event: "proposal.approved", proposal_id: proposalId });
  return proposal;
}
