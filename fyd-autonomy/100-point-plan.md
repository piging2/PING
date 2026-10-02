# FYD / PING Autonomy Program: 100-Point Plan

Research coordinator report. Date: 2026-09-27. Status: research only; nothing in this document has been implemented.

Every concrete claim below is grounded in files, tests, code, or observed behavior actually inspected during this research pass. Where evidence was unavailable, that is stated.

Scope notes: `~/workspace/fyd-product-lane` is a snapshot; the canonical FYD repo lives on the Pig at `/home/nolan/projects/ping` and was not reachable from this sandbox. The "195/195" test figure is a 2026-09-21 snapshot, not current HEAD truth. The operations/supervision inventory below is grounded in the incident surfaces inspected during the 2026-09-26 journal gateway work (tripwire.sh, pigi-fyd-stack-watchdog.ps1, ping-gateway-watchdog.ps1, start-18199.sh, schtasks output, watchdog logs) plus the operations reader's amendment on MISSION_RECONCILE_HOLD; a full standalone inventory report from the operations reader did not arrive and was not invented.

## Summary

- AXIOMS REVIEWED: 57 (25 SOUL principles, 14 AXIOM-LEDGER axioms, 10 STANDING-INVARIANTS, 1 phase-6 event-source gate, 7 Jev lane laws)
- VIOLATIONS: 14 with direct evidence (SOUL 6, 8, 10, 11, 12, 14, 18, 22; LEDGER E1, F1; STANDING-INVARIANTS S9; plus FYD-010, FYD-037, and the reaper-vs-HOLD gap as live instances). Details in Deliverable 1.
- AMBIGUOUS AUTHORITIES: 7 (MISSION_RECONCILE_HOLD emission; engagement-driver fix authority; targeting-rule ownership; coarsenAddress ownership; discovery-pool adjustment authority; committed-vs-uncommitted module ownership for lanes; phase-6 gate wiring authority)
- HUMAN BOTTLENECKS FOUND: 16
- BOTTLENECKS THAT ACTUALLY REQUIRE HUMANS: 11 (Instagram/TikTok login and 2FA; credential rotation after exposure; new outreach channel; public content publication; relaxing never-reengage semantics; GitHub App installation; device/tunnel approval; production/main merge authority; plus 3 more in the full analysis)
- BOTTLENECKS THAT SHOULD BE AUTOMATED: 5 (Instagram CDP wedge recovery with no graceful restart path; the Sept-16 blanket force-kill rule blocking graceful closes and origin-scoped cleanup; routine reversible driver fixes queued for morning review; read-only discovery-pool widening treated as a contact decision; plus one missing graceful-restart capability)
- TOP 10 AUTONOMY IMPROVEMENTS:
  1. SI-03: Escalation classifier before asking Nolan (grill-20 as a gate)
  2. AU-05: One-tap approval bundles for every human-only action class
  3. R-04: Self-healing evidence emission standard for all watchdogs
  4. A-02: Confidence classification for proposals (act vs escalate with evidence)
  5. A-05: Proposal schema v1 (action, reversibility, blast radius, rollback, evidence)
  6. AU-04: Desired-state declarations for every supervised component
  7. AU-01: L1 authority: restart a bounded dev process without asking
  8. AU-03: L1 authority: rerun deterministic tests and repair generated fixtures without asking
  9. O-07: Deploy the fyd-3100-monitor (design exists, deployment does not)
  10. S-03: One-tap approval bundle pattern generalized to all human-only auth asks
- TOP 10 PRODUCT IMPROVEMENTS:
  1. T-06: Clean-checkout replay gate for all lanes (the ask-lane lesson)
  2. C-04: Refusal coverage battery for unsupported claims
  3. P-08: WHY THIS lightweight for owners (Correct/Hide)
  4. D-01: Fixture role manifest (generated vs canonical, machine-enforced)
  5. P-06: Fix ask-pipeline dangling site-bundle import (snapshot drift)
  6. T-04: Determinism CI gate for the generator (STEP-01 as a gate, not a record)
  7. WB-04: Determinism fail-first tests for the generator (byte-identical repeated generation)
  8. D-02: Closure-aware reconciliation for all gap detectors
  9. AC-03: Structured vs messy web parse tiers with truthful extraction stats
  10. C-02: Jev evidence-support classification as primary for Ask FYD
- TOP 10 THINGS TO DELETE/MERGE:
  1. H-01: MERGE the three mission/capability schedulers to one constitutional owner
  2. H-02: MERGE the divergent canonical_event_envelope copies
  3. H-03: MERGE the divergent unified_event_runtime copies
  4. H-04: MERGE the divergent fyd-journal-gateway copies (tenant-boundary risk)
  5. H-05: MERGE the divergent safe-fetch copies
  6. H-06: FREEZE staging/, h16-staging/, phase20-builder-staging/, migration_archive/, lane-h/ as read-only
  7. H-07: coarsenAddress: wire the canonical or delete the local copy
  8. H-08: Replace heroic harvests with a recurring bounded harvest process
  9. S-01: DELETE the over-broad Sept-16 force-kill blanket rule (replace with scoped rule)
  10. P-05: RETIRE demoOwnerContext for production tenants (bind real owner identity)
- 100-POINT PLAN: this document, `~/workspace/fyd-autonomy/100-point-plan.md`, Deliverable 2 below
- ASK FYD STATUS: IMPLEMENTED and working, refusal-verified. Entrypoints: POST /api/fyd/ask/[siteId] (tenant from route path; body tenant mismatch refused, 400) and legacy POST /api/fyd/ask. The public pipeline projects PUBLIC objects and active relationships only, applies owner field-visibility plus a visitor-safe field allowlist; mode "owner" is accepted but treated as visitor until an authenticated lane exists. Refusal: answerClass "unknown" on refusal or zero citations; STEP-04 PASS on both sites ("holiday hours Thanksgiving 2027" answered "I do not have evidence for that"; suitability inference refused). OPEN DEFECTS: FYD-010 is falsified (buildAskFydContext leaks phone, home_address, _internal_notes into visitor context); owner identity is demo-only (demoOwnerContext stamped everywhere).
- FIRST PRODUCT FAILURE: P-01. There is no automated PASTE URL to new-tenant site pipeline. The preview route stops at an evidence preview plus an OBSERVED claim; onboarding a new business is manual operator assembly; both served tenants are hand-pinned fixtures. The loop's first two arrows (PASTE URL -> FYD UNDERSTANDS IT -> FYD BUILDS IT) do not run without a human.
- FIRST AUTONOMY FAILURE: S-04 / A-01. Proposal-only authority with no action levels turns routine reversible driver fixes into morning-review debt (training-curriculum.md:63). The system cannot do bounded reversible work without Nolan, so autonomy dies in a queue.

---

## Deliverable 1: axiom review

For each axiom or principle found, the eight required questions are answered. "No direct evidence in surveyed material" means the readers inspected the relevant surfaces and found neither an implementation nor a violation; it is not a claim of absence.

### SOUL.md principles

- AXIOM: SOUL 1. Be useful.
- WHAT IT PROTECTS: Relevance. Work must serve an outcome, not perform helpfulness.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The product loop itself (PASTE URL to KEEPS IT CURRENT); Ask FYD answers with evidence; the outreach machine's quiet reporting discipline (surface only what matters).
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: Who judges "useful" for a new capability: the owner, Nolan, or the agent. No metric exists (see C-05).
- WHAT TEST PROVES IT: None yet. C-05 (trusted-answer-time metric) is the proposed proof.
- WHAT AUTOMATION CAN ENFORCE IT: The trusted-answer-time metric plus the four-question harvest filter (remove commodity work, improve the product loop, improve autonomy, preserve optionality).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether a capability deserves to exist at all.

- AXIOM: SOUL 2. Earn trust.
- WHAT IT PROTECTS: Trust as a property of behavior: accuracy, transparency, determinism where required, explicit uncertainty, conservative irreversible actions, evidence.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Ask FYD refusal behavior (STEP-04); digest-bound patch approvals (409 stale_proposal); tripwire kill/recovery proof with journal integrity intact; attestation on Jev calls (failed attestation never silently consumed).
- WHERE IT IS VIOLATED: The stale 195/195 claim presented as current HEAD truth manufactures certainty (see SOUL 18).
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: STEP-04 refusal tests; tripwire controlled kill/recovery proof (2026-09-26); Jev contract tests (25/25).
- WHAT AUTOMATION CAN ENFORCE IT: Refusal battery (C-04); clean-checkout replay gate (T-06); watchdog failure injection (R-03).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether trust has actually been earned by a specific owner (only the owner can say).

- AXIOM: SOUL 3. Think like an owner.
- WHAT IT PROTECTS: Fixing boundaries, not just bugs. A great system makes entire classes of bugs harder to create.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The failure archaeology practice itself (nine failures converted to invariants); the never-reengage guard fix (2026-09-25) fixed the boundary (ledger-aware post IDs) not just the incident.
- WHERE IT IS VIOLATED: No direct violation found; the opposite failure mode appears instead (trauma becoming permanent blanket gates, e.g., the Sept-16 rule).
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: The lesson-artifact mapping: each of the nine failures has an encoded lesson (test, tripwire, type, schema, policy, or recipe).
- WHAT AUTOMATION CAN ENFORCE IT: SI-01 (failure-to-lesson loop as a tracked workflow).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Deciding which boundary fix is worth the cost.

- AXIOM: SOUL 4. Be resourceful before asking.
- WHAT IT PROTECTS: Nolan's attention. Investigate first: files, implementation, architecture, docs, reproduction.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The escalation classifier concept (grill-20); the standing investigation pattern (what was found, what it means, what should happen next).
- WHERE IT IS VIOLATED: The morning-review queue: proposals arrive without the investigation that would have resolved them (see bottleneck 12).
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: None yet. SI-03 (classifier gate) is the proposed proof.
- WHAT AUTOMATION CAN ENFORCE IT: The escalation classifier as a gate (SI-03); proposal schema requiring evidence refs (A-05).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Genuine ambiguity after a complete investigation.

- AXIOM: SOUL 5. Have a point of view.
- WHAT IT PROTECTS: Decisions: simple over ornamental, explicit contracts, boring infrastructure, evidence over assertion, one authoritative implementation.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The harvest discipline's four questions; the Rule of One consolidation procedure (discover, understand, classify, consolidate, verify, archive/delete).
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: The merge items (H-01..H-05) each require behavioral equivalence proof before consolidation.
- WHAT AUTOMATION CAN ENFORCE IT: H-08 (recurring bounded harvest with the four-question filter).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Taste-level calls (which simple design is the right one).

- AXIOM: SOUL 6. Constitutional Rule of One.
- WHAT IT PROTECTS: One authoritative owner per important architectural concern.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The consolidation procedure is defined; PingObjectReader as the governed read seam for tenant graphs.
- WHERE IT IS VIOLATED: Direct evidence. Three mission/capability schedulers (f01-fix, pig-transfer-tmp, caller-adaptation-lane). Two canonical_event_envelope copies with divergent validation. Multiple unified_event_runtime.js copies. Divergent fyd-journal-gateway server.mjs copies. Two safe-fetch copies (src/fyd/net vs work/new staging). Split coarsenAddress authority.
- WHERE OWNERSHIP IS AMBIGUOUS: Which copy is canonical in each pair; who decides the survivor.
- WHAT TEST PROVES IT: None yet. The merge items (H-01..H-05, H-07) define the equivalence proofs required.
- WHAT AUTOMATION CAN ENFORCE IT: Periodic sovereignty audit (search by meaning, SOUL 15); import scans proving single consumption.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Choosing the survivor when behavioral deltas are valuable on both sides.

- AXIOM: SOUL 7. Never create architectural amnesia.
- WHAT IT PROTECTS: Memory. Consolidation must be discover, understand, classify, consolidate, verify, archive/delete, never old-looking file to delete.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: FAILURE_LEDGER.md; the merge items' required behavior-preservation step; the freeze-before-delete proposal (H-06).
- WHERE IT IS VIOLATED: No direct violation found; the risk is in the proposed deletions, which is why H-06 freezes first.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: Behavioral equivalence suites required by each merge item.
- WHAT AUTOMATION CAN ENFORCE IT: The consolidation procedure as a checklist; archive-before-delete enforcement.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether deadness is truly proven for a given directory.

- AXIOM: SOUL 8. Protect sovereignty.
- WHAT IT PROTECTS: Declared authority must match actual capability ownership; enforcement, not comments, establishes sovereignty.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Jev has no effect authority (contract-tested); tenant isolation tests for Postgres and Qdrant; the never-reengage guard's terminal-aware ledger merge.
- WHERE IT IS VIOLATED: Direct evidence. coarsenAddress: the canonical implementation in visibility-policy.ts has zero consumers while service-cards.ts runs a divergent local copy, so the declared privacy authority is bypassed (this is the FYD-010 mechanism). FYD-037: no wrong-journal guard, so emit() can bypass the journal authority by misconfiguration.
- WHERE OWNERSHIP IS AMBIGUOUS: coarsenAddress ownership (H-07); journal marker authority (SE-02).
- WHAT TEST PROVES IT: Jev contract tests (25/25, every refusal path makes zero provider calls); tenant isolation tests.
- WHAT AUTOMATION CAN ENFORCE IT: C-01 (field-level privacy gate); SE-02 (wrong-journal guard); sovereignty audits that grep for bypass constructions.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether a specialization is a legitimate adapter or a sovereignty violation (the SOUL 6 test: can two implementations independently exercise the same capability).

- AXIOM: SOUL 9. Truth has layers.
- WHAT IT PROTECTS: Source truth, derived truth, presented truth, and evidence must not silently become interchangeable.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Why-this drill-down (value to field to method to source URL or content-addressed event id); evidence classes (direct, derived, inferred, generated); claim classes (supported, derived).
- WHERE IT IS VIOLATED: Historical. FL-20260921-034: generated extraction output silently replaced a rich canonical fixture, collapsing derived truth into source truth. Fixed by fixture role separation; machine enforcement proposed (D-01).
- WHERE OWNERSHIP IS AMBIGUOUS: Relationship derivation (observed vs inferred) is unlabeled (D-07).
- WHAT TEST PROVES IT: STEP-05 (why-this); fixture digest verification on the read seam.
- WHAT AUTOMATION CAN ENFORCE IT: D-01 (fixture role manifest); D-05 (provenance completeness); D-07 (relationship inference audit).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether a derived claim is fair to present as fact to an owner.

- AXIOM: SOUL 10. Determinism is a product feature.
- WHAT IT PROTECTS: Same causal history produces same replay ordering, execution, canonical state, bytes, hash, witness.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: generateSiteSpec determinism (STEP-01: specDigest identical across runs, zero customer-specific code); canonicalizeModel plus semantic digest in render-model.ts; binding verifier.
- WHERE IT IS VIOLATED: Historical. A module-global projectCounter produced identities from mutable process state (fixed 2026-09-22, hostile-g2). Currently unguarded: no CI gate runs STEP-01 per change.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: STEP-01 record (one-time); structured-determinism tests in proceduralize __tests__.
- WHAT AUTOMATION CAN ENFORCE IT: T-04 (determinism CI gate); WB-04 (fail-first repeated-generation tests); T-02 (property tests for canonicalization).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Which nondeterminism is intentional and must be kept outside constitutional outputs.

- AXIOM: SOUL 11. Failure is information.
- WHAT IT PROTECTS: Never confuse "nothing exists" with "the system failed to find it". Failures need typed, deterministic semantics.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Typed gap states in the tandem pipeline; Jev failed attestation never silently consumed; UNKNOWN outcome typing in the runtime.
- WHERE IT IS VIOLATED: Direct evidence, two instances. Historical: the @graph silent-empty (pipeline ran green, produced nothing; fixed). Open: lane_c_failure_injection P1/P3 (orphaned events from kill -9; mid-derivation crash loses queued events) and P4 (emit try/catch swallows errors), parked as follow-ups (T-01).
- WHERE OWNERSHIP IS AMBIGUOUS: Who owns the parked lane_c findings (T-01).
- WHAT TEST PROVES IT: Replay and failure-injection tests (orphaned events, no restart scan, mid-derivation crashes, truncation, era mismatch, determinism).
- WHAT AUTOMATION CAN ENFORCE IT: AC-03 (zero-fact alert on successful fetch); T-01 (tracked issues for parked findings); R-07 (UNKNOWN dashboard).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether an ambiguous failure is retryable or terminal.

- AXIOM: SOUL 12. Evidence before eloquence.
- WHAT IT PROTECTS: Claims must carry their evidence; the more consequential the claim, the stronger the evidence required.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Ask FYD citations; why-this evidence chains; tripwire kill/recovery proof; clean-checkout replay practice (ask-lane 92/92).
- WHERE IT IS VIOLATED: The 195/195 claim: a 2026-09-21 snapshot presented in standing prose as current HEAD truth, after material tree changes on 2026-09-22 and 2026-09-26.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: P-07 (re-run on HEAD) is the proposed proof; TEST-GATE.md (116 measured 2026-09-21) is the last real measurement.
- WHAT AUTOMATION CAN ENFORCE IT: P-07 plus a dated-baseline rule (no test-count claim older than the last measured run).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether evidence is sufficient for a consequential claim.

- AXIOM: SOUL 13. Build for replay.
- WHAT IT PROTECTS: Important behavior must be explainable after the fact: what happened, why, what information caused it, which authority decided, which version ran, can we reproduce it.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The journal as the event spine; attempt records; the evidence emission pattern (TRIGGER through VERIFICATION) used in incident records.
- WHERE IT IS VIOLATED: The ask-pipeline snapshot drift (P-06): the pipeline cannot be replayed from the snapshot tree because site-bundle.ts is missing.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: T-06 (clean-checkout replay gate); R-04's requirement that the September incident be replayable from emitted records alone.
- WHAT AUTOMATION CAN ENFORCE IT: T-06; R-04 (evidence emission standard for watchdogs).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Which behavior is "important" enough to require replayability.

- AXIOM: SOUL 14. Treat data as a liability until proven otherwise.
- WHAT IT PROTECTS: Identity, ordering, provenance, and semantics must survive every boundary crossing.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: SSRF-safe fetch with budgets; safe-fetch.ts protections (DNS revalidation, non-public IP rejection); content-addressed event ids.
- WHERE IT IS VIOLATED: FYD-010: field-level private data (phone, home_address, _internal_notes) crosses into visitor context because visibility is object-level. The data was treated as safe until proven otherwise; it was not.
- WHERE OWNERSHIP IS AMBIGUOUS: coarsenAddress ownership (the liability has no clear owner).
- WHAT TEST PROVES IT: C-01's attack test (proposed); SE-06 (secret-shape scanner on built contexts).
- WHAT AUTOMATION CAN ENFORCE IT: C-01; D-08 (new-field classification gate); SE-06.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether a new data use is legitimate (the privacy call).

- AXIOM: SOUL 15. Search by meaning.
- WHAT IT PROTECTS: Capability duplication hides in names; search semantic families, not filenames.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The duplication survey that found the five merge candidates by capability, not filename.
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: The duplication survey's candidate list with behavioral comparisons.
- WHAT AUTOMATION CAN ENFORCE IT: Periodic semantic-family audits (SI-02's checklist includes the search dimension).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether two similar capabilities are truly competing or legitimately specialized.

- AXIOM: SOUL 16. Business before vanity.
- WHAT IT PROTECTS: Technical excellence must create value: less uncertainty, less duplicated effort, better retrieval, explainability, trustworthy automation.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The harvest filter's four questions; Nolan's leverage rule (engagement metrics first).
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: C-05 (trusted-answer-time) and SI-05 (autonomy metrics) as value measures.
- WHAT AUTOMATION CAN ENFORCE IT: The four-question filter in H-08.
- WHAT STILL REQUIRES HUMAN JUDGMENT: What counts as business value for a new capability.

- AXIOM: SOUL 17. Product thinking.
- WHAT IT PROTECTS: Who needs this, what pain it solves, what happens without it, how the user knows it worked.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The plumber UX directive (owner never sees SiteSpec, events, Ed25519; they experience "FYD already understood my business"); the friction-to-consequence mapping (P-09).
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: STEP-04/05/06/07/08 pass records (each is a product-behavior proof, not a unit test).
- WHAT AUTOMATION CAN ENFORCE IT: C-08 (answer quality benchmark); C-05 (trusted-answer-time).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether the product promise exceeds what the system can prove (grill-20 lock).

- AXIOM: SOUL 18. Marketing is truth at scale.
- WHAT IT PROTECTS: Demonstrable claims only: deterministic replay, traceable evidence, explicit provenance. No vague superlatives.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Attribution neutral ("Powered by FYD"); STEP records as demonstrable proofs.
- WHERE IT IS VIOLATED: Direct evidence. The 195/195 figure is presented in standing decision prose as the canonical gate ("keep 195/195 gate") while the last measured run is 116 on 2026-09-21 and the tree has changed twice since. The claim outruns the evidence.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: P-07 (current measurement) is the proposed correction.
- WHAT AUTOMATION CAN ENFORCE IT: Dated-baseline rule: any public test-count claim must cite its measurement date and commit.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Which claims are safe to make at scale.

- AXIOM: SOUL 19. Make complexity disappear for the customer.
- WHAT IT PROTECTS: Internal sophistication must produce external simplicity: Ask FYD, get an answer, see the evidence, trust the result.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: P-08 (why-this lightweight); the object-presence law (objects belong to the website, never a chat widget or debug overlay).
- WHERE IT IS VIOLATED: No direct violation found; TRADESMAN(HPP) is assessed as still an engineering harness, which is a product gap rather than an axiom violation.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: Nolan's screenshot test (the standing product courtroom).
- WHAT AUTOMATION CAN ENFORCE IT: C-08 benchmark includes presentation quality; visual regression via screenshot proof.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Final visual judgment (grill-20 escalation category: subjective final visual judgment).

- AXIOM: SOUL 20. Protect the user's attention.
- WHAT IT PROTECTS: Default response structure (answer, evidence, caveat, next action); no unnecessary questions.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The reporting discipline (quiet when healthy; surface only what matters); the escalation classifier (SI-03).
- WHERE IT IS VIOLATED: The morning-review queue and bespoke auth interruptions violate it in practice (each costs context).
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: SI-03's audit (a week of escalations, each with a classifier record).
- WHAT AUTOMATION CAN ENFORCE IT: SI-03; AU-05 (one-tap bundles).
- WHAT STILL REQUIRES HUMAN JUDGMENT: What is genuinely worth interrupting Nolan for.

- AXIOM: SOUL 21. Be bold with reversible actions.
- WHAT IT PROTECTS: Move fast on observable, testable, reversible, low-risk actions; slow down on deletions, authority changes, schema changes, identity changes, replay changes, source-truth changes.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The L0-L4 matrix concept; Nolan's standing 80% rule; the friction-to-consequence mapping (P-09).
- WHERE IT IS VIOLATED: Inverted in practice: reversible driver fixes wait for review (too slow) while the system has no enforced gate for irreversible ones (no L4 enforcement).
- WHERE OWNERSHIP IS AMBIGUOUS: The L-level of specific actions is undefined (A-01).
- WHAT TEST PROVES IT: None yet. A-01's replay of past incidents through the matrix is the proposed proof.
- WHAT AUTOMATION CAN ENFORCE IT: A-01 (matrix enforcement); A-05 (proposal schema).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether an action is truly reversible (the classification itself).

- AXIOM: SOUL 22. Never confuse activity with progress.
- WHAT IT PROTECTS: Progress means fewer competing authorities, clearer ownership, stronger contracts, better evidence, fewer bypasses, fewer silent failures, stronger determinism, better user outcomes.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: SI-04 (negative-LOC reward); the merge items; the reaper-vs-HOLD gap tracked as an open defect rather than closed by activity.
- WHERE IT IS VIOLATED: Historical. reconcile.py re-escalated 10 R2 plus 7 R3 gaps across 3+ reports: activity (escalations) without progress (resolution). Fixed 2026-09-20.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: The gap lifecycle fix (idempotent rerun tests); SI-04's deletion ledger.
- WHAT AUTOMATION CAN ENFORCE IT: D-02 (closure-aware reconciliation everywhere); SI-04.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether a change is progress or motion.

- AXIOM: SOUL 23. Continuous self-audit.
- WHAT IT PROTECTS: Periodic asking: competing authorities, bypasses, nondeterminism entry points, identity loss, ambiguity, silent data loss, ordering drift, forgotten knowledge, doc/implementation contradiction, promise exceeding proof.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: This research program; the duplication survey; the sovereignty audit concept.
- WHERE IT IS VIOLATED: No direct violation found; the risk is cadence (audits happen in bursts).
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: This document; H-08's recurring harvest.
- WHAT AUTOMATION CAN ENFORCE IT: H-08 (recurring harvest); SI-02 (22-dimension checklist); O-01's monitor sweep as a standing audit.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Which audit findings are worth acting on.

- AXIOM: SOUL 24. Change your own soul carefully.
- WHAT IT PROTECTS: SOUL.md changes must be explicit, reasoned, non-contradictory, and communicated to the user.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The decision log practice for reversals (SI-06); Nolan's explicit reversal records (power policy, Jev posture, no-scale-back).
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: SI-06's supersession chains for the three 2026-09-26 reversals.
- WHAT AUTOMATION CAN ENFORCE IT: SI-06 as a required record for any SOUL/policy change.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether a principle change is warranted (only Nolan).

- AXIOM: SOUL 25. The Standard.
- WHAT IT PROTECTS: The fallback: be useful, truthful, protect boundaries, preserve provenance, prefer evidence and determinism, consolidate before duplicating, archive before destroying, test before claiming, build for the user, create measurable value, remember, improve without forgetting.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Throughout; this review is itself an instance.
- WHERE IT IS VIOLATED: Covered under the specific principles above.
- WHERE OWNERSHIP IS AMBIGUOUS: None beyond the specific items.
- WHAT TEST PROVES IT: The aggregate of the specific proofs.
- WHAT AUTOMATION CAN ENFORCE IT: The aggregate of the specific enforcements.
- WHAT STILL REQUIRES HUMAN JUDGMENT: The standard's application to novel cases.

### AXIOM-LEDGER.md axioms

- AXIOM: E1. Event Durability.
- WHAT IT PROTECTS: Events, once accepted, survive crashes and restarts.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The journal as the event spine; journal integrity verified intact after the 2026-09-26 incident; unexpected writers zero.
- WHERE IT IS VIOLATED: Direct evidence, open. lane_c_failure_injection P1 (kill -9 orphans events in write_queue) and P3 (mid-derivation crash loses queued events; no restart scan). Parked as follow-ups (T-01).
- WHERE OWNERSHIP IS AMBIGUOUS: Who owns the parked P1/P3 findings (T-01).
- WHAT TEST PROVES IT: Replay tests (mid-derivation crashes, truncation); the incident's journal integrity verification.
- WHAT AUTOMATION CAN ENFORCE IT: T-01 (tracked issues with verification tests); a restart scan for queued events.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether a durability gap warrants a migration (irreversible by nature).

- AXIOM: E2. Event Collision Safety.
- WHAT IT PROTECTS: Distinct events never share an identity.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Content-addressed event ids; hash authority practices.
- WHERE IT IS VIOLATED: No direct evidence in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: No dedicated test found in surveyed material.
- WHAT AUTOMATION CAN ENFORCE IT: T-02 (property tests: distinct inputs never collide).
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

- AXIOM: M1. Event-Derived Mission Existence.
- WHAT IT PROTECTS: Missions exist because events say so, not because code asserts them.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The mission lifecycle derived from journal events; MissionScheduler._reconcileUnknown derives HOLD from failure records.
- WHERE IT IS VIOLATED: No direct evidence in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: No dedicated test found in surveyed material.
- WHAT AUTOMATION CAN ENFORCE IT: A test asserting no mission row exists without its deriving events.
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

- AXIOM: M2. Mission Uniqueness.
- WHAT IT PROTECTS: The same mission is never duplicated as two missions.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: M3 (user mission idempotency) machinery; dedup practices.
- WHERE IT IS VIOLATED: No direct evidence in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: Idempotency tests (referenced in the ledger's test mapping; not re-verified here).
- WHAT AUTOMATION CAN ENFORCE IT: Uniqueness constraints plus dedup at creation.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether two similar missions are truly the same (semantic dedup).

- AXIOM: M3. User Mission Idempotency.
- WHAT IT PROTECTS: Retrying a user request never creates a second mission.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Idempotency handling in the mission path.
- WHERE IT IS VIOLATED: No direct evidence in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: Not re-verified in this pass.
- WHAT AUTOMATION CAN ENFORCE IT: Idempotency-key enforcement (the R-06 pattern applied to missions).
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

- AXIOM: M4. Mission State/Event Coherence.
- WHAT IT PROTECTS: Mission state always agrees with its events.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The HOLD is emitted through deriveFailureRecord and the canonical UnifiedEventRuntime rather than by directly mutating the mission row (ops amendment 2026-09-27): state changes flow through events.
- WHERE IT IS VIOLATED: Threatened, not yet violated. The reaper-vs-HOLD gap: lease expiry or reaping can reset a HELD mission to executable, which would make state diverge from the HOLD event. Open defect (R-01).
- WHERE OWNERSHIP IS AMBIGUOUS: HOLD emission authority (scheduler vs mission-control) (R-02).
- WHAT TEST PROVES IT: R-01's failure-injection test (proposed): HOLD, expire lease, run reaper, assert not redispatched.
- WHAT AUTOMATION CAN ENFORCE IT: R-01 (HOLD-aware reaper); R-02 (single HOLD authority).
- WHAT STILL REQUIRES HUMAN JUDGMENT: The HOLD semantics design itself (needs Nolan's word per AGENTS.md).

- AXIOM: A1. Attempt Separation.
- WHAT IT PROTECTS: Every attempt has its own record, independent of the mission.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Partially. Worker attempts are visible through broker logs but are not first-class records.
- WHERE IT IS VIOLATED: Soft violation: attempts exist but are not independently queryable records.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: None yet. R-05 defines the proof.
- WHAT AUTOMATION CAN ENFORCE IT: R-05 (durable attempt records).
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

- AXIOM: F1. Effect Separation.
- WHAT IT PROTECTS: Effects are separated from attempts and never silently duplicate.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The broker fail-closed containment (fix/broker-failclosed-containment da64baa, 62/62 pass); effect typing.
- WHERE IT IS VIOLATED: At risk. Broker result capture is unverified on the live Pig broker (A-03); idempotency keys are not enforced at dispatch (R-06). A retried dispatch could execute twice.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: R-06's dispatch tests (proposed); A-03's result-capture proof (proposed).
- WHAT AUTOMATION CAN ENFORCE IT: R-06 (key enforcement at dispatch); A-06 (receipt standard).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether a duplicated effect is harmful or harmless in a specific case.

- AXIOM: F2. Unknown Outcome.
- WHAT IT PROTECTS: Unknown stays unknown. An effect whose outcome is not established is never treated as succeeded or failed.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: UNKNOWN outcome typing exists in the runtime; MISSION_RECONCILE_HOLD is the mechanism for unknown-outcome missions.
- WHERE IT IS VIOLATED: Threatened by the reaper-vs-HOLD gap (R-01): redispatching an UNKNOWN-outcome mission treats the unknown as retryable without reconciliation. Also at risk from the missing UNKNOWN dashboard (R-07): unknowns invisible are unknowns unhandled.
- WHERE OWNERSHIP IS AMBIGUOUS: HOLD authority (R-02).
- WHAT TEST PROVES IT: T-07 (mid-effect kill types UNKNOWN with receipt); R-01's injection test.
- WHAT AUTOMATION CAN ENFORCE IT: R-01; R-07 (dashboard); T-07.
- WHAT STILL REQUIRES HUMAN JUDGMENT: The reconciliation decision for a specific UNKNOWN (retry, compensate, or escalate).

- AXIOM: P1. Projection Rebuildability.
- WHAT IT PROTECTS: Projections can always be rebuilt from source events.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The fyd-tenant-graph read seam rebuilds from fixtures plus journal overlays on every read (no cache to go stale).
- WHERE IT IS VIOLATED: Soft gap. Owner corrections are not canonical events (D-06): a rebuild from source would lose them. STEP-07's survival was simulated, not proven through the event spine.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: D-06's replay test (proposed): correct, wipe, replay, assert byte-identical corrected state.
- WHAT AUTOMATION CAN ENFORCE IT: D-06 (corrections as canonical overlay events).
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

- AXIOM: W1. Witness Binding.
- WHAT IT PROTECTS: Witnesses bind to the exact bytes they attest; a witness never floats free of its subject.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Digest-bound patch approvals (baseStateDigest plus patchDigest); Jev attestation bound to the specific call (prompt sha256 in the spend ledger).
- WHERE IT IS VIOLATED: No direct evidence in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: The 409 stale_proposal path (digest mismatch refuses the apply).
- WHAT AUTOMATION CAN ENFORCE IT: Digest binding on every approval (already the pattern; extend to all consequential approvals).
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

- AXIOM: R1. Replay Completeness.
- WHAT IT PROTECTS: Replay reproduces the full history, not a subset.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Replay tests cover orphaned events, no restart scan, mid-derivation crashes, truncation, era mismatch, determinism.
- WHERE IT IS VIOLATED: lane_c P2: the runtime does not scan for queued events on restart, so replay after a crash is incomplete by construction. Open (T-01).
- WHERE OWNERSHIP IS AMBIGUOUS: Who owns the parked P2 finding (T-01).
- WHAT TEST PROVES IT: The existing replay test suite (as documented in the failure-injection record).
- WHAT AUTOMATION CAN ENFORCE IT: T-01 (restart-scan issue with verification test).
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

- AXIOM: H1. Historical Non-Reinterpretation.
- WHAT IT PROTECTS: History is not rewritten; new understanding creates new events, never edits old ones.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The conflict-record design (SOURCE SAYS vs OWNER SAYS as durable records, D-04); classify-history-never-delete-casually (S6).
- WHERE IT IS VIOLATED: No direct evidence in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: D-04's test (proposed): regeneration refuses to silently pick a side.
- WHAT AUTOMATION CAN ENFORCE IT: D-04 (durable conflict records); append-only journal discipline.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Resolving a genuine conflict (which claim wins for the owner).

- AXIOM: C1. Causal Recoverability.
- WHAT IT PROTECTS: From any state, the causal chain back to source is recoverable.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Why-this chains (value to field to method to source); provenance on facts.
- WHERE IT IS VIOLATED: Soft gap. Facts without complete provenance (D-05) and unlabeled relationship derivation (D-07) break causal chains.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: The orphan-fact audit query (D-05, proposed): zero facts without source.
- WHAT AUTOMATION CAN ENFORCE IT: D-05; D-07.
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

### constitutional-sprint STANDING-INVARIANTS.md

- AXIOM: S1. Read-only cognition does not stop.
- WHAT IT PROTECTS: Observation and diagnosis continue even when mutation is frozen.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Watchdogs keep probing during incidents; this research pass ran under read-only rules while the journal gateway incident was closed independently.
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: No dedicated test found; it is a procedural invariant.
- WHAT AUTOMATION CAN ENFORCE IT: R-04 (evidence emission continues regardless of action freezes).
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

- AXIOM: S2. No commits or destructive Git operations during the sprint.
- WHAT IT PROTECTS: The sprint's evidence base stays stable while it is being read.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: This research pass: no commits, no code changes.
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: Procedural; the research directory contains only new files.
- WHAT AUTOMATION CAN ENFORCE IT: A pre-commit hook during research sprints (proposed, not yet existing).
- WHAT STILL REQUIRES HUMAN JUDGMENT: When the freeze lifts.

- AXIOM: S3. Read-only verification first.
- WHAT IT PROTECTS: Claims are verified by reading before any mutation is considered.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The clean-checkout replay practice; the ask-lane falsification (verified by reading the tree, not by trusting the report).
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: T-06 (clean-checkout replay gate).
- WHAT AUTOMATION CAN ENFORCE IT: T-06.
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

- AXIOM: S4. One writer per mutable semantic unit.
- WHAT IT PROTECTS: No two agents edit the same ownership surface in parallel.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The 2026-09-26 Copilot directive (parallelize separable ownership surfaces under a single integration authority; never parallel agents on the same surface).
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: Lane module ownership when tests are committed but modules are not (the ask-lane case): who owns the uncommitted tree.
- WHAT TEST PROVES IT: Procedural; the parallelization rule is recorded as a decision.
- WHAT AUTOMATION CAN ENFORCE IT: Ownership-surface declarations per lane; a dispatch check refusing parallel writers.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Drawing the ownership-surface boundaries.

- AXIOM: S5. Live core propose-only.
- WHAT IT PROTECTS: The live constitutional core is never mutated directly by agents.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Standing rule; the research pass did not touch the journal gateway, tripwire, or Pig power policy.
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: The exact boundary of "live core" for new components (declared per component in AU-04, proposed).
- WHAT TEST PROVES IT: Procedural; incident record shows the lane was not touched during research.
- WHAT AUTOMATION CAN ENFORCE IT: AU-04 (desired-state declarations name the live core per component).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether a specific change touches the live core.

- AXIOM: S6. Classify history, never delete casually.
- WHAT IT PROTECTS: Historical records are classified (keep, archive, remove-with-evidence), never casually deleted.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: FAILURE_LEDGER.md; H-06 (freeze before any removal).
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: Who classifies a given archive directory (H-06 names the manifest but not the classifier).
- WHAT TEST PROVES IT: H-06's deadness manifest (proposed).
- WHAT AUTOMATION CAN ENFORCE IT: H-06 (freeze plus import-scan).
- WHAT STILL REQUIRES HUMAN JUDGMENT: The final remove decision (requires evidence, and for constitutional material, Nolan).

- AXIOM: S7. Keep the constitutional core small.
- WHAT IT PROTECTS: The core stays minimal; everything else is replaceable.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The Jev remit (fast bounded semantic decisions only); the replaceability rule for external systems.
- WHERE IT IS VIOLATED: At risk from duplication: every duplicate copy (H-01..H-05) enlarges the de facto core.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: The merge items (each consolidation shrinks the core).
- WHAT AUTOMATION CAN ENFORCE IT: H-08's four-question filter (a new core addition must justify itself).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether a capability belongs in the core.

- AXIOM: S8. One authority per decision.
- WHAT IT PROTECTS: Every decision has exactly one decider; no diffusion.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The grill-20 escalation categories name the decider per class (Nolan for the eight categories).
- WHERE IT IS VIOLATED: The seven ambiguous authorities listed in the summary (HOLD emission, driver-fix authority, targeting-rule ownership, coarsenAddress, discovery-pool authority, lane module ownership, phase-6 gate wiring).
- WHERE OWNERSHIP IS AMBIGUOUS: Those seven.
- WHAT TEST PROVES IT: None yet. R-02, S-04, S-05, H-07 define the assignment proofs.
- WHAT AUTOMATION CAN ENFORCE IT: An authority registry: every decision class names its decider; unregistered classes escalate.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Assigning the decider (Nolan).

- AXIOM: S9. Tests alone are not proof.
- WHAT IT PROTECTS: Green tests do not establish truth; independent replay, evidence, and verification do.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The ask-lane falsification practice (lane self-reports are hypotheses until replayed from a clean checkout); Nolan's falsification bar.
- WHERE IT IS VIOLATED: Direct evidence. The 195/195 claim is a test-count claim presented as proof of current health without a current run. The ask-lane's "62 passing" claim was green in the lane and 0 from clean checkout.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: The ask-lane recovery (92/92 from clean checkout, 2026-09-26) is the reference: proof, not tests.
- WHAT AUTOMATION CAN ENFORCE IT: T-06 (replay gate); P-07 (dated baselines).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether the replay was truly independent.

- AXIOM: S10. Escalate only genuine human-authority categories.
- WHAT IT PROTECTS: Nolan is interrupted only for the eight grill-20 categories (external contact/authorization, publication/spend, irreversible or uncertain destruction, credential/account-owner action, legal/business commitment, unresolved product intent, subjective final visual judgment, P0 with no safe default).
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The grill-20 locked answers; the escalation classifier concept.
- WHERE IT IS VIOLATED: In practice: driver fixes, discovery widenings, and lock frees reach Nolan without matching a category (the 5 automatable bottlenecks).
- WHERE OWNERSHIP IS AMBIGUOUS: The four unclear-authority stops (driver fixes, discovery pool, targeting rules, lock recovery).
- WHAT TEST PROVES IT: SI-03's weekly audit (proposed).
- WHAT AUTOMATION CAN ENFORCE IT: SI-03 (classifier gate); A-01 (L-levels encode the categories).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether a novel situation matches a category.

- AXIOM: G1. Phase-6 event-source-every-state-change gate.
- WHAT IT PROTECTS: Every state change flows through the event spine (the strongest form of H1/E1/M4).
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Nowhere. The gate is a dead switch behind unreachable bootstrap code, with zero tests.
- WHERE IT IS VIOLATED: Not violated (it was never wired); it is dormant.
- WHERE OWNERSHIP IS AMBIGUOUS: Who may wire or delete it (explicitly needs authority; do not touch without it).
- WHAT TEST PROVES IT: None exist.
- WHAT AUTOMATION CAN ENFORCE IT: None until the authority decision is made.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether to wire, delete, or leave dormant (Nolan's call).

### Jev lane laws (~/workspace/fyd-intel/LANE.md)

- AXIOM: J1. Jev owns fast bounded semantic decisions only.
- WHAT IT PROTECTS: The Jev remit stays bounded: classification, policy judgment, explicit-option routing, claim/evidence verification, ambiguity triage, tool/action gating, confidence escalation.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: LANE.md's product law; jev_ask.py (profile-only, purpose gating, budget gate).
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: The bounded FYD decision points at the product frontier are not yet defined (next step per the 2026-09-26 directive).
- WHAT TEST PROVES IT: Contract tests (25/25); the live canary (2026-09-26 17:42 MDT, one Decisions API call, attestation PASS).
- WHAT AUTOMATION CAN ENFORCE IT: A-07 (shadow/eval harness per decision point); purpose gating in jev_ask.py.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Defining the decision points (Nolan's frontier call).

- AXIOM: J2. Deterministic software owns hashing, validation, exact matching, permissions, arithmetic, transitions, execution, deduplication, and replay.
- WHAT IT PROTECTS: Nothing probabilistic touches the deterministic core.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The lane's division of labor; the generator's deterministic pipeline; the binding verifier.
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: The determinism tests (STEP-01, structured-determinism).
- WHAT AUTOMATION CAN ENFORCE IT: T-04; WB-04.
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

- AXIOM: J3. Generative intelligence owns writing, open-ended reasoning, research, site composition, and conversation.
- WHAT IT PROTECTS: Open-ended work stays with the generative layer, not with the bounded semantic decider.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: LANE.md; the ask pipeline's separation of classification from composition.
- WHERE IT IS VIOLATED: No direct evidence in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: Site composition vs semantic decisions at the boundary (e.g., is layout choice a semantic decision?).
- WHAT TEST PROVES IT: No dedicated test found.
- WHAT AUTOMATION CAN ENFORCE IT: A-07's decision-point registry (each point declares which layer owns it).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Boundary disputes between the layers.

- AXIOM: J4. Jev is proposal/evidence only; it cannot authorize effects or mutate canonical state.
- WHAT IT PROTECTS: The no-effect-authority boundary: the semantic decider never acts.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: Contract tests prove every refusal path makes zero provider calls; agent grants strip forbidden effects in the ask pipeline.
- WHERE IT IS VIOLATED: No direct violation found in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: The 25/25 contract suite (exact mapping, != router, != latest, missing/unknown/override/unexpected-model/router-fallback to FAIL).
- WHAT AUTOMATION CAN ENFORCE IT: The contract suite runs per change; launcher tests assert zero provider calls on refusal paths.
- WHAT STILL REQUIRES HUMAN JUDGMENT: Whether a new decision point is truly effect-free.

- AXIOM: J5. Failed attestation is never silently consumed.
- WHAT IT PROTECTS: A Jev output that fails attestation cannot flow into decisions quietly.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The lane's attestation requirement; the live canary recorded attestation PASS explicitly.
- WHERE IT IS VIOLATED: No direct evidence in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: Attestation-failure tests (part of the contract suite's refusal paths).
- WHAT AUTOMATION CAN ENFORCE IT: Schema validation on every Jev response; attestation checked before consumption.
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

- AXIOM: J6. Application code requests a logical profile, never a provider model string.
- WHAT IT PROTECTS: Provider independence; no model string hardcoded in application code.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: jev_ask.py (profile-only requests); the old router worker (jev-reason.ps1) was deleted and replaced.
- WHERE IT IS VIOLATED: No direct evidence in surveyed material (the old violation was removed 2026-09-26).
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: The contract test asserting != router and != latest (model-string requests fail).
- WHAT AUTOMATION CAN ENFORCE IT: A grep gate: no provider model strings in application code.
- WHAT STILL REQUIRES HUMAN JUDGMENT: None identified.

- AXIOM: J7. Spend discipline: $5/day lane ceiling; report before raising.
- WHAT IT PROTECTS: Bounded cost; serious use cannot silently become expensive use.
- WHERE FYD/PING CURRENTLY IMPLEMENTS IT: The budget gate in jev_ask.py; the spend ledger with prompt sha256.
- WHERE IT IS VIOLATED: No direct evidence in surveyed material.
- WHERE OWNERSHIP IS AMBIGUOUS: None found.
- WHAT TEST PROVES IT: The live canary logged $0.0000133 against the ledger.
- WHAT AUTOMATION CAN ENFORCE IT: The budget gate (refuses calls past the ceiling).
- WHAT STILL REQUIRES HUMAN JUDGMENT: Raising the ceiling (Nolan's call).

Axiom review tally: 57 reviewed. 14 violations with direct evidence. 7 ambiguous authorities. The violations cluster in three places: the Rule of One (5 duplication instances), truth/evidence handling (stale 195/195, FYD-010, FYD-037, silent-empty history, fixture confusion history), and runtime unknown-outcome handling (reaper-vs-HOLD, lane_c P1/P3, missing result capture).

---

## Deliverable 3: L0-L4 autonomy/action matrix

Derived from verified current capabilities, not from the example actions in the assignment. Each row ties to a mechanism or evidence actually observed.

| Level | Definition | Example actions (grounded) | Current mechanism / evidence | Who decides |
|---|---|---|---|---|
| L0 | Observe. Read-only; no state change anywhere. | Read files, search code and memory, run health probes, replay a lane from a clean checkout, inspect watchdog logs, run the tripwire in check mode. | tripwire.sh check mode; watchdog probe scripts; this research pass ran entirely at L0. | The agent, always. |
| L1 | Local reversible. Affects only the agent's own worktree or dev-scoped processes; undo is trivial; no shared service, no external party, no data loss. | Restart a bounded dev process via its script; rerun a deterministic test suite; regenerate a generated fixture (role-aware, never canonical); edit lane worktree files; run linters and type checks. | Lanes already edit their worktrees; AU-01 and AU-03 propose declaring this formally. Fixture roles separate generated from canonical (D-01). | The agent, with an audit record. |
| L2 | Shared reversible with established capability and rollback. Touches shared services or shared config, but through an authorized idempotent script with a verification step and a working rollback. | Restart :18199 via the supervised path; restart the journal gateway container via ping-gateway-watchdog; restart :3100 via /home/nolan/start-3100.sh with the NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 verification; roll back a driver fix. | PigiFydStackWatch and ping-gateway-watchdog already perform L2 restarts autonomously (incident record 2026-09-26). start-3100.sh is idempotent. Rollback for driver fixes is a defined pattern (S-04). | The agent or watchdog, with BEFORE/AFTER/VERIFICATION evidence (R-04). |
| L3 | Consequential. Propose by default; execution only with the evidence pack complete and, where standing rules require, a human approval. Reversible only with cost, or visible to outsiders. | Deploy to production; publish a site; send on an established outreach channel at volume (pre-authorized pattern, still L3-class for new campaigns); change a schema; merge a feature branch; widen targeting criteria beyond the read-only pool; apply an owner customization rated HIGH. | Proposal-only is today's prose rule; A-01/A-05 would make it typed. The friction-to-consequence mapping (P-09) defines the tiers. Outreach sends are autonomous only inside Nolan's pre-authorized envelope. | The agent proposes with the typed schema; the approver is named per action class (Nolan for the grill-20 categories). |
| L4 | Irreversible or high-impact. Human authority, no agent execution path. | Rotate or expose credentials; log in or complete 2FA as Nolan; install the GitHub App; open a new outreach channel; publish public content; relax never-reengage semantics; delete data with uncertain scope; run an irreversible migration; make a legal or business commitment; push to main/master; change constitutional authority; wire or delete the phase-6 gate. | Every one of these is a recorded Nolan-only gate: the bottleneck analysis (11 legitimate gates), the grill-20 escalation categories, the Copilot identity decision, the phase-6 authority note. | Nolan, directly. One-tap bundles (AU-05) make the ask cheap but never remove it. |

Boundary notes, all grounded:

1. Outreach sends are the exception that proves the matrix: sending legitimate emails and submitting legitimate contact forms on established channels is pre-authorized autonomous (Nolan's standing order), so it operates at L2/L3 inside a pre-approved envelope, not as a per-send L4. Opening a NEW channel is L4. This distinction is why S-05 separates discovery scaling from contact decisions.
2. The Sept-16 force-kill rule is currently mis-leveled: graceful closes and origin-scoped DOM mutations are L1 by the matrix (local, reversible) but are treated as gated. S-01 corrects the leveling.
3. Driver fixes are currently mis-leveled: bounded reversible repairs are L1/L2 by the matrix but are treated as L3 (morning review queue). S-04 corrects the leveling.
4. Discovery-pool widening is L2 (shared config, reversible, no-contact guarantee) but is treated as L3/L4. S-05/S-06 correct the leveling.
5. The reaper-vs-HOLD seam is a matrix violation in the runtime: redispatching an UNKNOWN-outcome mission is at least L3 (consequential) but the reaper can do it silently at machine speed. R-01 would enforce the level.
6. Jev operates at L0/L1 only by contract: proposal and evidence, never effect authorization (J4). The matrix must never promote a semantic decider to an effect authority.

---

## Deliverable 4: human-bottleneck analysis

Source: the bottleneck hunt (reader 6/6, completed 2026-09-27T00:19:51Z), which searched for "want me to", "blocked on Nolan", "waiting on Nolan", "needs Nolan", "Nolan's call", and variants across MEMORY.md, AGENTS.md, outreach/, goals/, and migration records. 16 judged hits.

### Bottlenecks that legitimately require a human (11)

These stay human. The improvement is making each one cheaper (one-tap bundles), never removing the gate.

1. Instagram login, blocked on Nolan's one-time login plus 2FA (Staging MEMORY.md:143; also night-shift-2026-09-15.md:187). Human-only credential; only Nolan can complete it.
2. TikTok login, blocked on Nolan (Staging MEMORY.md:142). Same class as 1.
3. Bearer key printed in tool output; rotation needs Nolan's word (hardening-pass-2026-09-13.md:62). Credential exposure plus rotation is a human-authority category.
4. Secret rotation generally needs Nolan's word (GRILLING-BRIEF.md:430). Same class as 3.
5. LinkedIn warmup only on Nolan's word (linkedin-launch-2026-09-13.md:50). New outreach channel: new external-effect surface.
6. Content not auto-published; Nolan decides (content-queue.md:3). Public publishing is a human gate.
7. Never-reengage relaxation needs Nolan's word (x-engagement.md:526); he later declined. Guard-semantics changes are human.
8. Browser OAuth plus branch review before merge (night-shift-2026-09-15.md:100). Production merge authority.
9. GitHub App install is Nolan's call (morning-report-2026-09-16.md:77). Third-party authorization grant.
10. Threads/Instagram 2FA needs Nolan (night-shift-2026-09-15.md:187). Human-only auth factor.
11. Device/tunnel approval to Nolan's phone (Staging MEMORY.md:286). The GOOD pattern: pre-verified, one-tap, 5-minute approval, auto-rollback on deny. This is the template for AU-05/S-03.

### Bottlenecks that should not require a human (5)

Each maps to a plan item.

1. Instagram CDP wedge recovery: the ig-profile Chrome wedge needs Nolan to manually close and reopen (instagram-engagement.md:745). Diagnosis: missing capability, no graceful-restart-with-session-preservation path. Fix: S-01 (scope the rule) plus S-02 (build the capability).
2. Threads browser actions frozen by the Sept-16 force-kill lesson (threads-engagement.md:416,451,459,469): restart needs Nolan's word. Diagnosis: unclear authority; one-time trauma became an over-broad permanent gate. Fix: S-01.
3. Threads site-data clear: origin-scoped and safe, stopped anyway (GRILLING-BRIEF.md:205). Diagnosis: the rule is too coarse to distinguish safe from unsafe. Fix: S-01.
4. Morning review pile of routine driver fixes: exit codes, regex scoping, retry wiring wait for Nolan (night-shift-2026-09-15.md:245,219,269,291). Diagnosis: unclear authority; training-curriculum.md:63 leaves driver fixes ambiguous and proposal-only authority is too coarse. Fix: S-04 (bounded L-level authority with rollback and green tests).
5. Widening the read-only discovery pool needs Nolan's call (research-scratch-round71.md:110). Diagnosis: unclear authority; targeting-rule ownership is ambiguous and a read-only widening was treated like an external-contact decision. Fix: S-05/S-06.

### The three dominant patterns

1. One-time trauma becomes a permanent blanket gate. The Sept-16 force-kill lesson was correct for its incident and wrong as a standing rule: it blocks graceful closes, origin-scoped mutations, and watchdog-recoverable operations that share nothing with the original fault except the word "browser". The fix pattern is S-01: scope the rule to the actual fault class, keep the watchdog as the recovery path.
2. Legitimate human auth gates have no low-friction path. Eleven gates are real, but only the tunnel approval used a one-tap bundle. Every other gate (logins, 2FA, installs, merges) arrives as a bespoke interruption. The fix pattern is AU-05/S-03: every human-only action class gets the bundle template (what, why, risk, expiry, one action, auto-rollback).
3. Proposal-only code authority creates review debt. Without action levels, "proposal-only" covers both a regex fix and a production deploy, so routine reversible repairs pile into a morning queue with no SLA. The fix pattern is A-01 (the matrix), S-04 (bounded driver authority), and A-08 (queue SLA so nothing parks silently).

Net: 11 gates stay human but get cheaper; 5 stops become autonomous. The program's autonomy metric (SI-05) should count exactly these: human interventions per week, by category, trending down for the 5 and stable-but-cheap for the 11.

---

## Deliverable 5: failure archaeology

Source: the failure archaeologist (reader 5/6, completed 2026-09-27T00:19:52Z), which excavated the nine specified failures from FAILURE_LEDGER.md and the daily memory logs, then derived the invariant and the encoding for each. The encodings are the TEST / TRIPWIRE / TYPE / SCHEMA / POLICY / RECIPE artifacts; most are already filed as plan items.

### 1. JSON-LD @graph silent-empty (2026-09-21, extraction lane)

WHAT HAPPENED: extractGraph() handled only {"@graph": [...]} and single-node objects, but jsonld.flatten() returns an ARRAY of nodes. The pipeline ran green and produced zero nodes, zero facts, no error. Fixed by accepting arrays first, then @graph, then single-node; verified Coppersmith 7 nodes to 38 facts. Sources: ~/workspace/FAILURE_LEDGER.md, ~/memory/2026-09-21.md:373,567.

INVARIANT: Probe the library's actual return shape before writing the consumer. Assert whenever zero results come from a successful operation. Silent-empty is the worst failure mode: everything looks fine and the customer sees nothing.

ENCODING: TEST (probe test on a known JSON-LD document) plus SCHEMA (parse-tier labels and truthful extraction stats). Plan items: WB-03, AC-03.

### 2. Module-global nondeterminism, projectCounter (2026-09-21, fyd/sitespec-generator)

WHAT HAPPENED: Commit 750c40e derived business IDs from a mutable module-level projectCounter. The fail-first repair derived IDs from canonical input JSON with time caller-injected; 7/7 suites, 50/50 tests including 5 new pre-failing tests. Source: ~/memory/2026-09-21.md:372.

INVARIANT: Mutable module-level state is nondeterminism hiding in plain sight. Derived identities come from canonical input; volatile inputs are injected, never ambient.

ENCODING: TEST (fail-first determinism: regenerate twice, byte-identical). Plan items: WB-04, T-04.

### 3. javascript: URL sink (FL-20260921-032)

WHAT HAPPENED: The renderer escaped hostile HTML text but rendered javascript:alert(1) verbatim into href via href={website}. React warns; it does not block. Fixed and verified: fyd-lane/safe-link.test.ts 16/16, plus a static sink audit showing every observed-data href interpolates only resolveSafeLink kind "safe". Source: ~/workspace/FAILURE_LEDGER.md.

INVARIANT: Escaping text is not escaping URLs. Hostile schemes are neutralized at the projection seam, the trust boundary between data and rendered output.

ENCODING: TEST (16/16 suite including smuggled schemes) plus TYPE (SafeLink constructible only via resolveSafeLink). Plan items: WB-02, SE-03, SE-04.

### 4. 320px overflow (FL-20260921-033, commit 8a99742)

WHAT HAPPENED: docScrollWidth 331 on a 320 viewport, on the committed build only. The exact owner: Ask FYD "Design tokens" proposal rows (label.flex plus input.flex-1 min-width:auto plus 44px button). Fix: one class, min-w-0. Verification matrix: 320 PASS (305), 375 PASS, 1280 PASS. An earlier 375px failure was dirty-worktree WIP, reproduced in neither clean parent. Source: ~/workspace/FAILURE_LEDGER.md.

INVARIANT: Trace overflow to the exact measured owner and fix only that. flex min-width:auto refuses to shrink. An unreproduced measurement in a dirty worktree is not a product bug.

ENCODING: TEST (320px regression: scrollWidth <= viewport) plus REUSABLE RECIPE (the owner-tracing ancestor measurement procedure). Plan items: WB-01.

### 5. Fixture-role confusion (FL-20260921-034)

WHAT HAPPENED: Six FYD tests failed: they expected rich HEAD fixtures (9 objects) but the worktree fixtures were degraded regeneration output (2 objects). A fixture's role silently changed on regen. Resolution: roles separated by hand; happy-place-rich-graph.ts canonical; generated fixtures stay machine output. Sources: ~/workspace/FAILURE_LEDGER.md, ~/memory/2026-09-21.md:752.

INVARIANT: Every fixture carries an explicit role (generated output vs canonical reference). Generated artifacts never silently become source fixtures.

ENCODING: SCHEMA (fixture role declared) plus POLICY (fixtures explicitly classified; regen never silently replaces canonical). Plan items: D-01.

### 6. Reconciliation repeated gaps (2026-09-20, reconcile.py)

WHAT HAPPENED: reconcile.py ignored closure dispositions (r2-closure-20260920.md, r3-closure-20260920.md); 10 R2 plus 7 R3 gaps re-escalated across 3+ reports. Fix: closure-aware reconciliation with lifecycle OPEN / KNOWN_PERMANENT / RESOLVED / REOPENED; 17 actionable became 2 plus 15 KNOWN_PERMANENT; 13/13 lifecycle tests; idempotent rerun. Sources: ~/memory/2026-09-20.md, ~/memory/2026-09-21.md.

INVARIANT: A gap detector must consume closure dispositions as input. Suppression stays auditable and reopenable, never silent deletion.

ENCODING: TEST (13/13 lifecycle plus idempotent rerun) plus SCHEMA (gap lifecycle state machine). Plan items: D-02.

### 7. Gateway argv false-red (2026-09-26, tripwire)

WHAT HAPPENED: The tripwire grepped the argv substring fyd-journal-gateway/server.mjs; the canonical launcher uses bare `node server.mjs` with cwd set to the gateway dir. The tripwire stayed red (JOURNAL_GATEWAY_PROCS=0) while the service was healthy (sole 127.0.0.1:18199 listener, ok:true). Closed 18:01 MDT, classification A: expected gateway healthy under bare node; the old tripwire grepped a stale path-qualified argv; tripwire corrected to identity, listener ownership, and health; controlled kill/recovery proof passed. Sources: ~/memory/2026-09-26.md:1847-1851,2228,2615-2617.

INVARIANT: Never identify a service by coincidental argv spelling. Identity is what the process owns: cwd, listening socket, health contract.

ENCODING: TRIPWIRE (cwd-aware match plus port ownership plus health contract). Plan items: O-02 and O-03 (completed 2026-09-26); O-01 generalizes the invariant to every monitor.

### 8. WSL restart killing supervised processes (2026-09-26)

WHAT HAPPENED: WSL restarted 12:43:47 MDT (Windows up since Sep 16; trigger unknown). It killed the gateway plus the :18199 listener. PigiFydStackWatch detected unhealthy at 12:45:29, relaunched via start-18199.sh, healthy 12:46:02 (about 2 minutes recovery). The first broken transition after recovery was the detector identity fault (failure 7), not the supervisor. Sources: ~/memory/2026-09-26.md:2618,2625. Standing rule: do not investigate the initiator unless the fault recurs.

INVARIANT: The host layer can restart outside the supervisor's world. Supervision means an external watchdog plus an idempotent restart script, never a platform-persistence assumption.

ENCODING: TRIPWIRE (5-minute probe detecting unhealthy plus relaunch) plus REUSABLE RECIPE (every supervised process ships an idempotent start script; a single recovery authority restarts in dependency order). Plan items: O-05 (recurrence detection), O-06 (wrapper volatility).

### 9. Browser target death after sleep (FL-20260921-016)

WHAT HAPPENED: Pig Modern Standby 06:52:54 to 07:25:38 MDT destroyed CDP page targets while Chrome processes lived; single-page-per-worker reuse meant all subsequent actions failed "Target page has been closed". A Facebook pass died at 3/47. Fixes: browser-lock.sh in launchers; ensurePage() recreates dead targets mid-pass. Policy: bounded wake ownership per job (acquire, run, release in finally); record UNKNOWN where the outcome cannot be established. Sources: ~/workspace/FAILURE_LEDGER.md, ~/memory/2026-09-21.md:853. Note: Nolan's 2026-09-26 order sets Pig AC sleep and hibernate to never, superseding scoped-wake-only for the Pig's AC policy; per-pass revalidation remains as defense in depth.

INVARIANT: A sleeping machine costs at most the current bounded action. Revalidate lock, session, and target across sleep gaps; recreate what died; record UNKNOWN where outcomes are unestablishable.

ENCODING: POLICY (wake ownership in the automation lifecycle) plus REUSABLE RECIPE (ensurePage() dead-target recovery; pre-pass browser-health probe). Plan items: S-02.

### The general lesson

Same shape every time: a proxy trusted in place of ground truth. The fix in every case was to verify the actual thing (probe the real return shape, name the real owner, read the real health endpoint and closure evidence, derive from canonical input, measure the exact node) and to make every absence explicit (assert on silent-empty, fail closed, record UNKNOWN, KNOWN_PERMANENT with disposition refs) rather than letting a quiet surface pass as a real check. This is the autonomy directive's "monitor semantic outcomes and invariants, not incidental PIDs, argv strings, filenames, fixed tags, stale pins, or fixture assumptions" with nine worked examples behind it.
## Deliverable 2: the 100-point improvement plan

Ranked by LEVERAGE x FREQUENCY x AUTONOMY GAIN x REUSABILITY / RISK / COMPLEXITY, each factor scored 1-5. Every item carries all 12 required fields.

### 1. SI-03: Escalation classifier before asking Nolan (grill-20 as a gate) (score 320.0)
- ID: SI-03
- DOMAIN: SELF-IMPROVEMENT
- CURRENT FAILURE/FRICTION: The grill-20 escalation classifier exists as a locked directive; agents still escalate by gut feel. The classifier (locked invariant? previous decision? code evidence? reversible experiment? 80% safe default? no consequential effects?) is not a gate.
- DESIRED INVARIANT: No question reaches Nolan without a classifier record showing why it could not be decided at 80%.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Escalation path; Nolan's time protected.
- REQUIRED CAPABILITY: classifier checklist plus escalation record
- TEST/PROOF: A week of escalations audited: every one carries a classifier record; questions that failed the classifier were answered without Nolan.
- DEPENDENCIES: A-02
- LEVERAGE: 4 x FREQUENCY: 4 x AUTONOMY GAIN: 5 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 320.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Nolan's attention is the scarcest resource in the system. The classifier spends it only where it is irreplaceable.

### 2. AU-05: One-tap approval bundles for every human-only action class (score 180.0)
- ID: AU-05
- DOMAIN: AUTONOMY
- CURRENT FAILURE/FRICTION: Only the device/tunnel approval has the one-tap bundle pattern. Every other human-only action (logins, 2FA, installs, merges) is a bespoke interruption with no standard evidence pack.
- DESIRED INVARIANT: Every human-only action class has a bundle template: what, why, risk, expiry, one action, auto-rollback.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Approval UX; authority stays human.
- REQUIRED CAPABILITY: bundle template generalized from the tunnel pattern
- TEST/PROOF: Each action class has a template; a human asked without a bundle is a process violation.
- DEPENDENCIES: S-03
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 5 / RISK: 1 / COMPLEXITY: 1 = 180.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Human gates stay human but cost seconds instead of context switches. Nolan's attention is spent, not drained.

### 3. R-04: Self-healing evidence emission standard for all watchdogs (score 180.0)
- ID: R-04
- DOMAIN: RUNTIME
- CURRENT FAILURE/FRICTION: Watchdogs act (restarts, alerts) but emit inconsistent evidence; the tripwire incident was diagnosed from prose logs, not structured records. No standard says what a supervisor must record.
- DESIRED INVARIANT: Every supervisor action emits TRIGGER, OBSERVATION, DIAGNOSIS, ACTION, CAPABILITY, BEFORE, AFTER, VERIFICATION as a typed record.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Watchdog output format; additive.
- REQUIRED CAPABILITY: evidence schema for supervisors
- TEST/PROOF: Replay the September tripwire incident from emitted records alone: diagnosis reproducible without reading prose logs.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 5 / RISK: 1 / COMPLEXITY: 1 = 180.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Incident review becomes replay, not archaeology. Every future fault is diagnosable from its own evidence.

### 4. T-06: Clean-checkout replay gate for all lanes (the ask-lane lesson) (score 180.0)
- ID: T-06
- DOMAIN: TESTING
- CURRENT FAILURE/FRICTION: The 2026-09-26 ask-lane falsification proved the class: committed tests importing uncommitted modules report green in the lane and zero from clean checkout. No gate requires a clean-checkout replay before a lane closes.
- DESIRED INVARIANT: No lane closes on its own report; a clean-checkout replay must execute its tests green, verified by an independent replay.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Lane close-out procedure.
- REQUIRED CAPABILITY: worktree-based replay procedure
- TEST/PROOF: A lane with an uncommitted dependency fails the replay gate; the ask-lane recovery (92/92 from clean checkout) is the reference pass.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 5 / RISK: 1 / COMPLEXITY: 1 = 180.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Ends the 'green in the lane, red in reality' class. Verifiers decide truth, not lane self-reports.

### 5. A-02: Confidence classification for proposals (act vs escalate with evidence) (score 160.0)
- ID: A-02
- DOMAIN: AGENTS
- CURRENT FAILURE/FRICTION: Agents either act or ask with no calibrated middle: proposals do not carry confidence, so Nolan cannot tell a 95% safe default from a 55% guess.
- DESIRED INVARIANT: Every proposal carries a confidence class and the evidence behind it; below-threshold confidence escalates with the uncertainty named.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Proposal format; decisions unchanged.
- REQUIRED CAPABILITY: confidence rubric (evidence strength, reversibility, blast radius)
- TEST/PROOF: Sample of past proposals re-scored: high-confidence ones would have acted correctly, low-confidence ones would have escalated with the right question.
- DEPENDENCIES: A-01
- LEVERAGE: 4 x FREQUENCY: 4 x AUTONOMY GAIN: 4 x REUSABILITY: 5 / RISK: 1 / COMPLEXITY: 2 = 160.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Nolan's 80% rule becomes operational: agents decide at 80, ask one crisp question below, and the question names the uncertainty.

### 6. A-05: Proposal schema v1 (action, reversibility, blast radius, rollback, evidence) (score 160.0)
- ID: A-05
- DOMAIN: AGENTS
- CURRENT FAILURE/FRICTION: Proposals are free text; reviewers must reconstruct reversibility, blast radius, and rollback from prose. The Jev contract work proved typed schemas work; proposals have none.
- DESIRED INVARIANT: Every L3 proposal is a typed record: action, level, reversibility, blast radius, rollback plan, evidence refs, confidence.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Proposal format.
- REQUIRED CAPABILITY: schema plus validation
- TEST/PROOF: Malformed proposal (missing rollback) is rejected by the validator before reaching a human.
- DEPENDENCIES: A-01
- LEVERAGE: 4 x FREQUENCY: 4 x AUTONOMY GAIN: 4 x REUSABILITY: 5 / RISK: 1 / COMPLEXITY: 2 = 160.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Review becomes fast because the safety case is structured. Nolan reads the fields that matter, not paragraphs.

### 7. AU-04: Desired-state declarations for every supervised component (score 150.0)
- ID: AU-04
- DOMAIN: AUTONOMY
- CURRENT FAILURE/FRICTION: Supervision today is per-service scripts with implicit desired state. Nothing declares, in one place, what 'healthy' means per component.
- DESIRED INVARIANT: Every supervised component has a declaration: service identity, endpoint, health contract, restart authority, evidence format.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Supervision config; additive.
- REQUIRED CAPABILITY: declaration schema plus per-component files
- TEST/PROOF: A new component onboarded by writing a declaration alone: the supervisor picks it up and manages it correctly.
- DEPENDENCIES: O-04
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 5 x REUSABILITY: 5 / RISK: 1 / COMPLEXITY: 2 = 150.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Onboarding a service to supervision becomes writing a declaration, not writing a watchdog. Supervision scales.

### 8. AU-01: L1 authority: restart a bounded dev process without asking (score 144.0)
- ID: AU-01
- DOMAIN: AUTONOMY
- CURRENT FAILURE/FRICTION: Restarting a dev-scoped process currently waits on a human or a bespoke decision, even though the action is reversible, observable, and testable.
- DESIRED INVARIANT: Bounded dev processes (dev servers, watchers) restart on L1 authority: observe, restart via the authorized script, verify, log.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Dev processes only; shared services excluded.
- REQUIRED CAPABILITY: L1 action class plus authorized restart scripts
- TEST/PROOF: Kill a dev server: it restarts via the authorized script and serves within the SLO, with an audit record and no human involved.
- DEPENDENCIES: A-01
- LEVERAGE: 3 x FREQUENCY: 4 x AUTONOMY GAIN: 4 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 144.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? The smallest autonomy win, repeated daily: dev loops never wait on a human for a restart.

### 9. AU-03: L1 authority: rerun deterministic tests and repair generated fixtures without asking (score 144.0)
- ID: AU-03
- DOMAIN: AUTONOMY
- CURRENT FAILURE/FRICTION: Rerunning a deterministic suite or regenerating a generated fixture waits on a human decision, though both are fully reversible and verifiable.
- DESIRED INVARIANT: Deterministic test reruns and generated-fixture repairs are L1: run, compare, log; canonical fixtures are never touched without a proposal.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test suite and generated fixtures; canonical fixtures excluded by role (D-01).
- REQUIRED CAPABILITY: L1 action class plus fixture-role awareness
- TEST/PROOF: Corrupt a generated fixture: the L1 path regenerates it and the suite returns green; touching a canonical fixture is refused.
- DEPENDENCIES: A-01
- LEVERAGE: 3 x FREQUENCY: 4 x AUTONOMY GAIN: 4 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 144.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Test hygiene without human babysitting: the suite stays green by itself.

### 10. C-04: Refusal coverage battery for unsupported claims (score 144.0)
- ID: C-04
- DOMAIN: CONCIERGE
- CURRENT FAILURE/FRICTION: STEP-04 proved refusal for 'holiday hours Thanksgiving 2027' and suitability inference, but coverage is ad hoc: two cases, not a battery. New claim classes can slip through unrefused.
- DESIRED INVARIANT: A standing battery of unsupported-claim probes (temporal, comparative, suitability, off-evidence) all refuse with answerClass unknown and zero citations.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test suite; answer contract.
- REQUIRED CAPABILITY: probe battery pattern from the refusal lesson
- TEST/PROOF: Each probe asserts refusal plus 'I do not have evidence for that' semantics; a new answer path must pass the battery.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 144.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? A concierge that hallucinates once loses the owner's trust forever. The battery makes refusal systematic.

### 11. O-07: Deploy the fyd-3100-monitor (design exists, deployment does not) (score 144.0)
- ID: O-07
- DOMAIN: OPERATIONS
- CURRENT FAILURE/FRICTION: ~/workspace/fyd-3100-monitor/ has DESIGN.md and fyd-3100-probe.sh (host/network/liveness/readiness/serving probes); per the design doc, deployment was NOT done. The :3100 service is probed by nothing.
- DESIRED INVARIANT: :3100 is continuously probed for liveness, readiness, and serving; failures alert with the probe evidence attached.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Monitoring; :3100 untouched.
- REQUIRED CAPABILITY: deploy the existing probe design
- TEST/PROOF: Stop :3100: assert the monitor fires with liveness/readiness/serving evidence; restart via start-3100.sh: assert recovery is recorded.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 4 x AUTONOMY GAIN: 4 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 144.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? The demo stack's most important service is currently unmonitored. This closes that gap with already-written code.

### 12. S-03: One-tap approval bundle pattern generalized to all human-only auth asks (score 135.0)
- ID: S-03
- DOMAIN: SOCIAL
- CURRENT FAILURE/FRICTION: The device/tunnel one-tap bundle (AGENTS.md) proved the pattern: pre-verified bundles, 5-minute approval, auto-rollback. Instagram/TikTok login, 2FA, and GitHub App installs have no equivalent; each is a bespoke interruption.
- DESIRED INVARIANT: Every human-only auth ask arrives as a one-tap bundle: what, why, risk, expiry, and one action.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Approval UX; authority stays human.
- REQUIRED CAPABILITY: bundle template from the tunnel pattern
- TEST/PROOF: Each auth category has a bundle template; an ask without the bundle fields is rejected as malformed before reaching Nolan.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 5 / RISK: 1 / COMPLEXITY: 1 = 135.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Legitimate human gates stay human but stop costing 20 minutes of context each. One tap, then back to work.

### 13. O-01: Semantic-invariant monitor sweep: replace incidental monitors with identity, ownership, and health (score 125.0)
- ID: O-01
- DOMAIN: OPERATIONS
- CURRENT FAILURE/FRICTION: The gateway incident proved the class: the tripwire grepped argv spelling while the healthy service ran under a different argv. PID checks, filename checks, fixed image tags, stale pins, and hardcoded digests are the same defect wearing different clothes.
- DESIRED INVARIANT: Every monitor asserts semantic identity (what it is), ownership (who holds its resources), and health (does it answer); no monitor asserts incidental spelling.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Monitoring definitions; services untouched.
- REQUIRED CAPABILITY: monitor audit plus rewrite to the identity/ownership/health pattern
- TEST/PROOF: For each monitor: change the incidental property (argv spelling, PID, filename) while keeping the service healthy; assert the monitor stays green. Kill the service: assert it goes red.
- DEPENDENCIES: none
- LEVERAGE: 5 x FREQUENCY: 4 x AUTONOMY GAIN: 5 x REUSABILITY: 5 / RISK: 2 / COMPLEXITY: 2 = 125.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Ends the entire false-red class. Every future service can be supervised without ever repeating September's incident.

### 14. H-08: Recurring bounded harvest process (search, catalog, benchmark, integrate-if-wins) (score 120.0)
- ID: H-08
- DOMAIN: HARVESTING
- CURRENT FAILURE/FRICTION: Harvesting happens in heroic bursts (Hex principles, design baseline). There is no standing process, so commodity work gets reinvented between bursts.
- DESIRED INVARIANT: A bounded harvest runs on cadence: SEARCH PING, search deps, search ecosystem, dedup, propose reuse, benchmark, integrate only on proof, test, record.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Process; additive.
- REQUIRED CAPABILITY: harvest procedure with the four-question filter (remove commodity work, improve product loop, improve autonomy, preserve optionality)
- TEST/PROOF: Each harvest run produces a dated record: candidates, benchmark results, integrate-or-catalog decisions with reasons.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 5 / RISK: 1 / COMPLEXITY: 2 = 120.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Turns harvesting from heroics into a habit. Negative LOC becomes a metric, not an accident.

### 15. P-08: WHY THIS lightweight for owners (Correct/Hide) (score 120.0)
- ID: P-08
- DOMAIN: PRODUCT LOOP
- CURRENT FAILURE/FRICTION: Why-this drill-down exists (STEP-05) but the owner-facing surface is heavy: value -> field -> method -> source URL. The directive wants: 'Emergency Plumbing. Why this? Found on your Services page and structured website data. [Correct] [Hide].'
- DESIRED INVARIANT: Every rendered business fact offers a one-line why plus Correct/Hide wired to the patch loop.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: UI surface; patch loop already exists.
- REQUIRED CAPABILITY: why-this renderer + patch-loop wiring
- TEST/PROOF: Rendered service shows why-line; Hide proposes a patch, approves, and the service disappears from all projections with an undo path.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 5 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 2 = 120.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? This is the product: confidence without ceremony. Owners correct facts in one tap instead of filing tickets.

### 16. SI-01: Failure to lesson loop as a tracked workflow (FAILURE_LEDGER.md is the ledger, the loop is the machine) (score 120.0)
- ID: SI-01
- DOMAIN: SELF-IMPROVEMENT
- CURRENT FAILURE/FRICTION: Failures are recorded in FAILURE_LEDGER.md but the loop (evidence -> diagnosis -> patch -> test -> reusable lesson -> verify lesson holds) is informal. The nine archaeology failures each produced a lesson by luck of attention, not by process.
- DESIRED INVARIANT: Every significant failure enters the loop and exits as a verified reusable lesson (test, tripwire, type, schema, policy, or recipe).
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Process; additive.
- REQUIRED CAPABILITY: loop procedure plus lesson verification
- TEST/PROOF: Each of the nine archaeology failures maps to its lesson artifact; new failures follow the same path within the sprint.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 5 / RISK: 1 / COMPLEXITY: 2 = 120.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Failures become assets automatically. The system gets smarter per incident instead of per hero.

### 17. D-01: Fixture role manifest (generated vs canonical, machine-enforced) (score 108.0)
- ID: D-01
- DOMAIN: DATA
- CURRENT FAILURE/FRICTION: FL-20260921-034: six tests failed because regenerated fixtures silently replaced canonical ones (happy-place 2 objects vs 9 in HEAD). Roles were separated by hand afterward, but nothing enforces the separation.
- DESIRED INVARIANT: Every fixture declares its role in a manifest; generated fixtures can never be consumed where a canonical fixture is required, enforced by a loader check.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test fixtures only.
- REQUIRED CAPABILITY: manifest file plus loader assertion
- TEST/PROOF: Swap a generated fixture into a canonical slot: loader throws with the role mismatch named; CI fails.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 108.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Kills the fixture-role confusion class permanently; test failures mean real regressions, not fixture drift.

### 18. P-06: Fix ask-pipeline dangling site-bundle import (snapshot drift) (score 108.0)
- ID: P-06
- DOMAIN: PRODUCT LOOP
- CURRENT FAILURE/FRICTION: ask-pipeline.ts imports @/fyd/media/site-bundle, which does not exist in the fyd-product-lane snapshot tree; the lane copy lives at ~/workspace/fyd-ask-graph-read/site-bundle.ts. Snapshot drift means the ask path cannot be replayed from this tree.
- DESIRED INVARIANT: Every committed import resolves inside the same tree; snapshot drift is detected by CI, not by humans.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Import path only.
- REQUIRED CAPABILITY: commit the module tree with the tests (standing lesson from the 2026-09-26 ask-lane recovery)
- TEST/PROOF: Clean-checkout import closure test: every module imported by the ask pipeline resolves; suite runs green from a fresh worktree.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 108.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? A pipeline that cannot be replayed from a clean checkout cannot be trusted, fixed, or handed off.

### 19. S-06: Read-only discovery pool widening as a standard L2 operation (score 108.0)
- ID: S-06
- DOMAIN: SOCIAL
- CURRENT FAILURE/FRICTION: Same root as S-05, operationalized: there is no standard procedure for widening discovery, so each widening is a bespoke decision.
- DESIRED INVARIANT: Widening a read-only discovery pool follows a checklist (scope, reversibility, no-contact guarantee) and needs no human.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Discovery configuration; contact systems untouched.
- REQUIRED CAPABILITY: checklist plus configuration change procedure
- TEST/PROOF: Checklist run produces an audit record; a widening that touches contact configuration fails the checklist.
- DEPENDENCIES: S-05
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 108.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Discovery scales on rails; the never-reengage guard and contact gates stay exactly as strict.

### 20. SI-02: 22-dimension critical-bug checklist enforced on patches (score 108.0)
- ID: SI-02
- DOMAIN: SELF-IMPROVEMENT
- CURRENT FAILURE/FRICTION: The grill-20 22-dimension checklist (input, contract, authority, identity, persistence, transaction, retry, restart, replay, projection, tenant, privacy, authorization, cache, search/vector, serialization, UI, observability, test, deployment, rollback, memory) exists as a directive; nothing enforces it on actual patches.
- DESIRED INVARIANT: Every critical-bug patch records which of the 22 dimensions it touches and why the others are untouched.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Patch process; additive record.
- REQUIRED CAPABILITY: checklist template plus patch-record convention
- TEST/PROOF: Sample of past patches re-checked: the checklist would have caught the unexamined dimensions (e.g., tenant, privacy) before merge.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 108.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Checklists catch what memory misses. Twenty-two dimensions beat one tired reviewer.

### 21. SI-04: Negative-LOC reward: track deletion as progress (score 108.0)
- ID: SI-04
- DOMAIN: SELF-IMPROVEMENT
- CURRENT FAILURE/FRICTION: SOUL 22 says progress means fewer competing authorities, but nothing measures it: LOC only grows, and deletions are invisible in every report.
- DESIRED INVARIANT: Every change reports LOC delta; consolidations that delete code are celebrated with the same visibility as features.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Reporting; additive metric.
- REQUIRED CAPABILITY: LOC delta in change records plus a deletion ledger
- TEST/PROOF: A consolidation's record shows negative LOC with capability preserved (tests green); the ledger lists it.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 108.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? What gets measured gets done. Rewarding deletion is how the codebase gets smaller and stronger.

### 22. T-04: Determinism CI gate for the generator (STEP-01 as a gate, not a record) (score 108.0)
- ID: T-04
- DOMAIN: TESTING
- CURRENT FAILURE/FRICTION: STEP-01 proved specDigest identical across two runs as a one-time record. Nothing runs it per change, so a nondeterministic generator change ships silently.
- DESIRED INVARIANT: Every generator change passes the repeated-generation determinism gate in CI.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: CI; generator behavior unchanged.
- REQUIRED CAPABILITY: STEP-01 procedure as a CI job
- TEST/PROOF: Introduce a nondeterministic change (Date.now in identity): the gate fails before merge.
- DEPENDENCIES: WB-04
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 108.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Promotes the determinism proof from a document to a gate.

### 23. WB-04: Determinism fail-first tests for the generator (byte-identical repeated generation) (score 108.0)
- ID: WB-04
- DOMAIN: WEBSITE BUILDER
- CURRENT FAILURE/FRICTION: A module-global projectCounter produced identities from mutable process state; the generator was not byte-identical across runs (fixed 2026-09-22 hostile-g2).
- DESIRED INVARIANT: Repeated generation from the same canonical input produces byte-identical output; any nondeterminism fails the test before it ships.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test suite only.
- REQUIRED CAPABILITY: repeated-generation harness from the failure lesson
- TEST/PROOF: Generate twice from the same input in separate processes: bytes identical, digests equal; injecting Date.now into identity derivation fails the test.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 108.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Deterministic regeneration is the product promise that lets owners trust 'keep it current'. Fail-first tests hold it.

### 24. A-01: Enforce the L0-L4 action matrix in the agent operating model (score 104.167)
- ID: A-01
- DOMAIN: AGENTS
- CURRENT FAILURE/FRICTION: Agents operate on prose authority ('proposal-only', 'bounded autonomy') with no enforced action levels. The same 'proposal-only' rule covers both a selector fix and a production deployment, which is why review debt accumulates and risky actions have no standard gate.
- DESIRED INVARIANT: Every agent action declares its level; L0-L2 execute, L3 proposes with evidence, L4 requires named human authority; violations are refused by tooling, not by convention.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Agent behavior; human authority preserved.
- REQUIRED CAPABILITY: action-level classifier plus proposal schema
- TEST/PROOF: Replay of past incidents: the force-kill would classify L2 (recovery path exists), a production deploy L3, key destruction L4; each routes correctly.
- DEPENDENCIES: none
- LEVERAGE: 5 x FREQUENCY: 5 x AUTONOMY GAIN: 5 x REUSABILITY: 5 / RISK: 2 / COMPLEXITY: 3 = 104.167
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? The single highest-leverage autonomy item: it converts every other autonomy improvement from prose into enforceable behavior.

### 25. A-07: Shadow/eval harness for Jev decisions (agreement, grounding, evidence, schema, latency, cost) (score 96.0)
- ID: A-07
- DOMAIN: AGENTS
- CURRENT FAILURE/FRICTION: Jev moved to serious primary use (2026-09-26) on a contract plus one live canary. There is no standing harness measuring agreement, grounding, evidence quality, schema validity, latency, and cost per decision point.
- DESIRED INVARIANT: Every Jev decision point has a standing eval: agreement vs ground truth, evidence cited, schema valid, latency and cost within budget.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Evaluation; Jev remains proposal-only.
- REQUIRED CAPABILITY: eval harness plus decision-point registry
- TEST/PROOF: Eval runs per decision point; a point falling below agreement threshold is demoted to shadow automatically.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 2 = 96.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Serious use requires serious measurement. The harness is what lets Jev's remit expand without expanding risk.

### 26. AU-06: Decision log for Nolan's reversals is the autonomy boundary record (score 96.0)
- ID: AU-06
- DOMAIN: AUTONOMY
- CURRENT FAILURE/FRICTION: Autonomy boundaries move when Nolan reverses policy, but the moves are scattered across memory and directives. Agents cannot reliably answer 'what am I allowed to do today'.
- DESIRED INVARIANT: The decision log (SI-06) is the single place autonomy boundaries are read from; every L-level definition references it.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Documentation; L-definitions reference it.
- REQUIRED CAPABILITY: log plus reference convention
- TEST/PROOF: Ask 'may I do X': the answer traces to a dated log entry, not to memory or vibes.
- DEPENDENCIES: SI-06
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 96.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Autonomy with a readable boundary is safe autonomy. The log is the boundary's source of truth.

### 27. D-02: Closure-aware reconciliation for all gap detectors (score 96.0)
- ID: D-02
- DOMAIN: DATA
- CURRENT FAILURE/FRICTION: reconcile.py re-escalated 10 R2 + 7 R3 gaps across 3+ reports because it ignored closure dispositions; fixed 2026-09-20 with lifecycle OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED. Other detectors were never audited for the same defect.
- DESIRED INVARIANT: Every gap detector consumes closure dispositions as input; suppression is auditable and reopenable.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Reconciliation logic; dispositions preserved.
- REQUIRED CAPABILITY: lifecycle state machine pattern from the 2026-09-20 fix
- TEST/PROOF: For each detector: feed a closed gap, assert no re-escalation on the next run; reopen the disposition, assert escalation resumes.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 4 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 2 = 96.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Stops alert fatigue: every repeated false escalation trains operators to ignore the real ones.

### 28. O-03: Tripwire identity, ownership, and health evaluation (done 2026-09-26) (score 96.0)
- ID: O-03
- DOMAIN: OPERATIONS
- CURRENT FAILURE/FRICTION: Tripwire trusted argv spelling. Fixed during the incident: evaluates service identity, listener ownership, and health; controlled kill/recovery proof passed.
- DESIRED INVARIANT: Gateway supervision asserts identity, ownership, and health.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Tripwire script only.
- REQUIRED CAPABILITY: already implemented
- TEST/PROOF: Controlled kill/recovery proof passed 2026-09-26; journal integrity intact; unexpected writers zero.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 2 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 96.0
- STATUS: completed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Already delivered: the reference implementation of semantic monitoring.

### 29. A-04: Invalid workdir fails before provider dispatch (stop paying for broken launches) (score 81.0)
- ID: A-04
- DOMAIN: AGENTS
- CURRENT FAILURE/FRICTION: Open reliability item 8: worker launches with invalid workdirs still reach provider dispatch, burning tokens and producing confusing failures.
- DESIRED INVARIANT: Workdir validation is a pre-dispatch gate; invalid workdirs fail locally with a typed error and zero provider calls.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Launcher; providers untouched.
- REQUIRED CAPABILITY: pre-dispatch validation gate
- TEST/PROOF: Launch with invalid workdir: zero provider calls observed, typed error returned; contract tests cover every refusal path.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 81.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Stops burning money and confusion on launches that were broken before they started.

### 30. AC-03: Structured vs messy web parse tiers with truthful extraction stats (score 81.0)
- ID: AC-03
- DOMAIN: ACQUISITION
- CURRENT FAILURE/FRICTION: The @graph failure taught that parse-tier behavior must be labeled; without per-tier stats, RESOLVE priority cannot behave as documented and silent-empty can recur in a new tier.
- DESIRED INVARIANT: Every extraction records its parse tier and truthful stats (nodes visited, facts produced); zero facts from a successful fetch raises an alert, never a quiet empty.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Extraction pipeline observability.
- REQUIRED CAPABILITY: extraction stats already partially exist; add tier labels and zero-fact alert
- TEST/PROOF: Fixture page with valid JSON-LD array shape produces tier label plus NODES>0; a page with no extractable content records tier plus explicit zero with reason.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 81.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Makes the @graph invariant permanent: the pipeline can never again silently produce nothing and look fine.

### 31. O-06: Stale wrapper reconstruction automation (Temp volatility) (score 81.0)
- ID: O-06
- DOMAIN: OPERATIONS
- CURRENT FAILURE/FRICTION: C:/Windows/Temp is volatile; hermes-run.sh and hermes-launch.py were silently lost, causing exit 127 with empty output. Reconstruction notes exist in INTEGRATION.md but nothing checks wrapper existence before use.
- DESIRED INVARIANT: Every volatile-path dependency has a local reconstruction source and a pre-flight existence check with a clear error naming the reconstruction recipe.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Wrapper scripts; behavior unchanged.
- REQUIRED CAPABILITY: pre-flight check plus reconstruction recipe registry
- TEST/PROOF: Delete a wrapper: the pre-flight check fails with the recipe name; run the recipe: the wrapper is restored and the call succeeds.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 81.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Turns silent 127s into one-command recoveries. Volatile paths stop being mystery failures.

### 32. C-02: Jev evidence-support classification as primary for Ask FYD (score 80.0)
- ID: C-02
- DOMAIN: CONCIERGE
- CURRENT FAILURE/FRICTION: Ask FYD answers are produced by the pipeline's own classification; TYPESAFE_JEV (contract 25/25 green, live canary 2026-09-26) is available for bounded semantic decisions but not yet primary at the answer-evidence seam.
- DESIRED INVARIANT: Every Ask FYD answer carries a Jev-typed evidence class (SUPPORTED / PARTIALLY_SUPPORTED / UNKNOWN) computed by the bounded semantic path, not by the generator.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Answer classification; Jev remains proposal-only, never authorizes effects.
- REQUIRED CAPABILITY: TYPESAFE_JEV via jev_ask.py (profile-only, purpose gating, budget gate, spend ledger)
- TEST/PROOF: Shadow/eval harness: Jev classification agreement with ground truth on the 4-case battery (supported/partial/unsupported/conflicting); schema validation on every response.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 5 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 2 = 80.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Evidence-bounded answers that can prove their support level are the product differentiator against generic chatbots.

### 33. P-09: Friction-to-consequence mapping in the patch loop (score 80.0)
- ID: P-09
- DOMAIN: PRODUCT LOOP
- CURRENT FAILURE/FRICTION: Every customization currently goes through the same proposal/approval ceremony. Changing padding should not cost the same ceremony as publishing new pricing everywhere.
- DESIRED INVARIANT: LOW (change heading): apply quickly, undo available. MEDIUM (hide service): preview plus undo. HIGH (publish pricing everywhere): explicit approval. VERY HIGH (message 2,000 people): strong confirmation plus capability and policy checks.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Patch loop UX; authority boundaries unchanged.
- REQUIRED CAPABILITY: consequence classifier (Jev ambiguity triage candidate) + tiered approval paths
- TEST/PROOF: Matrix test: one action per tier asserting the required approval level; VERY HIGH action without confirmation is refused.
- DEPENDENCIES: C-03
- LEVERAGE: 4 x FREQUENCY: 4 x AUTONOMY GAIN: 4 x REUSABILITY: 5 / RISK: 2 / COMPLEXITY: 2 = 80.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Removes constitutional ceremony from trivial changes while keeping consequential authority intact. Speed where safe, gates where it matters.

### 34. S-04: Bounded L-level authority for engagement-driver fixes with rollback and green tests (score 80.0)
- ID: S-04
- DOMAIN: SOCIAL
- CURRENT FAILURE/FRICTION: training-curriculum.md:63 leaves driver fixes ambiguous; routine reversible repairs (selector updates, timing tweaks) pile into the morning review queue because proposal-only authority is too coarse.
- DESIRED INVARIANT: Bounded driver fixes (known file, known selector set, green tests before and after, instant rollback) execute without review; everything else proposes.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Engagement drivers only; rollback first-class.
- REQUIRED CAPABILITY: L-level authority class plus rollback procedure
- TEST/PROOF: Fix applied, tests green, rollback demonstrated; an out-of-bounds fix (new file, new capability) is refused and proposed instead.
- DEPENDENCIES: A-01
- LEVERAGE: 4 x FREQUENCY: 4 x AUTONOMY GAIN: 5 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 2 = 80.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Kills the morning-review debt queue: the highest-frequency autonomy failure in the social lane.

### 35. WB-02: SafeLink type-level enforcement at every render sink (score 80.0)
- ID: WB-02
- DOMAIN: WEBSITE BUILDER
- CURRENT FAILURE/FRICTION: React escaped text but rendered javascript: URLs into href (FL-20260922-002). safe-link.ts exists as a library, but nothing forces render code to use it; a new sink reintroduces the class.
- DESIRED INVARIANT: No href/src/action sink accepts a raw string; all pass through the SafeLink type, enforced by lint plus type checks.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Render code; library already proven.
- REQUIRED CAPABILITY: safe-link.ts (241-line equivalent in TS) plus lint rule
- TEST/PROOF: Hostile-scheme battery (javascript:, data:, vbscript, bounded encoding layers): all fail closed to plain text; a raw-string href fails the lint gate.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 5 / RISK: 1 / COMPLEXITY: 1 = 80.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? One XSS in a generated business site destroys trust in every site FYD builds. Type enforcement ends the class.

### 36. P-01: Automated PASTE URL to new-tenant site pipeline (score 78.125)
- ID: P-01
- DOMAIN: PRODUCT LOOP
- CURRENT FAILURE/FRICTION: Onboarding a new business today is manual operator assembly. POST /api/fyd/onboarding/preview stops at an evidence preview plus an OBSERVED claim; nothing wires preview into runExtractionPipeline, tenant registration, SiteSpec generation, or a served site. Both tenants are hand-pinned fixtures (happy-place-graph.ts, coppersmith-graph.ts).
- DESIRED INVARIANT: PASTE URL -> served generated site with zero operator assembly for the standard case.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: New tenants only; existing fixtures untouched.
- REQUIRED CAPABILITY: onboarding finalize endpoint; 9-stage extraction; tenant registry write with digest verification
- TEST/PROOF: End-to-end: submit a prospect URL, assert a served /sites/[slug] with SiteSpec digest matching the extraction output; fixture tenants byte-identical before/after.
- DEPENDENCIES: P-03 (graph write path), AC-01 (multi-page fetch)
- LEVERAGE: 5 x FREQUENCY: 5 x AUTONOMY GAIN: 5 x REUSABILITY: 5 / RISK: 2 / COMPLEXITY: 4 = 78.125
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? This is the product loop's first two arrows. Without it every new customer costs operator hours; with it FYD can onboard businesses faster than any manual process.

### 37. D-05: Provenance completeness: every fact carries source URL or content-addressed event id (score 72.0)
- ID: D-05
- DOMAIN: DATA
- CURRENT FAILURE/FRICTION: Why-this fails closed with no provenance, but nothing enforces that ALL facts (not just why-this-surfaced ones) carry provenance. A fact without provenance is an unverifiable claim.
- DESIRED INVARIANT: Fact creation without provenance fails closed at the schema level.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Fact schema; extraction pipeline.
- REQUIRED CAPABILITY: schema constraint on fact records
- TEST/PROOF: Attempt to create a fact without source: schema rejects; existing facts all carry source URL or event id (audit query returns zero orphans).
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 2 = 72.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Evidence-bounded answers are only as strong as the weakest fact. This makes 'how do you know' answerable for everything.

### 38. P-07: Re-run canonical jest suite on HEAD; replace the 2026-09-21 195/195 snapshot (score 72.0)
- ID: P-07
- DOMAIN: PRODUCT LOOP
- CURRENT FAILURE/FRICTION: The 195/195 figure is a 2026-09-21 snapshot; the tree changed materially on 2026-09-22 (phantom branch loss, ask/* and safe-link.ts rebuilt) and 2026-09-26 (ask-lane recovery 8cc8291). TEST-GATE.md measured 116 on 2026-09-21; the ask lane replayed 92/92 on 2026-09-26. No current number exists.
- DESIRED INVARIANT: The canonical gate number always describes HEAD, measured this week, from a clean worktree.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: None; measurement only.
- REQUIRED CAPABILITY: jest run on clean worktree; TEST-GATE.md updated with date and commit
- TEST/PROOF: The re-run itself, recorded with commit SHA and date.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 4 x AUTONOMY GAIN: 2 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 72.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Stale green claims are how regressions hide. A current number restores the gate's authority.

### 39. S-01: Scope exception to the Sept-16 force-kill rule for graceful closes and origin-scoped mutations (score 72.0)
- ID: S-01
- DOMAIN: SOCIAL
- CURRENT FAILURE/FRICTION: The Sept-16 force-kill trauma became a blanket rule: even graceful closes (Ctrl+C) and origin-scoped DOM mutations are gated behind an always-on watchdog. Locks then go stale without a graceful path to free them.
- DESIRED INVARIANT: Graceful close and origin-scoped DOM mutation are always allowed; the watchdog is the recovery path, not a gate.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Browser profile rules; watchdog unchanged.
- REQUIRED CAPABILITY: rule amendment plus lock-staleness recheck
- TEST/PROOF: Simulate stale lock: graceful close frees it without watchdog intervention; force-kill still triggers watchdog recovery.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 4 x AUTONOMY GAIN: 4 x REUSABILITY: 3 / RISK: 2 / COMPLEXITY: 1 = 72.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Removes a permanent tax on every browser automation session: no more waiting on Nolan to free a lock a graceful close could have freed.

### 40. SI-05: Weekly autonomy metrics (interventions, time-to-green without Nolan) (score 72.0)
- ID: SI-05
- DOMAIN: SELF-IMPROVEMENT
- CURRENT FAILURE/FRICTION: Autonomy is the program's goal but has no metric: nobody counts human interventions per week or mean time to green without Nolan.
- DESIRED INVARIANT: A weekly report counts human interventions, their categories, and time-to-green with and without Nolan.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Reporting; additive.
- REQUIRED CAPABILITY: intervention logging plus weekly rollup
- TEST/PROOF: Two consecutive weeks of reports exist with consistent categories; the trend is visible.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 4 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 72.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? The program's scoreboard. Without it, autonomy is a vibe; with it, it is a number that moves.

### 41. WB-07: Media region aspect-ratio stability (no layout shift) (score 72.0)
- ID: WB-07
- DOMAIN: WEBSITE BUILDER
- CURRENT FAILURE/FRICTION: No aspect-ratio or layout-shift discipline exists in the render path; media arriving late shifts content, which the directive explicitly forbids.
- DESIRED INVARIANT: Every media slot declares its aspect ratio up front; cumulative layout shift stays at zero through media load.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Render CSS; slot contract.
- REQUIRED CAPABILITY: aspect-ratio slot contract plus layout-shift measurement
- TEST/PROOF: Load a page with slow media: assert zero horizontal overflow and layout-shift score below threshold at 320 and 1280.
- DEPENDENCIES: AC-01
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 2 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 72.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Layout shift on a customer's phone reads as broken. Stability reads as professional.

### 42. SE-03: Fresh hostile probe re-run against the rebuilt safe-link.ts (score 64.0)
- ID: SE-03
- DOMAIN: SECURITY
- CURRENT FAILURE/FRICTION: The 2026-09-21 hostile probe predates the 2026-09-22 rebuild; safe-link.ts was rewritten during the phantom-branch recovery and never re-probed.
- DESIRED INVARIANT: The rebuilt URL sanitizer passes a fresh hostile battery: schemes, encodings, unicode tricks, bounded decode layers.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test only.
- REQUIRED CAPABILITY: hostile battery from the failure lesson
- TEST/PROOF: Battery runs green against the rebuilt module; any bypass fails closed to plain text.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 64.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? A rewritten sanitizer without a re-probe is an unproven sanitizer. The re-run restores proof.

### 43. A-08: Morning-review queue with SLA (proposals never park silently) (score 60.0)
- ID: A-08
- DOMAIN: AGENTS
- CURRENT FAILURE/FRICTION: Proposal-only authority created a morning review queue with no SLA: proposals park until Nolan looks. A queue with no SLA is a denial of autonomy by delay.
- DESIRED INVARIANT: Every queued proposal has an SLA; expired proposals auto-escalate with a recommendation or execute their safe default, never silently park.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Queue behavior; safe defaults only.
- REQUIRED CAPABILITY: queue with expiry and escalation
- TEST/PROOF: Proposal parked past SLA: assert it escalated with a recommendation; a safe-default proposal executed and logged.
- DEPENDENCIES: A-05
- LEVERAGE: 4 x FREQUENCY: 4 x AUTONOMY GAIN: 5 x REUSABILITY: 3 / RISK: 2 / COMPLEXITY: 2 = 60.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Autonomy dies in queues. The SLA guarantees every proposal resolves, with or without Nolan's immediate attention.

### 44. AU-02: L2 authority: restart a supervised shared service via its authorized script (score 60.0)
- ID: AU-02
- DOMAIN: AUTONOMY
- CURRENT FAILURE/FRICTION: Watchdogs already restart :18199 and the gateway autonomously, but :3100 has no supervisor and no L2 authority is declared; restarts are ad hoc.
- DESIRED INVARIANT: :3100 and every shared service has a declared L2 restart authority: which script, which verification, which evidence.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Shared services; authorized scripts only.
- REQUIRED CAPABILITY: L2 declarations per service (O-04's desired-state loop is the mechanism)
- TEST/PROOF: Stop :3100: the L2 path restarts it via start-3100.sh, verifies NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1, and emits evidence.
- DEPENDENCIES: A-01
- LEVERAGE: 4 x FREQUENCY: 4 x AUTONOMY GAIN: 5 x REUSABILITY: 3 / RISK: 2 / COMPLEXITY: 2 = 60.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Shared services heal without paging anyone. This is the autonomy the incident proved is possible.

### 45. D-08: New-field privacy classification gate (fail closed on unclassified fields) (score 60.0)
- ID: D-08
- DOMAIN: DATA
- CURRENT FAILURE/FRICTION: FYD-010 proved that new fields (phone, home_address) can reach visitor context with only object-level visibility. There is no gate requiring a field-level privacy classification before a new field becomes renderable.
- DESIRED INVARIANT: Any field not present in the visitor-safe allowlist is invisible to visitors; adding a field requires an explicit privacy classification.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Field visibility; safe default is hidden.
- REQUIRED CAPABILITY: schema-level default-deny plus classification checklist
- TEST/PROOF: Add a field without classification: visitor render omits it and a test fails until the classification exists.
- DEPENDENCIES: C-01
- LEVERAGE: 4 x FREQUENCY: 2 x AUTONOMY GAIN: 3 x REUSABILITY: 5 / RISK: 1 / COMPLEXITY: 2 = 60.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Privacy must be the default, not a review step. This makes the FYD-010 class structurally impossible.

### 46. AC-02: Politeness and budget enforcement for multi-page discovery (score 54.0)
- ID: AC-02
- DOMAIN: ACQUISITION
- CURRENT FAILURE/FRICTION: Once L3 discovery exists (P-02), nothing stops it from hammering a small business site: no crawl-delay observance, no per-domain concurrency cap beyond the semaphore, no robots handling recorded.
- DESIRED INVARIANT: Discovery declares its budget up front (max pages, max bytes, max seconds, concurrency 1 per domain default) and stops exactly at the budget.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Acquisition only.
- REQUIRED CAPABILITY: budgets.ts and rate-limit.ts already exist; wire into discovery loop
- TEST/PROOF: Discovery against a fixture site with 100 pages and budget 10 fetches exactly 10 and reports budget-exhausted, not an error.
- DEPENDENCIES: P-02
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 2 = 54.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? A crawler that hammers a plumber's shared-hosting site is a reputational incident. Budgets make discovery a good guest.

### 47. D-03: Evidence freshness timestamps and staleness surfacing (score 54.0)
- ID: D-03
- DOMAIN: DATA
- CURRENT FAILURE/FRICTION: Facts carry provenance but no freshness signal; a 3-year-old services page and yesterday's re-crawl look identical to Ask FYD and to the owner.
- DESIRED INVARIANT: Every fact carries observed_at; Ask FYD and rendered pages surface staleness where it matters (services, hours, pricing).
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Fact schema additive; render surfaces.
- REQUIRED CAPABILITY: observed_at already exists in media plan; extend to facts
- TEST/PROOF: Fact with observed_at 3 years past renders a staleness badge; Ask FYD cites the date when answering from old evidence.
- DEPENDENCIES: P-04
- LEVERAGE: 3 x FREQUENCY: 4 x AUTONOMY GAIN: 3 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 2 = 54.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Freshness is trust: an owner who sees 'verified 2 days ago from your site' believes the answer.

### 48. D-04: Conflict records first-class (SOURCE SAYS vs OWNER SAYS) with resolution (score 54.0)
- ID: D-04
- DOMAIN: DATA
- CURRENT FAILURE/FRICTION: STEP-07 demonstrated SOURCE SAYS vs OWNER SAYS drift warnings by hand-editing a fixture. There is no durable conflict record, no resolution workflow, and no audit of which side won.
- DESIRED INVARIANT: Conflicts are durable records with both claims, evidence refs, resolution, resolver identity, and timestamp; unresolved conflicts block silent regeneration.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Data layer additive.
- REQUIRED CAPABILITY: conflict record schema plus owner-panel resolution UI
- TEST/PROOF: Induce source/owner conflict; assert regeneration refuses to silently pick a side and the conflict appears in the owner panel with both claims cited.
- DEPENDENCIES: P-04
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 2 = 54.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Owner corrections must survive re-crawls. Without durable conflicts, every refresh can silently undo the owner's word.

### 49. O-08: Health projection truthfulness audit (watchdog health vs actual) (score 54.0)
- ID: O-08
- DOMAIN: OPERATIONS
- CURRENT FAILURE/FRICTION: Open reliability item 2 (second half): watchdog health projections were never audited against actual service state; a watchdog can report healthy while the service is degraded.
- DESIRED INVARIANT: Health projections are sampled against ground truth; divergence is itself an alert.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Health reporting; additive audit.
- REQUIRED CAPABILITY: ground-truth sampling plus divergence alert
- TEST/PROOF: Degrade a service while the watchdog reports healthy: assert the audit flags the divergence within one sample window.
- DEPENDENCIES: R-03
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 2 = 54.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? A health signal that can lie is worse than none. The audit makes health trustworthy.

### 50. O-09: Single deployment runbook for the FYD stack (score 54.0)
- ID: O-09
- DOMAIN: OPERATIONS
- CURRENT FAILURE/FRICTION: Deployment knowledge is scattered (restart-3100.sh is stale/inert, start-3100.sh is Pig-local, fyd-deploy/ has STATUS.md and push-via-api.py). There is no one document that deploys the stack.
- DESIRED INVARIANT: One runbook deploys the FYD stack end to end; every step is verifiable and every failure has a named recovery.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Documentation; scripts referenced, not changed.
- REQUIRED CAPABILITY: runbook synthesis from existing artifacts
- TEST/PROOF: Follow the runbook on a fresh checkout: the stack serves; each verification step passes.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 3 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 54.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Deployments stop depending on one person's memory. Anyone (or any agent) can deploy safely.

### 51. R-05: Attempt records durable and visible (A1: every attempt has its own record) (score 54.0)
- ID: R-05
- DOMAIN: RUNTIME
- CURRENT FAILURE/FRICTION: AXIOM-LEDGER A1 requires every attempt to have its own record; worker attempts today are partially visible through broker logs, not first-class records.
- DESIRED INVARIANT: Every attempt (try, outcome, evidence) is a durable record queryable independently of the mission.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Attempt logging; additive.
- REQUIRED CAPABILITY: attempt record schema plus query path
- TEST/PROOF: Run a mission with retries: assert N attempt records, each with outcome and evidence, independently retrievable.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 2 = 54.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Attempts are the unit of accountability. Durable attempts make 'what did it try' always answerable.

### 52. S-05: Targeting-rule ownership clarified (who may adjust discovery criteria vs contact) (score 54.0)
- ID: S-05
- DOMAIN: SOCIAL
- CURRENT FAILURE/FRICTION: Widening a read-only discovery pool was treated like an external-contact decision. The targeting rule owner, the discoverer, and the contacter are not distinguished, so safe adjustments wait on Nolan.
- DESIRED INVARIANT: Discovery-criteria adjustments (read-only, reversible) are L1/L2; contact decisions stay human-gated; the owner of each is named.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Targeting rules; contact authority unchanged.
- REQUIRED CAPABILITY: authority assignment plus rule classification
- TEST/PROOF: A discovery-pool widening executes without Nolan; a contact-list expansion is refused without human approval; both are logged with the deciding authority.
- DEPENDENCIES: A-01
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 3 / RISK: 2 / COMPLEXITY: 1 = 54.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Separates safe scaling (more candidates) from consequential action (contact). Volume grows without risk growing.

### 53. SI-06: Decision log for Nolan's reversals (policy changes with supersession) (score 54.0)
- ID: SI-06
- DOMAIN: SELF-IMPROVEMENT
- CURRENT FAILURE/FRICTION: Policy reversals (power policy, Jev posture, no-scale-back ramp) are recorded in memory prose; there is no single decision log showing what changed, when, why, and what it superseded.
- DESIRED INVARIANT: Every Nolan reversal is a dated log entry: old rule, new rule, reason, supersession chain.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Documentation; additive.
- REQUIRED CAPABILITY: decision log convention
- TEST/PROOF: The three 2026-09-26 reversals are logged with supersession chains; a new reversal follows the template.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 3 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 54.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Institutional memory for the moments direction changed. Future agents stop re-litigating settled calls.

### 54. T-01: Promote lane_c failure-injection gaps to tracked issues with owners (score 54.0)
- ID: T-01
- DOMAIN: TESTING
- CURRENT FAILURE/FRICTION: lane_c_failure_injection.md found real gaps (P1 orphaned events, P2 no restart scan, P3 replay divergence, P4 emit swallows errors) and was parked as 'out of scope, follow-up issues'. Parked findings with no owner are findings that die.
- DESIRED INVARIANT: Every failure-injection finding is a tracked issue with an owner and a verification test, or an explicit wont-fix with Nolan's word.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Issue tracking; code unchanged until fixed.
- REQUIRED CAPABILITY: issue creation plus ownership assignment
- TEST/PROOF: Each finding links to an issue; issues link to verification tests; the parked document is empty of orphans.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 3 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 54.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Failure-injection findings are the cheapest bugs: found before production. Tracking makes them fixed, not filed.

### 55. T-03: Promote the ask-ollama 4-case battery to the product test path (score 54.0)
- ID: T-03
- DOMAIN: TESTING
- CURRENT FAILURE/FRICTION: ~/workspace/work-askfyd/ask-ollama-acceptance.py is a throwaway experiment covering supported, partially_supported, unsupported, and conflicting evidence. It is not wired into any suite, so its coverage rots.
- DESIRED INVARIANT: The 4-case evidence battery runs as a product test on every Ask FYD change.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test wiring; experiment preserved.
- REQUIRED CAPABILITY: battery promotion into the ask suite
- TEST/PROOF: Each of the 4 cases asserts its evidence class; a change that breaks one fails CI.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 2 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 54.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Throwaway experiments that proved something should become permanent tests, or the proof evaporates.

### 56. WB-01: 320px browser regression test in CI (owner-tracing recipe codified) (score 54.0)
- ID: WB-01
- DOMAIN: WEBSITE BUILDER
- CURRENT FAILURE/FRICTION: A 320px overflow shipped because the exact overflowing node was never identified before CSS was changed; the fix required an owner-tracing recipe invented after the fact.
- DESIRED INVARIANT: Every template renders at 320, 375, 768, and 1280 with zero horizontal overflow, enforced in CI.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test suite only.
- REQUIRED CAPABILITY: browser harness already used in STEP-03
- TEST/PROOF: Inject a min-width:auto flex input into a fixture: test fails naming the exact overflowing node.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 2 = 54.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? The owner's customers browse on phones. A 320px overflow is a lost customer, not a cosmetic issue.

### 57. O-04: Desired-state loop for the FYD stack (declare, observe, diff, reconcile, learn) (score 53.333)
- ID: O-04
- DOMAIN: OPERATIONS
- CURRENT FAILURE/FRICTION: The FYD stack (:3100 and friends) has no declared desired state and no reconciler; it is started by hand and debugged by memory. The autonomy directive wants DESIRED STATE -> OBSERVATION -> DIFF -> CLASSIFICATION -> PLAN -> CAPABILITY CHECK -> RISK CLASSIFICATION -> EXECUTION OR PROPOSAL -> VERIFICATION -> EVIDENCE -> LEARNING.
- DESIRED INVARIANT: The FYD stack's desired state is declared; a loop observes, diffs, and reconciles it, emitting evidence at every step.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: FYD stack supervision; services managed, not modified.
- REQUIRED CAPABILITY: desired-state declaration plus reconciler (PigiFydStackWatch pattern extended)
- TEST/PROOF: Declare :3100 desired; kill it; assert the loop observes the diff, restarts via the authorized script, verifies health, and emits the full evidence chain.
- DEPENDENCIES: O-07
- LEVERAGE: 4 x FREQUENCY: 4 x AUTONOMY GAIN: 5 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 3 = 53.333
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Turns the demo stack from a pet into cattle: it heals itself and proves it.

### 58. P-02: Implement acquisition adapter L1 static fetch and L3 bounded discovery (score 53.333)
- ID: P-02
- DOMAIN: PRODUCT LOOP
- CURRENT FAILURE/FRICTION: src/fyd/acquisition/acquisition-adapter.ts is types only; ACQUISITION-STACK.md states no crawler platform was built. The only live fetcher is the single-page preview fetch, so extraction is single-page and shallow (services/about/contact pages never discovered).
- DESIRED INVARIANT: Given a business URL, the system discovers and fetches the service-relevant page set (sitemap, RSS, internal links) within declared budgets.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Acquisition layer only; SSRF gate and budgets already exist in fyd/net.
- REQUIRED CAPABILITY: implement L1/L3 on existing fyd/net primitives (SSRF gate, budgets, semaphores)
- TEST/PROOF: Regression corpus: multi-page fetch of coppersmith-plumbing raw corpus yields the same page set twice (deterministic discovery order); budget exhaustion fails closed.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 5 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 3 = 53.333
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Deeper evidence per business means richer object graphs, better Ask FYD answers, and fewer manual evidence hunts.

### 59. A-06: Receipt standard for worker effects (provider idempotency keys) (score 48.0)
- ID: A-06
- DOMAIN: AGENTS
- CURRENT FAILURE/FRICTION: Effects execute without a standard receipt; when an outcome is UNKNOWN, there is no idempotency key to check before redispatch.
- DESIRED INVARIANT: Every effect produces a receipt: effect id, provider idempotency key, outcome, timestamp; UNKNOWN outcomes carry the key needed for safe reconciliation.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Effect dispatch; additive record.
- REQUIRED CAPABILITY: receipt schema plus provider key capture
- TEST/PROOF: Kill the worker mid-effect: receipt shows UNKNOWN with the idempotency key; reconciliation checks the key instead of re-executing blindly.
- DEPENDENCIES: A-03
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 2 = 48.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Receipts are what make autonomous effects insurable: every action provable, every retry safe.

### 60. C-03: Intent-specified triage for customization requests (score 48.0)
- ID: C-03
- DOMAIN: CONCIERGE
- CURRENT FAILURE/FRICTION: Customization requests like 'Move X higher' currently go through an exact-match matcher (STEP-08 needed a matcher fix). Ambiguous requests have no triage: they either fail or guess.
- DESIRED INVARIANT: Every customization request is triaged as SUFFICIENTLY_SPECIFIED or not; underspecified requests ask one clarifying question naming the ambiguity.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Customize route; matcher remains deterministic for specified cases.
- REQUIRED CAPABILITY: Jev ambiguity triage (bounded semantic decision) plus deterministic matcher for the specified path
- TEST/PROOF: 'Move emergency plumbing to the top' -> specified, applies. 'Make it nicer' -> triage returns underspecified with the exact question asked; no silent guess.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 4 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 2 = 48.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Owners speak plainly. Triage turns plain speech into safe action without the owner learning a command language.

### 61. C-07: Capability-aware answers (Ask FYD offers actions it can actually do) (score 48.0)
- ID: C-07
- DOMAIN: CONCIERGE
- CURRENT FAILURE/FRICTION: Ask FYD answers questions but does not know the capability plan in context; it cannot offer 'I can hide that service for you' because answers and capabilities are disconnected.
- DESIRED INVARIANT: Answers include offered actions drawn from the capability plan and agent grants; forbidden effects are never offered.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Answer rendering; grants already strip forbidden effects.
- REQUIRED CAPABILITY: capability plan already in context builder input; surface as offers
- TEST/PROOF: Ask 'can you hide this service': answer offers the hide action with the correct approval tier (P-09); ask for a forbidden effect: never offered.
- DEPENDENCIES: P-09
- LEVERAGE: 4 x FREQUENCY: 4 x AUTONOMY GAIN: 4 x REUSABILITY: 3 / RISK: 2 / COMPLEXITY: 2 = 48.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? A concierge that answers AND acts is the product. Offers turn conversation into outcomes.

### 62. R-03: Watchdog truth under failure injection (HEALTHY/DEGRADED/AMBIGUOUS matrix) (score 48.0)
- ID: R-03
- DOMAIN: RUNTIME
- CURRENT FAILURE/FRICTION: Open reliability item 2: watchdogs report health but were never tested under injected failures; the September fault proved detectors can report RED for a healthy service and GREEN is assumed without proof.
- DESIRED INVARIANT: Every watchdog is failure-injected quarterly: kill, hang, port-steal, argv-spoof; the health matrix (HEALTHY/DEGRADED/AMBIGUOUS) is proven, not assumed.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Watchdog test scope; services untouched.
- REQUIRED CAPABILITY: failure-injection harness for supervisors
- TEST/PROOF: Inject each fault class; assert the watchdog reports the correct matrix cell and takes the correct action (or the correct no-action).
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 2 = 48.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Supervision you cannot prove is supervision you cannot trust. Injection turns watchdogs from scripts into guarantees.

### 63. R-06: Effect idempotency keys enforced at dispatch (F1: effects never duplicate silently) (score 48.0)
- ID: R-06
- DOMAIN: RUNTIME
- CURRENT FAILURE/FRICTION: F1 requires effect separation; without enforced idempotency keys, a retried dispatch can execute twice. A-06 defines receipts; this enforces the key at the dispatch boundary.
- DESIRED INVARIANT: Dispatch without an idempotency key is refused; duplicate keys are deduplicated, never re-executed.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Dispatch boundary.
- REQUIRED CAPABILITY: key enforcement at dispatch plus dedup store
- TEST/PROOF: Dispatch the same key twice: assert one execution and one dedup record; dispatch without a key: refused.
- DEPENDENCIES: A-06
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 2 = 48.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? The mechanical guarantee behind 'no duplicate effects'. Enforcement at the boundary, not by convention.

### 64. SE-05: Tenant boundary test battery on a standing cadence (score 48.0)
- ID: SE-05
- DOMAIN: SECURITY
- CURRENT FAILURE/FRICTION: Journal gateway privacy tests and Postgres/Qdrant tenant isolation tests exist but ran as one-time proofs. Tenant isolation is a property that must hold continuously, not once.
- DESIRED INVARIANT: Tenant-boundary attacks (spoofing, missing scope, cross-tenant reads, request-id reuse) run on a standing cadence and block releases on failure.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test scheduling; tenants unaffected.
- REQUIRED CAPABILITY: existing test batteries plus scheduler
- TEST/PROOF: Cadence runs green; inject a cross-tenant read: battery fails and blocks the release.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 2 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 1 = 48.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Isolation proven once is a snapshot; isolation proven every release is a guarantee.

### 65. T-05: Contract tests for the Ask FYD input boundary (score 48.0)
- ID: T-05
- DOMAIN: TESTING
- CURRENT FAILURE/FRICTION: AnswerAskFydInput and AskFydContextInput have types but no contract tests: malformed input, tenant mismatch, and mode confusion are tested ad hoc or not at all.
- DESIRED INVARIANT: The ask input boundary has contract tests: tenant-from-path wins, body tenant mismatch refuses, owner mode without auth degrades to visitor.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test suite; additive.
- REQUIRED CAPABILITY: contract-test pattern from the Jev contract work
- TEST/PROOF: Each contract case passes; a future input change that breaks tenant isolation fails loudly.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 48.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? The tenant boundary at the ask entrypoint is a security boundary. Contract tests hold it.

### 66. WB-03: Silent-empty extraction probe tests on all dependency return shapes (score 48.0)
- ID: WB-03
- DOMAIN: WEBSITE BUILDER
- CURRENT FAILURE/FRICTION: jsonld.flatten() returned an array while the consumer handled only {"@graph":[]} or a single object; the pipeline ran green and produced nothing (FL-20260922-001).
- DESIRED INVARIANT: Every dependency's return shape is probed with a successful zero-result case; zero results assert successfully, never pass silently.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test suite only.
- REQUIRED CAPABILITY: probe-test pattern from the failure's lesson
- TEST/PROOF: Each extraction dependency has a probe test asserting its actual shape on empty success; a shape mismatch fails loudly.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 1 = 48.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Silent-empty is the most expensive failure: everything looks fine and the customer sees nothing. Probes make it impossible.

### 67. AC-04: Source acquisition interface seam (replaceable crawler) (score 45.0)
- ID: AC-04
- DOMAIN: ACQUISITION
- CURRENT FAILURE/FRICTION: Acquisition is currently concrete code paths, not an interface. One crawler becoming constitutional violates the replaceability rule (no single crawler may become constitutional).
- DESIRED INVARIANT: Source acquisition is consumed through a declared interface (fetch page set within budget); implementations are swappable without touching the pipeline.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Acquisition boundary; pipeline untouched.
- REQUIRED CAPABILITY: interface definition plus adapter for the current fetcher
- TEST/PROOF: A stub acquisition implementation (fixture-backed) drives the full extraction pipeline in tests with zero pipeline changes.
- DEPENDENCIES: P-02
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 3 x REUSABILITY: 5 / RISK: 1 / COMPLEXITY: 2 = 45.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Preserves optionality: the fetcher can be upgraded or replaced without re-proving the pipeline.

### 68. P-03: Durable tenant-scoped base-graph write path with digest verification (score 42.667)
- ID: P-03
- DOMAIN: PRODUCT LOOP
- CURRENT FAILURE/FRICTION: Base graphs are committed TS fixtures; fyd-tenant-graph.ts rebuilds on every read with no write API, no versioning, no replay-from-source for a new tenant. Everything downstream is pinned to two tenants.
- DESIRED INVARIANT: A new tenant's base graph is written once, digest-verified, versioned, and rebuildable from source evidence.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: New tenant graphs; read seam contract unchanged.
- REQUIRED CAPABILITY: tenant-scoped graph store with the digest verification the read seam already specifies
- TEST/PROOF: Write graph, corrupt one byte, assert verification fails closed; rebuild-from-source reproduces identical digest.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 4 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 3 = 42.667
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Unblocks multi-tenant FYD: the third business onboards without a code commit.

### 69. P-10: SiteSpec diff view for regeneration (before/after at spec level) (score 40.5)
- ID: P-10
- DOMAIN: PRODUCT LOOP
- CURRENT FAILURE/FRICTION: Regeneration is deterministic (STEP-01) but owners and operators cannot see WHAT changed between two SiteSpecs except by comparing rendered pixels.
- DESIRED INVARIANT: Every regeneration produces a human-readable spec diff (sections, fields, values added/removed/changed) alongside the render.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Read-only view; generator untouched.
- REQUIRED CAPABILITY: spec canonicalization already exists; diff renderer
- TEST/PROOF: Two known-different specs produce a diff naming exactly the changed fields; identical specs produce an empty diff.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 2 = 40.5
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Owners approve changes they can see. Operators debug regeneration without screenshotting.

### 70. WB-05: FYD-021 changed-source regeneration fixture and test (score 40.5)
- ID: WB-05
- DOMAIN: WEBSITE BUILDER
- CURRENT FAILURE/FRICTION: FYD-021 is an open known gap: the changed-source regeneration path (re-dump with drift) has no committed fixture or test; STEP-07 was simulated by hand.
- DESIRED INVARIANT: A committed fixture exercises the full changed-source regeneration path: mutate source, regenerate, assert drift warnings and conflict records.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test suite only.
- REQUIRED CAPABILITY: fixture from STEP-07's simulated re-dump
- TEST/PROOF: The fixture runs in CI: source mutation produces exactly the expected drift warning set, no more, no fewer.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 2 = 40.5
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Keeps-it-current cannot be proven without a regeneration test. This is the proof.

### 71. P-04: KEEPS IT CURRENT runtime: scheduled re-acquisition plus digest-diff drift warnings (score 40.0)
- ID: P-04
- DOMAIN: PRODUCT LOOP
- CURRENT FAILURE/FRICTION: src/fyd/builder/source-refresh.ts is library plus tests only; STEP-07's re-dump was simulated by hand-editing a fixture. No scheduled re-acquisition, no drift detection, no owner notification. Hours, services, and prices silently go stale.
- DESIRED INVARIANT: Tenant sources are re-acquired on a schedule; digest diffs surface as drift warnings in the owner panel before the site goes stale.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Read-only against tenant sources until owner approves drift application.
- REQUIRED CAPABILITY: scheduler + re-acquisition worker + STEP-07 drift format surfaced in owner panel
- TEST/PROOF: Fixture source mutated; assert drift warning appears with SOURCE SAYS vs OWNER SAYS; approving applies via the patch loop with digest binding.
- DEPENDENCIES: P-03
- LEVERAGE: 4 x FREQUENCY: 4 x AUTONOMY GAIN: 5 x REUSABILITY: 3 / RISK: 2 / COMPLEXITY: 3 = 40.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? FYD KEEPS IT CURRENT is a product promise; without the runtime the promise is a demo. Stale business data destroys owner trust.

### 72. C-05: Trusted-answer-time metric (question to useful answer with source) (score 36.0)
- ID: C-05
- DOMAIN: CONCIERGE
- CURRENT FAILURE/FRICTION: No metric measures what the owner experiences: time from question to a useful answer WITH source and evidence. Latency is measured; trust is not.
- DESIRED INVARIANT: Every Ask FYD interaction records question -> useful answer time plus evidence presence; the metric is reported per tenant.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Observability additive.
- REQUIRED CAPABILITY: interaction logging with evidence-presence flag
- TEST/PROOF: Metric dashboard shows the distribution; a release that degrades trusted-answer-time fails the gate.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 4 x AUTONOMY GAIN: 2 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 2 = 36.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? You cannot improve what you do not measure. This metric is the product loop's health signal.

### 73. O-02: Tripwire container check tag-agnostic (done 2026-09-26) (score 36.0)
- ID: O-02
- DOMAIN: OPERATIONS
- CURRENT FAILURE/FRICTION: Tripwire asserted :latest; the deployed container was :production. Fixed during the incident: check now accepts the configured tag and logs current vs expected.
- DESIRED INVARIANT: The tripwire never asserts a hardcoded image tag.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Tripwire script only.
- REQUIRED CAPABILITY: already implemented
- TEST/PROOF: Incident record 2026-09-26: corrected and verified.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 36.0
- STATUS: completed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Already delivered: one false-red class eliminated.

### 74. R-07: UNKNOWN-outcome dashboard (every unknown effect has an owner and a next step) (score 36.0)
- ID: R-07
- DOMAIN: RUNTIME
- CURRENT FAILURE/FRICTION: F2 requires unknown outcomes to stay unknown, but there is no surface listing them: UNKNOWN effects are invisible until someone goes hunting.
- DESIRED INVARIANT: A standing dashboard lists every UNKNOWN-outcome effect with its owner, evidence, and next reconciliation step; none age without attention.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Observability; additive.
- REQUIRED CAPABILITY: projection over attempt/effect records
- TEST/PROOF: Inject an UNKNOWN outcome: it appears on the dashboard within the reconciliation window with owner and next step assigned.
- DEPENDENCIES: R-05
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 4 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 2 = 36.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Unknowns you can see get reconciled; unknowns you cannot see become incidents.

### 75. T-07: Unknown-effect test: mid-effect kill types UNKNOWN with a receipt (score 36.0)
- ID: T-07
- DOMAIN: TESTING
- CURRENT FAILURE/FRICTION: No test proves what happens when a worker dies mid-effect: the UNKNOWN typing, the receipt, and the reconciliation path are all untested together.
- DESIRED INVARIANT: Killing a worker mid-effect produces a typed UNKNOWN with a receipt and an idempotency key, and reconciliation uses the key.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test harness; additive.
- REQUIRED CAPABILITY: kill-injection plus receipt assertion
- TEST/PROOF: Mid-effect kill: assert UNKNOWN typed, receipt present, key present; reconciliation checks the key instead of re-executing.
- DEPENDENCIES: A-06
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 2 = 36.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? The most dangerous moment (death mid-effect) becomes the most tested moment.

### 76. C-01: FYD-010 field-level privacy gate on buildAskFydContext (score 33.333)
- ID: C-01
- DOMAIN: CONCIERGE
- CURRENT FAILURE/FRICTION: FYD-010 is falsified and open: buildAskFydContext leaks phone, home_address, and _internal_notes into visitor context because visibility is object-level and coarsenAddress has zero consumers.
- DESIRED INVARIANT: Visitor context contains only allowlisted fields; phone, home_address, and _internal_notes can never reach a visitor answer, enforced by a field gate test.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Ask FYD context builder; safe default hides.
- REQUIRED CAPABILITY: field-level visibility gate; wire the canonical coarsenAddress
- TEST/PROOF: Attack test: visitor asks for the owner's phone; assert the phone value appears nowhere in context, prompt, or answer; new unclassified fields fail closed (D-08).
- DEPENDENCIES: none
- LEVERAGE: 5 x FREQUENCY: 4 x AUTONOMY GAIN: 2 x REUSABILITY: 5 / RISK: 3 / COMPLEXITY: 2 = 33.333
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? A leaked home address ends the business. This is the highest-stakes open defect in the product loop.

### 77. D-06: Owner corrections journaled as canonical overlay events (score 32.0)
- ID: D-06
- DOMAIN: DATA
- CURRENT FAILURE/FRICTION: Owner corrections apply to projections but are not canonical events; replay from source would lose them (STEP-07's survival was simulated, not proven through the event spine).
- DESIRED INVARIANT: Every owner correction is a canonical journal event; replay reproduces the corrected state.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Journal writes for owner actions; tenant-scoped.
- REQUIRED CAPABILITY: journal overlay event type for corrections
- TEST/PROOF: Apply correction, wipe projections, replay journal: corrected state returns byte-identical.
- DEPENDENCIES: P-03
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 3 = 32.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Corrections that do not survive replay are not real. This makes the owner's word durable.

### 78. WB-06: Design tokens shared without a shared skin (typography, hierarchy, whitespace, media) (score 30.0)
- ID: WB-06
- DOMAIN: WEBSITE BUILDER
- CURRENT FAILURE/FRICTION: Sites must differ visually by design tokens, but today there is no shared token pipeline; consistency work is per-site hand labor and the design baseline harvest is unactionable.
- DESIRED INVARIANT: Design tokens (type scale, spacing, hierarchy rules, media slots) are shared infrastructure; visual skins differ per tenant without forking the pipeline.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Design layer; renderers consume tokens.
- REQUIRED CAPABILITY: token schema plus per-tenant token sets
- TEST/PROOF: Two tenants with different token sets render measurably different pages from the same pipeline; token change requires no renderer change.
- DEPENDENCIES: H-09
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 5 / RISK: 2 / COMPLEXITY: 3 = 30.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? One pipeline, many distinct brands. This is how FYD scales from 2 demo sites to 200 customer sites.

### 79. AC-01: Bounded media cache with provenance (source URL, observed_at, digest, content type, dimensions, lineage) (score 27.0)
- ID: AC-01
- DOMAIN: ACQUISITION
- CURRENT FAILURE/FRICTION: Demo business media has no bounded cache and no provenance record. Hotlinking random media or hardwiring filesystem paths into JSX are both live risks; possession does not establish ownership.
- DESIRED INVARIANT: Every third-party media byte carries source URL, observed_at, digest, content type, dimensions, and derivative lineage; uncached media never renders.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Media pipeline only.
- REQUIRED CAPABILITY: safe-fetch.ts already exists; add cache store plus provenance manifest
- TEST/PROOF: Fetch same URL twice: second serve from cache with identical digest; provenance manifest lists all fields; oversized or disallowed content-type refused.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 2 = 27.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Real photography arrives later; the pipeline must already be provenance-clean or media becomes a liability.

### 80. C-08: Multi-tenant answer quality benchmark (evidence density vs answer quality) (score 27.0)
- ID: C-08
- DOMAIN: CONCIERGE
- CURRENT FAILURE/FRICTION: Happy Place ships 15 facts, Coppersmith 38; nobody measures whether answer quality tracks evidence density or where the floor is.
- DESIRED INVARIANT: A standing benchmark scores Ask FYD answers per tenant against evidence density; quality regressions block releases.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Benchmark suite; tenants unaffected.
- REQUIRED CAPABILITY: question battery plus evidence-density measurement
- TEST/PROOF: Benchmark runs per release; a tenant below the quality floor is flagged before it reaches an owner.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 3 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 2 = 27.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Shows the minimum viable evidence per business: how much source is enough for a trustworthy concierge.

### 81. D-07: Relationship inference audit (observed vs derived relationships labeled) (score 27.0)
- ID: D-07
- DOMAIN: DATA
- CURRENT FAILURE/FRICTION: The object graph contains relationships, but nothing records which were observed in source data versus inferred by the pipeline. An inferred relationship presented as observed is a truth-layer violation.
- DESIRED INVARIANT: Every relationship carries its derivation: OBSERVED (with source) or DERIVED (with the rule or inference that produced it).
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Graph schema additive.
- REQUIRED CAPABILITY: relationship provenance field plus inference registry
- TEST/PROOF: Audit query lists every relationship with its derivation; a DERIVED relationship shown to a visitor renders as such or not at all.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 3 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 2 = 27.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Ask FYD must never present a guess as a fact. Labels make the distinction enforceable.

### 82. H-05: MERGE: divergent safe-fetch copies (src vs work/new staging) (score 24.0)
- ID: H-05
- DOMAIN: HARVESTING
- CURRENT FAILURE/FRICTION: src/fyd/net/safe-fetch.ts and the work/new staging copy diverge; the SSRF gate is security infrastructure that must be single.
- DESIRED INVARIANT: One safe-fetch; every fetcher imports it; the staging copy is retired.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Fetch paths; SSRF protection unchanged or stronger.
- REQUIRED CAPABILITY: consolidation procedure
- TEST/PROOF: SSRF battery (non-public IPs, DNS revalidation, redirect validation) passes against the survivor from every call site.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 1 = 24.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? One SSRF gate to audit, one to fix, one to trust.

### 83. T-02: Property tests for canonicalization (cross-process byte identity) (score 24.0)
- ID: T-02
- DOMAIN: TESTING
- CURRENT FAILURE/FRICTION: Determinism is claimed as a product feature (SOUL 10) but canonicalization has no property tests: same input in different processes, locales, or insertion orders is untested.
- DESIRED INVARIANT: Property tests assert: same canonical input -> same bytes -> same hash, across processes and orderings.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Test suite; additive.
- REQUIRED CAPABILITY: property-test harness over canonicalizers
- TEST/PROOF: Randomized inputs, shuffled orderings, separate processes: digests match in every case.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 4 / RISK: 1 / COMPLEXITY: 2 = 24.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Determinism without property tests is a claim; with them it is a guarantee.

### 84. A-03: WorkerRuntime broker result capture proof (fix unverified dispatch) (score 21.333)
- ID: A-03
- DOMAIN: AGENTS
- CURRENT FAILURE/FRICTION: Open reliability item 6: brokers dispatch effects but results are not captured, so outcomes are UNKNOWN and redispatch is unsafe. Containment is committed (fix/broker-failclosed-containment da64baa, 62/62 pass) but live Pig deployment is unverified.
- DESIRED INVARIANT: Every dispatched effect has a captured result or a typed UNKNOWN with a reconciliation owner; no effect is dispatched twice on an unknown outcome.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Broker dispatch path.
- REQUIRED CAPABILITY: result capture on the broker; containment already committed
- TEST/PROOF: Dispatch with a failing result sink: effect executes once, result recorded or UNKNOWN typed with owner; live Pig broker deployment verified.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 3 / COMPLEXITY: 3 = 21.333
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Duplicate physical effects are the autonomy nightmare. Result capture makes every dispatch accountable.

### 85. P-05: Real verified owner identity bound to claims routes; retire demoOwnerContext for production (score 18.75)
- ID: P-05
- DOMAIN: PRODUCT LOOP
- CURRENT FAILURE/FRICTION: The entire correction loop runs as a seeded demo actor (demoOwnerContext: true stamped everywhere); customize approve requires localhost plus env flag. The trust arrows OWNER TRUSTS IT -> OWNER TALKS TO IT cannot ship on demo authorization.
- DESIRED INVARIANT: Every owner correction is attributable to a verified owner identity; demo mode is visibly marked and technically incapable of masquerading as production auth.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Auth layer; demo mode preserved for private proof.
- REQUIRED CAPABILITY: owner claim seam (one external owner per tenant); claims routes bound to verified identity
- TEST/PROOF: Demo token against production tenant route is refused; verified owner correction round-trips with attribution in the journal.
- DEPENDENCIES: none
- LEVERAGE: 5 x FREQUENCY: 3 x AUTONOMY GAIN: 3 x REUSABILITY: 5 / RISK: 3 / COMPLEXITY: 4 = 18.75
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? No real customer deploys without real owner authentication. This is the gate between demo and revenue.

### 86. H-06: FREEZE: staging dirs as read-only (staging, h16-staging, phase20-builder-staging, migration_archive, lane-h) (score 18.0)
- ID: H-06
- DOMAIN: HARVESTING
- CURRENT FAILURE/FRICTION: Five staging/archive directories sit writable with live-looking code; nothing proves they are dead, and nothing stops a consumer from importing them. Deletion without proof would be architectural amnesia.
- DESIRED INVARIANT: The five directories are frozen read-only with a deadness manifest; nothing imports them; removal requires evidence.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: None; read-only freeze.
- REQUIRED CAPABILITY: freeze plus import-scan proving zero consumers
- TEST/PROOF: Import scan across the workspace: zero references to the frozen dirs; freeze is verifiable (writes fail).
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 1 x AUTONOMY GAIN: 2 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 18.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Stops the workspace from growing mystery code that someone might depend on. Frozen is honest; writable-and-maybe-dead is a trap.

### 87. H-07: coarsenAddress: wire the canonical or delete the local copy (score 18.0)
- ID: H-07
- DOMAIN: HARVESTING
- CURRENT FAILURE/FRICTION: Canonical coarsenAddress lives in src/fyd/privacy/visibility-policy.ts with zero consumers; src/fyd/proceduralize/service-cards.ts keeps a local copy with divergent defaults. Authority is split and the canonical one is dead code.
- DESIRED INVARIANT: Exactly one coarsenAddress exists and is consumed, or the concept is deleted with its call sites migrated.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Privacy policy and service cards.
- REQUIRED CAPABILITY: wire-or-delete decision plus migration
- TEST/PROOF: One implementation remains; the FYD-010 field gate (C-01) exercises it; no divergent defaults exist.
- DEPENDENCIES: C-01
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 3 / RISK: 2 / COMPLEXITY: 1 = 18.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Privacy authority cannot be split. One function, one set of defaults, actually used.

### 88. O-05: WSL-restart recurrence tripwire (bounded, deferred unless it recurs) (score 18.0)
- ID: O-05
- DOMAIN: OPERATIONS
- CURRENT FAILURE/FRICTION: The 2026-09-26 WSL restart killed the gateway; the initiator was never identified. Standing rule: do not investigate unless it recurs. There is currently no tripwire that would notice a recurrence.
- DESIRED INVARIANT: A recurrence of host-layer restart is detected, evidence is captured automatically, and recovery runs the idempotent start scripts.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Detection only; recovery uses existing idempotent scripts.
- REQUIRED CAPABILITY: boot-time vs service-start-time comparison plus evidence capture
- TEST/PROOF: Simulate a host restart: assert detection fires, evidence (boot time, service state) is captured, and services recover via start scripts.
- DEPENDENCIES: none
- LEVERAGE: 2 x FREQUENCY: 1 x AUTONOMY GAIN: 3 x REUSABILITY: 3 / RISK: 1 / COMPLEXITY: 1 = 18.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Cheap insurance: if the fault recurs, the diagnosis starts with evidence instead of a fresh mystery.

### 89. R-02: Consolidate MISSION_RECONCILE_HOLD authority (scheduler vs mission-control seam) (score 18.0)
- ID: R-02
- DOMAIN: RUNTIME
- CURRENT FAILURE/FRICTION: MISSION_RECONCILE_HOLD is emitted only from ping-runtime scheduler repair code (MissionScheduler._reconcileUnknown via deriveFailureRecord); mission-control has no such identifier, only lowercase reconciliation prose. Two systems describe holds with no shared authority.
- DESIRED INVARIANT: One authority owns HOLD semantics; mission-control's reconciliation fields reference it explicitly.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Scheduler and mission-control contract.
- REQUIRED CAPABILITY: authority assignment; HOLD lifecycle documented
- TEST/PROOF: Grep: exactly one module defines HOLD emission; mission-control consumes it through a declared interface.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 2 = 18.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Ambiguous authority is where duplicate-effect bugs hide. One owner for HOLD ends the seam.

### 90. S-02: Graceful-restart-with-session-preservation capability for browser profiles (score 18.0)
- ID: S-02
- DOMAIN: SOCIAL
- CURRENT FAILURE/FRICTION: There is no restart path that preserves CDP sessions and auth state; any recovery is a cold restart. This is the missing capability behind the force-kill blanket rule.
- DESIRED INVARIANT: A bounded restart preserves sessions and auth; cold restart is the fallback, not the only path.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Browser automation; profile data preserved by design.
- REQUIRED CAPABILITY: session-preserving restart procedure
- TEST/PROOF: Restart mid-session: auth state intact, CDP reconnects, in-flight job resumes or is cleanly marked; cold restart only when preservation fails.
- DEPENDENCIES: S-01
- LEVERAGE: 3 x FREQUENCY: 3 x AUTONOMY GAIN: 4 x REUSABILITY: 3 / RISK: 2 / COMPLEXITY: 3 = 18.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Turns browser crashes from Nolan-interrupts into self-healing events.

### 91. SE-04: BFF sanitization audit for new interpolation sinks (score 16.0)
- ID: SE-04
- DOMAIN: SECURITY
- CURRENT FAILURE/FRICTION: safe-link.ts covers link sinks, but every new BFF route is a potential new sink (the 22-dimension checklist names the secret-leak and object-identity classes). No audit enumerates current sinks.
- DESIRED INVARIANT: Every interpolation sink in BFF routes is enumerated and passes through the appropriate sanitizer; new sinks are caught by review checklist.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: BFF routes; audit first.
- REQUIRED CAPABILITY: sink enumeration plus checklist gate
- TEST/PROOF: Audit lists all sinks with their sanitizer; a new unsanitized sink fails the checklist.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 2 = 16.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Generalizes the javascript: URL lesson from one sink to every sink.

### 92. SE-06: Ask FYD input contract: secrets never enter model context (score 16.0)
- ID: SE-06
- DOMAIN: SECURITY
- CURRENT FAILURE/FRICTION: The 22-dimension checklist names the secret-leak class; Ask FYD context building has no contract proving that secrets (keys, tokens, internal notes) cannot enter the context sent to a model.
- DESIRED INVARIANT: Context construction is provably secret-free: a scanner asserts no secret-shaped values in any built context.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Context builder; additive scan.
- REQUIRED CAPABILITY: secret-shape scanner on built contexts
- TEST/PROOF: Build contexts for both tenants plus adversarial fixtures: scanner finds zero secret-shaped values; a planted key fails the test.
- DEPENDENCIES: C-01
- LEVERAGE: 4 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 2 = 16.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? A concierge that leaks a secret into a model call creates an incident no apology fixes. The contract prevents it structurally.

### 93. R-01: HOLD really holds: lease expiry and reaping cannot redispatch UNKNOWN-outcome missions (score 13.333)
- ID: R-01
- DOMAIN: RUNTIME
- CURRENT FAILURE/FRICTION: Open defect (ops amendment 2026-09-27): after MISSION_RECONCILE_HOLD, lease expiry or reaping can reset the mission to executable and redispatch an UNKNOWN-outcome mission, risking duplicate physical effects. AGENTS.md marks the reaper-vs-HOLD seam as an open design gap needing Nolan's word.
- DESIRED INVARIANT: A mission on HOLD stays held until its outcome is reconciled; no reaper, lease expiry, or scheduler path can silently make it executable.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Scheduler and reaper; mission semantics.
- REQUIRED CAPABILITY: HOLD-aware reaper plus scheduler repair; design decision from Nolan
- TEST/PROOF: Failure-injection: HOLD a mission, expire its lease, run the reaper: assert it is NOT redispatched and the HOLD evidence is intact.
- DEPENDENCIES: R-02
- LEVERAGE: 5 x FREQUENCY: 2 x AUTONOMY GAIN: 4 x REUSABILITY: 4 / RISK: 4 / COMPLEXITY: 3 = 13.333
- STATUS: blocked
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Duplicate physical effects are the single most dangerous autonomy failure. This is the fix; it needs Nolan's design word first.

### 94. H-02: MERGE: divergent canonical_event_envelope copies (score 12.0)
- ID: H-02
- DOMAIN: HARVESTING
- CURRENT FAILURE/FRICTION: Two copies (demotion-lane forensics vs forensics transfer) diverge in validation strictness, timestamp precision, and hash computation. Canonical means one.
- DESIRED INVARIANT: One canonical_event_envelope; all consumers use it; the retired copy is archived with its behavioral deltas recorded.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Envelope validation; consumers migrated.
- REQUIRED CAPABILITY: consolidation procedure
- TEST/PROOF: Equivalence tests: both copies' test suites pass against the survivor; divergence deltas documented.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 4 / RISK: 2 / COMPLEXITY: 2 = 12.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? The envelope is constitutional infrastructure. Two of them is a fork in the foundation.

### 95. H-01: MERGE: three mission/capability schedulers to one constitutional owner (score 10.667)
- ID: H-01
- DOMAIN: HARVESTING
- CURRENT FAILURE/FRICTION: Three schedulers exercise overlapping capability: f01-fix MissionScheduler, pig-transfer-tmp adaptation-lane scheduler, and caller-adaptation-lane scheduler. SOUL 6 (Rule of One) is violated; ownership is ambiguous.
- DESIRED INVARIANT: One scheduler owns mission/capability scheduling; the others are archived after behavior preservation.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Scheduler code; consumers migrated.
- REQUIRED CAPABILITY: Rule-of-One consolidation procedure (discover, compare, preserve, convert, archive, delete, rescan)
- TEST/PROOF: Behavioral equivalence suite: the surviving scheduler passes every test the retired ones passed; exactly one scheduler remains.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 2 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 3 / COMPLEXITY: 3 = 10.667
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Three schedulers mean three places a HOLD bug can hide. One scheduler means one place to fix.

### 96. H-03: MERGE: divergent unified_event_runtime copies (score 10.667)
- ID: H-03
- DOMAIN: HARVESTING
- CURRENT FAILURE/FRICTION: Multiple unified_event_runtime.js copies (ping-runtime canonical vs sprint-2026-09-24 demo) diverge; the runtime is the spine that HOLD, attempts, and effects all flow through.
- DESIRED INVARIANT: One unified_event_runtime; demos consume it, never fork it.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Event runtime; high care.
- REQUIRED CAPABILITY: consolidation procedure with replay verification
- TEST/PROOF: Replay a recorded event stream through the survivor: identical derived state as the retired copy.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 2 x AUTONOMY GAIN: 3 x REUSABILITY: 4 / RISK: 3 / COMPLEXITY: 3 = 10.667
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? A forked event runtime is a forked source of truth. Convergence protects every invariant built on events.

### 97. H-04: MERGE: divergent fyd-journal-gateway copies (tenant-boundary risk) (score 10.667)
- ID: H-04
- DOMAIN: HARVESTING
- CURRENT FAILURE/FRICTION: server.mjs copies diverge; the security reader flagged divergent copies as a tenant-boundary risk. The gateway is the journal's front door.
- DESIRED INVARIANT: One gateway implementation; all deployments run it; divergence is impossible by construction.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Gateway; deployments re-pointed.
- REQUIRED CAPABILITY: consolidation plus deployment inventory
- TEST/PROOF: Privacy attack battery (tenant spoofing, missing scope, cross-tenant reads, request-id reuse) passes against the single gateway.
- DEPENDENCIES: SE-05
- LEVERAGE: 4 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 4 / RISK: 3 / COMPLEXITY: 2 = 10.667
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Two front doors to the journal means two chances to get tenant isolation wrong. One door, one lock.

### 98. SE-02: FYD-037 wrong-journal guard (marker checks on emit) (score 10.667)
- ID: SE-02
- DOMAIN: SECURITY
- CURRENT FAILURE/FRICTION: FYD-037 is open: emit() can post to a misconfigured journal without marker verification. A misconfigured journal URL silently becomes the system of record.
- DESIRED INVARIANT: Every emit verifies journal markers before posting; a marker mismatch refuses the write.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Journal emit path; writes refused safely.
- REQUIRED CAPABILITY: marker check on emit
- TEST/PROOF: Point emit at a wrong journal: refused with the marker mismatch named; correct journal: writes normally.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 4 / RISK: 3 / COMPLEXITY: 2 = 10.667
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? The journal is the source of truth. Writing truth to the wrong journal is a silent catastrophe; the guard makes it loud.

### 99. C-06: Conversation memory bounds (continuity without surveillance) (score 9.0)
- ID: C-06
- DOMAIN: CONCIERGE
- CURRENT FAILURE/FRICTION: Grill-20 locked: ask continuity must not become permanent surveillance. No bounds exist on what Ask FYD remembers across conversations.
- DESIRED INVARIANT: Ask FYD retains only what the current task needs, with declared retention; nothing is kept 'just in case'.
- AUTOMATABLE? partial
- REVERSIBLE? yes
- BLAST RADIUS: Conversation state; retention policy.
- REQUIRED CAPABILITY: retention declarations per memory class
- TEST/PROOF: Audit: list everything retained after a conversation closes; assert each item has a declared retention and purpose.
- DEPENDENCIES: none
- LEVERAGE: 3 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 3 / RISK: 2 / COMPLEXITY: 2 = 9.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Privacy as a feature: owners trust a concierge that forgets what it does not need.

### 100. SE-01: Copilot per-identity isolation proof (identities 1-4 only) (score 8.0)
- ID: SE-01
- DOMAIN: SECURITY
- CURRENT FAILURE/FRICTION: Nolan authorized Copilot identities 1-4 only; 5-10 remain denied. The authorization is recorded as a decision, but there is no technical proof that a denied identity cannot be reached by a worker.
- DESIRED INVARIANT: A worker can only ever obtain identities 1-4; attempts to reach 5-10 fail closed with an audit record.
- AUTOMATABLE? yes
- REVERSIBLE? yes
- BLAST RADIUS: Credential routing; identities unchanged.
- REQUIRED CAPABILITY: identity allowlist enforced at the credential path
- TEST/PROOF: Request identity_7: refused before any provider call, audit record emitted; identities 1-4 route normally.
- DEPENDENCIES: none
- LEVERAGE: 4 x FREQUENCY: 2 x AUTONOMY GAIN: 2 x REUSABILITY: 3 / RISK: 3 / COMPLEXITY: 2 = 8.0
- STATUS: proposed
- HOW DOES THIS SHORTEN TIME TO PRODUCT VALUE? Authorization that is only a decision is a hope. Enforcement makes the boundary real.
