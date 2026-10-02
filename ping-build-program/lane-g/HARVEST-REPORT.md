# HARVEST REPORT: external RAG / context systems for the Ask FYD context compiler

Lane G. Date: 2026-09-23. Verdict: ADAPT mechanisms, REJECT all dependencies.

## PROBLEM

Ask FYD must not receive the whole database, raw journal, all website text,
or all Git files. It needs a question-driven, visibility-bounded,
budget-enforced context packet with claim bindings that any reasoner
(deterministic concierge, LLM, MCP consumer) can use instead of raw canonical
state. The problem decomposes into: relevance selection (deterministic first,
then ranked), budget enforcement (byte caps with priority order), visibility
filtering, capability inclusion, and server-side citation verification.

## PING ALREADY HAS

Read-only trace of /home/nolan/projects/ping @ e48ef710, 2026-09-23:

- Bounded context builder: `src/lib/ping/ask-composer.ts` `buildAskContext`
  with `ASK_LIMITS` (8 related, 20 relationships, 500 field chars).
- Agent boundary: `src/fyd/ask/context-builder.ts` + `capabilities.ts`
  (forbidden effects stripped, unknown grants denied, digest-bound SiteSpec).
- Visibility projection: `src/fyd/ask/visitor-answer.ts` `publicGraphOf`
  (owner field-visibility first, public objects only, active relationships
  with both ends public), tenant-scoped bundle loader, objectId resolved
  inside one tenant's public graph, fail-closed `unknown_object`.
- Graded claims: factory `src/fyd/ask/concierge.ts` (SUPPORTED / DERIVED /
  INFERRED / UNKNOWN; throws on non-UNKNOWN claim without cited evidence).
- Citation surface: `AskEvidenceRef` / `AskClaimClassification` / [n]
  markers, visitor-facing citations with claimClass supported/derived.

What PING does NOT have (the compiler's job): question-driven relevance
ranking (today: id order, count truncation), a byte budget with priority
order and a cut ledger, a packet-level determinism proof, server-side
citation-vs-context verification, viewer roles beyond anonymous visitor.

## EXTERNAL CANDIDATES

1. Microsoft GraphRAG (github.com/microsoft/graphrag). Local search builds a
   context window, not a document ranking: entity selection via embedding
   similarity over entity-description vectors (`map_query_to_entities`, k *
   oversample), fan-out to relationships / community reports / claims /
   source text chunks, then packing into `max_context_tokens` split by
   proportions (conversation history first, then community reports,
   entities+relationships, source text units). Deterministic section order
   and per-section token slices.
2. LightRAG (github.com/HKUDS/LightRAG). Graph RAG with local / global /
   hybrid query modes and incremental inserts. Same mechanism class as
   GraphRAG, lighter index.
3. LlamaIndex (github.com/run-llama/llama_index). Retriever -> nodes with
   metadata -> response synthesizer (`CompactAndRefine`); `response.source_nodes`
   attribution; node metadata carries citation surface (source_url, hashes).
   Security practice (maruakshay/mii-ai-security SKILL.md): server-side
   citation verification, resolve every cited node id against the retrieved
   set, reject citations outside it; refusal when grounding fails; metadata
   survival audit across pipeline stages.
4. DSPy (github.com/stanfordnlp/dspy). Compiled programs: signatures +
   teleprompter optimization over labeled examples. The "compile" philosophy
   matches the lane name, but the mechanism is an LLM-call optimization loop.
5. RAGFlow / Verba: document-pipeline RAG apps. Evaluated and dropped early:
   not graph-native, app-level, nothing to harvest for a graph compiler.

## LICENSES

GraphRAG: MIT. LightRAG: MIT. LlamaIndex: MIT. DSPy: MIT. All
license-compatible; licensing is not the kill reason for any of them.

## TESTED

- Read GraphRAG's local-search context-building mechanism end to end from
  the code-faithful spec (entity extraction, oversample behavior, budget
  split `community_tokens = max * community_prop`, section packing order:
  history -> reports -> entities -> relationships -> sources). Did not
  pip-install: it needs its own index pipeline (entity/relationship
  extraction passes, Leiden communities, embeddings parquet) plus an LLM at
  query time.
- Read LlamaIndex's attribution surface (`source_nodes`, node metadata as
  citation carrier) and the server-side citation-verification pattern;
  reproduced the check logic in the lane spike (Section: T4/B2).
- Read DSPy's compile loop; judged against the determinism contract.
- Ran zero external code: the mechanisms that matter are algorithms and
  invariants, all portable in ~100 lines. Installing GraphRAG or LlamaIndex
  to re-verify documented behavior would add weight without new evidence.

## WINNER

No external dependency is adopted. The winner is a mechanism pair ADAPTED
into the compiler design:

- From GraphRAG: proportioned budget packing with deterministic section
  priority order (target reserved, then evidence, relationships, related
  objects, source excerpts), each section under its own byte slice, cuts
  recorded not silent. PING's planes replace GraphRAG's communities/reports
  (we already have the object graph; we do not need Leiden clustering or
  generated community reports).
- From LlamaIndex's security practice: server-side citation verification
  (every claim's cited ids must resolve inside the compiled packet; misses
  are `citation_leak` and the claim is dropped), plus the metadata-survival
  principle (epistemic class must survive selection intact: B3).

## ADOPT-ADAPT-REJECT

- GraphRAG: REJECT as dependency, ADAPT the budget-proportion packing.
  Kill reasons: requires surrendering canonical authority to its index
  (entities/relationships/communities parquet + embeddings become a second
  truth store beside the PING object graph); LLM at query time breaks the
  deterministic-first contract; no tenant/visibility/provenance model;
  weight dwarfs value (indexing pipeline for what PING already has
  structured).
- LightRAG: REJECT (same class as GraphRAG; still a second graph store;
  incremental-insert advantage is irrelevant: PING's journal already is the
  incremental store).
- LlamaIndex: REJECT as dependency, ADAPT citation verification + metadata
  survival. Kill reasons: chunk/node retrieval over embeddings duplicates
  lane F's mandate (object search owns retrieval); PING answers from typed
  objects and relationships, not text chunks; adopting the framework would
  import a vector-store-shaped worldview into a graph authority.
- DSPy: REJECT. Kill reasons: the compile loop needs labeled training data
  and repeated LLM calls; our compiler is a pure deterministic function
  with a hash-verifiable output. Optimizing prompts is not our problem;
  selecting evidence deterministically is.
- RAGFlow / Verba: REJECT, no harvestable mechanism for this lane.

## CODE WE DO NOT NEED TO WRITE

Embedding retriever, community detection (Leiden), map-reduce community
summarization, chunking/node parsers, vector stores, prompt-optimization
loops, a second provenance model. PING's graph + projection + evidence +
grants already are the substrate; the compiler is ~300 lines of pure
selection logic plus tests.

## MINIMAL PING WRAPPER

None. There is no dependency to wrap. The adapted mechanisms are expressed
as: `BudgetPolicy.proportions` + section priority order (Section 3.4 of the
design doc) and claim-binding rule B2 + the `verifyClaimBindings` function
(in the spike). If a future lane wants embedding re-rank, it plugs into
Stage 3.5 behind the deterministic base; the compiler does not depend on it.

## FAILURE TEST

In the lane spike (`~/workspace/ping-build-program/lane-g/spike/`):
budget-overflow cuts in priority order with the ledger proving the target
survived; citation-leak rejection (claim citing a hidden object's id is
dropped); dangling cross-tenant edge dropped with zero bytes leaked;
prompt-injection fixture text stays data (boundary-marked, provenance-labeled);
malicious description cannot upgrade `website_statement` to fact;
determinism: two compilations byte-identical, input-order independent.

## PRODUCT CAPABILITY UNLOCKED

Any reasoner (concierge, LLM composer, lane I's MCP tools) gets a bounded,
visibility-safe, budget-ledgered, claim-bound packet instead of raw canonical
state. This is where the graph starts paying rent: the same packet feeds the
7-question concierge today and an LLM composer tomorrow with no re-plumbing,
and every answer it produces is traceable claim-by-claim to evidence.

## BYTES-DEPENDENCY COST

Zero new dependencies. Design doc ~30KB, spike ~40KB, all dependency-free
Node (no npm install). No Pig repo writes. No new authority, database, or
framework. The compiler is a pure function: replaceable, versioned
(ctx-compiler@1), and removable without touching the core loop.
