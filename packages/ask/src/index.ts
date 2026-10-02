/**
 * @piging2/ask: Ask FYD, the evidence-backed question answerer, plus the
 * WHY THIS provenance primitive.
 *
 * Question in, answer + classified claims + evidence refs + unknowns out.
 * Deterministic, no LLM, no I/O. Unsupported questions are refused, never
 * guessed. WHY THIS (whyThis) is the same citation machinery the answerer
 * stands on: implement once, use in both.
 */
export * from "./types";
export * from "./viewer";
export * from "./classify";
export * from "./cite";
export { askFyd, projectedGraphFor } from "./answer";
