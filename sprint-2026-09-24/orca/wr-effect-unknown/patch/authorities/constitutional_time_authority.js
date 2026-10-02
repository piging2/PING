'use strict';
// TEST-ONLY STUB for ./patch/orchestration/mission_scheduler.js's require of
// '../authorities/constitutional_time_authority.js'.
//
// On the Pig this resolves through the real chain:
//   ping-runtime/authorities/constitutional_time_authority.js (shim)
//     -> /home/nolan/ping/runtime/kernel/authorities/constitutional_time_authority.js
//     -> constitutional_clock -> physical_clock_adapter -> ...
// That chain loads fine on the Pig (verified 2026-09-26) but is not worth
// vendoring for a regression fixture. The repair under test does not touch
// time handling; the stub provides the same export shape with wall-clock time.
// NOT deployed. Never require this outside the regression fixture.
class ConstitutionalTimeAuthority {
  nowAsISOString() { return new Date().toISOString(); }
}
const constitutionalTimeAuthority = new ConstitutionalTimeAuthority();
module.exports = { ConstitutionalTimeAuthority, constitutionalTimeAuthority };
