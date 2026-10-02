#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
sed -n '1,120p' "$WT/src/fyd/data/ping-object-source.ts"
