# MC->FYD wiring patch: local mock-based verification (2026-09-27 ~12:05 MDT)

Subagent: backlog-burn (parent: main agent). Pig transport down
(TAILSCALE_UNREACHABLE/PROXY_FAILED since ~11:11 MDT), so this is
LOCAL-ONLY verification of the STAGED patch. Nothing was applied to any
tree, served, or deployed. The :3200 freeze and the HPP-original
prohibition were respected throughout.

## Subject (byte-identical copies)

Staged patch dir:
`~/workspace/goals/ping-agent-execution-stack/hidden_files/mc-fyd-wiring-2026-09-27/patch/`

- `src/app/sites/_shared/mc-api.ts` — sha256
  `190615058a9c096bf12731f2be312e4168d9ec8c2233a4a0a2ce5238ec9520b1`
- `src/app/sites/_shared/tenant-mission-control.tsx` — sha256
  `7a037e7fefa128301e85beae85def6b04fe8fc7a934a4c607b26ff141581a940`
- `src/app/sites/happy-place/mission-control/page.tsx` (SITE_ID happy-place)
- `src/app/sites/coppersmith-plumbing/mission-control/page.tsx`
  (SITE_ID coppersmith-plumbing)

Copies under `mc-wiring-verify-2026-09-27/src/` verified byte-identical
(`diff -r` clean) before testing. The staged originals were NOT modified.

## Harness

- jest + ts-jest + react 18.3.1 + react-dom/server borrowed from the
  fyd-build tree's node_modules (NODE_PATH; nothing installed).
- `tests/mc-api.test.ts` — 27 tests, fetch fully mocked.
- `tests/tenant-mission-control.test.tsx` — 12 tests, SSR
  (renderToStaticMarkup; effects do not run, so this covers the
  pre-catalog initial render + static source pins).
- Config: `mc-wiring-verify-2026-09-27/jest.config.cjs`.

## Verdict: 39/39 PASS (jest) + 19/19 interaction assertions PASS (plain-node DOM driver)

The post-catalog interaction flows needed effects (SSR cannot run them) and
jsdom 30 cannot load inside this box's jest CJS registry (ESM-only
@exodus/bytes dep), so they run as a plain-node driver
(`mc-interact-driver.cjs`) against the same byte-identical staged sources
compiled with tsc to /tmp/mc-interact-build. Driver run:
`cd mc-wiring-verify-2026-09-27 && NODE_PATH=~/workspace/fyd-build/node_modules node mc-interact-driver.cjs`
→ **ALL INTERACTION FLOWS PASS (19/19)**:

- catalog-driven agent/capability selects render post-load; ollama defaulted
  when present; capability options follow the selected agent; prompt bounded
  by catalog prompt_max ("2000 chars" shown);
- missions list filtered client-side to the page's fixed tenant
  (m-hp-1 shown, m-cs-1 hidden on the happy-place page);
- no tenant form control anywhere in the live DOM;
- 403 dispatch renders "DENIED (not failed)" + the deny reason, never as
  failed; exactly one POST issued; body tenant = page fixed tenant; prompt
  passed through;
- UNKNOWN dispatch renders "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS";
  POST tenant bound to the coppersmith-plumbing page;
- catalog failure renders "dispatch catalog unavailable" with no form at all.

The interaction coverage gap is now CLOSED. Remaining coverage is honest
live-Pig surface only (real catalog + missions fetch, served-byte page
render), queued on transport recovery.

### mc-api.ts (27/27)

- `mcApiBase`: explicit override > NEXT_PUBLIC_MC_API_BASE > same-origin
  ""; trailing slashes stripped (no double-slash URLs).
- `MC_TERMINAL` is exactly {SUCCEEDED, FAILED, UNKNOWN, DENIED};
  UNKNOWN is terminal (polling must stop on it).
- `fetchMcCatalog` throws on `!ok`; `fetchMcMissions` defaults missing
  missions to []; `fetchMcMission` returns null (not throw) when absent
  and URL-encodes the mission id.
- `postMcDispatch` mapping (the safety-critical surface):
  - HTTP 403 -> {ok:false, status:"DENIED"} with mission_id + reason
  - 200 + j.status DENIED -> DENIED
  - ok + SUCCEEDED/FAILED/UNKNOWN -> ok:true with that status;
    **UNKNOWN is returned as UNKNOWN, never collapsed to FAILED/REJECTED**
  - transport throw -> REJECTED http:0; unrecognized shape -> REJECTED
    (never silently ok); ok:true with unknown status string -> REJECTED
- POST body pinned to exactly {prompt, agent, capability, tenant};
  tenant flows through caller-bound (happy-place and coppersmith-plumbing
  both verified); **no idempotency key present** (matches the no-blind-retry
  design); method POST, content-type application/json.

### tenant-mission-control.tsx (12/12)

- Happy Place page renders `tenant: happy-place` badge + tenant-bound copy;
  Coppersmith page renders `tenant: coppersmith-plumbing`; the two pages
  never cross-contaminate; metadata titles are tenant-correct.
- Fail-closed initial state: "Loading dispatch catalog..." with NO dispatch
  form controls (no select/textarea/Dispatch button; only the read-only
  missions Refresh button). No tenant form control (`name="tenant"`,
  `id="tenant"`) anywhere in the initial DOM. Zero hardcoded `<option>`
  elements: agent/capability choices are catalog-driven.
- Mandated copy pinned in code (comment-stripped source): the exact string
  "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS" appears at exactly the 3
  render sites (dispatch message, mission list row, mission detail header);
  "DENIED (not failed)" present; exactly one dispatch trigger
  (`onClick={doDispatch}`); no retry control or idempotency helper in code.

## Finding (minor, UX-only): stale-closure in the detail polling effect

`tenant-mission-control.tsx`, the `useEffect(..., [selectedId])` that polls
the selected mission:

```js
loadDetail(selectedId);
const d = detail;                       // stale: from the render that changed selectedId
if (d && MC_TERMINAL.has(d.status)) return;
const t = setInterval(() => loadDetail(selectedId), 5000);
```

`detail` is captured but excluded from deps (eslint-disabled), so `d` is the
PREVIOUS mission's detail:

1. Selecting a running mission right after viewing a TERMINAL mission:
   `d` is terminal -> early return -> **no polling interval is ever created
   for the new running mission** (live-update silently dead).
2. Selecting a terminal mission right after a running one: `d` is
   non-terminal -> interval created -> **polls the terminal mission every 5s
   indefinitely** (wasteful; display stays correct).

No safety impact (no wrong status shown, no extra POSTs; the interval only
re-GETs). Suggested fix for the wiring lane: move the terminal check inside
the interval callback (or include `detail` in deps with a ref guard).
**The staged patch was NOT edited** — it awaits Nolan's guidance; this is
flagged for the wiring lane owner.

## Coverage gaps (honest)

- Post-catalog interaction states (form render after catalog fetch,
  DENIED/UNKNOWN message display after a real dispatch click) need effects
  + DOM: queued for a jsdom pass or a Pig-side browser pass. The
  response-mapping logic beneath them is fully covered above.
- Live `GET /api/mc/dispatch` catalog byte-verification still needs the Pig
  (queued on transport recovery per the seam plan).

## Boundaries held

No pushes, no merges, no serve, no deploy, no :3100/:3200 contact, no HPP
original contact, no credentials, no broad process kills. Test scratch lives
in `mc-wiring-verify-2026-09-27/` (copies + tests + config only).

## Polling stale-closure fix: corrected variant (2026-09-27 ~12:25 MDT)

The finding above was verified as a REAL bug, not a hypothesis, by a
targeted timer test (driver flow 5: select terminal mission -> 6s silence
check -> select running mission -> 6s poll check -> re-select terminal ->
6s silence check; detail GETs counted at the fetch mock).

Against the STAGED (original) build: 3 FAILURES, all three predicted
failure modes —
- terminal selected first: polled anyway (1 fetch -> 2 after 6s);
- running selected after terminal: NEVER polled (3 -> 3 after 6s);
- terminal re-selected after running: polled forever (4 -> 5 after 6s).

Corrected variant at
`mc-wiring-verify-2026-09-27/src-fixed/app/sites/_shared/tenant-mission-control.tsx`
(minimal diff: the polling useEffect now derives the interval decision from
the FETCHED mission per tick — `const m = await fetchMcMission(mcApiBase(),
selectedId)` — with a cancelled flag and cleanup; `detail` stays out of
deps; selecting another mission resets via selectedId):

- jest 39/39 PASS against the variant (tests-fixed/, import paths repointed
  to ../src-fixed/).
- Driver 24/24 PASS against the variant (flows 1-4 unchanged + flow 5 all
  five assertions green).

The STAGED ORIGINALS were not modified. The variant + diff are offered to
the wiring lane / Nolan as a drop-in correction; applying it to the staged
patch is a lane decision, not taken here.
