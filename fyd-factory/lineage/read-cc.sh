#!/bin/bash
cd /home/nolan/projects/ping || exit 1
grep -n "AskClaimClassification\|AskEvidenceRef" -A 12 src/lib/ping/types.ts | head -40
