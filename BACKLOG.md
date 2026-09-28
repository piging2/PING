# BACKLOG — split index

On 2026-09-21 Nolan split the backlog in two:

- [BACKLOG_PING.md](BACKLOG_PING.md) — FYD Social + PING runtime product work (the FOCUS NOW frontier).
- [BACKLOG_NOLAN.md](BACKLOG_NOLAN.md) — the personal social operation: outreach machine, engagement passes, content, Pig automation.

Rule: evidence over activity. An item is DONE only when a tool result verifies it.
The ping-perfecting-pass may commit either file (local commits, never push). Full history of the pre-split backlog is in git history before this commit.

## Perfecting-pass log (appended; newest last)

### 2026-09-28 ~14:00 MDT — objectgraph-relate-output-dropped + visibility-customize-dangling-import re-measured (both confirmed OPEN)
- **objectgraph-relate-output-dropped** (P3, OPEN, owning lane fyd-build): re-ran the 2026-09-27 inspection on the live lane. `fyd-build/src/fyd/proceduralize/proceduralizer.ts` `project()` (line 372) still takes exactly 4 args `(fields, sourceUrl, nowIso, controllerId)`; no `pairs` param, no links_to emission in the projection path. The RELATE stage remains dead weight: zero production callers of `relate()`; the 2026-09-27 probe (`relate-project-wire.probe.test.ts`) + minimal wiring patch (optional 5th `pairs` param) remain delivered-but-unlanded at `goals/ping-agent-execution-stack/hidden_files/perfecting-pass-2026-09-27/`. Nothing in `git log --since=2026-09-27` touches proceduralizer.ts (HEAD 841825c FYD-026b). Own lane: land the wiring or remove the stage + test. Verified read-only; working tree untouched.
- **visibility-customize-dangling-import** (P1, OPEN): re-verified. `fyd-product-lane/src/fyd/customize/{types.ts:23, apply-layer.ts:31}` and `fyd-product-lane/src/app/api/fyd/customize/route.ts:51` still import `../proceduralize/patch`; the recovery copy `fyd-product-lane/src/fyd/proceduralize/patch.ts` is still untracked (mtime Sep 26 13:04) and not committed. Its sha does not match the proven fyd-build copy, provenance still unverified. Still OPEN until a committed state typechecks. Not committed from here (this pass commits only BACKLOG.md).
