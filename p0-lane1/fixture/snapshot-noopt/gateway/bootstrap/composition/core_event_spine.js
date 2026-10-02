/**
 * RECONSTRUCTED FIXTURE — the defect site.
 *
 * Verified incident fact (FL-20260919-ORACLE-006, Oracle crash log): this module
 * top-level-requires '../../../ping-runtime/events/legacy_ingress_adapter'.
 * That module exists in the repo at bb63da5ec but was ABSENT from the pruned
 * deployment snapshot, so the first execution of the refactor (on Oracle) threw
 * `Error: Cannot find module '../../../ping-runtime/events/legacy_ingress_adapter'`
 * during bootstrap and the container crash-looped.
 *
 * Exact original line number is unverified from this sandbox (worktree unreachable);
 * the require string itself is verified from the crash log.
 */
'use strict';

// THE DEFECT SITE: top-level require of a module the snapshot pruned.
const legacyIngress = require('../../../ping-runtime/events/legacy_ingress_adapter');

function wire(runtime) {
  runtime.legacyIngress = legacyIngress;
  return runtime;
}

module.exports = { wire };
