# MARKETINGOS SPRINT 2, BLOCK 15–30 — EVIDENCE-BACKED SIGNALS (2026-09-30)

Lane law: research is not roadmap; signals RECOMMEND, they never authorize.
No demo data. Every signal below is wired from a real observation: Pig journal
reads, the U2 mission residue, the FYD five-URL falsification run, the sprint-1
artifacts, and the CRM/agentic harvest survey. Vendor claims are NOT signals;
they appear only in the rejection list.

Binding plan: `~/workspace/goals/ping-agent-execution-stack/files/MARKETINGOS-PLAN-NEXT-100-HOURS-2026-09-30.md`
(Hours 15–30: "Wire real observations into the existing ingress. Produce the
first evidence-backed signals. ... Unknown stays UNKNOWN.").

## Ingress wiring (what was read, how, when)

All Pig journal reads are read-only SELECTs via `~/workspace/bin/pigwsl-exec`,
run 2026-09-30 ~21:35–21:45 UTC against the live journal. Note for the record:
the live journal database `ping_runtime` is hosted on the **brain-postgres**
container (user `postgres`), not the `ping-postgres` container as the 0–15
baseline inventory states. brain-postgres = 0.0.0.0:5432; ping-postgres
(0.0.0.0:5433) hosts the Oracle-adjacent `crx_runtime` (PG 15) in this
deployment snapshot.

| source | read performed | result |
|--------|---------------|--------|
| Pig journal `ping_runtime` (brain-postgres) | `SELECT event_type, count(*) FROM ping_events GROUP BY 1` | 2655 events; MISSION_CREATED 521, MISSION_COMPLETED 490, CLAIM_CREATED 106, OBSERVATION_CREATED 109 (see S-1, S-5) |
| Pig journal | claim verdict distribution: `metadata->>'verdict'` on CLAIM_CREATED | **106/106 NULL** — verdicts not queryable from claim events (S-1) |
| Pig journal | missions by type/status; non-terminal missions | 25 CLAIM_GENERATE `created` (2026-09-25→2026-09-30), 3 CLASSIFICATION_CREATE `retry_pending`, 1 CLASSIFICATION_CREATE `created`, 1 INTELLIGENCE_RESEARCH `created`, 1 RECOMMENDATION_CREATE `created` (S-5) |
| Pig journal | mission results, last 48h | U2 mission `8924ebeeb4094c37` completed, result verdict SCOPED, 9 claim/learning nodes in `marketingos::s2-block0-15`; correlation_id/causation_id chains intact on observations→claims (S-2, S-7) |
| Pig journal | knowledge_nodes by namespace | 9 nodes `marketingos::s2-block0-15` (U2 residue); sprint-1 residue intact |
| Sprint-2 artifacts | `BLOCK-S2-0-15-U2-REPORT.md` | thesis E SCOPED; production app role outside the trigger seal (S-2) |
| FYD lane | `goals/fyd-social-product-build/hidden_files/falsification-varied-2026-09-30.md` + `fyd-sprint-state.md` | 0/5 owner-ready; dominant failure = UNDERSTAND head-metadata-only projection; FACTS=0 on all 5 (S-3, S-6) |
| Research | `research_notes/crm-agentic-harvest-20260930/report.md` + `DO-NOT-BUILD.md` | 34-system continuity scoreboard: zero grade A (S-4) |
| Sprint-1 artifacts | `hidden_files/marketingos-100h/` baseline + learnings | approval authority exists (approval_request.py), zero approvals; outcome-intake seam built, zero windows opened (S-8) |

## Signals

### S-1 — Claim verdicts are not queryable from the claim events

**Statement:** All 106 CLAIM_CREATED events in the journal carry NULL
`metadata->>'verdict'` (verified 2026-09-30 ~21:40 UTC). Verdicts exist only
in mission `result` payloads and knowledge nodes. The observability gap named
in the 0–15 baseline is confirmed live.

**Support set:**
- `docker exec brain-postgres psql -U postgres -d ping_runtime`:
  `SELECT metadata->>'verdict' AS v, count(*) FROM ping_events WHERE
  event_type='CLAIM_CREATED' GROUP BY 1;` → single row: NULL, 106.
- U2 mission `8924ebeeb4094c37` result column holds `{"verdict": "SCOPED",
  "findings": [...]}` — the verdict lives on the mission row, not the claims.
- Knowledge nodes `mkos-8924ebee-u2-u2-c1..c7` (namespace
  `marketingos::s2-block0-15`) carry per-claim verdicts as label text.

**Evidence grade:** primary (direct read of live journal).

**Scope:** covers the Pig journal only. Does not cover Oracle (unread this
block) or Qdrant projections.

**Decision it could inform:** the 15–30 wiring decision — emit
`metadata.verdict` at claim-attach time (instrumentation, plan's "existing
ingress" language) so signals can be computed from events alone without
re-reading mission rows. Does not authorize the schema change.

### S-2 — The trigger seal is class-bound; the production session sits outside it

**Statement:** The U2 mission (8924ebeeb4094c37, completed 2026-09-30 21:23
UTC) CONFIRMED U2-C1..C7 and verdict thesis E **SCOPED**: the append-only
triggers bind exactly the non-owner, non-superuser role class. Superusers
bypass via `session_replication_role=replica` (U2-C5 CONFIRMED, verbatim
post-trial row `bypassed`); the table owner can DROP TRIGGER (U2-C6
CONFIRMED). Combined with sprint-1 C8 (deployed Oracle app role `ping` is a
superuser), the production journal's append-only guarantee holds via app
discipline, never via the database.

**Support set:**
- `BLOCK-S2-0-15-U2-REPORT.md`: per-claim verbatim trial output
  (e.g. `ERROR: ping_events is append-only: UPDATE not permitted`), mission
  result `{"verdict": "SCOPED", ...}` in journal row.
- 9 knowledge nodes / 8 edges, namespace `marketingos::s2-block0-15`,
  correlation_id `8924ebeeb4094c37`.
- Sprint-1 C8 (role `ping` = superuser) per baseline.

**Evidence grade:** primary (disposable-PG trials on the Pig + read-only
Oracle trigger capture; PG17-parity caveat is open question U3).

**Scope:** the trigger/function text, not the Oracle table owner (U4 open:
which role could exercise the owner-drop on Oracle is unestablished) and not
pooler/disk-write behavior (U4/U5 open).

**Decision it could inform:** whether to keep claiming database-enforced
immutability for the production journal (no — restate as app-discipline
guarantee), or tighten the app role toward non-superuser. The 30–45
opportunity block should treat "class-bound seal" as a constraint, not a
solved problem.

### S-3 — FYD UNDERSTAND is head-metadata-only: 0/5 owner-ready, acquisition and generation green

**Statement:** The 2026-09-30 five-URL varied falsification (live loop, Pig
:3100, commit `278468d8`) scored **0/5 owner-ready**. All five acquisitions
returned HTTP 200 with full bodies (0.4–2.2s to first useful render); all five
rendered with zero invented claims. The failure is purely UNDERSTAND: the
pipeline projects only head metadata (OG/meta/keywords/JSON-LD) plus
hours-like patterns into the graph; body-text phone/address and structural
facts (per-location blocks, services lists) are never mined. FACTS/findings
emitted **0** on all five — a real signal, not a measurement artifact.

**Support set:**
- `goals/fyd-social-product-build/hidden_files/falsification-varied-2026-09-30.md`:
  per-URL ACQUISITION PASS / FACTS 0 / OBJECTS 1 (carboywinery: 4 objects,
  all identity links) / IMPORTANT FACTS MISSED listing labeled body-text
  phone/address per URL; owner-ready bar stated and applied (name correct, no
  false claims, phone+address present).
- `fyd-sprint-state.md` (2026-09-30 ~14:43 MDT): 0/5 → downstream STOP;
  fix dispatched to coordinator `0d3ea964` (body-text mining scope).

**Evidence grade:** primary (live falsification battery, fixed schema, bar
stated for audit). Referenced here only — the FYD lane owns the fix; this
lane does not resolve it.

**Scope:** five corridor-business archetypes (structured WP, multi-location,
weak metadata, JS-heavy-attempted, messy legacy), one loop version
(`278468d8`). True SPA and true legacy remain untested per the record.

**Decision it could inform:** the 45–60 evidence-package block gets its
falsification gate from this battery (≥3/5 owner-ready) — the gate exists and
is reusable (`/tmp/fyd-varied-harness.py` on the Pig).

### S-4 — The continuity-A slot is unoccupied across 34 surveyed systems

**Statement:** The CRM/agentic harvest survey of 34 production systems
(modern CRMs, agentic sales, agentic marketing, business OSes) grades **zero**
systems continuity A (event-sourced, immutable history, provenance,
deterministic replay). Best in field grade B — genuine timelines/audit logs
on mutable current-state storage. No surveyed system can replay a past
decision deterministically from an immutable event plane.

**Support set:**
- `research_notes/crm-agentic-harvest-20260930/report.md` §5 scoreboard
  (per-system grade + one-line reason) and §2–4 per-system continuity
  reasoning; per-claim evidence grades documented
  (independent / vendor-described / unreplicated).
- Counterparty-risk ledger: Common Room → Zoom (Jul 2026), Warmly → HubSpot
  (Sep 2026), Qualified/Piper → Salesforce (Apr 2026); Drift unverified
  shutdown chatter — harvested as risk, not signal.

**Evidence grade:** independent (documented survey; per-claim grades in the
report). This is research evidence for the 30–45 opportunity block, not a
product claim.

**Scope:** 34 systems surveyed 2026-09-30; grades are the survey's own,
bounded by vendor-described claims where independence was unavailable. Does
not establish the size of the market that would pay for A.

**Decision it could inform:** the 30–45 differentiation thesis — "bind every
derived claim to its support set on an immutable evidence plane" is the open
lane. Do not import vendor nouns as authorities (see DO-NOT-BUILD.md).

### S-5 — The /ingest intake creates missions nothing consumes

**Statement:** 25 CLAIM_GENERATE missions sit in `created` status,
accumulating 2026-09-25 09:22 UTC → 2026-09-30 17:46 UTC, with no observed
claim/consumption. Plus 3 CLASSIFICATION_CREATE `retry_pending`, 1
CLASSIFICATION_CREATE `created`, 1 INTELLIGENCE_RESEARCH `created`
(2026-09-30 18:14:51 UTC, same minute a sibling IR mission completed), 1
RECOMMENDATION_CREATE `created`. The /ingest producer writes; within the
journal-visible state, nothing drains the queue. A completed IR mission result
today noted "last production write 2026-09-30 17:46:33 UTC (11 /ingest
observations)" — the same timestamp as 11 of the stuck missions.

**Support set:**
- `SELECT mission_type, status, count(*), min(created_at), max(created_at)
  FROM ping_missions WHERE status NOT IN ('completed') GROUP BY 1,2;`
  → CLAIM_GENERATE|created|25|2026-09-25 09:22:15|2026-09-30 17:46:33;
  CLASSIFICATION_CREATE|retry_pending|3; others as stated.
- Journal row `78c88729ceb51f38` result: "...last production write
  2026-09-30 17:46:33 UTC (11 /ingest observations)."

**Evidence grade:** primary (direct read of live mission table).

**Scope:** journal-visible state only. An external consumer path not
reflected in the journal is not ruled out; that itself is an observability
question.

**Decision it could inform:** whether to wire a consumer for the intake queue
or stop auto-creating missions (non-terminal accumulation is journal noise
and a triage-SLA violation in spirit). Inputs to 30–45: the "unmanned
/ingest producer" gap from the plan is real and growing.

### S-6 — Head-metadata projection propagates source-side falsehoods verbatim

**Statement:** In falsification run 1 (kimsautopart.com), the site's own
og:description names "A&D Auto Parts" — template cruft for a different
business. FYD projected it as this business's description verbatim:
source-faithful, business-false. No name-vs-description sanity check exists.
(Also noted: meta-vs-page drift on carboywinery.com — og:description claims a
Colorado Springs location absent from the submitted locations page.)

**Support set:** falsification record §1 (WRONG CLAIMS note) and secondary
observations ("Template-cruft propagation"); fix scope in
`fyd-sprint-state.md` includes the name-vs-description sanity check.

**Evidence grade:** primary (observed in the live battery).

**Scope:** head-metadata-sourced fields on one structured-WordPress site;
carboywinery meta drift is a second instance. Does not establish how often
source meta is business-false in the wild.

**Decision it could inform:** any 45–60 evidence package that quotes business
descriptions must carry the source-vs-business-faithfulness distinction;
the FYD lane's sanity-check work is the fix (not this lane's).

### S-7 — The observation→claim causality wiring is implemented and observable

**Statement:** Recent OBSERVATION_CREATED and CLAIM_CREATED events carry
`metadata.correlation_id` = originating mission id and non-null
`causation_id` chaining observation → claim (e.g. U2 residue: observation
`86170694...` → claims `b9138e54...`, `9111cd56...`; sprint-1 EXPERIMENT_RUN
missions show the same chain). The causality-honesty contract the plan
requires at the ingress is not aspirational — it is running in the journal.

**Support set:**
- `SELECT event_id, created_at, left(metadata::text,180) FROM ping_events
  WHERE event_type IN ('OBSERVATION_CREATED','CLAIM_CREATED') AND
  created_at >= now() - make_interval(days => 14) ORDER BY created_at DESC
  LIMIT 15;` — causation_id populated, correlation_id = mission id, on all
  returned rows.
- Sprint-1 learning LR-03: "ping_events correlation is
  metadata->>'correlation_id'" (knowledge node
  `mkos-2d530e04-b80100-lr03`, namespace `marketingos::block80-100`).

**Evidence grade:** primary.

**Scope:** covers U2 + the four sprint-1 EXPERIMENT_RUN missions completed
2026-09-30 ~20:28–21:08 UTC. Does not cover older missions (not re-verified).

**Decision it could inform:** keep correlation_id/causation_id as the
ingress-seam contract; S-1's verdict-emission work should attach to the same
metadata envelope.

### S-8 — The governance machinery exists but is unexercised

**Statement:** The approval authority (`mission-control/approval_request.py` —
digest-pinned, silence-never-approves, per the harvest repo-overlap SEARCH)
exists and is enforced; **zero approvals** have been recorded through it.
The outcome-intake seam (5 outcome classes, causality-honesty contract,
validator — sprint-1 block 80–100) is built; **zero outcome windows** have
been opened. The 60–70 block has no recorded precedent to build on.

**Support set:**
- 0–15 baseline (2026-09-30 ~15:20 MDT): "Zero approvals, zero
  distributions, zero outcome windows opened."
- Today's journal reads: no APPROVAL-type missions/events in the last 14
  days; knowledge nodes `mkos-2d530e04-b80100-intake` /
  `mkos-2d530e04-b80100-playbook` record the built seam with zero instances.

**Evidence grade:** primary (baseline inventory + live reads).

**Scope:** Pig journal + repo; an out-of-journal approval channel is not
ruled out, but the canonical seam is the one that counts.

**Decision it could inform:** the first real approval (60–70) should go
through the recorded authority — the machinery's first exercise is itself
the test. Until then, "approved" states anywhere else are unverified.

## Explicitly rejected (not signals)

### R-1 — "The empty constitutional_memory Qdrant collection shows the memory pipeline is broken"
REJECTED. Observed: `constitutional_documents` 26 pts, `constitutional_memory`
0 pts, `knowledge` 401 pts (baseline). But the intended population cadence
and writer for `constitutional_memory` are unobserved — emptiness may be by
design. Without a documented expectation, this is scope overreach, not a
signal. (Carried as a question, not a signal.)

### R-2 — "FYD's 0/5 means the whole loop is broken"
REJECTED. The battery proves acquisition PASS on all 5 and generation
renderable on all 5 with zero invented claims; failure is scoped to
UNDERSTAND extraction depth (S-3). Claiming whole-loop breakage overreaches
the evidence. The honest signals are S-3 and S-6.

### R-3 — "Vendor mechanism numbers are signals for our roadmap"
REJECTED. Close/Chloe beta call volume (818,000+ calls), Copy.ai savings
figures, Mutiny case-study numbers, 6sense claimed outcome lifts — all
vendor-described, unreplicated. Per mission law, vendor claims are claims
awaiting evidence, not signals. The harvest's mechanism-level, independently
corroborated findings (S-4) are the usable residue.

### R-4 — "Journal event growth shows production momentum"
REJECTED. Event count 2639→2655 and missions 520→521 since the 0–15 baseline
are entirely research/mission machinery residue (U2 + sprint-1
EXPERIMENT_RUNs). Business-domain events (CUSTOMER_CREATED 3,
ESTIMATE_CREATED/SENT/ACCEPTED, INVOICE_CREATED/SENT, LEAD_CREATED 2) are
few and not recent. Growth in journal rows ≠ product traction; attribution
unobserved.

## Open questions carried as UNKNOWN (not signals)

- **U1** (gateway code): deployment-convergence lane's. Referenced, not resolved.
- **U3** (PG17 parity): U2 trials ran on PG 15; no direct PG-17 trial run.
  S-2's scoping claim rests on PG-docs stability across versions, not a trial.
- **U4** (pooler): real Oracle `ping_events` table owner not captured; which
  role could exercise the owner-drop on Oracle is unestablished.
- **U5** (disk writes): unaddressed this block.
- **U6** (Oracle table owner unknown): same as U4's capture gap; distinct
  label kept per SPRINT2.md.

## Audience-cluster seeds (not materialized in this deliverable)

Two clusters suggested by the observed behavior, for the audience half of
this block (separate work — recorded here so the signals feed it):

1. **Corridor home-service owners with weak web presence.** The FYD battery
   sites are real Mesa County businesses (Kim's Auto Parts Fruita,
   Wicked Wrench Diesel Fruita, bin707 Grand Junction, Elevation Family
   Dental Grand Junction, Carboy Winery incl. Palisade). All five were
   owner-unready on contact facts. Observed behavior: real businesses, real
   missing facts — the exact pain the FYD loop exists to fix.
2. **Technical buyers who need replayable evidence.** The harvest's NEED
   analysis plus S-4: no surveyed system offers deterministic replay from an
   immutable event plane; our journal does. Observed behavior: 34 systems,
   zero continuity A.

## Method note

Signals computed from journal reads, research artifacts, and the
falsification record — no new missions, no Pig writes, no Oracle contact
beyond the 0–15 read-only capture. Commit law followed: git status first,
explicit pathspec, no push.
