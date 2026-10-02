/**
 * Agent Memory Authority
 *
 * Phase 36F — Autonomous Engineering Fabric
 *
 * Constitutional authority for multi-tier agent memory.
 *
 * Memory Types:
 * - Working Memory: Short-term, mission-specific
 * - Long-Term Memory: Persistent, cross-mission
 * - Execution Memory: Execution trace, steps taken
 * - Architectural Memory: System architecture, patterns
 * - Failure Memory: Error patterns, recovery strategies
 *
 * Constitutional Constraint:
 * - Memory is event-sourced
 * - Memory operations are constitutional
 * - Memory lifecycle is replayable
 * - Memory is content-addressed
 *
 * DELIBERATELY UNANCHORED (2026-09-19, EventRepository caller-adaptation
 * lane): the five _emitMemory* sites below write to EventRepository with
 * repository-local evt_-style ids and no canonical acceptance proof, so
 * EventRepository.appendEvent fails closed with UnanchoredCanonicalWriteError
 * (EVENT_REPOSITORY_UNANCHORED_WRITE). This is intentional. These events
 * record internal operational lifecycle never accepted by the
 * UnifiedEventRuntime; anchoring them would require forging canonical
 * acceptance (registering legacy event types with the UER) or inventing
 * correlation ids that resolve to ping_events rows, both forbidden. The
 * module is currently unreachable at runtime (singleton getter never called,
 * required by nothing live). Owning lane decision required: route memory
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
 * Memory Types
 */
const MemoryTypes = {
  WORKING: 'WorkingMemory',
  LONG_TERM: 'LongTermMemory',
  EXECUTION: 'ExecutionMemory',
  ARCHITECTURAL: 'ArchitecturalMemory',
  FAILURE: 'FailureMemory'
};

/**
 * Memory Schema
 *
 * Constitutional memory artifact.
 */
class Memory {
  constructor(data) {
    this.memory_id = data.memory_id;
    this.agent_id = data.agent_id;
    this.memory_type = data.memory_type;
    this.content = data.content || {};
    this.metadata = data.metadata || {};
    this.tags = data.tags || [];
    this.related_memories = data.related_memories || [];
    this.ttl = data.ttl || null;
    this.access_count = data.access_count || 0;
    this.last_accessed = data.last_accessed || null;
    
    // Constitutional metadata
    this.runtime_id = data.runtime_id;
    this.created_at = data.created_at || constitutionalTimeAuthority.nowAsMillis();
    this.created_by = data.created_by || 'AgentMemoryAuthority';
    this.authority = 'AgentMemoryAuthority';
    this.authority_version = '36.0.0';
    this.constitutional_version = constitutionVersionAuthority.getCurrentVersions().constitutional_schema;
    
    // State
    this.status = data.status || 'active';
    this.expired_at = data.expired_at || null;
    
    // Constitutional hashes
    this.memory_hash = this._computeMemoryHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Compute memory hash
   */
  _computeMemoryHash() {
    const memoryData = {
      memory_id: this.memory_id,
      agent_id: this.agent_id,
      memory_type: this.memory_type,
      content: this.content,
      tags: this.tags,
      runtime_id: this.runtime_id,
      created_at: this.created_at
    };
    return CanonicalAuthority.hash(memoryData);
  }
  
  /**
   * Create witness
   */
  _createWitness() {
    const witnessData = {
      execution_id: this.memory_id,
      input_hash: this.memory_hash,
      output_hash: null,
      authority: this.authority,
      node_id: this.memory_id,
      success: this.status === 'active',
      constitutional_version: this.constitutional_version
    };
    
    return witnessAuthority.createWitness(witnessData, {
      authority: this.authority,
      authority_version: this.authority_version
    });
  }
  
  /**
   * Access memory
   */
  access() {
    this.access_count++;
    this.last_accessed = constitutionalTimeAuthority.nowAsMillis();
    this.memory_hash = this._computeMemoryHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Update content
   */
  updateContent(newContent) {
    this.content = { ...this.content, ...newContent };
    this.memory_hash = this._computeMemoryHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Add tag
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.memory_hash = this._computeMemoryHash();
      this.witness = this._createWitness();
    }
  }
  
  /**
   * Remove tag
   */
  removeTag(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    this.memory_hash = this._computeMemoryHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Add related memory
   */
  addRelatedMemory(memoryId) {
    if (!this.related_memories.includes(memoryId)) {
      this.related_memories.push(memoryId);
      this.memory_hash = this._computeMemoryHash();
      this.witness = this._createWitness();
    }
  }
  
  /**
   * Expire memory
   */
  expire() {
    this.status = 'expired';
    this.expired_at = constitutionalTimeAuthority.nowAsMillis();
    this.memory_hash = this._computeMemoryHash();
    this.witness = this._createWitness();
  }
  
  /**
   * Serialize memory to canonical bytes
   */
  toCanonical() {
    const ordered = {
      memory_id: this.memory_id,
      agent_id: this.agent_id,
      memory_type: this.memory_type,
      content: this.content,
      metadata: this.metadata,
      tags: this.tags,
      related_memories: this.related_memories,
      ttl: this.ttl,
      access_count: this.access_count,
      last_accessed: this.last_accessed,
      runtime_id: this.runtime_id,
      created_at: this.created_at,
      created_by: this.created_by,
      authority: this.authority,
      authority_version: this.authority_version,
      constitutional_version: this.constitutional_version,
      status: this.status,
      expired_at: this.expired_at,
      memory_hash: this.memory_hash
    };
    return CanonicalBytes.serialize(ordered);
  }
  
  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      memory_id: this.memory_id,
      agent_id: this.agent_id,
      memory_type: this.memory_type,
      content: this.content,
      metadata: this.metadata,
      tags: this.tags,
      related_memories: this.related_memories,
      ttl: this.ttl,
      access_count: this.access_count,
      last_accessed: this.last_accessed,
      runtime_id: this.runtime_id,
      created_at: this.created_at,
      created_by: this.created_by,
      authority: this.authority,
      authority_version: this.authority_version,
      constitutional_version: this.constitutional_version,
      status: this.status,
      expired_at: this.expired_at,
      memory_hash: this.memory_hash,
      witness: this.witness
    };
  }
}

/**
 * Agent Memory Authority
 *
 * Constitutional authority for multi-tier agent memory.
 */
class AgentMemoryAuthority {
  constructor(eventRepository, runtimeIdentity = null) {
    this._eventRepository = eventRepository;
    this._runtimeIdentity = runtimeIdentity;
    // F7-B repair: version must be assigned before _generateAuthorityId() -
    // its preimage includes the version. The old lenient serializer
    // silently hashed an undefined version; the F7/D1 fail-closed
    // boundary exposed this latent bug.
    this._authorityVersion = '36.0.0';
    this._authorityId = this._generateAuthorityId();
    this._memories = new Map();
    this._agentMemories = new Map(); // agent_id -> Set(memory_id)
  }
  
  /**
   * Create memory
   * @param {string} agentId - Agent ID
   * @param {string} memoryType - Memory type
   * @param {Object} content - Memory content
   * @param {Object} options - Memory options
   * @returns {Memory} Created memory
   */
  createMemory(agentId, memoryType, content, options = {}) {
    const memoryId = this._generateMemoryId(agentId, memoryType, content);
    const runtimeId = this._runtimeIdentity?.getRuntimeID() || 'unknown';
    
    const memoryData = {
      memory_id: memoryId,
      agent_id: agentId,
      memory_type: memoryType,
      content: content,
      metadata: options.metadata || {},
      tags: options.tags || [],
      related_memories: options.related_memories || [],
      ttl: options.ttl || this._getDefaultTTL(memoryType),
      runtime_id: runtimeId,
      created_at: constitutionalTimeAuthority.nowAsMillis(),
      created_by: options.created_by || 'AgentMemoryAuthority',
      status: 'active'
    };
    
    const memory = new Memory(memoryData);
    this._memories.set(memoryId, memory);
    
    // Add to agent memories
    if (!this._agentMemories.has(agentId)) {
      this._agentMemories.set(agentId, new Set());
    }
    this._agentMemories.get(agentId).add(memoryId);
    
    // Emit MemoryCreated event
    this._emitMemoryCreated(memory);
    
    return memory;
  }
  
  /**
   * Get memory
   * @param {string} memoryId - Memory ID
   * @returns {Memory} Memory
   */
  getMemory(memoryId) {
    const memory = this._memories.get(memoryId);
    if (memory) {
      memory.access();
      this._emitMemoryAccessed(memory);
    }
    return memory;
  }
  
  /**
   * Update memory
   * @param {string} memoryId - Memory ID
   * @param {Object} newContent - New content
   * @returns {Memory} Updated memory
   */
  updateMemory(memoryId, newContent) {
    const memory = this._memories.get(memoryId);
    if (!memory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }
    
    memory.updateContent(newContent);
    
    // Emit MemoryUpdated event
    this._emitMemoryUpdated(memory);
    
    return memory;
  }
  
  /**
   * Delete memory
   * @param {string} memoryId - Memory ID
   * @returns {Memory} Deleted memory
   */
  deleteMemory(memoryId) {
    const memory = this._memories.get(memoryId);
    if (!memory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }
    
    memory.status = 'deleted';
    memory.expired_at = constitutionalTimeAuthority.nowAsMillis();
    
    // Remove from agent memories
    const agentMemories = this._agentMemories.get(memory.agent_id);
    if (agentMemories) {
      agentMemories.delete(memoryId);
    }
    
    // Emit MemoryDeleted event
    this._emitMemoryDeleted(memory);
    
    this._memories.delete(memoryId);
    
    return memory;
  }
  
  /**
   * Get memories by agent
   * @param {string} agentId - Agent ID
   * @returns {Array<Memory>} Agent memories
   */
  getMemoriesByAgent(agentId) {
    const agentMemoryIds = this._agentMemories.get(agentId);
    if (!agentMemoryIds) {
      return [];
    }
    
    return Array.from(agentMemoryIds)
      .map(memoryId => this._memories.get(memoryId))
      .filter(memory => memory && memory.status === 'active');
  }
  
  /**
   * Get memories by type
   * @param {string} memoryType - Memory type
   * @returns {Array<Memory>} Memories of type
   */
  getMemoriesByType(memoryType) {
    return Array.from(this._memories.values())
      .filter(memory => memory.memory_type === memoryType && memory.status === 'active');
  }
  
  /**
   * Get memories by tag
   * @param {string} tag - Memory tag
   * @returns {Array<Memory>} Memories with tag
   */
  getMemoriesByTag(tag) {
    return Array.from(this._memories.values())
      .filter(memory => memory.tags.includes(tag) && memory.status === 'active');
  }
  
  /**
   * Get working memory for agent
   * @param {string} agentId - Agent ID
   * @returns {Array<Memory>} Working memories
   */
  getWorkingMemory(agentId) {
    return this.getMemoriesByAgent(agentId)
      .filter(memory => memory.memory_type === MemoryTypes.WORKING);
  }
  
  /**
   * Get long-term memory for agent
   * @param {string} agentId - Agent ID
   * @returns {Array<Memory>} Long-term memories
   */
  getLongTermMemory(agentId) {
    return this.getMemoriesByAgent(agentId)
      .filter(memory => memory.memory_type === MemoryTypes.LONG_TERM);
  }
  
  /**
   * Get execution memory for agent
   * @param {string} agentId - Agent ID
   * @returns {Array<Memory>} Execution memories
   */
  getExecutionMemory(agentId) {
    return this.getMemoriesByAgent(agentId)
      .filter(memory => memory.memory_type === MemoryTypes.EXECUTION);
  }
  
  /**
   * Get architectural memory
   * @returns {Array<Memory>} Architectural memories
   */
  getArchitecturalMemory() {
    return this.getMemoriesByType(MemoryTypes.ARCHITECTURAL);
  }
  
  /**
   * Get failure memory
   * @returns {Array<Memory>} Failure memories
   */
  getFailureMemory() {
    return this.getMemoriesByType(MemoryTypes.FAILURE);
  }
  
  /**
   * Search memories
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @returns {Array<Memory>} Matching memories
   */
  searchMemories(query, filters = {}) {
    let memories = Array.from(this._memories.values())
      .filter(memory => memory.status === 'active');
    
    // Filter by agent
    if (filters.agent_id) {
      memories = memories.filter(memory => memory.agent_id === filters.agent_id);
    }
    
    // Filter by type
    if (filters.memory_type) {
      memories = memories.filter(memory => memory.memory_type === filters.memory_type);
    }
    
    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      memories = memories.filter(memory => 
        filters.tags.some(tag => memory.tags.includes(tag))
      );
    }
    
    // Search content
    if (query) {
      const queryLower = query.toLowerCase();
      memories = memories.filter(memory => {
        const contentStr = JSON.stringify(memory.content).toLowerCase();
        return contentStr.includes(queryLower);
      });
    }
    
    return memories;
  }
  
  /**
   * Expire old memories
   */
  expireOldMemories() {
    const now = constitutionalTimeAuthority.nowAsMillis();
    
    for (const [memoryId, memory] of this._memories.entries()) {
      if (memory.status === 'active' && memory.ttl) {
        const age = now - memory.created_at;
        if (age > memory.ttl) {
          memory.expire();
          this._emitMemoryExpired(memory);
        }
      }
    }
  }
  
  /**
   * Clear agent memories
   * @param {string} agentId - Agent ID
   */
  clearAgentMemories(agentId) {
    const agentMemoryIds = this._agentMemories.get(agentId);
    if (!agentMemoryIds) {
      return;
    }
    
    for (const memoryId of agentMemoryIds) {
      const memory = this._memories.get(memoryId);
      if (memory) {
        this.deleteMemory(memoryId);
      }
    }
    
    this._agentMemories.delete(agentId);
  }
  
  /**
   * Get memory count
   * @returns {number} Memory count
   */
  getMemoryCount() {
    return this._memories.size;
  }
  
  /**
   * Get agent memory count
   * @param {string} agentId - Agent ID
   * @returns {number} Agent memory count
   */
  getAgentMemoryCount(agentId) {
    const agentMemoryIds = this._agentMemories.get(agentId);
    return agentMemoryIds ? agentMemoryIds.size : 0;
  }
  
  /**
   * Verify memory determinism
   * @param {Memory} memory1 - First memory
   * @param {Memory} memory2 - Second memory
   * @returns {boolean} Whether memories are equivalent
   */
  verifyMemoryEquivalence(memory1, memory2) {
    return memory1.memory_hash === memory2.memory_hash;
  }
  
  /**
   * Replay memory from event log
   * @param {string} memoryId - Memory ID
   * @returns {Memory} Replayed memory
   */
  async replayMemory(memoryId) {
    // Get memory events from event repository
    const events = await this._eventRepository.getEvents(memoryId);
    
    // Reconstruct memory from events
    let memory = null;
    for (const event of events) {
      if (event.event_type === 'MemoryCreated') {
        memory = new Memory(event.payload);
      } else if (event.event_type === 'MemoryUpdated') {
        memory.updateContent(event.payload.new_content);
      } else if (event.event_type === 'MemoryDeleted') {
        memory.status = 'deleted';
        memory.expired_at = event.payload.expired_at;
      }
    }
    
    return memory;
  }
  
  /**
   * Get default TTL for memory type
   */
  _getDefaultTTL(memoryType) {
    const ttlMap = {
      [MemoryTypes.WORKING]: 3600000, // 1 hour
      [MemoryTypes.LONG_TERM]: null, // Never expire
      [MemoryTypes.EXECUTION]: 86400000, // 1 day
      [MemoryTypes.ARCHITECTURAL]: null, // Never expire
      [MemoryTypes.FAILURE]: 604800000 // 7 days
    };
    
    return ttlMap[memoryType] || null;
  }
  
  /**
   * Generate memory ID
   */
  _generateMemoryId(agentId, memoryType, content) {
    return identityAuthority.generateId('memory', {
      agent_id: agentId,
      memory_type: memoryType,
      content_hash: CanonicalAuthority.hash(content),
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
    return `agent_memory_authority_${hash.substring(0, 16)}`;
  }
  
  /**
   * Emit MemoryCreated event
   */
  _emitMemoryCreated(memory) {
    const event = {
      event_id: identityAuthority.generateEventId('MemoryCreated', memory.memory_id),
      event_type: 'MemoryCreated',
      aggregate_id: memory.memory_id,
      aggregate_type: 'Memory',
      aggregate_version: 1,
      sequence: 1,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'AgentMemoryAuthority',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: memory.toJSON(),
      causation_id: null,
      correlation_id: memory.memory_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit MemoryAccessed event
   */
  _emitMemoryAccessed(memory) {
    const event = {
      event_id: identityAuthority.generateEventId('MemoryAccessed', memory.memory_id),
      event_type: 'MemoryAccessed',
      aggregate_id: memory.memory_id,
      aggregate_type: 'Memory',
      aggregate_version: 1,
      sequence: 2,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'AgentMemoryAuthority',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        memory_id: memory.memory_id,
        access_count: memory.access_count,
        last_accessed: memory.last_accessed
      },
      causation_id: memory.memory_id,
      correlation_id: memory.memory_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit MemoryUpdated event
   */
  _emitMemoryUpdated(memory) {
    const event = {
      event_id: identityAuthority.generateEventId('MemoryUpdated', memory.memory_id),
      event_type: 'MemoryUpdated',
      aggregate_id: memory.memory_id,
      aggregate_type: 'Memory',
      aggregate_version: 1,
      sequence: 3,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'AgentMemoryAuthority',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        memory_id: memory.memory_id,
        new_content: memory.content,
        updated_at: constitutionalTimeAuthority.nowAsMillis()
      },
      causation_id: memory.memory_id,
      correlation_id: memory.memory_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit MemoryDeleted event
   */
  _emitMemoryDeleted(memory) {
    const event = {
      event_id: identityAuthority.generateEventId('MemoryDeleted', memory.memory_id),
      event_type: 'MemoryDeleted',
      aggregate_id: memory.memory_id,
      aggregate_type: 'Memory',
      aggregate_version: 1,
      sequence: 4,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'AgentMemoryAuthority',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        memory_id: memory.memory_id,
        expired_at: memory.expired_at
      },
      causation_id: memory.memory_id,
      correlation_id: memory.memory_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
  
  /**
   * Emit MemoryExpired event
   */
  _emitMemoryExpired(memory) {
    const event = {
      event_id: identityAuthority.generateEventId('MemoryExpired', memory.memory_id),
      event_type: 'MemoryExpired',
      aggregate_id: memory.memory_id,
      aggregate_type: 'Memory',
      aggregate_version: 1,
      sequence: 5,
      timestamp: constitutionalTimeAuthority.nowAsMillis(),
      authority: 'AgentMemoryAuthority',
      authority_version: this._authorityVersion,
      payload_version: 1,
      payload: {
        memory_id: memory.memory_id,
        expired_at: memory.expired_at
      },
      causation_id: memory.memory_id,
      correlation_id: memory.memory_id
    };
    
    if (this._eventRepository) {
      this._eventRepository.appendEvent(event);
    }
  }
}

// Singleton instance
let agentMemoryAuthority = null;

function getAgentMemoryAuthority(eventRepository, runtimeIdentity = null) {
  if (!agentMemoryAuthority) {
    agentMemoryAuthority = new AgentMemoryAuthority(eventRepository, runtimeIdentity);
  }
  return agentMemoryAuthority;
}

module.exports = {
  AgentMemoryAuthority,
  Memory,
  MemoryTypes,
  agentMemoryAuthority,
  getAgentMemoryAuthority
};
