#!/usr/bin/env bash
# LANE M — run the full proof suite (zero dependencies)
set -euo pipefail
cd "$(dirname "$0")"
echo "--- proof demo"; node demo.mjs | tail -3
echo "--- red team"; node redteam.mjs | tail -3
echo "OK: registry spike green"
