/**
 * Durable checkpoint store — scratch harness for worker C1 (durable checkpoint test).
 *
 * Filesystem-backed DURABLE store. Every mutation is an atomic tmp-file +
 * fsync + rename write, so a checkpoint that is reported as written survives
 * total handle loss (process death, daemon restart). There is NO in-memory
 * authority: every read goes back to disk.
 *
 * Layout under <storeDir>:
 *   attempts/<attemptId>/attempt.json            attempt lifecycle row
 *   attempts/<attemptId>/checkpoints/cp-<seq>.json   checkpoint records
 *   effects.jsonl                                idempotency-keyed effect log
 *   claims/<attemptId>.lock                      O_EXCL claim marker
 *
 * CLAIM ATOMICITY: claimOrphan() creates the lock file with O_CREAT|O_EXCL
 * ('wx'), which the OS guarantees is atomic across processes. Exactly one
 * racer wins. This is the filesystem analog of the production enforcer:
 * the SQL conditional UPDATE carrying the fencing token
 * (buildFenceCondition / interpretFenceResult in src/tenanos/run/attempt-fencing.ts),
 * whose atomicity is the database's. See TEST-REPORT.md caveats.
 *
 * CHECKPOINT RECORD (canonical P-20260923-005):
 * writeCheckpoint() builds the record via the INTEGRATED 005 module
 * (src/tenanos/checkpoints/schema.ts on tenanos-wave/integration, compiled
 * to ../canonical/schema.js — the module itself is never modified). Shape:
 * checkpoint_id (monotonic decimal string), run_id, step_id, values as
 * channel->payload-REF ({$ref}, never inline secrets), channel_versions,
 * versions_seen lineage (channel -> {checkpoint_id -> version}). The
 * canonical validator runs fail-closed BEFORE anything is persisted.
 * The attempt row keeps checkpoint_seq + the fencing token (103's write
 * discipline seam); the fencing token is NOT part of the 005 record.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const canon = require('../canonical/schema.js');

const TERMINAL_STATUSES = new Set(['completed', 'failed']);
const ORPHAN_ELIGIBLE = new Set(['running', 'claimed', 'stale', 'timed_out']);

class FencedWriteError extends Error {
  constructor(msg) { super(msg); this.name = 'FencedWriteError'; }
}
class NonMonotonicCheckpointError extends Error {
  constructor(attemptId, prevSeq, nextSeq) {
    super(`checkpoint for ${attemptId} must be seq ${prevSeq + 1}, got ${nextSeq}`);
    this.name = 'NonMonotonicCheckpointError';
  }
}
class ClaimLostError extends Error {
  constructor(attemptId, claimerId) {
    super(`claim on ${attemptId} lost by ${claimerId}`);
    this.name = 'ClaimLostError';
  }
}

function mintToken() {
  return crypto.randomBytes(16).toString('hex');
}

function attemptsDir(storeDir) { return path.join(storeDir, 'attempts'); }
function attemptDir(storeDir, attemptId) { return path.join(attemptsDir(storeDir), attemptId); }
function checkpointsDir(storeDir, attemptId) { return path.join(attemptDir(storeDir, attemptId), 'checkpoints'); }
function attemptFile(storeDir, attemptId) { return path.join(attemptDir(storeDir, attemptId), 'attempt.json'); }
function checkpointFile(storeDir, attemptId, seq) {
  return path.join(checkpointsDir(storeDir, attemptId), `cp-${seq}.json`);
}
function effectsFile(storeDir) { return path.join(storeDir, 'effects.jsonl'); }
function claimLockFile(storeDir, attemptId) { return path.join(storeDir, 'claims', `${attemptId}.lock`); }

/** Atomic durable write: tmp + fsync(file) + rename + fsync(dir). */
function atomicWriteJson(filePath, obj) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}.json`);
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, JSON.stringify(obj, null, 2) + '\n');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, filePath);
  const dfd = fs.openSync(dir, 'r');
  try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Create the attempt row (status 'created'). Idempotent: re-init of the same
 * attempt id returns the existing row.
 */
function initAttempt(storeDir, { attemptId, runId, missionId, workerName, leaseTtlMs, steps }) {
  const file = attemptFile(storeDir, attemptId);
  if (fs.existsSync(file)) return readJson(file);
  const now = Date.now();
  const row = {
    attempt_id: attemptId,
    run_id: runId,
    mission_id: missionId,
    worker_name: workerName || null,
    status: 'created',
    fencing_token: mintToken(),
    owner: null,
    lease_until: null,
    checkpoint_seq: 0,
    steps: steps || [],
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
  };
  atomicWriteJson(file, row);
  return row;
}

function readAttempt(storeDir, attemptId) {
  return readJson(attemptFile(storeDir, attemptId));
}

/** Compare-and-set on the attempt row, guarded by expected fencing token. */
function casAttempt(storeDir, attemptId, expectedToken, mutate) {
  const row = readAttempt(storeDir, attemptId);
  if (row.fencing_token !== expectedToken) {
    throw new FencedWriteError(
      `fencing token mismatch on ${attemptId}: zombie write rejected (rowCount=0 analog)`,
    );
  }
  const next = mutate({ ...row });
  next.updated_at = new Date().toISOString();
  atomicWriteJson(attemptFile(storeDir, attemptId), next);
  return next;
}

/**
 * Write checkpoint seq = prevSeq + 1, carrying the fencing token.
 * Rejects stale tokens (zombie) and non-sequential seq (replay/reorder).
 * The record is built in the CANONICAL P-20260923-005 shape and the
 * canonical validator runs fail-closed BEFORE anything is persisted.
 * Returns the checkpoint record.
 */
function writeCheckpoint(storeDir, attemptId, fencingToken, { stepId, seq, channelVersions, payloadRef }) {
  const row = readAttempt(storeDir, attemptId);
  if (row.fencing_token !== fencingToken) {
    throw new FencedWriteError(`stale fencing token on ${attemptId}: checkpoint fenced`);
  }
  if (row.status !== 'running') {
    throw new FencedWriteError(`checkpoint write requires status 'running', got '${row.status}'`);
  }
  if (seq !== row.checkpoint_seq + 1) {
    throw new NonMonotonicCheckpointError(attemptId, row.checkpoint_seq, seq);
  }
  // Canonical 005 record. checkpoint_id is a monotonic DECIMAL string
  // (the module's own isNextCheckpointId gate, BigInt-ordered); state is a
  // payload REF (values.<channel> = {$ref}), never an inline value; lineage
  // is derived from seq: this checkpoint builds on seq-1's channel versions.
  const cp = {
    checkpoint_id: String(seq),
    run_id: row.run_id,
    step_id: stepId,
    values: { step: { $ref: payloadRef } },
    channel_versions: channelVersions || { step: seq },
    versions_seen: seq > 1 ? { step: { [String(seq - 1)]: seq - 1 } } : {},
  };
  canon.validateCheckpointRecord(cp); // fail-closed, pre-persist
  atomicWriteJson(checkpointFile(storeDir, attemptId, seq), cp);
  casAttempt(storeDir, attemptId, fencingToken, (r) => ({ ...r, checkpoint_seq: seq }));
  return cp;
}

/** Highest-seq checkpoint, or null. Always re-read from disk. */
function readLatestCheckpoint(storeDir, attemptId) {
  const row = readAttempt(storeDir, attemptId);
  if (row.checkpoint_seq === 0) return null;
  return readJson(checkpointFile(storeDir, attemptId, row.checkpoint_seq));
}

/**
 * Idempotent effect append. Returns { duplicate: true } if idemKey already
 * logged (re-execution is a no-op); otherwise appends durably and returns
 * { duplicate: false }. O_APPEND + fsync makes the append durable.
 */
function appendEffect(storeDir, idemKey, record) {
  const file = effectsFile(storeDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        if (JSON.parse(line).idem_key === idemKey) return { duplicate: true };
      } catch { /* ignore malformed line */ }
    }
  }
  const fd = fs.openSync(file, 'a');
  try {
    fs.writeFileSync(fd, JSON.stringify({ idem_key: idemKey, ...record }) + '\n');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return { duplicate: false };
}

function readEffects(storeDir) {
  const file = effectsFile(storeDir);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

/**
 * Fresh-coordinator discovery: scan DURABLE state only for orphaned attempts.
 * Orphan = non-terminal status with an expired (or missing) lease, or an
 * explicitly stale/timed_out attempt. No in-memory handles consulted.
 */
function discoverOrphans(storeDir, now = Date.now()) {
  const base = attemptsDir(storeDir);
  if (!fs.existsSync(base)) return [];
  const orphans = [];
  for (const attemptId of fs.readdirSync(base)) {
    let row;
    try { row = readJson(attemptFile(storeDir, attemptId)); } catch { continue; }
    if (TERMINAL_STATUSES.has(row.status)) continue;
    const leaseMs = row.lease_until == null ? NaN : new Date(row.lease_until).getTime();
    const leaseExpired = Number.isNaN(leaseMs) || leaseMs < now;
    if ((ORPHAN_ELIGIBLE.has(row.status) && leaseExpired)) {
      orphans.push({
        attempt_id: row.attempt_id,
        run_id: row.run_id,
        mission_id: row.mission_id,
        status: row.status,
        checkpoint_seq: row.checkpoint_seq,
        lease_until: row.lease_until,
      });
    }
  }
  return orphans;
}

/**
 * ATOMIC re-claim of an orphaned attempt. The lock file is created with
 * O_CREAT|O_EXCL ('wx'): the OS guarantees exactly one winner across
 * processes. The winner rotates the fencing token (zombie writes from the
 * dead owner now match zero rows) and takes status 'claimed'.
 */
function claimOrphan(storeDir, attemptId, claimerId, now = Date.now()) {
  const lockPath = claimLockFile(storeDir, attemptId);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  let fd;
  try {
    fd = fs.openSync(lockPath, 'wx', 0o644); // O_CREAT | O_EXCL — atomic
  } catch (err) {
    if (err.code === 'EEXIST') {
      // A re-entrant call by the CURRENT holder (e.g. resume after winning)
      // is not a second claim: verify holder identity from the lock content.
      try {
        const held = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        if (held.claimer === claimerId) {
          const cur = readAttempt(storeDir, attemptId);
          return { won: true, already_held: true, claimer: claimerId, fencing_token: cur.fencing_token };
        }
      } catch { /* fall through to lost */ }
      return { won: false, reason: 'lock-exists' };
    }
    throw err;
  }
  try {
    fs.writeFileSync(fd, JSON.stringify({ claimer: claimerId, at: new Date(now).toISOString() }) + '\n');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  // We hold the lock: re-read and validate orphan eligibility, then claim.
  const row = readAttempt(storeDir, attemptId);
  const leaseMs = row.lease_until == null ? NaN : new Date(row.lease_until).getTime();
  const leaseExpired = Number.isNaN(leaseMs) || leaseMs < now;
  const eligible = ORPHAN_ELIGIBLE.has(row.status) && !TERMINAL_STATUSES.has(row.status) && leaseExpired;
  if (!eligible) {
    return { won: false, reason: `not-orphan-eligible (status=${row.status})` };
  }
  const newToken = mintToken();
  const next = {
    ...row,
    status: 'claimed',
    owner: claimerId,
    fencing_token: newToken,
    lease_until: new Date(now + 5 * 60 * 1000).toISOString(),
    updated_at: new Date(now).toISOString(),
  };
  atomicWriteJson(attemptFile(storeDir, attemptId), next);
  return { won: true, claimer: claimerId, fencing_token: newToken, prev_status: row.status };
}

module.exports = {
  initAttempt,
  readAttempt,
  casAttempt,
  writeCheckpoint,
  readLatestCheckpoint,
  appendEffect,
  readEffects,
  discoverOrphans,
  claimOrphan,
  checkpointFile,
  effectsFile,
  FencedWriteError,
  NonMonotonicCheckpointError,
  ClaimLostError,
  TERMINAL_STATUSES,
};
