/**
 * Orchestration Routes — Orca HTTP Interface
 *
 * HTTP interface for the Constitutional Execution Engine (Orca).
 * Desktop agents submit missions here. Workers register and report output.
 *
 * POST   /orchestration/missions              — Submit a mission
 * GET    /orchestration/missions               — List all missions
 * GET    /orchestration/missions/:id           — Get mission status
 * POST   /orchestration/missions/:id/dispatch  — Dispatch mission to workers
 * POST   /orchestration/missions/:id/output    — Submit worker output
 * GET    /orchestration/workers                — List registered workers
 * GET    /orchestration/engine                 — Engine dashboard
 * POST   /orchestration/engine/compile         — Trigger mission compilation
 * POST   /orchestration/engine/loop            — Trigger autonomous loop
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../route_middleware');
const { constitutionalTimeAuthority } = require('../../ping-runtime/authorities/constitutional_time_authority.js');

function createOrchestrationRoutes(engine) {
  // ── Missions ──────────────────────────────────────────────

  /**
   * POST /orchestration/missions
   * Submit a new mission. Agents call this to delegate work.
   *
   * Body: {
   *   type: string,           // mission type (e.g., "ENTROPY_REDUCTION", "DEAD_CODE_AUDIT")
   *   target?: string,        // file or module target
   *   priority?: number,      // 1-10 (higher = more urgent)
   *   description?: string,   // human-readable description
   *   requiredCapabilities?: string[],  // capabilities needed
   *   metadata?: object       // extra metadata
   * }
   */
  router.post('/missions', asyncHandler('POST /orchestration/missions', async (req, res) => {
    const {
      type = 'GENERAL',
      target,
      priority = 5,
      description,
      requiredCapabilities = [],
      metadata = {},
      files,
    } = req.body;

    if (!type) return res.status(400).json({ error: 'type is required' });

    const mission = {
      id: `mission_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      target,
      status: 'pending',
      files: files || (target ? [target] : []),
      metadata: {
        priority,
        description: description || `${type} mission`,
        requiredCapabilities: requiredCapabilities.length > 0
          ? requiredCapabilities
          : ['orchestration.review'],
        ...metadata,
      },
      createdAt: constitutionalTimeAuthority.nowAsISOString(),
    };

    engine._missions.push(mission);

    res.status(201).json({
      missionId: mission.id,
      type: mission.type,
      status: mission.status,
      priority: mission.metadata.priority,
    });
  }));

  /**
   * GET /orchestration/missions
   * List all missions with optional status filter.
   */
  router.get('/missions', asyncHandler('GET /orchestration/missions', async (req, res) => {
    const { status, limit = 50 } = req.query;
    let missions = engine._missions || [];

    if (status) {
      missions = missions.filter(m => m.status === status);
    }

    const result = missions.slice(-parseInt(limit)).map(m => ({
      id: m.id,
      type: m.type,
      target: m.target,
      status: m.status,
      priority: m.metadata?.priority,
      description: m.metadata?.description,
      createdAt: m.createdAt,
      consensus: m.consensus ? {
        accepted: m.consensus.accepted,
        confidence: m.consensus.averageConfidence || m.consensus.confidence,
      } : null,
    }));

    res.json(result);
  }));

  /**
   * GET /orchestration/missions/:id
   * Get full mission status including worker outputs.
   */
  router.get('/missions/:id', asyncHandler('GET /orchestration/missions/:id', async (req, res) => {
    const mission = engine._missions.find(m => m.id === req.params.id);
    if (!mission) return res.status(404).json({ error: 'Mission not found' });

    res.json({
      id: mission.id,
      type: mission.type,
      target: mission.target,
      status: mission.status,
      priority: mission.metadata?.priority,
      description: mission.metadata?.description,
      files: mission.files,
      createdAt: mission.createdAt,
      workerOutputs: (mission.workerOutputs || []).map(o => ({
        workerId: o.workerId,
        confidence: o.confidence,
        findingsCount: (o.findings || []).length,
      })),
      consensus: mission.consensus || null,
      consensusArtifactId: mission.consensusArtifactId,
      mergeArtifactId: mission.mergeArtifactId,
    });
  }));

  /**
   * POST /orchestration/missions/:id/dispatch
   * Dispatch a pending mission to available workers.
   */
  router.post('/missions/:id/dispatch', asyncHandler('POST /orchestration/missions/:id/dispatch', async (req, res) => {
    const mission = engine._missions.find(m => m.id === req.params.id);
    if (!mission) return res.status(404).json({ error: 'Mission not found' });

    const dispatch = engine.dispatchToAssignment(mission.id);
    if (!dispatch) {
      return res.json({ missionId: mission.id, status: mission.status, workers: [] });
    }

    res.json({
      missionId: dispatch.missionId,
      workers: dispatch.workers.map(w => ({
        workerId: w.workerId,
        model: w.model,
        capability: w.capability,
      })),
      outputs: dispatch.outputs.map(o => ({
        workerId: o.workerId,
        promptLength: o.prompt?.length || 0,
        promptArtifactId: o.promptArtifactId,
      })),
    });
  }));

  /**
   * POST /orchestration/missions/:id/output
   * Submit worker output for a mission. Workers call this when done.
   *
   * Body: {
   *   workerId: string,
   *   findings?: object[],
   *   confidence?: number,
   *   summary?: string
   * }
   */
  router.post('/missions/:id/output', asyncHandler('POST /orchestration/missions/:id/output', async (req, res) => {
    const { workerId, findings, confidence, summary } = req.body;
    if (!workerId) return res.status(400).json({ error: 'workerId is required' });

    const result = engine.collectWorkerOutput(workerId, req.params.id, {
      findings: findings || [],
      confidence: confidence || 0.5,
      summary: summary || '',
    });

    if (!result) {
      return res.status(404).json({ error: 'Mission not found or already resolved' });
    }

    res.json({
      proposalId: result.proposalId,
      missionStatus: result.mission.status,
      consensus: result.mission.consensus ? {
        accepted: result.mission.consensus.accepted,
      } : null,
    });
  }));

  // ── Workers ──────────────────────────────────────────────

  /**
   * GET /orchestration/workers
   * List all registered workers and their status.
   */
  router.get('/workers', asyncHandler('GET /orchestration/workers', async (req, res) => {
    const registry = engine._registry;
    const workers = registry.listWorkers();
    const stats = registry.getStats();

    res.json({
      total: stats.totalWorkers,
      idle: stats.idle,
      running: stats.running,
      workers: workers.map(w => ({
        id: w.id,
        model: w.model,
        capabilities: w.capabilities,
        state: w.state,
        load: `${w.currentLoad || 0}/${w.maxLoad || 3}`,
        specialization: w.specialization,
        qualityScore: w.qualityScore,
        replayCompatibility: w.replayCompatibility,
      })),
    });
  }));

  // ── Engine ──────────────────────────────────────────────

  /**
   * GET /orchestration/engine
   * Full engine dashboard.
   */
  router.get('/engine', asyncHandler('GET /orchestration/engine', async (req, res) => {
    res.json(engine.generateDashboard());
  }));

  /**
   * GET /orchestration/engine/report
   * Full engine report including capabilities and high-priority missions.
   */
  router.get('/engine/report', asyncHandler('GET /orchestration/engine/report', async (req, res) => {
    res.json(engine.getReport());
  }));

  /**
   * POST /orchestration/engine/compile
   * Trigger mission compilation from the intelligence graph.
   */
  router.post('/engine/compile', asyncHandler('POST /orchestration/engine/compile', async (req, res) => {
    const missions = engine.compileMissions();
    res.json({
      compiled: missions.length,
      missions: missions.map(m => ({
        id: m.id,
        type: m.type,
        target: m.target,
        priority: m.metadata?.priority,
        description: m.metadata?.description,
      })),
    });
  }));

  /**
   * POST /orchestration/engine/loop
   * Trigger autonomous loop (limited iterations).
   *
   * Body: {
   *   maxIterations?: number (default 3),
   *   minPriority?: number (default 5),
   *   missionsPerIteration?: number (default 3)
   * }
   */
  router.post('/engine/loop', asyncHandler('POST /orchestration/engine/loop', async (req, res) => {
    const { maxIterations = 3, minPriority = 5, missionsPerIteration = 3 } = req.body;
    const results = engine.startAutonomousLoop({
      maxIterations,
      minPriority,
      missionsPerIteration,
      verbose: false,
    });

    res.json({
      resolved: results.length,
      results: results.map(r => ({
        missionId: r.missionId,
        workerId: r.workerId,
        iteration: r.iteration,
      })),
      dashboard: engine.generateDashboard(),
    });
  }));

  /**
   * POST /orchestration/engine/git-diff
   * Emit a git diff event to trigger mission compilation.
   *
   * Body: { diff: string }
   */
  router.post('/engine/git-diff', asyncHandler('POST /orchestration/engine/git-diff', async (req, res) => {
    const { diff } = req.body;
    if (!diff) return res.status(400).json({ error: 'diff is required' });

    engine.emitGitDiff(diff);
    res.json({ emitted: true, missionCount: engine._missions.length });
  }));

  return router;
}

module.exports = createOrchestrationRoutes;
