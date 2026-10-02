# LEARN — outreach-engine round 139 (2026-09-24)

## Observation: probe-before-touch — the local browser lock is not the gate for Pig fb-profile work; fb-worker-probe.sh is

VERIFIED this round: the engine's DM lane needed Pig-side Message-button checks for 3 fresh FB signals (High Desert Haulers / Coyote Rolloff dual-brand promo, Amber's House Cleaning holiday push, High Valley Structures inventory promo; discovery batch 2026-09-24-1921). Before touching the shared fb-profile Chrome, the run checked coordination state: the local lock file `pig-fb/.locks/fb-chrome.holder` showed `run_pass.sh pid=10571 at=2026-09-24T20:16:28Z` (14:16 MDT, ~4 min before this run's check), but pid 10571 was already dead — under the orphan dispatch model the local flock releases when the dispatcher shell exits while the detached Pig worker keeps driving the browser. The local lock alone would have cleared the lane. `fb-worker-probe.sh` returned RC=1 with in-flight PID 3240: an FB engagement worker was actively driving the fb-profile Chrome. The engine stood down: 0 Page checks, 0 DMs this run; all 3 signals stay PENDING-BROWSER.

PATTERN (generalizable, durable rule): on the orphan dispatch model, the flock lock protects only the dispatcher's lifetime, not the worker's. Any lane that drives the shared fb-profile Chrome (DM checks, DM sends, engagement, Meta AI) must run `fb-worker-probe.sh` and treat RC=1 as a hard stop — never rely on the lock file's holder record, which goes stale the moment the dispatcher exits. The probe is the gate; the lock file is advisory.

WHY IT MATTERS: two workers on one headed-Chrome profile wedge, relaunch, or disturb each other's CDP pages (FL-20260921-015/016). A DM check that collides with an in-flight engagement pass risks corrupting the pass's per-action progress file and fsync'd audit trail — silent damage to the heavier, higher-volume lane. The probe check costs ~2s; the collision it prevents costs a pass.

UNCERTAIN: whether the engagement worker's pass completes before the next engine run (~2-3h cadence); the 3 PENDING-BROWSER Page checks roll to the next run with a free browser.

SOURCE EVIDENCE: `~/workspace/pig-fb/fb-worker-probe.sh` (RC=1, PID 3240, 2026-09-24 14:20 MDT); `~/workspace/pig-fb/.locks/fb-chrome.holder` (run_pass.sh pid=10571 at=2026-09-24T20:16:28Z, pid dead at check time); `~/workspace/pig-fb/run_pass.sh` header (orphan model: lock held for dispatch lifetime only; worker protected by probe, not by lock); discovery-2026-09-24-1921.md (3 PENDING-BROWSER signals).

## Provenance

- Raw artifact: this file (learn-round139.md), written by outreach-engine round 139.
- Verification: probe RC=1 output captured 2026-09-24 14:20 MDT; holder file read same minute; holder pid confirmed dead via ps.
- Nothing here is a prospect row; no unverified claims; no contact info invented.
