/**
 * Runtime Identity Authority
 *
 * Phase 36 Constitutional Patch 1
 *
 * Constitutional Constraint: Every runtime must have a canonical fingerprint.
 *
 * Purpose:
 * - Generate canonical runtime identity
 * - Bind events to specific runtime instances
 * - Enable cross-node identity verification
 * - Support replay authentication
 *
 * Runtime fingerprint includes:
 * - Node.js version
 * - Platform architecture
 * - Constitutional version
 * - Authority versions
 * - Runtime startup timestamp
 *
 * PATCH_009: Moved to runtime/kernel/authorities/
 * This file is now a gateway shim that re-exports from kernel
 */

const { RuntimeIdentityAuthority: KernelRuntimeIdentityAuthority, runtimeIdentityAuthority: kernelRuntimeIdentityAuthority } = require('../runtime/kernel/authorities/runtime_identity_authority');

// PATCH_009: Gateway shim - delegates to kernel implementation
class RuntimeIdentityAuthority extends KernelRuntimeIdentityAuthority {
  // No additional methods needed - pure delegation
}

// Export both the class and the singleton from kernel
module.exports = {
  RuntimeIdentityAuthority,
  runtimeIdentityAuthority: kernelRuntimeIdentityAuthority
};
