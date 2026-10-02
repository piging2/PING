# Lane B7: Mission Control Observability Audit (Phase 11)
T+0.2 hypothesis, read-only. Audit of the CODE, not the served bytes.

## Audit basis
- Audited: source tree on the Pig WSL, `/home/nolan/projects/ping`, HEAD `0264d517`
  (verified via ssh, matches T+0 reobservation). Page: `src/app/mission-control/page.tsx`
  (1219 lines). APIs: `src/app/api/mc/{today,agents,approvals,dispatch,graph,missions,missions/[id],object,search,technology,trace-forward}` plus `_lib/mc-dispatch.ts`.
- NOT audited: the served :3100 build (stale ~17.5h, built 2026-09-27 21:00:32 per lane 9).
  Every verdict below describes the worktree code. If the served build differs, the UI a
  viewer actually sees may be older than what this report describes.
- Method: code reading over ssh; one live read-only GET of `http://127.0.0.1:8080/health`
  (curl, no mutation) to ground the health-probe finding. No gateway writes, no scheduler
  contact, no :3100 restart, no pushes.
- Verdict labels: REACHED (MC truthfully exposes, with an evidence path), PARTIAL
  (exposes with a material blind spot), MISLEADING (shows something the evidence does not
  support), ABSENT (no surface).

## MC surface map (what exists today)
Seven tabs. TODAY: services, happening now, changed, failed (proven only), needs authority,
will happen next, repo state, not-wired prototype list. AGENTS: per-operation fields with
per-field badges, scheduled agents (cron.d), live processes, withheld controls, prototype.
BUSINESSES: per-tenant object graph with reverse trace (object -> claim -> evidence -> source)
and forward trace (event -> objects -> website). WEBSITES: two hardcoded site links plus an
honest "not yet wired" card. TECHNOLOGY: claim legend, technology tree, incidents, risks,
backlog objects, all objects, each field carrying PROVEN/OBSERVED/DERIVED/UNKNOWN/STALE/
CONFLICTING/PROTOTYPE/UNWIRED. SEARCH: deterministic intent router over graph + journal +
live runtime reads. DISPATCH: new-mission form (POST /api/mc/dispatch), mission list,
mission detail, 5s polling.

## Section-by-section observability map

### NOW (what is happening right now)
- PARTIAL. TODAY "happening now" reads fleet inprogress dir names and the fleet ledger
  tail. `displayState(row, inprogress=true)` hardcodes RUNNING for anything present in the
  inprogress directory; no process liveness is checked against that dir. A stale leftover
  dir renders as RUNNING. The `ps` process-count card is a separate unlinked surface (command
  counts, no worker mapping), so "RUNNING" has no evidence path to a live process.
- PARTIAL. TODAY "will happen next" lists cron.d filenames as "PROVEN" scheduled work.
  A file in cron.d proves a schedule definition exists, not that the scheduler fires it;
  the Muse cron system's actual firing state is not read. The AGENTS tab's scheduledAgents
  parse `name__interval@X.ext`; jobs not matching that filename convention render with the
  raw filename and null interval, silently.
- The UI hardcodes `health="PROVEN"` on the Happening now / Changed / Failed / Needs your
  authority / Will happen next / Repo state cards even when the /api/mc/today route computed
  DEGRADED for that section. The per-section status is discarded by the page. MISLEADING:
  a degraded read renders a PROVEN badge.

### WHY (why a state is what it is)
- PARTIAL. Reverse trace (BUSINESSES tab): object -> claims -> evidence -> journal event or
  pinned fixture. The evidence chain is real where `ping-event:<id>` refs resolve against
  the FYD_SITE_OVERLAY stream. But the card title says "rendered value -> object -> claim ->
  evidence -> source"; MC never reads the served rendered page, so the first leg (rendered
  value -> object) is unwitnessed and the title over-claims.
- PARTIAL. TECHNOLOGY risks/incidents carry basis + evidence strings, and the incident
  objects for qdrant/vault broken probes carry a verified cause. Good. But the single
  biggest live WHY (gateway event_governance degraded, see HEALTH) has no surface.

### WORK (the work itself: missions, operations)
- REACHED for MC-dispatched missions: missions list and mission detail are projected
  deterministically from the journal on every read; detail carries events, artifacts (with
  the 2026-09-27 `present` truthfulness check), evidence, result digests, reconciliation
  state. Tenant-scoped reads are enforced (Mission L).
- PARTIAL for fleet workers (AGENTS tab): mission name = inprogress dir name, "run" = dir
  listing, "operation" = ledger row range. No link between a fleet worker dir and the
  actual task it is doing; no idempotency key, attempt, effect proof (all PROTOTYPE nulls,
  honestly rendered).
- ABSENT: any connection between the two work surfaces. Fleet workers and MC dispatch
  missions are separate lists with no shared identity; an operator cannot see total work.

### BUSINESS (the tenant object graph)
- REACHED. /api/mc/graph reads the same digest-verified seam Ask FYD uses
  (getFydTenantGraph); object counts, provenance kinds, predicates, owner-correction
  counts; per-object reverse trace to journal evidence. Fail-closed on unknown tenant.
- PARTIAL. Forward trace only matches provenance refs against the FYD_SITE_OVERLAY stream;
  an event from any other stream reports "event not in FYD_SITE_OVERLAY stream". Forward
  trace claims `affectedWebsite: /sites/<t>` but does not verify the served site actually
  re-rendered from the new graph (the stale-:3100 class of problem is invisible here).

### AGENTS/WORKERS (who is available and alive)
- PARTIAL. Dispatch catalog (DISPATCH tab) lists agents from adapter profiles filtered to
  LIVE, with honest per-agent claim: ollama PROVEN (acceptance-proven), identity_1..4
  PROTOTYPE ("not acceptance-run in this lane, no quota spent"). Constraints and deadlines
  are shown. This is truthful.
- ABSENT. No liveness probe for workers: lane 14 R5 confirmed health = registry-state only.
  MC shows no per-agent current assignment, no quota spend, no broker state (checkBrokerQuota
  gates dispatch server-side but the quota reading is not projected).
- ABSENT. Hermès worker posture (inline envelope, read-only) and any Hermes runs have no
  MC surface.

### AUTHORITY (who authorized what)
- PARTIAL. Mission detail shows `capabilities_granted` and `work_order_id` from
  MC_AGENT_AUTHORIZED events, and DENIED missions carry the denial reason. The 8 ordered
  fail-closed checks of authorizeWorkOrder (Decision Unit #1, shadow-seam verified) are not
  projected: MC shows the verdict, not the check-level evidence. The authority owner
  (out-of-tree adapter at orca-adapter/vendor/external_agent_adapter.js:185) is not named
  in MC.
- MISLEADING by omission of scope: the DISPATCH tab "New Mission" card says "Every dispatch
  is authorized by the existing ExternalAgentAdapter" with health PROVEN. True for the
  authorize step, but the issue->invoke trust gap (lane 11 T1 / lane 14 R10: invoke at
  adapter.js:1353 trusts the carried WorkOrder with no redeem-time re-decide) means
  "authorized" covers issue-time, not invoke-time, and MC does not surface that boundary.

### CAPABILITIES (what an agent may do)
- PARTIAL. Capabilities granted per mission are shown; the fixed dispatcher constraints
  (read_only, no_writes, no_network, no_canonical_events, no_mission_state_writes) are shown
  in the dispatch catalog. But lane 14 R1/R2 apply: authority posture and executor selection
  are adapter-registry data + caller tightening, never a per-order authority decision, and
  MC projects the granted set without marking which came from PING's authority vs the
  adapter's registry default.

### APPROVALS
- ABSENT from MC entirely. /api/mc/approvals exists (digest-pinned approve/deny through
  approval_request.py, tamper-detecting, journaling MC_APPROVAL_APPROVED/DENIED) and is
  referenced only by its own route file. No tab, no panel, no link anywhere in the
  mission-control page. The reached-loop report's "approvals digest-pinned" property is
  real in the backend and invisible in the projection.

### EVIDENCE (drill path from any shown fact)
- REACHED for the dispatch slice: mission detail -> events -> event_ids; artifacts with
  sha256 + present flag; prompt digest (prompt_digest, not raw prompt); result output_digest
  + output_chars. Evidence never shows raw prompt or raw output; the digest-only choice is
  deliberate and honest.
- PARTIAL. The journal-event lookup in object/trace-forward uses `limit=1000` on the
  FYD_SITE_OVERLAY stream: an event older than the 1000-event window reports "not in
  gateway stream", which an operator could read as the event not existing. The bound is not
  surfaced in the UI.
- The evidence for SEARCH answers is the answer JSON itself; the "conflicts" intent note
  honestly says journal conflict ops are not yet read ("would appear here when the journal
  records them").

### UNKNOWN
- REACHED as a vocabulary: UNKNOWN is first-class in the TECHNOLOGY claim system and in
  mission status; timeouts render UNKNOWN, never FAILED. The page header states the law.
- MISLEADING in one precise place: every UNKNOWN mission renders "OUTCOME UNKNOWN -
  RECONCILIATION IN PROGRESS" (page.tsx:1160, 1186; projected default in mc-dispatch.ts:404
  when the event carries no reconciliation_state). Per lanes 11/12, there is NO reconciler:
  no dedicated reconciler exists, `reconciliation_state` is "a static string nothing
  consumes", and a killed coordinator's UNKNOWN missions "enter HOLD and nothing ever
  reconciles them". "IN PROGRESS" asserts an ongoing process that does not exist. The
  AGENTS tab has the same wording for timeout-ish ledger rows. This directly contradicts
  the AGENTS tab's own "Control law" card, which says request-reconciliation is WITHHELD
  because no witnessed mutation exists. If reconciliation is withheld, nothing is in progress.
- ABSENT: no per-UNKNOWN entry names what evidence would resolve it (no "missing evidence"
  list; the lane-10 12-question map's "what is UNKNOWN" was ABSENT for the context packet
  and is equally absent here).

### HOLD
- PARTIAL. The 409 HOLD on duplicate POST of an in-flight/UNKNOWN mission exists in
  dispatch/route.ts:344-353 and is returned to the caller, but HOLD is not a MissionStatus
  in the projection: projectMissions never emits it, so a HOLD refusal leaves no mark on
  the mission record and has no list/detail surface. An operator replaying the journal sees
  no HOLD event at all (no MC_MISSION_HOLD event type exists; DISPATCH_EVENT_TYPES has 9
  types, none for HOLD).
- No reconciliation criteria are projected: nothing in MC says what would release a HOLD,
  who may reconcile, or on what evidence. The design gap (AGENTS.md 2026-09-24 Reaper-vs-
  HOLD, needs Nolan; lane 12 confirmed reaper violation in the sibling runtime) has no MC
  surface.

### EFFECTS
- PARTIAL. Mission result shows outcome/output_digest/output_chars/error; artifacts show
  paths. For the read-only FIXED_CONSTRAINTS slice, effect classification is honest.
- ABSENT. Lane 12 weakest edge 2 (effect-succeeds-but-event-write-fails: emit() has no
  try/catch at dispatch/route.ts:371-373, result envelope lives only in memory) has no MC
  surface: the lost-result case would render as a mission stuck in RUNNING with no
  explanation. MC cannot distinguish "running" from "effect happened but the event write
  died".

### OUTCOMES
- PARTIAL. Terminal statuses project honestly from the journal. But the UI's status badge
  map is semantically wrong: FAILED -> "CONFLICTING" badge, DENIED -> "STALE" badge,
  CREATED -> "PROTOTYPE" badge (page.tsx MISSION_STATUS_BADGE). A proven failure renders a
  badge that says "conflicting" (implies disagreement, not failure); a terminal authority
  denial renders "stale" (implies old data, not a decision). The badge vocabulary actively
  mislabels terminal outcomes.
- Outcomes "toward observations": SUCCEEDED carries output_digest only; verifying WHAT the
  outcome was requires leaving MC (the artifact file, if present). Present=false is at
  least truthful.

### LEARNING
- ABSENT. No MC surface for lessons, replay gates, promotion reports, evidence-expiry, or
  any learning loop. The TODAY prototype list names "opportunities-found (marketing
  intelligence feed) not yet wired". Lane 4's harvest (bounded self-modification,
  lesson-vs-policy separation) has no projection target in MC. The mission detail shows
  what happened; nothing shows what was learned from it.

### HEALTH
- MISLEADING. This is the sharpest finding. The TECHNOLOGY route probes service health with
  HTTP 200 checks and DISCARDS the response body: `svc:gateway` -> claim PROVEN,
  "status 200 corroborates the serving process". A live read at audit time shows
  `GET http://127.0.0.1:8080/health` returns HTTP 200 with body
  `{"status":"unhealthy", ... "event_governance":{"status":"degraded",
  "stats":{"total":3410,"passed":1706,"rejected":1704,
  "violations":{"NAMESPACE_VIOLATION":1704}}}, "embedding":{"status":"not_initialized"}}`.
  So MC would render the gateway PROVEN-healthy from the 200 while the gateway's own
  health body says unhealthy, event governance degraded (the live JEV namespace incident:
  1704 rejections, the exact defect the loop report and lane 13/16 analyzed), and embedding
  uninitialized. No event_governance/NAMESPACE/jev string appears anywhere in
  technology/route.ts; the incidents array only checks qdrant/vault docker-health blocks.
  The real active incident on the host has zero MC surface, and the service probe would
  show green over it.
- The same blind spot propagates: SEARCH "health" intent and TODAY services both reduce
  health to 200-OK. The qdrant probe (`GET :6333/`, authless) -> PROVEN while embedding
  init is `not_initialized` (loop-report /health section already flagged this weak detector).
- PARTIAL (credit): the incidents/risks/backlog objects that DO exist are honest and
  well-evidenced (broken qdrant/vault probes with verified cause, backup risk, masked-health
  risk). The claim legend is displayed and the "Projected from this host only" note is
  truthful.

### COST
- ABSENT. No cost surface anywhere: Jev shadow cost UNKNOWN (ledger), broker quota spend,
  ollama compute cost, per-mission or per-agent spend. The dispatch catalog notes "Broker
  transports spend real quota" in claim_note text but projects no number.

### ATTENTION REQUIRED
- PARTIAL. TODAY "needs your authority" parses GRILLING-BRIEF.md "## ACTIVE QUESTIONS"
  with regex `^###\s+(.+?):`. If the section exists but no headers match the pattern, MC
  renders an empty list with status PROVEN: attention items silently vanish on format drift.
  (If the section is missing entirely, it degrades honestly to null.) The parse rule is not
  surfaced in the UI, so an operator cannot tell "no open questions" from "parser saw
  nothing".
- The AGENTS tab "Withheld controls" card is the most honest attention surface: it names
  exactly which mutations are withheld and why.

## Consolidated gap list

MC shows something the evidence does not support:
1. "RECONCILIATION IN PROGRESS" on every UNKNOWN mission (and timeout-ish fleet rows) with
   no reconciler existing; contradicts the withheld-controls card. (page.tsx:1160,1186;
   _lib/mc-dispatch.ts:404)
2. Gateway/qdrant service health rendered PROVEN from HTTP-200 probes that ignore the
   health body, which currently says unhealthy / event_governance degraded / embedding
   not_initialized. (technology/route.ts svcChecks; verified live at audit time)
3. Per-section TODAY cards hardcode PROVEN badges while the route computes DEGRADED.
   (page.tsx TODAY cards)
4. Status badges mislabel terminals: FAILED->CONFLICTING, DENIED->STALE, CREATED->PROTOTYPE.
   (page.tsx MISSION_STATUS_BADGE)
5. Reverse-trace card title claims "rendered value -> object" leg that MC never witnesses.
   (page.tsx BUSINESSES tab)
6. "Happening now" RUNNING = inprogress-dir existence, not process liveness.
   (agents/route.ts displayState)
7. Dispatch "New Mission" card implies invoke-time authorization ("Every dispatch is
   authorized"), while the issue->invoke trust gap means authorization covers issue-time
   only. (page.tsx DispatchPanel header vs lane 11 T1 / lane 14 R10)

Real underlying states with no MC surface:
8. The live gateway event_governance degradation (1704 NAMESPACE_VIOLATION rejections, the
   JEV namespace defect): no incident object, no TECHNOLOGY mention.
9. Approvals backend (digest-pinned approve/deny, journaled MC_APPROVAL_* events): no UI at all.
10. HOLD as a state: no event type, no projection, no release criteria.
11. Worker liveness, per-agent quota spend, per-mission cost: absent (COST entirely absent).
12. Learning loop (lessons, replay gates, promotion): absent.
13. Effect-succeeded-but-event-write-failed (lane 12 W2): indistinguishable from RUNNING.
14. The 1000-event lookup bound in object/trace-forward: not surfaced; old refs read as missing.
15. Journal quiet ~18h (events.jsonl last write 2026-09-27 20:44 MDT per lane 9): MC has no
    staleness-of-the-journal-itself signal; missions project from a journal that has not
    moved, and nothing says so.
16. Build staleness: MC cannot tell the served :3100 build is 17.5h old; /api/mc/today
    reads :3100/api/health as PROVEN from a 200 regardless of which build serves it.

## Falsification
This report is a hypothesis until replayed from a clean checkout. It would be falsified by:
- A clean-checkout diff showing the audited lines differ at HEAD (e.g. the served code or
  the patch branch already changed MISSION_STATUS_BADGE, the 404 default, or the 200-OK
  probe logic). Note lane 9's correction: some dispatch verdicts in the loop report
  described uncommitted worktree state; this audit read the worktree files as-is and cites
  line numbers above, but did not diff worktree vs HEAD file-by-file.
- A live :8080/health body that no longer shows degraded event_governance (would weaken
  finding 8's "live" clause but not the code-level probe flaw in finding 2).
- Evidence that a reconciler or HOLD projection exists elsewhere (e.g. another route or
  the patch branch) that this read-only audit missed; searched src/app/api/mc only.
- The stale :3100 build serving a NEWER mission-control page than the worktree (unlikely;
  the build predates the worktree's dirty batch, so if anything the served UI is older
  and the gaps are at least as bad).
