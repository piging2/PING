# H-U4 IDENTITY CONTRACT CONVERGENCE

Lane H (U4). Read-only. 2026-09-28 ~20:00 MDT.
Inputs: C-IDENTITY-T09.md (12 handoffs, 4 flags); 03-DO-NOT-REIMPLEMENT-REGISTER.md entry 2 (identity-authority lineage); bounded read-only Pig verification 2026-09-28 ~19:45-20:00 MDT (ssh, greps, md5s; zero product writes).
Jev: zero calls. No new IdentityAuthority proposed. No god class proposed.

## VERDICT

HARVEST. The contract is coherent and existing implementations satisfy all five concepts. The register entry 2 open question ("one semantic identity contract with separate types for ENTITY ID / ACTOR ID / CRYPTOGRAPHIC IDENTITY / TENANT-OWNER BINDING / AGENT ID") is answered below.

PROMOTION GATE: U4 is sufficient. Candidate 1 (U1/U2 tenant entitlement) may proceed to entitlement implementation under this contract. The rules are: the tenant is derived from the authenticated caller, never from the request body; write-time binding is consistency-enforced; every boundary violation is refused (401/403/400/typed throw), never answered with an empty result; demo and loopback authorities stay inside their fences. Three non-blocking follow-ups remain (none is a contract decision; see the gate close at the end).

## THE CONVERGED CONTRACT

Trust basis vocabulary (lane C): EXPLICIT, INHERITED, INFERRED, DUPLICATED, UNTRUSTED INPUT, ABSENT, RECONSTRUCTED.

Two things are refused in every concept: (1) authority-bearing identity accepted from untrusted input; (2) silently reconstructed authority-bearing identity.

### 1. ENTITY ID (what a thing is)

REQUIRED CONTRACT.
- Who may mint: the single owned minter, `IdentityAuthority.generate_id()` (UUID v7; prefers Postgres `uuidv7()`, falls back to pure-Python RFC 9562 v7, os.urandom-backed) and `IdentityAuthority.generate_deterministic_id(namespace, name)` (UUID v5) for derived identities. No other code may mint entity IDs.
- Who must verify: no semantic verifier is required. Authority-minted UUIDs are unforgeable by construction; the contract lives at the mint site, not at a check site. Format-only `isUuid` checks (TS lane) are acceptable as hygiene, not as identity proof.
- Acceptable trust bases: EXPLICIT only.
- Must be refused: DUPLICATED (a parallel minter), UNTRUSTED INPUT (an externally supplied ID treated as authority-bearing), RECONSTRUCTED (an ID silently re-derived outside the authority), ABSENT (an ID asserted with no minting authority).

WINNER (HARVEST): `/home/nolan/ping/runtime/authorities/identity_authority.py` (md5 8066f1417a5ca20aedd5376fc42a29ea, identical across /home/nolan/ping trees; verified generate_id at line 78, generate_deterministic_id present). This is the canonical minter.

SMALLEST DELTA: H12. `/home/nolan/ping/claim_worker.py` calls `uuid.uuid4()` directly at lines 88, 101, 158, 165 (verified), bypassing the authority. Delta: route those 4 call sites through `IdentityAuthority.generate_id()`. The lane is DORMANT/UNKNOWN reachability, so the fix changes no live behavior; it restores the one-minter contract. See flag 3 disposition.

### 2. ACTOR ID (who/what acts)

REQUIRED CONTRACT.
- Who may mint: only the verified identity flow. `deriveIdentityId` (src/fyd/identity/principal.ts:57-59) = uuidv5(FYD_IDENTITY_NAMESPACE, "provider-account:" + provider + "::" + issuer + "::" + subject), fed ONLY by a token that passed `verifyGoogleIdToken` (JWKS, provider.ts:215). Email is an attribute/claim, never canonical; no silent merge on email match; account linking requires the verified ID token of the current flow. The single fenced exception: the seeded demo actor, mintable only inside demo mode.
- Who must verify: the provider token verifier (JWKS signature check) for real actors; for the demo exception, the gate check (localhost/private host + NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1, gate.ts:38) before any demo authority is exercised.
- Acceptable trust bases: EXPLICIT for real actors; ABSENT-but-fenced for the demo actor (the fencing is part of the contract).
- Must be refused: an unverified actor bearing authority outside the demo fence; a controller relationship silently reconstructed for an unverified actor (H4 pattern) anywhere outside demo; INFERRED or RECONSTRUCTED actor identity on any real path.

WINNER (HARVEST): H2 (deriveIdentityId + verifyGoogleIdToken + HMAC session cookie, HttpOnly SameSite=Lax; sessions fail closed on missing/placeholder secret) plus H3 (DEMO_OWNER_ACTOR at src/fyd/owner-mode/capability.ts:61-64, fenced by gate.ts). No delta.

### 3. CRYPTOGRAPHIC IDENTITY (proof of identity)

REQUIRED CONTRACT.
- Who may mint: the external issuer (Google OIDC: issuer + subject) and the session secret authority (`FYD_SESSION_SECRET`, 32-character minimum).
- Who must verify: `verifyGoogleIdToken` (JWKS signature check); session HMAC verify with `timingSafeEqual` (session.ts:57-60). Sessions fail closed when the secret is missing or a placeholder (loadSessionConfig, session.ts:31-47).
- Acceptable trust bases: EXPLICIT only.
- Must be refused: DEV-ONLY stand-ins on any constitutional path (dev-signer.ts is labeled "a clearly labeled dev stand-in, not the constitutional path"; practice-page envelopes only); ABSENT; INFERRED or RECONSTRUCTED cryptographic claims.

WINNER (HARVEST): H10 (FYD owner auth: Google OIDC + session HMAC). H11 stays dev-only by contract. No delta.

### 4. TENANT-OWNER BINDING (who owns which tenant scope)

REQUIRED CONTRACT.
- Who may mint: exactly three legal minters.
  (a) Operator registry lookup on an authenticated caller key: `x-mc-caller-key` header -> `resolveCaller` -> server-side registry mapping provisioned key -> { agent_id, tenant, entitled_tenants } (src/app/api/mc/_lib/mc-dispatch-identity.ts; read per request, any read/parse failure throws and the route refuses, fail closed). The tenant is derived from the authenticated caller, never from the request body.
  (b) Write-time consistency binding at the journal gateway (tools/fyd-journal-gateway/server.mjs): tenant_id REQUIRED (400 tenant_required); aggregate_id must equal "fyd-site:" + tenant_id (400 tenant_mismatch); event_data.siteId must match tenant_id; request_id is bound to its tenant (400 request_id_tenant_conflict on cross-tenant reuse, without disclosing the original event_id). Read path enforces ?tenant on FYD_SITE_OVERLAY (fail closed).
  (c) An explicit TenantContext issued on the verified identity path, enforced by requireTenantContext / assertTenantKey / tenantScopedDir (src/fyd/tenant/tenant-context.ts): TENANT_CONTEXT_MISSING and CROSS_TENANT_REFERENCE are thrown, never returned as empty/null; tenant-scoped paths kill traversal at the boundary.
- Who must verify: the dispatch route (401 identity_required on missing/unknown key; 403 tenant_mismatch when the body tenant disagrees; 403 tenant_not_entitled when the caller is not entitled; SECURITY ORDER per route.ts:251-253, 401 for every tenant string so provisioning cannot be probed); the gateway itself (400s above); any store path via TenantContextError throws.
- Acceptable trust bases: EXPLICIT for (a); INHERITED for operator-managed registry/broker state; INFERRED-but-consistency-enforced for (b). Shape-only inference (H6) is acceptable ONLY inside its loopback fence.
- Must be refused: UNTRUSTED INPUT as tenant authority (the body tenant is never trusted); ABSENT (no tenant context fails closed; no silent fallback); RECONSTRUCTED (H4-style: an unverified actor silently reconstructed as controller of every site); INFERRED-from-shape-only on any non-loopback surface; DUPLICATED binding authorities.

WINNERS (HARVEST): H5 (MC dispatch x-mc-caller-key identity; hardened route.ts with 401/403 semantics, verified live in the frozen/dirty tree that serves :3100) + H7 (journal gateway 400-pattern; verified at server.mjs lines 231/288/296/303/326) + tenant-context.ts (verified: requireTenantContext, assertTenantKey, tenantScopedDir; imported by planner.ts, object-builder.ts, scoped-stores.ts, which throw TenantContextError on violations).

OPERATIONAL NOTE (not a contract delta): the operator registry file named by CALLER_REGISTRY_PATH ('/home/nolan/workspace/mission-control/dispatch-identities.json') is ABSENT. Lane C reported it present; a Pig-wide search 2026-09-28 ~20:00 MDT found no dispatch-identities.json anywhere (/home/nolan/workspace, /home/nolan/projects/ping, ping-fyd-converged). Per the fail-closed design, loadCallerRegistry throws and the dispatch POST cannot authenticate any caller: the entitlement set is currently EMPTY. Provisioning the registry is an operator action. The contract stands; the registry is unprovisioned.

SMALLEST DELTA: none to the contract. See the gate close for the provisioning action and flag 2 fence.

### 5. AGENT ID (which agent identity executes)

REQUIRED CONTRACT.
- Who may mint: the operator. Static lists: SLICE_AGENTS = ['ollama','identity_1','identity_2','identity_3','identity_4'] (identity_5..10 DENIED, matching the 2026-09-26 owner directive), SLICE_TENANTS = ['happy-place','coppersmith-plumbing'] (src/app/api/mc/_lib/mc-dispatch.ts:30-33, verified); broker identities.json (operator-managed; verified live at /home/nolan/copilot-broker/state/identities.json, identities 1-10 present, 1-4 authorized).
- Who must verify: the route allowlist check (SLICE_AGENTS.includes(agent) for the body-selected dispatch target, route.ts:241; the adapter is consulted for real and its verdict is final); broker classification at runBroker. The authenticated CallerContext.agent_id from H5 is EXPLICIT.
- Acceptable trust bases: EXPLICIT for the caller agent_id (registry-derived); INHERITED for operator-managed broker state; INFERRED for the body-selected dispatch target (bounded by the static allowlist; body.agent from untrusted input can only select from the slice list, actual execution identity is server-side).
- Must be refused: UNTRUSTED INPUT beyond the allowlist; self-declared names as authority (H0 class-attribute labels are labels, not identity).

WINNERS (HARVEST): H8 (SLICE_AGENTS allowlist + route check) + H9 (copilot broker identities 1-4). No delta.

## FLAG DISPOSITIONS (from lane C)

FLAG 1 (H3/H4): seeded unverified demo-owner is controller of every demo site. DISPOSITION: KEEP-FENCED. Boundary: localhost/private host AND NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 (set on every :3100 restart by /home/nolan/start-3100.sh per standing protocol); every response stamped "DEMO OWNER MODE - not real authentication. No identity was verified."; approvals record approvedBy: DEMO_OWNER_LABEL. Reactivation risk: if the flag is ever ON for a public host, the seeded actor becomes a real authority with ABSENT trust. Outside the fence, this identity is refused under the ACTOR ID and TENANT-OWNER BINDING contracts above.

FLAG 2 (H6): x-mc-tenant header shape-checked only, loopback-safe. DISPOSITION: KEEP-FENCED. Boundary: MC missions READ routes, loopback operator surface only; the module docstring states this "is NOT authorization against a deliberate loopback caller." Exposure of these routes beyond loopback is the break condition: at that point the read scope must be bound to the authenticated caller context (H5 pattern), not patched with more shape checks. No change while loopback-only.

FLAG 3 (H12): claim_worker.py uuid4 direct minting bypass. DISPOSITION: FIX-REQUIRED. Boundary: replace the 4 direct uuid.uuid4() call sites (lines 88, 101, 158, 165) with IdentityAuthority.generate_id(). This removes the DUPLICATED minting authority and restores the one-minter ENTITY ID contract. The lane is DORMANT/UNKNOWN reachability, so the fix changes no live behavior. No new authority is created by the fix.

FLAG 4: stale byte-identical identity_authority.js claim in the register. DISPOSITION: CONVERGE. Boundary: the register entry 2 claim "identity_authority.js x3 byte-identical (sha c05060d0)" is FALSE. Current md5s (verified): 10c6f64b68aa9af0ebb2add8d7a99305 (runtime/kernel/authorities/), 61529b695b9223ff5fe20bd68009f62f (ping-runtime/authorities/), cfcbe9ea0c7a1e4c924aca43f6b31be5 (some worktree kernels), 19a7d160914363a49f49d8b613d5066f (worktree gateways). Four divergent variants. Correct register entry 2 to name the variants; the Python runtime IdentityAuthority (md5 8066f141) is the canonical minter; the JS copies are legacy/dormant mirrors and none is canonical. Do not build IdentityAuthority #5 on the false premise.

## PROMOTION-GATE CLOSE

Candidate 1 may proceed. The contract above is sufficient for U1 entitlement implementation: tenant derived from authenticated caller (H5), write-time binding consistency-enforced (H7, tenant-context), every violation refused (401/403/400/typed throw), body tenant never trusted, demo and loopback authorities fenced (flags 1, 2), single entity minter restored after the H12 fix (flag 3).

HARVEST list (no new code needed to satisfy the contract): runtime IdentityAuthority (identity_authority.py:78) for ENTITY ID; deriveIdentityId + verifyGoogleIdToken + session HMAC (src/fyd/identity/) for ACTOR ID and CRYPTOGRAPHIC IDENTITY; mc-dispatch-identity.ts + hardened dispatch route.ts + journal gateway server.mjs + src/fyd/tenant/tenant-context.ts for TENANT-OWNER BINDING; SLICE_AGENTS + broker identities.json for AGENT ID.

What exactly remains (non-blocking; none is a contract decision):
1. Provision dispatch-identities.json (operator action; currently absent, dispatch POST fail-closes until provisioned).
2. H12 fix: 4 call sites in claim_worker.py to IdentityAuthority.generate_id().
3. Register correction per flag 4 (four divergent JS variants; Python authority canonical).

The smallest missing contract decision, if one is ever needed: none. The only conditional owner decision is for flag 2: if MC missions READ routes ever leave loopback, the owner must approve replacing x-mc-tenant with authenticated caller binding before exposure. That decision is not required to unblock U1.

Lane C consistency note: lane C found H5/H6/H8 in the frozen tree /home/nolan/projects/ping (dirty, untracked _lib files, modified route.ts); those paths do NOT exist in the convergence tree /home/nolan/projects/ping-fyd-converged. Candidate 1 implementation must confirm which tree it builds against; the contract is tree-independent but the harvested files live in the frozen tree as of 2026-09-28 ~20:00 MDT.
