#!/bin/bash
set -uo pipefail
echo "=== dirty tree ObjectProvenanceKind (main repo, READ ONLY) ==="
grep -B2 -A8 'type ObjectProvenanceKind' /home/nolan/projects/pig/src/lib/ping/types.ts 2>/dev/null || echo "NOT FOUND in main repo"
echo ""
echo "=== worktree ObjectProvenanceKind (frozen SHA) ==="
grep -B2 -A8 'type ObjectProvenanceKind' /home/nolan/fyd-preview-wt/src/lib/ping/types.ts
