# MEM-A — Memory Loop Proof + Memory Attack Suite — CHECKPOINT

Session: a5330d77-0a18-4ce4-83e4-7b971d8cca30 | Started: 2026-09-23 20:04 MDT
Quota: 150 logical missions. NIGHT SHIFT in force (Nolan asleep; escalate only true human boundaries). NO STOPPING CONDITIONS. YOLO MODE.

## Objective
1. LOOP PROOF: WRITE -> STORE -> RETRIEVE -> RANK -> INJECT -> USE -> VERIFY VALUE -> INVALIDATE/SUPERSEDE/FORGET against the real memory system (~/MEMORY.md, ~/memory/*.md, muse.memory_search, muse.memory_get). A stage is PROVEN only if its OUTPUT reaches the next stage's INPUT.
2. ATTACK SUITE: stale, contradictory, poisoned, wrong-tenant, wrong-mission, wrong-version, untrusted-source, overlong, irrelevant retrieval, missing provenance. For each: construct, run, record resisted/absorbed + detection method.
3. Entry schema mandatory: problem / scope / evidence / mechanism / fix / test / version / applicability / counterexample. Missing any field = INCOMPLETE.
4. Harvest failures from sibling CHECKPOINT.md files as memory-entry candidates (deliverable-level, not written to real memory).
5. Deliverable: ~/workspace/orca-finish/program/mem-a/MEMORY-PROOFS.md

## Safety
- [PROBE]-prefixed test entries only, appended (never overwrite), cleaned up in the FORGET stage. Read-only on repos. No real user memory touched.
- Boundary note: injected files state memory files are read-only for me; parent task explicitly authorizes [PROBE] namespaced test entries + cleanup as the loop test itself. Proceeding as reversible append + removal, documented here.

## Mission log
- 20:04 MDT: lane dir created, sibling checkpoints read (orca-arch C1, state-recovery C3, phantom-hunt C5, mission-control C7, gauntlet, redteam, impl-state, impl-safety, missions, agent10, agent19, critic-archdel). Harvest candidates captured below.
- Harvest candidates (real failures, source lanes):
  H1 [redteam BR-A1] _seedBusinessEvents emits fabricated WORKER_COMPLETED per gateway boot, bypassing recordVerifiedResult.
  H2 [redteam BR-A2] Cross-attempt result-envelope replay exploit demonstrated: replay attempt-1 completed envelope as attempt 2 -> VALID, second WORKER_COMPLETED.
  H3 [redteam BR-A4] Coordinator split-brain on advisory-lock session loss: lock never re-validated, deposed coordinator's writes not rejected.
  H4 [phantom P-7] startAutonomousLoop fabricates worker output inline (confidence 0.85 hardcoded), exposed via live endpoint POST /orchestration/engine/loop.
  H5 [state-recovery] Event persisted -> bridge-handler gap: EventToMissionBridge has no cursor/catch-up, orphan events produce no mission.
  H6 [state-recovery] WorkerRuntime: NO timeout on worker.handle() -> hung worker stalls mission forever.
  H7 [state-recovery] "Repaired reconciler (OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED)" NOT FOUND anywhere on branch -> PHANTOM claim.
  H8 [mission-control] Dashboard velocity: 0% closure rate indistinguishable from "no merge data" (|| 0 defaults).
  H9 [orca-arch] /tmp wipe mid-run destroyed staged work -> /tmp ephemerality invariant.
  H10 [missions] VQ-001 misattribution: opacity grep matched design opacities, NOT motion-gated content -> self-correction loop caught it.
  H11 [redteam BR-A5] Evidence tampering: save() is plain writeFileSync, no digest bound to canonical event.
  H12 [redteam BR-A7] reserveWorkOrderBudget two-file non-atomicity: crash between writes -> budget under-counted.
  H13 [mission-control] /mc/dashboard clamps negative business metrics to 0, masking event inconsistencies.
  H14 [impl-state] Ready-set initially re-claimed RUNNING work orders; fixed to claimable-only (AUTHORIZED) matching branch no-redispatch rule.
- Next: LOOP PROOF stage 1 (WRITE) — append [PROBE] schema-complete entry to ~/memory/2026-09-23.md.

## Mission log (cont.)
- 20:06 MDT: [PROBE] v1.0 entry appended to ~/memory/2026-09-23.md (WRITE proven, +12 lines).
- 20:07 MDT: STORE proven (independent grep read-back, md5 captured).
- 20:09 MDT: RETRIEVE proven on second query; key finding: exact-token query returned 5 older generic "probe" entries and MISSED the fresh exact token. RETRIEVE is semantic, not keyword-exact.
- 20:09 MDT: RANK finding: semantic ranking outranks exact-token match; fresh entry lost to older similar-meaning entries on query 1. Also: entries are chunked at LINE granularity in search results (fragments, need reassembly).
- 20:10 MDT: INJECT proven via muse.memory_get (full entry reassembled, lines 1875-1887).
- 20:10 MDT: USE proven: injected entry's test field drove FORGET verification plan; version field seeded supersede chain.
- 20:12 MDT: VERIFY VALUE caught a REAL defect in my own probe: v1.0 evidence claimed "+20 lines", actual delta +12 lines (1874 -> 1886). The loop's verification stage has teeth.
- 20:14 MDT: SUPERSEDE: v1.1 appended declaring supersession of v1.0 with corrected evidence. Index lag observed: v1.1 not retrievable ~2-3 min after write; v1.0 retrievable ~3 min after write. Index staleness window roughly 3-5 min. SUPERSEDE finding pending re-check: expect BOTH versions returned (no automatic invalidation).
- 20:18 MDT: ATTACK SUITE constructed: 9 [PROBE] attack entries written (STALE QQ44, CONTRADICT WW55, POISON EE66, TENANT RR77, MISSION TT88, VERSION YY99, SOURCE UU11, PROVENANCE II22, OVERLONG OO33). IRRELEVANT attack run as noisy queries.
- 20:19 MDT: IRRELEVANT-retrieval finding (real memory, pre-index): query "Facebook engagement likes comments per pass current" returned FOUR mutually contradictory "current" settings (50+15 on 09-14, 20+0 on 09-23 13:52, 75+20 sprint 19:41, Stage 0 5+0 ramp). Nothing marks which is active; resolution is agent-side by date. Production memory already exhibits the stale/contradictory hazards the attacks simulate.
- Next: wait out index lag, run attack-token searches, record resisted/absorbed per attack, then FORGET stage (remove all [PROBE] entries) and verify removal.

## Mission log (final, ~21:00 MDT)
- 20:40-20:53 MDT: attack-token searches (exact + semantic) confirmed attack entries NOT in index after ~35 min; semantic attack-content queries returned only genuine memories (real IG ceilings, real phone 9705893309). Index ingestion stalled after ~20:09.
- 20:45 MDT: OVERLONG inject test: memory_get returned full 2763-char line, sentinel SEVEN-HUNDRED-FORTY-TWO intact. No truncation at inject layer. RESISTED.
- 20:58 MDT: FORGET executed: all 66 [PROBE] lines removed from ~/memory/2026-09-23.md via scripted section deletion; grep confirms 0 remaining tokens; boundary check confirms adjacent real entries intact. FORGET-store PROVEN.
- 20:59 MDT: FORGET-index check: search STILL returns deleted v1.0 entry -> index serves deleted content with no staleness marking. FORGET-index BROKEN (load-bearing finding).
- 21:00 MDT: MEMORY-PROOFS.md written (loop trace, 10 attack verdicts, 12 schema-complete harvested entries, follow-on queue, mission tally ~40/150).
- Moved to next: follow-on queue items 2-3 (index cadence + forget-index re-verification) when index state allows; harvest ORCA-A/B + CHAOS-A as they land.
