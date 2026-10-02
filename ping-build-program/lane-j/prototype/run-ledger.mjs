/**
 * Lane J prototype: run-record writer (the ledger).
 *
 * Zero dependencies. Mirrors the house pattern from
 * src/fyd/identity/audit.ts: env-configurable dir, append-only JSONL,
 * fail-soft writes, no secrets in the log.
 *
 * Usage:
 *   const b = beginRun(dir, { connector_id, tenant_id, ... , seq });
 *   b.attempt({...}); b.change({...}); b.rejection({...});
 *   const res = b.finish({ status: "SUCCEEDED", checkpoint_out: "..." });
 */

import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { assertTaxonomyCode } from "./taxonomy.mjs";

export const SCHEMA = "ping.run_record/v1";
export const RUNS_FILE = "runs.jsonl";
export const WRITE_FAILURES_FILE = "ledger-write-failures.jsonl";

/**
 * Secret redaction (lane-L boundary). Run records carry counts and
 * credential handles, never raw secrets. Before any record is serialized,
 * every free-text field is walked and values matching secret patterns are
 * replaced. Free-text fields are: errors[].message, rejections[].detail,
 * changes[].before/after (values, kept), conflicts[].surface_text.
 *
 * This is defense in depth: the writer API contract already says callers
 * pass only credref handles, but a bug in a caller must not leak a token
 * into an append-only evidence file.
 */
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9-]{16,}/g, // provider secret keys
  /gh[pousr]_[A-Za-z0-9]{16,}/g, // github tokens
  /xox[baprs]-[A-Za-z0-9-]{8,}/g, // slack tokens
  /AKIA[0-9A-Z]{16}/g, // aws access key ids
  /Bearer\s+[A-Za-z0-9\-._~+/=]{8,}/g, // bearer auth headers
  /api[_-]?key\s*[:=]\s*['"]?[A-Za-z0-9\-._~+/=]{8,}['"]?/gi,
  /\btoken\s*[:=]\s*['"]?[A-Za-z0-9\-._~+/=]{8,}['"]?/gi,
  /\bpassword\s*[:=]\s*['"]?\S{4,}['"]?/gi,
  /\bclient[_-]?secret\s*[:=]\s*['"]?\S{4,}['"]?/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, // PEM blocks
];

const REDACTED = "[REDACTED-SECRET]";

/** Redact secret-looking substrings in a free-text string. */
export function redactSecretsText(s) {
  if (typeof s !== "string") return s;
  let out = s;
  for (const re of SECRET_PATTERNS) {
    re.lastIndex = 0;
    out = out.replace(re, REDACTED);
  }
  return out;
}

/** Fields on the record that are exempt from redaction (ids, structure). */
const REDACT_EXEMPT_TOP = new Set([
  "schema", "run_id", "seq", "connector_id", "tenant_id", "trigger",
  "started_at", "finished_at", "at", "duration_ms", "status", "writer",
  "run_digest", "checkpoint_in", "checkpoint_out", "resync",
  "credential_handle", // lane-L handle: opaque by contract, never a secret
]);

/** Walk the finished record and redact free text. Returns the same object. */
export function redactRecordSecrets(record) {
  const walk = (value, topKey) => {
    if (typeof value === "string") {
      return REDACT_EXEMPT_TOP.has(topKey) ? value : redactSecretsText(value);
    }
    if (Array.isArray(value)) return value.map((v) => walk(v, topKey));
    if (value && typeof value === "object") {
      for (const k of Object.keys(value)) {
        // exempt leaf keys that are structural ids / pointers by contract
        if (k === "run_id" || k === "schema" || k === "evidence_ref" || k === "credential_handle") continue;
        value[k] = walk(value[k], k);
      }
    }
    return value;
  };
  for (const k of Object.keys(record)) {
    record[k] = walk(record[k], k);
  }
  return record;
}

/** Deterministic JSON: sorted keys, recursive. JSON semantics for undefined:
 *  dropped from objects, null in arrays. Digest input. */
export function canonicalJson(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((v) => (v === undefined ? "null" : canonicalJson(v))).join(",") + "]";
  }
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k])).join(",") +
    "}"
  );
}

/** sha256 hex of the canonical record minus run_digest. */
export function digestRecord(record) {
  const { run_digest, ...rest } = record;
  void run_digest;
  const canonical = canonicalJson(rest) || "null";
  return "sha256:" + createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function ledgerDirDefault() {
  return process.env.PING_RUNS_DIR || join(process.cwd(), "data", "fyd-runs");
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

/** Read every well-formed run record. Corrupt lines are reported, not fatal. */
export function readRuns(dir) {
  const file = join(dir, RUNS_FILE);
  if (!existsSync(file)) return { records: [], corrupt: [] };
  const records = [];
  const corrupt = [];
  for (const [i, line] of readFileSync(file, "utf8").split("\n").entries()) {
    const t = line.trim();
    if (!t) continue;
    try {
      records.push(JSON.parse(t));
    } catch (err) {
      corrupt.push({ line: i + 1, error: String(err) });
    }
  }
  return { records, corrupt };
}

export function maxSeq(records, connector_id, tenant_id) {
  let m = 0;
  for (const r of records) {
    if (r.connector_id === connector_id && r.tenant_id === tenant_id) {
      m = Math.max(m, r.seq || 0);
    }
  }
  return m;
}

/**
 * Begin a run. `seq` is issued by the SCHEDULER (monotonic per
 * connector+tenant), not by the ledger: that separation is what makes a
 * dropped write detectable as a sequence gap.
 *
 * Gap detection reads the ledger to find the last sequence. To keep the
 * writer O(1) per run (the cardinality test writes 5,020 runs in one
 * process), reads are cached per process and updated after each append.
 * Caveat: two WRITER processes sharing a ledger dir in the same host must
 * not both write blindly from a stale cache — a production writer needs an
 * atomic sequence issuer (lock or single writer). The single-writer
 * scheduler is the standing design; the cache is process-local and the
 * reader (readRuns) always reads the file, never the cache.
 */
const _maxSeqCache = new Map(); // dir -> { key: maxSeq }  (process-local)

function seenMaxSeq(dir, records, connector_id, tenant_id) {
  const key = `${dir}|${connector_id}|${tenant_id}`;
  let cached = _maxSeqCache.get(key);
  if (cached === undefined) {
    // Cold cache: read the ledger once. Warm cache: O(1), no file read.
    cached = maxSeq(records, connector_id, tenant_id);
    _maxSeqCache.set(key, cached);
  }
  return cached;
}

function bumpSeqCache(dir, record) {
  const key = `${dir}|${record.connector_id}|${record.tenant_id}`;
  const cur = _maxSeqCache.get(key) || 0;
  _maxSeqCache.set(key, Math.max(cur, record.seq || 0));
}

export function beginRun(dir, meta) {
  const {
    connector_id,
    connector_version = "0.0.0",
    tenant_id,
    principal = "platform-operator",
    trigger = "routine-poll",
    seq,
    started_at,
  } = meta;
  if (!connector_id || !tenant_id || typeof seq !== "number") {
    throw new Error("beginRun requires connector_id, tenant_id, seq");
  }
  // Cold start only: read the ledger to seed the sequence cache. Warm
  // cache hits skip the file entirely (write stays O(1) per run).
  const cacheKey = `${dir}|${connector_id}|${tenant_id}`;
  let seenMax = _maxSeqCache.get(cacheKey);
  if (seenMax === undefined) {
    const { records } = readRuns(dir);
    seenMax = seenMaxSeq(dir, records, connector_id, tenant_id);
  }
  const missing = [];
  for (let s = seenMax + 1; s < seq; s++) missing.push(s);

  const builder = {
    _dir: dir,
    _meta: {
      schema: SCHEMA,
      run_id: `run-${connector_id}-${yyyymmdd(started_at)}-${String(seq).padStart(4, "0")}`,
      seq,
      at: null, // set at finish (ledger write time, writer clock)
      connector_id,
      connector_version,
      tenant_id,
      principal,
      trigger,
      started_at: started_at || new Date().toISOString(),
      finished_at: null,
      duration_ms: null,
      status: null,
      checkpoint_in: meta.checkpoint_in || null,
      checkpoint_out: null,
      checkpoint_verified: null,
      resync: false,
      streams: [],
      observations: { discovered: 0, emitted: 0, accepted: 0, rejected: 0, unchanged: 0, changed: 0 },
      rejections: [],
      changes: [],
      conflicts: [],
      fetch_attempts: [],
      rate_limits: { provider_calls: 0, quota_units: 0, limited: false, retry_after_hits: 0, budget_remaining_pct: null },
      bytes: { inbound: 0, stored_raw: 0 },
      cost: { usd: 0, quota_cost: null },
      ai_tokens: { input: 0, output: 0, model: null, purpose: null },
      errors: [],
      observation_ids: [],
      evidence_refs: [],
      run_digest: null,
      writer: { name: "ping-run-ledger", version: "1.0.0", host: meta.host || "localhost" },
      prior_ledger_gap: missing.length > 0,
      missing_seqs: missing,
      clock_skew_detected: false,
    },
    _t0: nowMs(),
    stream(s) { this._meta.streams.push(s); return this; },
    observeCounts(c) { Object.assign(this._meta.observations, c); return this; },
    attempt(a) {
      // Closed-set enforcement: a failed/unknown attempt MUST carry a
      // lane-K v1.0.0 class. Drift (unknown string) throws at build time.
      if (a.taxonomy_code) assertTaxonomyCode(a.taxonomy_code, "fetch_attempt");
      this._meta.fetch_attempts.push(a);
      return this;
    },
    change(c) { this._meta.changes.push(c); this._meta.observation_ids.push(c.observation_id); return this; },
    rejection(r) {
      if (r.code) assertTaxonomyCode(r.code, "rejection");
      this._meta.rejections.push(r);
      return this;
    },
    conflict(c) { this._meta.conflicts.push(c); return this; },
    error(e) {
      if (e.code) assertTaxonomyCode(e.code, "run_error");
      this._meta.errors.push(e);
      return this;
    },
    evidenceRef(ref) { this._meta.evidence_refs.push(ref); return this; },
    rateLimits(r) { Object.assign(this._meta.rate_limits, r); return this; },
    bytesIn(n, stored) { this._meta.bytes.inbound += n; this._meta.bytes.stored_raw += stored ?? n; return this; },
    costUsd(n, quota_cost) { this._meta.cost.usd += n; if (quota_cost) this._meta.cost.quota_cost = quota_cost; return this; },
    aiTokens(t) { Object.assign(this._meta.ai_tokens, t); return this; },

    finish(opts = {}) {
      const m = this._meta;
      m.finished_at = opts.finished_at || new Date().toISOString();
      m.duration_ms = opts.duration_ms ?? nowMs() - this._t0;
      m.status = opts.status || "SUCCEEDED";
      m.checkpoint_out = opts.checkpoint_out ?? m.checkpoint_in;
      m.resync = !!opts.resync;
      if (opts.checkpoint_in !== undefined) m.checkpoint_in = opts.checkpoint_in;
      m.at = new Date().toISOString();
      // Secrets are redacted BEFORE the digest is computed: the digest binds
      // the redacted record, so a leak can never be covered up by hashing.
      redactRecordSecrets(m);
      m.run_digest = digestRecord(m);
      return writeRecord(this._dir, m);
    },
  };
  return builder;
}

/** Single atomic append. Fail-soft: failure never throws into the run. */
export function writeRecord(dir, record) {
  ensureDir(dir);
  const line = canonicalJson(record) + "\n";
  const fail = (error) => {
    const entry = {
      at: new Date().toISOString(),
      event: "ledger_write_failed",
      run_id: record.run_id,
      connector_id: record.connector_id,
      tenant_id: record.tenant_id,
      error: String(error && error.message ? error.message : error),
    };
    try {
      appendFileSync(join(dir, WRITE_FAILURES_FILE), JSON.stringify(entry) + "\n", "utf8");
    } catch { /* sidecar best-effort */ }
    try { process.stderr.write(`[run-ledger] write failed for ${record.run_id}: ${entry.error}\n`); } catch { /* noop */ }
    return { ok: false, error: entry.error, record };
  };

  // Test hook: simulate a torn write without touching the real file.
  if (process.env.PING_LEDGER_DROP_WRITE === record.run_id) {
    return fail(new Error("simulated write failure (PING_LEDGER_DROP_WRITE)"));
  }

  try {
    // Write-temp-then-rename for large records; direct append otherwise.
    if (line.length > 65536) {
      const tmp = join(dir, `.runs.${record.run_id}.tmp`);
      const existing = existsSync(join(dir, RUNS_FILE)) ? readFileSync(join(dir, RUNS_FILE)) : Buffer.alloc(0);
      writeFileSync(tmp, Buffer.concat([existing, Buffer.from(line, "utf8")]));
      renameSync(tmp, join(dir, RUNS_FILE));
    } else {
      appendFileSync(join(dir, RUNS_FILE), line, "utf8");
    }
    bumpSeqCache(dir, record);
    return { ok: true, record };
  } catch (err) {
    return fail(err);
  }
}

/** Collapse heartbeat runs (no changes/conflicts/errors, SUCCEEDED). Pure. */
export function collapseHeartbeats(records) {
  const full = [];
  const buckets = new Map();
  for (const r of records) {
    const isHeartbeat =
      r.status === "SUCCEEDED" &&
      (r.observations?.changed || 0) === 0 &&
      (r.conflicts || []).length === 0 &&
      (r.errors || []).length === 0;
    if (!isHeartbeat) { full.push(r); continue; }
    const hour = String(r.started_at).slice(0, 13); // YYYY-MM-DDTHH
    const key = `${r.connector_id}|${r.tenant_id}|${hour}`;
    let b = buckets.get(key);
    if (!b) {
      b = {
        kind: "heartbeat_rollup",
        connector_id: r.connector_id,
        tenant_id: r.tenant_id,
        hour,
        count: 0,
        first_run_id: r.run_id,
        bytes_inbound_sum: 0,
        ai_tokens_in_sum: 0,
        ai_tokens_out_sum: 0,
        cost_usd_sum: 0,
        duration_ms_min: Infinity,
        duration_ms_max: 0,
        duration_ms_sum: 0,
        checkpoint_in_first: r.checkpoint_in,
      };
      buckets.set(key, b);
    }
    b.count++;
    b.last_run_id = r.run_id;
    b.bytes_inbound_sum += r.bytes?.inbound || 0;
    b.ai_tokens_in_sum += r.ai_tokens?.input || 0;
    b.ai_tokens_out_sum += r.ai_tokens?.output || 0;
    b.cost_usd_sum += r.cost?.usd || 0;
    b.duration_ms_min = Math.min(b.duration_ms_min, r.duration_ms || 0);
    b.duration_ms_max = Math.max(b.duration_ms_max, r.duration_ms || 0);
    b.duration_ms_sum += r.duration_ms || 0;
    b.checkpoint_out_last = r.checkpoint_out;
  }
  for (const b of buckets.values()) {
    b.duration_ms_avg = b.count ? Math.round(b.duration_ms_sum / b.count) : 0;
    delete b.duration_ms_sum;
    if (b.duration_ms_min === Infinity) b.duration_ms_min = 0;
  }
  return { full, rollups: [...buckets.values()] };
}

function yyyymmdd(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function nowMs() {
  // Monotonic: durations never go negative under clock skew.
  const [s, ns] = process.hrtime();
  return s * 1000 + Math.floor(ns / 1e6);
}
