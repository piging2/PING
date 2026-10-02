/**
 * FYD boundary-proof STEP 1: regenerate both graph fixtures from scratch.
 *
 * Reads pinned raw bytes, runs the repaired runExtractionPipeline TWICE per
 * site (byte-identical assert), machine-writes the two fixture TS files,
 * compiles both SiteSpecs, validates them, and records the full boundary
 * report at /home/nolan/fyd-proof-run/step1-report.json.
 *
 * Determinism inputs are pinned: OBSERVED_AT, CONTROLLER, per-site
 * generatedAt/eventSequences. Wall-clock is never read.
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  runExtractionPipeline,
  type AcquiredSource,
} from "@/fyd/proceduralize/proceduralizer";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";
import { resolveQuery } from "@/fyd/components/renderer";
import type {
  ObjectGraph,
  FYDSiteSpec,
  FYDQuery,
} from "@/fyd/sitespec/types";

const REPO = "/home/nolan/projects/ping";
const RAW_DIR = REPO + "/src/fyd/proceduralize/raw";
const FIXTURE_DIR = REPO + "/src/fyd/proceduralize/__fixtures__";
const OUT_DIR = "/home/nolan/fyd-proof-run";
const SCRIPT_PATH = OUT_DIR + "/regen.ts";

const OBSERVED_AT = "2026-09-21T13:50:00Z"; // fixed pin; wall-clock never read
const CONTROLLER = "identity_fyd_compiler_test";
const GIT_COMMIT = execSync("git rev-parse HEAD", {
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

interface FileSpec {
  name: string;
  sourceType: AcquiredSource["sourceType"];
}

interface SiteConfig {
  slug: string;
  title: string;
  fixtureFile: string;
  exportName: string;
  canonicalUrl: string;
  files: FileSpec[];
  generatedAt: string;
  eventSequences?: [number, number];
}

const SITES: SiteConfig[] = [
  {
    slug: "happy-place-platform",
    title: "Happy Place",
    fixtureFile: "happy-place-graph.ts",
    exportName: "HAPPY_PLACE_GRAPH",
    canonicalUrl: "https://happy-place-platform.vercel.app/",
    files: [{ name: "index.html", sourceType: "html" }],
    generatedAt: "2026-09-21T12:00:00.000Z",
    eventSequences: [65, 83],
  },
  {
    slug: "coppersmith-plumbing",
    title: "Coppersmith Plumbing & HVAC",
    fixtureFile: "coppersmith-graph.ts",
    exportName: "COPPERSMITH_GRAPH",
    canonicalUrl: "https://www.coppersmithplumbing.com/",
    files: [
      { name: "index.html", sourceType: "html" },
      { name: "rss.xml", sourceType: "rss" },
      { name: "sitemap.xml", sourceType: "sitemap" },
    ],
    generatedAt: "2026-09-21T12:01:10.844Z",
  },
];

function queryShape(q: FYDQuery): {
  kind: string;
  predicates: string[];
  schemas: string[];
  limit?: number;
} {
  if (q.kind === "related") {
    const out: { kind: string; predicates: string[]; schemas: string[]; limit?: number } = {
      kind: q.kind,
      predicates: [...(q.predicates ?? [q.predicate])].sort(),
      schemas: [...(q.schemas ?? (q.schema ? [q.schema] : []))].sort(),
    };
    if (q.limit !== undefined) out.limit = q.limit;
    return out;
  }
  if (q.kind === "all") {
    const out: { kind: string; predicates: string[]; schemas: string[]; limit?: number } = {
      kind: q.kind,
      predicates: [],
      schemas: q.schema ? [q.schema] : [],
    };
    if (q.limit !== undefined) out.limit = q.limit;
    return out;
  }
  return { kind: q.kind, predicates: [], schemas: [] };
}

function firstDiff(a: string, b: string): string {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      return (
        "first diff at char " + i + ": run1=" +
        JSON.stringify(a.slice(i, i + 120)) + " run2=" +
        JSON.stringify(b.slice(i, i + 120))
      );
    }
  }
  return "lengths differ: " + a.length + " vs " + b.length;
}

interface SiteReport {
  slug: string;
  canonicalUrl: string;
  observedAt: string;
  controllerId: string;
  pipelineCommit: string;
  generatedAt: string;
  eventSequences: [number, number] | null;
  sourceDigest: string;
  sourceFiles: { name: string; sourceType: string; url: string; bytes: number; digest: string }[];
  acquiredUrls: string[];
  deterministicRuns: boolean;
  factsDiscovered: number;
  factsByClass: Record<string, number>;
  factsBySource: Record<string, number>;
  objectsGenerated: number;
  relationshipsGenerated: number;
  privateWithheld: number;
  unsupportedCount: number;
  objects: { id: string; schema: string; title: string; fieldNames: string[] }[];
  relationships: { id: string; subject: string; predicate: string; object: string; status: string }[];
  fixturePath: string;
  specDigest: string;
  navigation: { label: string; pageSlug: string }[];
  pages: {
    slug: string;
    title: string;
    sections: {
      id: string;
      component: string;
      queryKind: string;
      predicates: string[];
      schemas: string[];
      limit?: number;
      resolvedObjectIds: string[];
    }[];
  }[];
  validatorFindings: { severity: string; path: string; message: string }[];
  renderable: boolean;
  smokeOk: boolean;
  smokeSpecDigest: string;
}

async function runSite(cfg: SiteConfig): Promise<SiteReport> {
  console.log("=== " + cfg.slug + " ===");
  const files = cfg.files.map((f) => {
    const bytes = readFileSync(RAW_DIR + "/" + cfg.slug + "/" + f.name);
    return { ...f, bytes, digest: sha256(bytes) };
  });
  for (const f of files) {
    console.log("  raw " + f.name + ": " + f.bytes.length + " bytes sha256=" + f.digest);
  }
  const sourceDigest = sha256(Buffer.concat(files.map((f) => f.bytes)));
  console.log("  source digest: " + sourceDigest);

  const acquired: AcquiredSource[] = files.map((f) => ({
    url: f.name === "index.html" ? cfg.canonicalUrl : cfg.canonicalUrl + f.name,
    sourceType: f.sourceType,
    discoveredAt: OBSERVED_AT,
    raw: f.bytes.toString("utf8"),
    ok: true,
    status: 200,
  }));

  const opts = {
    sourceUrl: cfg.canonicalUrl,
    observedAt: OBSERVED_AT,
    controllerId: CONTROLLER,
  };
  const run1 = await runExtractionPipeline(acquired, opts);
  const run2 = await runExtractionPipeline(acquired, opts);

  const g1 = JSON.stringify({
    objects: run1.graph.objects,
    relationships: run1.graph.relationships,
  });
  const g2 = JSON.stringify({
    objects: run2.graph.objects,
    relationships: run2.graph.relationships,
  });
  const r1 = JSON.stringify(run1.report);
  const r2 = JSON.stringify(run2.report);
  const graphsIdentical = g1 === g2;
  const reportsIdentical = r1 === r2;
  console.log("  determinism: graphs byte-identical=" + graphsIdentical + " reports byte-identical=" + reportsIdentical);
  if (!graphsIdentical || !reportsIdentical) {
    throw new Error(
      "NONDETERMINISM in " + cfg.slug + ": " +
        (!graphsIdentical ? firstDiff(g1, g2) : "") +
        (!reportsIdentical ? " REPORT: " + firstDiff(r1, r2) : ""),
    );
  }

  const graph: ObjectGraph = {
    objects: run1.graph.objects,
    relationships: run1.graph.relationships,
  };

  const fixtureBody =
    "/**\n" +
    " * " + cfg.title + " graph fixture: MACHINE-GENERATED, not hand-written.\n" +
    " *\n" +
    " * Script: " + SCRIPT_PATH + "\n" +
    " * Timestamp pin: " + OBSERVED_AT + "\n" +
    " * Pipeline git commit: " + GIT_COMMIT + "\n" +
    " * Source: " + cfg.canonicalUrl + "\n" +
    " * Source digest (sha256 over pinned raw bytes, file order: " +
    files.map((f) => f.name).join(", ") + "): " + sourceDigest + "\n" +
    " * Source files:\n" +
    files
      .map((f) => " *   " + f.name + " (" + f.sourceType + ", " + f.bytes.length + " bytes, sha256 " + f.digest + ")")
      .join("\n") +
    "\n" +
    " * observedAt: " + OBSERVED_AT + "\n" +
    " * controllerId: " + CONTROLLER + "\n" +
    " *\n" +
    " * Every claim is labeled website_statement: claimed by the website, never\n" +
    " * verified fact. Do not hand-edit; regenerate with the script above.\n" +
    " */\n" +
    "\n" +
    'import type { ObjectGraph } from "../../sitespec/types";\n' +
    "\n" +
    "export const " + cfg.exportName + ": ObjectGraph = " +
    JSON.stringify(graph, null, 2) +
    ";\n";

  const fixturePath = FIXTURE_DIR + "/" + cfg.fixtureFile;
  writeFileSync(fixturePath, fixtureBody, "utf8");
  console.log("  fixture written: " + fixturePath + " (" + fixtureBody.length + " chars)");

  // Smoke: re-import the written fixture from disk, compile + validate.
  const mod = (await import(pathToFileURL(fixturePath).href)) as Record<string, unknown>;
  const imported = mod[cfg.exportName] as ObjectGraph;
  if (!imported || !Array.isArray(imported.objects)) {
    throw new Error("SMOKE FAIL: " + cfg.exportName + " did not import as an ObjectGraph");
  }
  const genOpts: { generatedAt: string; eventSequences?: [number, number] } = {
    generatedAt: cfg.generatedAt,
  };
  if (cfg.eventSequences) genOpts.eventSequences = cfg.eventSequences;
  const spec: FYDSiteSpec = generateSiteSpec(imported, genOpts);
  const specDigest = sha256(stableStringify(spec));
  const knownSchemas = new Set(imported.objects.map((o) => o.schema));
  const findings = validateSiteSpec(spec, knownSchemas);
  const renderable = isRenderable(findings);

  // Also compile from the pipeline graph directly; digests must match (same inputs).
  const specDirect = generateSiteSpec(graph, genOpts);
  const directDigest = sha256(stableStringify(specDirect));
  const smokeOk = specDigest === directDigest;
  console.log(
    "  smoke: objects=" + imported.objects.length +
      " rels=" + imported.relationships.length +
      " renderable=" + renderable +
      " findings=" + findings.length +
      " specDigest=" + specDigest +
      " digestMatch=" + smokeOk,
  );
  if (!smokeOk) throw new Error("SMOKE FAIL: fixture-derived spec digest != pipeline-derived spec digest");

  const pages = spec.pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    sections: p.sections.map((s) => {
      const shape = queryShape(s.query);
      return {
        id: s.id,
        component: s.component,
        queryKind: shape.kind,
        predicates: shape.predicates,
        schemas: shape.schemas,
        ...(shape.limit !== undefined ? { limit: shape.limit } : {}),
        resolvedObjectIds: resolveQuery(s.query, imported, spec.ownerObjectId).map((o) => o.id),
      };
    }),
  }));

  return {
    slug: cfg.slug,
    canonicalUrl: cfg.canonicalUrl,
    observedAt: OBSERVED_AT,
    controllerId: CONTROLLER,
    pipelineCommit: GIT_COMMIT,
    generatedAt: cfg.generatedAt,
    eventSequences: cfg.eventSequences ?? null,
    sourceDigest,
    sourceFiles: files.map((f) => ({
      name: f.name,
      sourceType: f.sourceType,
      url: f.name === "index.html" ? cfg.canonicalUrl : cfg.canonicalUrl + f.name,
      bytes: f.bytes.length,
      digest: f.digest,
    })),
    acquiredUrls: acquired.map((a) => a.url),
    deterministicRuns: true,
    factsDiscovered: run1.report.factsDiscovered,
    factsByClass: run1.report.factsByClass as Record<string, number>,
    factsBySource: run1.report.factsBySource as Record<string, number>,
    objectsGenerated: run1.report.objectsGenerated,
    relationshipsGenerated: run1.report.relationshipsGenerated,
    privateWithheld: run1.report.privateWithheld,
    unsupportedCount: Array.isArray(run1.report.unsupported) ? run1.report.unsupported.length : 0,
    objects: graph.objects.map((o) => ({
      id: o.id,
      schema: o.schema,
      title: o.title,
      fieldNames: Object.keys(o.fields).sort(),
    })),
    relationships: graph.relationships.map((r) => ({
      id: r.id,
      subject: r.subject,
      predicate: r.predicate,
      object: r.object,
      status: (r as { status?: string }).status ?? "",
    })),
    fixturePath,
    specDigest,
    navigation: spec.navigation,
    pages,
    validatorFindings: findings.map((f) => ({
      severity: String(f.severity),
      path: String(f.path),
      message: String(f.message),
    })),
    renderable,
    smokeOk,
    smokeSpecDigest: specDigest,
  };
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const started = new Date().toISOString();
  try {
    const sites: SiteReport[] = [];
    for (const cfg of SITES) {
      sites.push(await runSite(cfg));
    }
    const report = {
      step: 1,
      script: SCRIPT_PATH,
      runStartedAt: started,
      observedAt: OBSERVED_AT,
      controllerId: CONTROLLER,
      pipelineCommit: GIT_COMMIT,
      deterministic: true,
      sites,
    };
    writeFileSync(OUT_DIR + "/step1-report.json", JSON.stringify(report, null, 2), "utf8");
    console.log("REPORT: " + OUT_DIR + "/step1-report.json");
    console.log("STEP 1 COMPLETE");
  } catch (err) {
    const report = {
      step: 1,
      script: SCRIPT_PATH,
      runStartedAt: started,
      observedAt: OBSERVED_AT,
      controllerId: CONTROLLER,
      pipelineCommit: GIT_COMMIT,
      deterministic: false,
      error: String(err && (err as Error).stack ? (err as Error).stack : err),
      sites: [],
    };
    writeFileSync(OUT_DIR + "/step1-report.json", JSON.stringify(report, null, 2), "utf8");
    console.error("STEP 1 FAILED: " + String(err));
    process.exit(1);
  }
}

main();
