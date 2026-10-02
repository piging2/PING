/**
 * Constitutional Time Authority
 * 
 * Ω.87.B — Constitutional Replay Remediation
 * Phase 36 PATCH 7 — Time Authority Split
 * 
 * Provides deterministic time for replay.
 * 
 * Constitutional Constraint:
 * Replay should never even know Date exists.
 * 
 * Architecture:
 * RuntimeClock
 *   ↓
 * ConstitutionalTimeAuthority
 *   ↓
 * ReplayTimeAuthority
 * 
 * ConstitutionalTimeAuthority is the runtime time interface.
 * It delegates to RuntimeClock for actual time generation.
 * 
 * PATCH_004: Moved to runtime/kernel/authorities/
 * This file is now a gateway shim that re-exports from kernel
 */

const { ConstitutionalTimeAuthority: KernelConstitutionalTimeAuthority, constitutionalTimeAuthority: kernelConstitutionalTimeAuthority } = require('../../runtime/kernel/authorities/constitutional_time_authority');

// PATCH_004: Gateway shim - delegates to kernel implementation
class ConstitutionalTimeAuthority extends KernelConstitutionalTimeAuthority {
  // No additional methods needed - pure delegation
}

// Singleton instance
const constitutionalTimeAuthority = kernelConstitutionalTimeAuthority;

module.exports = {
  ConstitutionalTimeAuthority,
  constitutionalTimeAuthority,
};
