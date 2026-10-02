/**
 * Canonical Authority
 * 
 * Ω.18 — Canonical Authority Consolidation
 * Ω.56 — Constitutional Authority Refactoring
 * 
 * Constitutional Constraint: There shall be only one canonical serializer.
 * 
 * Everything should call:
 * - CanonicalBytes.serialize(...)
 * - CanonicalAuthority.hash(...)
 * 
 * Never multiple independent implementations.
 * 
 * Domain-separated hash functions:
 * - hashFile()
 * - hashAST()
 * - hashSymbol()
 * - hashImportGraph()
 * - hashCallGraph()
 * - hashTypeGraph()
 * - hashMission()
 * - hashReflection()
 * - hashRepository()
 * 
 * Each function has exactly one schema.
 * Never arbitrary JS objects.
 * 
 * This eliminates duplicate canonical hashing in:
 * - ReplayLog
 * - WitnessChain
 * - Any future components
 */

const crypto = require('crypto');

class CanonicalBytes {
  /**
   * Serialize object to canonical bytes
   * 
   * Constitutional Constraint: Only accepts structured data, never raw bytes.
   * 
   * Canonical serialization rules:
   * - null/undefined → "null"/"undefined"
   * - primitives → JSON.stringify
   * - arrays → preserves insertion order (for ordered sequences)
   * - objects → sorted keys, colon-separated
   * 
   * For unordered collections, use serializeSet() instead
   * 
   * This ensures deterministic byte representation
   */
  static serialize(obj) {
    // Validate input is structured data, not raw bytes
    if (Buffer.isBuffer(obj)) {
      throw new Error('CanonicalBytes.serialize() does not accept raw Buffer. Use fromBuffer() instead.');
    }
    
    if (obj === null) return Buffer.from('null');
    if (obj === undefined) return Buffer.from('undefined');
    if (typeof obj !== 'object') return Buffer.from(JSON.stringify(obj));
    if (Array.isArray(obj)) {
      const elements = obj.map(item => this.serialize(item));
      const joined = Buffer.concat([Buffer.from('['), ...elements, Buffer.from(']')]);
      return joined;
    }
    const sortedKeys = Object.keys(obj).sort();
    const parts = [];
    parts.push(Buffer.from('{'));
    for (let i = 0; i < sortedKeys.length; i++) {
      const key = sortedKeys[i];
      const keyBytes = Buffer.from(JSON.stringify(key));
      const valueBytes = this.serialize(obj[key]);
      parts.push(keyBytes);
      parts.push(Buffer.from(':'));
      parts.push(valueBytes);
      if (i < sortedKeys.length - 1) {
        parts.push(Buffer.from(','));
      }
    }
    parts.push(Buffer.from('}'));
    return Buffer.concat(parts);
  }

  /**
   * Create CanonicalBytes from raw Buffer
   * 
   * Constitutional Constraint: Raw bytes must be explicitly wrapped.
   * This prevents accidental mixing of structured data and raw bytes.
   * 
   * @param {Buffer} buffer - Raw buffer to wrap
   * @returns {Buffer} The buffer (for type safety in future)
   */
  static fromBuffer(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('CanonicalBytes.fromBuffer() requires a Buffer input.');
    }
    return buffer;
  }

  /**
   * Serialize array as canonical set (unordered collection)
   * 
   * Constitutional Constraint: Replay independence from insertion ordering
   * 
   * For unordered collections, elements are sorted before serialization
   * This ensures [A,B] == [B,A] produces identical hashes
   * 
   * Use this for:
   * - Sets
   * - Tag lists
   * - ID collections
   * - Any unordered data
   * 
   * For ordered sequences, use serialize() instead
   */
  static serializeSet(arr) {
    if (!Array.isArray(arr)) {
      return this.serialize(arr);
    }

    // Sort elements by their serialized bytes for canonical ordering
    // Constitutional Constraint: Use pure UTF-8 byte ordering (locale-independent)
    const sortedElements = arr
      .map(item => ({ item, bytes: this.serialize(item) }))
      .sort((a, b) => Buffer.compare(a.bytes, b.bytes))
      .map(item => item.bytes);

    const joined = Buffer.concat([Buffer.from('{'), ...sortedElements, Buffer.from('}')]);
    return joined;
  }

  /**
   * Serialize object to canonical string
   * 
   * For debugging and compatibility
   */
  static serializeString(obj) {
    return this.serialize(obj).toString('utf8');
  }

  /**
   * Validate that bytes are canonical
   * 
   * @param {Buffer} bytes - Bytes to validate
   * @returns {boolean} True if bytes appear canonical
   */
  static isValidCanonical(bytes) {
    if (!Buffer.isBuffer(bytes)) {
      return false;
    }
    
    // Basic validation: should start with { or [ or be a primitive
    const firstByte = bytes[0];
    return firstByte === 0x7B || firstByte === 0x5B || // { or [
           firstByte === 0x22 || firstByte === 0x6E || // " or n (null)
           (firstByte >= 0x30 && firstByte <= 0x39) || // 0-9
           firstByte === 0x2D || // - (negative numbers)
           firstByte === 0x74; // t (true)
  }

  /**
   * Deserialize canonical bytes back to object
   * 
   * @param {Buffer} bytes - Canonical bytes to deserialize
   * @returns {any} Deserialized object
   */
  static deserialize(bytes) {
    if (!Buffer.isBuffer(bytes)) {
      throw new Error('CanonicalBytes.deserialize() requires a Buffer input.');
    }
    
    const str = bytes.toString('utf8');
    
    // Handle special cases
    if (str === 'null') return null;
    if (str === 'undefined') return undefined;
    
    // Parse as JSON
    return JSON.parse(str);
  }
}

class CanonicalAuthority {
  /**
   * Hash already-canonical bytes directly
   * 
   * Constitutional Constraint: Avoid double serialization
   * Use this when you already have canonical bytes from CanonicalBytes.serialize()
   * 
   * @param {Buffer} bytes - Canonical bytes to hash
   * @param {string} algorithm - Hash algorithm (default: sha256)
   * @returns {string} Hexadecimal hash
   */
  static hashBytes(bytes, algorithm = 'sha256') {
    if (!Buffer.isBuffer(bytes)) {
      throw new Error('hashBytes() requires a Buffer input. Use hash() for objects.');
    }
    return crypto.createHash(algorithm).update(bytes).digest('hex');
  }

  /**
   * Compute canonical hash of object
   * 
   * @param {any} obj - Object to hash
   * @param {string} algorithm - Hash algorithm (default: sha256)
   * @returns {string} Hexadecimal hash
   */
  static hash(obj, algorithm = 'sha256') {
    const bytes = CanonicalBytes.serialize(obj);
    return this.hashBytes(bytes, algorithm);
  }

  /**
   * Compute canonical hash of multiple objects
   * 
   * @param {Array} objects - Array of objects to hash
   * @param {string} algorithm - Hash algorithm (default: sha256)
   * @returns {string} Hexadecimal hash
   */
  static hashChain(objects, algorithm = 'sha256') {
    const hashes = objects.map(obj => this.hash(obj, algorithm));
    return this.hash(hashes, algorithm);
  }

  /**
   * Compute canonical hash of unordered collection (set)
   * 
   * Constitutional Constraint: Replay independence from insertion ordering
   * 
   * @param {Array} arr - Array representing unordered collection
   * @param {string} algorithm - Hash algorithm (default: sha256)
   * @returns {string} Hexadecimal hash
   */
  static hashSet(arr, algorithm = 'sha256') {
    const bytes = CanonicalBytes.serializeSet(arr);
    return crypto.createHash(algorithm).update(bytes).digest('hex');
  }

  /**
   * Verify canonical hash
   * 
   * @param {any} obj - Object to verify
   * @param {string} expectedHash - Expected hash
   * @param {string} algorithm - Hash algorithm (default: sha256)
   * @returns {boolean} True if hash matches
   */
  static verifyHash(obj, expectedHash, algorithm = 'sha256') {
    const actualHash = this.hash(obj, algorithm);
    return actualHash === expectedHash;
  }

  /**
   * Compute hash of Constitutional Object
   * 
   * Constitutional Constraint: Identity metadata excluded from hashing.
   * Language is provenance, not authority.
   * created_at is excluded to ensure replay determinism.
   * 
   * @param {Object} constitutionalObject - Constitutional Object to hash
   * @returns {string} Hexadecimal hash
   */
  static hashConstitutionalObject(constitutionalObject) {
    // Hash only the immutable fields, excluding identity metadata
    const immutableFields = {
      id: constitutionalObject.id,
      kind: constitutionalObject.kind,
      payload: constitutionalObject.payload,
      authority: constitutionalObject.authority,
      lineage: constitutionalObject.lineage,
      // Note: identity.created_at is EXCLUDED from hashing
      // Note: metadata.language is provenance, not authority
    };
    return this.hash(immutableFields);
  }

  /**
   * Compute hash of Replay Event
   * 
   * @param {Object} replayEvent - Replay event to hash
   * @returns {string} Hexadecimal hash
   */
  static hashReplayEvent(replayEvent) {
    const eventFields = {
      id: replayEvent.id,
      data: replayEvent.data,
      previousHash: replayEvent.previousHash,
      authority: replayEvent.authority,
      timestamp: replayEvent.timestamp,
    };
    return this.hash(eventFields);
  }

  /**
   * Compute hash of Witness Block
   * 
   * @param {Object} witnessBlock - Witness block to hash
   * @returns {string} Hexadecimal hash
   */
  static hashWitnessBlock(witnessBlock) {
    const blockFields = {
      id: witnessBlock.id,
      blockNumber: witnessBlock.blockNumber,
      data: witnessBlock.data,
      previousHash: witnessBlock.previousHash,
      authority: witnessBlock.authority,
      timestamp: witnessBlock.timestamp,
      witnessRoot: witnessBlock.witnessRoot,
    };
    return this.hash(blockFields);
  }

  /**
   * Domain-separated hash: File
   * 
   * Schema: { path: string, content_hash: string, size: number }
   * 
   * @param {string} path - File path
   * @param {string} contentHash - Hash of file content
   * @param {number} size - File size in bytes
   * @returns {string} Hexadecimal hash
   */
  static hashFile(path, contentHash, size) {
    const fileSchema = {
      path: path,
      content_hash: contentHash,
      size: size,
    };
    return this.hash(fileSchema);
  }

  /**
   * Domain-separated hash: AST
   * 
   * Schema: { language: string, root_hash: string, node_count: number }
   * 
   * @param {string} language - Programming language
   * @param {string} rootHash - Hash of AST root node
   * @param {number} nodeCount - Number of AST nodes
   * @returns {string} Hexadecimal hash
   */
  static hashAST(language, rootHash, nodeCount) {
    const astSchema = {
      language: language,
      root_hash: rootHash,
      node_count: nodeCount,
    };
    return this.hash(astSchema);
  }

  /**
   * Domain-separated hash: Symbol
   * 
   * Schema: { canonical_name: string, canonical_kind: string, canonical_signature: string, relationships_hash: string }
   * 
   * Constitutional Constraint: Language is provenance, not authority.
   * Identity derives only from canonical kind, name, signature, relationships.
   * 
   * @param {string} canonicalName - Canonical symbol name
   * @param {string} canonicalKind - Canonical symbol kind (Function, Class, etc.)
   * @param {string} canonicalSignature - Canonical signature
   * @param {string} relationshipsHash - Hash of canonical relationships
   * @returns {string} Hexadecimal hash
   */
  static hashSymbol(canonicalName, canonicalKind, canonicalSignature, relationshipsHash) {
    const symbolSchema = {
      canonical_name: canonicalName,
      canonical_kind: canonicalKind,
      canonical_signature: canonicalSignature,
      relationships_hash: relationshipsHash,
    };
    return this.hash(symbolSchema);
  }

  /**
   * Domain-separated hash: Import Graph
   * 
   * Schema: { modules: Array<string>, imports: Array<{source: string, target: string}>, exports: Array<{name: string}> }
   * 
   * @param {Array<string>} modules - Sorted array of module names
   * @param {Array<Object>} imports - Sorted array of imports
   * @param {Array<Object>} exports - Sorted array of exports
   * @returns {string} Hexadecimal hash
   */
  static hashImportGraph(modules, imports, exports) {
    const importGraphSchema = {
      modules: modules,
      imports: imports,
      exports: exports,
    };
    return this.hash(importGraphSchema);
  }

  /**
   * Domain-separated hash: Call Graph
   * 
   * Schema: { functions: Array<string>, calls: Array<{caller: string, callee: string}> }
   * 
   * @param {Array<string>} functions - Sorted array of function IDs
   * @param {Array<Object>} calls - Sorted array of call relationships
   * @returns {string} Hexadecimal hash
   */
  static hashCallGraph(functions, calls) {
    const callGraphSchema = {
      functions: functions,
      calls: calls,
    };
    return this.hash(callGraphSchema);
  }

  /**
   * Domain-separated hash: Type Graph
   * 
   * Schema: { types: Array<string>, relationships: Array<{source: string, target: string, relation: string}> }
   * 
   * @param {Array<string>} types - Sorted array of type IDs
   * @param {Array<Object>} relationships - Sorted array of type relationships
   * @returns {string} Hexadecimal hash
   */
  static hashTypeGraph(types, relationships) {
    const typeGraphSchema = {
      types: types,
      relationships: relationships,
    };
    return this.hash(typeGraphSchema);
  }

  /**
   * Domain-separated hash: Mission
   * 
   * Schema: { reasoning: string, tasks: Array<string>, priority: string }
   * 
   * @param {string} reasoning - Mission reasoning
   * @param {Array<string>} tasks - Sorted array of task descriptions
   * @param {string} priority - Mission priority
   * @returns {string} Hexadecimal hash
   */
  static hashMission(reasoning, tasks, priority) {
    const missionSchema = {
      reasoning: reasoning,
      tasks: tasks,
      priority: priority,
    };
    return this.hash(missionSchema);
  }

  /**
   * Domain-separated hash: Reflection
   * 
   * Schema: { insights: Array<string>, confidence: number, source_id: string }
   * 
   * @param {Array<string>} insights - Sorted array of insights
   * @param {number} confidence - Confidence score
   * @param {string} sourceId - Source object ID
   * @returns {string} Hexadecimal hash
   */
  static hashReflection(insights, confidence, sourceId) {
    const reflectionSchema = {
      insights: insights,
      confidence: confidence,
      source_id: sourceId,
    };
    return this.hash(reflectionSchema);
  }

  /**
   * Domain-separated hash: Repository
   * 
   * Schema: { repo_id: string, commit_sha: string, file_root: string, symbol_root: string, graph_root: string }
   * 
   * @param {string} repoId - Repository identifier
   * @param {string} commitSha - Commit SHA
   * @param {string} fileRoot - File graph root hash
   * @param {string} symbolRoot - Symbol graph root hash
   * @param {string} graphRoot - Overall graph root hash
   * @returns {string} Hexadecimal hash
   */
  static hashRepository(repoId, commitSha, fileRoot, symbolRoot, graphRoot) {
    const repositorySchema = {
      repo_id: repoId,
      commit_sha: commitSha,
      file_root: fileRoot,
      symbol_root: symbolRoot,
      graph_root: graphRoot,
    };
    return this.hash(repositorySchema);
  }

  /**
   * Domain-separated hash: Event Schema
   * 
   * Schema: { fields: Array<string>, version: string }
   * 
   * @param {Array<string>} fields - Schema field names
   * @param {string} version - Schema version
   * @returns {string} Hexadecimal hash
   */
  static hashEventSchema(fields, version) {
    const schemaDefinition = {
      fields: fields,
      version: version
    };
    return this.hash(CanonicalBytes.serialize(schemaDefinition));
  }

  /**
   * Domain-separated hash: Event Canonical
   * 
   * Schema: { event_id, event_type, aggregate_id, aggregate_type, aggregate_version, sequence, authority, authority_version, causation_id, correlation_id, timestamp, payload_version, payload, witness_hash, schema_hash }
   * 
   * @param {Object} event - Event object
   * @returns {string} Hexadecimal hash
   */
  static hashEventCanonical(event) {
    const canonical = CanonicalBytes.serialize({
      event_id: event.event_id,
      event_type: event.event_type,
      aggregate_id: event.aggregate_id,
      aggregate_type: event.aggregate_type,
      aggregate_version: event.aggregate_version,
      sequence: event.sequence,
      authority: event.authority,
      authority_version: event.authority_version,
      causation_id: event.causation_id,
      correlation_id: event.correlation_id,
      timestamp: event.timestamp,
      payload_version: event.payload_version,
      payload: event.payload,
      witness_hash: event.witness_hash,
      schema_hash: event.schema_hash
    });
    return this.hash(canonical);
  }
}

module.exports = { CanonicalBytes, CanonicalAuthority };
