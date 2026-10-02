#!/bin/bash
# LANE-ARCH probe F: PING substrate inventory for harvest (read-only)
set -u
REPO=/home/nolan/projects/ping
cd "$REPO"
echo "=== src/lib/ping/ ==="
ls -la src/lib/ping/ | head -60
echo "=== src/lib top-level (full) ==="
ls -1 src/lib/
echo "=== PING object reader symbols ==="
grep -E '^export (class|function|const|type|interface)' src/lib/ping/ping-object-reader.ts 2>/dev/null | head -30
echo "=== PING types ==="
grep -E '^export (class|function|const|type|interface)' src/lib/ping/types.ts 2>/dev/null | head -40
echo "=== evidence model in PING? grep ClaimEvidence/Fact ==="
grep -rln "ClaimEvidence" src/lib src/services src/types 2>/dev/null | head
echo "=== PING media stack ==="
grep -E '^export (class|function|const|type|interface)' src/lib/media.ts 2>/dev/null | head -30
echo "--- media-kv-store ---"
grep -E '^export (class|function|const|type|interface)' src/lib/media-kv-store.ts 2>/dev/null | head -20
echo "=== caching in PING ==="
grep -rln "cache" src/lib --include='*.ts' -i | head -15
echo "=== tracing/observability ==="
grep -rln "trace\|otel\|span(" src/lib src/services --include='*.ts' -i | head -15
echo "=== proposal/approval in PING (patch/approve/proposal) ==="
grep -rln "propose\|approve" src/lib src/services --include='*.ts' -i | head -15
echo "=== PING capability model ==="
grep -rln "capabilit" src/lib/ping --include='*.ts' -i | head -10
echo "=== PING theme/token impl (brand/config) ==="
grep -E '^export (class|function|const|type|interface)' src/lib/brand.ts 2>/dev/null | head -20
echo "=== src/components/ping (PING component library) ==="
ls -R src/components/ping 2>/dev/null | head -30
echo "=== events.ts (evidence?) ==="
grep -E '^export (class|function|const|type|interface)' src/lib/events.ts 2>/dev/null | head -30
echo "=== canonicalize location ==="
grep -rn "export function canonicalize" src/lib --include='*.ts' | head -3
