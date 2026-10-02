# PING AUTONOMY GRAND CHALLENGE: Mechanism Dependency Graph and Implementation Sequencing

**Date:** 2026-09-23. **Mode:** research only. No implementation code.
**Evidence base:** FAIL-1, 2, 3, 5, 6, 7, 8, 9 falsification files; FAIL-4 source report (no falsification file exists, so F4 survivors are scored provisional); MERGED-correction-falsification.md, MERGED-oracle-falsification.md, MERGED-typed-seam-falsification.md; SURVIVOR-ROSTER.md; ARCHAEOLOGY-SUPPLEMENT.md; COVERAGE-MATRIX.md.

**Scope convention.** This graph is built over surviving mechanisms grouped into the merged families the falsifications already validated: the typed projection seam (T), the empirical oracle (O), the correction persistence family (R), the conflict lifecycle (D), and the determinism/pinned-reference pair (P). Two survivors were EXCLUDED by the roster's honest-count rule (F3S1 shape-coverage fixture registry, F5S2 prevention-first generation); F3S1 is retained inside the DAG as a joint-build precondition because F3S3 and F3S4 both depend on it. Class claims below are the PRUNED claims from the falsifications, not the lane-original claims.

---

## 1. Per-mechanism (per-family) prerequisites

### Family T: Typed projection seam (F1S2, F2S1, F2S2, F2S3, F4S3, F5S1, F6S1, F7S3)

Pruned union: #2 (first-party URL slots, inventoried sinks), #5 (literal unbound predicates refused; citation enforcement; entailment decided upstream), #6 (silent private-to-public crossing refused; declassification owner-authorized and logged), #8 (correction-typed bindings make a regen that drops the binding a build failure), #4 supporting (GENERATED copy quarantined off the byte-compare surface within a model version). #1 and #7 are PRUNED from this family entirely.

Prerequisites:

1. **Type constructor plus schema discipline.** A typed-slot contract on the axes the seam checks (URL capability, evidence binding, visibility class, provenance). Nothing novel in principle; the discipline must be structural (runtime brands), not compile-time fiction, or the seam is decorative.
2. **Deduplicated, content-hashed evidence for bindings to point at.** Evidence-bound fact types need distinct claims, not raw fact counts. The F7 falsification proved all three F7 survivors share this upstream dependency and none establishes it. T inherits it through F1S2/F5S1/F7S3 bindings.
3. **Construction-site inventory as a tested artifact.** Every deserialization, hydration, cache-restore, fixture-loading, and admin write path must route through the validating constructor (F2 falsification A1: an unchecked hydration path leaves #2 open in production regardless of constructor strength). Enforced by a CI static gate: build fails on `as` casts targeting URL/provenance types and on `any`-typed values flowing into factual or URL slots.
4. **Render-boundary and bypass inventory as a tested artifact.** Every byte must reach the render tree through a constructor or an inventoried bypass, each bypass carrying its own mitigation test (sanitizer suite for raw HTML, property allowlist for CSS). The product-required raw-HTML/embed region is otherwise untyped (F1 falsification B5), and unlisted sinks (srcdoc, CSS url(), formaction, xlink:href, ping) reopen #2.
5. **Named, authenticated minting authorities.** OWNER_CORRECTION mintable only from the owner-input path with a signed edit event (F7S3 strengthened test xvii); declassification callable only with owner authorization and a readable audit entry (F2 strengthened test 5); visibility marking restricted to named actor classes (F6 strengthened test 1); evidence records immutable-or-versioned with re-verification on mutation (F5 strengthened test 5). No lane survivor names the trust root; the falsifications agree this is the family's load-bearing hole.
6. **URL normalization before matching.** Entity-decode plus WHATWG-parse oracle; the sink derives capability from the element, never from a model-supplied label; the `data:` image exception, if adopted, sink-scoped to img/srcset only (F2 falsification B1).
7. **Availability twin.** Every fail-closed assertion ships with its legitimate-variety corpus (tel: with extensions, IDN domains, mailto: with query params must render functionally) and neutralization/denial telemetry to a readable observation log. Silent fail-closed generates the exception pressure that reopens #2 (F2 falsification C1).
8. **Per-predicate binding coverage.** Binding presence is not enough: every factual predicate in a factual slot must resolve to an entailing binding (F7 falsification 3B, F5 falsification B1). The flourish taxonomy (what counts as fact vs presentation) is a prerequisite for F5S1's verifier to have any bite.
9. **Static-projection scope restriction.** Until the Ask FYD handoff seam is defined (retrieval viewer-filtering, per-sentence bindings, verifier-computed triage), every T class claim is scoped to static projection. The conversational seam restarts every guarantee from zero (MERGED-typed-seam Attack D).
10. **Semantic render model completeness (F4S3, F5S1).** The model the verifier checks must represent the fragment text completely (F5 falsification J1: the representation gap). Undeclared predicates are invisible to every verifier.

Notable member-level prerequisites: F6S1's chokepoint needs the raw graph type unnameable outside the gate module (F6 falsification C1, structural resolution); F6S1 also depends on F6S2's marking correctness (S1 Attack 2: private values inside licensed public fields are delegated silently to the marking authority); F5S1's #9 depends on F9M1 as the conflict source (the verifier preserves CONFLICTING but does not create it); F4S3 needs model-id-as-declared-input plus byte-compare only within a model version (F4 open question 1).

### Family O: Empirical oracle (F1S1, F3S2, F7S1, F8S3, F8S4, F6S4; F3S1 retained as joint build with F3S3)

Pruned union: #1 (measured, load-time, same-engine overflow under block-and-escalate), #4 (drift-from-pinned, divergence tripwire, count-drift), #3 (seen-but-dropped blindness, traversal-level detection via quarantine routing), #7 (crude structural clones; gaming defense only with the explainability decomposition built), #8 (golden-covered corrections pinned against rendered output).

Prerequisites:

1. **Expectation authorship.** Every oracle checks team-authored expectations: the standing assertion suite (F1S1), fixtures (F3S1), the golden set (F8S3), thresholds and bars (F7S1), reason-code vocabulary (F3S2). The authorship is the same team that builds the generator.
2. **An independent runner.** The browser harness (Chromium plus WebKit, font-settling discipline, interaction matrix) for F1S1; the pinned reference parser of verified different lineage for F3S4 (lineage assertion in CI, positive control proving the verifier can fire); the verifier differential corpus with planner blindness to scores for F7S1.
3. **Block-and-escalate.** F1S1's repair-or-block disjunction is resolved against auto-repair by its own falsification (A7: unlogged environment-dependent repair is silent drift by the oracle's own definition). Any repair re-enters as a declared, attributed input change and passes all checks again.
4. **Deduplicated, content-hashed evidence (again).** F7S1's d_in must be computed over distinct claims, not raw fact counts (F7 strengthened test vi); duplicate injection must yield d_in = 0. Same orphan as Family T item 2. This is the dependency the F7 falsification found shared by all three F7 survivors and established by none.
5. **Second-level expectation gating.** Fixture updates, reason-code minting, threshold/bar changes, and golden-set edits must each re-pass a reference the update cannot move (MERGED-oracle Attack b). Without it, expectation rot reintroduces the drift the oracle was built to catch, one blessed edit at a time. Currently no lane survivor implements this.
6. **Gaming defense.** The d_out explainability decomposition (every structural difference cited to a graph feature; unexplained differences scored as gaming) with gaming injection as its acceptance case (F7 strengthened tests iv, v). Without it F7S1 measures variance, not coupling.
7. **Refusal routing plus the shape registry (F3S1/F3S3 joint build).** Declare-at-use dispatch (an exhaustive registry enum the extractor routes through; no shape-handling code outside it), quarantine routing for refused shapes with a gap event, and an independent fixture oracle (`oracle: self` fixtures excluded from coverage). See circular dependency C1.
8. **Receipt schemas and store.** Candidate definition pinned (block-level plus verified node traversal), reason codes carrying the evidence for the failed check, an alert budget on explained-but-unrecognized volume, automated regen-pair diff over content hashes in a queryable store.
9. **Channel registry for F6S4.** The pipeline's channel inventory as a tested artifact; the mutation set derived from the registry (a new channel without a mutation is a suite failure); mutant reachability proven by coverage; fixture fidelity (production registry equals fixture channel list); positive-property assertions (every bound URL parses to an allowlisted scheme and origin) replacing denylist assertions; property-removal mutants that the suite must fail.
10. **Diff base binding (F8S4).** The diff artifact digest-bound to the base it was computed from; out-of-band writes raise a named event before any diff is trusted; resurrection states distinct from "added."
11. **Golden roster check (F8S3).** Every decision-store correction needs a golden twin or the gate fails (F8 strengthened test 2); retraction diagnosis names the retraction and links the store record. F8S3's #4 claim stays struck: the suite pins golden-covered fields, not the page.
12. **Cost honesty.** A per-regen compute budget, a skip policy, and a residual-risk statement for every skipped check. Without it, cost pressure silently degrades the oracles into suggestions, selecting for the most rot-prone members.

### Family R: Correction persistence (F5S3, F8S1, F8S2, F9M4-correction-half, F1S3-corrections-as-inputs)

Pruned union: #8 (instant, single-owner, stable-identity, in-band: a re-dump cannot silently overwrite an owner correction; source contradiction raises a named event), #9 (source-vs-owner axis at regen time), #5 (correction provenance: actor label, timestamp, digest-bound approval against a stated base; actor label demo-grade until the authority exists). #4 is NOT this family's claim (F8S3's #4 was struck).

Prerequisites:

1. **Stable identity anchors.** Content-derived IDs (F4S4): every object ID a hash of canonical coordinates, no random UUIDs in the generation path. Without this, every correction is anchor rot waiting for a re-dump.
2. **A dedicated decision store** that the regeneration pipeline may read but never writes to; re-dumps address the source layer only. Regen steps mutating the store is explicit falsification.
3. **Named, authenticated owner identity and minting authority.** Who may mint an OWNER_ASSERTED record, through which authenticated channel, with the generation pipeline provably excluded from the assertion store (MERGED-correction Attack a; F8 open question 2). The family builds its strongest tier on this unnamed trust root today.
4. **Correction jurisdiction scoping.** What an owner may assert (correct a fact) versus what they may not (invent an object, overwrite a verified license). Typed-ness is structural, not authoritative (F8 falsification Attack C).
5. **Re-anchor protocol.** Named behavior for entity merge/split and deletion-plus-resurrection: re-anchor event with candidate successors; honoring an orphaned patch while its successor escapes counts as falsification (MERGED-correction Attack b; F8 open question 1). F5S3's fail-closed dangling semantics and F8S1's honored-orphan disjunction cannot both be the family rule; one must be chosen.
6. **Three-way merge semantics (F8S2).** Base snapshot store; owner-wins-ties narrowed to corrected-facts (confirm-facts get a separate policy, not auto-win); post-resolution supersession accounting (accept-source marks superseded and retains, never deletes; keep-mine re-binds approval digests).
7. **Time in the abstraction.** Conflict lifetime policy with a default and a clock; correction freshness or re-confirmation; patch lifecycle states (active, superseded, retracted). Without these the #8 claim inverts over time into staleness preservation, which the MERGED-correction falsification marks as the one true FALLS in the family (MERGED-correction Attack d).
8. **Owner-vs-owner vocabulary.** A typed event and adjudication rule for correction-vs-correction (MERGED-correction Attack c; F8 open question 5; F9 open question 6). Currently no member has a third axis; silent last-write-wins is the status quo.
9. **The effective-value authority decision.** Re-apply-on-read (F8S1) versus re-apply-on-regen (F8S2): which layer is authoritative, with idempotency of overlay application stated and tested (MERGED-correction D2).
10. **Task queue infrastructure (F9M4-correction-half).** Owner tasks as the resolution sink; adjudicated-suppression (a refetch of the same losing source-plus-value after owner resolution opens no new task; a new disagreeing value does); owner-absent bound with defined staleness behavior; task-identity dedup key excluding timestamps.

### Family D: Conflict lifecycle (F9M1, F9M2, F9M3, F9M4, F3S3-conflict-half, F5S1-CONFLICTING)

Pruned union: #9 (storage scope: both observations preserved side by side with a CONFLICT record; no single merged record; downstream presentation belongs to M2/M3; owner-vs-owner NOT COVERED), #5 (prose claims with detected conflicting evidence cannot render as unqualified fact; machine-readable seams and agreed-but-wrong evidence excluded), #8 (append-only owner corrections survive regeneration). F9M3's #6 prevention claim does not survive; it is detection only.

Prerequisites:

1. **CONFLICT record entity** with resolution state, in the evidence graph. Storage-level primitive; nothing downstream can preserve what storage never recorded.
2. **Conflict-identity key** excluding observed-at, deduplicating (source pair, field, normalized value pair). Without it every refetch duplicates every conflict and F9M4's task queue floods (F9 falsification M1 Attack 2, M4 Attack 5). Builds on the content-hashed evidence layer.
3. **Normalization vocabulary with a named owner.** "Non-identical" across representations is a semantic judgment; without a stated normalization rule and owner, conflict detection is either undefined or smuggled, and M1 explodes on formatting drift (F9 falsification M1 Attack 1; F9 open question 1). This is the deepest structural crack in the set: required by M1, forbidden as an authority by the cut list's rationale, owned by no doctrine.
4. **Entity identity resolution across blocks.** Same `@id`, or a stated linking rule for blocks describing the same business without one. Otherwise no two blocks can ever be compared (F3 falsification Attack 3C).
5. **Retention exemption.** Conflicted observations survive retention sweeps; the CONFLICT record never points at a dead reference (F9 falsification M1 Attack 4).
6. **Prominence and enforcer for the answer seam (F9M2).** The disagreement disclosure must precede any declarative value statement; the checker is a declared technology (constrained decoding, template slots, or a stated post-hoc validator), with an adversarial answer suite it must reject and canonical good shapes it must accept. Machine-readable seam rule: no single unqualified value emitted as fact under conflict; either omission under a documented conflict-omission rule or a defined machine-readable conflict expression.
7. **Legitimacy metadata and safety precedence (F9M3).** Every audit event records the ranking's authorship (who wrote it, when, on what evidence, for what scope); policy-version flips generate owner-visible notifications; loser visibility reaches owners/visitors, not just engineers; a stated precedence order puts the safety rule above the source-priority ranking (F9 open question 3); the audit log is append-only and tamper-evident.
8. **An engaged, singular, responsive owner (F9M4).** Named as a precondition. Outside it, F9M4 converges to the cut "always ask the owner" failure mode and its prevention claims are carried by M2+M3 alone (F9 falsification M4 Attack 1).
9. **Evidence-quality signal boundary (F9M2).** The gate keys on disagreement, not on evidence quality; agreed-but-worthless evidence renders declaratively by design. The boundary must be stated, not implied.

### Family P: Determinism by construction (F1S3, F4S1, F4S2, F4S4; F3S4 as the pinned reference)

Pruned union: #4 (same inputs plus same pipeline version cannot produce different output, under digest-pinned hermetic closure), #8 (correction loss IS drift: same inputs, different output trips the tripwire). F4 verdicts are provisional: no falsification file exists for FAIL-4.

Prerequisites:

1. **Complete declared input set.** Clock, RNG seeds, iteration order, readdir order, environment (TZ, locale, fonts), and dependency versions are either declared inputs or provably hermetic. Completeness is never tested in any survivor (F1 falsification C1).
2. **Digest-pinned execution closure.** The "pinned pipeline version" must be a cryptographic digest of the full closure (code, lockfile, templates, fonts, config), not a mutable label; the provenance log records the digest. Label-without-change must refuse to promote (F1 falsification C2).
3. **Canonical serialization and hashing.** Sorted keys, sorted iteration, no map-order dependence. Reuses LIVE content-addressed hashing (area 3/4).
4. **Recorded good-output store (F4S2).** (inputHash, outputBytes, outputHash) per site per generation, with a stated retention and comparison budget (F4 open question 7); explained-vs-unexplained divergence discrimination; last-good-output keeps serving on divergence.
5. **Conflict representation standard (F4S2/F9M1).** The typed shape of "sources disagree" in the semantic render model (F4 open question 5). The tripwire preserves conflict markers; it needs the marker to exist. Depends on Family D item 1.
6. **Golden fixture ownership and rotation (F4S1/F4S3).** Who approves intentional output changes, and what stops a rubber-stamp update from laundering real drift (F4 open question 6). This is the second-level gating orphan, shared with Family O item 5.
7. **rendererVersion granularity and markup serializer determinism (F4S1).** The versioning unit that keeps fixtures useful; the byte-compare boundary between the semantic render model and shipped markup (F4 open questions 2, 3).
8. **Pinned reference with verified lineage (F3S4).** A comparison projection with a baseline distribution and a false-positive budget; the sampler under test with a latency bound under a cost budget; a positive control; a CI lineage assertion. Post-repair, production IS the jsonld@9.0.0 lineage, so the honest reference is a second lineage maintained at real cost.

---

## 2. DAG analysis

### 2a. The load-bearing base layer

Mechanisms with no prerequisites inside the set, or prerequisites only on machinery PING already has LIVE per ARCHAEOLOGY-SUPPLEMENT.md. These can be built first, and everything above builds on them.

**B1. Content-derived identity (F4S4).** Prerequisites: one identity authority. Status: LIVE. Area 3 gives `mission_id = sha256(...)` with `ON CONFLICT DO NOTHING`; the D1 adjudication keeps one identity owner that the emit hot path must call. The generation path adopts the same content-address discipline (no random UUIDs, canonical coordinates). Unblocks: correction anchoring (R item 1), conflict-identity keys (D item 2), deterministic byte-compare (P), content-hashed claims (O item 4, T item 2).

**B2. Declared-input purity harness (F4S1).** Prerequisites: pure-function discipline, canonical serialization, content hashing, run-twice byte-compare. Status: LIVE substrate. Area 8 gives canonical workers as pure functions of (event_type, payload) with replay-as-resume and EVAL-007 replay convergence; areas 3/4 give the hashing; the FYD regen harness already runs twice and byte-compares (STEP-01). New work is the FYD-side harness: the render contract tuple, the wall-clock/RNG interdiction lint (folded LANE-4 M-3), model-id-as-declared-input, and the CI byte-compare on the shipped DOM (not just the SiteSpec). Unblocks: determinism-by-construction (P), the tripwire (F4S2), every diff-based oracle (O).

**B3. Audit and observation event schemas.** Prerequisites: an append-only event journal with a single writer. Status: LIVE. Area 4: `ping_events`, `event_id = SHA-256(...)`, no Date.now() in identity material, 2321 rows live. New work is the schemas only: gap events, receipt events, denial/neutralization events, divergence events, SOURCE_CHANGED_AGAINST_OWNER_ASSERTION. Every "log it" clause in every falsification lands here. Unblocks: quarantine drain (F3S3), receipt diffs (F3S2), audit-trail claims (F9M3), telemetry halves (T item 7, O item 12).

**B4. Evidence verification primitive.** Prerequisites: none; reuse. Status: LIVE. Area 16: `EvidenceAuthority.verify()` (hash recompute plus source_event_id trace-back), the WitnessWorker failure-honesty gate, memory write provenance (source_event_id, canonical_hash, namespace). Every "binding" the typed seam checks terminates here. Unblocks: the evidence axis of Family T, claim-level provenance pointers (R).

**B5. The deduped, content-hashed evidence layer.** Prerequisites: content hashing (LIVE); the dedup and normalization rules are new. This is the orphan the F7 falsification found upstream of every F7 survivor and that Families T, O, and D all inherit. It is placed in the base layer because nothing inside the set provides it and its only dependency is already LIVE; it must exist before bindings, d_in, or conflict identity can be built honestly. Unblocks: Family T items 2, Family O items 4 and 8, Family D items 2.

**B6. Quarantine/unknown-state reference semantics.** Prerequisites: none; adopt as doctrine. Status: LIVE reference model. Area 7 / D8: the outreach intent ledger's UNKNOWN_EXECUTION semantics (refuse automatic re-execution; reconcile deliberately) is the proven pattern to copy verbatim for unknown-shape quarantine (F3S3) and the CONFLICTING state (F9M1). Not machinery; a shape to follow.

### 2b. Orphan dependencies

Prerequisites no survivor provides. Each is hidden new machinery the library silently needs; each must be assigned an owner before the dependent family's claim can be stated without scope qualifiers.

1. **The minting/identity authority.** Who may mint OWNER_ASSERTED records and visibility markings, through which authenticated channel, with the generation pipeline provably excluded; correction jurisdiction scoping (correct vs invent). Dependents: Family R items 3-4, Family T item 5, F5S1's OWNER_ASSERTED path. (F8 open question 2; MERGED-correction D3; MERGED-typed-seam Attack A.)
2. **The normalization vocabulary and owner.** The canonical normalization rules plus the named owner of them; the conflict-identity key definition. Dependents: Family D items 2-4, F7S1 d_in, Family O item 4, Family R item 5. (F9 open question 1; the F9 falsification's deepest crack: required by M1, forbidden as an authority by the cut list's rationale, owned by nobody.)
3. **Time in the correction abstraction.** Conflict lifetime policy with a default and a clock; correction freshness or re-confirmation; patch lifecycle states (active, superseded, retracted). Dependents: Family R items 6-7; without them the #8 claim inverts into staleness preservation (the family's one true FALLS). (F8 open questions 3, 4; MERGED-correction Attacks d, e.)
4. **Owner-vs-owner adjudication vocabulary.** A typed event and resolution rule for correction-vs-correction. Dependents: Family R item 8, F9M4's contested-ownership case. Currently silent last-write-wins. (F8 open question 5; F9 open question 6; MERGED-correction Attack c.)
5. **Re-anchor protocol.** Named behavior for entity merge/split and deletion-plus-resurrection; one chosen orphan semantic (fail-closed dangling vs honored orphan). Dependents: Family R item 5, F1S3's #8 hard half, F8S1's anchor universality. (F8 open question 1; F1 open question 6; MERGED-correction Attack b, D4.)
6. **Tested inventories.** The construction-site inventory, render-boundary/bypass inventory, and channel registry as CI-enforced artifacts. Dependents: Family T items 3-4, F6S4 (registry-derived mutations), F1S2's escape-hatch completeness. (MERGED-typed-seam Attacks A, B; F6 falsification C1, C3.)
7. **Verifier independence machinery.** CI lineage assertions, positive controls, verifier differential corpora, planner blindness to verifier scores. Dependents: Family O items 2 and 6, F3S4, F7S1. Independence is asserted by every oracle and constructed by none. (MERGED-oracle Attack a.)
8. **Second-level expectation gating.** The approval protocol for golden/fixture/threshold/reason-code updates, plus the update-oracle the update cannot move. Dependents: Family O item 5, Family P items 6, F3S1, F8S3. Without it, expectation rot reintroduces drift one blessed edit at a time. (MERGED-oracle Attack b; F4 open question 6.)
9. **The visibility classification authority.** What makes a fact private: the classification source itself. Dependents: every #6 claimant (seven of them), F6S1's value-level canary, F6S2's marking boundary. The ARCHAEOLOGY supplement is explicit: all seven enforce a classification, none creates it. (Class #6 summary; F6 open question 2.)
10. **The Ask FYD handoff seam.** Retrieval viewer-filtering, per-sentence bindings, verifier-computed triage labels, conversational sink validation. Dependents: every unscoped class claim in Families T and D; #2/#5/#6/#1 all reopen through the chat surface today. (MERGED-typed-seam Attack D; F5 falsification section 4; F2 falsification B2/Q7.)
11. **Availability twins.** Legitimate-variety corpora, neutralization/denial telemetry, skip policies with residual-risk statements, per-regen compute budgets. Dependents: Family T item 7, Family O item 12. Silent fail-closed generates the exception pressure that reopens the holes it closed. (MERGED-typed-seam Attack C; MERGED-oracle Attack e; F2 open question 6.)
12. **The #7 structural signature.** The defined, calibrated structural-divergence signature for clone detection. Dependents: F1S1's #7 claim (currently FALLS as specified), F7S1's calibrated divergence assertion. (F1 open question 3.)
13. **Quarantine drain SLA and task infrastructure.** Who triages the gap feed, on what cadence, with age escalation; the owner task queue with adjudicated-suppression and an owner-absent bound. Dependents: F3S3's durability, F9M4. A write-only quarantine is a second /dev/null with better labeling. (F3 open question 2; F9 falsification M4.)

### 2c. Circular dependencies

**C1. Registry versus quarantine boundary (F3S1 vs F3S3).** F3S1's registry needs F3S3's refusal routing so that "green" never certifies blindness; F3S3's quarantine needs F3S1's registry to draw the known/unknown boundary (F3 falsification cross-cutting). Resolution: build them as ONE artifact, the shape registry with refusal routing, in a single phase. Neither precedes the other.

**C2. Repair versus purity (F1S1 vs F1S3).** Composing an environment-dependent auto-repair after a pure projection yields an impure pipeline (F1 falsification C4). Resolution: not a build order but a decision, already made by the falsification: block-and-escalate only; any repair re-enters as a declared, attributed input.

**C3. Two checkers, one property (F1S1 determinism assertion vs F4S1/F1S3 purity vs F8S3 golden suite vs F3S2 receipt diff vs F4S2 tripwire).** Five diff engines compare runs against each other; F1S1 byte-compares the SiteSpec while F1S3 reasons about final output purity (F1 falsification C-C). Resolution: one canonical run-twice-and-diff capability with a single artifact definition (the shipped DOM), consumed by all five. Duplication here is five drift detectors drifting apart.

**C4. Gate versus suite (F6S1 vs F6S4).** If a bypass can be written, S1's "the leak is impossible at the gate" is false and enforcement is S4's suite; if it cannot be written, S4's headline mutation is vacuous (F6 falsification C1). Resolution: the structural reading. Make the raw graph type unnameable outside the gate module; S4's mutation becomes "attempt an unlicensed bind in test code," which must fail at compile time. Both tests are then rewritten against the structural property.

**C5. The effective-value authority (F8S1 re-apply-on-read vs F8S2 re-apply-on-regen).** If read-seam composition is universal, the regen merge is redundant; if the merge output is the system of record, per-read composition is redundant; with both live, overlay application must be idempotent, which is assumed never stated (MERGED-correction D2). Resolution: an explicit authority decision in Phase 3, not code written twice.

**C6. Fixture oracle lineage (F3S1 vs F3S4).** F3S1 needs an independent fixture oracle; F3S4 IS that oracle; but post-repair, production uses the jsonld@9.0.0 lineage, so F3S4's "independent" reference may share lineage with production, destroying the independence both depend on (F3 falsification Attack 4B). Resolution: the CI lineage assertion (Orphan 7) plus a second lineage maintained at real cost, or the #3-via-registry claim stays conditional.

---

## 3. Implementation sequence

Four phases. Each phase's entry criteria are the completion of the prior phase's artifacts it depends on. Class unlocks are the PRUNED claims, not the lane-original claims. FAIL-4 survivors enter as provisional (no falsification file exists); their phase placement assumes the falsification will not demote them below the >=2 bar.

### Phase 1: Base layer (identity, purity, evidence plumbing)

Build on LIVE PING machinery. No survivor-internal prerequisites beyond the LIVE list.

- B1 content-derived identity (F4S4) on the single identity authority: every generated ID a hash of canonical coordinates; no-random-UUID lint in CI; correction keys and anchor IDs derived, never minted.
- B2 declared-input purity harness (F4S1): the pure render contract tuple with rendererVersion and model id as declared inputs; canonical serialization; wall-clock/RNG/ambient-I-O interdiction in the render path; run-twice byte-compare in CI against the shipped DOM; GENERATED copy quarantined off the byte-compare surface with seed pinning.
- B3 audit and observation event schemas on the LIVE append-only journal: gap events, receipt events, denial/neutralization events, divergence events, typed conflict events. The schemas are new; the journal is not.
- B4 evidence verification adoption: the typed seam's evidence axis terminates at the LIVE EvidenceAuthority pattern (verify, hash recompute, source_event_id trace-back); memory and claim artifacts carry canonical_hash plus namespace.
- B5 deduped, content-hashed evidence layer: the normalization and dedup rules that turn scraped facts into distinct claims. The single largest orphan in the set; everything in Phases 2 and 3 that binds, counts, or compares evidence depends on it.
- B6 quarantine/unknown-state doctrine adoption: the UNKNOWN_EXECUTION reference semantics (refuse automatic re-execution; reconcile deliberately) as the shape for unknown-shape quarantine and the CONFLICTING state.

**Unlocks:** #4 fixture-drift in its crude form (byte-compare, replay tripwire, run-twice discipline); #8 correction-loss in its declared-input form (a regen that drops a correction is drift by definition); the audit substrate every later claim's telemetry and logging depends on. #5 gains its evidence-verification terminus.

### Phase 2: The seam (typed projection, conflict state, quarantine)

Entry: B1 (stable IDs), B3 (event schemas), B4 (evidence verification), B5 (deduped evidence).

- T-core: typed projection seam, static scope. Constructors for URL capability, evidence binding, visibility class, and provenance with runtime brands; per-predicate binding coverage; the construction-site inventory and render-boundary/bypass inventory as CI-enforced artifacts; URL normalization (entity-decode, WHATWG-parse, sink-derived capability); the availability twin (legitimate-variety corpus, neutralization telemetry); fail-closed defaults for indeterminate inputs. F2S2's sink-side re-validation and F2S3's defaults ship as seam discipline, not separate systems.
- Orphan 9 (partial): the visibility classification authority, at minimum the tier vocabulary the seam enforces (owner-marked, source-derived, public). The seam enforces faithfully; the authority that mints the classification must exist before #6 is more than enforcement of guesses.
- Orphan 1 (partial): named, authenticated minting authorities for OWNER_CORRECTION, visibility markings, and declassification; the generation pipeline provably excluded from the assertion store; correction jurisdiction scoping.
- D-core (storage): the CONFLICT record entity with resolution state; the conflict-identity key over content-hashed claims; the normalization vocabulary with a named owner (Orphan 2); retention exemption for conflicted observations; entity identity resolution across blocks.
- F3S3/F3S1 joint build (resolves C1): the shape registry with declare-at-use dispatch and refusal routing to quarantine; structural-signature dedup on gap events; a noise budget; the drain SLA with ownership and age escalation (Orphan 13, partial); classifier boundary pinning (business shapes quarantined, known non-business shapes skipped silently).
- F6S1 chokepoint: the structural resolution of C4 (raw graph type unnameable outside the gate module); the channel registry as a tested artifact.

**Unlocks:** #2 unsafe-url (first-party URL slots, inventoried sinks, normalized matching); #5 claim-binding (literal unbound predicates refused, citation enforcement); #6 visibility-error (silent private-to-public crossing refused; declassification owner-authorized and logged); #9 conflict-collapse at storage scope (both observations preserved, no merged record); #3 graph-blindness in its narrow forms (seen-but-dropped via receipts later, unknown shapes quarantined loud now). The seam claims stay scoped to static projection until Phase 4.

### Phase 3: The lifecycle (correction persistence, conflict presentation, empirical oracles)

Entry: Phase 2 seam and conflict storage; B1; B2; B3; B5; Orphans 1 (minting authority) and 2 (normalization) resolved.

- R-core: the decision store (read by regen, never written by it); typed patches anchored to content-derived IDs; the re-anchor protocol with one chosen orphan semantic (Orphan 5); the three-way merge with owner-wins-ties narrowed to corrected-facts and post-resolution supersession accounting; the effective-value authority decision (resolves C5); the conflict lifetime policy with default and clock plus correction freshness/re-confirmation plus patch lifecycle states (Orphan 3); the owner-vs-owner typed event and adjudication rule (Orphan 4); the owner task queue with adjudicated-suppression, task-identity dedup, and an owner-absent bound (Orphan 13, remainder).
- D-presentation: the auditable source-priority policy with authorship metadata, owner-visible loser surfacing, policy-version-flip notifications, and the safety-over-priority precedence order; certainty attenuation at the answer seam with the prominence requirement, declared enforcer, and adversarial answer suite; machine-readable seam conflict rule (omission under a documented rule or defined machine-readable conflict expression). F9M3's #6 claim ships as detection, honestly labeled.
- O-core: the full empirical oracle under block-and-escalate (engine parity, font-settling discipline, interaction matrix over fixed off-canvas panels, per-panel scrollWidth assertions); F7S1 variance coupling with the explainability decomposition, gaming-injection acceptance, verifier differential corpus, and planner blindness; F3S2 receipts with automated content-hash regen diffs and reason-code volume budgets; F8S3 golden set with the roster check and retraction diagnosis; F8S4 diffing with base-digest binding and resurrection states; F6S4 mutation suite with registry-derived mutations, reachability proof, and property-removal mutants; F3S4 pinned reference with the CI lineage assertion, positive control, and sampled latency bound. Second-level expectation gating for every expectation update (Orphan 8); the cost budget with skip policy and residual-risk statements (Orphan 11, partial).
- F7S2 evidence-gated composition: per-section counterfactual causal proof, median-pair differentiation, versioned bars with convergence monitoring. Builds on B5 (bar inputs are deduplicated claims) and O-core's gaming defense.

**Unlocks:** #8 correction-loss in full (instant plus lifetime: re-anchor, staleness policy, owner-vs-owner, task lifecycle); #9 conflict-collapse end-to-end within the owner-present regime (storage plus presentation plus resolution loop); #7 clone-sitespecs (variance coupling with gaming defense, evidence-gated composition; the #7 structural signature, Orphan 12, is the remaining gap); #4 fixture-drift in full (tripwire, pinned reference, receipt diffs, golden pins); #1 mobile-overflow measured (full matrix, both engines, interaction coverage); #3 graph-blindness via pinned reference and quarantine drain.

### Phase 4: Scope completion (the second seam and the distribution tail)

Entry: everything above. This phase removes the scope restrictions the earlier phases carried honestly.

- Orphan 10: the Ask FYD handoff seam. Retrieval returns viewer-filtered claims; each answer sentence carries bindings to retrieved claims or is marked UNKNOWN/refusal; the triage label is computed deterministically from sentence bindings by the verifier, never by the LLM; the conversational output renderer passes the full poisoned-model suite (sink validation, binding coverage, visibility checks) independently.
- Machine-readable seam completion: conflict-omission rules for schema.org/OG/sitemap surfaces; CONFLICTING markers that survive truncation transforms or are omitted under the documented rule.
- Preview and distribution: preview licenses that do not travel as bearer URL tokens through ungoverned channels; cache keys that include the visibility context; public-to-private cache invalidation receipts (the blast-radius policy for already-emitted bytes); contextless background reads fail closed; per-tenant write isolation; revision-history privacy.
- Tenant enforcement completion (F6S3): secured session minting; retrieval query tenant-predicate assertion; ambiguous deployment config refuses to build.
- F9M2's evidence-quality boundary stated; agreed-but-worthless evidence handled by the declared rule.

**Unlocks:** the unscoped claims: #2/#5/#6 on the conversational surface; #6 cache blast radius; #5 on machine-readable seams; #1 for conversational answer cards (unbreakable tokens, wide tables); #9's visibility chain terminating at owners and visitors rather than engineers.

---

## 4. LIVE versus new machinery

### LIVE in PING: reuse, do not rebuild (per ARCHAEOLOGY-SUPPLEMENT.md)

- **Content-addressed identity and dedup on re-ingest** (areas 3, 4): `mission_id = sha256(...)`, `event_id = SHA-256(...)`, no wall-clock in identity material, `ON CONFLICT DO NOTHING`. The pattern B1 and B5 extend; the generation path must adopt it, not reinvent it.
- **Pure-function workers and replay-as-resume** (area 8): canonical workers as pure functions of (event_type, payload); EVAL-007 replay convergence. The substrate B2 builds on.
- **Evidence verification** (areas 15, 16): `EvidenceAuthority.verify()`, `source_event_id` plus `canonical_hash` plus namespace on every artifact, the WitnessWorker failure-honesty gate. The terminus for Family T's evidence axis.
- **Append-only event journal with a single writer** (area 4): `ping_events`, 2321 rows live. Every receipt, gap event, denial log, divergence event, and audit entry in this graph is a schema on this journal, not a new store.
- **UNKNOWN-outcome and quarantine semantics** (area 7, D8): lease reaper, retry to dead letter, the outreach ledger's UNKNOWN_EXECUTION (refuse automatic re-execution; reconcile deliberately). The reference shape for F3S3 quarantine and the F9M1 CONFLICTING state.
- **Atomic claim semantics** (area 9): conditional claim UPDATE with loser rowCount 0. Available if any exactly-once claim machinery is needed.
- **One identity authority** (D1 adjudication): the emit hot path must call the chosen owner instead of computing SHA-256 inline. All content-derived IDs in this graph anchor here.
- **Standing rejections that bound the build:** no second event journals, no advisory-lock lease helpers, no fail-open tool_authority, no new memory store, no invented RBAC. The decision store (R) is a scoped correction record, not a second journal; it rides the LIVE journal's eventing.

### New machinery: must be built (the orphans, consolidated)

1. The deduped, content-hashed evidence layer (normalization plus dedup rules over scraped facts). Biggest single orphan.
2. Named, authenticated minting authorities: owner identity, assertion minting channel, visibility marking authority, declassification authorization, correction jurisdiction scoping.
3. The conflict record entity, normalization vocabulary with a named owner, conflict-identity key, retention exemption, entity identity resolution.
4. Time in the correction abstraction: conflict lifetime policy with default and clock, correction freshness/re-confirmation, patch lifecycle states.
5. Owner-vs-owner adjudication vocabulary and contested-ownership state.
6. The re-anchor protocol for merge/split/resurrection with one chosen orphan semantic.
7. CI-enforced inventories: construction sites, render-boundary/bypass paths, channel registry (with registry-derived mutation sets).
8. Verifier independence machinery: CI lineage assertions, positive controls, verifier differential corpora, planner blindness to verifier scores.
9. Second-level expectation gating: the update-approval protocol for fixtures, golden sets, thresholds, and reason codes.
10. The visibility classification authority (what makes a fact private), distinct from the seven enforcement mechanisms.
11. The Ask FYD handoff seam definition (viewer-filtered retrieval, per-sentence bindings, verifier-computed triage).
12. Availability twins: legitimate-variety corpora, neutralization/denial telemetry, per-regen compute budgets, skip policies with residual-risk statements.
13. The #7 structural-divergence signature (defined and calibrated).
14. Quarantine drain SLA with ownership; the owner task queue with adjudicated-suppression and owner-absent bound; the decision store with its write-path discipline.

### Standing caveats carried into the sequence

- FAIL-4 survivors are provisional: no falsification file exists, so F4S1-S4 enter Phase 1 on claimed strength. A FAIL-4 falsification pass is still owed; if it demotes any of them below the >=2 bar, Phase 1's purity claims shrink to the run-twice harness already live in the FYD tree.
- F3S1 and F5S2 are EXCLUDED from the library as standalone >=2 mechanisms. F3S1 is retained in the DAG only as the joint build with F3S3 (C1); F5S2 survives only as citation enforcement, folded into Family T's seam discipline.
- The falsifications resolved two disjunctions by decision, not code: block-and-escalate only (no auto-repair), and the static-projection scope restriction until Phase 4. Both are carried as build constraints.
- Every class claim in the sequence is the pruned form. In particular: #1 belongs to the oracle, not the type system; #7 has no claim until the signature exists; #4 is not the correction family's claim; F9M3's #6 is detection, not prevention; the conversational surface is out of scope until Phase 4.
