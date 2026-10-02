#!/bin/bash
# Wave H15 full regression sweep. Read-only on the tree; scratch DB only for approval suites.
LOG=/tmp/h15_log.txt
: > "$LOG"
exec >>"$LOG" 2>&1
cd /home/nolan/worktrees/ping-harvest-12h || exit 99

echo "===== H15 FULL REGRESSION SWEEP ====="
echo "date(utc): $(date -u +%FT%TZ)"
echo "branch: $(git branch --show-current)"
echo "HEAD: $(git rev-parse HEAD)"
echo "status: $(git status --short | head -5)"
echo "node: $(node --version)  python3: $(python3 --version 2>&1)"

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

export PING_APPROVAL_PG_URL="postgresql://postgres:postgres@localhost:5432/h13_approvals"
sect 14 "approval_effect WITH scratch DB"
node ping-runtime/approval/approval_effect.test.js
rc $?

sect 15 "approval_restart_durability WITH scratch DB"
node ping-runtime/approval/approval_restart_durability.test.js
rc $?
unset PING_APPROVAL_PG_URL
env -u PING_APPROVAL_PG_URL -u DATABASE_URL bash -c 'true'

sect 16 "approval_effect WITHOUT DB (expect clean SKIP)"
env -u PING_APPROVAL_PG_URL -u DATABASE_URL node ping-runtime/approval/approval_effect.test.js
rc $?

sect 17 "approval_restart_durability WITHOUT DB (fail-closed only)"
env -u PING_APPROVAL_PG_URL -u DATABASE_URL node ping-runtime/approval/approval_restart_durability.test.js
rc $?

sect 18 "KNOWN-ENV: gateway/test_replay_observability (expect pre-existing express failure)"
node gateway/test_replay_observability.js
rc $?

sect 19 "KNOWN-ENV: TS replay-witness-regeneration (expect unrunnable, no TS toolchain)"
if command -v tsc >/dev/null 2>&1; then echo "tsc present"; ls test/replay-witness-regeneration.test.ts 2>/dev/null; else echo "NO TS toolchain (tsc not found) - suite unrunnable, pre-existing"; fi

echo ""
echo "===== SWEEP COMPLETE ====="
