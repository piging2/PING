#!/usr/bin/env bash
# B9 journal-authority forgery repro. Scratch journal only; refuses anything else.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p b9-forge
export MC_SCRATCH_JOURNAL="$PWD/b9-forge/events.jsonl"
rm -f "$MC_SCRATCH_JOURNAL"
node b9-journal-authority-forgery.mjs
