// @ping/mission-control entry point: the bounded Mission Control slice.
// Honest projections only. Gaps are labeled, never fabricated.

export { buildAutomationHealth, readJsonl, readJsonFile, funnelFor, passClassDistribution, schedulerIntentFromDefs, capabilityHealthRows } from "./automation-health.mjs";
export { buildMissionList, buildMissionDetail, toMissionProjection } from "./mission-list.mjs";
export { buildMissionWindow, runLayerGap, findRunIdentity } from "./mission-window.mjs";
export { buildApprovalQueue, APPROVAL_DISPATCH_GAP } from "./approval-queue.mjs";
export { buildIntentLedgerView, TERMINAL_DISPOSITIONS } from "./intent-ledger.mjs";
