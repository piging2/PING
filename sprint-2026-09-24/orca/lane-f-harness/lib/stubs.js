'use strict';
/**
 * Lane F harness — stub runtimes for driving lane A's repaired scheduler
 * in-sandbox (read-only-derived from wr-effect-unknown/regression-failclosed.js;
 * the patch files themselves are never modified).
 */
const path = require('path');
const { WorkerRuntime } = require(path.join(
  '/home/hatch/workspace/sprint-2026-09-24/orca/wr-effect-unknown/patch/worker_runtime.js'));
const { MissionScheduler } = require(path.join(
  '/home/hatch/workspace/sprint-2026-09-24/orca/wr-effect-unknown/patch/orchestration/mission_scheduler.js'));

class StubMissionRuntime {
  constructor() { this.missions = new Map(); }
  seed(m) { this.missions.set(m.mission_id, { status: 'created', retries: 0, ...m }); }
  get(id) { return this.missions.get(id); }
  async assign(id) { const m = this.missions.get(id); if (!m || m.status !== 'created') return 0; m.status = 'assigned'; return 1; }
  async start(id) { const m = this.missions.get(id); if (m && m.status === 'assigned') m.status = 'running'; }
  async complete(id, result) { const m = this.missions.get(id); if (m && (m.status === 'running' || m.status === 'assigned')) { m.status = 'completed'; m.result = result; } }
  async failWithRetry(id, error, policy = {}) {
    const maxAttempts = policy.max_attempts || 3;
    const m = this.missions.get(id);
    if (!m) return 0;
    m.retries = (m.retries || 0) + 1;
    m.last_error = String(error);
    m.status = m.retries >= maxAttempts ? 'failed' : 'retry_pending';
    m.retry_at = Date.now();
    return m.retries;
  }
  async reclaimRetryPending() {
    let n = 0;
    for (const m of this.missions.values()) {
      if (m.status === 'retry_pending' && (m.retry_at || 0) <= Date.now()) { m.status = 'created'; n++; }
    }
    return n;
  }
  async getPending() { return [...this.missions.values()].filter((m) => m.status === 'created'); }
  async findStuckRunning(cutoffIso) {
    return [...this.missions.values()].filter(
      (m) => (m.status === 'running' || m.status === 'assigned') && (m.started_at || '1970-01-01') < cutoffIso);
  }
}

class StubEventRuntime {
  constructor() { this.emitted = []; }
  async emit(type, source, payload) { this.emitted.push({ type, source, payload }); return { status: 'ok' }; }
}

class StubDLQ {
  constructor() { this.letters = []; }
  async recordDeadLetter(job, error) { this.letters.push({ job, error: String(error) }); }
}

function makeScheduler(stub, rt, opts = {}) {
  const events = new StubEventRuntime();
  const dlq = new StubDLQ();
  const scheduler = new MissionScheduler({
    missionRuntime: stub,
    workerRuntime: rt,
    eventRuntime: events,
    deadLetterAuthority: dlq,
    retryPolicy: { max_attempts: 3, backoff_delay_ms: 0 },
    dispatchTimeoutMs: opts.dispatchTimeoutMs || 2000,
    stuckThresholdMs: opts.stuckThresholdMs || 60000,
  });
  return { scheduler, events, dlq };
}

async function captureConsole(fn) {
  const out = [];
  const origLog = console.log; const origErr = console.error;
  console.log = (...a) => out.push(a.join(' '));
  console.error = (...a) => out.push(a.join(' '));
  try { await fn(); } finally { console.log = origLog; console.error = origErr; }
  return out.join('\n');
}

/** Counter-file effect stand-in (same technique as evidence-provider-effects.jsonl). */
const fs = require('fs');
function makeProvider(dir, tag) {
  const file = path.join(dir, `provider-${tag}.jsonl`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return {
    file,
    effect(detail) { fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), detail }) + '\n'); },
    count() {
      if (!fs.existsSync(file)) return 0;
      return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).length;
    },
  };
}

module.exports = { WorkerRuntime, MissionScheduler, StubMissionRuntime, StubEventRuntime, StubDLQ, makeScheduler, captureConsole, makeProvider };
