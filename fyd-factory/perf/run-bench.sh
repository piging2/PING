#!/bin/bash
# Builder benchmark wrapper: embeds bench.ts, writes to WSL-visible dir, runs tsx.
mkdir -p ~/fyd-perf
cat > ~/fyd-perf/bench.ts <<'TSEOF'
/**
 * FYD builder pipeline benchmark. Run with tsx from repo root.
 * Times: projection load+verify+overlay -> generateSiteSpec -> heroMediaFor -> validateSiteSpec.
 * Env: FYD_PROJECTION_DIR (defaults to /home/nolan/ping/var/fyd-projections).
 * Usage: tsx bench.ts <siteId> <runs> [--json-lines]
 */
import { performance } from "node:perf_hooks";
import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import { validateSiteSpec, isRenderable } from "@/fyd/sitespec/validator";
import { heroMediaFor } from "@/fyd/media/select";

const siteId = process.argv[2];
const runs = parseInt(process.argv[3] ?? "5", 10);

interface RunRec {
  loadVerifyMs: number;
  generateMs: number;
  heroMediaMs: number;
  validateMs: number;
  totalMs: number;
  objects: number;
  relationships: number;
  specPages: number;
  specBytes: number;
  renderable: boolean;
  heroMedia: string | null;
}

const recs: RunRec[] = [];
// warmup (JIT) then measured runs
await (async () => {
  const { graph } = await getPingObjectGraph(siteId);
  generateSiteSpec(graph, { generatedAt: new Date().toISOString(), eventSequences: null });
})();

for (let i = 0; i < runs; i++) {
  const t0 = performance.now();
  const { graph, meta } = await getPingObjectGraph(siteId);
  const t1 = performance.now();
  const spec = generateSiteSpec(graph, {
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? undefined,
  });
  const t2 = performance.now();
  const hero = heroMediaFor(siteId, graph, spec.ownerObjectId);
  const t3 = performance.now();
  const knownSchemas = new Set(graph.objects.map((o) => o.schema));
  const findings = validateSiteSpec(spec, knownSchemas);
  const renderable = isRenderable(findings);
  const t4 = performance.now();
  recs.push({
    loadVerifyMs: +(t1 - t0).toFixed(2),
    generateMs: +(t2 - t1).toFixed(2),
    heroMediaMs: +(t3 - t2).toFixed(2),
    validateMs: +(t4 - t3).toFixed(2),
    totalMs: +(t4 - t0).toFixed(2),
    objects: graph.objects.length,
    relationships: graph.relationships.length,
    specPages: spec.pages.length,
    specBytes: Buffer.byteLength(JSON.stringify(spec), "utf8"),
    renderable,
    heroMedia: hero ? String(hero.url ?? hero) : null,
  });
}
console.log(JSON.stringify({ siteId, projectionDir: process.env.FYD_PROJECTION_DIR ?? "/home/nolan/ping/var/fyd-projections", runs: recs }, null, 1));
TSEOF
cd /home/nolan/projects/ping
SITE="$1"; RUNS="${2:-5}"
if [ -n "$3" ]; then export FYD_PROJECTION_DIR="$3"; fi
./node_modules/.bin/tsx --tsconfig tsconfig.json ~/fyd-perf/bench.ts "$SITE" "$RUNS"
