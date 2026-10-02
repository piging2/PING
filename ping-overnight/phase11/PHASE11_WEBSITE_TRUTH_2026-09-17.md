# Phase 11: Website Truth Update, 2026-09-17

Status: COMPLETE. Receipt-driven only. No commits, no pushes, no publishes, no deploys. No em dashes in this report.

Method: read the Phase 3-6, 8, 9, 10 evidence reports and the current truth matrix
(workspace/ping-overnight/website/TRUTH_MATRIX.md, dated 2026-09-16/17). Updated claim
classifications and evidence ONLY where new runtime receipts change them. The canonical
website repo (/home/nolan/projects/ping, main @ f6386ee) lives on the Pig and was not
reachable from this VM, so this report specifies the exact claim changes and homepage
mirror edits for the parent to apply. The local matrix mirror was left byte-identical
on purpose; editing it without the canonical repo would create drift.

Phase 7 note: the knowledge compounding loop re-run is a sibling agent running
concurrently. No Phase 7 report exists on disk at
/home/hatch/workspace/ping-overnight/phase7/ as of this writing. None of its results
are claimed below. Claim 4's remaining proof is explicitly marked pending Phase 7.

## Claims CHANGED

### Claim 1, "Events are canonical. Knowledge derives from events." : PROVEN (unchanged label, strengthened evidence, two residuals resolved)

New receipts from Phases 3 and 9:

1. Per-principal namespace ACL, VERIFIED 12/12 live (Phase 3, phases3-6 report).
   The old residual "authorizeNamespace validates namespace syntax only,
   per-principal namespace ACLs remain future work" is RESOLVED. CanonicalizationService
   now enforces an explicit namespaceEntitlements map: api:muse and api:muse-level-2
   are entitled to core::owner; review-authority, customer-authority, project-authority,
   email-connector, sms-connector, google-connector, github-connector are entitled to
   tenant::hpp; unknown sources with explicit namespace claims fail closed.
   The /ingest principal-spoofing defect was reproduced (muse-level-2 claimed
   source=review-authority and wrote to tenant::hpp, event
   0d0579d1f0c582582c6a861400a32ea2e6a0bddc070863adc89484bc76ff0a7b) and then fixed
   (ingest.js binds authorization to the authenticated principal; body.source is
   provenance only). Post-fix: spoof denied 400, legit core::owner ingest 201 (event
   9926b75eae4df2e22eb62cfbab1e918c8d418c33d0cc8cad0ed14df25ec7f26), explicit
   tenant::hpp from muse-level-2 denied 400. Matrix receipts:
   d12284b6afca2488346474a7e2bffbc8191c5e23d445bfc46521e13b6513a7dc,
   2a56b0ec28f83a1f78d78582cc38ed5bb00f9b24276ee1051806f85da1b9b916,
   ecfab03d0b9d204f10e39446be1143af02f1656ff172a74915ef58f4928b5b87.
   Claim mapping note: this receipt belongs to claim 1 (event namespace authority),
   not claim 9 (CapabilityAuthority governs executable capabilities, not namespace
   resolution; no second authorization authority was created).

2. Append-only TRUNCATE protection, VERIFIED live (Phase 9). The old residual
   "trigger does not cover TRUNCATE" is RESOLVED. trigger-append-only-v2.sql is
   live on Oracle: BEFORE TRUNCATE statement-level trigger plus the row-level
   UPDATE/DELETE trigger on ping_events. Certification matrix: UPDATE denied,
   DELETE denied, TRUNCATE denied (probe table reproducing production config,
   rolled-back transaction), INSERT works, ON CONFLICT idempotency works, live
   ping_events row count 1380 before and after, gateway healthy.

Residual that remains on claim 1: the invariant must still be re-applied after any
from-scratch database rebuild. Phase 9 adds exact runbook placement instructions
(post-boot step after gateway healthy, because the gateway's own bootstrap creates
ping_events; schema.sql is stale and never defines it). The placement is a proposal
pending the commit allowlist decision; it is not wired yet.

### Claim 4, "playbooks, automation, institutional memory" : BUILT_NOT_LIVE (unchanged label, all three wiring gaps closed, required proof narrowed)

New receipts from Phases 4, 5, 6 (all proven through the ordinary authenticated API,
no harness):

1. Gap 1 (knowledge adapter drops IDs) CLOSED. POST /knowledge/nodes now preserves
   nodeId, sourceEventId, correlationId. Receipt: source event
   e96f5306c6e5a3f2990eb0b1d83d3e07a9669d24c2de617bea2c37c911f88c4a, node
   p4-test-node-003 persisted as
   p4-test-node-003 | e96f5306... | p4-2026-09-17-c | candidate. Orphan 4917265ee67e678c
   untouched.

2. Gap 2 (SNIPPET_APPROVED dispatch) CLOSED. SNIPPET_APPROVED
   b6816f11dcb47a178edbb63eb58b83e52ec6f49493d0f2e9e3e5cee7170fa2f6 ->
   EventToMissionBridge -> mission 6e8c020c8acbb9f9 (KNOWLEDGE_PROMOTE, deterministic
   ID predicted exactly) -> completed via knowledge-promotion worker. Node
   p5-test-node-001: status approved, confidence 1.0. Production revision
   194a2b85bde957ed never referenced.

3. Gap 3 (REPLAY_VERIFY dispatch) CLOSED. Direct REPLAY_VERIFY
   7a47ce6e3935897a9fd9da8d7e47f1cf46dc4184ef48b9b1e5e1c58d1b402384 ->
   mission af3758af637bd983 (predicted deterministic ID) -> completed.
   REPLAY_COMPLETED eaeb82ef8c4106aab3ee5a5603d4ef89e5ccc33bfdd8c3e455508e770be2cbbd:
   verified=true, reason=kernel_verified, upstreamEventId=7a47ce6e...; WITNESS_CREATED
   and LINEAGE_CREATED followed. Idempotent: re-emit returned the same event ID,
   mission count stayed 1, REPLAY_COMPLETED count stayed 1, no duplicate execution.

Why the label stays BUILT_NOT_LIVE and does not promote to PROVEN: the claim's
required proof had two halves ("close the three wiring gaps so the ordinary runtime
can reach the promoter; then one production playbook approved by a real human gate").
The first half is now done. The second half is not: no production playbook has been
approved by a real human gate (revision 194a2b85bde957ed still PENDING_HUMAN), and
the Phase 7 compounding loop re-run is pending (report not on disk; its results are
not claimed here). New required proof for claim 4: one production playbook approved
by a real human gate, plus the Phase 7 re-run evidence.

Honesty note to carry into the matrix: pre-existing drift observed, not introduced
by the fixes. Live knowledge_promoter approves at confidence 1.0 / rejects at 0.2
and emits no KNOWLEDGE_PROMOTED event; the branch version reads payload.confidence
and emits KNOWLEDGE_PROMOTED. Canonical downstream evidence in production is the
mission completion record plus the node's promoted status.

### Claim 10, "Agents run missions under that authority" : EXPERIMENTAL (unchanged label, stronger receipt, honest limits updated)

New receipt from Phase 8: one full isolated Hermes mission end to end through the
real production classes. Mission 685ec6160f9d3862 (EXTERIOR_TASK) completed,
assigned_to exterior-agent, retries 0. WorkOrder 875368d610b5a395
(sha256("workorder:task-uppercase-002")[:16], independently recomputed, matches).
Hermes v0.21.2, exit 0, one-shot, result envelope sha256
3f76edca9e4aa93661715739881398cb5ffa15081a884ed252a358f6a4af6ac8, output
"THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG", verifyResultEnvelope valid,
evidence 53283c302ef58cd4. PING emitted all seven canonical events itself:
MISSION_CREATED 2bce47d7..., MISSION_ASSIGNED 5efed404..., MISSION_STARTED
3284dba3..., TASK_STARTED e97152a2..., TASK_COMPLETED 5ba10fc3..., EVIDENCE_RECORDED
ffbd6166..., MISSION_COMPLETED c2ebc23c... Exterior-agent-emitted events: 0.
18/18 adapter fail-closed tests re-passed on the Pig before the run.

Why the label stays EXPERIMENTAL: production wiring is READY-PENDING-RESTART (one
map entry, one worker file, one registration entry, one gateway restart; the live
gateway was not touched and not restarted; the sibling agent owns restarts), and
the transport caveat is unresolved: hermes.exe is Windows/Pig-native, the Oracle
gateway runs Linux ARM64 and cannot spawn it. Routing a live Oracle-gateway mission
to a Pig-hosted exterior agent requires a remote-invocation transport decision
(direction, credentials, trust boundary) that was not built. Fleet-level replay of
exterior missions is still unproven. Required proof unchanged: repeatable
mission -> adapter -> agent -> evidence routing in production; a fleet beyond one
execution.

### Claim 14, "Multi-runtime: one authority, many runtimes" : BUILT_NOT_LIVE -> EXPERIMENTAL (demotion)

Receipt-driven reason: Phase 8 proved the exterior leg only Pig-hosted, and
documented that no transport exists between the live Oracle gateway (Linux ARM64)
and the Pig-hosted agent (Windows hermes.exe). Combined with production exterior
wiring still pending restart and all multi-runtime evidence being one-shot
captured proofs (44/44 Python, two Hermes runs) rather than recurring or fleet
runs, "many runtimes" as a standing convergence property is currently a
single-integration proof, not an evidenced-running system. EXPERIMENTAL is the
honest label until the transport decision is resolved. This follows the parent's
explicit instruction not to overclaim multi-runtime convergence.

Homepage mirror edits needed on the Pig: /technology title "Multi-runtime
convergence" and the convergence caption currently at "Built" must be relabeled
to Experimental, with the transport-caveat receipt ("Pig/Windows hermes.exe vs
Oracle/Linux ARM64 gateway; remote-invocation transport undecided; production
wiring ready-pending-restart") shown instead of the Built framing.

### Claim 17, "Oracle execution location" : EXPERIMENTAL (unchanged label, restore evidence added)

New receipt from Phase 10: isolated restore VERIFIED 2026-09-17. Postgres restore
to container ping-restore-test-pg (port 127.0.0.1:15433, isolated volume): 31
tables, ping_events 1153 rows, ping_missions 221 rows, matching the dump artifact
payload exactly. Qdrant restore to qdrant-restore-test (port 127.0.0.1:16333):
collection knowledge, status green, 13 points, 768-dim cosine, segments 2, matching
the snapshot point count. Teardown clean: only ping-gateway, ping-postgres,
ping-qdrant and the two production volumes remain.

Manifest discrepancy flag (recorded, not hidden): RESTORE-2026-09-16.md states
1158/222 at backup time, but the dump artifact payload holds 1153/221 (counted
directly on Oracle, twice). The restored DB matches the artifact exactly, so the
restore is faithful; the guide's numbers raced live writes. Live counts at test
time: ping_events 1380, ping_missions 264.

Why the label stays EXPERIMENTAL and disaster recovery stays PARTIAL: backups are
still same-host only, no off-host copy, no recurring automation (backup-cron.sh
exists but is DISABLED BY DEFAULT behind a triple enablement gate; it is paperwork,
not a live schedule). Host loss remains the uncovered scenario, pending Nolan's
decisions on off-host copies and automation.

## Claims NOT changed and why

- Claim 2 (continuity), 3 (record-before-intelligence loop), 5 (TenantOS), 6
  (site-as-tenant), 7 (business graph), 8 (generic knowledge graph), 12 (evidence,
  witness, lineage), 13 (deterministic replay), 15 (JS workers), 16 (Python
  workers), 18 (Google Cloud), 20 (gateway health), 21 (PING Social), 22 (blog),
  23 (newsletter): no new P0 receipts touch them.
- Claim 9 (capability authority): unchanged. The Phase 3 namespace ACL belongs to
  claim 1's event-namespace authority, not to CapabilityAuthority; no second
  authorization authority was created. Claim 9's required proof (one captured grant
  plus one recorded denial from live traffic) is still open.
- Claim 11 (Codex/Hermes site card): unchanged. Still UNPROVEN as worded; the
  standing correction (remove or relabel) still applies.
- Claim 12: Phase 6 emitted WITNESS_CREATED and LINEAGE_CREATED, but no captured
  IDs were recorded, so the required proof (one captured witness record: event
  IDs, who, what authority, timestamp) is still open.
- Claim 13: Phase 6's REPLAY_COMPLETED verified=true came from the mission-driven
  ReplayWorker path, not from the kernel replay machinery the claim describes;
  the required proof (recorded replay run against the kernel machinery) is still
  open. No promotion.
- Claim 16: no new Python receipts this round. Unchanged.
- Claim 19 (missions): unchanged (stays PROVEN). The two new live missions
  (6e8c020c8acbb9f9 KNOWLEDGE_PROMOTE, af3758af637bd983 REPLAY_VERIFY, both
  completed through ordinary wiring) are additive supporting evidence only.

## Phone-width visual QA: NOT PERFORMED (blocked, three concrete reasons)

1. The site repo /home/nolan/projects/ping does not exist on this VM. It lives on
   the Pig/WSL; there is no local copy to serve.
2. SSH to the Pig (100.79.154.43 via hatch-egress-proxy:3130, BatchMode) was reset
   by the proxy on two attempts: "kex_exchange_identification: read: Connection
   reset by peer" / "Connection reset by 198.19.0.1 port 3128". Not a transient
   retry case; the path is blocked from this VM.
3. No deployed public URL for the PING site was found in the overnight artifacts,
   and as a subagent no headed browser is available in any case.

What was checked instead: none. There is no honest substitute for rendering the
site at phone width, so no visual QA result is claimed. The open item carries
forward: a browser-capable parent/root with Pig access should serve the site from
/home/nolan/projects/ping (dev server ping-dev tmux on :3000, or a production
build) and check the homepage, /technology, /prove, and the STATUS_STRIP sections
at a phone viewport width, then record defects. This item has been open since the
2026-09-16 website pass.

## Constraints honored

No commits, no pushes, no publishes, no deploys, no live gateway edits, no
restarts, no credential values handled. The local truth-matrix mirror was left
untouched to preserve byte-identity with the canonical site repo. All identifiers
above are copied character-for-character from the Phase 3-6, 8, 9, 10 reports.
