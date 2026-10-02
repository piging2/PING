/**
 * claim-race tests. The cross-process race uses REAL forked Node processes
 * (8 of them) contending on the same unit via the real O_EXCL mechanism —
 * the same code path the library uses, compiled from the same TS source.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fork } from 'child_process';
import { execFileSync } from 'child_process';
import { WorkUnitClaim, ClaimDenied } from '../src/claim-race';

jest.setTimeout(30000);

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claim-test-'));
}

/** Compile the real TS source to JS once, so child processes run library code. */
function compileClaimJs(outDir: string): string {
  const tsc = path.join(__dirname, '..', 'node_modules', '.bin', 'tsc');
  const src = path.join(__dirname, '..', 'src', 'claim-race.ts');
  execFileSync(tsc, [src, '--outDir', outDir, '--module', 'commonjs', '--target', 'es2019', '--moduleResolution', 'node'], {
    stdio: 'pipe',
  });
  const out = path.join(outDir, 'claim-race.js');
  if (!fs.existsSync(out)) throw new Error('tsc did not emit claim-race.js');
  return out;
}

describe('claim-race', () => {
  test('in-process: winner, typed denial, idempotent re-claim, release', () => {
    const c = new WorkUnitClaim(tmpDir());
    const w1 = c.claim('packet-1', 'worker-a');
    expect(w1).toEqual({ unitId: 'packet-1', workerId: 'worker-a', held: true, won: true });

    // Same worker re-claims: idempotent, not a second win.
    const w1b = c.claim('packet-1', 'worker-a');
    expect(w1b.held).toBe(true);
    expect(w1b.won).toBe(false);

    // Another worker: typed denial naming the holder.
    const denied = (() => {
      try {
        c.claim('packet-1', 'worker-b');
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(denied).toBeInstanceOf(ClaimDenied);
    expect((denied as ClaimDenied).holder).toBe('worker-a');
    expect((denied as ClaimDenied).unitId).toBe('packet-1');

    // Release by a non-holder is refused; by the holder it frees the unit.
    expect(() => c.release('packet-1', 'worker-b')).toThrow(ClaimDenied);
    c.release('packet-1', 'worker-a');
    expect(c.holderOf('packet-1')).toBeNull();
    const w2 = c.claim('packet-1', 'worker-b');
    expect(w2.won).toBe(true);
  });

  test('8 real processes race one unit: exactly one winner', async () => {
    const dir = tmpDir();
    const jsDir = path.join(dir, 'js');
    fs.mkdirSync(jsDir, { recursive: true });
    const claimJs = compileClaimJs(jsDir);

    const childSource = `
      const { WorkUnitClaim } = require(${JSON.stringify(claimJs)});
      const c = new WorkUnitClaim(${JSON.stringify(dir)});
      try {
        const r = c.claim('hot-packet', process.env.KILL_LIB_WORKER);
        console.log(r.won ? 'WON' : 'HELD');
      } catch (e) {
        console.log('DENIED holder=' + e.holder);
      }
    `;
    const childPath = path.join(dir, 'racer.js');
    fs.writeFileSync(childPath, childSource, 'utf8');

    const N = 8;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        new Promise<string>((resolve, reject) => {
          const child = fork(childPath, [], {
            env: { ...process.env, KILL_LIB_WORKER: `worker-${i}` },
            stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
          });
          let out = '';
          child.stdout?.on('data', (d: Buffer) => (out += d.toString('utf8')));
          child.on('error', reject);
          child.on('exit', (code) => {
            if (code !== 0) reject(new Error(`racer exited ${code}: ${out}`));
            else resolve(out.trim());
          });
        }),
      ),
    );

    const winners = results.filter((r) => r === 'WON');
    const denied = results.filter((r) => r.startsWith('DENIED'));
    expect(results).toHaveLength(N);
    expect(winners).toHaveLength(1); // exactly one winner across 8 real processes
    expect(denied).toHaveLength(N - 1);
    // Every loser names the same holder: the one true winner.
    const holders = new Set(denied.map((d) => d.split('holder=')[1]));
    expect(holders.size).toBe(1);
  });

  test('unsafe unit ids are rejected before touching the filesystem', () => {
    const c = new WorkUnitClaim(tmpDir());
    expect(() => c.claim('../../etc/pwned', 'w')).toThrow(/unsafe unitId/);
  });
});
