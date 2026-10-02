/**
 * idempotency — idempotency-key dedup for retried effects, with honest
 * UNKNOWN handling.
 *
 * Key lifecycle:
 *   absent      --execute--> IN_FLIGHT --success--> COMPLETED(result)
 *                                    --throw-->   FAILED(error)
 *   IN_FLIGHT --retry arrives--> OUTCOME_UNKNOWN (never re-runs blindly)
 *   IN_FLIGHT --reconcile(probe)--> COMPLETED | FAILED | stays UNKNOWN
 *   FAILED    --reset--> absent (a deliberate, recorded decision to retry)
 *
 * The flagship guarantee: a retry that arrives while the first attempt's
 * fate is unknown returns OUTCOME_UNKNOWN and does NOT re-execute the
 * effect. Re-running an effect that may already have happened is how
 * double-charges, double-sends, and duplicate missions are born; claiming
 * success without proof is how silent data loss is born. UNKNOWN is the
 * only honest answer until reconcile() with a real probe resolves it.
 *
 * Records are durable (atomic file per key), so a process death leaves the
 * key IN_FLIGHT on disk — exactly the state a restart must observe.
 *
 * Gates failure classes:
 *   FC-20260923-001  effect then connection dies before response (IN_FLIGHT survives death)
 *   FC-20260923-008  approval reused for different arguments (key binds args hash)
 *   FC-20260923-005  result lost after effect (COMPLETED carries the recorded result)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Outcome, ProbeResult, classifyProbeResult, EffectVerdict } from './types';

export type KeyState = 'IN_FLIGHT' | 'COMPLETED' | 'FAILED';

export interface KeyRecord {
  key: string;
  state: KeyState;
  /** JSON-serialized result; present only when COMPLETED. */
  resultJson?: string;
  error?: string;
  attempts: number;
  updatedAt: string;
}

export interface ExecuteOutcome<T> {
  outcome: Outcome;
  /** Present when the effect ran and returned, or when a recorded result was replayed. */
  value?: T;
  /** True only when the effect actually executed in this call. */
  executed: boolean;
  key: string;
}

function keyPath(dir: string, key: string): string {
  const h = crypto.createHash('sha256').update(key, 'utf8').digest('hex');
  return path.join(dir, `idem-${h}.json`);
}

export class IdempotencyStore {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
  }

  private read(key: string): KeyRecord | null {
    try {
      return JSON.parse(fs.readFileSync(keyPath(this.dir, key), 'utf8')) as KeyRecord;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  private write(rec: KeyRecord): void {
    const p = keyPath(this.dir, rec.key);
    const tmp = `${p}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(rec), 'utf8');
    fs.renameSync(tmp, p);
  }

  /**
   * Execute under an idempotency key. Retried calls with the same key never
   * double-execute; a retry racing an in-flight attempt gets OUTCOME_UNKNOWN.
   */
  async execute<T>(
    key: string,
    effect: () => Promise<T> | T,
    opts: { reconcileProbe?: () => Promise<ProbeResult> | ProbeResult } = {},
  ): Promise<ExecuteOutcome<T>> {
    const existing = this.read(key);
    if (existing) {
      if (existing.state === 'COMPLETED') {
        return {
          outcome: 'SUCCEEDED',
          value: existing.resultJson !== undefined ? (JSON.parse(existing.resultJson) as T) : undefined,
          executed: false,
          key,
        };
      }
      if (existing.state === 'FAILED') {
        return { outcome: 'FAILED', executed: false, key };
      }
      // IN_FLIGHT: the first attempt's fate is unknown. Do NOT re-run.
      if (opts.reconcileProbe) {
        return this.reconcile(key, opts.reconcileProbe);
      }
      return { outcome: 'OUTCOME_UNKNOWN', executed: false, key };
    }

    // Atomic claim of the key: O_EXCL so two racers cannot both execute.
    const rec: KeyRecord = { key, state: 'IN_FLIGHT', attempts: 1, updatedAt: new Date().toISOString() };
    const p = keyPath(this.dir, key);
    try {
      fs.writeFileSync(p, JSON.stringify(rec), { flag: 'wx', encoding: 'utf8' });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
        return { outcome: 'OUTCOME_UNKNOWN', executed: false, key }; // lost the race: fate unknown
      }
      throw err;
    }

    try {
      const value = await effect();
      this.write({ ...rec, state: 'COMPLETED', resultJson: JSON.stringify(value), updatedAt: new Date().toISOString() });
      return { outcome: 'SUCCEEDED', value, executed: true, key };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.write({ ...rec, state: 'FAILED', error: message, updatedAt: new Date().toISOString() });
      throw err; // the caller's error is real; the record says FAILED for the next retry
    }
  }

  /**
   * Resolve an IN_FLIGHT key with a real probe of the external world.
   * EFFECT_OBSERVABLE -> COMPLETED (value unrecoverable: recorded as such).
   * EFFECT_ABSENT    -> FAILED, and the key becomes reset-eligible for retry.
   * UNVERIFIABLE     -> stays IN_FLIGHT; still UNKNOWN. Honest.
   */
  async reconcile<T>(
    key: string,
    probe: () => Promise<ProbeResult> | ProbeResult,
  ): Promise<ExecuteOutcome<T>> {
    const rec = this.read(key);
    if (!rec) return { outcome: 'FAILED', executed: false, key }; // nothing ever started
    if (rec.state !== 'IN_FLIGHT') {
      return this.execute(key, () => {
        throw new Error('idempotency.reconcile: key already resolved');
      });
    }
    const probeResult = await probe();
    const verdict: EffectVerdict = classifyProbeResult(probeResult, `idempotency-key:${key}`);
    if (verdict.outcome === 'SUCCEEDED') {
      this.write({ ...rec, state: 'COMPLETED', updatedAt: new Date().toISOString() });
      return { outcome: 'SUCCEEDED', executed: false, key };
    }
    if (verdict.outcome === 'FAILED') {
      this.write({ ...rec, state: 'FAILED', error: 'reconcile probe: effect absent', updatedAt: new Date().toISOString() });
      return { outcome: 'FAILED', executed: false, key };
    }
    return { outcome: 'OUTCOME_UNKNOWN', executed: false, key }; // stays IN_FLIGHT
  }

  /**
   * Deliberate, recorded decision to allow one more attempt. Only meaningful
   * after FAILED (probe proved the effect absent). Never call on IN_FLIGHT:
   * use reconcile() instead.
   */
  reset(key: string): boolean {
    const rec = this.read(key);
    if (!rec || rec.state !== 'FAILED') return false;
    fs.unlinkSync(keyPath(this.dir, key));
    return true;
  }

  inspect(key: string): KeyRecord | null {
    return this.read(key);
  }
}

/**
 * Derive an idempotency key that binds the approval/arguments, so an
 * approval cannot be replayed for different arguments (FC-20260923-008).
 */
export function deriveKey(namespace: string, args: unknown): string {
  const h = crypto.createHash('sha256').update(JSON.stringify({ namespace, args }), 'utf8').digest('hex');
  return `${namespace}:${h.slice(0, 32)}`;
}
