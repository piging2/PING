# LANE 6 — Wave Re-verification against LIVE state
**Date:** Fri 2026-09-25 ~06:35–07:05 MDT
**Worker:** Lane 6 (subagent, depth 2)
**Method:** Reran each item's repo test/synthetic on the Pig via `ssh -F ~/.ssh/pig-config pigwsl` → `wsl -e` (nolan/Ubuntu). Did NOT reuse prior claims as evidence.
**Repo:** /home/nolan/projects/ping @ branch `fyd/sprint-integration-2026-09-24`, HEAD `28e4ba00` (2026-09-25 05:45:16 -0600). Working tree clean except untracked `.next.integration-build-20260924/`, `.next.pre-purehead-20260924/`, `tools/fyd-site-projection/__pycache__/`.
**Note on jest:** bare `npx jest` cannot run the TS suites (no babel TS preset configured at root). The wave used ts-jest via ad-hoc configs in /tmp (e.g. `/tmp/qp002.jest.config.cjs`); all suite reruns below used that config.

---

## PART A — LIVE-STATE RE-OBSERVATION (Nolan's refined order: reality first)

| Observable | Live value (re-observed) |
|---|---|
| Pig uptime | 2 days 19:31 — machine did **NOT** reboot overnight; the "down most of the night" was network/SSH-level, not a reboot |
| Integration branch tip | `28e4ba00` Merge workerE/intent-move-first (Q-J-07), 2026-09-25 05:45:16 -0600 — matches wave claim |
| :3100 | pid 10404, cwd `/home/nolan/projects/ping`, started Thu Sep 24 18:59:56, `.next/BUILD_ID` = `DzgiCMfZMcbU_YLytD277` (built **2026-09-24 19:24** — STALE, predates all 2026-09-25 commits). Health 200 on 127.0.0.1 AND on 100.79.154.43 (Nolan's Tailscale browser endpoint works) |
| :3101 | pid 62734, cwd `/home/nolan/build-edge-port`, started Fri Sep 25 05:40:15, `.next/BUILD_ID` = `gYd8c8bgtKEjKT3jNjfsb` — matches Q-F-06 evidence. **Pig-localhost-only confirmed** (100.79.154.43:3101 → connection refused) |
| :3102 | pid 29835, cwd `/home/nolan/build-edge-port`, started Thu Sep 24 20:02:35. Health 200 |
| Edge worktree | /home/nolan/build-edge-port @ detached `8faf96d0` (2026-09-25 05:33:29) — matches Lane 1 (5 commits ahead of 28e4ba00) |
| Journal gateway :18199 | pid 52289 (since Thu 14:47, untouched). `GET /` → `{"ok":true,"service":"fyd-journal-gateway","store":"/home/nolan/projects/ping/data/fyd-journal/events.jsonl","journal":"fyd-demo-journal@8d6956c1caca"}`. `/health` → `{"error":"not found"}` (no /health route; GET / is the identity endpoint) |
| Journal identity marker (live) | `fyd-demo-journal@8d6956c1caca` — matches Q-P0-04 evidence |
| Overlay marker rule | name-match + suffix-vary (`fyd-demo-journal@<live-derived>`); `FYD_EXPECTED_OVERLAY_JOURNAL` NOT set in :3100 env (only `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`) |
| Journal events | 44 at session start → 48 after lane-6 owner-loop test (4 appended: approve, clear, approve, clear — all lane-6) |
| Canonical routes (observed) | `/`, `/sites/coppersmith-plumbing`, `/sites/happy-place`, `/build/[siteId]`, `/api/fyd/ask` (POST), `/api/fyd/customize` (parse/approve/clear + `?view=inspect`), `/api/fyd/objects/...`, `/mission-control`, `/objects`, `/api/readyz` |
| :8080 (main gateway) | Responds `Cannot GET /` on `/`, **503 on `/health`** — dump.py default (`FYD_OVERLAY_JOURNAL=main`) fails closed against it (see Q-P0-04) |
| Qdrant :6333 / Postgres :5432 | Listening (via wslrelay). Bespoke hostile matrices not re-run (see Q-P0-06) |

**Key reality-check finding:** :3100 serves a build from **Sep 24 19:24**, predating every 2026-09-25 commit (Q-J-07 `2aa7b1d2`, tenant seam `8fa21a68`, Q-F-06 `0ab90d96`, edge merge `266132f8`). Any wave claim about *live :3100 behavior* for today's fixes is suspect until :3100 is rebuilt+restarted (restart UNSANCTIONED for this lane — flagged, not done).

---

## PART B — PER-ITEM VERDICTS

### Q-P0-04 (wrong-journal safety) — RE-VERIFIED (cheap path)
- `python3 tools/fyd-site-projection/test_dump.py` → **pass: 7, fail: 0** (matches "7/7").
- Live spot check: `dump._preflight_journal` against a stub asserting `some-other-journal@deadbeef1234` → stderr `WRONG_JOURNAL: expected overlay journal marker ...`, `SystemExit code 2`. Against unreachable host → exit 2. Zero writes (no POST attempted; preflight is pre-write).
- Incidentally observed live: `dump.py coppersmith-plumbing` (default main mode) → `WRONG_JOURNAL: journal identity unreadable at http://127.0.0.1:8080/health: HTTP Error 503` — typed fail-closed, zero writes.
- The full 14-mode (7×2) attack matrix was NOT re-run (Nolan: backend proofs only if cheap).

### Q-P0-06 (tenant isolation) — PARTIALLY RE-VERIFIED
- `npx jest --config /tmp/qp002.jest.config.cjs src/fyd/tenant` → **6 suites, 39 tests, all pass**.
- `ask-privacy-probe.test.ts` passes inside the ask suite (see Q-F-06).
- Note: `node_modules` IS present in /home/nolan/projects/ping now (the wave's "removed mid-session" condition no longer holds; jest suites are runnable).
- NOT re-run: bespoke live hostile matrices (vector 13/13 vs Qdrant :6333, postgres 17/17 vs crx_runtime, journal-seam 13/13 on test-port gateway). Reason: bespoke scripts not found as durable artifacts; per Nolan's order, backend live matrices are after product P0.

### Q-F-01 (SSRF boundary) — PARTIALLY RE-VERIFIED
- `npx jest --config /tmp/qp002.jest.config.cjs src/fyd/net` → **3 suites, 35 tests, all pass** (covers `safe-fetch.test.ts` unit corpus + budgets + rate-limit).
- NOT re-run: the bespoke 24/24 hostile suite "through the REAL served-tree module with real DNS and real network" (script not found as a durable artifact).

### Q-F-06 (ask support classification) — RE-VERIFIED
- `npx jest --config /tmp/qp002.jest.config.cjs src/fyd/ask src/app/api/fyd/ask src/fyd/tenant/__tests__/c-ask.test.ts` → **14 suites, 202 tests, all pass**. Includes `lane-e-battery.test.ts` (tangential-people regression: `peopleVocabulary`/`PEOPLE_TRIGGER` guard) and `ask-fyd.test.ts`.
- Fix commit `0ab90d96` ("people branch skips ungrounded tangential topics") confirmed present in integration branch.
- Live :3100 (`POST /api/fyd/ask`, `siteId: happy-place`): "What is the owner's favorite food?" → `answerClass: unknown`, `unknowns: ['people associated with this business']`, **0 citations**. Invariant holds: tangential never labeled supported. (happy-place has no person records, so the legitimate-people half could not be demonstrated live on :3100.)
- Checkout note (per coordinator): suites ran from `/home/nolan/projects/ping @ 28e4ba00`; :3101 serves `/home/nolan/build-edge-port @ detached 8faf96d0` (5 ahead). The wave's "198/198" vs my "202" is a file-set scoping difference, not a regression.

### Q-F-07 (null/malformed field handling) — RE-VERIFIED (repo level)
- `npx jest --config /tmp/qp002.jest.config.cjs src/fyd/sitespec` → **10 suites, 100 tests, all pass** (matches "sitespec 100/100"). Includes `field-visibility.test.ts` with the 2 `valueLooksLikeAddress` non-string regression tests (the real crash found+fixed by the wave).
- Fix verified in source: `valueLooksLikeAddress` returns false for non-text.
- NOT re-run: bespoke 10/10 poison suite via `renderToStaticMarkup` (test file not found as a durable artifact; only jest transform-cache remnants in /tmp).

### ORCA SIGKILL / UNKNOWN-HOLD — UNKNOWN (with contradiction noted)
- `~/workspace/sprint-2026-09-24/orca-terminal-verdict.md` describes the SIGKILL witnessed-restart proof as a **proposed, NOT-applied** acceptance test: "This needs Nolan's word: it changes retry behavior… (evidence runs from 2026-09-24T01-59Z exist in the worktree)". No runnable test script for it was located (`/home/nolan/worktrees/orca-autonomy`, `/home/nolan/ping-orca-safety` searched). **Cannot rerun a test that was never implemented.** The wave's green claim for this item is not reproducible from artifacts.

### Owner loop machinery ("Move emergency plumbing first") — RE-VERIFIED, WITH CONTRADICTIONS
Machinery-level rerun on live :3100 + journal + dump (site `coppersmith-plumbing`):
1. **Parse:** `POST /api/fyd/customize {action:parse, text:"move emergency plumbing to the top"}` → `ok:true`, `intent.kind=promote_first`, `target=emergency plumbing`, proposal `home:Services:2` with `presentation.objectOrder=[Plumbing, Ventilation, Heating & Cooling, HVAC]`. **BUT** the exact task phrase `"Move emergency plumbing first"` → `ok:false, code:unsupported` on live :3100 — the Q-J-07 NL pattern (`/\bmove\b\s+(.+?)\s+\bfirst\b/`, commit `2aa7b1d2`) is in source and covered by `intent.test.ts` (customize suite 95/95 green, see below), but **live :3100's build predates it** (see Part A). WorkerE's 05:42 success with the exact phrase must have run against a non-:3100 server.
2. **Approve:** `ok:true`, `intentId=pi-9f644e1053c3ec9b` (deterministic: `pi-` + sha256(siteId|proposalDigest)[0:16]), `eventId=fyd-ovl-mugyb574-9d1e075926e7`, `idempotentReplay:false` — journaled to the live demo journal.
3. **Visible server-side reorder:** after `FYD_OVERLAY_JOURNAL=demo python3 tools/fyd-site-projection/dump.py coppersmith-plumbing`, `GET /sites/coppersmith-plumbing` embedded order = **[Plumbing, Ventilation, Heating & Cooling, HVAC]** — Plumbing first, confirmed server-side.
4. **Clear:** `ok:true`; journal shows `clear_presentation_intent` event.
5. **Restoration:** after clear + dump, page order = **[Ventilation, Plumbing, Heating & Cooling, HVAC]**, and `?view=inspect` `specDigest` = `c0a397ab86d8841e` — **identical to the pre-test baseline specDigest**. Effective state restored.
- Source level: `npx jest ... src/fyd/customize` → **5 suites, 95 tests pass** (matches "customize 95/95"), including the Q-J-07 exact-phrase regression (`intent.test.ts:110`).
- **Pre-existing state found:** journal already contained Sep-24 directives `pi-9f644e1053c3ec9b` (Plumbing-first, 14:22) and `pi-2e120da637f2d826` (baseline-order, 15:36). My test's deterministic intentId collided with the Sep-24 leftover; my clear neutralized both. Effective order was and is baseline; specDigest identical. Flagging so the parent knows the journal was not pristine.
- **Operational note:** `dump.py` MUST be run with `FYD_OVERLAY_JOURNAL=demo` (the customize approve route journals to :18199); the default `main` mode fails closed against :8080 (`/health` → 503).

---

## PART C — WHAT WAS NOT DONE (per constraints / Nolan's order)
- No restarts of :3100/:3101/:3102/:18199 (hard constraint; :3100 stale-build rebuild is flagged as needed but UNSANCTIONED for this lane).
- No :18199 gateway restart (queued but unsanctioned — untouched; pid 52289).
- No credential rotation/purge; no `pkill`; no Pig reboot.
- Bespoke live hostile matrices (Q-P0-06 vector/postgres/journal-seam, Q-F-01 24/24 SSRF, Q-F-07 10/10 poison) not re-run: scripts not durable + Nolan's "only if cheap" order.
- One Pig SSH drop mid-run (~06:47 MDT); reconnected after ~10s. All commands after that re-verified clean.

## Commands run (summary)
- `git -C /home/nolan/projects/ping rev-parse --abbrev-ref HEAD; git log --oneline -5; git status --porcelain`
- `git -C /home/nolan/build-edge-port rev-parse HEAD; git status --porcelain`
- `cat /home/nolan/{projects/ping,build-edge-port}/.next/BUILD_ID`
- `ps -eo pid,lstart,cmd | grep -E "next-server|next start"`; `readlink /proc/<pid>/cwd`
- `curl` health checks on :3100/:3101/:3102 (127.0.0.1 and 100.79.154.43), `GET /` on :18199
- `npx jest --config /tmp/qp002.jest.config.cjs <scope>` for src/fyd/ask (+api/ask, c-ask), src/fyd/sitespec, src/fyd/net, src/fyd/tenant, src/fyd/customize
- `python3 tools/fyd-site-projection/test_dump.py`
- Python stub test of `dump._preflight_journal` (wrong marker + unreachable)
- `POST /api/fyd/ask` (happy-place, 2 questions), `POST /api/fyd/customize` (parse/approve/clear), `GET /api/fyd/customize?view=inspect`
- `FYD_OVERLAY_JOURNAL=demo python3 tools/fyd-site-projection/dump.py coppersmith-plumbing` (×3)
- Page fetches + order extraction via embedded `presentation.objectOrder`
