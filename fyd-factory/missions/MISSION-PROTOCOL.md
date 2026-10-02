# FYD FACTORY: MAXIMUM PARALLEL MISSION PROTOCOL
Standing program. Nolan's orders: maximum parallel, no stopping conditions, YOLO on routine work inside hard boundaries.

## Hard boundaries (Nolan's orders, not permission gates)
No public production launch. No owner contact or outreach of any kind. No destructive git (no pushes, no main/master commits, no touching other lanes' dirty work). No credential exposure. Vendor veto gate: do not adopt external vendors/services without Nolan. No synthetic business ever presented as a real prospect (every synthetic artifact carries synthetic:true + testing-only). Everything else: decide at 80%+ confidence, test, document evidence, continue.

## Standing invariant: NO STOPPING CONDITIONS
At minimum, read-only cognition runs ALWAYS. If write lanes must throttle or pause (saturation, safety, gates), discovery, auditing, falsification, verification, and learning continue without pause. The factory never goes fully idle. A worker that finishes its shard does NOT report and wait: it takes the next unclaimed shard, then falsifies other shards' failure classifications, then discovers its next highest-value gap. Record all of this in the shard log.

## Repo access (read-only for missions)
Pig repo: /home/nolan/projects/ping, branch fyd-factory, HEAD e48ef710cb889bf4d59b833ef9766067a9e2bbf0.
Run scripts via ~/workspace/bin/wsl-run.sh <script-file> [timeout]. The working tree has 90+ dirty files from other lanes: never touch them, never commit, never apply patches to the repo. Patches you propose go to ~/workspace/fyd-factory/missions/patches/ as checked patch files (git apply --check); a single integration writer (parent-gated) owns the repo. One writer per mutable semantic unit: the repo is that unit, and it is not yours.

## Saturation (never crash the machine for a number)
Before a heavy run, check Pig load once via wsl-run.sh (uptime, nproc). If 1-minute load exceeds 2x core count, wait 60s and recheck, max 5 waits, then proceed and note it. Run ONE tsx harness invocation per worker for the whole shard (never one ssh call per mission). Stream progress to your shard log; write results incrementally (JSONL append) so a crash loses almost nothing. Report missions/min and peak memory at the end.

## Shard claiming (atomic lock; no collisions)
Three collisions happened in wave 1 (WORLD-6, OBJECT-2, OBJECT-0). "Absent" is perishable: a directory listing is stale the moment you read it. Before a worker touches a shard, it MUST hold that shard's claim:
- `missions/claim.sh claim <class> <shard-N> <worker-id> [--lease-sec SEC]` (default lease 6h). The marker is `missions/<class>/shard-N/.claim`, published atomically; exactly one worker wins a race.
- Lost the claim (fresh lease held by someone else)? The script exits nonzero and says so. Take the next unclaimed shard. The factory never idles; it does not fight over a claimed shard.
- Stale lease (holder died or ran past expiry): `claim` takes it over and records the takeover in `.claim/history`. Renew before expiry on long runs (`claim.sh renew`); release when done (`claim.sh release`).
- Re-list immediately before writing: right before writing results.jsonl or SUMMARY.md, run `claim.sh status`. If the marker is missing or owned by another worker, STOP and do not write. This is the backstop for the microsecond takeover race; see missions/CLAIM-LOCK-TEST.md.
- Never remove another worker's `.claim` by hand. The only legal takeover path is `claim` on a stale lease.

## Deterministic world addressing (no coordination needed)
Worlds are pure functions of their index. Implement this exact contract (mulberry32 seeded PRNG):

TYPES (32): local-services, professional, restaurant, hospitality, health, fitness, beauty, automotive, real-estate, construction, manufacturing, logistics, retail, ecommerce, education, nonprofit, creator, consulting, finance, legal, tech, saas, enterprise, multi-location, franchise, marketplace, mobile-service, appointment, catalog, knowledge, project, membership
DIMS (6): service-heavy, location-heavy, person-heavy, portfolio-heavy, event-heavy, transaction-heavy
HOSTILES (10): no-jsonld, conflicting-hours, many-services, unsafe-urls, rtl-text, franchise-lookalike, stale-source, contradictory-sources, broken-media, clean

world(i): type = TYPES[i % 32]; dim = DIMS[(i // 32) % 6]; hostile = HOSTILES[(i // 192) % 10] if (i % 4 == 0) else clean; owner_intent = hide-object if (i % 5 == 0), correct-fact if (i % 5 == 1), none otherwise.
Names from fixed word lists via PRNG(i); phones unique per world in 555-01XX; every artifact: synthetic:true, testing_only:true.

## Mission classes
Shard size 500 (decision: 250). Shard k of class C covers indices [k*500, (k+1)*500).

### WORLD (5,000): full business-world missions. NOT clones; diverse by construction.
Per world i: generate world -> SOURCE -> OBSERVATION -> EVIDENCE -> OBJECTS -> RELATIONSHIPS -> OWNER INTENT -> PUBLIC-SAFE PROJECTION -> SITE SPEC -> RENDER (HTML string via buildRenderContext; no live browser: render-model + HTML-string verification is the verify step) -> VERIFY.
Verify asserts: spec valid OR typed failure (never throw, never invented claim); no unsafe URL schemes in output; hidden objects absent from public output; unbound factual claims absent; at least one section; viewport meta present.
Record per mission: outcome (one of GENERATED / GENERATED_WITH_WARNINGS / NEEDS_REVIEW / ACQUISITION_FAILED / IDENTITY_AMBIGUOUS / EVIDENCE_CONFLICT / UNSAFE_SOURCE / UNSUPPORTED / CRASH), failure stage, stage latencies, object/relationship/section counts, unsafe_url_count, unbound_claim_count.

### OBJECT (3,500): FYD OBJECT -> SITESPEC -> RENDERER missions.
Per mission: take fixture graph (rotate across ~/workspace/fyd-factory/corpus/fixtures/: batch-b, trades-a, clearwater, professional, hostile/) with deterministic mutation seed -> generateSiteSpec -> validateSiteSpec -> buildRenderContext -> render HTML string -> determinism check (compile twice, compare digests) -> same verify asserts as WORLD.

### PROJECTION (3,000): one graph, many surfaces.
Per mission: take fixture graph -> generate projections: website-sections, mobile-summary, ask-answers (3 canned questions through the concierge), owner-dashboard-view, circle-context, mcp-context, search-doc, faq, catalog, directory-entry, portfolio-card, proposal-draft, lead-intake-schema, campaign-draft, landing-page, analytics-view -> verify per projection: public stays public, private never leaks, owner-hidden stays hidden, SOURCE FACT != OWNER INTENT != OBSERVATION labeled distinctly, PROJECTION != TRUTH (no projection claims canonical authority).

### SYNTH (1,500): synthetic business operating worlds (reobservation loop).
Per world: generate world -> owner correction (correct-fact or hide-object) -> reobservation (changed source: phone/hours changed, or conflicting new source) -> regenerate -> VERIFY: owner correction survived reobservation; owner hide did not delete evidence; history intelligible (old occurrence ids immutable).

### DECISION (1,000): decision/policy units.
Per unit: take one item from ~/workspace/fyd-factory/missions/decision-backlog.jsonl (seeded with failure classes and integration decisions; append your own) -> decompose to: QUESTION / POSSIBLE OUTPUTS / EVIDENCE REQUIREMENTS / CONFIDENCE / CRITICALITY / REVERSIBILITY / BLAST RADIUS / NOVELTY / AUTHORITY REQUIRED / COST / TIME SENSITIVITY / VERIFICATION -> verdict: AUTO_EXECUTE / AUTO_EXECUTE_AND_NOTIFY / EXECUTE_REVERSIBLY / GATHER_MORE_EVIDENCE / DEEP_REVIEW / REQUEST_CONFIRMATION / HUMAN_DECISION / REFUSE / DEFER. High confidence NEVER overrides authority: anything needing owner contact, real money, credentials, or canonical mutation -> HUMAN_DECISION or REFUSE.

## Failure loop (per worker, per generic class)
Every failure: local accident or generic class? Generic = 3+ missions with the same failure signature in your shard.
For each generic class, attempt ONE improvement: minimize repro -> write fixture to ~/workspace/fyd-factory/missions/fixtures/ -> find the existing mechanism (reuse authorities; never a second authority) -> write a patch to ~/workspace/fyd-factory/missions/patches/ touching ONE authorized path (git apply --check it) -> test the patch against the repro in your harness -> falsify (try to break your own fix) -> rerun affected missions -> record. One-offs stay logged until proven otherwise. NO feature expansion: 4+ missions same missing primitive = candidate generic primitive (high priority); 1 bizarre = log only.

## Findings format
Every finding uses the shared record: DOMAIN / COMPONENT / CLAIM / EVIDENCE / CALLER / CALLEE / WRITER / READER / AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS.

## Outputs per worker
~/workspace/fyd-factory/missions/<class>/shard-<k>/results.jsonl (one line per mission), SUMMARY.md (outcome distribution, p50/p95 latencies, throughput, failure taxonomy, generic classes found, patches proposed, saturation numbers), SHARD-LOG.md (decisions at 80%+, what you did after finishing). Findings in the shared record format inside SUMMARY.md.

## Escalation (human interruption budget)
Escalate ONLY: credentials/auth Nolan must perform; real money; contacting/publishing to real owners; irreversible destructive action; new production P0; canonical corruption risk; a genuinely different business decision. Everything else: decide, test, document, continue. No status reports: your SUMMARY.md is the report.
