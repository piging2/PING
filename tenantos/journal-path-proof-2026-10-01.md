# Journal path divergence — proof (2026-10-01 ~18:03 MDT, read-only)

## VERDICT: MISMATCH REPRODUCED

Refinement of the archaeology: it is not "MC reads a stale copy." There are **three divergent journal files** and **two live gateway instances** serving different stores. Mission Control itself is split across two of them.

## The three journals (all observed live on the Pig via SSH/WSL, read-only)

| # | Path | Size | mtime (MDT) | Served by | Contents |
|---|------|------|-------------|-----------|----------|
| 1 | `/home/nolan/projects/ping/data/fyd-journal/events.jsonl` | 53,173 | 2026-09-28 18:15:39 | gateway PID 850 on **:18199** (cwd `…/ping/tools/fyd-journal-gateway`, self-reports this store; marker `fyd-demo-journal@8d6956c1caca`) | FYD_SITE_OVERLAY etc. |
| 2 | `/home/nolan/projects/ping-fyd-converged/data/fyd-journal/events.jsonl` | 56,151 | 2026-09-30 16:04:10 | gateway PID 40434 on **:18200** (cwd `…/ping-fyd-converged/tools/fyd-journal-gateway`, self-reports this store; marker `fyd-demo-journal@62f825e9dfee`) | forked copy, nothing consumes it |
| 3 | `/home/nolan/workspace/fyd-journal-gateway/events.jsonl` | 143,756 | 2026-09-30 18:02:06 | **no gateway** — file only | MC_APPROVAL_REQUESTED etc. |

## Writer evidence (journal #1 is the gateway's canonical store)

- `server.mjs:76-77`: `FYD_JOURNAL_STORE || join(HERE, "..", "..", "data", "fyd-journal", "events.jsonl")`. No `FYD_JOURNAL_STORE` in PID 850's environ; `start.sh` sets only the write token, never the store path.
- `gateway.log`: five lines of `listening on http://127.0.0.1:18199 store=/home/nolan/projects/ping/data/fyd-journal/events.jsonl`.
- Live `GET http://127.0.0.1:18199/` → `{"ok":true,"service":"fyd-journal-gateway","store":"/home/nolan/projects/ping/data/fyd-journal/events.jsonl",…}`.

## Reader evidence (Mission Control is split)

From the served-MC tree `/home/nolan/projects/ping-fyd-converged`:

- `src/app/api/mc/today/route.ts`: reads overlays **via HTTP** `http://localhost:18199/events/FYD_SITE_OVERLAY?limit=15` → journal #1. **No file path involved.** Its `journal overlays unreadable` DEGRADED = gateway HTTP unreachable at probe time, not a stale file.
- `src/app/api/mc/technology/route.ts:335-336`: stats/reads journal #1's file directly (`projects/ping/data/fyd-journal/events.jsonl`).
- `src/app/api/mc/_lib/mc-dispatch.ts:23`: `JOURNAL_PATH = '/home/nolan/workspace/fyd-journal-gateway/events.jsonl'` — reads (`journalHas`, projection) **and appends** (`appendFileSync`, line 273) → journal #3.
- `src/app/api/mc/approvals/route.ts:63`: same workspace path, passed as `--journal` to emit.py → journal #3.
- `mc-approval/emit.py:50`: defaults to `~/workspace/fyd-journal-gateway/events.jsonl`; its own docstring says MC events should ride "the EXISTING append-only PING journal… no new store, no new event table" → journal #3, contradicting its own docstring.

Consequence: `MC_DISPATCH_*` / `MC_APPROVAL_*` events appended by MC are invisible to the gateway API, to `/api/mc/today`, and to anything querying :18199. Gateway `FYD_SITE_OVERLAY` events are invisible to `mc-dispatch`'s dedupe/projection. Journal #2 (:18200) is consumed by nothing.

## Canonical owner

**Journal #1: `/home/nolan/projects/ping/data/fyd-journal/events.jsonl`, served by the :18199 gateway.** It is the only journal with a serving API, the only one with passing tenant-isolation/hostile probes (39/39), the one `/api/mc/today` and the technology route already read, and the one emit.py's docstring claims to target. Per Nolan's point 10: point Mission Control's dispatch/approvals/emit.py at this owner; do not replicate or synchronize journals; retire the :18200 fork. **ONE JOURNAL. ONE READ PATH.**

## Served-surface note (observed, out of scope but relevant)

At 18:00–18:03 MDT, **:3100 is not listening**. The 17:36 MDT deep-dive verified served MC at :3100 (HTTP 200); that no longer holds. `:3101` is `node dist/server/dev-server.js` with cwd `/home/nolan/workspace/fyd-build` — a dev server, not the ping-fyd-converged MC tree. The MC rebuild decision should re-establish which process serves the converged tree.

## Caveats

- Read-only throughout: no process started/stopped, no file written, no journal replicated.
- The 17:36 MDT `/api/mc/today` DEGRADED was not re-observed (served MC down at probe time); its mechanism per code is gateway HTTP reachability.
- Correction to the archaeology: the "stale copy" framing is superseded by the three-journal finding above.
