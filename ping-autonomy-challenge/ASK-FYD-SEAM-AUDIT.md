# ASK FYD SEAM COVERAGE AUDIT

**Date:** 2026-09-23. **Mode:** research only, no implementation.
**Scope:** every surviving mechanism across the 9 FAIL reports (FAIL-1 through FAIL-9 named reports), audited for whether its falsifiable test exercises the Ask FYD conversational path, the site-render path, or both. FAIL-2-falsification.md read for its Q7 analysis; FAIL-5-falsification.md section 4 read for its Ask FYD seam assessment.

**Headline finding:** of the 30 surviving mechanisms across the 9 reports, only 4 falsifiable tests exercise the Ask FYD conversational path at all (F9M1, F9M2, F6S3, F6S4's attack list), and none of the 4 binds free-text answers to evidence in the general case. Five of the remaining mechanisms *claim* Ask FYD coverage in their descriptions while their tests run only the site pipeline (F2S2, F5S1, F5S3, F6S1, F2S1/S3 by implication). Ask FYD is therefore structurally uncovered for #2 (unsafe-url), #5 (claim-binding), #1 (mobile-overflow), and #4 (fixture-drift), exactly the simultaneous reopening that FAIL-2's Q7 names as the highest-priority open question.

---

## 1. Per-survivor coverage table

Legend: **Test path** = what the survivor's own falsifiable test actually exercises. **Ask FYD in test** = does the test run a conversational query or otherwise touch the Ask FYD path. **Ask FYD in description** = does the mechanism text claim Ask FYD coverage.

### FAIL-1 mobile-overflow (3 survivors)

| Survivor | Test input and procedure (brief) | Test path | Ask FYD in test | Ask FYD in description |
|---|---|---|---|---|
| S1 post-generation empirical oracle | Three poisoned fixtures (375px-overflowing hero, nondeterministic ordering, deleted owner correction) plus control; run oracle harness; expect viewport assertion failure naming the owner via ancestor trace, byte diff on drift, preservation failure naming the lost correction | Site-render | No | No. Open Q7 asks outright whether the oracle runs on conversational output: "Both survivors gate the static site projection... Does the viewport oracle run on conversational output too, or does the class reopen through the chat surface?" |
| S2 typed projection seam | Source graph with 216px node in a 320px container, javascript: website string, unbound claim, private address; attempt construction through seam constructors; render; inspect output | Site-render | No | No. Open Q4 lists "Ask FYD dynamic content" as an uninventoried bypass of the type boundary. |
| S3 canonical pure projection | Fixed input set; run projection twice and byte-compare; remove one correction; bump pipeline version; inspect provenance log for logged causes | Site-render | No | No |

### FAIL-2 unsafe-url (3 survivors)

| Survivor | Test input and procedure (brief) | Test path | Ask FYD in test | Ask FYD in description |
|---|---|---|---|---|
| S1 schema-typed trust | Source graph with javascript:/tab-smuggled/data: URLs, private address, unbound claim; run proceduralize end to end; render full site to HTML; grep output for hostile strings | Site-render | No | Implied. The falsification's attack B2: "Does the test catch this? No. The test invokes 'the renderer directly,' i.e., the static site renderer. The conversational seam is out of scope of both the mechanism as tested and the test itself." |
| S2 sink-side validation | Hand-constructed poisoned renderer input model (javascript: link, private address in public slot, unbound claim), bypassing all upstream stages; invoke renderer directly; inspect emitted HTML | Site-render | No | Yes, but untested. Open Q7: "Does Survivor 2's sink check run on Ask FYD outputs too?... If the sink inventory covers only static site render, the same class reopens through the conversational surface." Falsification upgrade condition: if Ask FYD outputs are unvalidated, verdict upgrades to FALLS on #2 and #5. |
| S3 fail-closed defaults | Indeterminate values (web+safe: scheme, empty/whitespace URL, unclassified fact, status-less claim); render full pipeline; inspect every indeterminate value's rendered form | Site-render | No | Implied |

### FAIL-3 graph-blindness (4 survivors, all acquisition-seam)

| Survivor | Test input and procedure (brief) | Test path | Ask FYD in test | Ask FYD in description |
|---|---|---|---|---|
| S1 shape-coverage fixture registry | Unregistered @graph-array shape through coverage gate; mutated fixture; extractor change halving entities; expect gate/test failures | Acquisition (extraction) | No | No. Open Q8: "All four survivors are scoped to onboarding extraction... do receipts cover query-time entity assembly?" |
| S2 extraction receipts | Rank Math @graph page (7 nodes) plus bare-node page through a @graph-dropping extractor; regen-pair receipt diff; assert unexplained-drop invariant | Acquisition (extraction) | No | No |
| S3 unknown-shape quarantine | Unknown top-level shape, contradictory blocks, control; check quarantine store, gap-event feed, emitted graph | Acquisition (extraction) | No | No |
| S4 dual-parser cross-check | Sampled Rank Math page through production vs pinned reference parser; silent behavior change between regens; assert disagreement events | Acquisition (extraction) | No | No |

Note: F3 survivors sit upstream of both seams. They protect the graph that Ask FYD reads, but no F3 test exercises query-time entity assembly, and open Q8 leaves that gap explicit.

### FAIL-4 fixture-drift (4 survivors)

| Survivor | Test input and procedure (brief) | Test path | Ask FYD in test | Ask FYD in description |
|---|---|---|---|---|
| S1 declared-input purity | Two fixture projections, 5 runs with adversarial env variation (key order, Date.now, Math.random, TZ); byte-compare; one declared-input change; expect identical bytes then confined diff | Site-render | No | No |
| S2 replay-mismatch tripwire | Recorded (inputHash0, outputBytes0, outputHash0); three pipeline mutations (drop ownerOverrides, resolve conflict marker, reorder sections); regen through publish gate; expect named divergence halts | Site-render | No | No |
| S3 typed semantic render model | Fixture with unevidenced claim, private owner fact, javascript: URL, evidenced claims, seeded LLM paragraph; render through typed gate; inspect markup plus gate log; re-run seed 42, byte-compare GENERATED nodes | Site-render | No | No. The GENERATED quarantine with seed pinning is site-copy only. Grounding names "LLM copy variance (src/lib/ping/ask-composer exists in the path)" as an open drift source, untested. |
| S4 content-derived identity | Coppersmith fixture; generation twice; ordered ID lists; value-only re-observation; grep generation path for random UUID minting | Site-render | No | No |

### FAIL-5 claim-binding (3 survivors)

| Survivor | Test input and procedure (brief) | Test path | Ask FYD in test | Ask FYD in description |
|---|---|---|---|---|
| S1 projection-seam binding verifier | Graph (Drain Cleaning observed, no 24/7 evidence) plus SiteSpec with "24/7 Emergency Plumbing" predicate plus price conflict; run verifyPresentationBinding over semantic render model; inspect verified model | Site-render | No | Yes, but untested. Doctrine states every Ask FYD factual answer must resolve the chain object field to claim/evidence to visibility to render binding, but the test runs the site pipeline only. Falsification: "S1 and S2 are site-copy mechanisms, not Ask FYD mechanisms." |
| S2 prevention-first generation | Supported-claim set {Drain Cleaning, Mon-Fri 8-5} plus intent "hero headline"; generator 20 times at high temperature; deterministic binding validation; every factual predicate must be in the input claim set | Site copy generation | No | Yes, but conceded. The report's own open question: "Ask FYD free-text answers cannot fully pre-bind fragments the way site copy can." Falsification verdict: S2 FALLS on #5; "until the handoff seam is defined, S1/S2/S3 cannot be claimed to protect Ask FYD output at all." |
| S3 claim-level provenance pointers | Owner assertion A1 (phone) bound to rendered contact sentence; new crawl observes different phone; ingest, regenerate, inspect rendered sentence and event log; delete evidence record E9, regenerate, observe omission with dangling-pointer flag | Site-render | No | Yes, but untested. Description: "every rendered sentence (and every Ask FYD factual answer) carries its evidence pointer." Test: site regen only. Falsification: "S3's Ask FYD coverage is asserted, not constructed." |

### FAIL-6 visibility-error (4 survivors)

| Survivor | Test input and procedure (brief) | Test path | Ask FYD in test | Ask FYD in description |
|---|---|---|---|---|
| S1 positive-license projection gate | Fixture: public service, private service (canary CANARY-PRIV-8812), javascript: field, unevidenced claim; full public pipeline; capture rendered HTML, client script payloads, search index, gate logs; expect three logged denials | Site-render channels (HTML, payloads, search index) | No | Yes, but untested. Mechanism names "Ask FYD context" (plus sitemaps, RSS) as gated channels; the test captures none of them. F6 falsification confirms: "Ask FYD context, sitemaps, and RSS are claimed but untested." |
| S2 visibility as schema attribute | Fixture with public/private fields; regen twice; inject visibility flip; expect canonical diff event; deny-by-default on unauthorized flip | Site-render | No | No |
| S3 trusted-context tenant enforcement | Two tenants HP/CS with canaries; HP pipeline under trusted HP context; attack set includes "an Ask FYD query seeded with CS context"; expect zero CS canary bytes anywhere, attacks return empty or scope error, HP correction survives regen | Site-render AND Ask FYD conversational | Yes (partial) | Yes. Genuine Ask FYD coverage, but narrow: cross-tenant isolation (#6) only. Says nothing about within-tenant leaks (#6 owner vs public session), unsafe URLs (#2), or unbound claims (#5) in answers. |
| S4 adversarial boundary test suite | Suite against fixture pipeline, run twice; inject mutations (full graph to client payload builder bypassing gate; javascript: source field in link); expect loud failure naming canary | Fixture pipeline (site-render) | Partial (design) | Yes. Required attack set includes "Ask FYD over another tenant's evidence," so the suite design covers the Ask FYD tenant dimension. F6 falsification notes S4 has no Ask FYD mutation and the suite is a frozen 2026 channel list. |

### FAIL-7 clone-sitespecs (3 survivors)

| Survivor | Test input and procedure (brief) | Test path | Ask FYD in test | Ask FYD in description |
|---|---|---|---|---|
| S1 input-output variance coupling | Real corpora; build both specs; compute d_in/d_out; clone injection (rename only) must fail gate; drift injection (silent reorder) must flag | SiteSpec generation | No | No |
| S2 evidence-gated composition | Planner on rich graph A vs thin graph B; assert section sets differ with justifications; strip services from A, rebuild, assert services section disappears | SiteSpec generation | No | No |
| S3 provenance-typed content slots | Unbound tagline into factual slot must throw; source refresh contradicting correction, regen, correction survives; unbound AI tagline as BUSINESS_EVIDENCE rejected | SiteSpec composition | No | No |

### FAIL-8 correction-loss (4 survivors)

| Survivor | Test input and procedure (brief) | Test path | Ask FYD in test | Ask FYD in description |
|---|---|---|---|---|
| S1 typed owner-correction patches | Record phone correction plus hide-service via override endpoint; hostile re-dump (changed phone, deleted hidden service); serve site fresh; read effective phone, payload service list, three-layer display; owner store byte-identical | Site serve (render) | No | No. Open Q7: "Is there exactly one composition point that every graph consumer passes through, and is there a test enumerating every consumer to assert the overlay was applied?" Ask FYD is one of the un-enumerated consumers. |
| S2 three-way merge | Base phone A, new phone B, owner correction C; run merge; expect effective C plus SOURCE_CHANGED_AGAINST_OWNER_ASSERTION naming A and B plus keep/accept/inspect | Regen merge | No | No |
| S3 correction survival tests | Golden correction suite; sabotage modes (extractor drops entity; read path skips overlay); expect loud failure and regen-gate refusal | Regen pipeline | No | No |
| S4 source-change diffing | Base/new fixtures (one field changed, one object added, one vanished; correction on unchanged field); inspect diff artifact, re-verification scope, effective email | Regen pipeline | No | No |

### FAIL-9 conflict-collapse (4 mechanisms)

| Survivor | Test input and procedure (brief) | Test path | Ask FYD in test | Ask FYD in description |
|---|---|---|---|---|
| M1 conflict as first-class evidence state | Fixture: website hours 8-5 vs google-listing 9-5; run acquisition and SiteSpec generation twice; inspect evidence graph AND "the Ask FYD answer to 'What are your hours?'"; expect both observations plus CONFLICT UNRESOLVED; falsifier: "Ask FYD answers with one value unqualified" | Acquisition plus SiteSpec plus Ask FYD conversational | Yes | Yes. Real query, answer-text assertion. Covers the conflict-presentation slice of #5/#9. |
| M2 certainty attenuation at the answer seam | Conflicting fixture plus agreeing fixture; "query Ask FYD for hours against both fixtures; record the answer text"; expect conflicting fixture names both sources and values (or policy winner plus disclosed disagreement), agreeing fixture states plainly; falsifier: conflicting fixture produces plain declarative answer identical in confidence grammar | Ask FYD conversational | Yes | Yes. The only survivor whose test is primarily a conversational test. Covers the answer-grammar-under-conflict slice. |
| M3 auditable source-priority policy | Conflicting-hours fixture plus policy [owner-confirmed > website > google-listing]; owner correction 7-4; regenerate SiteSpec; inspect rendered value, audit events, evidence-graph retrievability of loser | SiteSpec regen plus evidence graph | No | Partial. Description says Ask FYD can cite the rule; no query in the test. |
| M4 conflict surfacing as owner tasks | Conflicting fixture, no owner correction, two refetch cycles; inspect task queue after each; expect exactly one open task, conflict UNRESOLVED, no silent flips | Owner task queue | No | No |

### Coverage count

30 surviving mechanisms total. Falsifiable tests exercising the Ask FYD conversational path: **4** (F9M1, F9M2, F6S3, F6S4 by design). Of those 4, two (F9M1, F9M2) assert answer-text properties under evidence conflict, one (F6S3) asserts cross-tenant isolation on a seeded query, and one (F6S4) names the Ask FYD attack in its required case list without a corresponding mutation. Mechanisms claiming Ask FYD coverage in prose whose tests never touch it: **5** (F2S2, F5S1, F5S3, F6S1, F2S1/S3 by implication of their class claims). The remaining 21 neither claim nor test it.

---

## 2. Seam inventory

Every output path by which FYD-produced content reaches a human or a browser, as named across the 9 reports plus the two falsifications. For each path: who claims it, whose test exercises it, who does neither.

1. **Rendered site HTML (static pages).** Claimed by nearly all survivors. Test-exercised by: F1S1, F1S2, F1S3, F2S1, F2S2, F2S3, F4S1, F4S2, F4S3, F4S4, F5S1, F5S2, F5S3, F6S1, F6S2, F6S3, F6S4, F7S1, F7S2, F7S3, F8S1, F8S2, F8S3, F8S4, F9M1, F9M3. This is the covered seam; almost the entire corpus is a site-render corpus.

2. **Ask FYD chat answers (conversational free text).** Claimed by: F2S2 (open Q7), F5S1, F5S3, F6S1, F9M1, F9M2, F6S3, F6S4. Test-exercised by: F9M1, F9M2, F6S3, F6S4 (design only). Not claimed and not tested by: all of F1, F3, F4, F7, F8, and the rest of F2/F5/F6. This is the central uncovered seam; details in section 3.

3. **Ask FYD tool-call arguments.** Named in: F4 grounding ("LLM copy variance (src/lib/ping/ask-composer exists in the path)" as an open drift source) and F6 falsification ("The next Pergola-shaped leak most likely lives here," referring to Ask FYD through the same gate, with S1's test channel list omitting tool-call arguments even though the mechanism claims Ask FYD context). Claimed by: F6S1 (as "Ask FYD context," ambiguous whether this includes tool args). Test-exercised by: none.

4. **Client script payloads / hydration data (the Pergola channel).** Test-exercised by: F6S1 (captures payloads in the test) and F6S4 (mutation (a) targets the payload builder). Not covered by: everyone else. Covered, but only by F6.

5. **Search indexes.** Test-exercised by: F6S1 (captures search index) and F6S3 (distinctive-string search in the attack set). Not covered by: everyone else. Covered, but only by F6.

6. **Sitemaps and RSS feeds.** Claimed by: F6S1 (names them as channels behind the single gate). Test-exercised by: none. F6 falsification: "Ask FYD context, sitemaps, and RSS are claimed but untested." (F7's rss.xml is an acquisition input, not an output dump.)

7. **JSON-LD dumps / structured data output.** Named by: F6 falsification as a fifth channel ("a JSON-LD dump"). Test-exercised by: none. (F3's JSON-LD work is ingestion, not emission.)

8. **RSC flight-data stream.** Named by: F6 falsification ("an RSC flight-data stream"). Test-exercised by: none.

9. **OG-image generator output.** Named by: F6 falsification ("an OG-image generator"). Test-exercised by: none.

10. **Owner preview (/build preview).** Named by: F6 open Q1, unanswered: "Is preview a separate license (owner context) on the same gate, or a separate pipeline? The gate model says separate license; the test for that decision is whether a preview URL can ever be mistaken for a public URL by a crawler or a shared link." Test-exercised by: none. F8's tests serve the public site, not preview.

11. **Owner-facing surfaces: task queue, drift/conflict warnings, three-layer display, SOURCE_CHANGED_AGAINST_OWNER_ASSERTION events.** Test-exercised by: F9M4 (task queue), F8S1/S2 (drift warnings, three-layer display, conflict events). Covered in the correction/conflict dimension; these are operator surfaces, not visitor surfaces.

12. **Error pages echoing request context.** Named by: F6 falsification only ("an error page that echoes request context"). Test-exercised by: none. Not named in any of the 9 reports.

13. **Internal channels (gate denial logs, neutralization events, extraction receipts, quarantine gap feed).** Partially test-exercised (F6S1 asserts denial logs; F3S2/S3 assert receipts and gap events on the write path). These are operator/diagnostic surfaces. F3's falsification notes the quarantine read path (who triages, on what cadence) is untested.

---

## 3. Uncovered seams and the classes that reopen through each

An uncovered seam means zero survivor tests exercise it. For each, the failure classes that reopen.

**A. Ask FYD free-text answers, URL-safety dimension.** No test poisons the Ask FYD markdown or link renderer with a hostile URL. FAIL-2 open Q7 is unanswered, and the FAIL-2 falsification states the upgrade condition explicitly: "If the answer to open question 7 is 'Ask FYD outputs are not sink-validated,' this verdict upgrades to FALLS on #2 and #5 (the classes reopen through the conversational surface)." Reopens: **#2** (javascript: URL rendered as a clickable link inside a chat answer), **#5** (unbound claims asserted conversationally), **#6** (private facts repeated to the wrong viewer, especially under multi-turn viewer confusion, per the F5 falsification).

**B. Ask FYD free-text answers, claim-binding dimension.** The F5 report admits in its own open questions that free-text answers cannot fully pre-bind fragments the way site copy can, and the F5 falsification concludes that until the handoff seam is defined, S1/S2/S3 "cannot be claimed to protect Ask FYD output at all, and FYD-BAR-001's zero unsupported published factual claims bar is untestable for Q&A." F9M1/M2 cover only the conflict-grammar slice (answers under CONFLICTING evidence), not general unbound claims, question smuggling ("Since you're the cheapest plumber in town, do you offer senior discounts?" answered with an agreeing non-correction), or cross-record synthesis presented as derived. Reopens: **#5** fully; **#9** partially (false confidence can return through any unbound answer, not just conflicts).

**C. Ask FYD answers, mobile-overflow dimension.** F1 open Q7: the viewport oracle gates the static projection; conversational output carries generated layout (answer cards, carousels) that no survivor measures. Reopens: **#1**.

**D. Ask FYD answers, drift dimension.** F4S3's GENERATED quarantine with seed pinning applies to site copy only; the grounding names ask-composer LLM variance as an open drift source. No test asserts answer stability for the same question across sessions, or that answers track owner corrections rather than stale source values. Reopens: **#4**; **#8**-adjacent (Ask FYD answering from pre-correction values).

**E. Ask FYD tool-call arguments.** Zero survivor coverage. The F6 falsification names this as the most likely next Pergola-shaped leak. Reopens: **#2** (injection into tool arguments reaching external systems), **#6** (private facts passed as arguments to tools, logs, or third parties), **#5** (unbound claims passed to tools that act on them).

**F. Owner preview channel.** F6 open Q1 unanswered; no test exercises preview. If preview is a separate pipeline rather than a license on the same gate, the verifier, the sink checks, and the visibility gate may all be absent there. Reopens: **#6** (a preview URL mistaken for public, or crawled, exposes private objects the owner was meant to see only in preview), **#5** and **#2** if preview skips the binding verifier and sink validation.

**G. Sitemaps, RSS feeds, JSON-LD dumps, RSC flight data, OG images.** Claimed by F6S1, tested by nobody; named by the F6 falsification as the fifth-channel class that defeated the Pergola-era checked set. Reopens: **#6** (private facts serialized into machine-readable dumps), **#5** (unbound claims emitted as structured facts to machines that treat them as authoritative), **#2** (URLs in dumps consumed by other tools without a sink check).

**H. Error pages echoing request context.** Named only in the F6 falsification; zero coverage anywhere. Reopens: **#6** (reflected private data in error output). Lower traffic than the other seams, but entirely unguarded.

**Summary of the simultaneous reopening:** through seams A and B alone, #2, #5, and #6 reopen at once, which is exactly the Q7 scenario the FAIL-2 falsification names as the highest-priority unanswered question: "A second projection seam without sink validation reopens #2, #5, and #6 simultaneously."

---

## 4. S2 (prevention-first generation) Ask FYD assessment

F5 S2 works as follows: the copy generator is never given free-form license; its input is a typed set of SUPPORTED CLAIMS plus a PRESENTATION INTENT; its output is text fragments paired with claim bindings; bindings are validated deterministically before any fragment can enter the render model; fragments are typed GENERATED_PRESENTATION and may rephrase but never manufacture predicates. Its falsifiable test runs the generator 20 times at high temperature over the fixed two-claim set {Drain Cleaning, Mon-Fri 8-5} and asserts every factual predicate in every accepted fragment is a member of the input claim set.

That test is entirely inside the site-copy regime: a closed claim set known at build time, a deterministic validation gate, and no visitor contact before the gate passes. The report's own open question concedes the Ask FYD problem verbatim: "Ask FYD free-text answers cannot fully pre-bind fragments the way site copy can; the evidence-bounded triage (SUPPORTED / PARTIALLY SUPPORTED / UNSUPPORTED) is the mechanism there, but the handoff between pre-bound generation and live Q&A needs a defined seam."

Is there any mechanism in the 9 reports that binds free-text conversational answers to evidence? No. The nearest candidates and the reason each falls short:

- F9M2 (certainty attenuation) is the only test that issues real Ask FYD queries and asserts an evidence-dependent answer property, but it binds answer *grammar* to evidence *class* (CONFLICTING forces hedge-or-disclose), not answer *sentences* to evidence *records*. It covers only the conflict slice of claim binding.
- F5S3 asserts in prose that "every Ask FYD factual answer carries VALUE plus CLASSIFICATION plus EVIDENCE_REF," but its test regenerates site copy only; the F5 falsification calls this asserted, not constructed, and notes the contract contradicts free-text generation unless answers are composed from pre-bound fragments (in which case they are not free text).
- F6S3 runs an Ask FYD query but only for cross-tenant isolation; it says nothing about whether the answer's claims are bound.
- F9M1 asserts Ask FYD does not state a conflicted value as settled fact; again the conflict slice only. Question smuggling and cross-record synthesis, the two attacks the F5 falsification names as unique to the conversational seam, are untouched by every test in the corpus.

Verdict: Ask FYD is structurally uncovered for claim binding. S2's prevention-first discipline does not transfer because its load-bearing precondition, a closed supported-claim set fixed before generation, does not exist at query time: the "input claim set" would be whatever retrieval returns, relevance-ranked and unbounded, composed across records in response to unanticipated questions.

The class of mechanism that would be needed is a query-time binding verifier: the conversational twin of F5 S1, sitting between answer generation and answer delivery. It would take the generated answer plus the retrieved claim set for that turn, require every factual sentence to resolve to a retrieved evidence record or be explicitly marked UNKNOWN or refusal, fail closed on unbound sentences (omit or refuse, never assert), and compute the SUPPORTED / PARTIALLY SUPPORTED / UNSUPPORTED label deterministically from binding coverage instead of accepting the generator's self-grade. Its falsifiable test would generalize the F9M2 shape: adversarial questions, including question smuggling and cross-record synthesis, against fixtures with known evidence, asserting that unsupported answers are refused or flagged and that no answer labeled SUPPORTED contains an unbound factual sentence. This is a direction, not a design; the F5 falsification already sketches the same seam definition (viewer-filtered retrieval, per-sentence bindings, verifier-computed triage labels).

---

## 5. Triage operationalization check

The referenced doctrine (memory/2026-09-21.md L1741) is one line: "SUPPORTED answers include evidence; PARTIALLY SUPPORTED answers state what is known and identify uncertainty; UNSUPPORTED answers say the evidence does not establish the claim."

- F5 cites the triage in its grounding and its open questions, but none of the three F5 survivor tests runs it. The F5 falsification states the reason plainly: "The file contains no falsifiable test for triage correctness and no account of who binds the label. A self-graded label is not a mechanism." It further argues the labels are unbound meta-claims: an answer labeled SUPPORTED that is not supported is itself a #5 failure one level up.
- F9M2's test is the only survivor test in the corpus that operationalizes any slice of the triage: it queries Ask FYD under CONFLICTING versus agreeing evidence and asserts the answer shape changes (disclosure versus plain statement). That is analogous to a PARTIALLY SUPPORTED versus SUPPORTED distinction, but only for the conflict dimension, with no sentence-level binding verification and no account of who computes the label.
- No survivor operationalizes the full triage with a test. No test anywhere in the 9 reports checks that a SUPPORTED-labeled answer is actually supported, that a PARTIALLY SUPPORTED answer correctly identifies its uncertainty, or that the label is computed by anything other than the generator being graded.

---

## 6. Consolidated answers to the task's questions

1. **Per-survivor path audit:** section 1. 26 of 30 survivors' tests exercise the site-render path only; 4 touch Ask FYD (F9M1, F9M2, F6S3, F6S4 by design); 4 more claim Ask FYD coverage in prose without testing it.
2. **Seam inventory:** section 2, 13 paths. Tested: rendered HTML (broadly), client payloads and search indexes (F6 only), owner task queue and drift/conflict warnings (F8/F9, operator surfaces). Claimed but untested: Ask FYD answers (mostly), Ask FYD tool-call args, sitemaps, RSS. Named but entirely uncovered: JSON-LD dumps, RSC flight data, OG images, owner preview, error pages echoing request context.
3. **Uncovered seams:** section 3, items A through H. The Q7 simultaneous reopening (#2 plus #5 plus #6 through Ask FYD) is confirmed as live: no survivor's test validates Ask FYD outputs for URL safety, claim binding, or visibility within a tenant.
4. **S2 assessment:** section 4. S2 is a site-copy mechanism; its closed-claim-set precondition does not exist at query time. No mechanism in the 9 reports binds free-text conversational answers to evidence. Ask FYD claim binding is structurally uncovered; the needed class is a query-time binding verifier with verifier-computed triage labels.
5. **Triage check:** section 5. No survivor operationalizes SUPPORTED / PARTIALLY SUPPORTED / UNSUPPORTED with a test. F9M2 operationalizes only the conflict/disclosure slice. The F5 falsification's objection stands: a self-graded label is not a mechanism.
