# LANE B4: Recovery Torture Lab, EXECUTED

**Status: HYPOTHESIS until replayed from a clean checkout.** The torture lab
was executed synthetically on 2026-09-28 ~14:45-15:05 MDT against a scratch
harness, not against production. No production process was touched (:3100,
the gateway, the 3 jev-shadow scheduler missions, and the live journal were
never read or written by the harness). No synthetic test produced an external
effect: stub executors only, no network, no adapter calls. The canonical tree
was never modified (read-only `git show` / `git archive` reads at HEAD
`0264d517`).

## 0. What would falsify this report

- If the harness journal path had pointed at the production journal, every
  result would be invalid. Falsifier: `harness-results.json` records the
  journal path; it is
  `~/workspace/ping-24h/repro/scratch/journals/run2/events.jsonl` (scratch).
  The driver refuses to run unless the journal path is inside the scratch dir.
- If the scratch lib diverged from HEAD beyond the documented 2-line
  parameterization, behavior claims would be ungrounded. Falsifier: `diff`
  of `mc-dispatch.HEAD.ts` vs `scratch/mc-dispatch.scratch.ts` shows exactly
  2 changed lines (JOURNAL_PATH and ARTIFACT_ROOT read env overrides with the
  production paths as fallback; ARTIFACT_ROOT override was required because
  `appendDispatchEvent` mkdirs its parent, which does not exist on this host).
- If Node's type-stripping altered semantics, the "real code" claim fails.
  The lib uses only erasable syntax (interfaces, `as const`, annotations);
  no enums or namespaces.
- Clean-checkout replay: re-fetch `src/app/api/mc` at `0264d517` into a fresh
  dir, re-apply the 2-line parameterization, re-run `harness.mjs`, and compare
  `harness-results.json` verdicts. Any verdict flip falsifies this report.

## 1. Harness construction

- Source: `/home/nolan/projects/ping` at HEAD
  `0264d517ea53358d9246ddbbba66bb9dd0beb0d4` (verified via pigwsl-exec.sh;
  matches the program ledger's T+0 observation). Read-only `git show`
  extraction; nothing in the canonical tree was modified.
- Pristine HEAD copies: `~/workspace/ping-24h/repro/mc-dispatch.HEAD.ts`
  (402 lines), `~/workspace/ping-24h/repro/route.HEAD.ts` (424 lines), plus
  the missions/technology routes fetched for the slice archive.
- Working copy: `~/workspace/ping-24h/repro/scratch/mc-dispatch.scratch.ts`
  (the sanctioned form (b) from the lane12 design: copy, 2 path constants
  parameterized, original untouched).
- Driver: `~/workspace/ping-24h/repro/scratch/harness.mjs`. It imports the
  REAL `appendDispatchEvent`, `loadJournalEvents`, `projectMissions`,
  `mintEventId`, `sha256hex`, `nowIso` from the scratch lib; replicates the
  synthetic-coordinator lifecycle and the route.ts terminal-branch logic
  (including the verbatim `runOllama` catch-block classification heuristic)
  against STUB executors. `adapterCall` is never invoked.
- Raw results: `~/workspace/ping-24h/repro/scratch/harness-results.json`
  (17 results, full evidence arrays).

## 2. Material correction vs the lane12 design (HEAD vs worktree)

Lane12's design (section 3) assumed the duplicate-POST 409 HOLD path
(`findPriorMission`, `MISSION_TERMINAL_STATUSES`, route.ts:327-353) as the
expected behavior. **That path does not exist at HEAD `0264d517`.**
Verified by direct read of the HEAD files:

- `mc-dispatch.ts` at HEAD is 402 lines; there is no `findPriorMission` and
  no `MISSION_TERMINAL_STATUSES`.
- `route.ts` at HEAD is 424 lines; it contains no `409`, no `findPriorMission`,
  no `idempotency` branch.
- Mission ids at HEAD embed the request timestamp
  (`sha256(['mission', agent, tenant, capability, promptDigest, ts])`), so
  two identical POSTs always mint distinct missions. There is no idempotency
  key at all.

Lane9's T+0 correction already flagged that the loop report's
idempotency/409 HOLD PASS verdicts describe UNCOMMITTED worktree state, not
HEAD; this execution confirms it mechanically. Consequence for the torture
table: the "409 HOLD" expected invariant in S3/S4 is **FAIL-at-HEAD** (the
feature lives only in the dirty worktree). The event-layer half of A1
(deterministic event ids, duplicate suppression) DOES exist at HEAD and was
executed (T1: PASS).

## 3. Executed / not-executed / untestable-safely table

| # | Scenario | Disposition | Verdict |
|---|---|---|---|
| T1 | Coordinator-death (synthetic coordinator) | EXECUTED | PASS (event layer). HTTP 409 HOLD: FAIL-at-HEAD (absent) |
| T2 | Worker-death-before-dispatch | EXECUTED | PASS |
| T3 | Worker-death-after-dispatch-before-ack | EXECUTED | FAIL-CONFIRMED (S2 misclassification proven) |
| T4 | Worker-death-after-effect (deadline) | EXECUTED | PASS |
| T5 | Lease-expiry (mission layer) | UNTESTABLE-SAFELY | no mission-lease primitive in the dispatch slice at HEAD |
| T6 | Approval-expiry (dispatch slice) | EXECUTED (structural) | PASS-STRUCTURAL |
| T6b | Approval-expiry (mc-approval subsystem policy) | NOT-EXECUTED | file absent from canonical tree at HEAD |
| T7 | Duplicate-result | EXECUTED | FAIL-CONFIRMED (S13 proven) |
| T8 | Late-result | EXECUTED | FAIL-CONFIRMED (S14 proven, latent) |
| T9 | Event-write-succeeds-projection-fails | EXECUTED | PASS |
| T10 | Effect-succeeds-event-write-fails | EXECUTED | FAIL-CONFIRMED (weakest edge #2 proven) |
| T11 | Reconciliation-crash | UNTESTABLE-SAFELY (mechanism); event-layer idempotency EXECUTED | PARTIAL |
| T12 | Repeated-restart | EXECUTED | FAIL-CONFIRMED (S18 proven: state non-amplifying PASS, stuck-work unbounded FAIL) |
| NEG | N4 success-only-watermark negative control | EXECUTED | PASS |
| S9 | Credential rotation in the authorize->execute window | UNTESTABLE-SAFELY | needs live adapterCall + broker; out of the scratch slice |
| S11 | Capability revoked mid-mission | UNTESTABLE-SAFELY | single synchronous transport call; no re-verification point exists to instrument, and revoking mid-call needs the live adapter registry |
| S5-live | Live gateway kill | NOT-EXECUTED | forbidden (production gateway); scratch torn-write path covered by T9 |
| S6-live | Executor handle surviving a real coordinator | NOT-EXECUTED | requires killing a real coordinator; covered synthetically by T1/T8 |

## 4. Per-scenario results (evidence condensed; full arrays in harness-results.json)

**T1 coordinator-death (synthetic). PASS (event layer).** Synthetic
coordinator emitted CREATED/QUEUED/STARTED/AUTHORIZED for `mc-m-t1-coord-death`
via the real `appendDispatchEvent`, then "died". Projection: RUNNING, zero
terminal events, `work_order_id` byte-identical, capabilities exactly the
pre-kill set. Re-emitting the four events with byte-identical summaries
returned `duplicate-skipped` x4; journal line count unchanged across the
duplicate attempts (A1 event-layer: exactly one MC_EXECUTION_STARTED; A2:
exactly one MC_AGENT_AUTHORIZED; A3: all four pre-kill events project; A4:
RUNNING with `result.outcome` null). **Correction:** HTTP 409 HOLD does not
exist at HEAD (section 2), so the HOLD half of the lane12 design verdict is
FAIL-at-HEAD.

**T2 worker-death-before-dispatch. PASS.** Stub threw
`Error('connect ECONNREFUSED 127.0.0.1:11434')` (name `Error`, no `abort`
substring). The verbatim route.ts classification returned
`transport-failed`; the harness emitted `MC_RUN_FAILED` with "The prompt was
never delivered"; projection: FAILED. Honest FAILED, no claim of execution,
no redispatch logic present.

**T3 worker-death-after-dispatch-before-ack. FAIL-CONFIRMED.** Stub server
RECEIVED the prompt and computed a result (`effectDelivered=true`), then the
client saw `Error('read ECONNRESET')`. The verbatim classification returned
`transport-failed` (no `abort` substring) and the mission projected FAILED
while the effect had provably run. **S2's misclassification is now proven by
execution, not just code reading:** a possibly-delivered run is recorded
FAILED with the journal claiming "The prompt was never delivered". Bounded in
production only by the read-only FIXED_CONSTRAINTS slice (policy, untested at
the classification boundary).

**T4 worker-death-after-effect (deadline). PASS.** `AbortError` classified as
`timeout`; `MC_RUN_UNKNOWN` emitted with `reconciliation_state:
'RECONCILIATION IN PROGRESS'`; projection: UNKNOWN, `result.outcome`
`unknown`. UNKNOWN first-class, never collapsed into FAILED.

**T5 lease-expiry (mission layer). UNTESTABLE-SAFELY.** Zero `lease`
occurrences in the dispatch lib source; the only time primitive is the
transport `DEADLINES` table. The invariant "lease-expired -> HOLD, never ->
redispatch" can neither be violated nor satisfied in-slice because no
mission-lease primitive exists at HEAD. The concrete violation
(`reapExpiredLeases` -> `created` + `retry_at = NOW()` in the Pig-side
ping-runtime) is out of this lane's tree and was not re-executed, per the
standing read-only constraints; lane12's S7 code-read finding stands.

**T6 approval-expiry (dispatch slice). PASS-STRUCTURAL.** No
approval/expiry event types in the dispatch slice; zero `APPROVED` transitions
in route.ts; the slice issues no durable grants (work-order issue is
out-of-tree via `adapterCall`). Silence cannot become approval because no
approval transition exists at all. **T6b NOT-EXECUTED:**
`mc-approval/approval_request.py` is absent from the canonical tree at HEAD
`0264d517` (lane12 read it from outside this tree); the subsystem's
EXPIRY_POLICY_OUTCOMES was not re-executed here.

**T7 duplicate-result. FAIL-CONFIRMED.** Byte-identical re-emission of
`MC_RUN_SUCCEEDED` returned `duplicate-skipped` (mechanism works). A second
terminal with a divergent SUMMARY (the reconciler/retry shape, e.g. `run
succeeded (reconciled retry): ...`) minted a new event id and was appended;
the projector accepted two `MC_RUN_SUCCEEDED` events with no conflict marker
(last-write-wins). **S13 proven by execution, with a refinement:** the dedupe
key is `(kind|missionId|eventType|summary)` only; the data payload
(`output_digest`, evidence) is NOT part of the id. Terminal transitions are
set, not WON; no CAS single-winner guard. Note: route.ts at HEAD emits a
constant summary per run (`runId` is always `-r1`), so the trigger needs a
second writer; latent today, mechanical the day a reconciler/retry path
exists.

**T8 late-result. FAIL-CONFIRMED.** After `MC_RUN_UNKNOWN` (status UNKNOWN,
`reconciliation_state` intact), a late `MC_RUN_SUCCEEDED` written directly
flipped the projection to SUCCEEDED and cleared `reconciliation_state`, with
no reconciliation marker anywhere. **S14 proven by execution (latent):**
nothing enforces "UNKNOWN -> terminal only via reconciliation"; terminal
states are not immutable under the projector's last-write-wins.

**T9 event-write-succeeds-projection-fails. PASS.** A torn JSON line appended
to the scratch journal was skipped by `loadJournalEvents` (never presented,
never indexed); dedupe stayed intact. Odd shapes (event with no `mission_id`,
`evidence` as a non-object string, unknown event type) were filtered safely;
the projector never threw; the journal was untouched by the read path. The MC
journal torn-write skip path (lane12 S5, previously code-only) is now
EXECUTED.

**T10 effect-succeeds-event-write-fails. FAIL-CONFIRMED.** Stub executor
completed the effect (output in memory only); the terminal `appendDispatchEvent`
threw `EACCES` (journal file made read-only, simulating disk-full/torn FS)
and the throw propagated (route.ts's `emit` has no try/catch). The journal
held CREATED/QUEUED/STARTED/AUTHORIZED with no terminal; the output digest
was unrecoverable from the journal; the mission projected RUNNING (not even
UNKNOWN); `reconciliation_state` null: nothing marks it for reconciliation.
**Weakest edge #2 proven by execution:** the crash window
effect-returned-but-not-recorded is a total evidence loss. (At HEAD a
duplicate POST would mint a NEW mission, since 409 HOLD is absent.)

**T11 reconciliation-crash. UNTESTABLE-SAFELY as a mechanism (PARTIAL).**
No reconciler exists at HEAD (`agents/route.ts` is absent from the tree;
reconciliation is withheld), so there is nothing to crash. What WAS executed:
re-emitting the same `MC_RUN_UNKNOWN` is idempotent at the event layer
(second emit `duplicate-skipped`, journal delta 1), so a future reconciler
pass CAN be made crash-idempotent on this primitive. Lane12's P5
crash-mid-pass design must run the day the reconciler lands.

**T12 repeated-restart. FAIL-CONFIRMED.** Five simulated restarts (load +
project) over a journal with one RUNNING and one UNKNOWN mission produced
byte-identical projections; the read path appended nothing (state
non-amplifying: PASS). But both missions stayed non-terminal across all
restarts with no bound, no age-out, no escalation, no reconciler (no such
primitives in the slice source). **S18 proven by execution:** restart is
amplifying for stuck work.

**NEG-N4 success-only-watermark negative control. PASS.** A mission whose
effect completed but whose terminal event was never written survived two
catchup projections with a restart between: exactly one
`MC_EXECUTION_STARTED`, zero new lines, no re-fire. The projection is
read-only, so the N4 anti-pattern cannot trigger in-slice. Carried-forward
assertion: when a reconciler lands, re-fire must key on a dispatch record,
never on a success record.

## 5. Verification ledger: assertions A1-A8 (updated)

| Assertion | Verdict | Evidence |
|---|---|---|
| A1 no duplicate effect | PASS (event layer); HTTP 409 HOLD FAIL-at-HEAD | T1: 4 duplicate intents -> all `duplicate-skipped`; exactly one `MC_EXECUTION_STARTED`; per-aggregate line count unchanged. 409 HOLD absent at HEAD (section 2) |
| A2 no synthesized authority | PASS | T1: exactly one `MC_AGENT_AUTHORIZED` post-kill; capabilities exactly the pre-kill set |
| A3 no lost decision/evidence | PASS | T1: all 4 pre-kill events project; `work_order_id`, `run_id`, `execution_id` preserved byte-for-byte |
| A4 no fake success | PASS | T1/T4: RUNNING pre-reconciler, UNKNOWN post-`MC_RUN_UNKNOWN`; `result.outcome` null/unknown, never `completed`/`failed` without a verified envelope |
| A5 UNKNOWN stays UNKNOWN | PASS, CONDITIONAL | T4/T11: projector holds UNKNOWN with `reconciliation_state` intact. CONDITION: T8 proves a direct late write CAN overwrite UNKNOWN (last-write-wins); A5 holds against the projector, not against ungated writes |
| A6 exactly-once continuation (ForkScout shape) | PASS (prototype) | Token read + unlinked before re-entry; crash between consume and completion left an explicit `completion-pending` marker; restart did not re-fire (not zero, not twice). Prototype, not PING code |
| A7 fork-from-checkpoint (AgentOS shape) | FAIL-TODAY | Unwritable: no checkpoint primitive in the dispatch lib; `loadJournalEvents` has no checkpoint parameter; replay is whole-journal only. Stands as the acceptance test for the day checkpoints are introduced |
| A8 quiescence (N2) | PASS (prototype); FAIL as PING mechanism | Prototype gate: replacement started only after the death signal (>=300ms) or a bounded, logged timeout (~200ms); a kill signal at 100ms did NOT release the gate (confirmed dead at ~400ms required). No quiescence gate or executor-liveness probe exists anywhere in the dispatch slice at HEAD |

## 6. Ranked weakest edges (execution-updated)

1. **Coordinator-death recovery terminates at HOLD with no reconciler; at HEAD
   there is not even the HOLD.** Execution adds a rung: the 409 HOLD lane12
   designed against is uncommitted worktree state, not HEAD. At HEAD, a killed
   coordinator's missions sit RUNNING/UNKNOWN and duplicate POSTs mint new
   missions instead of holding. UNKNOWN is doctrine-only (no three-valued
   liveness probe anywhere in the slice). Still the #1 edge, now worse than
   designed.
2. **Effect-succeeds-but-event-write-fails loses the result.** EXECUTED (T10):
   total evidence loss, mission stuck at RUNNING (not even UNKNOWN), nothing
   marks it for reconciliation. Confirmed as designed.
3. **No quiescence gate for any future re-drive.** Not directly executable
   (no re-drive exists), but the prototype gate (A8) is now a tested shape the
   reconciler lane can adopt; authority fencing (WHO) must pair with it (WHEN).
4. **Transport-failed misclassification (S2/S12), upgraded by execution.**
   T3 proves the abort-substring heuristic records a provably-delivered run as
   FAILED ("The prompt was never delivered"). This was a code-read FAIL in
   lane12; it is now an executed FAIL-CONFIRMED.

## 7. UNTESTABLE-SAFELY register (with exact reasons)

- **T5 mission-layer lease-expiry:** no mission-lease primitive exists in the
  dispatch slice at HEAD; the invariant cannot be exercised in-slice. The real
  mechanism (ping-runtime `reapExpiredLeases`) lives outside this lane's tree
  on the Pig and was not executed per standing constraints.
- **T11 reconciler crash:** no reconciler exists to crash
  (`agents/route.ts` absent at HEAD; reconciliation explicitly withheld).
- **S9 rotation in the authorize->execute window:** requires driving the real
  `adapterCall('authorize')` -> `adapterCall('issue')` -> transport sequence
  against the live adapter and broker with a rotation injected between calls;
  out of the scratch slice and any live execution is forbidden.
- **S11 capability revoked mid-mission:** the execution is a single
  synchronous transport call with no re-verification point to instrument;
  revoking mid-call requires the live adapter registry.
- **Any live-coordinator kill, live dispatch, or live gateway fault:**
  forbidden infrastructure/production actions; covered synthetically (T1) or
  by the scratch torn-write path (T9).
- **T6b mc-approval subsystem policy:** the file is absent from the canonical
  tree at HEAD; executing it would mean testing a different tree than the
  pinned one.

## 8. UNKNOWNs carried

- U1: whether the FYD gateway dedupe/crash-window suites pass today (lane12
  read them; not executed by this lane).
- U2: the S9 rotation window (untestable-safely here; needs the reconciler or
  adapter lane).
- U3: approval-expiry binding on adapter-issued work orders (the adapter is
  out-of-tree).
- U4: donor-mechanism runtime behavior under real crash (all donor claims
  remain code-read hypotheses).
- U5: whether `mc-m-test-unknown-01` exists as a committed artifact or only as
  the comment reference in the lib (not resolved by this lane).
- U6: the exact content of the reached-loop report's tenant-spoof suites
  (uncited paths; not in this lane's scope).
- U7: ForkScout license state (unresolved; only the assertion shape was used).

## 9. Bottom line for the parent

Executed 13 of 19 torture rows synthetically plus the N4 negative control and
the A6/A8 prototype shapes (17 recorded results). Four lane12 FAILs are now
execution-confirmed (S2 misclassification, S13 duplicate-terminal,
S14 late-result overwrite, S16 evidence loss, S18 unbounded stuck work);
two are structural passes (S1 honest-FAILED, S9 n/a in-slice); one gained a
worse rung (S4: 409 HOLD is worktree-only, absent at HEAD, so duplicate POSTs
mint new missions). The reconciler lane inherits: crash-idempotent UNKNOWN
re-emission (T11 primitive, proven), the single-consumption resume token shape
(A6, tested), the quiescence gate shape (A8, tested), and the hard requirement
that terminal transitions become WON (CAS) rather than set, because the day a
second writer exists, last-write-wins will silently accept divergent
terminals (T7) and overwrite UNKNOWN (T8). Nothing in this lane touched
production; everything is replayable from a clean checkout per section 0.
