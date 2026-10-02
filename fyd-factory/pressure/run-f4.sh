#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "BRANCH=$(git rev-parse --abbrev-ref HEAD)"
echo "COMMIT=$(git rev-parse --short HEAD)"
echo "NODE=$(node --version)"
D="src/fyd/__pressure__"
mkdir -p "$D"
cat > "$D/css-stub.mts" <<'F4_HARNESS_EOF_9Z'
/**
 * F4-PRESSURE bootstrap stub: node/tsx cannot parse .css imports pulled in
 * by renderer.tsx's UI tree (object-circle.module.css). This stubs them to {}
 * so the pure seam functions (buildRenderContext, resolveQuery) load.
 * Loaded via `tsx --import ./css-stub.mts` BEFORE the harness module.
 */
import { Module } from "node:module";

const m = Module as unknown as {
  _extensions: Record<string, (mod: { exports: unknown }, filename: string) => void>;
};
for (const ext of [".css", ".scss", ".sass", ".less"]) {
  m._extensions[ext] = function (mod) {
    mod.exports = {};
  };
}

F4_HARNESS_EOF_9Z
cat > "$D/f4-harness.mts" <<'F4_HARNESS_EOF_9Z'
/**
 * F4-PRESSURE harness: degenerate-ObjectGraph pressure tests against the
 * factory render path on the Pig (branch fyd-factory, read-only):
 *   generateSiteSpec + validateSiteSpec + buildRenderContext (+ resolveQuery
 *   as the claim-honesty probe over each generated section query).
 *
 * Lane-contained new file; deletes itself after the run. No shared files
 * touched. Run: tsx --import ./css-stub.mts ./f4-harness.mts
 * Output: one JSON object per line on stdout.
 */

import type {
  ObjectProvenance,
  PingObject,
  PingRelationship,
} from "../../lib/ping/types";
import type { ObjectGraph } from "../sitespec/types";
import { generateSiteSpec } from "../proceduralize/generator";
import { validateSiteSpec } from "../sitespec/validator";
import { coarsenAddress } from "../sitespec/field-visibility";
import { DEFAULT_FYD_THEME } from "../sitespec/types";

// Renderer pulls the UI tree; css-stub.mts (via --import) neutralizes .css.
const renderer = await import("../components/renderer");
const { buildRenderContext, resolveQuery } = renderer;

const GEN_AT = "2026-09-23T19:00:00.000Z";
const VIEWER = { viewerId: null, displayName: null };

// ---------------------------------------------------------------- builders

function prov(): ObjectProvenance {
  return { kind: "website-derived", ref: "/index.html", derivedAt: GEN_AT };
}

function baseObject(p: Partial<PingObject> & { id: string }): PingObject {
  return {
    schema: "ping.social.business@1",
    controllerId: "web:controller",
    visibility: "public",
    title: "Untitled",
    description: "",
    fields: {},
    createdAt: GEN_AT,
    updatedAt: GEN_AT,
    provenance: prov(),
    ...p,
  };
}

function biz(
  id: string,
  title: string,
  fields: Record<string, string | string[]> = {},
  description = "",
): PingObject {
  return baseObject({
    id,
    schema: "ping.social.business@1",
    controllerId: "web:" + id,
    title,
    description,
    fields,
  });
}

function svc(id: string, title: string): PingObject {
  return baseObject({
    id,
    schema: "ping.social.service@1",
    controllerId: "web:" + id,
    title,
  });
}

function rel(
  id: string,
  subject: string,
  predicate: string,
  object: string,
  extra: Partial<PingRelationship> = {},
): PingRelationship {
  return {
    id,
    subject,
    predicate,
    object,
    status: "active",
    createdAt: GEN_AT,
    evidenceRef: "ev-1",
    ...extra,
  };
}

const BIZ_SCHEMA = "ping.social.business@1";

// ---------------------------------------------------------------- corpus

/** All string leaves of the input graph: the honesty corpus. */
function graphStrings(graph: ObjectGraph): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (v !== "") out.add(v);
    } else if (Array.isArray(v)) {
      for (const x of v) walk(x);
    } else if (v && typeof v === "object") {
      for (const x of Object.values(v)) walk(x);
    }
  };
  // graph.objects / graph.relationships may themselves be malformed; guard.
  try {
    walk((graph as unknown as { objects: unknown }).objects);
  } catch {
    /* ignore */
  }
  try {
    walk((graph as unknown as { relationships: unknown }).relationships);
  } catch {
    /* ignore */
  }
  return out;
}

function themeStrings(): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (v !== "") out.add(v);
    } else if (v && typeof v === "object") {
      for (const x of Object.values(v)) walk(x);
    }
  };
  walk(DEFAULT_FYD_THEME);
  return out;
}

const FIXED_STRINGS = new Set<string>([
  "fyd.sitespec@1",
  "1.0.0",
  "fyd-site-generator",
  GEN_AT,
  "website-ingestion",
  "website_statement",
  "Generated from website-ingestion graph objects. All claims are website_statement, not verified fact.",
  "home",
  "about",
  "services",
  "explore",
  "Home",
  "About",
  "Services",
  "Explore",
  "owner",
  "related",
  "all",
  "reference",
  "static",
  "provides",
  "offers",
  "located_at",
  "has_location",
  "employs",
  "has_member",
  "publishes",
  ...themeStrings(),
]);

const SECTION_ID_RE = /^[A-Za-z0-9_-]+:[A-Za-z][A-Za-z0-9]*:\d+$/;

/** Strings in the spec that are structural/derived (not business claims). */
function isStructural(s: string, corpus: Set<string>): boolean {
  if (corpus.has(s)) return true;
  if (FIXED_STRINGS.has(s)) return true;
  if (SECTION_ID_RE.test(s)) return true;
  if (s.startsWith("About ") && corpus.has(s.slice(6))) return true;
  // canonical schema vocabulary ids
  if (/^ping\.(social|knowledge)\.[a-z]+@\d+$/.test(s)) return true;
  return false;
}

function specStrings(spec: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (v !== "") out.push(v);
    } else if (Array.isArray(v)) {
      for (const x of v) walk(x);
    } else if (v && typeof v === "object") {
      for (const x of Object.values(v)) walk(x);
    }
  };
  walk(spec);
  return out;
}

// ---------------------------------------------------------------- runner

interface StageOutcome {
  ok: boolean;
  detail: string;
}

interface CaseResult {
  name: string;
  generate: StageOutcome;
  validate: StageOutcome;
  renderCtx: StageOutcome;
  resolveProbe: StageOutcome;
  inventedFlags: string[];
  stats: Record<string, unknown>;
  msTotal: number;
}

function errText(e: unknown): string {
  if (e instanceof Error) return e.name + ": " + e.message.split("\n")[0];
  return String(e).slice(0, 200);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function expectedProjectedFields(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k.toLowerCase().includes("address")) {
      const joined = Array.isArray(v) ? (v as string[]).join(", ") : String(v);
      out[k] = coarsenAddress(joined);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function runCase(name: string, graph: ObjectGraph): CaseResult {
  const t0 = Date.now();
  const res: CaseResult = {
    name,
    generate: { ok: false, detail: "not run" },
    validate: { ok: false, detail: "not run" },
    renderCtx: { ok: false, detail: "not run" },
    resolveProbe: { ok: false, detail: "not run" },
    inventedFlags: [],
    stats: {},
    msTotal: 0,
  };

  let spec: ReturnType<typeof generateSiteSpec> | null = null;
  try {
    spec = generateSiteSpec(graph, { generatedAt: GEN_AT });
    res.generate = {
      ok: true,
      detail:
        "pages=" +
        spec.pages.length +
        " [" +
        spec.pages.map((p) => p.slug + ":" + p.sections.length).join(",") +
        "] ownerObjectId=" +
        JSON.stringify(spec.ownerObjectId),
    };
    res.stats.pages = spec.pages.length;
    res.stats.ownerObjectId = spec.ownerObjectId;
  } catch (e) {
    res.generate = { ok: false, detail: "THROW " + errText(e) };
    res.msTotal = Date.now() - t0;
    return res;
  }

  let findings: ReturnType<typeof validateSiteSpec> = [];
  try {
    const schemas = new Set<string>();
    try {
      for (const o of (graph as unknown as { objects: PingObject[] }).objects ?? []) {
        if (o && typeof o.schema === "string") schemas.add(o.schema);
      }
    } catch {
      /* ignore */
    }
    findings = validateSiteSpec(spec, schemas);
    const errs = findings.filter((f) => f.severity === "error").length;
    const warns = findings.filter((f) => f.severity === "warning").length;
    res.validate = {
      ok: true,
      detail: "errors=" + errs + " warnings=" + warns,
    };
    res.stats.valErrors = errs;
    res.stats.valWarnings = warns;
    res.stats.findings = findings.map((f) => f.severity + "@" + f.path + ": " + f.message);
  } catch (e) {
    res.validate = { ok: false, detail: "THROW " + errText(e) };
    res.msTotal = Date.now() - t0;
    return res;
  }

  let ctx: ReturnType<typeof buildRenderContext> | null = null;
  try {
    ctx = buildRenderContext(spec, graph, VIEWER);
    res.renderCtx = {
      ok: true,
      detail:
        "projected objects=" +
        ctx.graph.objects.length +
        " rels=" +
        ctx.graph.relationships.length,
    };
    res.stats.projObjects = ctx.graph.objects.length;
  } catch (e) {
    res.renderCtx = { ok: false, detail: "THROW " + errText(e) };
    res.msTotal = Date.now() - t0;
    return res;
  }

  // Claim-honesty probe: every object any generated section query resolves
  // must be traceable to the input graph with identical identity content,
  // modulo the documented address-coarsening projection.
  try {
    const corpus = graphStrings(graph);
    const inputById = new Map<string, PingObject>();
    try {
      for (const o of (graph as unknown as { objects: PingObject[] }).objects ?? []) {
        if (o && typeof o.id === "string") inputById.set(o.id, o);
      }
    } catch {
      /* ignore */
    }
    const problems: string[] = [];
    let resolvedTotal = 0;
    for (const page of spec.pages) {
      for (const section of page.sections) {
        let objs: PingObject[];
        try {
          objs = resolveQuery(section.query, ctx.graph, spec.ownerObjectId);
        } catch (e) {
          problems.push("resolveQuery THROW " + section.id + ": " + errText(e));
          continue;
        }
        resolvedTotal += objs.length;
        for (const o of objs) {
          const input = inputById.get(o.id);
          if (!input) {
            problems.push("resolved unknown id " + JSON.stringify(o.id) + " via " + section.id);
            continue;
          }
          if (o.title !== input.title) {
            problems.push(
              "title drift " + o.id + ": " + JSON.stringify(o.title) + " vs " + JSON.stringify(input.title),
            );
          }
          let inFields: Record<string, unknown> = {};
          try {
            inFields = (input.fields ?? {}) as Record<string, unknown>;
          } catch {
            /* ignore */
          }
          if (!deepEqual(o.fields, expectedProjectedFields(inFields))) {
            problems.push("field drift " + o.id + " via " + section.id);
          }
        }
      }
    }
    // Spec-level string scan: flag any string that is neither input-derived
    // nor structural. Review is manual; only factual flags count.
    const flagged = new Set<string>();
    for (const s of specStrings(spec)) {
      if (!isStructural(s, corpus)) flagged.add(s);
    }
    res.inventedFlags = [...flagged].slice(0, 40);
    res.resolveProbe = {
      ok: problems.length === 0,
      detail: "resolved=" + resolvedTotal + " problems=" + problems.length,
    };
    res.stats.resolveProblems = problems.slice(0, 10);
    res.stats.resolvedTotal = resolvedTotal;
  } catch (e) {
    res.resolveProbe = { ok: false, detail: "THROW " + errText(e) };
  }

  res.msTotal = Date.now() - t0;
  return res;
}

// ---------------------------------------------------------------- cases

const cases: Array<{ name: string; graph: ObjectGraph }> = [];

function addCase(name: string, graph: ObjectGraph) {
  cases.push({ name, graph });
}

// Baseline (healthy) to prove the harness itself works.
addCase("baseline-healthy", {
  objects: [
    biz("b1", "Acme Plumbing", { phone: "555-0100", address: "123 Main St, Grand Junction, CO 81501" }, "We fix pipes."),
    svc("s1", "Drain cleaning"),
    svc("s2", "Water heaters"),
  ],
  relationships: [rel("r1", "b1", "provides", "s1"), rel("r2", "b1", "provides", "s2")],
});

// 1. missing business object
addCase("missing-business", {
  objects: [svc("s1", "Drain cleaning"), svc("s2", "Water heaters")],
  relationships: [],
});

// 2. zero services
addCase("zero-services", {
  objects: [biz("b1", "Acme Plumbing", { phone: "555-0100" }, "We fix pipes.")],
  relationships: [],
});

// 3. 200 services
{
  const objects: PingObject[] = [biz("b1", "Acme Plumbing", { phone: "555-0100" }, "We fix pipes.")];
  const relationships: PingRelationship[] = [];
  for (let i = 0; i < 200; i++) {
    const id = "svc-" + String(i).padStart(3, "0");
    objects.push(svc(id, "Service number " + i));
    relationships.push(rel("rel-" + id, "b1", "provides", id));
  }
  addCase("200-services", { objects, relationships });
}

// 4a. duplicate ids (same id, different titles)
addCase("duplicate-ids", {
  objects: [
    biz("dup", "First Title", { phone: "555-0001" }, "First."),
    { ...biz("dup", "Second Title", { phone: "555-0002" }, "Second.") },
  ],
  relationships: [],
});

// 4b. near-duplicate names, distinct ids
addCase("near-duplicate-names", {
  objects: [
    biz("b1", "Acme Plumbing", { phone: "555-0001" }, "One."),
    biz("b2", "Acme  Plumbing", { phone: "555-0002" }, "Two."),
  ],
  relationships: [],
});

// 5. cyclic relationships
addCase("cyclic-relationships", {
  objects: [biz("b1", "Acme Plumbing", { phone: "555-0100" }, "We fix pipes."), svc("s1", "Drain cleaning")],
  relationships: [
    rel("r1", "b1", "provides", "s1"),
    rel("r2", "s1", "provides", "b1"), // cycle back
    rel("r3", "s1", "provides", "s1"), // self loop
  ],
});

// 6. conflicting facts across sources (two businesses, different phones)
addCase("conflicting-facts", {
  objects: [
    biz("b-1", "Acme Plumbing", { phone: "555-0001", address: "1 A St, GJ, CO" }, "Site A words."),
    biz("b-2", "Acme Plumbing", { phone: "555-0002", address: "2 B St, GJ, CO" }, "Site B words."),
  ],
  relationships: [],
});

// 7. null/empty/malformed fields (each isolated)
const bizAny = (p: Record<string, unknown>) => baseObject({ id: "b1", ...(p as Partial<PingObject>) });
addCase("malformed-description-null", { objects: [bizAny({ title: "T", description: null })], relationships: [] });
addCase("malformed-fields-null", { objects: [bizAny({ title: "T", fields: null })], relationships: [] });
addCase("malformed-field-number", {
  objects: [bizAny({ title: "T", fields: { phone: 12345 } as unknown as Record<string, string> })],
  relationships: [],
});
addCase("malformed-title-null", { objects: [bizAny({ title: null, description: "d" })], relationships: [] });
addCase("malformed-objects-null", { objects: null as unknown as PingObject[], relationships: [] });
addCase("malformed-relationships-null", {
  objects: [biz("b1", "T", { phone: "1" }, "d")],
  relationships: null as unknown as PingRelationship[],
});
addCase("malformed-undefined-member", {
  objects: [biz("b1", "T", {}, "d"), undefined as unknown as PingObject],
  relationships: [],
});
addCase("malformed-empty-object", { objects: [{} as unknown as PingObject], relationships: [] });

// 8. 1MB string fields
addCase("1mb-description", {
  objects: [biz("b1", "Acme Plumbing", { phone: "555-0100" }, "x".repeat(1024 * 1024))],
  relationships: [],
});
addCase("1mb-title", {
  objects: [biz("b1", "y".repeat(1024 * 1024), { phone: "555-0100" }, "d")],
  relationships: [],
});

// 9. unicode / bidi / zero-width
addCase("unicode-bidi-zerowidth", {
  objects: [
    biz(
      "b1",
      "\u202EACME\u202C Plumbing \u200B\u200C\u200D \u{1F528}",
      { phone: "\u0661\u0662\u0663-0100", note: "caf\u00E9 \u4E2D\u6587 \u0645\u0631\u062D\u0628\u0627" },
      "Line1\nLine2\tTabbed \u0000 null-byte?",
    ),
  ],
  relationships: [],
});

// 10. schema-less objects
addCase("schemaless", {
  objects: [
    baseObject({ id: "x1", schema: "", title: "No Schema" }),
    baseObject({ id: "x2", schema: "ping.social.unicorn@9", title: "Unknown Schema" }),
    svc("s1", "Real Service"),
  ],
  relationships: [rel("r1", "x1", "provides", "s1")],
});

// 11. objects with no evidence
addCase("no-evidence", {
  objects: [biz("b1", "Acme Plumbing", { phone: "555-0100" }, "d"), svc("s1", "Drain cleaning")],
  relationships: [
    rel("r1", "b1", "provides", "s1", { evidenceRef: "" }),
    rel("r2", "b1", "provides", "s1", { evidenceRef: undefined as unknown as string }),
  ],
});

// 12. zero relationships (rich objects, no edges)
addCase("zero-relationships", {
  objects: [
    biz("b1", "Acme Plumbing", { phone: "555-0100" }, "We fix pipes."),
    svc("s1", "Drain cleaning"),
    svc("s2", "Water heaters"),
    baseObject({ id: "p1", schema: "ping.social.person@1", title: "Jane Doe" }),
  ],
  relationships: [],
});

// ---------------------------------------------------------------- main

for (const c of cases) {
  let result: CaseResult;
  try {
    result = runCase(c.name, c.graph);
  } catch (e) {
    result = {
      name: c.name,
      generate: { ok: false, detail: "HARNESS THROW " + errText(e) },
      validate: { ok: false, detail: "not run" },
      renderCtx: { ok: false, detail: "not run" },
      resolveProbe: { ok: false, detail: "not run" },
      inventedFlags: [],
      stats: {},
      msTotal: 0,
    };
  }
  console.log(JSON.stringify(result));
}

F4_HARNESS_EOF_9Z
node_modules/.bin/tsx --import ./$D/css-stub.mts ./$D/f4-harness.mts
RC=$?
rm -rf "$D"
echo "HARNESS_EXIT=$RC"
echo "GIT_STATUS_AFTER:"
git status --porcelain | head -20
