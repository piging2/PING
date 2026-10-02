'use strict';
//
// Cost model. THE single place where cost estimates live.
//
// The inspected SDK (@github/copilot-sdk 1.0.14) exposes NO pricing or billing
// API, and listModels() metadata carries no authoritative cost data. Therefore
// every number below is a human estimate, explicitly labeled as such. This
// module is versioned and timestamped so a future authoritative pricing source
// can replace it without touching any other file. Nothing else in the broker
// may hard-code a cost.

export const COST_MODEL = Object.freeze({
  version: '2026-09-17.1',
  generated_at: '2026-09-17',
  source: 'ESTIMATE',
  source_note:
    'GitHub exposes no dynamic pricing API in the inspected SDK. Values are ' +
    'conservative human estimates in AI credits per task, NOT billing data. ' +
    'Replace this module when GitHub publishes authoritative pricing metadata.',
  // Conservative per-tier task estimates (AI credits).
  estimates: Object.freeze({
    T2: 25,
    T3: 100,
    T4: 400,
  }),
  // Minimum unallocated quota kept back so one task cannot drain the pool.
  safety_reserve: 50,
});

export function estimateCost(tier) {
  const value = COST_MODEL.estimates[tier];
  if (value == null) throw new Error(`no cost estimate for tier ${tier}`);
  return value;
}

export function safetyReserve() {
  return COST_MODEL.safety_reserve;
}

// Per-task --max-ai-credits ceiling: estimate + reserve. This is a SOFT ceiling
// (the CLI documents it can overshoot); the broker never presents it as a
// hard spend cap.
export function creditCeiling(tier) {
  return estimateCost(tier) + safetyReserve();
}
