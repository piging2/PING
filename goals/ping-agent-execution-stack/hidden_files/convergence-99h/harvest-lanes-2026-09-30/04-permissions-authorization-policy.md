# Lane 04: Permissions / Authorization / Policy

READER LANE 4 of 10, ecosystem harvest sweep (CEO-ORDER-ECOSYSTEM-HARVEST-2026-09-30).
Read-only reconnaissance. Nothing installed, no dependencies added, no code modified.
Report date: 2026-09-30. Author: Pigi (reader lane, no write authority exercised).

Domain: principal to tenant to capability to effect, revocation, delegation,
attenuation (narrowing a capability), explainable denial.

## 0. Search record: where I looked and what was reachable

| Location | Reachability | What it is |
|---|---|---|
| /home/hatch/workspace (this VM) | REACHABLE | PING monorepo, git remote https://github.com/piging2/PING. Local branch p0/approval @ cf4442f (58 ahead of master, unpushed); security/secret-redaction-2026-09-28 @ 9652896 (2026-09-28). |
| /home/hatch/workspace/lane-p01/tree/ | REACHABLE | Synced copy of the Pig FYD tree at commit 0264d517 (sha256-identical safe-fetch.ts). Used as FYD current-implementation evidence. |
| /home/hatch/workspace/fyd-build | REACHABLE | Local FYD builder repo (local-only, no remotes). |
| /home/nolan/projects/ping (the Pig) | REACHABLE via ~/workspace/bin/pigwsl-exec (tailnet egress proxy; direct SSH blocked) | FYD repo, remote piging2/fyd.git, branch fyd/builder-harvest-trackc-2026-09-28 @ f94bba39 ("P0-2 port: bind tenant at proposal creation"). mc-approval/ ported in. |
| /home/nolan/projects/CRX_REMOTE | REACHABLE via pigwsl-exec | crx-runtime checkout, stale b833d91 (remote main 6c4b531). Remote-tracking branch feature/namespace-entitlements inspected read-only via git objects (no checkout). |
| /home/hatch/workspace/crx-autonomous-missions/repos/* | REACHABLE | Vendor agent-framework clones (not CRX proper). One orphaned orca variant with session-auth code; not CRX harvest. |

Correction note: the first draft of this report recorded the Pig as
UNREACHABLE (direct SSH blocked). ~/workspace/AGENTS.md documents
pigwsl-exec as the sanctioned path; once used, the Pig locations above
were verified directly. The 2026-09-30 P0 "new 403 capability registry"
work from the side chat was searched for on the Pig and NOT found as a
distinct registry artifact; the FYD-side 403s found are the tenant and
demo-owner gates described in section 1g. Treat the new registry as
UNVERIFIED from this lane.

Anonymous ls-remote confirms GitHub state only: piging2/PING main @ 81b3248,
ngesk2/crx-runtime main @ 6c4b5317. No GitHub API (gh unauthenticated).

## 1. PING existing implementation (the reached capability system)

Verified from reachable code. This is the system any external primitive must
beat or be judged against.

**1a. Operator-provisioned caller registry.**
`pig-fb/copilot-broker/src/identity-state.js`: identity records with 8 states,
operator-authorized. The lane-c orca adapter hard-codes the containment:
Copilot identities 1..4 only, identity_5..10 are DENIED explicitly
(`orca-adapter/adapter.js` header, lane-c/1.2.0). This is the "operator
provisions principals" half of principal to tenant to capability to effect.

**1b. Work-order capability label.** `orca-adapter/adapter.js` (lane-c):
every dispatched unit carries `{missionId, runId, executionId, input_hash,
tenant, capability}`. The idempotency key is computed over
`{execution, input, tenant_id, capability}`, so capability is part of
exactly-once identity. Note: `capability` here is a string label, not a
bearer token. It names an authority; it does not prove one.

**1c. ApprovalRequest primitive with typed denial.**
`mission-control/approval_request.py` (landed p0/approval, 2026-09-27):
typed statuses WAITING_APPROVED/DENIED/EXPIRED/CANCELLED/SAFE_NOOP and
`deny_approval(store, approval_id, approver_identity, reason="")` which
records the denial with a reason and emits MC_APPROVAL_DENIED. This is the
existing explainable-denial seam: denials are events with reasons, not
silent falses. Gap: the reason is free text, not a structured
{failedAt, checkedInputs, failedCheck} envelope.

**1d. Digest-bound proposals.** `mission-control/proposal_record.py`:
exact canonical bytes (sorted keys, compact JSON) plus sha256 digest
binding; proposal_id is deterministic from mission_id + digest. This is the
"NO EXACT PROPOSAL DIGEST → NO APPROVAL" primitive the 2026-09-30 CEO
order requires.

**1e. Fail-closed credential boundary (v0 principle, already live).**
`pig-fb/copilot-broker/src/credential-boundary.js`: broker state holds
identity_id only, never token material; ambient token vars scrubbed from
every child env; `assertNoTokenMaterial` guards persisted state. Commit
9652896 (P0-SECRET-01, 2026-09-28) added `redactEnvelope` /
`redactWorkerText` at worker-prompt construction: raw secrets never enter
the model context, the tmp prompt file, or the persistent
hermes-prompt.txt on the Pig. 139/139 falsifier green, 234/234 selftests
green. This is PING already doing "agent uses capability without
possessing the secret": the worker gets a redacted task brief; the
executor (CLI/SDK with its own stored credential) owns the secret.

**1f. Tenant boundary with typed refusal.** FYD side, synced copy
`lane-p01/tree/src/fyd/tenant/tenant-context.ts`: `requireTenant` refuses
BEFORE any I/O; a cross-tenant reference is REFUSED with a typed
TenantContextError (REJECTED), never an empty result, never null, never
silent fallback. tenantId in every store key and tenant-scoped paths;
actorId is audit-only ("authentication alone never grants mutation").
This is the tenant half of principal to tenant to capability to effect,
and it is the second explainable-denial seam.

**1g. FYD-side capability verdicts and machine-readable 403s (verified on the
Pig).** `src/fyd/owner-mode/capability.ts`: `evaluateCapability(actor,
operation, site)` returns a `CapabilityVerdict`
`{capability, allowed, reason, actorId, relationshipKind}`. Deny is the
default; every verdict carries its reason. The file states explicitly this
is DEMO scaffolding ("THIS IS NOT AUTHENTICATION... Nothing here may back
a production authorization decision"), but the verdict shape is the
explainable-denial envelope this lane asks for. HTTP denials are typed:
`cross_tenant_denied` (403, zero disclosure: only the requested id, never
the mission's tenant) on the MC missions route;
`demo_owner_mode_required` (403, with NOT_REAL_AUTH disclaimer) on the
customize approvals route; `CSRF_FAILED` (403) on auth unlink.

**1h. New 403 capability registry (Pig-side, UNVERIFIED from this lane).**
Per CEO-ORDER-CONTINUITY-NOT-FEATURE-WAVE-2026-09-30: the registry entry
has zero capabilities and approvals therefore fail closed; provision only
exact minimal capabilities, no wildcards; invariants NO VALID PRINCIPAL
→ NO APPROVAL; NO REQUIRED CAPABILITY → NO APPROVAL; NO EXACT PROPOSAL
DIGEST → NO APPROVAL; NO TENANT/OWNER MATCH → NO APPROVAL. A Pig-side
search found no distinct registry artifact matching this description;
the work may live in the side chat's working tree. Recorded as
UNVERIFIED, not as a finding.

**1h. Canonical privacy namespaces.** `core::` / `tenant::` namespaces
with fail-closed regex validation in the event pipeline (per
jev-archaeology/work-laneC/task4-namespaces.md, System B). CRX's
`feature/namespace-entitlements` ("per-principal namespace entitlements")
is unmerged side work.

**Naming-collision warning (do not conflate):** `pig-fb/capability-registry.json`
is a WORKER STRATEGY registry (which FB scraping strategy to prefer),
with the explicit authority note that it is "a discovery projection, not
an authority". It is not the auth capability registry. Per the standing
law: collapse authority, do not collapse semantics.

## 2. Candidate evaluations

Format: PRODUCT NEED → FYD CURRENT → PING EXISTING → CRX HARVESTABLE →
EXTERNAL → REACHED/UNREACHED → DUPLICATION RISK → SECURITY/TRUST
BOUNDARY → SMALLEST DELTA → verdict.

### C1. Attenuated capability tokens: macaroon construction (Google 2014)

**PRODUCT NEED.** Delegation without ambient authority: a principal hands
a NARROWED capability to a downstream agent, cryptographically unable to
widen it, without a server round trip. This is the attenuation +
delegation half of the lane, which no PING primitive currently expresses.

**FYD CURRENT.** No token grants at all. Tenant boundary (`requireTenant`)
is enforced at execution scope, and portal Circle capabilities are
fail-closed UI projections (`fyd/capabilities/runtime.ts`). Delegation of
authority between agents is not a FYD concept yet.

**PING EXISTING.** Capabilities are operator-provisioned labels, not
delegable tokens. The orca adapter's work order carries a `capability`
string but no proof; the downstream Hermes worker on the Pig inherits
whatever the caller had (confused-deputy shape). Revocation of a grant is
an operator config edit, not a cryptographic or protocol operation.

**CRX HARVESTABLE.** Verified: the namespace-entitlements pattern (C7);
orthogonal to token attenuation, no conflict.

**EXTERNAL.** Macaroons: "Cookies with Contextual Caveats for
Decentralized Authorization in the Cloud" (Birgisson, Politz, Erlingsson,
Taly, Vrable, Lentczner; NDSS 2014). Chained-HMAC construction:
`sig_n = HMAC(sig_{n-1}, caveat_n)`. Adding a caveat is easy; removing one
is impossible. Attenuation and delegation require no server round trip.
Third-party caveats allow a discharge protocol where an unrelated service
certifies a condition. Verified via the Stanford-hosted paper PDF and the
Google Research publication page.

**REACHED.** Paper and construction verified. No dependency taken.

**DUPLICATION RISK.** Low if implemented as a token ENVELOPE inside the
existing registry: the registry stays the authority (mints roots), the
token format is just how a grant travels. It would DUPLICATE the registry
if built as a parallel minting authority.

**SECURITY/TRUST BOUNDARY.** The chained-HMAC verifier must hold the root
key, so this construction works INSIDE one trust domain (PING gateway and
its executors) but not across independent services. Root key lives with
the trusted executor (the adapter/broker), never in the agent's context.
That is exactly the v0 shape in section 7.

**SMALLEST DELTA.** Define one capability-token envelope:
`{root_id, caveats: [...], sig}`; mint at the registry (operator or
approved proposal), attenuate by appending caveats (resource subset,
operation subset, expiry, tenant binding), verify at dispatch. No new
store, no new authority, no new dependency. PING already has HMAC-capable
crypto in the vendored adapters; the envelope is ~200 lines.

**→ ADAPT.** Port the construction into PING's registry as the grant
envelope. This closes the one proven gap in the reached system
(section 5). Do not adopt a macaroon library: implementations are
fragmented and unmaintained; the construction is small enough to own.

### C2. Biscuit tokens (asymmetric variant of the same idea)

**PRODUCT NEED.** Same as C1, but where verification must happen OUTSIDE
the trust domain that minted the token.

**FYD CURRENT / PING EXISTING / CRX.** Same as C1.

**EXTERNAL.** Biscuit tokens (biscuitsec.org ecosystem): Ed25519-signed
token blocks carrying Datalog facts and checks; anyone holding the public
key can verify without the secret; attenuation appends a block with
`check` clauses (e.g. `check if time($time), $time < <expiry>`); per-block
revocation identifiers let revoking a parent id kill all attenuated
children (verified via nervosnetwork/fiber biscuit-auth docs and the
biscuit-sf-bundle README, 2026).

**REACHED.** Construction and revocation semantics verified from docs.

**DUPLICATION RISK.** Medium: Datalog evaluation is a second decision
semantics beside the approval/tenant chain. High overlap with C1's
envelope for in-domain use.

**SECURITY/TRUST BOUNDARY.** Asymmetric verification removes the shared
root key, which matters only when a token must be verified by a party
that must not mint. Inside PING's single domain (gateway + adapters +
Pig executors), that property buys nothing and the Datalog engine is new
attack surface.

**SMALLEST DELTA.** None today.

**→ LEARN (with REFERENCE posture).** Keep the revocation-identifier
design (revoking a parent kills children) as the reference answer for
when delegation crosses a trust boundary (e.g. a customer tenant's own
executor verifying PING-minted grants). Revisit only if a reached arrow
requires third-party verification. No code now.

### C3. OpenFGA / SpiceDB / Zanzibar (ReBAC)

**PRODUCT NEED.** Fine-grained access over shared objects with
relationship graphs ("owner of document", "member of team that owns
folder"): `Check(user, relation, object)` against stored tuples.

**FYD CURRENT.** Authorization is tenant-scoped file stores plus typed
REFUSED denials. There is no shared-object graph between tenants and no
reached need for per-object relationship resolution.

**PING EXISTING.** Authorization is per-principal caller registry plus
tenant context plus approval chain. Relationships that matter (principal
to tenant, tenant to object) are one hop, not a graph.

**CRX HARVESTABLE.** Verified: the namespace-entitlements pattern (C7); it is a principal-to-namespace map, not a ReBAC graph, and does not change this verdict.

**EXTERNAL.** OpenFGA: Apache-2.0, Zanzibar-inspired ReBAC; stores
`user, relation, object` tuples; typed authorization model (DSL) with
`define viewer: [user] or editor`, hierarchies, exclusions, conditions;
`Check`, `BatchCheck`, `ListObjects`, `ListUsers`, `Expand`; Postgres 14+
/ MySQL 8; SDKs for Go/Node/Python/Java/.NET; production at Auth0 FGA
since Dec 2021. SpiceDB is AuthZed's Zanzibar implementation (same
shape). Verified via OpenFGA docs and java-sdk API listing.

**REACHED.** Model, API surface, and production history verified.

**DUPLICATION RISK.** HIGH. A ReBAC store would be a second authorization
authority beside the caller registry + tenant context + approval chain.
PING's rule: one authority per concern. Tuples replicate what the tenant
namespace already decides.

**SECURITY/TRUST BOUNDARY.** The tuple store becomes the source of truth
for "who can touch what". Today that truth lives in the operator
registry and the event plane. Migrating it outward weakens the existing
fail-closed posture.

**SMALLEST DELTA.** None. The only ReBAC-shaped need on the horizon is
per-principal namespace entitlements, which CRX already sketched as
`feature/namespace-entitlements`; if that ever lands it should extend the
existing namespace validation, not import a graph engine.

**→ REJECT.** Exception criteria: revisit if a reached product arrow
requires multi-hop relationship authorization that the tenant boundary
cannot express (concrete trigger: two tenants sharing one object with
different per-object relations, or an org hierarchy where permissions
inherit through three or more hops). A new arrow of that shape has not
been reached; the current arrows are all principal to tenant to object.

### C4. Cedar (permit/forbid policy language)

**PRODUCT NEED.** Externalized, analyzable authorization policy:
principal + action + resource + context, with explicit `forbid`
overriding `permit` and implicit deny.

**FYD CURRENT.** No policy language. Tenant gate is code, and the
directive says the boundary must refuse before I/O, which a sidecar PDP
cannot guarantee for file-backed stores.

**PING EXISTING.** The approval chain (principal, capability, proposal
digest, tenant match, approver identity) is effectively a policy, but it
is enforced by typed primitives with event evidence, not by a language.
Denials are explainable via events and reasons.

**CRX HARVESTABLE.** The namespace-entitlements pattern (C7) only; no policy/token engine there.

**EXTERNAL.** Cedar: Apache-2.0 policy language by AWS, used by Amazon
Verified Permissions. Policies are `permit(...)` / `forbid(...)` over
(principal, action, resource, context); forbid always overrides permit;
no applicable permit means DENY; schemas validate policies against the
entity model; sub-millisecond evaluation. Verified via AWS Verified
Permissions docs and the Cedar policy reference.

**REACHED.** Language semantics and the forbid-overrides rule verified.

**DUPLICATION RISK.** HIGH. Cedar would be a second policy decision
point. The 2026-09-30 orders require the approval/registry/tenant gates
to stay fail-closed and operator-owned; routing decisions through an
external language adds a policy store, a versioning story, and a second
semantics for "why was this denied".

**SECURITY/TRUST BOUNDARY.** "AI agents should not control or modify
their own authorization policies" (per the Cedar research note). PING
already enforces this by keeping grants operator-provisioned. Cedar adds
nothing here.

**SMALLEST DELTA.** Borrow the discipline, not the engine: (a)
forbid-overrides-permit as the stated conflict rule for the capability
registry (a deny-listed capability beats any grant); (b) implicit deny
as the documented default (already PING's posture, now stated in the
registry schema); (c) a schema for capabilities so invalid grants fail at
provisioning time, the way Cedar schemas validate policies. That is
documentation plus registry validation, not a language.

**→ REJECT the engine; ADAPT the discipline.** Exception criteria:
revisit if policy count or change rate makes code-enforced gates
unmaintainable (concrete trigger: more than ~50 distinct capability
policies changing faster than weekly with non-operator authors).
Today the registry is small, operator-owned, and slow-changing.

### C5. OPA / Rego (general policy engine)

**PRODUCT NEED.** Decoupled policy decisions (PDP) queried over HTTP or
embedded, Rego language, hot-reloadable bundles.

**FYD CURRENT / PING EXISTING / CRX.** Same as C4, plus: PING already
rejected a PDP shape for the SSRF/DNS-rebinding boundary (the check must
bind the socket at connect time; a PDP decision cannot do that).

**EXTERNAL.** OPA: CNCF policy engine; Rego declarative language;
`default allow := false` plus explicit deny-overrides pattern;
deployable as sidecar/daemon, embeddable via Go API or Wasm; named
decisions via `POST /v1/data/<path>` with an input document. Verified
via open-policy-agent/opa docs (integration, FAQ).

**REACHED.** Deployment modes and decision API verified.

**DUPLICATION RISK.** HIGHEST. A general engine invites the exact
failure the lane warns against: "authority is prose in JSON" becomes
"authority is prose in Rego". The agent-security-gate ADR found in
search (2026-06) proves the pattern from the other side: even OPA shops
keep the checks OPA cannot correctly decide in code and document the
delegation.

**SECURITY/TRUST BOUNDARY.** A sidecar PDP is a network hop on the
authorization path; its availability becomes the availability of every
effect. PING's current gates are in-process and fail closed without a
network.

**SMALLEST DELTA.** None.

**→ REJECT.** Exception criteria: revisit only if PING must evaluate one
shared policy corpus from runtimes in three or more languages with no
shared codebase (concrete trigger: a polyglot executor fleet where
in-process gates cannot be the single implementation). Today the gates
live in two runtimes (Node adapters, Python mission-control) sharing one
repo.

### C6. OAuth 2.1 token exchange (RFC 8693) delegation chains

**PRODUCT NEED.** Auditable delegation: when an agent acts on behalf of a
user, the token carries the actor chain so the resource server can see
the full path and reject if any link is revoked.

**FYD CURRENT.** No token delegation.

**PING EXISTING.** The approval chain IDENTITY → AUTHENTICATION →
CAPABILITY → PROPOSAL → APPROVAL → EFFECT is the same shape, but the
delegation path is reconstructed from events, not carried on the
request. The work order carries capability as a label with no chain.

**CRX HARVESTABLE.** The namespace-entitlements pattern (C7) only; no policy/token engine there.

**EXTERNAL.** RFC 8693 token exchange: `act` claim chains let a resource
server walk the actor chain; revoking any link invalidates derived
tokens at the next check (verified via the MCP authorization research
notes citing RFC 8693; the RFC itself is IETF standards track).

**REACHED.** Pattern verified; IETF standard, no dependency needed.

**DUPLICATION RISK.** Low: it is a field shape on the existing work
order, not a new system.

**SECURITY/TRUST BOUNDARY.** Carrying the chain on the work order makes
the delegation path tamper-evident (each hop recorded at dispatch) and
auditable without event reconstruction. It does not create authority;
the registry still mints.

**SMALLEST DELTA.** Add an optional `delegation: [{principal, capability,
at, attenuated_from}]` chain to the work order envelope; the dispatcher
appends its hop; the 403 gate rejects a chain containing a revoked or
unknown principal. Under 100 lines.

**→ ADAPT.** This is the audit half of C1. Together they give: grant
(C1 envelope) + path (C6 chain) + decision (approval primitive) + denial
(explainable 403).

### C7. CRX per-principal namespace entitlements (harvested, verified read-only)

**PRODUCT NEED.** Bind an explicit authority claim to the AUTHENTICATED
principal, never to a client-supplied label: a Bearer <redacted> must not be
able to claim an internal source (e.g. review-authority) to reach
namespaces it is not entitled to. This is the confused-deputy fix at the
ingest boundary, and the closest in-ecosystem relative of ocap's "no
ambient authority".

**FYD CURRENT.** FYD's tenant boundary (`requireTenant`) already refuses
before I/O, but the entitlement concept (which PRINCIPAL may claim which
namespace) lives only in PING/CRX ingest code, not in FYD.

**PING EXISTING.** Canonical privacy namespaces (`core::` / `tenant::`)
with fail-closed regex validation exist in the event pipeline, but the
PIG-side ingest authorization found in this lane keys namespace claims
off the request body, not the authenticated principal (the exact hole the
CRX branch closes).

**CRX HARVESTABLE.** Commit 49d25df31 (2026-09-17, author Trish Nikitha),
branch feature/namespace-entitlements, inspected via git objects on
CRX_REMOTE without checkout. 55 insertions, 3 files:
- `namespaceEntitlements` option on CanonicalizationService: an
  entitlement map principal → entitled namespaces.
- `authorizeNamespace(principal, namespaceClaim)` returns
  `{authorized: boolean, reason: string}`; an explicit namespace claim is
  denied unless the principal is entitled. Implicit/default resolution
  preserves existing behavior.
- Gateway ingest routes authorize against the AUTHENTICATED principal
  (`api:<agentId>` from `req.authenticatedAgent`), never
  `body.source`. `body.source` remains emitted provenance but grants no
  authority. Missing identity fails closed.
Status: side effort, NOT an ancestor of crx-runtime HEAD, not in force.
Harvest the pattern, not the branch.

**EXTERNAL.** None; this is intra-ecosystem harvest.

**REACHED.** Commit content, diff, and security rationale verified.

**DUPLICATION RISK.** Low: it is 55 lines extending the existing
canonicalization service, not a new authority. It would duplicate if
rebuilt as a parallel "entitlement service".

**SECURITY/TRUST BOUNDARY.** The entitlement map is operator-configured
(the "conservative initial entitlement policy" in gateway config). The
rule "body.source is provenance, never authority" is the single most
valuable line: it converts a client-supplied label into evidence instead
of a privilege.

**SMALLEST DELTA.** Port `authorizeNamespace` plus the entitlement map
into PING's canonicalization/ingest path (the convergence-zoom lane-d
pig-src gateway has the same ingest shape): authorize explicit namespace
claims against the authenticated principal, keep default resolution
unchanged, return `{authorized, reason}` for the explainable-denial
envelope.

**→ ADAPT.** This is intra-ecosystem gold: a proven, tiny, fail-closed
pattern that fixes a real confused-deputy hole and supplies the
machine-readable `{authorized, reason}` denial shape the lane needs.
No dependency, no new authority; port the 55-line idea.

## 4. MCP 2026-07-28 authorization: mirror vs MCP's job

Standing decision (CEO addendum): PING owns semantics and authorization;
MCP owns interoperability. Do not invent a general external agent
protocol. Verified against the official spec
(https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization):

What the spec fixes (verified):
- Authorization is transport-level and OPTIONAL; STDIO servers SHOULD
  NOT use it and instead "retrieve credentials from the environment".
- HTTP servers act as OAuth 2.1 resource servers; MUST publish RFC 9728
  protected resource metadata; clients MUST use RFC 8707 resource
  indicators so tokens are audience-bound to the specific server.
- "MCP clients MUST NOT send tokens to the MCP server other than ones
  issued by the MCP server's authorization server. MCP servers MUST NOT
  accept or transit any other tokens." Authority does not flow through a
  server to a downstream server.
- 401 responses SHOULD carry `scope` in WWW-Authenticate to guide least
  privilege; clients MUST treat challenged scopes as authoritative.
- Dynamic Client Registration is deprecated; Client ID Metadata
  Documents and pre-registration are preferred.

**What PING should mirror at its own boundary:**
1. Audience binding: every capability grant names its exact resource
   (the RFC 8707 analog). The new 403 registry should reject a grant
   presented to the wrong resource the way an MCP server rejects a
   mis-audienced token.
2. No-transit rule: an executor MUST NOT accept or forward a capability
   token minted for a different hop. Each delegation is its own grant
   (pairs with C1 attenuation and C6 chains).
3. WWW-Authenticate-style denial guidance: the 403 gate should return a
   machine-readable challenge naming the missing capability/scope, so a
   caller can request exactly that grant (least privilege by
   construction, matching PING's explainable-denial requirement).
4. Protected-resource metadata analog: a machine-readable document at
   PING's boundary advertising which capabilities exist and which
   principal classes may hold them (this is also the "design system as
   machine-readable capability surface" signal from the addendum).

**What stays MCP's job:**
The JSON-RPC wire protocol, tool discovery (`tools/list`), the OAuth
2.1 flows themselves, client registration mechanics, and any
enterprise IdP integration. If PING ever exposes tools to external
agents over HTTP, it should speak MCP authorization as a compliant
resource server and keep its internal capability semantics behind that
boundary.

**→ REFERENCE.** Keep the spec as the interop contract. Mirror the four
mechanics above in PING's own gates.

## 5. Incapability proof: the reached arrow the current system cannot express

Claim: the reached PING capability system is sufficient except for one
arrow. Proof of the gap, with a concrete reached scenario:

Today, ORCA dispatches a work order to the Hermes worker on the Pig with
a `capability` LABEL and the caller key's ambient authority. If that
worker must call a downstream tool on behalf of the mission, there are
exactly two options: (a) it inherits the full authority of the caller
(confused deputy: a poisoned prompt in the task brief escalates `read`
intent into `delete` effects, the exact CWE-441 shape the 2026 agent
literature warns about); or (b) an operator provisions a new principal
by hand. There is no way for the dispatcher to hand the worker a grant
that says "effect: post-comment, tenant: hpp, object: post:123,
expires: 2h" and have the worker be cryptographically unable to exceed
it, without the operator in the loop.

The C1 envelope (attenuated capability token) plus the C6 delegation
chain is the smallest construction that expresses this arrow. No
external engine is required; the registry mints, the token narrows, the
gate verifies. This is why C1 is ADAPT and not REJECT: the gap is real,
reached, and narrow.

Revocation completes the proof: today revoking a grant is an operator
config edit. With C1, revoking the root id kills all attenuated children
(the Biscuit revocation-identifier design, section C2); with C6, any hop
in the chain can be revoked and the next dispatch check fails closed.
Machine-readable denial (structured failedAt envelope on the 403 and on
`deny_approval`) is what makes the revocation legible.

## 6. Ranked top candidates

1. **C1 macaroon-style attenuated capability tokens → ADAPT.**
   The one proven gap: delegation with attenuation that cannot be
   widened, no operator round trip, no ambient authority. Port the
   chained-caveat construction into the registry as the grant envelope.

2. **MCP 2026-07-28 authorization mechanics → REFERENCE (mirror 4 items).**
   Audience binding, no-transit rule, WWW-Authenticate denial guidance,
   machine-readable capability surface. MCP owns interop; PING owns the
   semantics behind it.

3. **C6 RFC 8693 delegation chains → ADAPT.** Carry the actor chain on
   the work order; reject chains with revoked links at dispatch. The
   audit half of C1, under 100 lines.

4. **C7 CRX per-principal namespace entitlements → ADAPT.**
   Intra-ecosystem gold: 55 lines, proven on a real confused-deputy hole.
   Authorize explicit namespace claims against the authenticated
   principal, never the client-supplied label; return {authorized,
   reason}. Port into PING's canonicalization/ingest path.

5. **v0 principle (capability without secret possession) → ADOPT AS LAW.**
   Already live in the broker boundary and P0-SECRET-01. Remaining
   delta: SECRET REFERENCE to AUTHORIZED BROKER (work orders carry
   secret references, only the executor resolves them) and retiring the
   dormant `explicitToken` valve. See section 7.

6. **Cedar/OpenFGA/OPA → REJECT with exception criteria.**
   Each would install a second decision authority. Harvest only the
   discipline (forbid-overrides, implicit deny, schema-validated
   grants). Revisit triggers are stated per candidate.

## 7. v0 signal: agent uses capability without possessing the secret

**Where PING already does this (verified):**
- `pig-fb/copilot-broker/src/credential-boundary.js`: broker state
  holds identity_id only; `assertNoTokenMaterial` guards every
  persisted object; ambient token env vars are scrubbed from every
  child process env, so the stored `copilot login` identity is
  authoritative and nothing ambient can hijack it.
- Commit 9652896 (P0-SECRET-01): `redactEnvelope(workOrder.input)` and
  `redactWorkerText(taskBrief)` at worker-prompt construction. Raw
  secrets never enter the model context, the tmp prompt file, or the
  persistent hermes-prompt.txt on the Pig. Six proven leak classes
  closed; 139/139 falsifier, 234/234 selftests.
- Pig bearer tokens live in the ping-gateway container env,
  re-resolvable via SSH, never written to files, memory, or chat (per
  standing memory). The gateway is the trusted executor; agents get
  caller keys, not the secrets behind them.

**Where it still leaks (verified gaps):**
- `explicitToken` in `buildChildEnv`: a dormant single-spawn injection
  valve. Nothing calls it today, but the parameter exists and would put
  a raw token in a child env if ever used. It is the wrong shape: the
  token should be a reference resolved by the executor, not a value
  passed through the broker.
- The P0-SECRET-01 commit message names the residual class itself:
  "shapeless secrets under innocent keys remain out of scope pending
  SECRET REFERENCE → AUTHORIZED BROKER". A redaction list cannot catch
  what it cannot name.

**Smallest delta to make it the enforced pattern:**
1. Work orders carry `secretRef: "<vault>/<name>"` references, never
   secret values. Only the authorized executor (adapter/broker at
   dispatch) resolves the reference, server-side, at effect time.
2. Fail-closed lint/test: any secret-shaped value in a work order
   input or prompt fails the dispatch build (extend the P0-SECRET-01
   selftests with a positive control for references).
3. Retire the `explicitToken` parameter; its use case is replaced by
   (1).

**→ ADOPT AS LAW (already the direction; finish the delta).**
No new dependency. The envelope from C1 and the reference mechanism
are the same construction: the capability names what may be used, the
executor owns the material.

## 8. The ten harvest questions

- **What did we think we needed to build?** A policy layer for
  principal to tenant to capability to effect: engines, languages, or
  graph stores that could answer "may this principal do this effect"
  with delegation, attenuation, revocation, and explainable denial.

- **What already exists?** An operator-provisioned caller registry
  (identities 1..4, rest denied); digest-bound proposals with a typed
  approval/denial primitive that emits denial events; a tenant boundary
  that refuses before I/O with typed REJECTED errors; a credential
  boundary that keeps secrets out of agent context (P0-SECRET-01);
  canonical privacy namespaces with fail-closed validation; FYD
  capability verdicts `{capability, allowed, reason, actorId,
  relationshipKind}` with machine-readable 403s (`cross_tenant_denied`
  with zero disclosure); and the 2026-09-30 P0 four invariants
  (principal, capability, digest, tenant match), whose registry
  artifact is UNVERIFIED from this lane.

- **What is commoditized?** The interop mechanics: OAuth 2.1 flows,
  audience-bound tokens, protected-resource metadata,
  WWW-Authenticate challenges (all fixed by MCP 2026-07-28 and its
  RFCs); the chained-caveat and Datalog token constructions
  (macaroons 2014, Biscuit); the ReBAC tuple engine (OpenFGA);
  the permit/forbid policy language shape (Cedar). None of these need
  to be invented.

- **What remains unsolved?** Delegated attenuation without ambient
  authority: no reached primitive lets a dispatcher hand a narrowed,
  un-widenable grant to a downstream agent without an operator in the
  loop (the incapability proof in section 5). Revocation is an
  operator edit, not a protocol operation. Denial reasons are free
  text in some seams, structured in others; no single envelope.

- **What should FYD harvest?** The v0-shaped boundary as law: the
  trusted executor owns secrets, agents hold references. Mirror the
  four MCP mechanics at PING's boundary (audience binding, no-transit,
  machine-readable 403 guidance, capability surface document). ADAPT
  the macaroon attenuation construction and the RFC 8693 delegation
  chain as small native envelopes. ADAPT the CRX
  namespace-entitlements pattern (C7): authorize explicit authority
  claims against the authenticated principal, never the client-supplied
  label. Keep Biscuit's revocation-identifier design as the reference
  for cross-boundary revocation.

- **What should FYD never build?** A general-purpose policy engine
  (OPA/Rego/Cedar-style PDP), a ReBAC tuple store, a custom OAuth/OIDC
  server for internal agents, a general external agent auth protocol,
  or a macaroon/Biscuit library dependency. Each is either MCP's job,
  a second authority, or a ~200-line construction. FYD WILL NOT BUILD
  entries: (1) standalone policy decision service, exception trigger
  in C5; (2) relationship-graph authorization store, exception trigger
  in C3; (3) internal token-format library dependency, exception: no
  maintained implementation exists for the chosen envelope.

- **What existing PING code is now duplicative?** The archived
  `ExteriorAuthMiddleware` (postgres credential table plus in-memory
  fallback) is superseded by the operator caller registry plus the new
  403 capability registry; it should stay archived and never be
  revived. `pig-fb/capability-registry.json` (worker strategy
  projection) collides by name with the auth capability registry and
  should be renamed to prevent the exact semantic collapse the
  standing law forbids. The dormant `explicitToken` valve in
  credential-boundary.js should be retired in favor of secret
  references.

- **What new optionality does this create?** Attenuated grants make
  per-proof, per-tenant, per-object delegation cheap: an approved
  proof can mint "comment on post:123 for tenant hpp, 2h" without
  operator involvement and without exposing the caller key. The
  no-transit rule plus delegation chains makes every hop auditable,
  which is the precondition for letting external agents (Hermes, MCP
  clients) execute effects at all.

- **What assumption did this falsify?** That PING needs a policy
  engine to be "serious" about authorization. The reached system
  already decides principal to tenant to capability to effect with
  fail-closed defaults and event-evidenced denials; the engines would
  add a second authority, not more safety. Also falsified: that
  delegation requires a server round trip (macaroon attenuation is
  offline) and that revocation requires online checks (revocation
  identifiers propagate through the chain).

- **What one experiment would settle the remaining question?** Mint
  one attenuated capability token from the existing registry for a
  real bounded effect (e.g. "post one comment on post:123, tenant
  hpp, expires in 2h"), dispatch it through the orca adapter to the
  Hermes worker with the delegation chain attached, then attempt to
  exceed it (wrong object, wrong tenant, after expiry, widened
  caveat) and verify each attempt fails closed with a structured
  denial at the 403 gate. If all four fail closed and the legitimate
  effect executes with full evidence, the C1+C6 construction is
  proven and the lane closes.
