/**
 * Witness Recorder
 * 
 * Records WitnessObjects for completed constitutional lifecycles.
 * 
 * Constitutional Constraint: Every completed lifecycle records WitnessObject.
 * Constitutional Constraint: Witness certifies replay.
 * Constitutional Constraint: Witness verification is cryptographic (Ed25519).
 */

const crypto = require('crypto');
const { CanonicalAuthority } = require('../ping-runtime/authorities/canonical_authority.js');
const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority.js');
const { identityAuthority } = require('../ping-runtime/authorities/identity_authority.js');
const { deterministicKeyAuthority } = require('./deterministic_key_authority');

class WitnessRecorder {
  constructor(seed = null) {
    this._namespace = 'witness';
    this._seed = seed || 'ping-constitutional-witness-seed';
    // Derive Ed25519 key pair from constitutional seed
    const keyPair = deterministicKeyAuthority.deriveKeyPair(this._seed);
    this._privateKey = keyPair.privateKey;
    this._publicKey = keyPair.publicKey;
  }

  async record(replayObject) {
    /**
     * Record WitnessObject for completed constitutional lifecycle.
     * 
     * Constitutional Constraint: Every completed lifecycle records WitnessObject.
     * Constitutional Constraint: Witness certifies replay.
     * Constitutional Constraint: Witness verification is cryptographic.
     */
    if (!replayObject || !replayObject.id) {
      throw new Error('WitnessRecorder.record requires valid ReplayObject');
    }

    // Generate witness root
    const witnessRoot = this._generateWitnessRoot(replayObject);

    // Determine verification status
    const verificationStatus = this._determineVerificationStatus(replayObject);

    // Create WitnessObject
    const witnessRootHash = CanonicalAuthority.hash(witnessRoot);
    const witnessRootCanonicalBytes = Buffer.from(witnessRootHash, 'hex');
    const witnessId = identityAuthority.generateFromCanonicalHash(witnessRootCanonicalBytes, 'witness');
    const timestamp = constitutionalTimeAuthority.now();

    const witnessObject = {
      id: witnessId,
      kind: 'Witness',
      authority: 'WitnessAuthority',
      identity: {
        namespace: this._namespace,
        version: 'v1',
        created_at: timestamp,
        created_by: 'WitnessRecorder',
      },
      canonical_hash: witnessRootHash,
      lineage: {
        source_id: replayObject.id,
        derivation_path: ['ReplayObject', 'WitnessObject'],
        provenance_chain: replayObject.payload.stages.flatMap(stage => [...stage.input_ids, ...stage.output_ids]),
      },
      health: verificationStatus === 'verified' ? 'healthy' : 'unhealthy',
      confidence: verificationStatus === 'verified' ? 1.0 : 0.0,
      relationships: [
        {
          target_id: replayObject.id,
          relation_type: 'certifies',
          strength: 1.0,
          metadata: {},
        },
      ],
      metadata: {
        replay_id: replayObject.id,
        timestamp,
      },
      payload: {
        replay_id: replayObject.id,
        witness_root: witnessRoot,
        verification_status: verificationStatus,
        timestamp,
      },
    };

    return witnessObject;
  }

  _generateWitnessRoot(replayObject) {
    /**
     * Generate witness root from replay object.
     * 
     * Constitutional Constraint: Witness verification is cryptographic.
     * Constitutional Constraint: Witness must consume canonical_bytes, not objects.
     * Constitutional Constraint: Witness roots must be deterministic across schema evolution.
     * 
     * Pattern: ordered witness IDs → ordered canonical bytes → concat(bytes) → hashBytes() → WitnessRoot
     * 
     * This prevents future witness schema evolution from changing replay roots.
     */
    if (!replayObject.canonical_bytes) {
      throw new Error('Witness requires replayObject.canonical_bytes for constitutional witness generation');
    }

    // If replay object has multiple witnesses (e.g., from different stages),
    // order them deterministically by ID before concatenating
    if (replayObject.witnesses && Array.isArray(replayObject.witnesses)) {
      const orderedWitnesses = [...replayObject.witnesses].sort((a, b) => a.id.localeCompare(b.id));
      const orderedCanonicalBytes = orderedWitnesses.map(w => w.canonical_bytes);
      const concatenatedBytes = Buffer.concat(orderedCanonicalBytes);
      return CanonicalAuthority.hashBytes(concatenatedBytes);
    }

    // Single witness case
    return CanonicalAuthority.hashBytes(replayObject.canonical_bytes);
  }

  _determineVerificationStatus(replayObject) {
    /**
     * Determine verification status based on replay result.
     * 
     * Verification status levels: verified, unverified, failed
     */
    if (replayObject.payload.result === 'success' && replayObject.health === 'healthy') {
      return 'verified';
    }
    if (replayObject.payload.result === 'failure') {
      return 'failed';
    }
    return 'unverified';
  }

  async verify(witnessObject, expectedWitnessRoot) {
    /**
     * Verify witness object against expected witness root.
     * 
     * Constitutional Constraint: Witness verification is cryptographic.
     */
    if (!witnessObject || !witnessObject.payload) {
      throw new Error('Invalid WitnessObject');
    }

    return witnessObject.payload.witness_root === expectedWitnessRoot;
  }

  async certify(witnessObject) {
    /**
     * Generate Ed25519 cryptographic signature for witness object.
     * 
     * Constitutional Constraint: Witness certification is cryptographic (Ed25519).
     */
    if (!witnessObject || !witnessObject.payload) {
      throw new Error('Invalid WitnessObject');
    }

    // Sign the witness root with Ed25519 private key
    const witnessData = Buffer.from(witnessObject.payload.witness_root, 'utf8');
    const signature = crypto.sign(null, witnessData, this._privateKey);

    // Export public key for verification
    const publicKeyExport = this._publicKey.export({ type: 'spki', format: 'pem' });

    return {
      ...witnessObject,
      payload: {
        ...witnessObject.payload,
        signature: signature.toString('hex'),
        public_key: publicKeyExport,
        algorithm: 'ed25519',
      },
    };
  }

  async verifySignature(witnessObject) {
    /**
     * Verify Ed25519 signature of witness object.
     * 
     * Constitutional Constraint: Witness verification is cryptographic (Ed25519).
     */
    if (!witnessObject || !witnessObject.payload || !witnessObject.payload.signature) {
      throw new Error('Invalid WitnessObject or missing signature');
    }

    const witnessData = Buffer.from(witnessObject.payload.witness_root, 'utf8');
    const signature = Buffer.from(witnessObject.payload.signature, 'hex');
    
    // Use the stored public key or the instance public key
    const publicKey = witnessObject.payload.public_key 
      ? crypto.createPublicKey(witnessObject.payload.public_key)
      : this._publicKey;

    return crypto.verify(null, witnessData, publicKey, signature);
  }
}

module.exports = { WitnessRecorder };
