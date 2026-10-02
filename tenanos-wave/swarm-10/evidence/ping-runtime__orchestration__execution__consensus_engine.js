const crypto = require('crypto');

class ConsensusEngine {
  constructor(eventQueue) {
    this._events = eventQueue;
    this._decisions = [];
  }

  evaluate(mission, workerOutputs) {
    if (workerOutputs.length === 0) {
      return this._noConsensus(mission, 'no_worker_outputs');
    }

    if (workerOutputs.length === 1) {
      return this._singleWorkerDecision(mission, workerOutputs[0]);
    }

    return this._multiWorkerConsensus(mission, workerOutputs);
  }

  _singleWorkerDecision(mission, output) {
    const confidence = output.confidence || 0;
    const decision = {
      missionId: mission.id,
      type: mission.type,
      target: mission.target,
      workerCount: 1,
      workerIds: [output.workerId],
      confidence,
      agreementLevel: 'single',
      accepted: confidence >= (mission.metadata?.confidenceThreshold || 0.7),
      findings: output.findings || [],
      patches: output.patches || [],
      replayImpact: output.replay_impact || null,
      decisionId: crypto.createHash('sha256').update(mission.id + JSON.stringify(output)).digest('hex').substring(0, 12)
    };

    return decision;
  }

  _multiWorkerConsensus(mission, outputs) {
    const confidences = outputs.map(o => o.confidence || 0);
    const avgConfidence = confidences.reduce((s, c) => s + c, 0) / confidences.length;
    const variance = confidences.reduce((s, c) => s + (c - avgConfidence) ** 2, 0) / confidences.length;
    const stdDev = Math.sqrt(variance);

    const findingsMap = new Map();
    for (const output of outputs) {
      for (const finding of (output.findings || [])) {
        const key = this._findingKey(finding);
        if (!findingsMap.has(key)) {
          findingsMap.set(key, { finding, workerCount: 0, workers: [] });
        }
        findingsMap.get(key).workerCount++;
        findingsMap.get(key).workers.push(output.workerId);
      }
    }

    const sharedFindings = [];
    for (const [key, data] of findingsMap) {
      if (data.workerCount >= 2) {
        sharedFindings.push({
          ...data.finding,
          sharedBy: data.workerCount,
          workers: data.workers
        });
      }
    }

    const agreement = this._computeAgreement(outputs, sharedFindings);
    const strongConsensus = variance < 0.1 && avgConfidence > 0.7;

    const outputsCompared = [];
    for (let i = 0; i < outputs.length; i++) {
      for (let j = i + 1; j < outputs.length; j++) {
        outputsCompared.push({
          workerA: outputs[i].workerId,
          workerB: outputs[j].workerId,
          agreement: this._outputsAgree(outputs[i], outputs[j])
        });
      }
    }

    const decision = {
      missionId: mission.id,
      type: mission.type,
      target: mission.target,
      workerCount: outputs.length,
      workerIds: outputs.map(o => o.workerId),
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      confidenceVariance: Math.round(variance * 100) / 100,
      confidenceStdDev: Math.round(stdDev * 100) / 100,
      agreementLevel: outputs.length >= 3 ? 'triple' : 'double',
      strongConsensus,
      agreementScore: agreement.score,
      sharedFindings: sharedFindings.length,
      totalUniqueFindings: findingsMap.size,
      workerComparisons: outputsCompared,
      accepted: strongConsensus || agreement.score > 0.6,
      findings: this._mergeFindings(outputs),
      decisionId: crypto.createHash('sha256').update(mission.id + outputs.map(o => o.workerId).sort().join(',') + JSON.stringify(outputs.map(o => o.confidence))).digest('hex').substring(0, 12)
    };

    return decision;
  }

  _computeAgreement(outputs, sharedFindings) {
    const totalFindings = outputs.reduce((s, o) => s + (o.findings || []).length, 0);
    if (totalFindings === 0) return { score: 0.5, shared: 0 };

    const uniqueFindings = new Set();
    for (const output of outputs) {
      for (const f of (output.findings || [])) {
        uniqueFindings.add(this._findingKey(f));
      }
    }

    const overlap = sharedFindings.length / Math.max(1, uniqueFindings.size);
    return { score: Math.round(overlap * 100) / 100, shared: sharedFindings.length };
  }

  _outputsAgree(a, b) {
    const aFindings = new Set((a.findings || []).map(f => this._findingKey(f)));
    const bFindings = new Set((b.findings || []).map(f => this._findingKey(f)));
    const intersection = new Set([...aFindings].filter(x => bFindings.has(x)));
    const union = new Set([...aFindings, ...bFindings]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  _mergeFindings(outputs) {
    const seen = new Map();
    for (const output of outputs) {
      for (const finding of (output.findings || [])) {
        const key = this._findingKey(finding);
        if (!seen.has(key) || (seen.get(key).confidence || 0) < (finding.confidence || 0)) {
          seen.set(key, finding);
        }
      }
    }
    return Array.from(seen.values());
  }

  _findingKey(finding) {
    return `${finding.file || ''}:${finding.line || 0}:${finding.bypass_type || finding.type || 'unknown'}`;
  }

  _noConsensus(mission, reason) {
    const decision = {
      missionId: mission.id,
      type: mission.type,
      target: mission.target,
      workerCount: 0,
      averageConfidence: 0,
      agreementLevel: 'none',
      accepted: false,
      reason,
      decisionId: crypto.createHash('sha256').update(mission.id + reason).digest('hex').substring(0, 12)
    };

    return decision;
  }
}

module.exports = { ConsensusEngine };
