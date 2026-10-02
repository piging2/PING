const fs = require('fs');
const path = require('path');

const QUEUE_DIR = path.join(__dirname, 'merge_queue');

const STAGES = [
  'submitted',
  'artifact_complete',
  'replay_verified',
  'merge_gate',
  'constitutional_review',
  'merged',
  'rejected',
  'archived'
];

class MergeQueue {
  constructor(mergeGate) {
    this._gate = mergeGate;
    this._entries = [];
    if (!fs.existsSync(QUEUE_DIR)) {
      fs.mkdirSync(QUEUE_DIR, { recursive: true });
    }
    this._load();
  }

  _load() {
    if (!fs.existsSync(QUEUE_DIR)) return;
    const files = fs.readdirSync(QUEUE_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const entry = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, file), 'utf8'));
        this._entries.push(entry);
      } catch (e) { }
    }
  }

  enqueue(proposalId, proposalPipeline) {
    const proposal = proposalPipeline.getProposal(proposalId);
    if (!proposal) return null;

    const entry = {
      id: `mq_${Date.now()}_${this._entries.length + 1}`,
      proposalId,
      worker_name: proposal.worker_name,
      files_affected: proposal.files_affected || [],
      artifact_count: proposal.artifacts.length,
      stage: 'submitted',
      consensus_level: 'pending',
      consensus_confidence: 0,
      reviews_required: 1,
      reviews_completed: 0,
      gate_results: null,
      created_at: new Date().toISOString(),
      stage_history: [
        { stage: 'submitted', timestamp: new Date().toISOString() }
      ]
    };

    this._entries.push(entry);
    this._save(entry);
    return entry;
  }

  advance(id, newStage) {
    const entry = this._get(id);
    if (!entry) return false;

    const currentIdx = STAGES.indexOf(entry.stage);
    const newIdx = STAGES.indexOf(newStage);
    if (newIdx < currentIdx) return false;

    entry.stage = newStage;
    entry.stage_history.push({
      stage: newStage,
      timestamp: new Date().toISOString()
    });
    this._save(entry);
    return true;
  }

  runMergeGate(id) {
    const entry = this._get(id);
    if (!entry) return null;

    this._gate.clear();
    for (const file of (entry.files_affected || [])) {
      const fullPath = path.resolve(path.join(__dirname, '..', '..'), file);
      if (fs.existsSync(fullPath)) {
        this._gate.validateFile(fullPath);
      }
    }

    const result = this._gate.summary();
    entry.gate_results = result;
    entry.stage = result.can_commit ? 'merge_gate' : 'constitutional_review';
    entry.stage_history.push({
      stage: entry.stage,
      timestamp: new Date().toISOString(),
      details: `Gate: ${result.blocking} blocking, ${result.warnings} warnings`
    });
    this._save(entry);
    return result;
  }

  applyConsensus(entryId, outputs) {
    const entry = this._get(entryId);
    if (!entry) return null;

    if (outputs.length < 2) {
      entry.consensus_level = 'single';
      entry.consensus_confidence = outputs[0]?.confidence || 0;
    } else {
      const confidences = outputs.map(o => o.confidence || 0);
      const avg = confidences.reduce((s, c) => s + c, 0) / confidences.length;
      const variance = confidences.reduce((s, c) => s + (c - avg) ** 2, 0) / confidences.length;
      entry.consensus_level = outputs.length >= 3 ? 'triple' : 'double';
      entry.consensus_confidence = Math.round(avg * 100) / 100;
      entry.consensus_variance = Math.round(variance * 100) / 100;
      entry.consensus_strong = variance < 0.1 && avg > 0.7;
    }
    this._save(entry);
    return entry;
  }

  assignReviewers(id, count = 1) {
    const entry = this._get(id);
    if (!entry) return false;
    entry.reviews_required = count;
    entry.reviews_completed = 0;
    this._save(entry);
    return true;
  }

  completeReview(id, decision, reviewer, notes) {
    const entry = this._get(id);
    if (!entry) return false;

    entry.reviews_completed++;
    if (!entry.reviews) entry.reviews = [];
    entry.reviews.push({ reviewer, decision, notes, timestamp: new Date().toISOString() });

    if (decision === 'reject') {
      entry.stage = 'rejected';
      entry.stage_history.push({
        stage: 'rejected',
        timestamp: new Date().toISOString(),
        details: `Rejected by ${reviewer}: ${notes}`
      });
    } else if (entry.reviews_completed >= entry.reviews_required) {
      entry.stage = 'constitutional_review';
      entry.stage_history.push({
        stage: 'constitutional_review',
        timestamp: new Date().toISOString(),
        details: `${entry.reviews_completed}/${entry.reviews_required} reviews complete`
      });
    }

    this._save(entry);
    return true;
  }

  merge(id) {
    const entry = this._get(id);
    if (!entry) return false;

    if (entry.stage !== 'constitutional_review' && entry.stage !== 'merge_gate') return false;

    entry.stage = 'merged';
    entry.merged_at = new Date().toISOString();
    entry.stage_history.push({
      stage: 'merged',
      timestamp: new Date().toISOString()
    });
    this._save(entry);
    return true;
  }

  reject(id, reason) {
    const entry = this._get(id);
    if (!entry) return false;
    entry.stage = 'rejected';
    entry.rejection_reason = reason;
    entry.stage_history.push({
      stage: 'rejected',
      timestamp: new Date().toISOString(),
      details: reason
    });
    this._save(entry);
    return true;
  }

  archive(id) {
    const entry = this._get(id);
    if (!entry) return false;
    entry.stage = 'archived';
    entry.stage_history.push({
      stage: 'archived',
      timestamp: new Date().toISOString()
    });
    this._save(entry);
    return true;
  }

  getQueueByStage(stage) {
    return this._entries.filter(e => e.stage === stage).map(e => this._summarize(e));
  }

  getEntry(id) {
    return this._get(id);
  }

  list() {
    return this._entries.map(e => this._summarize(e));
  }

  getStats() {
    const stats = { total: this._entries.length };
    for (const stage of STAGES) {
      stats[stage] = this._entries.filter(e => e.stage === stage).length;
    }
    stats.consensus_distribution = {
      single: this._entries.filter(e => e.consensus_level === 'single').length,
      double: this._entries.filter(e => e.consensus_level === 'double').length,
      triple: this._entries.filter(e => e.consensus_level === 'triple').length,
      pending: this._entries.filter(e => e.consensus_level === 'pending').length
    };
    return stats;
  }

  _get(id) {
    return this._entries.find(e => e.id === id);
  }

  _summarize(entry) {
    return {
      id: entry.id,
      proposalId: entry.proposalId,
      worker_name: entry.worker_name,
      stage: entry.stage,
      files_affected: (entry.files_affected || []).length,
      artifacts: entry.artifact_count,
      consensus: `${entry.consensus_level} (${Math.round(entry.consensus_confidence * 100)}%)`,
      reviews: `${entry.reviews_completed}/${entry.reviews_required}`,
      gate: entry.gate_results ? `${entry.gate_results.blocking} blocking` : 'pending',
      created_at: entry.created_at
    };
  }

  _save(entry) {
    const filePath = path.join(QUEUE_DIR, `${entry.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));
  }
}

module.exports = { MergeQueue };

