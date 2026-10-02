'use strict';
/**
 * SWARM-20 GAUNTLET — shims that load the REAL PING contract modules.
 *
 * The gauntlet sandbox (this VM) cannot require() the Pig worktree directly,
 * so the harness uses byte-exact pinned copies under ../vendor-pinned/
 * (see ../vendor-pinned/PROVENANCE.md for source, hashes, and date).
 * The relative layout is preserved so the adapter's own
 * require('../canonicalization/canonicalization_service.js') resolves.
 *
 * These are the actual production modules, not reimplementations:
 *   external_agent_adapter.js : authorizeWorkOrder / issueWorkOrder /
 *                               verifyResultEnvelope / recordVerifiedResult / resultIdentity
 *   policy/orca_policy.js     : classifyDelegation / classifyRetry /
 *                               classifyResultAcceptance / classifyFollowUp /
 *                               prohibitedAction / DECISION_CLASSES
 *   policy/recovery_decisions.js : decideRecovery / RECOVERY_TABLE
 *   policy/orca_status_model.js   : OrcaStatusLedger / legalTransition / isTerminal
 *
 * Override the pinned root with GAUNTLET_ADAPTER_ROOT (read-only; never a write path).
 * To run against a different pinned copy, point GAUNTLET_ADAPTER_ROOT at a dir
 * with the same relative layout.
 */

const path = require('path');

const ADAPTER_ROOT =
  process.env.GAUNTLET_ADAPTER_ROOT ||
  path.join(__dirname, '..', 'vendor-pinned');

const adapter = require(path.join(ADAPTER_ROOT, 'ping-runtime/external-agent/external_agent_adapter.js'));
const policy = require(path.join(ADAPTER_ROOT, 'orca/control-loop/policy/orca_policy.js'));
const recovery = require(path.join(ADAPTER_ROOT, 'orca/control-loop/policy/recovery_decisions.js'));
const statusModel = require(path.join(ADAPTER_ROOT, 'orca/control-loop/policy/orca_status_model.js'));

module.exports = {
  ADAPTER_ROOT,
  adapter,
  policy,
  recovery,
  statusModel,
  AGENT_PROFILES: adapter.AGENT_PROFILES,
};
