# LANE G — Ask FYD Context Compiler

Status: PROVEN

## Ledger
- RESEARCHED: 2026-09-23 — charter (OWNERSHIP.md); fyd-factory MISSION-STATE.md; LANE-ASK-SUMMARY.md (factory's concierge).
- RESEARCHED: 2026-09-23 — Pig repo read-only trace: src/fyd/ask/{answer,concierge,context-builder,visitor-answer,capabilities}.ts, src/lib/ping/ask-composer.ts, ask-pipeline (branch fyd-factory @ e48ef710; repo still there 2026-09-23 ~20:00 MDT).
- HARVESTED: 2026-09-23 — GraphRAG (proportioned budget packing -> ADAPT), LlamaIndex security practice (server-side citation verification + metadata survival -> ADAPT), LightRAG/DSPy/RAGFlow/Verba -> REJECT. Full report: HARVEST-REPORT.md. Zero dependencies adopted.
- IMPLEMENTED: 2026-09-23 — spike/compiler.js (ctx-compiler@1, pure Node, zero deps) + spike/run-tests.js (15 tests); spike/context-compiler.mjs + tests.mjs (first iteration, 11 tests vs real factory fixture); port/context-compiler.ts (untested TS sketch, superseded, has id-leaking ledger regression — NOT the port source).
- TESTED: 2026-09-23 — 5 failures found, each diagnosed to root cause, all fixed, none hidden (TEST-RESULTS.md): relevance floor unreachable -> question-signal gate; epistemic mapping too coarse -> provenance-kind-aware classes; excerpt boundary field; count-cap cuts uncounted -> selectionCut/budgetCut ledger; determinism test bug (b.packetId vs b.packet.packetId).
- FIXED: 2026-09-23 — design doc section 3.3 amended to the proven gate semantics (this pass); INTEGRATION-NOTE.md finding 2 corrected (mjs suite DOES run: 11/11 vs real fixture; still superseded by compiler.js on the ledger-privacy point).
- PROVEN: 2026-09-23 ~20:05 MDT — run-tests.js 15/15 green; tests.mjs 11/11 green (real factory fixture clearwater-plumbing-demo.json); proof demo: packet 02982cfc... 7436/24000 bytes, emergency service ranked first (0.568536, keyword_overlap reason), claim bindings verify, visitor cannot see note-internal, deterministic packetId.

## Position (unchanged)
The factory owns the Ask FYD answer machinery (src/fyd/ask/answer.ts + concierge.ts, 7 canonical questions, SUPPORTED/DERIVED/INFERRED/UNKNOWN). Lane G owns the CONTEXT COMPILER layer: question + viewer + target object -> visibility-bounded, budget-ledgered, claim-bound ContextPacket that any reasoner (concierge, LLM, MCP consumer) uses INSTEAD of raw canonical state. The concierge becomes a consumer of the packet. No duplicate.

## Integration surface (proposals only, no repo writes by this lane)
- INTEGRATION-NOTE.md: seams for lanes F (Stage 3.5 retrieval insertion), I (claim-binding@1 / ctx-compiler@1 version agreement, contentBoundary forwarding), J (compile run-record shape), N (evidence id scheme; bindings extend lineage ANSWER -> PACKET -> EVIDENCE).
- INTEGRATION-REQUEST-f.md: lane F's retrieval contract offer (visibility-filtered, deterministic) — acknowledged; G adopts F's Tier 1 term for the keyword_overlap slot if it proves better on real corpora.
- Finding: untracked src/fyd/ask/context-compiler.ts on the Pig (sha256 aab39942...) is byte-identical to this lane's superseded port/ sketch and predates the five verified fixes incl. the counts-only ledger. Do NOT wire it as-is; port from spike/compiler.js.

## NEXT
1. Coordinator decision: accept spike/compiler.js semantics as the port source of truth.
2. On acceptance: file version-string agreement to lane I; retrieval-contract shape to lane F; evidence id scheme to lane N; run-record shape to lane J.
3. Owner-plane end-to-end stays untestable until the authenticated viewer lane exists; ship visitor-only first.
4. No further lane-G build until the port decision lands; the spike is the frozen reference.
