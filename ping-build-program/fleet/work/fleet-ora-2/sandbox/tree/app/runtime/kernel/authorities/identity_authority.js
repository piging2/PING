const { CanonicalAuthority, CanonicalBytes } = require('./canonical_authority');

/**
 * Identity Authority
 * 
 * Architectural Recommendation — Centralized Identity Authority
 * 
 * Every authority currently generates IDs independently:
 * - FailureAuthority
 * - ToolGateway
 * - StreamingAuthority
 * - InferenceWitness
 * - RuntimeAuthority
 * 
 * Each has _generateXXXId() which may drift over time.
 * 
 * Instead:
 * 
 * IdentityAuthority
 *   ↓
 * canonical identity schema
 *   ↓
 * canonical hash
 *   ↓
 * ID
 * 
 * Every authority asks it for IDs.
 * This guarantees one constitutional identity law for the entire runtime.
 */

class IdentityAuthority {
  constructor() {
    // Removed serializer reference - use CanonicalAuthority directly
    this._authorityId = this._generateAuthorityId();
    this._identityVersion = '1.0.0';
  }

  /**
   * Generate ID from canonical hash (single source of truth)
   * 
   * Constitutional Constraint: All ID generation must flow through this method.
   * This ensures every object ID originates from the same constitutional authority.
   * 
   * Pattern:
   * Structured Object → CanonicalBytes.serialize() → CanonicalAuthority.hashBytes() → IdentityAuthority.generateFromCanonicalHash()
   * 
   * @param {Buffer} canonicalBytes - Canonical bytes from CanonicalBytes.serialize()
   * @param {string} type - Object type (e.g., 'repository', 'commit', 'witness')
   * @returns {string} Constitutional ID
   */
  generateFromCanonicalHash(canonicalBytes, type) {
    if (!Buffer.isBuffer(canonicalBytes)) {
      throw new Error('generateFromCanonicalHash() requires canonical bytes from CanonicalBytes.serialize()');
    }
    
    const hash = CanonicalAuthority.hashBytes(canonicalBytes);
    return `${type}_${hash.substring(0, 16)}`;
  }

  /**
   * Generate constitutional ID
   * @param {string} type - Identity type (e.g., 'failure', 'tool', 'stream', 'inference', 'execution')
   * @param {Object} identityData - Constitutional identity data
   * @returns {string} Constitutional ID
   */
  generateId(type, identityData) {
    const canonicalData = {
      type: type,
      version: this._identityVersion,
      identity_version: this._identityVersion,
      ...identityData
    };
    
    const canonicalBytes = CanonicalBytes.serialize(canonicalData);
    return this.generateFromCanonicalHash(canonicalBytes, type);
  }

  /**
   * Generate failure ID
   * @param {string} failureCode - Failure code
   * @param {string} replayPhase - Replay phase
   * @param {string} replayId - Replay ID (optional)
   * @param {string} executionId - Execution ID (optional)
   * @returns {string} Failure ID
   */
  generateFailureId(failureCode, replayPhase, replayId = null, executionId = null) {
    return this.generateId('failure', {
      failure_code: failureCode,
      replay_phase: replayPhase,
      replay_id: replayId,
      execution_id: executionId
    });
  }

  /**
   * Generate tool ID
   * @param {string} toolName - Tool name
   * @returns {string} Tool ID
   */
  generateToolId(toolName) {
    return this.generateId('tool', {
      tool_name: toolName
    });
  }

  /**
   * Generate tool execution ID
   * @param {string} toolId - Tool ID
   * @param {Object} parameters - Tool parameters
   * @param {string} replayId - Replay ID
   * @param {string} runtimeContextId - Runtime context ID
   * @returns {string} Execution ID
   */
  generateToolExecutionId(toolId, parameters, replayId, runtimeContextId) {
    const parametersHash = CanonicalAuthority.hash(parameters);
    return this.generateId('tool_exec', {
      tool_id: toolId,
      parameters_hash: parametersHash,
      replay_id: replayId,
      runtime_context_id: runtimeContextId
    });
  }

  /**
   * Generate symbol ID
   * @param {string} canonicalName - Symbol canonical name
   * @param {string} language - Symbol language
   * @param {string} kind - Symbol kind
   * @param {string} signature - Symbol signature
   * @returns {string} Symbol ID
   */
  generateSymbolId(canonicalName, language, kind, signature) {
    return this.generateId('symbol', {
      canonical_name: canonicalName,
      language: language,
      kind: kind,
      signature: signature
    });
  }

  /**
   * Generate constitutional identity envelope
   * @param {string} identityId - Identity ID
   * @param {string} version - Version string
   * @returns {Object} Constitutional identity envelope
   */
  generateIdentityEnvelope(identityId = null, version = '1.0.0') {
    const { constitutionalTimeAuthority } = require('./constitutional_time_authority');
    return {
      identity_id: identityId || this.generateId('identity', { timestamp: constitutionalTimeAuthority.now() }),
      created_at: new Date(constitutionalTimeAuthority.now()).toISOString(),
      version: version,
    };
  }

  /**
   * Generate stream ID
   * @param {string} modelDigest - Model digest
   * @param {string} promptHash - Prompt hash
   * @returns {string} Stream ID
   */
  generateStreamId(modelDigest, promptHash) {
    return this.generateId('stream', {
      model_digest: modelDigest,
      prompt_hash: promptHash
    });
  }

  /**
   * Generate chunk ID
   * @param {string} streamId - Stream ID
   * @param {number} chunkIndex - Chunk index
   * @returns {string} Chunk ID
   */
  generateChunkId(streamId, chunkIndex) {
    return this.generateId('chunk', {
      stream_id: streamId,
      chunk_index: chunkIndex
    });
  }

  /**
   * Generate inference ID
   * @param {string} promptHash - Prompt hash
   * @param {string} modelDigest - Model digest
   * @param {Object} options - Generation options
   * @param {string} replayId - Replay ID
   * @returns {string} Inference ID
   */
  generateInferenceId(promptHash, modelDigest, options, replayId) {
    return this.generateId('inference', {
      prompt_hash: promptHash,
      model_digest: modelDigest,
      options: options,
      replay_id: replayId
    });
  }

  /**
   * Generate prompt ID
   * @param {string} canonicalBytes - Canonical prompt bytes
   * @returns {string} Prompt ID
   */
  generatePromptId(canonicalBytes) {
    return this.generateId('prompt', {
      canonical_bytes_hash: CanonicalAuthority.hash(canonicalBytes)
    });
  }

  /**
   * Generate execution ID
   * @param {string} runtimeId - Runtime ID
   * @param {number} executionCount - Execution count
   * @returns {string} Execution ID
   */
  generateExecutionId(runtimeId, executionCount) {
    return this.generateId('exec', {
      runtime_id: runtimeId,
      execution_count: executionCount
    });
  }

  /**
   * Generate runtime ID
   * @param {string} runtimeVersion - Runtime version
   * @param {string} constitutionalVersion - Constitutional version
   * @returns {string} Runtime ID
   */
  generateRuntimeId(runtimeVersion, constitutionalVersion) {
    return this.generateId('runtime', {
      runtime_version: runtimeVersion,
      constitutional_version: constitutionalVersion
    });
  }

  /**
   * Generate object ID (for repository objects)
   * @param {string} kind - Object kind
   * @param {Object} data - Object data
   * @returns {string} Object ID
   */
  generateObjectId(kind, data) {
    return this.generateId('repository', { kind, data });
  }

  /**
   * Generate snapshot ID
   * @param {string} objectId - Object ID
   * @param {number} version - Version number
   * @returns {string} Snapshot ID
   */
  generateSnapshotId(objectId, version) {
    return this.generateId('snap', { object_id: objectId, version });
  }

  /**
   * Generate event ID
   * @param {string} eventType - Event type
   * @param {string} aggregateId - Aggregate ID
   * @returns {string} Event ID
   */
  generateEventId(eventType, aggregateId) {
    return this.generateId('evt', { event_type: eventType, aggregate_id: aggregateId });
  }

  /**
   * Generate worker ID
   * @param {string} workerType - Worker type
   * @returns {string} Worker ID
   */
  generateWorkerId(workerType) {
    return this.generateId('worker', { type: workerType });
  }

  /**
   * Generate outbox ID
   * @param {string} eventType - Event type
   * @returns {string} Outbox ID
   */
  generateOutboxId(eventType) {
    return this.generateId('outbox', { event_type: eventType });
  }

  /**
   * Generate dead letter ID
   * @param {string} jobId - Original job ID
   * @returns {string} Dead letter ID
   */
  generateDeadLetterId(jobId) {
    return this.generateId('dl', { original_job_id: jobId });
  }

  /**
   * Get authority ID
   * @returns {string} Authority ID
   */
  getAuthorityId() {
    return this._authorityId;
  }

  /**
   * Get identity version
   * @returns {string} Identity version
   */
  getIdentityVersion() {
    return this._identityVersion;
  }

  /**
   * Generate authority ID
   * @returns {string} Authority ID
   */
  _generateAuthorityId() {
    const authorityData = {
      identity_version: this._identityVersion,
      constitutional_version: '4.0.0'
    };
    const hash = CanonicalAuthority.hash(authorityData);
    return `identity_${hash.substring(0, 16)}`;
  }
}

// Singleton instance
const identityAuthority = new IdentityAuthority();

module.exports = { IdentityAuthority, identityAuthority };
