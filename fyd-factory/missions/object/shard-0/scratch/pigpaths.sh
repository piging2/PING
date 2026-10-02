cat > /tmp/count.cjs <<'EOF'
const { execSync } = require("child_process");
EOF
SHARD_DUMP_HTML=/tmp/leak.html node /home/nolan/fyd-missions/shard-0/repro.cjs /home/nolan/fyd-missions/shard-0/rail-unbound-description.json >/dev/null 2>&1
grep -o "REPRO UNBOUND CLAIM" /tmp/leak.html | wc -l
echo "--- contexts ---"
grep -o '.\{120\}REPRO UNBOUND CLAIM.\{80\}' /tmp/leak.html | head -5
