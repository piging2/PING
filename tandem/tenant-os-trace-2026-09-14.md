# Tenant OS Trace — 2026-09-14

Live trace of one tenant-scoped path through the PING gateway, read-only,
against the production Postgres (`ping-postgres`) and the gateway's public
routes. Every claim cites a table, route, or row count observed today.

Traced path:
`tenant context → authority → canonical events → projections → capability decisions`

## 1. Tenant context

- `tenant_registry`: exactly 1 row. `audit63` / "Ledger63 Falsification Tenant",
  source `ledger63-verify`, created 2026-09-01, status active. This is an
  audit/falsification artifact, not a real business tenant.
- `deployment_registry`: 0 rows. `runtime_registry`: 0 rows.
- The gateway's own `/constitution` (public GET, read 2026-09-14) lists
  `tenantRegistry`, `deploymentRegistry`, `runtimeRegistry` as generated
  authorities with `generated_runtime_authoritative: true`. The contracts
  exist; no tenant is deployed under them.

Verdict: tenant context exists as schema and generated contracts only.
There is no production tenant.

## 2. Authority

- `exterior_agent_credentials`: 2 active agents: `muse` ("Muse Level 1
  (Observe)") and `muse-level-2` ("Muse Level 2 (Workspace Write)").
- The auth middleware resolves Bearer key to `agent_id` and the gateway
  stamps `source=api:<agentId>` on persisted events. Verified in
  `ping_events`: 12 `api:muse` rows, all `OBSERVATION_CREATED` /
  `DOCUMENT_OBSERVED`, including today's B events `874da5ee...` and
  `2fd53ac8...`.
- `capability_requests`: 17 rows (2026-09-11/12) proving real authorization
  decisions with durable audit: `fs.read` of `secrets/api-key.txt`, `.env`,
  `../etc/passwd` were DENIED by policy (workspace boundary / secrets
  pattern) for agent `muse`; `fs.list`, `knowledge.search`, `event.search`
  were granted. `event.search` returned real results (1583 events).
- `agent_workspaces`: `muse` and `muse-level-2` both scoped to
  `/app/workspace/muse` (volume `muse-workspace`).

Verdict: the authority boundary is REAL and demonstrated. It is scoped to
agents and workspaces, not to tenants. Dormant since 2026-09-12 (no
capability has been requested in 2 days); dormancy is expected, not a
failure.

## 3. Canonical events (the broken link)

- `canonical_events`: 0 rows. The table has `tenant_id NOT NULL` and a
  per-tenant `(tenant_id, sequence)` unique constraint, plus
  causation/correlation columns and worker/retry fields. Schema only.
- `ping_bridge_cursors`: 0 rows. No recorded bridge progress.
- The claimed EventBridge drain (`canonical_events` to `ping_events`,
  5s poll, zero errors) has no runtime evidence: nothing has ever been
  written to `canonical_events`, so there is nothing to drain and no
  cursor to advance.

Verdict: the tenant event path does not exist in runtime terms. PING
Social's real flow bypasses it entirely and writes `ping_events` directly
via POST /events (1983 rows). This is not a regression; the bridge was
never exercised.

## 4. Projections

- `projection_checkpoints`: 0 rows. `projection_versions`: 0 rows.
- `ping_missions`: 384 rows, all derived by the internal
  `event-to-mission-bridge` from events (mission types `LINEAGE_CREATE`,
  `WITNESS_CREATE`, `REPLAY_VERIFY`, ...), with the latest completing
  2026-09-14 17:33:48 UTC today. Durations are seconds; statuses are
  `completed` with result payloads.
- `ping_events` carries 64 `PROJECTION_CREATED` events plus 55 each of
  `REPLAY_COMPLETED`, `WITNESS_CREATED`, `LINEAGE_CREATED`.

Verdict: projection-as-checkpointed-state is schema-only. Projection as
event-to-mission derivation is LIVE and current. Projection correctness is
partially demonstrated (missions complete with results); replay-from-a-
projection checkpoint is not demonstrated anywhere.

## 5. Capability decisions

- `capability_registry` (DB): 0 rows.
- `/constitution` reports `capability_resolver` with 45 capabilities
  loaded from the generated runtime, and
  `handwritten_registries_remaining: []`. The capability model lives in
  the gateway runtime, not in the database.
- No reachable route exposes the 45 capabilities: `/capabilities` 404,
  `/capability-registry` 404, `/governance` 404 (all probed 2026-09-14,
  with and without the L1 Bearer key). `GET /events` works with L1.
- Demonstrated defect (reported, not patched): every `fs.list` row in
  `capability_requests` shows `CAPABILITY_EXECUTION_ERROR` ("The path
  argument must be of type string... Received undefined"). The `fs.list`
  capability authorizes but never successfully executes. Fixing it means
  rebuilding the gateway image, which needs Nolan's authorization, so it
  is recorded here as a finding.

Verdict: a fresh orchestrator CANNOT choose a gateway capability from
durable artifacts today. The registry is empty in the DB, the resolver's
45 capabilities are not queryable, and the last capability decision
evidence is 2 days old. The workspace-side `pig-capabilities.json`
(8 Pig-substrate capabilities, contract-tested) remains the only
machine-readable capability index.

## 6. Tenant isolation

- `ping_events.namespace`: `core::system` (1685), `core::owner` (194),
  `tenant::hpp` (99), `test::under` (5). Namespaces are labels on rows.
- `ping_events` has no `tenant_id` column; metadata carries no tenant key.
- `tenant::hpp` rows are E2E test artifacts (sources `e2e-test-live`,
  `smoke_test`, `e2e_falsification_61`, plus an 11-event
  observation-to-lineage burst from 2026-09-11).
- No denied cross-namespace request exists in `capability_requests`; the
  requests are scoped to agent workspace and fs policy, not to
  namespaces or tenants.

Verdict: tenant isolation is NOT demonstrated. The real enforced
isolation is agent-workspace scoping on filesystem capabilities
(DENIED rows prove it). Event namespaces are unenforced labels.

## 7. Replay behavior

- `REPLAY_COMPLETED` (55), `WITNESS_CREATED` (55), `LINEAGE_CREATED`
  (55) bursts on 2026-08-20 and 2026-09-11, plus live `REPLAY_VERIFY`
  missions completing today. Causation/correlation indexes exist on
  `ping_events` and are populated (e.g. today's mission events carry
  correlation ids).

Verdict: partially demonstrated. Replay machinery has run and causal
lineage is queryable; deterministic replay from a projection checkpoint
is not demonstrated.

## 8. Fresh-agent reconstruction

From durable artifacts alone a fresh agent can recover: the full event
history (`ping_events`), causal lineage (causation/correlation indexes),
derived missions (`ping_missions`), and past authorization decisions
(`capability_requests`). It cannot recover: which tenant an event
belongs to (no tenant key on events), the 45 gateway capabilities (not
exposed), or the EventBridge state (no cursors, no canonical events).

## Patch decision

No gateway patch was made. The broken link (`canonical_events` /
EventBridge) is unused by design: the production flow writes
`ping_events` directly and reconciles against it. Building the bridge
would be infrastructure expansion, which is forbidden. The `fs.list`
execution defect is real but lives in the gateway image and needs
Nolan's authorization to fix; it is recorded above as a finding.

Probe scripts used (`tenant-trace-probe*.ps1`) were removed from the Pig
after the trace; all reads were read-only and no event, row, or
credential was written or modified.

## Bottom line

The Tenant OS as a tenant-scoped operating substrate does not exist in
runtime terms: one audit tenant, zero canonical events, empty registries,
unexposed capabilities. What does exist and runs today: agent-scoped
authority with audited policy decisions, append-only `ping_events` with
namespaces, and a live event-to-mission projection. The smallest true
statement is: PING is a working single-tenant event and mission
substrate with real agent authority boundaries, not a multi-tenant OS.
