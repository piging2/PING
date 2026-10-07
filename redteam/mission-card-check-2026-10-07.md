# Mission Card Endpoints — Security Assessment vs Pasted Checklist

Date: 2026-10-07. Branch assessed: `lane/mc-mission-card-endpoints` in /home/nolan/ping (Pig),
pushed to ngesk2/crx-runtime.git. Branch HEAD at assessment: 92c97e12d
(`feat(fyd-projection): add synthetic clearwater-plumbing-demo site...`).
Assessment is READ-ONLY. No code changed. No new middleware proposed (per owner steer).

## 0. Stack reality (read this first)

The pasted checklist's sample code assumes Express.js + MongoDB
(`db.missionCards.findOne({ _id })`) and a REST surface of
GET/POST/PUT/PATCH/DELETE on `/api/missions/:missionId/cards`.
That surface does not exist. The real code on this branch:

- **Stack:** Express route modules + Postgres (`pg.Pool`, parameterized `$1` queries),
  Node `MissionRuntime` class. No MongoDB, no Mongoose, no `$where`, no zod.
- **Actual endpoints (exactly 3, all POST):**
  - `POST /api/v1/missions/cards/:id/approve`
  - `POST /api/v1/missions/cards/:id/reject` (body: `{ reason? }`)
  - `POST /api/v1/missions/cards/reorder` (body: `{ cardIds: [...] }`)
- **Auth:** mounted behind the exterior auth middleware (Bearer <redacted> key ->
  `req.authenticatedAgent.agentId`); the route module also fail-closes 401 if mounted
  without it. Mount point: `gateway/bootstrap/gateway_runtime.js` (~line 719).
- **Model:** a "card" is a UI projection over a row in `ping_missions`; there is no
  separate cards collection and no card-vs-mission ownership split. The order list is a
  single global row (`mission_card_order`, `order_key='default'`).

Per the owner's follow-up, every check below is mapped by INTENT to this real code,
with file+line evidence. The stack mismatch is noted, not used as a dismissal.

## Check verdicts

### 1. IDOR — object lookup missing tenant scope: CONFIRMED (latent, multi-tenant-capable model)

Intent: any object lookup that ignores tenant boundaries.

`ping-runtime/orchestration/mission_runtime.js`, `approve()` (~lines 273-276):

```js
const existing = await this._pool.query(
  `SELECT mission_id, status FROM ping_missions WHERE mission_id = $1`,
  [missionId]
);
```

and the transition (`~lines 280-285`):

```js
`UPDATE ping_missions
   SET status = 'approved', approved_by = $1, approved_at = NOW()
 WHERE mission_id = $2 AND status = 'created' AND hold_at IS NULL
 ...
```

`reject()` is identical in shape (`~lines 327-340`). No tenant filter, no comparison of
caller tenant vs row tenant. The exterior identity carries `agentId` only
(`gateway/exterior_auth_middleware.js` lines 194, 218, 249); there is no caller-tenant
concept to compare against.

Meanwhile the mission model IS multi-tenant-capable: `mission_id` is
`hash(tenant:missionType:event_id)`, creation requires `options.tenant_id`
(fail-closed), and `_missionTenant()` (`mission_runtime.js` lines 96-103) re-reads the
row's `tenant_id` for event emission — so the tenant value is available and is used on
the event path but NOT enforced on the mutation path. An authenticated exterior agent
that learns another tenant's `mission_id` can approve/reject it.

Caveat: per the TenantOS doctrine in force ("tenant = PING is sufficient"), the
deployment is effectively single-tenant today, so this is latent, not actively
exploitable. It becomes live the moment a second tenant exists. This is exactly the
class the TenantOS red team exists to catch, and the enforcement point is already
identified (`_missionTenant` exists; it just needs to gate, not just label).

### 2. Missing authorization on card mutations: CONFIRMED (partial)

Intent: mutations reachable without adequate authority checks.

What exists: all three routes require an authenticated exterior agent
(`gateway/routes/mission_cards.js`, `requireAuth`, lines 57-64; routes at 117-135,
138-162, 165-212). The decider identity is taken from the credential, and a
body-claimed decider that contradicts it is REJECTED 400 `fabricated_identity`
(lines 86-100) — a genuine anti-spoofing control.

What does not exist: any finer-grained capability or role distinction. ANY
authenticated exterior agent can approve/reject ANY mission and can overwrite the
GLOBAL card order (the reorder UPSERT writes `order_key='default'`, lines 199-205 —
one row shared by everyone, no per-tenant or per-mission scoping, `updated_by` is
informational only). There is no viewer/editor/admin split and no
`requireCapability("mission_card:create")`-style gate.

The pasted `requireCapability(...)` patch invents middleware that does not exist in
this codebase: NOT APPLICABLE as written (per owner steer, no new middleware
designed here). The finding stands on the existing boundary: authentication is real,
authorization granularity is absent.

### 3. Mass assignment — unsanitized client-controlled writes: MITIGATED

There is no `...req.body` spread anywhere in the route file. Field by field:

- approve: writes only `approved_by`/`approved_at` from the authenticated caller
  (mission_cards.js lines 117-135).
- reject: `reason` is type-checked and length-bounded (`MAX_REASON_CHARS = 2000`,
  lines 148-152); the decider comes from the credential.
- reorder: `cardIds` must be an array of non-empty unique strings, bounded at
  `MAX_CARD_IDS = 1000` (lines 170-190).

The `rejectFabricatedIdentity` guard (lines 86-100) explicitly rejects body-supplied
`approved_by`/`approver`/`rejected_by`/etc. that contradict the authenticated
identity — the mass-assignment-of-identity variant is actively denied, not ignored.

### 4. Rate limiting: CONFIRMED GAP

No `express-rate-limit` or any request throttling exists on these routes or anywhere
on the gateway (grep over `gateway/` finds only GitHub API client-side quota tracking
in `gateway/github_snapshot.js`). `POST /cards/reorder` is a cheap single-row UPSERT
and approve/reject are cheap conditional UPDATEs; an authenticated agent can hammer
all three unboundedly. Impact is bounded by the exterior-auth requirement (a valid
Bearer <redacted> key is needed), so this is not a public DoS surface, but the control
the checklist asks for is genuinely absent.

### 5. Injection in queries: MITIGATED

Every SQL statement is parameterized (`$1`, `$2`, `$3`); no string interpolation into
queries anywhere in the route file or the approve/reject path. The reorder UPSERT
passes `cardIds` through `JSON.stringify` into a JSONB parameter (lines 199-205).
The pasted `$where`/NoSQL-injection patterns are MongoDB-specific and cannot occur
here (Postgres stack). Intent mapped, intent satisfied.

### 6. Information disclosure in error responses: CONFIRMED (minor)

Two 500 fallthroughs return the raw error message to the client:

- `missionError()` fallthrough, mission_cards.js (~lines 108-110):
  `res.status(500).json({ status: 'error', error: err.message })`
- reorder catch, mission_cards.js (~lines 213-215):
  `res.status(500).json({ status: 'error', error: err.message })`

`err.message` from `pg` can carry constraint details, column names, and on connection
failure, host/port info. Known cases are properly typed (404/409/400 with codes);
only the unexpected-500 path leaks. Minor, but real.

### 7. Missing input validation: MITIGATED

Hand validation covers the intent (no zod in the codebase; the pasted zod patch is
NOT APPLICABLE as written, but its requirements are met):

- `reason`: must be string, max 2000 chars (lines 148-152).
- `cardIds`: required, must be array, max 1000 entries, each a non-empty string,
  duplicates rejected (lines 170-190).
- `missionId` param: must be a non-empty string (lines 122-124, 143-145).

### 8. Insecure direct mission reference: NOT PRESENT IN THIS CODEBASE

The pasted check assumes a cards-belong-to-missions-belong-to-tenants hierarchy where
the card check passes but the mission check is skipped. That hierarchy does not exist
here: a card IS a mission (same id), and the order table is global. The only
tenant-scoping gap is check 1, counted once. No separate finding.

### 9. Missing audit logging: PARTIAL (approve/reject MITIGATED, reorder CONFIRMED GAP)

approve/reject emit `MISSION_APPROVED` / `MISSION_REJECTED` on the event spine with
the decider identity and timestamp (mission_runtime.js ~lines 292-296 and ~347-351) —
a better audit trail than a log line. reorder persists `updated_by`/`updated_at` on
the row but emits NO event: the global order can be rewritten with no trail beyond
the row itself.

## Scorecard

- CONFIRMED (incl. partial): 5 of 9 — #1 IDOR (latent), #2 mutation authz granularity,
  #4 rate limiting, #6 error-message leakage (minor), #9 reorder audit gap.
- MITIGATED: 3 of 9 — #3 mass assignment, #5 injection, #7 input validation.
- NOT PRESENT IN THIS CODEBASE: 1 of 9 — #8 (model has no card/mission split).
- Pasted patches that invent nonexistent middleware (`requireTenantAuth`,
  `requireCapability`, zod schemas): NOT APPLICABLE as written; intents re-mapped.

Existing test coverage (for context, not a verdict): `gateway/tests/mission_cards.test.js`
(23 checks) proves 401 fail-closed, fabricated-identity 400, decider+timestamp
recording, reorder persistence, and typed 400s. It does not test cross-tenant
behavior (fixtures use a single `proof-tenant`).

## Process proposals

### (a) Mission-card-specific security crons: SCOPE CREEP AS WRITTEN

The 50 TenantOS security crons use a frontmatter + prose-role architecture with
binding constitutional rules (attacker/validator/verifier separation, epistemic
labels, run logs under the goal's hidden_files). The proposed
`security-crons/mission-card-swarm.yaml` uses a different schema
(swarms/targets/tests/expected) that fits nothing in the existing cron bodies.
Substantively, `tenantos-sec-01-tenant-boundary` already runs controlled
cross-tenant read/write attempts against staging fixtures, and
`tenantos-sec-04-db-scope` covers DB scoping — the three new card endpoints are new
TARGETS for those existing roles, not a reason for three new narrowly-scoped crons.
Recommendation: add the card endpoints as fixtures/targets to sec-01 and sec-04,
do not mint new cron roles.

### (b) PING-RED-002 test additions MC-001..MC-004: NOT WELL-FORMED AS WRITTEN

`~/workspace/redteam/ping-red-corpus.json` cases are standalone entries with schema
`{id, title, threat_class, target_description, expected_safe_behavior, status}`
lifecycle `proposed -> active -> retired`. PING-RED-002 is itself one executed case
("Cross-tenant retrieval poisoning", threat_class CROSS_TENANT_EXTRACTION), not a
container for sub-tests. The proposed MC-001..MC-004 use a different field set
(id/name/attack/precondition/actor/expected/severity) and nest under an existing
case id — both wrong. Well-formed equivalents would be new case ids (PING-RED-013+)
with threat_class CROSS_TENANT_EXTRACTION (MC-001, MC-003),
PRIVILEGE_ESCALATION (MC-002), and a rate-limit/abuse class for MC-004, each with
target_description and expected_safe_behavior in corpus style.

## Single most important finding

Check 1: `approve()`/`reject()` resolve missions by bare `mission_id` with no tenant
enforcement, in a mission model that is explicitly multi-tenant-capable (tenant-bound
ids, fail-closed `tenant_id` on creation). Latent today under single-tenant
deployment; the first second tenant activates it. The enforcement hook already
exists (`_missionTenant` re-reads the row tenant for events) — the mutation path
just doesn't consult it.
