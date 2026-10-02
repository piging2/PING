#!/bin/bash
for n in vq-001-motion-never-gates-content vq-001-test vq-002-hero-pill-on-dark vq-004-typographic-hero-treatment m-issue-2-fab-inflow-mobile m-issue-3-mobile-hero-call-cta; do
  echo "PATCH:$n"
  base64 -w0 "/tmp/vq-patches-gen/$n.patch"
  echo ""
  echo "MD5:$n:$(md5sum "/tmp/vq-patches-gen/$n.patch" | cut -d' ' -f1)"
done
