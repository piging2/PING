#!/usr/bin/env python3
"""Apply the gateway hardening edits to engine.js and artifact_store.js.

Both source files use CRLF line endings (as extracted from the live container);
patterns below use LF and are applied after normalizing, then written back as CRLF.
"""
import sys

def apply(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read().replace('\r\n', '\n')
    for i, (old, new) in enumerate(replacements):
        count = text.count(old)
        if count != 1:
            print(f'FATAL {path} edit {i}: expected 1 match, found {count}')
            print('--- pattern start ---')
            print(old[:300])
            print('--- pattern end ---')
            sys.exit(1)
        text = text.replace(old, new, 1)
    text = text.replace('\n', '\r\n')
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    print(f'OK {path}: {len(replacements)} edits applied')

# ---------------------------------------------------------------- engine.js
engine_edits = [
# 1. dispatchToAssignment: runId/actor + store() provenance fields
("""    const dispatch = assignments[0];
    mission.metadata.expectedWorkerCount = dispatch.workers.length;
    const outputs = [];

    for (const worker of dispatch.workers) {""",
 """    const dispatch = assignments[0];
    mission.metadata.expectedWorkerCount = dispatch.workers.length;
    const outputs = [];
    const dispatchRunId = runId || this._newRunId();
    const actor = this._provenanceAgentId(agent);

    for (const worker of dispatch.workers) {"""),
("""        confidence: 1,
        metadata: { promptLength: prompt.length }
      });""",
 """        confidence: 1,
        metadata: { promptLength: prompt.length },
        runId: dispatchRunId,
        action: 'dispatch',
        actor
      });"""),
# 2. collectWorkerOutput: signature, registry check, submittedBy, provenance, no caller reputation
("""  collectWorkerOutput(workerId, missionId, output) {
    const mission = this._missions.find(m => m.id === missionId);
    if (!mission || mission._resolved) return null;

    this._stateMachine.transition(workerId, 'waiting', { missionId });""",
 """  collectWorkerOutput(workerId, missionId, output, agent, runId) {
    const mission = this._missions.find(m => m.id === missionId);
    if (!mission || mission._resolved) return null;
    // Hardening C: never accept output under a workerId that is not registered.
    if (!workerId) return null;
    if (!this._registry.getWorker(workerId)) return null;

    const actor = this._provenanceAgentId(agent);
    const collectRunId = runId || this._newRunId();

    this._stateMachine.transition(workerId, 'waiting', { missionId });"""),
("""    const record = {
      workerId,
      ...output
    };

    mission.workerOutputs.push(record);

    const proposalArtifact = this._proposalAuthority.produce(workerId, missionId, output);
    const proposalId = proposalArtifact.id || proposalArtifact;

    if (output.confidence !== undefined) {
      this._registry.recordQuality(workerId, output.confidence);
      this._registry.recordConfidence(workerId, output.confidence);
    }

    if (output.findings) {""",
 """    const record = {
      workerId,
      ...output,
      submittedBy: actor
    };

    mission.workerOutputs.push(record);

    const proposalArtifact = this._withProvenance(
      { runId: collectRunId, action: 'collect', actor },
      () => this._proposalAuthority.produce(workerId, missionId, output)
    );
    const proposalId = proposalArtifact.id || proposalArtifact;

    // Hardening D: the caller-derived reputation block is deleted. Reputation now
    // comes only from engine-observed consensus outcomes in _resolveMission.

    if (output.findings) {"""),
# 3. _checkMissionComplete / _resolveMission: thread prov, engine-observed reputation
("""    this._checkMissionComplete(mission);

    return { proposalId, mission };
  }

  _checkMissionComplete(mission) {
    const expectedWorkers = mission.metadata.expectedWorkerCount ||
      (mission.metadata.priority >= 8 ? 3 : 1);
    const completed = (mission.workerOutputs || []).length;

    if (completed >= expectedWorkers) {
      this._resolveMission(mission);
    }
  }

  _resolveMission(mission) {
    if (mission._resolved) return null;
    mission._resolved = true;
    const outputs = mission.workerOutputs || [];""",
 """    this._checkMissionComplete(mission, { runId: collectRunId, actor });

    return { proposalId, mission };
  }

  _checkMissionComplete(mission, prov) {
    const expectedWorkers = mission.metadata.expectedWorkerCount ||
      (mission.metadata.priority >= 8 ? 3 : 1);
    const completed = (mission.workerOutputs || []).length;

    if (completed >= expectedWorkers) {
      this._resolveMission(mission, prov);
    }
  }

  _resolveMission(mission, prov) {
    if (mission._resolved) return null;
    mission._resolved = true;
    const resolveRunId = (prov && prov.runId) || this._newRunId();
    const resolveProvenance = {
      runId: resolveRunId,
      action: 'resolve',
      actor: (prov && prov.actor) || 'unknown'
    };
    const outputs = mission.workerOutputs || [];"""),
("""        if (output.confidence !== undefined) {
          this._registry.recordQuality(output.workerId, output.confidence);
        }""",
 """        // Hardening D: reputation is engine-observed (consensus outcome), never caller-supplied.
        this._registry.recordQuality(output.workerId, wasAccepted ? 1 : 0);"""),
("""    const consensusArtifact = this._consensusAuthority.produce(decision, mission.id);
    const consensusArtifactId = consensusArtifact.id || consensusArtifact;""",
 """    const consensusArtifact = this._withProvenance(resolveProvenance, () =>
      this._consensusAuthority.produce(decision, mission.id));
    const consensusArtifactId = consensusArtifact.id || consensusArtifact;"""),
("""      const mergeArtifact = this._mergeDecisionAuthority.produce(mission.id, gateResult, consensusArtifactId);
      mergeArtifactId = mergeArtifact.id || mergeArtifact;""",
 """      const mergeArtifact = this._withProvenance(resolveProvenance, () =>
        this._mergeDecisionAuthority.produce(mission.id, gateResult, consensusArtifactId));
      mergeArtifactId = mergeArtifact.id || mergeArtifact;"""),
# 4. startAutonomousLoop: async, clamped, yields, threads runId/agent
("""  startAutonomousLoop(options = {}) {
    if (!this._initialized) {
      console.warn('[Engine] Cannot start loop — not initialized');
      return [];
    }

    const maxIterations = options.maxIterations || 5;
    const verbose = options.verbose !== false;
    const results = [];

    if (verbose) console.log(`\\n[AutonomousLoop] Starting (max ${maxIterations} iterations)`);

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      if (verbose) console.log(`\\n[AutonomousLoop] Iteration ${iteration + 1}/${maxIterations}`);""",
 """  async startAutonomousLoop(options = {}) {
    if (!this._initialized) {
      console.warn('[Engine] Cannot start loop — not initialized');
      return [];
    }

    // Hardening B: clamp caller-supplied iteration counts to a server-side ceiling
    // and yield to the event loop each iteration so a loop cannot starve the gateway.
    const MAX_LOOP_ITERATIONS = 25;
    const requested = Number.isFinite(options.maxIterations) ? Math.floor(options.maxIterations) : 5;
    const maxIterations = Math.min(Math.max(requested, 1), MAX_LOOP_ITERATIONS);
    const verbose = options.verbose !== false;
    const results = [];
    const loopRunId = options.runId || this._newRunId();
    const loopAgent = options.agent;

    if (verbose) console.log(`\\n[AutonomousLoop] Starting (max ${maxIterations} iterations)`);

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      await new Promise(r => setImmediate(r));
      if (verbose) console.log(`\\n[AutonomousLoop] Iteration ${iteration + 1}/${maxIterations}`);"""),
("""        const dispatch = this.dispatchToAssignment(mission.id);""",
 """        const dispatch = this.dispatchToAssignment(mission.id, null, loopAgent, loopRunId);"""),
("""          const result = this.collectWorkerOutput(w.workerId, mission.id, output);""",
 """          const result = this.collectWorkerOutput(w.workerId, mission.id, output, loopAgent, loopRunId);"""),
]

# ------------------------------------------------------- artifact_store.js
store_edits = [
# 1. constructor: provenance slot + chain heads
("""    this._artifacts = [];
    this._records = new Set();
    this._idCounter = 0;""",
 """    this._artifacts = [];
    this._records = new Set();
    this._idCounter = 0;
    // Hardening E: transient provenance ctx set by the engine around authority
    // produce() calls; per-mission hash chain heads for prevHash linkage.
    this._provenance = null;
    this._chainHeads = {};"""),
# 2. store(): provenance fields, final-record hash, collision check
("""  store(artifact) {
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
    this._persist(record);""",
 """  store(artifact) {
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
    this._chainHeads[missionKey] = record.hash;"""),
# 3. storeRecord(): provenance + chain for authority-built records
("""  storeRecord(record) {
    if (this._records.has(record.id)) return null;
    this._artifacts.push(record);
    this._records.add(record.id);
    this._persist(record);""",
 """  storeRecord(record) {
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
    if (record.hash) this._chainHeads[missionKey] = record.hash;"""),
# 4. helpers + final-record hash note
("""  _generateId(artifact) {""",
 """  _missionKey(missionId) {
    return (missionId === null || missionId === undefined) ? '__none__' : String(missionId);
  }

  // Compares the id-deriving fields from _generateId: equal here means a true duplicate.
  _sameContent(a, b) {
    return a.type === b.type &&
      a.workerId === b.workerId &&
      JSON.stringify(a.content) === JSON.stringify(b.content);
  }

  _generateId(artifact) {"""),
("""  _computeHash(artifact) {
    const sorted = JSON.stringify(artifact, Object.keys(artifact).sort());
    return crypto.createHash('sha256').update(sorted).digest('hex');
  }""",
 """  // Hash of the FINAL stored record (id, createdAt, provenance, prevHash included).
  _computeHash(record) {
    const sorted = JSON.stringify(record, Object.keys(record).sort());
    return crypto.createHash('sha256').update(sorted).digest('hex');
  }"""),
# 5. _load(): rebuild chain heads from persisted records
("""        const record = JSON.parse(fs.readFileSync(path.join(STORE_DIR, file), 'utf8'));
        this._artifacts.push(record);
        if (record.id) this._records.add(record.id);""",
 """        const record = JSON.parse(fs.readFileSync(path.join(STORE_DIR, file), 'utf8'));
        this._artifacts.push(record);
        if (record.id) this._records.add(record.id);
        if (record.hash) {
          const key = this._missionKey(
            record.missionId !== undefined ? record.missionId : (record.mission_id || null));
          this._chainHeads[key] = record.hash;
        }"""),
]

apply('/home/hatch/workspace/gateway-hardening/new-engine.js', engine_edits)
apply('/home/hatch/workspace/gateway-hardening/new-artifact_store.js', store_edits)
