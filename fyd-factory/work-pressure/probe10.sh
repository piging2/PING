cd /home/nolan/projects/ping || exit 1
echo '=== run dir ==='
ls -la src/fyd/proceduralize/runs/2026-09-21-coppersmith-plumbing/
echo '=== raw dirs ==='
ls src/fyd/proceduralize/raw/coppersmith-plumbing/ src/fyd/proceduralize/raw/happy-place-platform/ 2>/dev/null | head -30
echo '=== media manifests ==='
ls src/fyd/media/manifests/ 2>/dev/null | head
echo '=== preview manifests ==='
ls src/fyd/preview/manifests/ 2>/dev/null | head
