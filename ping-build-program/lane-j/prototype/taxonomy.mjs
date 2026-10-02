/**
 * Lane J: lane-K FAILURE-TAXONOMY v1.0.0 import.
 *
 * The 13 classes are owned by lane K (FAILURE-TAXONOMY.md). Lane J imports
 * them from exactly this one module so a future taxonomy MINOR (new class)
 * is a one-file swap. The closed set is enforced at the ledger writer
 * (build time, loud) and re-checked by the verifier (read time, flagged).
 *
 * Every failed fetch attempt, every rejection, and every run error carries
 * exactly one of these codes. There is no UNKNOWN class: unrecognized
 * provider behavior classifies as TRANSIENT with original_signal recorded.
 */

/** Canonical closed set, v1.0.0. SCREAMING_SNAKE, exact strings. */
export const TAXONOMY_VERSION = "1.0.0";

export const CLASSES = new Set([
  "AUTH_REQUIRED",
  "AUTH_EXPIRED",
  "PERMISSION_DENIED",
  "RATE_LIMITED",
  "SOURCE_UNAVAILABLE",
  "SOURCE_CHANGED",
  "SCHEMA_CHANGED",
  "INVALID_PAYLOAD",
  "UNSUPPORTED",
  "CONFLICT",
  "TIMEOUT",
  "TRANSIENT",
  "PERMANENT",
]);

/** Which classes are terminal (the engine must not retry after them). */
export const TERMINAL_CLASSES = new Set([
  "AUTH_REQUIRED",
  "AUTH_EXPIRED",
  "PERMISSION_DENIED",
  "SOURCE_CHANGED",
  "SCHEMA_CHANGED",
  "INVALID_PAYLOAD",
  "UNSUPPORTED",
  "CONFLICT",
  "PERMANENT",
]);

export function isTaxonomyCode(code) {
  return typeof code === "string" && CLASSES.has(code);
}

/**
 * Enforce the closed set at build time. Throws on an unknown class so a
 * connector bug is loud at the throw site, never a silent drift in the
 * ledger. (Lane-K section 8: drift rejection.)
 */
export function assertTaxonomyCode(code, where) {
  if (!isTaxonomyCode(code)) {
    throw new Error(
      `taxonomy drift rejected at ${where}: "${code}" is not in lane-K v${TAXONOMY_VERSION} ` +
        `(13 classes). See FAILURE-TAXONOMY.md section 8.`
    );
  }
  return code;
}
