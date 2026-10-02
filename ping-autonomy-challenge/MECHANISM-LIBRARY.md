# MECHANISM LIBRARY: general mechanisms that would have prevented real FYD failure classes

**Status: FINAL. Date: 2026-09-24 (UTC). Mode: research only, no implementation code, no em dashes used.**

**Mission.** Take real FYD failure classes and find general mechanisms that would have prevented them. A mechanism survives only if it prevents at least two of the nine listed classes. Every survivor carries a falsifiable test (input, procedure, expected observable outcome, what proves it broken). Single-class mechanisms were cut. This library reports post-falsification strength, not original lane claims. Tests are analytical specifications; none is claimed to have run unless execution evidence is cited.

**Gate decision (GATE-REVIEW.md): KEEP ABSOLUTE.** No class has zero survivor coverage after falsification, so no single-class cut is the only known prevention for any class. Three cuts were judged actively harmful to admit: freezing the source (guarantees stale claims), owner-wins-always (guarantees #9 with flipped polarity), copy similarity (fails its own clone-SiteSpec class). Useful single-class infrastructure is shelved as defense-in-depth (section 2d), not admitted as survivors.

**Corpus read for this synthesis:** FAIL-1 through FAIL-9 reports; FAIL-1, FAIL-2, FAIL-3, FAIL-4, FAIL-5, FAIL-6, FAIL-7, FAIL-8, FAIL-9 falsifications; MERGED-typed-seam, MERGED-oracle, MERGED-correction, MERGED-conflict falsifications; CUT-LOG.md, SURVIVOR-ROSTER.md, COVERAGE-MATRIX.md, DELETE-OUR-NEED.md, ASK-FYD-SEAM-AUDIT.md, BIGGEST-UNCERTAINTY.md, CONTRADICTION-RESOLUTIONS.md, TENSION-RESOLUTIONS.md, ARCHAEOLOGY-SUPPLEMENT.md, INVARIANT-7-ADJUDICATION.md, WAVE1-SURVIVOR-handoff-contract.md, harvest-index/MECHANISM-INDEX.md. LANE-16-github-intelligence.md was restored 2026-09-24 UTC after an off-brief overwrite and reverified against the 12-item inventory; nothing below cites unverified Lane 16 material.

**Constitutional boundary (recorded before synthesis).** The 24-hour constitutional convergence sprint owns identity, event, observation, evidence, object, intent, capability, transition, projection, replay, witness, and lineage authorities. Where a mechanism below needs a named canonicalization, identity, normalization, or minting authority it cannot itself construct, the need is recorded as a dependency on the sprint or convergence wave, not specified or built here.

**PING archaeology note (ARCHAEOLOGY-SUPPLEMENT.md).** Lane 19 classifications used below. LIVE strengths that matter to this library: durable ping_events with content-addressed event IDs and dedup on re-ingest, deterministic mission identity, replay convergence (EVAL-007), atomic claim, emission-gated completion, retry/backoff with dead letter, worker supervision, evidence/witness failure honesty. These are the strongest existing substrate for the replay family (M5) and for claim-binding freshness (M1/M6). PHANTOM: canonical run identity and attempt identity. Do not assume a Mission to Run to Execution history exists; anchor replays to mission_id, which is LIVE.

---

# 1. Survivors

## M1. Typed projection seam with sink-side validation

**Merged from:** F1-S2, F2-S1/S2/S3, F4-S3 (DUPLICATE, folded; see below), F5-S1, F6-S1, F7-S3. Kept merged per the coverage matrix: the same seam, the same triple-axis statement.

**How it works.** Projection is a typed function from graph evidence to rendered artifacts. All URL, claim, visibility, and identity values are constructed through typed constructors; the render seam accepts only typed values and validates each at the sink (WHATWG URL parse against a scheme plus origin allowlist, visibility flag against the projection's license, claim binding against the evidence graph). Raw graph values are unnameable outside the gate module (F6 structural resolution), so bypasses are compile-time failures, not policy violations. Refusal is the default: an unbound, unsafe, or unlicensed value refuses rather than renders. Generated prose fragments are quarantined as GENERATED_PRESENTATION with mandatory claim bindings, and the binding verifier (F5-S1's named module) asserts the CONFLICTING classification survives into the render model.

**Prevented classes, one crisp reason each:**

- **#2 unsafe-url:** a javascript: source value cannot be constructed as a typed URL at the seam; every URL-bearing attribute is entity-decoded and WHATWG-parsed against the allowlist before it reaches a sink. (WEAKENED: inventoried static sinks only; Ask FYD's link renderer and tool-call arguments are not sink-validated, and per FAIL-2's falsification the #2 verdict upgrades to FALLS if the conversational seam is not sink-validated. No self-inventory escape: every sink must be enumerated or the type system's promise is "the sinks we remembered.")
- **#5 claim-binding:** the fragment-binding clause: a generated fragment with no binding at all is refused at the seam. (WEAKENED, narrowed by the F5 falsification: this is binding-presence enforcement, not semantic containment. A bound overstatement passes, e.g. a fragment claiming universal service guarantees bound to a drain-cleaning evidence record. The citation is enforced; the entailment is not.)
- **#6 visibility-error:** a typed visibility flag gates every emission channel, and the Pergola-shaped payload leak dies because serialized client payloads are a typed sink that cannot emit PRIVATE-typed objects to a public projection. (WEAKENED: types enforce the classification faithfully, including a wrong one; marking authority is M8's load-bearing gap.)
- **#8 correction-loss:** typed correction bindings: a correction is a typed event that binds to the field it overrides under stable authenticated minting, so regeneration cannot silently drop it. (WEAKENED: requires the minting authority and anchor stability named in open questions 5 and 6.)

Dropped by falsification: **#1** (emergent compositional overflow is well-typed; the seam measures nothing). **#7** (differentiation is not a seam property; F1-S1's #7 claim fell). **#9** (a downstream transform that discards conflict markers breaks the seam's CONFLICTING guarantee; FAIL-5 falsification S1 attack A6).

**Falsifiable test (merged from the F2 adversarial suite and F6's strengthened test).** Input: a fixture business graph containing a hostile URL set (javascript:, data:, vbscript:, HTML-entity-smuggled variants such as &#106;avascript:, mixed-case, control characters), facts of mixed visibility including a private canary, generated prose fragments some lacking bindings, and a deliberately bypassed sink (a raw-graph-to-payload path). Procedure: project through the seam; attempt construction of each hostile URL; attempt emission of the private canary on every inventoried sink; submit unbound fragments; run the bypass path. Expected observable outcome: zero hostile URLs survive entity-decoding plus WHATWG parse to any sink; zero canary bytes in any public emission; every unbound fragment refused with a named reason; the bypass path is a compile-time failure or is caught by the adversarial suite (M10). What proves the mechanism DOESN'T work: any hostile URL reaching a sink; any canary byte in a public emission; any unbound factual fragment rendered; any sink added without appearing in the construction-site inventory.

**Sources:** FAIL-1, FAIL-2, FAIL-4 (S3 as duplicate claimant, residue to M5), FAIL-5, FAIL-6, FAIL-7; MERGED-typed-seam-falsification. Wave-1 corroboration: LANE-18's FYD-BAR-001 render discipline and the locked provenance vocabulary.

**Verdict: WEAKENED, static-projection scoped.** The seam is the library's strongest family and the most falsification-tested, but every claim above is a static-projection claim until the Ask FYD answer path is sink-validated. Conditional on the construction-site inventory and named minting authorities, which do not yet exist.

---

## M2. Independent empirical verification (viewport oracles, receipts, pinned fixtures, independent parser comparisons, variance coupling, golden corrections)

**Merged from:** F1-S1, F3-S1 (fixture-pinning clause only), F3-S2 (extraction receipts), F3-S3 (quarantine routing for refusals), F4-S2 (publish-gate deployment of the oracle), F7-S1/S2 (variance-coupling invariant), F8-S3 (golden corrections). Kept merged per the coverage matrix: every member is measure-the-output-against-an-independent-expectation, and the falsifications all attack oracle independence, expectation rot, and gaming the metric, so they are one family.

**How it works.** Nothing about the generator's self-description is trusted. Rendered output is measured by an independent oracle: a real browser measures overflow at 320/360/375/390/430px (the FL-20260921-033 lesson: individually valid sections composed to 500-580px intrinsic width, which only measurement catches); extraction emits receipts (in-count, out-count, per-shape handling, dropped-with-reason) reconciled against the source; fixtures pin expected outputs and fail on drift; an independent parser re-extracts and compares; a variance oracle asserts that materially different input graphs produce non-identical output structures (the #7 coupling); golden owner corrections are asserted present after every regen. Auto-repair is forbidden: the oracle blocks and escalates, never silently fixes, because environment-dependent repair is undeclared drift wearing a lab coat (self-falsifying per the merged oracle falsification).

**Prevented classes, one crisp reason each:**

- **#1 mobile-overflow:** the viewport oracle measures the composed page at real widths, catching emergent compositional overflow that no per-component model predicts. (WEAKENED: static and load-time rendered overflow only. Runtime overflow from third-party widgets, owner CSS, interaction states, and several browser-specific cases are uncovered. The F1 falsification's strongest surviving slice is exactly this: measured, post-composition, block-and-escalate.)
- **#3 graph-blindness:** extraction receipts make seen-but-dropped candidates loud: a candidate observed but not projected is a named drop with a reason, and quarantined refusals (F3-S3) route to an owner-visible queue instead of vanishing. (WEAKENED: conditional on the independent parser actually being independent, which no fixture currently constructs; the fixture-pinning clause alone is green during refusal, because fixtures pin authoring-time output including bugs.)
- **#4 fixture-drift:** pinned fixtures plus recorded input/output hash triples fail the build on drift; the publish gate halts on unnamed divergence. (WEAKENED: expectations can rot or be re-blessed without cause; re-blessing needs its own audit.)
- **#7 clone-sitespecs:** the variance-coupling invariant asserts non-identical structures for materially different graphs. (WEAKENED: crude only. The F7 falsification showed variance metrics can be gamed with meaningless structural changes; only graph-explained variance counts, the calibration is unmechanized, and the median-business case is untested.)
- **#8 correction-loss:** golden corrections assert owner corrections survive regen. (WEAKENED: golden-covered fields only; this is an #8 instrument, not general drift prevention.)

**Falsifiable test (merged from F1-S1's oracle test and F3's receipt test).** Input: the two demo corpora that produced FL-20260921-033; a fixture graph with known extraction shapes including a hostile unknown shape; a pinned fixture set; two materially different business graphs. Procedure: render both corpora and measure overflow at all five widths; extract and reconcile receipts against the source; run the unknown shape; regen against pinned fixtures; run the variance oracle on the two graphs; remove one golden correction and regen. Expected observable outcome: zero horizontal overflow at 320px through 430px with the ancestor trace naming the offending node; receipts account for every source candidate as projected, dropped-with-reason, or quarantined; the unknown shape is quarantined, never silently dropped; pinned fixtures match byte-for-byte; the two graphs produce structurally different outputs with graph-explained variance; the removed correction fails loudly. What proves the mechanism DOESN'T work: any overflow the oracle misses; any candidate neither projected nor receipted; a green suite during a refusal; a re-blessed fixture with no recorded cause; structurally identical outputs for materially different graphs passing the variance gate; gaming injection (meaningless structural jitter) clearing the variance bar.

**Sources:** FAIL-1, FAIL-3, FAIL-4 (S2 as publish-gate deployment), FAIL-7, FAIL-8; MERGED-oracle-falsification. Real inputs: FL-20260921-033 (hero clipping at 375px), the Coppersmith @graph repair (0 facts to 38 facts across 7 nodes, one extractor path still blind).

**Verdict: WEAKENED.** The family's strength is that it measures reality; its weakness is that oracle independence is asserted more often than constructed (no lineage assertions, no positive controls, no frozen differential corpora anywhere in the corpus), expectations rot, and variance can be gamed. #1's coverage rests entirely on this entry.

---

## M3. Owner decisions as durable typed records (decision store, overlay reapplication, three-way regeneration, conflict clocks)

**Merged from:** F8-S1/S2/S4, F9-M4 (task lifecycle), F5-S3 (owner-assertion evidence records). Kept merged per the coverage matrix; the merged correction falsification attacks the family as one.

**How it works.** An owner decision is never a mutation of source data; it is a typed record in a separate decision store, minted through an authenticated channel, that the projection pipeline overlays onto source-derived content at composition time. Regeneration is a three-way merge: source truth, owner decisions, and the last composed output, so a source re-dump cannot silently overwrite a correction (STEP-06/07: corrected phone, confirmed email, hidden Pergola survived a simulated redump while emitting drift information). Conflicts between a source and an owner decision are preserved as records, not resolved by overwrite. Every decision and every conflict carries a clock: freshness, reconfirmation policy, and a staleness bound, because the merged correction falsification falsified the timeless reading outright (a 5-year-old correction applied against a true current source is staleness preservation, the mirror image of #8). Merge-time owner preference is an interim selection, never final resolution; the resolution lifecycle closes only through an owner action or a predeclared fallback. Owner-versus-owner disagreement gets an OWNER_DISPUTE typed event, never last-write-wins. The owner-absent regime gets a declared fallback adjudication policy with disclosure, not indefinite silent UNRESOLVED.

**Prevented classes, one crisp reason each:**

- **#8 correction-loss:** corrections live in a store the regeneration pipeline reads but cannot overwrite, so source redumps and re-acquisitions pass through the overlay instead of replacing it. (WEAKENED: proven in the stable-identity, single-owner, in-band regime of STEP-06/07; identity merge/split and anchor rot are load-bearing gaps.)
- **#9 conflict-collapse:** source-versus-owner disagreements are typed conflict records with a clock and a default, so neither side silently wins. (WEAKENED: the fallback default and the staleness bound are policy inputs nobody has set; without them this is permanent UNRESOLVED, which the falsification judged worse than a deterministic pick.)
- **#6 visibility-error:** a persisted hide decision (the Pergola case) is a durable typed record, so a re-crawl that re-discovers the private service re-applies the hide instead of re-publishing it. (WEAKENED: rests on the overlay being consulted on every read path; STEP-06's presentation-boundary hole is the counterexample.)
- **#5 claim-binding:** an authenticated owner assertion is a bound, top-tier evidence record, so owner-stated facts carry their binding by construction. (WEAKENED: owner identity and the minting channel are demo-grade; until named, the strongest evidence tier is mintable by anyone the pipeline trusts.)

**Falsifiable test (from F8-S1's strengthened test plus the correction-clock requirement).** Input: a fixture business with source fields; an owner correction entered through the authenticated override path; a conflicting newer source value; a second claimant submitting a contradictory correction; a simulated source redump; a clock advanced past the correction's freshness bound. Procedure: regenerate through the redump; submit the conflicting source; submit the second claimant's correction; advance the clock; inspect the decision store, the conflict records, the rendered output, and the task queue. Expected observable outcome: the owner correction survives the redump and the output names the overlay as its source; the source-versus-owner disagreement is a typed CONFLICT record with both values and a clock, not a silent overwrite; the second claimant produces an OWNER_DISPUTE record, not a replacement; the stale correction past its bound triggers reconfirmation or the declared fallback, never silent continued application. What proves the mechanism DOESN'T work: any redump that drops or inverts a correction without a conflict record; any owner-versus-owner overwrite without a dispute record; any correction applied past its bound with no reconfirmation event; any consumer that reads around the overlay (the STEP-06 hole restated).

**Sources:** FAIL-8, FAIL-9 (M4), FAIL-5 (S3); MERGED-correction-falsification; CONTRADICTION-RESOLUTIONS FLAG 1 (owner-wins narrowed to ties on owner-asserted fields with the loser surviving and a lifetime policy); TENSION-RESOLUTIONS R3 (interim selection vs resolution). Real inputs: STEP-06/07 correction survival; the Pergola hide case.

**Verdict: WEAKENED, regime-qualified.** Strongest in the engaged-owner, stable-identity regime. The falsification's load-bearing gaps are identity (merge/split/anchor rot, a constitutional identity dependency), the unnamed minting authority, and the unset clock policies. The timeless reading of this family is dead; the clocked reading survives.

---

## M4. Conflict as first-class evidence (typed CONFLICTING state, versioned priority policy, certainty attenuation, owner task sink)

**Merged from:** F9-M1/M2/M3/M4, F5-S1 (partial), F3-S3 (partial), LANE-14 handoff contract (wave-1 survivor: status vocabulary with CONFLICTING, digest-mismatch STALE rule; FAIL-9's corroboration). The merged conflict falsification attacked the merge directly and the entry below is its pruned form.

**How it works.** Contradiction is a durable typed state of the evidence graph: when two observations assert non-identical values for the same field, the graph stores a CONFLICT record (claim A, evidence A, claim B, evidence B, detected-at, resolution state) with provenance class CONFLICTING. Storage has no slot for a resolved value that lacks evidence records; suppression is not deletion; even a resolved conflict keeps both observations. Detection is itself a declared policy: deterministic, declared, versioned canonicalization and significance rules are input data (an owner-supervised tenant alias table is permitted; model verdicts on the detection path are forbidden; a normalization-rule version bump changes the input hash). Presentation is a separate versioned source-priority policy that may pick a winner for rendering; the pick is an audit event with the rule, the policy version, the winner, and the loser with its evidence; the pick is owner-visible, never engineer-log-only; a policy-version flip re-opens owner-visible notifications rather than re-picking silently at scale. Answer grammar is gated on provenance: a CONFLICTING claim cannot render as unqualified declarative fact at prose seams; attenuation runs under a stated hedge-rate bound with a feedback arc to the detection policy. Unresolved conflicts become owner tasks; the queue is the legitimate sink in the engaged-owner regime; the owner-absent regime uses the declared fallback with disclosure. Retraction and disappearance are typed events (SOURCE_VANISHED) with a conflict half-life; retention never deletes an observation attached to an open CONFLICT.

**Prevented classes, one crisp reason each:**

- **#9 conflict-collapse:** storage has no silent-merge path: the disagreement survives as a typed record with both provenances even when a policy pick renders one value. (WEAKENED: storage-scope prevention withstands; end-to-end visitor honesty does not. The family prevents untraceable picks, not silent ones; policy authorship and version flips are the unaudited power.)
- **#5 claim-binding:** the binding verifier forces the CONFLICTING classification into the render model and the grammar gate blocks unqualified declarative rendering of detected conflicts at prose seams. (WEAKENED: prose seams only; machine-readable seams have no grammar; prominence is unregulated; agreed-but-wrong evidence renders declaratively by design; downstream transforms can drop the marker.)
- **#8 correction-loss:** owner corrections enter as append-only OWNER_ASSERTED records; a never-corrected losing source cannot re-nag the owner forever (adjudicated-suppression) and cannot silently overwrite. (WEAKENED: owed repairs are the reopen rule and the named minting authority.)
- **#3 graph-blindness:** contradictory or unknown shapes are quarantined as UNRESOLVED_CONFLICT with an owner, a shape class, a drain SLA, and a REPAIRED / DECLINED / ESCALATED disposition, instead of being merged by first-seen-wins. (WEAKENED: write path holds conditionally; the read path and drain cadence are untested.)

Cut by the merged falsification: F9-M3's #6 prevention claim (detection-after-render, not prevention).

**Falsifiable test (the merged hostile-corpus test).** Input: one business, hours field, across two refetch cycles plus a retention sweep plus a policy-version bump: twelve sources (two genuinely disagreeing, website 8-5 vs listing 9-5; eight formatting-drift variants of 8-5; one duplicate aggregator copy; one source that 404s between cycles); no owner correction (owner-absent regime); a control business with one engaged owner; priority policy v7 then v8 with no new evidence; a stated significance policy named before the run. Procedure: acquire, generate, query Ask FYD; refetch with the 404; sweep retention; bump the policy; capture graph, CONFLICT set, task queue, audit log, rendered page, structured-data head, and Ask FYD text at each stage. Expected observable outcome: exactly one CONFLICT for the genuine disagreement, zero for formatting variants; no refetch duplication; every projected value flip without an owner action has an owner-visible audit event; the v8 flip re-opens owner notifications; hedged answers stay under the stated bound with no declarative-before-disclosure; the 404 produces SOURCE_VANISHED without silent auto-resolution and is never cited as live; retention deletes nothing attached to an open CONFLICT; the owner-absent business exhibits its declared fallback, not indefinite silent UNRESOLVED; the control's owner resolution closes the task append-only with no re-nag on the same losing value. What proves the mechanism DOESN'T work: any formatting variant producing a CONFLICT; any flip without an owner-visible audit event; any unqualified single value rendered while the graph holds an open CONFLICT; hedge rate over the bound; the vanished source cited as live or silently resolving the conflict; indefinite UNRESOLVED with no declared fallback.

**Sources:** FAIL-9, FAIL-5 (S1 partial), FAIL-3 (S3 partial); MERGED-conflict-falsification; LANE-14 via WAVE1-SURVIVOR-handoff-contract.md; CONTRADICTION-RESOLUTIONS FLAG 2 (normalization vs No-ClaimAuthority) and FLAG 4 (ask-owner as layer, not sole mechanism); TENSION-RESOLUTIONS R4 (detection criterion). Real input: the website-hours 8-5 vs provider-hours 9-5 fixture.

**Verdict: WEAKENED.** Storage discipline survives; end-to-end visitor honesty does not yet. The five named holes before it can be called complete: a versioned auditable significance/detection policy; a per-conflict-class visitor-visibility rule with prominence; a hedge-rate bound with feedback to detection; typed retraction/disappearance semantics with a half-life; a declared owner-absent fallback with disclosure and audit. Two-regime mechanism (engaged-owner vs owner-absent) with the regime qualifier now stated.

---

## M5. Declared-input purity with replay tripwire and content-derived identity

**Merged from:** F1-S3, F4-S1/S2/S4. F4-S3 is DUPLICATE of the typed seam family and was folded into M1; its F4-specific residue (GENERATED quarantine with seed pinning) is retained here, weakened by the seed/provider byte-stability contradiction. Post-falsification form per FAIL-4-falsification.md.

**How it works.** Projection is a pure function of a declared, hashed input tuple: graph snapshot, owner corrections set, render tokens, pipeline version, model and prompt versions, seed. The clock, the RNG, and the machine are excluded; anything the projection reads is a declared input or it cannot move the output. A recorded triple (inputHash0, outputBytes0, outputHash0) is byte-compared across regenerations and across environments; the publish gate halts on unnamed divergence and names the divergent layer. Content-derived identity replaces random UUID minting: entity identities are digests of canonical content, so re-derivation reproduces the same identities and re-observation does not re-key the world. PING's LIVE substrate is the strongest existing analog: content-addressed event IDs with dedup on re-ingest, deterministic mission identity, and replay convergence (EVAL-007); replays anchor to mission_id because run and attempt identity are PHANTOM.

**Prevented classes, one crisp reason each:**

- **#4 fixture-drift:** with identical declared inputs the output is byte-identical, and any divergence is a named, publish-blocking event rather than a quiet change. (WEAKENED: the tuple is incomplete at the code-flagged gaps. The falsification's strongest single falsifier is already in the codebase: RENDERER_VERSION = "renderer.tsx@unversioned" in the very file S1 cites, plus tokens@unversioned, no prompt/model/tzdata versions. The run-twice byte-compare genuinely catches machine-local determinism failures, but the test is machine-scoped, recovery is re-bless by convention, and S4's #4 half withstands narrowly: no random IDs in the path, derivation reproduces.)
- **#8 correction-loss:** corrections are declared inputs the projection function cannot silently drop; an applied/unapplied per-correction report exposes anchor rot instead of hiding it. (WEAKENED: render-stage drops of declared corrections only; value corrections live upstream of the tuple; store-level loss is "explained" rather than prevented; S4's identity churn under value changes, insertions, merges, splits, and cross-tenant clones is a load-bearing gap.)

Dropped by falsification: **#7** (FALLS: the convergence detector was undefined and untested; observation claimed as prevention). **#9** (UNPROVEN as specified: the replay store the tripwire proposed does not exist, and the #9 input fixture is unbuildable from the named inputs).

**Falsifiable test (F1-S3's strengthened test plus F4's verdicts).** Input: a fixture projection with a fixed declared-input set; adversarial environment variation across 5 runs (key order, Date.now, Math.random, TZ, machine and CPU variation); a recorded (inputHash0, outputBytes0, outputHash0) triple. Procedure: byte-compare 5 varied runs; remove one declared correction and re-run (confined diff expected); bump the pipeline version and re-run (all outputs must change or the pin is fake); run three pipeline mutations (drop ownerOverrides, resolve a conflict marker, reorder sections) through the publish gate; mutate an undeclared input (a config read, a cache file) with declared inputs identical and re-run; grep the generation path for random UUID or timestamp minting; read the declared-input tuple and name the renderer version. Expected observable outcome: byte-identical outputs across all 5 runs; confined diff on the declared correction removal; named divergence halts on each mutation with the divergent layer named; the undeclared-input mutation produces a byte-identical output and the mutation fixture names the ignored input; the identity grep finds no random minting; the per-correction report names every correction applied or names the rotted anchor. What proves the mechanism DOESN'T work: any byte difference across the varied runs with identical declared inputs; any divergence halt missing the layer attribution; any pipeline-version bump with byte-identical outputs; any random UUID in the generation path; any undeclared-input mutation that moves the output; and the standing self-falsifier: the tuple containing renderer.tsx@unversioned or tokens@unversioned, which makes the flagship declared input a hardcoded constant and the purity claim purity over a tuple whose most drift-prone member is undeclared.

**Sources:** FAIL-1 (S3), FAIL-4 (S1, S2, S4; S3 duplicate, residue); FAIL-4-falsification.md; ARCHAEOLOGY-SUPPLEMENT.md (EVAL-007 replay convergence, content-addressed event IDs, deterministic mission identity are LIVE; run/attempt identity PHANTOM). Wave-1 IDs: LANE-4 M-1 deterministic replay, LANE-4 M-3 sandboxing, LANE-4 M-13 record-once SideEffect, LANE-4 M-14 versioning, LANE-7 M6 deterministic task ids. CUT-LOG FLAG 3: deterministic re-render is the base layer these survivors depend on, not a discardable cut.

**Constitutional dependency.** Business-entity identity continuity across merge, split, and tenant boundaries, and the canonicalization authority the tuple digests depend on, belong to the convergence sprint's identity authority. This mechanism consumes that authority; it does not supply it.

**Verdict: WEAKENED.** #4 narrowly holds for machine-local determinism with the tuple incomplete; #8 holds for render-stage declared corrections only. Until the renderer is really versioned, the purity claim is provisional at its flagship input.

---

## M6. Evidence decay with action-time re-verification and forward taint

**Admitted by adjudication:** re-scoped LANE-18 invariant 7 (INVARIANT-7-ADJUDICATION.md, verdict ADMIT, confirmed in the final read). As specified for the outreach coordinator it prevents zero of the 9 and stays dead there; re-scoped to the FYD pipeline it fills a gap no lane survivor covers. The 2026-09-23 delete-our-need kill of the original specification stands separately.

**How it works.** Every evidence record about the external world carries an observed-at timestamp and a per-claim-class freshness window (versioned policy, not a number on the record). Confidence decays as the window passes: a claim past its window is STALE; stale is not false, it is un-renderable without re-checking. Before any outbound action (rendering a claim to a public site or asserting it in an Ask FYD answer), any claim on STALE evidence must be re-verified against a live source within its window; if re-verification cannot be performed, the claim fails closed (omitted or qualified), never rendered as settled fact. When a claim is falsified (a new crawl contradicts it, an owner correction falsifies it), the system traces forward through the derivation graph to every artifact built from that claim (render models, cached projections, serialized client graphs, digest lines, analytics rollups) and marks them TAINTED, scheduling regeneration. This is the evidence-graph and worker-layer statement of the same discipline F5-S3 (dangling pointers fail closed) and F9-M4 (conflict and correction task lifecycle) implement at the render seam: S3 covers revoked evidence, this covers stale evidence; F8's overlay covers consumers that pass the read seam, this covers consumers that do not.

**Prevented classes, one crisp reason each:**

- **#5 claim-binding:** a claim bound to old-but-still-resolving evidence passes F5-S1's existence check and F5-S3's dangling check, so without this mechanism it renders as settled fact with a real evidence pointer behind it. Decay plus action-time re-verification closes the staleness-shaped hole in the binding chain: support must be fresh, not merely present.
- **#8 correction-loss:** when an owner correction falsifies a source claim, F8's pull-based overlay only protects consumers that pass the single read seam; STEP-06 proved such consumers are not guaranteed. Forward taint pushes the falsification to every derived artifact, so the correction cannot die silently inside a cached projection or an analytics rollup that never re-composes.

**Falsifiable test (from the adjudication).** Input: a fixture business with a phone claim bound to a DIRECT_EVIDENCE observation recorded 400 days ago (past the phone class freshness window of 180 days); a cached render model and a digest line derived from that observation; then an owner correction changing the phone, entered through the real override path. Procedure: (1) attempt to render the site and answer "what is your phone number?" via Ask FYD without any re-acquisition; (2) record the owner correction and inspect every derived artifact for taint marks and scheduled regeneration, including the cached render model and the digest line. Expected observable outcome: (1) the phone claim does not render as settled fact on stale evidence alone; it is omitted or qualified as stale pending re-verification, and the event log names the STALE classification; (2) after the correction, the cached render model and the digest line both carry TAINTED marks tied to the falsified claim, with regeneration scheduled; the digest line is not silently left carrying the old number. What proves the mechanism DOESN'T work: (1) the 400-day-old phone renders as settled fact with its evidence pointer, because S1/S3 both pass it: decay not implemented; (2) the owner correction is effective at the live read seam (F8-S1 passes) while the cached render model and digest line still carry the falsified number with no taint mark: forward taint not implemented. The deliberate design: in scenario (2) the F8-S1 and F8-S4 tests both pass, which is exactly why this test is not redundant.

**Sources:** INVARIANT-7-ADJUDICATION.md; FAIL-5 falsification critique C4 (names the missing re-confirmation policy), FAIL-9 open question 2 (staleness bound as open question), FAIL-8 falsification ("Time is the adversary the tests forgot"), DELETE-OUR-NEED.md section (e) (the gate's kill of the original specification stands).

**Verdict: ADMITTED, UNFALSIFIED.** Entered by adjudication as a legitimate generalization, not gate-gaming: its falsifiable tests fire in scenarios where every existing test passes while the failure occurs. No falsification pass has attacked it yet. Recorded design debt: a principled taint cutoff (one poisoned claim must not require rebuilding the world), freshness windows as versioned policy, re-verification authority (same minting-authority discipline as owner assertions), and specified graph-outage behavior.

---

## M7. Evidence-gated composition (graph-driven site differentiation)

**Standalone:** F7-S2. Kept separate per the coverage matrix: composition-side evidence gating is not the same mechanism as the projection seam (do not merge).

**How it works.** Site composition is driven by the evidence graph, not by template selection: every composed section must carry a justification citing the graph features that earned it, and a counterfactual removal test (strip the feature from the graph, rebuild, the section must disappear). A duplicate-inflation bar rejects sections whose cited facts are redundant copies of one observation. Bar versioning with convergence monitoring watches for bars drifting toward the template (FAIL-7 falsification 2A). A boilerplate budget caps GENERATED filler so thin businesses cannot reach rich-site depth on prose alone.

**Prevented classes, one crisp reason each:**

- **#7 clone-sitespecs:** two businesses with genuinely different graphs cannot receive the same section set without distinct graph-driven justifications, and counterfactual removal proves each section is earned rather than template-selected. (WEAKENED: the extreme thin-vs-rich case works; median businesses may still converge; planner knowledge of bar weights is untested.)
- **#5 claim-binding:** every section justification is a binding between composed content and graph evidence; a section that cannot cite its evidence cannot be composed. (WEAKENED: per-section binding coverage is required, and justification text must itself be evidence-checked.)

**Falsifiable test (from FAIL-7's strengthened test).** Input: two real corpora, a rich graph A and a thin graph B; a duplicate-inflated graph variant of A (triplicated facts); a median-pair corpus of similar real businesses. Procedure: run the planner on A and B; assert the section sets differ and every section in A's plan carries a justification citing graph features; strip the services from A, rebuild, assert the services section disappears (counterfactual removal); run the planner on the duplicate-inflated A and assert the duplicate-inflation bar rejects the redundant sections (bar must not clear on phantom fact counts); run the planner on the median pair and assert the gate does not certify them as identical without per-section justification diffs. Expected observable outcome: A richer than B by justified sections only; counterfactual removal holds; duplicate inflation does not inflate the section set; median-pair convergence, if it happens, carries explicit justifications that survive review. What proves the mechanism DOESN'T work: any section with no graph citation; counterfactual removal failing (section survives its evidence being stripped); the planner clearing sections on triplicated facts; median-pair sites that are structurally identical with thin justifications passing the gate; bar weights readable by the planner and used to game the bar.

**Sources:** FAIL-7.

**Verdict: WEAKENED.** Holds for the extreme cases; the median case is the untested middle; planner knowledge of bar weights and threshold calibration are open.

---

## M8. Visibility as canonical schema attribute (marking authority with deny-by-default)

**Standalone:** F6-S2. Kept separate: this is the classification source, the authority the enforcement layers (M1, M10) depend on; enforcement-only mechanisms cannot own it.

**How it works.** Visibility is a canonical attribute of every object and field in the schema, set at creation and versioned; the canonical diff event fires on every visibility flip and drives cache invalidation; deny-by-default means a missing or renamed attribute fails closed rather than inheriting a permissive default. Unauthorized actors cannot mark facts: marking is restricted to named actor classes (owner, tenant admin), mass flips require step-up authorization (circuit breaker), and public-to-private flips invalidate cached public emissions.

**Prevented classes, one crisp reason each:**

- **#6 visibility-error:** the classification the gates enforce is itself versioned and auditable, so a silent misclassification becomes a named diff event instead of an invisible state change. (WEAKENED: types enforce the classification faithfully, including a wrong one; the strongest attack (unauthorized marking) was the falsification's attack 1.)
- **#4 fixture-drift:** the canonical visibility diff event makes classification changes across regens loud and attributable, so drift in who-may-see-what is caught the same way data drift is. (WEAKENED: tested for the canonical flip shape only.)

**Falsifiable test (from FAIL-6's strengthened test).** Input: a fixture with public and private fields; an unauthorized actor (projection code, support tool) attempting to mark a private field public; a mass-flip command; a public-to-private flip with a warm public cache. Procedure: attempt the unauthorized marking; attempt the mass flip without step-up; flip one field public-to-private and inspect cached public emissions; rename the visibility attribute and regen. Expected observable outcome: the unauthorized marking is denied, not merely logged; the mass flip without step-up is refused; the public-to-private flip invalidates every cached public emission (no stale public copy of the newly private fact); the renamed attribute fails closed (missing classification = private). What proves the mechanism DOESN'T work: any accepted unauthorized marking; any mass flip without step-up authorization; any cached public emission surviving a public-to-private flip; any renamed-attribute path rendering the fact publicly.

**Sources:** FAIL-6.

**Verdict: WEAKENED.** The marking authority is the load-bearing unbuilt part: who may mark, through which authenticated channel, is currently unspecified, and authorized-but-wrong marking is the falsification's named pass condition.

---

## M9. Tenant-scoped context enforcement at every read

**Standalone:** F6-S3. Kept separate: tenant isolation at the read boundary is a distinct enforcement context (owner/tenant context vs anonymous viewer), per CUT-LOG FLAG 5.

**How it works.** Every read of graph data carries a trusted tenant context minted at an authenticated boundary; the retrieval layer applies the tenant predicate at the data layer (not the application layer), so one forgotten code path cannot leak; shared caches key on the visibility context; background jobs and preview channels run under an explicit context or refuse to read; write isolation means one tenant's decision store cannot be addressed from another tenant's context. Cross-tenant canaries (CANARY-PRIV strings) are asserted absent from every channel including Ask FYD answers seeded with another tenant's context. Tenant is trusted producer context, never an anonymous viewer attribute or a request-supplied tenant ID (CONTRADICTION-RESOLUTIONS FLAG 5). Preview uses authenticated owner-context grants on the same visibility gate; no anonymous bearer preview URLs (TENSION-RESOLUTIONS R2, R5).

**Prevented classes, one crisp reason each:**

- **#6 visibility-error:** a query running under tenant A's context cannot observe tenant B's private facts even when the facts share canonical public observations, because the tenant predicate is applied at the data layer on every read. (WEAKENED: tested for cross-tenant isolation; within-tenant owner-vs-public session confusion is outside the tested envelope.)
- **#8 correction-loss:** a tenant's owner corrections live in a tenant-isolated decision store, so another tenant's re-dump cannot overwrite them and no shared-identity collision can silently replace them. (WEAKENED: rests on the write-isolation clause, which is specified but thinly tested.)

**Falsifiable test (from FAIL-6's strengthened test).** Input: two tenants HP/CS with canary private facts; a shared canonical public observation visible to both; a background job with no context; a shared cache primed with tenant B data; an Ask FYD query seeded with tenant B context asked by tenant A. Procedure: run tenant A's full pipeline under a trusted A context; run the contextless background job; request tenant B's cached page under tenant A's session; ask the cross-tenant Ask FYD query. Expected observable outcome: zero B-canary bytes in any A channel (HTML, payloads, search index, chat answer, cache, job output); the contextless job refuses to read; the shared cache misses or re-keys on visibility context; the cross-tenant query returns empty or a scope error. What proves the mechanism DOESN'T work: any B-canary byte in any A channel; any contextless read succeeding; any shared cache serving B bytes to A; any tenant B correction overwritten by tenant A's re-dump.

**Sources:** FAIL-6; CUT-LOG FLAG 5 (keep the enforcement context distinct from the cut per-viewer-ACL pattern).

**Verdict: WEAKENED.** Holds for cross-tenant isolation in the tested shapes; the within-tenant viewer-confusion axis, shared-cache key discipline at scale, and background-job context plumbing are the named gaps.

---

## M10. Adversarial boundary test suite (registry-derived mutation testing)

**Standalone:** F6-S4. Kept separate: a test suite is not the mechanism it tests; it is the only mechanism whose falsifiable test exercises bypasses of every upstream stage, which is a genuinely distinct property worth naming (coverage matrix Merge A note).

**How it works.** A versioned channel registry enumerates every output channel (HTML, client payloads, search index, sitemaps, RSS, JSON-LD dumps, RSC flight data, OG images, Ask FYD answers, tool-call arguments, error pages, preview). A mutation set is derived from the registry: full graph smuggled to the client payload builder bypassing the gate, javascript: source field in a link slot, raw graph read outside the gate module, a new channel with no mutation, a fixture whose channels diverge from the production registry. The suite runs twice (clean and mutated) and fails loudly naming the canary on every bypass. Introducing a new channel without a corresponding mutation fails the suite (registry completeness is tested, not assumed). Positive-property assertions replace denylist probes: every URL is parsed and its scheme and origin asserted against the allowlist, never grepped.

**Prevented classes, one crisp reason each:**

- **#6 visibility-error:** any new or forgotten channel that lets private facts out is a mutation the suite derives from the registry, so channel-introduction becomes a failing test instead of a silent leak. (WEAKENED: the registry is currently a frozen list; registry-derived generation is the unbuilt part.)
- **#2 unsafe-url:** the mutation set poisons every sink including Ask FYD's link renderer, so a sink that escapes the typed constructors is caught by the adversarial test rather than trusted by the type system. (WEAKENED: no Ask FYD mutation currently exists; the suite design names it.)

**Falsifiable test (from FAIL-6's strengthened test).** Input: the versioned channel registry; a mutation set derived from it; a property-removal mutant of the gate (refusal branch stubbed to pass-through). Procedure: run the suite clean (must pass); run each mutation (each must fail loudly naming the canary); add a new channel to the registry with no mutation (the suite must fail for incompleteness); run the property-removal mutant (the suite must fail, proving it measures the gate, not the fixture); assert every URL check is a parsed positive-property assertion (scheme plus origin against the allowlist), never a denylist grep. Expected observable outcome: clean passes, every mutation fails with a named canary, registry-without-mutation fails, property-removal mutant fails. What proves the mechanism DOESN'T work: any mutation passing silently; any new channel that can be added without a mutation; any denylist-probe URL check; the property-removal mutant passing (the suite then measures its own fixture).

**Sources:** FAIL-6; FAIL-6 falsification C1 (structural reading: raw graph type unnameable outside the gate module, making bypass a compile-time failure) and C3 (property-removal mutants).

**Verdict: WEAKENED.** The suite design is the strongest of the four F6 survivors, but the registry is currently a hand-maintained frozen list and the Ask FYD mutations do not exist; until mutation derivation is registry-driven, the suite proves the channels it lists, not the channels that exist.

---

# 2. Rejected

## 2a. Survivors reduced below 2 honest classes by falsification

**F5-S2 prevention-first generation (FAIL-5).** Falsification verdict: FALLS on #5 by construction (deterministic binding-presence validation cannot enforce semantic containment; bound overstatement passes validation, including the file's own 24/7 example; the stated test is unexecutable as written because no deterministic predicate extractor is specified). Only #6 survives, itself weakened (prompt channel sound; intent channel, weight knowledge, and resolution-time record bleed untested). Honest count: 1. Moved here per the gate. Its narrow surviving value (citation-presence enforcement: refusal of fragments with no binding at all) is folded into M1's fragment-binding clause. Source: FAIL-5 and FAIL-5-falsification; the F5 report itself names S2 as the positive form of the cut prompt-instruction mechanism.

**F3-S1 shape-coverage fixture registry (FAIL-3), as standalone.** Falsification verdict: #3 NO LONGER PREVENTED as specified (refusal is not acceptance, so the gate is green during the historical refusal failure; fixtures pin authoring-time output including bugs). Honest count standalone: 1 (#4 drift-from-pinned only). Moved here per the gate as a standalone mechanism. It recovers #3 only jointly with F3-S3 (quarantine refusal routing) and an independent fixture oracle, which is exactly how it is retained: folded into M2 as the fixture-pinning clause, not kept as an independent entry. Source: FAIL-3 and FAIL-3-falsification; SURVIVOR-ROSTER EXCLUDE flag.

## 2b. Cut mechanisms (from CUT-LOG.md, deduplicated)

Every entry below failed the hard rule (fewer than 2 of the 9 classes as a standalone mechanism). Grouped by the CUT-LOG categories. Sources are the lane FAIL reports' cut lists as consolidated in CUT-LOG.md; contradiction flags noted where the mapper must decide.

**Single-class / zero-class mechanisms (32):**

1. Layout constraint solver with overflow as a hard error (F1). Prevents only #1; subsumed by the viewport assertion which measures reality instead of modeling it.
2. Horizontal-extent token budget propagated top-down (F1). Single-class guard, no second class.
3. Fail-closed CSS defaults (F1). Only #1, only the accidental cases; a tactic, not a mechanism.
4. Container-queries-only rule / device-name branch ban (F1). A rendering tactic; container queries can still overflow a too-small container.
5. Per-component intrinsic-width precomputation without an oracle (F1). A prediction; FL-20260921-033 proved predictions wrong; collapses into the oracle once measurement is added.
6. Content-Security-Policy as a backstop (F1, F2). Prevents only #2; good defense in depth, not a multi-class mechanism.
7. URL reputation or external safety-check API at acquisition (F2). Only #2, third-party dependent, wrong layer.
8. Sandboxed iframe rendering of third-party content (F6). Contains script execution (#2) but nothing else.
9. Rank-Math-specific @graph patch (F3). Site-local patch the CEO rule forbids; teaches the extractor nothing about the next unknown shape.
10. Pinning jsonld@9.0.0 and deleting the custom processor (F3). The historical one-class repair; says nothing about drift, conflicts, corrections.
11. Browser-rendered acquisition fallback (F3). A different blindness, not a second prevented class.
12. Sandbox nondeterminism interdiction alone, LANE-4 M-3 (F4). Single class (#4); folded into F4-S1 as the enforcement layer.
13. Record-once SideEffect, LANE-4 M-13 (F4). Single class (#4 edge cases); folded into S1 and S4.
14. URL allowlist at the seam alone (F4). Single class (#2); folded into F4-S3 where URL safety is one axis of a multi-axis gate.
15. Mobile-overflow viewport fixture test alone (F4). Single class (#1); legitimate test, not a mechanism.
16. Graph-blindness extraction completeness check alone (F4). Single class (#3); legitimate check, not a mechanism.
17. Deterministic full re-render with no owner layer (F8). Prevents #4 but loses corrections deterministically; CUT-LOG FLAG 3: retained as the base layer the F4 survivors depend on, not as a standalone mechanism.
18. Post-render snapshot diffing (F8). A detector, not a preventer; reports loss after it happened.
19. Freezing the source (never re-acquire) (F8). Prevents #8 by abolishing regeneration; guarantees stale data and lets stale claims persist (#5).
20. Per-tenant claim-template allowlists (F5). At most #5, by brittleness; fails the gate.
21. Per-viewer ACLs evaluated at render (F6). Public FYD sites have anonymous viewers; collapses to the public-visible flag; only #6. See FLAG 5.
22. Separate per-tenant databases with no shared identity (F6). Prevents #6 by duplication but breaks the shared-observation taxonomy.
23. Cache memoization of deterministic steps, LANE-7 M15 (F4). Prevents none; a wrongly keyed cache is itself a drift source.
24. Idempotency keys for effects, LANE-12 M1/M2 (F4). Duplicate side-effect application is not one of the 9.
25. Saga / compensation patterns, LANE-12 M8/M9 (F4). None of the 9 is a partial-effect problem.
26. Owner-wins-always, unconditional (F8). Prevents #8 only and guarantees #9 with flipped polarity. CUT-LOG FLAG 1: F8-S2 survives this cut only under three conditions (tie on an owner-asserted field; loser survives as a named visible record; lifetime policy with default and clock); S2 currently satisfies the first two and is missing the third. Mapper note carried into M3.
27. Confidence-scored auto-reconcile (F9). Still merges and deletes the loser; a score on a silent decision is the same failure with instrumentation.
28. Majority-vote across sources (F9). Three wrong aggregators outvote the owner's single true listing.
29. Deduplicate identical strings across sources (F9). Identity hygiene, not conflict handling; identical strings are not conflicts.
30. Copy-level similarity checks across sites (F7). Fails the #7 shape itself (structural identity with paraphrased copy passes).
31. More template variants (F7). Variance without evidence coupling; the planner can still select the same template twice.
32. "Just run it twice" as the whole strategy (F4). Detects drift without preventing it; kept as a test inside S1.

**Non-mechanisms (6):**

33. Human review / owner approval gates in every form (all 9 lanes, 9 names: viewport QA, URL approval, extraction review, render gate, output review, site pre-publish review, interrupt/resume machinery, re-asking every field, ask-owner as sole mechanism). Non-deterministic, non-scalable; prevents nothing systematically across regenerations. The FAIL-9 ask-owner cut stays distinguished from F9-M4 by "sole" vs "layered": M4 sits on attenuation and policy so the system does something non-silent while waiting. See FLAG 4.
34. Prompt instructions telling the LLM not to hallucinate (F5). Advisory, not a mechanism; F5-S2 was the positive form of this cut and itself fell to 2a.
35. LLM-as-judge uniqueness scoring (F7). Non-deterministic; the planner grading its own homework through a larger model.
36. Logs and labels without enforced checks (F3, F5, F6, F8): unstructured extraction logging, "generated copy" watermarking alone, audit logging of every render bind (detective, not preventive), append-only correction history with no re-application (a museum, not a guard).
37. Global overflow-x:hidden (F1). Concealment, not prevention: masks #1 while destroying the ancestor-trace evidence. An anti-mechanism.
38. The failure itself named as a mechanism (F7, F8, F9): last-write-wins on the merged record; freshness-weighted last-write-wins; one canonical hours field filled in order; reusing or caching one spec across tenants. Each guarantees the failure by construction.

**Doctrine-forbidden (5):**

39. Universal generated-prose factuality verifier, FYD-008 (F5). Rejected; post-hoc detection cannot be load-bearing.
40. ClaimAuthority / central fact authority (F5). A verifier that authors truth collapses the evidence/object separation.
41. LLM semantic comparison for conflict detection (F9). Nondeterministic and unverifiable; a new authority forbidden by the No-ClaimAuthority rule. CUT-LOG FLAG 2: this cut forbids what F9-M1 needs (semantic normalization to avoid false-conflict explosion); the lane's detection criterion is undefined until normalization exists. Carried as the sharpest contradiction in the corpus (see Open Questions). TENSION-RESOLUTIONS R4 extends the resolution: deterministic, declared, versioned canonicalization rules are permitted as input data; model verdicts on the detection path are forbidden; a normalization-rule version bump must change the input hash.
42. Output variance maximization (F7). Violates the good-similarity rule; manufactures arbitrary-layout failure.
43. Random per-tenant layout jitter (F7). Destroys deterministic replay; makes #4 strictly worse.

**Wrong-layer (6):**

44. Source-side filtering only (F2). What FL-20260921-031 proved insufficient; enforcement belongs at the sink.
45. HTML escaping at render (F2). Guards the markup seam, not the URL seam; href="javascript:..." survives escaping.
46. Render-time field stripping per template (F6). Patches one channel; the Pergola leak traveled in the script payload channel.
47. Encrypting private fields at rest (F6). A storage-layer answer to a projection-layer problem.
48. Client-side filtering of private objects after fetch (F6). The private data already crossed the boundary; the Pergola failure restated.
49. Schema.org type allowlist at extraction (F3). Converts unknown-type blindness from a bug into policy.

**Subsumed by a survivor (6):**

50. Regex or blocklist scheme matching on raw strings (F2). Strictly weaker than schema-typed trust; defeated by the smuggling the 17-case suite covers.
51. Trusted Types browser API enforcement (F2). A platform-specific instance of the typed-slot plus sink-validation pattern.
52. Approval digest binding alone, without the decision store (F8). A signature on a correction no read path consults; subsumed by the decision-store overlay.
53. Total-entity-count vanity metric (F3). A count without the in-vs-out reconciliation invariant; subsumed by extraction receipts.
54. Outright ban on duplicate structures (F7). Rejects legitimately similar businesses; subsumed by the variance-coupling invariant.
55. Version/patch markers for code evolution, LANE-4 M-14, as standalone (F4). Deploy-time semantics; its portable value (rendererVersion as a declared input) is folded into F4-S1.

**Wave-1 gate kills (from DELETE-OUR-NEED.md):** out of 15 lanes and roughly 200 mechanisms, exactly one wave-1 family survived the gate, the LANE-14 Handoff Contract (status vocabulary with CONFLICTING; digest-mismatch STALE rule; digest-optional INVALID rule), which FAIL-9 cites as corroboration for M4. Everything else was deleted with a one-line reason each in DELETE-OUR-NEED.md section (a), plus the proposed-new-machinery list in section (b) (OTel pipelines, idempotency-key stores, outbox/inbox tables, fencing-token services, lease machinery, memory tiers, selector machinery: all zero or one of the 9). The LANE-18 invariant 7 kill of the original outreach-coordinator specification stands; the re-scope to the FYD pipeline was adjudicated separately and admitted as M6. The anti-list (section c) is preserved doctrine, not mechanism: the unified event runtime, computeEventId, the bridge, MissionRuntime, the event journal, the approvals tables, and PING's authority set are not to be deleted, and the failure files mark the FYD seam machinery DONE_VERIFIED (parser-based safe-link resolver, projection-seam binding verifier, owner-assertion evidence records, the locked provenance vocabulary DIRECT / DERIVED / INFERRED / OWNER_ASSERTED / CONFLICTING / UNKNOWN).

## 2c. Falsification-killed survivor claims (partial kills)

No survivor was fully falsified. The class claims that died, by survivor:

- F1-S1 #7: FALLS as specified (no structural signature, no fixture; vacuous until the signature exists).
- F1-S2 #1: FALLS as claimed (emergent compositional overflow is well-typed).
- F3-S1 #3: NO LONGER PREVENTED as specified (green during refusal; fixtures pin bugs).
- F3-S2 #8: NOT PREVENTED as tested (no correction case; IDs unreconciled with the owner loop).
- F4-S1 #7: FALLS (undefined convergence detector, untested; observation claimed as prevention).
- F4-S2 #9: UNPROVEN as specified (no conflict type; the required fixture is unbuildable from the named inputs; the proposed replay store does not exist).
- F4-S3 as standalone: DUPLICATE of the typed projection seam family (fourth/fifth claimant); folded into M1; its F4-specific GENERATED-quarantine-with-seed-pinning residue retained in M5, weakened by the seed/provider byte-stability contradiction.
- F4-S4 #8: WEAKENED (example coordinates contradict the mechanism's own test; positional coordinates break on structural re-observation; no merge/split continuity rule; no tenant namespace).
- F5-S2 #5: FALLS (presence validation cannot enforce semantic containment).
- F8-S3 #4: FALLS as stated (pins golden-covered fields only; a #8 instrument, not a #4 mechanism).
- F9-M3 #6 (prevention): does not survive (post-render detection, not prevention; restated as detection).

## 2d. Defense-in-depth shelf (useful, but not survivors)

These prevent one class or protect one layer and are worth keeping as engineering practice. They were not admitted because they fail the two-class gate, and the library must not quietly re-admit them as mechanisms.

- Content-Security-Policy as a URL backstop (F1, F2): #2 only.
- Sandbox nondeterminism interdiction as the enforcement layer inside F4-S1 (LANE-4 M-3): #4 enforcement only, not a mechanism alone.
- Extraction receipts as operator telemetry (F3-S2): #3 visibility, not prevention alone.
- The deterministic re-render base layer with no owner layer (CUT-LOG FLAG 3): the foundation M5's survivors depend on; admitting it as a survivor would license correction loss.
- The channel registry as a living document (F6-S4): #6 coverage only until mutations are registry-derived.
- Versioned URL-denial telemetry and the availability twin (TENSION-RESOLUTIONS R1): keeps fail-closed URL policy honest about denial rates; a legitimacy instrument, not a prevention mechanism.

---

# 3. Open questions

Prioritized. The first is the judgment of the single biggest remaining uncertainty; the rest are ordered by blast radius.

1. **The Ask FYD conversational seam is structurally uncovered. (Biggest remaining uncertainty.)** Of 30 surviving mechanisms, only 4 falsifiable tests touch the Ask FYD conversational path (F9M1, F9M2, F6S3, F6S4 by design), and none of the 4 binds free-text answers to evidence in the general case; 26 of 30 tests exercise only the site-render path; 5 more mechanisms claim Ask FYD coverage in prose while their tests run only the site pipeline. No survivor operationalizes the SUPPORTED / PARTIALLY SUPPORTED / UNSUPPORTED triage with a test, and a self-graded LLM triage label is itself an unsupported meta-claim. 13 output paths were inventoried: claimed but untested are Ask FYD answers, tool-call arguments, sitemaps, RSS; entirely uncovered are JSON-LD dumps, RSC flight data, OG images, owner preview, and request-context error pages. The result is a simultaneous reopening: #2 (hostile URLs in chat answers), #5 (unbound conversational claims; F5-S2's closed-claim-set precondition does not exist at query time), #6 (private facts to the wrong viewer, especially multi-turn viewer confusion), #1 (generated answer cards with unmeasured layout), #4 (ask-composer LLM variance), and #8-adjacent (answers from pre-correction values). FAIL-2's falsification states the upgrade condition explicitly: if Ask FYD outputs are not sink-validated, its verdict upgrades to FALLS on #2 and #5. The needed class is a query-time binding verifier: viewer-filtered retrieval, per-sentence bindings to retrieved claims or explicit UNKNOWN/refusal, fail-closed on unbound sentences, and triage labels computed deterministically from binding coverage, never self-graded by the generator. No such mechanism exists in the corpus. Until it does, every class claim in this library is a static-projection claim, and the product's second projection seam restarts the guarantees from zero. The settling experiment: seed a tenant and instrument the answer pipeline; run hostile and benign corpora through every answer path; port the URL-safety, evidence-binding, visibility, conflict, correction, and drift assertions to query-time output; compute triage deterministically in the verifier, not by LLM self-grading. Either the gates hold on the answer path or every claim in this library is explicitly scoped to static projection only.
2. **Type-minting authorities and the construction-site inventory do not exist.** The merged typed seam's trust root is conditional on (i) a complete audited inventory of every construction, deserialization, hydration, cache-restore, fixture-loading, and admin write path, enforced by a CI static gate, and (ii) named, authenticated minting authorities for OWNER_CORRECTION, declassification, visibility marking, and evidence records. F6-falsification's structural resolution (raw graph type unnameable outside the gate module) is the proposed enforcement. Until the inventory and authorities exist and the audit passes, the seam claim holds only for crude shapes.
3. **Visibility marking authority is unspecified.** Who may mark a fact public-visible, through which authenticated channel; declassification authorization; authorized-but-wrong marking is the falsification's named pass condition. Enforcement-only mechanisms faithfully enforce a wrong classification.
4. **Normalization ownership contradicts the No-ClaimAuthority cut.** M1's conflict detection needs semantic normalization ("St." vs "Street", "8a-5p" vs "08:00-17:00") to avoid a false-conflict explosion; naming a normalization authority contradicts the cut that forbids semantic authorities, while accepting false conflicts contradicts M1. CUT-LOG FLAG 2; the sharpest contradiction in the corpus. TENSION-RESOLUTIONS R4 permits deterministic, declared, versioned canonicalization rules as input data and an owner-supervised tenant alias table, forbids model verdicts on the detection path, and requires a normalization-rule version bump to change the input hash. The authorship legitimacy question (who approves the platform normalization-rule base set) is a policy input, not an empirically derivable fact.
5. **Owner identity and correction jurisdiction are demo-grade.** Step 6 of F8-S1 ran on unverified owner mode; nothing names who may mint OWNER_ASSERTED records, through which authenticated channel, or what the generation pipeline is forbidden from writing. Until named, the strongest evidence tier is mintable by anyone the pipeline trusts, and the family protects injections as faithfully as judgments.
6. **Owner-vs-owner has no vocabulary.** Two corrections from two claimants to be the owner: no typed event, no adjudicator, no test. The options are all bad (silent pick, freeze, undefined human process). "Nothing silently overwrites" is currently false on this axis.
7. **No conflict lifetime policy, no correction freshness bound.** A conflict that sits forever is silent owner-wins with a fading paper trail; a 5-year-old correction applied against a true current source is staleness preservation, the mirror image of #8. The merged correction falsification falsified the timeless reading outright: the family needs a default-plus-clock, re-confirmation policy, and patch lifecycle states before its durability claims drop their scope qualifiers. Conflict staleness bound K and the owner-absent default are policy inputs, not empirical facts.
8. **Variance-coupling calibration is unmechanized.** d_in design, thresholds, bars, the explainability decomposition (only graph-explained d_out counts), gaming injection as the acceptance case, and a verifier differential corpus the planner cannot see. Without these, the #7 claim is variance, not coupling.
9. **Verifier independence is asserted, never constructed.** No lineage assertions, no positive controls, no frozen differential corpora anywhere in the corpus. Every oracle shares authorship with its generator.
10. **The bypass inventory is open-ended.** New channels arrive (OG-image generator, Ask FYD tool-call args); the inventory must be registry-derived with registry completeness tested, never hand-maintained. M10's suite is currently a frozen list.
11. **Receipt store and quarantine operations are underspecified.** Receipt queryability and retention; quarantine classifier boundary controls, normalization before deduplication, noise budget, drain SLA, and who triages on what cadence. Quarantined items require an owner, a shape class, a drain SLA, and a REPAIRED / DECLINED / ESCALATED disposition (TENSION-RESOLUTIONS R5).
12. **Constitutional-core dependencies are owned by the convergence sprint, not this library.** Identity continuity across merge/split/tenant boundaries, the canonicalization authority the M5 digests depend on, normalization-rule authorship, minting authorities for owner assertions and visibility marks, and the provenance/hash authority boundary are sprint-owned. Wherever an entry above names such an authority as a precondition, the naming is a dependency record, not a deliverable of this challenge. If any FYD failure analysis traced to a constitutional-core cause, it is recorded here as owned by the sprint; no constitutional fix is specified or built in this library.

---

# 4. Class coverage map (post-falsification, honest)

- **#1 mobile-overflow:** M2 (weakened, static load-time only). Single claimant. F1-S2's #1 claim fell. Flag: weakest covered class alongside #7.
- **#2 unsafe-url:** M1 (weakened), M10 (weakened). Two claimants, both static-projection scoped; the conversational reopening is the library's biggest uncertainty.
- **#3 graph-blindness:** M2 (weakened, conditional), M4 (quarantine clause, conditional).
- **#4 fixture-drift:** M2 (weakened), M5 (weakened; the determinism half narrowly holds), M8 (weakened, classification drift only).
- **#5 claim-binding:** M1 (weakened, binding/citation only), M3 (weakened), M4 (weakened, narrowed), M6 (admitted, unfalsified; the staleness half), M7 (weakened, composition-side).
- **#6 visibility-error:** M1 (weakened), M3 (weakened, hide-facts), M8 (weakened, marking authority), M9 (weakened, tenant reads), M10 (weakened, adversarial suite).
- **#7 clone-sitespecs:** M2 (weakened, crude only), M7 (weakened). Two claimants, all weak; F4-S1's #7 fell. Flag: effectively uncovered in the realistic middle.
- **#8 correction-loss:** M1 (weakened), M2 (weakened, golden-covered), M3 (weakened), M4 (storage-level), M5 (weakened, render-stage), M6 (admitted, unfalsified; taint half), M9 (weakened, tenant store).
- **#9 conflict-collapse:** M3 (weakened, source-vs-owner axis), M4 (weakened, storage-scope). M5's #9 dropped as unproven.

No class is at zero claimants. #1 and #7 are the thin classes: single or all-weak coverage. The library's real risks, in order: (1) the Ask FYD seam reopens #2, #5, #6, #1, #4, #8 simultaneously and no mechanism guards it; (2) #7's coverage is crude-only or weak; (3) #6's broad coverage is classification-shallow until the marking authority (M8) is named; (4) M6 is admitted but unfalsified, and M5's purity claim is provisional at its flagship input (renderer.tsx@unversioned).

---

*End of final library. Falsification files read: FAIL-1 through FAIL-9, plus MERGED-typed-seam, MERGED-oracle, MERGED-correction, MERGED-conflict. CUT-LOG.md, SURVIVOR-ROSTER.md, COVERAGE-MATRIX.md, DELETE-OUR-NEED.md, ASK-FYD-SEAM-AUDIT.md, BIGGEST-UNCERTAINTY.md, CONTRADICTION-RESOLUTIONS.md, TENSION-RESOLUTIONS.md, GATE-REVIEW.md, ARCHAEOLOGY-SUPPLEMENT.md, INVARIANT-7-ADJUDICATION.md (verdict: ADMIT), WAVE1-SURVIVOR-handoff-contract.md, harvest-index/MECHANISM-INDEX.md, lanes/LANE-16-github-intelligence.md (restored 2026-09-24 UTC, reverified) all read. No em dashes used. No implementation code. No invented wave-1 IDs or pinned SHAs.*
