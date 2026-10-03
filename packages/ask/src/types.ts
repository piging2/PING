/**
 * HARVEST BANNER (piging2)
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f83474
 *         src/lib/ping/types.ts (AskClaimClassification, AskEvidenceRef),
 *         src/fyd/ask/types.ts (AskViewerIdentity, AskViewerClass,
 *         AskFydContextInput), src/fyd/ask/contract.ts (AskFydClaim,
 *         AskFydAnswerContract)
 * TARGET OWNER: packages/ask (piging2 Ask FYD)
 * MODE: ADAPT. The source types are re-expressed for the piging2 object
 * shape (AskPingObject / AskPingRelationship, structural mirrors of
 * @piging2/sitespec with zero runtime coupling). The ask contracts stay
 * equivalent: question + target + projected graph + viewer context in,
 * answer + claims + evidence refs + unknowns out.
 * DEPENDENCIES: none (type-only)
 * PROOFS: [3, 4]
 *
 * VOCABULARY DECISION (harvest task asked to decide and document):
 * the source extraction pipeline classifies claims as DIRECT_FACT /
 * DERIVED_FACT / INFERENCE / GENERATED_COPY / USER_OVERRIDE (and the
 * harvested fixtures carry claimKind "website_statement"). Nolan's Ask FYD
 * contract for proofs 3-4 requires DIRECT / DERIVED / INFERRED / UNKNOWN.
 * packages/ask adopts the 4-class ask vocabulary as the public contract
 * and defines the mechanical source-to-ask mapping in src/classify.ts:
 *
 *   DIRECT_FACT, website_statement, USER_OVERRIDE, owner-authored -> DIRECT
 *   DERIVED_FACT, GENERATED_COPY                                   -> DERIVED
 *   INFERENCE                                                      -> INFERRED
 *   unrecognized / empty / malformed classification          -> INFERRED
 *       (fail-closed: the raw value is preserved verbatim in the basis
 *       text and the claim is never eligible for DIRECT/VERIFIED
 *       presentation; see src/classify.ts)
 *
 * UNKNOWN is never assigned to a claim. It is the ANSWER state when the
 * graph cannot support an answer (refusal), and claims the answerer
 * cannot evidence never become claims: they go to unknowns/refusal.
 */

/** Structural mirror of @piging2/sitespec PingObject. Type-only. */
export interface AskPingObject {
  id: string;
  schema: string;
  controllerId: string;
  visibility: "public" | "private" | "internal";
  title: string;
  description: string;
  /** Sanitized scalar fields (strings or string arrays only). */
  fields: Record<string, string | string[]>;
  createdAt: string;
  updatedAt: string;
  provenance: {
    kind: string;
    ref: string;
    updatedRefs?: string[];
    derivedAt: string;
  };
  ownerFieldCorrections?: {
    field: string;
    targetObjectId?: string;
    ownerValue: string;
  }[];
}

/** Structural mirror of @piging2/sitespec PingRelationship. Type-only. */
export interface AskPingRelationship {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  status: "active" | "inactive";
  createdAt: string;
  evidenceRef: string;
}

/** The graph the answerer reasons over. Structural mirror of ObjectGraph. */
export interface ObjectGraph {
  objects: AskPingObject[];
  relationships: AskPingRelationship[];
}

/** Who is asking. "owner" requires verified === true AND a non-empty id. */
export interface AskViewerIdentity {
  id: string | null;
  displayName: string | null;
  verified?: boolean;
}

/**
 * Ask FYD viewer classes. Fail-closed: anonymous, unverified, demo, and
 * unknown viewers are "visitor". A viewerClass of "owner" only survives
 * when a verified identity produced it (see classifyAskViewer).
 */
export type ViewerClass = "visitor" | "owner";

/** The viewer context an AskInput carries. */
export interface AskViewerContext {
  viewerClass: ViewerClass;
  viewerId: string | null;
}

/**
 * Epistemic class of one factual claim in an Ask FYD answer.
 * - DIRECT: the claim is a field value read straight from evidence
 *   (a recorded object, a recorded relationship, an owner-attested value,
 *   or the site's own statement, always attributed).
 * - DERIVED: the claim is computed deterministically from evidence
 *   (counting, joining, formatting), labeled as such.
 * - INFERRED: the claim is a model inference from evidence, labeled as
 *   such, never presented as a recorded fact.
 * - UNKNOWN: the answer state when the graph cannot support an answer.
 *   Never assigned to a claim; it is the refusal state.
 */
export type AskClaimClass = "DIRECT" | "DERIVED" | "INFERRED" | "UNKNOWN";

/** Per-claim epistemic status for the factual claims in an AskAnswer. */
export interface AskClaimClassification {
  /** The claim text as stated in the answer. */
  claim: string;
  /** Epistemic status. UNKNOWN never appears here (see AskClaimClass). */
  classification: Exclude<AskClaimClass, "UNKNOWN">;
  /** Ids into the answer's evidenceRefs supporting this claim. */
  evidenceRefIds: string[];
}

/** One evidence reference an answer stands on. */
export interface AskEvidenceRef {
  kind: "object" | "relationship" | "field";
  /** Object / relationship / field id. Not invented, always resolvable. */
  id: string;
  label: string;
  detail?: string;
}

/** Ask FYD input: the exact contract the answerer reasons under. */
export interface AskInput {
  /** The object the question is about. Must survive the viewer projection. */
  targetObjectId: string;
  /** Canonical graph. Projected to the viewer before anything reads it. */
  graph: ObjectGraph;
  viewerContext: AskViewerContext;
  question: string;
  /**
   * Owner HIDE assertions in the existing owner vocabulary: hidden fact
   * ids (the HIDE-assertion output of applyCorrections, packages/owner).
   * Converted through the existing hiddenFactIdsToDecisions converter and
   * enforced on the visitor-class projection before anything reads the
   * graph: a HIDE'd fact never reaches the answer. Verified owners are
   * exempt (they keep seeing their own hidden fields; see the viewer.ts
   * BOUNDARY DECISION). Absent or empty: no decisions, projection
   * unchanged (fail-closed default).
   */
  hiddenFactIds?: string[];
}

/** Coarse answer state. KNOWN = cited evidence; UNKNOWN = refusal. */
export type AskAnswerState = "KNOWN" | "UNKNOWN";

/** One Ask FYD answer. No LLM, no guessing: unsupported means refusal. */
export interface AskAnswer {
  ok: true;
  /** Composed text, with [n] markers into evidenceRefs (1-based). */
  answer: string;
  /** True when the pipeline had no evidence to stand on. */
  refusal: boolean;
  answerState: AskAnswerState;
  /** Every factual claim, classified, each bound to evidence ref ids. */
  claims: AskClaimClassification[];
  /** Evidence refs the answer cites, in marker order. */
  evidenceRefs: AskEvidenceRef[];
  /** What the question asked about with no supporting evidence. */
  unknowns: string[];
}

/** A reference to one visible fact: object + field (or pseudo-field). */
export interface FactRef {
  objectId: string;
  /** A fields[] key, or "title" / "description" (object-level facts). */
  field: string;
}

/** The observation record behind a WHY THIS fact. */
export interface WhyThisObservation {
  objectId: string;
  schema: string;
  title: string;
  field: string;
  value: string;
  capturedAt: string | null;
  provenanceKind: string;
  provenanceRef: string;
}

/** WHY THIS result: the same citation the Ask FYD answer stands on. */
export interface WhyThisResult {
  /** Display source: the website URL, or a site-record label. */
  source: string;
  sourceKind: "business website" | "site record" | "owner correction";
  observation: WhyThisObservation;
  /** "field" for fields[] keys; "object" for title/description. */
  evidenceType: "field" | "object";
  classification: "DIRECT" | "DERIVED" | "INFERRED";
}
