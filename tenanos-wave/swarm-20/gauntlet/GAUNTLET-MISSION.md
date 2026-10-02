# GAUNTLET-MISSION.md — SWARM-20 Autonomy Gauntlet

The end-to-end adversarial proving ground for the autonomous tenant loop:

```
TENANT INTENT -> MISSION -> DURABLE RUN -> MEMORY RETRIEVAL (permitted) ->
CONTEXT -> PLAN (bounded) -> CAPABILITY DECISION -> MCP/TOOL EXECUTION ->
RESULT -> VERIFY -> CHECKPOINT -> MEMORY CANDIDATE (justified) ->
MISSION CONTROL (snapshot) -> NEXT TASK -> CLOSE
```

The harness (`mission.js`) exercises the REAL PING contract modules
(byte-exact pinned copies under `vendor-pinned/`, see its PROVENANCE.md):
`external_agent_adapter` (authorize/issue/verify/record),
`orca_policy` (classifyDelegation/classifyRetry/classifyResultAcceptance),
`recovery_decisions` (decideRecovery), `orca_status_model` (OrcaStatusLedger).
Synthetic doubles live in `lib/harness.js` (event runtime with logical_id
dedup, tenant-scoped memory store, in-harness MCP registry, durable
objective/work-order store with lockfile coordinator lease). They are TEST
DOUBLES, not authorities, and must never be promoted to the repo as such.

Dispatch transport substitution: authorization names agentId `hermes` (LIVE
profile, real gate), but the dispatcher spawns the SYNTHETIC worker stub
(`lib/worker.js`). Recorded in evidence as `transport_substituted:
'synthetic-harness'`. Never touches the live Pig worker path, the repo, or
live Postgres.

## Exit codes (mirror orca_control_loop.js)

| Code | Meaning |
|---|---|
| 0 | closed (or restart rediscovery: objective already COMPLETED, no fresh work) |
| 2 | fatal (unexpected exception; `99-fatal.json`) |
| 3 | escalated (`99-escalate.json`; includes RECONCILIATION_REQUIRED) |
| 4 | cancelled (durable cancellation marker; no new work) |
| 5 | coordinator-lease contention (another live holder; this process exits) |

## Environment

| Var | Required | Default | Meaning |
|---|---|---|---|
| GAUNTLET_EVIDENCE_DIR | yes | — | Run evidence dir (created if missing). The durable store: restart replays from here. |
| GAUNTLET_DATA_ROOT | no | `<EVIDENCE_DIR>/data` | Objective/work-order durable store root. |
| GAUNTLET_TENANT | no | `gauntlet-tenant-01` | Tenant identity; namespaces work as `tenant::<id>`. |
| GAUNTLET_REQUEST_TENANT | no | = GAUNTLET_TENANT | Tenant whose memories are requested (cross-tenant attack sets this differently). |
| GAUNTLET_OBJECTIVE | no | synthetic default | Objective text. Identity is derived from intent alone (sha256 of namespace+text+constraints): same text => same objective id across restarts. |
| GAUNTLET_FAULT | no | `honest` | Worker fault: `honest` \| `crash` \| `slow` \| `malformed` \| `wrong-agent` \| `effect-then-timeout`. |
| GAUNTLET_MCP_MODE | no | `normal` | `normal` \| `removed` \| `malformed-result`. |
| GAUNTLET_MEMORY_MODE | no | `normal` | `normal` \| `stale` \| `contradictory` \| `cross-tenant`. |
| GAUNTLET_CAPABILITY_REVOKED | no | — | If set to the capability in play (`text.transform`), the pre-check denies authorization (mid-run revocation attack). |
| GAUNTLET_MAX_WORK_ORDERS | no | `2` | Durable run budget (restart cannot reset consumption). |
| GAUNTLET_MAX_ATTEMPTS | no | `2` | Per-work-order retry budget. |
| GAUNTLET_DISPATCH_TIMEOUT_MS | no | `12000` | Dispatcher watchdog per attempt. |
| GAUNTLET_SELF_TEST_DEDUP | no | `0` | `1` re-records a verified result and asserts `deduplicated=true`. |
| GAUNTLET_RUN_ID | no | `run-<ts36>` | Correlation id stamped on work orders and evidence. Set explicitly for reproducible runs. |
| GAUNTLET_ADAPTER_ROOT | no | `vendor-pinned/` | Override the pinned-module root (read-only; never a write path). Must keep the same relative layout. |

`GAUNTLET_EFFECT_DIR` is set internally by mission.js (= evidence dir); the
worker writes `side-effect-<issued-work-order-id>.marker` there in
`effect-then-timeout` mode. The harness checks the marker under the ISSUED
(adapter) work-order id, not the durable id — the two identities differ by
design (durable id wins for restart rediscovery).

## Running

```bash
# honest baseline
GAUNTLET_EVIDENCE_DIR=$PWD/evidence/run-honest GAUNTLET_RUN_ID=my-run-001 node mission.js; echo $?

# full adversarial matrix (14 scenarios, ~3 min; each attack gets a fresh tenant)
./run-attacks.sh
```

## Reproducibility contract

1. Same `GAUNTLET_OBJECTIVE` + tenant + constraints => same objective id,
   work-order ids, event ids (all sha256-derived). Verified: honest runs
   001/002 derive `342242a18e4d`.
2. Restart after CLOSE: objective is COMPLETED; the run issues nothing and
   exits 0 (proven 2026-09-24).
3. Vendor pins are hash-verified against PROVENANCE.md before any run that
   claims production relevance: `sha256sum -c` the table (all 14 files).
4. Evidence is the proof: `99-close.json` / `99-escalate.json`,
   `verify-*.json`, `reconcile-required.json`, `memory-denied.json`,
   `context-pack.json`, `result-*-dedup-check.json`.
