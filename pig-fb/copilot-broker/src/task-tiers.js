'use strict';
//
// Task tiers and the conservative classifier.
//
// T0 - deterministic/local, zero judgment (format, sort, count, rename, validate)
// T1 - local/scriptable, light judgment (grep-based transforms, scripted refactors)
// T2 - Copilot eligible, straightforward work
// T3 - Copilot eligible, substantial reasoning
// T4 - Copilot eligible, highest-complexity reasoning
//
// T0/T1 must NEVER invoke Copilot. The classifier is conservative: T3/T4 are
// never auto-assigned, and anything uncertain defaults to T1 (local first).

export const TIERS = Object.freeze({
  T0: 'T0',
  T1: 'T1',
  T2: 'T2',
  T3: 'T3',
  T4: 'T4',
});

const COPILOT_ELIGIBLE = new Set([TIERS.T2, TIERS.T3, TIERS.T4]);

// Pure deterministic operations: no model judgment needed, ever.
const T0_PATTERNS = [
  /^\s*(format|sort|count|rename|validate)\b/i,
  /\bpretty-?print\b/i,
  /\bline-?count\b/i,
];

// A task is a plain object: { tier?, description?, kind? }.
// An explicit tier is respected as given. Without one, the classifier picks
// the cheapest safe option and never spends credits on a guess.
export function classify(task) {
  if (!task || typeof task !== 'object') return TIERS.T1;
  if (task.tier && TIERS[task.tier]) return task.tier;
  const text = `${task.kind || ''} ${task.description || ''}`;
  if (T0_PATTERNS.some((re) => re.test(text))) return TIERS.T0;
  return TIERS.T1;
}

export function usesCopilot(tier) {
  return COPILOT_ELIGIBLE.has(tier);
}

export function assertTier(tier) {
  if (!TIERS[tier]) throw new Error(`unknown task tier: ${tier}`);
  return tier;
}
