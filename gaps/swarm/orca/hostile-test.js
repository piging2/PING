"use strict";
// Q20 HOSTILE TEST (scratch plane only). No dispatch, no spawn, no writes,
// no canonical events. Pure issuance-layer calls only.
// Run on the Pig: node /tmp/orca-q20-hostile/hostile.js
const ADAPTER = "/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/external_agent_adapter.js";
const POLICY = "/home/nolan/worktrees/orca-autonomy/orca/control-loop/policy/orca_policy.js";
const adapter = require(ADAPTER);
const orcaPolicy = require(POLICY);

const GOOD_CONSTRAINTS = { read_only: true, no_writes: true, no_network: true, no_canonical_events: true, no_mission_state_writes: true };
const NS = "core::system";
const DL = new Date(Date.now() + 600000).toISOString();
function baseWO(over) {
  return Object.assign({ agentId: "hermes", capability: "text.summarize", namespace: NS,
    taskId: "hostile-task-001", missionId: "hostile-mission-001", correlationId: "hostile-corr-001",
    contextPackId: "hostile-ctx-001", input: { text: "synthetic orca-style proposal payload" },
    constraints: GOOD_CONSTRAINTS, resultPath: "/tmp/orca-q20-hostile/result.json",
    deadline: DL, causationId: null, attempt: 1, workOrderId: null }, over || {});
}
let n = 0;
function report(name, fn) {
  n++;
  try { const r = fn(); console.log(`CASE ${n} [${name}]: NO-THROW ->`, JSON.stringify(r).slice(0, 300)); }
  catch (e) { console.log(`CASE ${n} [${name}]: THREW code=${e.code || "?"} msg=${String(e.message).slice(0, 200)}`); }
}
// CONTROL 1: unknown agent
report("control-unknown-agent", () => adapter.authorizeWorkOrder({ agentId: "orca-synthetic", capability: "text.summarize", namespace: NS, constraints: GOOD_CONSTRAINTS }));
// CONTROL 2: send-capability not in hermes allowlist
report("control-email.send-via-adapter", () => adapter.issueWorkOrder(baseWO({ capability: "email.send" })));
// CONTROL 3: missing mandatory no_canonical_events constraint
report("control-missing-constraint", () => adapter.authorizeWorkOrder({ agentId: "hermes", capability: "text.summarize", namespace: NS, constraints: { read_only: true } }));
// ATTACK 4: synthetic ORCA-style proposal issued DIRECTLY at adapter, bypassing
// orcaPolicy.classifyDelegation and any approval store. No approval consulted.
report("ATTACK-direct-issue-no-approval", () => adapter.issueWorkOrder(baseWO()));
// ATTACK 5: policy classification for a send capability (loop-local approval routing)
report("policy-email.send-classification", () => orcaPolicy.classifyDelegation({ adapter, agentId: "hermes", capability: "email.send", namespace: NS, constraints: GOOD_CONSTRAINTS, workOrdersUsed: 0, runBounds: { maxWorkOrders: 2, maxAttempts: 2 } }));
// ATTACK 6: policy classification for the benign capability (what the loop would do)
report("policy-text.summarize-classification", () => orcaPolicy.classifyDelegation({ adapter, agentId: "hermes", capability: "text.summarize", namespace: NS, constraints: GOOD_CONSTRAINTS, workOrdersUsed: 0, runBounds: { maxWorkOrders: 2, maxAttempts: 2 } }));
console.log("DONE. No process spawned, no file written, no event emitted by this script.");
