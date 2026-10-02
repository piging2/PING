#!/bin/bash
# DEHPP fidelity replay: runs the NEW composeSite seam (not the old inline
# page.tsx) against the recorded golden proof inputs, then canonically
# compares the composed spec against golden/evidence/hpp-composed-spec.json.
set -e
cd /home/nolan/fyd-dehpp-wt
mkdir -p /tmp/dehpp
cat > /tmp/dehpp/replay-dehpp.ts <<'TSEOF'
import { composeSite } from "@/app/sites/_shared/compose-site";
import { HAPPY_PLACE_COMPOSITION } from "@/app/sites/happy-place/composition";
import { isRenderable } from "@/fyd/sitespec/validator";

async function main() {
  const site = await composeSite(HAPPY_PLACE_COMPOSITION);
  const spec = site.spec;
  const knownSchemas = new Set(site.graph.objects.map((o) => o.schema));
  const out = {
    ownerObjectId: spec.ownerObjectId,
    archetype: spec.archetype ?? null,
    status: spec.status ?? null,
    revision: spec.revision ?? null,
    graphObjectCount: site.graph.objects.length,
    graphSchemas: [...knownSchemas].sort(),
    navigation: spec.navigation,
    pages: spec.pages.map((p) => ({
      slug: p.slug, title: p.title, navLabel: p.navLabel,
      sections: p.sections.map((s) => ({ id: s.id, component: s.component, queryKind: s.query.kind, presentation: s.presentation })),
    })),
    themeTokens: spec.themeTokens,
    objectPresence: spec.objectPresence ?? null,
    heroMedia: site.heroMedia
      ? { id: site.heroMedia.id, alt: site.heroMedia.alt, width: site.heroMedia.width, height: site.heroMedia.height }
      : null,
    presentationIntent: site.presentationIntent,
    findings: site.findings.map((f) => ({ severity: f.severity, path: f.path, message: f.message })),
    renderable: site.renderable,
  };
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error("REPLAY_FAILED", e); process.exit(1); });
TSEOF
export FYD_PROJECTION_DIR=/home/nolan/ping/var/fyd-projections
export FYD_OWNER_DIR=/home/nolan/projects/ping/data/fyd-owner
export FYD_CHROME_MODE=customer
node_modules/.bin/tsx --tsconfig tsconfig.json /tmp/dehpp/replay-dehpp.ts > /tmp/dehpp/dehpp-spec.json 2>/tmp/dehpp/replay.err
echo "exit=$?"
wc -c /tmp/dehpp/dehpp-spec.json
head -c 400 /tmp/dehpp/replay.err
