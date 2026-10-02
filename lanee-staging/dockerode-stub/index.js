'use strict';
// TEST-LOCAL STUB for Lane E auth-wiring tests only. The real dockerode
// package is not installed on the Pig (FL-20260919-SPRINT-003); auth wiring
// never exercises Docker listing. Not for production use.
class Docker {
  constructor() {}
  listContainers() { return Promise.resolve([]); }
  ping() { return Promise.resolve(); }
}
module.exports = Docker;
