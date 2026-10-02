#!/bin/bash
# List touched files per applied patch.
set -u
STAGE=/home/nolan/fyd-factory-patches
cd $STAGE
for p in \
  patches/o-capability-safe-link.patch \
  patches/o-contact-block-safe-link.patch \
  patches/display-media-src-allowlist.patch \
  patches/export-customer-data-script-escape.patch \
  patches/safe-link-email-shape-tighten.patch \
  missions/patches/concierge-buildgraphview-visibility-filter.patch \
  patches/ask-concierge-wire.patch \
  missions/patches/object-rail-binding-gate.patch \
  missions/patches/0001-rail-bound-description.patch \
  missions/patches/0002-object2-phonec-dial-gating.patch \
  missions/patches/synth-shard0-overlay-orphan-ambiguity.patch \
  missions/patches/synth-shard0-overlay-drift-normalization.patch \
  missions/patches/synth-shard0-visibility-hide-reresolve.patch \
  patches/sites-wire-p1-footer-provenance.patch \
  patches/sites-wire-p2-rights-inferred.patch \
  patches/sites-wire-p4-render-audit.patch \
  patches/sites-wire-p5-verifier-reconciliation.patch \
  patches/vq-001-motion-never-gates-content.patch \
  patches/vq-002-hero-pill-on-dark.patch \
  patches/vq-004-typographic-hero-treatment.patch \
  patches/m-issue-2-fab-inflow-mobile.patch \
  patches/m-issue-3-mobile-hero-call-cta.patch \
; do
  echo "== $p"
  grep -e '^+++ b/' "$p" | cut -c7- | cut -d$'\t' -f1 | sort -u
done
