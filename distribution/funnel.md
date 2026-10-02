# CEO MODE Distribution Wave - Creator Funnel KPI

Launched 2026-09-23 ~13:05 MDT per Nolan's CEO MODE directive.
Company KPI for this wave is the CREATOR FUNNEL, not automation activity counts.

## Funnel stages

| Stage | Count | Updated |
|---|---|---|
| QUALIFIED 100K+ CREATORS DISCOVERED | 29 | 2026-09-23 ~14:05 MDT |
| CROSS-PLATFORM CREATORS | 17 | 2026-09-23 ~14:05 MDT |
| LEGITIMATE CONTACT ROUTES | 10 | 2026-09-23 ~14:05 MDT |
| FIRST INTRODUCTIONS | 0 | 2026-09-23 (cohort prepared, NOT sent) |
| POSITIVE RESPONSES | 0 | 2026-09-23 |
| FYD BUILDS AUTHORIZED | 0 | 2026-09-23 |
| CREATOR ACTIVATIONS | 0 | 2026-09-23 |

Pool evidence: `creator-pool.jsonl` (29 entries, all 100K+ with sourced follower
evidence; 17 cross-platform). Dedup: 0 collisions vs pipeline.md (571 names),
all outreach JSONL prospect files, action ledgers, truth store, email queues,
drafts/. Contact routes: 2 fully verified from creators' own public surfaces
(Aaron Witt dirttalk@buildwitt.com; Jeff Thorman merch@homerenovisiondiy.com),
8 creator-published bio emails (exact address must be read from the live public
profile before any send), 7 pool members route-pending.

## Standing architecture: relationship-expansion engine (Nolan, 2026-09-23 ~13:13 MDT)

Governs the acquisition/distribution lane only. Does NOT unfreeze FYD product
feature construction (object primitive stays frozen). CEO MODE volume guards
(Facebook Stage 0 ramp, IG ceilings, fail-closed everywhere) stay in force.

- **Objective:** maximize raw follows/likes/comments; maximize interaction loops
  that create additional graph edges and bring another person into FYD.
- **Mechanism:** connected sources -> identity resolution -> relevance scoring ->
  action planning -> interaction -> response -> stronger graph -> next candidates.
- **Execution model (explicit Nolan call):** do NOT use agent swarms for execution.
  Intelligence determines who/why/what/when; compile into a typed EngagementPlan;
  deterministic software does dedupe, scheduling, provider routing, retries, state
  transitions, measurement. 2,000 interactions become cheap and reproducible.
- **Key metric:** productive graph expansion = interactions yielding a verified new
  relationship, meaningful reciprocal action, FYD Node visit, object reference, or
  subsequent conversation. Volume caps remain binding constraints, not goals.
- **Pipeline:** Observe -> Resolve identities -> Find graph opportunities -> Rank
  relevance -> Generate contextual interaction -> Deterministic action plan ->
  Execute -> Observe response -> Attribute outcome -> Learn. Attribution learns
  which object + relationship-distance + interaction-type + context combinations
  produce useful responses; PING evidence/outcome history is the training signal.

### Implications (recorded, not yet built)

1. **Build project:** typed EngagementPlan schema + deterministic executor
   (dedupe, scheduling, provider routing, retries, state transitions,
   measurement) + attribution layer over PING evidence/outcome history. Current
   engagement passes still run on agent/browser-task execution until the
   deterministic substrate exists; this is the authorized next build in the
   distribution lane.
2. **Identity resolution first:** resolve Nolan's existing contacts/follows/friends
   across connected sources against FYD identities. Highest-value targets
   (principle 1); cold engagement only after established relationships.
3. **High-context interactions:** each interaction references a specific object,
   project, service, post, location, or shared relationship and exposes the
   relevant FYD Circle/Node (principle 2). Generic likes are nearly worthless.
4. **Reciprocity loops:** follows/replies/references get immediate follow-back,
   Node exploration, object reference, Ask FYD about the connection (principle 4).
5. **Graph-neighborhood expansion:** 1-hop then carefully selected 2-hop after
   established relationships (principle 5).
6. **Content-derived discovery:** match FYD objects to genuinely relevant
   conversations (principle 6).
7. **New metric to track alongside the funnel:** per-pass productive graph
   expansion (verified relationships, reciprocal actions, FYD Node visits, object
   references, conversations) next to raw action counts.
8. **Unchanged:** FYD product freeze; CEO MODE volume guards; fail-closed;
   no platform-restriction bypasses; creator first-touch campaign stays
   standardized with intelligence only after a genuine signal.

## Guardrails

- OUTREACH DUPLICATES must equal 0. Rule: PROSPECT+CAMPAIGN+CHANNEL+MESSAGE CLASS -> suppression / prior-send / eligibility / capability / policy -> send. Canonical structured state wins. UNKNOWN external result reconciles before retry.
- Intelligence follows signal: first touch is cheap and standardized; deep research only after a response, click, info request, or other real signal.
- No pushes, no commits to main/master, no credential exposure, no Pig reboots, no platform-restriction bypasses.
- Engagement volumes: Facebook near nothing with slow ramp (Stage 0: 5 likes/pass, 0 comments); Instagram/Threads/TikTok/X at max safe volume with guards fail-closed.

## Bounded cohort (prepared, not sent)

Aaron Witt, Jeff Thorman, Jason Russell (Dr Decks), Justin Metzler,
Tyler Farrell (Killowen Homes), Dennis Comstock (Builder Brigade),
Priscilla La Ruffera, Timothy Uhler, Lydia Crowder (Drywall Shorty),
Steve Ramsey. Draft is Nolan's text verbatim with first-name substitution only.
Full table + pre-send verification checklist in `first-touch-campaign.md`.
Do not send until the cohort and dedup evidence have been reviewed.

## Flags for Nolan's call

1. BiggerPockets (brand entity, Denver HQ, 1.3M YT) needs a named recipient (CEO Scott Trench or founder Josh Dorkin) + Nolan's call before use.
2. Victor Oliveira (~890K TikTok) count evidence weaker than the rest; in pool, out of cohort.
3. FB guard automation defects (diagnosed 2026-09-23, fixes NOT implemented): `GUARD_RECORD_RE` truncates accounts at first space (52 false fuzzy blocks since 2026-09-18, e.g. "I'm From Denver" -> "i m"); `reel`/`events` indexed as page slugs (25 false ALREADY_ENGAGED); 83 same-job dupes emitted by job builders. Fixes strengthen the guard; they reduce false blocks, never weaken it. Awaiting coordinator/Nolan review.
4. IG second-chance experiment: 2/25 false negatives recovered (@electrician_egm Clifton CO Tier 1, @telluridevalleyroofing San Miguel Tier 3), guard-eligible, no actions taken. Recommendation: one-time batch re-verify of remaining ~59 near-miss handles via instagram-cli.

## FYD freeze (verified read-only 2026-09-23)

UI 162/162 green, TypeScript clean, object API wired to real machinery, ask-lane
fixture suite green, object actions 178/178, git clean. Notes: (a) journal-failure
error mapping disagreement (test expects 503, production deliberately serves 200
with verified base; untouched); (b) follow-receipt file `data/fyd-follows/local.json`
absent on this host (code + tests pass). Nothing modified.

## Source of truth

- Creator pool: ~/workspace/distribution/creator-pool.jsonl
- First-touch campaign: ~/workspace/distribution/first-touch-campaign.md
- First-touch draft uses Nolan's general draft verbatim (mechanical first-name substitution only).
