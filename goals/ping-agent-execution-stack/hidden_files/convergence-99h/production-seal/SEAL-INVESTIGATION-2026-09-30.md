# PRODUCTION SEAL INVESTIGATION — 2026-09-30

Investigator: read-only archaeology worker (99h convergence program), parent session 818d3b8c.
Access date: 2026-09-30. All times MDT unless noted.
Pig reachability during investigation: UNREACHABLE (tailnet egress proxy "Broken pipe",
4 consecutive failures ~16:20-16:25 MDT, inside expected evening commute blackout window).
Pig-side live verification therefore UNKNOWN (transport); last verified states below are
from today's earlier checks (15:59-16:04 MDT, all OK) and the written records.

## VERDICT: DEFECT

The Oracle retirement seal is real, well-mechanized, and was holding as of the last
verified check (16:04 MDT today). But the seal was never a production-authority
boundary: it is a retirement boundary on a dead plane. The live plane (Pig) has no
equivalent seal, and production effects have bypassed authority through confirmed
paths. Per the investigation's own rule, a genuine bypass is a P0
SECURITY/CONSTITUTIONAL DEFECT. Evidence below.

## THE SEAL, EXACTLY

What is sealed: the Oracle plane's canonical journal —
`crx_runtime.ping_events` on host ping-core-01 (129.146.60.17), container
`ping-postgres` (postgres:17-alpine). Oracle was retired as an active canonical
writer by Nolan's binding decision 2026-09-30 ~12:52 MDT; the Pig is the one live
canonical journal.

Seal mechanism (enforced in config, not just documented):
- `ALTER ROLE ping IN DATABASE crx_runtime SET default_transaction_read_only = on;`
  (2026-09-30 ~13:25 MDT correction, superseding the initial stop+rename). The
  gateway connects as superuser role `ping`, so REVOKE would be meaningless; the
  transaction mode binds even superusers for the app's connection pattern.
  Defense-in-depth: append-only triggers `trg_ping_events_append_only`,
  `trg_ping_events_append_only_truncate` remain intact.
- Proven at enforcement time: INSERT -> `ERROR: cannot execute INSERT in a
  read-only transaction`; SELECT works.

Seal values (the fingerprint):
- 2557 rows, max(sequence)=91, max(created_at)=2026-09-21 12:05:37.688276+00
- md5 digest `98e24e0bcebc4a9194d42148695f0e5f` over sequence-ordered canonical rows
  (pgcrypto unavailable; built-in md5 used; deterministic, re-computable)

Seal verification: `~/workspace/ops-watches/check-oracle-retirement.sh`, every 5m via
the `ops-watch-gateway` cron. Asserts: container `ping-gateway` running,
restart=unless-stopped, `default_transaction_read_only=on` on a fresh session,
journal count/seq/created_at equal the sealed values, /health reachable (any code;
the degraded/unhealthy body is EXPECTED). CRIT on any write or resurrection;
UNKNOWN (never false-OK) on transport failure. Last verified OK 2026-09-30 16:04 MDT.

What is NOT sealed (searched, found absent):
- No "production seal" mechanism exists in gateway or FYD code. Greps for `seal`
  across the ping-gateway container (`/app/ping-runtime`, `/app/gateway`,
  `/app/runtime`, `/app/database`, `/app/infrastructure`, `/app/workspace`,
  *.js, node_modules excluded) returned zero hits. CONFIRMED.
- The only code-level "seal" in the FYD/PING trees is
  `src/lib/secrets/secret-broker.ts:386` — "executed handles are sealed (their
  uses are spent)": a one-way state on secret handles, not production governance.
  CONFIRMED (identical hit in `/home/nolan/projects/ping` and
  `/home/nolan/projects/ping-fyd-converged`).
- `deployment_registry` table exists in schema (`/app/database/canonical_events.sql:87`,
  with indexes) but is EMPTY in the live DB per today's interrogation (Q10).
  STRONG INDICATION (reached by today's investigator-D live probe, not re-verified
  by me — Pig unreachable).
- No `authority_witness` table DDL anywhere in `/app/database/*.sql`. CONFIRMED
  (schema grep returned only deployment_registry lines).
- The original PRODUCTION-BRANCH GUARDRAIL (Nolan, 2026-09-23, binding:
  "choose the production branch once, document it, and stop branch ambiguity";
  source `memory/2026-09-23.md#L714`) has no recorded completion: memory search
  found no follow-up choosing/documenting the production branch. STRONG INDICATION
  the guardrail was never closed.

## Q1. WHAT EXACTLY IS SEALED?

The Oracle journal as defined above: DB-boundary read-only (`default_transaction_read_only=on`
on role `ping` in `crx_runtime`), append-only triggers intact, 2557 rows /
max(seq)=91 / max(created_at)=2026-09-21 12:05:37.688276+00, md5
98e24e0bcebc4a9194d42148695f0e5f, watched every 5m. CONFIRMED.
Nothing about the live production plane (Pig journal, deployments, approvals,
scheduler behavior) is sealed by any mechanism. CONFIRMED (absence established by
exhaustive grep + today's interrogation).

## Q2. WHAT EXACTLY IS PRODUCTION DOING OUTSIDE IT?

Production = the Pig plane (owner decision: "Pig is the one live canonical journal").
Its `ping_runtime` DB on brain-postgres (172.19.0.2) takes all live writes; its
`ping_events` holds 2580 rows — a different, live journal, intentionally outside the
Oracle seal. CONFIRMED (intentional; see Q3).

Outside ANY seal (no mechanism covers these), per today's PING-CORE interrogation
(all reached via live probes today; I cite, did not re-verify):
- Deployed gateway image (`repair-cert-20260924`, digest `4472c543…`) diverges from
  the checkout: deployed `mission_scheduler.js` converts falsy handler return ->
  FAILED with a fabricated "no worker matched" reason and retries possibly-effected
  work; the checkout's DISPATCH_TIMEOUT / `_reconcileUnknown` / HOLD /
  structured-receipt repairs are undeployed. (Q4)
- 3 five-day-old CLASSIFICATION_CREATE missions cycle fail->retry forever (57,894
  jev-shadow failure lines); 25 CLAIM_GENERATE missions starve undispatched
  (getPending LIMIT-3 + priority ordering). (Q11)
- `deployment_registry` empty; the noon deployment record's MC build was superseded
  by 12:31 the same day ("proving the record is not the deployment"); image
  digest -> source commit link UNKNOWN on the journal plane. (Q10)
- Real APPROVED decision `p0prop-ac04480a6d1809fd` (2026-09-28) with a real site
  effect entered via unauthenticated `POST /api/mc/approvals` with a self-asserted
  `approver` field. (Q7)
- Served Mission Control :3100 serves the OLD page at /mission-control while the
  new 1510-line shell exists only as source (verified live ~16:00 MDT today).

## Q3. IS THAT INTENTIONAL?

- Oracle seal + Pig-as-live-journal: YES, intentional. Nolan's binding decisions
  2026-09-30 ~12:52 MDT (retire Oracle as active canonical writer), ~13:15 MDT
  (running/observable/read-only, 7-day evidence window), ~13:25 MDT (DB-boundary
  enforcement). Documented in `ORACLE-RETIREMENT-2026-09-30.md`. CONFIRMED —
  evidence, not inference.
- The unsealed gaps (empty deployment_registry, deployed/checkout drift,
  unauthenticated approvals route, AUTHORITY.json prose authority): NOT intentional.
  Today's interrogation marks each as a defect with a smallest-consequence fix;
  Nolan ordered gating `POST /api/mc/approvals` as the AUTHORIZED FIRST item of the
  99h program. The alignment synthesis reports that gate closed tonight ("approver
  derived from the authenticated caller key") — UNVERIFIED by me (Pig unreachable
  at investigation time).

## Q4. IS THERE ANOTHER GOVERNANCE PATH?

Yes — four, none of them a seal:
1. The Pig plane itself, as the intentional live canonical journal (owner decision).
   CONFIRMED.
2. `~/workspace/outreach/AUTHORITY.json` — self-attested prose `set_by` fields, no
   proposal digest, no tenant, `window: null` everywhere, uncommitted working-tree
   edits. Per Q6 this is the actual path real production authority flows through.
   CONFIRMED.
3. Nolan's direct binding directives in chat (the de facto governance; e.g. the
   2026-09-23 guardrail, today's retirement orders). CONFIRMED.
4. The 5m ops watches (`check-oracle-retirement.sh` et al.) — alert-only, no
   enforcement beyond the DB setting itself. CONFIRMED.
Plus the MC mutation paths (`POST /api/mc/approvals` unauthenticated at time of
writing; `POST /api/mc/dispatch` key-gated but 503): armed governance-relevant
routes on a surface described as a "read-only projection." CONFIRMED (Q7/Q9).

## Q5. CAN PRODUCTION EFFECTS BYPASS AUTHORITY?

YES. This is the P0 SECURITY/CONSTITUTIONAL DEFECT, reported plainly:

1. **Confirmed bypass with real effect.** Unauthenticated `POST /api/mc/approvals`
   on live :3100 accepted a self-asserted `approver` and produced real APPROVED
   decision `p0prop-ac04480a6d1809fd` (2026-09-28) with a real site effect. The
   digest-bound ApprovalRequest primitive (sha256 proposal digest,
   silence-is-never-approval) exists and is tested — and has zero production uses:
   no WAITING_APPROVAL records, no MC_APPROVAL_* events in any journal. The bypass
   did not go through the authority; it went around it. CONFIRMED (Q7, reached via
   live :3100 + journal scan 2026-09-30).
2. **Ongoing re-execution vector.** The deployed scheduler retries
   possibly-effected work (falsy return -> FAILED + retry; throw -> FAILED + 3x
   retry), and the reaper-vs-HOLD gap re-dispatches unknown-outcome missions ~60s
   after lease expiry — automatic retry of work whose effects are unknown, outside
   any authority decision to retry. CONFIRMED (Q4, Q11; AGENTS.md reaper-vs-HOLD note).
3. **Prose authority.** Live authority flows through human-editable AUTHORITY.json
   with no digest binding between Nolan's decision and any machine-verifiable
   record. Anyone with file access can manufacture "authority." CONFIRMED (Q6).

Caveats, stated honestly: the approvals-route gate was reported closed tonight
(synthesis: "approver derived from the authenticated caller key"); I could not
verify it — Pig unreachable. The defect verdict rests on the confirmed historical
bypass plus the still-open scheduler vector, not on the current state of the
approvals route, which is UNKNOWN to me.

## Q6. CAN REPLAY DISTINGUISH SEALED VS UNSEALED EFFECTS?

NO — not in general. What replay can and cannot do (Q5 interrogation, 2026-09-30):
- CAN: verify the sealed Oracle journal's integrity. 68 REPLAY_COMPLETED rows, one
  event each, fingerprint match, zero violations; the journal is ordered and
  identity-stable; the md5 seal is re-computable. But the last REPLAY_COMPLETED is
  2026-09-25 07:30 UTC (stale) and no live emitter exists in the deployed image
  outside test files.
- CANNOT: distinguish sealed vs unsealed effects. Replay-as-reconstruction is not
  implemented on any deployed path; the production correlation-group query exists
  only as an unwired comment; the kernel replay provider re-mints identities
  (`evt-ping-${i}-${hash}`) so replayed envelopes are provably NOT the same
  canonical representation. Unsealed effects (Pig-plane runtime state, Qdrant
  vectors, `knowledge_edges`, `mc-approvals.json` UI-writable side store,
  AUTHORITY.json prose) leave no journal trace or live outside it; `tenant_id` is
  UNKNOWN on 99.5% of journal rows. The journal does not record which authority
  boundary an effect crossed, so replay cannot tell a sealed-journal effect from
  an effect that bypassed authority entirely. CONFIRMED as PARTIAL (verification
  proven, reconstruction not reached).

## REPRODUCIBILITY NOTES (so another agent can replicate)

Access date for all: 2026-09-30. Method per item:
- Code/container greps: `~/workspace/bin/pigwsl-exec 'grep -rin "seal" <dir>
  --include="*.md" --include="*.js" --include="*.ts" --include="*.json"' over
  `/home/nolan/projects/ping-fyd-converged/{src,docs,scripts,mc-approval,data}`,
  `/home/nolan/projects/ping` (node_modules/.git excluded), and
  `docker exec ping-gateway sh -c "grep -rin seal /app/{ping-runtime,gateway,runtime,database,infrastructure,workspace} --include=*.js"`.
  (Two later `docker exec … sed` reads of `/app/database/canonical_events.sql`
  hung; the earlier schema grep for `deployment_registry|authority_witness`
  succeeded and showed only deployment_registry DDL at line 87.)
- DB tables were NOT queried directly by me (Pig unreachable); the
  `deployment_registry`-empty and journal-row-count claims are cited from
  `~/workspace/goals/ping-agent-execution-stack/files/PING-CORE-INTERROGATION-ANSWERS-2026-09-30.md`
  (Q4/Q5/Q6/Q7/Q9/Q10/Q11) and
  `hidden_files/core-interrogation/investigator-D-deployment-autonomy.md`,
  both dated 2026-09-30 and reached via live probes by their authors.
- Seal records read directly:
  `~/workspace/goals/ping-agent-execution-stack/hidden_files/deployment-convergence/ORACLE-RETIREMENT-2026-09-30.md`
  and `~/workspace/ops-watches/check-oracle-retirement.sh`.
- Guardrail origin: `muse.memory_search` -> `memory/2026-09-23.md#L714`
  (PRODUCTION-BRANCH GUARDRAIL); investigation order at `memory/2026-09-30.md#L3214`;
  watch-OK states at `memory/2026-09-30.md` 15:59/16:04 MDT entries.
- Sandbox-wide filename/content search for "production seal" found no definition
  doc (`grep -rli "production seal|sealed deployment|deployment seal" ~/workspace`
  hit only unrelated sealcoating-company outreach drafts and a marketing video filename).

## CLAIM GRADING SUMMARY

- Oracle journal sealed (mechanism, values, watch): CONFIRMED
- No production-seal mechanism in code/schema: CONFIRMED (by exhaustive absence)
- deployment_registry empty / digest->commit UNKNOWN: STRONG INDICATION (cited, not re-verified)
- Production-branch guardrail never closed: STRONG INDICATION
- Unauthenticated approvals bypass with real effect: CONFIRMED
- Scheduler retry-of-unknown-outcome vector: CONFIRMED
- Approvals-route fix currently effective: UNKNOWN (reported closed, unverified)
- Replay distinguishing sealed vs unsealed: NO (verification proven, reconstruction absent): CONFIRMED PARTIAL
- Pig-side live state at investigation time: UNKNOWN (transport blackout)

## CONFIRMATION — 2026-09-30 ~16:36 MDT (read-only re-verification, Pig reachable)

Verifier: seal-defect confirmation subagent (parent session 818d3b8c). Method: read-only
SSH via pigwsl-exec; `docker exec brain-postgres psql -U postgres -d ping_runtime`
SELECT-only queries; route source + git reads in the served checkout
/home/nolan/projects/ping-fyd-converged. No POST to any endpoint. No writes anywhere.
The ping role remains read-only; nothing was restored or changed.

### DB claims: confirmed or corrected

- `ping_events` row count: 3481 rows at ~16:36 MDT, max(created_at)=2026-09-30
  22:20:39 UTC (16:20:39 MDT, ~15 min before probe). The cited 2580 rows at
  12:14:51 MDT is consistent with a live growing journal. CONFIRMED live.
- `deployment_registry`: 0 rows. Upgraded from STRONG INDICATION to CONFIRMED
  (direct probe this pass).
- `authority_witness`: table absent (pg_tables shows only deployment_registry of
  the two). CONFIRMED absent.
- Zero event types matching `%APPROVAL%` in the journal; zero rows whose payload
  mentions `p0prop-ac04480a6d1809fd`. CONFIRMED: the historical bypass decision
  never entered canonical journal truth; it lived in the MC side store only.
- Schema note: the Pig's `ping_events` has no `sequence` column (the Oracle
  journal's sequence/md5 fingerprint does not apply here). The Oracle seal values
  were NOT re-verified this pass (Oracle lives on ping-core-01/OCI, out of scope
  for this Pig-scoped confirmation); they stand on the 16:04 MDT watch check.

### Approvals-route fix: VERIFIED LIVE (no POST performed)

- Fix commit `50983ded` ("convergence: gate POST /api/mc/approvals on
  x-mc-caller-key (reuse dispatch identity; approver derived, never asserted)"),
  dated 2026-09-30 15:45:50 MDT, is an ancestor of served HEAD `51831c61`
  (2026-09-30 16:06:47 MDT).
- The served :3100 build (build ID 3u_MkwKzj7AH7aisSsS6K, built 2026-09-30
  16:07:19 MDT from commit 51831c61, verified earlier today) therefore carries
  the fix: fix commit predates the build.
- Route source at the served checkout, `src/app/api/mc/approvals/route.ts`:
  POST calls `gateApprovalCaller(req)` before any body trust; approver is set by
  `resolveApprover(gate.caller, body)` = `caller.agent_id`.
- `src/app/api/mc/_lib/mc-approval-gate.ts`: missing/unknown key or caller with
  no agent_id -> 401 identity_required; a body `approver` that differs from the
  authenticated identity -> 400 approver_mismatch. Self-assertion is dead in code.
- `mc-dispatch-identity.ts` `resolveCaller`: `registry.agents[key]` lookup of the
  `x-mc-caller-key` header against the operator-provisioned registry. Genuine
  key authentication (unknown key -> 401), though a plain object lookup rather
  than constant-time compare. No new identity authority: reuses the dispatch
  identity registry path.
- Registry file `/home/nolan/workspace/mission-control/dispatch-identities.json`
  exists, mode 600, provisioned 2026-09-30 15:43:44 MDT (two minutes before the
  fix commit). Contents not read (secret-bearing).
- NOT tested: a live POST (forbidden by this task's scope). Behavioral refusal
  (401/400) is proven by code path, not by a live probe.

### Verdict on the DEFECT verdict: CONFIRMED, one leg closed

The investigation's DEFECT verdict CONFIRMS, with a material correction: the
confirmed unauthenticated-approvals bypass (leg 1 of Q5) is now FIXED in the
served build, verified as above. The defect as a whole is NOT closed, because
the other two confirmed vectors were not addressed by any commit found this
pass: the scheduler retry-of-unknown-outcome vector (Q4/Q11) and prose
authority via AUTHORITY.json (Q6) remain open, as does the empty
deployment_registry (now CONFIRMED still empty). The Oracle retirement seal
itself was never in question and was not re-verified here.

Downgrades applied: deployment_registry empty STRONG INDICATION -> CONFIRMED;
approvals-route fix UNKNOWN -> VERIFIED LIVE (code path; no live POST).

## ADDENDUM — 2026-09-30 ~17:13 MDT (P0 approval-boundary hardening, served)

Per-leg verification against the served route source at served commit 51831c61:
- Leg 1 NO VALID PRINCIPAL -> NO APPROVAL: VERIFIED (401 identity_required on
  missing/unknown x-mc-caller-key; approver derived from caller.agent_id;
  body approver mismatch -> 400 approver_mismatch). Was already live via 50983ded.
- Leg 2 NO REQUIRED CAPABILITY -> NO APPROVAL: GAP FOUND, now CLOSED.
- Leg 3 NO EXACT PROPOSAL DIGEST -> NO APPROVAL: VERIFIED (route 400 on shape;
  canonical Python transition refuses digest mismatch with no state change).
- Leg 4 NO TENANT/OWNER MATCH -> NO APPROVAL: GAP FOUND, caller-side CLOSED.

Patch (converged repo, existing caller-key path, no new IdentityAuthority):
commit 92108239a2a03a2448995ff62e869ae2c7caedfa (branch
fyd/convergence-2026-09-28, NOT pushed):
- mc-dispatch-identity.ts: CallerContext gains operator-provisioned
  capabilities: string[] (absent -> none).
- mc-approval-gate.ts: gateApprovalCapability -> 403 capability_denied;
  gateApprovalTenant -> 403 tenant_not_entitled (mirrors dispatch route).
- approvals/route.ts POST: reads the record from the canonical store, then
  enforces tenant entitlement + required capability before the decide CLI.
- 9/9 new unit tests pass; tsc clean for touched files.

Served verification: rebuilt :3100, restarted via /home/nolan/start-3100.sh.
Process env has NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1. /api/readyz: ready,
buildId q0Vl8ES4qIRZIhuPNrh_w, commitSha 92108239, built 17:12 MDT.
/mission-control 200. Safe probes: POST without key -> 401, POST with
unknown key -> 401, GET proposal -> 200. Store unchanged (3 records).
No test approval POST was made.

OPERATOR ACTION REQUIRED (fail-closed consequence): the single registry
entry (nolan:owner) declares no capabilities, so approvals now 403 until
Nolan provisions them in /home/nolan/workspace/mission-control/
dispatch-identities.json, e.g. "capabilities": ["fyd.sitespec.patch"].
The registry was NOT edited (secret-bearing, operator-provisioned).

Residual: the approval record/proposal carry no tenant field, so no
proposal-side tenant match is representable at this boundary; the
enforceable check is caller-side entitlement. A true proposal<->caller
tenant match needs tenant added at proposal creation (Python
request_approval/record_proposal/CLI record + creation callers) — a data
model change left for Nolan's decision.
