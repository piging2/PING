cd /home/nolan/ping-clean
cat > /home/nolan/shard1/dbg1.ts <<'TSEOF'
import { performance } from "node:perf_hooks";
const H = require("/home/nolan/shard1/harness-debug-export.cjs");
TSEOF
echo "skip that; direct node eval instead"
START=501 END=501 OUT_DIR=/home/nolan/shard1 DEBUG_DUMP=1 node /home/nolan/shard1/boot.cjs 2>/dev/null | tail -3
ls /home/nolan/shard1/dump-501* 2>/dev/null
