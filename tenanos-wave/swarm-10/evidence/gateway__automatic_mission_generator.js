/**
 * Automatic Mission Generator
 *
 * Phase 36H — Autonomous Engineering Fabric
 *
 * Constitutional authority for watcher-driven mission creation.
 *
 * Watchers emit events → Mission Generator creates missions → Agents execute missions
 *
 * Example:
 * DependencyWatcher emits DependencyCVEDetected
 * ↓
 * Mission Generator creates UpgradeDependency mission
 * ↓
 * Devin executes mission
 * ↓
 * OpenCode validates
 * ↓
 * PR opened
 *
 * Constitutional Constraint:
 * - Mission generation is event-driven
 * - Mission generation rules are constitutional
 * - Mission generation is deterministic
 * - Mission generation lifecycle is event-sourced
 */

const { CanonicalAuthority, CanonicalBytes } = require('../ping-runtime/authorities/canonical_authority.js');
const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority.js');
const { identityAuthority } = require('../ping-runtime/authorities/identity_authority.js');
const { witnessAuthority } = require('./witness_authority');
const { constitutionVersionAuthority } = require('./constitution_version_authority');

/**
 * Mission Generation Rules
 *
 * Maps watcher events to mission types and parameters.
 */
const MissionGenerationRules = {
  [WatcherEventTypes.DEPENDENCY_CVE_DETECTED]: {
    mission_type: MissionTypes.DEPENDENCY_UPGRADE,
    priority: TriggerPriority.CRITICAL,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY, AgentCapabilities.WRITE_REPOSITORY],
    extract_parameters: (payload) => ({
      dependency_name: payload.dependency_name,
      current_version: payload.current_version,
      cve_id: payload.cve_id,
      severity: payload.severity,
      repository: payload.repository
    })
  },
  [WatcherEventTypes.DEPENDENCY_UPDATE_AVAILABLE]: {
    mission_type: MissionTypes.DEPENDENCY_UPGRADE,
    priority: TriggerPriority.MEDIUM,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY, AgentCapabilities.WRITE_REPOSITORY],
    extract_parameters: (payload) => ({
      dependency_name: payload.dependency_name,
      current_version: payload.current_version,
      available_version: payload.available_version,
      repository: payload.repository
    })
  },
  [WatcherEventTypes.SCHEMA_CHANGE_DETECTED]: {
    mission_type: MissionTypes.REFACTOR,
    priority: TriggerPriority.HIGH,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY, AgentCapabilities.WRITE_REPOSITORY, AgentCapabilities.CODE_GENERATION],
    extract_parameters: (payload) => ({
      schema_name: payload.schema_name,
      change_type: payload.change_type,
      affected_tables: payload.affected_tables,
      repository: payload.repository
    })
  },
  [WatcherEventTypes.REPLAY_FAILURE_DETECTED]: {
    mission_type: MissionTypes.BUG_FIX,
    priority: TriggerPriority.CRITICAL,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY, AgentCapabilities.EXECUTE_TESTS, AgentCapabilities.CODE_GENERATION],
    extract_parameters: (payload) => ({
      replay_id: payload.replay_id,
      failure_reason: payload.failure_reason,
      affected_components: payload.affected_components,
      repository: payload.repository
    })
  },
  [WatcherEventTypes.DETERMINISM_VIOLATION_DETECTED]: {
    mission_type: MissionTypes.BUG_FIX,
    priority: TriggerPriority.CRITICAL,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY, AgentCapabilities.EXECUTE_TESTS, AgentCapabilities.CODE_GENERATION],
    extract_parameters: (payload) => ({
      violation_type: payload.violation_type,
      affected_authority: payload.affected_authority,
      repository: payload.repository
    })
  },
  [WatcherEventTypes.CONSENSUS_FAILURE_DETECTED]: {
    mission_type: MissionTypes.BUG_FIX,
    priority: TriggerPriority.CRITICAL,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY, AgentCapabilities.EXECUTE_TESTS, AgentCapabilities.CODE_GENERATION],
    extract_parameters: (payload) => ({
      consensus_id: payload.consensus_id,
      divergence_reason: payload.divergence_reason,
      affected_replicas: payload.affected_replicas,
      repository: payload.repository
    })
  },
  [WatcherEventTypes.REPLICA_DIVERGENCE_DETECTED]: {
    mission_type: MissionTypes.BUG_FIX,
    priority: TriggerPriority.HIGH,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY, AgentCapabilities.EXECUTE_TESTS],
    extract_parameters: (payload) => ({
      replica_id: payload.replica_id,
      divergence_point: payload.divergence_point,
      repository: payload.repository
    })
  },
  [WatcherEventTypes.PERFORMANCE_DEGRADATION_DETECTED]: {
    mission_type: MissionTypes.PERFORMANCE_OPTIMIZATION,
    priority: TriggerPriority.HIGH,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY, AgentCapabilities.CODE_GENERATION],
    extract_parameters: (payload) => ({
      metric_name: payload.metric_name,
      degradation_percentage: payload.degradation_percentage,
      affected_components: payload.affected_components,
      repository: payload.repository
    })
  },
  [WatcherEventTypes.BOTTLENECK_DETECTED]: {
    mission_type: MissionTypes.PERFORMANCE_OPTIMIZATION,
    priority: TriggerPriority.MEDIUM,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY, AgentCapabilities.CODE_GENERATION],
    extract_parameters: (payload) => ({
      bottleneck_type: payload.bottleneck_type,
      affected_components: payload.affected_components,
      repository: payload.repository
    })
  },
  [WatcherEventTypes.SECURITY_VULNERABILITY_DETECTED]: {
    mission_type: MissionTypes.SECURITY_AUDIT,
    priority: TriggerPriority.CRITICAL,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY, AgentCapabilities.SECURITY_AUDIT],
    extract_parameters: (payload) => ({
      vulnerability_type: payload.vulnerability_type,
      severity: payload.severity,
      affected_files: payload.affected_files,
      repository: payload.repository
    })
  },
  [WatcherEventTypes.SECURITY_BREACH_DETECTED]: {
    mission_type: MissionTypes.HOTFIX,
    priority: TriggerPriority.CRITICAL,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY, AgentCapabilities.WRITE_REPOSITORY, AgentCapabilities.DEPLOY_PREVIEW],
    extract_parameters: (payload) => ({
      breach_type: payload.breach_type,
      affected_components: payload.affected_components,
      repository: payload.repository
    })
  },
  [WatcherEventTypes.COST_ANOMALY_DETECTED]: {
    mission_type: MissionTypes.INFRASTRUCTURE_PROVISION,
    priority: TriggerPriority.MEDIUM,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY],
    extract_parameters: (payload) => ({
      cost_type: payload.cost_type,
      anomaly_percentage: payload.anomaly_percentage,
      affected_resources: payload.affected_resources
    })
  },
  [WatcherEventTypes.BUDGET_OVERRUN_DETECTED]: {
    mission_type: MissionTypes.INFRASTRUCTURE_PROVISION,
    priority: TriggerPriority.HIGH,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY],
    extract_parameters: (payload) => ({
      budget_type: payload.budget_type,
      overrun_percentage: payload.overrun_percentage,
      affected_resources: payload.affected_resources
    })
  },
  [WatcherEventTypes.INFRASTRUCTURE_UNHEALTHY]: {
    mission_type: MissionTypes.INFRASTRUCTURE_PROVISION,
    priority: TriggerPriority.CRITICAL,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY],
    extract_parameters: (payload) => ({
      infrastructure_type: payload.infrastructure_type,
      health_status: payload.health_status,
      affected_resources: payload.affected_resources
    })
  },
  [WatcherEventTypes.CAPACITY_EXCEEDED]: {
    mission_type: MissionTypes.INFRASTRUCTURE_PROVISION,
    priority: TriggerPriority.HIGH,
    required_capabilities: [AgentCapabilities.READ_REPOSITORY],
    extract_parameters: (payload) => ({
      resource_type: payload.resource_type,
      current_usage: payload.current_usage,
      capacity_limit: payload.capacity_limit
    })
  }
};

/**
 * Mission Generation Schema
 *
 * Constitutional mission generation artifact.
 */
class MissionGeneration {
  constructor(data) {
    this.generation_id = data.generation_id;
    this.watcher_event_id = data.watcher_event_id;
    this.watcher_type = data.watcher_type;
    this.event_type = data.event_type;
    this.mission_id = data.mission_id || null;
    this.mission_type = data.mission_type;
    this.mission_parameters = data.mission_parameters || {};
    this.priority = data.priority;
    this.required_capabilities = data.required_capabilities || [];
    this.status = data.status || 'pending';
    this.generated_at = data.generated_at || constitutionalTimeAuthority.nowAsMillis();
    this.error = data.error || null;
    
    // Constitutional metadata
    this.runtime_id = data.runtime_id;
    this.authority = 'AutomaticMissionGenerator';
    this.authority_version = '36.0.0';
    this.constitutional_version = constitutionVersionAuthority.getCurrentVersions().constitutional_schema;
    
    // Constitutional hashes
    this.generation_hash = this._computeGenerationHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Compute generation hash
   */
  _computeGenerationHash() {
    const generationData = {
      generation_id: this.generation_id,
      watcher_event_id: this.watcher_event_id,
      watcher_type: this.watcher_type,
      event_type: this.event_type,
      mission_type: this.mission_type,
      mission_parameters: this.mission_parameters,
      priority: this.priority,
      required_capabilities: this.required_capabilities,
      runtime_id: this.runtime_id,
      generated_at: this.generated_at
    };
    return CanonicalAuthority.hash(generationData);
  }
  
  /**
   * Create witness
   */
  _createWitness() {
    const witnessData = {
      execution_id: this.generation_id,
      input_hash: this.generation_hash,
      output_hash: this.mission_id ? CanonicalAuthority.hash(this.mission_id) : null,
      authority: this.authority,
      node_id: this.generation_id,
      success: this.status === 'completed',
      constitutional_version: this.constitutional_version
    };
    
    return witnessAuthority.createWitness(witnessData, {
      authority: this.authority,
      authority_version: this.authority_version
    });
  }
  
  /**
   * Complete generation
   */
  complete(missionId) {
    this.status = 'completed';
    this.mission_id = missionId;
    this.generation_hash = this._computeGenerationHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Fail generation
   */
  fail(error) {
    this.status = 'failed';
    this.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
    this.generation_hash = this._computeGenerationHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Serialize generation to canonical bytes
   */
  toCanonical() {
    const ordered = {
      generation_id: this.generation_id,
      watcher_event_id: this.watcher_event_id,
      watcher_type: this.watcher_type,
      event_type: this.event_type,
      mission_id: this.mission_id,
      mission_type: this.mission_type,
      mission_parameters: this.mission_parameters,
      priority: this.priority,
      required_capabilities: this.required_capabilities,
      status: this.status,
      generated_at: this.generated_at,
      error: this.error,
      runtime_id: this.runtime_id,
      authority: this.authority,
      authority_version: this.authority_version,
      constitutional_version: this.constitutional_version,
      generation_hash: this.generation_hash
    };
    return CanonicalBytes.serialize(ordered);
  }
  
  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      generation_id: this.generation_id,
      watcher_event_id: this.watcher_event_id,
      watcher_type: this.watcher_type,
      event_type: this.event_type,
      mission_id: this.mission_id,
      mission_type: this.mission_type,
      mission_parameters: this.mission_parameters,
      priority: this.priority,
      required_capabilities: this.required_capabilities,
      status: this.status,
      generated_at: this.generated_at,
      error: this.error,
      runtime_id: this.runtime_id,
      authority: this.authority,
      authority_version: this.authority_version,
      constitutional_version: this.constitutional_version,
      generation_hash: this.generation_hash,
      witness: this.witness
    };
  }
}

/**
 * Automatic Mission Generator
 *
 * Constitutional authority for watcher-driven mission creation.
 */
class AutomaticMissionGenerator {
  constructor(eventRepository, missionAuthority, triggerAuthority, runtimeIdentity = null) {
    this._eventRepository = eventRepository;
    this._missionAuthority = missionAuthority;
    this._triggerAuthority = triggerAuthority;
    this._runtimeIdentity = runtimeIdentity;
    this._authorityId = this._generateAuthorityId();
    this._authorityVersion = '36.0.0';
    this._generations = new Map();
    this._rules = MissionGenerationRules;
  }
  
  /**
   * Register mission generation rule
   * @param {string} eventType - Watcher event type
   * @param {Object} rule - Generation rule
   */
  registerRule(eventType, rule) {
    this._rules[eventType] = rule;
  }
  
  /**
   * Process watcher event and generate mission
   * @param {Object} watcherEvent - Watcher event
   * @returns {MissionGeneration} Generation result
   */
  async processWatcherEvent(watcherEvent) {
    const rule = this._rules[watcherEvent.event_type];
    
    if (!rule) {
      console.log(`No mission generation rule for event type: ${watcherEvent.event_type}`);
      return null;
    }
    
    const generationId = this._generateGenerationId(watcherEvent.event_id, watcherEvent.event_type);
    const runtimeId = this._runtimeIdentity?.getRuntimeID() || 'unknown';
    
    // Extract mission parameters from watcher event payload
    const missionParameters = rule.extract_parameters(watcherEvent.payload);
    
    const generationData = {
      generation_id: generationId,
      watcher_event_id: watcherEvent.event_id,
      watcher_type: watcherEvent.watcher_type,
      event_type: watcherEvent.event_type,
      mission_type: rule.mission_type,
      mission_parameters: missionParameters,
      priority: rule.priority,
      required_capabilities: rule.required_capabilities,
      runtime_id: runtimeId,
      generated_at: constitutionalTimeAuthority.nowAsMillis(),
      status: 'pending'
    };
    
    const generation = new MissionGeneration(generationData);
    this._generations.set(generationId, generation);
    
    // Emit GenerationStarted event
    this._emitGenerationStarted(generation);
    
    try {
      // Create mission
      const mission = this._missionAuthority.createMission(
        rule.mission_type,
        this._generateMissionIntent(rule.mission_type, missionParameters),
        {
          priority: rule.priority,
          constraints: missionParameters,
          dependencies: [],
          required_capabilities: rule.required_capabilities,
          execution_policy: 'sequential',
          timeout: 3600000,
          retry_policy: { max_retries: 3, backoff: 'exponential' },
          replay_policy: { enabled: true, verify: true },
          created_by: 'AutomaticMissionGenerator'
        }
      );
      
      // Complete generation
      generation.complete(mission.mission_id);
      
      // Emit GenerationCompleted event
      this._emitGenerationCompleted(generation);
      
      return generation;
    } catch (error) {
      // Fail generation
      generation.fail(error);
      
      // Emit GenerationFailed event
      this._emitGenerationFailed(generation);
      
      return generation;
    }
  }
  
  /**
   * Get generation
   * @param {string} generationId - Generation ID
   * @returns {MissionGeneration} Generation
   */
  getGeneration(generationId) {
    return this._generations.get(generationId);
  }
  
  /**
   * Get all generations
   * @returns {Array<MissionGeneration>} All generations
   */
  getAllGenerations() {
    return Array.from(this._generations.values());
  }
  
  /**
   * Get generations by status
   * @param {string} status - Generation status
   * @returns {Array<MissionGeneration>} Generations with status
   */
  getGenerationsByStatus(status) {
    return this.getAllGenerations().filter(g => g.status === status);
  }
  
  /**
   * Get generations by watcher type
   * @param {string} watcherType - Watcher type
   * @returns {Array<MissionGeneration>} Generations from watcher type
   */
  getGenerationsByWatcherType(watcherType) {
    return this.getAllGenerations().filter(g => g.watcher_type === watcherType);
  }
  
  /**
   * Get generations by event type
   * @param {string} eventType - Event type
   * @returns {Array<MissionGeneration>} Generations from event type
   */
  getGenerationsByEventType(eventType) {
    return this.getAllGenerations().filter(g => g.event_type === eventType);
  }
  
  /**
   * Get generation count
   * @returns {number} Generation count
   */
  getGenerationCount() {
    return this._generations.size;
  }
  
  /**
   * Verify generation determinism
   * @param {MissionGeneration} generation1 - First generation
   * @param {MissionGeneration} generation2 - Second generation
   * @returns {boolean} Whether generations are equivalent
   */
  verifyGenerationEquivalence(generation1, generation2) {
    return generation1.generation_hash === generation2.generation_hash;
  }
  
  /**
   * Replay generation from event log
   * @param {string} generationId - Generation ID
   * @returns {MissionGeneration} Replayed generation
   */
  async replayGeneration(generationId) {
    // Get generation events from event repository
    const events = await this._eventRepository.getEvents(generationId);
    
    // Reconstruct generation from events
    let generation = null;
    for (const event of events) {
      if (event.event_type === 'GenerationStarted') {
        generation = new MissionGeneration(event.payload);
      } else if (event.event_type === 'GenerationCompleted') {
        generation.complete(event.payload.mission_id);
      } else if (event.event_type === 'GenerationFailed') {
        generation.fail(new Error(event.payload.error.message));
      }
    }
    
    return generation;
  }
  
  /**
   * Generate mission intent
   */
  _generateMissionIntent(missionType, parameters) {
    const intentTemplates = {
      [MissionTypes.DEPENDENCY_UPGRADE]: `Upgrade dependency ${parameters.dependency_name} from ${parameters.current_version} to resolve ${parameters.cve_id || 'available update'}`,
      [MissionTypes.REFACTOR]: `Refactor ${parameters.schema_name} schema to handle ${parameters.change_type}`,
      [MissionTypes.BUG_FIX]: `Fix ${parameters.failure_reason || parameters.violation_type || parameters.divergence_reason}`,
      [MissionTypes.PERFORMANCE_OPTIMIZATION]: `Optimize ${parameters.metric_name || parameters.bottleneck_type} performance`,
      [MissionTypes.SECURITY_AUDIT]: `Audit and fix ${parameters.vulnerability_type || 'security vulnerability'}`,
      [MissionTypes.HOTFIX]: `Deploy hotfix for ${parameters.breach_type}`,
      [MissionTypes.INFRASTRUCTURE_PROVISION]: `Provision infrastructure for ${parameters.infrastructure_type || parameters.cost_type || parameters.budget_type}`
    };
    
    return intentTemplates[missionType] || `Execute ${missionType}`;
  }
  
  /**
   * Generate generation ID
   */
  _generateGenerationId(watcherEventId, eventType) {
    return identityAuthority.generateId('mission_generation', {
      watcher_event_id: watcherEventId,
      event_type: eventType,
      timestamp: constitutionalTimeAuthority.nowAsMillis()
    });
  }
  
  /**
   * Generate authority ID
   */
  _generateAuthorityId() {
    const authorityData = {
      authority_version: this._authorityVersion,
      constitutional_version: '36.0.0'
    };
    const hash = CanonicalAuthority.hash(authorityData);
    return `automatic_mission_generator_${hash.substring(0, 16)}`;
  }
  
  /**
   * Emit GenerationStarted event
   */
  _emitGenerationStarted(generation) {
    const event = {
      event_id: identityAuthority.generateEventId('GenerationStarted', generation.generation_id),
      event_type: 'GenerationStarted',
      aggregate_id: generation.generation_id,
      aggregate_type: 'MissionGeneration',
      aggregate_version: 1,
      sequence: 1,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'AutomaticMissionGenerator',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: generation.toJSON(),
      causation_id: generation.watcher_event_id,
      correlation_id: generation.generation_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit GenerationCompleted event
   */
  _emitGenerationCompleted(generation) {
    const event = {
      event_id: identityAuthority.generateEventId('GenerationCompleted', generation.generation_id),
      event_type: 'GenerationCompleted',
      aggregate_id: generation.generation_id,
      aggregate_type: 'MissionGeneration',
      aggregate_version: 1,
      sequence: 2,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'AutomaticMissionGenerator',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        generation_id: generation.generation_id,
        mission_id: generation.mission_id,
        completed_at: constitutionalTimeAuthority.nowAsMillis()
      },
      causation_id: generation.generation_id,
      correlation_id: generation.mission_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit GenerationFailed event
   */
  _emitGenerationFailed(generation) {
    const event = {
      event_id: identityAuthority.generateEventId('GenerationFailed', generation.generation_id),
      event_type: 'GenerationFailed',
      aggregate_id: generation.generation_id,
      aggregate_type: 'MissionGeneration',
      aggregate_version: 1,
      sequence: 2,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'AutomaticMissionGenerator',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        generation_id: generation.generation_id,
        error: generation.error,
        failed_at: constitutionalTimeAuthority.nowAsMillis()
      },
      causation_id: generation.generation_id,
      correlation_id: generation.generation_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
}

// Singleton instance
let automaticMissionGenerator = null;

function getAutomaticMissionGenerator(eventRepository, missionAuthority, triggerAuthority, runtimeIdentity = null) {
  if (!automaticMissionGenerator) {
    automaticMissionGenerator = new AutomaticMissionGenerator(eventRepository, missionAuthority, triggerAuthority, runtimeIdentity);
  }
  return automaticMissionGenerator;
}

module.exports = {
  AutomaticMissionGenerator,
  MissionGeneration,
  MissionGenerationRules,
  automaticMissionGenerator,
  getAutomaticMissionGenerator
};

