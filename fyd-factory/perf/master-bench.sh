#!/bin/bash
# FYD perf baseline master run. Runs builder bench (real fixtures), 50-service
# scaling probe, server TTFB + payload measurement. Read-only vs repo.
set -e
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

async function main(): Promise<void> {
const recs: RunRec[] = [];
// warmup (JIT) then measured runs
{
  const { graph } = await getPingObjectGraph(siteId);
  generateSiteSpec(graph, { generatedAt: new Date().toISOString(), eventSequences: null });
}

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
    heroMedia: hero ? { url: (hero as any).url ?? null, role: (hero as any).role ?? null, kind: (hero as any).kind ?? null, source: (hero as any).source ?? null } : null,
  });
}
console.log(JSON.stringify({ siteId, projectionDir: process.env.FYD_PROJECTION_DIR ?? "/home/nolan/ping/var/fyd-projections", runs: recs }, null, 1));
}

main().catch((e) => { console.error(e); process.exit(1); });
TSEOF
cat > ~/fyd-perf/make-50svc.ts <<'TSEOF'
/**
 * Synthesize a 50-service fixture copy of coppersmith-plumbing.
 * Clones service objects, recomputes graphDigest with the repo's canonicalize.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonicalize } from "@/lib/ping/ask-composer";

const SRC = "/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json";
const DESTDIR = "/home/nolan/fyd-perf/fixtures-50";
const TARGET = 50;

interface Obj { id: string; schema: string; title?: string; fields?: Record<string, unknown>; description?: string; createdAt?: string; [k: string]: unknown }
interface Rel { id: string; subject: string; predicate: string; object: string; status: string; createdAt?: string; evidenceRef?: string; [k: string]: unknown }

const proj = JSON.parse(readFileSync(SRC, "utf8"));
const g = proj.graph as { objects: Obj[]; relationships: Rel[] };
const business = g.objects.find((o) => o.schema === "ping.social.business@1")!;
const seeds = g.objects.filter((o) => o.schema === "ping.social.service@1");
let n = 0;
while (g.objects.filter((o) => o.schema === "ping.social.service@1").length < TARGET) {
  const seed = seeds[n % seeds.length];
  n += 1;
  const id = `${business.id}-service-50svc-${String(n).padStart(3, "0")}`;
  const clone: Obj = JSON.parse(JSON.stringify(seed));
  clone.id = id;
  clone.title = `Synthetic Service ${n}`;
  clone.fields = { ...(seed.fields ?? {}), name: `Synthetic Service ${n}`, service_href: `https://coppersmithplumbing.com/services/synthetic-${n}/` };
  clone.description = `Synthetic benchmark service ${n} (perf scaling probe, not a real service).`;
  g.objects.push(clone);
  g.relationships.push({
    id: `rel-50svc-${String(n).padStart(3, "0")}`,
    subject: business.id,
    predicate: "offers",
    object: id,
    status: "active",
    createdAt: seed.createdAt,
    evidenceRef: "perf-scaling-probe:synthetic-service",
  });
}
const digest = createHash("sha256").update(canonicalize(g)).digest("hex");
proj.meta.graphDigest = digest;
proj.meta.dumpedAt = new Date().toISOString();
mkdirSync(DESTDIR, { recursive: true });
writeFileSync(`${DESTDIR}/coppersmith-plumbing.json`, JSON.stringify(proj));
const svcCount = g.objects.filter((o) => o.schema === "ping.social.service@1").length;
console.log(JSON.stringify({ dest: `${DESTDIR}/coppersmith-plumbing.json`, objects: g.objects.length, relationships: g.relationships.length, services: svcCount, graphDigest: digest.slice(0, 16) + "..." }));
TSEOF
cat > ~/fyd-perf/srv-bench.sh <<'TSEOF'
#!/bin/bash
# Server render + payload benchmark. Runs INSIDE Pig WSL (needs localhost:3100).
# Usage: srv-bench.sh
set -e
BASE="http://localhost:3100"
OUT=~/fyd-perf/srv
mkdir -p "$OUT"
for SITE in coppersmith-plumbing happy-place; do
  URL="$BASE/sites/$SITE"
  # warmup (route compile)
  curl -s -o /dev/null --max-time 60 "$URL"
  # TTFB: 10 samples, time_starttransfer in ms
  : > "$OUT/ttfb-$SITE.txt"
  for i in $(seq 1 10); do
    curl -s -o /dev/null --max-time 60 -w '%{time_starttransfer}\n' "$URL" >> "$OUT/ttfb-$SITE.txt"
    sleep 1
  done
  # full HTML
  curl -s --max-time 60 "$URL" -o "$OUT/page-$SITE.html"
  echo "SITE=$SITE html_bytes=$(stat -c%s "$OUT/page-$SITE.html")"
  # asset URLs
  grep -oE 'src="[^"]+"' "$OUT/page-$SITE.html" | sed 's/^src="//;s/"$//' | grep '^/' | grep -v '^//$' | sort -u > "$OUT/scripts-$SITE.txt" || true
  grep -oE 'href="[^"]+\.css[^"]*"' "$OUT/page-$SITE.html" | sed 's/^href="//;s/"$//' | grep '^/' | sort -u > "$OUT/css-$SITE.txt" || true
  grep -oE '<link[^>]*rel="stylesheet"[^>]*>' "$OUT/page-$SITE.html" | grep -oE 'href="[^"]+"' | sed 's/^href="//;s/"$//' | grep '^/' | sort -u >> "$OUT/css-$SITE.txt" || true
  # image urls (img src + srcset first entries)
  grep -oE '<img[^>]*>' "$OUT/page-$SITE.html" | grep -oE 'src="[^"]+"' | sed 's/^src="//;s/"$//' | sort -u > "$OUT/imgs-$SITE.txt" || true
  grep -oE 'srcset="[^"]+"' "$OUT/page-$SITE.html" | sed 's/^srcset="//;s/"$//' | tr ',' '\n' | awk '{print $1}' | sort -u >> "$OUT/imgs-$SITE.txt" || true
  sort -u "$OUT/imgs-$SITE.txt" -o "$OUT/imgs-$SITE.txt" || true
done
echo DONE
ls -la "$OUT"
TSEOF
chmod +x ~/fyd-perf/srv-bench.sh
cd /home/nolan/projects/ping
RUNS=5
echo "===BUILDER-REAL-coppersmith-plumbing"
./node_modules/.bin/tsx --tsconfig tsconfig.json ~/fyd-perf/bench.ts coppersmith-plumbing $RUNS
echo "===BUILDER-REAL-happy-place"
./node_modules/.bin/tsx --tsconfig tsconfig.json ~/fyd-perf/bench.ts happy-place $RUNS
echo "===MAKE-50SVC"
./node_modules/.bin/tsx --tsconfig tsconfig.json ~/fyd-perf/make-50svc.ts
echo "===BUILDER-50SVC-coppersmith-plumbing"
FYD_PROJECTION_DIR=/home/nolan/fyd-perf/fixtures-50 ./node_modules/.bin/tsx --tsconfig tsconfig.json ~/fyd-perf/bench.ts coppersmith-plumbing $RUNS
echo "===SERVER-BENCH"
bash ~/fyd-perf/srv-bench.sh
echo "===PAYLOADS"
for SITE in coppersmith-plumbing happy-place; do
  D=~/fyd-perf/srv; B=http://localhost:3100
  HTMLB=$(stat -c%s "$D/page-$SITE.html")
  JSB=0; JSN=0
  while IFS= read -r u; do [ -z "$u" ] && continue
    uu="$B${u%%\?*}"
    if curl -s --max-time 30 -o "$D/asset.bin" "$uu"; then JSB=$((JSB + $(stat -c%s "$D/asset.bin"))); JSN=$((JSN+1)); fi
  done < "$D/scripts-$SITE.txt"
  CSSB=0; CSSN=0
  while IFS= read -r u; do [ -z "$u" ] && continue
    uu="$B${u%%\?*}"
    if curl -s --max-time 30 -o "$D/asset.bin" "$uu"; then CSSB=$((CSSB + $(stat -c%s "$D/asset.bin"))); CSSN=$((CSSN+1)); fi
  done < "$D/css-$SITE.txt"
  INLINECSS=$(grep -oE '<style[^>]*>' "$D/page-$SITE.html" | wc -l)
  IMGB=0; IMGN=0; EXT=0
  while IFS= read -r u; do [ -z "$u" ] && continue; IMGN=$((IMGN+1))
    case "$u" in
      http://localhost*|https://localhost*) uu="$u";;
      /*) uu="$B$u";;
      http*|https*) EXT=$((EXT+1)); continue;;
      data:*) continue;;
      *) continue;;
    esac
    if curl -s --max-time 30 -o "$D/asset.bin" "$uu"; then IMGB=$((IMGB + $(stat -c%s "$D/asset.bin"))); fi
  done < "$D/imgs-$SITE.txt"
  echo "PAYLOAD site=$SITE html_bytes=$HTMLB js_files=$JSN js_bytes=$JSB css_files=$CSSN css_bytes=$CSSB inline_style_blocks=$INLINECSS img_tags=$IMGN local_img_bytes=$IMGB external_imgs=$EXT"
done
echo "===TTFB-SUMMARY"
for SITE in coppersmith-plumbing happy-place; do
  echo "--- ttfb $SITE (ms):"; tr '\n' ' ' < ~/fyd-perf/srv/ttfb-$SITE.txt; echo
done
echo "===IMG-LISTS"
for SITE in coppersmith-plumbing happy-place; do echo "--- imgs $SITE:"; cat ~/fyd-perf/srv/imgs-$SITE.txt; done
echo "===SCRIPT-LISTS"
for SITE in coppersmith-plumbing happy-place; do echo "--- scripts $SITE:"; cat ~/fyd-perf/srv/scripts-$SITE.txt; echo "--- css $SITE:"; cat ~/fyd-perf/srv/css-$SITE.txt; done
