# LANE 3 raw evidence pins (read-only clone, 2026-09-28)

Fresh `--depth 1` clones. SHAs match wave-1 pins exactly.

## nerve - https://github.com/ClickHouse/nerve
- HEAD: f9566d0f (2026-09-28 11:21:11 -0400, merge PR #464 actor-username-fallback)
- License: Apache-2.0 (pyproject.toml line 11)
- nerve/db/workflow_runs.py: CAS docstring lines 15-19; transition_workflow_run lines ~160-198
- nerve/workflows/review_loop.py: outbox doctrine lines 14-17; _dispatch_leg lines 797-894; _quiesce lines 895-916; _recover/_recover_one lines 1736-1845+
- nerve/workflows/service.py: startup fail-closed pass lines 131-158 ("interrupted by nerve restart", never re-issued)
- nerve/agent/engine.py: resume_enrolled_sessions lines 1589-1688 (delete-then-drive)

## polyrob - https://github.com/theselfruleorg/polyrob
- HEAD: a869af97 (2026-09-21 22:58:58 +0700, 1.1.0 release commit)
- License: MIT (pyproject.toml line 10, LICENSE)
- agents/task/goals/claim_liveness.py: full file (65 lines, three-valued probe + cost asymmetry docstring)
- agents/task/goals/board.py: requeue_running_on_boot lines 503-565 (exact-claim CAS); claim CAS lines 318-320
- agents/task/goals/dispatcher.py: judge flow lines 1418-1446 (met/unmet/unclear -> verified/unverified)
- agents/task/goals/completion_judge.py: VERDICT_MET/UNMET/UNCLEAR; fails open on unclear
- agents/task/agent/core/background_review.py: lines 110-118 (autonomous unverified excluded from skill distillation)
- agents/task/agent/core/self_wake.py: ReentryBudget class (try_consume atomicity; wall-clock-on-persist rule; 7-day staleness)
- cron/wake_gate.py: baseline-outcome rule in module docstring (skip requires last gated run SUCCEEDED)
