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

## 2026-09-30 ~16:25 MDT executable policy gate (P0 #6) CLOSED
- The 2026-09-30 ~14:07 FB freeze failed mechanically: prose in the
  facebook-engagement.md header that neither the cron body nor run_pass.sh
  read, so pass 172 executed under it. Nolan's 16:05 binding order: NEVER
  freeze engagement on prose/policy grounds; scale back ONLY on a platform
  flag.
- Installed: ~/workspace/outreach/holds.json (THE machine-readable hold
  state; seeded from recorded truth, no new owner decision: facebook
  unheld per the 16:05 resume, tiktok held per platform restriction +
  BLOCKED tripwire, instagram unheld with the AUTHORITY.json capability
  gate governing the session state, threads/x unheld, outreach-engine
  held per disabled cron) + ~/workspace/outreach/set-hold.py (only
  writer; provenance --by owner|tripwire mandatory; audit in
  hold-changes.jsonl) + authority-check.py step 0 (reads holds.json
  first; missing/unreadable/invalid -> FAIL-CLOSED exit 3; active hold ->
  DENY exit 1).
- Build time: facebook-engagement-pass cron body now runs authority-check.py
  facebook FIRST (HOLD GATE section prepended; body otherwise byte-identical
  to the saved definition). Dispatch time: run_pass.sh already calls the
  gate (verified); run_ig_pass.sh/run_th_pass.sh/run_tk_pass.sh/x-engage.sh
  also call it. Tested: facebook ALLOW; tiktok/outreach-engine DENY;
  hold->DENY / release->ALLOW round-trip; missing+invalid holds.json ->
  FAIL-CLOSED. AGENTS.md lesson recorded.
- Follow-up: same HOLD GATE prepend available for the instagram/threads/x/
  tiktok pass cron bodies (dispatch-time check already covers them; build
  time is efficiency only). Apply after the Pig outage window if desired.

## 2026-09-30 ~16:16 MDT Pig outage (known, not a defect)
- Nolan: Pig offline ~16:16-16:31 MDT. Any Pig-side probe failures until
  ~16:35 MDT are the known outage: no chasing, no re-diagnosis, no recovery
  actions. One-shot check pig-back-online-check-20260930 scheduled 16:33
  MDT to confirm :3100 serving again. Pig-dependent lanes (seal verdict,
  Remotion gate+measurements, TTS benchmark, UI harvest, :3100 restart
  verifications) resume after 16:35.

## 2026-09-30 ~16:28 MDT worker 6/6 (CRM views) completion handoff
- Child f08556ed (CRM views, orca/effect-ledger-2026-09-30) reported commit
  6ec070a: consistent with the already-recorded block 10-20 views work
  (page.tsx 435+/5-, secret check clean, tsc clean standalone, no em
  dashes). No duplicate work detected.
- Contract ambiguity flagged (must reconcile with the parallel API writer
  after the Pig outage): the served API's exact JSON schema was not
  discoverable from the workspace; views coded defensively (envelope
  {ok,view,items,unknown,reason}; camelCase aliases; bare values or
  {value,truth} objects; evidence as string/array/objects). Missing keys
  render as honest-UNKNOWN "(not returned)", never misrendered. Confirm
  the served schema matches before integration testing.
- 5/6 (3cb76745) still running at handoff time; left alone (may be
  Pig-dependent; outage rule: no chasing).

## 2026-09-30 ~16:35 MDT worker 10/10 (UI harvest survey) completion handoff
- Child df6856e5 delivered ~/workspace/research_notes/ui-harvest-20260930/HARVEST.md:
  30 patterns from surfaces prior lanes had not harvested (Temporal Web UI,
  Langfuse, HumanLayer, Perplexity, GBP suggested-edit review, GitHub PR
  model, Wikipedia pending changes, PagerDuty, Vercel, Twenty, Google Fact
  Check Explorer). All evidence-graded CONFIRMED/STRONG/WEAK; 11 web searches
  with queries/URLs/date recorded for replication.
- Verdicts: 6 ADOPT NOW / 15 ADAPT LATER / 7 PATTERN ONLY / 3 REJECT.
  Top ADOPT NOW: (1) stuck-work hero surface (PagerDuty OPEN/ACK counters +
  Temporal Pending-Activities retry/failure metadata; pure projection, no new
  authority; answers WHAT IS STUCK/WHY for the 25-mission incident shape);
  (2) inline evidence citations (Perplexity-style chips bound to immutable
  journal events, which Perplexity lacks); (3) approval queue item contract
  (GitHub three-outcome model + expiry failing closed to DENY + Run ID/Call
  ID attribution; renders the digest-pinned approval authority).
  Deliberate REJECTs: Google auto-publish-on-expiry (PING never applies a
  correction on owner silence), HumanLayer Slack/SMS routing (collides with
  outreach holds; approvals live in MC), Twenty lead data-model import.
- Open questions for coordinator: (1) confirm served MC shell (51831c61)
  lacks a stuck-missions view before building MC-1; (2) EV-1 anchoring
  assumes Ask FYD claims carry stable claim IDs; (3) AQ-5 4-day expiry shape
  kept PATTERN ONLY by design.
- No pushes, no external contact, no new stores/engines proposed.

## 2026-09-30 ~16:38 MDT worker 5/10 (CRM API writer) completion handoff
- Child 3cb76745: block 10-20 CRM projection route COMPLETE and
  SERVED-VERIFIED. Commit f787c3e95cd461c9c5e43b18cdb304872e4869aa
  (Pig served tree /home/nolan/projects/ping-fyd-converged,
  fyd/convergence-2026-09-28, no push): src/app/api/mc/crm/route.ts (365
  lines), GET /api/mc/crm?view=companies|people|leads|opportunities,
  read-only, FYD code untouched (additive under src/app/api/mc/ only),
  no em dashes, secret check clean.
- Served: next build passed, :3100 restarted via /home/nolan/start-3100.sh,
  /api/readyz commitSha matches f787c3e. Views (ok:true, status:PROVEN):
  companies 3 (Happy Place Carpentry LLC, Coppersmith Plumbing-HVAC-
  Mechanical, PING Social), people 0 UNKNOWN, leads 1, opportunities 0
  UNKNOWN. Bad view -> 400.
- Lead proof: one FYD_VISITOR_INTENT via real POST /events; proof event_id
  fyd-ovl-muonkdeq-e8b1cc23fba7; served leads view shows full chain
  (who proof-visitor-001, what estimate_request, business happy-place,
  service Fencing resolved from live graph, when 2026-09-30T22:04:10.083Z,
  status NEW, nextAction "owner review; contact WITHHELD until owner
  approval (outreach held)"). No new authorities/stores/engines/buses.
- Block 10-20 projection+views+proof is now FULLY CLOSED (API f787c3e +
  views 6ec070a + served verification + lead proof). Remaining: confirm
  the views decoders (6ec070a) against the actual served schema (f787c3e
  envelope is {ok:true, status:PROVEN, ...}; views coded defensively but
  integration test pending).
- Completed 2026-09-30T22:04:31Z = 16:04 MDT, BEFORE the 16:16 Pig outage:
  served verification happened on a live Pig. NOT outage-related.

## 2026-09-30 ~16:38 MDT worker 7/10 (TTS benchmark) completion handoff
- Child 946bcfe9 (completed 2026-09-30T22:22:06Z = 16:22 MDT, during the Pig
  outage): a stale workspace-wide "tts" file grep from earlier in its task
  returned only outreach-draft false positives plus the already-known
  ~/workspace/voice/ research directory, which it had already covered via
  direct container inspection. No new information; its benchmark report
  stands as delivered with no changes. (The deliverable itself went to the
  parent with the worker's earlier completion; only this trailing note
  arrived here. If the parent never received the TTS benchmark report,
  that is a gap to chase, not something this lane can reconstruct.)

## 2026-09-30 ~16:39 MDT worker 8/10 (Remotion POC) completion handoff
- Child 96f7e421 (completed 2026-09-30T22:22:13Z = 16:22 MDT): deployment
  gate record WRITTEN (remotion-poc/DEPLOYMENT-GATE.md + REMOTION-LICENSE.txt;
  license verified from remotion-dev/remotion LICENSE.md 2026-09-30,
  sha256 bd65083b940f61904f6ef298aade918a7cad72a3e35bc406e36fab365844b673;
  PING Social ELIGIBLE under Free License (<=3 employees, no LLC: STRONG
  INDICATION); re-open gate if headcount >3; license slated to change in
  Remotion 5.0 (PR #3750) = re-verification trigger; NOT embedded; local
  CLI render only, Lambda not used). Sandbox copies live in
  ~/workspace/goals/ping-agent-execution-stack/hidden_files/convergence-99h/remotion-poc/ (+ /tmp/remotion-poc/ originals).
- Claim-ledger binding invariant MECHANICALLY ENFORCED and proven
  non-vacuous: VALIDATOR-REPORT.md; dry run on 3-claim synthetic fixture
  VALIDATOR_PASS (6/6 scenes, 6/6 segments); --tamper-test with one
  injected unbound sentence -> VALIDATOR_FAIL [SCENE_CLAIM_UNKNOWN] exit 1.
  Supporting stages green (script gate verbatim+bound; TTS via sanctioned
  tts CLI, 6 MP3s Meta AI Smooth; sentence timestamps MEASURED via ffprobe
  14.888s total; word timestamps ESTIMATED, flagged estimated:true).
  Documented honest boundary: validator proves input-text binding, not TTS
  pronunciation fidelity.
- Live render BLOCKED: Pig unreachable ~16:15 MDT (commute blackout +
  known outage). Staged for resume per RUNBOOK.md 9-step sequence
  (query -> gate -> TTS -> timestamps -> install/render with /usr/bin/time
  -v -> validate -> close gate). Open: live payload field mapping for
  claim text (build-ledger.cjs tries text/claim/content/statement, fails
  closed on empty); measured render numbers (time/CPU/size) + REMOTION
  VERSION filled at render time.
- Pre-sprint overlap search: no competing Remotion/video-render authority.
  Worker correctly honored the outage (no chasing, no re-diagnosis).

## 2026-09-30 ~16:40 MDT worker 9/10 (production seal investigation) completion handoff — VERDICT: DEFECT (P0 SECURITY/CONSTITUTIONAL)
- Child af0e7860 (completed 2026-09-30T22:32:46Z = 16:32 MDT). Full report:
  production-seal/SEAL-INVESTIGATION-2026-09-30.md. CEO-FEED CLASS: this is
  a security/canonical incident; it belongs in Nolan's feed, not just the
  engineering ledger.
- Sealed = Oracle plane journal ONLY: crx_runtime.ping_events on
  ping-core-01, sealed 2026-09-30 ~13:25 MDT by Nolan's binding order via
  ALTER ROLE ping IN DATABASE crx_runtime SET default_transaction_read_only
  = on. 2557 rows, max(seq)=91, max(created_at)=2026-09-21 12:05:37 UTC,
  md5 98e24e0bcebc4a9194d42148695f0e5f; 5m watch last OK 16:04 MDT.
- NO production-seal mechanism exists in any code or schema (zero seal hits
  in gateway container code; deployment_registry table EMPTY; no
  authority_witness table; 2026-09-23 PRODUCTION-BRANCH GUARDRAIL never
  closed).
- Production = Pig plane (intentional: Pig is the one live canonical
  journal) writing to a different live journal OUTSIDE the Oracle seal.
  Unsealed gaps (NOT intentional, flagged as defects): deployed gateway
  image diverges from checkout (scheduler fabricates failure reasons,
  retries possibly-effected work); 3 zombie missions cycle fail->retry;
  25 missions starve; digest->commit link UNKNOWN; served MC serves the
  old page while the new shell is source-only.
- BYPASS CONFIRMED: (a) unauthenticated POST /api/mc/approvals produced
  real APPROVED decision p0prop-ac04480a6d1809fd (2026-09-28) with real
  site effect, going around the digest-bound ApprovalRequest primitive
  (zero production uses); (b) deployed scheduler auto-retries unknown-
  outcome work incl. the reaper-vs-HOLD re-dispatch gap; (c) live authority
  is manufacture-able prose in AUTHORITY.json. CAVEAT: approvals fix was
  reported closed tonight (approver from authenticated caller key) but
  could NOT be verified by this worker.
- Replay cannot distinguish sealed effects from bypass (sealed journal
  fingerprint-verifiable but stale since 2026-09-25; unsealed effects leave
  no journal trace).
- LIMITATIONS: Pig unreachable the whole investigation; live-DB claims
  graded STRONG INDICATION (from today's interrogation records), not
  CONFIRMED; Pig-side current state UNKNOWN (transport). Re-verify the
  approvals-route gate + re-run DB queries once the Pig is reachable.
  DB inspection script was staged in the worker's own sandbox /tmp
  (/tmp/seal_db_inspect.js) — ephemeral; may need re-creation.
- All 10 children now complete (7/10 TTS benchmark deliverable itself not
  seen in this lane; 8/10 live render blocked on outage; 9/10 this DEFECT
  verdict is the one CEO-feed item).
