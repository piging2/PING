/**
 * Capability Scheduler
 *
 * Phase 36C — Autonomous Engineering Fabric
 *
 * Constitutional authority for capability-based scheduling.
 *
 * Instead of scheduling workflows, schedule capabilities.
 *
 * Mission requires capabilities:
 * - ReadRepository
 * - WriteRepository
 * - ExecuteTests
 * - RunOllama
 * - OpenPR
 * - DeployPreview
 *
 * Scheduler resolves:
 * Available Agent + Capability → Assignment
 *
 * Constitutional Constraint:
 * - Scheduling is capability-based, not workflow-based
 * - Agents are interchangeable capability providers
 * - Scheduling decisions are constitutional
 * - Scheduling lifecycle is event-sourced
 *
 * DELIBERATELY UNANCHORED (2026-09-19, EventRepository caller-adaptation
 * lane): the four _emitAssignment* sites below write to EventRepository with
 * repository-local evt_-style ids and no canonical acceptance proof, so
 * EventRepository.appendEvent fails closed with UnanchoredCanonicalWriteError
 * (EVENT_REPOSITORY_UNANCHORED_WRITE). This is intentional. These events
 * record internal operational lifecycle never accepted by the
 * UnifiedEventRuntime; anchoring them would require forging canonical
 * acceptance (registering legacy event types with the UER) or inventing
 * correlation ids that resolve to ping_events rows, both forbidden. The
 * module is currently unreachable at runtime (singleton getter never called,
 * required by nothing live). Owning lane decision required: route assignment
 * lifecycle through UER acceptance as canonical event types, or move these
 * records to an operational store outside the canonical journal. Do not
 * adapt these call sites locally.
 */

const { CanonicalAuthority, CanonicalBytes } = require('./canonical_authority');
const { constitutionalTimeAuthority } = require('./constitutional_time_authority');
const { identityAuthority } = require('./identity_authority');
const { witnessAuthority } = require('./witness_authority');
const { constitutionVersionAuthority } = require('./constitution_version_authority');

/**
 * Capability Types
 */
const CapabilityTypes = {
  READ_REPOSITORY: 'ReadRepository',
  WRITE_REPOSITORY: 'WriteRepository',
  EXECUTE_TESTS: 'ExecuteTests',
  RUN_OLLAMA: 'RunOllama',
  OPEN_PR: 'OpenPR',
  DEPLOY_PREVIEW: 'DeployPreview',
  CODE_GENERATION: 'CodeGeneration',
  CODE_REVIEW: 'CodeReview',
  SECURITY_AUDIT: 'SecurityAudit',
  PERFORMANCE_ANALYSIS: 'PerformanceAnalysis',
  DOCUMENTATION_GENERATION: 'DocumentationGeneration'
};

/**
 * Scheduling Priority
 */
const SchedulingPriority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Assignment Schema
 *
 * Constitutional assignment artifact.
 */
class Assignment {
  constructor(data) {
    this.assignment_id = data.assignment_id;
    this.mission_id = data.mission_id;
    this.agent_id = data.agent_id;
    this.capabilities = data.capabilities || [];
    this.priority = data.priority || SchedulingPriority.MEDIUM;
    this.status = data.status || 'pending';
    this.assigned_at = data.assigned_at || constitutionalTimeAuthority.nowAsMillis();
    this.started_at = data.started_at || null;
    this.completed_at = data.completed_at || null;
    this.result = data.result || null;
    this.error = data.error || null;
    
    // Constitutional metadata
    this.runtime_id = data.runtime_id;
    this.scheduled_by = data.scheduled_by || 'CapabilityScheduler';
    this.authority = 'CapabilityScheduler';
    this.authority_version = '36.0.0';
    this.constitutional_version = constitutionVersionAuthority.getCurrentVersions().constitutional_schema;
    
    // Constitutional hashes
    this.assignment_hash = this._computeAssignmentHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Compute assignment hash
   */
  _computeAssignmentHash() {
    const assignmentData = {
      assignment_id: this.assignment_id,
      mission_id: this.mission_id,
      agent_id: this.agent_id,
      capabilities: this.capabilities,
      priority: this.priority,
      runtime_id: this.runtime_id,
      assigned_at: this.assigned_at
    };
    return CanonicalAuthority.hash(assignmentData);
  }
  
  /**
   * Create witness
   */
  _createWitness() {
    const witnessData = {
      execution_id: this.assignment_id,
      input_hash: this.assignment_hash,
      output_hash: this.result ? CanonicalAuthority.hash(this.result) : null,
      authority: this.authority,
      node_id: this.assignment_id,
      success: this.status === 'completed',
      constitutional_version: this.constitutional_version
    };
    
    return witnessAuthority.createWitness(witnessData, {
      authority: this.authority,
      authority_version: this.authority_version
    });
  }
  
  /**
   * Start assignment
   */
  start() {
    this.status = 'in_progress';
    this.started_at = constitutionalTimeAuthority.nowAsMillis();
    this.assignment_hash = this._computeAssignmentHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Complete assignment
   */
  complete(result) {
    this.status = 'completed';
    this.completed_at = constitutionalTimeAuthority.nowAsMillis();
    this.result = result;
    this.assignment_hash = this._computeAssignmentHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Fail assignment
   */
  fail(error) {
    this.status = 'failed';
    this.completed_at = constitutionalTimeAuthority.nowAsMillis();
    this.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
    this.assignment_hash = this._computeAssignmentHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Serialize assignment to canonical bytes
   */
  toCanonical() {
    const ordered = {
      assignment_id: this.assignment_id,
      mission_id: this.mission_id,
      agent_id: this.agent_id,
      capabilities: this.capabilities,
      priority: this.priority,
      status: this.status,
      assigned_at: this.assigned_at,
      started_at: this.started_at,
      completed_at: this.completed_at,
      result: this.result,
      error: this.error,
      runtime_id: this.runtime_id,
      scheduled_by: this.scheduled_by,
      authority: this.authority,
      authority_version: this.authority_version,
      constitutional_version: this.constitutional_version,
      assignment_hash: this.assignment_hash
    };
    return CanonicalBytes.serialize(ordered);
  }
  
  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      assignment_id: this.assignment_id,
      mission_id: this.mission_id,
      agent_id: this.agent_id,
      capabilities: this.capabilities,
      priority: this.priority,
      status: this.status,
      assigned_at: this.assigned_at,
      started_at: this.started_at,
      completed_at: this.completed_at,
      result: this.result,
      error: this.error,
      runtime_id: this.runtime_id,
      scheduled_by: this.scheduled_by,
      authority: this.authority,
      authority_version: this.authority_version,
      constitutional_version: this.constitutional_version,
      assignment_hash: this.assignment_hash,
      witness: this.witness
    };
  }
}

/**
 * Capability Scheduler
 *
 * Constitutional authority for capability-based scheduling.
 */
class CapabilityScheduler {
  constructor(eventRepository, agentRegistry, missionQueue, runtimeIdentity = null) {
    this._eventRepository = eventRepository;
    this._agentRegistry = agentRegistry;
    this._missionQueue = missionQueue;
    this._runtimeIdentity = runtimeIdentity;
    // F7-B repair: version must be assigned before _generateAuthorityId() -
    // its preimage includes the version. The old lenient serializer
    // silently hashed an undefined version; the F7/D1 fail-closed
    // boundary exposed this latent bug.
    this._authorityVersion = '36.0.0';
    this._authorityId = this._generateAuthorityId();
    this._assignments = new Map();
  }
  
  /**
   * Schedule mission to agent
   * @param {string} missionId - Mission ID
   * @param {Array<string>} requiredCapabilities - Required capabilities
   * @param {Object} options - Scheduling options
   * @returns {Assignment} Created assignment
   */
  scheduleMission(missionId, requiredCapabilities, options = {}) {
    // Find available agents with required capabilities
    const availableAgents = this._agentRegistry.getAgentsByCapabilities(requiredCapabilities);
    const healthyAgents = availableAgents.filter(a => a.health === 'healthy');
    
    if (healthyAgents.length === 0) {
      throw new Error(`No healthy agents available with required capabilities: ${requiredCapabilities.join(', ')}`);
    }
    
    // Select agent (simple round-robin for now, can be enhanced with load balancing)
    const agent = this._selectAgent(healthyAgents, options);
    
    const assignmentId = this._generateAssignmentId(missionId, agent.agent_id, requiredCapabilities);
    const runtimeId = this._runtimeIdentity?.getRuntimeID() || 'unknown';
    
    const assignmentData = {
      assignment_id: assignmentId,
      mission_id: missionId,
      agent_id: agent.agent_id,
      capabilities: requiredCapabilities,
      priority: options.priority || SchedulingPriority.MEDIUM,
      status: 'pending',
      runtime_id: runtimeId,
      assigned_at: constitutionalTimeAuthority.nowAsMillis(),
      scheduled_by: options.scheduled_by || 'CapabilityScheduler'
    };
    
    const assignment = new Assignment(assignmentData);
    this._assignments.set(assignmentId, assignment);
    
    // Assign mission to agent
    this._agentRegistry.assignMissionToAgent(agent.agent_id, missionId);
    
    // Emit AssignmentCreated event
    this._emitAssignmentCreated(assignment);
    
    return assignment;
  }
  
  /**
   * Start assignment
   * @param {string} assignmentId - Assignment ID
   * @returns {Assignment} Started assignment
   */
  startAssignment(assignmentId) {
    const assignment = this._assignments.get(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }
    
    assignment.start();
    
    // Emit AssignmentStarted event
    this._emitAssignmentStarted(assignment);
    
    return assignment;
  }
  
  /**
   * Complete assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Object} result - Assignment result
   * @returns {Assignment} Completed assignment
   */
  completeAssignment(assignmentId, result) {
    const assignment = this._assignments.get(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }
    
    assignment.complete(result);
    
    // Complete mission for agent
    this._agentRegistry.completeMissionForAgent(assignment.agent_id, assignment.mission_id);
    
    // Emit AssignmentCompleted event
    this._emitAssignmentCompleted(assignment);
    
    return assignment;
  }
  
  /**
   * Fail assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Error} error - Assignment error
   * @returns {Assignment} Failed assignment
   */
  failAssignment(assignmentId, error) {
    const assignment = this._assignments.get(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }
    
    assignment.fail(error);
    
    // Complete mission for agent (even if failed)
    this._agentRegistry.completeMissionForAgent(assignment.agent_id, assignment.mission_id);
    
    // Emit AssignmentFailed event
    this._emitAssignmentFailed(assignment);
    
    return assignment;
  }
  
  /**
   * Get assignment
   * @param {string} assignmentId - Assignment ID
   * @returns {Assignment} Assignment
   */
  getAssignment(assignmentId) {
    return this._assignments.get(assignmentId);
  }
  
  /**
   * Get all assignments
   * @returns {Array<Assignment>} All assignments
   */
  getAllAssignments() {
    return Array.from(this._assignments.values());
  }
  
  /**
   * Get assignments by mission
   * @param {string} missionId - Mission ID
   * @returns {Array<Assignment>} Assignments for mission
   */
  getAssignmentsByMission(missionId) {
    return this.getAllAssignments().filter(a => a.mission_id === missionId);
  }
  
  /**
   * Get assignments by agent
   * @param {string} agentId - Agent ID
   * @returns {Array<Assignment>} Assignments for agent
   */
  getAssignmentsByAgent(agentId) {
    return this.getAllAssignments().filter(a => a.agent_id === agentId);
  }
  
  /**
   * Get assignments by status
   * @param {string} status - Assignment status
   * @returns {Array<Assignment>} Assignments with status
   */
  getAssignmentsByStatus(status) {
    return this.getAllAssignments().filter(a => a.status === status);
  }
  
  /**
   * Get pending assignments
   * @returns {Array<Assignment>} Pending assignments
   */
  getPendingAssignments() {
    return this.getAssignmentsByStatus('pending');
  }
  
  /**
   * Get in-progress assignments
   * @returns {Array<Assignment>} In-progress assignments
   */
  getInProgressAssignments() {
    return this.getAssignmentsByStatus('in_progress');
  }
  
  /**
   * Get completed assignments
   * @returns {Array<Assignment>} Completed assignments
   */
  getCompletedAssignments() {
    return this.getAssignmentsByStatus('completed');
  }
  
  /**
   * Get failed assignments
   * @returns {Array<Assignment>} Failed assignments
   */
  getFailedAssignments() {
    return this.getAssignmentsByStatus('failed');
  }
  
  /**
   * Get agent load
   * @param {string} agentId - Agent ID
   * @returns {number} Agent load (number of in-progress assignments)
   */
  getAgentLoad(agentId) {
    return this.getAssignmentsByAgent(agentId).filter(a => a.status === 'in_progress').length;
  }
  
  /**
   * Get assignment count
   * @returns {number} Assignment count
   */
  getAssignmentCount() {
    return this._assignments.size;
  }
  
  /**
   * Check if assignment exists
   * @param {string} assignmentId - Assignment ID
   * @returns {boolean} Assignment exists
   */
  hasAssignment(assignmentId) {
    return this._assignments.has(assignmentId);
  }
  
  /**
   * Verify assignment determinism
   * @param {Assignment} assignment1 - First assignment
   * @param {Assignment} assignment2 - Second assignment
   * @returns {boolean} Whether assignments are equivalent
   */
  verifyAssignmentEquivalence(assignment1, assignment2) {
    return assignment1.assignment_hash === assignment2.assignment_hash;
  }
  
  /**
   * Replay assignment from event log
   * @param {string} assignmentId - Assignment ID
   * @returns {Assignment} Replayed assignment
   */
  async replayAssignment(assignmentId) {
    // Get assignment events from event repository
    const events = await this._eventRepository.getEvents(assignmentId);
    
    // Reconstruct assignment from events
    let assignment = null;
    for (const event of events) {
      if (event.event_type === 'AssignmentCreated') {
        assignment = new Assignment(event.payload);
      } else if (event.event_type === 'AssignmentStarted') {
        assignment.start();
      } else if (event.event_type === 'AssignmentCompleted') {
        assignment.complete(event.payload.result);
      } else if (event.event_type === 'AssignmentFailed') {
        assignment.fail(new Error(event.payload.error.message));
      }
    }
    
    return assignment;
  }
  
  /**
   * Select agent from available agents
   * @param {Array<Agent>} agents - Available agents
   * @param {Object} options - Selection options
   * @returns {Agent} Selected agent
   */
  _selectAgent(agents, options = {}) {
    // Simple round-robin selection
    // Can be enhanced with:
    // - Load balancing
    // - Capability scoring
    // - Cost optimization
    // - Geographic proximity
    // - Historical performance
    
    if (options.preferred_agent_id) {
      const preferred = agents.find(a => a.agent_id === options.preferred_agent_id);
      if (preferred) {
        return preferred;
      }
    }
    
    // Select agent with lowest load
    const sortedAgents = [...agents].sort((a, b) => {
      const loadA = this.getAgentLoad(a.agent_id);
      const loadB = this.getAgentLoad(b.agent_id);
      return loadA - loadB;
    });
    
    return sortedAgents[0];
  }
  
  /**
   * Generate assignment ID
   */
  _generateAssignmentId(missionId, agentId, capabilities) {
    return identityAuthority.generateId('assignment', {
      mission_id: missionId,
      agent_id: agentId,
      capabilities_hash: CanonicalAuthority.hash(capabilities),
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
    return `capability_scheduler_${hash.substring(0, 16)}`;
  }
  
  /**
   * Emit AssignmentCreated event
   */
  _emitAssignmentCreated(assignment) {
    const event = {
      event_id: identityAuthority.generateEventId('AssignmentCreated', assignment.assignment_id),
      event_type: 'AssignmentCreated',
      aggregate_id: assignment.assignment_id,
      aggregate_type: 'Assignment',
      aggregate_version: 1,
      sequence: 1,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'CapabilityScheduler',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: assignment.toJSON(),
      causation_id: assignment.mission_id,
      correlation_id: assignment.assignment_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit AssignmentStarted event
   */
  _emitAssignmentStarted(assignment) {
    const event = {
      event_id: identityAuthority.generateEventId('AssignmentStarted', assignment.assignment_id),
      event_type: 'AssignmentStarted',
      aggregate_id: assignment.assignment_id,
      aggregate_type: 'Assignment',
      aggregate_version: 1,
      sequence: 2,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'CapabilityScheduler',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        assignment_id: assignment.assignment_id,
        started_at: assignment.started_at
      },
      causation_id: assignment.assignment_id,
      correlation_id: assignment.assignment_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit AssignmentCompleted event
   */
  _emitAssignmentCompleted(assignment) {
    const event = {
      event_id: identityAuthority.generateEventId('AssignmentCompleted', assignment.assignment_id),
      event_type: 'AssignmentCompleted',
      aggregate_id: assignment.assignment_id,
      aggregate_type: 'Assignment',
      aggregate_version: 1,
      sequence: 3,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'CapabilityScheduler',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        assignment_id: assignment.assignment_id,
        result: assignment.result,
        completed_at: assignment.completed_at
      },
      causation_id: assignment.assignment_id,
      correlation_id: assignment.assignment_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit AssignmentFailed event
   */
  _emitAssignmentFailed(assignment) {
    const event = {
      event_id: identityAuthority.generateEventId('AssignmentFailed', assignment.assignment_id),
      event_type: 'AssignmentFailed',
      aggregate_id: assignment.assignment_id,
      aggregate_type: 'Assignment',
      aggregate_version: 1,
      sequence: 3,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'CapabilityScheduler',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        assignment_id: assignment.assignment_id,
        error: assignment.error,
        completed_at: assignment.completed_at
      },
      causation_id: assignment.assignment_id,
      correlation_id: assignment.assignment_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
}

// Singleton instance
let capabilityScheduler = null;

function getCapabilityScheduler(eventRepository, agentRegistry, missionQueue, runtimeIdentity = null) {
  if (!capabilityScheduler) {
    capabilityScheduler = new CapabilityScheduler(eventRepository, agentRegistry, missionQueue, runtimeIdentity);
  }
  return capabilityScheduler;
}

module.exports = {
  CapabilityScheduler,
  Assignment,
  CapabilityTypes,
  SchedulingPriority,
  capabilityScheduler,
  getCapabilityScheduler
};
