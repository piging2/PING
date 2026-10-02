# TASK D: T-15/J-16 Envelope Comparison + T-11 Decision-Record Round-Trip

Date: 2026-09-28 ~19:30-20:45 MDT. Lane: read-only falsification/observation.
No product tree was modified. All commands below are reads or pure-function calls.

## VERDICT

**T-15 (7-envelope inventory): COMPLETE.** All 7 ResultEnvelope/WorkOrder shapes
located with file:line, owning lane/branch, and producing/consuming paths.
E1 is the only live implementation; E2/E3/E4/E5/E6 are docs, copies, or
harvested specs; E7 is a proposed spec, not implemented.

**J-16 (well-formed-lie test): GAP CONFIRMED, reproduced.** A structurally valid
8-field result envelope claiming `completed` while its output answers a
different objective verifies `valid=true` through `verifyResultEnvelope`.
Structural validity and semantic verification are fully separated in the
current code: the verifier never reads output content, never sees the work
order's input, and mints the same `result_id` for the lie and the honest
result. E7's spec, desk-checked, would not catch the lie either.

**T-11 (15-record round-trip through 4 shapes): MEASURED, no shape is
lossless.** 9 of 15 records fail strict validation under Shape A (the only
shape with a fail-closed validator); Shapes B/C/D accept everything but do so
by silent invention, not by representation. Measurements only; no winner
selected (coordinator decides).

---

## T-15: The 7 envelope shapes

| ID | Shape | Location (file:line) | Owning lane / branch | Produced by | Consumed by |
|---|---|---|---|---|---|
| E1 | Live WorkOrder (14 required + optional causation_id) in / 8-field ResultEnvelope out; structural echo-binding | `~/workspace/orca-adapter/vendor/external_agent_adapter.js` (local mirror of Pig `/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js`): `authorizeWorkOrder` :192, `issueWorkOrder` :233, `resultIdentity` :295, `verifyResultEnvelope` :313, `recordVerifiedResult` :374; dispatch path in `~/workspace/orca-adapter/adapter.js`: `extractEnvelope` :649, `dispatchExecution` :1202 | Orca dispatch plane (Pig, live) | `dispatchExecution` (adapter.js:1202) calls `vendor.issueWorkOrder` (:1298); worker stdout captured | `extractEnvelope` brace-match (:1405) -> `vendor.verifyResultEnvelope` (:1464) -> `vendor.recordVerifiedResult` (:1491) -> canonical `WORKER_COMPLETED`/`WORKER_FAILED` events via UnifiedEventRuntime |
| E2 | Authority doc: human-readable contract, v1.0.0-draft 2026-09-18 | `~/workspace/multi-runtime-workorder-contract.md` (mirror of `/home/nolan/workspace/multi-runtime-workorder-contract.md`) | Contract doc (lane-authored) | Authored 2026-09-18; mirrors proven 2026-09-16/17 adapter | Read as the contract reference; states closed envelopes (`additionalProperties: false`), 14 required WorkOrder fields, 8-field result, evidence open object |
| E3 | Reference implementation copy | `~/workspace/orca-workstream-d/external_agent_adapter.js` (`issueWorkOrder` :212, `verifyResultEnvelope` :292) + `AGENT_PROFILES.md` + `validate_dispatcher_profiles.js` | Reference copy, 2026-09-18 | Copied as reference | Not on any live path; md5 differs from E1 (c9fa9dc9 vs bc72a7bc), same function names, older profile set |
| E4 | Harvested execution contract: WorkOrder/Attempt/ResultEnvelope incl. state machines and falsifications F1/F4/F5 | `~/workspace/convergence/workorder-attempt-result-contract-2026-09-18.md` | AGENT F read-only harvest | Harvested 2026-09-18 from ping-codex-convergence, ping-harvest-12h, orca-autonomy, constitutional-convergence worktrees | Proposed contract; carries the Attempt lifecycle (DISPATCHING > TRANSPORT_SETTLED > ENVELOPE_EXTRACTED > OUTCOME) and the unit lifecycle transition guards |
| E5 | Outcome vocabulary: OUTCOME {completed, failed, unknown, denied, escalated} x EFFECT_STATE {effect_unknown, effect_hold, effect_none} | `~/workspace/orca-adapter/outcomes.js` (126 lines; `OUTCOME` :47, `EFFECT_STATE` :55; mirror of Pig copy) | Orca adapter (live code) | `outcomes.js` | `recordVerifiedResult` carries `effectState` metadata (default `effect_unknown`); MC attention queue outcome rendering |
| E6 | Unit lifecycle: PLANNED > AUTHORIZED > QUEUED > RUNNING > EVIDENCE_PENDING > VERIFIED > CLOSED (+ BLOCKED/FAILED/VERIFICATION_FAILED side exits) | `~/workspace/tenanos-wave/swarm-20/reference/orca_status_model.js` (:33-45 states; harvested via E4 into `workorder-attempt-result-contract-2026-09-18.md` section 1D) | orca control-loop (harvested) | `orca_status_model.js` | Adopted as spec in E4; each transition names a required evidence artifact and via-function |
| E7 | Proposed unified WorkOrder spec: 19 WorkOrder fields (incl. executor_binding nonce, executor_selection, authority_posture, reconciliation) + 10 result fields; NOT implemented | `~/workspace/ping-24h/lanes/lane14-worker-contract/report.md` section 3 (3.1 envelope fields, 3.2 result fields, 3.3 eight invariants) | Lane 14 (specification only) | Nobody | Nobody; spec only |

Notes:
- The "14-field" WorkOrder count is 14 required + optional `causation_id`; the
  observed `issueWorkOrder` return has 15 keys including `causation_id: null`.
  The 8-field result envelope is exactly
  `work_order_id, context_pack_id, agent_id, capability, status, output, evidence, error`.
- `evidence` is an OPEN object in every shape (E1 code, E2 doc, E4 harvest);
  `output` is worker-asserted `any` in every shape. No shape binds output
  content to the objective.
- Prior art searched before concluding: forest inventory
  `~/workspace/ping-24h/forest-convergence/CLASSIFICATION.md`, semantic asset
  register `~/workspace/ping-24h/prelaunch/02-SEMANTIC-ASSET-REGISTER.md`
  (sections 7, 8, 24, 27), do-not-reimplement register
  `~/workspace/ping-24h/prelaunch/03-DO-NOT-REIMPLEMENT-REGISTER.md` (#11),
  lane 14 report, lane B5 report, workers-learning lane
  (`~/workspace/ping-24h/jev-refactor/lanes/workers-learning.md` lines 19-31).

## J-16: well-formed-lie test

### The lie (located, not constructed)

`~/workspace/ping-24h/lanes/laneB5-worker-replaceability/raw/envelope-a-lie-objective.json`:
the issued work order asked `text.transform` / `reverse_words` on
"alpha bravo charlie delta". The envelope echoes all identity fields exactly,
claims `status: "completed"`, and carries
`output: {"poem": "roses are red, violets are blue"}`. All 8 fields present,
well-typed, echoes exact, evidence a well-formed object.

### Reproduce (this lane, read-only pure-function call)

Command: `node` heredoc requiring only
`/home/hatch/workspace/orca-adapter/vendor/external_agent_adapter.js` (local
mirror), calling `issueWorkOrder` (pure) then `verifyResultEnvelope` (pure).
No dispatch, no event runtime, no network, no writes.

Result:
- Lie envelope -> `{valid: true, reason: none, retryable: false}`
- Honest envelope (same identity fields, correct reversed output) -> `{valid: true}`
- `result_id` identical for lie and honest (`result_id` binds only
  work-order identity fields: work_order_id, mission_id, task_id, attempt,
  agent_id, capability, context_pack_id, namespace; result content is not an
  input to `resultIdentity`)

### Structural validity vs semantic verification (kept separate)

STRUCTURAL VALIDITY (what `verifyResultEnvelope` checks, all passing on the
lie): 8 fields present; `work_order_id`/`context_pack_id`/`agent_id`/`capability`
exact string echoes of the issued order; three-way agent binding
(authorized == invoked == result agent); `status` in {completed, failed};
completed => output non-null and error null; `evidence` is an object;
`verifiedAt` ISO and <= deadline. The lie passes every one.

SEMANTIC VERIFICATION (what nothing checks): output content is never read;
the work order's `input` (the actual objective) is not even an argument to
`verifyResultEnvelope`; evidence content is never validated (lane B5 V5:
impossible timestamps verify valid; V6: self-approval claim verifies valid;
V12: budget-expansion claim verifies valid). Corroborating prior execution:
lane B5's battery against the live Pig adapter file
(`raw/b5-battery.out`) shows V4 objective-rewrite -> valid=true, as expected
by that lane's own gap hypothesis.

### Desk-check: J-16 through E7

E7 section 3.2 keeps `output: any | null (Worker)` and
`evidence: object (open); Worker reports; PING treats as claim, never truth`.
Its eight invariants (3.3) add executor_nonce binding (closes the G-3
self-report misattribution class), per-order executor_selection, and
authority_posture, but no invariant inspects output content or binds output
to the objective. Verdict: E7 as specified would also verify the lie valid.
The lie-catching machinery (D-08 worker-result usefulness judge, advisory
shadow) is the named missing behavior in the asset register, not part of E7.

### J-16 verdict

CONFIRMED: `verifyResultEnvelope` is a structural echo-binding check only.
A well-formed lie passes. Objective fidelity is unfenced in E1 and would
remain unfenced under E7 as specified.

---

## T-11: decision-record round-trip measurements

### The 15 records (located)

- 9 records: `~/workspace/fyd-intel/jev-decisions.jsonl` (8 `choice`, 1 `noul`;
  16 top-level fields; raw Typesafe API log; `state_sha256` is full 64-hex;
  `instructions` carries the RAW prompt; one record has null
  provider/request_id).
- 6 samples: `~/workspace/ping-decision-seam/shadow-decisions-2026-09-28.json`
  (S1-S6, contract `mc.authorize_work_order/v1`; per-sample fields: id,
  current, current_reason, evidence_digest, input_digest, p_grant,
  shadow_http, shadow_latency_ms; digests are 16-hex truncated; no per-sample
  ts/tokens/cost; file-level calibration block with Brier 0.0076).

### The 4 candidate shapes

- **A**: `jev/shadow-recorder` branch, `fyd-intel/shadow_record.py`,
  schema `jev-shadow/v1`: 34 required fields, fail-closed validator (rejects
  unknown fields, non-SHADOW mode, decision_class outside the bounded 8-class
  set). Read via `git show jev/shadow-recorder:fyd-intel/shadow_record.py`
  in `/home/hatch/workspace`. Plus 3 demo records in
  `fyd-intel/jev-shadow-records.jsonl` on the same branch.
- **B**: `JEV_DECISION_EVALUATED` event_data v1 (design),
  `~/workspace/ping-24h/jev-autonomy/lanes/decision-records/report.md`
  section 1.3. No validator exists (design only).
- **C**: implicit schema of `jev-decisions.jsonl` (the 9 raw records).
- **D**: implicit schema of `shadow-decisions-2026-09-28.json` (the 6 samples).

Method: explicit desk mapping tables per shape (auditable in
`/tmp/t11_roundtrip.py`), encode all 15 records into each shape, decode back,
count fates. Fate codes: LOST (no counterpart), COERCED (value transformed),
INVENTED (target-only field needed for validity), N (nullable-allowed).

### Measurements table

| Shape | LOST FIELDS (union over 15 records) | COERCED FIELDS | UNREPRESENTABLE SEMANTICS | IDENTITY STABILITY | REPLAY STABILITY |
|---|---|---|---|---|---|
| A (jev-shadow/v1) | From C: `decision_type` label, `instructions` raw prompt, original `state_sha256`, `status` PASS gate. From D: sample ids S1-S6, `input_digest`/`evidence_digest` (16-hex, cannot expand to sha256), `shadow_http`, calibration block, `contract_version`, input/output tokens and cost_usd | `typed_answer` for the noul record (a probability, not a selection); `current` GRANT/DENY case; `shadow_latency_ms` to `latency_ms`; file `generated_at` to per-sample `ts` | 9 of 15 records FAIL strict validation: 3 of 9 C (fruit toy, noul probe, hyphenated `task-class-q1` match no class in the bounded 8) and 6 of 6 D (`authorize_work_order` is not in the bounded class set; validator fail-closes). A's `state_summary` is required free text, so hash-only records cannot validate without inventing a summary | `record_id` = `jev-shadow-` + sha256(version\|class\|question\|state_digest\|request_id)[0:16]: deterministic within one encoder; distinct Jev calls correctly distinguished via request_id; UNSTABLE across encoders because state_digest derives from the invented state_summary | Byte-deterministic given identical inputs (`json.dumps(sort_keys=True)` on append): STABLE |
| B (JEV_DECISION_EVALUATED v1) | `question_id`, `request_id`, `instructions` raw prompt (by design: digest only), `decision_type`, `status`, `why` (no rationale in C), `evidence_refs` (D's digests are not refs), sample ids, `shadow_http`, calibration block, `contract_version`; `candidates` for the noul record | `input_digest` (`sha256:` prefix reshape), `prompt_digest` (computed; raw dropped), `cost` (flat fields to object), `model` (provider-only for D), `selection` (case), `candidates` (reconstructed from probability keys for C) | 1 of 9 C (noul: a probability is not a `selection`) and 6 of 6 D need invention for core fields (candidates, confidence, threshold, decision_unit, domain, outcome). Nothing fail-closes (no validator), so unrepresentable becomes silently invented rather than rejected | `event_id` includes `ts`: re-emission at a new timestamp mints a NEW id for the same logical decision. UNSTABLE across time. Question identity lost (no `question_id` field) | No canonical serialization specified; ts-dependent identity: CONDITIONAL |
| C (jev-decisions.jsonl) | Identity for C (9/9 lossless). D to C loses: `current`/`current_reason`/`p_grant` semantics (C has no authorization/policy/outcome fields at all), calibration block, `contract_version`, sample ids; `state_sha256` unrecoverable from 16-hex truncated digests; `instructions` absent in D | D to C: `shadow_latency_ms` to `latency_ms`; reconstructed `probabilities`/`confidence` | D's authorize/deny semantics have no home in a Jev API log shape: 6 of 6 D records need invented question/answer scaffolding | `request_id` provider-opaque; stable as stored; new runs mint new ids: STABLE-as-stored | STABLE as stored (raw log) |
| D (shadow-decisions file) | Identity for D (6/6 lossless). C to D loses: `instructions`, `state_sha256` (64-hex to 16-hex truncation is lossy), `question_id`, `request_id`, token counts, cost, model versions; D has no per-sample ts, no typed-answer field, no rationale beyond current_reason | C to D: `latency_ms` to `shadow_latency_ms`; invented S-labels; `p_grant` from choice probability | C's Jev choice/noul semantics squeezed into an authorize_work_order GRANT/DENY frame: 9 of 9 C records need invented policy scaffolding | S1-S6 sequential labels; regeneration in different order renames records: UNSTABLE | STABLE as stored (hand-built) |

### Decode-back (reverse direction) losses, per shape

- A to C: raw prompt permanently lost (only `prompt_sha256` of the invented
  decision_schema survives); original `state_sha256` lost (recomputed from
  invented summary). Decode is lossy BY DESIGN (Batch-6: no raw prompts in
  canonical records).
- A to D: sample ids, 16-hex digests, `shadow_http`, calibration block lost.
- B to C: raw prompt, `question_id`, `request_id` lost; `state_sha256`
  recoverable (strip prefix).
- B to D: sample ids, `shadow_http`, calibration block lost.
- C to C, D to D: lossless (identity baseline).

### T-11 hostile tests (from the task definition)

1. Record with tenant identity in Jev state (must be excluded): none of the
   15 records carry tenant identity (verified by inspection: instructions are
   generic toy prompts; D records are digests plus GRANT/DENY). Shape A
   accepts free-text `state_summary` with NO tenant-exclusion check in
   `validate_record`: permissive, relies on producer discipline. Shape B
   stores digests only: structurally excludes raw identity.
2. Record with hash-only canonical refs (must pass): C records are hash-only
   for state. Shape A REQUIRES `state_summary` (non-nullable free text): a
   hash-only record cannot validate without inventing a summary. Shape B
   accepts `input_digest` hash-only: passes.

### MC projection query support (from T-11 TEST)

Decisions by authority: A has `policy_decided_by` (yes); B has
`escalated_to`/`result_ref` (partial); C none; D file-level
`current_decision_fn` only. Verification trail: A has the
`verified_outcome`/`verified_ts`/`outcome_source` triple (yes); B/C/D none
(D has aggregate calibration only, not per-record). Reconciliation-required:
none of the 4 shapes represent it.

### T-11 verdict

MEASURED. No shape round-trips all 15 records losslessly. Shape A is the only
shape with a fail-closed validator, which makes its 9-of-15 strict-validation
failures explicit instead of silent; Shapes B/C/D absorb the same records
only through invention. Selection is the coordinator's call; the measurements
above are the input.

---

## Caveats

- The canonical tree `/home/nolan/projects/ping` and the Pig paths
  (`/home/nolan/workspace/...`) are not reachable from this VM; Pig-side
  file:line citations are quoted from lane reports that read them on the Pig
  (lane 14 raw/ping-adapter-notes.md, lane B5 raw/b5-battery.out). The J-16
  reproduce ran against the local mirror
  `~/workspace/orca-adapter/vendor/external_agent_adapter.js`, whose
  `verifyResultEnvelope` (:313) was read in full and matches the behavior
  lane B5 measured against the Pig file.
- E7 exists only as the lane 14 spec; the "J-16 through E7" result is a desk
  check, marked as such.
- T-11 mappings are desk judgments encoded in `/tmp/t11_roundtrip.py`;
  a different mapper could assign different `decision_class` values or
  different invention defaults, which would move counts between
  LOST/COERCED/INVENTED. The fail-closed rejections (Shape A) are not
  mapper-dependent; the silent inventions (Shapes B/C/D) are.
- No em dashes were used in this report.
