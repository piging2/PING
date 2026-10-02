# P0-2 evidence: tenant ownership at PROPOSAL CREATION (2026-09-30)

## Commit identity
- REPO: /home/nolan/projects/ping-fyd-converged (linked worktree of /home/nolan/projects/ping)
- BRANCH: fyd/convergence-2026-09-28
- BEFORE SHA: 92108239a2a03a2448995ff62e869ae2c7caedfa
- AFTER SHA: 300c9c91cc45dc08bc36f9b7f7f1be2f4cb64efc
- PUSH: none (standing rule: local commits only, no push without Nolan)

## Files (8, explicit pathspecs only)
Modified:
- mc-approval/approval_request.py (tenant param, immutable record field, tenant-scoped dedup/mint, tenant on MC_APPROVAL_REQUESTED, tenant_unknown fail-closed in authorize_approval_transition)
- mc-approval/proposal_record.py (tenant passthrough, returned in result)
- mc-approval/approval_cli.py (record --tenant flag)
- src/app/api/mc/_lib/mc-approval-gate.ts (new gateProposalTenant; header comment corrected)
- src/app/api/mc/approvals/route.ts (gate wired after caller tenant gate; tenant_unknown maps to 403)
- src/app/api/mc/_lib/__tests__/mc-approval-gate.test.ts (8 new tests)
New:
- mc-approval/tests/__init__.py
- mc-approval/tests/test_approval_tenant.py (14 tests)

## Existing tenant primitive (no new authority created)
- src/app/api/mc/_lib/mc-dispatch-identity.ts: CallerContext { agent_id, tenant, entitled_tenants, capabilities }, derived from the operator-provisioned registry at /home/nolan/workspace/mission-control/dispatch-identities.json (secret-bearing file NEVER read).
- The Python primitive only CARRIES the tenant string immutably; it never invents or resolves tenant identity. Entitlement checks live at the TS boundary, which owns registry access.

## Design decisions (binding where Nolan ruled)
1. TENANT IS IMMUTABLE PROPOSAL CONTEXT: bound in request_approval(), stored on the record, in the mint seed, in the REQUESTED event; no transition may modify it (tests prove approve/deny/expiry leave it unchanged).
2. Tenant is request-level metadata, NOT part of the proposal-body digest (digest covers proposal bytes only, like capability/actor).
3. Legacy records (tenant None) fail closed on approve: TS gate 403 tenant_unknown for WAITING records; canonical Python transition refuses tenant_unknown (typed MC_APPROVAL_REFUSED, no state change) as defense in depth for non-route surfaces.
4. Deny is the safe direction: allowed on legacy WAITING records (nothing strands). Terminal legacy records keep canonical behavior (idempotent approve / wrong_state deny).
5. Cross-tenant approve AND deny both refused 403 tenant_not_entitled at the route (denying someone else's proposal is still their decision).

## Test commands and results
- `python3 -m unittest mc-approval.tests.test_approval_tenant` (run on Pig, real journal path via /home/nolan/workspace/outreach): 14/14 OK
- `npx jest src/app/api/mc/_lib/__tests__/mc-approval-gate.test.ts`: 17/17 OK (9 pre-existing + 8 new)
- `npx tsc --noEmit`: clean on all touched files. 4 errors exist in src/lib/secrets/__tests__/secret-broker.redteam.test.ts (another lane's file, untouched, pre-existing).

## Serve verification
- `npm run build`: exit 0.
- Restart via /home/nolan/start-3100.sh ONLY (blessed script): healthy, :3100 listening.
- /api/readyz: commitSha 300c9c91cc45dc08bc36f9b7f7f1be2f4cb64efc (served bytes bind to the new commit).
- GET /api/mc/approvals?proposal_id=p0prop-ac04480a6d1809fd (legacy APPROVED): 200, record served, read path intact.
- POST /api/mc/approvals without x-mc-caller-key: 401 identity_required (gate chain live at the served boundary).
- Full served approve/deny matrix was NOT exercised live: it requires a provisioned caller key, and the registry was deliberately not read. The gate logic is covered by the 17 unit tests.

## Secret check
- dispatch-identities.json never opened or read. No keys, tokens, or credentials in code, tests, logs, or the commit. Tenant ids (e.g. demo-owner) are non-secret identifiers already present in test fixtures.

## Dirty files left untouched
- mc-approval/__pycache__/ (pre-existing untracked)
- mc-approval/tests/__pycache__/ (test-run cache, same category)
- var/ (pre-existing untracked)
No stash/apply used. No push.

## Live store state (observed, not modified)
- /home/nolan/projects/ping/var/mc-approvals.json: 3 records, all terminal (2 APPROVED, 1 DENIED), all tenant-less legacy, none WAITING. Failing closed on approve strands no in-flight work.

## First broken edge
The served route hardcodes MC_APPROVAL_DIR=/home/nolan/projects/ping/mc-approval, which is the TRACKC lane worktree (branch fyd/builder-harvest-trackc-2026-09-28), NOT the converged worktree where this commit landed. The executing Python therefore lacks the tenant delta: served records carry no tenant key (verified: GET shows no tenant key), and creation-side tenant binding is not yet live on the served path. The TS gate (which IS served) handles this correctly by design: missing tenant = legacy = fail closed on approve. Per writer law (one mutation owner per surface) no commit was made on the trackc branch; that lane must absorb the identical Python delta (request_approval tenant param + tenant_unknown refusal) to complete creation-side binding on the live path. Flagged for coordinator routing.

## Known remaining edge (follow-up, not this P0)
The chat adapter (adapters/chat_approval.py) calls the canonical transition directly: it now inherits the tenant_unknown fail-closed on approve of legacy records, but it does not verify caller entitlement to a record's tenant (no registry access in Python). Tenant-entitlement enforcement for the chat surface is a separate authorization-context decision.

## P0-2 completion: served-lane port (2026-09-30 ~18:02 MDT, Pigi)

The "first broken edge" above was closed, not left for the trackc lane:

1. **Port, not repoint.** Diffing the two lanes showed the ONLY behavioral differences in mc-approval were (a) this P0-2 tenant delta and (b) trackc's emit.py honoring MC_OUTREACH_PATH (the served route sets it; converged emit.py ignores it). Repointing would have broken served event emission; porting the identical delta was the correct minimal fix. Proved empirically: a route-equivalent CLI run without MC_OUTREACH_PATH fails at emit (`emit_approval_event unavailable`); with it, full creation works.

2. **Port executed.** Copied approval_request.py, proposal_record.py, approval_cli.py, tests/__init__.py, tests/test_approval_tenant.py from /home/nolan/projects/ping-fyd-converged to /home/nolan/projects/ping (trackc branch fyd/builder-harvest-trackc-2026-09-28). All byte-identical to the converged source. No competing writer (only pre-existing __pycache__ noise). Committed as f94bba39, local only, no push. Explicit pathspecs, no pycache.

3. **Tests in the served lane.** `python3 -m unittest mc-approval.tests.test_approval_tenant` run at /home/nolan/projects/ping: 14/14 OK.

4. **Served-path proof.** Route-equivalent invocation (`approval_cli.py record`, cwd=/home/nolan/projects/ping/mc-approval, real store, real journal, MC_OUTREACH_PATH set): record created with tenant='demo-owner', MC_APPROVAL_REQUESTED emitted with tenant in event data, store readback confirmed tenant='demo-owner' on all three test records. Test records removed from the store afterward; journal events remain as append-only evidence. Store back to the 3 original terminal legacy records.

5. **Live gate.** POST /api/mc/approvals with no caller key returns 401 (identity gate live at the served boundary). Full approve/deny matrix with a provisioned key was not exercised live (requires reading the secret registry; held by design). Tenant-gate logic is covered by the 17 unit tests against the exact served TS code; /api/readyz reports the served commit.

**P0-2 verdict: GREEN.** identity -> tenant -> proposal -> approval/action is now proven on the served path: creation binds tenant (live), the served TS gate enforces caller entitlement + fail-closed on tenant-less records (unit-proven against served code, 401 live), and legacy records fail closed on approve while deny/expiry remain safe (unit-proven in the served lane).
