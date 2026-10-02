# Automation Resilience Program — Implementation Report
**Date:** 2026-09-17 (~06:38 MDT)
**Coordinator:** subagent session 3efcf4a1-b9c8-457d-953b-3c1dfe25a38f
**Scope:** workspace automation machinery only (NOT the PING runtime; a separate coordinator owns runtime fixes)
**Nolan's directive:** 16 items + overarching rule, all addressed below

All work is surgical, scoped, reversible. No commits, no pushes, no PING-runtime or Oracle changes. All existing safety rules (action-block stops, human pacing, caps, stay-on rules) preserved verbatim. No live-browser runs were performed by the implementers.

## 1. Classification + enumeration verification (items 1, 2, 6, 7, 8, 12, overarching rule)

**New:**
- `~/workspace/pig-fb/pass-classifier.js` — `classifyPass()` with the 10 terminal classes: SUCCESS_ACTION, SUCCESS_EMPTY, ENUMERATION_FAILURE, ELIGIBILITY_EMPTY, DEPENDENCY_FAILURE, AUTH_FAILURE, SURFACE_DRIFT, RATE_LIMIT, TEMPORARY_FAILURE, TERMINAL_FAILURE. Zero-result suspicion built in: `candidatesFound==0 && historicalBaseline>0` can never classify SUCCESS_EMPTY. Suspicion levels 0 (normal zero) through 4 (quarantine the surface after 3 consecutive enumeration failures). Every result returns `{class, explanation, suspicionLevel, recommendedAction}` with a human-readable "why did nothing happen" sentence.
- `~/workspace/pig-fb/enumeration-verify.js` — DISCOVER->ENUMERATE->VERIFY ENUMERATION->PLAN->EXECUTE->VERIFY EFFECT->RECONCILE pipeline with health signals: expectedPopulation, discoveredPopulation, discoveryDeltaVsPrevious, enumerationConfidence, surfaceFingerprint, selectorDrift, actionableCandidateCount, executionCount, postActionVerificationCount. Never throws on stage failure; always reaches RECONCILE.
- `~/workspace/pig-fb/capability-registry.json` — capability/strategy registry v1. First entry `enumerate_followed_pages`: strategy A profile-page (health broken, observed 0 on 2026-09-17, kept as negative knowledge), strategy B pages-dashboard (last-known-good, observedCount 139, confidence high, preferred). Includes fallback/health-update conventions for future capabilities.

**Modified:** `~/workspace/pig-fb/fb-unfollow.js` (reference pattern): loads registry at runtime, `enumerateWithFallback()` verifies against baseline 139 and retries an alternate enumeration on unexpected zero, captures surface fingerprint, and every result JSON now carries `passClass`, `passExplanation`, `suspicionLevel`, `recommendedAction`.

**Tests:** `node ~/workspace/pig-fb/self-test.js` — 27/27 pass (all 10 classes, suspicion levels 0-4, fingerprint stability, pipeline no-throw). `node --check` clean. Pacing/caps/safety stops byte-identical.

**Open:** consecutiveEnumerationFailures persistence across cron invocations (counter file?) so level-4 quarantine can trigger; watch the next real FB unfollow cron run for `enumerationAttempts`/`passExplanation` fields. Other drivers need their historical baselines recorded in the registry before adopting the classifier.

## 2. Research lifecycle + quarantine (items 3, 4)

**New:**
- `~/workspace/tandem/brief-lifecycle.py` — lifecycle PENDING->RUNNING->VALIDATING->COMPLETE / VALIDATION_FAILED->RETRY->TERMINAL_FAILURE->QUARANTINED, derived from runs.jsonl + quarantine dir. RETRY_LIMIT=3 consecutive contract rejections (~18h). `--check` emits human-gated recommendations, never auto-quarantines. Contract validator untouched.
- `~/workspace/tandem/contracts/quarantine-record.schema.json` + `~/workspace/tandem/quarantine/c-review-complaint-signals.json` — quarantined per Nolan's explicit approval. 5 consecutive v1.0.0 rejections (2026-09-16 09:07 UTC -> 2026-09-17 09:06 UTC), 20 artifacts preserved, retry-eligible 2026-09-24 with requires_prompt_fix=true. Lift requires Nolan.
- `~/workspace/tandem/distill-sweep.py` — `--select`/`--queue`/`--mark` with durable ledger `hidden_files/meta-ai-intel/distill.jsonl`. Cap 5 items per cycle (rationale: a cycle runs <=2 fresh prompts; 5 bounds the sweep to one turn's envelope so recovery never starves fresh research; 15-item backlog drains in ~3 cycles; stale-breach-first ordering).

**Modified:** `~/workspace/tandem/next-brief.py` — QUARANTINED/TERMINAL_FAILURE briefs removed from the candidate cycle; production now yields `d-segment-deep-dive` (was pinned on c for 5 cycles). Exit 3 = rotation exhausted. `meta-ai-intel-pass__interval@6h.md` rewritten: every cycle = PHASE A primary (<=2 prompts) + PHASE B distill sweep + PHASE C stale recovery + PHASE D quarantine maintenance. Age bands: <24h normal, 24-48h elevated, 48-72h high, 72-96h urgent, >96h stale breach.

**Tests:** `~/workspace/tandem/test-lifecycle.sh` — 12/12 pass (terminal brief skipped, rotation advances, exhausted exits 3, infra-failed briefs still retried).

**HONEST NEGATIVE FINDING:** the "13 unprocessed answers (up to 68h old)" dead-letter queue does NOT exist. Every answer file was verified against sidecars, verified-* markers, and ingested.log: all 15 eligible answers were already processed by the outreach engine in rounds 43-66. The distill queue currently selects nothing — the correct healthy state. A data-quality anomaly is preserved in the quarantine record (run 20260915-210425 has ledger outcome=ok but sidecar contract_rejected) for a future audit.

## 3. X adaptive cadence (item 5)

**Modified:** `x-engagement-pass__interval@4h.md` — adaptive gate via `x-tier-record.py --gate` (SKIP = zero-cost soft skip, no API/Pig/browser). Thresholds: 4h effective at 0-1 consecutive empty passes, 12h at 2-4, 24h at 5+. Escalation after 3 consecutive empties at a tier into the next tier (cumulative 1..N, only into tiers with usable seeds). USEFUL_PASS resumes 4h instantly. RESTRICTION_HALT holds counters (safety event, not dryness).

**New:** `~/workspace/pig-fb/x-tier-record.py` + `~/workspace/pig-fb/x-tier-state.json` — per-tier tracking (candidate yield, eligibility rate, engagement yield, action yield, last successful candidate, last useful pass), atomic writes, 60-entry history tail. Bootstrapped from the log (last pass 2026-09-17 05:14, 53 candidates / 0 eligible).

**Modified:** `~/workspace/pig-fb/x-seed-ids.json` (v2, tiered) — Tier 1 = 15 verified Nolan-followed seeds; Tier 2 = DRAFT/INACTIVE (@karpathy, @lexfridman, @emollick — real handles, user IDs null, never auto-activate); Tier 3 = TBD with sourcing rules. `~/workspace/pig-fb/x-engage.sh` — `write_sidecar()` emits the four distinct empty states: NO_CANDIDATES, NO_ELIGIBLE_CANDIDATES, CANDIDATES_BUT_ALL_BLOCKED, CANDIDATES_BUT_ACTION_FAILED, plus RESTRICTION_HALT and USEFUL_PASS.

**Finding:** x-sweep.js..x-sweep4.js are NOT the engagement pass entry point (read-only follow-curation sweep, newest x-sweep4.js, nothing invokes them). Live entry points: Phase A `xapi.py` + Phase B `x-engage.sh`. Only x-engage.sh was modified.

**Docs:** state-semantics appended to `~/workspace/outreach/x-engagement.md` (append-only).

**Needs (surface to Nolan):** Tier 2 activation needs X user IDs for @karpathy, @lexfridman, @emollick — one-time browser lookup (parent delegation) or Nolan naming the accounts.

## 4. IG wedge isolation + canary + action truth (items 9, 10, 11)

**New:**
- `~/workspace/pig-fb/ig-capability-state.json` — instagram-browser-automation: CAPABILITY=BLOCKED, REASON=BROWSER_WEDGE (since 2026-09-16 23:05 MDT). Only `ig-recovery-test.sh` may flip to AVAILABLE. Explicit prohibition on clearing the wedge / restarting / killing the ig-profile Chrome.
- `~/workspace/pig-fb/ig-capability-gate.sh` — fail-closed gate: exit 0 when AVAILABLE; exit 2 with DEPENDENCY_FAILURE JSON when BLOCKED/missing/unparseable.
- `~/workspace/pig-fb/ig-recovery-test.sh` — after Nolan's manual reopen: authenticate -> reach surface -> enumerate -> verify non-empty -> dry-run -> execute ONE canary like -> verify -> unlock AVAILABLE with canary_required=true. Requires IG_CANARY_POST_URL (contract error if unset).
- `~/workspace/outreach/action-truth.jsonl` + `action-truth-README.md` + `action-truth-append.py` — independent DISCOVERED/ELIGIBLE/SELECTED/ATTEMPTED/SUCCEEDED/VERIFIED/FAILED funnel per run, classifier vocabulary included. Seeded with 5 verified 2026-09-17 records.

**Modified:** `run_ig_pass.sh`, `run_ig_unfollow.sh` — gate check FIRST (exit 2 DEPENDENCY_FAILURE in ~93ms, no SSH/CDP attempted). `ig-engage.js`, `ig-unfollow.js` — CANARY_REQUIRED=1 / job.canary_required: one verified canary first, batch continues only on success. Both IG cron definitions — capability-gate + canary steps added.

**Needs (surface to Nolan):** set IG_CANARY_POST_URL (a stable public post where a like is harmless and reversible) before the recovery test can complete.

## 5. Recovery budgets + scheduler + health report (items 13, 14, 15, 16)

**New:** `~/workspace/pig-fb/recovery-budgets.json` v1.0.0 (governing rule): enumeration = 3 alternate strategies then quarantine; browser_recovery = 2 attempts then DEPENDENCY_FAILURE; authentication = 2 attempts then AUTH_FAILURE + quarantine (no hammering); rate_limit = stop instantly, backoff 5m->10m->20m across passes then 24h quarantine; research_validation = 3 retries PROPOSED (research agent owns the final cap).

**Modified (via cron.update, 5 bodies):** facebook-engagement-pass, instagram-engagement-pass, threads-engagement-pass, tiktok-engagement-pass, facebook-unfollow-batch — each got a SCHEDULER RESILIENCE section: hard non-blocking rule (no job/brief/surface/provider/artifact blocks unrelated work; failures quarantine only that surface), budget references, universal classification requirement, yield-driven cadence (3 consecutive genuine-empty -> LIGHT MODE half-breadth discovery; 5 -> one-step interval stretch, max 12h, via cron.update, reversible; any landed action -> instant restore). Failures never drive cadence (only verified-healthy genuine empties count; the IG/Threads wedge streak is DEPENDENCY_FAILURE so it cannot stretch intervals).

**New:** `~/workspace/outreach/automation-health-report.sh` (executable, strictly read-only, always exits 0) — emits Nolan's exact format: per-platform ✓/⚠/⛔ sections, UNFOLLOW, META AI + PING PIPELINE, INTENT LEDGER, SYSTEM. Tested live and accurate.

**Daily schedule created (Nolan-authorized):** id `automation-health-report`, daily 07:30 America/Denver, owner goal:ping-social-outreach-campaign, delivers to main chat. First run 2026-09-17 07:30 MDT.

**Tooling lesson:** editing cron .md files directly does not take effect — cron internal state is authoritative. All bodies were re-applied via cron.update (scheduler_sync: reconciled).

## Interface alignment verified
- pass-classifier.js contains all 10 terminal classes matching the cron bodies' vocabulary (verified by grep + self-test 27/27).
- action-truth.jsonl appeared mid-task; health script reads it defensively and falls back to engagement logs.
- next-run derivation uses cron definition frontmatter, not live scheduler state (script cannot call cron.runs from bash).

## Pre-existing conditions surfaced by implementers (not caused by this program)
- 378 open intents in action-intent-ledger.jsonl with no terminal outcome (oldest 2026-09-14).
- 28 reconcile gaps in LATEST.json (PING pipeline, separate coordinator).
- 11 capture-failed meta-ai artifacts on disk.
- Pig CDP wedge persists for IG/Threads — needs Nolan's manual Chrome close/reopen.

## Needs Nolan's decision (IMPORTANT)
1. **IG_CANARY_POST_URL** — a stable public post for the one-time recovery canary like.
2. **X Tier 2 user IDs** — @karpathy, @lexfridman, @emollick need X user IDs (one-time browser lookup or Nolan confirms the accounts).
3. **IG wedge** — still present; manual close/reopen of the ig-profile Chrome is the only fix path (already surfaced; no new action here).

## AGENTS.md lessons to add (children were barred from editing it)
- The broken strategy A is now recorded as negative knowledge in the capability registry, making fallback machine-enforceable.
- Other drivers need historical baselines recorded in capability-registry.json before adopting the classifier.
- Cron bodies must be edited via cron.update, never by direct file edit.
- checkpoint/identity-verification warnings classify as TEMPORARY_FAILURE; a stricter HUMAN_GATE class is a possible future refinement.
