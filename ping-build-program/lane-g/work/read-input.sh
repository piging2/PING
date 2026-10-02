#!/bin/bash
set -u
F=/tmp/laneg-read2/ask-composer.ts
sed -n '32,67p' "$F"
echo "===== AskContextInput (109-190) ====="
sed -n '109,190p' "$F"
