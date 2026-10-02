/**
 * Self-Improvement Loop
 * 
 * Phase 24 — Self-Improvement Loop
 * 
 * Connect everything:
 * 
 * Repository Discovery
 * ↓
 * Repository Analysis
 * ↓
 * Mission Generation
 * ↓
 * Mission Prioritization
 * ↓
 * Mission Scheduling
 * ↓
 * Mission Execution
 * ↓
 * Patch Generation
 * ↓
 * Validation
 * ↓
 * Replay
 * ↓
 * Approval
 * ↓
 * Commit
 * ↓
 * Witness
 * ↓
 * Checkpoint
 * ↓
 * Repository Discovery
 * 
 * The system literally improves from every repository.
 */

const { CanonicalAuthority } = require('../ping-runtime/authorities/canonical_authority.js');
const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority.js');
const { witnessAuthority } = require('./witness_authority');

class SelfImprovementLoop {
  constructor(repositoryDiscoveryService, repositoryAnalysisService, missionGenerationService, missionExecutionAuthority, memoryAuthority, eventBus, workerPool = null) {
    this._repositoryDiscovery = repositoryDiscoveryService;
    this._repositoryAnalysis = repositoryAnalysisService;
    this._missionGeneration = missionGenerationService;
    this._missionExecution = missionExecutionAuthority;
    this._memoryAuthority = memoryAuthority;
    this._eventBus = eventBus;
    this._workerPool = workerPool;
    this._authorityId = this._generateAuthorityId();
    this._running = false;
    this._loopInterval = 3600000; // 1 hour
    this._loopTimer = null;
  }

  /**
   * Initialize loop
   */
  async initialize() {
    await this._startLoop();
    // Execute discovery cycle immediately on startup
    await this._runCycle();
    console.log('[SelfImprovementLoop] Initialized');
  }

  /**
   * Start loop
   */
  _startLoop() {
    if (this._loopTimer) {
      clearInterval(this._loopTimer);
    }

    this._loopTimer = setInterval(async () => {
      await this._runCycle();
    }, this._loopInterval);

    this._running = true;
    console.log('[SelfImprovementLoop] Loop started with interval:', this._loopInterval, 'ms');
  }

  /**
   * Run one improvement cycle
   */
  async _runCycle() {
    if (!this._running) {
      return;
    }

    console.log('[SelfImprovementLoop] Starting improvement cycle');

    try {
      // Step 1: Repository Discovery
      const discovered = await this._repositoryDiscovery.discoverRepositories();
      console.log(`[SelfImprovementLoop] Discovered ${discovered.length} repositories`);

      // Step 2: Repository Analysis (parallel)
      const analysisPromises = discovered.map(repo =>
        this._analyzeRepository(repo).catch(error => {
          console.error(`[SelfImprovementLoop] Analysis failed for ${repo.repo_id}:`, error.message);
          return null;
        })
      );
      
      const analyses = await Promise.all(analysisPromises);
      const successfulAnalyses = analyses.filter(a => a !== null);
      console.log(`[SelfImprovementLoop] Analyzed ${successfulAnalyses.length}/${discovered.length} repositories`);

      // Step 3: Mission Generation (parallel)
      const missionPromises = discovered.map(repo =>
        this._missionGeneration.generateMissions(repo.repo_id).catch(error => {
          console.error(`[SelfImprovementLoop] Mission generation failed for ${repo.repo_id}:`, error.message);
          return [];
        })
      );
      
      const allMissions = await Promise.all(missionPromises);
      const flatMissions = allMissions.flat();
      console.log(`[SelfImprovementLoop] Generated ${flatMissions.length} missions total`);

      // Publish MissionGenerated events for Control Center
      if (this._eventBus) {
        for (const mission of flatMissions) {
          await this._eventBus.publish('MissionGenerated', {
            mission_id: mission.mission_id,
            repo_id: mission.repo_id,
            mission_type: mission.mission_type,
            mission_description: mission.mission_description
          });
        }
      }

      // Step 4: Mission Prioritization
      const prioritized = await this._prioritizeMissions();
      console.log(`[SelfImprovementLoop] Prioritized ${prioritized.length} missions`);

      // Step 5: Mission Scheduling
      const scheduled = await this._scheduleMissions(prioritized);
      console.log(`[SelfImprovementLoop] Scheduled ${scheduled.length} missions`);

      // Step 6: Mission Execution
      for (const mission of scheduled) {
        try {
          const execution = await this._missionExecution.executeMission(mission.mission_id);
          console.log(`[SelfImprovementLoop] Executed mission ${mission.mission_id}`);

          // Store successful execution as pattern
          if (execution.execution_status === 'completed') {
            await this._memoryAuthority.storePattern({
              pattern_name: `mission_${mission.mission_type}`,
              pattern_type: mission.mission_type,
              pattern_description: mission.mission_description,
              pattern_code: JSON.stringify(execution),
              pattern_frequency: 1,
              repository_id: mission.repo_id
            });
          }
        } catch (error) {
          console.error(`[SelfImprovementLoop] Failed to execute mission ${mission.mission_id}:`, error.message);

          // Store failure in memory
          await this._memoryAuthority.storeFailure({
            failure_description: error.message,
            failure_type: 'execution_failure',
            failure_context: { mission_id: mission.mission_id },
            repository_id: mission.repo_id
          });
        }
      }

      // Step 7: Learn from cycle
      for (const repo of discovered) {
        await this._learnFromCycle(repo.repo_id);
      }

      console.log('[SelfImprovementLoop] Improvement cycle completed');

    } catch (error) {
      console.error('[SelfImprovementLoop] Improvement cycle failed:', error.message);
    }
  }

  /**
   * Prioritize missions
   * @returns {Array} Prioritized missions
   */
  async _prioritizeMissions() {
    // Get all pending missions
    const result = await this._missionGeneration._postgres.query(`
      SELECT mission_id, repo_id, mission_type, mission_description, priority, feasibility_score
      FROM missions
      WHERE mission_status = 'pending'
      ORDER BY priority DESC, feasibility_score DESC
      LIMIT 10
    `, []);

    return result.rows;
  }

  /**
   * Schedule missions
   * @param {Array} missions - Missions to schedule
   * @returns {Array} Scheduled missions
   */
  async _scheduleMissions(missions) {
    const scheduled = [];

    for (const mission of missions) {
      await this._missionGeneration._postgres.query(`
        UPDATE missions
        SET mission_status = 'scheduled', scheduled_at = NOW()
        WHERE mission_id = $1
      `, [mission.mission_id]);

      scheduled.push({
        ...mission,
        mission_status: 'scheduled',
        scheduled_at: constitutionalTimeAuthority.now()
      });
    }

    return scheduled;
  }

  /**
   * Learn from cycle
   * @param {string} repoId - Repository ID
   */
  async _learnFromCycle(repoId) {
    // Extract patterns from successful executions
    const patterns = await this._memoryAuthority._postgres.query(`
      SELECT * FROM memory_patterns WHERE repository_id = $1
    `, [repoId]);

    // Update pattern frequencies
    for (const pattern of patterns.rows) {
      await this._memoryAuthority._postgres.query(`
        UPDATE memory_patterns
        SET pattern_frequency = pattern_frequency + 1
        WHERE pattern_id = $1
      `, [pattern.pattern_id]);
    }

    // Extract facts from failures
    const failures = await this._memoryAuthority._postgres.query(`
      SELECT * FROM memory_failures WHERE repository_id = $1
    `, [repoId]);

    for (const failure of failures.rows) {
      await this._memoryAuthority._postgres.query(`
        INSERT INTO memory_facts (fact_id, fact_text, fact_category, confidence, source_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (fact_id) DO UPDATE SET
          confidence = memory_facts.confidence + 0.1
      `, [
        this._memoryAuthority._generateFactId(failure.failure_description),
        failure.failure_description,
        'failure_pattern',
        0.5,
        repoId
      ]);
    }
  }

  /**
   * Stop loop
   */
  async stop() {
    this._running = false;
    if (this._loopTimer) {
      clearInterval(this._loopTimer);
      this._loopTimer = null;
    }
    console.log('[SelfImprovementLoop] Stopped');
  }

  /**
   * Get loop status
   * @returns {Object} Status
   */
  getStatus() {
    return {
      running: this._running,
      loop_interval: this._loopInterval,
      authority_id: this._authorityId
    };
  }

  /**
   * Generate authority ID
   * @returns {string} Authority ID
   */
  _generateAuthorityId() {
    const authorityData = {
      authority_version: '24.0.0',
      constitutional_version: '24.0.0'
    };
    const hash = CanonicalAuthority.hash(authorityData);
    return `self_improvement_${hash.substring(0, 16)}`;
  }
}

module.exports = { SelfImprovementLoop };

