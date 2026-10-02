/**
 * FYD boundary-proof STEP 2: structural diff of the two SiteSpecs.
 *
 * Different name/description/strings alone do NOT count. Compares pages,
 * section ordering, component types, section query predicates/schemas,
 * object cardinality per role, relationship-driven sections, navigation,
 * featured objects, and content density.
 *
 * TRIPWIRE: structurally identical specs over materially different graphs
 * => FIRST BROKEN STEP: "SITE PLANNER IS TOO GENERIC." (exit code 2).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import { resolveQuery } from "@/fyd/components/renderer";
import { SCHEMA_ROLES } from "@/fyd/sitespec/schemas";
import type {
  ObjectGraph,
  FYDSiteSpec,
  FYDQuery,
} from "@/fyd/sitespec/types";

const REPO = "/home/nolan/projects/ping";
const OUT = "/home/nolan/fyd-proof-run";

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

interface SiteCfg {
  key: "happyPlace" | "coppersmith";
  slug: string;
  fixtureFile: string;
  exportName: string;
  generatedAt: string;
  eventSequences?: [number, number];
}

const SITES: SiteCfg[] = [
  {
    key: "happyPlace",
    slug: "happy-place-platform",
    fixtureFile: "happy-place-graph.ts",
    exportName: "HAPPY_PLACE_GRAPH",
    generatedAt: "2026-09-21T12:00:00.000Z",
    eventSequences: [65, 83],
  },
  {
    key: "coppersmith",
    slug: "coppersmith-plumbing",
    fixtureFile: "coppersmith-graph.ts",
    exportName: "COPPERSMITH_GRAPH",
    generatedAt: "2026-09-21T12:01:10.844Z",
  },
];

function roleOf(schema: string): string {
  for (const [role, schemas] of Object.entries(SCHEMA_ROLES)) {
    if ((schemas as string[]).includes(schema)) return role;
  }
  return "unknown:" + schema;
}

function sigSection(q: FYDQuery): {
  kind: string;
  predicates: string[];
  schemas: string[];
  limit: number | null;
} {
  if (q.kind === "related") {
    return {
      kind: q.kind,
      predicates: [...(q.predicates ?? [q.predicate])].sort(),
      schemas: [...(q.schemas ?? (q.schema ? [q.schema] : []))].sort(),
      limit: q.limit ?? null,
    };
  }
  if (q.kind === "all") {
    return {
      kind: q.kind,
      predicates: [],
      schemas: q.schema ? [q.schema] : [],
      limit: q.limit ?? null,
    };
  }
  return { kind: q.kind, predicates: [], schemas: [], limit: null };
}

interface PageSig {
  slug: string;
  sections: { component: string; query: ReturnType<typeof sigSection> }[];
}

function structuralSig(spec: FYDSiteSpec): PageSig[] {
  return spec.pages.map((p) => ({
    slug: p.slug,
    sections: p.sections.map((s) => ({
      component: s.component,
      query: sigSection(s.query),
    })),
  }));
}

function roleCardinality(graph: ObjectGraph): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of graph.objects) {
    const r = roleOf(o.schema);
    out[r] = (out[r] ?? 0) + 1;
  }
  return out;
}

function predicateCounts(graph: ObjectGraph): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of graph.relationships) {
    out[r.predicate] = (out[r.predicate] ?? 0) + 1;
  }
  return out;
}

function schemaSet(graph: ObjectGraph): string[] {
  return [...new Set(graph.objects.map((o) => o.schema))].sort();
}

interface SiteProfile {
  key: string;
  slug: string;
  specDigest: string;
  sig: PageSig[];
  navigation: { label: string; pageSlug: string }[];
  roleCardinality: Record<string, number>;
  predicateCounts: Record<string, number>;
  schemas: string[];
  objectCount: number;
  relationshipCount: number;
  sectionCount: number;
  resolvedCounts: Record<string, number>; // sectionId -> resolved object count
}

async function profile(cfg: SiteCfg): Promise<SiteProfile> {
  const mod = (await import(
    pathToFileURL(REPO + "/src/fyd/proceduralize/__fixtures__/" + cfg.fixtureFile).href
  )) as Record<string, unknown>;
  const graph = mod[cfg.exportName] as ObjectGraph;
  const spec = generateSiteSpec(graph, {
    generatedAt: cfg.generatedAt,
    ...(cfg.eventSequences ? { eventSequences: cfg.eventSequences } : {}),
  });
  const resolvedCounts: Record<string, number> = {};
  let sectionCount = 0;
  for (const p of spec.pages) {
    for (const s of p.sections) {
      sectionCount++;
      resolvedCounts[s.id] = resolveQuery(s.query, graph, spec.ownerObjectId).length;
    }
  }
  return {
    key: cfg.key,
    slug: cfg.slug,
    specDigest: sha256(stableStringify(spec)),
    sig: structuralSig(spec),
    navigation: spec.navigation,
    roleCardinality: roleCardinality(graph),
    predicateCounts: predicateCounts(graph),
    schemas: schemaSet(graph),
    objectCount: graph.objects.length,
    relationshipCount: graph.relationships.length,
    sectionCount,
    resolvedCounts,
  };
}

function diffLines(a: SiteProfile, b: SiteProfile): string[] {
  const lines: string[] = [];
  const A = a.key, B = b.key;

  // Pages
  const aPages = a.sig.map((p) => p.slug);
  const bPages = b.sig.map((p) => p.slug);
  for (const s of aPages) if (!bPages.includes(s)) lines.push("PAGE only in " + A + ": " + s);
  for (const s of bPages) if (!aPages.includes(s)) lines.push("PAGE only in " + B + ": " + s);

  // Sections per shared page
  for (const pa of a.sig) {
    const pb = b.sig.find((p) => p.slug === pa.slug);
    if (!pb) continue;
    const ca = pa.sections.map((s) => s.component);
    const cb = pb.sections.map((s) => s.component);
    if (JSON.stringify(ca) !== JSON.stringify(cb)) {
      lines.push(
        "SECTIONS differ on page '" + pa.slug + "': " + A + "=[" + ca.join(",") + "] " + B + "=[" + cb.join(",") + "]",
      );
    } else {
      for (let i = 0; i < pa.sections.length; i++) {
        const qa = JSON.stringify(pa.sections[i].query);
        const qb = JSON.stringify(pb.sections[i].query);
        if (qa !== qb) {
          lines.push(
            "QUERY differs on page '" + pa.slug + "' section " + pa.sections[i].component +
              ": " + A + "=" + qa + " " + B + "=" + qb,
          );
        }
      }
    }
  }

  // Role cardinality
  const roles = [...new Set([...Object.keys(a.roleCardinality), ...Object.keys(b.roleCardinality)])].sort();
  for (const r of roles) {
    const ca = a.roleCardinality[r] ?? 0;
    const cb = b.roleCardinality[r] ?? 0;
    if (ca !== cb) {
      lines.push("ROLE '" + r + "': " + A + "=" + ca + " " + B + "=" + cb);
    }
  }

  // Relationship predicates
  const preds = [...new Set([...Object.keys(a.predicateCounts), ...Object.keys(b.predicateCounts)])].sort();
  for (const p of preds) {
    const ca = a.predicateCounts[p] ?? 0;
    const cb = b.predicateCounts[p] ?? 0;
    if (ca !== cb) {
      lines.push("REL '" + p + "': " + A + "=" + ca + " " + B + "=" + cb);
    }
  }

  // Navigation
  if (JSON.stringify(a.navigation) !== JSON.stringify(b.navigation)) {
    lines.push(
      "NAV differs: " + A + "=[" + a.navigation.map((n) => n.pageSlug).join(",") + "] " +
        B + "=[" + b.navigation.map((n) => n.pageSlug).join(",") + "]",
    );
  }

  // Density
  if (a.sectionCount !== b.sectionCount) {
    lines.push("DENSITY sections: " + A + "=" + a.sectionCount + " " + B + "=" + b.sectionCount);
  }
  if (a.objectCount !== b.objectCount) {
    lines.push("DENSITY objects: " + A + "=" + a.objectCount + " " + B + "=" + b.objectCount);
  }
  return lines;
}

async function main(): Promise<void> {
  const step1 = JSON.parse(readFileSync(OUT + "/step1-report.json", "utf8")) as {
    deterministic: boolean;
  };
  if (!step1.deterministic) {
    throw new Error("STEP 2 blocked: step 1 reported nondeterminism");
  }
  const [hp, co] = await Promise.all(SITES.map(profile));

  const sigEqual = JSON.stringify(hp.sig) === JSON.stringify(co.sig);
  const rolesDiffer = JSON.stringify(hp.roleCardinality) !== JSON.stringify(co.roleCardinality);
  const predsDiffer = JSON.stringify(hp.predicateCounts) !== JSON.stringify(co.predicateCounts);
  const schemasDiffer = JSON.stringify(hp.schemas) !== JSON.stringify(co.schemas);
  const graphsMateriallyDifferent = rolesDiffer || predsDiffer || schemasDiffer || hp.objectCount !== co.objectCount;

  const differences = diffLines(hp, co);

  const step2: Record<string, unknown> = {
    step: 2,
    script: OUT + "/step2-diff.ts",
    structurallyIdentical: sigEqual,
    graphsMateriallyDifferent,
    happyPlace: hp,
    coppersmith: co,
    differences,
    verdict: "",
    tripwire: null as null | string,
  };

  if (sigEqual && graphsMateriallyDifferent) {
    step2.tripwire = "SITE PLANNER IS TOO GENERIC";
    step2.verdict = "TRIPWIRE";
    writeFinal(step1, step2);
    console.log("TRIPWIRE: structurally identical specs over materially different graphs.");
    console.log("FIRST BROKEN STEP: SITE PLANNER IS TOO GENERIC.");
    process.exit(2);
  }

  step2.verdict = differences.length > 0 ? "MATERIALLY DIFFERENT: YES" : "MATERIALLY DIFFERENT: NO";
  writeFinal(step1, step2);
  console.log("STEP 2 verdict: " + step2.verdict);
  for (const d of differences) console.log("  - " + d);
}

function writeFinal(step1: unknown, step2: unknown): void {
  const report = {
    generatedAt: new Date().toISOString(),
    step1,
    step2,
    step5: null as unknown,
  };
  writeFileSync(OUT + "/step1-2-5-report.json", JSON.stringify(report, null, 2), "utf8");
  console.log("REPORT: " + OUT + "/step1-2-5-report.json");
}

main().catch((e) => {
  console.error("STEP 2 FAILED: " + String(e));
  process.exit(1);
});
