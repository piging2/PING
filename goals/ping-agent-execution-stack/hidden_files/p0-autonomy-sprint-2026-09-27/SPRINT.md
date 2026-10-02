# P0 AUTONOMY SPRINT 2026-09-27 — coordinator ledger
T+0: 2026-09-27 12:53 MDT. Objective: ONE REAL FYD MISSION AUTONOMOUS END-TO-END.
Mission: "Analyze my website and make emergency services more prominent." First customer: Happy Place FYD site. Coppersmith = generality proof hours 20-22.

## Milestones
- T+1 (~13:53): reached-path archaeology + first actual broken boundary identified
- T+2 (~14:53): one mission persisted with trusted identity + one execution attempt through chosen adapter
- T+3 (~15:53): capability allow AND capability deny proven
- T+4 (~16:53): structured result -> artifact/evidence -> event -> MC projection proven
- H4-8: mission to WAITING_APPROVAL (stopping at boundary = success)
- H8-12: approval, apply exact digest, canonical event, regenerate FYD, refresh, replay, re-run (no duplicates)
- H12-16: break it on the reached path
- H16-20: self-recovery without Nolan
- H20-22: Coppersmith same machinery
- H22-24: clean restart proof

## Known ground truth (from prior work, verify not trust)
- MC server tree (local, UNTRACKED plain dir): ~/workspace/lane-p01/tree/ ; routes /api/mc/dispatch, /api/mc/missions, /api/mc/missions/[id]
- MC core commit 470745bd9e182cc191fcf570ac4842321390c81d on branch mc/sprint-integration-2026-09-27
- Bounded dispatch proven via SpineDryRunObserverAdapter; Hermes-backed dispatch UNPROVEN
- Tenants: happy-place, coppersmith-plumbing. Agents: ollama, identity_1..4 (5..10 denied)
- KNOWN BUG MC-1: nowIso() in mission-id hash -> duplicate missions on retried POST (Python front door dedups correctly; TS route does not)
- publishArtifact tenant bypass FIXED locally (uncommitted, lane-p01 untracked)
- Staged MC->FYD wiring patch (4 files, additive): ~/workspace/goals/ping-agent-execution-stack/hidden_files/mc-fyd-wiring-2026-09-27/
- FYD verified stack: replay worktree ~/workspace/fyd-replay-2026-09-27-r2 at 841825c49fb3c41a36e13b21056793e04105bd0c
- :3200 frozen until 19:00 MDT adjudication. HPP original absolute read-only.
- Pig transport recovered ~12:47 MDT after 3.5h outage; hardening + reconciliation siblings running.

## Evidence lines (PASS/FAIL each; report only these + FIRST BROKEN BOUNDARY + NEXT)
ARCHAEOLOGY / CANONICAL MISSION PATH / FYD OWNER IDENTITY BINDING / MISSION CREATED / RUN CREATED / EXECUTION ATTEMPT DURABLE / CAPABILITY CHECK / AGENT STRUCTURED RESULT / PROPOSAL / TAMPER DETECTION / HUMAN APPROVAL / CANONICAL EVENT / FYD SITE CHANGED / REFRESH PERSISTS / REPLAY RECONSTRUCTS / CONCURRENT RETRY IDEMPOTENT / TENANT ISOLATION / PRIVATE CONTEXT LEAK / MISSION CONTROL SHOWS REAL STATE
