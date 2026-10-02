/**
 * Witness Authority
 * 
 * Architectural Fix — Single Witness Authority
 * Phase 11.11 — Centralized Witness Generation from Constitutional Results
 * 
 * Single witness authority used by:
 * - StreamingAuthority
 * - PromptAuthority
 * - ModelAuthority
 * - RuntimeAuthority
 * - ToolGateway
 * - InferenceWitness
 * - ExecutionAuthority (Phase 11.6)
 * 
 * Phase 11.11 Enhancement:
 * - Authorities return constitutional results (inputs, outputs, canonical hashes, execution id, metadata)
 * - WitnessAuthority centralizes witness generation from constitutional results
 * - Uniform witness generation across all authorities
 * - Replayable and versionable witness generation
 * 
 * Constitutional rule:
 * Witness hashes must be computed WITHOUT the witness hash field,
 * then the hash is attached afterwards.
 * This prevents recursive serialization and undefined authority.
 * 
 * PATCH_004: Moved to runtime/kernel/authorities/
 * This file is now a gateway shim that re-exports from kernel
 */

const { WitnessAuthority: KernelWitnessAuthority, witnessAuthority: kernelWitnessAuthority } = require('../runtime/kernel/authorities/witness_authority');

// PATCH_004: Gateway shim - delegates to kernel implementation
class WitnessAuthority extends KernelWitnessAuthority {
  // No additional methods needed - pure delegation
}

// Singleton instance
const witnessAuthority = kernelWitnessAuthority;

module.exports = { WitnessAuthority, witnessAuthority };
