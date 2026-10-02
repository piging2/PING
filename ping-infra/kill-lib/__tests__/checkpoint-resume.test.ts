/**
 * checkpoint-resume tests. Real files, real atomic renames, real restarts
 * (new CheckpointStore instances — the only honest simulation of a process
 * death in-process code can offer, since memory is definitionally lost).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  CheckpointStore,
  StaleCheckpointError,
  RevalidationFailedError,
} from '../src/checkpoint-resume';
import { IdempotencyStore } from '../src/idempotency';

jest.setTimeout(30000);

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ckpt-test-'));
}

describe('checkpoint-resume', () => {
  test('save -> restart -> resume returns state after revalidation passes', async () => {
    const dir = tmpDir();
    const external = path.join(dir, 'external.marker');
    fs.writeFileSync(external, 'v1');

    const s1 = new CheckpointStore<{ step: number }>(dir, {
      revalidate: (state) => {
        if (!fs.existsSync(external)) throw new Error('external state gone');
        if (state.step !== 1) throw new Error('unexpected state');
      },
    });
    const cp = await s1.save({ step: 1 });
    expect(cp.seq).toBe(1);
    expect(cp.receipt).toMatch(/^[0-9a-f]{64}$/);

    // "restart": a brand-new instance, no shared memory
    const s2 = new CheckpointStore<{ step: number }>(dir, {
      revalidate: (state) => {
        if (!fs.existsSync(external)) throw new Error('external state gone');
      },
    });
    const resumed = await s2.resume();
    expect(resumed).toEqual({ step: 1 });
  });

  test('resume fails loudly when external state diverged (fixture-drift gate)', async () => {
    const dir = tmpDir();
    const external = path.join(dir, 'external.marker');
    fs.writeFileSync(external, 'v1');

    const s1 = new CheckpointStore<{ step: number }>(dir);
    await s1.save({ step: 1 });

    // The world moved on: the marker the checkpoint depended on is gone.
    fs.unlinkSync(external);

    const s2 = new CheckpointStore<{ step: number }>(dir, {
      revalidate: () => {
        if (!fs.existsSync(external)) throw new Error('external marker missing: world diverged');
      },
    });
    await expect(s2.resume()).rejects.toBeInstanceOf(RevalidationFailedError);
  });

  test('resumeFrom(stale seq) throws StaleCheckpointError: stale narrative never wins', async () => {
    const dir = tmpDir();
    const s = new CheckpointStore<{ step: number }>(dir);
    await s.save({ step: 1 });
    await s.save({ step: 2 });

    const err = await s.resumeFrom(1).catch((e) => e);
    expect(err).toBeInstanceOf(StaleCheckpointError);
    expect((err as StaleCheckpointError).requestedSeq).toBe(1);
    expect((err as StaleCheckpointError).latestSeq).toBe(2);

    // latest() still resumes fine
    expect(await s.resume()).toEqual({ step: 2 });
  });

  test('ack-before-durable is invisible after restart: the consumer must re-execute', async () => {
    const dir = tmpDir();
    const idemDir = path.join(dir, 'idem');
    let executions = 0;

    // Consumer bug simulation: the "checkpoint" is only ever held in memory
    // (an ack), never save()d. Then the process dies.
    const memoryOnlyAck = { step: 1, receipt: 'in-memory-only' };
    expect(memoryOnlyAck.receipt).toBe('in-memory-only');

    // Restart: new store, new idempotency store, same directories.
    const s2 = new CheckpointStore<{ step: number }>(dir);
    expect(await s2.latest()).toBeNull();
    expect(await s2.resume()).toBeNull();

    // Honest recovery: re-execute under an idempotency key so the re-run is safe.
    const idem = new IdempotencyStore(idemDir);
    const r = await idem.execute('work-unit-7', async () => {
      executions += 1;
      return 'result-7';
    });
    expect(r.executed).toBe(true);
    expect(r.outcome).toBe('SUCCEEDED');
    expect(executions).toBe(1);

    // And a duplicate retry after the honest re-execution does not re-run.
    const r2 = await idem.execute('work-unit-7', async () => {
      executions += 1;
      return 'result-7';
    });
    expect(r2.executed).toBe(false);
    expect(r2.value).toBe('result-7');
    expect(executions).toBe(1);
  });

  test('corrupt checkpoint file is detected, never silently restored', async () => {
    const dir = tmpDir();
    const s = new CheckpointStore<{ step: number }>(dir);
    await s.save({ step: 1 });
    // Tamper with the durable file.
    fs.writeFileSync(path.join(dir, 'checkpoint.json'), '{"seq":1,"state":{"step":999},"receipt":"forged"}');
    await expect(s.latest()).rejects.toThrow(/receipt mismatch/);
  });
});
