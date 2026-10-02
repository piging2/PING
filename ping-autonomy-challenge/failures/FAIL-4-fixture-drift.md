# FAIL-4: FIXTURE DRIFT

Failure class #4 of the 9 real FYD failure classes (Nolan, 2026-09-23).
Research only. No implementation code.

Definition: regeneration (same object graph in, site out) silently produces
different output. Drift sources: nondeterministic ordering, wall-clock reads
in the render path, random IDs, LLM-generated copy varying between runs,
renderer code changing between runs without being declared.

General shape: a pipeline stage that is not a pure function of its declared
inputs.

---

## (a) Grounding: real FYD instances

1. **STEP-01 regeneration record (2026-09-23).**
   `~/workspace/fyd/product-lane/STEP-01-REGENERATION.md`. Both demo sites
   regenerated from the current canonical projections. `generateSiteSpec`
   was run TWICE per site and the digests were identical:
   happy-place specDigest `d302ab17e261b0d60146f78a86bbe71cdc0bf44e2fc73fbf5af3337dba6744e6`
   (run1 == run2); coppersmith-plumbing specDigest
   `eb78eb023a2efec1d7df555d6038b61eb11c266b5d170442a3a5a95ede32d8ee`
   (run1 == run2). `deterministic: YES`. Input verification was sha256 over
   canonical JSON compared against `meta.graphDigest`. This is the actual
   fixture-drift detection machinery FYD already runs: run twice, byte-compare,
   drift is visible.

2. **The regen harness (`~/workspace/fyd/product-lane/regen/step1-regen.ts`).**
   Deterministic ordering is a deliberate, visible mechanism: the
   `resolveQuery` mirror sorts results explicitly
   (`out.sort((a, b) => ...)` on id, and on updatedAt with id tiebreak).
   Someone already fought the iteration-order drift source here.

3. **Semantic determinism doctrine (memory/2026-09-23.md#L470).**
   "Semantic determinism vs incidental markup determinism; canonical tests
   hash the semantic render model; canonical contract
   render(graph, siteSpec, ownerOverrides, viewerContextClass, rendererVersion)
   -> SemanticRenderModel." Note that rendererVersion is already listed as a
   declared input. Claim bindings resolve to
   DIRECT_EVIDENCE / DERIVED_EVIDENCE / OWNER_ASSERTION / GENERATED_PRESENTATION;
   "generated presentation may transform supported facts, never manufacture
   predicates (the '24/7 Emergency Plumbing' rule)". Confidence is a class,
   not a number: OBSERVED / OWNER_ASSERTED / SIGNED / VERIFIED_BY_AUTHORITY /
   DERIVED / INFERRED / GENERATED. The binding verifier operates over the
   semantic render model BEFORE framework markup and fails closed for the
   unsupported claim only.

4. **Step 7: correction survives regeneration (2026-09-23).**
   `~/workspace/fyd/product-lane/STEP-07-CORRECTION-SURVIVES-REGEN.md`.
   A source re-dump was simulated (phone changed to `+15419998888`); the owner
   store was never touched and the owner correction (`+1 541 555 0147`)
   stayed effective. Source / override / effective presentation are three
   distinct values, never collapsed. This is fixture drift's mirror image:
   drift was prevented by keeping inputs declared and separated. A defect was
   found and fixed generically: the drift warning said "source now says
   something different" without saying WHAT, because composition destroyed the
   current source value; `OwnerFieldCorrection` gained `currentSourceValue`
   as a read-model derivation. Lesson: drift detection needs the BOTH values,
   not just a flag.

5. **Golden fixtures exist.**
   `src/fyd/object/__tests__/fixtures/projections/*.json` are canonical
   projections used as test fixtures; object suite 182/182 (per STEP-07).

6. **SOUL.md section 10: determinism as a product feature.**
   "Same causal history should produce: same replay ordering -> same execution
   -> same canonical state -> same canonical bytes -> same hash -> same witness."

7. **Negative finding.** A full-workspace grep for "fixture drift" /
   "fixture-drift" / "fixture_drift" returned zero hits. Nolan named the class;
   the phenomenon is currently guarded by digest comparisons and the
   run-twice spec digest check, not by a named invariant. The gap between the
   guard (run twice, compare) and the class (a general drift-proof pipeline)
   is what the mechanisms below close.

8. **Determinism probe test (found 2026-09-23, post-report grounding pass).**
   `src/fyd/sitespec/__tests__/determinism-probe.ts` in the product-lane
   repo: builds the semantic render model through the real render path and
   writes the canonical model encoding; the determinism test spawns TWO
   SEPARATE PROCESSES running the probe and compares outputs byte-for-byte.
   The declared input tuple is
   { spec, graph, viewer, asOf, designTokenVersion?, ownerOverrides? }.
   Note `asOf`: the wall clock is passed in as a DECLARED INPUT rather than
   read ambiently, which is exactly the S1 prescription below. Related files:
   `src/fyd/sitespec/render-model.ts`,
   `__tests__/render-model.test.ts`, `__tests__/verified-render-model.test.ts`.

Open drift sources observed in the current pipeline: object/relationship
iteration order (partially mitigated by explicit sorts), wall-clock reads,
random UUIDs in generated artifacts, LLM copy variance
(`src/lib/ping/ask-composer` exists in the path), renderer code changing
between runs.

---

## (b) Surviving mechanisms

Hard rule applied: each survivor prevents at least 2 of the 9 classes, with
a crisp reason per class. Wave-1 harvest sources cited per mechanism.

---

### S1. Declared-input purity: pure render contract + canonical serialization + content hashing + golden byte-compare in CI

How it works: the render stage is a pure function of an explicitly enumerated
input tuple. FYD already names the tuple:
render(graph, siteSpec, ownerOverrides, viewerContextClass, rendererVersion)
-> SemanticRenderModel. Every input is canonically serialized (sorted keys,
sorted iteration, no map-order dependence) and hashed: inputHash =
sha256(canonical(inputs)). The output is canonically serialized and hashed:
outputHash = sha256(canonical(output)). CI keeps golden fixtures of
(inputHash -> outputBytes). Regeneration re-runs and byte-compares. Any
difference with identical inputHash is drift and fails the build. Any output
change must be traceable to a declared input change (new graphDigest, new
rendererVersion, new ownerOverrides). No wall clock, no RNG, no ambient
config in the render path; anything the render legitimately needs (a build
timestamp, a nonce) is passed in as a declared input or recorded once and
reused.

Harvest: LANE-4 M-1 (deterministic replay: same code + same history -> same
commands, same state; state is a pure fold) supplies the purity discipline;
LANE-4 M-3 (sandbox interdiction of wall-clock/RNG/I-O in orchestration
code, with blessed deterministic facades) supplies the enforcement layer;
LANE-4 M-14 (version markers; code change is a branch selected by history,
not by deploy time) supplies the rendererVersion-as-declared-input treatment.

Prevents:

- **#4 fixture-drift.** Direct: drift is defined as output change under
  identical inputHash, and the byte-compare makes it a build failure instead
  of a silent difference. Undeclared inputs cannot hide because the hash
  closes over the full declared tuple.
- **#8 correction-loss.** Owner corrections are declared inputs
  (ownerOverrides), not ambient state. A regen that drops a correction
  produces different output bytes under an identical input tuple, which is
  drift by definition, so the golden byte-compare trips. Step 7 already
  proves the separation (owner store untouched by re-dump); this mechanism
  turns that separation into a checked invariant.
- **#7 clone-sitespecs.** Two different graphs carry different inputHashes.
  If they produce byte-identical (or structurally identical) output, the
  (inputHash, outputHash) pairing makes the convergence observable: divergent
  inputs mapping to convergent outputs is flagged as a collapse suspect
  instead of passing silently.

Falsifiable test:
Input: the two fixture projections
(`src/fyd/object/__tests__/fixtures/projections/happy-place.json`,
`coppersmith-plumbing.json`) plus a fixed rendererVersion.
Procedure: (1) run the render pipeline 5 times while adversarially varying
the environment between runs: shuffle object key order in the parsed JSON,
monkeypatch Date.now to return different values, seed Math.random
differently, run with TZ=UTC and TZ=Pacific/Auckland; (2) byte-compare all 5
outputs and their outputHashes; (3) then change exactly one declared input
(ownerOverrides: hide one service) and re-run once.
Expected observable outcome: all 5 outputs byte-identical with identical
outputHash; the single changed input produces a different outputHash and a
diff confined to the hidden service's sections.
What proves the mechanism DOESN'T work: any byte difference across the 5
environment-varied runs with identical inputs (an undeclared input leaked
in), OR identical output bytes after the ownerOverrides change (a declared
input was silently ignored, which is also drift).

---

### S2. Replay-mismatch tripwire: regen re-derives and byte-compares against the recorded output; divergence is a hard failure

How it works: distinct from S1's prevention-by-construction. S2 is
detection-at-regen. Every published site stores (inputHash, outputBytes,
outputHash) from its last good generation. Every regeneration re-derives the
output from the current declared inputs and compares against the recorded
output BEFORE serving or publishing. Any divergence that is not explained by
a declared input change halts the publish with a named divergence error and
keeps serving the last good output. Never silently merge, never auto-resolve.
This is the production-gate version of STEP-01's "run twice, compare", made
persistent and blocking.

Harvest: LANE-4 M-2 (Temporal's `matchReplayWithHistory`: any divergence
between what the code would do now and what history says it did is a hard
failure, never a silent merge; mismatch fails the task, the workflow stalls
until reconciled). LANE-7 M5 (version watermarks: channel_versions +
versions_seen) supplies the "what did we last agree on" record shape.

Prevents:

- **#4 fixture-drift.** Direct: silent drift cannot reach production because
  the publish gate byte-compares regen output against the recorded output.
  Drift either explains itself (inputHash changed) or blocks the deploy.
- **#8 correction-loss.** A regen that silently drops an owner correction
  diverges from the recorded corrected output under the same declared inputs,
  so the tripwire fires. Correction loss IS drift (same inputs, different
  output); the tripwire catches it by construction without needing a
  correction-specific check.
- **#9 conflict-collapse.** Contradictory sources preserved as an explicit
  conflict marker in the recorded output. A regen that collapses the conflict
  to one side (picks a winner silently) diverges from the recorded
  conflict-preserving output, so the tripwire fires. Collapse is an
  undeclared state change; the tripwire fires on any undeclared change,
  including silent conflict resolution.

Falsifiable test:
Input: fixture projection + recorded (inputHash0, outputBytes0, outputHash0)
from a clean generation, where the fixture contains one owner correction and
one explicitly marked source conflict.
Procedure: (1) mutate the pipeline (not the inputs) in three separate trials:
(a) drop ownerOverrides from the render call, (b) resolve the conflict marker
to the first source's value, (c) reorder two sections; (2) run regen through
the publish gate each time.
Expected observable outcome: all three trials halt with a named divergence
error identifying the differing region; the served site remains outputBytes0;
the gate log records inputHash unchanged in all three trials.
What proves the mechanism DOESN'T work: any trial publishes or serves the
diverged bytes without a halt (silent merge), OR a trial halts when inputs
were legitimately changed and the gate cannot name which input changed
(the tripwire must distinguish explained vs unexplained divergence, otherwise
it blocks legitimate regeneration).

---

### S3. Typed semantic render model with fail-closed gate: every node carries evidence, visibility, and URL-safety types; the renderer emits only gated nodes

How it works: the semantic render model (the layer FYD already hashes for
canonical tests) types every node along three axes before framework markup
exists: evidence binding (DIRECT_EVIDENCE / DERIVED_EVIDENCE /
OWNER_ASSERTION / GENERATED_PRESENTATION), visibility class
(public / private), and URL safety (allowlisted scheme+host or BLOCKED).
A verification pass walks the model; any node that fails its axis fails
closed for that node only (unsupported claim dropped with a logged reason,
private fact redacted, unsafe URL replaced with a safe placeholder), and the
failure is recorded in the build evidence. LLM-generated copy is confined to
GENERATED_PRESENTATION-typed nodes, which are excluded from the canonical
byte-compare surface (their variance cannot contaminate fixture equality)
and must carry a fixed seed so even they are reproducible.

Harvest: the binding-verifier doctrine from FYD itself (memory/2026-09-23
L470: verifier operates over the semantic render model before framework
markup, fail closed for the unsupported claim only) generalized from one
axis (evidence) to three (evidence, visibility, URL safety); LANE-14 M14
(structured extraction as the summary format, not free text) for the
"types before prose" discipline.

Prevents:

- **#5 claim-binding.** Every rendered factual claim must resolve to a
  binding class or it fails closed. An unevidenced claim cannot reach markup
  because markup is generated from the typed model, and untyped claims do not
  exist in the model.
- **#6 visibility-error.** Every claim carries a visibility class and the
  gate emits only public nodes. A private fact leaking into public render is
  a type error at the gate, not a data accident downstream.
- **#2 unsafe-url.** URL nodes carry a safety type computed at the
  projection seam (allowlist check); `javascript:` / `data:` URLs fail the
  type and are replaced before markup. The seam crossing is typed, so an
  unsafe URL cannot slip through string concatenation.
- **#4 fixture-drift (supporting).** GENERATED_PRESENTATION nodes are
  excluded from the canonical hash surface with seed pinning, so LLM copy
  variance is quarantined: it can vary inside its labeled region without
  breaking fixture equality for the deterministic sections. (Counts as a
  fourth; the mechanism clears the bar on #5 and #6 alone.)

Falsifiable test:
Input: a fixture graph containing (a) a factual claim with no evidence
behind it, (b) a private fact (visibility=private) about the owner, (c) a
`javascript:alert(1)` URL on a link object, (d) a set of fully evidenced
public claims, (e) an LLM-generated paragraph with seed 42.
Procedure: (1) run the render through the typed gate; (2) inspect the emitted
markup and the gate's failure log; (3) re-run with seed 42 and byte-compare
the GENERATED nodes.
Expected observable outcome: the unevidenced claim is absent from markup and
named in the log with reason UNSUPPORTED_CLAIM; the private fact is absent,
logged as VISIBILITY_BLOCKED; the javascript: URL is absent or replaced with
a safe placeholder, logged as URL_BLOCKED; all evidenced public claims
render; the GENERATED paragraph is byte-identical across both runs.
What proves the mechanism DOESN'T work: any of (a), (b), or (c) appears in
the emitted markup in any form (under-gating); OR the GENERATED paragraph
differs between the two seeded runs (seed not honored, quarantine leaking
into determinism).

---

### S4. Content-derived identity: every generated ID is a hash of canonical coordinates, never a random UUID

How it works: any ID the pipeline mints (object IDs, section IDs, task/step
IDs, idempotency keys) is derived as
id = hash(canonical(parent coordinates)) e.g.
(siteSpecHash, objectPath, index) or (graphDigest, relationship, role).
Same logical entity across regen, re-observation, crash, or resume gets the
same ID. No `uuidv4()` anywhere in the generation path. STEP-01 already
shows this shape in the wild: object IDs like
`website-service-51de038c1defe8bd` and
`website-business-2f1327c09d622175-person-377048d67856` are content-derived.

Harvest: LANE-7 M6 (deterministic task IDs:
task_id = xxh3_128(checkpoint_id || namespace || step || node || triggers);
same input coordinates give the same id across processes and crashes; this
is the idempotency key that lets persisted writes match regenerated tasks).
LANE-4 M-13 (SideEffect record-once) is the complement for the rare value
that cannot be derived: record it once under its derived name and reuse.

Prevents:

- **#4 fixture-drift.** Random UUIDs are the purest drift source: identical
  inputs producing different bytes. Derived IDs reproduce exactly on regen,
  so ID-bearing output (links, anchors, correction keys) is byte-stable.
- **#8 correction-loss.** Owner corrections in the owner store are keyed by
  object ID. If regen minted fresh random UUIDs, every correction would point
  at a dead ID after re-observation and be silently orphaned, which reads as
  "correction lost." Stable derived IDs keep the correction binding alive
  across re-dumps. (Step 7's simulated re-dump only proved this because IDs
  were stable; random IDs would have broken it.)

Falsifiable test:
Input: the coppersmith-plumbing fixture projection.
Procedure: (1) run generation twice and collect the full ordered ID list from
both outputs; (2) simulate re-observation: change several source field
values (phone, hours) WITHOUT changing object identity (same entities, same
relationships), re-run, collect the ID list; (3) grep the entire generation
code path for random UUID minting (uuidv4 / randomUUID / Math.random used
for IDs).
Expected observable outcome: run 1 and run 2 ID lists byte-identical;
post-re-observation ID list identical to run 1 (values changed, identities
did not); zero random ID minting in the generation path.
What proves the mechanism DOESN'T work: any ID differs between runs 1 and 2
(randomness in the path), OR any ID changes after value-only re-observation
(identity conflated with mutable values, which orphans owner-store bindings),
OR a random UUID call exists anywhere in the generation path.

---

## (c) Cut list

Candidates that did not clear the hard rule (must prevent >= 2 of the 9).
Each cut keeps a one-line reason; several are folded into survivors as
implementation detail rather than standalone mechanisms.

- **Sandbox nondeterminism interdiction alone (LANE-4 M-3).** Single class:
  it only hardens #4. Cut as standalone; folded into S1 as the enforcement
  layer (lint/gate the render path for wall-clock/RNG/ambient I-O).
- **Record-once SideEffect for legitimate nondeterminism (LANE-4 M-13).**
  Single class: it only quarantines #4's edge cases (build timestamps,
  nonces). Cut as standalone; folded into S1 (a recorded value is just a
  declared input) and S4 (record under a derived name).
- **Cache memoization of deterministic steps (LANE-7 M15).** Prevents none
  of the 9; it is a performance optimization, and a wrongly keyed cache is
  itself a drift SOURCE (stale reuse). Cut.
- **Idempotency keys for effects (LANE-12 M1/M2).** Prevents duplicate
  side-effect application, which is not one of the 9; correction double-apply
  is a different failure than correction loss. Cut.
- **Version/patch markers for code evolution (LANE-4 M-14) as standalone.**
  Governs deploy-time semantics for in-flight runs, not render determinism;
  its portable value (rendererVersion as a declared input) is folded into
  S1. Cut as standalone.
- **URL allowlist at the seam alone (without the typed model).** Single
  class (#2). Cut as standalone; folded into S3 where URL safety is one axis
  of the same gate that also covers #5 and #6.
- **Mobile-overflow viewport fixture test (render at 320px, assert no
  horizontal overflow).** Single class (#1). Legitimate test, not a
  multi-class mechanism. Cut.
- **Graph-blindness extraction completeness check (reconcile @graph entity
  count against extracted objects).** Single class (#3). Legitimate check,
  not a multi-class mechanism. Cut.
- **Interrupt / human-in-the-loop resume machinery (LANE-7 M7/M8).**
  Irrelevant to the 9; governs pausing, not determinism. Cut.
- **Saga / compensation patterns (LANE-12 M8/M9).** Govern multi-step
  effect rollback; none of the 9 is a partial-effect problem. Cut.
- **"Just run it twice" as the whole strategy.** This is STEP-01's current
  guard and it detects drift without preventing it; S1+S2 are what make
  run-twice a verification instead of a hope. Cut as a mechanism (kept as a
  test inside S1).

---

## (d) Open questions

1. **LLM copy byte-stability.** S3 quarantines GENERATED nodes with seed
   pinning, but seeded decoding is not byte-stable across model versions,
   hardware, or provider changes. Is the honest contract "seed-pinned and
   versioned (model id is a declared input), byte-compare only within the
   same model version," or should GENERATED regions be compared semantically
   (embedding similarity) rather than by bytes?

2. **Semantic vs byte equality for markup.** S1 byte-compares the canonical
   semantic render model, but FYD also ships framework markup. Attribute
   order, whitespace, and hydration IDs in markup can differ while the
   semantic model is identical. Where exactly is the byte-compare boundary,
   and who owns proving the markup serializer is itself deterministic?

3. **rendererVersion granularity.** S1 declares rendererVersion as an input,
   which means every renderer deploy changes the inputHash and invalidates
   golden fixtures. What is the versioning unit that keeps fixtures useful:
   per-component, per-pipeline, content-hash of the renderer bundle?

4. **viewerContextClass vs determinism.** The render contract includes
   viewerContextClass (personalization axis). Same class must give same
   output, but how many classes exist and who enumerates them? An unbounded
   class set makes golden fixtures unbounded too.

5. **Conflict representation standard.** S2's tripwire preserves conflict
   markers, but FYD has no canonical conflict node type yet (STEP-07 has a
   source-drift warning, which is adjacent but not the same as two live
   contradictory sources). What is the typed shape of "sources disagree" in
   the semantic render model?

6. **Who owns the golden fixtures and their rotation.** S1's CI byte-compare
   needs an owner for intentional output changes (new feature changes markup
   legitimately): who approves golden updates, and what stops a rubber-stamp
   update from laundering real drift?

7. **Cost of byte-compare at scale.** S2 stores (inputHash, outputBytes,
   outputHash) per site per generation. For hundreds of tenant sites
   regenerating on every source re-observation, what is the retention and
   comparison budget, and does the gate compare full bytes or a Merkle
   structure over sections?

8. **Clock-dependent legitimate content.** "Open now" badges, "generated on"
   footers, and hours-relative copy need the wall clock. S1's answer is
   "pass it as a declared input or record once," but a site that says "open
   now" is intentionally non-deterministic across time. Is time-varying
   content a fourth node type (like GENERATED) with explicit freshness
   semantics, or is it banned from the deterministic surface?
