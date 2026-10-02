#!/bin/bash
cd /home/nolan/projects/ping
echo "=== 7aecdeb7 full message ==="
git show --format='%B' --no-patch 7aecdeb7
echo "=== 7aecdeb7 stat ==="
git show --stat 7aecdeb7 | head -25
echo "=== 14494c34 full message + stat ==="
git show --format='%B' --no-patch 14494c34; git show --stat 14494c34 | head -15
echo "=== b5e23b4c full message ==="
git show --format='%B' --no-patch b5e23b4c
echo "=== fe74c481 full message ==="
git show --format='%B' --no-patch fe74c481
