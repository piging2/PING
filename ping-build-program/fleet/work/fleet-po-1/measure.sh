#!/bin/bash
# fleet-po-1 perfops measurement harness — lightweight, read-only where it matters.
# Collects real sandbox numbers cited by the 17 perfops topic analyses.
set -u
OUT="$1"
echo "# fleet-po-1 measurements — $(date -u +%FT%TZ)" > "$OUT"
echo "host: $(uname -a)" >> "$OUT"
echo "cpu_count: $(nproc)" >> "$OUT"
echo "mem_total_kb: $(awk '/MemTotal/{print $2}' /proc/meminfo)" >> "$OUT"
echo "mem_avail_kb: $(awk '/MemAvailable/{print $2}' /proc/meminfo)" >> "$OUT"
echo "loadavg: $(cat /proc/loadavg)" >> "$OUT"
echo "disk_avail: $(df -h "$HOME" | awk 'NR==2{print $4" free of "$2" ("$5" used)"}')" >> "$OUT"
# disk write latency: 1MB write, fsync
DD=$(dd if=/dev/zero of="$HOME/workspace/ping-build-program/fleet/work/fleet-po-1/.dd.tmp" bs=256k count=4 conv=fsync 2>&1 | tail -2 | head -1)
echo "disk_write_1mb: $DD" >> "$OUT"
rm -f "$HOME/workspace/ping-build-program/fleet/work/fleet-po-1/.dd.tmp"
# process spawn latency
python3 - <<'EOF' >> "$OUT"
import time, subprocess, json
t0=time.time()
for _ in range(20):
    subprocess.run(["true"], check=True)
print(f"spawn_true_20x_ms: {(time.time()-t0)*1000/20:.2f}")
t0=time.time()
N=20000
s=0
for i in range(N):
    s+=i
print(f"python_loop_20k_ms: {(time.time()-t0)*1000:.2f}")
EOF
# git read-only timing on PING repo (if present)
PING=$(grep -m1 . /dev/null 2>/dev/null; ls -d /home/nolan/projects/ping 2>/dev/null)
if [ -n "$PING" ]; then
  t0=$(date +%s%N); git -C "$PING" status --short >/dev/null 2>&1; t1=$(date +%s%N)
  echo "ping_git_status_ms: $(( (t1-t0)/1000000 ))" >> "$OUT"
  t0=$(date +%s%N); git -C "$PING" log --oneline -50 >/dev/null 2>&1; t1=$(date +%s%N)
  echo "ping_git_log50_ms: $(( (t1-t0)/1000000 ))" >> "$OUT"
else
  echo "ping_repo: ABSENT" >> "$OUT"
fi
# sqlite throughput (if available)
if command -v sqlite3 >/dev/null 2>&1; then
  DB="$HOME/workspace/ping-build-program/fleet/work/fleet-po-1/.bench.db"
  rm -f "$DB"
  t0=$(date +%s%N)
  sqlite3 "$DB" "CREATE TABLE t(a TEXT,b INT);"
  for i in $(seq 1 1000); do echo "INSERT INTO t VALUES('row-$i',$i);"; done | sqlite3 "$DB"
  t1=$(date +%s%N)
  echo "sqlite_1000_inserts_ms: $(( (t1-t0)/1000000 ))" >> "$OUT"
  t0=$(date +%s%N); sqlite3 "$DB" "SELECT count(*) FROM t WHERE b%2=0;" >/dev/null; t1=$(date +%s%N)
  echo "sqlite_count_query_ms: $(( (t1-t0)/1000000 ))" >> "$OUT"
  rm -f "$DB"
else
  echo "sqlite3: ABSENT" >> "$OUT"
fi
# dns resolution time
t0=$(date +%s%N); getent hosts github.com >/dev/null 2>&1; t1=$(date +%s%N)
echo "dns_github_ms: $(( (t1-t0)/1000000 ))" >> "$OUT"
# python startup
t0=$(date +%s%N); python3 -c pass; t1=$(date +%s%N)
echo "python_startup_ms: $(( (t1-t0)/1000000 ))" >> "$OUT"
echo "done" >> "$OUT"
