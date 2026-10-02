#!/usr/bin/env bash
# SWARM-20 gauntlet attack-matrix runner. Each attack gets a fresh tenant so
# objective identity never collides. Records exit codes + key evidence files
# into evidence/<run>/ and a machine-readable summary.
set -u
G="$(cd "$(dirname "$0")" && pwd)"
EV="$G/evidence"
SUM="$EV/attack-matrix-summary.jsonl"
: > "$SUM"

run_attack() {
  # $1=name $2=expected_exit $3+= env assignments
  local name="$1" expected="$2"; shift 2
  local dir="$EV/attack-$name"
  rm -rf "$dir"
  echo "=== attack $name (expect exit $expected) ==="
  ( cd "$G" && env GAUNTLET_EVIDENCE_DIR="$dir" "GAUNTLET_RUN_ID=gauntlet-attack-$name" "GAUNTLET_TENANT=gauntlet-tenant-$name" "$@" node mission.js >"$dir.stdout.log" 2>"$dir.stderr.log" )
  local rc=$?
  local verdict="FAIL"; [ "$rc" = "$expected" ] && verdict="PASS"
  echo "attack=$name exit=$rc expected=$expected $verdict"
  python3 - "$name" "$rc" "$expected" "$verdict" <<'EOF'
import json, sys
name, rc, expected, verdict = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
print(json.dumps({"attack": name, "exit": rc, "expected_exit": expected, "verdict": verdict}))
EOF
}

{
run_attack honest-again      0  # baseline re-check (fresh tenant)
run_attack crash             3 GAUNTLET_FAULT=crash
run_attack slow-timeout       3 GAUNTLET_FAULT=slow
run_attack malformed-envelope 3 GAUNTLET_FAULT=malformed
run_attack wrong-agent        3 GAUNTLET_FAULT=wrong-agent
run_attack effect-then-timeout 3 GAUNTLET_FAULT=effect-then-timeout
run_attack mcp-removed        3 GAUNTLET_MCP_MODE=removed
run_attack mcp-malformed      3 GAUNTLET_MCP_MODE=malformed-result
run_attack memory-stale       0 GAUNTLET_MEMORY_MODE=stale
run_attack memory-contradictory 3 GAUNTLET_MEMORY_MODE=contradictory
run_attack memory-cross-tenant 0 GAUNTLET_MEMORY_MODE=cross-tenant GAUNTLET_REQUEST_TENANT=tenant-b
run_attack capability-revoked 3 GAUNTLET_CAPABILITY_REVOKED=text.transform
run_attack dedup-self-test    0 GAUNTLET_SELF_TEST_DEDUP=1
run_attack budget-exhausted   3 GAUNTLET_MAX_WORK_ORDERS=1
} 2>&1 | tee -a "$SUM.log"

# append structured rows
python3 - "$EV" <<'EOF'
import json, glob, os, re
ev = os.environ.get('EV') or ''
# rows were printed by run_attack via tee into $SUM.log; extract verdicts
rows = []
for line in open('evidence/attack-matrix-summary.jsonl.log'):
    m = re.match(r'attack=(\S+) exit=(\d+) expected=(\d+) (PASS|FAIL)', line)
    if m: rows.append({"attack": m.group(1), "exit": int(m.group(2)), "expected_exit": int(m.group(3)), "verdict": m.group(4)})
open('evidence/attack-matrix-summary.jsonl','w').write('\n'.join(json.dumps(r) for r in rows) + '\n')
passes = sum(1 for r in rows if r['verdict']=='PASS')
print(f"ATTACK MATRIX: {passes}/{len(rows)} as expected")
EOF
