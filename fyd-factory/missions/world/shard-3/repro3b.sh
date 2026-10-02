#!/bin/bash
# repro3b: minimal import test, code in a file to avoid quoting issues
cd /home/nolan/projects/ping
export NODE_OPTIONS="--require /home/nolan/fyd-shard3/preload.cjs"
cat > /home/nolan/fyd-shard3/repro-entry.ts <<'REPRO_EOF'
try {
  const m = await import("/home/nolan/projects/ping/src/fyd/components/registry.ts");
  console.log("REG-OK");
} catch (e: any) {
  console.log("REG-FAIL:", e.message);
}
REPRO_EOF
./node_modules/.bin/tsx --tsconfig /home/nolan/fyd-shard3/tsconfig.json /home/nolan/fyd-shard3/repro-entry.ts 2>&1 | head -10
