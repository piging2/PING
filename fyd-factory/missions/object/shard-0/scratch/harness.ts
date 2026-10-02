/**
 * OBJECT-SHARD-0 harness: fixture graph -> generateSiteSpec -> validateSiteSpec
 * -> buildRenderContext -> render HTML string -> determinism check -> VERIFY.
 *
 * Read-only: imports repo modules, never mutates the repo.
 * Run on the Pig with cwd=/home/nolan/projects/ping so the @/* tsconfig
 * alias resolves. Usage:
 *   tsx harness.ts <fixture_dir> <out_jsonl> <start> <end> <progress_log>
 */
const REPO = "/home/nolan/projects/ping";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import {
  validateSiteSpec,
  isRenderable,
} from "/home/nolan/projects/ping/src/fyd/sitespec/validator";
import {
  buildRenderContext,
  SitePageView,
} from "/home/nolan/projects/ping/src/fyd/components/renderer";
import { renderToStaticMarkup } from "react-dom/server";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const [fixtureDir, outJsonl, startS, endS, progressLog] = process.argv.slice(2);
const START = parseInt(startS, 10);
const END = parseInt(endS, 10);
const GENERATED_AT = "2026-09-23T12:00:00.000Z";
const CLAIM_LABELS = [
  "Website statement",
  "Demo addition",
  "Feed item",
  "Site record",
  "Mixed sources",
];

// --- deterministic PRNG (mulberry32) ---
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface FixtureFile {
  rel: string;
  doc: any;
}

function collectFixtures(dir: string): FixtureFile[] {
  const out: FixtureFile[] = [];
  const walk = (d: string) => {
    for (const name of fs.readdirSync(d).sort()) {
      const p = path.join(d, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.endsWith(".json")) {
        try {
          const doc = JSON.parse(fs.readFileSync(p, "utf8"));
          const g = doc && doc.graph;
          if (g && Array.isArray(g.objects)) {
            out.push({ rel: path.relative(dir, p), doc });
          }
        } catch {
          /* skip unparsable */
        }
      }
    }
  };
  walk(dir);
  return out;
}

const FIXTURES = collectFixtures(fixtureDir);
if (FIXTURES.length === 0) {
  throw new Error("no graph fixtures found under " + fixtureDir);
}

// Mission rotation categories, in order. The corpus has no literal
// "trades-a" directory; batch-a is its trades equivalent (mapping recorded
// here and in SHARD-LOG.md). Fixtures outside these categories are excluded
// from rotation and logged.
const ROTATION_CATEGORIES = ["batch-b", "trades-a", "clearwater", "professional", "hostile"] as const;
function rotationCategoryOf(rel: string): string | null {
  const top = rel.split("/")[0];
  if (top === "batch-b" || /^batch-b-.*\.json$/.test(top)) return "batch-b";
  if (top === "batch-a") return "trades-a";
  if (top === "clearwater-plumbing-demo.json") return "clearwater";
  if (top === "professional") return "professional";
  if (top === "hostile") return "hostile";
  return null;
}
const FIXTURES_BY_CATEGORY = new Map<string, FixtureFile[]>();
const EXCLUDED_FIXTURES: string[] = [];
for (const f of FIXTURES) {
  const cat = rotationCategoryOf(f.rel);
  if (cat) {
    if (!FIXTURES_BY_CATEGORY.has(cat)) FIXTURES_BY_CATEGORY.set(cat, []);
    FIXTURES_BY_CATEGORY.get(cat)!.push(f);
  } else {
    EXCLUDED_FIXTURES.push(f.rel);
  }
}
for (const cat of ROTATION_CATEGORIES) {
  const list = FIXTURES_BY_CATEGORY.get(cat);
  if (!list || list.length === 0) throw new Error("empty rotation category: " + cat);
}
if (EXCLUDED_FIXTURES.length > 0) {
  console.error(
    "rotation excludes " + EXCLUDED_FIXTURES.length + " fixtures outside the 5 categories: " +
    EXCLUDED_FIXTURES.join(", "),
  );
}
function fixtureForMission(i: number): { fixture: FixtureFile; category: string } {
  const category = ROTATION_CATEGORIES[i % ROTATION_CATEGORIES.length];
  const list = FIXTURES_BY_CATEGORY.get(category)!;
  const fixture = list[Math.floor(i / ROTATION_CATEGORIES.length) % list.length];
  return { fixture, category };
}

const MUTATIONS = [
  "none",
  "hide-object",
  "hide-owner",
  "unsafe-url",
  "unsafe-url-owner",
  "remove-phone",
  "conflict-hours",
  "unbound-claim",
  "unbound-claim-tamper",
  "stale-source",
];

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface MutationResult {
  name: string;
  hiddenIds: string[];
  sentinel: string | null;
}

/** Deterministically mutate a cloned graph. Never touches the source. */
function applyMutation(graph: any, i: number, rand: () => number): MutationResult {
  const name = MUTATIONS[Math.floor(rand() * MUTATIONS.length)];
  const hiddenIds: string[] = [];
  let sentinel: string | null = null;
  const objs: any[] = graph.objects ?? [];
  const pick = (n: number) => objs[Math.floor(rand() * n) % n];
  const business = () =>
    objs.find((o) => String(o.schema ?? "").includes("business")) ?? objs[0];

  if (name === "hide-object" && objs.length > 0) {
    const o = pick(objs.length);
    o.visibility = "hidden";
    hiddenIds.push(String(o.id));
  } else if (name === "hide-owner" && objs.length > 0) {
    const o = business();
    o.visibility = "hidden";
    hiddenIds.push(String(o.id));
  } else if (name === "unsafe-url" && objs.length > 0) {
    const o = pick(objs.length);
    o.fields = o.fields ?? {};
    o.fields.website = `javascript:alert('shard0-mission-${i}')`;
  } else if (name === "unsafe-url-owner" && objs.length > 0) {
    const o = business();
    o.fields = o.fields ?? {};
    o.fields.website = `javascript:alert('shard0-mission-${i}')`;
  } else if (name === "remove-phone") {
    for (const o of objs) {
      if (o.fields) delete o.fields.phone;
    }
  } else if (name === "conflict-hours" && objs.length >= 2) {
    const a = pick(objs.length);
    let b = pick(objs.length);
    if (b === a) b = objs[(objs.indexOf(a) + 1) % objs.length];
    for (const o of [a, b]) {
      o.fields = o.fields ?? {};
    }
    a.fields.hours = "Open 9-5 Mon-Fri";
    b.fields.hours = "Open 24 hours";
    a.fields.conflicts = ["HOURS conflict with " + b.id];
    b.fields.conflicts = ["HOURS conflict with " + a.id];
  } else if (name === "unbound-claim" && objs.length > 0) {
    const o = pick(objs.length);
    sentinel = `M${i} UNVERIFIED CLAIM: guaranteed 24 hour turnaround`;
    // NOTE: the renderer reads description from the top-level property
    // (boundFieldValue), not fields.description.
    o.description = sentinel;
    delete o.provenance;
  } else if (name === "unbound-claim-tamper" && objs.length > 0) {
    // Tamper-evidence probe: keep provenance intact, change the value.
    // Documents whether the binding gate checks value-vs-evidence.
    const o = business();
    sentinel = `M${i} TAMPERED CLAIM: guaranteed 24 hour turnaround`;
    o.description = sentinel;
  } else if (name === "stale-source" && objs.length > 0) {
    const o = pick(objs.length);
    o.updatedAt = "2019-01-01T00:00:00.000Z";
  }
  return { name, hiddenIds, sentinel };
}

interface CompileResult {
  html: string;
  spec: any;
  findings: any[];
  renderable: boolean;
  sections: number;
  pages: number;
}

function compile(graph: any): CompileResult {
  const spec = generateSiteSpec(graph, { generatedAt: GENERATED_AT });
  const knownSchemas = new Set<string>(
    (graph.objects ?? []).map((o: any) => String(o.schema)),
  );
  const findings = validateSiteSpec(spec, knownSchemas);
  const renderable = isRenderable(findings);
  const viewer = { viewerId: null as string | null, displayName: null as string | null };
  const ctx = buildRenderContext(spec, graph, viewer, []);
  let pages = 0;
  let sections = 0;
  const bodies: string[] = [];
  for (const page of spec.pages ?? []) {
    pages += 1;
    sections += (page.sections ?? []).length;
    bodies.push(
      renderToStaticMarkup(
        SitePageView({ page, ctx }) as any,
      ) as string,
    );
  }
  const title = esc(
    typeof spec.siteTitle === "string"
      ? spec.siteTitle
      : typeof spec.title === "string"
        ? spec.title
        : "FYD generated site",
  );
  const html =
    `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n` +
    `<meta name="viewport" content="width=device-width, initial-scale=1" />\n` +
    `<title>${title}</title>\n</head>\n<body>\n` +
    bodies.join("\n") +
    `\n</body>\n</html>`;
  return { html, spec, findings, renderable, sections, pages };
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

interface MissionRecord {
  mission: number;
  shard: string;
  fixture: string;
  mutation: string;
  outcome: string;
  failure_stage: string | null;
  latencies_ms: Record<string, number>;
  objects: number;
  relationships: number;
  sections: number;
  pages: number;
  unsafe_url_count: number;
  unbound_claim_count: number;
  sentinel_rendered: boolean;
  hidden_leaked_count: number;
  determinism: { match: boolean; sha_a: string; sha_b: string };
  findings: { severity: string; path: string; message: string }[];
  synthetic: boolean;
  testing_only: boolean;
}

const UNSAFE_RE = /javascript\s*:|vbscript\s*:|data\s*:\s*text\/html/i;

function runMission(i: number): MissionRecord {
  const lat: Record<string, number> = {};
  const t0 = Date.now();
  const rand = mulberry32(i);
  const { fixture, category } = fixtureForMission(i);
  let stage: string | null = null;
  try {
    // stage: mutate
    stage = "mutate";
    const tM = Date.now();
    const graph = structuredClone(fixture.doc.graph);
    const mut = applyMutation(graph, i, rand);
    lat.mutate = Date.now() - tM;

    // stage: compile (x2 for determinism)
    stage = "generate";
    const tG = Date.now();
    const first = compile(graph);
    lat.generate = Date.now() - tG;

    stage = "render";
    const tR = Date.now();
    const shaA = sha256(first.html);
    const tR2 = Date.now();
    const graph2 = structuredClone(fixture.doc.graph);
    const rand2 = mulberry32(i);
    applyMutation(graph2, i, rand2);
    const second = compile(graph2);
    const shaB = sha256(second.html);
    lat.render = Date.now() - tR;
    lat.determinism_check = Date.now() - tR2;

    if (process.env.SHARD_DUMP_HTML) {
      fs.writeFileSync(process.env.SHARD_DUMP_HTML, first.html, "utf8");
    }

    // stage: verify
    stage = "verify";
    const tV = Date.now();
    const html = first.html;
    const unsafeMatches = html.match(new RegExp(UNSAFE_RE.source, "gi"));
    const unsafe_url_count = unsafeMatches ? unsafeMatches.length : 0;
    const hidden_leaked_count = mut.hiddenIds.filter((id) =>
      html.includes(id),
    ).length;
    let unbound_claim_count = 0;
    let sentinel_rendered = false;
    if (mut.sentinel) {
      sentinel_rendered = html.includes(mut.sentinel);
      if (mut.name === "unbound-claim" && sentinel_rendered) {
        // Provenance was removed: any rendered sentinel is a binding leak.
        // The rail's "Site record" badge is not a binding receipt (it is a
        // fabricated fallback), so it does not exempt the render.
        unbound_claim_count = 1;
      }
      // unbound-claim-tamper keeps provenance intact: the graph itself
      // carries the changed value and the badge names the real receipt.
      // Rendering is the designed behavior; recorded via sentinel_rendered,
      // not counted as an unbound claim.
    }
    const hasViewport = html.includes('name="viewport"');
    const sectionCount = first.sections;
    const determinismMatch = shaA === shaB;
    const findings = first.findings.map((f: any) => ({
      severity: String(f.severity ?? "info"),
      path: String(f.path ?? ""),
      message: String(f.message ?? "").slice(0, 300),
    }));
    const warnings = findings.filter((f) => f.severity === "warning").length;
    lat.verify = Date.now() - tV;

    // outcome classification
    let outcome = "GENERATED";
    let failure_stage: string | null = null;    if (unsafe_url_count > 0) {
      outcome = "UNSAFE_SOURCE";
      failure_stage = "verify";
    } else if (hidden_leaked_count > 0) {
      outcome = "NEEDS_REVIEW";
      failure_stage = "verify";
    } else if (unbound_claim_count > 0) {
      outcome = "NEEDS_REVIEW";
      failure_stage = "verify";
    } else if (!determinismMatch) {
      outcome = "NEEDS_REVIEW";
      failure_stage = "determinism_check";
    } else if (!first.renderable) {
      outcome = "NEEDS_REVIEW";
      failure_stage = "validate";
    } else if (first.pages === 0 || sectionCount === 0) {
      outcome = "NEEDS_REVIEW";
      failure_stage = "generate";
    } else if (!hasViewport) {
      outcome = "NEEDS_REVIEW";
      failure_stage = "render";
    } else if (warnings > 0) {
      outcome = "GENERATED_WITH_WARNINGS";
    }

    return {
      mission: i,
      shard: "object-0",
      fixture: fixture.rel,
      category,
      mutation: mut.name,
      outcome,
      failure_stage,
      latencies_ms: lat,
      objects: (graph.objects ?? []).length,
      relationships: (graph.relationships ?? []).length,
      sections: sectionCount,
      pages: first.pages,
      unsafe_url_count,
      unbound_claim_count,
      sentinel_rendered,
      hidden_leaked_count,
      determinism: { match: determinismMatch, sha_a: shaA, sha_b: shaB },
      findings,
      synthetic: true,
      testing_only: true,
      ...(process.env.SHARD_DEBUG === "1"
        ? {
            debug: {
              hiddenIds: mut.hiddenIds,
              pageSlugs: (first.spec.pages ?? []).map((p: any) => p.slug),
              sentinelPresent: sentinel_rendered,
              objectsAfterHide: (graph.objects ?? [])
                .filter((o: any) => o.visibility === "public")
                .map((o: any) => String(o.id)),
            },
          }
        : {}),
    };
  } catch (err: any) {
    return {
      mission: i,
      shard: "object-0",
      fixture: fixture.rel,
      mutation: "unknown",
      outcome: "CRASH",
      failure_stage: stage,
      latencies_ms: lat,
      objects: -1,
      relationships: -1,
      sections: -1,
      pages: -1,
      unsafe_url_count: -1,
      unbound_claim_count: -1,
      sentinel_rendered: false,
      hidden_leaked_count: -1,
      determinism: { match: false, sha_a: "", sha_b: "" },
      findings: [
        {
          severity: "error",
          path: stage ?? "?",
          message: String(err && err.message ? err.message : err).slice(0, 500),
        },
      ],
      synthetic: true,
      testing_only: true,
    };
  }
}

function main() {
  const out: string[] = [];
  const tStart = Date.now();
  for (let i = START; i < END; i++) {
    const rec = runMission(i);
    out.push(JSON.stringify(rec));
    if (out.length >= 25) {
      fs.appendFileSync(outJsonl, out.join("\n") + "\n", "utf8");
      out.length = 0;
    }
    if ((i + 1) % 50 === 0) {
      const elapsed = (Date.now() - tStart) / 1000;
      const rate = ((i + 1 - START) / elapsed).toFixed(2);
      fs.appendFileSync(
        progressLog,
        `shard-0 mission ${i + 1}/${END} done, ${rate} missions/s, elapsed ${elapsed.toFixed(1)}s\n`,
        "utf8",
      );
    }
  }
  if (out.length > 0) fs.appendFileSync(outJsonl, out.join("\n") + "\n", "utf8");
  const total = (Date.now() - tStart) / 1000;
  fs.appendFileSync(
    progressLog,
    `shard-0 COMPLETE: ${END - START} missions in ${total.toFixed(1)}s (${(
      (END - START) /
      total
    ).toFixed(2)} missions/s)\n`,
    "utf8",
  );
}

main();
