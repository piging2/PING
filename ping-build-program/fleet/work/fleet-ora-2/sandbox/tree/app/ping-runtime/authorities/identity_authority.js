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
 * 
 * PATCH_004: Moved to runtime/kernel/authorities/
 * This file is now a gateway shim that re-exports from kernel
 */

const { IdentityAuthority: KernelIdentityAuthority, identityAuthority: kernelIdentityAuthority } = require('../../runtime/kernel/authorities/identity_authority');

// PATCH_004: Gateway shim - delegates to kernel implementation
class IdentityAuthority extends KernelIdentityAuthority {
  // No additional methods needed - pure delegation
}

// Singleton instance
const identityAuthority = kernelIdentityAuthority;

module.exports = { IdentityAuthority, identityAuthority };
