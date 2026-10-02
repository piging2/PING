# LANE B3 REPORT: ORCA knowledge vs patched dispatch + reached-path re-trace

**Status: HYPOTHESIS until replayed from a clean checkout.** T+0 = 2026-09-28 14:26 MDT; this lane ran ~T+0.2.

**Method (read-only):** a scratch worktree was created at the patch commit `9a555021` (`decision-fabric/contextpack-wire-2026-09-28`, base `0264d517`) under `~/workspace/ping-24h/repro/laneB3-9a555021` via the Pig WSL hop. All file:line citations below are against that tree. The canonical tree `/home/nolan/projects/ping` was not modified; no process was touched; no push; no restart of `:3100`. The three predecessor reports (lane 10, lane 12, lane 14) were re-read in full; every claim reused from them was re-verified against the patched code, and two lane-12 citations were found to describe a dirty worktree, not the committed tree (see F3).

**Patch under test (3 files, +327/-6):** `src/app/api/mc/_lib/mc-context-pack.ts` (new, 83 lines: `buildDispatchContextPacket()`), `src/app/api/mc/dispatch/route.ts` (+36/-6: context.json mint replaced by one `compileAskContext()` call, fail-closed), `src/app/api/mc/_lib/__tests__/mc-context-pack.test.ts` (new, 4 tests).

**Headline verdict:** the patch does what it says (context.json is now a deterministic, evidence-bound `ContextPacket` instead of a params envelope) and fails closed honestly. But the background claim "the first broken edge (EVIDENCE -> ORCA CONTEXT) is closed by evidence" is only half true in the patched code: the edge is closed at the **artifact** level and remains open at the **executor-reasoning** level. The executor still receives the raw prompt; the packet is never routed into it. Details in F1.

---

## 1. The 12 questions vs the POST-PATCH dispatch packet

Verdicts describe what the packet the patched dispatch actually mints can answer. The call is `buildDispatchContextPacket()` (`mc-context-pack.ts:57-83`): it passes `question=prompt` (the raw mission prompt), `viewer={id:null, tier:'agent', grants:[], delegatedTier:'visitor'}`, `siteId=tenant`, `objectId=null`, the live tenant graph + `graphDigest`. It does **not** pass `ownerId`, `fieldVisibility`, `capabilities`, `limits`, `budget`, or `search`. The viewer resolves to the visitor tier (`resolveViewerScope`, `context-compiler.ts:84-98`: agent with no owner delegation -> visitor, rules `agent-delegated-tier:visitor`, `public-only`). The packet therefore carries public claims only.

1. **what exists?** REACHED. `graph.objects/relationships` -> `packet.objects/relationships` with deterministic relevance scores (`relevance.why`), per-object `evidenceRefIds`, target fallback to the first business object (`context-compiler.ts:471-477`). Caveat (F4): the question is the raw mission prompt, so relevance is token-overlap over prompt text (`questionSignals`, `context-compiler.ts:118-128`); for non-business prompts the packet is mostly below-floor.
2. **what changed?** PARTIAL. `derivedAt` feeds recency scoring only (`recency01`, `context-compiler.ts:498-505`); no per-claim STALE tag exists. `provenance.updatedRefs` is accumulated by the overlay layer (`fyd-tenant-graph.ts:251`) but the compiler never reads it (zero references in `context-compiler.ts`) and takes no journal-event input. Unchanged from lane 10's prediction.
3. **what is happening?** ABSENT. `CompilerInput` (`context-compiler.ts:330-350`) has no mission/run/execution/MC-event fields. `projectMissions()` (`mc-dispatch.ts:296`) exists but nothing feeds it into any compiler call.
4. **what evidence supports it?** REACHED, with the budget caveat. Evidence registry with `obj:`/`field:`/`rel:` ids (`context-compiler.ts:605-717`), provenance-derived classifications (`classificationFromProvenance`, ~`context-compiler.ts:180`), digests binding graph/siteSpec/searchIndex/packet and `packetId` committing to the full canonical body (`context-compiler.ts:800-810`). Caveats: `verifyAnswerClaims` still has zero non-test callers in the patched tree (only its definition site references it), so registry-membership + epistemic-rank enforcement is declared-only; and the 32-item evidence cap silently starves `rel:` refs with possible dangling refs (see section 4, carried finding, confirmed).
5. **what conflicts?** ABSENT in the packet. No conflicts input, no CONFLICTED classification in the compiler. The complete locked conflict model exists only in the Ask serving path (`field-conflicts.ts`), which the patch does not wire. Lane 10's smallest-gap proposal (conflicts input to the compiler) is not implemented by this patch.
6. **what is UNKNOWN?** REACHED. `unknowns[]` (`context-compiler.ts:758-764`), G3 `no_candidates_above_floor` note (578-583), counts-only exclusion ledger (`visibility.excluded`), `target:<id>` unknowns.
7. **what does the owner want?** PARTIAL. Owner-authored claims keep the USER_OVERRIDE classification via provenance (`context-compiler.ts:180`, viewer-independent); `questionSignals`/`questionIntents` detect intent over 8 keyword families (`context-compiler.ts:114-141`). But: no `ownerId` is passed, no standing directives, no WAITING_APPROVAL/proposal state, no intent beyond the prompt. Unchanged from lane 10's prediction.
8. **what authority exists?** PARTIAL, **weaker than lane 10 predicted**. Lane 10 assumed the compiler's capability-view filtering would be populated; the dispatch call passes `capabilities` as nothing, so it defaults to `[]` and the packet's `capabilities` array is empty (`context-compiler.ts:731-744`). The only authority-adjacent content is metadata strings under `packet.dispatch`: `capability` (the requested capability name) and `constraints` (FIXED_CONSTRAINTS). No grant record, no posture record, no authorize decision. The authorize decision itself is adapter-side and out-of-tree.
9. **what work is running?** ABSENT for all work except itself. No mission/run/lease/HOLD input. Partial-self nuance: `packet.dispatch` carries this mission's own `mission_id`, `run_id`, `execution_id`, `agent`, `tenant`, `capability`, `deadline` (`mc-context-pack.ts:60-66`, `route.ts:336-342`), so the packet knows its own dispatch envelope and nothing else.
10. **what effects may have occurred?** ABSENT. No effect input; the packet is compiled before the executor runs. Effect-adjacent primitives exist in the slice (FIXED_CONSTRAINTS read-only slice `mc-dispatch.ts:58-64`; outcome evidence attached to terminal events `route.ts:364-377`) but none enter any packet.
11. **what outcomes were verified?** ABSENT. Verification (`adapterCall('verify')`, `route.ts:400-405`) and verified outcomes (`result.json` artifact, `MC_RUN_SUCCEEDED` with `output_digest`, `route.ts:422-436`) exist downstream of the compile; none feed a context builder.
12. **what requires attention?** PARTIAL. `unknowns[]`, `notes[]`, the exclusion-count ledger, and the per-section budget ledger are attention-shaped, but health, tripwire, HOLD, and conflict states have no input. Unchanged from lane 10's prediction.

**Tally for the actual post-patch packet: REACHED 3 (1, 4, 6), PARTIAL 4 (2, 7, 8, 12), ABSENT 5 (3, 5, 9, 10, 11).** Same tally lane 10 predicted, with Q8's content weaker than predicted and Q9's self-only nuance new.

---

## 2. Reached-path re-trace through the PATCHED code

Path: INTENT -> decision -> policy -> capability request -> authority evaluation -> capability issuance -> executor eligibility -> WorkOrder -> dispatch -> attempt -> execution -> possible effect -> result -> effect classification -> verification -> reconciliation -> event/evidence -> outcome -> receipt -> Mission Control.

| # | Boundary | Verdict | Evidence (patched tree) |
|---|---|---|---|
| 1 | INTENT | REACHED | POST body `prompt/agent/capability/tenant` validated fail-closed: `route.ts:224-231` (prompt 1..2000 chars, `PROMPT_MAX` at `mc-dispatch.ts:37`) |
| 2 | decision | REACHED | Validation + deterministic id minting `route.ts:233-267`. Note: `missionId` hashes `ts` (`route.ts:262`), so identical POSTs mint different missions: no idempotency at this boundary |
| 3 | policy | REACHED | `FIXED_CONSTRAINTS` (`mc-dispatch.ts:58-64`), `SLICE_AGENTS`/`SLICE_TENANTS`/`DEADLINES` (`mc-dispatch.ts:30-45`), AgentProfile whitelist + LIVE + capability allowlist (`route.ts:249-258`) |
| 4 | capability request | REACHED | `adapterCall('authorize', {agentId, capability, namespace, constraints: FIXED_CONSTRAINTS})` at `route.ts:281-283`; shim is `spawnSync('node', [ADAPTER_SHIM, op, ...])` (`mc-dispatch.ts:277-284`) |
| 5 | authority evaluation | DECLARED ONLY (out-of-tree) | The adapter owns the GRANT/DENY decision; the route trusts the verdict (`route.ts:286-293`). Posture lives in `AGENT_PROFILES` data, never in a per-order authority record (lane 14 R1, confirmed) |
| 6 | capability issuance | REACHED | `adapterCall('issue', {...})` at `route.ts:297-305`; `MC_AGENT_AUTHORIZED` with `capabilities_granted` + `work_order_id` at `route.ts:319-321` |
| 7 | executor eligibility | PARTIAL | REACHED: slice allowlist (`route.ts:236`), LIVE status (`route.ts:252`), capability allowlist (`route.ts:255`), broker quota fail-closed (`route.ts:102-119`). ABSENT: live health probe (R5), selection rationale/record (R2) |
| 8 | WorkOrder | REACHED | `workorder.json` artifact `route.ts:325`; envelope carries `contextPackId`. PARTIAL on attempt fidelity: `attempt: 1` hard-coded (`route.ts:302`), `taskId = missionId:task:1` (`route.ts:264`): dual bookkeeping (R6) |
| 9 | dispatch | REACHED, with a broken sub-edge | Transport invoked: `runOllama(prompt, deadlineS)` (`route.ts:356`), `runBroker(agent, prompt, deadlineS)` (`route.ts:358`). **EVIDENCE -> EXECUTOR CONTEXT is ABSENT**: the executor receives the raw prompt only; the compiled packet is never placed in the prompt, the work-order input, or the broker task file (see F1) |
| 10 | attempt | PARTIAL | Attempt identity exists (`taskId`, `attempt: 1`); no retry path in this route; lane 14's reconcile-gated re-issue lives in the adapter path, not here |
| 11 | execution | REACHED | `MC_EXECUTION_STARTED` at `route.ts:318` precedes the transport await at `route.ts:356-358` (intent checkpointed before effect, per Pi-1 comparison) |
| 12 | possible effect | DECLARED (policy) / PARTIAL (mechanism) | `FIXED_CONSTRAINTS` read-only slice (`mc-dispatch.ts:58-64`) enforced at authorize; the ollama transport has no tool channel (pure text generation, `route.ts:133-170`); the broker path relies on the out-of-tree wrapper. No per-effect measurement |
| 13 | result | REACHED | `AgentOutcome` kinds ran/transport-failed/timeout (`route.ts:121-131`); 8-field `resultEnvelope` built `route.ts:387-396` |
| 14 | effect classification | ABSENT in this slice | No `effect_state` anywhere in `route.ts` or `mc-dispatch.ts`. Lane 14's `effect_unknown` default lives in the adapter's `recordVerifiedResult`, out-of-tree. Outcome evidence is attached to terminal events (`route.ts:364-377`) but never classified |
| 15 | verification | REACHED (enforcement) / DECLARED (decision) | `adapterCall('verify', {result, workOrder, invokedAgentId, verifiedAt})` at `route.ts:400-405`; `valid !== true` -> `MC_RUN_UNKNOWN`, never canonical (`route.ts:408-419`) |
| 16 | reconciliation | DECLARED ONLY | The literal string `'RECONCILIATION IN PROGRESS'` is set at every UNKNOWN emission (`route.ts:309, 376, 382, 412, 418`; `mc-dispatch.ts:368`) and cleared on terminals (`mc-dispatch.ts:351, 359`). Nothing consumes it. No reconciler, no liveness probe, no resume path anywhere under `src/app/api/mc` |
| 17 | event/evidence | REACHED | `appendDispatchEvent` (`mc-dispatch.ts:218-258`): deterministic content-derived ids (`mintEventId`, `mc-dispatch.ts:151-153`), summary-identical dedupe (`duplicate-skipped`, `mc-dispatch.ts:241`), malformed-line skip on read (`mc-dispatch.ts:160-168`), strictly-increasing per-mission timestamps (`mc-dispatch.ts:226-244`). Artifacts via `publishArtifact` = file write + sha256 + `MC_ARTIFACT_PUBLISHED` (`mc-dispatch.ts:404-418`), so the packet's integrity is journaled. Caveats: `emit()` has no try/catch (lane 12 S16); terminals are last-write-wins with no conflict marker (`mc-dispatch.ts:344-369`) |
| 18 | outcome | REACHED | `projectMissions` (`mc-dispatch.ts:296-372`) renders CREATED/QUEUED/RUNNING/SUCCEEDED/FAILED/UNKNOWN/DENIED; UNKNOWN never collapses to FAILED |
| 19 | receipt | REACHED | `Response.json` envelopes carry `ok`, `status`, `mission_id`, `run_id`, `execution_id`, `work_order_id`, plus `result_id`/`output_digest` on success (`route.ts:364-370, 375-384, 411-419, 429-436, 441-447`). Quirk: `ok: true` is returned even for FAILED and UNKNOWN statuses |
| 20 | Mission Control | REACHED | `GET /api/mc/missions` re-projects the journal per read (`src/app/api/mc/missions/route.ts`); per-mission detail with artifacts, evidence, events, reconciliation state (`src/app/api/mc/missions/[id]/route.ts`) |

---

## 3. Independent verification of lane 12's weakest edges and lane 14's R1-R10 in the patched code

### Lane 12's three weakest edges

**L12-1. Coordinator-death recovery terminates at HOLD with no reconciler; UNKNOWN is doctrine-only. CONFIRMED, and stronger than lane 12 reported.** Two of lane 12's citations do not exist in the committed/patched tree: the "duplicate POST -> 409 HOLD" path (`route.ts:327-353` in lane 12's numbering) and `src/app/api/mc/agents/route.ts:210-219` (the reconciler-withheld declaration) were read from a dirty worktree (route.ts carried 121+/19- uncommitted changes at lane-12 time, per lane 10). In `9a555021`: there is no 409, no HOLD, no `findPriorMission`, no `MISSION_TERMINAL_STATUSES` anywhere in `route.ts` or `mc-dispatch.ts`; `src/app/api/mc/agents/` does not exist. Worse, `missionId` includes the request timestamp (`route.ts:262`), so a retried POST mints a *new* mission: there is no route-level idempotency at all, only summary-identical event-id dedupe at append time (`mc-dispatch.ts:241`). `reconciliation_state` remains a write-only string (section 2, #16). The `reapExpiredLeases` lease-expired-to-redispatch violation in the Pig-side `ping-runtime` is carried from lane 12's late evidence (not re-proven here; it lives outside this tree).

**L12-2. Effect-succeeds-but-event-write-fails loses the result. CONFIRMED.** The `emit` closure (`route.ts:269-272`) calls `appendDispatchEvent` -> `appendFileSync` with no try/catch; a throw propagates as a 500, the in-memory result envelope is lost, and the journal sits pre-terminal forever (not even UNKNOWN). The patch adds a second emit site with the same property (`route.ts:345`). The Pi-1 benchmark (checkpoint before effect, typed `interrupted` on recovery) is still failed: nothing is checkpointed after the effect returns and before the terminal commit.

**L12-3. No quiescence gate for any future re-drive. CONFIRMED.** No executor-liveness probe exists under `src/app/api/mc`; the `AbortController` deadline (`route.ts:139`, `runBroker` via `spawnSync` timeout `route.ts:176`) cancels the client side only and proves nothing about the server. Latent today (no re-drive exists), mechanical the day a reconciler lands.

**Runner-up (lane 12 S2/S12): transport-failed misclassification. CONFIRMED.** The abort-substring heuristic (`route.ts:163-168`) still renders possibly-delivered and partitioned runs as `transport-failed` -> `MC_RUN_FAILED` ("never delivered", unprovable). Bounded today by the read-only slice.

### Lane 14's R1-R10

**R1. Authority posture is adapter data, not a per-order authority decision. CONFIRMED.** `authorize` passes caller constraints (`route.ts:281`); posture comes from `AGENT_PROFILES` registry data (`route.ts:249-258`); no per-order posture decision or record exists. New: the patch's packet records *nothing* about posture (`capabilities: []` input -> empty `packet.capabilities`), so the evidence artifact cannot even describe the posture the mission ran under.

**R2. Executor selection has no authority and no record. CONFIRMED.** `agent` comes from the POST body (`route.ts:226`); the adapter validates the whitelist only. No eligibility decision, no rationale, no "why this worker" event. The packet records the agent as a metadata string.

**R3. Completion attribution has no process binding. CONFIRMED with a nuance.** In this route the dispatcher builds the result envelope from transport stdout itself (`route.ts:387-396`), so misattribution requires transport compromise rather than a stray process; the three-way agent binding and nonce gap lane 14 describes belong to the adapter path. No nonce exists anywhere in `route.ts` or `mc-dispatch.ts`.

**R4. Cancellation is absent. CONFIRMED.** Timeout-only (`route.ts:139, 176`); a timed-out worker may still be running and is honestly recorded UNKNOWN, but nothing can prove it dead.

**R5. Health is registry-state, not a live probe. CONFIRMED** (`route.ts:252`: `profile.status !== 'LIVE'`).

**R6. Dual attempt bookkeeping. CONFIRMED** (`route.ts:264` `taskId`, `route.ts:302` `attempt: 1`).

**R7. `verifiedAt` is the caller's clock. CONFIRMED** (`route.ts:386`: `nowIso()`; binding `verifiedAt <= deadline` is adapter-side).

**R8. `causation_id` always null. CONFIRMED** (`route.ts:302`).

**R9. Zero dedicated unit tests for `authorizeWorkOrder`. CONFIRMED.** No test file references `mc-dispatch.ts`, `dispatch/route.ts`, or the adapter shim; the patch's 4 new tests cover only the compiler seam (`mc-context-pack.test.ts`), not dispatch behavior. All of section 2's REACHED verdicts for route behavior are code-only.

**R10. No redeem-time re-decide at the issue->invoke boundary. CONFIRMED, and the patch widens the window.** `issue` at `route.ts:297`, transport at `route.ts:356-358`, with no re-verification between. The patch inserts an `await` on journal I/O (graph read + compile, `route.ts:332`) into that window, lengthening the carried-grant interval. Lane 14's proposed `action_fingerprint` / redeem step is not implemented.

### Carried candidate: the evidence-budget finding. CONFIRMED in the patched code (not re-proved from scratch, per the task).

- `addEvidence` silently returns when the 32-item cap is hit, incrementing no exclusion counter (`context-compiler.ts:605-606`). `excluded.budgetCut` counts byte-fit failures only; count-cap drops are untracked.
- Object/field evidence is minted in section 5 (`context-compiler.ts:605-660`) *before* relationship evidence in section 6 (706-717), so `rel:` refs are starved whenever objects+fields fill the cap first.
- `mintForObject` returns the `obj:<id>` ref id regardless of whether `addEvidence` actually stored it (`context-compiler.ts:623-627`), and `relObj.evidenceRef` is assigned at `context-compiler.ts:712` even if the `rel:` entry was dropped: **dangling refs are constructible**.
- Direct behavioral evidence: the patch's own test crafts its question to *avoid* service-intent keywords "so the fixture's service objects stay below the relevance floor; the 32-item evidence budget then has room for the relationship evidence entries" (`mc-context-pack.test.ts`, test 1 comment). The boundary is real enough that the test author had to steer around it.

---

## 4. Ranked next-first-weak-edge list (failure cost x reachability)

1. **No route-level idempotency + HOLD-with-no-reconciler (L12-1, strengthened).** Every duplicate POST mints a new mission (`route.ts:262`); every timeout/verify-failure parks a mission in UNKNOWN with a write-only reconciliation string; nothing ever reconciles; the carried `reapExpiredLeases` finding says expired leases get re-dispatched as `created`. Cost: unbounded stuck/duplicate unknown-outcome work. Reachability: every duplicate POST, every UNKNOWN. This is the first edge to fix because it compounds: all other edges' failures land here and stay.
2. **Terminal event-write failure loses the result (L12-2).** Cost: total, unrecoverable evidence loss in the effect-returned-but-not-recorded window; mission stuck pre-terminal; duplicates cannot advance it. Reachability: any journal write fault (rare trigger, unconditional code path, zero mitigation).
3. **The patch's core claim is half-closed: the executor never receives the packet (F1).** `runOllama(prompt, ...)` / `runBroker(agent, prompt, ...)` (`route.ts:356-358`) get the raw prompt; context.json is published but never fed to any executor input, work-order input, or broker task file; the result envelope binds only the `context_pack_id` *string*, not the packet digest. Cost: the intelligence product does not reach the reasoning it was built for, and "executor context is evidence-bound" is unverifiable. Reachability: 100% of dispatches. (Lane 14 section 6.5's `input_digest` echo proposal is the contract-shaped fix; it is not implemented.)
4. **Evidence-budget starvation + dangling refs in the packet itself (carried, confirmed).** Cost: the program's own artifact can cite evidence ids that do not exist in its registry and silently drop relationship evidence. Reachability: any dispatch whose tenant graph yields more than 32 evidence items; the dispatch packet's question is a raw prompt, so real prompts will hit this.
5. **Authority posture is not a per-order decision, and the packet records none (R1 + F5).** Cost: a profile edit or family swap silently changes what a mission ran under; the packet, the artifact of record, cannot answer "what authority exists" beyond naming the requested capability string. Reachability: every dispatch.
6. **No redeem-time re-decide; patch widens the issue->invoke window (R10).** Cost: a grant revoked between issue and invoke is still honored at the effect boundary. Reachability: every dispatch (window is milliseconds plus journal I/O; the patch made it longer).
7. **No quiescence gate (L12-3).** Cost: live-plus-replacement double execution the day a reconciler re-drives. Reachability: latent today (no re-drive exists); rises to critical the moment a reconciler ships.
8. **Divergent duplicate terminals accepted last-write-wins (lane 12 S13).** `projectMissions` (`mc-dispatch.ts:344-369`) applies terminals with no single-winner guard and clears `reconciliation_state` on any terminal. Cost: a second, divergent terminal silently overwrites the first. Reachability: requires code-level misuse (only `route.ts` writes these events today).
9. **transport-failed misclassification (S2/S12).** Cost: possibly-delivered runs recorded FAILED ("never delivered"), unprovably. Reachability: every transport fault; blast radius bounded by the read-only slice.
10. **Tail, in order:** R2 (no selection record), R9 (no tests pinning authorize/issue/verify or any of section 2's route behavior), R3 (no nonce in this slice), R4 (no cancellation), R5 (registry-state health), R6 (dual attempt), R7 (caller clock for `verifiedAt`), R8 (null causation), the `ok: true` receipt quirk on FAILED/UNKNOWN, and F2's ordering note (`MC_EXECUTION_STARTED` at `route.ts:318` precedes the context-pack compile at `route.ts:332`, so a compile failure emits `MC_RUN_FAILED` at `route.ts:345` for a mission whose executor never ran; compiling before `MC_EXECUTION_STARTED` would keep the journal honest).

---

## 5. New findings from this lane (not re-proofs)

- **F1. EVIDENCE -> ORCA CONTEXT is closed at the artifact level, open at the executor-reasoning level.** The packet is evidence-bound and its sha256 is journaled via `MC_ARTIFACT_PUBLISHED` (`route.ts:351`, `mc-dispatch.ts:404-418`), so Mission Control can audit what the mission *should* have known. But the executor's actual context is the raw prompt (`route.ts:356-358`), the work-order input references only `prompt.txt` (`route.ts:299`), and `verifyResultEnvelope` binds the `context_pack_id` string, not the packet digest. Additionally, the packet is compiled *after* `authorize` (`route.ts:281`) and `issue` (`route.ts:297`), so contrary to lane 10 section 4's expectation, it cannot serve as evidence *for* the authorize decision; it is post-hoc mission evidence.
- **F2. Fail-closed ordering wrinkle.** On compile failure the route emits `MC_RUN_FAILED` (`route.ts:345`) *after* `MC_EXECUTION_STARTED` (`route.ts:318`) was already emitted, and returns HTTP `ok: true` with `status: 'FAILED'` (`route.ts:347-350`). The journal claims execution started for a mission whose executor provably never ran. Failing the mission is honest (effect provably never started, per lane 12's S1 invariant); the ordering is what misleads.
- **F3. Two lane-12 citations describe a dirty worktree, not the committed tree.** The 409-HOLD route path and `src/app/api/mc/agents/route.ts` do not exist in `9a555021`. Any downstream lane consuming lane 12's S3/S4 as committed-tree facts should re-check. This lane's section 3 records the corrected state.
- **F4. The packet's question is the raw mission prompt.** Relevance is token-overlap over prompt text (`context-compiler.ts:118-128`, 530-556); `objectId: null` falls back to the first business object as target (`context-compiler.ts:471-477`). For code-capability dispatches the packet will typically be a target plus unknowns plus the G3 `no_candidates_above_floor` note, not a dispatch-relevant evidence selection.
- **F5. The dispatch packet's `capabilities` section is always empty.** The patch passes no `capabilities` input, so G8 filtering never runs and no capability handles are emitted. "What authority exists" is answerable only as two metadata strings (`dispatch.capability`, `dispatch.constraints`).
- **F6. `verifyAnswerClaims` remains declared-only** in the patched tree (zero non-test callers). Nothing enforces the SUPPORTED/DERIVED/INFERRED/UNKNOWN grading contract on any consumer of the packet.

---

## 6. What would falsify this report

- The scratch worktree differing from `9a555021` (it was created with `git worktree add --detach ... 9a555021`; `git rev-parse HEAD` in the worktree returned `9a55502125fe9b38f44aef183f597f09971c1862`).
- Uncommitted changes on the canonical branch differing from the committed tree (this lane read only the committed tree; the patch branch is unpushed by design).
- The adapter-side behavior (`authorize`/`issue`/`verify` internals, `recordVerifiedResult`, broker wrapper): out-of-tree, taken from lane 14's reads; runtime behavior there is UNKNOWN to this lane.
- Whether the served `:3100` build includes the patch (lane 10's staleness caveat stands; a landed-but-unpushed commit is not live until rebuild plus restart, which is coordinator-scheduled and out of scope).
- If any executor path other than `runOllama`/`runBroker` in `route.ts` reads `context.json` (grep shows both take only the prompt string; no other executor call site exists in the route).

## 7. UNKNOWNs (kept distinct from FAILED)

- U1: runtime behavior of the adapter shim and broker wrapper under fault (out-of-tree; lane 14's reads are code-level hypotheses).
- U2: whether the FYD journal gateway path referenced by `JOURNAL_PATH` is the live production journal in this environment (read-only lane; never probed).
- U3: the `reapExpiredLeases` lease-expired-to-redispatch claim is carried from lane 12's late evidence against the Pig-side `ping-runtime`; it was not re-verified in this lane and lives outside the patched tree.
- U4: whether any committed test pins `projectMissions` replay-safety or the Lane D ordering fix (lane 12's U5 stands; this lane confirmed zero test files reference `mc-dispatch.ts` or `dispatch/route.ts`).
- U5: what the ORCA-side consumer of `context.json` is expected to be. In the patched code the only reached consumer is Mission Control via `GET /api/mc/missions/[id]` (artifacts with sha256). No serving path feeds the packet to an ORCA decision or to the executor.

---

*Read-only lane. Scratch worktree at `~/workspace/ping-24h/repro/laneB3-9a555021` (detached HEAD `9a555021`); canonical tree untouched; no processes touched; no pushes; the three jev-shadow scheduler missions and `:3100` were not touched. All verdicts are hypotheses until replayed from a clean checkout.*
