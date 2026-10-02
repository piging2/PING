const fs = require('fs');
const path = require('path');

// Generated from state_machine_registry.json — single source of truth
const _generatedMachine = (() => {
  const registry = require(path.join(__dirname, '..', '..', '..', 'gateway', 'generated', 'state_machine_registry.json'));
  const worker = registry.state_machines.find(m => m.name === 'WorkerLifecycle');
  if (!worker) throw new Error('[WorkerStateMachine] WorkerLifecycle not found in state_machine_registry.json');
  const transMap = {};
  for (const t of worker.transitions) {
    if (!transMap[t.from]) transMap[t.from] = [];
    transMap[t.from].push(t.to);
  }
  return { states: worker.states, transitions: transMap };
})();

const VALID_STATES = _generatedMachine.states;
const MEMORY_DIR = path.join(__dirname, '..', 'worker_memory');

class WorkerStateMachine {
  constructor(eventQueue) {
    this._events = eventQueue;
    this._states = new Map();
    this._timestamps = new Map();
    this._memoryCache = new Map();

    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }
    this._loadMemory();
  }

  transition(workerId, newState, metadata = {}) {
    if (!VALID_STATES.includes(newState)) {
      console.warn(`[WorkerStateMachine] Invalid state: ${newState}`);
      return false;
    }

    const currentState = this._states.get(workerId) || 'idle';

    if (!this._isValidTransition(currentState, newState)) {
      console.warn(`[WorkerStateMachine] Invalid transition: ${currentState} → ${newState}`);
      return false;
    }

    this._states.set(workerId, newState);
    this._timestamps.set(workerId, Date.now());

    const eventType = newState === 'running' ? 'worker_started' :
      newState === 'completed' ? 'worker_completed' :
      newState === 'failed' ? 'worker_failed' : null;

    if (eventType) {
      this._events.emit(eventType, {
        workerId,
        state: newState,
        previousState: currentState,
        metadata,
        missionId: metadata.missionId || null
      });
    }

    if (newState === 'completed' || newState === 'failed' || newState === 'archived') {
      this._persistWorker(workerId);
    }

    return true;
  }

  getState(workerId) {
    return this._states.get(workerId) || 'idle';
  }

  getLastTransition(workerId) {
    return this._timestamps.get(workerId) || null;
  }

  isStuck(workerId, timeoutMs = 300000) {
    const lastTransition = this._timestamps.get(workerId);
    if (!lastTransition) return false;
    const state = this._states.get(workerId);
    if (state === 'idle' || state === 'completed' || state === 'failed') return false;
    return Date.now() - lastTransition > timeoutMs;
  }

  recoverStuckWorkers(timeoutMs = 300000) {
    const stuck = [];
    for (const [workerId, state] of this._states) {
      if (this.isStuck(workerId, timeoutMs)) {
        stuck.push({ workerId, state, since: this._timestamps.get(workerId) });
        this.transition(workerId, 'failed', { reason: 'timeout', previousState: state });
      }
    }
    return stuck;
  }

  recordFinding(workerId, finding) {
    const memory = this._loadWorkerMemory(workerId);
    memory.findings.push({
      ...finding,
      recordedAt: new Date().toISOString()
    });
    this._saveWorkerMemory(workerId, memory);
  }

  recordFix(workerId, fix, accepted, rejectionReason) {
    const memory = this._loadWorkerMemory(workerId);
    const record = { ...fix, accepted, rejectionReason: rejectionReason || null, recordedAt: new Date().toISOString() };
    if (accepted) {
      memory.acceptedFixes.push(record);
    } else {
      memory.rejectedFixes.push(record);
    }
    this._saveWorkerMemory(workerId, memory);
  }

  recordPattern(workerId, pattern, type) {
    const memory = this._loadWorkerMemory(workerId);
    if (type === 'anti-pattern') {
      if (!memory.antiPatterns.some(p => p.pattern === pattern)) {
        memory.antiPatterns.push({ pattern, recordedAt: new Date().toISOString() });
      }
    } else {
      if (!memory.knownPatterns.some(p => p.pattern === pattern)) {
        memory.knownPatterns.push({ pattern, recordedAt: new Date().toISOString() });
      }
    }
    this._saveWorkerMemory(workerId, memory);
  }

  getContext(workerId) {
    const memory = this._loadWorkerMemory(workerId);
    const parts = [`WORKER MEMORY: ${workerId}`];

    if (memory.sessionCount > 0) {
      parts.push(`  Sessions: ${memory.sessionCount}`);
      parts.push(`  Findings: ${memory.findings.length}`);
      parts.push(`  Accepted fixes: ${memory.acceptedFixes.length}`);
      parts.push(`  Rejected fixes: ${memory.rejectedFixes.length}`);
    }

    if (memory.knownPatterns.length > 0) {
      const recent = memory.knownPatterns.slice(-3);
      parts.push(`  Known patterns: ${recent.map(p => p.pattern).join(', ')}`);
    }

    if (memory.antiPatterns.length > 0) {
      const recent = memory.antiPatterns.slice(-3);
      parts.push(`  Anti-patterns: ${recent.map(p => p.pattern).join(', ')}`);
    }

    if (memory.acceptedFixes.length > 0) {
      const last = memory.acceptedFixes[memory.acceptedFixes.length - 1];
      parts.push(`  Last accepted: ${last.pattern || last.file || 'N/A'}`);
    }

    return parts.join('\n');
  }

  getStats() {
    const byState = {};
    for (const state of VALID_STATES) {
      byState[state] = 0;
    }
    for (const state of this._states.values()) {
      byState[state] = (byState[state] || 0) + 1;
    }

    const allMemory = Array.from(this._memoryCache.values());
    return {
      totalWorkers: this._states.size,
      byState,
      totalFindings: allMemory.reduce((s, m) => s + m.findings.length, 0),
      totalAccepted: allMemory.reduce((s, m) => s + m.acceptedFixes.length, 0),
      totalRejected: allMemory.reduce((s, m) => s + m.rejectedFixes.length, 0),
      totalPatterns: allMemory.reduce((s, m) => s + m.knownPatterns.length, 0),
      totalAntiPatterns: allMemory.reduce((s, m) => s + m.antiPatterns.length, 0)
    };
  }

  _isValidTransition(from, to) {
    if (from === to) return true;
    const allowed = _generatedMachine.transitions[from];
    if (allowed) return allowed.includes(to);
    return false;
  }

  _loadWorkerMemory(workerId) {
    if (this._memoryCache.has(workerId)) {
      return this._memoryCache.get(workerId);
    }

    const filePath = path.join(MEMORY_DIR, `${workerId}.json`);
    let memory = {
      workerId,
      sessionCount: 0,
      findings: [],
      acceptedFixes: [],
      rejectedFixes: [],
      knownPatterns: [],
      antiPatterns: []
    };

    if (fs.existsSync(filePath)) {
      try {
        memory = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) { }
    }

    this._memoryCache.set(workerId, memory);
    return memory;
  }

  _saveWorkerMemory(workerId, memory) {
    memory.sessionCount++;
    const filePath = path.join(MEMORY_DIR, `${workerId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(memory, null, 2));
    this._memoryCache.set(workerId, memory);
  }

  _persistWorker(workerId) {
    const memory = this._loadWorkerMemory(workerId);
    memory.lastState = this._states.get(workerId);
    memory.lastTransition = this._timestamps.get(workerId);
    this._saveWorkerMemory(workerId, memory);
  }

  _loadMemory() {
    if (!fs.existsSync(MEMORY_DIR)) return;
    const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(MEMORY_DIR, file), 'utf8'));
        this._memoryCache.set(data.workerId, data);
      } catch (e) { }
    }
  }
}

module.exports = { WorkerStateMachine, VALID_STATES };
