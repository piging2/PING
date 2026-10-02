#!/bin/bash
# FYD FACTORY patch integration runner.
# Applies patches in coordinator order: --check first, then apply.
# Records APPLIED / REJECTED + evidence. No commits, no resets, no checkouts.
set -u

REPO=/home/nolan/projects/ping
STAGE=/home/nolan/fyd-factory-patches
RESULTS=$STAGE/apply-results.txt
mkdir -p $STAGE

cd $REPO
echo "=== PATCH INTEGRATION RUN $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" > $RESULTS
echo "branch: $(git rev-parse --abbrev-ref HEAD)" >> $RESULTS
echo "head: $(git rev-parse HEAD)" >> $RESULTS
echo "dirty files before: $(git status --porcelain | wc -l)" >> $RESULTS
echo "" >> $RESULTS

apply_one() {
  local label="$1"
  local patch="$2"
  echo "--- $label" | tee -a $RESULTS
  echo "file: $patch" >> $RESULTS
  if [ ! -f "$patch" ]; then
    echo "STATUS: REJECTED (patch file missing)" | tee -a $RESULTS
    echo "" >> $RESULTS
    return
  fi
  local check_out
  check_out=$(git apply --check "$patch" 2>&1)
  local rc=$?
  if [ $rc -eq 0 ]; then
    if git apply "$patch" 2>> $RESULTS; then
      echo "STATUS: APPLIED" | tee -a $RESULTS
    else
      echo "STATUS: REJECTED (git apply failed after --check passed)" | tee -a $RESULTS
    fi
  else
    echo "STATUS: REJECTED (git apply --check failed, rc=$rc)" | tee -a $RESULTS
    echo "CONFLICT EVIDENCE:" >> $RESULTS
    echo "$check_out" >> $RESULTS
  fi
  echo "" >> $RESULTS
}

# 1. SEC-FIX x5
apply_one "SEC-1 o-capability-safe-link"        "$STAGE/patches/o-capability-safe-link.patch"
apply_one "SEC-2 o-contact-block-safe-link"    "$STAGE/patches/o-contact-block-safe-link.patch"
apply_one "SEC-3 display-media-src-allowlist"   "$STAGE/patches/display-media-src-allowlist.patch"
apply_one "SEC-4 export-customer-data-script-escape" "$STAGE/patches/export-customer-data-script-escape.patch"
apply_one "SEC-5 safe-link-email-shape-tighten" "$STAGE/patches/safe-link-email-shape-tighten.patch"

# 2. CONCIERGE G1 + TD-002 wire
apply_one "CONCIERGE-G1 buildgraphview-visibility-filter" "$STAGE/missions/patches/concierge-buildgraphview-visibility-filter.patch"
apply_one "ASK ask-concierge-wire (TD-002)" "$STAGE/patches/ask-concierge-wire.patch"

# 3. RAIL BINDING (both; 0002-rail-section-bound-summary NOT applied - superseded)
apply_one "RAIL-1 object-rail-binding-gate" "$STAGE/missions/patches/object-rail-binding-gate.patch"
apply_one "RAIL-2 0001-rail-bound-description" "$STAGE/missions/patches/0001-rail-bound-description.patch"
echo "--- SKIPPED (superseded): missions/patches/0002-rail-section-bound-summary.patch" >> $RESULTS
echo "" >> $RESULTS

# 4. PHONE-DIAL GATING
apply_one "PHONE-DIAL 0002-object2-phonec-dial-gating" "$STAGE/missions/patches/0002-object2-phonec-dial-gating.patch"

# 5. SYNTH x3
apply_one "SYNTH-1 overlay-orphan-ambiguity" "$STAGE/missions/patches/synth-shard0-overlay-orphan-ambiguity.patch"
apply_one "SYNTH-2 overlay-drift-normalization" "$STAGE/missions/patches/synth-shard0-overlay-drift-normalization.patch"
apply_one "SYNTH-3 visibility-hide-reresolve" "$STAGE/missions/patches/synth-shard0-visibility-hide-reresolve.patch"

# 6. WIRE x4
apply_one "WIRE-1 sites-wire-p1-footer-provenance" "$STAGE/patches/sites-wire-p1-footer-provenance.patch"
apply_one "WIRE-2 sites-wire-p2-rights-inferred" "$STAGE/patches/sites-wire-p2-rights-inferred.patch"
apply_one "WIRE-4 sites-wire-p4-render-audit" "$STAGE/patches/sites-wire-p4-render-audit.patch"
apply_one "WIRE-5 sites-wire-p5-verifier-reconciliation" "$STAGE/patches/sites-wire-p5-verifier-reconciliation.patch"

# 7. VQ x5
apply_one "VQ-001 motion-never-gates-content" "$STAGE/patches/vq-001-motion-never-gates-content.patch"
apply_one "VQ-002 hero-pill-on-dark" "$STAGE/patches/vq-002-hero-pill-on-dark.patch"
apply_one "VQ-004 typographic-hero-treatment" "$STAGE/patches/vq-004-typographic-hero-treatment.patch"
apply_one "M-ISSUE-2 fab-inflow-mobile" "$STAGE/patches/m-issue-2-fab-inflow-mobile.patch"
apply_one "M-ISSUE-3 mobile-hero-call-cta" "$STAGE/patches/m-issue-3-mobile-hero-call-cta.patch"

echo "dirty files after: $(git status --porcelain | wc -l)" >> $RESULTS
echo "=== END RUN ===" >> $RESULTS
echo "RUN COMPLETE. See $RESULTS"
