cd /home/nolan/projects/ping
cp /mnt/c/Users/nolan/transfer/whythis-renderer.patch /tmp/whythis-renderer.patch
git apply --cached --check /tmp/whythis-renderer.patch && echo "PATCH_APPLIES_CLEANLY"
