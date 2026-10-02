/**
 * F5-CEILING fingerprint experiment.
 * Runs the REAL production composition path (strategyForSite -> planSite)
 * over materially different graphs, then fingerprints each SiteSpec.
 * Deterministic: fixed generatedAt, no randomness, canonical JSON hashing.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { planSite } from "/home/nolan/projects/ping/src/fyd/builder/planner";
import { withTenantContext } from "/home/nolan/projects/ping/src/fyd/tenant/tenant-context";
import { strategyForSite } from "/home/nolan/projects/ping/src/fyd/builder/strategy-for-site";
import { inferStrategy } from "/home/nolan/projects/ping/src/fyd/builder/infer-strategy";
import { policyForVector, nearestPresetName } from "/home/nolan/projects/ping/src/fyd/builder/dimensions";
import { deriveEligibility } from "/home/nolan/projects/ping/src/fyd/builder/eligibility";
import { schemaRole } from "/home/nolan/projects/ping/src/fyd/sitespec/schemas";
import { COPPERSMITH_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph";
import { HAPPY_PLACE_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph";
import { HAPPY_PLACE_RICH_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-rich-graph";
import type { ObjectGraph } from "/home/nolan/projects/ping/src/fyd/sitespec/types";

const REPO = "/home/nolan/projects/ping";
const OUT = "/home/hatch/workspace/fyd-factory/ceiling";
const STAMP = "2026-09-23T00:00:00.000Z";

function canon(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (typeof v === "object") {
    const keys = Object.keys(v as Record<string, unknown>).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canon((v as Record<string, unknown>)[k])).join(",") + "}";
  }
  return "null";
}
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function loadProjection(path: string): ObjectGraph {
  const d = JSON.parse(readFileSync(path, "utf8"));
  return d.graph as ObjectGraph;
}

interface SiteInput { key: string; siteId: string; graph: ObjectGraph; note: string; }

const SITES: SiteInput[] = [
  { key: "coppersmith-fixture", siteId: "coppersmith-plumbing", graph: COPPERSMITH_GRAPH, note: "trades fixture: emergency-capable plumber" },
  { key: "coppersmith-projection", siteId: "coppersmith-plumbing", graph: loadProjection("/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json"), note: "trades production projection" },
  { key: "happyplace-fixture", siteId: "happy-place", graph: HAPPY_PLACE_GRAPH, note: "hospitality fixture: coffee shop" },
  { key: "happyplace-rich-fixture", siteId: "happy-place", graph: HAPPY_PLACE_RICH_GRAPH, note: "hospitality rich fixture" },
  { key: "happyplace-projection", siteId: "happy-place", graph: loadProjection("/home/nolan/ping/var/fyd-projections/happy-place.json"), note: "hospitality production projection (known-good site)" },
  { key: "ping-fyd", siteId: "ping-fyd", graph: loadProjection("/home/nolan/ping/var/fyd-projections/ping-fyd.json"), note: "dogfood: AI consultancy" },
  { key: "objtest-coppersmith", siteId: "coppersmith-plumbing", graph: loadProjection(REPO + "/src/fyd/object/__tests__/fixtures/projections/coppersmith-plumbing.json"), note: "F2-era test projection" },
  { key: "objtest-happyplace", siteId: "happy-place", graph: loadProjection(REPO + "/src/fyd/object/__tests__/fixtures/projections/happy-place.json"), note: "F2-era test projection" },
];

// ---- SUCCESS TEST: identity swap through structured data ----
function identitySwap(base: ObjectGraph): ObjectGraph {
  const g: ObjectGraph = JSON.parse(JSON.stringify(base));
  const owner = g.objects.find((o) => schemaRole(o.schema) === "business" && o.visibility === "public");
  if (!owner) throw new Error("no owner for identity swap");
  owner.title = "Desert Bloom Landscaping";
  owner.description = "Desert Bloom Landscaping designs and maintains water-wise yards across the Grand Valley.";
  owner.fields = {
    ...owner.fields,
    phone: "+1 (970) 555-0164",
    locality: "Fruita",
    serviceArea: "Fruita, Loma, Mack",
    website: "https://desert-bloom-landscaping.example.com",
  };
  return g;
}
SITES.push({
  key: "happyplace-identity-swap", siteId: "happy-place",
  graph: identitySwap(loadProjection("/home/nolan/ping/var/fyd-projections/happy-place.json")),
  note: "SUCCESS TEST: same IA as happyplace-projection, different business identity via structured fields",
});

interface SiteResult {
  key: string; siteId: string; note: string;
  ok: boolean; error?: string;
  strategy?: string; strategyReasons?: string[];
  vector?: Record<string, number>;
  fingerprint?: Record<string, unknown>;
  fingerprintHash?: string;
  ia?: Record<string, unknown>;
  heroTagline?: string | null;
}

function iaDescriptor(graph: ObjectGraph): Record<string, unknown> {
  const roles: Record<string, number> = { business: 0, service: 0, product: 0, location: 0, person: 0, post: 0, article: 0, other: 0 };
  for (const o of graph.objects ?? []) {
    const r = schemaRole(o.schema);
    if (r && r in roles) roles[r]++; else roles.other++;
  }
  const preds: Record<string, number> = {};
  for (const r of graph.relationships ?? []) {
    if (r.status !== "active") continue;
    preds[r.predicate] = (preds[r.predicate] ?? 0) + 1;
  }
  const elig = deriveEligibility(graph);
  const owner = graph.objects.find((o) => schemaRole(o.schema) === "business" && o.visibility === "public");
  return {
    nObjects: graph.objects.length,
    nRelationships: (graph.relationships ?? []).length,
    roles, predicates: preds,
    eligibilityCounts: elig.counts,
    ownerFields: owner ? Object.keys(owner.fields ?? {}).sort() : [],
    ownerTitle: owner?.title ?? null,
  };
}

const results: SiteResult[] = [];
for (const s of SITES) {
  const r: SiteResult = { key: s.key, siteId: s.siteId, note: s.note, ok: false };
  try {
    const strategy = strategyForSite(s.siteId, s.graph);
    const inference = inferStrategy(s.graph);
    const planned = withTenantContext({ tenantId: s.siteId }, () =>
      planSite({ ctx: { tenantId: s.siteId }, graph: s.graph, vector: strategy.vector, generatedAt: STAMP }),
    );
    const spec = planned.spec;
    const policy = policyForVector(strategy.vector);
    const fp = {
      pages: spec.pages.map((p) => ({ slug: p.slug, navLabel: p.navLabel, components: p.sections.map((x) => x.component) })),
      nav: spec.navigation,
      policy: {
        ctaEmphasis: policy.ctaEmphasis, density: policy.density,
        mediaTreatment: policy.mediaTreatment, presenceMode: policy.presenceMode,
        maxSectionsPerPage: policy.maxSectionsPerPage,
        typography: policy.typography, radius: policy.radius,
      },
      presence: spec.objectPresence ? { mode: spec.objectPresence.mode, count: spec.objectPresence.objects.length } : null,
      archetype: spec.archetype,
    };
    r.ok = true;
    r.strategy = strategy.name;
    r.strategyReasons = inference.reasons;
    r.vector = Object.fromEntries(Object.entries(strategy.vector).map(([k, v]) => [k, Math.round(v * 1000) / 1000]));
    r.fingerprint = fp;
    r.fingerprintHash = sha(canon(fp));
    r.ia = iaDescriptor(s.graph);
    const heroSlot = planned.generatedPresentation.slots.find((x) => x.slotId === "hero-tagline");
    r.heroTagline = heroSlot ? heroSlot.text : null;
  } catch (e) {
    r.error = e instanceof Error ? e.message : String(e);
  }
  results.push(r);
}

// ---- pairwise similarity ----
function lev(a: string[], b: string[]): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a), sb = new Set(b);
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 1 : inter / union;
}
interface Pair { a: string; b: string; seqA: string[]; seqB: string[]; exactSequence: boolean; seqSim: number; setJaccard: number; policyMatch: number; composite: number; iaNote: string; }
const pairs: Pair[] = [];
const okSites = results.filter((r) => r.ok);
for (let i = 0; i < okSites.length; i++) {
  for (let j = i + 1; j < okSites.length; j++) {
    const A = okSites[i], B = okSites[j];
    const seqA = ((A.fingerprint!.pages as { components: string[] }[])[0]?.components ?? []) as string[];
    const seqB = ((B.fingerprint!.pages as { components: string[] }[])[0]?.components ?? []) as string[];
    const maxLen = Math.max(seqA.length, seqB.length, 1);
    const seqSim = 1 - lev(seqA, seqB) / maxLen;
    const setJ = jaccard(seqA, seqB);
    const pa = A.fingerprint!.policy as Record<string, unknown>;
    const pb = B.fingerprint!.policy as Record<string, unknown>;
    const keys = Object.keys(pa);
    const policyMatch = keys.filter((k) => canon(pa[k]) === canon(pb[k])).length / keys.length;
    const iaA = A.ia as { roles: Record<string, number>; eligibilityCounts: Record<string, number | boolean> };
    const iaB = B.ia as { roles: Record<string, number>; eligibilityCounts: Record<string, number | boolean> };
    const roleDiff = Object.keys(iaA.roles).filter((k) => iaA.roles[k] !== iaB.roles[k]);
    pairs.push({
      a: A.key, b: B.key, seqA, seqB,
      exactSequence: canon(seqA) === canon(seqB),
      seqSim: Math.round(seqSim * 1000) / 1000,
      setJaccard: Math.round(setJ * 1000) / 1000,
      policyMatch: Math.round(policyMatch * 1000) / 1000,
      composite: Math.round((0.5 * seqSim + 0.3 * setJ + 0.2 * policyMatch) * 1000) / 1000,
      iaNote: "roles differ: " + (roleDiff.length ? roleDiff.map((k) => `${k} ${iaA.roles[k]}v${iaB.roles[k]}`).join(", ") : "none") +
        "; strategy " + A.strategy + " v " + B.strategy,
    });
  }
}
pairs.sort((x, y) => y.composite - x.composite);

const payload = JSON.stringify({ generatedAt: STAMP, sites: results, pairs }, null, 2);
// Logs go to stderr; the ONLY stdout is the JSON payload, captured by the caller.
for (const r of results) {
  console.error((r.ok ? "OK  " : "FAIL") + " " + r.key + " strategy=" + r.strategy + " fp=" + (r.fingerprintHash ?? "").slice(0, 12) + (r.error ? " err=" + r.error : ""));
}
console.error("---- top pairs by composite similarity ----");
for (const p of pairs.slice(0, 12)) {
  console.error(p.composite.toFixed(3) + " exact=" + p.exactSequence + " " + p.a + " ~ " + p.b + " | " + p.iaNote);
}
process.stdout.write(payload + "\n");
