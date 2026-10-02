# Lane B10 falsifier attack notes: Lane B3 (reached-path re-trace)

## Scope
Report: ~/workspace/ping-24h/lanes/laneB3-reached-path/report.md (150 lines).
Method: read-only re-trace of patch commit 9a555021 against the committed tree via Pig WSL.

## Verified from the committed tree (9a55502125fe9b38f44aef183f597f09971c1862)

### CONFIRMED
1. **Patch stats**: 3 files, 327 insertions, 6 deletions. EXACT. Files: mc-context-pack.test.ts (+214), mc-context-pack.ts (+83), dispatch/route.ts (+36/-6).

2. **F1 (executor never receives the packet)**: CONFIRMED. `runOllama(prompt, deadlineS)` (route.ts:356) and `runBroker(agent, prompt, deadlineS)` (route.ts:358) take the raw prompt string only. The compiled `dispatchContext` is published as a `context.json` artifact (route.ts:351) but never passed to either executor. Work-order input (route.ts:299) references only `{prompt, prompt_digest, note}`. The packet is evidence for audit, not input to reasoning.

3. **F3 (lane-12 dirty worktree)**: CONFIRMED. In 9a555021: zero occurrences of "409", "HOLD", "findPriorMission", "MISSION_TERMINAL_STATUSES" in dispatch/route.ts; `src/app/api/mc/agents/` does not exist. Lane 12's S3/S4 citations describe uncommitted state, not the committed tree. B3's correction is accurate and material for downstream consumers of lane 12.

4. **32-item evidence cap with silent drop**: CONFIRMED. `maxEvidenceItems: 32` (src/fyd/ask/context-compiler.ts:303). `addEvidence` silently returns when the cap is hit (no exclusion counter, no tracking). The substance of the carried finding holds.

5. **Packet compiled after authorize/issue**: CONFIRMED from the route.ts flow (authorize ~281, issue ~297, context publish ~351). The packet cannot serve as evidence FOR the authorize decision; it is post-hoc.

## WEAKENED / imprecise

### W1. Line citations are approximate
- B3 cites "context-compiler.ts:605-717" etc., but the file lives at `src/fyd/ask/context-compiler.ts` (not under `src/app/api/mc/_lib/`). The path is never fully specified in the report.
- The 32-item cap is at line 303, not in the 605-617 range implied. `addEvidence` is around 605-610, close to cited 605-606.
- Citations are "against that tree" (the scratch worktree), which no longer exists at `~/workspace/ping-24h/repro/laneB3-9a555021`. Cannot re-verify exact line numbers. The substance verifies; the pointers are loose.

### W2. The 12-question tally is interpretive
- REACHED 3 / PARTIAL 4 / ABSENT 5 is B3's judgment against its own criteria. The verdicts are reasoned and the evidence cited, but "PARTIAL" vs "ABSENT" for Q2, Q7, Q8, Q12 involves judgment calls (e.g., Q8 "weaker than lane 10 predicted" is a comparative assessment, not a measurement).
- Q9's "Partial-self nuance" (packet knows its own dispatch envelope) is correctly noted as new, but it's metadata, not work-state. Calling it PARTIAL for "what work is running" is generous; the packet knows nothing about other work.

### W3. Carried findings not re-proven
- B3 explicitly says the evidence-budget finding and `reapExpiredLeases` are "carried" and "not re-proven from scratch, per the task." This is honest, but it means sections of the report rest on prior lanes' work, not independent verification. The 32-item cap was re-verified here (see above); the dangling-ref constructibility and `reapExpiredLeases` were not.

### W4. "Fails closed honestly" overstates
- The headline says the patch "fails closed honestly." But F2 documents that on compile failure, the route emits `MC_EXECUTION_STARTED` (route.ts:318) BEFORE the compile (route.ts:332), then `MC_RUN_FAILED` (route.ts:345). The journal claims execution started for a mission whose executor never ran. B3 flags this as F2, but the headline "fails closed honestly" sits in tension with it. The failure is honest (effect never started); the ordering misleads.

## FALSIFIED
- None material. The key factual claims (patch stats, F1, F3, 32-item cap) all verify against the committed tree.

## STRONGEST SURVIVING
- F1: The EVIDENCE -> ORCA CONTEXT edge is closed at the artifact level but open at the executor-reasoning level. This is the report's central contribution and it verifies cleanly from the code. The executor receives the raw prompt; the packet is never routed into it.
- F3: The lane-12 dirty-worktree correction. Two of lane 12's weakest-edge citations describe uncommitted state. This is a concrete, verifiable correction that downstream lanes need.
- The ranked next-first-weak-edge list (#1 idempotency+HOLD, #2 terminal write failure, #3 F1) is well-grounded in the code.

## WEAKEST LINK
- The 20-boundary re-trace (section 2) and 12-question verdicts (section 1) are comprehensive but interpretive. They depend on B3's reading of the code, not on executed behavior. R9 confirms zero tests pin any of the route behavior, so all REACHED verdicts for dispatch are code-only hypotheses. The report is honest about this ("All of section 2's REACHED verdicts for route behavior are code-only"), but it means the re-trace is a careful reading, not a proof.

## Verdict lines
- STRONGEST SURVIVING: F1 (executor never receives the compiled packet; verified at route.ts:356/358) and F3 (lane-12's 409/HOLD citations describe a dirty worktree; verified absent in 9a555021).
- WEAKEST LINK: The 12-question and 20-boundary verdicts are interpretive code readings with zero test coverage (R9); they are careful hypotheses, not proofs.
- FALSIFIED: Nothing material. Patch stats, F1, F3, and the 32-item cap all verify.
- WEAKENED: Line citations are approximate (wrong directory implied, worktree gone); "fails closed honestly" headline sits in tension with F2's ordering wrinkle; carried findings (dangling refs, reapExpiredLeases) rest on prior lanes, not re-proof.
