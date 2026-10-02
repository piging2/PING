# Arch-B: identity / capability / authority map
P0 autonomy sprint, 2026-09-27. Read-only re-dispatch of worker B (the prior
attempt errored on infra and left a file; I re-verified its key claims fresh
below and corrected two). No code written, nothing committed, :3200 and the
HPP original untouched.

## 1. Identity: the two dispatch front doors disagree on strength

### Python front door: designed server-authoritative
`~/workspace/mission-control/mission_intent.py` `submit()` (lines 1050-1078)
calls `resolve_tenant(auth_ctx, intent)` (line 222) BEFORE validation: the
tenant is taken from `auth_ctx.tenant`, never from the request body. A body
tenant that disagrees is refused with `IntentValidationError`.
`check_agent_entitlement` (line 247) requires the submitting agent to equal the
authenticated agent AND the tenant to be in `auth_ctx.entitled_tenants`,
fail closed both ways. The docstring is the contract: "The tenant is derived
from the AUTHENTICATED context (auth_ctx), never from the request body."

### TS dispatch route: NOT server-authoritative (the path the live P0 mission used)
`~/workspace/lane-p01/tree/src/app/api/mc/dispatch/route.ts` takes `tenant`
from the JSON body and checks it only against the hardcoded allowlist
`SLICE_TENANTS = ['happy-place', 'coppersmith-plumbing']`
(`_lib/mc-dispatch.ts:33`). The whole route file was read end to end: it
contains zero caller authentication (no bearer check, no API key, no session,
no signature). Any caller that can reach the route can name either
allowlisted tenant. The same is true of `GET /api/mc/missions` and
`GET /api/mc/missions/[id]` (both unauthenticated projections).

### Gap inside the Python path itself: the trust anchor is unwritten
`AuthenticatedContext` (mission_intent.py:200-220) is a plain data class with
no session binding. The only in-tree constructor call is
`tests/test_mission_intent.py:207`. No production code builds an
`AuthenticatedContext` from a verified session, so the server-authoritative
tenant resolution is only as strong as the (absent) producer of `auth_ctx`.
The contract is correct; the anchor is missing. Classification: WIRE.

### Correction to the prior attempt's item #4
The prior attempt labeled the TS adapter wiring BROKEN because
`ADAPTER_SHIM = '/home/nolan/workspace/mission-control/lane-d/adapter-call.js'`
(mc-dispatch.ts:25) does not exist on this machine (there is no /home/nolan
here). That path is correct on the host the tree actually runs on: the route
writes `resultPath = /home/nolan/workspace/mission-control/artifacts/...`
(route.ts) and records `host: 'pig-wsl'` in outcome evidence, so the tree is
Pig-WSL resident where /home/nolan exists. `adapter-call.js` hardcodes
`ADAPTER_PATH = '/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js'`
(the same adapter I verified in section 2). The wiring is correct for its
host; it is not broken. The prior BROKEN classification is rejected.

## 2. Capability: the enforced vocabulary, as proven in code

One canonical module owns the authorization decision:
`~/workspace/orca-adapter/vendor/external_agent_adapter.js`
`authorizeWorkOrder()` (lines 185-220). Union of `allowedCapabilities` across
`AGENT_PROFILES`:

- `fixture.read` (hermes, codex)
- `text.transform`, `text.summarize` (hermes, codex, cloud-subagent, ollama)
- `orchestration.plan`, `orchestration.review` (cloud-subagent)
- `documentation.generate`, `dead_code.analyze`, `test.generate` (cloud-subagent, ollama, identity_1..4)

Deny conditions, fail-closed, in order:
1. unknown `agentId` (not in `AGENT_PROFILES`) -> `Unknown exterior agent`
2. `blockedExternal` (opencode: no headless CLI; codex: expired 2026-09-17 quota block) or `PENDING_AUTH` status
3. capability not in the profile's `allowedCapabilities` -> `Capability '...' not allowed for agent '...'`
4. namespace failing `^(core|tenant)::[a-z0-9_.-]+$` (shape check only)
5. constraints not an object, loosening `maxConstraints`, or missing `no_canonical_events: true` / `no_mission_state_writes: true`

### What the identity_5 / email.send denials prove
- `identity_5` is not registered in `AGENT_PROFILES` (identities 1-4 are;
  5-10 are DENIED per Nolan's 2026-09-26 identity policy), so it dies at
  check 1: "Unknown exterior agent: identity_5".
- `email.send` appears in no profile's `allowedCapabilities`, so it dies at
  check 3 for every agent: "Capability 'email.send' not allowed for agent".
- Structural fact proven: identity registration and the capability vocabulary
  are data in one choke-point function. Denial needs no blacklist entry and
  no special case; the deny surface is complete by construction.

### TOOL AVAILABILITY vs AUTHORIZATION, per path
- **TS route:** availability = `checkBrokerQuota()` (broker state file,
  ACTIVE/DEGRADED, `quota_state` OK, `quota_remaining >= 1`) for broker
  agents, ollama HTTP reachability; authorization = profile LIVE +
  capability in `allowedCapabilities` + the adapter's `authorizeWorkOrder`
  verdict via `adapter-call.js`. A quota block renders as a timeout-style
  UNKNOWN (transport), never as a grant.
- **Python front door:** availability = the `Executor.execute()` transport
  outcome; authorization = `authorize()` -> `_call_adapter("authorize", ...)`
  via `_adapter_shim.js` (mission_intent.py:468-489). Executor crashes and
  unverifiable results become `MC_LANE_UNKNOWN` / `MC_RUN_UNKNOWN`, never
  FAILED and never granted.
- **Never mixed on either path.** Both shims (`adapter-call.js`,
  `_adapter_shim.js`) state in their headers that they "own NO decision";
  the prior attempt's DUPLICATE classification stands (two shims, one
  adapter), but both are decisionless transports.

### Three separate authorities, correctly separated (not duplicates)
Per the adapter docstring (lines 17-20):
- `authorizeWorkOrder` (adapter): "may PING issue work order W delegating
  capability C to external agent A?" (PING-initiated delegation)
- `CapabilityAuthority.authorize` (gateway container
  `/app/gateway/capability_authority.js:230`): "may agent A invoke capability
  C against PING?" (agent-initiated, `/capabilities`)
- `CanonicalizationService.authorizeNamespace`: "may source S emit into
  namespace N?" (emission)
Three different questions, three owners. Note: the 2026-09-13 audit
(`~/workspace/audit/capability-vocabulary-audit-2026-09-13.md`) reported the
`/capabilities` route unmounted in server.js, so the agent-initiated
authority may be DEAD in practice; re-verify against the live container
before relying on that split.

## 3. Namespace-ownership map: owner and the policy-change procedure

Map: `NAMESPACE_OWNERS` in the ping-gateway container at
`/app/ping-runtime/events/event_governance.js` (lines 14-82 per the parent
brief). **No local copy of this file exists in the workspace** (checked the
gateway-hardening build, convergence-zoom snapshots, p0-lane1 fixtures, jev
evidence; the one pulled copy,
`~/workspace/tenanos-wave/swarm-10/evidence/gateway__routes__governance.js:30`,
only references the map by require). The live refusal "No owner defined for
namespace 'jev'" was established by the parent and re-confirmed by the prior
attempt's Pig SSH read; I could not re-read the container from this subagent.

- **What "owner" means:** a static authority label per event-type-prefix
  namespace, `'PING'` (platform) or `'HPP'` (business tenant). It answers
  "which authority owns events whose type starts with this prefix." Owner is
  defined by whoever edits the hardcoded map.
- **The mechanism (prior attempt, Pig-verified):**
  `JEV_DECISION_EVALUATED` registers its event type but its namespace
  (`jev`, derived from the type prefix) has no row in NAMESPACE_OWNERS, so
  `validateEvent` -> `_validateNamespace` returns "No owner defined for
  namespace 'jev'" and `UnifiedEventRuntime.emit` rejects every jev-shadow
  emission. Missions 70e962a9d257c6dc, a5dc21a36107b0a5, c1f73355ec675fa2,
  4369c58ed3fd7513 were observed failing (reconciliation-2026-09-27.md, per
  the prior attempt). The correct row is `jev: 'PING'` (Jev is a PING
  platform shadow sensor per Nolan's standing rule, not HPP tenant data).
- **Who owns the map:** the gateway image build from the Pig repo (`~/ping`
  on the Pig), which holds the `ping-runtime` source. The container is the
  compiled artifact; the map is source policy.
- **Policy-change procedure:** a source edit to
  `ping-runtime/events/event_governance.js` in `~/ping`, commit, image
  rebuild from a clean clone, immutable digest pin, and a Nolan-authorized
  promotion of the `ping-gateway` container. This is the documented gateway
  policy-change path: the 2026-09-24 `jev/verdict-authority-hardening`
  RUNBOOK (`~/workspace/ping-gateway-promotion/RUNBOOK.md`) shipped that way
  (tag `ping-gateway:candidate-fffe99f7a`, digest
  `sha256:aa1f085a067383fb6226ffa00d13b70e63be17a5b67ca9810a493c23c5cd6d42`,
  Nolan GO 2026-09-24 ~11:08 MDT). Never a runtime or container edit;
  deployment authority is Nolan's.
- **Boundary note for the ugly-case phase:** the dispatch adapter checks
  namespace SHAPE (`^(core|tenant)::[a-z0-9_.-]+$` in `authorizeWorkOrder`)
  while the gateway's `event_governance.js` checks namespace OWNERSHIP
  (NAMESPACE_OWNERS). Different maps, different containers. A mission the
  adapter authorizes can still fail at event emission if the namespace has no
  registered owner. This is the jev failure class, and any new namespace
  will repeat it unless the registry gains a conformance check (every
  registered event type's namespace must have an owner row).

## 4. Authority: who can mint, approve, apply

- **Mint missions:** (a) any caller reaching the TS `POST /api/mc/dispatch`
  route (no caller auth; allowlist-only tenant) mints a journal-projected
  mission with deterministic id `mc-m-<sha12>`; (b) any Python caller able
  to construct `AuthenticatedContext` and call `mission_intent.submit()`
  (no production constructor exists). Minting is the weakest authority
  boundary on the map.
- **Approve:** the owner operator only. `adapters/mc_approval.py:27-37`
  (`mc_approve`) requires a non-empty `approver_identity`: "Mission Control
  projects authority, it does not own it." The canonical model
  (`approval_request.py:1-39`) binds approval to an EXACT digest
  (`approve(id, expected_digest)`; mismatch refuses with no state change),
  silence is never approval (no EXPIRE_APPROVE path exists), and the
  server-side `ApprovalStore` file is the authority. Expiry maps to
  EXPIRED / DENIED / CANCELLED / SAFE_NOOP (default HOLD -> EXPIRED).
  Surfaces: `approval_cli.py` (record/decide/get) and the :3100 Next.js
  approvals route that shells to it. WAITING_APPROVAL is where
  mc-m-c5b2c89b4ff7 sits now.
- **Apply:** FYD owner apply (`~/workspace/fyd-build/src/fyd/owner/apply.ts`
  with `proceduralize/patch.ts`); only the exact approved digest may be
  applied. Approval -> apply is digest-pinned end to end.

## 5. Reaper-vs-HOLD design gap (recorded, NOT designed)

After `MISSION_RECONCILE_HOLD`, lease expiry or reaping can reset a HELD
mission to executable and redispatch an UNKNOWN-outcome mission, risking
duplicate physical effects. Evidence:
`~/workspace/fyd-autonomy/100-point-plan.md:2112-2115` (R-01: "Open defect
(ops amendment 2026-09-27): after MISSION_RECONCILE_HOLD, lease expiry or
reaping can reset the mission to executable and redispatch an UNKNOWN-outcome
mission, risking duplicate physical effects. AGENTS.md marks the reaper-vs-HOLD
seam as an open design gap needing Nolan's word."); related: lines 338
(R-01 open defect), 365 (redispatching UNKNOWN treats the unknown as retryable
without reconciliation), 604 (reaper redispatch is at least L3 consequential
but can happen silently at machine speed). The reaper/lease mechanism itself
was not found in the readable workspace trees (mission-control, lane-p01
tree); the defect record is the authoritative artifact. **Needs Nolan's
design word. Not designed here.**

## 6. Component classification (one line of evidence each)

| Component | Class | Evidence |
|---|---|---|
| mission-control/mission_intent.py (Python front door) | KEEP | `submit()` 1050-1078: tenant from `auth_ctx`, body-tenant refusal at resolve_tenant:222, entitlement check at 247, in-flight duplicate -> HOLD not re-dispatch |
| lane-p01/tree/src/app/api/mc/dispatch/route.ts (TS dispatch) | WIRE | trusts tenant from body with allowlist only (SLICE_TENANTS), zero caller auth; needs wiring to a server-bound identity |
| lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts | KEEP | journal-projection + decisionless `adapterCall` transport; owns no verdict |
| mission-control/lane-d/adapter-call.js | KEEP | header "This shim owns NO decision"; /home/nolan paths are correct on its Pig-WSL host; exit-2-on-authorize-crash prevents fabricated DENIED |
| mission-control/_adapter_shim.js | DUPLICATE | same shape and same "owns NO decision" header as adapter-call.js; two shims, one adapter |
| orca-adapter/vendor/external_agent_adapter.js | KEEP | single decision owner: `authorizeWorkOrder()` 185-220; identity + capability + namespace + constraints choke point |
| gateway CapabilityAuthority (/app/gateway/capability_authority.js:230) | DEAD | 2026-09-13 audit found `/capabilities` unmounted in server.js; re-verify against the live container before relying on the agent-initiated split |
| gateway event_governance.js NAMESPACE_OWNERS | KEEP | live refusal "No owner defined for namespace 'jev'"; defect is a missing row, not a duplicate; fix = source edit + digest-pinned image + Nolan GO |
| AuthenticatedContext (mission_intent.py:200-220) | WIRE | entitlement set exists, but only constructed in tests (test_mission_intent.py:207); no production session binding |
| approval_request.py + approval_cli.py + adapters/mc_approval.py | KEEP | exact-digest binding, silence-never-approval, server-side ApprovalStore, operator identity required |
| fyd-build/src/fyd/owner/apply.ts | KEEP | applies only the exact approved digest |
| reaper/lease re-dispatch of HOLD | BROKEN | open defect R-01 (100-point-plan.md:2112-2115); threatens the P0.8 one-semantic-effect invariant |

## 7. Answers to the brief

**(a) Server-authoritative identity path.** The only server-authoritative
identity path in the tree is the Python front door
(mission_intent.submit -> resolve_tenant(auth_ctx) -> check_agent_entitlement):
tenant comes from an AuthenticatedContext, never the body; a disagreeing body
tenant is refused; the agent must equal the authenticated agent and hold an
entitlement for the tenant. The TS dispatch route, which the live P0 mission
actually used, is not server-authoritative: body-supplied tenant against a
two-entry allowlist, no caller authentication at all. And the Python path's
own trust anchor is unimplemented: nothing in production constructs an
AuthenticatedContext from a verified session.

**(b) Capability allow/deny surface, as proven.** Enforced vocabulary (union
over profiles): fixture.read, text.transform, text.summarize,
orchestration.plan, orchestration.review, documentation.generate,
dead_code.analyze, test.generate. Proven denials: unknown agentId
(identity_5 -> "Unknown exterior agent"), unregistered capability
(email.send -> denied for every agent), PENDING_AUTH/blockedExternal,
namespace shape failure, and any relaxation of maxConstraints or the
mandatory no_canonical_events / no_mission_state_writes constraints.
TOOL AVAILABILITY (broker quota, ollama reachability, executor transport)
is checked separately on both paths and never substitutes for authorization.

**(c) Namespace-ownership map.** Owner: the gateway image build from the Pig
repo `~/ping` (ping-runtime source); the container is the artifact. Policy
change (adding the `jev` row): source edit in `ping-runtime/events/event_governance.js`,
commit, clean-clone image rebuild, immutable digest pin, Nolan-authorized
promotion of the ping-gateway container, per the 2026-09-24 RUNBOOK
procedure. Never a runtime edit. Correct row: `jev: 'PING'`.

**(d) Highest-leverage boundary for the ugly-case phase.** The reaper-vs-HOLD
seam (section 5): the only open defect that converts UNKNOWN outcomes into
automatic re-execution at machine speed, directly violating P0.8
idempotency (one semantic effect under concurrent retry) and making every
duplicate-effect ugly case unwinnable until Nolan rules on it. Runner-up: the
TS route's body-tenant trust, which makes the identity context of any
adversarial ugly case suspect.
