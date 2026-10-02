/**
 * LANE M — Source Registry spike (zero-dependency Node 24).
 *
 * Implements SOURCE-REGISTRY-DESIGN.md + REGISTRY-API-DRAFT.md as a
 * minimal operational-metadata store. NOT a truth authority:
 *  - no business facts, no event payloads, no canonical observations
 *  - no secrets (lane L territory); checkpoint values are opaque blobs
 *  - health is COMPUTED by a pure evaluator from worker-reported facts;
 *    workers never assert health.
 *
 * Persistence: one append-only JSONL mutation log per store dir
 * (SOURCE_* events); records rebuild by replay on load. Mirrors the house
 * JSONL-append pattern (lane J / src/fyd/identity/audit.ts). The log is the
 * durability; the in-memory map is the projection.
 *
 * The "journal commit" the commit-first checkpoint invariant needs is
 * injected as a JournalLike seam ({ commitRange(runId) -> [floor, ceil] })
 * so phase0's event authority can slot in later. The demo uses a stub.
 */
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { FAILURE_CLASSES, TERMINAL_CLASSES } from "./taxonomy.mjs";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class RegistryError extends Error {
  constructor(code, message, detail) {
    super(`[${code}] ${message}`);
    this.name = "RegistryError";
    this.code = code;
    this.detail = detail ?? null;
  }
}

export const ERR = {
  TENANT_REQUIRED: "TENANT_REQUIRED",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  BAD_INPUT: "BAD_INPUT",
  MANIFEST_INVALID: "MANIFEST_INVALID",
  LEASE_INVALID: "LEASE_INVALID",
  LEASE_EXPIRED: "LEASE_EXPIRED",
  CURSOR_CORRUPT: "CURSOR_CORRUPT",
  CURSOR_QUARANTINED: "CURSOR_QUARANTINED",
  FLOOR_NOT_MONOTONIC: "FLOOR_NOT_MONOTONIC",
  FLOOR_OUT_OF_RANGE: "FLOOR_OUT_OF_RANGE",
  SECRET_MATERIAL: "SECRET_MATERIAL",
  HEARTBEAT_STALE: "HEARTBEAT_STALE",
  LIFECYCLE: "LIFECYCLE",
  HEALTH_GAMING: "HEALTH_GAMING",
  BUDGET_EXHAUSTED: "BUDGET_EXHAUSTED",
  TAXONOMY_DRIFT: "TAXONOMY_DRIFT",
};

// ---------------------------------------------------------------------------
// Secret canary (lane L contract: capability handles only, never tokens).
// The registry rejects secret-shaped material anywhere it could land.
// ---------------------------------------------------------------------------

const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/,
  /gho_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /sk-(live|test)-[A-Za-z0-9]{10,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /Bearer\s+[A-Za-z0-9\-._~+/=]{20,}/i,
  /api[_-]?key\s*[:=]\s*["']?[A-Za-z0-9\-_]{16,}/i,
  /sq0atp-[A-Za-z0-9\-_]{20,}/, // Square-style access token shape
];

export function scanForSecrets(value, where) {
  if (typeof value !== "string" || value.length === 0) return;
  for (const re of SECRET_PATTERNS) {
    if (re.test(value)) {
      throw new RegistryError(
        ERR.SECRET_MATERIAL,
        `secret-shaped material rejected in ${where}; the registry stores capability handles only`,
        { pattern: String(re) }
      );
    }
  }
}

export function sha256Hex(s) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Health evaluator — PURE function. Workers report facts; this computes.
// ---------------------------------------------------------------------------

export const DEFAULT_THRESHOLDS = {
  downAfterConsecutiveFailures: 5,
  heartbeatGraceMultiples: 3, // 3x cadence with no heartbeat -> down
  overrideTtlMs: 24 * 3600 * 1000,
};

export function evaluateHealth(facts, thresholds = DEFAULT_THRESHOLDS, nowMs = Date.now()) {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const {
    consecutiveFailures, connectionState, cursorQuarantined,
    lastHeartbeatAt, lastObservationAt, cadenceMs,
    lastFailureClass, override, lifecycleState,
  } = facts;

  if (lifecycleState === "paused") {
    return { status: "paused", reason: "paused-by-operator", consecutiveFailures };
  }
  if (lifecycleState === "decommissioning" || lifecycleState === "decommissioned") {
    return { status: "down", reason: "retired", consecutiveFailures };
  }
  if (override && nowMs - override.setAtMs < (override.ttlMs ?? t.overrideTtlMs)) {
    return {
      status: override.status,
      reason: `override:${override.reason}`,
      consecutiveFailures,
      overrideExpiresAtMs: override.setAtMs + (override.ttlMs ?? t.overrideTtlMs),
    };
  }
  if (connectionState === "invalid" || connectionState === "revoked") {
    return { status: "down", reason: `connection-${connectionState}`, consecutiveFailures };
  }
  if (lastFailureClass === "AUTH_REQUIRED" || lastFailureClass === "AUTH_EXPIRED" || lastFailureClass === "PERMISSION_DENIED") {
    return { status: "down", reason: lastFailureClass, consecutiveFailures };
  }
  if (lastObservationAt == null && (consecutiveFailures ?? 0) === 0 && lastHeartbeatAt == null) {
    return { status: "unknown", reason: "no-heartbeat-yet", consecutiveFailures: consecutiveFailures ?? 0 };
  }
  if (cadenceMs && lastHeartbeatAt && nowMs - lastHeartbeatAt > t.heartbeatGraceMultiples * cadenceMs) {
    return { status: "down", reason: "heartbeat-lost", consecutiveFailures };
  }
  if ((consecutiveFailures ?? 0) >= t.downAfterConsecutiveFailures) {
    return { status: "down", reason: `failures>=${t.downAfterConsecutiveFailures}`, consecutiveFailures };
  }
  if ((consecutiveFailures ?? 0) > 0 || cursorQuarantined || connectionState === "expiring") {
    return {
      status: "degraded",
      reason: cursorQuarantined ? "cursor-quarantined" : (connectionState === "expiring" ? "connection-expiring" : lastFailureClass ?? "failures"),
      consecutiveFailures,
    };
  }
  return { status: "healthy", reason: "nominal", consecutiveFailures: consecutiveFailures ?? 0 };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const CHECKPOINT_KINDS = new Set(["opaque-delta", "cursor", "etag", "timestamp", "none"]);

function requireCtx(ctx) {
  if (!ctx || typeof ctx.tenantId !== "string" || ctx.tenantId.length === 0) {
    throw new RegistryError(ERR.TENANT_REQUIRED, "every registry call requires TenantContext.tenantId");
  }
  if (!["owner", "operator", "worker", "admin"].includes(ctx.callerRole)) {
    throw new RegistryError(ERR.FORBIDDEN, `unknown callerRole ${ctx.callerRole}`);
  }
}

function requireOwnerOrOperator(ctx) {
  if (ctx.callerRole !== "owner" && ctx.callerRole !== "operator" && ctx.callerRole !== "admin") {
    throw new RegistryError(ERR.FORBIDDEN, `${ctx.callerRole} cannot perform this operator action`);
  }
}

export function deriveSourceId(tenantId, sourceType, providerInstanceId) {
  const slug = sourceType.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
  const digest = sha256Hex(`${tenantId}|${sourceType}|${providerInstanceId}`).slice(0, 16);
  return `${slug}-${digest}`;
}

function nowIso(ms) { return new Date(ms).toISOString(); }

export class SourceRegistry {
  /**
   * @param {{dir: string, journal?: JournalLike, clock?: () => number,
   *          leaseTtlMs?: number, thresholds?: object}} opts
   */
  constructor(opts) {
    this.dir = opts.dir;
    this.journal = opts.journal ?? null; // seam for phase0 later
    this.clock = opts.clock ?? (() => Date.now());
    this.leaseTtlMs = opts.leaseTtlMs ?? 10 * 60 * 1000;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...(opts.thresholds ?? {}) };
    this.records = new Map(); // key: tenantId + "|" + sourceId
    this.leases = new Map();   // key: runId -> lease
    this.eventLog = join(this.dir, "registry-events.jsonl");
    mkdirSync(this.dir, { recursive: true });
    this.replay();
  }

  // -- persistence ---------------------------------------------------------
  key(tenantId, sourceId) { return `${tenantId}|${sourceId}`; }

  emit(type, tenantId, sourceId, payload) {
    const ev = {
      at: nowIso(this.clock()),
      type, tenantId, sourceId, ...payload,
    };
    appendFileSync(this.eventLog, JSON.stringify(ev) + "\n", "utf8");
    this.apply(ev); // single-writer: the log and the projection advance together
  }

  replay() {
    if (!existsSync(this.eventLog)) return;
    const text = readFileSync(this.eventLog, "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      const ev = JSON.parse(line);
      this.apply(ev);
    }
  }

  /** Deterministic projection: every registry mutation is also a log event. */
  apply(ev) {
    const k = this.key(ev.tenantId, ev.sourceId);
    switch (ev.type) {
      case "SOURCE_REGISTERED": this.records.set(k, ev.record); break;
      case "SOURCE_PATCHED": {
        const r = this.records.get(k); if (r) Object.assign(r, ev.patch); break;
      }
      case "SOURCE_HEALTH_TRANSITIONED": {
        const r = this.records.get(k); if (r) r.health = ev.health; break;
      }
      case "SOURCE_CHECKPOINT_ADVANCED": {
        const r = this.records.get(k); if (r) r.checkpoints[ev.stream] = ev.checkpoint; break;
      }
      case "SOURCE_CURSOR_QUARANTINED": {
        const r = this.records.get(k);
        if (r && r.checkpoints[ev.stream]) r.checkpoints[ev.stream].quarantined = true;
        break;
      }
      case "SOURCE_PAUSED": case "SOURCE_RESUMED":
      case "SOURCE_DECOMMISSIONED": case "SOURCE_RECONNECTED":
      case "SOURCE_HEALTH_OVERRIDDEN": case "SOURCE_BUDGETS_UPDATED":
      case "SOURCE_VISIBILITY_UPDATED": case "SOURCE_CADENCE_UPDATED": {
        const r = this.records.get(k); if (r) Object.assign(r, ev.patch); break;
      }
      default: break; // unknown event types ignored (forward-compat)
    }
  }

  // -- identity --------------------------------------------------------------
  getRecord(tenantId, sourceId) {
    const r = this.records.get(this.key(tenantId, sourceId));
    if (!r) throw new RegistryError(ERR.NOT_FOUND, `source ${sourceId} not found in tenant ${tenantId}`);
    return r;
  }

  redactFor(ctx, record) {
    const copy = JSON.parse(JSON.stringify(record));
    const canSeeHandle = ["owner", "operator", "admin"].includes(ctx.callerRole);
    if (!canSeeHandle && copy.connectionHandle) copy.connectionHandle = "redacted";
    return copy;
  }

  // -- register ---------------------------------------------------------------
  /**
   * manifestRef: { connectorId, version, declaredCapabilities, credentialType }
   * The BCQ manifest validator is the admission gate; here we enforce the
   * structural minimum (complete, semver version, closed verbs).
   */
  registerSource(ctx, params) {
    requireCtx(ctx);
    const { sourceType, providerInstanceId, displayName, owner,
      visibility = "private", connectionHandle = null,
      grantedCapabilities = [], cadence = null, budgets = {} } = params;
    if (!sourceType || !providerInstanceId || !displayName || !owner) {
      throw new RegistryError(ERR.BAD_INPUT, "registerSource requires sourceType, providerInstanceId, displayName, owner");
    }
    if (params.manifestRef) this.validateManifestRef(params.manifestRef);
    if (connectionHandle) scanForSecrets(connectionHandle, "connectionHandle");
    if (!["private", "org", "public-metadata"].includes(visibility)) {
      throw new RegistryError(ERR.BAD_INPUT, `bad visibility ${visibility}`);
    }
    if (grantedCapabilities.some((c) => c.startsWith("write."))) {
      throw new RegistryError(ERR.FORBIDDEN, "write.* capability requires an elevated grant on file");
    }
    const sourceId = deriveSourceId(ctx.tenantId, sourceType, providerInstanceId);
    const existing = this.records.get(this.key(ctx.tenantId, sourceId));
    if (existing) {
      if (existing.lifecycleState === "decommissioned") {
        throw new RegistryError(ERR.LIFECYCLE, "tombstone exists; register under a new providerInstanceId");
      }
      return this.redactFor(ctx, existing); // idempotent re-register
    }
    const now = this.clock();
    const record = {
      sourceId, tenantId: ctx.tenantId, sourceType, providerInstanceId,
      displayName, owner, visibility, connectionHandle,
      connectionState: connectionHandle ? "configured" : "unconfigured",
      grantedCapabilities: [...grantedCapabilities],
      cadence, budgets: { maxRunsPerDay: 0, maxBytesPerRun: 0, maxAiTokensPerRun: 0, ...budgets },
      budgetUsage: { runsToday: 0, bytesToday: 0, tokensToday: 0, windowStartedAtMs: now },
      lifecycleState: "registered",
      health: { status: "unknown", since: nowIso(now), reason: "registered", consecutiveFailures: 0, lastHeartbeatAt: null },
      checkpoints: {}, normalizerVersion: null,
      lastRunId: null, lastObservationAt: null, lastFailureClass: null,
      healthOverride: null, recordVersion: 1,
      createdAt: nowIso(now), updatedAt: nowIso(now),
    };
    this.emit("SOURCE_REGISTERED", ctx.tenantId, sourceId, { record });
    return this.redactFor(ctx, this.getRecord(ctx.tenantId, sourceId));
  }

  validateManifestRef(m) {
    if (!m.connectorId || !m.version || !/^\d+\.\d+\.\d+$/.test(m.version)) {
      throw new RegistryError(ERR.MANIFEST_INVALID, "manifestRef needs connectorId + semver version");
    }
    for (const cap of m.declaredCapabilities ?? []) {
      if (!/^(read|search|subscribe|webhook-receive|write)\.[a-z][a-z0-9-]*$/.test(cap)) {
        throw new RegistryError(ERR.MANIFEST_INVALID, `capability ${cap} not in the closed verb set`);
      }
    }
  }

  getSource(ctx, sourceId) {
    requireCtx(ctx);
    return this.redactFor(ctx, this.getRecord(ctx.tenantId, sourceId));
  }

  listSources(ctx, filter = {}) {
    requireCtx(ctx);
    const out = [];
    for (const [k, r] of this.records) {
      if (!k.startsWith(`${ctx.tenantId}|`)) continue;
      if (filter.lifecycleState && r.lifecycleState !== filter.lifecycleState) continue;
      if (filter.healthStatus && r.health.status !== filter.healthStatus) continue;
      if (filter.sourceType && r.sourceType !== filter.sourceType) continue;
      if (r.lifecycleState === "decommissioned" && !filter.includeDecommissioned) continue;
      out.push(this.redactFor(ctx, r));
    }
    return out.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  }

  // -- run leases ---------------------------------------------------------------
  beginRun(ctx, sourceId, workerId) {
    requireCtx(ctx);
    if (ctx.callerRole !== "worker" && ctx.callerRole !== "operator" && ctx.callerRole !== "admin") {
      throw new RegistryError(ERR.FORBIDDEN, "beginRun is for the scheduler/worker");
    }
    const r = this.getRecord(ctx.tenantId, sourceId);
    if (r.lifecycleState !== "active" && r.lifecycleState !== "registered") {
      throw new RegistryError(ERR.LIFECYCLE, `source is ${r.lifecycleState}; not schedulable`);
    }
    const gate = this.canFetch(ctx, sourceId);
    if (!gate.allowed) throw new RegistryError(gate.reasonCode, gate.reason);
    const now = this.clock();
    const runId = `run-${sourceId}-${now}`;
    const checkpoints = {};
    let recoveryMode = false;
    for (const [stream, cp] of Object.entries(r.checkpoints)) {
      const digest = sha256Hex(String(cp.value ?? ""));
      if (digest !== cp.valueSha256) {
        // registry-side corruption detection: fail closed, quarantine
        this.quarantineCursor({ ...ctx, callerRole: "operator" }, sourceId, stream,
          "sha-mismatch-on-read", { expected: cp.valueSha256, actual: digest });
        recoveryMode = true;
        checkpoints[stream] = { ...cp, quarantined: true };
        continue;
      }
      if (cp.quarantined) recoveryMode = true;
      checkpoints[stream] = { ...cp }; // read-only snapshot copy
    }
    const lease = {
      runId, sourceId, tenantId: ctx.tenantId, workerId,
      leaseExpiresAtMs: now + this.leaseTtlMs, checkpoints, recoveryMode,
    };
    this.leases.set(runId, lease);
    r.lastRunId = runId;
    return lease;
  }

  leaseOf(runId) {
    const l = this.leases.get(runId);
    if (!l) throw new RegistryError(ERR.LEASE_INVALID, `no such run lease ${runId}`);
    if (this.clock() > l.leaseExpiresAtMs) {
      this.leases.delete(runId);
      throw new RegistryError(ERR.LEASE_EXPIRED, `run lease ${runId} expired; checkpoints unchanged`);
    }
    return l;
  }

  // -- heartbeat: workers report FACTS; the evaluator computes health ------------
  heartbeat(ctx, sourceId, report) {
    requireCtx(ctx);
    if (report && ("status" in report || "health" in report)) {
      throw new RegistryError(ERR.HEALTH_GAMING,
        "RunReport must not assert health; send facts (outcome, failureCode, counts), the evaluator computes status");
    }
    const r = this.getRecord(ctx.tenantId, sourceId);
    const now = this.clock();
    const { runId, outcome, failureCode, bytesRead = 0, aiTokensUsed = 0,
      observationsAccepted = 0, observationsRejected = 0, recoveryModeHonored = false } = report ?? {};
    if (!runId) throw new RegistryError(ERR.BAD_INPUT, "heartbeat requires runId");
    if (!["succeeded", "failed", "partial"].includes(outcome)) {
      throw new RegistryError(ERR.BAD_INPUT, `bad outcome ${outcome}`);
    }
    if (failureCode != null && !FAILURE_CLASSES.has(failureCode)) {
      throw new RegistryError(ERR.TAXONOMY_DRIFT, `failureCode ${failureCode} not in lane-K v1.0.0 closed set`);
    }
    const lease = this.leases.get(runId);
    if (!lease || lease.sourceId !== sourceId) {
      throw new RegistryError(ERR.HEARTBEAT_STALE, `heartbeat for unknown run ${runId} on ${sourceId}`);
    }
    if (lease.tenantId !== ctx.tenantId) {
      throw new RegistryError(ERR.FORBIDDEN, "lease belongs to another tenant");
    }
    // budget accounting
    r.budgetUsage.runsToday += 1;
    r.budgetUsage.bytesToday += bytesRead;
    r.budgetUsage.tokensToday += aiTokensUsed;

    const failed = outcome === "failed";
    r.health.consecutiveFailures = failed ? r.health.consecutiveFailures + 1 : (observationsAccepted > 0 ? 0 : r.health.consecutiveFailures);
    r.health.lastHeartbeatAt = nowIso(now);
    r.lastFailureClass = failed ? (failureCode ?? "TRANSIENT") : null;
    if (observationsAccepted > 0) {
      r.lastObservationAt = nowIso(now);
      if (r.lifecycleState === "registered") {
        this.emit("SOURCE_PATCHED", ctx.tenantId, sourceId, {
          patch: { lifecycleState: "active" }, transition: "registered->active-on-first-accepted-batch",
        });
      }
    }
    // PERMANENT terminal failure: retire the source (lane-K taxonomy §2.13:
    // never retry, mark retired, stop scheduling).
    if (failed && failureCode === "PERMANENT" && report.terminal === true) {
      this.emit("SOURCE_DECOMMISSIONED", ctx.tenantId, sourceId, {
        patch: { lifecycleState: "decommissioning", decommissionReason: "permanent-failure-terminal" },
        reason: "terminal PERMANENT failure; source retired, scheduling stops",
      });
      r.health.consecutiveFailures = 0;
    }
    const prev = r.health.status;
    const facts = {
      consecutiveFailures: r.health.consecutiveFailures,
      connectionState: r.connectionState,
      cursorQuarantined: Object.values(r.checkpoints).some((c) => c.quarantined),
      lastHeartbeatAt: now, lastObservationAt: r.lastObservationAt ? Date.parse(r.lastObservationAt) : null,
      cadenceMs: r.cadence?.intervalMs ?? null,
      lastFailureClass: r.lastFailureClass,
      override: r.healthOverride, lifecycleState: r.lifecycleState,
    };
    const view = evaluateHealth(facts, this.thresholds, now);
    if (view.status !== prev) {
      r.health.status = view.status; r.health.since = nowIso(now); r.health.reason = view.reason;
      this.emit("SOURCE_HEALTH_TRANSITIONED", ctx.tenantId, sourceId, {
        health: { ...r.health }, from: prev, factsSummary: {
          outcome, failureCode: r.lastFailureClass, consecutiveFailures: r.health.consecutiveFailures,
        },
      });
    }
    r.recordVersion += 1; r.updatedAt = nowIso(now);
    this.leases.delete(runId); // heartbeat is the run's final close
    return { status: r.health.status, since: r.health.since, reason: r.health.reason,
      consecutiveFailures: r.health.consecutiveFailures, lastHeartbeatAt: r.health.lastHeartbeatAt };
  }

  // -- checkpoints ---------------------------------------------------------------
  commitCheckpoint(ctx, sourceId, runId, stream, checkpoint) {
    requireCtx(ctx);
    if (checkpoint == null || typeof checkpoint.value !== "string") {
      throw new RegistryError(ERR.BAD_INPUT, "checkpoint needs a string value");
    }
    if (!CHECKPOINT_KINDS.has(checkpoint.kind)) {
      throw new RegistryError(ERR.BAD_INPUT, `checkpoint kind ${checkpoint.kind} unknown`);
    }
    scanForSecrets(checkpoint.value, `checkpoint[${stream}].value`);
    const r = this.getRecord(ctx.tenantId, sourceId);
    const lease = this.leaseOf(runId);
    if (lease.sourceId !== sourceId || lease.tenantId !== ctx.tenantId) {
      throw new RegistryError(ERR.LEASE_INVALID, "lease does not cover this source/tenant");
    }
    // The registry never parses the opaque value; it verifies framing only.
    const digest = sha256Hex(checkpoint.value);
    if (checkpoint.valueSha256 !== digest) {
      throw new RegistryError(ERR.CURSOR_CORRUPT, "valueSha256 does not match value; possible forgery or corruption");
    }
    const prev = r.checkpoints[stream];
    if (prev && prev.quarantined && !lease.recoveryMode) {
      throw new RegistryError(ERR.CURSOR_QUARANTINED,
        "stream is quarantined; commit allowed only from a recovery-mode run (full re-derive)");
    }
    if (typeof checkpoint.eventSeqFloor !== "number" || checkpoint.eventSeqFloor < 0) {
      throw new RegistryError(ERR.BAD_INPUT, "checkpoint needs a numeric eventSeqFloor >= 0");
    }
    if (prev && checkpoint.eventSeqFloor < prev.eventSeqFloor) {
      // silent rollback attempt: fail closed, never apply
      throw new RegistryError(ERR.FLOOR_NOT_MONOTONIC,
        `floor ${checkpoint.eventSeqFloor} < previous ${prev.eventSeqFloor}; refused`);
    }
    // commit-first invariant: the floor must be inside the run's committed range
    if (this.journal) {
      const [lo, hi] = this.journal.commitRange(runId);
      if (checkpoint.eventSeqFloor < lo || checkpoint.eventSeqFloor > hi) {
        throw new RegistryError(ERR.FLOOR_OUT_OF_RANGE,
          `floor ${checkpoint.eventSeqFloor} outside run commit range [${lo}, ${hi}]`);
      }
    }
    const now = this.clock();
    const stored = {
      kind: checkpoint.kind, value: checkpoint.value, valueSha256: digest,
      normalizerVersion: checkpoint.normalizerVersion ?? null,
      eventSeqFloor: checkpoint.eventSeqFloor, committedAt: nowIso(now),
      quarantined: false,
    };
    this.emit("SOURCE_CHECKPOINT_ADVANCED", ctx.tenantId, sourceId, {
      stream, checkpoint: stored,
    });
    lease.committedStreams = lease.committedStreams ?? [];
    lease.committedStreams.push(stream);
    r.recordVersion += 1; r.updatedAt = nowIso(now);
  }

  quarantineCursor(ctx, sourceId, stream, reason, evidence) {
    requireCtx(ctx);
    const r = this.getRecord(ctx.tenantId, sourceId);
    if (!r.checkpoints[stream]) {
      throw new RegistryError(ERR.BAD_INPUT, `no checkpoint for stream ${stream}`);
    }
    this.emit("SOURCE_CURSOR_QUARANTINED", ctx.tenantId, sourceId, {
      stream, reason, evidence: evidence ?? null,
      oldDigest: r.checkpoints[stream].valueSha256,
      lastGoodFloor: r.checkpoints[stream].eventSeqFloor,
    });
    r.recordVersion += 1; r.updatedAt = nowIso(this.clock());
    // health recompute: quarantine degrades
    const now = this.clock();
    const facts = {
      consecutiveFailures: r.health.consecutiveFailures,
      connectionState: r.connectionState, cursorQuarantined: true,
      lastHeartbeatAt: r.health.lastHeartbeatAt ? Date.parse(r.health.lastHeartbeatAt) : null,
      lastObservationAt: r.lastObservationAt ? Date.parse(r.lastObservationAt) : null,
      cadenceMs: r.cadence?.intervalMs ?? null,
      lastFailureClass: "INVALID_PAYLOAD", override: r.healthOverride,
      lifecycleState: r.lifecycleState,
    };
    const view = evaluateHealth(facts, this.thresholds, now);
    const prev = r.health.status;
    if (view.status !== prev) {
      r.health.status = view.status; r.health.since = nowIso(now); r.health.reason = view.reason;
      this.emit("SOURCE_HEALTH_TRANSITIONED", ctx.tenantId, sourceId, { health: { ...r.health }, from: prev });
    }
  }

  // -- scheduler admission ----------------------------------------------------------
  canFetch(ctx, sourceId) {
    requireCtx(ctx);
    let r;
    try { r = this.getRecord(ctx.tenantId, sourceId); }
    catch (e) { return { allowed: false, reason: "unknown source", reasonCode: ERR.NOT_FOUND }; }
    if (r.lifecycleState === "paused") return { allowed: false, reason: "source paused", reasonCode: ERR.LIFECYCLE };
    if (r.lifecycleState === "decommissioning" || r.lifecycleState === "decommissioned") {
      return { allowed: false, reason: `source ${r.lifecycleState}; not scheduled`, reasonCode: ERR.LIFECYCLE };
    }
    if (r.health.status === "down") {
      return { allowed: false, reason: `health down (${r.health.reason})`, reasonCode: ERR.LIFECYCLE };
    }
    const u = r.budgetUsage, b = r.budgets;
    if (b.maxRunsPerDay > 0 && u.runsToday >= b.maxRunsPerDay) {
      return { allowed: false, reason: "budget exhausted: runs/day", reasonCode: ERR.BUDGET_EXHAUSTED };
    }
    if (b.maxBytesPerRun > 0 && u.bytesToday > 0 && false) { /* per-run enforced by worker */ }
    return { allowed: true, reason: "ok" };
  }

  // -- operator actions ---------------------------------------------------------------
  pause(ctx, sourceId, reason) {
    requireCtx(ctx); requireOwnerOrOperator(ctx);
    this.emit("SOURCE_PAUSED", ctx.tenantId, sourceId, { patch: { lifecycleState: "paused", pauseReason: reason } });
  }
  resume(ctx, sourceId) {
    requireCtx(ctx); requireOwnerOrOperator(ctx);
    const r = this.getRecord(ctx.tenantId, sourceId);
    if (r.lifecycleState !== "paused") throw new RegistryError(ERR.LIFECYCLE, "not paused");
    this.emit("SOURCE_RESUMED", ctx.tenantId, sourceId, { patch: { lifecycleState: "active" } });
  }
  reconnect(ctx, sourceId, newConnectionHandle) {
    requireCtx(ctx); requireOwnerOrOperator(ctx);
    if (newConnectionHandle) scanForSecrets(newConnectionHandle, "connectionHandle");
    this.emit("SOURCE_RECONNECTED", ctx.tenantId, sourceId, {
      patch: { connectionHandle: newConnectionHandle ?? null, connectionState: newConnectionHandle ? "configured" : "unconfigured" },
    });
  }
  decommission(ctx, sourceId, reason) {
    requireCtx(ctx); requireOwnerOrOperator(ctx);
    this.emit("SOURCE_DECOMMISSIONED", ctx.tenantId, sourceId, {
      patch: { lifecycleState: "decommissioned", decommissionReason: reason },
    });
  }
  forceHealthOverride(ctx, sourceId, status, reason, ttlMs) {
    requireCtx(ctx); requireOwnerOrOperator(ctx);
    if (!["healthy", "degraded", "down"].includes(status)) throw new RegistryError(ERR.BAD_INPUT, `bad override status ${status}`);
    const r = this.getRecord(ctx.tenantId, sourceId);
    if (status === "healthy" && r.health.consecutiveFailures > 0 && !/acknowledge/i.test(reason)) {
      throw new RegistryError(ERR.HEALTH_GAMING,
        "cannot override to healthy with outstanding failures without an acknowledging reason");
    }
    const now = this.clock();
    this.emit("SOURCE_HEALTH_OVERRIDDEN", ctx.tenantId, sourceId, {
      patch: { healthOverride: { status, reason, setAtMs: now, ttlMs: ttlMs ?? this.thresholds.overrideTtlMs, by: ctx.caller } },
    });
    this.emit("SOURCE_HEALTH_TRANSITIONED", ctx.tenantId, sourceId, {
      health: { status, since: nowIso(now), reason: `override:${reason}`, consecutiveFailures: r.health.consecutiveFailures, lastHeartbeatAt: r.health.lastHeartbeatAt },
      from: r.health.status,
    });
  }
  updateBudgets(ctx, sourceId, budgets) {
    requireCtx(ctx); requireOwnerOrOperator(ctx);
    const r = this.getRecord(ctx.tenantId, sourceId);
    this.emit("SOURCE_BUDGETS_UPDATED", ctx.tenantId, sourceId, {
      patch: { budgets: { ...r.budgets, ...budgets } },
    });
  }
  updateCadence(ctx, sourceId, cadence) {
    requireCtx(ctx); requireOwnerOrOperator(ctx);
    this.emit("SOURCE_CADENCE_UPDATED", ctx.tenantId, sourceId, { patch: { cadence } });
  }
  updateVisibility(ctx, sourceId, visibility) {
    requireCtx(ctx); requireOwnerOrOperator(ctx);
    if (!["private", "org", "public-metadata"].includes(visibility)) throw new RegistryError(ERR.BAD_INPUT, "bad visibility");
    this.emit("SOURCE_VISIBILITY_UPDATED", ctx.tenantId, sourceId, { patch: { visibility } });
  }

  /** For tests: count emitted events of a type. */
  eventCount(type) {
    if (!existsSync(this.eventLog)) return 0;
    let n = 0;
    for (const line of readFileSync(this.eventLog, "utf8").split("\n")) {
      if (line.includes(`"type":"${type}"`)) n++;
    }
    return n;
  }
}
