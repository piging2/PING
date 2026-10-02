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
    // Hardening E: transient provenance ctx set by the engine around authority
    // produce() calls; per-mission hash chain heads for prevHash linkage.
    this._provenance = null;
    this._chainHeads = {};

    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    this._load();
  }

  store(artifact) {
    const id = this._generateId(artifact);
    const missionKey = this._missionKey(artifact.missionId);
    const prov = this._provenance || {};
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
      // Hardening E: provenance of this artifact.
      runId: artifact.runId || prov.runId || null,
      action: artifact.action || prov.action || null,
      actor: artifact.actor || prov.actor || null,
      prevHash: this._chainHeads[missionKey] || null
    };
    // Hardening E: the hash covers the FINAL record (id, createdAt, provenance,
    // prevHash included), not the input artifact.
    record.hash = this._computeHash(record);

    // Hardening E: refuse silent overwrite. The id is derived from
    // type+workerId+content, so an existing id with different content means a
    // collision or tampering; an identical duplicate is an idempotent no-op.
    const existing = this.getArtifact(id);
    if (existing) {
      if (!this._sameContent(existing, record)) {
        throw new Error(`ArtifactStore: refusing to overwrite artifact ${id} with different content`);
      }
      return id;
    }

    this._artifacts.push(record);
    this._persist(record);
    this._chainHeads[missionKey] = record.hash;

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
    // Hardening E: attach engine provenance to authority-built records and link
    // the per-mission chain. Authority records use snake_case mission_id.
    const prov = this._provenance || {};
    if (record.runId === undefined) record.runId = prov.runId || null;
    if (record.action === undefined) record.action = prov.action || null;
    if (record.actor === undefined) record.actor = prov.actor || null;
    const missionKey = this._missionKey(
      record.missionId !== undefined ? record.missionId : (record.mission_id || null));
    if (record.prevHash === undefined) record.prevHash = this._chainHeads[missionKey] || null;
    this._artifacts.push(record);
    this._records.add(record.id);
    this._persist(record);
    if (record.hash) this._chainHeads[missionKey] = record.hash;
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

  _missionKey(missionId) {
    return (missionId === null || missionId === undefined) ? '__none__' : String(missionId);
  }

  // Compares the id-deriving fields from _generateId: equal here means a true duplicate.
  _sameContent(a, b) {
    return a.type === b.type &&
      a.workerId === b.workerId &&
      JSON.stringify(a.content) === JSON.stringify(b.content);
  }

  _generateId(artifact) {
    const raw = `${artifact.type}_${artifact.workerId || 'system'}_${JSON.stringify(artifact.content)}`;
    return `art_${crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16)}`;
  }

  // Hash of the FINAL stored record (id, createdAt, provenance, prevHash included).
  _computeHash(record) {
    const sorted = JSON.stringify(record, Object.keys(record).sort());
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
        if (record.hash) {
          const key = this._missionKey(
            record.missionId !== undefined ? record.missionId : (record.mission_id || null));
          this._chainHeads[key] = record.hash;
        }
      } catch (e) { }
    }
  }
}

module.exports = { ArtifactStore };
