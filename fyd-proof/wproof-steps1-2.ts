/**
 * W-PROOF STEP 1+2 (2026-09-24): regenerate both demo sites from the CURRENT
 * PING projection graphs through the repaired pipeline, record the boundary
 * report, then structural-diff the two specs with the existing diffSiteSpecs.
 *
 * Pipeline: projection (dump.py 1.2.1, JSONL-only) -> getPingObjectGraph
 * (digest-verified, fail-closed) -> generateSiteSpec (pinned generatedAt,
 * run TWICE, byte-identical assert) -> applyPresentationIntent (the exact
 * shared seam the served pages use) -> validateSiteSpec.
 *
 * No acquisition (frozen upstream), no hand edits, no customer conditionals.
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import { applyPresentationIntent } from "@/fyd/customize/apply-layer";
import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";
import { resolveQuery } from "@/fyd/components/renderer";
import { diffSiteSpecs } from "@/fyd/builder/structural-diff";
import type {
  ObjectGraph,
  FYDSiteSpec,
  FYDQuery,
} from "@/fyd/sitespec/types";

const REPO = "/home/nolan/projects/ping";
const OUT = "/home/nolan/fyd-proof-run";
const COMMIT = execSync("git rev-parse HEAD", {
  cwd: REPO,
  encoding: "utf8",
}).trim();

const sha256 = (d: string | Buffer): string =>
  createHash("sha256").update(d).digest("hex");

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const rec = v as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + stableStringify(rec[k])).join(",") +
    "}"
  );
}

function queryShape(q: FYDQuery): {
  kind: string;
  predicates: string[];
  schemas: string[];
} {
  if (q.kind === "related") {
    return {
      kind: q.kind,
      predicates: [...(q.predicates ?? [q.predicate])].sort(),
      schemas: [...(q.schemas ?? (q.schema ? [q.schema] : []))].sort(),
    };
  }
  if (q.kind === "all") {
    return {
      kind: q.kind,
      predicates: [],
      schemas: [...(q.schemas ?? (q.schema ? [q.schema] : []))].sort(),
    };
  }
  return { kind: q.kind, predicates: [], schemas: [] };
}

interface SectionReport {
  id: string;
  component: string;
  queryKind: string;
  predicates: string[];
  schemas: string[];
  resolvedObjectIds: string[];
}

interface SiteReport {
  siteId: string;
  pipelineCommit: string;
  dumperVersion: string;
  dumpedAt: string;
  generatedAt: string;
  eventSequences: [number, number] | null;
  graphDigestMeta: string;
  graphDigestRecomputed: string;
  sourceDigestBase: string;
  fixtureFileDigest: string;
  overlayEventIds: string[];
  deterministicRuns: boolean;
  objects: { id: string; schema: string; visibility: string; title: string }[];
  relationships: {
    id: string;
    subject: string;
    predicate: string;
    object: string;
    status: string;
  }[];
  specDigestPreIntent: string;
  specDigest: string;
  specPlannerVersion: string;
  specGeneratorVersion: string;
  archetype: string | null;
  navigation: { label: string; pageSlug: string }[];
  objectPresence: { mode: string; objects: string[] } | null;
  featuredIds: Record<string, string[]>;
  pages: {
    slug: string;
    title: string;
    navLabel: string;
    sections: SectionReport[];
  }[];
  contentDensity: Record<string, number>;
  validatorFindings: { severity: string; path: string; message: string }[];
  renderable: boolean;
}

async function runSite(siteId: string): Promise<{
  report: SiteReport;
  spec: FYDSiteSpec;
  graph: ObjectGraph;
}> {
  console.log("=== " + siteId + " ===");
  // getPingObjectGraph throws on missing/malformed/tampered projection and
  // on meta.graphDigest mismatch. This IS the digest-verified current graph.
  const { graph, meta, presentationIntent } = await getPingObjectGraph(siteId);

  const genOpts = {
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? undefined,
  };
  const base1 = generateSiteSpec(graph, genOpts);
  const base2 = generateSiteSpec(graph, genOpts);
  const pre1 = sha256(stableStringify(base1));
  const pre2 = sha256(stableStringify(base2));
  const deterministic = pre1 === pre2;
  if (!deterministic) {
    throw new Error("NON-DETERMINISTIC generateSiteSpec for " + siteId);
  }
  console.log("  determinism: PASS (pre-intent digest " + pre1.slice(0, 12) + ")");

  const withIntent = applyPresentationIntent(base1, presentationIntent, graph).spec;
  const specDigest = sha256(stableStringify(withIntent));
  const knownSchemas = new Set(graph.objects.map((o) => o.schema));
  const findings = validateSiteSpec(withIntent, knownSchemas);
  const renderable = isRenderable(findings);
  console.log("  renderable: " + renderable + " (findings " + findings.length + ")");

  const ownerId = withIntent.ownerObjectId;
  const pages = withIntent.pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    navLabel: p.navLabel,
    sections: p.sections.map((s): SectionReport => {
      const resolved = resolveQuery(s.query, graph, ownerId);
      const shape = queryShape(s.query);
      return {
        id: s.id,
        component: s.component,
        queryKind: shape.kind,
        predicates: shape.predicates,
        schemas: shape.schemas,
        resolvedObjectIds: resolved.map((o) => o.id),
      };
    }),
  }));

  const density: Record<string, number> = {};
  for (const p of pages) {
    for (const s of p.sections) {
      density[s.component] = (density[s.component] ?? 0) + s.resolvedObjectIds.length;
    }
  }
  const featured: Record<string, string[]> = {};
  for (const p of withIntent.pages) {
    for (const s of p.sections) {
      if (s.presentation.featuredIds && s.presentation.featuredIds.length > 0) {
        featured[p.slug + ":" + s.id] = [...s.presentation.featuredIds];
      }
    }
  }

  const report: SiteReport = {
    siteId,
    pipelineCommit: COMMIT,
    dumperVersion: meta.dumperVersion,
    dumpedAt: meta.dumpedAt,
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? null,
    graphDigestMeta: meta.graphDigest,
    graphDigestRecomputed: "verified-inside-getPingObjectGraph",
    sourceDigestBase: meta.baseDigest,
    fixtureFileDigest: meta.fixtureFileDigest,
    overlayEventIds: meta.overlayEventIds,
    deterministicRuns: deterministic,
    objects: graph.objects.map((o) => ({
      id: o.id,
      schema: o.schema,
      visibility: o.visibility,
      title: o.title,
    })),
    relationships: graph.relationships.map((r) => ({
      id: r.id,
      subject: r.subject,
      predicate: r.predicate,
      object: r.object,
      status: r.status ?? "active",
    })),
    specDigestPreIntent: pre1,
    specDigest,
    specPlannerVersion: withIntent.generator.version,
    specGeneratorVersion: withIntent.generator.version,
    archetype: withIntent.archetype ?? null,
    navigation: withIntent.navigation.map((n) => ({
      label: n.label,
      pageSlug: n.pageSlug,
    })),
    objectPresence: withIntent.objectPresence
      ? { mode: withIntent.objectPresence.mode, objects: [...withIntent.objectPresence.objects] }
      : null,
    featuredIds: featured,
    pages,
    contentDensity: density,
    validatorFindings: findings.map((f) => ({
      severity: f.severity,
      path: f.path,
      message: f.message,
    })),
    renderable,
  };
  return { report, spec: withIntent, graph };
}

async function main(): Promise<void> {
  const a = await runSite("happy-place");
  const b = await runSite("coppersmith-plumbing");

  const diff = diffSiteSpecs(a.spec, b.spec, {
    tenantA: "happy-place",
    tenantB: "coppersmith-plumbing",
    digestA: a.report.specDigest,
    digestB: b.report.specDigest,
    plannerVersion: a.report.specPlannerVersion,
  });

  const out = {
    worker: "W-PROOF",
    generatedAt: new Date().toISOString(),
    siteA: a.report,
    siteB: b.report,
    structuralDiff: diff,
  };
  writeFileSync(OUT + "/wproof-steps1-2.json", JSON.stringify(out, null, 2) + "\n");

  console.log("\n--- STRUCTURAL DIFF ---");
  console.log("pagesOnlyInA: " + JSON.stringify(diff.pagesOnlyInA));
  console.log("pagesOnlyInB: " + JSON.stringify(diff.pagesOnlyInB));
  for (const pd of diff.pageDiffs) {
    console.log(
      "page " + pd.pageSlug + " orderChanged=" + pd.orderChanged +
        " onlyInA=" + JSON.stringify(pd.onlyInA) +
        " onlyInB=" + JSON.stringify(pd.onlyInB),
    );
  }
  console.log("tokenDiffs: " + diff.tokenDiffs.length);
  console.log("presenceDiffs: " + JSON.stringify(diff.presenceDiffs));
  console.log("archetypeA=" + diff.archetypeA + " archetypeB=" + diff.archetypeB);
  console.log("materiallyDifferent=" + diff.materiallyDifferent);
  console.log("reasons: " + JSON.stringify(diff.materialReasons, null, 2));

  const objectsA = a.report.objects.length;
  const objectsB = b.report.objects.length;
  const relsA = a.report.relationships.length;
  const relsB = b.report.relationships.length;
  const materiallyDifferentGraphs = Math.abs(objectsA - objectsB) >= 1 || relsA !== relsB;
  if (materiallyDifferentGraphs && !diff.materiallyDifferent) {
    console.error(
      "TRIPWIRE: graphs differ (" + objectsA + " vs " + objectsB +
        " objects, " + relsA + " vs " + relsB + " rels) but specs are NOT materially different.",
    );
    console.error("NEW FIRST BROKEN STEP: SITE PLANNER IS TOO GENERIC");
    process.exit(2);
  }
  console.log("\nTRIPWIRE CHECK: OK");
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
