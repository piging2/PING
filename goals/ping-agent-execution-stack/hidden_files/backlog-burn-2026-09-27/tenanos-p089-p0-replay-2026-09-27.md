# TenantOS P-20260923-089 P0 fix: independent replay PASS — 2026-09-27 ~15:20 MDT

Subagent: backlog-burn (parent: main agent). Read-only replay; nothing
changed.

## What was replayed

Swarm-05's P0 fix: "re-emission must never demote knowledge-node
lifecycle state." The `addNode()` ON CONFLICT clause in
`ping-runtime/knowledge/knowledge_graph.js` refreshed `status` on
conflict, so a re-emitted candidate could regress an approved/rejected
node back to candidate. The fix removes `status` (and only `status`)
from the UPDATE SET; status is owned exclusively by the promotion path
(KnowledgePromoter via updateNodeBySourceEvent).

## Replay results (this VM, node --test, MODULE_PATH placement)

- `swarm-05/scratch/patched/knowledge_graph.js` → 6/6 PASS.
- `swarm-05/scratch/pristine/knowledge_graph.js` → 3 pass / 3 fail;
  the 3 failures are exactly the demotion tests (proving capture).
- `diff pristine patched` → exactly the filed one-line change
  (COLLISION-P-20260923-089-swarm05-P0FIX-UNREGISTERED.diff).

Swarm-05's claim replays byte-for-byte. The fix is correct and the
regression test captures the defect.

## What remains UNVERIFIABLE (Pig transport down)

Whether the fix is APPLIED to the live gateway tree
(`/home/nolan/ping` on the Pig). The wave ledger records "089
integrated (~02:58 UTC)" with a merge to `tenanos-wave/integration`,
but no such branch exists in this workspace checkout, and the live
tree is unreachable (TAILSCALE_UNREACHABLE since ~11:11 MDT). The fix
is proven correct; its deployment is UNKNOWN, not confirmed.

## Constraints observed

Read-only: no files modified, no commit, no network beyond localhost,
no Pig attempt, no :3100/:3200, no HPP contact.
