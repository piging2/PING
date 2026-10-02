/**
 * Checkpoint Schema — TenantOS execution substrate (P-20260923-005, swarm-14).
 *
 * Re-keys the LangGraph checkpoint shape onto PING Run/step identity:
 *   - checkpoint_id is monotonic (decimal string; BigInt-ordered)
 *   - step_id identifies the PING step (re-keyed from LangGraph checkpoint_ns/step)
 *   - state travels as PAYLOAD REFS, never inline values: checkpoints must
 *     not carry secrets. A channel value that is not a well-formed ref is
 *     rejected, never normalized.
 *   - channel_versions: per-channel version vector (multi-writer conflict basis)
 *   - versions_seen: lineage — which checkpoint observed which channel versions
 *
 * SEAMS (single ownership):
 *   - This module owns the checkpoint RECORD SHAPE + record validation.
 *   - P-20260923-103 (src/tenanos/run/attempt-fencing.ts) owns the checkpoint
 *     WRITE DISCIPLINE: validateCheckpoint() monotonic seq gate, fenced INSERT,
 *     zombie-attempt write discipline. 103's AttemptCheckpoint.seq ordering is
 *     the attempt-local instance of this schema's checkpoint_id monotonicity.
 *   - P-20260923-002 (src/tenanos/runs/schema.ts) owns run/step identity
 *     issuance; run_id/step_id here are foreign keys into that authority.
 *
 * Pure module: no clock, no IO. Validation is total and fail-closed.
 */

/** A reference to an out-of-band payload. Never an inline value. */
export interface PayloadRef {
  /** e.g. "sha256:9f2c…", "s3://tenant-bucket/checkpoints/…", "pg:tenanos_blobs/…". */
  $ref: string;
}

/** LangGraph-shape checkpoint, re-keyed to PING Run/step. */
export interface CheckpointRecord {
  /** Monotonic per run: decimal integer string, strictly increasing. */
  checkpoint_id: string;
  /** PING Run identity (foreign key into 002's runs authority). */
  run_id: string;
  /** PING step identity. */
  step_id: string;
  /** Channel name -> payload REF. No inline secrets, ever. */
  values: Record<string, PayloadRef>;
  /** Channel name -> version at this checkpoint. */
  channel_versions: Record<string, number>;
  /**
   * Lineage: channel name -> { checkpoint_id -> version observed }.
   * A checkpoint's versions_seen must cover every version it derived from.
   */
  versions_seen: Record<string, Record<string, number>>;
}

export class CheckpointSchemaError extends Error {
  constructor(message: string) {
    super(`checkpoint schema: ${message}`);
    this.name = 'CheckpointSchemaError';
  }
}

const REF_RE = /^[a-z0-9]+:[A-Za-z0-9._/=-]+$/;
const ID_RE = /^[1-9][0-9]*$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isPayloadRef(v: unknown): v is PayloadRef {
  return (
    isRecord(v) &&
    typeof v.$ref === 'string' &&
    REF_RE.test(v.$ref) &&
    Object.keys(v).length === 1
  );
}

/**
 * Validate a checkpoint record. Total and fail-closed: throws
 * CheckpointSchemaError on any structural violation, including any channel
 * value that is not a well-formed payload ref (the no-inline-secrets rule).
 */
export function validateCheckpointRecord(rec: unknown): asserts rec is CheckpointRecord {
  if (!isRecord(rec)) throw new CheckpointSchemaError('record must be an object');
  if (typeof rec.checkpoint_id !== 'string' || !ID_RE.test(rec.checkpoint_id)) {
    throw new CheckpointSchemaError('checkpoint_id must be a positive decimal string');
  }
  if (typeof rec.run_id !== 'string' || rec.run_id.length === 0) {
    throw new CheckpointSchemaError('run_id must be a non-empty string');
  }
  if (typeof rec.step_id !== 'string' || rec.step_id.length === 0) {
    throw new CheckpointSchemaError('step_id must be a non-empty string');
  }
  if (!isRecord(rec.values)) throw new CheckpointSchemaError('values must be an object');
  for (const [channel, value] of Object.entries(rec.values)) {
    if (!isPayloadRef(value)) {
      throw new CheckpointSchemaError(
        `channel '${channel}': value is not a payload ref — inline state/secrets are forbidden`,
      );
    }
  }
  if (!isRecord(rec.channel_versions)) {
    throw new CheckpointSchemaError('channel_versions must be an object');
  }
  for (const [channel, v] of Object.entries(rec.channel_versions)) {
    if (!Number.isInteger(v) || (v as number) < 0) {
      throw new CheckpointSchemaError(`channel_versions['${channel}'] must be a non-negative integer`);
    }
  }
  if (!isRecord(rec.versions_seen)) {
    throw new CheckpointSchemaError('versions_seen must be an object');
  }
  for (const [channel, seen] of Object.entries(rec.versions_seen)) {
    if (!isRecord(seen)) {
      throw new CheckpointSchemaError(`versions_seen['${channel}'] must be an object`);
    }
    for (const [cpId, v] of Object.entries(seen)) {
      if (!ID_RE.test(cpId) || !Number.isInteger(v) || (v as number) < 0) {
        throw new CheckpointSchemaError(
          `versions_seen['${channel}']['${cpId}'] must map a checkpoint id to a non-negative integer`,
        );
      }
    }
  }
}

/**
 * Monotonicity gate for checkpoint_id: next must be strictly greater than prev.
 * The writer applies this BEFORE persisting, mirroring 103's
 * validateCheckpoint seq gate at the record level.
 */
export function isNextCheckpointId(prevId: string, nextId: string): boolean {
  if (!ID_RE.test(prevId) || !ID_RE.test(nextId)) return false;
  return BigInt(nextId) > BigInt(prevId);
}

/**
 * Lineage cover check: `next` may only build on `prev` if next.versions_seen
 * records at least prev's channel versions (per channel, at some checkpoint).
 * A checkpoint that "forgets" a version it derived from is rejected.
 */
export function versionsSeenCover(prev: CheckpointRecord, next: CheckpointRecord): boolean {
  for (const [channel, version] of Object.entries(prev.channel_versions)) {
    const seen = next.versions_seen[channel];
    if (!seen) return false;
    const observed = Object.values(seen);
    if (!observed.some((v) => v >= version)) return false;
  }
  return true;
}

/** Deterministic canonical JSON: sorted keys at every level (hash-stable). */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
