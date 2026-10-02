#!/bin/bash
set -u
F=/tmp/laneg-read2/ask-composer.ts
echo "===== exported symbols ====="
grep -n "^export" "$F" | head -40
echo "===== canonicalize ====="
grep -n "canonicalize" "$F" | head -20
