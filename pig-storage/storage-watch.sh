#!/bin/bash
# pig-storage-watch.sh — deterministic daily storage observation (Incident Zero recurrence guards).
# No AI, no deletions, no restarts, no config changes. Appends one CSV row per run and
# evaluates Nolan's threshold ladder. Safe to run from cron on the cloud VM.
# Thresholds (Nolan, 2026-09-30): >20% free NORMAL; <15% WARN+attribute;
# <10% BLOCK nonessential bulk builds/pulls/media; <5% EMERGENCY (preserve OS+DB+journal).
set -u

OUT_DIR="$HOME/workspace/pig-storage"
CSV="$OUT_DIR/storage-watch-log.csv"
STATUS="$OUT_DIR/storage-watch-status.md"
TS=$(date -u +%FT%TZ)
PIG_SSH=(ssh -F /home/hatch/.ssh/pig-config -o BatchMode=yes -o ConnectTimeout=25 pigwsl)

# human-size (e.g. 1.5GB, 300MB, 0B) -> MB, float
to_mb() {
  local v="$1" num unit
  num=$(echo "$v" | grep -oE '^[0-9.]+'); unit=$(echo "$v" | grep -oE '[A-Za-z]+$')
  case "$unit" in
    B)  awk "BEGIN{print $num/1048576}" ;;
    KB|K) awk "BEGIN{print $num/1024}" ;;
    MB|M) echo "$num" ;;
    GB|G) awk "BEGIN{print $num*1024}" ;;
    TB|T) awk "BEGIN{print $num*1048576}" ;;
    *) echo "-1" ;;
  esac
}

if [ ! -f "$CSV" ]; then
  echo "ts_utc,c_free_pct,c_free_gb,wsl_vhdx_gb,docker_vhdx_gb,build_cache_mb,max_writable_mb,journal_mb,npm_cache_mb,pg_data_mb,status" > "$CSV"
fi

# --- Windows-side metrics via direct PowerShell (never pigps.sh: it cold-boots WSL) ---
PS1F=$(mktemp /tmp/psw.XXXXXX.ps1)
cat > "$PS1F" <<'PSEOF'
$c = Get-Volume -DriveLetter C -ErrorAction SilentlyContinue
if ($c) {
  "CFREEPCT=$([math]::Round(100.0*$c.SizeRemaining/$c.Size,2))"
  "CFREEGB=$([math]::Round($c.SizeRemaining/1GB,2))"
}
$p1='C:\Users\nolan\AppData\Local\wsl\{a112dee4-421d-4e51-81a9-46c985479613}\ext4.vhdx'
if (-not (Test-Path $p1)) { $p1=(Get-ChildItem 'C:\Users\nolan\AppData\Local\wsl\*\ext4.vhdx' -ErrorAction SilentlyContinue | Select-Object -First 1).FullName }
if ($p1 -and (Test-Path $p1)) { "WSLGB=$([math]::Round((Get-Item $p1).Length/1GB,2))" }
$p2='C:\Users\nolan\AppData\Local\Docker\wsl\disk\docker_data.vhdx'
if ($p2 -and (Test-Path $p2)) { "DOCKGB=$([math]::Round((Get-Item $p2).Length/1GB,2))" }
PSEOF
B64=$(iconv -f UTF-8 -t UTF-16LE "$PS1F" | base64 -w0); rm -f "$PS1F"
WIN=$("${PIG_SSH[@]}" "powershell.exe -NonInteractive -EncodedCommand $B64" 2>/dev/null | grep -aE '^(CFREEPCT|CFREEGB|WSLGB|DOCKGB)=' | tr -d '\r' || true)

getv() { echo "$WIN" | grep -a "^$1=" | cut -d= -f2; }
CFREEPCT=$(getv CFREEPCT); CFREEGB=$(getv CFREEGB); WSLGB=$(getv WSLGB); DOCKGB=$(getv DOCKGB)

if [ -z "$CFREEPCT" ]; then
  echo "$TS,-1,-1,-1,-1,-1,-1,-1,-1,-1,UNREACHABLE" >> "$CSV"
  cat > "$STATUS" <<EOF
# Storage watch — UNREACHABLE ($TS)
Pig did not answer the Windows-side probe. WSL-side metrics skipped.
Check the Tailscale tunnel and Pig power state. No data was deleted.
EOF
  exit 0
fi

# --- WSL-side metrics ---
WL=$(~/workspace/bin/pigwsl-exec "docker system df --format '{{.Type}}|{{.Size}}' 2>/dev/null | grep -a '^Build Cache|' | cut -d'|' -f2; docker ps -s --format '{{.Size}}' 2>/dev/null | head -20; echo JSEP; du -sm /var/log/journal 2>/dev/null | cut -f1; echo NSEP; du -sm ~/.npm/_cacache 2>/dev/null | cut -f1; echo PSEP; docker exec brain-postgres du -sm /var/lib/postgresql/data 2>/dev/null | cut -f1" 2>/dev/null | tr -d '\r' || true)

BC_RAW=$(echo "$WL" | sed -n '1p')
SIZES=$(echo "$WL" | sed -n '2,21p' | grep -a '(' | head -19)
JOURNAL_MB=$(echo "$WL" | grep -aA1 '^JSEP$' | tail -1)
NPM_MB=$(echo "$WL" | grep -aA1 '^NSEP$' | tail -1)
PG_MB=$(echo "$WL" | grep -aA1 '^PSEP$' | tail -1)

BC_MB=$(to_mb "${BC_RAW:-0B}")
MAXW_MB=0
while IFS= read -r s; do
  first=$(echo "$s" | awk '{print $1}')
  mb=$(to_mb "$first"); mb=${mb:--1}
  if awk "BEGIN{exit !( $mb > $MAXW_MB )}"; then MAXW_MB=$mb; fi
done <<< "$SIZES"
JOURNAL_MB=${JOURNAL_MB:--1}; NPM_MB=${NPM_MB:--1}; PG_MB=${PG_MB:--1}

# --- threshold ladder ---
PCT="$CFREEPCT"
if awk "BEGIN{exit !($PCT > 20)}"; then ST="NORMAL"
elif awk "BEGIN{exit !($PCT > 15)}"; then ST="GUARDED"
elif awk "BEGIN{exit !($PCT > 10)}"; then ST="WARN"
elif awk "BEGIN{exit !($PCT > 5)}"; then ST="CRITICAL"
else ST="EMERGENCY"; fi

echo "$TS,$PCT,$CFREEGB,$WSLGB,$DOCKGB,$BC_MB,$MAXW_MB,$JOURNAL_MB,$NPM_MB,$PG_MB,$ST" >> "$CSV"

# --- 24h deltas vs previous data row (attribute the growers) ---
N_DATA_ROWS=$(($(wc -l < "$CSV") - 1))
if [ "$N_DATA_ROWS" -ge 2 ]; then
PREV=$(tail -2 "$CSV" | head -1)
DELTA_BLOCK=$( {
dline() { # $1=new $2=old $3=label $4=unit
  if [ "$2" != "-1" ] && [ "$2" != "" ]; then
    awk "BEGIN{d=$1-($2); printf \"%s: %+.1f %s\", \"$3\", d, \"$4\"}"
  else echo "$3: n/a"; fi
}
echo "- $(dline "$WSLGB" "$(echo "$PREV" | cut -d, -f4)" "WSL VHDX" "GB")"
echo "- $(dline "$DOCKGB" "$(echo "$PREV" | cut -d, -f5)" "Docker VHDX" "GB")"
echo "- $(dline "$BC_MB" "$(echo "$PREV" | cut -d, -f6)" "build cache" "MB")"
echo "- $(dline "$MAXW_MB" "$(echo "$PREV" | cut -d, -f7)" "largest writable" "MB")"
echo "- $(dline "$JOURNAL_MB" "$(echo "$PREV" | cut -d, -f8)" "journal" "MB")"
echo "- $(dline "$NPM_MB" "$(echo "$PREV" | cut -d, -f9)" "npm cache" "MB")"
echo "- $(dline "$PG_MB" "$(echo "$PREV" | cut -d, -f10)" "pg data" "MB")"
} )
else
DELTA_BLOCK="- first observation — no prior data row; deltas begin tomorrow."
fi
{
echo "# Storage watch status — $TS"
echo
echo "Status: **$ST** (C: $PCT% free, $CFREEGB GB)"
echo
echo "Operator action per standing ladder:"
case "$ST" in
  NORMAL) echo "- None. >20% free." ;;
  GUARDED) echo "- None required. 15-20%: lean but above WARN; keep an eye on deltas." ;;
  WARN) echo "- ATTRIBUTE the growers (see deltas below). No automatic deletion, ever." ;;
  CRITICAL) echo "- BLOCK nonessential bulk builds, image pulls, model downloads, media generation until back above 15%." ;;
  EMERGENCY) echo "- EMERGENCY: preserve OS + Postgres/WAL + PING journal only. Page Nolan." ;;
  *) echo "- Pig unreachable: check tunnel/power." ;;
esac
echo
echo "Current: WSL VHDX ${WSLGB} GB | Docker VHDX ${DOCKGB} GB | build cache ${BC_MB} MB | largest writable layer ${MAXW_MB} MB | journal ${JOURNAL_MB} MB | npm cache ${NPM_MB} MB | pg data ${PG_MB} MB"
echo
echo "24h deltas (new minus previous data row):"
echo "$DELTA_BLOCK"
echo
echo "Full history: storage-watch-log.csv. Never auto-deletes canonical or user state at any threshold."
} > "$STATUS"
echo "storage-watch: $ST (C: $PCT% free)"
