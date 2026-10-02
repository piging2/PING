# FYD — Architectural Corrections After Read-Only Review

**Source:** Direct CEO transmission from Nolan, 2026-09-25 ~10:53 MDT.
**Status:** LOCKED DIRECTION. Sent verbatim to all running lanes.
**Standing rule:** TAKE THE REVIEW SERIOUSLY, BUT DO NOT TURN IT INTO ANOTHER ARCHITECTURE WAVE.

---

FYD — TAKE THE REVIEW SERIOUSLY, BUT DO NOT TURN IT INTO ANOTHER ARCHITECTURE WAVE.

THE REVIEW FOUND REAL DEFECTS. CREDIT WHERE DUE. IT CORRECTLY FOUND: explicit SHOW is not the same as default PUBLIC; hidden facts can leak through correction/provenance metadata; anonymous and owner projections need distinct contracts; conflict suppression is currently disconnected from production evidence; object-level provenance is insufficient for factual claims; one digest is carrying too many meanings; rendering / Ask / readback need coherent revision semantics; positional section IDs undermine durable customization; substring dependency matching is weak; filesystem locking does not scale to multiple writers. GOOD WORK.

NOW CUT THIS DOWN TO THE PRODUCT-SHAPING INVARIANTS. DO NOT RESPOND TO THESE FINDINGS WITH: EvidenceAuthority, PrivacyAuthority, ProjectionAuthority, RevisionAuthority, ConflictAuthority. NO. THE EXISTING MODEL IS ENOUGH. What is missing is enforcement at boundaries.

Every PUBLIC FACTUAL OUTPUT must have a binding. Conceptually: PUBLIC STATEMENT -> FACTUAL DEPENDENCIES -> DIRECT / DERIVED / GENERATED / OWNER-AUTHORED -> SUPPORTING EVIDENCE / OWNER ASSERTION -> VISIBILITY DECISION -> PUBLIC PROJECTION. The BINDING VERIFIER owns enforcement. It is a verifier. NOT a new authority. Direct: exact evidence. Derived: inputs + transformation. Generated: factual dependencies + generation metadata. Owner-authored: owner assertion / accepted change. This same structure powers: rendering, Ask FYD, WHY THIS, conflicts, regeneration, future protocol projections. BUILD ONCE.

DO NOT: clone object, delete hidden fields, return everything else. Instead: construct the public projection from an explicit public schema. Public projection must NOT accidentally inherit: owner correction history, private provenance, internal metadata, private context, secrets, policy internals. Test the exact hidden-phone counterexample discovered by the review. A hidden phone must not survive in: fields, description, correction history, provenance payload, Ask context, render manifest.

DO NOT map generic "public" to "show." Those mean different things. We need an explicit owner decision scoped to OBJECT + FIELD. Example conceptually: owner says SHOW business/location/address.streetAddress. That becomes a durable owner assertion. Then the projection can distinguish DEFAULT PUBLIC POLICY from OWNER EXPLICITLY CHOSE TO PUBLISH THIS FIELD. CG-001 remains intact. The pipeline proposes conservative defaults. THE OWNER DECIDES PRESENTATION.

The review found a serious consistency smell: field resolution selects a winner while traversal apparently checks for ANY hide. FIX THE SEMANTICS. There must be ONE resolved visibility result for a given viewer, object, field/relationship, policy revision. All downstream consumers use THAT result. No subsystem independently reinterprets historical decisions.

Do not model conflict = true/false. Minimum states: NOT_CHECKED, CHECKED_CLEAR, CHECKED_CONFLICT, CHECK_FAILED. CHECK_FAILED must never silently become CHECKED_CLEAR. For unresolved material conflict: public projection / Ask behavior must be explicit. Depending on field semantics: withhold, show qualified uncertainty, or surface disagreement. Do not silently choose.

THIS IS MORE IMPORTANT THAN FANCY PROVENANCE UI. Example: SOURCE: 123 Main Street. OWNER corrects to 125 Main Street. Tomorrow source still says 123 Main Street. FYD MUST NOT silently resurrect 123. Represent source observation, owner correction, resolution, current public value as distinct concepts. New observation creates POTENTIAL CONFLICT / RECONCILIATION INPUT. It does not erase owner intent.

STOP MAKING ONE DIGEST MEAN EVERYTHING. Conceptually maintain: VISIBLE REVISION (what the visitor meaningfully sees: facts, ordering, navigation, actions, selected media); PROVENANCE REVISION (evidence and derivations supporting those outputs); POLICY REVISION (visibility/authorization decisions governing the projection); SOURCE REVISION (observation snapshot used to build the graph). Do not necessarily create four new database columns tonight. FIRST fix the contracts so the concepts are not conflated. This enables: same visible site + fresher evidence; same evidence + changed permission; private source change + no public change; public fact change + same layout.

When owner approves SHOW ADDRESS or MOVE EMERGENCY SERVICES FIRST, the write returns a revision/event identifier. The subsequent public read must prove: I AM AT LEAST AS FRESH AS THAT ACCEPTED CHANGE. Only then tell the user PUBLISHED. Harvest the causal-read pattern (SpiceDB's at-least-as-fresh). DO NOT install SpiceDB merely for this. Keep BASE REVISION / EXPECTED REVISION. If Alice edits revision 12 while an agent has already produced revision 13: Alice must not silently overwrite 13. Reject/rebase/reconcile. HTTP If-Match is the right conceptual precedent. HARVEST THE PATTERN. NO NEW PLATFORM.

SECTION ID MUST NOT DEPEND ON ARRAY POSITION. BAD: services-3 when 3 means "third generated section." GOOD: semantic role + stable instance identity. Intentional duplicate sections need explicit instance IDs. Likewise dependency mapping must use typed exact references, NOT substring matching. Dependencies eventually need to express: object, field, relationship, evidence, media, capability. This is what makes incremental regeneration possible.

Do NOT solve compatibility by hashing the repository. Behavior matters. Keep catalog digest, token digest, schema/contract version where useful. Then use behavioral fixtures for: visibility, bindings, query resolution, SiteSpec semantics, owner correction survival. Do not constitutionalize byte-identical browser HTML. Framework/compiler upgrades can legitimately change markup. The invariant is: SAME ObjectGraph + OwnerState + ViewerContext + PlannerVersion + PolicyVersion -> SAME SEMANTIC RENDER MODEL. Then the renderer is allowed to evolve while preserving meaning.

The review is correct: filesystem mutexes do not coordinate multiple hosts. LOG IT. Preserve expectedRevision, idempotencyKey, proposalDigest. When FYD actually has multiple writers/hosts: move uniqueness and concurrency guarantees to the shared authoritative store. NOT BEFORE.

Harvest, don't adopt: OPENFGA -> PINNED POLICY REVISION + SHADOW EVALUATION (do not adopt OpenFGA now). SPICEDB -> WRITE RETURNS REVISION, READ REQUIRES >= REVISION (do not adopt SpiceDB now). W3C PROV -> FACTUAL OUTPUT -> INPUT EVIDENCE -> TRANSFORMATION -> RESULT (do not import RDF complexity unless useful). HTTP If-Match -> EXPECTED REVISION ON MUTATION.

DO NOT IMPLEMENT ALL TEN FINDINGS. CURRENT PRODUCT ORDER: P0 PUBLIC PROJECTION ALLOWLIST; P0 BINDING VERIFIER AT PUBLIC OUTPUT; P0 EXPLICIT OWNER FIELD VISIBILITY ASSERTION; P0 ONE RESOLVED VISIBILITY POLICY. P1 OWNER CORRECTION SURVIVES REOBSERVATION; P1 CONFLICT STATE WIRED TO REAL EVIDENCE; P1 READ-AFTER-WRITE REVISION PROOF; P1 STABLE SECTION / DEPENDENCY IDENTITY. P2 REVISION/DIGEST REFINEMENT; P2 HORIZONTAL WRITE SCALING.

NONE OF THIS MATTERS IF THE USER CANNOT DO THIS: OPEN REAL FYD BUSINESS; ASK "What services do you offer?"; GET AN EVIDENCE-BACKED ANSWER; ASK "How do you know?"; SEE THE SOURCE; NOTICE "MY ADDRESS IS HIDDEN"; AS OWNER: "Show my street address."; FYD PROPOSES EXACT CHANGE; OWNER APPROVES; PUBLIC SITE NOW SHOWS ADDRESS; REFRESH STILL SHOWS ADDRESS; SOURCE REOBSERVATION DOES NOT ERASE OWNER DECISION. THEN: "Move emergency service to the top." PROPOSE -> APPROVE -> READBACK -> VISIBLE CHANGE. THAT ONE FLOW EXERCISES: evidence, privacy, ownership, capabilities, proposals, revision, projection, SiteSpec, renderer, Ask FYD, persistence, regeneration. BUILD THAT.

WHY THIS is an important trust affordance. It is NOT the primary workflow. The customer should mostly experience: FYD GOT MY BUSINESS RIGHT. I CAN TALK TO IT. IT CHANGES WHAT I ASK. IT DOES NOT MAKE THINGS UP. IT REMEMBERS MY DECISIONS. When trust is questioned: WHY THIS? Then expose provenance.

We are harvesting broadly NOW because we want future optionality. The constitutional core should let us later attach: VISUAL EDITOR, CHAT EDITOR, MOBILE APP, DESKTOP APP, MCP, ACTIVITYPUB, ATPROTO, NOSTR, FARCASTER, SOCIAL CAMPAIGNS, EMAIL, NEWSLETTERS, COMMERCE, BOOKING, ADS, AGENTS without each surface inventing: identity, truth, permissions, evidence, conflict resolution, revision semantics. THAT IS WHY THIS WORK MATTERS. THE WEBSITE IS NOT THE SYSTEM. THE WEBSITE IS ONE COMPILER TARGET.

Pipeline: SOURCES -> OBSERVATIONS -> EVIDENCE -> OBJECT GRAPH -> OWNER ASSERTIONS -> RESOLVED SEMANTICS -> CAPABILITIES -> PROPOSALS / TRANSITIONS -> CANONICAL HISTORY -> PROJECTIONS (FYD WEB, CIRCLE, ASK FYD, SEARCH, FEED, MOBILE, MCP, SOCIAL ADAPTERS). THAT IS THE OPTIONALITY.

Use ONE real business. Do not build another architecture document. Prove: public visitor sees only permitted facts; every factual output is bound to evidence/owner assertion; Ask FYD answers from those same bindings; Ask FYD refuses/qualifies unsupported claims; real evidence disagreement becomes CHECKED_CONFLICT; check failure does not become "no conflict"; owner explicitly publishes street address; public projection changes; accepted revision is visible before UI says Published; refresh preserves it; reobserve source; owner decision survives; replay reconstructs the same resolved public state. THEN MOVE FORWARD.

GIVE THE REVIEW CREDIT. IT FOUND REAL THINGS. BUT DO NOT LET A GOOD REVIEW TURN FYD BACK INTO AN ARCHITECTURE PROJECT. FIX THE CONTRACTS THAT CREATE FUTURE OPTIONALITY. PROVE THEM THROUGH ONE CUSTOMER EXPERIENCE. THEN HARVEST THE NEXT LAYER. PRODUCT FIRST. CORE SECOND. SURFACES LAST. GO.

---

## Nolan's pushback notes (recorded alongside, already reflected above)

- No new EvidenceAuthority (binding verifier enforces, not a new authority).
- Statement -> dependencies[] -> evidence model, not rigid one-sentence/one-evidence.
- WHY THIS is infrastructure, not the UX center.
- Owner visibility assertion scoped to (object, field) is the durable concept.
- Don't adopt OpenFGA/SpiceDB now.
- graphDigest isn't wrong; one digest doing four jobs is.
- Semantic determinism over byte determinism.
- Don't solve horizontal writes before horizontal writers exist.
- Conflict needs NOT_CHECKED as fourth state.
- Biggest omission: correction precedence per field/binding with owner assertion as first-class evidence (no giant universal precedence table).
