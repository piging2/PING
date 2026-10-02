# MERGED FALSIFICATION: the typed projection seam

**Date:** 2026-09-23. **Mode:** research only. No implementation code.
**Scope:** this file attacks the merged abstraction shared by the six lane-survivors,
not the individual lane versions. It assumes the reader has read the six source
reports (FAIL-1-mobile-overflow, FAIL-2-unsafe-url, FAIL-4-fixture-drift,
FAIL-5-claim-binding, FAIL-6-visibility-error, FAIL-7-clone-sitespecs) and their
falsification files where present (FAIL-1, FAIL-2, FAIL-5, FAIL-6, FAIL-7; FAIL-4
has no falsification file, so F4-S3 is attacked here from its source report alone).

---

## 1. The merged mechanism, stated precisely

**Merged statement:** Every value crossing the projection seam (object graph to
rendered output) carries a machine-checkable type encoding what is known about
it: evidence binding, visibility license, URL-scheme trust, content provenance,
and (in one version) geometry bounds. The renderer accepts only well-typed
values into binding slots. Values that are untyped, unbound, or unlicensed fail
closed: they are omitted, neutralized to an inert form, or refused at
construction, never rendered in full strength.

**The six instantiations:**

| Lane | Survivor | Typed axes | Fail-closed semantics |
|---|---|---|---|
| F1 | S2 typed projection seam with capability contracts | geometry bounds, URL capability, evidence binding, visibility | fail at construction (inconstructible) |
| F2 | S1 schema-typed trust with capability allowlists | URL-scheme capability, evidence binding, visibility | constructor throws or neutralizes; value can never become URL-typed |
| F4 | S3 typed semantic render model with fail-closed gate | evidence binding, visibility class, URL safety | per-node fail-closed: drop claim, redact fact, replace URL; build continues; failure logged |
| F5 | S1 projection-seam binding verifier | evidence binding (visibility via companion seam) | omit unsupported claim or abort build naming the predicate; claim-scoped |
| F6 | S1 positive-license projection gate | visibility license, evidence license, URL license | refuse binding; log denial; default deny |
| F7 | S3 provenance-typed content slots | BUSINESS_EVIDENCE / OWNER_CORRECTION / GENERATED_BOILERPLATE | refuse at constructor; build throws |

---

## 2. Where the six versions disagree

Three load-bearing disagreements. The merged statement papers over all three.

### 2a. Fail-closed vs omit vs neutralize vs block: four different semantics

- **Inconstructible (F1-S2):** the bad composition cannot be expressed. Nothing
  reaches the renderer because nothing could be built.
- **Neutralize to weakest safe form (F2-S3, the FAIL-2 sibling the merged
  abstraction inherits):** unknown scheme becomes plain text, unknown
  visibility becomes coarse or omitted, unknown evidence becomes unasserted.
- **Per-node degrade, build continues (F4-S3):** the unsupported claim drops,
  the private fact redacts, the unsafe URL is replaced with a placeholder;
  the rest of the site ships.
- **Claim-scoped omit or whole-build abort (F5-S1):** the bad claim is omitted
  or the build aborts naming it.
- **Refuse the binding, log a denial (F6-S1):** deny-by-default at the gate.
- **Refuse at construction, build throws (F7-S3):** the spec is never produced.

These compose badly. A per-node degrade at F4 (neutralized plain-text URL)
can be re-armed by a downstream stage (a markdown auto-linker wrapping the
plain text back into `<a href="javascript:...">`), which is FAIL-2
falsification attack C5. The merged abstraction has no stated rule for which
fail-closed semantics governs the composed pipeline, and the wrong
combination converts one version's fail-closed into the next version's
fail-open.

### 2b. Single choke point vs per-node types vs two seams

- **F6-S1:** exactly one gate, shared by all channels. The property claimed is
  structural: a new channel inherits enforcement.
- **F4-S3:** every node of the semantic render model typed on three axes, one
  verification pass before framework markup. The property is per-node typing,
  not a choke point; anything outside the model (embed scripts, error pages)
  is outside the typing.
- **F5-S1:** two cooperating seams, the binding verifier plus the
  field-visibility seam. The full chain holds only when both hold, and the
  joint between them leaks (FAIL-5 falsification attack A5: evidence records
  carry private fields beyond the bound claim; a provenance display leaks
  through the record channel, not the field channel).
- **F2-S1:** schema-layer constructors. Trust is minted upstream of the seam;
  there is no sink-side complement in its own statement.

The merged statement says "the renderer accepts only well-typed values," but
F6 means one gate, F4 means typed nodes in one model, F5 means two seams with
a leaky joint, and F2 means upstream constructors with no sink check. These
are not the same enforcement shape, and the attacks below exploit the gaps
between them.

### 2c. Who mints the types: the trust-root disagreement

- **F2-S1 / F1-S2:** per-capability constructors mint trust at the schema
  layer. Assumes every construction site is the validating one.
- **F4-S3:** the seam computes URL-safety; evidence and visibility types ride
  in from the graph. Who minted the visibility classification and the
  evidence binding is outside the gate's view.
- **F5-S1:** the verifier checks bindings against evidence and assertion
  records treated as trustworthy inputs. The minting authority for those
  records is unspecified (FAIL-5 falsification J3).
- **F6-S1:** the positive license is carried by the data itself. A buggy or
  compromised regeneration writing licenses can self-grant, and the gate
  honors the forgery (FAIL-6 falsification attack 2).
- **F7-S3:** constructors mint provenance types. OWNER_CORRECTION is the
  highest-trust door, and its minting authority is untested (FAIL-7
  falsification attack 3C).
- **F1-S2 (geometry):** the generator authors the layout its own contracts
  constrain; the constraint is self-imposed, the LANE-18 self-trust shape.

No version names a complete trust root. The merged abstraction inherits six
partial ones.

---

## 3. Attacks on the merged abstraction

Each attack targets the merged statement itself. For each: which versions it
breaks as specified and tested, and whether the merged abstraction survives
by adopting the strongest version's defense.

### Attack A: the type-minting authority problem

**The attack.** The merged claim "untyped or unbound values fail closed" is
vacuous if untrusted code can mint types. Every version assumes a trusted
constructor, gate, or verifier, and every version leaves the trust root
incomplete:

1. **Deserialization bypass.** Types exist inside one runtime. The pipeline
   crosses serialization boundaries constantly: database reads, JSON
   fixtures, cache restores, hand-edited SiteSpecs, migration scripts. A
   typed value serialized to JSON becomes a string again, and on the way back
   something must call the validating constructor. The realistic paths are
   unchecked: ORM materialization, `JSON.parse(...) as SiteSpec` casts,
   cache-restore fast paths, admin force-update tools writing rows directly.
   Concrete: a poisoned row is written directly to the store
   (`website = "javascript:alert(1)"`); the read path hydrates it via a cast;
   the value is now typed `HrefUrl` without ever passing scheme validation;
   the render path, which trusts the type, emits it. In a TypeScript
   codebase, branded types are compile-time fiction: one `as` cast erases
   the boundary silently. (FAIL-2 falsification A1.)
2. **License forgery on the write path.** F6-S1's license is data. If licenses
   are fields that the regeneration job writes, a buggy or compromised
   regeneration self-grants a license and the gate honors it. The test never
   probes license forgery. (FAIL-6 falsification attack 2.)
3. **Record-minting authority.** F5-S1 treats evidence and owner-assertion
   records as trustworthy inputs. Nothing specifies who may mint them, through
   which authenticated channel, or what prevents the generation pipeline
   itself from writing to the assertion store. If it can, priority inverts:
   generated text becomes an OWNER_ASSERTED record, the record outranks
   source observations, and the verifier blesses the loop. (FAIL-5
   falsification J3, C2.)
4. **OWNER_CORRECTION minting.** F7-S3's highest-trust door has no tested
   minter. If the planner or an "AI assistant drafting owner edits" can
   construct OWNER_CORRECTION bindings, unbound AI copy enters through the
   most trusted path in the system. (FAIL-7 falsification 3C.)
5. **Self-graded geometry.** F1-S2's geometry contracts are authored by the
   same pipeline they constrain. A contract the generator writes for itself
   is advisory. (F1 open question 4, generalized.)

**Which versions it breaks:** F2-S1 as tested (hydration paths unaudited);
F7-S3 as tested (one bypass away from decorative, minting untested); F6-S1
as tested (write-path license forgery); F5-S1 as tested (record authenticity
an unstated precondition); F4-S3 partially (its gate is sound per node but
inherits minting from upstream); F1-S2 (self-graded contracts).

**Does the merged abstraction survive by adopting the strongest defense?**
The strongest available defense is a composite of three, each from a
different lane's falsification: (i) F6-falsification C1's structural
resolution: make the raw graph type unnameable outside the gate module, so a
bypass is a compile-time failure, not a convention; (ii) F2-falsification's
strengthened construction-site inventory: every deserialization, hydration,
cache-restore, fixture-loading, and admin write path audited to route through
the validating constructor, enforced by a CI static gate (F7-falsification
xv: build fails on `as` casts targeting provenance types and on `any`-typed
values flowing into factual slots); (iii) named, authenticated minting
authorities: OWNER_CORRECTION mintable only from the owner-input path with a
signed edit event (F7 xvii), declassification callable only with owner
authorization and a readable audit entry (F2 strengthened test 5), visibility
marking restricted to named actor classes (F6 strengthened test 1), evidence
records immutable-or-versioned with re-verification on mutation (F5
strengthened test 5).

With all three adopted, the merged claim must be restated, honestly, as:
"untyped values fail closed at every construction site in the audited
inventory, with minting authorities named and authenticated." The inventory
and the authorities are new load-bearing artifacts that no version currently
possesses. **Verdict on Attack A: the merged abstraction survives as a design
contract, but its claim as stated is WEAKENED to the crude shapes until the
inventory and the authorities exist and the audit passes.**

### Attack B: type-system completeness

**The attack.** For the merged seam to hold universally, every value crossing
it must be typed on every relevant axis. Enumerate what crosses untyped in
all six versions:

1. **Time.** Wall-clock reads, "generated on" footers, "open now" badges,
   relative times, build timestamps, nonces and cache-busters. No version
   types time. F4-S3 quarantines GENERATED_PRESENTATION with seed pinning,
   but time-varying content is an open question (F4 open question 8). A value
   that changes across time is an unbound value the seam cannot see.
2. **Third-party embeds and runtime-injected DOM.** Maps iframes,
   review-widget scripts, booking widgets, owner custom CSS
   (`width: 600px !important` in a style block), `srcdoc` iframes. They
   arrive post-projection; no constructor ever sees them. All six versions
   assume the typed tree covers the render tree. (F1 falsification B4.)
3. **The product-required raw-HTML slot.** Owners paste embed codes (maps,
   reviews, booking). F1 falsification B5 states the critical probe as the
   test's own criterion: a single raw-HTML injection path bypassing the
   constructors makes the seam decorative, and the product requires such a
   path. Embed-region safety is then a sanitizer property, which no version
   specifies or tests.
4. **Error paths.** Error pages echoing request context, 404 pages rendering
   raw input, denial logs recording denied values (F6 falsification attack 6:
   the denial log as a channel the gate cannot gate).
5. **Derived values.** A map-embed URL derived from a private address renders
   the address percent-encoded through a public-classified, scheme-allowed
   field (F2 falsification B3). Service-area prose derived from private
   location. Types track the value, not its derivatives; no version has a
   derived-value classification rule (only proposed, in F2 strengthened
   test 4).
6. **The presentation-intent channel.** Free text reaching the generator that
   is never visibility-filtered (F5 falsification B4a). A private fact placed
   only in the intent reaches output with no binding behind it.
7. **Authored layout constants.** `100vw` literals, pixel literals in CSS,
   viewport units in templates. F1-S2 types slots, not constants; the 100vw
   quantity error is a well-typed overflow (F1 falsification B3).
8. **Auxiliary output channels.** Meta descriptions, OG/social cards, RSS
   (which truncates CONFLICTING markers, F5 falsification A6), sitemaps,
   JSON-LD dumps, search indexes, Ask FYD tool-call arguments. F6-S1 claims
   one gate over all channels but its own test captures four of the six-plus
   claimed; the fifth channel is untested (F6 falsification attack 1).

**Which versions it breaks:** all six. No version types time, embeds, error
paths, derived values, or intent channels. F6-S1's "inherits enforcement"
promise is untested for exactly the channels where the next leak will live.

**Does the merged abstraction survive by adopting the strongest defense?**
The strongest defense is F1-falsification's bypass-inventory gate (viii)
strengthened by F6's registry-completeness test: every byte reaches the
render tree through either a constructor or an *inventoried* bypass, each
bypass carrying its own mitigation test (sanitizer suite for HTML, property
allowlist for CSS); a CI static gate fails on any render-tree write path
that is neither constructor-mediated nor inventoried; and the pipeline's
channel registry is a tested artifact, failing the build if any registered
channel's serializer is not gate-routed.

Adopting it retreats the claim from "every value is typed" to "every
render-tree write path is constructor-mediated or inventoried, and each
bypass has its own mitigation test." That is strictly weaker: the type
system no longer covers the seam; the inventory does. And the inventory is
open-ended by construction: new channels arrive (OG-image generator, Ask FYD
tool-call args), so it must be registry-derived, never hand-maintained.
**Verdict on Attack B: the universal type claim FALLS. What survives is an
inventoried-seam claim, currently WEAKENED because the inventory does not
exist.**

### Attack C: the fail-closed availability trap

**The attack.** The merged abstraction stacks fail-closed gates in series
across versions: indeterminate to inert (F2-S3), per-node degrade (F4-S3),
omit-or-abort (F5-S1), deny (F6-S1), refuse-and-throw (F7-S3), construction
failure (F1-S2). No version states an availability bound or a false-positive
budget. The realistic casualties are documented in the falsifications:

1. **Silent over-blocking of legitimate contact paths.** `tel:` with `;ext=`,
   IDN/punycode domains, `mailto:` with query params (F2 falsification C1).
   Combined with no neutralization telemetry, nobody learns the site's
   highest-value CTA stopped being clickable.
2. **Stale corrections wedging regeneration.** A superseded owner correction
   rejects the regen; the pipeline sticks or an operator override becomes the
   new silent-loss channel (F7 falsification 3D).
3. **Owner edits misreported as drift.** An owner reorder trips the drift
   signature; operators learn to ignore the flags (F7 falsification 1D;
   F4-S2 tripwire without layer attribution).
4. **Conflict events with no consumer.** SOURCE_CHANGED_AGAINST_OWNER_ASSERTION
   fires into a log nobody reads; staleness is preserved forever (F5
   falsification C4).

The second-order falsification (F2 falsification C1): silent breakage creates
business pressure to add broad exceptions ("skip validation for
owner-entered values"), and *that* exception reopens #2. A safety mechanism
that predictably generates the incentive to disable it is not a stable
mechanism. The merged abstraction, as stated, is fail-closed without a
stability half.

**Which versions it breaks:** F2-S3 most directly (its whole content is the
default; no availability half exists); F7-S3 (3D wedging; 3E boilerplate
budget would block legitimate rich sites if set wrong); F4-S3 (GENERATED
quarantine assumes seed pinning is byte-stable, but seeded decoding is not
byte-stable across model versions or hardware, F4 open question 1); F5-S1/S3
(C4 event-without-consumer); F6-S1 (denial log with no reader; preview-token
distribution outside the gate); F1-S2 (block-and-escalate at fleet scale is
an availability event per blocked build, F1 open question 2).

**Does the merged abstraction survive by adopting the strongest defense?**
The strongest defense pairs every fail-closed assertion with its availability
twin: (i) a legitimate-variety corpus that must render in full functional
form (F2 S3 strengthened test 1); (ii) neutralization and denial telemetry to
a readable observation log, so degradation is visible instead of silent (F2
open question 6; F2 S3 strengthened test 3); (iii) typed retirement and
supersede paths instead of stuck builds (F7 xviii); (iv) layer-attributed
drift reporting so owner-layer edits are never misreported as fixture-drift
(F7 ix); (v) the honest GENERATED contract: model id as a declared input,
byte-compare only within the same model version (F4 open question 1's first
option).

No version currently carries the twin. **Verdict on Attack C: the merged
"fail closed" claim as stated is WEAKENED and unstable. It holds for the
crude shapes where false positives are rare (literal `javascript:` strings,
literal unbound claims, direct private-field assignment). For the realistic
shapes, fail-closed without the availability twin generates the exception
pressure that reopens the holes. The claim must be amended to "fails closed
within a specified availability bound, with telemetry," which no version
implements.**

### Attack D: composition of typed and untyped subsystems

**The attack.** The merged abstraction assumes one seam. The product has at
least two projection seams, plus untyped neighbors:

1. **Ask FYD is a second seam.** Answer cards render LLM-generated layout
   (unbreakable tokens, wide tables) through contracts no version covers
   (F1 falsification C-B: #1, #5, and #6 all reopen through the chat surface,
   untested by every falsifiable test in the file). If Ask FYD's
   link/markdown rendering is not wired through the sink validator, every
   #2, #5, and #6 guarantee restarts from zero on the conversational surface
   (F2 falsification B2; the stated upgrade condition to FALLS).
2. **The triage labels are unbound meta-claims.** SUPPORTED / PARTIALLY
   SUPPORTED / UNSUPPORTED are claims about an answer's evidential support,
   produced by the LLM whose honesty is in question. An answer labeled
   SUPPORTED that is not supported is itself a #5 failure one level up, and
   no falsifiable test for triage correctness exists (F5 falsification
   section 4).
3. **Multi-turn viewer confusion.** An owner follow-up inside a public
   session; retrieval must be viewer-filtered per turn, and a shared
   retrieval index with the tenant predicate applied at the application
   layer leaks the moment one code path forgets it (F5 falsification section
   4; F6 falsification S3 attack 5).
4. **Downstream re-arming.** Fail-closed at seam N becomes fail-open at seam
   N+1: a markdown auto-linker wrapping neutralized plain text back into an
   executable link (F2 falsification C5). Legacy templates with raw string
   interpolation. Admin force-update tools. Error pages.
5. **Preview and distribution channels.** The preview license travels as a
   URL token through browser history, shared links, and referer headers,
   channels the gate does not govern (F6 falsification S1 attack 5).

**Which versions it breaks:** all six as specified and tested. Every
falsifiable test in every lane runs against the static site renderer. No
version's test touches the conversational surface, the preview channel, or a
downstream text stage.

**Does the merged abstraction survive by adopting the strongest defense?**
The strongest defense is the handoff-seam definition from F5-falsification
section 4: retrieval returns viewer-filtered claims; each answer sentence
carries bindings to retrieved claims or is explicitly marked UNKNOWN or
refusal; the triage label is computed deterministically from sentence
bindings by the verifier, never by the LLM. Plus: the full poisoned-model
suite run against the Ask FYD output renderer independently (F2 S2
strengthened test 3), and the fail-closed invariant asserted after the
*last* text-processing stage, not just after the seam (F2 S3 strengthened
test 5).

That seam does not exist. **Verdict on Attack D: the merged abstraction
survives only by scoping down. Every class claim (#2, #5, #6) must carry an
explicit static-projection scope restriction. The conversational surface,
preview distribution, and downstream text stages are out of scope until the
handoff seam is defined and tested. Without the scope restriction, the
classes are already open through Ask FYD and the merged claim FALLS on the
second seam.**

---

## 4. Pruned class claims

The six versions collectively claim up to #1, #2, #4, #5, #6, #7, #8 (F5-S1
additionally claims #9 at the render model). Ruthless pruning:

- **#1 mobile-overflow: PRUNED entirely from the merged claim.** The typed
  seam prevents the authored fixed-pixel sub-shape (a 216px artboard against
  an explicit container contract fails construction), but the grounded
  flagship incident, emergent compositional overflow with sections valid in
  isolation, passes every constructor by construction (F1 falsification B1).
  Unbreakable LLM tokens, the 100vw quantity error, runtime widgets, and
  owner CSS are further well-typed overflow paths. Prevention of #1 belongs
  to the empirical oracle (F1-S1), not to the type system. The merged
  mechanism keeps no #1 claim.
- **#2 unsafe-url: WEAKENED, narrowed.** Kept: hostile schemes in
  first-party URL slots cannot become executable links, tested with the
  strengthened oracle (entity-decode, WHATWG-parse) against canonical and
  smuggled spellings, on the inventoried static sink list. Pruned: the
  raw-HTML and embed region (a sanitizer property, unspecified and
  untested), unlisted sinks (`srcdoc`, CSS `url()`, `formaction`,
  `xlink:href`, `ping`), the Ask FYD seam, open redirects on allowlisted
  origins, and any `data:` exception not sink-scoped to img/srcset.
- **#4 fixture-drift: WEAKENED, narrowed to a supporting claim.** Kept: LLM
  copy variance is quarantined off the canonical byte-compare surface in
  GENERATED-typed nodes with seed pinning and model-id-as-declared-input;
  byte-compare holds within a model version. Pruned: any universal drift
  prevention (that belongs to the pure-projection survivor, a separate
  mechanism), and cross-model-version byte stability (seeded decoding is not
  byte-stable across model versions or hardware).
- **#5 claim-binding: WEAKENED, narrowed.** Kept: literal unbound factual
  predicates fail closed at the seam (omit or build abort naming the
  predicate); citation enforcement (fragments with no binding at all are
  refused). Pruned: spurious well-typed bindings (entailment is decided
  upstream of the seam by heuristic evidence-linking; the type checks
  presence and shape, not validity), flourish predicates smuggled under the
  GENERATED label, implied claims via image and layout pairing, hostile
  derivation rules laundering manufacture into DERIVED status, paraphrase
  strengthening under presence-only validation, and all Ask FYD coverage.
- **#6 visibility-error: WEAKENED, narrowed.** Kept: silent crossing of a
  private-typed field into a public slot fails closed on the static seam;
  declassification is the only path and must be owner-authorized and logged.
  Pruned: authorized-but-wrong marking (the marking authority is
  unspecified, and the test's pass condition is the attacker's path),
  private values inside licensed public fields (value-level content the gate
  cannot see), derivation leakage (map URLs, derived prose), cache and CDN
  blast radius of past emissions, preview-token distribution, shared-tenant
  precedence, and multi-turn Ask FYD viewer confusion.
- **#7 clone-sitespecs: PRUNED entirely from the merged claim.** The typed
  seam contributes nothing to differentiation: F7-S3's provenance types do
  #5/#8 work, and the coupling/evidence properties that actually prevent
  clones (F7-S1/S2) are not seam properties. F1-S2's structural-divergence
  assertion fell as untestable (no signature, no fixture). The merged
  mechanism keeps no #7 claim.
- **#8 correction-loss: WEAKENED, narrowed.** Kept: OWNER_CORRECTION-typed
  bindings make a regeneration that drops the binding a build failure, given
  an authenticated minting path restricted to the owner-input channel and a
  typed supersede path for stale corrections. Pruned: anchor rot (the
  correction survives as an input and dies in the lookup), unregistered
  corrections (manual hotfixes outside the typed path), minting from
  unauthenticated channels, and staleness wedging without retirement.
- **#9 conflict-collapse: PRUNED.** Claimed only by F5-S1, and only proven at
  the render-model boundary; downstream transforms (SEO meta, social cards,
  truncated listings) drop the CONFLICTING marker and collapse the conflict
  past the verified boundary. The merged mechanism keeps no #9 claim.

---

## 5. Verdict: WEAKENED

The merged typed-projection-seam abstraction is a sound *layer*, not a
standing guarantee. It honestly keeps five narrowed claims on the static
projection seam, for crude fixture shapes: hostile schemes die in
first-party URL slots; literal unbound predicates fail closed; direct
private-to-public assignment is refused; dropped corrections break the
build; generated copy stays off the byte-compare surface within a model
version.

It does not keep: any #1 claim (emergent overflow is well-typed), any #7
claim (differentiation is not a seam property), any #9 claim (markers die
downstream), or any Ask FYD coverage (the second seam restarts every
guarantee from zero). The universal readings, "every value is typed" and
"untyped values fail closed," fall to Attacks B and D; the stability reading
falls to Attack C; the trust-root reading is conditional on Attack A's
inventory and authorities, which do not exist yet.

The honest merged statement, after pruning, is: **on the static site
projection, values that pass through audited constructors carrying evidence,
visibility, trust, and provenance types are refused or neutralized when the
type is absent or unbound; every render-tree write path is either
constructor-mediated or on an inventoried bypass list with its own
mitigation test; fail-closed is paired with a specified availability bound
and telemetry; the conversational surface is out of scope.** Each clause
after the first semicolon is currently an unbuilt artifact. Until the
merged test below passes, the mechanism prevents the crude instances of
#2, #5, #6, and #8, not the realistic ones.

---

## 6. The merged falsifiable test: the full-seam audit

One test. It exercises the merged claim end to end, through deserialization
boundaries, with the strengthened oracles. It must pass in full; any failing
clause falsifies the merged claim for the class it covers.

### Fixture

A fixture graph containing all of the following:

1. **Trust axis.** `website: "javascript:alert(document.domain)"`;
   `website: "&#106;avascript:alert(document.domain)"` (entity-encoded);
   `website: "&#x6A;avascript:alert(1)"` (hex variant);
   `phone: "java\tscript:alert(1)"` (tab smuggling);
   `email: "data:text/html,<script>alert(1)</script>"`;
   a `SafeDataUrl`-shaped `data:image/svg+xml,<svg onload=alert(1)>` value
   aimed at an iframe-src sink.
2. **Evidence axis.** A factual claim with no evidence ("24/7 Emergency
   Plumbing"); a claim with a well-formed but non-entailing evidence
   reference (claimRef to a real, unrelated record); a GENERATED fragment
   whose text contains an undeclared strengthened predicate ("the crew your
   neighbors trust") bound only to a supported service claim.
3. **Visibility axis.** A private-typed home address placed directly in a
   public slot; the same address embedded in a licensed public field's value
   (value-level canary); a map-embed URL derived from the private address;
   a declassification call invoked by projection code without owner
   authorization; an owner correction on the phone number.
4. **Geometry axis.** A layout node demanding a fixed 216px width inside a
   320px container contract (the crude sub-shape; the emergent shape is
   explicitly out of scope for this test and belongs to the oracle).
5. **Bypass inventory.** A Maps iframe embed, a review-widget script embed,
   and owner custom CSS containing a fixed pixel width.
6. **Minting authority.** An OWNER_CORRECTION binding constructed by the
   generation pipeline with no owner-action provenance event.
7. **Hydration path.** A poisoned store row (`website =
   "javascript:alert(1)"`) written directly, bypassing proceduralize, then
   read through the production hydration path.

### Procedure

- **P1. Construction-site inventory (static gate).** Enumerate every
  construction and deserialization site: proceduralize binding sites plus DB
  hydration, cache restore, fixture loading, and admin write paths. Assert
  each routes through the validating constructor. Assert the build fails on
  `as` casts targeting provenance or URL types and on `any`-typed values
  flowing into factual or URL slots. One unchecked site falsifies.
- **P2. Render-boundary audit (static gate).** Enumerate every render-tree
  write path. Assert each is constructor-mediated or on the inventoried
  bypass list. Assert every bypass on the list carries its own mitigation
  test (sanitizer suite for raw HTML, property allowlist for CSS). One
  uninventoried path falsifies.
- **P3. Full pipeline run.** Run the poisoned fixture through the entire
  public pipeline. Capture rendered HTML, client script payloads, search
  index, sitemap, and the gate/denial log.
- **P4. Strengthened oracle.** Do not grep raw bytes. HTML-entity-decode the
  serialized output; extract every URL-valued attribute across every
  captured channel; parse each per the WHATWG URL Standard; assert the
  resulting scheme is in the per-capability allowlist for the sink element
  (capability derived from the element, never from a model label). For
  visibility assertions, percent-decode and whitespace-normalize before
  matching private strings. For claim assertions, assert at the slot level
  with per-predicate binding coverage: every factual predicate in a factual
  slot must resolve to an entailing binding, not merely a present one.
- **P5. Expected outcomes.** Every hostile URL constructor throws or returns
  a neutralized non-link; the rendered channels contain zero executable
  URLs, including the entity-encoded and smuggled variants and the SVG
  data URL at the iframe sink; the unbound claim and the misbound claim are
  absent from factual slots; the undeclared strengthened predicate is absent
  or quarantined; the private address appears in no channel in any encoding
  (direct slot, value-level canary, and derived map URL all refused or
  redacted); the unauthorized declassification is denied, not merely logged;
  the 216px node fails construction or is coerced with a logged coercion;
  every embed byte traveled an inventoried bypass with its mitigation test
  passing; the pipeline-minted OWNER_CORRECTION is refused; the hydration
  poison is neutralized at read time.
- **P6. Availability twin.** A legitimate-variety corpus (`tel:` with
  `;ext=`, IDN/punycode domain, `mailto:` with query params, new gTLDs)
  must render in full functional form. Every neutralization, denial, and
  coercion in P5 must appear in a readable observation log. A silent
  degradation falsifies the stability half.
- **P7. Second-seam clause.** Run the same fixture through the Ask FYD
  output renderer independently and apply P4. If it emits anything the
  static seam would refuse, record the seam as uncovered: the merged claim
  is then scoped to static projection only, and any unscoped class claim is
  falsified.
- **P8. Property-removal mutant.** Build a variant of the system with the
  structural property removed but fixture behavior preserved on clean
  inputs (e.g. the gate present but its refusal branch stubbed to
  pass-through; the bypass inventory present but unenforced). The test must
  fail on this mutant. If it passes, the test measures the fixture, not
  the property, and the test itself is falsified.

### What proves the mechanism DOESN'T work

Any hostile value in any output channel under the P4 oracle; any
uninventoried render-tree write path; any unchecked hydration or
deserialization path; any accepted pipeline-minted OWNER_CORRECTION; any
unauthorized declassification that ships; any legitimate-corpus value
degraded; any silent (unlogged) neutralization; any Ask FYD emission the
static seam would refuse, while the claim remains unscoped; or the
property-removal mutant passing.

### Why this is the strongest single test

It conjoins the four load-bearing strengthenings from the individual
falsifications: the entity-decode plus WHATWG-parse oracle (FAIL-2 section
0, applied to every sink and every channel), hydration-path coverage (FAIL-2
A1, extended to cache restore, fixtures, and admin paths), per-predicate
binding coverage instead of binding presence (FAIL-7 3B, FAIL-5 B1), and the
minting-authority refusal (FAIL-7 3C, FAIL-5 C2). It adds the two structural
gates the lanes never built (the construction-site inventory and the
render-boundary audit), the availability twin the fail-closed versions never
carried, the second-seam clause that scopes the claim honestly, and the
property-removal mutant from F6-falsification C3 that keeps the test from
measuring its own fixture. A mechanism that passes this test has earned the
narrowed claims in section 4. As of this writing, no version would pass it.
