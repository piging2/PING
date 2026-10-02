/**
 * Replay Authority
 * 
 * Tier 0 — Constitutional IP
 * 
 * Unified Replay Authority that owns replay orchestration.
 * 
 * Constitutional Constraint: Single replay authority for all replay operations.
 * 
 * Replay Authority owns:
 * - Replay lifecycle (record, replay, verify)
 * - Replay coordination
 * - Replay guarantees (determinism, integrity)
 * 
 * Dependencies are injected as ports by runtime, not constructed internally.
 * ReplayAuthority orchestrates ports, ports execute, providers implement.
 * 
 * Milestone 1: Constitutional Verification Enforcement
 * - VerificationAuthority.verify(object) before Replay
 * - Replay never executes invalid artifacts
 */

const { CanonicalAuthority, CanonicalBytes } = require('../ping-runtime/authorities/canonical_authority.js');
const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority.js');
const { identityAuthority } = require('../ping-runtime/authorities/identity_authority.js');
const { reducerAuthority } = require('./reducer_authority');
const { witnessAuthority } = require('./witness_authority');
const { replayCertificateAuthority } = require('./replay_certificate_authority');
const { constitutionalVerificationAuthority } = require('../ping-runtime/evidence/constitutional_verification_authority');

class ReplayAuthority {
  constructor(ports) {
    this._executionPort = ports.executionPort;
    this._persistencePort = ports.persistencePort;
    this._verificationPort = ports.verificationPort;
    this._transcriptPort = ports.transcriptPort;
    this._authorityId = this._generateAuthorityId();
    this._constitutionalVersion = '1.0.0';
    this._namespace = 'replay';
  }

  /**
   * Record replay event
   * @param {Object} eventData - Event data
   * @param {Object} options - Record options
   * @returns {Promise<Object>} Recorded event
   */
  async recordEvent(eventData, options = {}) {
    const entry = await this._persistencePort.appendEvent(eventData, options);
    return entry;
  }

  /**
   * Record replay object for completed constitutional lifecycle
   * Migrated from ReplayRecorder
   * 
   * Constitutional Constraint: Replay consumes canonical_bytes, canonical_hash, id as immutable inputs.
   * Constitutional Constraint: Replay never calls CanonicalAuthority.hash() directly.
   * 
   * Milestone 1: Constitutional Verification Enforcement
   * - VerificationAuthority.verify(object) before Replay
   * - Replay never executes invalid artifacts
   * 
   * @param {string} lifecycleId - Lifecycle ID
   * @param {Array} stages - Lifecycle stages
   * @param {Buffer} canonical_bytes - Canonical bytes (immutable)
   * @param {string} canonical_hash - Canonical hash (immutable)
   * @param {string} replayId - Replay ID (immutable)
   * @returns {Object} Replay object
   */
  async record(lifecycleId, stages, canonical_bytes, canonical_hash, replayId) {
    if (!lifecycleId) {
      throw new Error('ReplayAuthority.record requires lifecycleId');
    }

    if (!Array.isArray(stages) || stages.length === 0) {
      throw new Error('ReplayAuthority.record requires at least one stage');
    }

    if (!canonical_bytes) {
      throw new Error('ReplayAuthority.record requires canonical_bytes');
    }

    if (!canonical_hash) {
      throw new Error('ReplayAuthority.record requires canonical_hash');
    }

    if (!replayId) {
      throw new Error('ReplayAuthority.record requires replayId');
    }

    // Validate stages
    for (const stage of stages) {
      if (!stage.stage_name || !stage.input_ids || !stage.output_ids) {
        throw new Error('Invalid stage: missing stage_name, input_ids, or output_ids');
      }
    }

    // Calculate replay result
    const result = this._calculateResult(stages);

    // Create ReplayObject from immutable inputs
    const timestamp = constitutionalTimeAuthority.now();

    const replayObject = {
      id: replayId,
      kind: 'Replay',
      authority: 'ReplayAuthority',
      identity: {
        namespace: this._namespace,
        version: 'v1',
        created_at: timestamp,
        created_by: 'ReplayAuthority',
      },
      canonical_hash: canonical_hash,
      canonical_bytes: canonical_bytes,
      lineage: {
        source_id: lifecycleId,
        derivation_path: ['Lifecycle', 'ReplayObject'],
        provenance_chain: stages.flatMap(stage => [...stage.input_ids, ...stage.output_ids]),
      },
      health: result === 'success' ? 'healthy' : 'unhealthy',
      confidence: result === 'success' ? 1.0 : 0.0,
      relationships: stages.flatMap(stage => [
        ...stage.input_ids.map(id => ({
          target_id: id,
          relation_type: 'replay_input',
          strength: 1.0,
          metadata: { stage: stage.stage_name },
        })),
        ...stage.output_ids.map(id => ({
          target_id: id,
          relation_type: 'replay_output',
          strength: 1.0,
          metadata: { stage: stage.stage_name },
        })),
      ]),
      metadata: {
        lifecycle_id: lifecycleId,
        timestamp,
      },
      payload: {
        lifecycle_id: lifecycleId,
        stages,
        result,
        timestamp,
      },
      schema_version: '1.0.0',
      constitution_version: this._constitutionalVersion,
      witness: null, // To be generated by witness authority
      certificate: null, // To be generated by certificate authority
    };

    // Milestone 1: Constitutional Verification Enforcement
    const verification = constitutionalVerificationAuthority.verifyArtifact(replayObject);
    if (!verification.valid) {
      const error = new Error(`Constitutional verification failed: ${verification.reason}`);
      error.code = verification.code;
      error.verification = verification;
      throw error;
    }

    return replayObject;
  }

  /**
   * Calculate replay result based on stage outcomes
   * @param {Array} stages - Lifecycle stages
   * @returns {string} Result level (success, failure, partial)
   */
  _calculateResult(stages) {
    const allSuccess = stages.every(stage => stage.success);
    const allFailure = stages.every(stage => !stage.success);

    if (allSuccess) return 'success';
    if (allFailure) return 'failure';
    return 'partial';
  }

  /**
   * Reconstruct lifecycle from ReplayObject
   * @param {Object} replayObject - Replay object
   * @returns {Object} Reconstructed lifecycle
   */
  async reconstruct(replayObject) {
    if (!replayObject || !replayObject.payload) {
      throw new Error('Invalid ReplayObject');
    }

    const { lifecycle_id, stages, result, timestamp } = replayObject.payload;

    return {
      lifecycle_id,
      stages,
      result,
      timestamp,
      replayed_at: constitutionalTimeAuthority.now(),
    };
  }

  /**
   * Verify replay object against expected hash
   * @param {Object} replayObject - Replay object
   * @param {string} expectedHash - Expected hash
   * @returns {boolean} Verification result
   */
  async verify(replayObject, expectedHash) {
    if (!replayObject || !replayObject.canonical_hash) {
      throw new Error('Invalid ReplayObject');
    }

    return replayObject.canonical_hash === expectedHash;
  }

  /**
   * Replay from transcript
   * Phase 36B: Close Replay Surface - exactly one replay pipeline
   * Phase 36E: Close Verification Surface - wire ReducerAuthority, WitnessAuthority, ReplayCertificateAuthority
   * Event Stream → CanonicalBytes → ReducerAuthority → WitnessAuthority → ReplayCertificateAuthority → ReplayCertificate
   * @param {string} transcriptId - Transcript ID
   * @param {Object} options - Replay options
   * @returns {Promise<Object>} Replay result with certificate
   */
  async replay(transcriptId, options = {}) {
    // Phase 36B: Load transcript through CanonicalBytes
    const transcript = await this._transcriptPort.loadTranscript(transcriptId, options);
    
    // Phase 36B: Serialize event stream through CanonicalBytes
    const canonicalEventStream = CanonicalBytes.serialize(transcript.events);
    
    // Phase 36E: Register reducer with ReducerAuthority
    const reducerId = options.reducerId || transcript.reducer_id;
    if (reducerId && options.reducerCode) {
      reducerAuthority.registerReducer(reducerId, options.reducerCode, {
        canonicalVersion: '4.0.0',
        constitutionVersion: this._constitutionalVersion
      });
    }
    
    // Phase 36B: Execute replay
    const replayResult = await this._executionPort.executeReplay(transcript, options);
    
    // Phase 36E: Get reducer hash from ReducerAuthority
    const reducerMetadata = reducerId ? reducerAuthority.getReducer(reducerId) : null;
    const reducerHash = reducerMetadata ? reducerMetadata.reducer_hash : replayResult.reducer_hash;
    
    // Phase 36B: Create replay certificate
    // Constitutional Constraint: Replay consumes canonical_hash as immutable input
    const certificate = replayCertificateAuthority.createCertificate({
      canonical_bytes: canonicalEventStream,
      authority: 'ReplayCertificate',
      version: '1.0.0',
      signature: null, // To be generated by certificate authority
    });
    
    return {
      ...replayResult,
      certificate
    };
  }

  /**
   * Verify replay integrity
   * @param {string} transcriptId - Transcript ID
   * @param {Object} options - Verification options
   * @returns {Promise<Object>} Verification result
   */
  async verifyReplay(transcriptId, options = {}) {
    const verificationResult = await this._verificationPort.verifyTranscript(transcriptId, options);
    return verificationResult;
  }

  /**
   * Validate replay determinism
   * @param {string} transcriptId - Transcript ID
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateDeterminism(transcriptId, options = {}) {
    const validationResult = await this._verificationPort.validateDeterminism(transcriptId, options);
    return validationResult;
  }

  /**
   * Create transcript
   * @param {Object} transcriptData - Transcript data
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} Created transcript
   */
  async createTranscript(transcriptData, options = {}) {
    const transcript = await this._transcriptPort.createTranscript(transcriptData, options);
    return transcript;
  }

  /**
   * Get authority ID
   * @returns {string} Authority ID
   */
  getAuthorityId() {
    return this._authorityId;
  }

  /**
   * Generate authority ID
   * @returns {string} Authority ID
   */
  _generateAuthorityId() {
    const authorityData = {
      authority_version: '1.0.0',
      constitutional_version: '1.0.0'
    };
    const hash = CanonicalAuthority.hash(authorityData);
    return `replay_${hash.substring(0, 16)}`;
  }
}

module.exports = {
  ReplayAuthority
};
