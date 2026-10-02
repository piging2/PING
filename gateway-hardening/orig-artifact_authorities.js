const crypto = require('crypto');

const VALID_ARTIFACT_TYPES = [
  'mission', 'proposal', 'analysis', 'patch',
  'consensus_proof', 'merge_decision', 'replay_proof',
  'witness', 'documentation', 'test'
];

function canonicalBytes(obj) {
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  return Buffer.from(sorted, 'utf8');
}

function canonicalHash(obj) {
  return crypto.createHash('sha256').update(canonicalBytes(obj)).digest('hex');
}

function deterministicId(type, canonical) {
  const raw = `${type}_${canonicalHash(canonical)}`;
  return `art_${crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16)}`;
}

class ArtifactAuthority {
  constructor(artifactStore, eventQueue) {
    this._store = artifactStore;
    this._events = eventQueue;
  }

  produce(type, content, meta = {}) {
    if (!VALID_ARTIFACT_TYPES.includes(type)) {
      throw new Error(`Unknown artifact type: ${type}`);
    }

    const payload = {
      type,
      content,
      workerId: meta.workerId || null,
      missionId: meta.missionId || null,
      parentArtifactId: meta.parentArtifactId || null,
      files: meta.files || [],
      confidence: meta.confidence || null,
      metadata: meta.metadata || {}
    };

    const bytes = canonicalBytes(payload);
    const hash = canonicalHash(payload);
    const id = deterministicId(type, payload);

    if (this._store && this._store.getArtifact) {
      const existing = this._store.getArtifact(id);
      if (existing) {
        return existing;
      }
    }

    if (meta.parentArtifactId) {
      const parent = this._store.getArtifact ? this._store.getArtifact(meta.parentArtifactId) : null;
      if (!parent) {
        throw new Error(`Parent artifact ${meta.parentArtifactId} does not exist`);
      }
    }

    const artifact = {
      id,
      type,
      content,
      hash,
      bytes: bytes.toString('hex'),
      worker_id: meta.workerId || null,
      mission_id: meta.missionId || null,
      parent_artifact_id: meta.parentArtifactId || null,
      files: meta.files || [],
      confidence: meta.confidence || null,
      metadata: meta.metadata || {},
      witness_hash: this._computeWitness(payload)
    };

    const record = this._store.storeRecord(artifact);
    if (record && this._events) {
      this._events.emit('artifact_produced', {
        artifactId: id,
        type,
        workerId: meta.workerId,
        missionId: meta.missionId,
        hash,
        witnessHash: artifact.witness_hash
      });
    }
    return record || artifact;
  }

  _computeWitness(payload) {
    const witnessPayload = {
      artifactType: payload.type,
      workerId: payload.workerId,
      missionId: payload.missionId,
      contentHash: canonicalHash(payload.content),
      parentArtifactId: payload.parentArtifactId
    };
    return canonicalHash(witnessPayload);
  }

  verify(artifact) {
    const payload = {
      type: artifact.type,
      content: artifact.content,
      workerId: artifact.worker_id,
      missionId: artifact.mission_id,
      parentArtifactId: artifact.parent_artifact_id,
      files: artifact.files,
      confidence: artifact.confidence,
      metadata: artifact.metadata
    };
    const expectedHash = canonicalHash(payload);
    const expectedId = deterministicId(artifact.type, payload);
    return artifact.hash === expectedHash && artifact.id === expectedId;
  }
}

class MissionArtifact extends ArtifactAuthority {
  produce(mission) {
    return super.produce('mission', {
      missionId: mission.id,
      missionType: mission.type,
      missionTarget: mission.target,
      requiredCapabilities: mission.requiredCapabilities || [],
      files: mission.files || [],
      priority: mission.priority || 'normal',
      description: mission.description || ''
    }, {
      workerId: 'system',
      missionId: mission.id,
      files: mission.files || []
    });
  }
}

class ProposalArtifact extends ArtifactAuthority {
  produce(workerId, missionId, proposal) {
    return super.produce('proposal', {
      workerId,
      missionId,
      findings: (proposal.findings || []).map(f => ({
        file: f.file,
        line: f.line,
        bypassType: f.bypass_type,
        description: f.description,
        confidence: f.confidence
      })),
      patches: proposal.patches || [],
      summary: proposal.summary || ''
    }, {
      workerId,
      missionId,
      confidence: proposal.confidence || 0,
      metadata: { proposalType: proposal.type || 'standard' }
    });
  }
}

class AnalysisArtifact extends ArtifactAuthority {
  produce(workerId, missionId, analysis) {
    return super.produce('analysis', {
      workerId,
      missionId,
      targetFile: analysis.targetFile,
      metrics: analysis.metrics || {},
      findings: analysis.findings || [],
      recommendations: analysis.recommendations || []
    }, {
      workerId,
      missionId,
      confidence: analysis.confidence || 0,
      files: analysis.targetFile ? [analysis.targetFile] : []
    });
  }
}

class PatchArtifact extends ArtifactAuthority {
  produce(workerId, missionId, patch) {
    return super.produce('patch', {
      workerId,
      missionId,
      file: patch.file,
      diff: patch.diff,
      description: patch.description || '',
      verification: patch.verification || null
    }, {
      workerId,
      missionId,
      files: patch.file ? [patch.file] : [],
      confidence: patch.confidence || 0
    });
  }
}

class ConsensusArtifact extends ArtifactAuthority {
  produce(decision, missionId) {
    return super.produce('consensus_proof', {
      decisionId: decision.decisionId || decision.id,
      missionId,
      agreed: decision.accepted,
      confidence: decision.averageConfidence || decision.confidence,
      variance: decision.confidenceVariance || 0,
      strongConsensus: decision.strongConsensus || false,
      sharedFindings: decision.sharedFindings || 0,
      workerCount: decision.workerCount || 0,
      workerDetails: (decision.workerDetails || []).map(w => ({
        workerId: w.workerId,
        confidence: w.confidence,
        findingsCount: w.findingsCount || 0
      }))
    }, {
      workerId: 'consensus_engine',
      missionId,
      confidence: decision.averageConfidence || decision.confidence || 0
    });
  }
}

class MergeDecisionArtifact extends ArtifactAuthority {
  produce(missionId, gateResult, consensusArtifactId) {
    return super.produce('merge_decision', {
      missionId,
      files: gateResult.files || [],
      violations: gateResult.failed || gateResult.violations || [],
      blocking: gateResult.blocking || 0,
      warnings: gateResult.warnings || [],
      canCommit: gateResult.can_commit || false,
      consensusArtifactId
    }, {
      workerId: 'merge_gate',
      missionId,
      confidence: gateResult.can_commit ? 1 : 0,
      parentArtifactId: consensusArtifactId
    });
  }
}

class ReplayArtifact extends ArtifactAuthority {
  produce(workerId, missionId, proof) {
    return super.produce('replay_proof', {
      workerId,
      missionId,
      functions: proof.functions || [],
      events: proof.events || [],
      hash: proof.hash || '',
      deterministic: proof.deterministic || false,
      duration: proof.duration || 0,
      result: proof.result || 'unknown'
    }, {
      workerId,
      missionId,
      confidence: proof.confidence || 0,
      metadata: { functions: proof.functions || [] }
    });
  }
}

class WitnessArtifact extends ArtifactAuthority {
  produce(workerId, missionId, witness) {
    return super.produce('witness', {
      workerId,
      missionId,
      artifactId: witness.artifactId,
      artifactHash: witness.artifactHash,
      witnessType: witness.witnessType || 'content',
      signature: witness.signature || null
    }, {
      workerId,
      missionId,
      parentArtifactId: witness.artifactId,
      confidence: 1.0
    });
  }
}

class DocumentationArtifact extends ArtifactAuthority {
  produce(workerId, missionId, doc) {
    return super.produce('documentation', {
      workerId,
      missionId,
      title: doc.title,
      content: doc.content,
      files: doc.files || []
    }, {
      workerId,
      missionId,
      files: doc.files || [],
      confidence: doc.confidence || 0
    });
  }
}

class TestArtifact extends ArtifactAuthority {
  produce(workerId, missionId, testData) {
    return super.produce('test', {
      workerId,
      missionId,
      targetFile: testData.targetFile,
      testContent: testData.testContent,
      testFramework: testData.testFramework || 'unknown',
      passed: testData.passed || false,
      coverageDelta: testData.coverageDelta || 0
    }, {
      workerId,
      missionId,
      files: testData.targetFile ? [testData.targetFile] : [],
      confidence: testData.passed ? 1 : 0
    });
  }
}

module.exports = {
  ArtifactAuthority,
  MissionArtifact,
  ProposalArtifact,
  AnalysisArtifact,
  PatchArtifact,
  ConsensusArtifact,
  MergeDecisionArtifact,
  ReplayArtifact,
  WitnessArtifact,
  DocumentationArtifact,
  TestArtifact,
  VALID_ARTIFACT_TYPES,
  canonicalHash,
  deterministicId
};
