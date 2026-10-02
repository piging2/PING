/**
 * WORLD-SHARD-2 harness: worlds [start, end).
 * Read-only against /home/nolan/projects/ping (fyd-factory branch).
 * Run: tsx --tsconfig <repo>/tsconfig.json harness.tsx <start> <end>
 */
import * as fs from "fs";
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
import type {
  PingObject,
  PingRelationship,
} from "../projects/ping/src/lib/ping/types";
import type { FieldVisibilityDecision } from "../projects/ping/src/fyd/sitespec/field-visibility";

// ---------------------------------------------------------------------------
// Deterministic world addressing (MISSION-PROTOCOL.md contract)
// ---------------------------------------------------------------------------

const TYPES = [
  "local-services","professional","restaurant","hospitality","health","fitness","beauty",
  "automotive","real-estate","construction","manufacturing","logistics","retail","ecommerce",
  "education","nonprofit","creator","consulting","finance","legal","tech","saas","enterprise",
  "multi-location","franchise","marketplace","mobile-service","appointment","catalog",
  "knowledge","project","membership",
];
const DIMS = ["service-heavy","location-heavy","person-heavy","portfolio-heavy","event-heavy","transaction-heavy"];
const HOSTILES = ["no-jsonld","conflicting-hours","many-services","unsafe-urls","rtl-text","franchise-lookalike","stale-source","contradictory-sources","broken-media","clean"];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function address(i: number) {
  return {
    type: TYPES[i % 32],
    dim: DIMS[Math.floor(i / 32) % 6],
    hostile: i % 4 === 0 ? HOSTILES[Math.floor(i / 192) % 10] : "clean",
    owner_intent: i % 5 === 0 ? "hide-object" : i % 5 === 1 ? "correct-fact" : "none",
  };
}

// ---------------------------------------------------------------------------
// Synthetic name/word lists (all invented; every artifact marked synthetic)
// ---------------------------------------------------------------------------

const PREFIX = ["Cedar","Mesa","Juniper","Copper","Redrock","Pioneer","Grand","Riverbend","Sagebrush","Cottonwood","Elk","Onyx","Summit","Golden","Iron","Stone","Willow","Bear","Fox","Sage"];
const TYPE_NOUN: Record<string, string> = {
  "local-services": "Home Services", professional: "Professional Group", restaurant: "Kitchen & Table",
  hospitality: "Lodge & Stay", health: "Wellness Center", fitness: "Training Co", beauty: "Beauty Studio",
  automotive: "Auto Care", "real-estate": "Realty Partners", construction: "Builders",
  manufacturing: "Fabrication Works", logistics: "Logistics Co", retail: "Supply Store",
  ecommerce: "Online Goods", education: "Learning Center", nonprofit: "Community Fund",
  creator: "Media Studio", consulting: "Advisors", finance: "Financial Group", legal: "Law Office",
  tech: "Technology Lab", saas: "Software Suite", enterprise: "Enterprise Systems",
  "multi-location": "Locations Group", franchise: "Brand Outlets", marketplace: "Market Hall",
  "mobile-service": "Mobile Services", appointment: "Booking Studio", catalog: "Catalog Co",
  knowledge: "Knowledge Base", project: "Project Works", membership: "Members Club",
};
const CHAINY = ["Express", "Plus", "USA", "King", "Pro", "Direct"];
const SVC_WORDS = ["Inspection","Tune-Up","Deep Clean","Consultation","Repair","Installation","Maintenance","Assessment","Overhaul","Calibration","Walkthrough","Refresh","Audit","Setup","Polish","Seal"];
const PROD_WORDS = ["Starter Kit","Pro Bundle","Deluxe Pack","Essential Set","Workshop Crate","Field Pack"];
const PERSON_FIRST = ["Alex","Jordan","Taylor","Casey","Riley","Morgan","Quinn","Avery","Jamie","Drew"];
const PERSON_LAST = ["Rivera","Stone","Brooks","Hayes","Cole","Mercer","Vaughn","Reed","Blake","Frost"];
const LOC_WORDS = ["Downtown","Northside","Riverside","Old Town","West End"];
const POST_WORDS = ["Grand opening recap","Seasonal tips","Behind the scenes","Customer story","New offering"];

const GENERATED_AT = "2026-09-23T20:00:00.000Z";
// Pig-side output dir (passed via FYD_OUT env); repo working tree is never touched.
const OUT_DIR = process.env.FYD_OUT || "/home/nolan/fyd-factory-shard2";
const RESULTS = `${OUT_DIR}/results.jsonl`;
const LOG = `${OUT_DIR}/SHARD-LOG.md`;

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function pad(n: number, w: number): string {
  return String(n).padStart(w, "0");
}
function log(line: string): void {
  fs.appendFileSync(LOG, line + "\n");
}

// ---------------------------------------------------------------------------
// World generation: SOURCE -> OBSERVATION -> EVIDENCE -> OBJECTS -> RELATIONSHIPS
// ---------------------------------------------------------------------------

interface WorldPlan {
  i: number;
  addr: ReturnType<typeof address>;
  name: string;
  phone: string;
  website: string;
  warnings: string[];
  synthetic: true;
  testing_only: true;
}

function planWorld(i: number): WorldPlan {
  const addr = address(i);
  const rng = mulberry32(i);
  const noun = TYPE_NOUN[addr.type];
  let name = `${pick(rng, PREFIX)} ${noun}`;
  if (addr.hostile === "franchise-lookalike") {
    name = `${pick(rng, PREFIX)} ${noun} ${pick(rng, CHAINY)}`;
  }
  const phone = `+1 (555) 01${100 + (i - 1000)}`;
  const host = `example-${pad(i, 4)}.test`;
  const website =
    addr.hostile === "unsafe-urls" ? `javascript:steal(${i})` : `https://${host}/`;
  return { i, addr, name, phone, website, warnings: [], synthetic: true, testing_only: true };
}

function mkObject(
  plan: WorldPlan, id: string, schema: string, title: string, description: string,
  fields: Record<string, string | string[]>,
): PingObject {
  return {
    id, schema, controllerId: `web:world-${plan.i}`,
    visibility: "public", title, description, fields,
    createdAt: GENERATED_AT, updatedAt: GENERATED_AT,
    provenance: { kind: "website-derived", ref: `web:/world-${plan.i}/${id.split(":").pop()}`, derivedAt: GENERATED_AT },
  };
}

interface WorldGraph {
  graph: ObjectGraph;
  businessId: string;
  hiddenObjectId: string | null;
  correctedPhone: string | null;
  sourcePhone: string;
}

function buildWorldGraph(plan: WorldPlan): WorldGraph {
  const { i, addr } = plan;
  const rng = mulberry32(i * 7919 + 13);
  const objects: PingObject[] = [];
  const relationships: PingRelationship[] = [];
  let relN = 0;
  const rel = (subject: string, predicate: string, object: string) => {
    relationships.push({
      id: `web:world-${i}:rel-${pad(relN++, 3)}`,
      subject, predicate, object, status: "active",
      createdAt: GENERATED_AT, evidenceRef: `web:/world-${i}/evidence`,
    });
  };

  const hours = addr.hostile === "conflicting-hours" ? "Mon-Fri 8am-6pm" : "Mon-Fri 9am-5pm";
  const biz = mkObject(plan, `web:world-${i}:business`, "ping.knowledge.business@1", plan.name,
    `Synthetic test business of type ${addr.type}. Not a real business.`,
    {
      phone: plan.phone,
      website: plan.website,
      hours,
      address: "999 Test Ave, Grand Junction, CO 81501",
      business_type: addr.type,
    });
  if (addr.hostile === "rtl-text") {
    biz.description = `Synthetic test business. ${"خدمات احترافية وموثوقة"}. Not a real business.`;
  }
  objects.push(biz);

  const addService = (k: number, title: string) => {
    const o = mkObject(plan, `web:world-${i}:svc-${pad(k, 2)}`, "ping.knowledge.service@1", title,
      `Synthetic service offering: ${title.toLowerCase()}.`,
      { price_hint: `$${50 + Math.floor(rng() * 400)}` });
    objects.push(o); rel(biz.id, "provides", o.id);
  };
  const addProduct = (k: number, title: string) => {
    const o = mkObject(plan, `web:world-${i}:prod-${pad(k, 2)}`, "ping.social.product@1", title,
      `Synthetic product: ${title.toLowerCase()}.`,
      { price: `$${20 + Math.floor(rng() * 200)}` });
    objects.push(o); rel(biz.id, "provides", o.id);
  };
  const addLocation = (k: number, title: string) => {
    const o = mkObject(plan, `web:world-${i}:loc-${pad(k, 2)}`, "ping.knowledge.location@1", title,
      `Synthetic location: ${title.toLowerCase()}.`,
      { address: `${100 + k} Test Ave, Grand Junction, CO 81501` });
    objects.push(o); rel(biz.id, "located_at", o.id);
  };
  const addPerson = (k: number) => {
    const nm = `${pick(rng, PERSON_FIRST)} ${pick(rng, PERSON_LAST)}`;
    const o = mkObject(plan, `web:world-${i}:person-${pad(k, 2)}`, "ping.knowledge.person@1", nm,
      `Synthetic team member.`, { role: pick(rng, ["Technician", "Manager", "Specialist", "Coordinator"]) });
    objects.push(o); rel(biz.id, "employs", o.id);
  };
  const addPost = (k: number, isArticle: boolean) => {
    const schema = isArticle ? "ping.knowledge.article@1" : "ping.social.post@1";
    const o = mkObject(plan, `web:world-${i}:${isArticle ? "art" : "post"}-${pad(k, 2)}`, schema,
      `${pick(rng, POST_WORDS)} ${k + 1}`,
      `Synthetic ${isArticle ? "article" : "post"} content.`,
      { published: `2026-0${1 + Math.floor(rng() * 8)}-15` });
    objects.push(o); rel(biz.id, "publishes", o.id);
  };

  const dim = addr.dim;
  const svcCount = addr.hostile === "many-services" ? 40
    : dim === "service-heavy" ? 8
    : 4;
  for (let k = 0; k < svcCount; k++) addService(k, `${pick(rng, SVC_WORDS)} ${k + 1}`);
  if (dim === "portfolio-heavy" || dim === "transaction-heavy" || addr.type === "catalog" || addr.type === "ecommerce" || addr.type === "retail") {
    const n = dim === "transaction-heavy" ? 6 : 4;
    for (let k = 0; k < n; k++) addProduct(k, `${pick(rng, PROD_WORDS)} ${k + 1}`);
  }
  if (dim === "location-heavy" || addr.type === "multi-location" || addr.type === "franchise") {
    const n = addr.type === "multi-location" ? 3 : 2;
    for (let k = 0; k < n; k++) addLocation(k, `${plan.name} ${pick(rng, LOC_WORDS)}`);
  }
  if (dim === "person-heavy" || addr.type === "professional" || addr.type === "health") {
    for (let k = 0; k < 4; k++) addPerson(k);
  }
  if (dim === "event-heavy" || addr.type === "knowledge" || addr.type === "creator") {
    for (let k = 0; k < 3; k++) addPost(k, false);
    if (addr.type === "knowledge") for (let k = 0; k < 2; k++) addPost(k + 3, true);
  }
  if (addr.hostile === "conflicting-hours") {
    const o = mkObject(plan, `web:world-${i}:loc-hours`, "ping.knowledge.location@1",
      `${plan.name} Hours Listing`, `Second hours listing with a different schedule.`,
      { hours: "Mon-Fri 9am-5pm", address: "999 Test Ave, Grand Junction, CO 81501" });
    objects.push(o); rel(biz.id, "located_at", o.id);
  }
  if (addr.hostile === "broken-media") {
    biz.fields["media_url"] = `https://example-${pad(i, 4)}.test/img/missing-${i}.jpg`;
    plan.warnings.push("broken-media: media_url recorded but never fetched (no live fetch in mission)");
  }

  // OWNER INTENT stage
  let hiddenObjectId: string | null = null;
  let correctedPhone: string | null = null;
  if (addr.owner_intent === "hide-object") {
    const svc = objects.find((o) => o.schema === "ping.knowledge.service@1");
    if (svc) {
      svc.visibility = "private"; // object-level hide via the model's own visibility authority
      hiddenObjectId = svc.id;
      plan.warnings.push(`owner-intent: hide-object applied to ${svc.id} (visibility=private)`);
    }
  } else if (addr.owner_intent === "correct-fact") {
    correctedPhone = `+1 (555) 02${100 + (i - 1000)}`;
    biz.fields["phone"] = correctedPhone;
    biz.ownerFieldCorrections = [{
      field: "phone", label: "Phone",
      sourceValue: plan.phone, ownerValue: correctedPhone,
      correctedAt: GENERATED_AT,
      actorLabel: "Synthetic Owner (seeded, unverified)",
      basis: "Owner correction: synthetic test owner attests the main number.",
    }];
    plan.warnings.push("owner-intent: correct-fact applied to phone (source preserved in ownerFieldCorrections)");
  }

  return { graph: { objects, relationships }, businessId: biz.id, hiddenObjectId, correctedPhone, sourcePhone: plan.phone };
}

// ---------------------------------------------------------------------------
// Mission runner: SOURCE -> ... -> VERIFY with typed outcomes, never throws
// ---------------------------------------------------------------------------

type Outcome =
  | "GENERATED" | "GENERATED_WITH_WARNINGS" | "NEEDS_REVIEW"
  | "ACQUISITION_FAILED" | "IDENTITY_AMBIGUOUS" | "EVIDENCE_CONFLICT"
  | "UNSAFE_SOURCE" | "UNSUPPORTED" | "CRASH";

const STAGES = ["source","observation","evidence","objects","relationships","owner_intent","sitespec","projection","render","verify"] as const;
type Stage = typeof STAGES[number];

interface MissionResult {
  mission: number;
  world: { type: string; dim: string; hostile: string; owner_intent: string };
  outcome: Outcome;
  failure_stage: Stage | null;
  failure_note: string | null;
  stage_latencies_ms: Record<string, number>;
  total_ms: number;
  object_count: number;
  relationship_count: number;
  page_count: number;
  section_count: number;
  rendered_section_count: number;
  unsafe_url_count: number;
  unbound_claim_count: number;
  warnings: string[];
  synthetic: true;
  testing_only: true;
}

const UNSAFE_RE = /\b(javascript|vbscript|data)\s*:/i;
const BADGE_RE = /Website statement|Site record|Demo addition|Mixed sources/;

function timed<T>(fn: () => T): { value: T; ms: number } {
  const t0 = performance.now();
  const value = fn();
  return { value, ms: performance.now() - t0 };
}

function runMission(i: number): MissionResult {
  const lat: Record<string, number> = {};
  const t0 = performance.now();
  let worldAddr = { type: "", dim: "", hostile: "", owner_intent: "" };
  const fail = (
    outcome: Outcome, stage: Stage, note: string,
    extra: Partial<MissionResult> = {},
  ): MissionResult => ({
    mission: i,
    world: { type: "", dim: "", hostile: "", owner_intent: "" },
    outcome, failure_stage: stage, failure_note: note,
    stage_latencies_ms: lat, total_ms: performance.now() - t0,
    object_count: 0, relationship_count: 0, page_count: 0, section_count: 0,
    rendered_section_count: 0, unsafe_url_count: 0, unbound_claim_count: 0,
    warnings: [], synthetic: true, testing_only: true, ...extra,
  });

  try {
    // SOURCE
    const sSource = timed(() => {
      const plan = planWorld(i);
      if (plan.addr.hostile === "stale-source" && i % 3 === 0) {
        return { plan, fetched: false as const };
      }
      if (plan.addr.hostile === "stale-source") {
        plan.warnings.push("stale-source: source snapshot is 26 months old; treat facts as low-confidence");
      }
      if (plan.addr.hostile === "no-jsonld") {
        plan.warnings.push("no-jsonld: no structured data on source; observations extracted from text only");
      }
      return { plan, fetched: true as const };
    });
    lat["source"] = sSource.ms;
    const { plan, fetched } = sSource.value;
    worldAddr = { type: plan.addr.type, dim: plan.addr.dim, hostile: plan.addr.hostile, owner_intent: plan.addr.owner_intent };

    if (!fetched) {
      return fail("ACQUISITION_FAILED", "source",
        "stale-source: simulated source fetch failed (domain parked); no observations acquired",
        { world: worldAddr, warnings: plan.warnings });
    }

    // OBSERVATION
    const sObs = timed(() => ({ observationCount: 3 + (i % 5) }));
    lat["observation"] = sObs.ms;

    // EVIDENCE
    const sEv = timed(() => {
      if (plan.addr.hostile === "contradictory-sources") {
        return { conflict: `two sources disagree on phone (${plan.phone} vs +1 (555) 01999)` };
      }
      if (plan.addr.hostile === "conflicting-hours") {
        return { conflict: "business hours Mon-Fri 8am-6pm vs location hours Mon-Fri 9am-5pm" };
      }
      return { conflict: null as string | null };
    });
    lat["evidence"] = sEv.ms;
    if (sEv.value.conflict) {
      return fail("EVIDENCE_CONFLICT", "evidence",
        `evidence conflict not resolvable deterministically: ${sEv.value.conflict}`,
        { world: worldAddr, warnings: plan.warnings });
    }

    // OBJECTS
    const sObj = timed(() => {
      if (plan.addr.hostile === "franchise-lookalike") {
        return { ambiguous: true as const, graph: null as WorldGraph | null };
      }
      return { ambiguous: false as const, graph: buildWorldGraph(plan) };
    });
    lat["objects"] = sObj.ms;
    if (sObj.value.ambiguous || !sObj.value.graph) {
      return fail("IDENTITY_AMBIGUOUS", "objects",
        `franchise-lookalike: name "${plan.name}" matches chain naming patterns; independent local identity not confirmable; fail closed, no site generated`,
        { world: worldAddr, warnings: plan.warnings });
    }
    const wg = sObj.value.graph;

    // RELATIONSHIPS (built inside buildWorldGraph; stage records the count)
    const sRel = timed(() => wg.graph.relationships.length);
    lat["relationships"] = sRel.ms;

    // OWNER INTENT (applied inside buildWorldGraph; record decisions here)
    const sIntent = timed(() => {
      const decisions: FieldVisibilityDecision[] = [];
      if (wg.hiddenObjectId) {
        const target = wg.graph.objects.find((o) => o.id === wg.hiddenObjectId);
        if (target) {
          for (const key of Object.keys(target.fields)) {
            decisions.push({
              objectId: target.id, field: key, policy: "hide",
              decidedBy: "owner", decidedAt: GENERATED_AT,
              source: "owner_override", version: 1,
            });
          }
        }
      }
      return decisions;
    });
    lat["owner_intent"] = sIntent.ms;
    const ownerDecisions = sIntent.value;

    // SITE SPEC (repo authority: generate + validate)
    const sSpec = timed(() => {
      const spec: FYDSiteSpec = generateSiteSpec(wg.graph, { generatedAt: GENERATED_AT });
      const knownSchemas = new Set(wg.graph.objects.map((o) => o.schema));
      const findings = validateSiteSpec(spec, knownSchemas);
      return { spec, findings, knownSchemas };
    });
    lat["sitespec"] = sSpec.ms;
    const { spec, findings } = sSpec.value;
    const errors = findings.filter((f) => f.severity === "error");
    const valWarnings = findings.filter((f) => f.severity !== "error");
    for (const w of valWarnings) plan.warnings.push(`validator: ${w.path}: ${w.message}`);
    if (errors.length > 0) {
      return fail("NEEDS_REVIEW", "sitespec",
        `typed spec failure: ${errors.map((e) => e.path + ": " + e.message).join("; ")}`,
        {
          world: worldAddr, warnings: plan.warnings,
          object_count: wg.graph.objects.length, relationship_count: wg.graph.relationships.length,
          page_count: spec.pages.length,
          section_count: spec.pages.reduce((n, p) => n + p.sections.length, 0),
        });
    }

    // PUBLIC-SAFE PROJECTION (repo seam: buildRenderContext)
    const sProj = timed(() =>
      buildRenderContext(spec, wg.graph, { viewerId: null, displayName: null }, ownerDecisions));
    lat["projection"] = sProj.ms;
    const ctx = sProj.value;

    // RENDER (HTML string; no live browser)
    const sRender = timed(() => {
      const pages: { slug: string; html: string; sectionHtml: string[] }[] = [];
      for (const page of spec.pages) {
        const sectionHtml = page.sections.map((section) => {
          try {
            return renderToStaticMarkup(renderSection(section, ctx));
          } catch {
            return "";
          }
        });
        let body: string;
        try {
          body = renderToStaticMarkup(SitePageView({ page, ctx }));
        } catch {
          body = sectionHtml.join("\n");
        }
        const html = `<!DOCTYPE html>\n<!-- synthetic test fixture: NOT a real business (world ${i}) -->\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>${plan.name} | synthetic test</title>\n</head>\n<body>\n${body}\n</body>\n</html>`;
        pages.push({ slug: page.slug, html, sectionHtml });
      }
      return pages;
    });
    lat["render"] = sRender.ms;
    const pages = sRender.value;

    // VERIFY
    const sVerify = timed(() => {
      const notes: string[] = [];
      const fullHtml = pages.map((p) => p.html).join("\n");
      const unsafeMatches = fullHtml.match(new RegExp(UNSAFE_RE.source, "gi")) ?? [];
      const unsafe_url_count = unsafeMatches.length;

      const sectionCount = spec.pages.reduce((n, p) => n + p.sections.length, 0);
      let rendered_section_count = 0;
      let unbound_claim_count = 0;
      spec.pages.forEach((page, pi) => {
        page.sections.forEach((section, si) => {
          const bound = resolveQuery(section.query, ctx.graph, spec.ownerObjectId);
          const html = pages[pi]?.sectionHtml[si] ?? "";
          if (html.trim().length > 0) rendered_section_count++;
          if (bound.length > 0 && html.trim().length > 0 && !BADGE_RE.test(html)) {
            unbound_claim_count++;
            notes.push(`unbound-claim: section ${section.id} binds ${bound.length} object(s) but renders no claim badge`);
          }
        });
      });

      // hidden objects absent from public output
      let hiddenLeak: string | null = null;
      if (wg.hiddenObjectId) {
        const target = wg.graph.objects.find((o) => o.id === wg.hiddenObjectId);
        if (target && fullHtml.toLowerCase().includes(target.title.toLowerCase())) {
          hiddenLeak = `hidden object "${target.title}" leaked into public HTML`;
        }
      }
      // correct-fact survived
      if (wg.correctedPhone && !fullHtml.includes(wg.correctedPhone)) {
        notes.push("owner-intent: corrected phone not present in rendered output (no contact section bound it)");
      }
      const viewportOk = pages.every((p) => p.html.includes('name="viewport"'));
      return { unsafe_url_count, sectionCount, rendered_section_count, unbound_claim_count, hiddenLeak, viewportOk, notes };
    });
    lat["verify"] = sVerify.ms;
    const v = sVerify.value;
    for (const n of v.notes) plan.warnings.push(n);

    const base = {
      world: worldAddr,
      warnings: plan.warnings,
      object_count: wg.graph.objects.length,
      relationship_count: wg.graph.relationships.length,
      page_count: spec.pages.length,
      section_count: v.sectionCount,
      rendered_section_count: v.rendered_section_count,
      unsafe_url_count: v.unsafe_url_count,
      unbound_claim_count: v.unbound_claim_count,
    };

    if (v.unsafe_url_count > 0) {
      return fail("UNSAFE_SOURCE", "render",
        `unsafe URL scheme present in rendered HTML (${v.unsafe_url_count} match(es))`, base);
    }
    if (v.hiddenLeak) {
      return fail("NEEDS_REVIEW", "verify", v.hiddenLeak, base);
    }
    if (!v.viewportOk) {
      return fail("NEEDS_REVIEW", "verify", "viewport meta missing from rendered HTML", base);
    }
    if (v.sectionCount === 0) {
      return fail("NEEDS_REVIEW", "verify", "spec produced zero sections", base);
    }
    if (plan.warnings.length > 0) {
      return { ...fail("GENERATED_WITH_WARNINGS", null as unknown as Stage, null, base), failure_stage: null, failure_note: null };
    }
    return { ...fail("GENERATED", null as unknown as Stage, null, base), failure_stage: null, failure_note: null };
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const stage: Stage = (lat["verify"] !== undefined) ? "verify"
      : (lat["render"] !== undefined) ? "render"
      : (lat["projection"] !== undefined) ? "projection"
      : (lat["sitespec"] !== undefined) ? "sitespec"
      : (lat["owner_intent"] !== undefined) ? "owner_intent"
      : (lat["relationships"] !== undefined) ? "relationships"
      : (lat["objects"] !== undefined) ? "objects"
      : (lat["evidence"] !== undefined) ? "evidence"
      : (lat["observation"] !== undefined) ? "observation" : "source";
    return fail("CRASH", stage, msg.slice(0, 500), { world: worldAddr });
  }
}

// ---------------------------------------------------------------------------
// Main loop: one pass over [start, end), incremental JSONL append
// ---------------------------------------------------------------------------

function main(): void {
  const start = parseInt(process.argv[2] ?? "1000", 10);
  const end = parseInt(process.argv[3] ?? "1500", 10);
  const tStart = performance.now();
  let peakRss = 0;
  let done = 0;

  log(`# SHARD-2 log (WORLD missions ${start}-${end - 1})`);
  log(`- harness start: ${new Date().toISOString()}`);
  log(`- repo: /home/nolan/projects/ping (read-only; no repo writes, no commits)`);
  log(`- decision (80%+): protocol lists projection before sitespec, but the repo seam buildRenderContext(spec, graph) requires the spec first; running sitespec -> projection to follow the real authority order.`);

  for (let i = start; i < end; i++) {
    const r = runMission(i);
    fs.appendFileSync(RESULTS, JSON.stringify(r) + "\n");
    done++;
    const rss = process.memoryUsage().rss;
    if (rss > peakRss) peakRss = rss;
    if (done % 50 === 0) {
      const elMin = (performance.now() - tStart) / 60000;
      const line = `- progress: ${done}/${end - start} worlds, ${(done / elMin).toFixed(1)} missions/min, peak RSS ${(peakRss / 1048576).toFixed(0)} MB`;
      log(line);
      console.log(line);
    }
  }

  const elMin = (performance.now() - tStart) / 60000;
  log(`- harness end: ${new Date().toISOString()}`);
  log(`- total: ${done} worlds in ${elMin.toFixed(2)} min = ${(done / elMin).toFixed(1)} missions/min, peak RSS ${(peakRss / 1048576).toFixed(0)} MB`);
  console.log(`DONE ${done} worlds, ${(done / elMin).toFixed(1)}/min, peak ${(peakRss / 1048576).toFixed(0)} MB`);
}

main();
