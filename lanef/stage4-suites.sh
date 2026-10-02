#!/bin/bash
# Lane F stage 4: additional executable suites, pinned to candidate a9cad2663
# via the pristine detached worktree /tmp/lanef/candidate-root.
set -u
CROOT=/tmp/lanef/candidate-root
cd "$CROOT"
echo "candidate: $(git rev-parse HEAD)"
export NODE_PATH=/tmp/lanef/snap/node_modules
export PGPASSWORD="$(cat /tmp/lanef/pgpass)"
echo "===== 1. CE-001 completion identity (in-memory mock pool) ====="
node tests/ce001-completion-identity/ce001_completion_identity.js 2>&1 | tail -2
echo "EXIT=${PIPESTATUS[0]}"
echo "===== 2. CE-002 attempt fencing ====="
node tests/ce002-attempt-fencing/ce002_attempt_fencing.js 2>&1 | tail -2
echo "EXIT=${PIPESTATUS[0]}"
echo "===== 3. volatile-metadata dedup (mock commit path) ====="
node tests/event-collision-law/volatile_metadata_dedup.js 2>&1 | tail -3
echo "EXIT=${PIPESTATUS[0]}"
echo "===== 4. UER commit collision cert (scratch PG :15434) ====="
PGHOST=127.0.0.1 PGPORT=15434 PGUSER=postgres node tests/event-collision-law/uer_commit_collision_cert.js > /tmp/lanef/collision.log 2>&1
echo "EXIT=$?"
tail -5 /tmp/lanef/collision.log
echo "===== 5. sequence replay cert (scratch PG :15435) ====="
PGHOST=127.0.0.1 PGPORT=15435 PGADMIN_USER=postgres PGADMIN_PASSWORD="$(cat /tmp/lanef/pgpass)" node tests/event-sequence-replay/sequence_replay_cert.js > /tmp/lanef/replay.log 2>&1
echo "EXIT=$?"
tail -5 /tmp/lanef/replay.log
echo "===== 6. EVAL-006 double completion prevention ====="
node evals/constitutional-runtime/EVAL-006_double_completion_prevention.js 2>&1 | tail -3
echo "EXIT=${PIPESTATUS[0]}"
echo "===== 7. runtime identity FL-004 ====="
node runtime/kernel/test_runtime_identity_fl004_2026-09-20.js 2>&1 | tail -3
echo "EXIT=${PIPESTATUS[0]}"
echo "===== 8. bridge priority-boundary integration ====="
node gateway/test_priority_bridge_integration.js 2>&1 | tail -4
echo "EXIT=${PIPESTATUS[0]}"
echo "STAGE4_DONE"
