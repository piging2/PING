'use strict';
// Stub for ../authorities/constitutional_time_authority.js (scheduler + runtime only use nowAsISOString).
const constitutionalTimeAuthority = {
  nowAsISOString() { return new Date().toISOString(); },
};
module.exports = { constitutionalTimeAuthority };
