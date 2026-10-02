#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== patch 1 check ==="
git apply --check /home/hatch/workspace/fyd-factory/patches/boundary-jest-css-stub.patch && echo "PATCH1 OK" || echo "PATCH1 FAIL"
echo "=== patch 2 check ==="
git apply --check /home/hatch/workspace/fyd-factory/patches/display-media-src-allowlist.patch && echo "PATCH2 OK" || echo "PATCH2 FAIL"
