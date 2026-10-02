#!/bin/bash
set -u
cp "$SRC_DIR/ver.c" "$OUT_DIR/ver.c"
echo "// built at $(date +%s%N)" >> "$OUT_DIR/ver.c"
