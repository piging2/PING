# P0-3 Capability Provision: nolan:owner (2026-09-30)

Task: P0-3 of CEO-ORDER-CONTINUITY-NOT-FEATURE-WAVE-2026-09-30.md.
CEO order: DO NOT weaken the new 403. Provision only the exact capabilities
Nolan/PING needs for the next approved proof. No wildcard capability grants.

## Minimal capability determination

Enumerated from source, not guessed:

1. Canonical proposal class: `/home/nolan/projects/ping/mc-approval/proposal_record.py`
   declares exactly one capability constant: `CAPABILITY = "fyd.sitespec.patch"`.
2. Canonical store `/home/nolan/projects/ping/var/mc-approvals.json`: all 3
   records carry `capability: fyd.sitespec.patch`. No other proposal class
   exists in the store.
3. Approval gate `mc-approval-gate.ts` reads the required capability from the
   proposal record (never the request body) and requires
   `caller.capabilities.includes(requiredCapability)`, else 403
   `capability_denied`.
4. Unit tests in `mc-approval-gate.test.ts` use the same single capability
   string.

Conclusion: the exact minimal set for the next approved proof is one
capability string: `fyd.sitespec.patch`. Nothing else was granted.

## Registry edit

File: `/home/nolan/workspace/mission-control/dispatch-identities.json` (Pig;
secret-bearing, key values never printed or copied).

- Backup: `/home/nolan/workspace/mission-control/dispatch-identities.json.bak-20260930-capability-provision`
- Change: added `"capabilities": ["fyd.sitespec.patch"]` to the `nolan:owner`
  entry only. Diff is +3 lines (plus trailing-newline normalization).
- Entry now: agent_id `nolan:owner`, tenant `demo-owner`,
  entitled_tenants `["demo-owner"]`, capabilities `["fyd.sitespec.patch"]`.
- JSON re-validated after edit. No other entries exist in the registry.
- No restart required: `loadCallerRegistry()` reads the file per request, so
  the grant is live immediately.
- No gate code was touched. No wildcard, no broad grant, no bypass.

## Verification (live, Pig-local :3100, served commit 92108239a2a03a2448995ff62e869ae2c7caedfa)

All verification ran server-side on the Pig; the caller key never left the
Pig and is not recorded here. Two synthetic TEST proposals were created
through the canonical `record_proposal` / `request_approval` paths and
removed from the store afterward (journal events remain as append-only
evidence).

1. Green path, granted capability (fyd.sitespec.patch):
   POST /api/mc/approvals with correct proposal_id, exact digest,
   decision=deny, nolan:owner key.
   Result: HTTP 200, decision recorded, record status DENIED.
   This proves the full chain passes: 401 identity gate, approver
   derivation, digest shape, tenant entitlement, capability gate, and the
   canonical exact-digest transition.
   Note: decision=deny was chosen deliberately. The capability and tenant
   gates are decision-independent, and deny exercises them identically while
   guaranteeing no site effect from the test proposal.
2. Ungranted capability: synthetic proposal with capability
   `test.ungranted.capability`, same POST shape, nolan:owner key.
   Result: HTTP 403 `capability_denied`, record remained WAITING_APPROVAL
   (no state change). The fail-closed gate is intact.
3. Unknown caller key: HTTP 401 `identity_required`. Registry read path
   intact.

Post-verification store state: back to the original 3 records
(p0prop-4b08fc6c5c1a1ca6 DENIED, p0prop-ac04480a6d1809fd APPROVED,
p0prop-c9fc3225778c08d6 APPROVED). No test residue.

## First broken edge

None found in this task. The approval boundary is green for the granted
capability and still fail-closed for everything else.

Adjacent notes, not defects in this task:
- Residual from the earlier P0-3 hardening stands: proposals carry no tenant
  field, so the approval boundary enforces caller-side tenant entitlement
  only. True proposal-to-caller tenant matching is the separate P0-2 lane
  (tenant context at proposal creation).
- Verification-environment quirk (not a product defect): `emit.py` imports
  `pass_policy_engine` from the outreach tree at module top, so direct
  python use of `approval_request` needs `/home/nolan/workspace/outreach` on
  sys.path (or `MC_OUTREACH_PATH` set). The served route already sets this in
  its spawn env; the quirk only bit the ad-hoc test harness and was resolved
  there.
