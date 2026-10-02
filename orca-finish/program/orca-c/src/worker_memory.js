const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, 'worker_memory');

class WorkerMemory {
  constructor() {
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }
    this._cache = {};
    this._loadAll();
  }

  _loadAll() {
    if (!fs.existsSync(MEMORY_DIR)) return;
    const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const workerId = file.replace('.json', '');
        const data = JSON.parse(fs.readFileSync(path.join(MEMORY_DIR, file), 'utf8'));
        this._cache[workerId] = data;
      } catch (e) { }
    }
  }

  _ensure(workerId) {
    if (!this._cache[workerId]) {
      this._cache[workerId] = {
        workerId,
        created_at: new Date().toISOString(),
        last_session: null,
        session_count: 0,
        findings: [],
        accepted_fixes: [],
        rejected_fixes: [],
        known_patterns: [],
        anti_patterns: [],
        confidence_history: []
      };
    }
    return this._cache[workerId];
  }

  recordFinding(workerId, finding) {
    const mem = this._ensure(workerId);
    mem.findings.push({
      ...finding,
      recorded_at: new Date().toISOString()
    });
    mem.last_session = new Date().toISOString();
    mem.session_count++;
    this._persist(workerId);
  }

  recordFix(workerId, fix, accepted) {
    const mem = this._ensure(workerId);
    const record = {
      ...fix,
      accepted,
      recorded_at: new Date().toISOString()
    };
    if (accepted) {
      mem.accepted_fixes.push(record);
    } else {
      mem.rejected_fixes.push(record);
    }
    mem.last_session = new Date().toISOString();
    mem.session_count++;
    this._persist(workerId);
  }

  recordPattern(workerId, pattern, type) {
    const mem = this._ensure(workerId);
    const record = {
      pattern,
      type,
      recorded_at: new Date().toISOString()
    };
    if (type === 'anti-pattern') {
      if (!mem.anti_patterns.some(p => p.pattern === pattern)) {
        mem.anti_patterns.push(record);
      }
    } else {
      if (!mem.known_patterns.some(p => p.pattern === pattern)) {
        mem.known_patterns.push(record);
      }
    }
    this._persist(workerId);
  }

  recordConfidence(workerId, confidence) {
    const mem = this._ensure(workerId);
    mem.confidence_history.push({
      confidence,
      recorded_at: new Date().toISOString()
    });
    this._persist(workerId);
  }

  getMemory(workerId) {
    return this._cache[workerId] || this._ensure(workerId);
  }

  getContextPrompt(workerId) {
    const mem = this.getMemory(workerId);
    const parts = ['WORKER MEMORY:'];

    if (mem.session_count > 0) {
      parts.push(`  Sessions completed: ${mem.session_count}`);
      parts.push(`  Past findings: ${mem.findings.length}`);
      parts.push(`  Accepted fixes: ${mem.accepted_fixes.length}`);
      parts.push(`  Rejected fixes: ${mem.rejected_fixes.length}`);
    }

    if (mem.known_patterns.length > 0) {
      parts.push(`  Known patterns: ${mem.known_patterns.map(p => p.pattern).join(', ')}`);
    }

    if (mem.anti_patterns.length > 0) {
      parts.push(`  Anti-patterns to avoid: ${mem.anti_patterns.map(p => p.pattern).join(', ')}`);
    }

    if (mem.accepted_fixes.length > 0) {
      const lastAccepted = mem.accepted_fixes[mem.accepted_fixes.length - 1];
      parts.push(`  Last accepted fix: ${lastAccepted.summary || lastAccepted.file || 'N/A'}`);
    }

    if (mem.rejected_fixes.length > 0) {
      const lastRejected = mem.rejected_fixes[mem.rejected_fixes.length - 1];
      parts.push(`  Last rejected fix: ${lastRejected.summary || lastRejected.file || 'N/A'} (reason: ${lastRejected.rejection_reason || 'unknown'})`);
    }

    return parts.join('\n');
  }

  _persist(workerId) {
    const filePath = path.join(MEMORY_DIR, `${workerId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(this._cache[workerId], null, 2));
  }

  listWorkers() {
    return Object.keys(this._cache);
  }

  getSummary() {
    const workers = this.listWorkers();
    return {
      workers_with_memory: workers.length,
      total_findings: workers.reduce((s, w) => s + (this._cache[w]?.findings?.length || 0), 0),
      total_accepted: workers.reduce((s, w) => s + (this._cache[w]?.accepted_fixes?.length || 0), 0),
      total_rejected: workers.reduce((s, w) => s + (this._cache[w]?.rejected_fixes?.length || 0), 0),
      total_patterns: workers.reduce((s, w) => s + (this._cache[w]?.known_patterns?.length || 0), 0),
      workers
    };
  }
}

module.exports = { WorkerMemory };
