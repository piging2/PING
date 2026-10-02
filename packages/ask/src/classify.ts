/**
 * HARVEST BANNER (piging2)
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f83474
 *         src/fyd/ask/visitor-answer.ts (claimClassFor,
 *         basisForClassification)
 * TARGET OWNER: packages/ask (piging2 Ask FYD)
 * MODE: ADAPT. The source's 5-class citation vocabulary (SUPPORTED
 * DIRECTLY / DERIVED / CONFLICTED) is re-expressed in Nolan's proof-3/4
 * vocabulary DIRECT / DERIVED / INFERRED / UNKNOWN (see the vocabulary
 * decision in src/types.ts). The conflict classes (CONFLICTED,
 * CONFLICT, conflict) stay in the mapping for contract fidelity: an
 * unresolved source disagreement is INFERRED from the site data and must
 * never be presented as a recorded fact, so it lands on INFERRED, the
 * honest "labeled, not verified" class in this vocabulary.
 * DEPENDENCIES: none
 * PROOFS: [3, 4]
 *
 * FAIL-CLOSED AMENDMENT (2026-10-02, Nolan binding, "UNKNOWN CLAIM
 * KINDS"): the old default mapped ANY unrecognized / missing /
 * malformed classification to DIRECT. That is epistemic fraud by
 * default: a parsing typo, version skew, or a future schema value could
 * silently upgrade uncertainty into a recorded fact. Now the mapping is
 * explicit-only: unrecognized, empty, missing, or malformed
 * classifications land on INFERRED (the "labeled, not verified" class),
 * never DIRECT, and the raw source value is preserved in the basis text
 * so the uncertainty stays visible instead of silently coercing upward.
 * INFERRED claims already drive the answerer's "not independently
 * verified" disclaimer, so an unknown kind can never be presented as a
 * VERIFIED / DIRECT fact. The boundary is this file: cite.ts and
 * answer.ts need no changes, and the ClaimClass type is unchanged, so
 * the claims[] contract (UNKNOWN never on a claim) still holds.
 */

/** Claim classes the ask answerer can assign to a real claim. */
export type ClaimClass = "DIRECT" | "DERIVED" | "INFERRED";

/**
 * Map an extraction-pipeline classification string onto the ask
 * vocabulary. ONLY the explicit known mappings below may return
 * DIRECT / DERIVED / INFERRED. Matching is exact and case-sensitive:
 * "direct ", "Direct", "inference" are NOT known values.
 *
 * Unrecognized, empty, missing, or malformed classifications fail
 * closed to INFERRED: the claim is labeled, not verified, and the
 * answerer's existing anyInferred disclaimer ("FYD has not
 * independently verified them") fires. They MUST NEVER become DIRECT:
 * an unknown kind is epistemic uncertainty, and uncertainty never
 * upgrades itself into a recorded fact.
 */
export function claimClassFor(classification: string | undefined): ClaimClass {
  switch (classification) {
    case "DIRECT_FACT":
    case "website_statement":
    case "USER_OVERRIDE":
    case "owner_override":
    case "owner_authored":
      return "DIRECT";
    case "DERIVED_FACT":
    case "derived":
    case "GENERATED_COPY":
      return "DERIVED";
    case "INFERENCE":
    case "CONFLICT":
    case "conflict":
      return "INFERRED";
    default:
      // Fail closed. Includes undefined (missing), "" (empty), and any
      // non-string garbage a malformed record smuggles in: the switch
      // matches nothing, so it lands here.
      return "INFERRED";
  }
}

/**
 * Human basis sentence for a classification. Shown in WHY THIS and in
 * evidence-ref detail. Harvested from the source basisForClassification,
 * reworded only where the vocabulary changed.
 *
 * Fail-closed addition: the default branch PRESERVES the original
 * source value instead of discarding it behind a neutral "Site record".
 * The raw value is shown verbatim (JSON-quoted so whitespace-only and
 * empty values stay visible) with an explicit "not presented as a
 * verified fact" disclaimer, so debugging and evidence review can see
 * exactly what the pipeline produced.
 */
export function basisForClassification(
  classification: string | undefined,
): string {
  switch (classification) {
    case "DIRECT_FACT":
      return "Recorded fact from the site data";
    case "DERIVED_FACT":
    case "derived":
      return "Derived from the site data";
    case "INFERENCE":
      return "Inferred from the site data";
    case "GENERATED_COPY":
      return "Site-generated copy (not verified fact)";
    case "USER_OVERRIDE":
    case "owner_override":
      return "Owner-set value";
    case "owner_authored":
      return "Owner-authored content";
    case "website_statement":
      return "The site's own words (website statement, not verified fact)";
    case "CONFLICT":
    case "conflict":
      return "Conflicting source observations (unresolved)";
    case undefined:
      return "No classification recorded (not presented as a verified fact)";
    case "":
      return "Empty classification (not presented as a verified fact)";
    default:
      return (
        "Unrecognized classification " +
        JSON.stringify(classification) +
        " (not presented as a verified fact)"
      );
  }
}
