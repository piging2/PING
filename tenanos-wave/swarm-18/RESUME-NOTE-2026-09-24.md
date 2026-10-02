# SWARM-18 resume note — 2026-09-24 ~01:47 UTC

Previous worker lost its runtime handle in the ~01:28 UTC daemon restart.
On-disk checkpoint (SEAM-REPORT.md + diffs/S18-01..S18-14) survived intact.

## What the checkpoint had established
- Full seam report across 11 artifact boundaries (Mission, Run, Attempt,
  WorkOrder, ContextPack, CapabilityDecision, ToolIntent, ToolResult,
  Evidence, MemoryCandidate, Verification): 6 BROKEN P0 seams, P1 list,
  decision-needed list, coordinator questions.
- 14 draft diffs in swarm-18/diffs/ (S18-01..S18-14), none staged as wave
  proposals. Mission scope for this resume: the memory-proposal surface
  (S18-13) only; S18-01..S18-12/S18-14 are evidence for other swarms'
  areas (mission engine, tool plane, observability) — not claimed here.

## What this resume did
1. Verified S18-13 schema: parses as Draft-07; structural checks confirm
   proposal-surface-only (no `status`, no promotion logic — swarm-05 owns
   promotion per their CONVERGED-PIPELINE.md MEMORY CANDIDATE stage).
2. Functional validation (python jsonschema 4.10.3): 1 positive accepted,
   11 negatives rejected (missing tenant/actor/confidence, 9 KiB content,
   unknown kind, wrong schema_version, bad candidate_id/tenant format,
   confidence>1, extra property, empty content).
3. Staged wave proposal P-20260923-089:
   - diff: ~/workspace/tenanos-wave/diffs/P-20260923-089.diff
     (target src/tenanos/memory/MemoryCandidate.schema.json; git apply --check PASS)
   - STATE.json entry appended (status=proposed, swarm=18, decided_by=swarm-18,
     oracle_touch=false, file-scoped claimed_areas). check-overlap.py: clean.
4. Survived a 4-writer filename race on P-20260923-089.diff (01:38–01:47Z):
   swarm-16 verification-engine diff (content LOST before preservation),
   unattributed tenant-kit diff (writer self-resolved to P-20260923-092,
   swarm-01, registered), swarm-05 P0-FIX lifecycle diff (preserved at
   diffs/COLLISION-P-20260923-089-swarm05-P0FIX-UNREGISTERED.diff, sha256
   2ef4c06b0f346092fffbfda20756e748e1b17bbdea550ee97cf29647620662db;
   no STATE entry as of 01:47Z). Registry entry is the authoritative 089
   claim; disk re-synced to it. Full log in the STATE entry notes.
   PROCESS FINDING: "check diffs/ then pick next free 09X" is racy under
   concurrent workers — recommend STATE-first atomic ID claim.

## What's next (for coordinator / next worker)
- Coordinator approval of P-20260923-089, writer assignment, Gates 2–3
  (ts-jest matrix under src/tenanos/jest.config.cjs + ajv in-repo).
- Reconcile the swarm-05 P0-FIX orphan (COLLISION file) — it needs a real
  proposal ID + STATE entry; it is the wave's memory P0.
- swarm-16's verification-engine diff needs re-staging (content was lost
  in the race); its worker should re-file under a fresh ID.
- Consider a wave-wide rule: register the proposal ID in STATE.json BEFORE
  writing diffs/<id>.diff.
