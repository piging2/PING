# Substrate Gap 5 — typed probe health states + stale demo-journal handling — implementation ledger

Date: 2026-09-27 ~12:05 MDT. Agent: backlog-burn implementation subagent.
Task source: `substrate-recon-2026-09-27.md` Gap 5 (lines 148-176).

## 1. Worktree and branch (no shared-checkout disturbance)

- Base verified first: `af001e3168b9e5fc347976f2ee2da4479e6d170b` exists on local branch `lane-f-probe-staleness-fix`.
- Dedicated worktree: `~/workspace/.worktrees/substrate-gap5`, HEAD at af001e3.
- Local branch: `substrate/gap5-probe-health`. Commit `49febc1` ("gap5: typed probe health envelopes + demo-half retarget to live JSONL gateway"), explicit pathspec (`git add fyd-lane/lane-f-probe.py`), 1 file changed, 398 insertions, 51 deletions.
- NOT pushed; no main/master commits; shared checkout untouched (never switched its branch). HPP original never touched. No Pig writes, no :3100/:3200 contact, no broad process kills, no credentials read or printed (probe's DB password stays executor-local; `scrub()` redacts it from error details).

## 2. Delta vs af001e3 (all in `fyd-lane/lane-f-probe.py`)

(a) Demo half retargeted. The demo journal now reads BOTH live stores and merges them exactly like `dump.py::query_overlays_demo` (dedupe by event_id, sort by (timestamp, event_id), fail closed on divergent duplicates): the JSONL journal gateway (`FYD_JOURNAL_GATEWAY_URL`, default `http://127.0.0.1:18199`; paginated `/events/FYD_SITE_OVERLAY`, siteId filter, validated shape) plus the demo Postgres (host `FYD_DEMO_PG_*`, defaults `127.0.0.1:55433 / postgres / ping-fyd-demo`, node + pg module as before). The dead `ping-test-pg` container is no longer assumed running: `docker_container_state()` observes the container authority first (running / down / absent / unknown). Both QJS queries now select `payload AS event_data` so the merge can detect divergent duplicates (old selects were event_id+timestamp only).

(b) Health envelopes everywhere. Every journal half emits `{"label","state","reason","checked_at","events"}`; state in {HEALTHY, UNHEALTHY, UNKNOWN}; reason null when HEALTHY, otherwise one of the typed UNKNOWN-state reasons (DNS_FAILED, PROBE_TIMEOUT, SERVICE_UNREACHABLE, CONTAINER_DOWN, AUTH_FAILED, PROBE_TRANSPORT_FAILED, PROXY_FAILED, TAILNET_UNREACHABLE, SSH_FAILED, HOST_UNREACHABLE, WSL_UNREACHABLE) plus one documented probe-local extension, JOURNAL_DIVERGENCE, for the merge fail-closed case. The banned output is structurally impossible: an unreachable journal can never emit a bare `[]` -- the empty list only ever appears inside a UNHEALTHY/UNKNOWN envelope. The demo half fails closed on a partial read (inherits the failing store's state/reason; UNHEALTHY beats UNKNOWN) and keeps both per-store envelopes under `"stores"`. Exit 0 with envelopes; exit 2 only on merge divergence. Consumers must read the envelope, not the event list.

(c) September staleness fixes preserved (verified by grep post-write): `resolve_node()` with `/usr/local/bin/node` fallback still used for the host node path; main QJS still uses `/app/gateway/node_modules/pg`; demo QJS still uses `/home/nolan/ping/gateway/node_modules/pg`; env names are `POSTGRES_*` only (no PH/PP/PU/PW/PD).

(d) Test hooks are env-only (`FYD_PROBE_DOCKER`, `FYD_PROBE_MAIN_CONTAINER`, `FYD_PROBE_DEMO_CONTAINER`, `FYD_JOURNAL_GATEWAY_URL`, `FYD_DEMO_PG_*`, `FYD_DEMO_PG_PASSWORD`), so the Pig run needs no code change.

## 3. Local proof (Pig transport down; live-Pig run queued)

Proved on this machine 2026-09-27 18:03-18:04 UTC via `/tmp/gap5-sim/run_sims.py` (ephemeral scratch: fake-docker stub + scratch JSONL gateway on ephemeral ports; real :3100/:3200 never touched). ALL 21 checks PASS:

| Simulated state | Observed (honest numbers) |
|---|---|
| No docker CLI, gateway closed (local reality) | main=UNKNOWN/PROBE_TRANSPORT_FAILED, demo=UNKNOWN/PROBE_TRANSPORT_FAILED, rc=0, every envelope has checked_at |
| Down container (stub: inspect "false exited"), gateway closed -- THE FALSIFICATION | main=UNHEALTHY/CONTAINER_DOWN, demo=UNHEALTHY/CONTAINER_DOWN, events=[] inside the envelope, NOT a bare [] |
| Absent container (stub: "No such container") | main=UNHEALTHY/CONTAINER_DOWN, demo=UNHEALTHY/CONTAINER_DOWN |
| ping-gateway running, stub exec prints 2 events, demo PG down | main=HEALTHY with events=[ov-main-1, ov-main-2] inside the envelope; demo=UNHEALTHY/CONTAINER_DOWN (fail closed) |
| ping-gateway running, node CONNECT refused | main=UNHEALTHY/SERVICE_UNREACHABLE |
| Healthy scratch JSONL gateway (2 events), demo PG down | demo=UNHEALTHY/CONTAINER_DOWN (no partial merge); demo-jsonl sub-envelope=HEALTHY with events=[ov-jsonl-1, ov-jsonl-2] inside the envelope; demo-pg sub-envelope=UNHEALTHY/CONTAINER_DOWN |
| JSONL gateway 200 with malformed shape | demo-jsonl=UNHEALTHY/SERVICE_UNREACHABLE |
| Injected gaierror through the probe's own fetch path | UNKNOWN/DNS_FAILED |
| Injected connection-refused through the probe's own fetch path | UNKNOWN/PROBE_TRANSPORT_FAILED |
| Injected socket timeout through the probe's own fetch path | UNKNOWN/PROBE_TRANSPORT_FAILED |
| Divergent duplicate across the two stores (unit) | demo=UNHEALTHY/JOURNAL_DIVERGENCE, rc=2 (fail closed; no guess at authority) |
| Agreeing duplicate across stores (unit) | merged once, sorted; password redaction verified (`s3cret` -> `[redacted]`) |

py_compile clean. No existing runnable probe tests existed (`probe.local.test.ts` is an unrelated, measurement-only TS extraction probe); the September fixes were re-verified by grep instead.

## 4. Live-Pig proof -- QUEUED-ON-TRANSPORT

The end-to-end Pig run (probe transfer + run from branch `substrate/gap5-probe-health` / commit 49febc1, against the real ping-gateway container, the dead ping-test-pg, and the live :18199 JSONL gateway) is queued on the Pig transport recovery: the egress-proxy route is down (Broken pipe / Connection closed by UNKNOWN port 65535, same signature as the 2026-09-27 incident), so nothing Pig-side was executed. When the route recovers: run the probe via the documented Pig route; expect main=HEALTHY (or CONTAINER_DOWN if ping-gateway is down), demo-jsonl=HEALTHY if the :18199 gateway serves happy-place events, demo-pg=UNHEALTHY/CONTAINER_DOWN (ping-test-pg Exited 255). The Pig /tmp hygiene item (2 query scripts in the ping-gateway container) from the staleness ledger remains unperformed and is still queued with it.

## Verdict

**GAP5-IMPL VERIFIED** (locally). All falsification cases pass: a down/absent container yields UNHEALTHY/CONTAINER_DOWN inside a timestamped envelope, never a bare empty list; an unreachable gateway yields UNKNOWN with a typed reason; a healthy gateway yields HEALTHY with the event list inside the envelope; the demo half reads and merges both live stores with fail-closed semantics. Live-Pig runtime proof recorded as QUEUED-ON-TRANSPORT (no claim made about the Pig's current state). Commit 49febc1, local branch substrate/gap5-probe-health, unpushed.
