
// AUDIT SHIM (test-copy only, never in the worktree): expose internals for
// forensic testing. The code under test is byte-identical to the worktree
// except the require.main guard above and this export block.
module.exports.__audit = {
  enforceProhibitions,
  gateResultAcceptance,
  reconcileRunningWorkOrder,
  reconcileStartup,
  Escalation,
  setObjectiveId: (id) => { OBJECTIVE_ID = id; },
  getDataRoot: () => DATA_ROOT,
};
