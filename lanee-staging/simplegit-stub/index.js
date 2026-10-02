'use strict';
// TEST-LOCAL STUB for Lane E auth-wiring tests only. The real simple-git
// package is not installed on the Pig (same class as FL-20260919-SPRINT-003);
// auth wiring never exercises git inspection. Not for production use.
function simpleGit() {
  const notImpl = () => Promise.reject(new Error('simple-git stub: not implemented'));
  return {
    branch: notImpl, log: notImpl, status: notImpl,
    revparse: notImpl, raw: notImpl,
  };
}
module.exports = simpleGit;
module.exports.default = simpleGit;
