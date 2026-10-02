const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REGISTRY_FILE = path.join(__dirname, 'capability_registry.json');

// Generated from capability_registry.json — single source of truth for valid capabilities
const _generatedCapabilities = (() => {
  const registryPath = path.join(__dirname, '..', '..', '..', 'gateway', 'generated', 'capability_registry.json');
  try {
    const registry = require(registryPath);
    const names = new Set();
    for (const cap of registry.capabilities) {
      names.add(cap.name);
    }
    return names;
  } catch (e) {
    console.error('[CapabilityRegistry] Failed to load generated capabilities:', e.message);
    return new Set();
  }
})();

class CapabilityRegistry {
  constructor() {
    this._workers = new Map();
    this._capabilityIndex = new Map();
    this._load();
  }

  registerWorker(id, metadata) {
    const capabilities = metadata.capabilities || [];
    const unknown = capabilities.filter(c => _generatedCapabilities.size > 0 && !_generatedCapabilities.has(c));
    if (unknown.length > 0) {
      console.warn(`[CapabilityRegistry] Worker ${id} has capabilities not in generated registry: ${unknown.join(', ')}`);
    }

    const worker = {
      id,
      model: metadata.model || 'unknown',
      capabilities: metadata.capabilities || [],
      specialization: metadata.specialization || null,
      contextWindow: metadata.contextWindow || 8192,
      avgLatency: metadata.avgLatency || 0,
      avgTokens: metadata.avgTokens || 0,
      avgConfidence: metadata.avgConfidence || null,
      acceptanceRate: metadata.acceptanceRate || null,
      qualityHistory: metadata.qualityHistory || [],
      currentLoad: metadata.currentLoad || 0,
      maxLoad: metadata.maxLoad || 1,
      failurePatterns: metadata.failurePatterns || [],
      replayCompatibility: metadata.replayCompatibility !== false,
      registeredAt: new Date().toISOString(),
      lastActive: null,
      state: 'idle',
      totalTasksCompleted: 0,
      totalTasksFailed: 0
    };

    this._workers.set(id, worker);
    this._reindex();
    this._save();
    return worker;
  }

  unregisterWorker(id) {
    this._workers.delete(id);
    this._reindex();
    this._save();
  }

  updateWorkerState(id, state) {
    const worker = this._workers.get(id);
    if (!worker) return false;
    worker.state = state;
    if (state === 'running' || state === 'completed') {
      worker.lastActive = new Date().toISOString();
    }
    if (state === 'completed') worker.totalTasksCompleted++;
    if (state === 'failed') worker.totalTasksFailed++;
    this._reindex();
    this._save();
    return true;
  }

  recordLatency(id, latencyMs) {
    const worker = this._workers.get(id);
    if (!worker) return;
    worker.avgLatency = worker.avgLatency
      ? Math.round((worker.avgLatency * 0.8 + latencyMs * 0.2))
      : latencyMs;
    this._save();
  }

  recordQuality(id, score) {
    const worker = this._workers.get(id);
    if (!worker) return;
    worker.qualityHistory.push({ score, timestamp: new Date().toISOString() });
    if (worker.qualityHistory.length > 100) {
      worker.qualityHistory = worker.qualityHistory.slice(-100);
    }
    this._save();
  }

  recordTokens(id, tokens) {
    const worker = this._workers.get(id);
    if (!worker) return;
    worker.avgTokens = worker.avgTokens
      ? Math.round((worker.avgTokens * 0.8 + tokens * 0.2))
      : tokens;
    this._save();
  }

  recordConfidence(id, confidence) {
    const worker = this._workers.get(id);
    if (!worker) return;
    worker.avgConfidence = worker.avgConfidence !== null
      ? Math.round((worker.avgConfidence * 0.8 + confidence * 0.2) * 100) / 100
      : confidence;
    this._save();
  }

  recordAcceptance(id, accepted) {
    const worker = this._workers.get(id);
    if (!worker) return;
    const total = worker.totalTasksCompleted + worker.totalTasksFailed;
    const acceptedCount = accepted
      ? (worker.totalTasksCompleted || 0)
      : (worker.totalTasksCompleted - 1);
    worker.acceptanceRate = total > 0
      ? Math.round((worker.totalTasksCompleted / total) * 100) / 100
      : null;
    this._save();
  }

  recordFailure(id, pattern) {
    const worker = this._workers.get(id);
    if (!worker) return;
    if (!worker.failurePatterns) worker.failurePatterns = [];
    const existing = worker.failurePatterns.find(p => p.pattern === pattern);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
    } else {
      worker.failurePatterns.push({ pattern, count: 1 });
    }
    this._save();
  }

  findWorkers(capability, options = {}) {
    const candidates = this._capabilityIndex.get(capability) || [];
    let workers = candidates.map(id => this._workers.get(id)).filter(Boolean);

    if (options.excludeState) {
      workers = workers.filter(w => w.state !== options.excludeState);
    }

    if (options.minQuality !== undefined) {
      workers = workers.filter(w => {
        if (w.qualityHistory.length === 0) return true;
        const avg = w.qualityHistory.reduce((s, r) => s + r.score, 0) / w.qualityHistory.length;
        return avg >= options.minQuality;
      });
    }

    if (options.maxLoad !== undefined) {
      workers = workers.filter(w => w.currentLoad < options.maxLoad);
    }

    const capabilityParts = capability.split('.');
    workers.sort((a, b) => {
      const aCap = a.capabilities.filter(c => c.startsWith(capabilityParts[0])).length;
      const bCap = b.capabilities.filter(c => c.startsWith(capabilityParts[0])).length;
      if (aCap !== bCap) return bCap - aCap;

      const aQuality = a.qualityHistory.length > 0
        ? a.qualityHistory.reduce((s, r) => s + r.score, 0) / a.qualityHistory.length : 0;
      const bQuality = b.qualityHistory.length > 0
        ? b.qualityHistory.reduce((s, r) => s + r.score, 0) / b.qualityHistory.length : 0;
      if (aQuality !== bQuality) return bQuality - aQuality;

      return a.currentLoad - b.currentLoad;
    });

    return workers;
  }

  selectWorker(capability, options = {}) {
    const workers = this.findWorkers(capability, options);
    if (workers.length === 0) return null;

    const seed = JSON.stringify({ capability, ...options });
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % workers.length;

    return workers[index];
  }

  selectWorkers(capability, count = 3, options = {}) {
    const workers = this.findWorkers(capability, options);
    if (workers.length === 0) return [];
    if (workers.length <= count) return workers;

    const selected = [];
    const used = new Set();

    for (let i = 0; i < count; i++) {
      const remaining = workers.filter(w => !used.has(w.id));
      if (remaining.length === 0) break;

      const seed = JSON.stringify({ capability, round: i, ...options });
      const hash = crypto.createHash('sha256').update(seed).digest('hex');
      const index = parseInt(hash.substring(0, 8), 16) % remaining.length;

      selected.push(remaining[index]);
      used.add(remaining[index].id);
    }

    return selected;
  }

  hasCapability(capability) {
    return this._capabilityIndex.has(capability) && this._capabilityIndex.get(capability).length > 0;
  }

  validateCapability(capability) {
    if (_generatedCapabilities.size === 0) return true;
    return _generatedCapabilities.has(capability);
  }

  listGeneratedCapabilities() {
    return Array.from(_generatedCapabilities).sort();
  }

  listAllCapabilities() {
    const caps = new Set();
    for (const worker of this._workers.values()) {
      for (const cap of worker.capabilities) {
        caps.add(cap);
      }
    }
    return Array.from(caps).sort();
  }

  listWorkers() {
    return Array.from(this._workers.values()).map(w => ({
      id: w.id,
      model: w.model,
      capabilities: w.capabilities,
      specialization: w.specialization,
      state: w.state,
      currentLoad: w.currentLoad,
      maxLoad: w.maxLoad,
      avgLatency: w.avgLatency,
      avgTokens: w.avgTokens,
      avgConfidence: w.avgConfidence,
      acceptanceRate: w.acceptanceRate,
      replayCompatibility: w.replayCompatibility,
      totalCompleted: w.totalTasksCompleted,
      totalFailed: w.totalTasksFailed,
      qualityScore: w.qualityHistory.length > 0
        ? Math.round(w.qualityHistory.reduce((s, r) => s + r.score, 0) / w.qualityHistory.length * 100) / 100
        : null,
      failurePatterns: (w.failurePatterns || []).map(p => ({ pattern: p.pattern, count: p.count }))
    }));
  }

  getWorker(id) {
    return this._workers.get(id);
  }

  getStats() {
    const workers = this.listWorkers();
    return {
      totalWorkers: workers.length,
      idle: workers.filter(w => w.state === 'idle').length,
      running: workers.filter(w => w.state === 'running').length,
      totalCapabilities: this.listAllCapabilities().length,
      averageQuality: workers.length > 0
        ? Math.round(workers.reduce((s, w) => s + (w.qualityScore || 0), 0) / workers.length * 100) / 100
        : 0
    };
  }

  _reindex() {
    this._capabilityIndex.clear();
    for (const [id, worker] of this._workers) {
      for (const cap of worker.capabilities) {
        if (!this._capabilityIndex.has(cap)) {
          this._capabilityIndex.set(cap, []);
        }
        this._capabilityIndex.get(cap).push(id);
      }
    }
  }

  _load() {
    if (!fs.existsSync(REGISTRY_FILE)) return;
    try {
      const data = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
      for (const w of data.workers || []) {
        this._workers.set(w.id, w);
      }
      this._reindex();
    } catch (e) { }
  }

  _save() {
    const data = { workers: Array.from(this._workers.values()) };
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2));
  }
}

module.exports = { CapabilityRegistry, validateCapability: (cap) => _generatedCapabilities.size === 0 || _generatedCapabilities.has(cap) };
