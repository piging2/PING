/**
 * Distributed Desktop Agents
 *
 * Phase 36L — Autonomous Engineering Fabric
 *
 * Constitutional authority for uniform runtime identity across machines.
 *
 * Treat every machine identically:
 * Desktop
 * Laptop
 * Server
 * Cloud VM
 * Mac Mini
 * NAS
 * GPU Box
 *
 * All register as:
 * - RuntimeIdentity
 * - Capabilities
 * - Health
 * - Queue
 *
 * Mission scheduler doesn't care where work executes.
 *
 * Constitutional Constraint:
 * - All machines have uniform runtime identity
 * - All machines register as agents
 * - Scheduling is location-agnostic
 * - Agent lifecycle is constitutional
 *
 * DELIBERATELY UNANCHORED (2026-09-19, EventRepository caller-adaptation
 * lane): the five _emitMachine* sites below write to EventRepository with
 * repository-local evt_-style ids and no canonical acceptance proof, so
 * EventRepository.appendEvent fails closed with UnanchoredCanonicalWriteError
 * (EVENT_REPOSITORY_UNANCHORED_WRITE). This is intentional. These events
 * record internal operational lifecycle never accepted by the
 * UnifiedEventRuntime; anchoring them would require forging canonical
 * acceptance (registering legacy event types with the UER) or inventing
 * correlation ids that resolve to ping_events rows, both forbidden. The
 * module is currently unreachable at runtime (singleton getter never called,
 * required by nothing live). Owning lane decision required: route machine
 * lifecycle through UER acceptance as canonical event types, or move these
 * records to an operational store outside the canonical journal. Do not
 * adapt these call sites locally.
 */

const { CanonicalAuthority, CanonicalBytes } = require('../authorities/canonical_authority');
const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority');
const { identityAuthority } = require('../authorities/identity_authority');
const { witnessAuthority } = require('../../gateway/witness_authority');
const { constitutionVersionAuthority } = require('../../gateway/constitution_version_authority');

/**
 * Machine Types
 */
const MachineTypes = {
  DESKTOP: 'Desktop',
  LAPTOP: 'Laptop',
  SERVER: 'Server',
  CLOUD_VM: 'CloudVM',
  MAC_MINI: 'MacMini',
  NAS: 'NAS',
  GPU_BOX: 'GPUBox',
  UNKNOWN: 'Unknown'
};

/**
 * Machine Capabilities
 */
const MachineCapabilities = {
  CPU: 'CPU',
  GPU: 'GPU',
  MEMORY: 'Memory',
  STORAGE: 'Storage',
  NETWORK: 'Network',
  DOCKER: 'Docker',
  KUBERNETES: 'Kubernetes',
  LOCAL_EXECUTION: 'LocalExecution'
};

/**
 * Runtime Identity Schema
 *
 * Constitutional runtime identity artifact.
 */
class RuntimeIdentity {
  constructor(data) {
    this.runtime_id = data.runtime_id;
    this.machine_id = data.machine_id;
    this.machine_type = data.machine_type;
    this.hostname = data.hostname;
    this.platform = data.platform;
    this.architecture = data.architecture;
    this.os_version = data.os_version;
    this.node_version = data.node_version;
    this.capabilities = data.capabilities || [];
    this.resources = data.resources || {};
    this.location = data.location || 'local';
    this.health = data.health || 'healthy';
    this.registered_at = data.registered_at || constitutionalTimeAuthority.nowAsMillis();
    this.last_heartbeat = data.last_heartbeat || null;
    this.mission_count = data.mission_count || 0;
    this.queue_depth = data.queue_depth || 0;
    
    // Constitutional metadata
    this.authority = 'DistributedDesktopAgents';
    this.authority_version = '36.0.0';
    this.constitutional_version = constitutionVersionAuthority.getCurrentVersions().constitutional_schema;
    
    // Constitutional hashes
    this.identity_hash = this._computeIdentityHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Compute identity hash
   */
  _computeIdentityHash() {
    const identityData = {
      runtime_id: this.runtime_id,
      machine_id: this.machine_id,
      machine_type: this.machine_type,
      hostname: this.hostname,
      platform: this.platform,
      architecture: this.architecture,
      os_version: this.os_version,
      capabilities: this.capabilities,
      resources: this.resources,
      location: this.location,
      registered_at: this.registered_at
    };
    return CanonicalAuthority.hash(identityData);
  }
  
  /**
   * Create witness
   */
  _createWitness() {
    const witnessData = {
      execution_id: this.runtime_id,
      input_hash: this.identity_hash,
      output_hash: null,
      authority: this.authority,
      node_id: this.runtime_id,
      success: this.health === 'healthy',
      constitutional_version: this.constitutional_version
    };
    
    return witnessAuthority.createWitness(witnessData, {
      authority: this.authority,
      authority_version: this.authority_version
    });
  }
  
  /**
   * Update heartbeat
   */
  updateHeartbeat() {
    this.last_heartbeat = constitutionalTimeAuthority.nowAsMillis();
    this.identity_hash = this._computeIdentityHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Update health
   */
  updateHealth(health) {
    this.health = health;
    this.identity_hash = this._computeIdentityHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Update resources
   */
  updateResources(resources) {
    this.resources = { ...this.resources, ...resources };
    this.identity_hash = this._computeIdentityHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Increment mission count
   */
  incrementMissionCount() {
    this.mission_count++;
    this.identity_hash = this._computeIdentityHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Update queue depth
   */
  updateQueueDepth(depth) {
    this.queue_depth = depth;
    this.identity_hash = this._computeIdentityHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Serialize identity to canonical bytes
   */
  toCanonical() {
    const ordered = {
      runtime_id: this.runtime_id,
      machine_id: this.machine_id,
      machine_type: this.machine_type,
      hostname: this.hostname,
      platform: this.platform,
      architecture: this.architecture,
      os_version: this.os_version,
      node_version: this.node_version,
      capabilities: this.capabilities,
      resources: this.resources,
      location: this.location,
      health: this.health,
      registered_at: this.registered_at,
      last_heartbeat: this.last_heartbeat,
      mission_count: this.mission_count,
      queue_depth: this.queue_depth,
      authority: this.authority,
      authority_version: this.authority_version,
      constitutional_version: this.constitutional_version,
      identity_hash: this.identity_hash
    };
    return CanonicalBytes.serialize(ordered);
  }
  
  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      runtime_id: this.runtime_id,
      machine_id: this.machine_id,
      machine_type: this.machine_type,
      hostname: this.hostname,
      platform: this.platform,
      architecture: this.architecture,
      os_version: this.os_version,
      node_version: this.node_version,
      capabilities: this.capabilities,
      resources: this.resources,
      location: this.location,
      health: this.health,
      registered_at: this.registered_at,
      last_heartbeat: this.last_heartbeat,
      mission_count: this.mission_count,
      queue_depth: this.queue_depth,
      authority: this.authority,
      authority_version: this.authority_version,
      constitutional_version: this.constitutional_version,
      identity_hash: this.identity_hash,
      witness: this.witness
    };
  }
}

/**
 * Distributed Desktop Agents
 *
 * Constitutional authority for distributed agent management.
 */
class DistributedDesktopAgents {
  constructor(eventRepository, agentRegistry, runtimeIdentity = null) {
    this._eventRepository = eventRepository;
    this._agentRegistry = agentRegistry;
    this._runtimeIdentity = runtimeIdentity;
    // F7-B repair: version must be assigned before _generateAuthorityId() -
    // its preimage includes the version. The old lenient serializer
    // silently hashed an undefined version; the F7/D1 fail-closed
    // boundary exposed this latent bug.
    this._authorityVersion = '36.0.0';
    this._authorityId = this._generateAuthorityId();
    this._runtimeIdentities = new Map();
  }
  
  /**
   * Register machine runtime
   * @param {Object} machineInfo - Machine information
   * @returns {RuntimeIdentity} Registered runtime identity
   */
  registerMachine(machineInfo) {
    const runtimeId = this._generateRuntimeId(machineInfo);
    const machineId = this._generateMachineId(machineInfo);
    
    const identityData = {
      runtime_id: runtimeId,
      machine_id: machineId,
      machine_type: machineInfo.machine_type || MachineTypes.UNKNOWN,
      hostname: machineInfo.hostname || 'unknown',
      platform: machineInfo.platform || 'unknown',
      architecture: machineInfo.architecture || 'unknown',
      os_version: machineInfo.os_version || 'unknown',
      node_version: machineInfo.node_version || 'unknown',
      capabilities: machineInfo.capabilities || [],
      resources: machineInfo.resources || {},
      location: machineInfo.location || 'local',
      health: 'healthy',
      registered_at: constitutionalTimeAuthority.nowAsMillis()
    };
    
    const identity = new RuntimeIdentity(identityData);
    this._runtimeIdentities.set(runtimeId, identity);
    
    // Register as agent in agent registry
    this._agentRegistry.registerAgent(
      'CodeGeneration',
      identity.capabilities,
      identity
    );
    
    // Emit MachineRegistered event
    this._emitMachineRegistered(identity);
    
    return identity;
  }
  
  /**
   * Unregister machine runtime
   * @param {string} runtimeId - Runtime ID
   * @returns {RuntimeIdentity} Unregistered runtime identity
   */
  unregisterMachine(runtimeId) {
    const identity = this._runtimeIdentities.get(runtimeId);
    if (!identity) {
      throw new Error(`Runtime identity not found: ${runtimeId}`);
    }
    
    identity.health = 'offline';
    
    // Unregister from agent registry
    this._agentRegistry.unregisterAgent(runtimeId);
    
    // Emit MachineUnregistered event
    this._emitMachineUnregistered(identity);
    
    this._runtimeIdentities.delete(runtimeId);
    
    return identity;
  }
  
  /**
   * Update machine heartbeat
   * @param {string} runtimeId - Runtime ID
   * @returns {RuntimeIdentity} Updated runtime identity
   */
  updateMachineHeartbeat(runtimeId) {
    const identity = this._runtimeIdentities.get(runtimeId);
    if (!identity) {
      throw new Error(`Runtime identity not found: ${runtimeId}`);
    }
    
    identity.updateHeartbeat();
    
    // Update agent heartbeat
    this._agentRegistry.updateHeartbeat(runtimeId);
    
    // Emit MachineHeartbeat event
    this._emitMachineHeartbeat(identity);
    
    return identity;
  }
  
  /**
   * Update machine health
   * @param {string} runtimeId - Runtime ID
   * @param {string} health - Health status
   * @returns {RuntimeIdentity} Updated runtime identity
   */
  updateMachineHealth(runtimeId, health) {
    const identity = this._runtimeIdentities.get(runtimeId);
    if (!identity) {
      throw new Error(`Runtime identity not found: ${runtimeId}`);
    }
    
    identity.updateHealth(health);
    
    // Update agent health
    this._agentRegistry.updateAgentHealth(runtimeId, health);
    
    // Emit MachineHealthUpdated event
    this._emitMachineHealthUpdated(identity);
    
    return identity;
  }
  
  /**
   * Update machine resources
   * @param {string} runtimeId - Runtime ID
   * @param {Object} resources - Resource metrics
   * @returns {RuntimeIdentity} Updated runtime identity
   */
  updateMachineResources(runtimeId, resources) {
    const identity = this._runtimeIdentities.get(runtimeId);
    if (!identity) {
      throw new Error(`Runtime identity not found: ${runtimeId}`);
    }
    
    identity.updateResources(resources);
    
    // Update agent load
    this._agentRegistry.updateAgentLoad(runtimeId, {
      cpu: resources.cpu_usage || 0,
      memory: resources.memory_usage || 0,
      queue: identity.queue_depth
    });
    
    // Emit MachineResourcesUpdated event
    this._emitMachineResourcesUpdated(identity);
    
    return identity;
  }
  
  /**
   * Get runtime identity
   * @param {string} runtimeId - Runtime ID
   * @returns {RuntimeIdentity} Runtime identity
   */
  getRuntimeIdentity(runtimeId) {
    return this._runtimeIdentities.get(runtimeId);
  }
  
  /**
   * Get all runtime identities
   * @returns {Array<RuntimeIdentity>} All runtime identities
   */
  getAllRuntimeIdentities() {
    return Array.from(this._runtimeIdentities.values());
  }
  
  /**
   * Get runtime identities by machine type
   * @param {string} machineType - Machine type
   * @returns {Array<RuntimeIdentity>} Runtime identities of type
   */
  getRuntimeIdentitiesByType(machineType) {
    return this.getAllRuntimeIdentities().filter(i => i.machine_type === machineType);
  }
  
  /**
   * Get runtime identities by location
   * @param {string} location - Location
   * @returns {Array<RuntimeIdentity>} Runtime identities at location
   */
  getRuntimeIdentitiesByLocation(location) {
    return this.getAllRuntimeIdentities().filter(i => i.location === location);
  }
  
  /**
   * Get runtime identities by health
   * @param {string} health - Health status
   * @returns {Array<RuntimeIdentity>} Runtime identities with health
   */
  getRuntimeIdentitiesByHealth(health) {
    return this.getAllRuntimeIdentities().filter(i => i.health === health);
  }
  
  /**
   * Get runtime identities by capability
   * @param {string} capability - Required capability
   * @returns {Array<RuntimeIdentity>} Runtime identities with capability
   */
  getRuntimeIdentitiesByCapability(capability) {
    return this.getAllRuntimeIdentities().filter(i => i.capabilities.includes(capability));
  }
  
  /**
   * Get healthy runtime identities
   * @returns {Array<RuntimeIdentity>} Healthy runtime identities
   */
  getHealthyRuntimeIdentities() {
    return this.getRuntimeIdentitiesByHealth('healthy');
  }
  
  /**
   * Get offline runtime identities
   * @returns {Array<RuntimeIdentity>} Offline runtime identities
   */
  getOfflineRuntimeIdentities() {
    return this.getRuntimeIdentitiesByHealth('offline');
  }
  
  /**
   * Get runtime identity count
   * @returns {number} Runtime identity count
   */
  getRuntimeIdentityCount() {
    return this._runtimeIdentities.size;
  }
  
  /**
   * Check if runtime identity exists
   * @param {string} runtimeId - Runtime ID
   * @returns {boolean} Runtime identity exists
   */
  hasRuntimeIdentity(runtimeId) {
    return this._runtimeIdentities.has(runtimeId);
  }
  
  /**
   * Verify runtime identity determinism
   * @param {RuntimeIdentity} identity1 - First identity
   * @param {RuntimeIdentity} identity2 - Second identity
   * @returns {boolean} Whether identities are equivalent
   */
  verifyIdentityEquivalence(identity1, identity2) {
    return identity1.identity_hash === identity2.identity_hash;
  }
  
  /**
   * Replay runtime identity from event log
   * @param {string} runtimeId - Runtime ID
   * @returns {RuntimeIdentity} Replayed runtime identity
   */
  async replayRuntimeIdentity(runtimeId) {
    // Get runtime identity events from event repository
    const events = await this._eventRepository.getEvents(runtimeId);
    
    // Reconstruct runtime identity from events
    let identity = null;
    for (const event of events) {
      if (event.event_type === 'MachineRegistered') {
        identity = new RuntimeIdentity(event.payload);
      } else if (event.event_type === 'MachineHeartbeat') {
        identity.updateHeartbeat();
      } else if (event.event_type === 'MachineHealthUpdated') {
        identity.updateHealth(event.payload.health);
      } else if (event.event_type === 'MachineResourcesUpdated') {
        identity.updateResources(event.payload.resources);
      } else if (event.event_type === 'MachineUnregistered') {
        identity.health = 'offline';
      }
    }
    
    return identity;
  }
  
  /**
   * Generate runtime ID
   */
  _generateRuntimeId(machineInfo) {
    return identityAuthority.generateId('runtime', {
      machine_type: machineInfo.machine_type,
      hostname: machineInfo.hostname,
      platform: machineInfo.platform,
      architecture: machineInfo.architecture,
      os_version: machineInfo.os_version,
      timestamp: constitutionalTimeAuthority.nowAsMillis()
    });
  }
  
  /**
   * Generate machine ID
   */
  _generateMachineId(machineInfo) {
    return identityAuthority.generateId('machine', {
      hostname: machineInfo.hostname,
      platform: machineInfo.platform,
      architecture: machineInfo.architecture,
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
    return `distributed_desktop_agents_${hash.substring(0, 16)}`;
  }
  
  /**
   * Emit MachineRegistered event
   */
  _emitMachineRegistered(identity) {
    const event = {
      event_id: identityAuthority.generateEventId('MachineRegistered', identity.runtime_id),
      event_type: 'MachineRegistered',
      aggregate_id: identity.runtime_id,
      aggregate_type: 'RuntimeIdentity',
      aggregate_version: 1,
      sequence: 1,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'DistributedDesktopAgents',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: identity.toJSON(),
      causation_id: null,
      correlation_id: identity.runtime_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit MachineUnregistered event
   */
  _emitMachineUnregistered(identity) {
    const event = {
      event_id: identityAuthority.generateEventId('MachineUnregistered', identity.runtime_id),
      event_type: 'MachineUnregistered',
      aggregate_id: identity.runtime_id,
      aggregate_type: 'RuntimeIdentity',
      aggregate_version: 1,
      sequence: 2,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'DistributedDesktopAgents',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        runtime_id: identity.runtime_id,
        unregistered_at: constitutionalTimeAuthority.nowAsMillis()
      },
      causation_id: identity.runtime_id,
      correlation_id: identity.runtime_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit MachineHeartbeat event
   */
  _emitMachineHeartbeat(identity) {
    const event = {
      event_id: identityAuthority.generateEventId('MachineHeartbeat', identity.runtime_id),
      event_type: 'MachineHeartbeat',
      aggregate_id: identity.runtime_id,
      aggregate_type: 'RuntimeIdentity',
      aggregate_version: 1,
      sequence: 3,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'DistributedDesktopAgents',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        runtime_id: identity.runtime_id,
        heartbeat: identity.last_heartbeat
      },
      causation_id: identity.runtime_id,
      correlation_id: identity.runtime_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit MachineHealthUpdated event
   */
  _emitMachineHealthUpdated(identity) {
    const event = {
      event_id: identityAuthority.generateEventId('MachineHealthUpdated', identity.runtime_id),
      event_type: 'MachineHealthUpdated',
      aggregate_id: identity.runtime_id,
      aggregate_type: 'RuntimeIdentity',
      aggregate_version: 1,
      sequence: 4,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'DistributedDesktopAgents',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        runtime_id: identity.runtime_id,
        health: identity.health
      },
      causation_id: identity.runtime_id,
      correlation_id: identity.runtime_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit MachineResourcesUpdated event
   */
  _emitMachineResourcesUpdated(identity) {
    const event = {
      event_id: identityAuthority.generateEventId('MachineResourcesUpdated', identity.runtime_id),
      event_type: 'MachineResourcesUpdated',
      aggregate_id: identity.runtime_id,
      aggregate_type: 'RuntimeIdentity',
      aggregate_version: 1,
      sequence: 5,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'DistributedDesktopAgents',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        runtime_id: identity.runtime_id,
        resources: identity.resources
      },
      causation_id: identity.runtime_id,
      correlation_id: identity.runtime_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
}

// Singleton instance
let distributedDesktopAgents = null;

function getDistributedDesktopAgents(eventRepository, agentRegistry, runtimeIdentity = null) {
  if (!distributedDesktopAgents) {
    distributedDesktopAgents = new DistributedDesktopAgents(eventRepository, agentRegistry, runtimeIdentity);
  }
  return distributedDesktopAgents;
}

module.exports = {
  DistributedDesktopAgents,
  RuntimeIdentity,
  MachineTypes,
  MachineCapabilities,
  distributedDesktopAgents,
  getDistributedDesktopAgents
};
