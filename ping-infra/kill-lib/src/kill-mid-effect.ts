/**
 * kill-mid-effect — run a real child process, kill it with a real signal at a
 * controlled point, and classify the effect honestly on recovery.
 *
 * Real mechanism: child_process.fork of caller-supplied JS, real SIGKILL (or
 * caller-chosen signal), real IPC. No mocks: the child actually dies.
 *
 * Child protocol (plain Node, no dependencies):
 *   - the child may call process.send({ type: '<anything>' }) at any time;
 *   - the parent records every IPC message and every stdout line;
 *   - the kill trigger fires on a matching IPC type or after a delay.
 *
 * Gates failure classes:
 *   FC-20260923-001  tool performs effect then connection dies before response
 *                    (kill between commit and receipt -> OUTCOME_UNKNOWN, never FAILED)
 *   FC-20260923-002  host sleep destroys a live target mid-effect
 *                    (SIGKILL at an arbitrary point -> honest re-probe, no fabricated outcome)
 */

import { fork, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EffectVerdict, ProbeResult, classifyProbeResult } from './types';

export type KillTrigger = { onIpc: string } | { afterMs: number };

export interface KillPlan {
  /** JS source of the child process. Written to a temp file and forked. */
  childSource: string;
  /** When to deliver the kill signal. */
  killTrigger: KillTrigger;
  /** Defaults to SIGKILL — the uncatchable, unmaskable death. */
  signal?: NodeJS.Signals;
  /** Hard ceiling on the whole run. Defaults to 15s. */
  timeoutMs?: number;
}

export interface KillRunResult {
  /** True when the kill signal was actually delivered to a live child. */
  killed: boolean;
  exitSignal: NodeJS.Signals | null;
  exitCode: number | null;
  /** Every IPC message received from the child, in order. */
  observedIpc: unknown[];
  /** Every stdout line from the child, in order. */
  childLog: string[];
  childPath: string;
}

function isOnIpc(t: KillTrigger): t is { onIpc: string } {
  return (t as { onIpc: string }).onIpc !== undefined;
}

export async function runAndKill(plan: KillPlan, workDir?: string): Promise<KillRunResult> {
  const dir = workDir ?? (await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kill-lib-')));
  await fs.promises.mkdir(dir, { recursive: true });
  const childPath = path.join(dir, `child-${process.pid}-${Date.now()}.js`);
  await fs.promises.writeFile(childPath, plan.childSource, 'utf8');

  const signal: NodeJS.Signals = plan.signal ?? 'SIGKILL';
  const timeoutMs = plan.timeoutMs ?? 15000;

  return new Promise<KillRunResult>((resolve, reject) => {
    const child: ChildProcess = fork(childPath, [], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    const observedIpc: unknown[] = [];
    const childLog: string[] = [];
    let killed = false;
    let settled = false;
    let killTimer: NodeJS.Timeout | undefined;

    const finish = (result: Omit<KillRunResult, 'childPath'>) => {
      if (settled) return;
      settled = true;
      if (killTimer) clearTimeout(killTimer);
      clearTimeout(hardTimer);
      resolve({ ...result, childPath });
    };

    const hardTimer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        /* already gone */
      }
      finish({
        killed,
        exitSignal: null,
        exitCode: null,
        observedIpc,
        childLog: [...childLog, 'KILL_LIB_TIMEOUT'],
      });
    }, timeoutMs);
    hardTimer.unref?.();

    child.on('message', (msg: unknown) => {
      observedIpc.push(msg);
      if (
        !killed &&
        isOnIpc(plan.killTrigger) &&
        msg !== null &&
        typeof msg === 'object' &&
        (msg as { type?: unknown }).type === plan.killTrigger.onIpc
      ) {
        killed = child.kill(signal);
      }
    });

    child.stdout?.on('data', (d: Buffer) => {
      for (const line of d.toString('utf8').split('\n')) {
        const t = line.trim();
        if (t) childLog.push(t);
      }
    });
    child.stderr?.on('data', (d: Buffer) => {
      for (const line of d.toString('utf8').split('\n')) {
        const t = line.trim();
        if (t) childLog.push(`stderr: ${t}`);
      }
    });

    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(hardTimer);
        if (killTimer) clearTimeout(killTimer);
        reject(err);
      }
    });

    child.on('exit', (code, sig) => {
      finish({ killed, exitSignal: sig, exitCode: code, observedIpc, childLog });
    });

    if (!isOnIpc(plan.killTrigger)) {
      killTimer = setTimeout(() => {
        if (!settled) killed = child.kill(signal);
      }, plan.killTrigger.afterMs);
      killTimer.unref?.();
    }
  });
}

/**
 * Classify the effect after the kill. The caller supplies the probe; the
 * library enforces the honest mapping. A probe that cannot observe the
 * external system MUST return 'UNVERIFIABLE', and the verdict is then
 * OUTCOME_UNKNOWN — the flagship guarantee of this library.
 */
export function classifyAfterKill(
  probe: ProbeResult,
  run: Pick<KillRunResult, 'killed' | 'exitSignal' | 'observedIpc'>,
  context: string,
): EffectVerdict {
  const v = classifyProbeResult(probe, context);
  v.evidence.unshift(
    `kill: delivered=${run.killed} signal=${String(run.exitSignal)} ipc_seen=${run.observedIpc.length}`,
  );
  return v;
}
