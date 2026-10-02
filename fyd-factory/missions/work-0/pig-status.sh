#!/bin/bash
uptime
nproc
git -C /home/nolan/projects/ping rev-parse --short HEAD
git -C /home/nolan/projects/ping status --porcelain | wc -l
git -C /home/nolan/projects/ping status --porcelain | grep -e '^ M src/fyd/object/view.ts' -e '^ M src/fyd/components/renderer.tsx' || echo "SEC-FIX targets not marked modified"
ls /home/nolan/fyd-factory-shard2/corpus/fixtures 2>/dev/null | head -5 || echo "no shard2 corpus"
find /home/nolan/fyd-factory-shard2/corpus/fixtures -name '*.json' 2>/dev/null | wc -l
ls -d /home/nolan/fyd-wave2-clean 2>/dev/null || echo "no clean worktree yet"
