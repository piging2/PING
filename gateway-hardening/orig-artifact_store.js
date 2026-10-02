const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_DIR = path.join(__dirname, '..', 'artifact_store');

class ArtifactStore {
  constructor(eventQueue) {
    this._events = eventQueue;
    this._artifacts = [];
    this._records = new Set();
    this._idCounter = 0;

    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    this._load();
  }

  store(artifact) {
    const id = this._generateId(artifact);
    const record = {
      id,
      type: artifact.type,
      workerId: artifact.workerId || 'system',
      missionId: artifact.missionId || null,
      decisionId: artifact.decisionId || null,
      content: artifact.content,
      files: artifact.files || [],
      confidence: artifact.confidence || null,
      metadata: artifact.metadata || {},
      createdAt: new Date().toISOString(),
      hash: this._computeHash(artifact)
    };

    this._artifacts.push(record);
    this._persist(record);

    this._events.emit('artifact_stored', {
      artifactId: id,
      type: artifact.type,
      workerId: artifact.workerId,
      missionId: artifact.missionId
    });

    return id;
  }

  storeRecord(record) {
    if (this._records.has(record.id)) return null;
    this._artifacts.push(record);
    this._records.add(record.id);
    this._persist(record);
    if (this._events) {
      this._events.emit('artifact_stored', {
        artifactId: record.id,
        type: record.type,
        workerId: record.worker_id,
        missionId: record.mission_id
      });
    }
    return record;
  }

  storeProposal(workerId, missionId, proposal) {
    return this.store({
      type: 'proposal',
      workerId,
      missionId,
      content: proposal,
      files: proposal.files || [],
      confidence: proposal.confidence || 0,
      metadata: { proposalType: proposal.type || 'standard' }
    });
  }

  storeReplayProof(workerId, missionId, proof) {
    return this.store({
      type: 'replay_proof',
      workerId,
      missionId,
      content: proof,
      files: proof.files || [],
      confidence: proof.confidence || 0,
      metadata: { functions: proof.functions || [] }
    });
  }

  storeReview(missionId, reviewer, decision, notes) {
    return this.store({
      type: 'review',
      workerId: reviewer,
      missionId,
      content: { decision, notes },
      confidence: decision === 'accept' ? 1 : 0,
      metadata: { reviewType: 'constitutional' }
    });
  }

  storeCertificate(workerId, modulePath, certificate) {
    return this.store({
      type: 'certificate',
      workerId,
      content: certificate,
      files: [modulePath],
      confidence: certificate.certificate_score / 100 || 0,
      metadata: { modulePath, score: certificate.certificate_score }
    });
  }

  getArtifact(id) {
    return this._artifacts.find(a => a.id === id);
  }

  findByMission(missionId) {
    return this._artifacts.filter(a => a.missionId === missionId);
  }

  findByWorker(workerId) {
    return this._artifacts.filter(a => a.workerId === workerId);
  }

  findByType(type) {
    return this._artifacts.filter(a => a.type === type);
  }

  findByFile(filePath) {
    return this._artifacts.filter(a => a.files.includes(filePath));
  }

  findRecent(count = 50) {
    return this._artifacts.slice(-count);
  }

  getStats() {
    const byType = {};
    for (const a of this._artifacts) {
      if (!byType[a.type]) byType[a.type] = 0;
      byType[a.type]++;
    }

    const byWorker = {};
    for (const a of this._artifacts) {
      if (!byWorker[a.workerId]) byWorker[a.workerId] = 0;
      byWorker[a.workerId]++;
    }

    return {
      totalArtifacts: this._artifacts.length,
      byType,
      byWorker,
      proposals: this._artifacts.filter(a => a.type === 'proposal').length,
      replayProofs: this._artifacts.filter(a => a.type === 'replay_proof').length,
      certificates: this._artifacts.filter(a => a.type === 'certificate').length,
      reviews: this._artifacts.filter(a => a.type === 'review').length,
      averageConfidence: this._artifacts.length > 0
        ? Math.round(this._artifacts.reduce((s, a) => s + (a.confidence || 0), 0) / this._artifacts.length * 100) / 100
        : 0
    };
  }

  generateId(artifact) {
    return this._generateId(artifact);
  }

  _generateId(artifact) {
    const raw = `${artifact.type}_${artifact.workerId || 'system'}_${JSON.stringify(artifact.content)}`;
    return `art_${crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16)}`;
  }

  _computeHash(artifact) {
    const sorted = JSON.stringify(artifact, Object.keys(artifact).sort());
    return crypto.createHash('sha256').update(sorted).digest('hex');
  }

  _persist(record) {
    const filePath = path.join(STORE_DIR, `${record.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  }

  _load() {
    if (!fs.existsSync(STORE_DIR)) return;
    const files = fs.readdirSync(STORE_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .slice(-5000);
    for (const file of files) {
      try {
        const record = JSON.parse(fs.readFileSync(path.join(STORE_DIR, file), 'utf8'));
        this._artifacts.push(record);
        if (record.id) this._records.add(record.id);
      } catch (e) { }
    }
  }
}

module.exports = { ArtifactStore };
