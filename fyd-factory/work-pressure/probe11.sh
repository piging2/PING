cd /home/nolan/projects/ping || exit 1
echo '===== RUN-NOTES ====='
cat src/fyd/proceduralize/runs/2026-09-21-coppersmith-plumbing/RUN-NOTES.md
echo '===== media manifests (keys only) ====='
for f in src/fyd/media/manifests/coppersmith-plumbing.json src/fyd/media/manifests/happy-place.json; do
  echo "--- $f"
  head -c 1200 "$f"; echo
done
