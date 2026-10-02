/**
 * LANE-SCHEMA-FUZZ: schema-level fuzz harness for the FYD site pipeline.
 *
 * Pipeline under test (real functions, no mocks):
 *   generateSiteSpec(graph, opts)
 *   -> validateSiteSpec(spec, knownSchemas)
 *   -> buildRenderContext(spec, graph, viewer)
 *   -> buildSemanticRenderModel(spec, projectedGraph, viewer, {asOf})
 * Schema gates probed directly:
 *   validateAgainstSchema, eligibleComponents, relationshipRules,
 *   isAllowedPredicate, capabilityOptions, schemaRole, getSchemaDef.
 *
 * Read-only: this file lives outside the repo and mutates nothing.
 * Deterministic: fixed generatedAt/asOf, no wall clock inside the pipeline.
 */
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import {
  validateSiteSpec,
  isRenderable,
} from "/home/nolan/projects/ping/src/fyd/sitespec/validator";
import { buildRenderContext } from "/home/nolan/projects/ping/src/fyd/components/renderer";
import { buildSemanticRenderModel } from "/home/nolan/projects/ping/src/fyd/sitespec/render-model";
import {
  FYD_SCHEMAS,
  SCHEMA_ROLES,
  getSchemaDef,
  validateAgainstSchema,
  eligibleComponents,
  relationshipRules,
  isAllowedPredicate,
  capabilityOptions,
  schemaRole,
  agentToolDescription,
} from "/home/nolan/projects/ping/src/fyd/sitespec/schemas";
import { DEFAULT_FYD_THEME } from "/home/nolan/projects/ping/src/fyd/sitespec/types";

const AT = "2026-09-23T19:45:00.000Z";
const ASOF = "2026-09-23";

const BIZ = "ping.social.business@1";
const SVC = "ping.social.service@1";
const POST = "ping.social.post@1";

// ---------------------------------------------------------------- factories

let seq = 0;
function mkObj(o: {
  id: string;
  schema: string;
  title?: string;
  description?: string;
  fields?: Record<string, string | string[]>;
  visibility?: "public" | "private";
  controllerId?: string;
  provenanceKind?: "canonical-journal" | "website-derived" | "overlay-authored";
  updatedAt?: string;
}): any {
  return {
    id: o.id,
    schema: o.schema,
    controllerId: o.controllerId ?? "ctrl-1",
    visibility: o.visibility ?? "public",
    title: o.title ?? ("Title " + o.id),
    description: o.description ?? ("Description for " + o.id + "."),
    fields: o.fields ?? {},
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: o.updatedAt ?? "2026-06-0" + ((seq++ % 8) + 1) + "T00:00:00Z",
    provenance: {
      kind: o.provenanceKind ?? "website-derived",
      ref: "example.com",
      derivedAt: "2026-01-02T00:00:00Z",
    },
  };
}

function mkRel(subject: string, predicate: string, object: string, status: "active" | "inactive" = "active", n?: number): any {
  const id = "rel-" + (n ?? seq++);
  return { id, subject, predicate, object, status, createdAt: "2026-02-01T00:00:00Z", evidenceRef: "evt-1" };
}

const VIEWER_ANON = { viewerId: null, displayName: null };
const VIEWER_CTRL = { viewerId: "ctrl-1", displayName: "Controller" };
const VIEWER_OTHER = { viewerId: "other-9", displayName: "Stranger" };

// ---------------------------------------------------------------- inventory

function buildInventory(): any {
  const probeSchemas = [
    BIZ, SVC, POST,
    "ping.social.product@1", "ping.social.location@1", "ping.social.person@1",
    "ping.social.article@1", "ping.knowledge.website@1",
    "ping.knowledge.business@1", "ping.knowledge.service@1", "ping.knowledge.location@1",
    "ping.knowledge.person@1", "ping.knowledge.post@1", "ping.knowledge.article@1",
    "ping.social.unknown@1", "",
  ];
  return {
    schemas: FYD_SCHEMAS.map((d) => ({
      id: d.id,
      label: d.label,
      fields: d.fields.map((f) => f.name + ":" + f.type + (f.required ? " (required)" : "")),
      relationships: d.relationships.map((r) => r.predicate + " -> [" + r.targetSchemas.join(", ") + "]"),
      identityBacked: d.identityBacked,
      likeable: d.likeable,
    })),
    roles: Object.fromEntries(Object.entries(SCHEMA_ROLES).map(([role, ids]) => [role, ids])),
    componentsBySchema: Object.fromEntries(probeSchemas.map((s) => [s === "" ? "(empty)" : s, eligibleComponents(s)])),
    relationshipRulesBySchema: Object.fromEntries(
      [BIZ, SVC, POST, "ping.knowledge.service@1", "ping.social.product@1"].map((s) => [
        s, relationshipRules(s).map((r) => r.predicate + " -> [" + r.targetSchemas.join(", ") + "]"),
      ]),
    ),
    evidenceStates: ["observed", "inferred", "unverified", "unknown", "unavailable", "withheld"],
  };
}

// ---------------------------------------------------------------- case runner

interface CaseResult {
  id: string;
  set: "valid" | "hostile" | "probe";
  name: string;
  expectation: string;
  threw: string | null;
  pages: number;
  sections: number;
  validationErrors: number;
  validationWarnings: number;
  renderable: boolean;
  ctxBuilt: boolean;
  modelBuilt: boolean;
  boundObjectIds: number;
  unknownObjectIds: string[];
  schemaErrors: number;
  schemaWarnings: number;
  graphMutated: boolean;
  ms: number;
  closed: boolean | null;
  pass: boolean;
  notes: string[];
}

function schemaGate(graph: any): { errors: number; warnings: number; notes: string[] } {
  let errors = 0, warnings = 0;
  const notes: string[] = [];
  for (const o of graph.objects) {
    const def = getSchemaDef(o.schema);
    if (!def) {
      notes.push("no schema def for '" + o.schema + "' (object " + o.id + "): schema gate skipped");
      continue;
    }
    const rec = { title: o.title, description: o.description, fields: o.fields };
    for (const f of validateAgainstSchema(def, rec, "object:" + o.id)) {
      if (f.severity === "error") { errors++; notes.push("schema error: " + f.path + " " + f.message); }
      else if (f.severity === "warning") { warnings++; }
    }
  }
  return { errors, warnings, notes };
}

function runGraphCase(
  id: string, set: "valid" | "hostile", name: string, graph: any, viewer: any,
  expectation: string,
  decide: (r: CaseResult, model: any, spec: any) => { closed: boolean | null; pass: boolean; notes: string[] },
): CaseResult {
  const t0 = Date.now();
  const before = JSON.stringify(graph);
  const r: CaseResult = {
    id, set, name, expectation, threw: null, pages: 0, sections: 0,
    validationErrors: 0, validationWarnings: 0, renderable: false,
    ctxBuilt: false, modelBuilt: false, boundObjectIds: 0, unknownObjectIds: [],
    schemaErrors: 0, schemaWarnings: 0, graphMutated: false,
    ms: 0, closed: null, pass: false, notes: [],
  };
  let spec: any = null, model: any = null;
  try {
    spec = generateSiteSpec(graph, { generatedAt: AT });
    r.graphMutated = JSON.stringify(graph) !== before;
    r.pages = spec.pages.length;
    r.sections = spec.pages.reduce((n: number, p: any) => n + p.sections.length, 0);
    const knownSchemas = new Set(graph.objects.map((o: any) => o.schema));
    const findings = validateSiteSpec(spec, knownSchemas);
    r.validationErrors = findings.filter((f: any) => f.severity === "error").length;
    r.validationWarnings = findings.filter((f: any) => f.severity === "warning").length;
    r.renderable = isRenderable(findings);
    for (const f of findings.filter((x: any) => x.severity === "error").slice(0, 4)) {
      r.notes.push("validator: " + f.path + " :: " + f.message);
    }
    const ctx = buildRenderContext(spec, graph, viewer);
    r.ctxBuilt = true;
    model = buildSemanticRenderModel(spec, ctx.graph, viewer, { asOf: ASOF });
    r.modelBuilt = true;
    const graphIds = new Set(ctx.graph.objects.map((o: any) => o.id));
    const bound: string[] = [];
    for (const p of model.pages) for (const s of p.sections) bound.push(...s.objectIds);
    r.boundObjectIds = bound.length;
    r.unknownObjectIds = [...new Set(bound.filter((x) => !graphIds.has(x)))];
    const gate = schemaGate(graph);
    r.schemaErrors = gate.errors;
    r.schemaWarnings = gate.warnings;
    r.notes.push(...gate.notes.slice(0, 6));
  } catch (e: any) {
    r.threw = String(e && e.message ? e.message : e).slice(0, 200);
  }
  r.ms = Date.now() - t0;
  const d = decide(r, model, spec);
  r.closed = d.closed;
  r.pass = d.pass;
  r.notes.push(...d.notes);
  return r;
}

// per-section duplicate detector: same object bound twice inside ONE section
function sectionDupes(model: any): string[] {
  const dupes: string[] = [];
  if (!model) return dupes;
  for (const p of model.pages) for (const s of p.sections) {
    const seen = new Set<string>(); const d = new Set<string>();
    for (const id of s.objectIds) { if (seen.has(id)) d.add(id); seen.add(id); }
    for (const id of d) dupes.push(p.slug + ":" + s.id + " binds " + id + " twice");
  }
  return dupes;
}

// ---------------------------------------------------------------- valid cases

function bizFull(id: string, extra: any = {}): any {
  return mkObj({
    id, schema: BIZ,
    title: "Happy Test Plumbing",
    description: "Family-run plumbing shop serving the valley since 1998.",
    fields: {
      category: "Plumbing",
      website: "https://happytestplumbing.example.com",
      phone: "+1 (970) 555-0100",
      email: "hello@happytestplumbing.example.com",
      hours: "Mon-Fri 8am-6pm",
      socials: ["https://facebook.com/happytestplumbing"],
      ...extra,
    },
  });
}

function validCases(): CaseResult[] {
  const out: CaseResult[] = [];
  const validDecide = (r: CaseResult) => ({
    closed: null as boolean | null,
    pass: !r.threw && r.renderable && r.ctxBuilt && r.modelBuilt &&
      r.unknownObjectIds.length === 0 && r.schemaErrors === 0 && !r.graphMutated,
    notes: [] as string[],
  });

  // V1: minimal business, required fields only.
  out.push(runGraphCase("V1", "valid", "minimal business, required fields only",
    { objects: [mkObj({ id: "b1", schema: BIZ })], relationships: [] },
    VIEWER_ANON, "renders: no false rejection of a bare valid business", validDecide));

  // V2: full trade graph, every role, every proof-schema predicate.
  {
    const b = bizFull("b2");
    const objs = [b];
    const rels: any[] = [];
    const svcIds = ["s1", "s2", "s3"];
    for (const sid of svcIds) {
      objs.push(mkObj({ id: sid, schema: SVC, fields: { price_hint: "from $99", duration: "2-4 hours" } }));
      rels.push(mkRel("b2", "provides", sid));
    }
    objs.push(mkObj({ id: "p1", schema: "ping.social.product@1" }));
    rels.push(mkRel("b2", "provides", "p1"));
    for (const lid of ["l1", "l2"]) {
      objs.push(mkObj({ id: lid, schema: "ping.social.location@1" }));
      rels.push(mkRel("b2", "located_at", lid));
    }
    for (const pid of ["pe1", "pe2"]) {
      objs.push(mkObj({ id: pid, schema: "ping.social.person@1", provenanceKind: "canonical-journal" }));
      rels.push(mkRel("b2", "employs", pid));
    }
    for (const pid of ["po1", "po2", "po3"]) {
      objs.push(mkObj({ id: pid, schema: POST, fields: { tags: ["tips", "local"] } }));
      rels.push(mkRel("b2", "publishes", pid));
    }
    for (const aid of ["a1", "a2"]) {
      objs.push(mkObj({ id: aid, schema: "ping.social.article@1" }));
      rels.push(mkRel("b2", "publishes", aid));
    }
    // inverse edge: service points back at the business (2-cycle across schemas)
    rels.push(mkRel("s1", "provided_by", "b2"));
    // reply chain of posts, deepest first
    rels.push(mkRel("po2", "replies_to", "po1"));
    rels.push(mkRel("po3", "replies_to", "po2"));
    rels.push(mkRel("po1", "published_by", "b2"));
    const g = { objects: objs, relationships: rels };
    const r = runGraphCase("V2", "valid", "full trade graph: all roles, all predicates, reply chain, 2-cycle",
      g, VIEWER_ANON, "renders with every role/component/relationship exercised", (rr, model) => {
        const d = validDecide(rr);
        const comps = new Set<string>();
        if (model) for (const p of model.pages) for (const s of p.sections) comps.add(s.component);
        const want = ["Hero", "BusinessSummary", "Services", "Products", "Locations", "People", "RecentObjects", "Contact", "Links", "CTA", "AskFYD", "ObjectRail", "ObjectFeed"];
        const missing = want.filter((c) => !comps.has(c));
        if (missing.length) { d.pass = false; d.notes.push("missing components: " + missing.join(",")); }
        // determinism: same graph twice -> byte-identical spec
        const spec2 = generateSiteSpec(g, { generatedAt: AT });
        const spec1 = generateSiteSpec(g, { generatedAt: AT });
        if (JSON.stringify(spec1) !== JSON.stringify(spec2)) { d.pass = false; d.notes.push("NON-DETERMINISTIC spec"); }
        else d.notes.push("determinism: byte-identical spec across two runs");
        d.notes.push("components bound: " + [...comps].sort().join(","));
        return d;
      });
    out.push(r);
  }

  // V3: knowledge vocabulary only (role projection path).
  {
    const objs = [
      mkObj({ id: "kb", schema: "ping.knowledge.business@1", title: "K Biz", description: "Knowledge biz." }),
      mkObj({ id: "ks", schema: "ping.knowledge.service@1" }),
      mkObj({ id: "kl", schema: "ping.knowledge.location@1" }),
      mkObj({ id: "kpe", schema: "ping.knowledge.person@1" }),
      mkObj({ id: "kpo", schema: "ping.knowledge.post@1" }),
      mkObj({ id: "kar", schema: "ping.knowledge.article@1" }),
    ];
    const rels = [
      mkRel("kb", "offers", "ks"),
      mkRel("kb", "has_location", "kl"),
      mkRel("kb", "has_member", "kpe"),
      mkRel("kb", "publishes", "kpo"),
      mkRel("kb", "publishes", "kar"),
    ];
    out.push(runGraphCase("V3", "valid", "knowledge vocabulary only, role-projected",
      { objects: objs, relationships: rels }, VIEWER_ANON,
      "renders via schemaRole projection, no hardcoded social ids", validDecide));
  }

  // V4: mixed vocabularies on one owner.
  {
    const objs = [
      bizFull("b4"),
      mkObj({ id: "s4", schema: SVC }),
      mkObj({ id: "ks4", schema: "ping.knowledge.service@1" }),
    ];
    const rels = [mkRel("b4", "provides", "s4"), mkRel("b4", "offers", "ks4")];
    out.push(runGraphCase("V4", "valid", "mixed social + knowledge services on one owner",
      { objects: objs, relationships: rels }, VIEWER_ANON,
      "renders; both predicates populate the service role", (r, model) => {
        const d = validDecide(r);
        let svcBound: string[] = [];
        if (model) for (const p of model.pages) for (const s of p.sections)
          if (s.component === "Services") svcBound.push(...s.objectIds);
        if (!(svcBound.includes("s4") && svcBound.includes("ks4"))) {
          d.pass = false; d.notes.push("services bound: " + svcBound.join(","));
        }
        return d;
      }));
  }

  // V5: provenance kinds, private objects, inactive + duplicate edges.
  {
    const objs = [
      bizFull("b5"),
      mkObj({ id: "s5a", schema: SVC }),
      mkObj({ id: "s5b", schema: SVC, visibility: "private" }),
      mkObj({ id: "s5c", schema: SVC, provenanceKind: "overlay-authored" }),
      mkObj({ id: "s5d", schema: SVC, provenanceKind: "canonical-journal" }),
      mkObj({ id: "pe5", schema: "ping.social.person@1", visibility: "private" }),
    ];
    const rels = [
      mkRel("b5", "provides", "s5a"),
      mkRel("b5", "provides", "s5b"),
      mkRel("b5", "provides", "s5c"),
      mkRel("b5", "provides", "s5d"),
      mkRel("b5", "employs", "pe5"),
      mkRel("b5", "provides", "s5a", "inactive"), // revocation-style edge on same triple
    ];
    out.push(runGraphCase("V5", "valid", "provenance mix, private objects, inactive + duplicate edges",
      { objects: objs, relationships: rels }, VIEWER_ANON,
      "renders; private excluded, duplicate active edges deduped per section", (r, model) => {
        const d = validDecide(r);
        let svcBound: string[] = [];
        if (model) for (const p of model.pages) for (const s of p.sections)
          if (s.component === "Services" || s.component === "ObjectRail") svcBound.push(...s.objectIds);
        const notes: string[] = [];
        for (const bad of ["s5b", "pe5"]) if (svcBound.includes(bad)) { d.pass = false; notes.push("PRIVATE object rendered: " + bad); }
        const dupes = sectionDupes(model);
        if (dupes.length) { d.pass = false; notes.push("WITHIN-SECTION duplicates: " + dupes.join("; ")); }
        else notes.push("no within-section duplicates");
        for (const good of ["s5a", "s5c", "s5d"]) if (!svcBound.includes(good)) { d.pass = false; notes.push("missing public service: " + good); }
        d.notes.push(...notes);
        return d;
      }));
  }

  // V6: viewer matrix on a normal graph (capability-relevant viewer states).
  for (const [vid, viewer] of [["anon", VIEWER_ANON], ["controller", VIEWER_CTRL], ["stranger", VIEWER_OTHER]] as const) {
    out.push(runGraphCase("V6-" + vid, "valid", "viewer matrix: " + vid,
      { objects: [bizFull("b6"), mkObj({ id: "s6", schema: SVC }), mkObj({ id: "po6", schema: POST })],
        relationships: [mkRel("b6", "provides", "s6"), mkRel("b6", "publishes", "po6")] },
      viewer, "render context builds for every viewer state", validDecide));
  }

  // V7: scale probe, 421 objects (factory relevance).
  {
    const objs: any[] = [bizFull("b7")];
    const rels: any[] = [];
    let n = 0;
    const add = (schema: string, pred: string) => {
      const id = "x" + (n++);
      objs.push(mkObj({ id, schema, updatedAt: "2026-0" + ((n % 9) + 1) + "-15T00:00:00Z" }));
      rels.push(mkRel("b7", pred, id));
    };
    for (let i = 0; i < 200; i++) add(SVC, "provides");
    for (let i = 0; i < 100; i++) add(POST, "publishes");
    for (let i = 0; i < 50; i++) add("ping.social.person@1", "employs");
    for (let i = 0; i < 50; i++) add("ping.social.location@1", "located_at");
    for (let i = 0; i < 20; i++) add("ping.social.product@1", "provides");
    const r = runGraphCase("V7", "valid", "scale: 421 objects, 420 relationships",
      { objects: objs, relationships: rels }, VIEWER_ANON,
      "renders in bounded time, no false rejection at scale", (rr) => {
        const d = validDecide(rr);
        d.notes.push("pipeline ms: " + rr.ms);
        if (rr.ms > 30000) { d.pass = false; d.notes.push("TOO SLOW for factory use"); }
        return d;
      });
    out.push(r);
  }

  // V8: every eligible component for every schema (eligibility consistency).
  {
    const schemas = [BIZ, SVC, POST, "ping.social.product@1", "ping.social.location@1",
      "ping.social.person@1", "ping.social.article@1", "ping.knowledge.website@1"];
    const pages: any[] = [];
    const sections: any[] = [];
    let idx = 0;
    for (const s of schemas) {
      for (const c of eligibleComponents(s)) {
        sections.push({ id: "p:" + c + ":" + idx, component: c, query: { kind: "all", schemas: [s] }, presentation: {} });
        idx++;
      }
    }
    pages.push({ slug: "p", title: "P", navLabel: "P", sections });
    const spec: any = {
      kind: "fyd.sitespec@1", ownerObjectId: "b8", version: 1,
      generator: { name: "fyd-site-generator", version: "test", generatedAt: AT },
      themeTokens: { ...DEFAULT_FYD_THEME },
      navigation: [{ label: "P", pageSlug: "p" }],
      pages, provenance: { source: "website-ingestion", claimKind: "website_statement", note: "fuzz" },
    };
    const findings = validateSiteSpec(spec, new Set(schemas));
    const errs = findings.filter((f: any) => f.severity === "error");
    out.push({
      id: "V8", set: "valid", name: "every eligible component x schema validates",
      expectation: "validator accepts every schema-declared component pairing",
      threw: null, pages: 1, sections: sections.length,
      validationErrors: errs.length,
      validationWarnings: findings.filter((f: any) => f.severity === "warning").length,
      renderable: isRenderable(findings), ctxBuilt: false, modelBuilt: false,
      boundObjectIds: 0, unknownObjectIds: [], schemaErrors: 0, schemaWarnings: 0,
      graphMutated: false, ms: 0, closed: null, pass: errs.length === 0,
      notes: errs.slice(0, 5).map((f: any) => "validator: " + f.path + " :: " + f.message),
    });
  }

  // V9: whitespace-only description (BusinessSummary skipped, still renders).
  out.push(runGraphCase("V9", "valid", "whitespace-only description",
    { objects: [mkObj({ id: "b9", schema: BIZ, description: "   " })], relationships: [] },
    VIEWER_ANON, "renders without BusinessSummary, no false rejection", validDecide));

  // V10: boundary URL values on url-typed fields.
  out.push(runGraphCase("V10", "valid", "boundary URL values (https + relative)",
    { objects: [mkObj({ id: "b10", schema: BIZ,
      fields: { website: "https://example.com/path?q=1", socials: ["/local/path"] } })],
      relationships: [] },
    VIEWER_ANON, "renders; no url warnings for well-formed values", (r) => {
      const d = validDecide(r);
      if (r.schemaWarnings > 0) { d.pass = false; d.notes.push("unexpected url warnings: " + r.schemaWarnings); }
      return d;
    }));

  return out;
}

// ---------------------------------------------------------------- hostile cases

function hostileCases(): CaseResult[] {
  const out: CaseResult[] = [];

  // H1: unregistered schema only. No business role -> no owner -> empty spec.
  out.push(runGraphCase("H1", "hostile", "unregistered schema object only",
    { objects: [mkObj({ id: "u1", schema: "ping.social.unknown@1" })], relationships: [] },
    VIEWER_ANON, "typed failure: spec not renderable, no crash",
    (r) => ({ closed: !r.threw && !r.renderable, pass: !r.threw && !r.renderable,
      notes: ["closed=" + (!r.threw && !r.renderable)] })));

  // H2: schema-less object.
  out.push(runGraphCase("H2", "hostile", "empty-string schema object",
    { objects: [mkObj({ id: "u2", schema: "" })], relationships: [] },
    VIEWER_ANON, "typed failure: spec not renderable, no crash",
    (r) => ({ closed: !r.threw && !r.renderable, pass: !r.threw && !r.renderable,
      notes: ["eligibleComponents('')=" + JSON.stringify(eligibleComponents(""))] })));

  // H3: schema string carrying markup injection.
  out.push(runGraphCase("H3", "hostile", "schema id with injected markup",
    { objects: [mkObj({ id: "u3", schema: 'ping.social.business@1"><svg onload=alert(1)>' })], relationships: [] },
    VIEWER_ANON, "not treated as business; no markup reaches any output",
    (r, model) => {
      const ok = !r.threw && !r.renderable && r.unknownObjectIds.length === 0;
      return { closed: ok, pass: ok,
        notes: ["schemaRole=" + String(schemaRole('ping.social.business@1"><svg onload=alert(1)>')),
                "eligible=" + JSON.stringify(eligibleComponents('ping.social.business@1"><svg onload=alert(1)>'))] };
    }));

  // H4: business missing required field (description empty).
  out.push(runGraphCase("H4", "hostile", "business missing required description",
    { objects: [mkObj({ id: "b4h", schema: BIZ, description: "" })], relationships: [] },
    VIEWER_ANON, "schema gate must flag; pipeline alone renders (gap probe)",
    (r) => {
      const gateClosed = !r.threw && r.schemaErrors > 0;
      const pipelineClosed = !r.renderable;
      return { closed: pipelineClosed, pass: gateClosed,
        notes: ["pipeline renderable=" + r.renderable + " (renders schema-invalid object: GAP if true)",
                "schema-gate errors=" + r.schemaErrors + " (gate catches it: " + gateClosed + ")"] };
    }));

  // H5: relationship pointing at a missing object.
  out.push(runGraphCase("H5", "hostile", "relationship to missing object id",
    { objects: [bizFull("b5h"), mkObj({ id: "s5h", schema: SVC })],
      relationships: [mkRel("b5h", "provides", "ghost-1"), mkRel("b5h", "provides", "s5h"), mkRel("nobody", "provides", "s5h")] },
    VIEWER_ANON, "dangling edges dropped silently; no invented claims",
    (r, model) => {
      let hasServices = false;
      if (model) for (const p of model.pages) for (const s of p.sections) if (s.component === "Services") hasServices = true;
      const ok = !r.threw && r.renderable && r.unknownObjectIds.length === 0 && hasServices;
      return { closed: ok, pass: ok, notes: ["services section present=" + hasServices, "ghost-1 never bound"] };
    }));

  // H6: predicate/target-schema mismatch (provides -> person).
  out.push(runGraphCase("H6", "hostile", "provides edge to a person (schema mismatch)",
    { objects: [bizFull("b6h"), mkObj({ id: "pe6h", schema: "ping.social.person@1" })],
      relationships: [mkRel("b6h", "provides", "pe6h")] },
    VIEWER_ANON, "mismatched target never rendered as a service",
    (r, model) => {
      let bound: string[] = [];
      if (model) for (const p of model.pages) for (const s of p.sections) bound.push(...s.objectIds);
      const ok = !r.threw && !bound.includes("pe6h");
      return { closed: ok, pass: ok,
        notes: ["person bound anywhere=" + bound.includes("pe6h"),
                "isAllowedPredicate(business,'provides')=" + isAllowedPredicate(BIZ, "provides"),
                "provides targets=" + JSON.stringify(relationshipRules(BIZ).find((x: any) => x.predicate === "provides")?.targetSchemas)] };
    }));

  // H7: active + inactive edges on the same triple (revocation conflict).
  out.push(runGraphCase("H7", "hostile", "active and inactive edge on same triple",
    { objects: [bizFull("b7h"), mkObj({ id: "s7h", schema: SVC })],
      relationships: [mkRel("b7h", "provides", "s7h", "active"), mkRel("b7h", "provides", "s7h", "inactive")] },
    VIEWER_ANON, "no duplication within a section; revocation semantics observed",
    (r, model) => {
      const dupes = sectionDupes(model);
      const perServices: string[] = [];
      if (model) for (const p of model.pages) for (const s of p.sections)
        if (s.component === "Services") {
          const n = s.objectIds.filter((x: string) => x === "s7h").length;
          perServices.push(p.slug + ":" + n + "x");
          if (n !== 1) perServices.push("OFF");
        }
      const ok = !r.threw && dupes.length === 0 && !perServices.includes("OFF");
      return { closed: ok, pass: ok,
        notes: ["per-section s7h counts: " + perServices.join(", "),
                dupes.length ? "DUPES: " + dupes.join("; ") : "no within-section duplicates",
                "active won; inactive revocation NOT honored (semantic gap)"] };
    }));

  // H8: cyclic replies_to (A replies to B, B replies to A).
  out.push(runGraphCase("H8", "hostile", "reply cycle A<->B plus self-loop",
    { objects: [bizFull("b8h"), mkObj({ id: "pa", schema: POST }), mkObj({ id: "pb", schema: POST }), mkObj({ id: "pc", schema: POST })],
      relationships: [mkRel("b8h", "publishes", "pa"), mkRel("b8h", "publishes", "pb"), mkRel("b8h", "publishes", "pc"),
        mkRel("pa", "replies_to", "pb"), mkRel("pb", "replies_to", "pa"), mkRel("pc", "replies_to", "pc")] },
    VIEWER_ANON, "no hang, no crash; cycles pass through undetected (gap probe)",
    (r) => ({ closed: !r.threw, pass: !r.threw,
      notes: ["no cycle detection exists in schema/relationship authorities: latent traversal risk"] })));

  // H9: capability grant with no evidence basis (evidence-blindness probe).
  {
    const def = getSchemaDef(POST)!;
    const withViewer = capabilityOptions(def, { viewerId: "v1", controllerId: "ctrl-x", hasWebsite: false });
    const grantReply = withViewer.includes("reply");
    const evidenceBlind = true; // capabilityOptions signature has no evidence input at all
    out.push({
      id: "H9", set: "hostile", name: "capability granted with zero evidence basis",
      expectation: "capability layer should consult evidence state; it does not (gap probe)",
      threw: null, pages: 0, sections: 0, validationErrors: 0, validationWarnings: 0,
      renderable: false, ctxBuilt: false, modelBuilt: false, boundObjectIds: 0,
      unknownObjectIds: [], schemaErrors: 0, schemaWarnings: 0, graphMutated: false, ms: 0,
      closed: false, pass: true,
      notes: ["capabilityOptions(post, signed-in viewer)=" + JSON.stringify(withViewer),
              "reply granted=" + grantReply + " with no evidence input in the signature (GAP: evidence-blind)"],
    });
  }

  // H10: javascript: URL in a url-typed field.
  out.push(runGraphCase("H10", "hostile", "javascript: URL in website field",
    { objects: [mkObj({ id: "b10h", schema: BIZ, fields: { website: "javascript:alert(document.domain)" } })],
      relationships: [] },
    VIEWER_ANON, "schema type 'url' should reject; currently warning-only (gap probe)",
    (r) => {
      const rejected = r.schemaErrors > 0;
      return { closed: rejected, pass: !r.threw,
        notes: ["schema errors=" + r.schemaErrors + " warnings=" + r.schemaWarnings,
                rejected ? "rejected" : "GAP: hostile URL is warning-only; real guard is downstream safe-link"] };
    }));

  // H11: wrong field types (type confusion).
  out.push(runGraphCase("H11", "hostile", "wrong field types (number title, string socials)",
    { objects: [mkObj({ id: "b11h", schema: BIZ, fields: { socials: "not-an-array" } as any })],
      relationships: [] },
    VIEWER_ANON, "schema gate must flag type violations",
    (r) => {
      const gateClosed = !r.threw && r.schemaErrors > 0;
      return { closed: !r.renderable, pass: gateClosed,
        notes: ["schema errors=" + r.schemaErrors,
                "pipeline renderable=" + r.renderable + " (pipeline ignores field types: GAP, same as H4)"] };
    }));

  // H12: hand-mutated specs against the validator.
  const baseSpec = (): any => {
    const g = { objects: [bizFull("b12"), mkObj({ id: "s12", schema: SVC })],
      relationships: [mkRel("b12", "provides", "s12")] };
    return generateSiteSpec(g, { generatedAt: AT });
  };
  const specCase = (id: string, name: string, mut: (s: any) => void, expectation: string): CaseResult => {
    const t0 = Date.now();
    let threw: string | null = null, errs = 0, warns = 0, renderable = false;
    const notes: string[] = [];
    try {
      const spec = baseSpec(); mut(spec);
      const findings = validateSiteSpec(spec, new Set([BIZ, SVC]));
      errs = findings.filter((f: any) => f.severity === "error").length;
      warns = findings.filter((f: any) => f.severity === "warning").length;
      renderable = isRenderable(findings);
      for (const f of findings.filter((x: any) => x.severity === "error").slice(0, 3))
        notes.push("validator: " + f.path + " :: " + f.message);
    } catch (e: any) { threw = String(e && e.message ? e.message : e).slice(0, 200); }
    const closed = !threw && errs > 0 && !renderable;
    return { id, set: "hostile", name, expectation, threw, pages: 0, sections: 0,
      validationErrors: errs, validationWarnings: warns, renderable,
      ctxBuilt: false, modelBuilt: false, boundObjectIds: 0, unknownObjectIds: [],
      schemaErrors: 0, schemaWarnings: 0, graphMutated: false, ms: Date.now() - t0,
      closed, pass: closed, notes };
  };
  out.push(specCase("H12a", "mutated spec: duplicate page slug",
    (s) => { s.pages[1].slug = s.pages[0].slug; }, "typed error, not renderable"));
  out.push(specCase("H12b", "mutated spec: unknown component",
    (s) => { s.pages[0].sections[0].component = "EvilWidget"; }, "typed error, not renderable"));
  out.push(specCase("H12c", "mutated spec: nav to missing page",
    (s) => { s.navigation.push({ label: "Ghost", pageSlug: "ghost" }); }, "typed error, not renderable"));
  out.push(specCase("H12d", "mutated spec: duplicate section id",
    (s) => { s.pages[0].sections[1].id = s.pages[0].sections[0].id; }, "typed error, not renderable"));

  // H13: unknown schema paired with a non-generic component.
  out.push(specCase("H13", "unknown schema with Services component",
    (s) => {
      s.pages[0].sections.push({ id: "home:Services:99", component: "Services",
        query: { kind: "all", schemas: ["ping.social.unknown@1"] }, presentation: {} });
    }, "typed error: component does not accept schema"));

  // H14: duplicate object ids (last-wins silently).
  out.push(runGraphCase("H14", "hostile", "duplicate object ids, different schemas",
    { objects: [bizFull("dup"), mkObj({ id: "dup", schema: SVC, title: "Impostor Service" })], relationships: [] },
    VIEWER_ANON, "no crash; duplicate ids undetected (gap probe)",
    (r, model) => {
      let owner: string[] = [];
      if (model) for (const p of model.pages) for (const s of p.sections)
        if (s.component === "Hero") owner.push(...s.objectIds);
      return { closed: !r.threw, pass: !r.threw,
        notes: ["hero bound: " + owner.join(","), "last-wins silently, no duplicate-id finding (GAP)"] };
    }));

  // H15: business<->service 2-cycle through provides/provided_by.
  out.push(runGraphCase("H15", "hostile", "business/service 2-cycle",
    { objects: [bizFull("b15h"), mkObj({ id: "s15h", schema: SVC })],
      relationships: [mkRel("b15h", "provides", "s15h"), mkRel("s15h", "provided_by", "b15h")] },
    VIEWER_ANON, "no infinite loop anywhere in the pipeline",
    (r) => ({ closed: !r.threw && r.renderable, pass: !r.threw && r.renderable, notes: [] })));

  // H16: private owner only (no public business).
  out.push(runGraphCase("H16", "hostile", "private owner only",
    { objects: [mkObj({ id: "b16h", schema: BIZ, visibility: "private" })], relationships: [] },
    VIEWER_ANON, "typed failure: no public owner, spec not renderable",
    (r) => ({ closed: !r.threw && !r.renderable, pass: !r.threw && !r.renderable, notes: [] })));

  // H17: duplicate ACTIVE edges on the same triple.
  out.push(runGraphCase("H17", "hostile", "duplicate active edges on same triple",
    { objects: [bizFull("b17h"), mkObj({ id: "s17h", schema: SVC })],
      relationships: [mkRel("b17h", "provides", "s17h"), mkRel("b17h", "provides", "s17h")] },
    VIEWER_ANON, "same object must not bind twice inside one section",
    (r, model) => {
      const dupes = sectionDupes(model);
      const ok = !r.threw && dupes.length === 0;
      return { closed: ok, pass: !r.threw,
        notes: dupes.length ? ["GAP: " + dupes.join("; "), "generator dedupes (Map) but resolveQuery does not"] : ["deduped cleanly"] };
    }));

  return out;
}

// ---------------------------------------------------------------- schema authority probes

function schemaProbes(): any[] {
  const out: any[] = [];

  // S1: predicate allowlist matrix across the three proof schemas.
  {
    const preds = ["provides", "publishes", "located_at", "employs", "provided_by", "published_by", "replies_to", "offers", "evil_pred"];
    const rows: any[] = [];
    for (const s of [BIZ, SVC, POST]) {
      const row: any = { schema: s };
      for (const p of preds) row[p] = isAllowedPredicate(s, p);
      rows.push(row);
    }
    // knowledge schemas have no relationship rules at all
    const kRow: any = { schema: "ping.knowledge.service@1" };
    for (const p of preds) kRow[p] = isAllowedPredicate("ping.knowledge.service@1", p);
    rows.push(kRow);
    out.push({ id: "S1", name: "predicate allowlist matrix", rows });
  }

  // S2: capability options matrix (viewer x website x controller).
  {
    const rows: any[] = [];
    const viewers = [
      { label: "anon", v: { viewerId: null, controllerId: "ctrl-1", hasWebsite: false } },
      { label: "anon+site", v: { viewerId: null, controllerId: "ctrl-1", hasWebsite: true } },
      { label: "controller", v: { viewerId: "ctrl-1", controllerId: "ctrl-1", hasWebsite: true } },
      { label: "stranger+site", v: { viewerId: "other", controllerId: "ctrl-1", hasWebsite: true } },
    ];
    for (const def of FYD_SCHEMAS) {
      for (const vw of viewers) {
        rows.push({ schema: def.id, viewer: vw.label, actions: capabilityOptions(def, vw.v as any) });
      }
    }
    // invariant checks
    const notes: string[] = [];
    for (const row of rows) {
      const def = getSchemaDef(row.schema)!;
      if (row.actions.includes("follow") && !def.identityBacked) notes.push("VIOLATION: follow on non-identity " + row.schema);
      if (row.actions.includes("like") && !def.likeable) notes.push("VIOLATION: like on non-likeable " + row.schema);
      if (row.actions.includes("reply") && !(row.schema === POST && row.viewer !== "anon" && row.viewer !== "anon+site"))
        notes.push("VIOLATION: reply misgranted on " + row.schema + "/" + row.viewer);
      if (row.actions.includes("propose_update") && row.viewer !== "controller")
        notes.push("VIOLATION: propose_update for non-controller on " + row.schema);
      if (row.actions.includes("open_website") && !(row.viewer === "anon+site" || row.viewer === "controller" || row.viewer === "stranger+site"))
        notes.push("VIOLATION: open_website without website on " + row.schema);
    }
    out.push({ id: "S2", name: "capability options matrix + invariants", rows, invariantViolations: notes });
  }

  // S3: agent tool descriptions are deterministic and schema-derived.
  {
    const rows = FYD_SCHEMAS.map((d) => {
      const a = agentToolDescription(d), b = agentToolDescription(d);
      return { schema: d.id, deterministic: a === b, mentionsCapabilities: a.includes("Capabilities:"), length: a.length };
    });
    out.push({ id: "S3", name: "agent tool description determinism", rows });
  }

  // S4: validateAgainstSchema boundary values.
  {
    const def = getSchemaDef(BIZ)!;
    const rec = (fields: any, title = "T", description = "D") => ({ title, description, fields });
    const cases: any[] = [
      ["ok https url", rec({ website: "https://example.com" }), 0, 0],
      ["ok relative url", rec({ website: "/about" }), 0, 0],
      ["bad url warning", rec({ website: "notaurl" }), 0, 1],
      ["javascript url", rec({ website: "javascript:alert(1)" }), 0, 1],
      ["missing required", rec({}, "T", ""), 1, 0],
      ["wrong type string[]", rec({ socials: "nope" }), 1, 0],
      ["array with non-string", rec({ socials: ["ok", 7] }), 1, 0],
      ["unknown field tolerated", rec({ mystery: "x" }), 0, 0],
    ];
    const rows = cases.map(([name, r, expE, expW]: any) => {
      const fs = validateAgainstSchema(def, r, "object:probe");
      const e = fs.filter((f: any) => f.severity === "error").length;
      const w = fs.filter((f: any) => f.severity === "warning").length;
      const info = fs.filter((f: any) => f.severity === "info").length;
      return { name, errors: e, warnings: w, info, expected: expE + "e/" + expW + "w", match: e === expE && w === expW };
    });
    out.push({ id: "S4", name: "validateAgainstSchema boundaries", rows });
  }

  // S5: schemaRole coverage for every role id in play.
  {
    const ids = ["ping.social.business@1", "ping.knowledge.business@1", "ping.social.service@1",
      "ping.knowledge.service@1", "ping.social.product@1", "ping.social.location@1", "ping.knowledge.location@1",
      "ping.social.person@1", "ping.knowledge.person@1", "ping.social.post@1", "ping.knowledge.post@1",
      "ping.social.article@1", "ping.knowledge.article@1", "ping.knowledge.website@1",
      "ping.social.unknown@1", ""];
    out.push({ id: "S5", name: "schemaRole coverage",
      rows: ids.map((s) => ({ schema: s === "" ? "(empty)" : s, role: schemaRole(s) })) });
  }

  return out;
}

// ---------------------------------------------------------------- main

function main() {
  const inventory = buildInventory();
  const valid = validCases();
  const hostile = hostileCases();
  const probes = schemaProbes();

  const vPass = valid.filter((r) => r.pass).length;
  const hClosed = hostile.filter((r) => r.closed === true).length;
  const hGaps = hostile.filter((r) => r.closed === false);

  const summary = {
    valid: { total: valid.length, pass: vPass, rate: (100 * vPass / valid.length).toFixed(1) + "%" },
    hostile: { total: hostile.length, failClosed: hClosed,
      rate: (100 * hClosed / hostile.length).toFixed(1) + "%",
      gaps: hGaps.map((r) => r.id) },
  };

  console.log("=== SCHEMA-FUZZ SUMMARY ===");
  console.log("valid:   " + vPass + "/" + valid.length + " passed");
  console.log("hostile: " + hClosed + "/" + hostile.length + " failed closed");
  console.log("gap cases: " + hGaps.map((r) => r.id).join(", "));
  console.log("--- per case ---");
  for (const r of [...valid, ...hostile]) {
    const flag = r.set === "valid" ? (r.pass ? "PASS" : "FAIL") : (r.closed === true ? "CLOSED" : r.closed === false ? "GAP" : (r.pass ? "PASS" : "FAIL"));
    console.log(flag + " " + r.id + " " + r.name +
      " | threw=" + (r.threw ? "YES:" + r.threw.slice(0, 60) : "no") +
      " renderable=" + r.renderable + " verr=" + r.validationErrors +
      " schErr=" + r.schemaErrors + " unknownIds=" + r.unknownObjectIds.length +
      " ms=" + r.ms);
    for (const n of r.notes.slice(0, 3)) console.log("      note: " + n);
  }
  console.log("--- probes ---");
  for (const p of probes) {
    if (p.id === "S2") console.log("S2 invariant violations: " + (p.invariantViolations.length ? p.invariantViolations.join("; ") : "none"));
    if (p.id === "S4") for (const row of p.rows) console.log("S4 " + row.name + ": " + (row.match ? "ok" : "MISMATCH") + " got " + row.errors + "e/" + row.warnings + "w/" + row.info + "i");
  }

  const fs = require("fs");
  fs.writeFileSync("/mnt/c/Users/nolan/transfer/fuzz-results.json",
    JSON.stringify({ inventory, summary, valid, hostile, probes }, null, 1));
  console.log("WROTE fuzz-results.json");
}

main();
