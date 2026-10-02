# Mission Control — lane state (2026-09-24)

## What it is
The human projection over the business operating graph. Lives in the PING
website repo (`/home/nolan/projects/ping`, branch `fyd-factory`), served on
the private :3100 surface at `/mission-control`. Projection over PROVEN
backend state only. Not another source of truth.

## Verified live (2026-09-24 ~06:10 MDT)
- `/mission-control` → 200. Six API routes, all 200, all `next build` clean, `tsc` clean.
- `/api/mc/today` → status PROVEN. Reads: journal gateway (18199) overlay
  events (11 live), fleet ledger tail, fleet inprogress (7 workers), cron.d
  schedules, GRILLING-BRIEF.md active questions (16), :3100 /api/health,
  git dirty count (30). Degraded list empty.
- `/api/mc/agents` → status PROVEN. Per-operation fields per the Autonomous
  Port Law: Mission, Run, Operation, Attempt, Effect, Idempotency Key,
  Current State, Last Evidence, Reconciliation State, Retry Eligibility,
  Criticality, Authority Requirement. Each field carries its own
  PROVEN/PROTOTYPE status. Idempotency/reconciliation fields are null
  pending the ORCA port-lane reconciler contract — exposed, not invented.
- Truth display: timeouts never render as FAILED. Unknown outcomes show
  "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS".
- Controls withheld by law (no witnessed mutation yet): request
  reconciliation, hold, resume after reconciliation, cancel future work,
  RETRY NOW. Inspect / open evidence / open trace are real reads.
- `/api/mc/graph` → tenant graphs through the AUTHORIZED seam
  (getFydTenantGraph, same as Ask FYD). happy-place: 8 objects, 7 rels,
  provenance website-derived 7 / canonical-journal 1.
- `/api/mc/object` → reverse Sanity-law trace verified live:
  object → fields → owner corrections (SOURCE SAYS X / OWNER SAYS Y
  preserved) → provenance → journal event envelope → source.
- `/api/mc/trace-forward` → forward trace verified live:
  fyd-seed-ovl-007 → 2 affected objects → /sites/happy-place.
- `/api/mc/search` → deterministic intent router (tenant overview,
  changes today, needs authority, conflicts, running, health).
  Unknown intents return UNKNOWN, never a guess.
- Regression: /sites/happy-place and /sites/coppersmith-plumbing still 200.

## PROVEN vs PROTOTYPE
- PROVEN: TODAY, AGENTS (observed), BUSINESS object view, reverse+forward
  trace, search/command, website links + health.
- PROTOTYPE (labeled in UI, never shown as fact): opportunities feed,
  recovery proof, lease/attempt/budget per agent, SiteSpec view, coverage
  numbers, QA panels, regen history, deployment view.
- NOT STARTED (no backend exists to project): Marketing, Sales/CRM,
  Operations, Technology objects, Customers, Approvals, Projects,
  Automations, Integrations, Software, Knowledge, Memory, Security, Costs,
  Releases as first-class MC surfaces.

## Commit state
Files are NEW and namespaced (src/app/mission-control/, src/app/api/mc/),
uncommitted on branch fyd-factory. The FYD lane owns commits on this branch;
my additive files do not touch their work. Not pushed (no pushes authorized).

## Dependencies
- ORCA port lane: when the reconciler exposes per-operation fields
  (idempotencyKey, reconciliationState, retryEligibility, criticality,
  authorityRequirement) and witnessed mutations for reconciliation
  controls, fill them in and un-withhold the controls. Coordinate on that
  contract; do not invent a parallel one.
- FYD lane: keep the :3100 rebuild cadence coordinated; MC rides the same
  build. Current server started ~06:05 MDT via setsid; survives SSH exit.

## Backend inventory (read-only survey, 2026-09-24 ~05:55 MDT, worker report)
- Reader seam: `src/lib/ping/ping-object-reader.ts` (GatewayPingObjectReader)
  + `src/lib/ping/types.ts`. `PingObject` carries provenance
  (`canonical-journal` | `website-derived` | `overlay-authored`) and
  `ownerFieldCorrections`; NO `claims[]` array survives the sanitize step,
  so field-level claim-to-evidence tracing terminates at `evidenceRef`
  event ids / `provenance.ref` / `AskAnswer.claimClassifications`.
- ONLY governed write: `POST /api/ping/proposal` (AskProposal union:
  object_update | object_create | site_patch), ed25519-signed envelope via
  `submitSignedEvent`, owner-gated. NO regenerate / approve / publish
  endpoint exists anywhere in `src/app/api`.
- Ask FYD reads via the governed reader; FYD objects live in compiled TS
  fixtures (`happy-place-graph.ts` 13 objects, `coppersmith-graph.ts`
  15 objects). NO persisted SiteSpec store exists;
  `registerSiteSpecProvider` has zero callers, so digest-bound SiteSpec
  verification 400s today. SiteSpec-section forward trace is BLOCKED on
  backend, not just unimplemented.
- Journal gateway :18199 exposes exactly 3 routes; `FYD_SITE_OVERLAY` is
  the only event type (7 records at survey time, 11 live by 06:10 MDT;
  happy-place only).
- Repo: branch `fyd-factory`, HEAD `e48ef710cb889bf4d59b833ef9766067a9e2bbf0`,
  ~120 dirty paths at survey time. No Wave-2 1000-object store is wired
  to the live app.

## Fix applied 2026-09-24 (post-inventory)
- REPAIRED: `/api/mc/search` short tenant alias. The UI's own suggestion
  "show me everything about coppersmith" returned `unknown_intent`
  because the matcher only knew "coppersmith plumbing" / 
  "coppersmith-plumbing". New deterministic alias rule: full id,
  space-slug, plus any hyphen segment of length >= 6 as a whole-word
  match (length gate keeps "happy" from hijacking unrelated queries).

## Verification record 2026-09-24 (post-rebuild, :3100 PID 76095)
- `npm run build` exit 0, clean.
- Server restarted via setsid (`npm start -- -p 3100`). Lesson recorded:
  `npm exec next start -p 3100` does NOT work; npm swallows `-p` as its
  own --package flag ("no such directory: .../ping/3100"). Use
  `npm start -- -p 3100`.
- `/mission-control` -> 200. `/api/mc/today` -> 200.
- `/api/mc/search?q=show me everything about coppersmith` ->
  `tenant_overview`, siteId `coppersmith-plumbing` (8 objects, 7 rels).
  FIX PROVEN.
- Regression: `...about happy place` -> `tenant_overview` happy-place.
- Regression: `paint the barn purple` -> `unknown_intent` (honest).
- Gate check: `are you happy today` -> `unknown_intent` (no hijack).

## Next frontier (priority order)
1. Fill the ORCA contract fields + wire reconciliation controls when the
   port lane lands (bounded).
2. Forward trace to SiteSpec-section granularity (currently stops at graph
   digest + website).
3. Technology objects with the three navigation paths (needs backend
   objects that exist: Repository/Commit/Release/Service/Database/
   Container/Host — compose from git + docker state on the Pig).
4. Marketing/Sales/Operations surfaces only when their backends exist;
   no dashboard over fake counts, ever.
5. Phone-viewport verification of /mission-control (browser delegation).

## Technology projections (2026-09-24 ~08:05 MDT, BRUTAL CEO MODE)
- `GET /api/mc/technology` → 200. 55 objects across Host/Container/Service/
  Database/Repository/Commit/Release/Deployment/Integration/MCPServer/
  Capability/Runtime/Backup/Snapshot/HealthCheck, plus 2 Incidents, 3 Risks,
  3 Backlog objects. All read live server-side on the Pig (docker, git,
  HTTP probes, bounded absence probes). Every field carries a first-class
  claim: PROVEN/OBSERVED/DERIVED/UNKNOWN/STALE/CONFLICTING/PROTOTYPE/UNWIRED.
- TECHNOLOGY tab: claim legend, technology tree (Pig → services →
  containers → gateway → postgres → qdrant → fyd → deployments →
  repositories → releases → backups → health → incidents/risks), postgres
  backup detail, gateway detail, backlog objects.
- Honest findings (UI CLAIM <= BACKEND PROOF):
  - No DB backup automation on this host: /opt/ping/backups absent, no
    *.dump (bounded), no crontab, no systemd backup timer → UNWIRED.
    OPS-004/005 fleet proofs cited as cross-host evidence, never smuggled.
  - ping-qdrant + ping-vault docker-unhealthy from a broken healthcheck
    probe (execs `curl`, absent from the images; failingStreak ~16k)
    while both serve HTTP 200s → 2 OBSERVED incidents, low severity.
  - ping-gateway: image ping-gateway:devin-boundary2, restartCount=3,
    /health 200 PROVEN, but NO container healthcheck and NOT
    compose-managed on this host (OPS-002's healthcheck proof was a
    different host). Source commit for the image: UNKNOWN.
  - 3 DERIVED risks: no-pig-db-backup (highest), gateway-no-healthcheck,
    masked-health.
- Missing backends as BACKLOG OBJECTS (traced, not faked):
  - site-regenerate: extend AskProposal union with `site_regenerate`
    through the same ed25519-signed owner-gated path; witness
    PROPOSAL_SUBMITTED + SITE_REGENERATED; read model = site + overlay tail.
  - proposal-approval: `proposal_decision` variant signed by owner;
    witness PROPOSAL_DECISION; read model = journal tail.
  - sitespec-forward-trace: call the EXISTING registerSiteSpecProvider
    (zero callers today) from the factory generation path; persist
    digest → SiteSpec; one call site, no new framework.
- Regression watch: coppersmith/happy-place intents still correct,
  unknown intents still honest unknown_intent; /sites/* and /api/mc/*
  all 200 after rebuild.
- Build: `npm run build` green; :3100 restarted via setsid, verified 200s.
- Commit 869efe3e (fyd-factory, local only, 2 MC files). No push.
- Pre-existing breakage NOT mine: src/lib/secrets/__tests__/
  secret-broker.redteam.test.ts is untracked and fails tsc (duplicate
  BrokerError, missing tenantId) — another lane's file; next build
  still passes.
- Next: phone-viewport verification of /mission-control (browser delegation);
  ORCA reconciler contract fill-in when the port lane lands.
