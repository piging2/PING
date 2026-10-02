/**
 * kill-mid-effect tests. REAL mechanism throughout: real forked child
 * processes, real SIGKILL, real IPC, real files. No mocks.
 *
 * Flagship proof: a kill inside the uninterruptible commit window, where no
 * durable receipt exists and the probe cannot observe the external system,
 * MUST classify as OUTCOME_UNKNOWN — never FAILED, never SUCCEEDED.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runAndKill, classifyAfterKill } from '../src/kill-mid-effect';

jest.setTimeout(30000);

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kill-test-'));
}

describe('kill-mid-effect', () => {
  test('FLAGSHIP: kill inside the commit window yields OUTCOME_UNKNOWN', async () => {
    const dir = tmpDir();
    // The child enters an uninterruptible commit window. The external effect
    // (a charge, a sent message, a dispatched job) MAY happen in here, but no
    // durable local receipt exists yet and the probe cannot read the external
    // system. The parent kills the instant the window is entered.
    const childSource = `
      process.send({ type: 'WINDOW_ENTERED' });
      // Uninterruptible work would happen here. Stay alive so the SIGKILL
      // provably lands inside the window.
      setTimeout(() => { process.send({ type: 'RECEIPT_WRITTEN' }); }, 30000);
    `;
    const run = await runAndKill({ childSource, killTrigger: { onIpc: 'WINDOW_ENTERED' } }, dir);

    expect(run.killed).toBe(true); // the signal was actually delivered to a live child
    expect(run.exitSignal).toBe('SIGKILL');
    expect(run.observedIpc).toEqual([{ type: 'WINDOW_ENTERED' }]);
    expect(run.childLog).not.toContain('RECEIPT_WRITTEN');

    // The probe cannot observe the external system: UNVERIFIABLE is honest.
    const verdict = classifyAfterKill('UNVERIFIABLE', run, 'commit-window-kill');
    expect(verdict.outcome).toBe('OUTCOME_UNKNOWN');
    expect(verdict.outcome).not.toBe('FAILED'); // it did NOT provably fail
    expect(verdict.outcome).not.toBe('SUCCEEDED'); // it did NOT provably succeed
    expect(verdict.evidence.length).toBeGreaterThan(0);
    expect(verdict.evidence.join('\n')).toMatch(/OUTCOME_UNKNOWN|unverifiable|may have completed/);
  });

  test('kill before the effect starts: effect provably absent -> FAILED', async () => {
    const dir = tmpDir();
    const marker = path.join(dir, 'effect.marker');
    const childSource = `
      const fs = require('fs');
      process.send({ type: 'STARTING' });
      setTimeout(() => {
        fs.writeFileSync(${JSON.stringify(marker)}, 'done'); // the effect's durable receipt
        process.send({ type: 'DONE' });
      }, 30000);
    `;
    const run = await runAndKill({ childSource, killTrigger: { onIpc: 'STARTING' } }, dir);

    expect(run.killed).toBe(true);
    expect(run.exitSignal).toBe('SIGKILL');
    // The effect never ran: its receipt cannot exist. The probe's ABSENT reading is genuine.
    expect(fs.existsSync(marker)).toBe(false);

    const verdict = classifyAfterKill('EFFECT_ABSENT', run, 'pre-effect-kill');
    expect(verdict.outcome).toBe('FAILED');
  });

  test('no kill, effect completes: receipt observable -> SUCCEEDED', async () => {
    const dir = tmpDir();
    const marker = path.join(dir, 'effect.marker');
    const childSource = `
      const fs = require('fs');
      fs.writeFileSync(${JSON.stringify(marker)}, 'done');
      process.send({ type: 'DONE' });
    `;
    // Kill trigger far in the future: the child exits on its own first.
    const run = await runAndKill({ childSource, killTrigger: { afterMs: 60000 } }, dir);

    expect(run.killed).toBe(false);
    expect(run.exitCode).toBe(0);
    expect(fs.existsSync(marker)).toBe(true);

    const verdict = classifyAfterKill('EFFECT_OBSERVABLE', run, 'clean-run');
    expect(verdict.outcome).toBe('SUCCEEDED');
  });

  test('kill AFTER the durable receipt: the kill does not unhappen the effect -> SUCCEEDED', async () => {
    const dir = tmpDir();
    const marker = path.join(dir, 'effect.marker');
    const childSource = `
      const fs = require('fs');
      fs.writeFileSync(${JSON.stringify(marker)}, 'done'); // durable receipt first
      process.send({ type: 'RECEIPT_WRITTEN' });
      setTimeout(() => {}, 30000); // then stay alive to be killed
    `;
    const run = await runAndKill({ childSource, killTrigger: { onIpc: 'RECEIPT_WRITTEN' } }, dir);

    expect(run.killed).toBe(true);
    expect(run.exitSignal).toBe('SIGKILL');
    expect(fs.existsSync(marker)).toBe(true);

    const verdict = classifyAfterKill('EFFECT_OBSERVABLE', run, 'post-receipt-kill');
    expect(verdict.outcome).toBe('SUCCEEDED');
  });

  test('SIGKILL at an arbitrary point never fabricates an outcome', async () => {
    const dir = tmpDir();
    const childSource = `
      process.send({ type: 'ALIVE' });
      setTimeout(() => {}, 30000);
    `;
    const run = await runAndKill({ childSource, killTrigger: { afterMs: 400 } }, dir);
    expect(run.killed).toBe(true);

    // Whatever the probe says, the verdict follows the probe — the library
    // adds no information of its own. It cannot upgrade UNVERIFIABLE.
    const v = classifyAfterKill('UNVERIFIABLE', run, 'arbitrary-kill');
    expect(v.outcome).toBe('OUTCOME_UNKNOWN');
    expect(v.evidence[0]).toMatch(/kill: delivered=true/);
  });
});
