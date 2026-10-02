#!/bin/bash
# Wave H21 full regression sweep (post-H20 mission-dispatch change).
# Read-only on the tree; scratch DB only for the approval suites (sanctioned).
# Log: /tmp/h21_log.txt on the Pig.
LOG=/tmp/h21_log.txt
: > "$LOG"
exec >>"$LOG" 2>&1
cd /home/nolan/worktrees/ping-harvest-12h || exit 99

echo "===== H21 FULL REGRESSION SWEEP ====="
echo "date(utc): $(date -u +%FT%TZ)"
echo "branch: $(git branch --show-current)"
echo "HEAD: $(git rev-parse HEAD)"
echo "status: $(git status --short | head -5)"
echo "node: $(node --version)  python3: $(python3 --version 2>&1)"
echo "--- H20 change under test (HEAD) ---"
git show --stat --oneline HEAD | head -12

sect() { echo ""; echo "----- [$1] $2 -----"; }
rc() { echo "  -> exit=$1"; }

sect 1 "witness fail-closed (python unittest)"
python3 -m unittest tests.test_witness_fail_closed -v
rc $?

sect 2 "negative path verification"
node gateway/verify/negative_path_verification.js
rc $?

sect 3 "social draft projection (23)"
node test/test_social_draft_projection.js
rc $?

sect 4 "social draft review (13)"
node test/test_social_draft_review.js
rc $?

sect 5 "external-agent adapter (42)"
node ping-runtime/external-agent/external_agent_adapter.test.js
rc $?

sect 6a "context compiler"
node ping-runtime/context/context_compiler.test.js
rc $?
sect 6b "context authority filtering"
node ping-runtime/context/context_authority_filtering.test.js
rc $?
sect 6c "context compiler adversarial"
node ping-runtime/context/context_compiler.adversarial.test.js
rc $?
sect 6d "context workorder binding"
node ping-runtime/context/context_workorder_binding.test.js
rc $?

sect 7 "EVAL-001..009 harness"
node evals/constitutional-runtime/eval_harness.js
rc $?

sect 8 "EVAL-010 via exported run()"
node -e "require('./evals/constitutional-runtime/EVAL-010_witness_failure_honesty.js').run().then(function(r){console.log('EVAL-010 summary: pass='+r.pass+' fail='+r.fail);process.exit(r.fail?1:0);}).catch(function(e){console.error('EVAL-010 ERROR',e);process.exit(2);});"
rc $?

sect 9 "H6 knowledge drive"
node /tmp/h6/drive.js
rc $?

sect 10 "H8b failure-honesty gate (true production path)"
node /tmp/h8b_verify.js
rc $?

sect 11a "H10 deterministic ids (lineage)"
python3 /tmp/h10/drive.py lineage
rc $?
sect 11b "H10 deterministic ids (projection)"
python3 /tmp/h10/drive.py projection
rc $?

sect 12 "authority purity"
node tests/certification/authority_purity.test.js
rc $?

sect 13 "lineage validation"
node tests/certification/lineage_validation.test.js
rc $?

sect 14 "approval_effect WITH scratch DB (NODE_PATH pg)"
PING_APPROVAL_PG_URL="postgresql://postgres:postgres@localhost:5432/h13_approvals" NODE_PATH=/tmp/h13/node_modules node ping-runtime/approval/approval_effect.test.js
rc $?

sect 15 "approval_restart_durability WITH scratch DB (NODE_PATH pg)"
PING_APPROVAL_PG_URL="postgresql://postgres:postgres@localhost:5432/h13_approvals" NODE_PATH=/tmp/h13/node_modules node ping-runtime/approval/approval_restart_durability.test.js
rc $?

sect 16 "approval_effect WITHOUT DB (expect clean SKIP)"
env -u PING_APPROVAL_PG_URL -u DATABASE_URL node ping-runtime/approval/approval_effect.test.js
rc $?

sect 17 "approval_restart_durability WITHOUT DB (fail-closed only)"
env -u PING_APPROVAL_PG_URL -u DATABASE_URL node ping-runtime/approval/approval_restart_durability.test.js
rc $?

sect 18 "KNOWN-ENV: gateway/test_replay_observability (expect pre-existing express failure)"
node gateway/test_replay_observability.js
rc $?

sect 19 "TS replay-witness-regeneration via tsc 6.0.3 (compile to /tmp, run compiled)"
if command -v tsc >/dev/null 2>&1; then
  echo "tsc present: $(tsc --version)"
  rm -rf /tmp/h21-ts && mkdir -p /tmp/h21-ts
  tsc tests/certification/replay-witness-regeneration.test.ts --outDir /tmp/h21-ts --module commonjs --target es2020 --esModuleInterop --skipLibCheck --resolveJsonModule
  echo "tsc exit=$?"
  node /tmp/h21-ts/tests/certification/replay-witness-regeneration.test.js
  rc $?
else
  echo "NO TS toolchain (tsc not found) - suite unrunnable, pre-existing"
fi

echo ""
echo "===== MISSION/ORCHESTRATION-ADJACENT SUITES (H20 focus) ====="

sect 20 "mission scheduler time authority (regression scan of H20 file)"
timeout 120 node gateway/test_mission_scheduler_time_authority.js
rc $?

sect 21 "mission runtime time authority"
timeout 120 node gateway/test_mission_runtime_time_authority.js
rc $?

sect 22 "worker time authority"
timeout 120 node gateway/test_worker_time_authority.js
rc $?

sect 23 "mission control time authority"
timeout 120 node gateway/test_mission_control_time_authority.js
rc $?

sect 24 "priority bridge integration"
timeout 120 node gateway/test_priority_bridge_integration.js
rc $?

sect 25 "replay worker wiring"
timeout 120 node gateway/test_replay_worker_wiring.js
rc $?

sect 26 "pipeline bridge"
timeout 120 node gateway/test_pipeline_bridge.js
rc $?

sect 27 "mc event mission bridge"
timeout 120 node gateway/test_mc_event_mission_bridge.js
rc $?

sect 28 "durable mission lifecycle (golden test; expected red on documented pre-P0 defects)"
timeout 120 node gateway/test_durable_mission_lifecycle.js
rc $?

sect 29 "dormant worker gate"
timeout 120 node gateway/test_dormant_worker_gate.js
rc $?

sect 30 "mission trace (KNOWN-ENV: requires express)"
timeout 120 node gateway/test_mission_trace.js
rc $?

sect 31 "commissioning"
timeout 120 node gateway/test_commissioning.js
rc $?

echo ""
echo "===== SWEEP COMPLETE ====="
