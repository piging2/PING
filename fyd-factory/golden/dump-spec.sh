#!/bin/bash
mkdir -p /home/nolan/fyd-golden-scratch
cat > /home/nolan/fyd-golden-scratch/dump-hpp-spec.ts <<'TSEOF'
import { getPingObjectGraph } from "/home/nolan/projects/ping/src/fyd/data/ping-object-source";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { applyPresentationIntent } from "/home/nolan/projects/ping/src/fyd/customize/apply-layer";
import { heroMediaFor } from "/home/nolan/projects/ping/src/fyd/media/select";
import { validateSiteSpec, isRenderable } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";

async function main() {
  const { graph, meta, presentationIntent } = await getPingObjectGraph("happy-place");
  const base = generateSiteSpec(graph, {
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? undefined,
  });
  const spec = applyPresentationIntent(base, presentationIntent, graph).spec;
  const heroMedia = heroMediaFor("happy-place", graph, spec.ownerObjectId);
  const knownSchemas = new Set(graph.objects.map((o) => o.schema));
  const findings = validateSiteSpec(spec, knownSchemas);
  const out = {
    ownerObjectId: spec.ownerObjectId,
    archetype: spec.archetype ?? null,
    status: spec.status ?? null,
    revision: spec.revision ?? null,
    graphObjectCount: graph.objects.length,
    graphSchemas: [...knownSchemas].sort(),
    navigation: spec.navigation,
    pages: spec.pages.map((p) => ({
      slug: p.slug, title: p.title, navLabel: p.navLabel,
      sections: p.sections.map((s) => ({ id: s.id, component: s.component, queryKind: s.query.kind, presentation: s.presentation })),
    })),
    themeTokens: spec.themeTokens,
    objectPresence: spec.objectPresence ?? null,
    heroMedia: heroMedia ? { id: heroMedia.id, alt: heroMedia.alt, width: heroMedia.width, height: heroMedia.height } : null,
    presentationIntent,
    findings: findings.map((f) => ({ severity: f.severity, path: f.path, message: f.message })),
    renderable: isRenderable(findings),
  };
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error("DUMP_FAILED", e); process.exit(1); });
TSEOF
cd /home/nolan/projects/ping
./node_modules/.bin/tsx --tsconfig /home/nolan/projects/ping/tsconfig.json /home/nolan/fyd-golden-scratch/dump-hpp-spec.ts > /home/nolan/fyd-golden-scratch/hpp-spec.json 2>/home/nolan/fyd-golden-scratch/dump.err
echo "exit=$?"
wc -c /home/nolan/fyd-golden-scratch/hpp-spec.json
head -c 400 /home/nolan/fyd-golden-scratch/dump.err
