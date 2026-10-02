/**
 * OBJECT-SHARD-2 harness: missions [start, end).
 * Per mission: rotate corpus fixture graphs with deterministic mutation seed
 * -> generateSiteSpec -> validateSiteSpec -> buildRenderContext -> render HTML
 * -> determinism check (spec twice + render twice, digest compare)
 * -> same verify asserts as WORLD.
 * Read-only vs the repo. Run: node bundle-object.cjs <start> <end>
 */
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { performance } from "perf_hooks";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSiteSpec } from "../projects/ping/src/fyd/proceduralize/generator";
import {
  isRenderable,
  validateSiteSpec,
} from "../projects/ping/src/fyd/sitespec/validator";
import {
  buildRenderContext,
  renderSection,
  resolveQuery,
  SitePageView,
} from "../projects/ping/src/fyd/components/renderer";
import type {
  FYDSiteSpec,
  ObjectGraph,
} from "../projects/ping/src/fyd/sitespec/types";
import type { PingObject } from "../projects/ping/src/lib/ping/types";
import type { FieldVisibilityDecision } from "../projects/ping/src/fyd/sitespec/field-visibility";

const GENERATED_AT = "2026-09-23T20:00:00.000Z";
const OUT_DIR = process.env.FYD_OUT || "/home/nolan/fyd-factory-object2";
const CORPUS = "/home/nolan/fyd-factory-shard2/corpus/fixtures";
const RESULTS = `${OUT_DIR}/results.jsonl`;
const LOG = `${OUT_DIR}/SHARD-LOG.md`;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function log(line: string): void { fs.appendFileSync(LOG, line + "\n"); }
function sha256(s: string): string { return crypto.createHash("sha256").update(s).digest("hex"); }
function timed<T>(fn: () => T): { value: T; ms: number } {
  const t0 = performance.now();
  const value = fn();
  return { value, ms: performance.now() - t0 };
}

interface Fixture {
  name: string;
  graph: ObjectGraph;
  expectedFailureMode?: string;
  hostileProps?: string[];
}

function loadFixtures(): Fixture[] {
  const out: Fixture[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".json")) {
        try {
          const d = JSON.parse(fs.readFileSync(p, "utf8"));
          const g = d.graph;
          if (g && Array.isArray(g.objects) && Array.isArray(g.relationships)) {
            out.push({
              name: path.relative(CORPUS, p),
              graph: { objects: g.objects, relationships: g.relationships },
              expectedFailureMode: d.expected_failure_mode ?? d.meta?.expected_failure_mode,
              hostileProps: d.hostile_properties,
            });
          }
        } catch { /* skip unparseable */ }
      }
    }
  };
  walk(CORPUS);
  out.sort((a, b) => (a.name < b.name ? -1 : 1));
  return out;
}

const BUSINESS_SCHEMAS = new Set(["ping.social.business@1", "ping.knowledge.business@1"]);

interface Mutated {
  graph: ObjectGraph;
  hiddenId: string | null;
  correctedPhone: string | null;
  sourcePhone: string | null;
  mutations: string[];
}

function mutate(fx: Fixture, i: number): Mutated {
  const rng = mulberry32(i * 131 + 7);
  const mutations: string[] = [];
  // Deep copy so the cached fixture is never mutated.
  const graph: ObjectGraph = JSON.parse(JSON.stringify(fx.graph));
  const isBiz = (o: PingObject) => BUSINESS_SCHEMAS.has(o.schema);
  const biz = graph.objects.filter((o) => isBiz(o) && o.visibility === "public").sort((a, b) => (a.id < b.id ? -1 : 1))[0];
  const others = graph.objects.filter((o) => o !== biz);

  // Drop 0-2 non-business objects.
  const nDrop = [0, 1, 2][i % 3];
  for (let k = 0; k < nDrop && others.length > 0; k++) {
    const idx = Math.floor(rng() * others.length);
    const [gone] = others.splice(idx, 1);
    const gi = graph.objects.indexOf(gone);
    if (gi >= 0) graph.objects.splice(gi, 1);
    graph.relationships = graph.relationships.filter((r) => r.object !== gone.id && r.subject !== gone.id);
    mutations.push(`drop:${gone.id}`);
  }
  // Privatize one object (owner hide).
  let hiddenId: string | null = null;
  if (i % 7 === 0 && others.length > 0) {
    const target = others[Math.floor(rng() * others.length)];
    target.visibility = "private";
    hiddenId = target.id;
    mutations.push(`hide:${target.id}`);
  }
  // Reobservation tweak.
  if (i % 5 === 0 && graph.objects.length > 0) {
    const target = graph.objects[Math.floor(rng() * graph.objects.length)];
    target.description = (target.description || "") + " (reobserved)";
    target.updatedAt = GENERATED_AT;
    mutations.push(`tweak:${target.id}`);
  }
  // Owner correct-fact on phone.
  let correctedPhone: string | null = null;
  let sourcePhone: string | null = null;
  if (i % 11 === 0 && biz && typeof biz.fields["phone"] === "string") {
    sourcePhone = biz.fields["phone"] as string;
    correctedPhone = `+1 (555) 02999`;
    biz.fields["phone"] = correctedPhone;
    biz.ownerFieldCorrections = [{
      field: "phone", label: "Phone", sourceValue: sourcePhone, ownerValue: correctedPhone,
      correctedAt: GENERATED_AT, actorLabel: "Synthetic Owner (seeded, unverified)",
      basis: "Owner correction: synthetic test owner attests the main number.",
    }];
    mutations.push(`correct:phone:${biz.id}`);
  }
  return { graph, hiddenId, correctedPhone, sourcePhone, mutations };
}

type Outcome =
  | "GENERATED" | "GENERATED_WITH_WARNINGS" | "NEEDS_REVIEW"
  | "ACQUISITION_FAILED" | "IDENTITY_AMBIGUOUS" | "EVIDENCE_CONFLICT"
  | "UNSAFE_SOURCE" | "UNSUPPORTED" | "CRASH";

const UNSAFE_RE = /\b(javascript|vbscript|data)\s*:/i;
const BADGE_RE = /Website statement|Site record|Demo addition|Mixed sources|Feed item/;

function renderAll(spec: FYDSiteSpec, ctx: ReturnType<typeof buildRenderContext>): { pages: { slug: string; html: string; sectionHtml: string[] }[] } {
  const pages: { slug: string; html: string; sectionHtml: string[] }[] = [];
  for (const page of spec.pages) {
    const sectionHtml = page.sections.map((section) => {
      try { return renderToStaticMarkup(renderSection(section, ctx)); } catch { return ""; }
    });
    let body: string;
    try { body = renderToStaticMarkup(SitePageView({ page, ctx })); }
    catch { body = sectionHtml.join("\n"); }
    pages.push({
      slug: page.slug,
      html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>synthetic fixture render</title>\n</head>\n<body>\n${body}\n</body>\n</html>`,
      sectionHtml,
    });
  }
  return { pages };
}

/**
 * Explicit phone-conflict markers anywhere in the graph: a
 * "phone_conflicts_with" field or a "conflicts" entry naming a phone conflict.
 * Mirrors the marker shapes honored by the proposed dial-gating patch.
 */
function hasPhoneConflictMarkers(graph: ObjectGraph): boolean {
  for (const o of graph.objects) {
    const fields = o.fields as Record<string, unknown>;
    const explicit = fields["phone_conflicts_with"];
    if (typeof explicit === "string" && explicit.trim().length > 0) return true;
    const conflicts = fields["conflicts"];
    if (Array.isArray(conflicts)) {
      for (const c of conflicts) {
        if (typeof c !== "string") continue;
        const lc = c.toLowerCase();
        if (lc.includes("conflict") && lc.includes("phone")) return true;
      }
    }
  }
  return false;
}

/** An explicit owner phone correction is a human resolution of the conflict. */
function ownerResolvedPhone(graph: ObjectGraph): boolean {
  return graph.objects.some((o) =>
    Array.isArray(o.ownerFieldCorrections) &&
    o.ownerFieldCorrections.some((c) => c.field === "phone"));
}

function runMission(i: number, fixtures: Fixture[]): Record<string, unknown> {
  const lat: Record<string, number> = {};
  const t0 = performance.now();
  const fail = (outcome: Outcome, stage: string | null, note: string | null, extra: Record<string, unknown> = {}) => ({
    mission: i, outcome, failure_stage: stage, failure_note: note,
    stage_latencies_ms: lat, total_ms: performance.now() - t0,
    synthetic: true, testing_only: true, ...extra,
  });
  try {
    const fx = fixtures[i % fixtures.length];

    const sMut = timed(() => mutate(fx, i));
    lat["load_mutate"] = sMut.ms;
    const m = sMut.value;
    const warnings: string[] = [];
    if (m.mutations.length) warnings.push("mutations: " + m.mutations.join(","));

    const sSpec = timed(() => {
      const spec = generateSiteSpec(m.graph, { generatedAt: GENERATED_AT });
      const knownSchemas = new Set(m.graph.objects.map((o) => o.schema));
      return { spec, findings: validateSiteSpec(spec, knownSchemas) };
    });
    lat["sitespec"] = sSpec.ms;
    const { spec, findings } = sSpec.value;
    const errors = findings.filter((f) => f.severity === "error");
    for (const w of findings.filter((f) => f.severity !== "error")) warnings.push(`validator: ${w.path}: ${w.message}`);
    if (errors.length > 0) {
      return fail("NEEDS_REVIEW", "sitespec", "typed spec failure: " + errors.map((e) => e.path + ": " + e.message).join("; "),
        { fixture: fx.name, warnings, object_count: m.graph.objects.length });
    }

    const decisions: FieldVisibilityDecision[] = [];
    if (m.hiddenId) {
      const target = m.graph.objects.find((o) => o.id === m.hiddenId);
      if (target) for (const key of Object.keys(target.fields)) {
        decisions.push({ objectId: target.id, field: key, policy: "hide", decidedBy: "owner", decidedAt: GENERATED_AT, source: "owner_override", version: 1 });
      }
    }
    const sProj = timed(() => buildRenderContext(spec, m.graph, { viewerId: null, displayName: null }, decisions));
    lat["projection"] = sProj.ms;
    const ctx = sProj.value;

    const sRender = timed(() => renderAll(spec, ctx));
    lat["render"] = sRender.ms;

    // Determinism: spec twice + full render twice, digest compare.
    const sDet = timed(() => {
      const spec2 = generateSiteSpec(m.graph, { generatedAt: GENERATED_AT });
      const specSame = JSON.stringify(spec) === JSON.stringify(spec2);
      const html1 = sRender.value.pages.map((p) => p.html).join("\n");
      const html2 = renderAll(spec, ctx).pages.map((p) => p.html).join("\n");
      return { specSame, htmlSame: sha256(html1) === sha256(html2) };
    });
    lat["determinism"] = sDet.ms;
    if (!sDet.value.specSame || !sDet.value.htmlSame) {
      return fail("NEEDS_REVIEW", "determinism",
        `nondeterminism detected (specSame=${sDet.value.specSame}, htmlSame=${sDet.value.htmlSame})`,
        { fixture: fx.name, warnings, object_count: m.graph.objects.length });
    }

    const sVerify = timed(() => {
      const notes: string[] = [];
      const pages = sRender.value.pages;
      const fullHtml = pages.map((p) => p.html).join("\n");
      const unsafe = (fullHtml.match(new RegExp(UNSAFE_RE.source, "gi")) ?? []).length;
      const sectionCount = spec.pages.reduce((n, p) => n + p.sections.length, 0);
      let rendered = 0, unbound = 0;
      spec.pages.forEach((page, pi) => {
        page.sections.forEach((section, si) => {
          const bound = resolveQuery(section.query, ctx.graph, spec.ownerObjectId);
          const html = pages[pi]?.sectionHtml[si] ?? "";
          if (html.trim().length > 0) rendered++;
          if (bound.length > 0 && html.trim().length > 0 && !BADGE_RE.test(html)) {
            unbound++;
            notes.push(`unbound-claim: section ${section.id} binds ${bound.length} object(s) but renders no claim badge`);
          }
        });
      });
      let hiddenLeak: string | null = null;
      // Fail-closed dial check, driven by the same explicit conflict markers
      // the proposed patch honors (not by the fixture's expected-mode text):
      // if the graph carries phone-conflict markers and no owner correction
      // resolved the phone, no tel: dial action may render.
      const telHrefs = (fullHtml.match(/href="tel:[^"]*"/gi) ?? []).length;
      const failClosedViolation = hasPhoneConflictMarkers(m.graph) && !ownerResolvedPhone(m.graph) && telHrefs > 0;
      if (m.hiddenId) {
        const target = m.graph.objects.find((o) => o.id === m.hiddenId);
        if (target && fullHtml.toLowerCase().includes(target.title.toLowerCase())) hiddenLeak = `hidden object "${target.title}" leaked into public HTML`;
      }
      if (m.correctedPhone && !fullHtml.includes(m.correctedPhone)) notes.push("owner-intent: corrected phone not present in rendered output");
      const viewportOk = pages.every((p) => p.html.includes('name="viewport"'));
      if (failClosedViolation) notes.push(`fail-closed violation: ${telHrefs} tel: dial action(s) rendered while explicit phone-conflict markers are present and no owner correction resolved the phone`);
      return { unsafe, sectionCount, rendered, unbound, hiddenLeak, viewportOk, notes, failClosedViolation };
    });
    lat["verify"] = sVerify.ms;
    const v = sVerify.value;
    for (const n of v.notes) warnings.push(n);

    const base = {
      fixture: fx.name, warnings,
      expected_failure_mode: fx.expectedFailureMode ?? null,
      object_count: m.graph.objects.length,
      relationship_count: m.graph.relationships.length,
      page_count: spec.pages.length,
      section_count: v.sectionCount,
      rendered_section_count: v.rendered,
      unsafe_url_count: v.unsafe,
      unbound_claim_count: v.unbound,
      determinism_ok: true,
    };
    if (fx.expectedFailureMode) warnings.push(`fixture expects: ${fx.expectedFailureMode}`);
    if (v.unsafe > 0) return fail("UNSAFE_SOURCE", "render", `unsafe URL scheme in HTML (${v.unsafe})`, base);
    if (v.hiddenLeak) return fail("NEEDS_REVIEW", "verify", v.hiddenLeak, base);
    if (v.failClosedViolation) return fail("NEEDS_REVIEW", "verify", "dial action rendered despite explicit phone-conflict markers", base);
    if (!v.viewportOk) return fail("NEEDS_REVIEW", "verify", "viewport meta missing", base);
    if (v.sectionCount === 0) return fail("NEEDS_REVIEW", "verify", "zero sections", base);
    if (warnings.length > 0) return { ...fail("GENERATED_WITH_WARNINGS", null, null, base), failure_stage: null, failure_note: null };
    return { ...fail("GENERATED", null, null, base), failure_stage: null, failure_note: null };
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const stage = lat["verify"] !== undefined ? "verify"
      : lat["determinism"] !== undefined ? "determinism"
      : lat["render"] !== undefined ? "render"
      : lat["projection"] !== undefined ? "projection"
      : lat["sitespec"] !== undefined ? "sitespec" : "load_mutate";
    return fail("CRASH", stage, msg.slice(0, 500), {});
  }
}

function main(): void {
  const start = parseInt(process.argv[2] ?? "1000", 10);
  const end = parseInt(process.argv[3] ?? "1500", 10);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const fixtures = loadFixtures();
  const tStart = performance.now();
  let peakRss = 0, done = 0;
  log(`# OBJECT-SHARD-2 log (missions ${start}-${end - 1})`);
  log(`- fixtures loaded: ${fixtures.length}`);
  log(`- harness start: ${new Date().toISOString()}`);
  for (let i = start; i < end; i++) {
    const r = runMission(i, fixtures);
    fs.appendFileSync(RESULTS, JSON.stringify(r) + "\n");
    done++;
    const rss = process.memoryUsage().rss;
    if (rss > peakRss) peakRss = rss;
    if (done % 50 === 0) {
      const elMin = (performance.now() - tStart) / 60000;
      const line = `- progress: ${done}/${end - start}, ${(done / elMin).toFixed(1)}/min, peak ${(peakRss / 1048576).toFixed(0)} MB`;
      log(line); console.log(line);
    }
  }
  const elMin = (performance.now() - tStart) / 60000;
  log(`- harness end: ${new Date().toISOString()}; total ${done} in ${elMin.toFixed(2)} min = ${(done / elMin).toFixed(1)}/min, peak ${(peakRss / 1048576).toFixed(0)} MB`);
  console.log(`DONE ${done}, ${(done / elMin).toFixed(1)}/min, peak ${(peakRss / 1048576).toFixed(0)} MB`);
}

main();
