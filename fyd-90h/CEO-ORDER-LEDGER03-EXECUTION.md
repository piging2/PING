# CEO ORDER — LEDGER 03 → EXECUTION
**From Nolan, 2026-09-29 ~10:26 MDT. Binding. STOP REPORTING THE PING ASK GAP. CLOSE IT.**

Falsification is complete. We now know:
- Ask route exists and is reached.
- Happy Place returns 200 with evidence citations.
- ping-fyd 404 is expected under the current Ask registry.
- PING's generated site exists and renders.
- Build and Ask have competing site-resolution authority.
- No useful stranded implementation was found for this semantic unit.
THIS UNIT IS WRITER-READY.

## WRITER A — CLOSE PING → ASK FYD → EVIDENCE

Before touching code: STATUS → OWNERSHIP → SECRET CHECK → EXPLICIT FILE SET.

Then implement the smallest convergence delta already identified:
ping-fyd fixture + canonical digest + registry entry + explicit overlay-story decision + tests + served verification.

Do not build another resolver. Do not introduce another registry. Do not wire getPingObjectGraph directly into getSiteBundle if that violates the already-proven closed-read convergence boundary. Do not refactor adjacent architecture. Do not build Qdrant. Do not build generic RAG. Do not improve the UI. Do not touch HPP/Coppersmith except as regression fixtures.

ONE SEMANTIC UNIT: MAKE THE EXISTING PING TENANT LEGIBLE TO THE EXISTING ASK PATH.

Required proof: GET /api/fyd/ask/ping-fyd must no longer fail tenant resolution. Then prove the actual product contract with at least:
- SUPPORTED: known PING fact → answer → object refs → evidence refs
- PARTIAL: mixed known/unknown → answer separates them
- UNSUPPORTED: absent business fact → explicit lack of evidence
- CONFLICTING: if the current fixture can represent conflict, expose it; otherwise prove the conflict behavior at the lowest deterministic layer without fabricating PING data.
No model-prior PING facts.

Then: TEST → REVIEW DIFF → STAGE EXPLICIT OWNED FILES → COMMIT. UNFINISHED BUT VALUABLE = WIP COMMIT. There is no acceptable ending "tested but uncommitted" or "one line remains".

Report: REPO / BRANCH / BEFORE SHA / AFTER SHA / FILES / TEST COMMAND / RESULT / SECRET CHECK / DIRTY FILES LEFT UNTOUCHED / SERVED BUILD ID / SERVED DIGEST / PRODUCT BOUNDARY BEFORE / PRODUCT BOUNDARY AFTER.

## WRITER B — RESOLVE, DON'T MERELY DOCUMENT, BRANCH CONVERGENCE

We now know the served line is fyd/convergence-2026-09-28 and the sibling line diverged at f877c391 with the same binding fix present on both. DO NOT MERGE YET. First finish Lane-2 ownership classification of the unique commits/diffs between the two lines. Produce: ONLY TRACKC / ONLY CONVERGENCE / SEMANTIC DUPLICATES / CONFLICTS / SUPERSEDED / MUST HARVEST. Then converge toward the reached/served line, unless evidence proves that would lose a stronger semantic implementation. No reverse merge merely because it is easier. Commit the convergence operation atomically.

## SWEEP LANE — KEEP CRUSHING STRANDED STATE

71 → 67 worktrees and stranded value 71 → 58 is movement. CONTINUE. But do not let easy .next deletion make the metric look healthier than the implementation really is. What matters: STRANDED VALUABLE IMPLEMENTATION REMAINING, more than raw worktree count. For the remaining 58: HARVEST if it advances a reached FYD boundary; WIP COMMIT + PARK if useful but not currently needed; REFERENCE if architecturally informative but not executable authority; SUPERSEDE if replaced; DELETE only if proven reproducible/disposable; COLLISION if ownership remains uncertain. copper-v2 remains untouched until its gitdir mismatch is understood. Do not "fix" repository metadata speculatively.

## PING KNOWLEDGE FINDING — DO NOT HIDE THIS

The PING knowledge base being hand-authored, eight days stale, owner-asserted only, 4/7 service objects empty, without acquisition/re-dump is not an Ask defect. It is the next upstream truth-quality defect. Do not solve it inside Ask. Ask must faithfully expose the knowledge it has, including uncertainty. After Ask reaches PING, the next question is: CAN PING REBUILD ITS ENTITY UNDERSTANDING FROM CURRENT SOURCES WITHOUT HAND-AUTHORED KNOWLEDGE? That belongs at SOURCE → OBSERVATION → EVIDENCE → OBJECT GRAPH, not QUESTION → LLM → BETTER-SOUNDING ANSWER.

## SITE RESOLUTION IS NOW A CONVERGENCE TARGET

The most architecturally important Ledger-03 finding is not the 404. It is: BUILD AND ASK DISAGREE ABOUT ENTITY EXISTENCE. That cannot remain permanent. Do not immediately create SiteAuthority. First identify the smallest existing semantic primitive capable of answering "Does tenant/site X exist?" and "Which immutable/generated state identifies the version Ask should read?" Today the fixture/registry patch may be the smallest product delta. But record the duplication debt explicitly: ONE PRODUCT ENTITY MUST NOT REQUIRE INDEPENDENT REGISTRATION IN EVERY PROJECTION. Website, Ask, search, mobile and future projections eventually need to derive eligibility from the same entity/tenant semantics. Do not solve that generalization before PING Ask works. PROVE THE DUPLICATION WITH PING FIRST.

## NO NEW ARCHITECTURE UNTIL THIS REQUEST WORKS

The next visible proof is deliberately boring: "What services does PING offer, and how do you know?" The answer must originate from the same graph/evidence substrate that generated the presence. FAIL if: it requires a separately authored Ask knowledge base; it invents missing services; citations cannot resolve to evidence; PING renders but Ask independently says PING doesn't exist; it works only in unit tests but the served process still 404s. Green means: GRAPH → ASK RETRIEVAL → CLAIM → EVIDENCE → SERVED RESPONSE. COMMIT THAT. Then stop the writer. Reassess. Only then proceed to WHY THIS → SAME EVIDENCE BINDING.

## ARCHITECTURAL WATCH ITEMS (Nolan's deeper read)

1. **Projection-local existence.** Build says PING exists; Ask says it doesn't. More dangerous than a missing fixture because it predicts the same problem for search, Circle, mobile, MCP. Don't solve the generalized registry yet. Smallest delta through the existing Ask path, prove the duplication concretely, then determine whether the common primitive is tenant identity, generated bundle identity, object-graph identity, or something already in PING. Standing law: search both implementations before writing, minimize the delta.
2. **Ask as epistemic diagnostic instrument.** If Ask correctly says "I know these three services, these four objects have insufficient detail, and here is why," that is better architecture than an eloquent answer from prior knowledge. Resist fixing knowledge quality and Ask simultaneously. First make Ask accurately reveal the weakness of the current graph. Then improve acquisition. Otherwise you lose the ability to distinguish better retrieval from better underlying knowledge.
3. **One evidence-binding primitive.** Binding verification (render), claim→support→evidence (Ask), fact→evidence (Why This), and owner correction preserving source evidence must converge, not become three verification systems. WATCH CLOSELY: do not let Ask invent its own citation/provenance representation. If the writer returns an AskCitation universe unrelated to the evidence references already used by objects/render bindings, grill it immediately. Presentation shape can differ. Semantic evidence identity must not.
