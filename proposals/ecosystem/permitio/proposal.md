# Harvest Proposal: Permit.io authorization control plane

Worker: harvest leaf (Permit.io)
Date: 2026-10-02
Status: CLEAN-ROOM RE-DERIVATION. No proprietary code copied. No code taken from any repo. All mechanisms below are described in my own words from public official docs and the Apache-2.0 OPAL README.

## 1. What was read (official sources only)

| # | URL | What it establishes | sha256 (bytes fetched 2026-10-02) |
|---|-----|---------------------|-------------------------------------|
| 1 | https://docs.permit.io/concepts/control-plane-and-data-plane | Control plane vs data plane; OPAL sync; PDP layouts; identifiers-only policy storage | d14e2fecf4e1130a276098ebe433cbbd2213eb2cab865da3b53d89e0423ab4d3 |
| 2 | https://docs.permit.io/permit-mcp-gateway | Gateway pipeline per tool call; trust ceilings; consent-based delegation; audit trail; deny-by-default | 0b33cf7e5e9a5294722b5a7ead51c599c492a6d11d53227605ee4823f26fd599 |
| 3 | https://docs.permit.io/how-to/use-audit-logs/types-and-filtering | Audit log entry schema; decision log (input + OPA result + reason + denial code); API; retention; logs forwarder | 9240f7a11f7be2e995337081004032279646060fe206bd1c22661868bb52da4e |
| 4 | https://docs.permit.io/how-to/sdlc/ci-cd/ | Policy lifecycle: environments as policy branches; preview/staging CI flows; copy/merge/delete env API; GitOps branch-per-environment | b99c880f707557e7f194da8103d6c1d1103cf2636413d6b69b887cd9436a0ce3 |
| 5 | https://raw.githubusercontent.com/permitio/docs/HEAD/docs/permit-mcp-gateway/permit-integration.mdx | Agent permission model: user_profile ReBAC indirection, derived-role min() rules, three-component write separation, per-step write map | beea593c3f936b7dac0424ed34f995817a32df8e94bd893d77c970ca3117d44b |
| 6 | https://raw.githubusercontent.com/permitio/docs/HEAD/docs/permit-mcp-gateway/advanced-features.mdx | Human-in-the-loop approvals for high-risk actions; time-limited consent windows; agent verification/interrogation | cd2adff4c947f6bb89cf15be011224d1bd1c3580cac5291cbeab4c8dc7472e23 |
| 7 | https://raw.githubusercontent.com/permitio/docs/HEAD/docs/permit-mcp-gateway/managing-humans-and-agents.mdx | Trust-level ceiling updates (lower = immediate cap, raise = needs re-consent); cascading revocation; per-agent trust view | 281f270a3489ce57d0238e55d4d76b9572ae9118b5c66334b74e241f08730b82 |
| 8 | https://raw.githubusercontent.com/permitio/opal/master/README.md | OPAL mechanism: pub/sub topic sync, clients fetch from source, load into OPA/Cedar; production scale claims | bcbda664170bf0c8b1a2aec0469814ba815db45b24ea3db29044a41d77454e81 |

Also consulted for cross-check (not hashed): Permit.io blog posts on PEP/PDP architecture, RBAC-vs-ReBAC for agents, SOC2 checklists, and explainable-deny evidence (www.permit.io/blog), all marketing-adjacent, used only to confirm the mechanism shape, never as mechanism source.

SOURCE_SHA: sha256:810532559179c7ea35c396e0f50b8d076569d3f598188d517a37701f708e4e48 (over the 8 concatenated inputs above, in order).

Repo state observed: https://github.com/permitio/opal, public, default branch master, head commit 5fd47b25cbea164715d8acdaebebd5e4f19670fc (observed 2026-10-02), 2,089 commits, license Apache License 2.0 (as displayed by GitHub).

## 2. Object model (re-derived)

Permit.io is built from a small set of objects, all scoped to a project and environment:

- **project / environment**: an environment is one complete policy version. Every PDP binds to exactly one environment through that environment's API key. Switching policy versions means pointing the PDP at a different environment key, never redeploying code.
- **user**: identified by an opaque key with a type prefix. Humans: `human|{subject}`. Agents: `agent|{client_id}` (the OAuth client id of the MCP client, e.g. Cursor or Claude Desktop). Agents are first-class subjects, not second-class tokens.
- **resource type / resource instance**: a resource type is a class (e.g. an MCP server like `linear`); a resource instance is `type:key` (e.g. `linear:linear`, where type and key coincide for servers).
- **action**: a named operation on a resource type (e.g. `create_issue`, `delete_project`). Each MCP tool maps to one action.
- **role**: trust tiers `low`, `medium`, `high`, strictly hierarchical (high extends medium extends low). Actions are granted to the role matching the tool's risk class: read tools to low, write tools to medium, destructive tools to high.
- **tenant**: the isolation dimension every check carries.
- **relationship**: a typed edge between instances, e.g. `user_profile:alice --medium--> linear:linear`. The relation name carries the admin-set maximum trust level.
- **derived role**: computed rules that combine a role on one object with a relation to another. The gateway writes 12 derivation rules per MCP server implementing the trust ceiling.
- **user_profile**: an indirection object standing for the human. Agents never touch servers directly; every delegation flows through the profile.
- **audit log entry / decision log**: the per-check evidence record (see section 7).

## 3. ID scheme

Everything is keyed by opaque strings, never by personal data. The control plane is designed to work on identifiers alone (user keys, role keys, resource keys, tenant keys); names and emails are optional. Agent keys embed the OAuth client id (`agent|{client_id}`), which binds the delegation to a specific client identity and defeats naive key reuse. Environment binding is by API key per environment; the key names the policy version the PDP enforces.

## 4. The admin-vs-enforce boundary (the core harvest)

Four named points, each with a distinct job and a distinct writer:

1. **PAP (Policy Administration Point)** = the Permit cloud control plane (dashboard + API). Authors, reviews, and promotes policy. Holds policy plus identifiers only.
2. **PDP (Policy Decision Point)** = the `permitio/pdp-v2` container (OPA engine + OPAL client + API server), deployed as a sidecar, a load-balanced cluster, or a single instance, sitting inside the customer's network next to the services. Answers one question per call: `check(identity, action, resource, tenant, context)` returns allow or deny. No remote SaaS call on the hot path when self-hosted.
3. **PEP (Policy Enforcement Point)** = the application handler, API gateway, or MCP gateway. It asks the PDP and enforces the answer. The check function has one job: validate the request and send it to the PDP.
4. **OPAL (the sync spine)** = Open Policy Administration Layer. The OPAL server watches policy sources (git) and data sources (APIs, DBs, S3, third-party SaaS) and publishes topic updates over a websocket pub/sub channel. OPAL clients subscribe to topics, then fetch the actual data directly from the source and load it into their local OPA via the data API. Client-server, stateless. A policy change reaches every PDP without a redeploy, and the decision path never depends on the control plane being reachable.

The hard rule: **the writer that decides policy is never the reader that enforces it, and the enforcer never writes policy.** Documented write separation for the MCP gateway:

| Component | What it may write | What it may not do |
|-----------|-------------------|--------------------|
| Admin dashboard (Platform) | resource types, actions, instances, trust roles, user profiles, profile-to-server relations (the ceiling) | grant consent on behalf of a user |
| Consent Service | agent users, agent roles on user_profile (the delegated grant); rejects consent above the ceiling with 403 | create server resources or ceiling relations |
| Gateway | nothing | it only calls `permit.check()` at runtime |

## 5. Policy-change lifecycle

Permit models the policy lifecycle as branches, deliberately parallel to code CI/CD:

- **Environments are policy branches.** Each pipeline stage works in its own environment. The PDP uses one environment's API key, so the PDP enforces exactly that environment's policy branch.
- **CI flows.** Two patterns: (a) long-lived staging environment, merged into target; (b) per-PR preview environments: create env, copy source env into it, test policy against a PDP keyed to the preview env (`permit test run audit`), merge into target with a conflict strategy, delete the preview. All via API (`POST /v2/projects/{proj}/envs/{env}/copy`) or `permit env` CLI.
- **Environment access control** gates who may mutate each stage (e.g. only the CI-flow owner may touch the preview env).
- **GitOps mode.** Each environment maps to a Git branch. Policy is edited, reviewed, and merged as code; merging is promotion. The PDP syncs the merged branch through OPAL.

State transitions of a policy change: draft in preview env -> test (audited checks) -> review/approve -> merge to target env -> OPAL publishes topic update -> each PDP client fetches and loads -> next `check()` evaluates the new policy. Old policy is never edited in place in production; it is replaced by merge.

## 6. Agent-permission model (the second harvest)

This is the mechanism worth the most. An agent's power is computed per request from two independent edges, and the effective permission is the minimum of the two:

1. **Admin grants a human access.** The dashboard creates a relation from the human's profile to the server: `user_profile:alice --medium--> linear:linear`. This relation is the **ceiling**. Deny-by-default: no relation, no access.
2. **Human consents for an agent.** The consent service creates the agent user (`agent|cursor_abc123`) and assigns a role on the profile: `linear-medium` on `user_profile:alice`. This role is the **delegated grant**. The consent UI slider caps selectable levels at the ceiling, and the consent API independently 403s any request above the ceiling, so a bypassed UI cannot escalate.
3. **Agent calls a tool.** The gateway calls `permit.check("agent|cursor_abc123", "create_issue", "linear:linear")`. The PDP derives the effective role as **min(agent's role on profile, profile's relation to server)** via the 12 derivation rules, e.g. agent role `linear-high` + relation `low` derives `{server}#low`; the `delete_project` action (high trust) then denies.
4. **Ceiling changes.** Lowering a ceiling takes effect on the very next check with no re-consent (the min() re-evaluates). Raising a ceiling does NOT auto-upgrade agents; the user must re-consent. Asymmetric on purpose: tightening is instant, loosening requires a fresh human act.
5. **Revocation cascades.** Removing the profile-to-server relation makes every derivation rule yield nothing, so every check denies for all of that human's agents on that server, while other servers are unaffected. Removing an agent's role on the profile kills that agent only; restoration requires re-consent.
6. **Sessions vs consent.** Application sessions live in Redis with a 30-day inactivity TTL and a 90-day absolute TTL; manual revocation is immediate. Consent role assignments persist independently of sessions.
7. **Human-in-the-loop.** High-risk actions pause the agent and route an approval request to a designated reviewer; the approval itself joins the evidence trail. Time-limited consent windows (e.g. two-week contractor access) auto-expire. Agent verification fingerprints client identity to detect drift.

The portable insight: **delegation is a two-sided bound evaluated at decision time, not a token minted at grant time.** Both sides are independently revocable, both are re-read on every check, and the min() resolution means neither side alone can escalate. This is strictly stronger than OAuth scopes (which answer what a token may attempt) because it also answers whether this delegated agent may do this action on this resource right now, under the current ceiling.

## 7. State transitions (runtime)

- Server import -> resource type + actions + instance + trust roles + action-to-role permissions created.
- Admin grant -> profile-to-server relation created (ceiling set).
- User consent -> agent user created (if new) + `{server}-{level}` role assigned on profile (grant set).
- Tool call -> `check(agent, tool, server)` -> derive min() -> ALLOW or DENY -> tool executes or permission error returned; decision logged.
- Ceiling lowered -> next check caps (no re-consent). Ceiling raised -> agents keep current level until re-consent.
- Human revoked -> relation deleted -> all agents' derivations collapse -> all checks DENY -> sessions terminated.
- Agent revoked -> role deleted -> that agent's checks DENY; re-consent restores.
- Session expired (30d idle / 90d absolute) -> re-consent required; consent roles untouched.
- Policy edited in env -> OPAL topic update -> PDPs fetch and load -> next check uses new policy.

## 8. Authority boundary (summary)

PAP writes policy; PDP evaluates; PEP enforces; OPAL distributes. Three writer classes with non-overlapping write scopes (platform, consent service, gateway). Ceilings enforced at three layers (policy min(), consent UI, consent API). Approval for high-risk actions is a designated-human decision recorded as evidence, not an agent self-approval. The admin ceiling and the human's delegation are separate authorities; neither can unilaterally expand the other.

## 9. Persistence semantics

- Control plane: policy objects + identifiers. No requirement to store personal data; privacy-by-identifier.
- Data plane: local policy + data copy inside the customer's network; sensitive request context never leaves the network per check.
- Sessions: Redis, upstream OAuth tokens stay at the gateway, never reach the agent.
- Audit logs: PDP uploads decision logs to Permit by default (container and cloud PDPs); alternatives are console output, or forwarding to Elasticsearch/stdout via the logs forwarder for customer-owned retention. Retention in Permit's cloud is time-limited; long-term evidence is the customer's job.
- GitOps mode: Git is the durable policy record (full history per environment branch).

## 10. Evidence and receipts

Every `check()` that reaches a PDP creates exactly one audit log entry without any logging code in the application: UUID id, timestamp, user_key, action, resource_type, tenant, boolean decision, pdp_config_id, org/project/env ids. The companion decision log holds the full input, the OPA result, a human-readable `reason` (debug mode), and a machine-readable denial `code` (`no_such_resource`, `no_such_action`, `no_such_tenant`, `user_not_synced`, `no_user_roles`, `no_role_in_tenant`, `no_permission`, `no_matching_usersets`, `no_matching_resourcesets`, `no_matching_rules`, `cloud_pdp_not_supporting_abac`) plus a support link. The audit API supports filters (users, decision, resources, action, tenant, pdp_id, time range) and pagination. The MCP gateway logs each tool call with agent, human, tool, server, time, and allow/deny in both dashboards. Human approvals are recorded as part of the trail. The docs explicitly support replaying audit logs against a PDP.

## 11. Retries and failures

OPAL's sync is push-notify plus pull-fetch: the server publishes topic updates, clients fetch from the authoritative source and load into OPA. Policy updates apply on the next check with no restart and no redeploy. The enforcement path is local, so a control-plane outage does not break decisions (the PDP keeps serving its last synced policy). Documented failure posture is deny-by-default for authorization; rate limiting on the MCP gateway returns HTTP 429 with a JSON body. No public documentation of check-time retry semantics; the architecture assumes the PDP is local and fast rather than retried remotely.

## 12. Revocation model

Immediate effect on the next evaluation: revocation deletes a relation or role, and because the PDP re-derives on every check, there is no stale grant window beyond the sync lag of that one object. Lowering a ceiling is instant; raising never auto-upgrades; full human revocation cascades to all agents on that server only; agent revocation is per-agent. Sessions have independent TTLs. There is no certificate-style expiry list to poll; the graph is the source of truth and it is read live.

## 13. Tests

OPAL (the only open-source component read): has a CI test workflow (badge on README), `pytest.ini`, an `app-tests` directory, and documented how-tos for triggering data updates. Permit.io's own PDP, gateway, and consent-service tests are closed-source and not observable. I did not run OPAL's suite; it is not being adopted. The docs describe policy testing via preview environments and `permit test run audit`, which is a process control, not a shipped test artifact.

## 14. License finding

- **Permit.io product (control plane, PDP image, MCP gateway, consent service): CLOSED-SOURCE, proprietary SaaS.** Flag for Nolan: it cannot be vendored or self-inspected; adopting it would make the authorization hot path a vendor dependency with a per-check cloud coupling (unless self-hosting the PDP image under their commercial terms). No GPL/copyleft issue because nothing is taken.
- **OPAL: Apache License 2.0**, verified on the GitHub repo page (https://github.com/permitio/opal). Permissive, no copyleft flag needed. Not being copied.
- **permitio/docs (mdx sources read): public repo; license not verified from an official source.** Nothing was copied from it, only mechanism descriptions were re-derived, so this is a non-issue, recorded for completeness.
- **This proposal: clean-room.** Zero lines of upstream code. Only concepts, re-described.

## 15. Dependency analysis

DEPENDENCIES: none. DEPENDENCY_COST: zero. The harvest is a mechanism design, not a library. OPAL was considered and rejected as a dependency: PING already owns an append-only event spine, and the harvest needs a contract, not a pub/sub server. No npm/pip package, no container, no SaaS, no API key enters piging2 for this.

## 16. Verdict: ADAPT

- **ADOPT: no.** There is nothing adoptable as-is. The product is closed-source SaaS (vendor dependency, commercial terms, cloud-coupled hot path). The one open component (OPAL, Apache-2.0) solves policy distribution, which PING does not need as a separate server.
- **REJECT: the product and the library, yes; the mechanism, no.** Do not depend on Permit.io, do not vendor OPAL.
- **ADAPT: the mechanism.** Two things transfer cleanly into PING semantics, re-derived in my own words, no upstream code:
  1. The admin/enforce split as a contract: policy is authored and versioned in one place (proposal-kernel territory: environments as policy branches, merge-as-promotion, per-PR preview envs), evaluated locally at the enforcement point against a synced copy, never by remote call on the hot path. The enforcer never writes policy; distinct writer classes own distinct object scopes.
  2. The two-sided delegation bound for agents (section 6): delegated grant from the human, ceiling from the admin, min() resolved per request, both independently revocable, every check emitting a decision receipt.

## 17. SMALLEST MISSING PRIMITIVE

**A two-sided delegated-capability bound, evaluated per request, with a decision receipt.**

PING's capability-kernel is specified as (actor, target, action, constraints, allow/deny), and the proposal-kernel covers proposed transitions plus approval binding. Neither specifies what Permit.io proves valuable: a delegation where the agent's effective permission is the intersection of two grants from two different authorities, resolved at decision time.

The primitive, in PING terms:

- **Delegation record**: an edge from a delegator (human/owner) to an agent, naming a scope. This is the grant side.
- **Ceiling edge**: an independently written edge from a policy authority (admin) bounding that scope. This is the ceiling side.
- **Resolution rule**: effective permission = min(grant, ceiling), computed by the enforcement point on every evaluation from live edges. Lowering the ceiling caps immediately; raising it never auto-upgrades; deleting either side denies.
- **Decision receipt**: every evaluation appends an immutable record (who asked, which agent, which action, which resource, policy version evaluated, grant edge referenced, ceiling edge referenced, allow/deny, reason code) to the event spine. Receipts are replayable.

Why this is the smallest valuable unit: it is one semantic (intersection of two authority edges at decision time) that directly serves proofs 9 through 14. A mission (proof 9) is a delegation under a ceiling. A worker's result (proof 10) is checked against the bound. An injected bad result (proof 11) is a check that falls outside the intersection and denies. A fallback attempt (proof 12) re-dispatches under the same bound. VERIFIED (proof 13) requires a second, independent receipt (the verifier's own check, analogous to Permit's human-in-the-loop approval joining the evidence trail). Replay (proof 14) reconstructs state from the receipt log, exactly as Permit replays audit logs against a PDP.

## 18. proof_id mapping

proof_ids: [9, 11, 13, 14]

- 9 (create one mission): the mission is a delegation record under an admin ceiling; creation writes the grant edge.
- 11 (injected bad result is rejected): an action outside min(grant, ceiling) denies at the enforcement point, with a coded reason.
- 13 (mission VERIFIED only after independent verification): verification is a separate check with its own receipt, the way HITL approval becomes part of Permit's evidence trail; no receipt, no VERIFIED.
- 14 (replay reconstructs relevant state): decision receipts are append-only and replayable, mirroring Permit's audit-log replay against a PDP.

## 19. Open questions for the coordinator

1. Does PING's event spine already emit per-check decision receipts (input + policy version + reason code), or does it only record transitions? If only transitions, the receipt is the concrete gap to build.
2. The min() rule assumes ordered trust tiers; PING capabilities may need a lattice rather than a total order for scope intersection. Confirm whether low/medium/high-style tiers or set-intersection is the right resolution.
3. Permit evaluates policy locally from a synced copy; PING's MissionRuntime may evaluate centrally. The contract (author in one place, evaluate at the edge, enforcer never writes policy) holds either way, but the sync mechanism differs.
