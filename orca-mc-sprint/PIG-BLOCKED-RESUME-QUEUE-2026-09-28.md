# PIG-BLOCKED RESUME QUEUE — FYD PRODUCT LANE (2026-09-28 ~05:55 MDT)

Reobserved by the FYD product lane. The Pig is AWAKE (SSH ok since 03:56 MDT)
but degraded: :3100 dead, journal gateway :18199 dead, all CDP ports down.
The reliability lane owns the Pig incident; this lane did NOT restart, reboot,
kill, or reconfigure anything (read-only probes only).

## Pre-restart state: VERIFIED INTACT (no re-application needed)

- Proposal `p0prop-ac04480a6d1809fd` digest recomputed with the system's own
  canonicalizer (`mc-approval/approval_request.py::proposal_digest`):
  `5c1d873706c14c7c3c7b5ded02bb73924419e4cdf3e17f6dc6bc98795731e7aa` MATCH.
- MC approval record: status APPROVED, decided_at 2026-09-28T02:04:52Z,
  decided_by nolan:owner (`/home/nolan/projects/ping/var/mc-approvals.json`).
- Journal overlay `fyd-ovl-muklxc7l-333f04fa678b` present in
  `/home/nolan/projects/ping/data/fyd-journal/events.jsonl`.
- Projection `/home/nolan/ping/var/fyd-projections/happy-place.json`
  contains "Emergency Services".
- Served BUILD_ID on disk: `DqZQX-gQgkpciv6rpLgG3` (LANDING-3100 build,
  2026-09-27 21:00 MDT). Route is dynamic (reads projection at request
  time), so a restart restores the served proof. No patch re-application.

## :3100 death observation (for the reliability lane)

- 0 next-server processes; no listener on WSL localhost:3100.
- `/home/nolan/3100.log` last write 2026-09-28 05:16 MDT; tail contains
  5x "Killed" lines, then render diagnostics stop.
- dmesg + journalctl since 05:00: NO OOM evidence. Killer unknown
  (manual/scripted kill suspected; NOT the OOM killer).
- Heartbeat saw :3100 WSL-local 200 at 05:11 MDT, so death was ~05:11-05:16.

## Resume steps, in order

### 1. Restart :3100 (reliability lane; safe layer per Nolan's directive)
```
ssh -F ~/.ssh/pig-config pigwsl   # lands in cmd; use the WSL runner:
~/workspace/pig/pigwsl-run.sh '/home/nolan/start-3100.sh'
```
Canonical script ONLY (never pkill; per the 2026-09-26 lane temp-server rule).
Verify: WSL-local `curl -o /dev/null -w %{http_code} http://localhost:3100/` -> 200;
BUILD_ID unchanged (`DqZQX-gQgkpciv6rpLgG3`).

### 2. Served transition re-verification (product lane, post-restart)
- `GET :3100/sites/happy-place` -> 200; H2 "Emergency Services"; approved copy
  "Get in touch with us for urgent repairs at Happy Place Carpentry LLC.
  We're always ready to help, but we can't promise response speed or ranking.";
  featured id `website-business-6fa5ebd99d72c4cb-service-cd28e52699a5`
  rendered first in the Services grid.
- Refresh persistence: re-fetch approval record (APPROVED, stable) and served
  page (content stable across two GETs).
- Replay: re-verify steps 1-6 from live reads (per FYD-GO-EVIDENCE-2026-09-27.md).

### 3. Q-J claims 6-8 browser proof (needs CDP + headed Chrome; currently all down)
Requirements prepared in `Q-J-EVIDENCE-2026-09-27.md` (Browser-required section):
URL `http://<WSL-IP>:3100/sites/happy-place` (re-observe WSL IP; was
172.21.65.209), Pig headed Chrome via CDP :9223, viewports
320/375/390/768/1280/1440. Claims: 6 renders, 7 discoverable, 8 usable.
Needs parent/root browser-task delegation (generic subagents cannot drive it).

### 4. Q-P0-06 live hostile probes (post-:3100)
Replay Falsifier-J's 6 live probes against the restarted :3100: dispatch-route
body tenant-smuggling denied, 401-before-400 ordering, tenant key not
enumerable, MC missions tenant-scoped reads across header/body/query/case/
duplicate/injection. (Local adapter-level tenant threading replayed PASS
2026-09-28; see product-lane report.)

### 5. Q-P0-05 served-surface audit (post-:3100)
Browser payloads, :3100 served logs, Hermes runtime worker-output paths.
(Local redaction hostile replay in progress 2026-09-28; see product-lane report.)

### 6. Journal gateway :18199 (reliability lane)
Down as of ~05:50 MDT (was ok at 05:11). Needed for journal-dependent flows.
Restart owned by the reliability lane.

## Not blocked (completed locally 2026-09-28)

- HOLD / lease-reaper: E3 hostile proofs 8/8 PASS + hold-rendezvous-falsifier
  15/15 PASS, independently replayed from staged bytes
  (`orca-mc-sprint/evidence/e3-hostile-proofs.mjs`,
  `hold-rendezvous-falsifier.mjs`; exit 0 both).
- Q-P0-06 adapter tenant threading: `orca-adapter/test/tenant-threading-selftest.js`
  18/18 PASS; independent hostile probe 20/20 PASS (body/agent-output/Jev
  tenant-switch attempts all denied; fail-closed on mismatch). Probe:
  /tmp/q-p006-tenant-hostile-probe.js. Tenant-ingress identity defect still
  OPEN-but-parked per Nolan's scoping (recorded, not a violation).
- Q-P0-05: INDEPENDENT REPLAY FALSIFIED the N2/N3 "CLAIM HOLDS" verdicts.
  92 hostile probes vs orca-adapter redaction: 86 pass, 6 CONFIRMED LEAKS
  (sub-8-char Bearer/Basic wrong-split; array under secret key; non-string
  values losing key context in redactEnvelopeValue). New backlog row 91 (N4)
  filed in BACKLOG-CEO-MODE.md. DESIGN GAP: workOrder.input persisted
  unredacted to Pig hermes-prompt.txt (redaction is output-only).
  Probe: /tmp/qp005-hostile-probe.js. Served-surface audit (browser payloads,
  :3100 logs, Hermes runtime) remains Pig-blocked.
- Transition base-state digest: MATCH (above).
