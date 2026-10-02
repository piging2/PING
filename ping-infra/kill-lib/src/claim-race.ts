/**
 * claim-race — exactly-one-winner claiming of a work unit across real
 * concurrent processes.
 *
 * Mechanism: atomic file creation (O_CREAT|O_EXCL, Node flag 'wx'). The
 * filesystem is the arbiter; exactly one claimant's create succeeds.
 * A claim record holds the winner's worker id, so losers learn WHO won
 * (typed ClaimDenied), not just that they lost.
 *
 * Same-worker re-claim is idempotent (returns the existing hold), so a
 * retried claim after a lost response cannot double-claim.
 *
 * Gates failure classes:
 *   FC-20260923-006  two workers claim the same packet
 *                    (exactly one winner across N real processes; losers typed)
 */

import * as fs from 'fs';
import * as path from 'path';

export class ClaimDenied extends Error {
  readonly unitId: string;
  readonly holder: string;
  readonly workerId: string;
  constructor(unitId: string, holder: string, workerId: string) {
    super(`claim denied: unit ${unitId} already held by ${holder} (claimant ${workerId})`);
    this.name = 'ClaimDenied';
    this.unitId = unitId;
    this.holder = holder;
    this.workerId = workerId;
  }
}

export interface ClaimResult {
  unitId: string;
  workerId: string;
  /** True when this call holds the claim (won the race or already held it). */
  held: boolean;
  /** True only when this call was the race winner (fresh claim). */
  won: boolean;
}

function lockPath(dir: string, unitId: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(unitId)) {
    throw new Error(`claim-race: unsafe unitId ${JSON.stringify(unitId)}`);
  }
  return path.join(dir, `claim-${unitId}.lock`);
}

export class WorkUnitClaim {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
  }

  /**
   * Atomically claim a unit. Exactly one concurrent claimant wins; the rest
   * get ClaimDenied naming the holder. Re-claim by the holder is idempotent.
   */
  claim(unitId: string, workerId: string): ClaimResult {
    const p = lockPath(this.dir, unitId);
    try {
      fs.writeFileSync(p, workerId, { flag: 'wx', encoding: 'utf8' });
      return { unitId, workerId, held: true, won: true };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      const holder = fs.readFileSync(p, 'utf8');
      if (holder === workerId) {
        return { unitId, workerId, held: true, won: false }; // idempotent re-claim
      }
      throw new ClaimDenied(unitId, holder, workerId);
    }
  }

  holderOf(unitId: string): string | null {
    try {
      return fs.readFileSync(lockPath(this.dir, unitId), 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  /** Release only by the holder; anyone else gets ClaimDenied. */
  release(unitId: string, workerId: string): void {
    const holder = this.holderOf(unitId);
    if (holder === null) return;
    if (holder !== workerId) throw new ClaimDenied(unitId, holder, workerId);
    fs.unlinkSync(lockPath(this.dir, unitId));
  }
}
