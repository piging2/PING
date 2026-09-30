# 99-Hour Focused Convergence Program — state
Charter: goals/ping-agent-execution-stack/files/99H-CONVERGENCE-PLAN-2026-09-30.md
Mission: MAKE THE EXISTING ECOSYSTEM OPERABLE FROM ONE UI while HARVESTING
the best primitives. HARVEST → WIRE → REACH → OPERATE. Not an architecture wave.

## Block log
- 0–10 (IN PROGRESS, 2026-09-30): gate approval security hole (authorized);
  inventory MC live surfaces; ONE navigation shell over real data.
- 10–20: CRM harvest (Attio→Clay→Apollo→HubSpot).
- 20–30: ORCA execution convergence (one real authorized mission served).
- 30–40: Knowledge retrieval (one mission retrieves prior knowledge).
- 40–50: Video harvest (VideoSpec + one adapter; Sora dead; Remotion license check).
- 50–60: Deterministic video composition (one evidence-backed video).
- 60–70: Unified Mission Control actions.
- 70–80: Media/content lifecycle.
- 80–90: Live/realtime/commerce harvest (READ-ONLY).
- 90–99: Adversarial convergence (cut).

## Parallel lanes (do not disturb)
- FYD 100h product sprint (active; hour-100 external-owner test mandatory).
- MarketingOS sprint 2 (block 15–30 in flight; evidence/learning lane).
Shared primitives that block FYD get priority.

## 2026-09-30 block 0–10 delegation
- Writer A: approval gate (route + _lib helper reusing dispatch identity,
  registry provisioning, historical classification, tests, served verify if quiet).
- Writer B: MC live-surface inventory + ONE navigation shell over real data
  in mission-control/staging/mc.
Recon findings baked into briefs: served tree is
/home/nolan/projects/ping-fyd-converged (branch fyd/convergence-2026-09-28,
FYD lane active); dispatch-identities.json unprovisioned (fail-closed);
store has 3 proposals, 1 weak-route APPROVED (p0prop-ac04480a6d1809fd);
staging/mc not served; only :3100/:3001 listen.

## Block 0–10 CLOSED 2026-09-30- Approval gate: DONE, verified live. Commits: 50983ded (route+gate, fyd/convergence-2026-09-28),
  aeed7010 (emit.py MC_OUTREACH_PATH fix, fyd/builder-harvest-trackc-2026-09-28).
  Live: 401 no key / 404 unknown proposal with key / 400 approver mismatch.
  Registry provisioned at /home/nolan/workspace/mission-control/dispatch-identities.json (600).
  Historical 3 approvals classified weak:self-asserted-approver, trusted:false
  (sidecar var/mc-approvals-auth-classification.json, history preserved).
- First broken arrow found+fixed: emit.py ignored MC_OUTREACH_PATH ->
  pass_policy_engine import failed -> decide recorded then 500'd with no
  MC_APPROVAL_* event. E2E verified on temp stores (8/8 meaningful checks).
- MC shell: DONE. Commit 71f8de5 (orca/effect-ledger-2026-09-30). Nav shell
  over real data; honest UNKNOWN states; nine truth-state badges; tsc clean.
- :3100 restarted via sanctioned protocol during the gate work (build
  50983ded live, /api/readyz confirms). FYD lane: route commit is 2 files
  on their branch, tree was clean, explicit pathspecs.

## 2026-09-30 block 10–20 delegation (IN PROGRESS)
- Archaeology: Attio / Clay / Apollo / HubSpot deep studies (13 dimensions
  each, evidence-graded), folding in research_notes/crm-agentic-harvest-20260930/.
  Clay DONE: primitives P1 signal-as-event with scored composition (ADAPT),
  P2 pre-send safety triple (ADAPT); prior-survey Clay grades confirmed +
  sharpened (workflow observability UPGRADED to B+, learning loop ABSENT).
  Apollo DONE: P1 one system/two machine planes/one permission envelope +
  effect-class transparency, P2 platform-side auto-halt with mandatory
  remediation; Apollo was not in the prior survey (additive).
  Attio + HubSpot in flight.
- Writer A (Pig served tree, additive only under src/app/api/mc/): GET
  /api/mc/crm?view=companies|people|leads|opportunities (read-only;
  journal base from FYD_JOURNAL_GATEWAY_URL -> :18200, never hardcoded
  18199). Companies from FYD tenant graphs (real data); leads from
  FYD_VISITOR_INTENT journal events with mandatory entity binding
  (unknown siteId -> QUARANTINED, never a lead); people/opportunities
  honest UNKNOWN. Lead proof: one proof-marked FYD_VISITOR_INTENT event
  via the real POST /events path (Bearer, journal-identity pre-flight,
  request_id idempotent). Then commit (explicit pathspec), :3100 restart
  via /home/nolan/start-3100.sh, served verify.
- Writer B (local staging shell): CRM views in
  mission-control/staging/mc/.../mission-control/page.tsx over the new
  route; full lead card (WHO/WHAT/NODE/SERVICE/WHEN/SOURCE/EVIDENCE/
  STATUS/NEXT ACTION); honest UNKNOWN states; tsc clean.
- Owner notification = the NEW LEAD card in Mission Control. No external
  contact (outreach held).
