# GAP REGISTRY — crew working map

**Purpose:** every confirmed gap, organized toward the north star. Internal crew document — Nolan never sees the full list. Handoffs to Nolan contain ONLY items needing his decision, each with the exact question.
**North star:** PING as a perfectly operated tenant · FYD as the product surface · Mission Control as the truthful cockpit · Ask FYD evidence + privacy.
**Nolan's implementation priority (2026-10-01 ~17:47 MDT, binding):** visual integration first → Mission Control real PING cockpit → ORCA BUG-0001/real mission → TenantOS PING capability + placement → FYD owner loop → Ask FYD evidence + privacy. Everything else must justify taking a writer away from those. TenantOS = capability/placement/reconciliation machinery FOR PING FIRST (PING is substrate + dogfood tenant; no hypothetical customer tenants).
**Distinction discipline:** local ≠ integrated ≠ deployed ≠ served. Never conflate.
**Screenshot posture:** screenshot proofs are crew-internal QA only; never send Nolan decks. Handoffs = inspectable work + exact decision questions.
**Operating mode (2026-10-01 ~17:58 MDT, Nolan, binding):** COMMIT-EVERY-ACTION — every material implementation action terminates in a commit, even honest WIP. Commit law: inspect status → record before-SHA → identify owned files → one semantic unit → cheapest relevant test → review diff → stage owned only → commit → record after-SHA → only then continue. Atomic unit = one semantic proposition. Never git add . / -A, never another lane's files, never hide failing tests, never squash forensic boundaries, never reset/clean/stash shared state. COMMIT ≠ PUSH/COMPLETE/VERIFIED/INTEGRATED/REACHED/DEPLOYED. Writer commits BEFORE reassignment.
**Gap attack order:** SECURITY/AUTHORITY → EFFECT SAFETY → TRUTH → DURABILITY → REPLAY → REACHABILITY → DEPLOYMENT → OBSERVABILITY → DUPLICATION → STRANDED VALUE → MARKETINGOS. Every gap resolves to a tiny proven correction (committed) or an explicit UNKNOWN. Adversarial loop: CLAIM → REACHED PATH → AUTHORITY → FAILURE HYPOTHESIS → ADVERSARIAL TEST → OBSERVATION → SMALLEST CORRECTION → COMMIT → RE-RUN. Reproduce before repair. Proof ladder: SOURCE → UNIT → INTEGRATION → CLEAN CHECKOUT → BUILD → DEPLOYMENT → PROCESS → SERVED PATH → REAL EFFECT → INDEPENDENT OBSERVATION → OUTCOME — report highest level proven, never promote without evidence.
**Permanent loop (NEVER DONE, 18:15 MDT):** CLAIM → CHEAPEST FALSIFICATION → OBSERVATION → FIRST BROKEN REACHED EDGE → SMALLEST CORRECTION → TEST → COMMIT → RE-RUN → NEXT REACHED EDGE. GREEN means move to the next reached boundary, never expand sideways. Full directive: ~/workspace/directives/2026-10-01-never-done-always-improve.md. Numbered attack order: 1) semantic visual commits → 2) journal inventory → 3) fork history characterization → 4) dispatch convergence → 5) approvals convergence → 6) emit.py convergence → 7) hostile no-fallback test → 8) restore served MC → 9) ONE real bounded mission → 10) display only reached mission truth → 11) /tenants auth (DONE on source) → 12) placement verdict from the mission → 13) tiny placement resolver if proven first-broken → 14) FYD owner loop / Ask FYD.
**Maintained by:** triage coordinator. Update as items are verified, fixed, or closed. Last updated: 2026-10-01 ~17:52 MDT.

**Owner key:** `crew` = autonomous-safe, crew owns the fix · `nolan` = needs Nolan's decision · `watch` = healthy/monitored, no action.

---

## PILLAR 1 — PING as a perfectly operated tenant

| # | Gap | Where it lives | What unblocks it | Owner | Status |
|---|-----|----------------|------------------|-------|--------|
| P0 | `/tenants` unauthenticated WRITE = SECURITY DEFECT — CONFIRMED: unauthenticated POST created persisted tenant `sectest-p0-20261001` (deleted after test). FIXED: one-line auth-gate (`exteriorAuthMiddleware` on `/tenants` mount, gateway_runtime.js:714), committed `0b8b130c` on branch `fix/p0-tenants-auth` (worktree /home/nolan/ping-worktrees/p0-tenants-auth). Proof: INTEGRATION (3/3 hostile re-test green vs real middleware+route). NOT deployed — served container still vulnerable; rebuild HOLD per backend decisions | /home/nolan/ping | Crew: fix committed. Nolan: authorize gateway rebuild/restart to serve it | nolan | FIXED (source) / UNDEPLOYED |
| P0b | Adjacent unauthenticated mounts observed during P0 probe (deliberately out of scope for the one-proposition fix): `/deployments`, `/runtime`, `/identities`, `/context`, `/system`, `/api/v1/repository` | Gateway `_mountRoutes` | Crew: verify each, gate or justify, one proposition per commit | crew | OPEN |
| P0c | `DELETE /tenants/:id` unauthenticated AND 500s on `executeRemoveTenant` (pool undefined in that path) | Gateway tenants route | Crew: gate + fix the pool bug, one proposition per commit | crew | OPEN |
| P1 | C: at 9.81% free, below the 15% headroom invariant; burn ~0.4–0.75 GB/h; ~24 GB shortfall | Pig C: (Ubuntu vhdx 101.7 GB, docker vhdx 97.1 GB) | Nolan picks a reclaim lever: docker build cache 7.5 GB + reclaimable images 3.15 GB (no prune authorized), npm cache 1.1 GB, or VHDX compaction (wsl --shutdown + Optimize-VHD) | nolan | OPEN — escalated 17:44 MDT |
| P2 | Deploy worktree `deploy/interval10-forensics-20260930` + merge `67da6aab1` gone from disk | Was under ~/workspace/.worktrees/ (Pig) | Nolan: expected post-certification cleanup, or lost and needing rebuild? | nolan | OPEN |
| P3 | Oracle: Lane L tenant backfill UPDATE incompatible with append-only triggers (`trg_ping_events_append_only*`); journal sealed at 2557 rows | Oracle crx_runtime.ping_events | Nolan picks repair class: (a) trigger maintenance window for one-time backfill, (b) COALESCE-read-path + DEFAULT UNKNOWN (coordinator-recommended, shadow-proven), (c) trigger-absent-gated UPDATE | nolan | OPEN — verified live 17:45 MDT |
| P4 | Served gateway predates HOLD sweep / markHold / resolve CLI / tenant enforcement; `/health` 503. Backend decision 17:57: gateway rebuild HOLD until visual slice commits | Pig `ping-gateway` container (`research-p0-20260930` image) | Nolan: gateway redeploy decision (carries 8 owner decisions from 12:17 wave note) — AFTER visual slice commits | nolan | OPEN — held per backend decision |
| P5 | Ollama publishes 11434 on all interfaces | Pig `ollama` container | Nolan picks: Option A (recreate open-webui on shared net + rebind ollama to 127.0.0.1; exact commands captured) or Option B (Windows Firewall inbound block on 11434, zero container changes). Localhost-only bind alone BREAKS open-webui (reaches via host.docker.internal, non-loopback) | nolan | OPEN — assessed, untouched |
| P6 | `BACKLOG_NOLAN` storage items 7/8 conflict (monitor+evacuate vs fix-writers; <10%/<7.5% thresholds vs 15% invariant; opencode.db relocation vs no-relocation rule) | `~/workspace/BACKLOG_NOLAN.md` | Nolan: retire both as superseded by closed-form invariants, or keep item-8 investigation open? | nolan | OPEN |
| P7 | 42 intents fb-20260924-175129 OPEN / UNKNOWN_EXECUTION | `~/workspace/outreach/action-intent-ledger.jsonl` | Nothing — genuinely unknowable (worker died at unknown point, no evidence surface). Guard refuse-block already prevents re-targeting. Terminal state, not a queue | crew | CLOSED (deliberate) |
| P8 | Backlog hygiene: FYD-010 stale OPEN mapping; FL-20260922-002 duplicate; NOW-6 stale premise; Vercel SDK double-track | `~/workspace/BACKLOG_PING.md`, `GRILLING-BRIEF.md` | — | crew | FIXED 17:46 MDT |
| P9 | "25 stuck missions" cited as current | Team lore / sweep item D8 | Nothing — re-verified twice today: zero non-terminal missions in both DBs (integrate_run 9 completed/4 failed; ping_runtime 642/34; zero holds). Resolved history | crew | CLOSED |
| P10 | UNCLEAR follow-up mission `3b0f430a06a41357` in created/UNCLAIMED | Scheduler | Crew: claim or close with a decision record | crew | OPEN |
| P11 | Storage lifecycle contract (Nolan item 30) unwritten; must exist BEFORE first byte-producing cron | — | Crew: draft the contract for Nolan's sign-off | crew | OPEN |
| P12 | Pig wake-lock reversal (revert AC sleep/display to before-values) unacknowledged | Power lane | Crew: verify before-values exist, then Nolan's word to execute (reverses interim policy) | nolan | OPEN |
| P13 | Discovery scheduler: failed 01:21 + 13:21 MDT ('follow-up has no durable chat owner'); 19:21 run pending. First check-worker died 19:09 on runtime restart-drain (infra, not a task result); re-dispatched with short-increment waiting | `ping-social-outreach-discovery-research` | 19:21 outcome: third same-error failure = escalate per standing rule | crew | WATCH — check lands ~19:26–19:45 MDT |
| P14 | Pipeline reconcile: 2 OPEN R2 DISTILL NOT_RUN gaps | Tandem pipeline | — | crew | FIXED 17:45 MDT (mark-verified.sh, evidence-backed; distill-decision step belongs to owning lane) |

## PILLAR 2 — FYD as the product surface

| # | Gap | Where it lives | What unblocks it | Owner | Status |
|---|-----|----------------|------------------|-------|--------|
| F1 | FYD primitives (JSON Patch 30/30, outcome sensor 24/24, readiness compiler 12/12 — 66/66 re-verified) built green but NOT wired into the product | `/home/hatch/workspace/fyd-build` (branch fyd-025-semantic-determinism, HEAD 841825c, dirty, no remote) | Nolan: product decision to wire in (archaeology-first rule stands) | nolan | OPEN — verified intact |
| F2 | `objectgraph-relate-output-dropped` (P3): `relate()` has zero production callers; wiring patch delivered-but-unlanded | `goals/ping-agent-execution-stack/hidden_files/perfecting-pass-2026-09-27/` | Nolan: land the wiring patch or remove the dead RELATE stage + test? | nolan | OPEN |
| F3 | `visibility-customize-dangling-import` (P1): recovery `patch.ts` untracked, provenance unverified, sha mismatch vs proven copy | `fyd-product-lane/src/fyd/proceduralize/patch.ts` | Nolan: commit a typechecked recovery copy? (typecheck/commit is his call) | nolan | OPEN |
| F4 | FYD-034 ("260-commit push status unknown") vs FL-20260919-004 (push blocked, egress-proxy 401) reconciliation before push | `BACKLOG_PING.md:261`, `FAILURE_LEDGER.md:77`; Pig repo `C:\Users\nolan\PING` branch constitutional-convergence-authority-law | Nolan: (1) is the 401 transport fault resolved? (2) exactly what is pushed? (3) authorize a new push attempt (re-opens FYD-034)? | nolan | OPEN |
| F5 | Codex webdev harvest: processes NOT running, no sessions written today (earlier "alive" claim corrected) | Pig / WSL | Crew: none — harvest stays paths-only until Codex is re-engaged | crew | NOTED |
| F6 | FYD proof chain (Happy Place + Coppersmith via approved private device path): server start + private URLs not delivered | Product lane | Crew: deliver or report blocker | crew | OPEN |

## PILLAR 3 — Mission Control as the truthful cockpit

| # | Gap | Where it lives | What unblocks it | Owner | Status |
|---|-----|----------------|------------------|-------|--------|
| M1 | MC cannot surface stuck claim-generation missions (failure class invisible in projection). Backend decision 17:57: MC rebuild YES, but only after visual ownership clears (stale-journal-path diagnosis concrete) | MC projection (`/api/mc/queue` 404) | Convergence lane: wire scheduler queue into MC projection as part of the authorized rebuild | crew | OPEN (latent — queue currently drained; sequenced after visual) |
| M2 | MC dispatch proof unproven (escalation trigger: "Mission Control can now dispatch a real headless agent") | — | Crew: run the bounded proof or record why not | crew | OPEN |
| M3 | MC served-state uncertain: 17:36 HTTP 200 no longer holds — :3100 NOT listening 18:00–18:03 MDT per journal-path proof (18:00). Journal split found: three divergent journal files; mc-dispatch.ts + approvals/route.ts + emit.py read/append a third file invisible to the gateway API. Dedicated worker attacking directive steps 2–7 (inventory → fork characterization → converge writers one proposition per commit → hostile no-fallback test); registry absorbs its report when it lands. Fix per Nolan: point writers at journal #1 (`/home/nolan/projects/ping/data/fyd-journal/events.jsonl`); retire the :18200 fork only after unique history characterized. :3101 is a dev server from ~/workspace/fyd-build, not MC | Pig :3100 / journal paths | Crew: journal worker in flight; MC restore only after writers converge. Nolan: confirm render from Tailscale device once re-established | nolan | OPEN — worker in flight |
| M4 | page-insights producer not on the served line; scheduled proof unproven (SCHEDULER_NOT_SCHEDULED) | `page-insights-scheduled-proof-20261001` (runonce, fired 09:01) | Nolan: authorize merging the producer line to the served line? (known blockers: merged gateway has no Bearer port; Lane L backfill conflict P3) | nolan | OPEN |

## PILLAR 4 — Ask FYD evidence + privacy

| # | Gap | Where it lives | What unblocks it | Owner | Status |
|---|-----|----------------|------------------|-------|--------|
| A1 | Gateway self-reports unhealthy: `event_governance` degraded (12 NAMESPACE_VIOLATION of 150), `embedding` not initialized | Pig gateway /health | Crew or Nolan: address violations / init embedding, or accept as known-degraded | crew | WATCH — Ask FYD itself healthy |
| A2 | Ask FYD: recovered, answers with evidence + honest refusals | FYD | — | crew | HEALTHY (verified live 17:45 MDT) |
| A3 | FYD-010 privacy gate: closure ledger DONE_VERIFIED 2026-09-27, but Nolan's 17:47 release criterion is now adversarial proof — a PUBLIC VIEWER must be unable to retrieve PRIVATE/PING_ONLY/OWNER fields. Until proven: no increased private-data exposure; PING itself is the hardest dogfood tenant. Pre-launch PII rule: no real business PII into the system | Backlog | Crew: run the adversarial proof; Nolan: accepts the proof | crew | OPEN (gate unproven) |

## Engagement surfaces (feed the pillars; not the north star itself)

| # | Gap | Where it lives | What unblocks it | Owner | Status |
|---|-----|----------------|------------------|-------|--------|
| E1 | X tail-scanner standing fix pending (false positives dormant since 13:14; passes dodge by rephrasing) | `x-engagement-pass` | Crew: repair the scanner | crew | OPEN |
| E2 | Threads replacement seeds outstanding since pass 155 (passes 155–171 all note it) | `threads-engagement-pass` | Crew: produce seeds or Nolan: bless pool approach | crew | OPEN |
| E3 | FB pool thin (539→427→75→2 eligible); Nolan authorized tiered geographic expansion 17:41 MDT | `facebook-engagement-pass` | Crew: expansion now authorized — execute closest-first, never skip yielding tiers | crew | IN PROGRESS (authorized) |

## Website (product surface support)

| # | Gap | Where it lives | What unblocks it | Owner | Status |
|---|-----|----------------|------------------|-------|--------|
| W1 | P0 preservation: 3 Codex commits landed 17:36 (e25fca33 ARTWORK SOURCES, 1326d275 SYMBOL LANGUAGE, f565e785 SITE INTEGRATION); ~20 files WIP | ping-parallel worktree, branch codex/ping-parallel-review | Crew: refinement per 17:31 directive | crew | IN PROGRESS |
| W2 | ping-website: tsc clean VERIFIED; screenshots + zero-console-errors UNVERIFIED (no PNGs in repo; needs browser) | `/home/nolan/projects/ping-website` (branch ping/website, HEAD 504e3405) | Crew: browser verification via eligible delegation | crew | OPEN |
| W3 | ping-website origin = `trishnikitha-art/happy-place-platform.git` (never-touch repo); push/deploy unauthorised | Same repo | Nolan: explicit word before ANY push; deploy target decision | nolan | OPEN — hazard flagged, nothing violated |
| W4 | `src/system/` memory claim corrected: lane ADDED why-this.tsx + status-label.tsx (headers disclaim data-contract authority) — was never deleted | Same repo | — | crew | NOTED (no-second-authority holds) |

## OPEN FALSIFICATION PROBES — 30 adversarial questions (2026-10-01 ~18:15 MDT, Nolan: "ASK 30 QUESTIONS")

Each targets a live claim. Registered as OPEN probes, not answered. A probe closes only with an observation (falsified → smallest fix committed; confirmed → evidence recorded) or an explicit UNKNOWN. Source file: ~/workspace/gaps/adversarial-questions-2026-10-01.md.

**TRUTH / JOURNAL**
- Q1: Which writers append to journals the canonical gateway cannot see, and what is the cheapest probe proving a given event is invisible? — OPEN (journal worker in flight, steps 2–7)
- Q2: Do the fork journals contain legitimate events absent from the canonical journal, and what breaks if we classify that wrong? — OPEN (do NOT delete forks until characterized)
- Q3: If emit.py runs today with a misleading working directory, which journal receives the event: canonical or a silent new store? — OPEN
- Q4: When the canonical journal path is unset or missing, does the writer fail closed or invent another truth store? — OPEN
- Q5: Can the same logical event be appended twice by two writers, and does anything detect the duplicate? — OPEN

**SECURITY / AUTHORITY**
- Q6: Can an unauthenticated caller mutate /tenants right now, and what is the exact hostile request that proves it? — FALSIFIED+FIXED at source (0b8b130c, hostile re-test 3/3 green); OPEN at served level (rebuild HOLD)
- Q7: Can a caller forge tenant, actor, or capability on a mission proposal and have it accepted? — OPEN
- Q8: Can an approval be fabricated without the required authority, and would Mission Control display it as legitimate? — OPEN
- Q9: Who can write to the canonical journal, and is there any writer that bypasses the gateway entirely? — OPEN (partially answered by journal inventory when it lands)

**EFFECT SAFETY / DEPLOYMENT / REACHABILITY**
- Q10: Is the code that will serve :3100 actually built from the tested source, and how would we know if it weren't? — OPEN
- Q11: Can a successful external effect be retried because its response disappeared — is there idempotency at the effect boundary? — OPEN
- Q12: Which supposedly working code paths are never called by the served product? — OPEN

**DURABILITY / REPLAY**
- Q13: If the Pig reboots right now, which accepted decisions disappear: what is durable and what lives only in memory? — OPEN
- Q14: Can canonical history reconstruct the same semantic state on replay, or does ordering depend on insertion luck? — OPEN
- Q15: After a restart, do the journal gateways resume appending to the same canonical file or start a new one? — OPEN

**OBSERVABILITY / MISSION CONTROL**
- Q16: Can Mission Control distinguish UNKNOWN from FAILED, unwired from broken, source state from deployed state, or does it render them identically? — OPEN
- Q17: For the last real mission, can one screen answer what was wanted, what was known, who authorized, what ran, and what was verified — or are those answers in five different places? — OPEN
- Q18: Does any Mission Control number exist that no independent observer could reproduce? — OPEN

**ORCA**
- Q19: What did ORCA actually propose in the last 24 hours, and is there a record a skeptic could audit? — OPEN
- Q20: Can ORCA's proposal be distinguished from its execution, or does planning silently become authority? — OPEN

**VISUAL PRODUCT**
- Q21: Which homepage section currently shows an illustration followed by more marketing copy instead of inspectable product state? — OPEN
- Q22: Does the hero teach OBSERVE → UNDERSTAND → PROJECT in 10 seconds, or does it only look beautiful? — OPEN
- Q23: Can a visitor click Evidence and reach a real claim with a real support set, or does the art terminate in prose? — OPEN
- Q24: Ask PING: when asked something the evidence does not establish, does it say so or invent? — OPEN
- Q25: Is there any number on the site a visitor cannot trace back to a source? — OPEN

**FYD / PRIVACY**
- Q26: Can a public viewer retrieve a PRIVATE/PING_ONLY/OWNER field today (FYD-010): what is the exact adversarial request? — OPEN (release gate)
- Q27: Does an owner correction change authorized presentation without rewriting observed truth, or does customization mutate history? — OPEN

**TENANTOS / PLACEMENT**
- Q28: When the next real mission needs placement, what decides (tenant, capability) → target, and is that decision recorded anywhere? — OPEN (resolver only when a real mission proves it the first broken edge)
- Q29: Is there any PING-specific semantic hack that would break the day a second tenant exists? — OPEN

**LEARNING / MARKETINGOS**
- Q30: What did the system learn this week that changed a deterministic default, and where is the evidence? — OPEN

---

## Changelog
- 2026-10-01 ~17:52 MDT: registry created from D+C triage (10 workers).
- 2026-10-01 ~17:55 MDT: folded in Nolan's 17:47–17:50 steer — implementation priority order, TenantOS redefinition, local≠integrated≠deployed≠served discipline, screenshot posture, FYD-010 adversarial privacy gate.
- 2026-10-01 ~18:06 MDT: P0 CLOSED on source — unauthenticated POST /tenants confirmed (test tenant created+deleted), one-line auth-gate committed 0b8b130c on fix/p0-tenants-auth, hostile re-test 3/3 green, INTEGRATION proof; NOT deployed (rebuild HOLD). P0b/P0c opened (adjacent bare mounts, DELETE 500 bug). M3 regressed: :3100 not listening 18:00–18:03, journal split found (three files; fix = point at journal #1, retire :18200 fork).
- 2026-10-01 ~18:18 MDT: NEVER DONE directive adopted as permanent loop (claim→falsify→observe→first broken edge→fix→test→commit→re-run→next edge); 30 adversarial questions folded in as OPEN falsification probes (Q6 partially closed at source, open at served); M3 updated — dedicated journal worker attacking steps 2–7, report pending.
