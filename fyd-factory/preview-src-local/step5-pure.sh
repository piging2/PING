#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== draftOwnerProposal / approveOwnerProposal / applyOwnerProposal bodies ==="
grep -n "export function draftOwnerProposal\|export function approveOwnerProposal\|export function applyOwnerProposal\|export function emptyOwnerSiteState\|export function ownerStateDigest\|export function replayOwnerJournal\|export function requiredCapabilityFor" "$WT/src/fyd/customize/owner-proposal.ts"
echo "=== do they reference proposeFromSiteIntent or specDigestOf? ==="
grep -n "proposeFromSiteIntent\|specDigestOf\|sha256Hex\|resolveCustomizationIntent" "$WT/src/fyd/customize/owner-proposal.ts" | head -20
echo "=== owner-command-compiler imports ==="
grep -n "^import\|from \"" "$WT/src/fyd/customize/owner-command-compiler.ts" | head -10
echo "=== propose.ts: where is createHash used? ==="
grep -n "createHash" "$WT/src/fyd/customize/propose.ts"
echo "=== propose.ts: where is canonicalize used? ==="
grep -n "canonicalize" "$WT/src/fyd/customize/propose.ts" | head -5
