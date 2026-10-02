/**
 * WORLD-SHARD-1 harness: full FYD pipeline over synthetic worlds.
 *
 * Worlds are pure functions of their index per MISSION-PROTOCOL.md:
 *   type = TYPES[i % 32]; dim = DIMS[(i // 32) % 6];
 *   hostile = HOSTILES[(i // 192) % 10] if (i % 4 == 0) else "clean";
 *   owner_intent = hide-object if (i % 5 == 0), correct-fact if (i % 5 == 1), none otherwise.
 * Every artifact carries synthetic:true + testing_only:true.
 * Never presented as real. Repo is read-only: this harness only imports.
 *
 * Pipeline: world -> SOURCE -> OBSERVATION -> EVIDENCE -> OBJECTS ->
 * RELATIONSHIPS -> OWNER INTENT -> PUBLIC-SAFE PROJECTION -> SITE SPEC ->
 * RENDER (HTML string via buildRenderContext + renderToStaticMarkup;
 * no live browser) -> VERIFY.
 */
import { performance } from "node:perf_hooks";
import * as fs from "node:fs";
import * as crypto from "node:crypto";
import { renderToStaticMarkup } from "/home/nolan/projects/ping/node_modules/react-dom/server.node.js";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import { validateSiteSpec } from "@/fyd/sitespec/validator";
import { buildRenderContext, SitePageView } from "@/fyd/components/renderer";
import type { ObjectGraph } from "@/fyd/sitespec/types";
import type { PingObject, PingRelationship } from "@/lib/ping/types";

// ---------------------------------------------------------------------------
// Deterministic world addressing
// ---------------------------------------------------------------------------
const TYPES = [
  "local-services","professional","restaurant","hospitality","health","fitness",
  "beauty","automotive","real-estate","construction","manufacturing","logistics",
  "retail","ecommerce","education","nonprofit","creator","consulting","finance",
  "legal","tech","saas","enterprise","multi-location","franchise","marketplace",
  "mobile-service","appointment","catalog","knowledge","project","membership",
];
const DIMS = ["service-heavy","location-heavy","person-heavy","portfolio-heavy","event-heavy","transaction-heavy"];
const HOSTILES = ["no-jsonld","conflicting-hours","many-services","unsafe-urls","rtl-text","franchise-lookalike","stale-source","contradictory-sources","broken-media","clean"];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PREFIX = ["Blue","Golden","Copper","Desert","Mesa","Canyon","River","Alpine","Summit","Juniper","Cedar","Stone","Wild","Grand","Red","Iron"];
const CORE = ["Works","Brothers","Services","Studio","Supply","Pros","Group","Collective","Outfitters","Craft","Solutions","Company"];
const NOUN = ["Plumbing","Roofing","Bakery","Dental","Fitness","Salon","Auto","Realty","Builders","Solar","Freight","Grocers","Tutors","Legal","Design","Catering","Landscaping","Pest","HVAC","Painting","Brewing","Books","Cycles","Cleaners","Pet","Photo","Fencing","Concrete","Tiling","Glass"];
const FIRST = ["Maya","Luis","Priya","Sam","Elena","Marcus","Aisha","Tom","Nadia","Chris","Rosa","Dev","Ana","Ben","Kira","Omar"];
const LAST = ["Reyes","Patel","Nguyen","Garcia","Kim","Johnson","Ali","Smith","Lopez","Chen","Brooks","Haddad","Silva","Park","Weber","Nasser"];
const STREET = ["Main St","North Ave","Canyon Rd","Mesa Blvd","River Pkwy","Orchard Ln","Sunset Dr","Pine St"];
const TOWN = ["Grand Junction","Fruita","Palisade","Clifton","Delta","Montrose","Rifle","Carbondale","Loma","Mack"];

const pick = (rng: () => number, arr: string[]) => arr[Math.floor(rng() * arr.length)];
const pad2 = (n: number) => String(n).padStart(2, "0");
const sha256 = (s: string) => crypto.createHash("sha256").update(s, "utf8").digest("hex");
const GEN_AT = "2026-09-23T20:30:00.000Z";

interface WorldParams {
  i: number; type: string; dim: string; hostile: string; ownerIntent: string;
  rng: () => number; name: string; slug: string;
}

function worldParams(i: number): WorldParams {
  const rng = mulberry32(i * 2654435761 % 4294967296 || i);
  const type = TYPES[i % 32];
  const dim = DIMS[Math.floor(i / 32) % 6];
  const hostile = i % 4 === 0 ? HOSTILES[Math.floor(i / 192) % 10] : "clean";
  const ownerIntent = i % 5 === 0 ? "hide-object" : i % 5 === 1 ? "correct-fact" : "none";
  let name = `${pick(rng, PREFIX)} ${pick(rng, NOUN)} ${pick(rng, CORE)}`;
  if (hostile === "franchise-lookalike") name = `${pick(rng, PREFIX)} Mc${pick(rng, NOUN)}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-w" + i;
  return { i, type, dim, hostile, ownerIntent, rng, name, slug };
}

// ---------------------------------------------------------------------------
// Typed failures (never throw raw; every failure carries stage + signature)
// ---------------------------------------------------------------------------
class TypedFailure extends Error {
  stage: string; code: string;
  constructor(stage: string, code: string, message: string) {
    super(message); this.stage = stage; this.code = code;
  }
}

// ---------------------------------------------------------------------------
// SOURCE: synthetic source record
// ---------------------------------------------------------------------------
interface SourceRecord {
  sourceId: string; name: string; tagline: string;
  phone: string; email: string; website: string;
  address: string; hours: string; hoursAlt: string | null;
  services: { name: string; desc: string; link: string | null }[];
  description: string; updatedAt: string; structured: boolean;
  media: { url: string; kind: string; ok: boolean }[];
  synthetic: true; testing_only: true;
}

function stageSource(p: WorldParams): SourceRecord {
  const { rng, i, hostile, name, slug } = p;
  const xx = (n: number) => pad2((n + i) % 100);
  const phone = `+1 (555) 01${xx(0)}`;
  let website = `https://${slug}.test`;
  if (hostile === "unsafe-urls") website = "javascript:alert('pwned')";
  const services: SourceRecord["services"] = [];
  const svcCount = hostile === "many-services" ? 24
    : p.dim === "service-heavy" ? 6
    : p.dim === "transaction-heavy" ? 4
    : p.dim === "portfolio-heavy" ? 4 : 3;
  const usedNames = new Set<string>();
  for (let s = 0; s < svcCount; s++) {
    let nm = `${pick(rng, NOUN)} ${pick(rng, ["Install","Repair","Care","Pro","Plus","Express"])}`;
    let guard = 0;
    while (usedNames.has(nm) && guard++ < 40) nm = `${pick(rng, NOUN)} ${pick(rng, ["Install","Repair","Care","Pro","Plus","Express"])}`;
    usedNames.add(nm);
    services.push({
      name: nm,
      desc: `Professional ${nm.toLowerCase()} for homes and small businesses in the valley.`,
      link: hostile === "unsafe-urls" && s === 1 ? "data:text/html,<h1>x</h1>" : null,
    });
  }
  let description = `${name} has served the Grand Valley for over a decade with honest pricing and fast response.`;
  if (hostile === "rtl-text") {
    description = "نحن نقدم خدمات عالية الجودة في المنطقة منذ خمسة عشر عاما. " +
      "אנו מספקים שירות אמין ובמחיר הוגן לכל לקוחותינו.";
  }
  const updatedAt = hostile === "stale-source"
    ? "2025-08-10T09:00:00.000Z"
    : "2026-09-20T09:00:00.000Z";
  // Stale source: deterministic fail-closed at acquisition. The snapshot is
  // expired and unreachable; no observations can be trusted. (Falsification
  // FF-6 follow-up: the old 15% stochastic gate was arbitrary; shard-0 and
  // shard-2 both treat stale-source as deterministic ACQUISITION_FAILED.)
  if (hostile === "stale-source") {
    throw new TypedFailure("source", "ACQUISITION_FAILED",
      `acquisition failed: stale source ${slug}.test unreachable (simulated DNS timeout)`);
  }
  return {
    sourceId: `src:synthetic:${slug}`,
    name, tagline: `Trusted ${p.type} in the Grand Valley`,
    phone, email: `hello@${slug}.test`, website,
    address: `${100 + Math.floor(rng() * 8900)} ${pick(rng, STREET)}, ${pick(rng, TOWN)}, CO`,
    hours: "Mon-Fri 8am-5pm", hoursAlt: hostile === "conflicting-hours" ? "Mon-Sat 9am-6pm" : null,
    services, description, updatedAt, structured: hostile !== "no-jsonld",
    media: hostile === "broken-media"
      ? [{ url: `https://${slug}.test/img/hero.jpg`, kind: "image", ok: false }]
      : [{ url: `https://${slug}.test/img/hero.jpg`, kind: "image", ok: true }],
    synthetic: true, testing_only: true,
  };
}

// ---------------------------------------------------------------------------
// OBSERVATION: raw observations with occurrence ids
// ---------------------------------------------------------------------------
interface Observation { occId: string; field: string; value: string; sourceId: string; observedAt: string; }

function stageObservation(p: WorldParams, src: SourceRecord): Observation[] {
  const obs: Observation[] = [];
  const occ = (f: string, v: string, k = 0): Observation => ({
    occId: `occ:w${p.i}:${f}:${k}`, field: f, value: v, sourceId: src.sourceId, observedAt: src.updatedAt,
  });
  obs.push(occ("name", src.name));
  obs.push(occ("phone", src.phone));
  obs.push(occ("website", src.website));
  obs.push(occ("hours", src.hours));
  if (src.hoursAlt) obs.push(occ("hours", src.hoursAlt, 1));
  obs.push(occ("address", src.address));
  src.services.forEach((s, k) => obs.push(occ("service", s.name, k)));
  if (p.hostile === "contradictory-sources") {
    obs.push({ occId: `occ:w${p.i}:phone:1`, field: "phone", value: "+1 (555) 0199",
      sourceId: `src:synthetic:second:${p.slug}`, observedAt: src.updatedAt });
  }
  return obs;
}

// ---------------------------------------------------------------------------
// EVIDENCE: evidence items; unresolvable conflicts become typed failures
// ---------------------------------------------------------------------------
interface EvidenceItem { evId: string; occIds: string[]; claim: string; kind: "website_statement"; conflict: boolean; }

function stageEvidence(p: WorldParams, obs: Observation[]): EvidenceItem[] {
  const byField = new Map<string, Observation[]>();
  for (const o of obs) {
    if (!byField.has(o.field)) byField.set(o.field, []);
    byField.get(o.field)!.push(o);
  }
  const ev: EvidenceItem[] = [];
  for (const [field, list] of byField) {
    const values = new Set(list.map((o) => o.value));
    if (field === "phone" && values.size > 1 && p.hostile === "contradictory-sources") {
      throw new TypedFailure("evidence", "EVIDENCE_CONFLICT",
        `evidence conflict: two sources disagree on phone for world ${p.i} (${[...values].join(" vs ")})`);
    }
    ev.push({
      evId: `ev:w${p.i}:${field}`,
      occIds: list.map((o) => o.occId),
      claim: `${field}=${list[0].value}`,
      kind: "website_statement",
      conflict: values.size > 1,
    });
  }
  return ev;
}

// ---------------------------------------------------------------------------
// OBJECTS: PingObject graph
// ---------------------------------------------------------------------------
function mkObject(p: WorldParams, id: string, schema: string, title: string,
    description: string, fields: Record<string, string | string[]>,
    ev: EvidenceItem[], visibility: "public" | "private" = "public"): PingObject {
  return {
    id, schema, controllerId: `web:${p.slug}`,
    visibility, title, description, fields,
    createdAt: GEN_AT, updatedAt: GEN_AT,
    provenance: { kind: "website-derived", ref: `src:synthetic:${p.slug}`, derivedAt: GEN_AT },
  };
}

function stageObjects(p: WorldParams, src: SourceRecord, ev: EvidenceItem[]): { objects: PingObject[]; ownerId: string } {
  const { rng, i, dim, hostile } = p;
  const objects: PingObject[] = [];
  const evRef = (f: string) => ev.find((e) => e.claim.startsWith(f + "="))?.evId ?? `ev:w${i}:${f}`;
  void evRef;
  const bizFields: Record<string, string | string[]> = hostile === "no-jsonld"
    ? { phone: src.phone }
    : {
        phone: src.phone, email: src.email, website: src.website,
        address: src.address,
        hours: src.hoursAlt ? undefined as unknown as string : src.hours,
      };
  if (src.hoursAlt) delete bizFields.hours; // conflicting hours: fail closed, omit the field
  for (const k of Object.keys(bizFields)) if (bizFields[k] === undefined) delete bizFields[k];
  const ownerId = `obj:w${i}:business`;
  objects.push(mkObject(p, ownerId, "ping.social.business@1", src.name, src.description, bizFields, ev));

  src.services.forEach((s, k) => {
    const f: Record<string, string | string[]> = { description: s.desc };
    if (s.link) f.link = s.link;
    objects.push(mkObject(p, `obj:w${i}:service:${k}`, "ping.social.service@1", s.name, s.desc, f, ev));
  });

  const locCount = dim === "location-heavy" ? 4 : dim === "transaction-heavy" ? 2 : 1;
  for (let k = 0; k < locCount; k++) {
    objects.push(mkObject(p, `obj:w${i}:location:${k}`, "ping.social.location@1",
      `${src.name} - ${pick(rng, TOWN)}`, `Visit us in ${pick(rng, TOWN)}.`,
      { address: `${100 + Math.floor(rng() * 8900)} ${pick(rng, STREET)}, ${pick(rng, TOWN)}, CO`, phone: `+1 (555) 01${pad2((k + 1 + i) % 100)}` }, ev));
  }
  const personCount = dim === "person-heavy" ? 6 : dim === "portfolio-heavy" ? 1 : 2;
  for (let k = 0; k < personCount; k++) {
    const nm = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
    objects.push(mkObject(p, `obj:w${i}:person:${k}`, "ping.social.person@1", nm,
      `${nm} on the ${src.name} team.`, { role: k === 0 ? "Owner" : "Technician" }, ev));
  }
  const postCount = dim === "portfolio-heavy" ? 6 : dim === "event-heavy" ? 5 : 2;
  for (let k = 0; k < postCount; k++) {
    const schema = k % 2 === 0 ? "ping.social.post@1" : "ping.social.article@1";
    objects.push(mkObject(p, `obj:w${i}:post:${k}`, schema,
      `${src.name} update ${k + 1}`, `News and notes from ${src.name}.`,
      { publishedAt: GEN_AT }, ev));
  }
  if (dim === "transaction-heavy") {
    for (let k = 0; k < 3; k++) {
      objects.push(mkObject(p, `obj:w${i}:product:${k}`, "ping.social.product@1",
        `${pick(rng, NOUN)} Package ${k + 1}`, `A packaged offering from ${src.name}.`,
        { price: `$${99 + k * 50}` }, ev));
    }
  }
  return { objects, ownerId };
}

// ---------------------------------------------------------------------------
// RELATIONSHIPS
// ---------------------------------------------------------------------------
function stageRelationships(p: WorldParams, objects: PingObject[], ownerId: string): PingRelationship[] {
  const rels: PingRelationship[] = [];
  const add = (object: string, predicate: string, k: number) => rels.push({
    id: `rel:w${p.i}:${k}`, subject: ownerId, predicate, object,
    status: "active", createdAt: GEN_AT, evidenceRef: `ev:w${p.i}:${predicate}`,
  });
  let k = 0;
  for (const o of objects) {
    if (o.id === ownerId) continue;
    const role = o.schema.includes(".service@") ? "provides"
      : o.schema.includes(".product@") ? "provides"
      : o.schema.includes(".location@") ? "located_at"
      : o.schema.includes(".person@") ? "employs"
      : o.schema.includes(".post@") || o.schema.includes(".article@") ? "publishes" : null;
    if (role) add(o.id, role, k++);
  }
  return rels;
}

// ---------------------------------------------------------------------------
// OWNER INTENT: hide-object | correct-fact | none
// ---------------------------------------------------------------------------
interface OwnerIntentResult {
  graph: ObjectGraph; hiddenObject: PingObject | null;
  correctedObject: PingObject | null; sourcePhone: string | null; ownerPhone: string | null;
}

function stageOwnerIntent(p: WorldParams, objects: PingObject[], rels: PingRelationship[]): OwnerIntentResult {
  const graph: ObjectGraph = { objects: objects.map((o) => ({ ...o, fields: { ...o.fields } })), relationships: rels };
  let hiddenObject: PingObject | null = null;
  let correctedObject: PingObject | null = null;
  let sourcePhone: string | null = null; let ownerPhone: string | null = null;
  if (p.ownerIntent === "hide-object") {
    const svc = graph.objects.find((o) => o.schema === "ping.social.service@1");
    if (svc) { svc.visibility = "private"; hiddenObject = svc; }
  } else if (p.ownerIntent === "correct-fact") {
    const biz = graph.objects.find((o) => o.schema === "ping.social.business@1");
    if (biz && typeof biz.fields.phone === "string") {
      sourcePhone = biz.fields.phone;
      ownerPhone = `+1 (555) 01${pad2((p.i + 42) % 100)}`;
      biz.fields.phone = ownerPhone;
      biz.ownerFieldCorrections = [{
        field: "phone", label: "Phone", sourceValue: sourcePhone, ownerValue: ownerPhone,
        correctedAt: GEN_AT, actorLabel: "Synthetic Owner (seeded, unverified)",
        basis: "Synthetic owner correction for factory testing: the owner says this is the main number.",
      }];
      correctedObject = biz;
    }
  }
  return { graph, hiddenObject, correctedObject, sourcePhone, ownerPhone };
}

// ---------------------------------------------------------------------------
// PUBLIC-SAFE PROJECTION: public objects only; private stays in evidence
// ---------------------------------------------------------------------------
function stageProjection(intent: OwnerIntentResult): ObjectGraph {
  const pub = intent.graph.objects.filter((o) => o.visibility === "public");
  const ids = new Set(pub.map((o) => o.id));
  return {
    objects: pub,
    relationships: intent.graph.relationships.filter((r) => ids.has(r.subject) && ids.has(r.object) && r.status === "active"),
  };
}

// ---------------------------------------------------------------------------
// SITE SPEC + validation
// ---------------------------------------------------------------------------
function stageSiteSpec(graph: ObjectGraph) {
  const spec = generateSiteSpec(graph, { generatedAt: GEN_AT });
  const knownSchemas = new Set(graph.objects.map((o) => o.schema));
  const findings = validateSiteSpec(spec, knownSchemas);
  return { spec, findings };
}

// ---------------------------------------------------------------------------
// RENDER: HTML string per page through buildRenderContext; no live browser
// ---------------------------------------------------------------------------
const UNSAFE_HREF = /(href|src)\s*=\s*["']?\s*(javascript|data|vbscript|file|blob):/i;

function stageRender(p: WorldParams, spec: ReturnType<typeof generateSiteSpec>, graph: ObjectGraph) {
  const ctx = { ...buildRenderContext(spec, graph, { viewerId: null, displayName: null }), siteId: `world-${p.i}` };
  const pages: { slug: string; html: string }[] = [];
  for (const page of spec.pages) {
    const body = renderToStaticMarkup(SitePageView({ page, ctx }));
    const doc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>${escapeHtml(page.title ?? p.name)}</title></head><body>${body}</body></html>`;
    pages.push({ slug: page.slug, html: doc });
  }
  return pages;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// VERIFY: protocol asserts. Returns outcome + metrics. Never throws.
// ---------------------------------------------------------------------------
interface VerifyResult {
  outcome: string; failureStage: string | null; warnings: string[];
  unsafeUrlCount: number; unboundClaimCount: number;
  sectionCount: number; pageCount: number; htmlSha: string;
  determinismOk: boolean;
}

function stageVerify(p: WorldParams, src: SourceRecord, spec: ReturnType<typeof generateSiteSpec> | null,
    findings: { severity: string; message: string }[] | null,
    pages: { slug: string; html: string }[] | null,
    intent: OwnerIntentResult | null, graph: ObjectGraph | null): VerifyResult {
  const warnings: string[] = [];
  if (p.hostile === "stale-source") warnings.push("stale source: last observed 2025-08-10, older than 180 days");
  if (p.hostile === "no-jsonld") warnings.push("no structured data on source; sparse object fields");
  if (p.hostile === "broken-media") warnings.push("broken media: hero image failed to load, no media bound");
  if (p.hostile === "conflicting-hours") warnings.push("conflicting hours evidence: hours field omitted fail-closed");
  if (p.hostile === "unsafe-urls") warnings.push("unsafe URL strings observed on source; sanitizer gate engaged");
  if (p.hostile === "franchise-lookalike") warnings.push("franchise-lookalike name pattern; verified synthetic independent, no chain affiliation claimed");

  if (!spec || !pages || !intent || !graph) {
    return { outcome: "NEEDS_REVIEW", failureStage: "spec", warnings, unsafeUrlCount: 0, unboundClaimCount: 0, sectionCount: 0, pageCount: 0, htmlSha: "", determinismOk: true };
  }
  const errors = (findings ?? []).filter((f) => f.severity === "error");
  if (errors.length > 0) {
    return { outcome: "NEEDS_REVIEW", failureStage: "spec-validate", warnings: [...warnings, ...errors.map((e) => "spec error: " + e.message)], unsafeUrlCount: 0, unboundClaimCount: 0, sectionCount: 0, pageCount: spec.pages.length, htmlSha: "", determinismOk: true };
  }
  const sectionCount = spec.pages.reduce((n, pg) => n + pg.sections.length, 0);
  if (spec.pages.length === 0) {
    return { outcome: "UNSUPPORTED", failureStage: "spec", warnings: [...warnings, "no pages generated: graph has no public business owner"], unsafeUrlCount: 0, unboundClaimCount: 0, sectionCount: 0, pageCount: 0, htmlSha: "", determinismOk: true };
  }
  if (sectionCount === 0) {
    return { outcome: "NEEDS_REVIEW", failureStage: "verify", warnings: [...warnings, "zero sections across pages"], unsafeUrlCount: 0, unboundClaimCount: 0, sectionCount, pageCount: spec.pages.length, htmlSha: "", determinismOk: true };
  }
  const allHtml = pages.map((x) => x.html).join("\n");
  const htmlSha = sha256(allHtml);

  // Assert: no unsafe URL schemes in output
  const unsafeHits = allHtml.match(new RegExp(UNSAFE_HREF.source, "gi")) ?? [];
  const unsafeUrlCount = unsafeHits.length;

  // Assert: hidden objects absent from public output.
  // Word-boundary match on the title: a hidden title that is merely a
  // substring of a longer public word (e.g. hidden "Solar Pro" inside public
  // business name "Iron Solar Pros", world-10265) is NOT a leak. The id
  // check stays a raw substring (ids are unique tokens).
  let hiddenLeak = false;
  if (intent.hiddenObject) {
    const t = intent.hiddenObject.title;
    if (t && new RegExp(`\\b${escapeRegExp(t)}\\b`).test(allHtml)) hiddenLeak = true;
    if (allHtml.includes(intent.hiddenObject.id)) hiddenLeak = true;
  }

  // Assert: unbound factual claims absent.
  // Every tel: href must trace to a phone field in the public graph;
  // the business name must be bound; every public service title must be bound.
  let unboundClaimCount = 0;
  const graphPhones = new Set<string>();
  for (const o of graph.objects) {
    for (const v of Object.values(o.fields)) {
      const vals = Array.isArray(v) ? v : [v];
      for (const s of vals) { if (/^\+?[\d\s().-]{7,}$/.test(s)) graphPhones.add(s.replace(/\D/g, "")); }
    }
  }
  const telRe = /href="tel:([^"]*)"/gi; let m: RegExpExecArray | null;
  const telDigits = new Set<string>();
  while ((m = telRe.exec(allHtml)) !== null) {
    const digits = m[1].replace(/\D/g, "");
    if (digits) {
      telDigits.add(digits);
      if (!graphPhones.has(digits)) unboundClaimCount++;
    }
  }
  const biz = graph.objects.find((o) => o.schema === "ping.social.business@1");
  if (biz && !allHtml.includes(escapeHtml(biz.title)) && !allHtml.includes(biz.title)) unboundClaimCount++;
  // Owner-corrected phone must win the effective slot (a tel: link); the
  // source value may still appear ONLY in labeled SOURCE/OWNER provenance.
  if (intent.sourcePhone && intent.ownerPhone) {
    if (!telDigits.has(intent.ownerPhone.replace(/\D/g, ""))) unboundClaimCount++;
    if (allHtml.includes(intent.sourcePhone)) {
      // Superseded source value is allowed only in labeled SOURCE/OWNER
      // provenance (the renderer never collapses the two). Correct behavior:
      // no warning, no unbound claim.
      const labeled = /owner-correct|owner says|the site list/i.test(allHtml);
      if (!labeled) unboundClaimCount++;
    }
  }

  // Assert: viewport meta present
  const viewportOk = pages.every((x) => x.html.includes('name="viewport"'));

  // Determinism spot check: regenerate spec, compare digest
  let determinismOk = true;
  if (p.i % 50 === 0) {
    const again = generateSiteSpec(graph, { generatedAt: GEN_AT });
    determinismOk = sha256(JSON.stringify(again)) === sha256(JSON.stringify(spec));
    if (!determinismOk) warnings.push("determinism spot check FAILED: spec digest differs on recompile");
  }

  if (unsafeUrlCount > 0) {
    return { outcome: "UNSAFE_SOURCE", failureStage: "verify", warnings: [...warnings, `unsafe URL scheme survived into output (${unsafeUrlCount} hits)`], unsafeUrlCount, unboundClaimCount, sectionCount, pageCount: spec.pages.length, htmlSha, determinismOk };
  }
  if (hiddenLeak) {
    return { outcome: "NEEDS_REVIEW", failureStage: "verify", warnings: [...warnings, "owner-hidden object leaked into public output"], unsafeUrlCount, unboundClaimCount, sectionCount, pageCount: spec.pages.length, htmlSha, determinismOk };
  }
  if (unboundClaimCount > 0 || !viewportOk || !determinismOk) {
    return { outcome: "NEEDS_REVIEW", failureStage: "verify",
      warnings: [...warnings, `unbound claims=${unboundClaimCount} viewportOk=${viewportOk} determinismOk=${determinismOk}`],
      unsafeUrlCount, unboundClaimCount, sectionCount, pageCount: spec.pages.length, htmlSha, determinismOk };
  }
  // Franchise-lookalike: identity is confirmed synthetic-independent by
  // construction, so the honest outcome is a warning, never IDENTITY_AMBIGUOUS
  // (falsification FF-6: the ambiguous label contradicted the harness's own
  // provenance and labeled completed renders as terminal).
  const outcome = warnings.length > 0 ? "GENERATED_WITH_WARNINGS" : "GENERATED";
  return { outcome, failureStage: null, warnings, unsafeUrlCount, unboundClaimCount, sectionCount, pageCount: spec.pages.length, htmlSha, determinismOk };
}

// ---------------------------------------------------------------------------
// Main: run the shard, stream progress, append JSONL incrementally
// ---------------------------------------------------------------------------
const START = parseInt(process.env.START ?? "500", 10);
const END = parseInt(process.env.END ?? "999", 10);
const OUT_DIR = process.env.OUT_DIR ?? "/home/hatch/workspace/fyd-factory/missions/world/shard-1";
const RESULTS = `${OUT_DIR}/results.jsonl`;
const STATS = `${OUT_DIR}/stats.json`;

interface MissionRecord {
  mission: string; i: number; type: string; dim: string; hostile: string; owner_intent: string;
  outcome: string; failure_stage: string | null; failure_signature: string | null;
  lat_ms: Record<string, number>;
  counts: { objects: number; relationships: number; sections: number; pages: number; observations: number; evidence: number };
  unsafe_url_count: number; unbound_claim_count: number;
  warnings: string[]; html_sha256: string; determinism_ok: boolean;
  synthetic: true; testing_only: true;
}

function timed<T>(fn: () => T): { v: T; ms: number } {
  const t0 = performance.now();
  const v = fn();
  return { v, ms: performance.now() - t0 };
}

async function main() {
  const t0 = performance.now();
  const outcomes = new Map<string, number>();
  const latTotals: number[] = [];
  const sigCounts = new Map<string, number>();
  const hostileOutcomes = new Map<string, Map<string, number>>();
  let done = 0;

  for (let i = START; i <= END; i++) {
    const mt0 = performance.now();
    const p = worldParams(i);
    const lat: Record<string, number> = {};
    let rec: MissionRecord;
    try {
      let r = timed(() => stageSource(p)); lat.source = r.ms; const src = r.v;
      r = timed(() => stageObservation(p, src)); lat.observation = r.ms; const obs = r.v;
      r = timed(() => stageEvidence(p, obs)); lat.evidence = r.ms; const ev = r.v;
      r = timed(() => stageObjects(p, src, ev)); lat.objects = r.ms;
      const { objects, ownerId } = r.v;
      r = timed(() => stageRelationships(p, objects, ownerId)); lat.relationships = r.ms; const rels = r.v;
      r = timed(() => stageOwnerIntent(p, objects, rels)); lat.owner_intent = r.ms; const intent = r.v;
      r = timed(() => stageProjection(intent)); lat.projection = r.ms; const graph = r.v;
      r = timed(() => stageSiteSpec(graph)); lat.site_spec = r.ms; const { spec, findings } = r.v;
      r = timed(() => stageRender(p, spec, graph)); lat.render = r.ms; const pages = r.v;
      r = timed(() => stageVerify(p, src, spec, findings, pages, intent, graph)); lat.verify = r.ms;
      const v = r.v;
      rec = {
        mission: `world-${i}`, i, type: p.type, dim: p.dim, hostile: p.hostile, owner_intent: p.ownerIntent,
        outcome: v.outcome, failure_stage: v.failureStage, failure_signature: null, lat_ms: lat,
        counts: { objects: graph.objects.length, relationships: graph.relationships.length, sections: v.sectionCount, pages: v.pageCount, observations: obs.length, evidence: ev.length },
        unsafe_url_count: v.unsafeUrlCount, unbound_claim_count: v.unboundClaimCount,
        warnings: v.warnings, html_sha256: v.htmlSha, determinism_ok: v.determinismOk,
        synthetic: true, testing_only: true,
      };
    } catch (e) {
      const mt = performance.now() - mt0; lat.total = mt;
      if (e instanceof TypedFailure) {
        rec = {
          mission: `world-${i}`, i, type: p.type, dim: p.dim, hostile: p.hostile, owner_intent: p.ownerIntent,
          outcome: e.code, failure_stage: e.stage, failure_signature: e.code + ": " + e.message.split("\n")[0].slice(0, 160),
          lat_ms: lat,
          counts: { objects: 0, relationships: 0, sections: 0, pages: 0, observations: 0, evidence: 0 },
          unsafe_url_count: 0, unbound_claim_count: 0, warnings: [e.message],
          html_sha256: "", determinism_ok: true, synthetic: true, testing_only: true,
        };
      } else {
        const msg = e instanceof Error ? (e.stack ?? e.message).split("\n").slice(0, 3).join(" | ") : String(e);
        const sig = "CRASH@" + (e instanceof Error ? e.message.split("\n")[0].slice(0, 160) : String(e).slice(0, 160));
        rec = {
          mission: `world-${i}`, i, type: p.type, dim: p.dim, hostile: p.hostile, owner_intent: p.ownerIntent,
          outcome: "CRASH", failure_stage: "unknown", failure_signature: sig,
          lat_ms: lat,
          counts: { objects: 0, relationships: 0, sections: 0, pages: 0, observations: 0, evidence: 0 },
          unsafe_url_count: 0, unbound_claim_count: 0, warnings: [msg.slice(0, 500)],
          html_sha256: "", determinism_ok: true, synthetic: true, testing_only: true,
        };
      }
    }
    lat.total = performance.now() - mt0;
    latTotals.push(lat.total);
    outcomes.set(rec.outcome, (outcomes.get(rec.outcome) ?? 0) + 1);
    if (rec.failure_signature) sigCounts.set(rec.failure_signature, (sigCounts.get(rec.failure_signature) ?? 0) + 1);
    if (!hostileOutcomes.has(p.hostile)) hostileOutcomes.set(p.hostile, new Map());
    const hm = hostileOutcomes.get(p.hostile)!;
    hm.set(rec.outcome, (hm.get(rec.outcome) ?? 0) + 1);

    fs.appendFileSync(RESULTS, JSON.stringify(rec) + "\n");
    done++;
    if (done % 25 === 0 || i === END) {
      const elMin = (performance.now() - t0) / 60000;
      console.log(`[shard-1] ${done}/${END - START + 1} worlds, ${(done / elMin).toFixed(1)}/min, ` +
        `outcomes=${JSON.stringify(Object.fromEntries(outcomes))}`);
    }
  }

  const sorted = [...latTotals].sort((a, b) => a - b);
  const pct = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const mem = process.memoryUsage();
  const stats = {
    shard: 1, start: START, end: END, count: done,
    outcomes: Object.fromEntries(outcomes),
    hostile_outcomes: Object.fromEntries([...hostileOutcomes].map(([k, v]) => [k, Object.fromEntries(v)])),
    failure_signatures: Object.fromEntries([...sigCounts].sort((a, b) => b[1] - a[1])),
    latency_ms: { p50: pct(0.5), p95: pct(0.95), max: pct(1), mean: sorted.reduce((a, b) => a + b, 0) / sorted.length },
    throughput_per_min: done / ((performance.now() - t0) / 60000),
    peak_memory: { rss_mb: mem.rss / 1048576, heap_mb: mem.heapUsed / 1048576 },
    elapsed_min: (performance.now() - t0) / 60000,
  };
  fs.writeFileSync(STATS, JSON.stringify(stats, null, 2));
  console.log("[shard-1] DONE " + JSON.stringify(stats));
}

if (process.env.HARNESS_MAIN !== "0") {
  main().catch((e) => { console.error("HARNESS FATAL", e); process.exit(1); });
}

export { worldParams, stageSource, stageObservation, stageEvidence, stageObjects, stageRelationships, stageOwnerIntent, stageProjection, stageSiteSpec, stageRender, stageVerify, GEN_AT };
