# LANE C — TASK 1: MODEL-PROVIDER SEAM DEEP DIVE (read-only notes)

Date: 2026-09-22. Repo /home/nolan/ping @ cc6856c3b (refactor/runtime-authority-convergence). All worktrees checked.

## Verdict: (D) NEVER IMPLEMENTED — with live seam existing elsewhere (E-adjacent)

The missing module `gateway/infrastructure_adapter_interface.js` NEVER existed:
- `git log --all --oneline -- gateway/infrastructure_adapter_interface.js` → empty (no commit ever touched that path)
- `git log -S"InfrastructureAdapterInterface" --all --oneline` → only aaec592bd / d596aa596
  ("feat(kernel): freeze constitutional replay kernel", Jul 5 2026) — i.e. the very commits that ADDED
  `gateway/adapters/ollama_adapter.js` requiring it. The file was born broken.
- File does not exist in ANY of the 14 worktrees (loop over all, zero hits).
- Sibling missing module: `gateway/serializer_authority.js` (required on line 3 of the same file) also never existed.
- Live proof: `node -e "require('./gateway/adapters/ollama_adapter.js')"` → `LOAD-FAILS: MODULE_NOT_FOUND`
  (fails on the line-2 require, before any module code executes).

## The broken module
`gateway/adapters/ollama_adapter.js` — "Phase 11.4 — InferenceEngine Implementation",
`class OllamaAdapter extends InfrastructureAdapterInterface`, `this._capability = 'InferenceEngine'`.
Two of its three top-level requires cannot resolve (`../infrastructure_adapter_interface`,
`../serializer_authority`); the third (`../../ping-runtime/authorities/constitutional_time_authority.js`) exists.
NOBODY requires this module except as a string in the dormant map below.

## InferenceEngine capability registration — dormant
`gateway/technology_authority.js` lines 50-59: `_capabilityImplementations` map,
`InferenceEngine → {ollama,openai,claude,vllm}` with adapter path strings
`'./adapters/ollama_adapter'` etc. (relative to gateway/). No code in the file ever `require()`s those
paths — it is inert metadata. Only consumer chain: `gateway/adapter_compiler_v2.js:1` requires
TechnologyAuthority, and `gateway/bootstrapping_validation.js` requires adapter_compiler_v2 —
but `bootstrapping_validation.js` itself has ZERO consumers. Dead-end registration chain.
Also note: only `gateway/adapters/ollama_adapter.js` exists among the mapped paths; the other
7 adapter paths (openai/claude/vllm/postgresql/filesystem/mongodb/qdrant/...) do not exist either.

## Who constructs OllamaAdapter — the OTHER one
A separate class `OllamaAdapter` lives at `gateway/ollama_adapter.js` (Phase 4.1, no interface
dependency, requires canonical_authority, runtime_io_authority, runtime_failure_authority).
Only constructor call site: `test/ollama_replay.test.js:31` (`new OllamaAdapter()`).
Not constructed by any runtime file.

## The actual LIVE model/provider seam
`ping-runtime/ai/inference_adapter.js` — header: "Inference Adapter - Single Constitutional Authority...
Constitutional Law: Exactly one inference authority may exist... All inference must flow through this
adapter... Business Logic → Inference Adapter → Provider Adapter → Provider".
- Provider selection via `process.env.INFERENCE_PROVIDER` (ollama|openai), lazily requires
  `./ollama_provider_adapter` / `./openai_provider_adapter` in constructor.
- Exports `getInferenceAdapter()` (line 177; module.exports line 184).
- Live consumers: `gateway/constitutional_runtime.js:26`, `gateway/conversation_memory.js:12`,
  `gateway/knowledge_retrieval.js:12` all `require('../ping-runtime/ai/inference_adapter')`.
  (16 files mention inference_adapter/InferenceAdapter incl. document_ingestion, embedding_batcher,
  memory_embedding_authority, knowledge_graph, verify/12_end_to_end.)
- Sibling adapters (from M3 migration cccd7deda): `ping-runtime/ai/ollama_provider_adapter.js`,
  `openai_provider_adapter.js`, `huggingface_adapter.js`, `ollama_provider.js`, `ai_runtime.js`,
  `inference_service.js`.

## Evidence contradicting this conclusion
- If some worktree had the interface, classification would flip to (F); all 14 worktrees were looped, none has it.
- If a `.ts` or differently-named module exported InfrastructureAdapterInterface, (B)/(C) would apply;
  `git log -S` on the class NAME covers renames by content across all history — only the two born-broken commits matched.
- Counter-check still open: docs/omega98_infrastructure_adapters_design.md describes the design intent; read it for
  context but it does not change the code-state classification.
