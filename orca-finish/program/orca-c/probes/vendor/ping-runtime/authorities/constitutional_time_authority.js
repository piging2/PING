'use strict';
// ORCA-C SCRATCH STUB (documented): the real chain at
// ping-runtime/authorities/constitutional_time_authority.js requires a deep
// kernel authority tree. mission_scheduler.js uses exactly one member:
// constitutionalTimeAuthority.nowAsISOString(). This stub preserves that
// behavior for the tool-disappearance probe; timestamp semantics are not
// under test.
const constitutionalTimeAuthority = {
  nowAsISOString: () => new Date().toISOString(),
};
module.exports = { constitutionalTimeAuthority };
