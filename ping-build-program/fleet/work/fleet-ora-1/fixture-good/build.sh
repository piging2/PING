#!/bin/bash
set -u
cd "$SRC_DIR"
{ for f in $(find . -type f | sort); do sha256sum "$f"; done; } > "$OUT_DIR/manifest.txt"
