# INVESTIGATOR B TRUTH RECORD
## PING CORE INTERROGATION, 2026-09-30
### Questions Q3, Q4, Q5, Q6

Investigator: B (subagent, reader/falsifier posture; no building, no new authorities proposed).
Charter: `~/workspace/goals/ping-agent-execution-stack/files/PING-CORE-INTERROGATION-2026-09-30.md`
Method per question, verbatim from the charter:
`QUESTION -> CURRENT CLAIM -> REACHED PATH -> EVIDENCE -> COUNTEREVIDENCE -> VERDICT -> SMALLEST CONSEQUENCE`
Verdicts restricted to: PROVEN / FALSIFIED / PARTIAL / UNKNOWN / NOT-REACHED.
After every answer: "What observation would prove this answer wrong?"

Read posture: Pig journal probed read-only (`PGOPTIONS="-c default_transaction_read_only=on"`,
DB password obtained inside the Pig container, never leaves it). Deployed code read from the
live container image `ping-gateway:repair-cert-20260924` (created 2026-09-29T19:13Z), which is
distinguished throughout from the newer `/home/nolan/ping` development checkout.
SOURCE TRUTH vs DEPLOYED TRUTH is maintained: several repairs exist in the checkout that are
NOT in the deployed image.

---

## Q3: Can PING distinguish "we recorded something" from "the world changed?"

**CURRENT CLAIM:** PING's engagement machinery keeps INTENT, AUTHORIZATION, ATTEMPT, RESULT,
VERIFIED EFFECT, OUTCOME, and CANDIDATE LEARNING as distinct stages, and does not confuse a
record with a world-change.

**REACHED PATH:**
- `~/workspace/outreach/action-intent-ledger.py` (1347 lines), its data
  `~/workspace/outreach/action-intent-ledger.jsonl` and `~/workspace/outreach/action-truth.jsonl`
- Pipeline wiring `~/workspace/pig-fb/run_pass.sh`, gate `~/workspace/outreach/authority-check.py`,
  guard `~/workspace/outreach/engagement-guard.py`
- Traced one intent end-to-end: `8cfeddea8fee41e598630b2c36330f22` (pass `fb-20260929-173026`)
- MC projection `~/workspace/mission-control/ping-action-8cfeddea8fee41e598630b2c36330f22.json`

**EVIDENCE:**
1. The ledger is explicitly designed with hard stage distinctions. Its docstring states
   "RESULT is not EFFECT" and "EFFECT is not SUCCESS; SUCCESS is not BENEFICIAL OUTCOME."
   Record types exist for intent, execution, observation, effect_verification, outcome, and
   candidate_learning.
2. Live counts (2026-09-30): 4618 intent, 3718 execution, 4435 observation records. The
   vocabulary is in real use.
3. One intent was traced end-to-end proving the distinction is operational, not just designed:
   intent `8cfeddea8fee41e598630b2c36330f22` (Facebook comment, pass `fb-20260929-173026`):
   intent -> execution -> observation (ok=true -> EXECUTED) -> effect_verification
   (EFFECT_CONFIRMED via independent facebook-cli read) -> outcome NO_SIGNAL -> outcome
   REPLY_RECEIVED, with attribution reasoned as "SUPPORTED structurally (nested reply to our
   comment + name tag), not merely temporal correlation." The verification used a different
   observer channel than the worker, which is the designed separator between
   "worker said so" and "the world changed."
4. The `action-truth.jsonl` schema separates `succeeded` ("Worker reported ok (effect
   observed)") from `verified` ("Independently confirmed").

**COUNTEREVIDENCE (collapses found):**
1. Only **1 effect_verification, 2 outcome, 0 candidate_learning** records exist against
   4618 intents. The verification/outcome/learning stages are designed but essentially
   unmanned: the separator is exercised 1 time in 3064 EXECUTED terminals.
2. Terminal EXECUTED is literally defined as worker-returned-ok (`record-outcomes`:
   `EXECUTED if o.get("ok") else FAILED`). The name reads as world-change; the semantics
   are worker-claim. Nothing in the terminal asserts the world changed.
3. AUTHORIZATION is derived from pipeline position, not bound per action. `trace()` admits
   `"per_action_receipt": "absent: pipeline-attested, not per-action-receipted"`. The gate's
   exit-0 verdict is printed to the pass log, never bound to an intent ID. AUTHORIZED and
   INTENT collapse into "the pass ran."
4. The worker's ok evidence is itself a same-channel effect observation ("like registered
   (button state changed)", "comment text visible"). Independent verification (a different
   observer channel) is the designed separator but used 1/3064.
5. Known label bug (recorded 2026-09-29 in AGENTS.md): `record-outcomes` reads the `ok`
   boolean, not an `outcome` string; a malformed outcomes file records FAILED for genuinely
   executed actions. The error direction is fail-safe, but the label layer is unreliable.
6. Across 15 `action-truth.jsonl` records, `verified` exceeded `succeeded` in 0 cases: the
   independent channel is rarely exercised even where the schema expects it.

**VERDICT: PARTIAL.** The distinction is real as designed vocabulary and is proven
operational in exactly one traced case with an independent observer channel. But the
default production path collapses INTENT/AUTHORIZATION (pipeline-position-derived),
WORKER-RETURNED-SUCCESS/EFFECT-OCCURRED (terminal defined as worker-claim), and exercises
independent verification at ~0.03% of executed terminals. "We recorded something" and
"the world changed" are distinguishable in principle and indistinguishable in the
overwhelming majority of production records.

**SMALLEST CONSEQUENCE:** No terminal labeled EXECUTED may be cited as evidence that an
effect occurred; only an effect_verification record from an independent observer channel
carries that claim. Any report that counts EXECUTED terminals as effects is misreading the
schema's own definitions.

**What observation would prove this answer wrong?** A ledger export in which a majority of
EXECUTED terminals carry effect_verification records from an observer channel independent
of the worker that performed the action. Or a schema change redefining the terminals to
worker-claim semantics, which would dissolve the naming collapse (the 1/3064 verification
gap would remain).

---

## Q4: Can PING tell the truth when absolutely nothing is known?

**CURRENT CLAIM:** PING preserves UNKNOWN as an honest state: no evidence stays open and
fail-closed; timeouts reconcile rather than resolve to failure; nothing is auto-retired
without definitive failure evidence.

**REACHED PATH:**
- Nolan's journal-schema owner decision (2026-09-30): COALESCE read path + DEFAULT UNKNOWN
  for future writes; historical absence stays honestly UNKNOWN; no backfill.
- `~/workspace/outreach/action-intent-ledger.py` (`record-outcomes`, `refuse`, `reconcile`,
  `verify-effect`)
- `~/workspace/orca-adapter/effect_ledger.js` + `outcomes.js` (2026-09-30)
- Deployed mission scheduler and worker runtime inside `ping-gateway:repair-cert-20260924`
  (`/app/ping-runtime/orchestration/mission_scheduler.js`, `/app/ping-runtime/workers/worker_runtime.js`)
- Newer `/home/nolan/ping/ping-runtime` checkout (for SOURCE vs DEPLOYED comparison)
- Live journal rows: 3 WORKER_FAILED (dispatcher timeout, honest payloads)
- MC served projection (memory, 2026-09-30): UNCLEAR rendered amber, not green; tenant 403; unknown mission 404

**EVIDENCE:**
1. Owner-level pro-UNKNOWN policy: the journal-schema decision mandates DEFAULT UNKNOWN for
   future writes and forbids backfilling historical absence. Absence is not rewritten as data.
2. The engagement ledger is honest-by-design: no evidence -> the record stays open
   (`record-outcomes`: `else: continue # no evidence: stays open, fail closed`); `refuse`
   blocks UNKNOWN_EXECUTION retries; `reconcile` is deliberate-only; `verify-effect`
   requires a different observer channel; outcome classes include NO_SIGNAL and
   PENDING_WINDOW_OPEN ("honest observations, not failures").
3. `~/workspace/orca-adapter/effect_ledger.js` (2026-09-30): effect_unknown -> FAILED
   promotion happens ONLY on typed definitive failure evidence with cited evidence refs;
   without it the record stays effect_unknown/effect_hold and is never auto-retired.
   A proven pre-effect throw may go FAILED (nothing exists to reconcile); a post-effect
   throw with unknown effect state must HOLD. Its docstring explicitly names the live defect:
   "the Pig chain promotes a bare post-effect throw to FAILED with no effect evidence at
   all, a real defect there."
4. The MC projection (`mission-control/project_ping_action.py`) preserves UNKNOWN:
   `unknown_count` counts literal UNKNOWN answers; `remains_unknown` is a separately
   derived gap list; the projection refuses to render when the ledger trace fails
   ("failing closed; no screen written"). The served surface renders UNCLEAR amber.
5. The newer checkout's mission_scheduler adds DISPATCH_TIMEOUT -> `_reconcileUnknown`
   (HOLD, "a timeout never resolves to FAILED") and a structured dispatch receipt so a
   falsy handler return is UNKNOWN rather than "no worker matched."

**COUNTEREVIDENCE (the DEPLOYED chain, verified inside the live container):**
The deployed `mission_scheduler.js` (image `repair-cert-20260924`, built 2026-09-24,
container created 2026-09-29) does NOT contain the checkout's repairs. Three collapses:
1. **Falsy handler return -> FAILED with a fabricated reason.** Deployed `worker_runtime.js`
   `dispatch()` returns the handler's RAW return value (`lastResult`), not the structured
   receipt. Deployed scheduler: `else if (!dispatchResult)` -> `_failMission("no worker
   matched event_type=...")`. A worker that ran, possibly performed an external effect, and
   returned nothing is failed with the FALSE reason "no worker matched." Absence of a
   return value becomes evidence of absence of routing. (The checkout's own comments
   confirm this was the pre-repair defect: it "narrated EVERY falsy dispatch as 'no worker
   matched' and retried it, fabricating a routing fact.")
2. **Any truthy return -> COMPLETED.** Deployed scheduler: any truthy `dispatchResult`
   without `status === 'failed'` -> `complete()`. The comment claims "complete() only when
   worker returns verified ok"; the code completes on `{}` or `true`. Incomplete evidence
   becomes success.
3. **Any dispatch throw -> FAILED, no post-effect distinction, then retried.**
   `catch (err) { ... await this._failMission(mission, err.message); }`. A throw AFTER an
   external effect is labeled FAILED with no effect evidence, and `_failMission` ->
   `failWithRetry` with `max_attempts: 3, backoff_delay_ms: 5000` retries a possibly-effected
   mission up to 3 times. No DISPATCH_TIMEOUT handling exists in the deployed image.
4. Live corroboration: the 3 WORKER_FAILED journal rows carry honest payloads ("dispatcher
   timeout after 180000ms; no worker output captured; no success fabricated", output: null)
   but the event_type asserts "failed" — the honest payload is wrapped in a failure verdict.

**VERDICT: PARTIAL.** The honest-unknown machinery is real and multi-sited (owner policy,
engagement ledger, orca-adapter derivation, MC projection, newer scheduler checkout). But
the LIVE canonical mission path — the code actually executing inside the deployed gateway —
collapses unknown into failure (falsy return, any throw) and incomplete evidence into
success (any truthy return), with automatic retry of possibly-effected work. PING can tell
the truth about nothing-known everywhere except on the one path that dispatches its
missions.

**SMALLEST CONSEQUENCE:** Any claim about mission outcomes drawn from the live plane
(MISSION_COMPLETED / MISSION_FAILED / WORKER_FAILED event types, mission statuses) must
be read as scheduler-verdict, not world-verdict. In particular, a MISSION_FAILED row whose
payload shows a post-dispatch throw is not evidence the effect did not occur, and a
MISSION_COMPLETED row is not evidence the worker verified anything. The three deployed
branches are named with file and line above; the checkout already contains the repair, so
the consequence is deployment, not design.

**What observation would prove this answer wrong?** A diff of the DEPLOYED image's
`/app/ping-runtime/orchestration/mission_scheduler.js` showing the DISPATCH_TIMEOUT /
`_reconcileUnknown` / HOLD branches and the structured-receipt dispatch present in
`/app` (not merely in the `/home/nolan/ping` checkout). Redeploying the repaired
scheduler falsifies the "live path collapses" half of this verdict.

---

## Q5: Is replay actually reconstruction?

**CURRENT CLAIM:** PING's journal is the canonical record; replaying it reconstructs the
system's state. The Oracle journal was retired 2026-09-30 ~12:52 MDT (Nolan's owner
decision) in favor of the Pig journal as canonical.

**REACHED PATH:**
- Retirement records: `hidden_files/deployment-convergence/OWNER-DECISIONS-2026-09-30.md`,
  `hidden_files/deployment-convergence/ORACLE-RETIREMENT-2026-09-30.md`
- Pig `brain-postgres/ping_runtime.ping_events`: 2580 rows, probed read-only
- Deployed replay code: `/app/ping-runtime/agents/replay_worker.js` (27 lines), REPLAY_COMPLETED
  journal rows (68)
- Live tables: knowledge_nodes (241), knowledge_edges (0), ping_missions (515),
  mission_events (0), canonical_events (0), event_processing (0)
- Qdrant on the Pig: collections constitutional_documents, constitutional_memory, knowledge
- Gateway `/health` (2026-09-30 ~16:05 MDT): overall "unhealthy", event_governance
  "degraded" (total 30717, passed 15381, rejected 1533); `/events/unprocessed` returns 401
  without a bearer token

**EVIDENCE:**
1. Oracle retirement is real and sealed: 2557 rows, md5 digest
   `98e24e0bcebc4a9194d42148695f0e5f`, read-only enforced via
   `ALTER ROLE ping IN DATABASE crx_runtime SET default_transaction_read_only = on`,
   append-only triggers intact. One canonical journal (Pig ping_events) is the live claim.
2. The Pig journal is structurally sound for ordering: 2580 rows; event_id is 64-hex,
   unique, zero nulls, zero duplicates; created_at has zero duplicates (total order in
   practice); timestamp vs created_at differ by >1s in zero rows. `processed=false` on all
   2580 rows.
3. Replay exists and is exercised: 68 REPLAY_COMPLETED rows. Each replays ONE event
   (event_count: 1) through KernelReplayExecutionProvider, verifying determinism
   (fingerprint sha256, witness_root, violation_count 0).
4. Lineage hooks exist: knowledge_nodes (241 rows) carry `source_event_id`, linking derived
   knowledge back to journal events. Event types cover the mission lifecycle
   (MISSION_CREATED 515 -> ASSIGNED 487 -> STARTED 487 -> COMPLETED 484 / FAILED 3),
   plus CLAIM_CREATED 71, OBSERVATION_CREATED 93, WITNESS_CREATED 66, LINEAGE_CREATED 66,
   PROJECTION_CREATED 68. Multiple writer `source` values are recorded per event.
5. The deployed ReplayWorker delegates to ReplayAuthority.replay(transcript_id): replay is
   scoped to a transcript, with canonical-bytes deserialization.

**COUNTEREVIDENCE:**
1. **Replay is per-event verification, not reconstruction.** The deployed ReplayWorker
   replays a single transcript/event and verifies its fingerprint. No code path in the
   deployed image rebuilds system state (knowledge_nodes, Qdrant vectors, mission runtime
   state, `processed` flags, deployment/config state, cron state) from ping_events alone.
   REPLAY_COMPLETED's event_count is 1 in every observed row: the claim proven is "this
   event re-executes deterministically," not "the system can be rebuilt from the journal."
2. **The journal does not contain the system's state.** Qdrant vectors (3 live collections)
   live outside it. knowledge_edges has 0 rows. mission_events, canonical_events, and
   event_processing are all empty tables: named projections with no content. Deployment
   identity, capability wiring, cron state, env secrets, and operator knowledge are nowhere
   in the journal.
3. **Tenant scoping is nearly absent.** 2568/2580 rows carry tenant_id='UNKNOWN' (12 are
   'ping-ops'); namespaces (core::system 2374, tenant::hpp 177, core::owner 21,
   core::knowledge 8) do the scoping work the tenant column does not. A reconstruction
   that trusted tenant_id would misattribute 99.5% of the journal.
4. **The `processed` flag is dead.** All 2580 rows false; the deployed WorkerRuntime polls
   `/events/unprocessed?tenant=UNKNOWN`, which returns 401 without a bearer token, and no
   deployed code path sets the flag. A "replay from unprocessed" consumer would find
   nothing to distinguish.
5. **The retired Oracle journal is only partially sequenced**: max(sequence)=91 across
   2557 rows. Any replay claim over the Oracle history is bounded by that gap.
6. **Live-plane health caveat (2026-09-30 ~16:05 MDT):** the gateway reports overall
   "unhealthy" with event_governance "degraded" (1533 rejected of 30717). Whatever replay
   proves about the past, the present plane is rejecting events at ~5%.

**VERDICT: PARTIAL.** Replay-as-deterministic-verification is PROVEN (68 per-event
replays, fingerprint match, zero violations). Replay-as-reconstruction is NOT-REACHED: no
demonstrated path rebuilds system state from the journal, and large parts of live state
(vectors, edges, deployment/config, tenant attribution) are not in the journal at all.
The journal is a faithful, ordered, identity-stable event record; it is not a system
snapshot.

**SMALLEST CONSEQUENCE:** "Replay" claims must be qualified as per-event re-execution
verification. If everything disposable vanished, the journal restores the ordered event
narrative and the mission lifecycle, but NOT the vector stores, the empty projection
tables' intended contents, deployment wiring, or tenant attribution (tenant_id is
UNKNOWN on 99.5% of rows). The sealed Oracle digest bounds the retired history; its
91/2557 sequence coverage bounds any replay claim over it.

**What observation would prove this answer wrong?** A code path in the deployed image
that rebuilds knowledge_nodes, Qdrant collections, or mission runtime state from
ping_events alone (a bulk replayer/rebuilder, not the single-transcript ReplayWorker),
or a demonstrated drill in which disposable state was deleted and restored from the
journal.

---

## Q6: Where does human authority actually enter the machine?

**CURRENT CLAIM:** Human authority enters through a digest-bound approval primitive:
a proposal is hashed, a human approves the exact digest, silence is never approval, and
every step is journaled.

**REACHED PATH:**
- `~/workspace/mission-control/approval_request.py`, `approval_cli.py`, `proposal_record.py`
- `~/workspace/fyd-journal-gateway/events.jsonl` (63 lines) for MC_APPROVAL_* events
- `~/workspace/outreach/AUTHORITY.json` + `~/workspace/outreach/authority-check.py` (the
  real gate for external effects)
- Journal MC_MISSION_AUTHORIZED rows (authorizer field)
- MC projection `mission-control/ping-action-8cfeddea8fee41e598630b2c36330f22.json`
  (`remains_unknown` list)

**EVIDENCE:**
1. The ApprovalRequest primitive is well-designed: digest-bound approval (sha256 of
   canonicalized proposal bytes), WAITING_APPROVAL -> APPROVED only on exact-digest match,
   "SILENCE IS NEVER APPROVAL" (no expiry path approves), server-controlled ApprovalStore,
   MC_APPROVAL_* journal events. It is tested.
2. A second, older human-authority record exists in memory: MC served approval for
   Coppersmith (Nolan's one-line approvals on FYD proposals) — the FYD/MC plane has a
   genuine human-approval moment in its history.

**COUNTEREVIDENCE:**
1. **The approval primitive has zero production uses.** Zero WAITING_APPROVAL records in
   any workspace JSON file; zero MC_APPROVAL_* events in the MC journal (63 lines,
   checked). `approval_cli.py decide` defaults `--approver` to `"nolan:demo-owner"`.
   The digest-bound path is designed, tested, and unused.
2. **The real human-authority path for external effects is AUTHORITY.json**, a prose file:
   owner/operator-write-only, consumed by `authority-check.py` as the gate for engagement
   passes. Its `set_by` fields are free-text prose ("Nolan Geske (2026-09-29 ~05:13 MDT
   'open insta')", "Pigi (operator correction)"), self-attested by whoever edits the file.
   No proposal object, no digest, no signature, no tenant field, `window: null` everywhere
   (no expiration modeled). The file is currently modified in the working tree,
   uncommitted (git log last commit `e93a1ae` 2026-09-29): the live authority state and
   the committed authority state differ.
3. **MC_MISSION_AUTHORIZED's recorded authorizer is a code path, not Nolan**:
   `MissionScheduler._authorizeDispatch (Lane AG eab4f714a)`. Human authority is not in
   the machine there; a scheduler method authorized the dispatch.
4. The MC projection of the traced Q3 intent explicitly lists in `remains_unknown`: "a
   per-action authorization receipt." The machine's own projection admits the gap.
5. Standing volumes (e.g., Facebook 75 likes + 20 comments) are prose in AUTHORITY.json
   and Nolan's directives; there is no machine-checkable binding from "Nolan decided X"
   to "pass Y executed under decision X" except the pass log's printed gate verdict,
   which is not bound to intent IDs (Q3 collapse 3).

**VERDICT: PARTIAL.** The entry points are identified and a genuine digest-bound approval
primitive exists (proven by design and test, plus the historical MC served approvals).
But in production, human authority for external effects enters through a self-attested
prose file (AUTHORITY.json, uncommitted edits live in the working tree) and through
operator shell actions, with no proposal object, no digest binding, no per-action
receipt, and no expiration. The machine cannot distinguish "Nolan decided this" from
"someone with file access wrote that Nolan decided this."

**SMALLEST CONSEQUENCE:** Today, production human authority = whoever can edit
AUTHORITY.json. Any audit claim of the form "Nolan authorized this external effect" is
unverifiable beyond the prose `set_by` field. The digest-bound primitive (zero uses)
cannot be cited as the authority story until a production approval flows through it.
Committing the working-tree AUTHORITY.json changes (or reverting them) is the smallest
step that would make the live authority state attributable at all.

**What observation would prove this answer wrong?** A single WAITING_APPROVAL ->
APPROVED record with a matching proposal digest and a corresponding MC_APPROVAL_GRANTED
event in a production journal, or a per-action authorization receipt binding an
AUTHORITY.json decision to the intent IDs it authorized. Either would show the
digest-bound path is the real entry point, not the prose file.

---

## Cross-question notes

1. **SOURCE TRUTH vs DEPLOYED TRUTH (Q4, Q5):** The `/home/nolan/ping` checkout contains
   genuine repairs (structured dispatch receipt, DISPATCH_TIMEOUT -> HOLD, explicit
   NO_MATCH) that are ABSENT from the deployed image `ping-gateway:repair-cert-20260924`.
   Any claim citing checkout code as current behavior is false until redeployed. This is
   the same class of error as citing repo state for served state.
2. **The 1/3064 verification rate (Q3) and the deployed scheduler collapses (Q4) are the
   same wound in two places:** the system records worker claims at scale and verifies
   world-change almost never, while its live dispatcher converts ambiguous worker
   behavior into certain verdicts.
3. **UNKNOWN is a protected value in policy and a collapsed value in the live path
   (Q4):** Nolan's owner decisions protect UNKNOWN; the deployed mission scheduler
   destroys it. Policy and plane disagree.
4. **Live-plane health (2026-09-30 ~16:05 MDT):** gateway `/health` reports overall
   "unhealthy", event_governance "degraded" (15381 passed / 1533 rejected / 30717 total).
   This bounds every claim about what the live plane is doing right now. It was observed,
   not diagnosed; no action taken (reader posture).
5. **No new authorities, stores, writers, coordinators, or registries were proposed or
   created in this investigation.** All findings are readings of existing code, data, and
   live state.

## Files and commands referenced (evidence anchors)

- `~/workspace/outreach/action-intent-ledger.py`, `action-intent-ledger.jsonl`,
  `action-truth.jsonl`, `authority-check.py`, `AUTHORITY.json`, `engagement-guard.py`
- `~/workspace/pig-fb/run_pass.sh`
- `~/workspace/mission-control/approval_request.py`, `approval_cli.py`,
  `proposal_record.py`, `project_ping_action.py`,
  `ping-action-8cfeddea8fee41e598630b2c36330f22.json`
- `~/workspace/fyd-journal-gateway/events.jsonl`
- `~/workspace/orca-adapter/effect_ledger.js`, `outcomes.js`
- `~/workspace/goals/ping-agent-execution-stack/hidden_files/deployment-convergence/OWNER-DECISIONS-2026-09-30.md`
- `~/workspace/goals/ping-agent-execution-stack/hidden_files/deployment-convergence/ORACLE-RETIREMENT-2026-09-30.md`
- Pig container (read-only): `brain-postgres/ping_runtime.ping_events` (2580 rows),
  `knowledge_nodes` (241), `knowledge_edges` (0), `ping_missions` (515),
  `mission_events`/`canonical_events`/`event_processing` (0 each); Qdrant collections
  constitutional_documents, constitutional_memory, knowledge
- Deployed image `ping-gateway:repair-cert-20260924`:
  `/app/ping-runtime/orchestration/mission_scheduler.js`,
  `/app/ping-runtime/workers/worker_runtime.js`,
  `/app/ping-runtime/agents/replay_worker.js`
- Checkout (not deployed): `/home/nolan/ping/ping-runtime/orchestration/mission_scheduler.js`,
  `/home/nolan/ping/ping-runtime/workers/worker_runtime.js`
- Scratch probes: `/tmp/pig_journal_probe*.py` (Pig), `/tmp/pig_journal_probe4.py` (local)
