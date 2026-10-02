/**
 * Canonical Object — Shared Constitutional Object Envelope
 *
 * Single immutable envelope for all constitutional objects.
 *
 * Consolidates ~15 isomorphic implementations that each built the same
 * envelope independently:
 *   - canonical_object_authority.js      (create)
 *   - constitutional_object_factory.js   (createObject)
 *   - knowledge_objects.js               (Function/Class/Interface/API/Dependency/Concept)
 *   - knowledge_object.js                (class-based)
 *   - canonical_symbol_objects.js        (symbol objects)
 *   - github_constitutional_objects.js   (repository/commit/tree/dir/blob)
 *   - constitutional_parser_objects.js   (parser objects)
 *   - prompt_objects.js                  (prompt objects)
 *   - relationship_objects.js            (relationship objects)
 *   - artifact_authority.js              (ArtifactContract)
 *   - pipeline_witness.js                (witness objects)
 *   - replay_certificate_authority.js    (replay certificates)
 *   - temporal_authority.js              (temporal objects)
 *   - generated/*.json registries        (event/capability/workflow entries)
 *
 * Constitutional Constraint: There shall be only one canonical envelope.
 * Every producer builds through createCanonicalObject().
 * Every consumer reads the same field contract.
 *
 * Envelope schema (union of all historical implementations):
 *   id, kind, authority,
 *   canonical_hash, canonical_bytes,
 *   identity, lineage, relationships,
 *   health, confidence,
 *   metadata, payload,
 *   witness, certificate,
 *   schema_version, canonical_version, constitution_version
 */

const { CanonicalBytes, CanonicalAuthority } = require('../authorities/canonical_authority.js');
const { identityAuthority } = require('../authorities/identity_authority.js');
const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');

const SCHEMA_VERSION = '1.0.0';
const CONSTITUTION_VERSION = '1.0.0';
const RUNTIME_VERSION = '1.0.0';

/**
 * Create a canonical constitutional object.
 *
 * @param {Object} config - Object configuration
 * @param {string} config.kind - Object kind (e.g., 'Symbol', 'Commit', 'Repository')
 * @param {Object} config.payload - Object payload (the content being wrapped)
 * @param {string} config.authority - Producing authority ID
 * @param {Object} [config.options] - Envelope options
 * @param {string} [config.options.namespace] - Identity namespace (default 'default')
 * @param {string} [config.options.lifecycle_id] - Lifecycle ID
 * @param {Array} [config.options.derivation_path] - Derivation path (default [kind])
 * @param {Array} [config.options.provenance_chain] - Provenance chain
 * @param {Array} [config.options.relationships] - Relationships array
 * @param {string} [config.options.source_id] - Lineage source ID
 * @param {string} [config.options.source_kind] - Lineage source kind
 * @param {string} [config.options.id] - Explicit ID (defaults to identity-generated)
 * @param {Object} [config.options.identity] - Explicit identity block
 * @param {string} [config.options.health] - Health state (default 'healthy')
 * @param {number} [config.options.confidence] - Confidence (default 1.0)
 * @param {Object} [config.options.metadata] - Extra metadata merged into envelope metadata
 * @param {Object} [config.options.witness] - Witness block
 * @param {Object} [config.options.certificate] - Certificate block
 * @param {boolean} [config.options.include_canonical_bytes] - Include canonical_bytes (default true)
 * @returns {Object} Canonical constitutional object
 */
function createCanonicalObject({ kind, payload, authority, options = {} }) {
  if (!kind) throw new Error('createCanonicalObject() requires kind');
  if (typeof payload !== 'object' || payload === null) throw new Error('createCanonicalObject() requires payload object');
  if (!authority) throw new Error('createCanonicalObject() requires authority');

  const {
    namespace = 'default',
    lifecycle_id = null,
    derivation_path = [kind],
    provenance_chain = [],
    relationships = [],
    source_id = null,
    source_kind = null,
    id = null,
    identity = null,
    health = 'healthy',
    confidence = 1.0,
    metadata = {},
    witness = null,
    certificate = null,
    include_canonical_bytes = true,
  } = options;

  // Canonical bytes + hash from payload
  const canonicalBytes = CanonicalBytes.serialize(payload);
  const canonicalHash = CanonicalAuthority.hashBytes(canonicalBytes);

  // Identity: explicit block wins, otherwise derive from identity authority
  const objectId = id || identityAuthority.generateFromCanonicalHash(canonicalBytes, kind);
  const identityBlock = identity || {
    namespace,
    version: 'v1',
    created_at: constitutionalTimeAuthority.nowAsISOString(),
    created_by: authority,
  };

  // Lineage
  const lineage = {
    source_id: source_id || objectId,
    source_kind,
    derivation_path,
    provenance_chain,
  };

  const envelope = {
    id: objectId,
    kind,
    authority,
    canonical_hash: canonicalHash,
    identity: identityBlock,
    lineage,
    relationships,
    health,
    confidence,
    metadata: {
      lifecycle_id,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      schema_version: SCHEMA_VERSION,
      constitution_version: CONSTITUTION_VERSION,
      runtime_version: RUNTIME_VERSION,
      ...metadata,
    },
    payload,
    witness,
    certificate,
    schema_version: SCHEMA_VERSION,
    canonical_version: SCHEMA_VERSION,
    constitution_version: CONSTITUTION_VERSION,
  };

  if (include_canonical_bytes) {
    envelope.canonical_bytes = canonicalBytes;
  }

  return envelope;
}

/**
 * Verify a canonical object envelope.
 *
 * Recomputes canonical hash from payload and compares.
 *
 * @param {Object} obj - Canonical object to verify
 * @returns {Object} { valid, error }
 */
function verifyCanonicalObject(obj) {
  if (!obj || typeof obj !== 'object') return { valid: false, error: 'not an object' };
  if (!obj.kind) return { valid: false, error: 'missing kind' };
  if (typeof obj.payload !== 'object' || obj.payload === null) return { valid: false, error: 'missing payload' };
  if (typeof obj.canonical_hash !== 'string') return { valid: false, error: 'missing canonical_hash' };

  const expectedHash = CanonicalAuthority.hashBytes(CanonicalBytes.serialize(obj.payload));
  if (obj.canonical_hash !== expectedHash) {
    return { valid: false, error: 'canonical_hash mismatch' };
  }
  return { valid: true, error: null };
}

module.exports = {
  createCanonicalObject,
  verifyCanonicalObject,
  CANONICAL_OBJECT_SCHEMA_VERSION: SCHEMA_VERSION,
  CANONICAL_OBJECT_CONSTITUTION_VERSION: CONSTITUTION_VERSION,
};
