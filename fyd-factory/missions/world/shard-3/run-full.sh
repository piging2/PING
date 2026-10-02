#!/bin/bash
# WORLD-SHARD-3 runner. One ssh invocation: esbuild bundle (read-only) + one node run for the whole shard.
set -u
mkdir -p /home/nolan/fyd-shard3
cat > /home/nolan/fyd-shard3/harness.ts <<'HARNESS_EOF_7XQZ'
// FYD FACTORY WORLD-SHARD-3 harness.
// Synthetic test worlds only. Every artifact carries synthetic:true + testing_only:true.
// Pipeline per world: SOURCE -> OBSERVATION -> EVIDENCE -> OBJECTS -> RELATIONSHIPS
// -> OWNER INTENT -> PUBLIC-SAFE PROJECTION -> SITE SPEC -> RENDER (HTML string)
// -> VERIFY. Read-only against the repo: imports only, never writes to it.
import { renderToStaticMarkup } from "react-dom/server";
import { createHash } from "crypto";
import * as fs from "fs";
import { generateSiteSpec } from "../projects/ping/src/fyd/proceduralize/generator";
import { validateSiteSpec, isRenderable } from "../projects/ping/src/fyd/sitespec/validator";
import { buildRenderContext, SitePageView } from "../projects/ping/src/fyd/components/renderer";
import type { ObjectGraph } from "../projects/ping/src/fyd/sitespec/types";
import type { PingObject, PingRelationship, OwnerFieldCorrection } from "../projects/ping/src/lib/ping/types";

const GEN_AT = "2026-09-23T20:00:00.000Z";
const OUT = "/home/nolan/fyd-shard3/results.jsonl";

const TYPES = ["local-services","professional","restaurant","hospitality","health","fitness","beauty","automotive","real-estate","construction","manufacturing","logistics","retail","ecommerce","education","nonprofit","creator","consulting","finance","legal","tech","saas","enterprise","multi-location","franchise","marketplace","mobile-service","appointment","catalog","knowledge","project","membership"];
const DIMS = ["service-heavy","location-heavy","person-heavy","portfolio-heavy","event-heavy","transaction-heavy"];
const HOSTILES = ["no-jsonld","conflicting-hours","many-services","unsafe-urls","rtl-text","franchise-lookalike","stale-source","contradictory-sources","broken-media","clean"];

type Outcome = "GENERATED"|"GENERATED_WITH_WARNINGS"|"NEEDS_REVIEW"|"ACQUISITION_FAILED"|"IDENTITY_AMBIGUOUS"|"EVIDENCE_CONFLICT"|"UNSAFE_SOURCE"|"UNSUPPORTED"|"CRASH";
type OwnerIntent = "hide-object"|"correct-fact"|"none";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function worldAddress(i: number): { type: string; dim: string; hostile: string; ownerIntent: OwnerIntent } {
  return {
    type: TYPES[i % 32],
    dim: DIMS[Math.floor(i / 32) % 6],
    hostile: (i % 4 === 0) ? HOSTILES[Math.floor(i / 192) % 10] : "clean",
    ownerIntent: (i % 5 === 0) ? "hide-object" : (i % 5 === 1 ? "correct-fact" : "none"),
  };
}

const PREFIX = ["Iron","Copper","Mesa","Grand","Red","Blue","Cedar","Juniper","Adobe","Canyon","High","Desert","River","Valley","Summit","Pioneer","Aspen","Sage","Onyx","Willow"];
const SUFFIX = ["Co.","Services","Studio","Works","Company","Group","LLC","Collective"];
const NOUNS: Record<string,string> = {
  "local-services":"Handyman","professional":"Consulting","restaurant":"Bistro","hospitality":"Inn","health":"Clinic","fitness":"Gym","beauty":"Salon","automotive":"Auto Repair","real-estate":"Realty","construction":"Builders","manufacturing":"Fabrication","logistics":"Freight","retail":"Supply","ecommerce":"Goods","education":"Academy","nonprofit":"Foundation","creator":"Studio","consulting":"Advisors","finance":"Financial","legal":"Law","tech":"Systems","saas":"Software","enterprise":"Enterprises","multi-location":"Outposts","franchise":"Franchise Co.","marketplace":"Market","mobile-service":"Mobile Care","appointment":"Bookings","catalog":"Catalog","knowledge":"Knowledge Base","project":"Projects","membership":"Club"
};
const SERVICE_WORDS = ["Consultation","Installation","Repair","Maintenance","Inspection","Design","Delivery","Support","Training","Audit","Upgrade","Cleaning","Tune-up","Assessment"];
const PRODUCT_WORDS = ["Basic","Pro","Deluxe","Kit","Pack","Bundle","Starter","Plus"];
const FIRST = ["Alex","Jordan","Casey","Riley","Taylor","Morgan","Avery","Quinn","Sam","Jamie","Robin","Dakota"];
const LAST = ["Reyes","Kim","Patel","Garcia","Nguyen","Smith","Lopez","Hernandez","Young","Allen","King","Wright"];
const LOC_WORDS = ["Downtown","Northside","Riverside","Old Town","West End","Uptown","Southgate"];
const POST_WORDS = ["New hours","Now hiring","Seasonal special","Community event","Behind the scenes","Grand reopening"];
const FRANCHISE_NAMES = ["BurgerBarn","PizzaPalace","QuickLube","TacoTower","WashWorks"];
const AR_NAME = "مطعم الجبل";
const AR_DESC = "عمل تجاري اختباري اصطناعي لأغراض اختبار المصنع فقط";

function sha256(s: string): string { return createHash("sha256").update(s, "utf8").digest("hex"); }

function mkObject(i: number, id: string, schema: string, title: string, description: string, extraFields: Record<string,string> = {}): PingObject {
  return {
    id, schema, controllerId: `synthetic:world-${i}`,
    visibility: "public",
    title, description,
    fields: { synthetic: "true", testing_only: "true", ...extraFields },
    createdAt: GEN_AT, updatedAt: GEN_AT,
    provenance: { kind: "website-derived", ref: `synthetic:world-${i}/source`, derivedAt: GEN_AT },
  };
}

interface MissionResult {
  mission: string; index: number; shard: number;
  type: string; dim: string; hostile: string; owner_intent: string;
  outcome: Outcome; failure_stage: string | null;
  stage_latencies: Record<string, number>; total_ms: number;
  object_count: number; relationship_count: number; section_count: number; page_count: number;
  unsafe_url_count: number; unbound_claim_count: number;
  validator_errors: number; validator_warnings: number; spec_valid: boolean;
  warnings: string[];
  evidence_retained: boolean | null; owner_correction_effective: boolean | null;
  deterministic_spotcheck: boolean | null;
  notes: string;
  synthetic: boolean; testing_only: boolean;
}

function runMission(i: number): MissionResult {
  const t0 = Date.now();
  const lat: Record<string, number> = {};
  const warnings: string[] = [];
  const notes: string[] = [];
  const addr = worldAddress(i);
  const rng = mulberry32(i);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const mark = (stage: string, s: number) => { lat[stage] = Date.now() - s; };
  let stage = "init";

  const base: MissionResult = {
    mission: "world", index: i, shard: 3,
    type: addr.type, dim: addr.dim, hostile: addr.hostile, owner_intent: addr.ownerIntent,
    outcome: "CRASH", failure_stage: null,
    stage_latencies: lat, total_ms: 0,
    object_count: 0, relationship_count: 0, section_count: 0, page_count: 0,
    unsafe_url_count: 0, unbound_claim_count: 0,
    validator_errors: 0, validator_warnings: 0, spec_valid: false,
    warnings, evidence_retained: null, owner_correction_effective: null,
    deterministic_spotcheck: null,
    notes: "", synthetic: true, testing_only: true,
  };

  try {
    // ---- SOURCE (synthetic) ----
    stage = "source";
    let s = Date.now();
    const noun = NOUNS[addr.type] ?? "Business";
    let bizName = `${pick(PREFIX)} ${noun} ${pick(SUFFIX)}`;
    if (addr.hostile === "franchise-lookalike") bizName = `${pick(FRANCHISE_NAMES)} #${1000 + Math.floor(rng() * 9000)}`;
    if (addr.hostile === "rtl-text") bizName = `${AR_NAME} ${bizName}`;
    const slug = bizName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `world-${i}`;
    const srcPhone = `+1 (970) 555-${100 + i}`;
    const srcPhoneB = `+1 (970) 555-${3000 + i}`;
    const ownerPhone = `+1 (970) 555-${8000 + (i - 1500)}`;
    const hours = "Mon-Fri 9:00-17:00";
    const hoursB = "Mon-Sat 10:00-18:00";
    let website = `https://www.${slug}.example`;
    let email = `hello@${slug}.example`;
    if (addr.hostile === "unsafe-urls") {
      website = `javascript:alert('W${i}')`;
      email = `vbscript:msgbox('W${i}')@evil.example`;
    }
    const address = `${100 + Math.floor(rng() * 900)} ${pick(["Main St","North Ave","Broadway","Canyon Rd","Orchard Ave"])}, Grand Junction, CO 8150${1 + Math.floor(rng() * 5)}`;
    const fetchedAt = addr.hostile === "stale-source" ? "2024-01-15T08:00:00.000Z" : GEN_AT;
    const conflicts: { field: string; a: string; b: string }[] = [];
    if (addr.hostile === "conflicting-hours") conflicts.push({ field: "hours", a: hours, b: hoursB });
    if (addr.hostile === "contradictory-sources") {
      conflicts.push({ field: "phone", a: srcPhone, b: srcPhoneB });
      conflicts.push({ field: "hours", a: hours, b: hoursB });
    }
    const sparse = addr.hostile === "no-jsonld";
    mark("source", s);

    // ---- OBSERVATION ----
    stage = "observation";
    s = Date.now();
    const facts: { field: string; value: string; evidenceRef: string }[] = [
      { field: "name", value: bizName, evidenceRef: `synthetic:world-${i}/source#name` },
      { field: "phone", value: srcPhone, evidenceRef: `synthetic:world-${i}/source#phone` },
    ];
    if (!sparse) {
      facts.push(
        { field: "hours", value: hours, evidenceRef: `synthetic:world-${i}/source#hours` },
        { field: "website", value: website, evidenceRef: `synthetic:world-${i}/source#website` },
        { field: "email", value: email, evidenceRef: `synthetic:world-${i}/source#email` },
        { field: "address", value: address, evidenceRef: `synthetic:world-${i}/source#address` },
      );
    }
    for (const c of conflicts) facts.push({ field: c.field, value: c.b, evidenceRef: `synthetic:world-${i}/source-b#${c.field}` });
    base.unbound_claim_count = conflicts.length;
    mark("observation", s);

    // ---- EVIDENCE ----
    stage = "evidence";
    s = Date.now();
    const evidence: { id: string; kind: string; fetchedAt: string }[] = [
      { id: `synthetic:world-${i}/evidence#source-a`, kind: "synthetic-ingestion", fetchedAt },
    ];
    if (conflicts.length > 0) evidence.push({ id: `synthetic:world-${i}/evidence#source-b`, kind: "synthetic-ingestion-conflicting", fetchedAt });
    mark("evidence", s);

    // ---- OBJECTS ----
    stage = "objects";
    s = Date.now();
    const descBase = `Synthetic test business (world ${i}, ${addr.type}). Generated for FYD factory testing only; not a real business.`;
    const bizDesc = addr.hostile === "rtl-text" ? `${AR_DESC}. ${descBase}` : descBase;
    const bizFields: Record<string,string> = { phone: srcPhone };
    if (!sparse) { bizFields.hours = hours; bizFields.website = website; bizFields.email = email; bizFields.address = address; }
    const biz = mkObject(i, `w${i}-biz`, "ping.social.business@1", bizName, bizDesc, bizFields);
    const objects: PingObject[] = [biz];
    const R = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
    let nSvc = 0, nProd = 0, nLoc = 0, nPer = 0, nPost = 0;
    if (!sparse) {
      switch (addr.dim) {
        case "service-heavy": nSvc = addr.hostile === "many-services" ? 48 : R(8,12); nLoc = R(1,2); nPer = R(2,3); nPost = R(1,2); break;
        case "location-heavy": nSvc = R(2,4); nLoc = R(4,6); nPer = R(1,2); nPost = R(1,2); break;
        case "person-heavy": nSvc = R(2,4); nLoc = R(1,2); nPer = R(5,8); nPost = R(1,2); break;
        case "portfolio-heavy": nSvc = R(1,3); nProd = R(8,12); nLoc = R(1,2); nPer = R(1,2); nPost = R(1,3); break;
        case "event-heavy": nSvc = R(1,3); nLoc = R(1,2); nPer = R(1,3); nPost = R(6,10); break;
        case "transaction-heavy": nSvc = R(2,3); nProd = R(4,6); nLoc = R(1,2); nPer = R(1,2); nPost = R(1,2); break;
      }
    }
    const addKids = (n: number, role: string, schema: string, titleFn: (k: number) => string) => {
      for (let k = 0; k < n; k++) objects.push(mkObject(i, `w${i}-${role}${k}`, schema, titleFn(k), `Synthetic ${role} for test world ${i}; testing only.`));
    };
    addKids(nSvc, "svc", "ping.social.service@1", (k) => `${noun} ${pick(SERVICE_WORDS)} ${k + 1}`);
    addKids(nProd, "prod", "ping.social.product@1", (k) => `${noun} ${pick(PRODUCT_WORDS)} ${k + 1}`);
    addKids(nLoc, "loc", "ping.social.location@1", (k) => `${pick(LOC_WORDS)} ${noun} ${k + 1}`);
    addKids(nPer, "per", "ping.social.person@1", (k) => `${pick(FIRST)} ${pick(LAST)}`);
    addKids(nPost, "post", "ping.social.post@1", (k) => `${noun} update ${k + 1}: ${pick(POST_WORDS)}`);
    mark("objects", s);

    // ---- RELATIONSHIPS ----
    stage = "relationships";
    s = Date.now();
    const relationships: PingRelationship[] = [];
    let rk = 0;
    const link = (childId: string, predicate: string) => {
      relationships.push({ id: `w${i}-r${rk++}`, subject: biz.id, predicate, object: childId, status: "active", createdAt: GEN_AT, evidenceRef: `synthetic:world-${i}/source#rel-${predicate}` });
    };
    for (const o of objects) {
      if (o.id === biz.id) continue;
      if (o.id.includes("-svc")) link(o.id, "provides");
      else if (o.id.includes("-prod")) link(o.id, "provides");
      else if (o.id.includes("-loc")) link(o.id, "located_at");
      else if (o.id.includes("-per")) link(o.id, "employs");
      else if (o.id.includes("-post")) link(o.id, "publishes");
    }
    mark("relationships", s);
    base.object_count = objects.length;
    base.relationship_count = relationships.length;

    // ---- OWNER INTENT ----
    stage = "owner_intent";
    s = Date.now();
    let hideTarget: PingObject | null = null;
    if (addr.ownerIntent === "hide-object") {
      hideTarget = objects.find((o) => o.id !== biz.id && o.id.includes("-svc")) ?? objects.find((o) => o.id !== biz.id) ?? null;
      if (hideTarget) {
        hideTarget.visibility = "private";
        notes.push(`owner hid object ${hideTarget.id}`);
      } else {
        warnings.push("owner_hide_vacuous");
        notes.push("hide-object intent vacuous: no non-owner object in sparse world");
      }
    }
    if (addr.ownerIntent === "correct-fact") {
      const correction: OwnerFieldCorrection = {
        field: "phone", label: "Phone",
        sourceValue: srcPhone, ownerValue: ownerPhone,
        correctedAt: GEN_AT,
        actorLabel: "Synthetic Owner (seeded, testing)",
        basis: "Synthetic owner correction: the owner says this is the main number. Testing only.",
      };
      biz.fields["phone"] = ownerPhone;
      biz.ownerFieldCorrections = [correction];
      notes.push("owner corrected phone: source value preserved in correction record, effective value is owner value");
    }
    const evidenceIds = new Set<string>([`synthetic:world-${i}/source#${biz.id}`]);
    for (const o of objects) evidenceIds.add(`synthetic:world-${i}/source#${o.id}`);
    base.evidence_retained = hideTarget ? evidenceIds.has(`synthetic:world-${i}/source#${hideTarget.id}`) : null;
    mark("owner_intent", s);

    // ---- PUBLIC-SAFE PROJECTION ----
    stage = "projection";
    s = Date.now();
    const graph: ObjectGraph = { objects, relationships };
    const viewer = { viewerId: null, displayName: null };
    mark("projection", s);

    // ---- SITE SPEC ----
    stage = "sitespec";
    s = Date.now();
    const spec = generateSiteSpec(graph, { generatedAt: GEN_AT, eventSequences: [i, i] });
    const knownSchemas = new Set(objects.map((o) => o.schema));
    const findings = validateSiteSpec(spec, knownSchemas);
    const errors = findings.filter((f) => f.severity === "error");
    const warns = findings.filter((f) => f.severity === "warning");
    base.validator_errors = errors.length;
    base.validator_warnings = warns.length;
    base.spec_valid = isRenderable(findings);
    mark("sitespec", s);

    // ---- RENDER (HTML string, no browser) ----
    stage = "render";
    s = Date.now();
    const ctx = buildRenderContext(spec, graph, viewer, []);
    const pages = spec.pages ?? [];
    const bodies = pages.map((p) => renderToStaticMarkup(SitePageView({ page: p, ctx })));
    const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>${bizName} - synthetic test world ${i}</title>\n</head>\n<body>\n<!-- synthetic:true testing_only:true world ${i} -->\n${bodies.join("\n")}\n</body>\n</html>`;
    const digest = sha256(html);
    base.page_count = pages.length;
    base.section_count = pages.reduce((n, p) => n + (p.sections?.length ?? 0), 0);
    mark("render", s);

    // ---- VERIFY ----
    stage = "verify";
    s = Date.now();
    let unsafeCount = 0;
    const attrRe = /\b(?:href|src|action|xlink:href)\s*=\s*"([^"]*)"/gi;
    const badScheme = /^\s*(javascript|data|vbscript|file|blob)\s*:/i;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(html)) !== null) { if (badScheme.test(m[1])) unsafeCount++; }
    const styleRe = /style\s*=\s*"([^"]*)"/gi;
    const badStyle = /expression\s*\(|javascript\s*:|vbscript\s*:|behaviou?r\s*\(|-moz-binding/i;
    while ((m = styleRe.exec(html)) !== null) { if (badStyle.test(m[1])) unsafeCount++; }
    base.unsafe_url_count = unsafeCount;

    const assertFails: string[] = [];
    // Substring-safe presence check: a hidden title like "X 1" must not
    // false-positive on a visible sibling titled "X 11".
    const escRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const appearsStandalone = (hay: string, needle: string) =>
      new RegExp(escRe(needle) + "(?![0-9A-Za-z_])").test(hay);
    if (base.section_count < 1) assertFails.push("no_sections");
    if (!html.includes('name="viewport"')) assertFails.push("viewport_missing");
    if (hideTarget && (appearsStandalone(html, hideTarget.title) || appearsStandalone(html, hideTarget.id))) assertFails.push("hidden_object_leaked");
    if (addr.ownerIntent === "correct-fact") {
      const effective = html.includes(ownerPhone);
      base.owner_correction_effective = effective && (biz.ownerFieldCorrections?.length === 1) && (biz.ownerFieldCorrections[0].sourceValue !== biz.ownerFieldCorrections[0].ownerValue);
      if (!html.includes(ownerPhone)) assertFails.push("owner_correction_missing");
      if (biz.ownerFieldCorrections?.[0]?.sourceValue === biz.ownerFieldCorrections?.[0]?.ownerValue) assertFails.push("correction_collapsed");
    }
    if (unsafeCount > 0) assertFails.push("unsafe_url_leak");
    if (addr.hostile === "rtl-text" && !html.includes(AR_NAME)) { warnings.push("rtl_text_dropped"); }

    // determinism spot check: every 25th world re-renders and compares digests
    if (i % 25 === 0) {
      const spec2 = generateSiteSpec(graph, { generatedAt: GEN_AT, eventSequences: [i, i] });
      const ctx2 = buildRenderContext(spec2, graph, viewer, []);
      const html2 = pages.map((p) => renderToStaticMarkup(SitePageView({ page: p, ctx: ctx2 }))).join("\n");
      base.deterministic_spotcheck = sha256(`<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>${bizName} - synthetic test world ${i}</title>\n</head>\n<body>\n<!-- synthetic:true testing_only:true world ${i} -->\n${html2}\n</body>\n</html>`) === digest;
      if (!base.deterministic_spotcheck) warnings.push("nondeterministic_render");
    }

    if (addr.hostile === "stale-source") warnings.push("source_stale");
    if (addr.hostile === "broken-media") warnings.push("media_unavailable");
    if (addr.hostile === "no-jsonld") warnings.push("acquisition_partial_no_jsonld");
    if (addr.hostile === "unsafe-urls" && unsafeCount === 0) warnings.push("unsafe_source_neutralized");
    if (conflicts.length > 0) warnings.push("evidence_conflict_unresolved");
    if (addr.hostile === "franchise-lookalike") warnings.push("identity_ambiguous_franchise_lookalike");

    let outcome: Outcome;
    let failure_stage: string | null = null;
    if (addr.hostile === "franchise-lookalike") { outcome = "IDENTITY_AMBIGUOUS"; failure_stage = "observation"; }
    else if (unsafeCount > 0) { outcome = "UNSAFE_SOURCE"; failure_stage = "verify"; }
    else if (conflicts.length > 0) { outcome = "EVIDENCE_CONFLICT"; failure_stage = "observation"; }
    else if (errors.length > 0 || assertFails.length > 0) {
      const unsupported = errors.some((e) => /unsupported/i.test(e.message ?? ""));
      outcome = unsupported ? "UNSUPPORTED" : "NEEDS_REVIEW";
      failure_stage = errors.length > 0 ? "sitespec" : "verify";
    }
    else if (warnings.length > 0 || warns.length > 0) { outcome = "GENERATED_WITH_WARNINGS"; }
    else { outcome = "GENERATED"; }
    if (assertFails.length > 0) notes.push(`assert_failures: ${assertFails.join(",")}`);
    base.outcome = outcome;
    base.failure_stage = failure_stage;
    mark("verify", s);
  } catch (err) {
    base.outcome = "CRASH";
    base.failure_stage = stage;
    notes.push(`crash: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`.slice(0, 2000));
  }

  base.total_ms = Date.now() - t0;
  base.notes = notes.join(" | ").slice(0, 2000);
  return base;
}

function main(): void {
  const args = process.argv.slice(2);
  const smoke = args[0] === "--smoke";
  const lo = smoke ? 1500 : 1500;
  const hi = smoke ? 1502 : 1999;
  const writeResults = !smoke;
  fs.mkdirSync("/home/nolan/fyd-shard3", { recursive: true });
  if (writeResults) { try { fs.unlinkSync(OUT); } catch { /* fresh */ } }
  let maxRss = 0;
  const t0 = Date.now();
  let count = 0;
  for (let i = lo; i <= hi; i++) {
    const rec = runMission(i);
    if (writeResults) fs.appendFileSync(OUT, JSON.stringify(rec) + "\n");
    maxRss = Math.max(maxRss, process.memoryUsage().rss);
    count++;
    console.log(`W i=${i} ${rec.outcome}${rec.failure_stage ? "@" + rec.failure_stage : ""} ms=${rec.total_ms} obj=${rec.object_count} rel=${rec.relationship_count} sec=${rec.section_count} unsafe=${rec.unsafe_url_count} unbound=${rec.unbound_claim_count} verr=${rec.validator_errors} vwarn=${rec.validator_warnings}${rec.warnings.length ? " warn=" + rec.warnings.join(",") : ""}${rec.notes ? " notes=" + rec.notes.slice(0, 160) : ""}`);
  }
  console.log(`HARNESS_DONE missions=${count} totalMs=${Date.now() - t0} maxRssMB=${Math.round(maxRss / 1048576)}`);
}

main();

HARNESS_EOF_7XQZ
cd /home/nolan/projects/ping
./node_modules/.bin/esbuild /home/nolan/fyd-shard3/harness.ts \
  --bundle --platform=node --format=cjs --target=node22 \
  --jsx=automatic \
  --alias:@=/home/nolan/projects/ping/src \
  --loader:.css=empty \
  --packages=external \
  --outfile=/home/nolan/fyd-shard3/harness.bundle.cjs \
  --log-level=warning
node /home/nolan/fyd-shard3/harness.bundle.cjs 
