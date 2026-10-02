const { CanonicalAuthority, CanonicalBytes } = require('../ping-runtime/authorities/canonical_authority.js');
const { runtimeFailureAuthority } = require('./runtime_failure_authority');
const { witnessAuthority } = require('./witness_authority');
const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority.js');

/**
 * Replay Verifier
 * 
 * Phase 5.1 — Replay Verifier
 * 
 * CRX's Constitutional Judge
 * 
 * Consumes witnesses and verifies constitutional determinism:
 * 
 * Replay Transcript
 *   ↓
 * reconstruct execution
 *   ↓
 * verify
 *   ↓
 * prompt witness
 *   ↓
 * model witness
 *   ↓
 * stream witness
 *   ↓
 * tool witness
 *   ↓
 * completion witness
 *   ↓
 * state witness
 *   ↓
 * PASS / FAIL
 */

class ReplayVerifier {
  constructor() {
    // Removed serializer reference - use CanonicalAuthority directly
    this._failureAuthority = runtimeFailureAuthority;
    this._witnessAuthority = witnessAuthority;
    this._verifierId = this._generateVerifierId();
    this._verifierVersion = '5.0.0';
  }

  /**
   * Verify replay transcript
   * @param {Object} transcript - Replay transcript
   * @returns {Object} Verification result
   */
  verifyReplay(transcript) {
    const verification = {
      transcript_id: transcript.transcript_id,
      transcript_hash: transcript.transcript_hash,
      verifier_id: this._verifierId,
      verifier_version: this._verifierVersion,
      timestamp: constitutionalTimeAuthority.now(),
      results: {
        runtime: null,
        prompt: null,
        model: null,
        streaming: null,
        tools: null,
        completion: null,
        state: null
      },
      overall: {
        valid: true,
        reason: null
      }
    };

    // Verify runtime witness
    verification.results.runtime = this._verifyRuntimeWitness(transcript.runtime);
    if (!verification.results.runtime.valid) {
      verification.overall.valid = false;
      verification.overall.reason = 'Runtime witness verification failed';
      return verification;
    }

    // Verify prompt witness
    verification.results.prompt = this._verifyPromptWitness(transcript.prompt);
    if (!verification.results.prompt.valid) {
      verification.overall.valid = false;
      verification.overall.reason = 'Prompt witness verification failed';
      return verification;
    }

    // Verify model witness
    verification.results.model = this._verifyModelWitness(transcript.model);
    if (!verification.results.model.valid) {
      verification.overall.valid = false;
      verification.overall.reason = 'Model witness verification failed';
      return verification;
    }

    // Verify streaming witness
    verification.results.streaming = this._verifyStreamingWitness(transcript.streaming);
    if (!verification.results.streaming.valid) {
      verification.overall.valid = false;
      verification.overall.reason = 'Streaming witness verification failed';
      return verification;
    }

    // Verify tool witnesses
    verification.results.tools = this._verifyToolWitnesses(transcript.tools);
    if (!verification.results.tools.valid) {
      verification.overall.valid = false;
      verification.overall.reason = 'Tool witness verification failed';
      return verification;
    }

    // Verify completion witness
    verification.results.completion = this._verifyCompletionWitness(transcript.completion);
    if (!verification.results.completion.valid) {
      verification.overall.valid = false;
      verification.overall.reason = 'Completion witness verification failed';
      return verification;
    }

    // Verify state witness
    verification.results.state = this._verifyStateWitness(transcript.state);
    if (!verification.results.state.valid) {
      verification.overall.valid = false;
      verification.overall.reason = 'State witness verification failed';
      return verification;
    }

    // Verify transcript hash
    const transcriptVerification = this._verifyTranscriptHash(transcript);
    if (!transcriptVerification.valid) {
      verification.overall.valid = false;
      verification.overall.reason = 'Transcript hash verification failed';
      return verification;
    }

    verification.overall.valid = true;
    verification.overall.reason = 'All witnesses verified successfully';

    return verification;
  }

  /**
   * Verify runtime witness
   * @param {Object} runtimeWitness - Runtime witness
   * @returns {Object} Verification result
   */
  _verifyRuntimeWitness(runtimeWitness) {
    if (!runtimeWitness) {
      return {
        valid: false,
        reason: 'Runtime witness missing'
      };
    }

    // Use WitnessAuthority to verify
    const witnessVerification = this._witnessAuthority.verifyWitness(runtimeWitness);
    if (!witnessVerification.valid) {
      return witnessVerification;
    }

    return {
      valid: true,
      reason: 'Runtime witness verified'
    };
  }

  /**
   * Verify prompt witness
   * @param {Object} promptWitness - Prompt witness
   * @returns {Object} Verification result
   */
  _verifyPromptWitness(promptWitness) {
    if (!promptWitness) {
      return {
        valid: false,
        reason: 'Prompt witness missing'
      };
    }

    // Use WitnessAuthority to verify
    const witnessVerification = this._witnessAuthority.verifyWitness(promptWitness);
    if (!witnessVerification.valid) {
      return witnessVerification;
    }

    return {
      valid: true,
      reason: 'Prompt witness verified'
    };
  }

  /**
   * Verify model witness
   * @param {Object} modelWitness - Model witness
   * @returns {Object} Verification result
   */
  _verifyModelWitness(modelWitness) {
    if (!modelWitness) {
      return {
        valid: false,
        reason: 'Model witness missing'
      };
    }

    // Use WitnessAuthority to verify
    const witnessVerification = this._witnessAuthority.verifyWitness(modelWitness);
    if (!witnessVerification.valid) {
      return witnessVerification;
    }

    return {
      valid: true,
      reason: 'Model witness verified'
    };
  }

  /**
   * Verify streaming witness
   * @param {Object} streamingWitness - Streaming witness
   * @returns {Object} Verification result
   */
  _verifyStreamingWitness(streamingWitness) {
    if (!streamingWitness) {
      return {
        valid: false,
        reason: 'Streaming witness missing'
      };
    }

    // Verify completion witness
    const witnessVerification = this._witnessAuthority.verifyWitness(streamingWitness.completion_witness);
    if (!witnessVerification.valid) {
      return witnessVerification;
    }

    // Verify all chunk witnesses
    for (const chunkWitness of streamingWitness.chunk_witnesses) {
      const chunkVerification = this._witnessAuthority.verifyWitness(chunkWitness);
      if (!chunkVerification.valid) {
        return {
          valid: false,
          reason: `Chunk witness verification failed: ${chunkVerification.reason}`
        };
      }
    }

    return {
      valid: true,
      reason: 'Streaming witness verified'
    };
  }

  /**
   * Verify tool witnesses
   * @param {Array} toolWitnesses - Array of tool witnesses
   * @returns {Object} Verification result
   */
  _verifyToolWitnesses(toolWitnesses) {
    if (!toolWitnesses || !Array.isArray(toolWitnesses)) {
      return {
        valid: false,
        reason: 'Tool witnesses missing or invalid'
      };
    }

    for (const toolWitness of toolWitnesses) {
      const witnessVerification = this._witnessAuthority.verifyWitness(toolWitness);
      if (!witnessVerification.valid) {
        return {
          valid: false,
          reason: `Tool witness verification failed: ${witnessVerification.reason}`
        };
      }
    }

    return {
      valid: true,
      reason: 'Tool witnesses verified'
    };
  }

  /**
   * Verify completion witness
   * @param {Object} completionWitness - Completion witness
   * @returns {Object} Verification result
   */
  _verifyCompletionWitness(completionWitness) {
    if (!completionWitness) {
      return {
        valid: false,
        reason: 'Completion witness missing'
      };
    }

    // Use WitnessAuthority to verify
    const witnessVerification = this._witnessAuthority.verifyWitness(completionWitness);
    if (!witnessVerification.valid) {
      return witnessVerification;
    }

    return {
      valid: true,
      reason: 'Completion witness verified'
    };
  }

  /**
   * Verify state witness
   * @param {Object} stateWitness - State witness
   * @returns {Object} Verification result
   */
  _verifyStateWitness(stateWitness) {
    if (!stateWitness) {
      return {
        valid: false,
        reason: 'State witness missing'
      };
    }

    // Use WitnessAuthority to verify
    const witnessVerification = this._witnessAuthority.verifyWitness(stateWitness);
    if (!witnessVerification.valid) {
      return witnessVerification;
    }

    return {
      valid: true,
      reason: 'State witness verified'
    };
  }

  /**
   * Verify transcript hash
   * @param {Object} transcript - Replay transcript
   * @returns {Object} Verification result
   */
  _verifyTranscriptHash(transcript) {
    // Create transcript copy without hash field
    const transcriptForHash = { ...transcript };
    delete transcriptForHash.transcript_hash;
    delete transcriptForHash.transcript_witness;

    const computedHash = CanonicalAuthority.hash(transcriptForHash);

    if (computedHash !== transcript.transcript_hash) {
      return {
        valid: false,
        reason: 'Transcript hash mismatch',
        expected: transcript.transcript_hash,
        actual: computedHash
      };
    }

    return {
      valid: true,
      reason: 'Transcript hash verified'
    };
  }

  /**
   * Verify replay equivalence between two transcripts
   * @param {Object} transcript1 - First transcript
   * @param {Object} transcript2 - Second transcript
   * @returns {Object} Verification result
   */
  verifyReplayEquivalence(transcript1, transcript2) {
    // Compare transcript hashes
    if (transcript1.transcript_hash !== transcript2.transcript_hash) {
      return {
        valid: false,
        reason: 'Transcript hash mismatch',
        transcript1: transcript1.transcript_hash,
        transcript2: transcript2.transcript_hash
      };
    }

    // Compare completion hashes
    if (transcript1.completion.completion_hash !== transcript2.completion.completion_hash) {
      return {
        valid: false,
        reason: 'Completion hash mismatch',
        transcript1: transcript1.completion.completion_hash,
        transcript2: transcript2.completion.completion_hash
      };
    }

    // Use WitnessAuthority to verify witness equivalence
    return this._witnessAuthority.verifyWitnessEquivalence(
      transcript1.transcript_witness,
      transcript2.transcript_witness
    );
  }

  /**
   * Get verifier ID
   * @returns {string} Verifier ID
   */
  getVerifierId() {
    return this._verifierId;
  }

  /**
   * Get verifier version
   * @returns {string} Verifier version
   */
  getVerifierVersion() {
    return this._verifierVersion;
  }

  /**
   * Generate verifier ID
   * @returns {string} Verifier ID
   */
  _generateVerifierId() {
    const verifierData = {
      verifier_version: this._verifierVersion,
      constitutional_version: '5.0.0'
    };
    const hash = CanonicalAuthority.hash(verifierData);
    return `replay_verifier_${hash.substring(0, 16)}`;
  }
}

// Singleton instance
const replayVerifier = new ReplayVerifier();

module.exports = { ReplayVerifier, replayVerifier };
