# Self-improvement records — 24h convergence swarm, 2026-09-25
Format per the sprint directive. One record per actual change made by the coordinator.

## Record 1: false-unreachability claims by lane workers

- OBSERVED FAILURE: 2 of the first 5 completing lanes reported paths as nonexistent/unreachable without genuine verification. Lane 5: `/home/nolan/crx-swarm/crx-runtime-main` "does not exist (verified)". Lane 8B: "Pig repos unreachable from this VM (/home/nolan absent; SSH blocked)".
- ROOT CAUSE: lane briefs gave the access pattern but no retry-before-UNKNOWN discipline; workers attempted once (or with the wrong pattern, e.g. looking for `/home/nolan` on the local VM instead of via SSH) and converted a failed attempt into a finding.
- PROPOSED CHANGE: coordinator verifies the disputed path directly, appends a retraction to the affected lane doc, and broadcasts the working pattern (`~/workspace/pig/pigwsl-run.sh '<read-only cmd>'`, light commands only, retry once) plus the rule "mark UNKNOWN only after a genuine failed retry" to all running lanes.
- AUTHORITY: coordinator (routine; no escalation).
- EXPECTED EFFECT: remaining lanes verify instead of assuming; fewer false UNKNOWNs in lane artifacts.
- TEST: fails-before = 2 false claims in first 5 completions. Passes-after = all 5 subsequent lanes reached the Pig successfully (lane 3: "all Pig commands succeeded on first try"); zero further false-unreachability claims.
- ARTIFACT: retraction appended to `convergence/GITHUB_INGESTION_ADAPTER.md`; correction sends logged to 9 lanes.
- RUNTIME PROOF: direct `ls` of `/home/nolan/crx-swarm/crx-runtime-main` (22 entries); `PIG-SSH-OK` checks at 20:08 and later.
- OUTCOME: better.
- FOLLOW-UP: retain. Future lane briefs carry the retry-before-UNKNOWN rule up front (folded into the Batch 2 protocol propagation).

## Record 2: power-watch baseline (no change, establishing the loop input)

- OBSERVED FAILURE: none. Establishing the Q4 power-watch the coordinator owns.
- ROOT CAUSE: n/a (preventive).
- PROPOSED CHANGE: record AC baseline + recheck at checkpoints in `convergence/POWER_WATCH.md`; on AC loss: record transition, checkpoint work, halt expensive jobs, allow safe sleep, resume on AC.
- AUTHORITY: coordinator per Q4 policy.
- EXPECTED EFFECT: any power transition is caught with a timestamped record instead of inferred after the fact.
- TEST: n/a (watch, not gate).
- ARTIFACT: `convergence/POWER_WATCH.md`.
- RUNTIME PROOF: `(Get-WmiObject BatteryStatus).PowerOnline = True` at 20:01, 20:08, and final recheck.
- OUTCOME: nominal (AC throughout).
- FOLLOW-UP: retain for the sprint duration.
