/**
 * @piging2/proposals: conversational customization + regeneration.
 *
 * Proof 7: proposePatch (mechanical compiler) -> approveProposal (real
 * gate) -> applyProposal (canonical transition, append-only journal).
 * Proof 8: regenerate (evidence diff -> affected paths -> partial
 * re-generation -> assertions + overrides preserved).
 */
export * from "./types";
export * from "./clone";
export * from "./compiler";
export * from "./apply";
export * from "./proposal";
export * from "./assertions";
export * from "./regenerate";
export * from "./render";
