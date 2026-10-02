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
 * 
 * PATCH_004: Moved to runtime/kernel/authorities/
 * This file is now a gateway shim that re-exports from kernel
 */

const crypto = require('crypto');
const { CanonicalBytes: KernelCanonicalBytes, CanonicalAuthority: KernelCanonicalAuthority } = require('../../runtime/kernel/authorities/canonical_authority');

// PATCH_004: Gateway shim - delegates to kernel implementation
class CanonicalBytes {
  static serialize(obj) { return KernelCanonicalBytes.serialize(obj); }
  static fromBuffer(buffer) { return KernelCanonicalBytes.fromBuffer(buffer); }
  static serializeSet(arr) { return KernelCanonicalBytes.serializeSet(arr); }
  static serializeString(obj) { return KernelCanonicalBytes.serializeString(obj); }
  static isValidCanonical(bytes) { return KernelCanonicalBytes.isValidCanonical(bytes); }
  static deserialize(bytes) { return KernelCanonicalBytes.deserialize(bytes); }
}

class CanonicalAuthority {
  static hashBytes(bytes, algorithm) { return KernelCanonicalAuthority.hashBytes(bytes, algorithm); }
  static hash(obj, algorithm) { return KernelCanonicalAuthority.hash(obj, algorithm); }
  static hashChain(objects, algorithm) { return KernelCanonicalAuthority.hashChain(objects, algorithm); }
  static hashSet(arr, algorithm) { return KernelCanonicalAuthority.hashSet(arr, algorithm); }
  static verifyHash(obj, expectedHash, algorithm) { return KernelCanonicalAuthority.verifyHash(obj, expectedHash, algorithm); }
  static hashConstitutionalObject(constitutionalObject) { return KernelCanonicalAuthority.hashConstitutionalObject(constitutionalObject); }
  static hashReplayEvent(replayEvent) { return KernelCanonicalAuthority.hashReplayEvent(replayEvent); }
  static hashWitnessBlock(witnessBlock) { return KernelCanonicalAuthority.hashWitnessBlock(witnessBlock); }
  static hashFile(path, contentHash, size) { return KernelCanonicalAuthority.hashFile(path, contentHash, size); }
  static hashAST(language, rootHash, nodeCount) { return KernelCanonicalAuthority.hashAST(language, rootHash, nodeCount); }
  static hashSymbol(canonicalName, canonicalKind, canonicalSignature, relationshipsHash) { return KernelCanonicalAuthority.hashSymbol(canonicalName, canonicalKind, canonicalSignature, relationshipsHash); }
  static hashImportGraph(modules, imports, exports) { return KernelCanonicalAuthority.hashImportGraph(modules, imports, exports); }
  static hashCallGraph(functions, calls) { return KernelCanonicalAuthority.hashCallGraph(functions, calls); }
  static hashTypeGraph(types, relationships) { return KernelCanonicalAuthority.hashTypeGraph(types, relationships); }
  static hashMission(reasoning, tasks, priority) { return KernelCanonicalAuthority.hashMission(reasoning, tasks, priority); }
  static hashReflection(insights, confidence, sourceId) { return KernelCanonicalAuthority.hashReflection(insights, confidence, sourceId); }
  static hashRepository(repoId, commitSha, fileRoot, symbolRoot, graphRoot) { return KernelCanonicalAuthority.hashRepository(repoId, commitSha, fileRoot, symbolRoot, graphRoot); }
  static hashEventSchema(fields, version) { return KernelCanonicalAuthority.hashEventSchema(fields, version); }
  static hashEventCanonical(event) { return KernelCanonicalAuthority.hashEventCanonical(event); }
}

module.exports = { CanonicalBytes, CanonicalAuthority };
