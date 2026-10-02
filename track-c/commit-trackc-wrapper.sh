#!/bin/bash
set -u
cat > /tmp/trackc-msg.txt <<'MSG_EOF'
Track C: Binding Verifier wiring for site metadata + semantic render determinism

- src/app/sites/_shared/site-metadata.ts: <title>, meta description, and
  social tags now publish the business's own title/description only
  through resolveBoundFieldVerified (strong Binding Verifier: object
  field + evidence ref + fresh provenance, or a matching recorded owner
  assertion). Unverified values fall back to generator-labeled GENERATED
  copy, never the business's words as fact.
- src/fyd/sitespec/public-projection.ts: decisionsDigest sorts the
  owner-decision set canonically before hashing, so OwnerOverrides input
  order no longer affects the decisions digest, checkpoint, or
  viewerPolicyDigest.
- src/fyd/sitespec/render-model.ts: the semantic model mirrors the real
  render path (resolveQuery -> applyObjectOrder -> applyHiddenObjects;
  presentation.hidden sections omitted), closing the model/renderer gap
  for owner presentation intent.
- src/fyd/lineage/tracer.ts: doc fix naming resolveBoundFieldVerified
  and the strong Binding Verifier.
- src/fyd/sitespec/__tests__/site-metadata-verifier.test.ts: new
  production-path regression test proving both demo tenants publish
  verifier-accepted metadata.

Note: determinism-probe.ts (viewerKind) and the render-model.test.ts
additions stay uncommitted in the working tree; they build on the
sitespec lane's uncommitted projection refactor and must land with it
at integration.
MSG_EOF
cd /home/nolan/projects/ping && git commit -F /tmp/trackc-msg.txt -- src/app/sites/_shared/site-metadata.ts src/fyd/lineage/tracer.ts src/fyd/sitespec/__tests__/site-metadata-verifier.test.ts src/fyd/sitespec/public-projection.ts src/fyd/sitespec/render-model.ts && echo "=== new HEAD:" && git log --oneline -1 && echo "=== staged remaining:" && git status --short | grep -c "^M " || true
