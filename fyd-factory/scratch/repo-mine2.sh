#!/bin/bash
cd /home/nolan/projects/ping
echo "=== SKIP/XIT/TODO/FIXME in src/fyd ==="
grep -rn --include='*.ts' --include='*.tsx' --include='*.js' -E '\.(skip|todo)\(|xit\(|test\.skip|describe\.skip' src/fyd 2>/dev/null | head -40
echo "=== TODO/FIXME in src/fyd (first 40) ==="
grep -rn --include='*.ts' --include='*.tsx' --include='*.js' -E 'TODO|FIXME' src/fyd 2>/dev/null | grep -v test | head -40
echo "=== TEST-GATE.md ==="
ls src/fyd/TEST-GATE.md 2>/dev/null && cat src/fyd/TEST-GATE.md | head -100
