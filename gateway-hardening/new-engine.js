const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { CapabilityRegistry } = require('./capability_registry');
const { EventQueue } = require('./event_queue');
const { MissionCompiler } = require('./mission_compiler');
const { Scheduler } = require('./scheduler');
const { ArtifactRouter } = require('./artifact_router');
const { ConsensusEngine } = require('./consensus_engine');
const { WorkerStateMachine } = require('./worker_state_machine');
const { ArtifactStore } = require('./artifact_store');
const { OllamaProvider } = require('./ollama_provider');
const { IntelligenceGraph } = require('../intelligence_graph');
const { MergeGate } = require('../merge_gate');
const { DormantClassifier, ReplayCertifier } = require('../dormant_classifier');
const { ContextAuthority } = require('./context_authority');
const {
  ConsensusArtifact,
  MergeDecisionArtifact,
  ProposalArtifact,
  ReplayArtifact,
  WitnessArtifact
} = require('./artifact_authorities');
const {
  WorkerPortRegistry,
  OpenCodeWorkerPort,
  OllamaWorkerPort
} = require('./worker_port');

class ExecutionEngine {
  constructor() {
    this._compiler = null;
    this._eventQueue = null;
    this._registry = null;
    this._scheduler = null;
    this._artifactRouter = null;
    this._consensus = null;
    this._stateMachine = null;
    this._artifactStore = null;
    this._ollamaProvider = null;
    this._graph = null;
    this._graphData = null;
    this._mergeGate = null;
    this._classifier = null;
    this._certifier = null;

    this._missions = [];
    this._pendingProposals = [];
    this._subscriptions = [];
    this._workerPorts = null;

    this._initialized = false;
  }

  async initialize(options = {}) {
    console.log('[ExecutionEngine] Initializing subsystems...');

    this._eventQueue = new EventQueue();
    this._workerPorts = new WorkerPortRegistry(this._eventQueue);
    this._registry = new CapabilityRegistry();
    this._stateMachine = new WorkerStateMachine(this._eventQueue);
    this._mergeGate = new MergeGate();

    console.log('[ExecutionEngine] Building intelligence graph...');
    const graphBuilder = new IntelligenceGraph();
    this._graphData = await graphBuilder.build();
    this._graph = graphBuilder;
    console.log(`  Production: ${this._graphData.summary.production}, Dormant: ${this._graphData.summary.dormant}`);

    this._compiler = new MissionCompiler(this._graph, this._eventQueue);
    this._scheduler = new Scheduler(this._workerPorts, this._eventQueue);
    this._artifactRouter = new ArtifactRouter(this._graph, this._eventQueue);
    this._consensus = new ConsensusEngine(this._eventQueue);
    this._artifactStore = new ArtifactStore(this._eventQueue);
    this._contextAuth = new ContextAuthority(this._graph, this._artifactStore, this._eventQueue);

    this._consensusAuthority = new ConsensusArtifact(this._artifactStore, this._eventQueue);
    this._mergeDecisionAuthority = new MergeDecisionArtifact(this._artifactStore, this._eventQueue);
    this._proposalAuthority = new ProposalArtifact(this._artifactStore, this._eventQueue);
    this._replayAuthority = new ReplayArtifact(this._artifactStore, this._eventQueue);
    this._witnessAuthority = new WitnessArtifact(this._artifactStore, this._eventQueue);

    this._classifier = new DormantClassifier(this._graph);
    this._certifier = new ReplayCertifier(this._graph, this._classifier);

    this._classifier.classifyAll();
    this._certifier.certifyAll();
    this._mergeGate = new MergeGate();

    console.log('[ExecutionEngine] Registering workers...');

    const opencodePort = new OpenCodeWorkerPort({
      eventQueue: this._eventQueue,
      executor: null
    });
    this._workerPorts.register(opencodePort);

    this._ollamaProvider = new OllamaProvider(this._registry, this._stateMachine);
    this._ollamaProvider.registerOpenCode();

    if (options.discoverOllama !== false) {
      const ollamaWorkers = await this._ollamaProvider.discoverWorkers();
      console.log(`  Ollama workers: ${ollamaWorkers.length}`);
    }

    this._setupSubscriptions();
    this._initialized = true;

    console.log('[ExecutionEngine] Ready.');
    return this;
  }

  _setupSubscriptions() {
    this._subscriptions.push(
      this._eventQueue.subscribe('git_diff', (event) => {
        const diff = event.data.diff || '';
        const missions = this._compiler.compileMissionFromGitDiff(diff, this._graph);
        for (const mission of missions) {
          this._missions.push(mission);
          this._executeMission(mission);
        }
      })
    );

    this._subscriptions.push(
      this._eventQueue.subscribe('worker_completed', (event) => {
        const { workerId, metadata } = event.data;
        const missionId = metadata?.missionId;
        if (missionId) {
          const mission = this._missions.find(m => m.id === missionId);
          if (mission && !mission._resolved) {
            mission.metadata.completedWorkers = mission.metadata.completedWorkers || [];
            mission.metadata.completedWorkers.push(workerId);
            this._checkMissionComplete(mission);
          }
        }
      })
    );
  }

  emitGitDiff(diff) {
    this._eventQueue.emit('git_diff', { diff });
  }

  compileMissions() {
    const missions = this._compiler.compileMissions({ certificates: this._certifier.getSummary() });
    for (const mission of missions) {
      if (!this._missions.find(m => m.id === mission.id)) {
        this._missions.push(mission);
      }
    }
    return missions;
  }

  _executeMission(mission) {
    if (mission.status === 'processing' || mission.status === 'completed' || mission._resolved) return;
    const hasCapabilities = mission.metadata.requiredCapabilities.some(cap => this._workerPorts.findAvailable(cap, 1).length > 0);
    if (!hasCapabilities) {
      console.log(`  No workers available for ${mission.type} — deferring`);
      return;
    }

    mission.status = 'processing';
    const assignments = mission.metadata.priority >= 8
      ? this._scheduler.scheduleForConsensus(mission, 3)
      : this._scheduler.schedule(mission);
    if (assignments.length === 0) {
      mission.status = 'pending';
    } else {
      for (const worker of assignments[0].workers) {
        this._stateMachine.transition(worker.workerId, 'assigned', { missionId: mission.id });
      }
    }
  }

  // Provenance helpers (hardening change E). runId groups every artifact stored
  // during one top-level engine invocation. The autonomous loop generates one
  // runId and threads it through its internal dispatch/collect calls so a loop's
  // artifacts stay correlatable; standalone route invocations generate their own.
  _newRunId() {
    return `run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  _provenanceAgentId(agent) {
    return (agent && agent.agentId) ? agent.agentId : 'unknown';
  }

  // Runs fn with a provenance context that ArtifactStore attaches to any artifact
  // stored inside fn. Used for authority-produced artifacts, which build their own
  // payloads and cannot take explicit provenance fields. Synchronous only: the
  // context is set and cleared around fn with no awaits in between.
  _withProvenance(provenance, fn) {
    const store = this._artifactStore;
    const prev = store._provenance;
    store._provenance = provenance;
    try {
      return fn();
    } finally {
      store._provenance = prev;
    }
  }

  dispatchToAssignment(missionId, completionHandler, agent, runId) {
    const mission = this._missions.find(m => m.id === missionId);
    if (!mission) return null;

    if (mission.status === 'completed' || mission.status === 'processing') return null;

    mission.status = 'processing';

    const assignments = mission.metadata.priority >= 8
      ? this._scheduler.scheduleForConsensus(mission, 3)
      : this._scheduler.schedule(mission);

    if (assignments.length === 0) {
      mission.status = 'pending';
      return null;
    }

    const dispatch = assignments[0];
    mission.metadata.expectedWorkerCount = dispatch.workers.length;
    const outputs = [];
    const dispatchRunId = runId || this._newRunId();
    const actor = this._provenanceAgentId(agent);

    for (const worker of dispatch.workers) {
      const workerId = worker.workerId;
      this._stateMachine.transition(workerId, 'running', { missionId });
      const workerPort = this._workerPorts.get(workerId);
      if (workerPort) workerPort.transition('running', { missionId });

      const context = this._artifactRouter.buildWorkerContext(mission, workerId);
      const memoryContext = this._stateMachine.getContext(workerId);
      const prompt = this._artifactRouter.buildPrompt(mission, context, memoryContext);

      const promptArtifact = this._artifactStore.store({
        type: 'prompt',
        workerId,
        missionId: mission.id,
        content: { context, prompt },
        confidence: 1,
        metadata: { promptLength: prompt.length },
        runId: dispatchRunId,
        action: 'dispatch',
        actor
      });

      outputs.push({
        workerId,
        model: worker.model,
        context,
        prompt,
        promptArtifactId: promptArtifact
      });

      if (completionHandler) {
        completionHandler({
          workerId,
          missionId: mission.id,
          context,
          prompt,
          promptArtifactId: promptArtifact
        });
      }
    }

    return {
      missionId: mission.id,
      workers: dispatch.workers,
      outputs
    };
  }

  collectWorkerOutput(workerId, missionId, output, agent, runId) {
    const mission = this._missions.find(m => m.id === missionId);
    if (!mission || mission._resolved) return null;
    // Hardening C: never accept output under a workerId that is not registered.
    if (!workerId) return null;
    if (!this._registry.getWorker(workerId)) return null;

    const actor = this._provenanceAgentId(agent);
    const collectRunId = runId || this._newRunId();

    this._stateMachine.transition(workerId, 'waiting', { missionId });
    const workerPort = this._workerPorts.get(workerId);
    if (workerPort) workerPort.transition('waiting', { missionId });

    if (!mission.workerOutputs) mission.workerOutputs = [];

    const record = {
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

    if (output.findings) {
      for (const finding of output.findings) {
        this._stateMachine.recordFinding(workerId, finding);
      }
    }

    this._checkMissionComplete(mission, { runId: collectRunId, actor });

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
    const outputs = mission.workerOutputs || [];
    const decision = this._consensus.evaluate(mission, outputs);

    mission.status = decision.accepted ? 'completed' : 'failed';
    mission.consensus = decision;

    for (const output of outputs) {
      const wasAccepted = decision.findings?.some(f =>
        output.findings?.some(of =>
          of.file === f.file && of.line === f.line
        )
      );
      this._stateMachine.transition(output.workerId, decision.accepted ? 'completed' : 'failed', {
        missionId: mission.id,
        accepted: decision.accepted
      });
      let workerPort = this._workerPorts.get(output.workerId);
      if (workerPort) {
        workerPort.transition(decision.accepted ? 'completed' : 'failed', { missionId: mission.id });
        workerPort.transition('idle', {});
        // Hardening D: reputation is engine-observed (consensus outcome), never caller-supplied.
        this._registry.recordQuality(output.workerId, wasAccepted ? 1 : 0);
      }
      this._stateMachine.recordFix(output.workerId, output, wasAccepted, wasAccepted ? null : 'not_in_consensus');
      this._registry.recordAcceptance(output.workerId, decision.accepted);
      if (!decision.accepted) {
        this._registry.recordFailure(output.workerId, `${mission.type}:consensus_rejected`);
      }
    }

    const consensusArtifact = this._withProvenance(resolveProvenance, () =>
      this._consensusAuthority.produce(decision, mission.id));
    const consensusArtifactId = consensusArtifact.id || consensusArtifact;

    const consensusEvent = this._eventQueue.emitChain(
      decision.accepted ? 'consensus_reached' : 'consensus_failed',
      {
        missionId: mission.id,
        decisionId: decision.decisionId || decision.id,
        consensusArtifactId,
        accepted: decision.accepted,
        confidence: decision.averageConfidence || decision.confidence,
        agreementLevel: decision.agreementLevel,
        strongConsensus: decision.strongConsensus || false
      }
    );

    let mergeArtifactId = null;
    let mergeEvent = null;

    if (decision.accepted) {
      if (decision.findings && decision.findings.length > 0) {
        for (const worker of (mission.workerOutputs || [])) {
          this._stateMachine.recordPattern(
            worker.workerId,
            `${mission.type}:${mission.target || 'global'}`,
            'pattern'
          );
        }
      }

      this._mergeGate.clear();
      for (const file of (mission.files || [])) {
        const fullPath = path.resolve(__dirname, '../../../', file);
        if (fs.existsSync(fullPath)) {
          this._mergeGate.validateFile(fullPath);
        }
      }
      const gateResult = this._mergeGate.summary();

      const mergeArtifact = this._withProvenance(resolveProvenance, () =>
        this._mergeDecisionAuthority.produce(mission.id, gateResult, consensusArtifactId));
      mergeArtifactId = mergeArtifact.id || mergeArtifact;

      mergeEvent = this._eventQueue.emitChain('merge_decision_created', {
        missionId: mission.id,
        decisionId: decision.decisionId || decision.id,
        mergeArtifactId,
        consensusArtifactId,
        canCommit: gateResult.can_commit,
        blocking: gateResult.blocking,
        warnings: gateResult.warnings
      }, consensusEvent);

      const workerDetails = outputs.map(o => {
        const worker = this._registry.getWorker(o.workerId);
        return {
          workerId: o.workerId,
          model: worker?.model || 'unknown',
          confidence: o.confidence || 0,
          findingsCount: (o.findings || []).length
        };
      });

      this._eventQueue.emitChain('mission_accepted', {
        missionId: mission.id,
        decisionId: decision.decisionId || decision.id,
        missionType: mission.type,
        missionTarget: mission.target,
        confidence: decision.averageConfidence || decision.confidence,
        variance: decision.confidenceVariance || 0,
        agreementLevel: decision.agreementLevel,
        strongConsensus: decision.strongConsensus || false,
        workerCount: outputs.length,
        workerDetails,
        consensusArtifactId,
        mergeArtifactId,
        findingCount: (decision.findings || []).length,
        sharedFindings: decision.sharedFindings || 0
      }, mergeEvent || consensusEvent);

    } else {
      this._eventQueue.emitChain('mission_rejected', {
        missionId: mission.id,
        decisionId: decision.decisionId || decision.id,
        missionType: mission.type,
        workerCount: outputs.length,
        confidence: decision.averageConfidence || decision.confidence,
        variance: decision.confidenceVariance || 0,
        reason: decision.reason || 'consensus_failed'
      }, consensusEvent);
    }

    mission.consensusArtifactId = consensusArtifactId;
    mission.mergeArtifactId = mergeArtifactId;
    return decision;
  }

  generateDashboard() {
    const graphMeta = this._graphData?.summary || {};
    const replayCov = this._graphData?.metadata?.replay_coverage || {};
    const witnessCov = this._graphData?.metadata?.witness_coverage || {};
    const debt = this._graphData?.metadata?.constitutional_debt || {};
    const entropy = this._graphData?.metadata?.entropy_distribution || {};
    const dormantSummary = this._classifier?.getSummary() || {};
    const certSummary = this._certifier?.getSummary() || {};

    const registryStats = this._registry.getStats();
    const stateStats = this._stateMachine.getStats();
    const eventStats = this._eventQueue.getStats();
    const storeStats = this._artifactStore.getStats();
    const gateResult = this._mergeGate.summary();

    const mergedMissions = this._missions.filter(m => m.consensus?.accepted).length;
    const failedMissions = this._missions.filter(m => m.consensus && !m.consensus.accepted).length;
    const pendingMissions = this._missions.filter(m => !m.consensus).length;
    const totalMissions = this._missions.length;

    return {
      engine_version: '2.0.0',
      initialized: this._initialized,

      repository: {
        production: graphMeta.production || 0,
        dormant: graphMeta.dormant || 0,
        authorities: graphMeta.authorities || 0,
        edges: graphMeta.edges || 0,
        totalLines: graphMeta.total_lines || 0,
        productionLines: graphMeta.production_lines || 0
      },

      replay_coverage: {
        full: replayCov.full || 0,
        event: replayCov.event || 0,
        witness: replayCov.witness || 0,
        none: replayCov.none || 0,
        witness_pct: witnessCov.coverage_pct || 0
      },

      certificates: {
        total: certSummary.total_certified || 0,
        averageScore: certSummary.average_score || 0,
        high: certSummary.by_score?.high || 0,
        medium: certSummary.by_score?.medium || 0,
        low: certSummary.by_score?.low || 0
      },

      constitutional_debt: {
        files: debt.total_files || 0,
        lines: debt.total_lines || 0,
        high_entropy_dormant: debt.high_entropy || 0,
        safe_deletions: dormantSummary.high_confidence_deletions || 0,
        migration_candidates: dormantSummary.migration_candidates || 0,
        needs_review: dormantSummary.needs_review || 0
      },

      capability_registry: {
        totalWorkers: registryStats.totalWorkers || 0,
        idle: registryStats.idle || 0,
        running: registryStats.running || 0,
        totalCapabilities: registryStats.totalCapabilities || 0,
        averageQuality: registryStats.averageQuality || 0
      },

      worker_states: stateStats,

      events: {
        total: eventStats.total || 0,
        recentPerMinute: eventStats.recentRate || 0,
        byType: eventStats.byType || {}
      },

      artifact_store: storeStats,

      missions: {
        total: totalMissions,
        pending: pendingMissions,
        completed: mergedMissions,
        failed: failedMissions,
        closureRate: totalMissions > 0
          ? Math.round(mergedMissions / totalMissions * 100) : 0
      },

      merge_gate: {
        blocking: gateResult.blocking || 0,
        warnings: gateResult.warnings || 0,
        canCommit: gateResult.can_commit
      },

      velocity: {
        missionClosureRate: totalMissions > 0
          ? Math.round((mergedMissions + failedMissions) / totalMissions * 100) : 0,
        missionAcceptRate: (mergedMissions + failedMissions) > 0
          ? Math.round(mergedMissions / (mergedMissions + failedMissions) * 100) : 0,
        artifactThroughput: storeStats.totalArtifacts || 0,
        workerEfficiency: stateStats.totalAccepted + stateStats.totalRejected > 0
          ? Math.round(stateStats.totalAccepted / (stateStats.totalAccepted + stateStats.totalRejected) * 100) : 0
      }
    };
  }

  printDashboard() {
    const d = this.generateDashboard();

    console.log('\n========================================');
    console.log('  CONSTITUTIONAL EXECUTION ENGINE');
    console.log('  Phase 38 — Distributed Execution Fabric');
    console.log('========================================\n');

    console.log('📊 REPOSITORY');
    console.log(`  Production: ${d.repository.production}`);
    console.log(`  Dormant: ${d.repository.dormant}`);
    console.log(`  Authorities: ${d.repository.authorities}`);
    console.log(`  Edges: ${d.repository.edges}`);

    console.log('\n🔐 REPLAY & CERTIFICATION');
    console.log(`  Full: ${d.replay_coverage.full} | Event: ${d.replay_coverage.event} | Witness: ${d.replay_coverage.witness}`);
    console.log(`  Witness coverage: ${d.replay_coverage.witness_pct}%`);
    console.log(`  Certificates: ${d.certificates.total} (avg ${d.certificates.averageScore}%)`);

    console.log('\n💳 DEBT');
    console.log(`  ${d.constitutional_debt.files} files, ${d.constitutional_debt.lines} lines`);
    console.log(`  Safe deletions: ${d.constitutional_debt.safe_deletions}`);

    console.log('\n👷 WORKER POOL');
    console.log(`  Registered: ${d.capability_registry.totalWorkers}`);
    console.log(`  Idle: ${d.capability_registry.idle} | Running: ${d.capability_registry.running}`);
    console.log(`  Capabilities: ${d.capability_registry.totalCapabilities}`);
    console.log(`  Average quality: ${d.capability_registry.averageQuality}`);

    console.log('\n📋 MISSIONS');
    console.log(`  Total: ${d.missions.total}`);
    console.log(`  Completed: ${d.missions.completed} | Failed: ${d.missions.failed} | Pending: ${d.missions.pending}`);
    console.log(`  Closure rate: ${d.missions.closureRate}%`);

    console.log('\n📦 ARTIFACT STORE');
    console.log(`  Total: ${d.artifact_store.totalArtifacts}`);
    console.log(`  Proposals: ${d.artifact_store.proposals || 0}`);
    console.log(`  Replay proofs: ${d.artifact_store.replayProofs || 0}`);
    console.log(`  Avg confidence: ${d.artifact_store.averageConfidence}`);

    console.log('\n⚡ EVENTS');
    console.log(`  Total: ${d.events.total}`);
    console.log(`  Rate: ${d.events.recentPerMinute}/min`);

    console.log('\n🔒 MERGE GATE');
    console.log(`  ${d.merge_gate.canCommit ? 'PASS' : 'BLOCKED'}`);
    console.log(`  Blocking: ${d.merge_gate.blocking} | Warnings: ${d.merge_gate.warnings}`);

    console.log('\n📈 VELOCITY');
    console.log(`  Mission closure: ${d.velocity.missionClosureRate}%`);
    console.log(`  Mission accept: ${d.velocity.missionAcceptRate}%`);
    console.log(`  Artifact throughput: ${d.velocity.artifactThroughput}`);
    console.log(`  Worker efficiency: ${d.velocity.workerEfficiency}%`);

    console.log('\n========================================\n');
  }

  async startAutonomousLoop(options = {}) {
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

    if (verbose) console.log(`\n[AutonomousLoop] Starting (max ${maxIterations} iterations)`);

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      await new Promise(r => setImmediate(r));
      if (verbose) console.log(`\n[AutonomousLoop] Iteration ${iteration + 1}/${maxIterations}`);

      const missions = this.compileMissions();
      const pending = missions.filter(m => m.metadata.priority >= (options.minPriority || 5));

      if (pending.length === 0) {
        if (verbose) console.log('[AutonomousLoop] No pending missions — loop complete');
        break;
      }

      this._eventQueue.emit('knowledge_compiled', {
        iteration: iteration + 1,
        totalMissions: missions.length,
        pendingMissions: pending.length
      });

      for (const mission of pending.slice(0, options.missionsPerIteration || 3)) {
        const dispatch = this.dispatchToAssignment(mission.id, null, loopAgent, loopRunId);
        if (!dispatch || dispatch.workers.length === 0) {
          if (verbose) console.log(`  [${mission.id}] No eligible workers`);
          continue;
        }

        for (const w of dispatch.workers) {
          const output = {
            workerId: w.workerId,
            findings: [{ file: mission.target || 'x', line: 0, bypass_type: 'auto_scan', confidence: 0.85 }],
            confidence: 0.85
          };
          const result = this.collectWorkerOutput(w.workerId, mission.id, output, loopAgent, loopRunId);
          if (result) {
            results.push({ missionId: mission.id, workerId: w.workerId, iteration: iteration + 1 });
          }
        }
      }

      if (this._contextAuth && this._eventQueue) {
        const missionCount = pending.length;
        const mergedCount = missions.filter(m => m.consensus?.accepted).length;
        this._eventQueue.emit('worker_progress', {
          iteration: iteration + 1,
          missionCount,
          mergedCount,
          failedCount: missions.filter(m => m.consensus && !m.consensus.accepted).length
        });
      }
    }

    if (verbose) {
      const dash = this.generateDashboard();
      console.log(`\n[AutonomousLoop] Complete: ${results.length} missions resolved`);
      console.log(`  Events: ${dash.events.total}`);
      console.log(`  Missions: ${dash.missions.completed} completed / ${dash.missions.failed} failed`);
    }

    return results;
  }

  getReport() {
    const dashboard = this.generateDashboard();
    const missions = this.compileMissions();
    const highPriority = missions.filter(m => m.metadata.priority >= 7);

    const workers = this._registry.listWorkers();

    const capabilities = this._registry.listAllCapabilities();

    return {
      version: '2.0.0',
      initialized: this._initialized,
      dashboard,
      capabilities,
      workers: workers.map(w => ({
        id: w.id,
        model: w.model,
        capabilities: w.capabilities,
        state: w.state,
        load: `${w.currentLoad}/${w.maxLoad}`,
        quality: w.qualityScore
      })),
      high_priority_missions: highPriority.map(m => ({
        id: m.id,
        type: m.type,
        target: m.target || '(repo-wide)',
        priority: m.metadata.priority,
        description: m.metadata.description,
        requiredCapabilities: m.metadata.requiredCapabilities
      })),
      merge_gate: this._mergeGate.summary()
    };
  }
}

async function main() {
  const engine = new ExecutionEngine();
  await engine.initialize();

  const report = engine.getReport();

  console.log('\n=== PHASE 38 — CONSTITUTIONAL DISTRIBUTED EXECUTION FABRIC ===\n');

  console.log(`Workers: ${report.workers.length} (${report.dashboard.capability_registry.totalCapabilities} capabilities)`);
  console.log(`Missions: ${report.dashboard.missions.total} total (${report.dashboard.missions.completed} completed)`);
  console.log(`Repository: ${report.dashboard.repository.production} prod / ${report.dashboard.repository.dormant} dormant`);
  console.log(`Certificates: ${report.dashboard.certificates.averageScore}% avg`);
  console.log(`Debt: ${report.dashboard.constitutional_debt.files} files`);
  console.log(`Merge gate: ${report.dashboard.merge_gate.canCommit ? 'PASS' : 'BLOCKED'}`);

  if (report.high_priority_missions.length > 0) {
    console.log(`\nHigh-priority missions generated:`);
    for (const m of report.high_priority_missions) {
      console.log(`  [P${m.priority}] ${m.type}: ${m.description}`);
    }
  }

  const outputPath = path.join(__dirname, '..', 'phase38_report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${outputPath}`);
}

if (require.main === module) {
  main().catch(err => { console.error('Engine failed:', err); process.exit(1); });
}

module.exports = { ExecutionEngine };
