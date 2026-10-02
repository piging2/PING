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
 */

/** Claim classes the ask answerer can assign to a real claim. */
export type ClaimClass = "DIRECT" | "DERIVED" | "INFERRED";

/**
 * Map an extraction-pipeline classification string onto the ask
 * vocabulary. Unrecognized or missing classifications land on DIRECT
 * because the citation still names real evidence (the basis text stays
 * neutral, "Site record"); only derivation, inference, and generation
 * land on DERIVED / INFERRED. GENERATED_COPY is DERIVED: generated
 * presentation must be labeled as derived, never as a verified fact.
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
      return "DIRECT";
  }
}

/**
 * Human basis sentence for a classification. Shown in WHY THIS and in
 * evidence-ref detail. Harvested from the source basisForClassification,
 * reworded only where the vocabulary changed.
 */
export function basisForClassification(classification: string | undefined): string {
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
    default:
      return "Site record";
  }
}
