#!/bin/bash
# Phase 20 regression battery (2026-09-19). Product tree never mutated by these runs;
# harnesses that hardcode a foreign tree path run as repointed temp copies in /tmp/p20bat.
set -u
cd /home/nolan/worktrees/constitutional-convergence-authority-law
export PGPASSWORD="$(docker exec w1a-scratch-pg printenv POSTGRES_PASSWORD)"
sed "s|/home/nolan/worktrees/constitutional-convergence/|/home/nolan/worktrees/constitutional-convergence-authority-law/|g" \
  tests/event-sequence-replay/sequence_replay_cert.js > /tmp/p20bat/sequence_replay_cert.js
run() { echo "--- $1 ---" >> /tmp/p20bat-done; node "$2" >> "/tmp/p20bat-$1.log" 2>&1; echo "exit=$? $1" >> /tmp/p20bat-done; }
run p20 tests/event-authority-convergence/phase20_replay_context_pack.js
run w1a /tmp/p20bat/w1a-invariant-harness.js
run invariants tests/event-authority-convergence/convergence_invariants.js
run phase7 tests/event-authority-convergence/producer_migration_phase7.js
run phase9 tests/event-authority-convergence/phase9_model_b_proof.js
run phase12 tests/event-authority-convergence/phase12_collision_duplicate_law.js
run phase13 tests/event-authority-convergence/phase13_fanout_exactly_once.js
run phase14 tests/event-authority-convergence/phase14_ordering.js
run w2 gateway/test_witness_w2_versioning.js
run negpath gateway/test_witness_negpath.js
run eval evals/constitutional-runtime/eval_harness.js
node -e "const m=require('/home/nolan/worktrees/constitutional-convergence-authority-law/evals/constitutional-runtime/EVAL-010_witness_failure_honesty.js'); m.run().then(r=>{console.log('EVAL-010 result: '+JSON.stringify(r)); process.exit(0);}).catch(e=>{console.error(e); process.exit(1);});" >> /tmp/p20bat-eval010.log 2>&1
echo "exit=$? eval010" >> /tmp/p20bat-done
run seqcert /tmp/p20bat/sequence_replay_cert.js
echo "BATTERY DONE" >> /tmp/p20bat-done
