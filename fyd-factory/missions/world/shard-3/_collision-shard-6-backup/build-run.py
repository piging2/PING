#!/usr/bin/env python3
# Builds run.sh: embeds harness.ts + tsconfig.json as heredocs, runs tsx on the Pig.
import pathlib

HERE = pathlib.Path(__file__).parent
harness = (HERE / "harness.ts").read_text()
assert "HARNESS_EOF_7XQZ" not in harness, "delimiter collision"

tsconfig = """{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": { "@/*": ["/home/nolan/projects/ping/src/*"] }
  }
}
"""

mode = "SMOKE"  # replaced below when building full run
script = f"""#!/bin/bash
# WORLD-SHARD-3 runner. One ssh invocation: esbuild bundle (read-only) + one node run for the whole shard.
set -u
mkdir -p /home/nolan/fyd-shard3
cat > /home/nolan/fyd-shard3/harness.ts <<'HARNESS_EOF_7XQZ'
{harness}
HARNESS_EOF_7XQZ
cd /home/nolan/projects/ping
./node_modules/.bin/esbuild /home/nolan/fyd-shard3/harness.ts \\
  --bundle --platform=node --format=cjs --target=node22 \\
  --jsx=automatic \\
  --alias:@=/home/nolan/projects/ping/src \\
  --loader:.css=empty \\
  --packages=external \\
  --outfile=/home/nolan/fyd-shard3/harness.bundle.cjs \\
  --log-level=warning
node /home/nolan/fyd-shard3/harness.bundle.cjs __MODE__
"""

for name, flag in (("run-smoke.sh", "--smoke"), ("run-shard6.sh", "--range 3000 3499")):
    (HERE / name).write_text(script.replace("__MODE__", flag))
    print("wrote", name, "bytes:", len(script))
