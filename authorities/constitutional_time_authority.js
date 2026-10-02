'use strict';
/**
 * Constitutional Time Authority — placement shim for the workspace root.
 *
 * PROVENANCE (harvested, not a new authority): the orchestration layer
 * (f01-fix/mission_runtime.js, f01-fix/mission_scheduler.js) requires
 * '../authorities/constitutional_time_authority.js' — i.e. it expects to live
 * as <tree>/orchestration/ inside a ping-runtime-shaped tree whose
 * <tree>/authorities/ holds the constitutional time authority. The full
 * kernel chain exists in vendor-pinned trees (e.g.
 * tenanos-wave/swarm-20/gauntlet/vendor-pinned/ping-runtime/authorities/);
 * the orchestration layer uses exactly one member:
 * constitutionalTimeAuthority.nowAsISOString().
 *
 * This file provides that exact interface with the production semantic
 * (wall-clock ISO-8601, UTC) so the fix workspace is loadable and testable
 * standalone. It introduces no new time authority and no new behavior.
 */

class ConstitutionalTimeAuthority {
  nowAsISOString() {
    return new Date().toISOString();
  }
  nowMs() {
    return Date.now();
  }
}

const constitutionalTimeAuthority = new ConstitutionalTimeAuthority();

module.exports = {
  ConstitutionalTimeAuthority,
  constitutionalTimeAuthority,
};
