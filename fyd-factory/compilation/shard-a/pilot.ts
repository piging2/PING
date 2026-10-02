import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator.ts";
import { validateSiteSpec } from "/home/nolan/projects/ping/src/fyd/sitespec/validator.ts";
import { buildRenderContext } from "/home/nolan/projects/ping/src/fyd/components/renderer.tsx";

const fixturePath = process.argv[2];
if (!fixturePath) { console.error("usage: pilot.ts <fixture.json>"); process.exit(2); }

const raw = readFileSync(fixturePath, "utf8");
const fixture = JSON.parse(raw);
const graph = {
  objects: fixture.graph.objects,
  relationships: fixture.graph.relationships ?? [],
};
const knownSchemas = new Set(graph.objects.map((o) => o.schema));
const GEN_AT = "2026-09-23T00:00:00.000Z"; // fixed for determinism check

const ms = (fn) => { const t0 = process.hrtime.bigint(); const out = fn(); const t1 = process.hrtime.bigint(); return { out, ms: Number(t1 - t0) / 1e6 }; };

const digest = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex");

try {
  const gen = ms(() => generateSiteSpec(graph, { generatedAt: GEN_AT }));
  const gen2 = ms(() => generateSiteSpec(graph, { generatedAt: GEN_AT }));
  const deterministic = digest(gen.out) === digest(gen2.out);
  const val = ms(() => validateSiteSpec(gen.out, knownSchemas));
  const errors = val.out.filter((f) => f.severity === "error");
  const ren = ms(() => buildRenderContext(gen.out, graph, { viewerId: null, displayName: null }, []));
  const sections = gen.out.pages.reduce((n, p) => n + p.sections.length, 0);
  console.log(JSON.stringify({
    ok: errors.length === 0,
    fixture: fixturePath.split("/").pop(),
    objects: graph.objects.length,
    relationships: graph.relationships.length,
    pages: gen.out.pages.length,
    sections,
    specDigest: digest(gen.out).slice(0, 16),
    deterministic,
    findings: val.out.length,
    findingSeverities: val.out.reduce((a, f) => { a[f.severity] = (a[f.severity] || 0) + 1; return a; }, {}),
    stageMs: { generate: +gen.ms.toFixed(2), validate: +val.ms.toFixed(2), render: +ren.ms.toFixed(2) },
    errors: errors.map((e) => ({ code: e.code, field: e.field, message: e.message })),
  }));
} catch (err) {
  console.log(JSON.stringify({ ok: false, fixture: fixturePath.split("/").pop(), crash: String(err && err.stack || err).slice(0, 500) }));
  process.exit(1);
}
