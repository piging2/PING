#!/bin/bash
# LANE-ARCH probe C: export symbols per target module + ObjectGraph hunt (read-only)
set -u
REPO=/home/nolan/projects/ping
cd "$REPO"
exports_of() {
  local f="$1"
  echo "--- $f ($(wc -l < "$f") lines)"
  grep -E '^export (class|function|const|type|interface|enum|abstract|default|async)|^export \{' "$f" 2>/dev/null | head -30
}
for f in \
  src/fyd/object/object-projection.ts src/fyd/object/types.ts src/fyd/object/view.ts \
  src/fyd/object/by-id.ts src/fyd/object/related.ts src/fyd/object/services.ts \
  src/fyd/object/commands.ts src/fyd/object/follows.ts src/fyd/object/likes.ts \
  src/fyd/sitespec/index.ts src/fyd/sitespec/types.ts src/fyd/sitespec/graph.ts \
  src/fyd/sitespec/render-model.ts src/fyd/sitespec/validator.ts src/fyd/sitespec/schemas.ts \
  src/fyd/sitespec/binding-verifier.ts src/fyd/sitespec/field-visibility.ts src/fyd/sitespec/safe-link.ts \
  src/fyd/components/registry.ts src/fyd/components/renderer.tsx \
  src/fyd/ui/object-layer/fyd-tokens.ts src/fyd/ui/object-layer/design-compiler.ts \
  src/fyd/ui/object-layer/presentation-spec.ts \
  src/fyd/capabilities/runtime.ts \
  src/fyd/ask/types.ts src/fyd/ask/answer.ts src/fyd/ask/envelope.ts \
  src/fyd/ask/context-builder.ts src/fyd/ask/capabilities.ts \
  src/fyd/customize/types.ts src/fyd/customize/propose.ts src/fyd/customize/server.ts \
  src/fyd/customize/apply-layer.ts src/fyd/customize/intent.ts \
  src/fyd/archetypes/profiles.ts src/fyd/archetypes/apply.ts \
  src/fyd/builder/index.ts src/fyd/builder/strategies.ts src/fyd/builder/infer-strategy.ts \
  src/fyd/builder/strategy-for-site.ts src/fyd/builder/object-builder.ts src/fyd/builder/planner.ts \
  src/fyd/builder/canonical.ts src/fyd/builder/confidence.ts src/fyd/builder/dimensions.ts \
  src/fyd/builder/eligibility.ts src/fyd/builder/visibility.ts src/fyd/builder/manifest.ts \
  src/fyd/media/types.ts src/fyd/media/discover.ts src/fyd/media/select.ts src/fyd/media/attach.ts \
  src/fyd/media/provenance.ts src/fyd/media/safe-fetch.ts src/fyd/media/ingest.ts \
  src/fyd/media/derivatives.ts src/fyd/media/bundle-media.ts src/fyd/media/site-bundle.ts \
  src/fyd/claim/index.ts src/fyd/claim/types.ts src/fyd/claim/machine.ts src/fyd/claim/store.ts \
  src/fyd/claim/resource-id.ts src/fyd/claim/identity.ts src/fyd/claim/verification-seam.ts \
  src/fyd/owner-mode/gate.ts src/fyd/owner-mode/capability.ts src/fyd/owner-mode/attestation-gate.ts \
  src/fyd/acquisition/acquisition-adapter.ts src/fyd/boundary/data-boundary.ts \
  src/fyd/tenant/tenant-context.ts src/fyd/tenant/scoped-stores.ts \
  src/fyd/social/readers.ts src/fyd/social/envelope.ts \
  ; do
  if [ -f "$f" ]; then exports_of "$f"; else echo "--- $f MISSING"; fi
done
echo "=== ObjectGraph symbol hunt ==="
grep -rln "ObjectGraph" src/fyd --include='*.ts' --include='*.tsx' | head -20
echo "=== export * barrel files ==="
grep -rn "^export \*" src/fyd --include='*.ts' | grep -v __tests__ | head -20
