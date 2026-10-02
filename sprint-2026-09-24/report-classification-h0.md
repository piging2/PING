# Report Classification: FYD/PING 24h Product Proof Sprint, H0-1 FREEZE REALITY

Scanned 2026-09-24 18:13 MDT. Coverage: `~/workspace/sprint-2026-09-24/` (only CHARTER.md, SCOREBOARD.md present), `~/workspace/fyd-factory/` reports, FYD-relevant `goals/*/hidden_files/`, `FAILURE_LEDGER.md`, `~/memory/2026-09-23.md` + `2026-09-24.md`. Outreach/engagement artifacts ignored as out of sprint scope. No live-browser verification performed; classifications reflect attached evidence + known successor records.

## Classified reports (one line each)

### CURRENT (still true, evidence attached, no successor invalidates)

- `fyd-factory/ask/ASK-EVAL-REPORT.md` (2026-09-23, run 09-24 01:00 UTC) — Concierge answers all 18 battery questions supported-with-citations across 3 sites and throws on ungrounded claims. CURRENT: scope-correct (preview route + concierge only, NOT the live path); no successor report changes its battery verdicts.
- `fyd-factory/tournaments/td-002/td-002-hostile.test.ts` + folded §4 of ASK-EVAL-REPORT (2026-09-23) — 13/13 hostile probes on the LIVE Ask path (answerAskFyd -> legacy composer); verdict VULNERABLE with 1 confirmed street-address leak via oddly-named fields. CURRENT: finding is OPEN, no repair evidence in 48h.
- `~/workspace/FAILURE_LEDGER.md` FL-20260924-201 (2026-09-24 ~06:10 MDT) — Live Ask FYD labels a tangential person object "supported" instead of refusing ("What is the owners favorite food?"). CURRENT: finding OPEN, postdates Ask lane's audit; contradicts the concierge-only "fail-closed decline" claim only on the live path.
- `fyd-factory/qa/hostile/HOSTILE-VERDICT.md` (2026-09-23) — FAIL: 3 confirmed projection-seam bypasses (A35/A36 `javascript:` href from /o object-page capability, 1 more); 43/52 harness SUSPECT flags correctly adjudicated as false positives. CURRENT: no fix evidence in 48h.
- `fyd-factory/pressure/PRESSURE-REPORT.md` (2026-09-23) — Render path mostly FAIL-CLOSED across 12 attack classes; class 7 (null/malformed fields) is CRASH/INVENTED-CLAIM with 6 TypeErrors + `About null` rendered (F-1..F-8). CURRENT: findings documented, repair ownership not shown.
- `fyd-factory/ceiling/ceiling-report.md` (2026-09-24 01:04 UTC) — Identity-swap success test PASSES (byte-identical fingerprint, clean re-bind); one REAL failure: coppersmith `works_for` team member lost at generator boundary (patch proposed, unapplied); ping-fyd TECHNOLOGY treatment is pin-driven, flagged. CURRENT: the loss finding still stands; no application evidence for the patch.
- `fyd-factory/lineage/LINEAGE-REPORT.md` (2026-09-24 ~01:35 UTC) — 7/7 lineage links resolved for one representative claim each on Happy Place + Coppersmith; tracer self-test PASS incl. negative control. CURRENT: coverage is one fact per site by design; no contradiction found.
- `fyd-factory/media/MEDIA-REPORT.md` (2026-09-23 ~20:30 MDT) — 11 authorized demo assets digested/derived into 57 verified variants; cohort media URL-only, zero bytes downloaded. CURRENT: provenance ledger intact, no contrary record.
- `fyd-factory/media/MEDIA-LANE-REPORT.md` (2026-09-23) — Media lane: 14 suites, 149/149 tests green. CURRENT: consistent with MEDIA-REPORT; not superseded (lane report, not replaced).
- `fyd-factory/ask/ASK-VERTICAL-SERVICES.md` (2026-09-24) — Concierge NOT wired into the live path; wired path is answer.ts -> legacy composer; PROVEN-bundle fail-closed contract verified (gateway unreachable -> 503 `projection_unavailable`); base digest pin checks pass for both tenants. CURRENT: corroborated by ASK-EVAL-REPORT §0; no wiring change since.
- `~/memory/2026-09-24.md` ~09:45 MDT (dumper 1.2.1 landed, VERIFIED SUCCESS) — Owner loop closed end-to-end with the LANDED dumper: typed approve "Move HVAC to the top" -> journal event fyd-ovl-mufp4mjn -> regen -> served :3100 showed HVAC first; typed clear -> byte-identical restore (graph/base digests identical). CURRENT: strongest owner-loop proof on record; no successor invalidates it.
- `~/workspace/FAILURE_LEDGER.md` FL-20260921-033 CORRECTION (2026-09-24 ~06:25 MDT) — Sep-21 "mobile overflow" defect CLOSED as harness artifact (headless Chrome enforces 500px min viewport); proof at true 375px CSS width: both sites wrap cleanly, zero page-level overflow; mobile boundary GREEN. CURRENT: correction supersedes all prior 375px screenshots from that lane.
- `~/memory/2026-09-24.md` ~08:30 MDT (idempotency falsification) — Exactly-once is proven ONLY under serialized dispatch: two concurrent processes past check-then-act produced 2 physical effects for 1 logical op; staged rollout now has a hard single-dispatcher/distributed-lock prerequisite. CURRENT: standing constraint, not contradicted by any later evidence.
- ops-watch gateway entries (2026-09-24, all day) — Gateway /health=200 healthy, consecutive-failure counter reset, at every check (09:19, 09:24, 09:29, 09:34, 09:39, 15:09, 15:14, 15:24 MDT). CURRENT: healthy baseline, no incident.

### SUPERSEDED (replaced by a newer verified result)

- `~/memory/2026-09-24.md` ~09:14 MDT (FYD four-frontier merge VERIFIED SUCCESS @ 20390ca0, suites incl. Media 149/149, build 0, browser-verified) — SUPERSEDED as the current HEAD-state claim by the truth fix (09:20), hide-unfeature (09:32), and dumper landing (09:45) fast-forwards; valid only as the state of 20390ca0.
- `~/memory/2026-09-23.md` ~line 842 (W-CORRECT hide_section correction chain proof, 09-23) — SUPERSEDED as the canonical owner-loop proof by the 2026-09-24 dumper-1.2.1 end-to-end (landed dumper, ordered intent + byte-identical revert), which repeats and extends the loop.

### REGRESSED (was true, evidence suggests it no longer holds)

- `~/memory/2026-09-24.md` ~14:22 MDT (:3100 serving pure HEAD e474c89b, /sites/happy-place + /sites/coppersmith 200) — REGRESSED as a live-state claim: the 09:20/09:32/09:45 entries document subsequent standard-script restarts serving frontier-merged builds (truth fix, hide-unfeature, landed dumper). The served build is no longer provably pure HEAD; baseline needs re-freezing before H0 scoring.

### UNKNOWN (claim exists, no verifiable evidence attached)

- `~/memory/2026-09-24.md` ~09:32 MDT (hide-unfeature) — Gap noted: live-browser viewport checks were never done by the worker (no browser seat); a dedicated verification worker was dispatched but NO verification report or evidence appears in any scanned location. Status unknown: viewport check outstanding.

## Counts

| Classification | Count |
|---|---|
| CURRENT | 14 |
| SUPERSEDED | 2 |
| REGRESSED | 1 |
| UNKNOWN | 1 |
| **Total** | **18** |

## 3 most important findings for the sprint baseline

1. **Ask FYD proof must target the LIVE path, not the concierge.** The concierge battery is clean (18/18, fail-closed), but it is unwired. The actual live path (legacy composer) is VULNERABLE in two confirmed ways: TD-002's street-address leak via oddly-named fields (2026-09-23) and FL-20260924-201's tangential "supported" non-refusal (2026-09-24 06:10, still OPEN). Any sprint "Ask works" proof that exercises only the concierge is proving the wrong path.
2. **The owner loop is closed and proven, but idempotency has a hard serial-dispatch bound.** The dumper-1.2.1 proof (2026-09-24 09:45) is the current canonical owner-loop evidence: approve -> journal -> regen -> served -> byte-identical revert. The sprint's required idempotency attack (repeated/concurrent approvals, dropped responses, restarts, one logical effect) must NOT expect concurrent safety: the 2026-09-24 falsification PROVED two physical effects from one logical op under concurrency; exactly-once holds only under serialized dispatch or a real distributed per-op lock.
3. **The :3100 live-state baseline has drifted and the hide-unfeature viewport check is missing.** The "pure HEAD served" claim from 14:22 MDT no longer holds after sanctioned restarts served frontier merges (REGRESSED), so H0 scoring must re-freeze what :3100 is actually running before trusting any serve-side evidence. Separately, the hide-unfeature lane's live-browser viewport verification was dispatched but never reported (UNKNOWN); the mobile boundary itself is GREEN per the corrected true-375px proof, but that specific fix's viewport evidence is outstanding.
