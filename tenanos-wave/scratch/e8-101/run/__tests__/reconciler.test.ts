/**
 * Reconciler tests with an in-memory fake MissionStore.
 * Run: jest --config src/tenanos/jest.config.cjs src/tenanos/run/__tests__/reconciler.test.ts
 *
 * These encode KB-02/KB-04 expectations: the double-execution defect is
 * closed when the reconciler, not the blind reaper, owns expired leases.
 */
import {
  EmitEvent,
  MissionStore,
  ReconciliationEvidenceInput,
  reconcileAtStartup,
  reconcileOnce,
} from '../reconciler';
import { MissionRow, RunAttempt } from '../run-state-authority';

const NOW = Date.now();
const PAST = new Date(NOW - 120_000).toISOString(); // lease expired
const FUTURE = new Date(NOW + 60_000).toISOString();

class FakeStore implements MissionStore {
  rows = new Map<string, MissionRow & { result?: unknown }>();
  evidence = new Map<string, ReconciliationEvidenceInput>();
  attempts: RunAttempt[] = [];
  queue = new Map<string, { fromState: string; resolved: string | null }>();
  resets: string[] = [];

  async getNonTerminal() {
    return [...this.rows.values()].filter((r) => r.status !== 'completed' && r.status !== 'failed');
  }
  async getEvidence(missionId: string) {
    const e = this.evidence.get(missionId);
    if (!e) throw new Error(`no evidence for ${missionId}`);
    return e;
  }
  async markSucceeded(missionId: string, result: Record<string, unknown>) {
    const r = this.rows.get(missionId)!;
    r.status = 'completed';
    r.result = result;
  }
  async resetToCreated(missionId: string, _reason: string) {
    const r = this.rows.get(missionId)!;
    r.status = 'created';
    this.resets.push(missionId);
  }
  async recordAttempt(a: RunAttempt) { this.attempts.push(a); }
  async enqueueReconciliation(missionId: string, fromState: string) {
    if (!this.queue.has(missionId)) this.queue.set(missionId, { fromState, resolved: null });
  }
  async resolveReconciliation(missionId: string, resolution: string) {
    this.queue.get(missionId)!.resolved = resolution;
  }
}

function row(mission_id: string, status: string, lease_until: string | null): MissionRow {
  return { mission_id, status, lease_until, assigned_to: 'effect-worker', retries: 0 };
}
function ev(effectProven: boolean, effectAbsent: boolean, attemptStarted: boolean): ReconciliationEvidenceInput {
  return { effectProven, effectAbsent, attemptStarted, refs: [`ev:${effectProven}:${effectAbsent}:${attemptStarted}`] };
}

describe('reconcileOnce', () => {
  test('KB-04: effect proven, ack lost -> marked succeeded, never re-executed', async () => {
    const store = new FakeStore();
    store.rows.set('m1', row('m1', 'running', PAST));
    store.evidence.set('m1', ev(true, false, true));
    const emitted: Array<[string, string, unknown]> = [];
    const emit: EmitEvent = async (t, s, p) => { emitted.push([t, s, p]); };

    const report = await reconcileOnce(store, emit, NOW);
    expect(report.markedSucceeded).toBe(1);
    expect(report.requeued).toBe(0);
    expect(store.rows.get('m1')!.status).toBe('completed');
    expect(store.resets).not.toContain('m1'); // no re-dispatch path taken
    expect(emitted.some(([t]) => t === 'MISSION_RECONCILED')).toBe(true);
    const payload = emitted.find(([t]) => t === 'MISSION_RECONCILED')![2] as { reexecute: boolean };
    expect(payload.reexecute).toBe(false);
  });

  test('KB-02: worker died before effect -> requeued with attempt lineage', async () => {
    const store = new FakeStore();
    store.rows.set('m2', row('m2', 'assigned', PAST));
    store.evidence.set('m2', ev(false, true, false));
    const report = await reconcileOnce(store, async () => {}, NOW);
    expect(report.requeued).toBe(1);
    expect(store.rows.get('m2')!.status).toBe('created');
    expect(store.attempts).toHaveLength(1);
    expect(store.attempts[0].mission_id).toBe('m2');
  });

  test('indeterminate -> held, left in queue, not reset', async () => {
    const store = new FakeStore();
    store.rows.set('m3', row('m3', 'running', PAST));
    store.evidence.set('m3', ev(false, false, true));
    const report = await reconcileOnce(store, async () => {}, NOW);
    expect(report.held).toBe(1);
    expect(store.rows.get('m3')!.status).toBe('running'); // untouched
    expect(store.queue.get('m3')!.resolved).toBeNull(); // still queued
  });

  test('live-lease rows are ignored (not UNKNOWN_EXECUTION)', async () => {
    const store = new FakeStore();
    store.rows.set('m4', row('m4', 'running', FUTURE));
    store.rows.set('m5', row('m5', 'created', null));
    const report = await reconcileOnce(store, async () => {}, NOW);
    expect(report.enqueued).toBe(0);
    expect(report.scanned).toBe(2);
  });

  test('pass is idempotent: second run finds nothing to do', async () => {
    const store = new FakeStore();
    store.rows.set('m1', row('m1', 'running', PAST));
    store.evidence.set('m1', ev(true, false, true));
    await reconcileOnce(store, async () => {}, NOW);
    const second = await reconcileOnce(store, async () => {}, NOW);
    expect(second.enqueued).toBe(0);
    expect(second.markedSucceeded).toBe(0);
    expect(second.errors).toHaveLength(0);
  });

  test('evidence failure is recorded, does not abort the pass', async () => {
    const store = new FakeStore();
    store.rows.set('bad', row('bad', 'running', PAST)); // no evidence -> throws
    store.rows.set('good', row('good', 'running', PAST));
    store.evidence.set('good', ev(false, true, false));
    const report = await reconcileOnce(store, async () => {}, NOW);
    expect(report.errors).toHaveLength(1);
    expect(report.requeued).toBe(1); // the good row still processed
  });
});

describe('reconcileAtStartup', () => {
  test('freezes dispatch during the pass, unfreezes after (KB-03)', async () => {
    const store = new FakeStore();
    store.rows.set('m1', row('m1', 'assigned', PAST));
    store.evidence.set('m1', ev(false, true, false));
    const frozen: boolean[] = [];
    const report = await reconcileAtStartup(store, async () => {}, (f) => { frozen.push(f); });
    expect(frozen).toEqual([true, false]);
    expect(report.requeued).toBe(1);
  });

  test('unfreezes even when the pass throws', async () => {
    const store = new FakeStore();
    (store as unknown as { getNonTerminal(): Promise<never> }).getNonTerminal = async () => {
      throw new Error('db down');
    };
    const frozen: boolean[] = [];
    await expect(reconcileAtStartup(store, async () => {}, (f) => { frozen.push(f); })).rejects.toThrow('db down');
    expect(frozen).toEqual([true, false]);
  });
});
