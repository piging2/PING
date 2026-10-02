cd /home/nolan/projects/ping
diff -u src/fyd/components/object-rail.tsx /home/nolan/fyd-missions/shard-0/object-rail.patched.tsx | sed 's|--- src|--- a/src|; s|+++ /home/nolan/fyd-missions/shard-0/object-rail.patched.tsx|+++ b/src/fyd/components/object-rail.tsx|' > /home/nolan/fyd-missions/shard-0/0001-rail-bound-description.patch
diff -u src/fyd/components/renderer.tsx /home/nolan/fyd-missions/shard-0/renderer.patched.tsx | sed 's|--- src|--- a/src|; s|+++ /home/nolan/fyd-missions/shard-0/renderer.patched.tsx|+++ b/src/fyd/components/renderer.tsx|' > /home/nolan/fyd-missions/shard-0/0002-rail-section-bound-summary.patch
echo "--- patch 0001 ---"; cat /home/nolan/fyd-missions/shard-0/0001-rail-bound-description.patch
echo "=== git apply --check ==="
git apply --check /home/nolan/fyd-missions/shard-0/0001-rail-bound-description.patch && echo PATCH1_APPLIES_CLEAN
git apply --check /home/nolan/fyd-missions/shard-0/0002-rail-section-bound-summary.patch && echo PATCH2_APPLIES_CLEAN
