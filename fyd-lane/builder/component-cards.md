# FYD Builder-2: nine-field cards for every new unit

Fields: 1 Name · 2 Purpose · 3 Inputs · 4 Outputs · 5 Determinism ·
6 Failure mode · 7 Version · 8 Owner layer · 9 Status

## 1. object-builder
1. `src/fyd/builder/object-builder.ts` · 2. Decides WHAT IS KNOWN: verifies a
tenant projection's object graph and attests it · 3. TenantContext,
PingProjection · 4. Verified ObjectGraph + GraphAttestation (sha256 digest,
checks, derivations) · 5. Pure and deterministic; same projection bytes give
the same attestation · 6. Throws ObjectBuilderError (typed codes) or
TenantContextError; never returns a partial graph · 7. fyd-object-builder@1,
schema catalog fyd-schema-catalog@1 · 8. Object-builder layer · 9. BUILT and
tested (53 builder tests green), wired into /build/[siteId]

## 2. planner
1. `src/fyd/builder/planner.ts` · 2. Decides HOW verified knowledge is
presented: compiles a verified graph into a SiteSpec · 3. TenantContext,
verified ObjectGraph, ArchetypeVector, OwnerIntent, attestation ·
4. SiteSpec + dependency manifest + confidence records + semantic digest ·
5. Deterministic: same graph + vector + intent give byte-identical semantic
output (generatedAt excluded from digest) · 6. Throws on unverified copy,
ineligible components, or missing context; fail closed · 7. fyd-site-planner@1,
emits generator name "fyd-site-generator" · 8. Website-builder layer · 9. BUILT,
tested, live on /build/* for both tenants

## 3. dimensions
1. `src/fyd/builder/dimensions.ts` · 2. Eight continuous archetype dimensions
(urgency, trust_requirement, technical_depth, human_prominence,
media_density, service_complexity, locality, evidence_density) mapped to a
composition policy · 3. ArchetypeVector · 4. CompositionPolicy (section
boosts, density, typography, media treatment, CTA emphasis, presence mode) ·
5. Vectors quantized to 3 decimals; float noise below quantization never
changes policy · 6. Invalid vectors throw; fail closed · 7. v1 (policy is
pure data, no version stamp needed beyond planner) · 8. Website-builder
layer · 9. BUILT and tested, including roofer vs emergency-plumber
reordering bar

## 4. eligibility
1. `src/fyd/builder/eligibility.ts` · 2. Decides which components may render
from the graph: schema roles, predicates (incl. works_for, links_to,
member_of), cardinality, capabilities · 3. ObjectGraph · 4. Eligibility map
component -> boolean + reasons · 5. Pure and deterministic · 6. Unknown
shapes fail closed to ineligible, never to a guessed section · 7. v1 ·
8. Website-builder layer · 9. BUILT and tested

## 5. owner-intent
1. `src/fyd/builder/owner-intent.ts` · 2. First-class OwnerIntent: goals,
priorities, prohibited positioning, preferred/undesired customers, brand
direction, conversion priorities, operating constraints · 3. Raw intent
input · 4. Resolved intent: honored constraints mapped to removed
components, unknown constraints recorded never applied · 5. Deterministic ·
6. Unknown constraints are recorded, never silently applied · 7. v1 ·
8. Website-builder layer · 9. BUILT and tested

## 6. confidence
1. `src/fyd/builder/confidence.ts` · 2. Two separate axes: fact confidence
(evidence strength) vs presentation confidence (render certainty), with the
law presentation <= fact · 3. Binding (section, object, classification) ·
4. ConfidenceRecord per binding · 5. Deterministic function of the binding ·
6. Missing evidence lowers scores, never raises them · 7. v1 · 8. Website-builder
layer · 9. BUILT and tested

## 7. manifest
1. `src/fyd/builder/manifest.ts` · 2. Dependency manifest per SiteSpec:
every section bound to object field, claim ref, classification
(direct/derived/generated/owner_authored), component version · 3. Planned
sections + bindings · 4. DependencyManifest (the WHY THIS bidirectional
record) · 5. Deterministic · 6. A section with no binding is a manifest
error, never a silent gap · 7. v1 · 8. Website-builder layer · 9. BUILT and
tested (forward/reverse walk covers every binding)

## 8. visibility
1. `src/fyd/builder/visibility.ts` · 2. Visibility as presentation policy,
never fact mutation: private objects are facts the renderer must not show ·
3. ObjectGraph, viewer context · 4. Visibility decisions per object ·
5. Deterministic · 6. Private data in a public slot fails closed at the
verifier, not here · 7. v1 · 8. Website-builder layer · 9. BUILT and tested

## 9. generated-presentation
1. `src/fyd/builder/generated-presentation.ts` · 2. Evidence-binding verifier
for generated copy: every factual predicate in a slot must be bound to an
object field whose value appears in the text, with matching claim ref and
public visibility · 3. GeneratedPresentation, ObjectGraph, prohibited list ·
4. { valid, findings } · 5. Pure and deterministic · 6. Any ungrounded,
mismatched, private, or prohibited copy throws via
assertGeneratedPresentationVerified · 7. v1 · 8. Website-builder layer ·
9. BUILT and tested (8 adversarial cases)

## 10. canonical
1. `src/fyd/builder/canonical.ts` · 2. Canonical bytes and semantic digest
for planner outputs; same semantic inputs give byte-identical output ·
3. SiteSpec + graph snapshot · 4. Canonical string + sha256 digest ·
5. Deterministic by construction (key sorting, no wall-clock) · 6. Digest
mismatch means the inputs differed; never silently equal · 7. v1 ·
8. Shared (object-builder digest + planner digest) · 9. BUILT and tested

## 11. structural-diff
1. `src/fyd/builder/structural-diff.ts` · 2. Semantic diff of two SiteSpecs:
page sets, section sets and order, theme tokens, presence, archetype
vocabulary; judges material difference · 3. Two SiteSpecs + labels ·
4. StructuralDiff + Markdown report · 5. Deterministic · 6. Reports
UNKNOWN rather than guessing when specs are incomparable · 7. v1 ·
8. QA layer · 9. BUILT, tested, and proven on the live two-tenant run

## 12. site-vectors
1. `src/fyd/builder/site-vectors.ts` · 2. The two tenant operating points:
COPPERSMITH_VECTOR (TRADES) and PING_DOGFOOD_VECTOR
(TECHNICAL_ENTERPRISE), plus vectorForSite routing · 3. Site id ·
4. ArchetypeVector · 5. Fixed constants, deterministic · 6. Unknown site id
fails closed (no default vector) · 7. v1 · 8. Website-builder layer ·
9. BUILT and proven: the two tenants produce materially different sites

## 13. tenant-context
1. `src/fyd/tenant/tenant-context.ts` · 2. Tenant key model and assertion:
tenantId must equal the store key before any I/O · 3. TenantContext,
key · 4. Typed TenantContextError (TENANT_CONTEXT_MISSING,
CROSS_TENANT_REFERENCE) · 5. Pure · 6. Refusal is a typed error, never
null/[]/empty success · 7. v1 · 8. Tenant boundary layer · 9. BUILT and
tested (Phase 0 a-d contract preserved)

## 14. scoped-stores
1. `src/fyd/tenant/scoped-stores.ts` · 2. Scoped wrappers over the REAL
stores: read overrides, apply owner command, get projection, Ask FYD,
approval emit · 3. TenantContext + store args · 4. Store results, unchanged
shapes · 5. Wrappers are pass-through after the key assertion ·
6. Cross-tenant or contextless calls throw before underlying I/O runs ·
7. v1 · 8. Tenant boundary layer · 9. BUILT and adversarially tested both
directions (28 tenant tests green)

## 15. dogfood projection builder
1. `src/fyd/builder/dogfood/build-ping-fyd-projection.mjs` · 2. Builds the
owner-asserted PING Social projection through the same file-runtime seam ·
3. Nothing (constants inline, owner-asserted facts) · 4.
/home/nolan/ping/var/fyd-projections/ping-fyd.json · 5. Deterministic;
stable ids and digest · 6. Facts labeled owner-asserted, provenance
owner:tenant-config; never presented as observed · 7. v1 · 8. Dogfood ·
9. BUILT, executed, and live at /build/ping-fyd

---

# Consumption contracts

## Semantic diff
`diffSiteSpecs(specA, specB, { tenantA, tenantB, digestA, digestB,
plannerVersion })` returns a StructuralDiff (page/section/theme/presence/
archetype deltas + materiallyDifferent boolean). `renderStructuralDiffReport`
renders it to Markdown. Consumers: the live structural-proof jest test
(writes /tmp/fyd-structural-diff.md), fixture-regression CI (semantic
invariants + diff review, never pixel identity). The diff never sees
customer PII beyond what the specs already carry.

## Owner patch loop
1. Ask FYD (or the Customize panel) drafts a proposal:
`draftSitePatchProposal` then `signSitePatchDraft` (signer binds
tenant + actor + base digest + patch digest).
2. Owner approves in one tap: `verifySignedSitePatchDraft` checks the
signature; stale base digest gives STALE PROPOSAL, never a silent apply.
3. Apply: `scopedEmitOverlayEvent(ctx, siteId, ops)` records the approval
against exactly the approving tenant (cross-tenant emit throws
CROSS_TENANT_REFERENCE before the gateway is touched); presentation-intent
ops apply OVER the compiled spec via `applyPresentationIntent`.
4. Regenerate: `planSite` reruns deterministically; the new semantic digest
proves what changed. Owner edits are durable state, never generated cache;
source re-ingestion never erases them.

## Ask FYD
`scopedAnswerAskFyd(ctx, { siteId, question, mode }, deps)` asserts
`ctx.tenantId === input.siteId` BEFORE the bundle loader runs, then
delegates to `answerAskFyd`. Answers are SUPPORTED (cited), DERIVED
(labeled), or UNKNOWN; inference is never presented as fact. The
bundle loader only ever sees the requesting tenant's data.

---

# Honest RLS status
Database RLS is DESIGNED and PORTABLE (contract documented) but NOT
IMPLEMENTED. The tenant boundary is currently enforced at the
application layer: tenant-context assertions on every scoped entry
point, cross-tenant tests in both directions, and the /build/[siteId]
route binding tenant from the URL path with verifier cross-check of
projection.meta.siteId. No Postgres RLS policy was created; the cert
for the real application DB role (USING vs WITH CHECK, owner/BYPASSRLS
semantics) is future work.
