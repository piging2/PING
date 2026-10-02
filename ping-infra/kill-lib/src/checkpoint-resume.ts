/**
 * checkpoint-resume — durable checkpoints with stale detection and
 * external-state revalidation on resume.
 *
 * Contract:
 * - A checkpoint exists only after the atomic write (tmp + fsync + rename)
 *   completes. Anything held in memory only is NOT a checkpoint; a restart
 *   (a new CheckpointStore instance) cannot see it. This is the
 *   "checkpoint acked but not durable" gate: ack-before-durable is provably
 *   invisible after restart, so consumers must re-execute (safely, via an
 *   idempotency key).
 * - Every save bumps a monotonic seq. resumeFrom(seq) throws
 *   StaleCheckpointError when a newer seq exists — a stale narrative can
 *   never override canonical state.
 * - resume() always runs the caller-supplied revalidate(state) against the
 *   external world first. If the world moved on, resume fails loudly instead
 *   of restoring a lie.
 *
 * Gates failure classes:
 *   FC-20260923-003  stale narrative overrides canonical state
 *                    (seq-gated resume; StaleCheckpointError, never silent override)
 *   FC-20260923-004  checkpoint acked but not durable
 *                    (durability = atomic rename completed; restart proves it)
 *   FC-20260923-005  result lost after effect (checkpoint + revalidate before resume)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class StaleCheckpointError extends Error {
  readonly requestedSeq: number;
  readonly latestSeq: number;
  constructor(requestedSeq: number, latestSeq: number) {
    super(
      `stale checkpoint: requested seq ${requestedSeq} but seq ${latestSeq} is newer; ` +
        `refusing to restore a stale narrative over canonical state`,
    );
    this.name = 'StaleCheckpointError';
    this.requestedSeq = requestedSeq;
    this.latestSeq = latestSeq;
  }
}

export class RevalidationFailedError extends Error {
  constructor(detail: string) {
    super(`checkpoint revalidation failed against external state: ${detail}`);
    this.name = 'RevalidationFailedError';
  }
}

export interface Checkpoint<T = unknown> {
  seq: number;
  state: T;
  savedAt: string;
  /** sha256 of the canonical serialization — the durability receipt. */
  receipt: string;
}

export interface CheckpointStoreOptions<T> {
  /**
   * Runs against the external world before any resume returns state.
   * Throw (or return a rejected promise) to refuse the resume.
   */
  revalidate?: (state: T) => void | Promise<void>;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

export class CheckpointStore<T = unknown> {
  private readonly file: string;
  private readonly revalidate?: (state: T) => void | Promise<void>;

  constructor(dir: string, opts: CheckpointStoreOptions<T> = {}) {
    this.file = path.join(dir, 'checkpoint.json');
    this.revalidate = opts.revalidate;
    fs.mkdirSync(dir, { recursive: true });
  }

  /** Durably save. Returns only after the atomic rename — the checkpoint is real. */
  async save(state: T): Promise<Checkpoint<T>> {
    const prev = await this.latest();
    const seq = (prev?.seq ?? 0) + 1;
    const cp: Checkpoint<T> = {
      seq,
      state,
      savedAt: new Date().toISOString(),
      receipt: '',
    };
    cp.receipt = crypto.createHash('sha256').update(canonicalJson({ seq, state }), 'utf8').digest('hex');
    const tmp = `${this.file}.tmp-${process.pid}-${seq}`;
    const fd = await fs.promises.open(tmp, 'w');
    try {
      await fd.writeFile(canonicalJson(cp), 'utf8');
      await fd.sync(); // durable before visible
    } finally {
      await fd.close();
    }
    await fs.promises.rename(tmp, this.file); // atomic publication
    return cp;
  }

  async latest(): Promise<Checkpoint<T> | null> {
    try {
      const raw = await fs.promises.readFile(this.file, 'utf8');
      const cp = JSON.parse(raw) as Checkpoint<T>;
      const expect = crypto
        .createHash('sha256')
        .update(canonicalJson({ seq: cp.seq, state: cp.state }), 'utf8')
        .digest('hex');
      if (expect !== cp.receipt) {
        throw new Error(`checkpoint receipt mismatch: file is corrupt or tampered (seq ${cp.seq})`);
      }
      return cp;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  /** Resume the newest checkpoint after revalidating it against external state. */
  async resume(): Promise<T | null> {
    const cp = await this.latest();
    if (!cp) return null;
    await this.runRevalidate(cp.state);
    return cp.state;
  }

  /**
   * Resume a specific seq. Throws StaleCheckpointError when a newer seq
   * exists — the stale narrative never wins.
   */
  async resumeFrom(seq: number): Promise<T> {
    const cp = await this.latest();
    if (!cp) throw new Error(`no checkpoint durable at seq ${seq}: nothing to resume`);
    if (cp.seq !== seq) {
      throw new StaleCheckpointError(seq, cp.seq);
    }
    await this.runRevalidate(cp.state);
    return cp.state;
  }

  private async runRevalidate(state: T): Promise<void> {
    if (!this.revalidate) return;
    try {
      await this.revalidate(state);
    } catch (err) {
      throw new RevalidationFailedError(err instanceof Error ? err.message : String(err));
    }
  }
}
