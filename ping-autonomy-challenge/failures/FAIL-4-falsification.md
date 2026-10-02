# FAIL-4 FALSIFICATION: adversarial pass over the fixture-drift survivors

Research only. No implementation code. No em dashes used in this document.

Scope: the four surviving mechanisms in FAIL-4-fixture-drift.md (S1 declared-input
purity, S2 replay-mismatch tripwire, S3 typed semantic render model, S4
content-derived identity). Method: for each survivor, construct the strongest
concrete adversarial case, run the survivor's own falsifiable test against the
attack on paper, assess whether the test as written catches it, and strengthen
weak tests. Verdicts: WITHSTANDS, WEAKENED, FALLS, or DUPLICATE.

## 0. Code-level grounding (checked 2026-09-23 against the actual lane)

These findings are load-bearing for the attacks below. All paths are real.

1. `~/workspace/fyd-lane/repo/render-model.ts:38`:
   `RENDERER_VERSION = "renderer.tsx@unversioned"`. The renderer version is a
   hardcoded module constant embedded in the OUTPUT model, not a declared input.
   FAIL-4 S1 claims "rendererVersion is already listed as a declared input"
   (citing the memory doctrine). At code level this is false: two deploys with
   different renderer code emit the identical version string.
2. `render-model.ts:16`: `DESIGN_TOKEN_VERSION = "tokens@unversioned"`, with an
   explicit in-code gap comment ("until the sitespec lane versions its design
   tokens"). S1's tuple names designTokenVersion as declared; in practice it is
   a constant placeholder.
3. The real determinism probe (`~/workspace/fyd-lane/repo/determinism-probe.ts`)
   input tuple is `{ spec, graph, viewer, asOf, designTokenVersion?,
   ownerOverrides? }`. It contains no rendererVersion, no prompt version, no
   LLM model id, no timezone-database version, no runtime version. The S1
   contract tuple `render(graph, siteSpec, ownerOverrides, viewerContextClass,
   rendererVersion)` does not match the code: the code records `viewerId`, not
   a viewerContextClass, and `ownerOverrides` is typed `FieldVisibilityDecision[]`
   (visibility decisions only, not value corrections).
4. The named fixtures exist at
   `~/workspace/fyd/product-lane/var/fyd-projections/{happy-place,coppersmith-plumbing}.json`
   with top-level keys `['meta', 'graph']`. Neither contains any conflict marker
   or owner-correction record (grep for conflict/correction/OWNER_ASSERTION: zero
   hits in both files).
5. No file in the product lane or the fyd-lane repo mentions `inputHash` or
   `outputHash`. The `(inputHash, outputBytes, outputHash)` recorded-output store
   that S2 presupposes does not exist yet.
6. Fixture IDs are content-derived in shape (`website-service-51de038c1defe8bd`,
   `rel-9b5d8035b2d8f54e`); no `randomUUID`/`uuidv4` in the repo render path.
   S4's ground truth is partially real; its coordinate schema is not.

---

## S1. Declared-input purity

Claimed to prevent: #4 fixture-drift, #8 correction-loss, #7 clone-sitespecs.

### Attack 1: the declared boundary is incomplete, and purity is vacuous over an incomplete declaration

The mechanism's central guarantee is "undeclared inputs cannot hide because the
hash closes over the full declared tuple." The tuple is not full. Against the
real probe tuple, the following influence output but appear nowhere in it:

- rendererVersion: hardcoded `"renderer.tsx@unversioned"` (finding 1). A renderer
  code change alters output bytes under an identical inputHash. S1's own
  definition calls this drift, and the mechanism's only recovery is re-blessing
  the golden fixture, which is drift laundered by convention (FAIL-4 open
  question 6, now with a concrete instance).
- designTokenVersion: `"tokens@unversioned"` placeholder (finding 2). A token
  change alters markup invisibly to the hash.
- Prompt templates and LLM model id / provider: GENERATED nodes are produced by
  a generator whose prompt file and model version are read off-disk and
  off-network. Neither is hashed. A prompt edit between CI runs changes output
  under an identical inputHash.
- Timezone-database version: the probe declares `asOf` (an instant) but not the
  IANA tzdata version. Any hours-relative or "open now" computation from
  (asOf, zone name) changes across tzdata releases (DST rule changes are real
  and frequent). Same declared inputs, different output, on two machines with
  different tzdata.
- Runtime version: Node/V8 builds change `Array.prototype.sort` stability
  edge cases, `JSON.stringify` behavior for exotic values, and regex semantics.
  The lane sorts with `<`/`>` comparators (code-unit order, ICU-independent),
  which closes the Intl hole, but the runtime itself remains undeclared.

The mechanism is therefore not "purity" but "purity relative to an enumerated
subset." Every item above is a concrete undeclared input, and three of them
(rendererVersion, designTokenVersion, prompt/model versions) are the *most
likely* drift sources in a real deployment (code and prompts change far more
often than wall-clock reads leak in).

### Attack 2: the falsifiable test is machine-scoped and cannot catch Attack 1

The test varies environment *within one machine and one process run*: shuffled
JSON key order, monkeypatched Date.now, reseeded Math.random, TZ=UTC vs
TZ=Pacific/Auckland. All of these are constant-input variations on a single
host. They cannot detect:

- tzdata version differences (both runs share the host tzdata; varying TZ *name*
  is not varying the TZ *database*),
- Node/runtime version differences,
- prompt-file or model-version differences (the file does not change between
  the 5 runs),
- renderer code changes (same code across the 5 runs; and rendererVersion is a
  constant string anyway).

The test proves "no ambient nondeterminism on this host," not "the declared
tuple is complete." A completeness claim needs a closure audit, not just output
comparison. Strengthened test: (a) run the two-process determinism probe on two
heterogeneous containers (different Node minor, different tzdata release,
different TZ) and byte-compare; (b) enumerate every actual read the render
performs (open file descriptors, env vars accessed, module-level constants
read) via syscall tracing on a clean run, and assert the set is a subset of the
declared tuple. Any read outside the tuple is a failed test, even if outputs
happen to match today.

Additional test weakness: "monkeypatch Date.now" does not intercept
wall-clock reads in child processes, workers, or native modules. The real probe
already spawns two separate processes; the S1 test should run its adversarial
variations through that two-process harness, not in-process.

### Attack 3: the #7 clone-sitespecs claim is vacuous (FALLS)

"Divergent inputs mapping to convergent outputs is flagged as a collapse
suspect." Three problems:

1. The byte-compare half is vacuous: two different business graphs essentially
   never produce byte-identical output (business names differ), so the
   observable the mechanism defines almost never fires.
2. The structural half ("or structurally identical") is undefined. There is no
   structural signature, no similarity metric, no threshold anywhere in the
   mechanism. FAIL-1's open question 3 admits the structural signature for the
   same idea is still undefined. An undefined detector prevents nothing.
3. Observation is not prevention, and the flag has no semantics: what happens
   on a flag (block? warn? log?)? Worse, the flag cannot distinguish legitimate
   convergence (two locations of one franchise on the same template, which
   SHOULD look similar) from collapse (differentiation lost). From
   (inputHash, outputHash) pairs alone the two are undecidable.

The mechanism's own falsifiable test does not exercise #7 at all. Verdict on
the #7 claim: FALLS. S1 does not prevent #7; at most it records pairs from
which a future, unspecified detector might compute something.

### Attack 4: the #8 correction-loss claim stops at the tuple boundary

S1's #8 argument: "Owner corrections are declared inputs (ownerOverrides); a
regen that drops a correction produces different output under identical inputs,
so the golden byte-compare trips." At code level, `ownerOverrides` is
`FieldVisibilityDecision[]`: visibility decisions, not value corrections.
Step 7's correction (phone `+15419998888` overridden to `+1 541 555 0147`) lives
in the owner store and reaches the render as an effective value inside the
graph, or via a separate OwnerFieldCorrection path. Either way, the correction
*record* (the reason the value is what it is) is not in the declared tuple.

Concrete case: the owner store loses the correction (bad key migration,
truncated write). The graph reverts to the source value. inputHash changes
(graph changed). Divergence is "explained." Golden re-blessed. Correction gone,
every mechanism green. S1 catches only a render-stage drop of a *declared*
override; store-level loss upstream of the tuple is invisible by construction.
The #8 claim is therefore WEAKENED to: prevents render-stage drops of declared
visibility decisions. The value-correction lifecycle (the actual Step 7
scenario) is outside the boundary.

### Attack 5: mechanism/test mismatch on silently-ignored inputs

The test's second falsification clause says identical output after an
ownerOverrides change proves "a declared input was silently ignored, which is
also drift." But S1's drift definition is "output change under identical
inputHash." A silently-ignored input produces identical output under a
*changed* inputHash. The inputHash/outputHash machinery cannot see it; only the
test's extra clause asserts it. The test demands a property the mechanism does
not implement. Either the mechanism gains an input-effectiveness check
(every declared input must have an observable effect, or be declared inert),
or the clause is dropped. As written, the test is stronger than the mechanism,
which means the mechanism's passing the test is not evidence the property
holds in CI.

### S1 verdict: WEAKENED

- #4: WEAKENED. The run-twice byte-compare genuinely catches machine-local
  ambient nondeterminism, but the declared tuple is incomplete at exactly the
  points the code flags as gaps (unversioned renderer, unversioned tokens), and
  the recovery path for the most common real drift (code/prompt changes) is
  manual golden re-blessing, i.e., drift by convention.
- #8: WEAKENED. Holds only for render-stage drops of declared visibility
  decisions; value corrections live upstream of the tuple.
- #7: FALLS. The convergence detector is undefined and untested; observation
  was claimed as prevention.

Strengthened acceptance bar: close the tuple (version the renderer for real,
version design tokens, hash prompt files and record model id + tzdata release
in the input closure) OR downgrade the claim from "declared-input purity" to
"machine-local ambient-input purity," and add the heterogeneous two-container
probe plus the syscall closure audit to the falsifiable test.

---

## S2. Replay-mismatch tripwire

Claimed to prevent: #4 fixture-drift, #8 correction-loss, #9 conflict-collapse.

### Attack 1: the tripwire's own storage is a golden that goes stale, and re-recording is drift by convention

Every legitimate input change (new graphDigest from re-observation, new
rendererVersion, new ownerOverrides) requires the recorded
(inputHash, outputBytes, outputHash) to be re-recorded. Who attests that the
newly recorded output is *correct* rather than itself drifted? The mechanism
names no attester, no signer, no independent writer. The pipeline that
generates the output is the same pipeline that records the baseline: pure
self-attestation.

Concrete case: a renderer bug ships in the same release as a rendererVersion
bump (a legitimate declared input change). Regen diverges from the old record;
the gate sees inputHash changed, calls it explained, and re-records the buggy
output as the new baseline. From that moment the tripwire *enforces the bug*:
any future fix that restores correct output will diverge from the recorded
buggy baseline under a changed inputHash (version bump) and be re-recorded
again. The tripwire is a ratchet that converges on "whatever the pipeline last
produced after an approved change." It blocks unexplained divergence but its
explanation path is a human convention with no verification. This is FAIL-4
open question 6 with the serial number filed off, and it is worse for S2 than
for S1 because S2 re-records continuously in production, not just in CI.

### Attack 2: high-churn inputs degenerate the tripwire into S1 at production cost

Source re-observation (the Step 7 pattern) changes graphDigest on every crawl
that finds any value change. Each re-observation changes inputHash, which makes
the divergence "explained," which triggers re-record. If re-observation runs on
a cadence, the baseline is perpetually fresh and the tripwire only ever fires
when output changes with inputHash *unchanged*, which is exactly S1's
build-time check relocated to the publish path, at the cost of storing and
comparing full outputBytes per site per generation (FAIL-4 open question 7).
The mechanism pays production storage and comparison budget for detection power
it already had in CI.

Worse, the churn path creates a laundering route: a buggy re-observation that
drops a field changes graphDigest (input changed, explained), the degraded
output is re-recorded, and the owner correction that used to protect the field
now binds to a record that no longer contains it. The tripwire watched it
happen and called it legitimate.

### Attack 3: the #9 conflict-collapse claim depends on a representation that does not exist

"Contradictory sources preserved as an explicit conflict marker in the
recorded output." FAIL-4 open question 5: FYD has no canonical conflict node
type. Finding 4 above: neither named fixture contains a conflict marker. The
falsifiable test requires "the fixture contains ... one explicitly marked
source conflict," which cannot be satisfied with the named fixtures; the test
is not executable as written without inventing the representation the
mechanism presupposes. A tripwire cannot preserve a marker whose type is
undefined, and cannot fire on the collapse of a marker it cannot represent.
The #9 claim is unproven as specified. (Note F5 S1 does define a CONFLICTING
classification with surviving evidence refs; S2 could borrow it, but as written
S2 does not name it.)

### Attack 4: the #8 claim covers only the render-stage slice

"A regen that silently drops an owner correction diverges from the recorded
corrected output under the same declared inputs." True, but only if the inputs
still declare the correction. If the owner store lost the correction (Attack 4
on S1), the declared inputs changed (fewer overrides / reverted graph), the
divergence is explained, and the tripwire re-records the uncorrected output.
S2 catches a render call that ignores its inputs; it does not catch the
correction lifecycle failing upstream. Same boundary cut as S1, same
weakening. The claim "catches it by construction without needing a
correction-specific check" is precisely the problem: without a
correction-specific invariant (e.g., F1 S1's correction-preservation assertion,
which registers corrections as expected-output invariants independent of the
input tuple), the tripwire cannot distinguish "owner revoked the correction"
from "store dropped it."

### Attack 5: the test's second falsification clause is doing uncredited work

"What proves the mechanism DOESN'T work: ... a trial halts when inputs were
legitimately changed and the gate cannot name which input changed." This is the
strongest clause in any F4 test: it demands explained-vs-unexplained
*attribution*, not just a halt. But the mechanism as specified only compares
inputHash equality; inputHash is a single digest over the whole tuple. When it
differs, the gate as specified cannot name *which* input changed without a
per-input hash decomposition, which the mechanism does not define. The test
requires per-input attribution the mechanism does not build. Strengthened
mechanism: record per-input sub-hashes (graphDigest, siteSpecHash,
overridesHash, rendererVersion, asOf) alongside the composite, and the
divergence error must name the changed components. Without that, the clause is
aspirational.

### S2 verdict: WEAKENED

- #4: WEAKENED. The publish gate genuinely blocks unexplained divergence, but
  the re-record path is unverified self-attestation, and under re-observation
  churn the tripwire degenerates to S1's check at production cost.
- #8: WEAKENED. Render-stage drops only; store-level loss is "explained."
- #9: UNPROVEN as specified. No conflict node type exists; the test's required
  fixture cannot be built from named inputs.

Strengthened acceptance bar: append-only, independently-signed baseline store
(the recorder must not be the generator); per-input sub-hashes with named
attribution in divergence errors; a named baseline-update ceremony distinct
from silent re-record (who approves, with what evidence); adopt F5 S1's
CONFLICTING classification as the marker representation before claiming #9.

---

## S3. Typed semantic render model with fail-closed gate

Claimed to prevent: #5 claim-binding, #6 visibility-error, #2 unsafe-url,
#4 supporting (GENERATED quarantine).

### Duplicate flag: this is the typed projection seam family claimed a fourth time

F4 S3 is not a new mechanism. Its three axes are each already claimed as a
surviving mechanism in another lane, at the same locus (the semantic render
model / projection seam, before framework markup), with the same fail-closed
discipline:

- Evidence axis: F5 S1 "Projection-seam binding verifier
  (verifyPresentationBinding)" operates over the semantic render model before
  framework markup, fail-closed per claim, with DIRECT_EVIDENCE /
  DERIVED_EVIDENCE / OWNER_ASSERTION / GENERATED_PRESENTATION bindings. Same
  locus, same per-node fail-closed, same binding classes. F5 S1 additionally
  covers #9 (CONFLICTING classification survives the seam), which F4 S3 does
  not.
- Visibility axis: F6 S1 "Positive-license projection gate (single enforcement
  chokepoint)" binds fields into public output only with a positive license and
  explicitly generalizes the same gate across claims (evidence license) and
  URLs (allowlist license). Same chokepoint idea, same generalization, cleaner
  statement (deny-by-default positive license).
- URL-safety axis: F2 Survivor 1 "Schema-typed trust with capability-specific
  allowlists" puts scheme capability, visibility classification, and evidence
  binding on the type ("trust metadata rides on the type, not on string
  conventions"). That sentence *is* F4 S3's three axes in one line, claimed in
  the F2 lane. F2 Survivor 2 "Sink-side validation at the render seam" is the
  same gate at the same seam.
- The same triple is claimed a fifth time in F1 S2 "Typed projection seam with
  capability contracts" (#2/#5/#6 via types; it even self-identifies convergence
  with F2 Survivor 1).

The coverage matrix already predicted this compression ("the library compresses
to roughly 5-6 real mechanisms: the typed projection seam family (A)"). F4 S3's
harvest note says it "generalized from one axis (evidence) to three," but that
generalization was already performed by F2 Survivor 1 and F6 S1. Counting F4 S3
as a distinct survivor inflates the library: one mechanism family, four to
five claimant names.

The only F4-specific residue is the GENERATED_PRESENTATION quarantine for #4:
excluding LLM copy from the canonical byte-compare surface with seed pinning.
That residue is assessed below.

### Attack on the residue: seed pinning contradicts provider reality

The mechanism both (a) excludes GENERATED nodes from the canonical hash surface
*because* LLM output is not byte-stable, and (b) requires "a fixed seed so even
they are reproducible," with a test that byte-compares GENERATED nodes across
two seeded runs. But seeded decoding is not byte-stable across model versions,
hardware, or providers (FAIL-4 open question 1). The test conflates "the
pipeline honored the seed" with "the provider returned identical bytes." The
first provider-side model update fails the mechanism's own test with no
pipeline bug present. And if seed pinning actually worked, exclusion from the
hash surface would be unnecessary; if exclusion is necessary, seed pinning is
unverified (S1's CI golden never covers the excluded surface, so a
seed-ignoring generator upgrade passes CI silently). The two halves of the
residue undermine each other. Strengthened: split into two separately tested
properties, (i) seed plumbing honored (mock LLM, deterministic given
seed+prompt: tests the pipeline, not the provider), (ii) provider byte-stability
explicitly NOT guaranteed, with the quarantine boundary as the enforced
property (GENERATED bytes never influence non-GENERATED hashes; assert by
mutating a GENERATED node and re-hashing).

### Attack: the gate does not own the typer

The gate fails closed on *typed* nodes. Nothing in the mechanism types them:
who assigns DIRECT_EVIDENCE vs INFERRED vs GENERATED_PRESENTATION, and who
assigns visibility classes to unlabeled source facts? If the classifier is
heuristic or LLM-assisted, the gate inherits exactly the unreliability it
claims to prevent; an unevidenced claim mistyped DIRECT_EVIDENCE sails through.
The S3 test feeds the gate a fixture with facts *already labeled* private and
URLs *already* hostile: it tests the gate, never the labeling. The hard cases
for #6 are unlabeled PII-shaped facts (a home address inside free-text "about"
copy, a personal cell in a notes field) and for #5 are plausible-but-unbound
claims the typer blesses. A gate over trusted labels is a tautology; the
typing authority is the actual mechanism, and it is undeclared (this is also
an S1 boundary hole: the claim-store/binding-resolver version is not in the
declared tuple). Note F6 S2 ("visibility as canonical schema attribute with
deny-by-default") at least names the default that makes the typer safe; F4 S3
assumes labels exist.

### Attack: composition with S2 silently degrades sites while every light stays green

S3 fails closed *per node*: an unsupported claim is dropped with a logged
reason. Consider a source re-dump that loses the evidence behind a key claim
(the Step 7 mirror image). The gate drops the node. Output changes; graph
changed; S2 calls it explained and re-records. The site is now missing content
it had yesterday, the owner was not consulted, and all four F4 mechanisms
report healthy: S1 (inputs changed, explained), S2 (explained, re-recorded),
S3 (failed closed per spec), S4 (IDs stable). None of the four checks
*monotonic content preservation* across legitimate input changes. Fail-closed
per node plus explained-divergence acceptance equals silent degradation as an
emergent property of the composed system. This is not caught by any survivor's
test.

### S3 verdict: DUPLICATE (family A), residue WEAKENED

- As a distinct F4 survivor: DUPLICATE of the typed projection seam family
  (F1 S2, F2 S1/S2, F5 S1, F6 S1). Its #5/#6/#2 coverage is already owned;
  triple-claiming inflates the library. Recommended canonical owner: F5 S1
  (names the actual module, verifyPresentationBinding, pure function, existing
  code) for the evidence axis, F6 S1 for the positive-license chokepoint
  statement; F4 S3 folds.
- The F4-specific residue (GENERATED quarantine + seed pinning): WEAKENED by
  the seed/provider contradiction; needs the split-property reformulation.
- Independent of duplication, the gate-level claims (#5/#6/#2 *given correct
  types*) are sound but rest on an undeclared typing authority; the mechanism
  prevents type violations, not misclassification.

---

## S4. Content-derived identity

Claimed to prevent: #4 fixture-drift, #8 correction-loss.

### Attack 1: the example coordinates contradict the mechanism's own test

The mechanism specifies `id = hash(canonical(parent coordinates))` with
examples `(siteSpecHash, objectPath, index)` and `(graphDigest, relationship,
role)`. Its falsifiable test then demands: change several source field values
(phone, hours) without changing object identity, re-run, and the ID list must
be *identical* to run 1.

But siteSpecHash and graphDigest are digests *of content including values*.
Step 7's re-dump (phone changed) necessarily changes graphDigest. Under the
example coordinates, every ID derived with (graphDigest, ...) changes on a
value-only re-observation, failing the mechanism's own test. The coordinate
schema conflates identity coordinates with value digests. The mechanism does
not define the identity-vs-value separation its test requires; the examples
given actively violate it. Until the coordinate schema is fixed to
identity-only coordinates (stable entity keys, never content digests of
mutable values), the #8 claim is unproven on the mechanism's own terms.

### Attack 2: positional coordinates break on structural re-observation (the realistic case)

The test mutates *values only* and explicitly avoids structural change ("WITHOUT
changing object identity (same entities, same relationships)"). Real
re-observation is structural: a service added at the top of the list, a service
removed, two locations merged, one location split. Under `(objectPath, index)`
coordinates, inserting one service at position 0 shifts every sibling's index;
all sibling IDs change; every owner correction keyed by those IDs orphans.
That is the exact #8 failure the mechanism claims to prevent, triggered by the
most ordinary business change (adding a service). Merge/split has no continuity
rule at all: the merged entity gets a fresh ID, corrections on the old IDs
die silently. Strengthened test, trial 4: structural mutations (insert at
head, delete from middle, reorder, merge two objects, split one), asserting ID
stability for entities whose identity did not change and explicit
continuity/orphan records for entities that merged or split.

### Attack 3: cross-tenant collisions and unscoped correction keys

The mechanism names no tenant/site namespace in the coordinates and no key
scope for the owner store. `(objectPath, index)` for two #7 clone-sitespecs
with identical content (same franchise template, same services) mints
identical object IDs, unless siteSpecHash differs, and siteSpecHash differs
only if content differs. Two tenants with byte-identical template content get
identical derived IDs. If the owner store is keyed by bare object ID, tenant
A's correction applies to tenant B's site. This is a cross-tenant confusion
vector built from the mechanism's own determinism: content-derived identity
without a tenant namespace is *designed* to collide across tenants with
identical content. (F6 S3 "trusted-context tenant enforcement" owns the
tenant-scoping invariant; S4 does not reference it.) Strengthened test, trial
5: two tenants, identical content, assert ID namespaces do not collide or
assert the store key provably includes tenant scope; a correction written for
tenant A must be unresolvable for tenant B.

Also unexamined: hash width and collision policy. Fixture IDs show 16 hex chars
(64-bit). At 64 bits the birthday bound is comfortable for realistic scale, but
the mechanism never names the width, the hash function, or what happens on
collision (fail closed? disambiguate with a counter, which reintroduces
order-dependence?). An unspecified collision policy is a latent nondeterminism
source in a mechanism whose entire job is determinism.

### Attack 4: what "identity" means is undefined for derived entities

Section IDs, task/step IDs, idempotency keys are all swept into "every
generated ID." But a section's identity across a spec rewrite, or a step's
identity across pipeline-version changes, has no defined continuity rule. The
test collects "the full ordered ID list" and compares, which only proves
stability under no-op reruns, the weakest possible property. The mechanism
needs a per-entity-kind identity specification (what coordinates constitute
identity for an object vs a section vs a relationship), which does not exist.

### S4 verdict: WEAKENED (split)

- #4: WITHSTANDS. Derived IDs genuinely reproduce under identical inputs;
  there is no random UUID minting in the render path (finding 6). Random-ID
  drift, the claimed #4 source, is prevented.
- #8: WEAKENED. Holds only under a coordinate schema the mechanism does not
  specify; the example coordinates violate the mechanism's own test on
  value-only re-observation, positional coordinates break on structural
  re-observation, merge/split has no continuity rule, and cross-tenant
  namespacing is absent.

Strengthened acceptance bar: publish the per-kind coordinate schema with the
identity-vs-value separation made explicit (identity coordinates must be
provably invariant under value mutation; prove it with the value-mutation
trial); add structural-mutation and two-tenant trials; name hash width,
function, tenant namespace, and collision policy.

---

## Cross-survivor composition gaps (no single survivor's test catches these)

1. **Silent degradation via S3 + S2.** Documented in the S3 attack section:
   per-node fail-closed removal under a changed graph is "explained"
   divergence; the tripwire re-records; content disappears with all lights
   green. Missing mechanism: monotonic content-preservation assertion across
   legitimate input changes (compare old vs new output section inventories;
   removed sections require an explicit removal record, not just a changed
   inputHash).
2. **One rubber stamp defeats both drift mechanisms.** S1's golden re-bless
   path and S2's re-record path are the same human convention in two places:
   an authorized human approves a new baseline. A rubber-stamp approval (the
   failure FAIL-4 open question 6 names) launders drift through S1 and S2
   simultaneously. The two mechanisms are not independent; they share a single
   point of failure, so their combined assurance is not the sum of their
   individual claims.
3. **S1's test asserts what S1 cannot enforce** (silently-ignored inputs), and
   **S2's test asserts what S2 does not build** (per-input attribution). In both
   cases the falsifiable test is stronger than the mechanism, which means
   passing the test as a one-off exercise would not transfer the property to
   the CI/production implementation.

## Duplicate registry

| Claimant | Mechanism | Family | Standing |
|---|---|---|---|
| F1 S2 | Typed projection seam with capability contracts | A (typed seam) | earlier, self-notes convergence with F2 S1 |
| F2 S1 | Schema-typed trust with capability-specific allowlists | A | earlier; the triple-axis sentence |
| F2 S2 | Sink-side validation at the render seam | A | earlier; same seam, same triple |
| F5 S1 | Projection-seam binding verifier | A | earlier; names real module, adds #9 |
| F6 S1 | Positive-license projection gate | A | earlier; cleanest chokepoint statement |
| F4 S3 | Typed semantic render model with fail-closed gate | A | DUPLICATE; fold into family A |
| F1 S3 | Canonical pure projection | purity | earlier; same #4/#8 purity argument as F4 S1 |
| F4 S1 | Declared-input purity | purity | overlaps F1 S3; adds hashing/goldens (also overlaps F1 S1 determinism assertion, F3 fixture registry) |
| F1 S1 | Post-generation empirical oracle (determinism assertion) | measure-and-compare | earlier; same regen-and-compare as F4 S2's tripwire |
| F4 S2 | Replay-mismatch tripwire | measure-and-compare | publish-gate deployment variant of F1 S1's assertion |

Net: F4 contributes one genuinely new element (the GENERATED quarantine
residue of S3, weakened as shown) and deployment-point variants of existing
mechanisms (CI goldens, publish gate). It does not contribute a new prevention
mechanism for #5/#6/#2, and its #7 claim is empty.

## Verdict summary

- **S1 declared-input purity: WEAKENED.** #7 claim FALLS (undefined detector,
  untested, observation claimed as prevention). #4 and #8 weakened: tuple
  incomplete at the code-flagged gaps (`renderer.tsx@unversioned`,
  `tokens@unversioned`, no prompt/model/tzdata versions), test is
  machine-scoped, recovery is re-bless by convention, value corrections live
  upstream of the tuple.
- **S2 replay-mismatch tripwire: WEAKENED.** #9 UNPROVEN as specified (no
  conflict type; required fixture unbuildable from named inputs). #4/#8
  weakened: re-record is unverified self-attestation, churn degenerates it to
  S1 at production cost, store-level correction loss is "explained."
- **S3 typed semantic render model: DUPLICATE.** Fourth/fifth claimant of the
  typed projection seam family (F1 S2, F2 S1/S2, F5 S1, F6 S1); fold it. Its
  only F4-specific residue, the GENERATED quarantine with seed pinning, is
  WEAKENED by the seed/provider byte-stability contradiction.
- **S4 content-derived identity: WEAKENED (split).** #4 WITHSTANDS (no random
  IDs in the path; derivation reproduces). #8 WEAKENED: example coordinates
  contradict the mechanism's own test, positional coordinates break on
  structural re-observation, no merge/split continuity rule, no tenant
  namespace (cross-tenant collision by design for identical content).

Strongest single falsifier across the lane: `RENDERER_VERSION =
"renderer.tsx@unversioned"` in the very file S1 cites. The flagship declared
input of the purity mechanism is a hardcoded constant. Until the renderer is
really versioned, S1's purity claim is purity over a tuple whose most
drift-prone member is undeclared.
