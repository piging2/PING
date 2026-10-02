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
