/**
 * LANE M — taxonomy bridge.
 *
 * The 13 failure classes are owned by lane K (FAILURE-TAXONOMY.md v1.0.0).
 * Lane J published the single JS import point
 * (lane-j/prototype/taxonomy.mjs); this lane reuses it instead of creating
 * a third copy. DUP: classification DERIVED, not DUPLICATE.
 */
export {
  TAXONOMY_VERSION,
  CLASSES as FAILURE_CLASSES,
  TERMINAL_CLASSES,
} from "../../lane-j/prototype/taxonomy.mjs";
