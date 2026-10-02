# PROPOSAL — served claim-verify gate + object-overrides principal requirement
**Worker:** W3. **Status:** PROPOSAL ONLY. Nothing applied, no commits, no live-runtime mutations.
**Findings:** F270–F275 (consumed: F162, F163, F246). **Served target:** `/home/nolan/projects/ping` @ `e48ef710`.

---

## PART 1 — claim-verify gate

### WHY
`POST /api/fyd/claims/[resourceId]/verify` in the served checkout writes claim state (CLAIMED → VERIFIED-CONTROLLED) with no gate: no session, no identity, no env flag, no Host check (F270). The only implemented verification method is `operator-attestation`, a self-asserted label + 10-char basis with no caller authentication (F271). Anyone can mark any existing claim verified.

### EVIDENCE
- Served `src/app/api/fyd/claims/[resourceId]/verify/route.ts:32-105`: body parsed first, `readClaim` at :77, `attestOperatorControl` at :85-94, `verifyControl` + `writeClaim` at :95-96. No gate (fleet/security/sec4-unauth-endpoints.md rows 78-79).
- `src/fyd/claim/verification-seam.ts:66-94`: `attestOperatorControl` accepts arbitrary `operatorLabel` + basis ≥ 10 chars; no identity check.
- `src/fyd/claim/machine.ts:113-140`: `verifyControl` stamps `verified-controlled`; `src/fyd/claim/store.ts:68`: `writeClaim` persists.
- Intended gate shape already proven at audited head: `repo-mirror/.../verify/route.ts` runs `demoDenied(req)` as the first statement of `POST` and returns typed 403 `{ ok:false, code:"demo_owner_mode_required" }` before any parsing/I/O.

### MINIMUM CHANGE
1. Add the gate call as the FIRST statement of served `POST`, before `ctx.params` / body parsing (the exact audited-head seam; served currently parses the body first — move the gate above parsing).
2. Keep every existing typed refusal unchanged (400 unknown-method, 501 method-unimplemented, 404 not-found, 409 bad-transition, 400 weak-proof). The only new failure mode is 403 `demo_owner_mode_required` (demo era) → 403 `principal_required` when real owner auth lands.
3. Typed operations (no code change to signatures now; contract change): treat `operator-attestation` as an `attest`-class input only; the CLAIMED → VERIFIED-CONTROLLED decision (`verify`) requires a verified principal. Until real owner auth exists, `verify` on `operator-attestation` is allowed only behind the demo gate; the route's 501/400s remain the honest "not built yet" answers for the other five methods.
4. Failure-closed: gate evaluation errors (missing Host header, env unreadable) → 403, never allow.

### TEST
- `POST` with `{ method:"operator-attestation", basis:"valid basis text", operatorLabel:"Mallory" }` on a CLAIMED claim, no demo env / public Host → 403 `demo_owner_mode_required`; `readClaim` afterward shows state still CLAIMED (nothing written). This is the F162 exploit chain, now refused.
- Same POST with `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` + `Host: localhost:3100` → 200, claim becomes VERIFIED-CONTROLLED with `verifiedBy` labeled and the proof note intact.
- Regression: 501 for `dns-txt`, 400 for short basis, 409 for re-verifying an already-verified claim — all unchanged.

### RESULT
- Served checkout gains the audited-head gate shape; self-attested verifications stop persisting on public/self-hosted builds (intended breakage). Demo flows keep working only under the explicit demo gate with the structural NOT_REAL_AUTH disclosure.
- F162/F246 (claim-verify part) remediated in the served tree. Real owner auth remains the follow-up: when it ships, replace `demoDenied` with a principal check at the same seam, first statement, same failure-closed contract.

---

## PART 2 — object-overrides approve path: replace the seeded stand-in

### WHY
The approve stage evaluates a capability against `DemoOwnerContext.forTenant` — a hardcoded `DEMO_OWNER_ACTOR` (`id: "demo-owner"`) treated as controller of every site by a seeded mapping that "verifies nothing" (`capability.ts:70-82`). The session cookie is read for audit notes only; the verdict never derives from it (`demo-chain.ts:58-67`). A second consumer, `customize/route.ts:72-74`, calls the same seeded actor outside the OwnerContext seam. Approvals bind the seeded actor into persisted records (`buildBoundApproval`) via `applyOwnerCommand` (F273, F274).

### EVIDENCE
- Factory: `src/app/api/fyd/objects/[objectId]/overrides/owner-context.ts:99-104` (`createOwnerContext` → `DemoOwnerContext.forTenant`); construction `owner-context.ts:130-136`; stand-in actor `src/fyd/owner-mode/capability.ts:59-62`; relationship mapping `capability.ts:70-82`; chain `src/fyd/owner-mode/demo-chain.ts:56-80`; actor context builder `overrides/patch-loop.ts:80`.
- Consumers: `overrides/route.ts` (`createOwnerContext`, `evaluateCapability` propose+approve, `applyOwnerCommand`, `buildBoundApproval`); `customize/route.ts:72-74` (direct `evaluateCapability(DEMO_OWNER_ACTOR, resolveDemoRelationship("", DEMO_OWNER_ACTOR), "owner.customize-approve")`).
- The seam's own docstring (`owner-context.ts` header) names the migration: "replacing the demo implementation with a PING identity/capability implementation means changing this factory's body, not the route."

### MINIMUM CHANGE (preferred: real principal requirement)
1. Change `createOwnerContext`'s body to construct a principal-backed context: session (`getPracticeIdentityId`) → verified PING identity → CONTROL RELATIONSHIP from a tenant ownership registry (replaces `resolveDemoRelationship`) → `evaluateCapability` on `owner.correct-fact`. Everything else (route, patch-loop, digests, bound approvals) is unchanged — the route only speaks the `OwnerContext` interface.
2. `DemoOwnerContext.forTenant` remains but becomes constructible ONLY when the demo gate passes (env flag + private host); construction attempt outside the gate throws `TenantContextError`-class failure, fail closed.
3. Port `customize/route.ts:72-74` to the seam (call `createOwnerContext` for its capability evaluation) instead of the direct seeded-actor call — the direct import of `DEMO_OWNER_ACTOR` outside the seam is removed.

### MINIMUM CHANGE (fallback if real owner auth is not ready: explicit demo disablement)
1. In served builds, the overrides route's approve stage returns typed 403 `owner_auth_unimplemented` for stage `approve`; propose stays as a read-only preview.
2. Demo builds keep `DemoOwnerContext` behind the demo gate with every response stamped `demoOwnerContext: true` (already present). The DEMO OWNER CONTEXT label on the Manage surface stays unmissable.
3. Already-persisted seeded-actor approvals are identifiable: the audit chain carries `demoScaffolding: true` (`demo-chain.ts`) — a migration script can enumerate them; they are never silently re-labeled as verified-owner.

### TEST
- Served, no demo env: `POST { stage:"approve", ...valid digests... }` → 403 `owner_auth_unimplemented` (fallback) or 403 `principal_required` (preferred), owner store unchanged.
- Demo env + localhost: full propose → approve → 200 with `approval.actor` labeled demo, chain audit carries `demoScaffolding: true`.
- `customize/route.ts` no longer imports `DEMO_OWNER_ACTOR` (grep check); its approvals flow through `createOwnerContext`.

### RESULT
- No mutation path in the served tree trusts a seeded principal. The approve stage is either principal-gated (preferred) or disabled in served builds (fallback). Demo honesty is structural: labeled every response, gated by env + private host, impossible to mistake for production auth.
- F163/F246 (overrides part) remediated in the served tree. F279 class 3 (seeded principals trusted by multiple consumers) closed: the seeded actor is constructible through exactly one seam, fail-closed outside the demo gate.

---

### What breaks if applied (both parts)
- Unauthenticated claim verifications and owner approvals on public/self-hosted served builds stop working. This is the intended breakage for a P0: the current behavior is unauthenticated state mutation.
- Legitimate demo workflows must run under `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` on localhost/private hosts (mirror behavior) or wait for real owner auth.
- Applying either part requires the decision to break those flows; Nolan's awareness is recorded in `fleet/served/w3-claim-verify-gates.md` (§ "Needing Nolan"). Apply in the sprint worktree (`/home/nolan/projects/ping-constitutional`) and port to the served checkout via the normal release path — never patch `/home/nolan/ping` live.
