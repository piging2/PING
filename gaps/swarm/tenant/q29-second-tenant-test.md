# Q29 — SECOND TENANT TEST (SAFE TEST PLANE ONLY)
Date: 2026-10-01 ~18:30-18:50 MDT. Worker: TENANT SWARM.
Plane: scratch copies of Pig code pulled via pig-get.sh, executed in /tmp/swarm-q29 (my sandbox VM, NOT the Pig). Scratch ports (18999), scratch store files, scratch env vars. Served systems (journals, DBs, ports, containers) never touched. Scratch fully removed after (verified: port 18999 free, no residue).
Source SHAs: /home/nolan/ping @ 23e15f622 (testing/ladder-2026-09-30); /home/nolan/projects/ping-fyd-converged @ 300c9c91 (fyd/convergence-2026-09-28); journal gateway from /home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs.
STOP CONDITION (cross-tenant leak): NOT TRIGGERED. No synthetic tenant read PING-tenant private data or vice versa at any point.

## Synthetic tenants used
- `synthetic-alpha`, `synthetic-beta` (journal gateway / capability grant / tenant-context)
- `synthetic-beta` (approval_request.py)
Tenant-id regexes enforced: gateway `^[a-z0-9-]{1,64}$`; grant `^[A-Za-z0-9][A-Za-z0-9-]{0,63}$`; tenant-context `^[a-z0-9-]{1,64}$`. Note: the dogfood name `tenant::ping` would FAIL the gateway pattern (colons) — the gateway's tenant convention is site-id slugs, not `tenant::` URNs.

## Behavioral results (all scratch, real code bytes)

### 1. OBJECT FLOW — fyd-journal-gateway (server.mjs), scratch port 18999
- Write FYD_SITE_OVERLAY for alpha and beta (Bearer token set): 200, deduped:false.
- Read tenant=synthetic-alpha → exactly 1 event, all tenant_id=synthetic-alpha. beta → exactly 1. No cross-read.
- Read without ?tenant → 400 tenant_required. (Fail closed on read.)
- Smuggle write (tenant_id=alpha, event_data.siteId=beta) → 400 tenant_mismatch, nothing stored.
- Idempotent request_id replay by SAME tenant → 200 deduped:true, original event_id returned, no new append.
- request_id reuse by DIFFERENT tenant → 400 request_id_tenant_conflict, original event_id NOT disclosed (zero disclosure).
- Write without token → 401 write_auth_denied (fail closed).
- GET / journal marker derived from the scratch store path (distinct from live) → journal identity assertion works.
VERDICT: PASS. No cross-tenant leak.

### 2. MISSION FLOW — mc-approval/approval_request.py
- request_approval(tenant="synthetic-beta") → ok, record carries immutable tenant "synthetic-beta".
- request_approval(tenant=None) → legacy record, tenant None.
- authorize_approval_transition on synthetic-tenant record → ok.
- authorize on legacy record → FAILS CLOSED: `tenant_unknown` (typed refusal, no state change).
- Re-request same (digest, capability, actor, tenant) → deduped to existing record (created=False).
- ApprovalStore takes an explicit path; no implicit cwd. (_emit seam stubbed in scratch; store write precedes it.)
VERDICT: PASS. No default-tenant invention; legacy records cannot be approved.

### 3. CAPABILITY FLOW — tenant_capability_grant.js (actual file, node require)
- validateGrant({... tenant:'synthetic-alpha', ...}) → valid, no errors.
- checkGrant(grantA, {tenant:'synthetic-alpha'}) → authorized:true.
- checkGrant(grantA, {tenant:'synthetic-beta'}) → authorized:false, "tenant mismatch".
- validateGrant with tenant missing → invalid, "invalid tenant: undefined".
- No default-tenant fallback anywhere in validate/check (strict === comparison).
VERDICT: PASS.

### 4. ASK FYD / PROJECTION GATES — src/fyd/tenant/tenant-context.ts (actual code, tsc-transpiled in scratch)
11/11 probes on the real gate functions:
- requireTenantContext: ok for valid ctx; TENANT_CONTEXT_MISSING for null, malformed, path-traversal ids.
- assertTenantKey: ok for same-tenant key; CROSS_TENANT_REFERENCE both directions; MISSING for absent ctx.
- tenantScopedDir: resolves for valid slug; refuses traversal attempts.
- withTenantContext: binds verified id; refuses null ctx.
- scopedAnswerAskFyd / scopedGetProjection (read, full-file): assert tenant key BEFORE any I/O; refusal is a thrown typed error, never null/[].
VERDICT: PASS (gate logic). Full Ask FYD execution needs the whole FYD build tree — out of safe-plane scope; the gate layer itself is fully covered.

## Static hunt — hardcodes, fallbacks, globals (Pig grep, read-only)

### FAIL F1 — hardcoded customer tenant as default namespace binding
`/home/nolan/ping/gateway/bootstrap/gateway_runtime.js:443-458`: static operator map — "Business sources default to tenant::hpp" — 7 sources (review-authority, customer-authority, project-authority, email-connector, sms-connector, google-connector, github-connector) hardcoded to the legacy Happy Place customer tenant. A second tenant requires code edits. The binder design (namespace_binding.js) is tenant-neutral ("requested wins iff bound", default core::owner); only the table is hardcoded.

### FAIL F2 — `tenantId = 'hpp'` destructuring defaults (19 sites)
- `ping-runtime/business/project_authority.js` lines 108, 163, 210, 222, 256, 279, 314: every command path silently operates on the HPP tenant when tenantId is omitted. SQL schema lines 25, 64: `tenant_id TEXT NOT NULL DEFAULT 'hpp'`.
- `ping-runtime/business/ai_workspace_authority.js` lines 110, 130, 150, 170, 190, 210, 249 (6 execute* paths); schema line 23: `DEFAULT 'hpp'`.
- `ping-runtime/ai/huggingface_adapter.js` lines 112, 142, 178, 209, 240, 278 (6 execute* paths).
- `ping-runtime/business/customer_authority.js:581`: `owner: 'hpp'` descriptor.
Any caller that forgets tenantId writes/reads the Happy Place tenant. This is precisely Q29's "PING-specific semantic hack that would break the day a second tenant exists" — and it is customer-specific (HPP), not even the dogfood tenant.

### PASS — no other hunt items found
- Hardcoded "nolan"/"geske" in execution logic: none (only decision-provenance comments, e.g. "Nolan 2026-09-25 CEO direction").
- Default to dogfood tenant `tenant::ping`: ZERO occurrences in ping-runtime — the dogfood tenant is stamped by lanes, never a code fallback. Good.
- Global cache/key/namespace without tenant keying in the canonicalization/capability path: none found (binder holds an operator map only).
- Implicit cwd in tenant path resolution: none (journal gateway STORE is repo-relative with FYD_JOURNAL_STORE override; ApprovalStore takes explicit path; tenantScopedDir takes explicit baseDir).
- Singleton customer config: none beyond F5.

## Layer honesty
Behavioral PASS results are on code-byte-identical copies in scratch. The F1-F5 findings are REPO (testing/ladder-2026-09-30), verified in the current branch — not claimed about served containers. The ping-runtime business authorities are old-lane code; whether they are live-callable on the served path is a separate served-plane question (P0-2 served gateway predates W-series), which this read-only probe did not touch.

## SMALLEST FIX IF FAIL (for the F1-F5 findings)
- Replace `tenantId = 'hpp'` destructuring defaults with required tenantId (fail closed, tenant_required) in project_authority.js (7), ai_workspace_authority.js (6), huggingface_adapter.js (6); change SQL `DEFAULT 'hpp'` to no default or a sentinel that fails closed; replace `owner: 'hpp'` with tenant-derived value.
- Move the 7-source binding table out of gateway_runtime.js into operator-provisioned config (env/file) per the standing P0 plan; keep "requested wins iff bound".
- These are implementation tasks (needs lane + Nolan's word on the schema change), recorded here only as findings.
