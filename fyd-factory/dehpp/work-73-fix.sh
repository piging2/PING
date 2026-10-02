#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
python3 - <<'PYEOF'
import re
p = "src/app/sites/_shared/compose-site.ts"
src = open(p).read()

def rep(old, new, count=1):
    global src
    found = src.count(old)
    assert found == count, f"anchor {found}x: {old[:60]!r}"
    src = src.replace(old, new)

# PresentationIntentBlock lives in customize/types, not sitespec/types.
rep(
    """import type {
  FYDFinding,
  FYDSiteSpec,
  ObjectGraph,
  PresentationIntentBlock,
} from "@/fyd/sitespec/types";""",
    """import type {
  FYDFinding,
  FYDSiteSpec,
  ObjectGraph,
} from "@/fyd/sitespec/types";
import type { PresentationIntentBlock } from "@/fyd/customize/types";""",
)

# galleryMediaFor and listObjectMedia are per-object selectors: build the
# record keyed by object id at the seam.
rep(
    """    heroMedia: heroMediaFor(tenantId, graph, spec.ownerObjectId),
    galleryMedia: galleryMediaFor(graph) ?? [],
    objectMedia: listObjectMedia(graph),""",
    """    heroMedia: heroMediaFor(tenantId, graph, spec.ownerObjectId),
    galleryMedia: galleryMediaFor(tenantId, graph, spec.ownerObjectId),
    objectMedia: buildObjectMedia(tenantId, graph),""",
)

# Add the buildObjectMedia helper before composeSite.
rep(
    """export async function composeSite(
  config: TenantRouteConfig,
): Promise<ComposedSite> {""",
    """/**
 * B4: per-object media record for the render context, keyed by object id.
 * Only objects with actual media get entries; the renderer treats a missing
 * key the same as an empty one (no media, never an invented image).
 */
function buildObjectMedia(
  tenantId: string,
  graph: ObjectGraph,
): Record<string, DisplayMedia[]> {
  const record: Record<string, DisplayMedia[]> = {};
  for (const o of graph.objects) {
    const media = listObjectMedia(tenantId, graph, o.id);
    if (media.length > 0) record[o.id] = media;
  }
  return record;
}

export async function composeSite(
  config: TenantRouteConfig,
): Promise<ComposedSite> {""",
)

open(p, "w").write(src)
print("compose-site.ts fixed")
PYEOF
npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
echo "TSC done"
