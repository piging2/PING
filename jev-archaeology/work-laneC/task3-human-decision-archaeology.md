# LANE C — TASK 3: HUMAN DECISION / APPROVAL ARCHAEOLOGY (read-only notes)

Date: 2026-09-22. Repo /home/nolan/ping @ cc6856c3b. All worktrees + full git history searched.

## Verdict: DISTRIBUTED fragments, no unified HumanDecision model — and no HumanDecision EVER existed

`git log -S"HumanDecision" --all` → EMPTY. No HumanDecision class/object ever existed in any history.
No `human_required`, `approval_required`, "human gate", `human_gate` strings anywhere (code, yaml, json).

## Fragment 1 — gateway/approval_authority.js (Phase 20, patch/commit pipeline)
- Pipeline position: Patch → Replay → Tests → Witness Verification → ApprovalAuthority → CommitAuthority
  (header comment lines 1-24).
- Tables: `approvals` (approval_id, patch_id, approval_policy, approval_status default 'pending',
  approval_conditions JSONB, witness_hash, approved_by, approved_at) and `approval_policies`
  (policy_id, policy_name, policy_type, policy_rules JSONB, enabled).
- Advertised policies: automatic, manual, constitutional, protected branch, production (header comment).
- `requestApproval()` called from: `gateway/node_registry.js:321`, `gateway/mission_execution_graph.js:462`,
  `gateway/mission_execution_authority.js:349-350`.
- `_determineApprovalPolicy()` is HARDCODED to return the automatic policy ("Default to automatic policy
  for now // In production, determine based on branch, repository, etc.") — it never queries the
  `approval_policies` table. Manual/constitutional policies are unreachable: nothing can require human
  approval through this path today; every request resolves 'approved' with `approved_by='system'`.
- `approveManually(approvalId, approvedBy)` (line ~215): grants approval with a FREE-FORM approver string —
  no identity/role check in this file; sets `pending_manual`→'approved'. ZERO callers anywhere in the
  codebase; no HTTP/API route touches approvals (route grep empty). Only this file writes the approvals table.
- `reject(approvalId, reason)` similar. Recording exists (table + witness via witnessAuthority), granting is
  a dead stub.

## Fragment 2 — ping-runtime/knowledge/knowledge_promoter.js (Phase F, knowledge promotion)
- "Turns explicit human approval into knowledge. Raw capture is observation evidence (confidence < 1,
  status candidate); only a human signal promotes it to knowledge (confidence 1.0, status approved)."
- Consumes events SNIPPET_APPROVED / SNIPPET_REJECTED / AI_RESPONSE_ACCEPTED / AI_RESPONSE_REJECTED
  (authority_owner 'KnowledgePromoter' per gateway/generated/event_generator.js:322-328), updates node
  status approved (1.0) or rejected (0.2).
- `ping-runtime/knowledge/knowledge_graph.js:20`: "The ONLY authorized recompute is human approval
  (KnowledgePromoter:...)".
- BUT: no production code EMITS those events — only tests (`gateway/test_knowledge_search.js:360+`) and
  `evals/constitutional-runtime/EVAL-008_knowledge_promotion_approval.js`. The human entry point
  (UI/API/CLI that turns a human's yes/no into SNIPPET_APPROVED) does not exist. Consumer registered in
  `ping-runtime/workers/canonical_workers.js:676-686`.

## Fragment 3 — misleading names (NOT human decisions)
- `MergeDecisionArtifact` (ping-runtime/orchestration/execution/artifact_authorities.js:221): machine
  merge-gate artifact (workerId 'merge_gate', canCommit from gate results) — no human semantics.
- `ProposalArtifact`, `ConsensusArtifact`, `ConsensusEngine`, `ProposalPipeline`, `ProposalAdmission`,
  `ProposalObject`: no human/manual/operator mentions (grep clean).

## Map: who can require / for what / where recorded / who can grant
| Question | Answer (evidence) |
|---|---|
| Who can require human approval? | NOBODY in practice: `_determineApprovalPolicy` hardcoded automatic (approval_authority.js). Policy table exists but is never read. |
| For what? | Patch→commit pipeline (node_registry, mission_execution_graph, mission_execution_authority) and knowledge promotion (knowledge_promoter) — both designed for it, neither wired to a human. |
| Where is it recorded? | `approvals` table (+ witness via witnessAuthority) for pipeline; knowledge graph node status/confidence for promotion. |
| Who can grant it? | `approveManually(approvalId, approvedBy)` — free-form string, zero callers, no API route; and the SNIPPET_APPROVED event stream — no producer. Both grant paths are uncallable dead ends. |

## Classification
Human-decision semantics are DISTRIBUTED across two genuine fragments (approval pipeline, knowledge
promotion) plus misleadingly-named machine artifacts — i.e. **convergence is needed, not invention**,
but with the caveat that the fragments are mutually unreachable stubs: policy selection is hardcoded,
grant functions have no callers, event producers don't exist. A converged model would need to actually
wire a human entry point, not just unify the schemas.

## Evidence contradicting this conclusion
- `approveManually` could be invoked dynamically (e.g. via eval or a route built from config); the
  route grep covered app.post/get/put + router patterns — no matches. Dynamic `require` + method call
  from outside the repo (ops scripts) can't be ruled out, but nothing in-repo does it.
- `git log -S` on "HumanDecision" covers content renames; a differently-cased variant (humandecision)
  would not match — the broader term greps (approval_required etc.) came up empty, reducing this risk.
