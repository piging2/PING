#!/bin/bash
# WORLD-SHARD-0 runner: one tsx invocation for worlds [START, END).
# Usage: run-shard0.sh [START] [END]   (defaults 0 500)
# The tsx harness runs on the Pig; RESULT lines stream on stdout and are
# appended locally to results.jsonl incrementally.
SHARD_DIR="/home/hatch/workspace/fyd-factory/missions/world/shard-8"
START="${1:-0}"
END="${2:-500}"
mkdir -p "$SHARD_DIR"
RESULTS="$SHARD_DIR/results.jsonl"
PROGLOG="$SHARD_DIR/run-progress.log"
touch "$RESULTS"
cat > "$SHARD_DIR/_harness-body.sh" <<'OUTER'
cd /home/nolan/projects/ping || exit 1
cat > /tmp/w0-shard0.tsx <<'TSXEOF'
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// @ts-ignore
require.extensions[".css"] = (m: any) => { m.exports = {}; };
const React = require("/home/nolan/projects/ping/node_modules/react");
(globalThis as any).React = React;
const { generateSiteSpec } = require("/home/nolan/projects/ping/src/fyd/proceduralize/generator.ts");
const { validateSiteSpec } = require("/home/nolan/projects/ping/src/fyd/sitespec/validator.ts");
const { buildRenderContext, SitePageView, resolveQuery } = require("/home/nolan/projects/ping/src/fyd/components/renderer.tsx");
const { renderToStaticMarkup } = require("/home/nolan/projects/ping/node_modules/react-dom/server.js");
const fs = require("fs");

// Quiet: React warnings go nowhere; harness uses stderr directly for progress.
console.error = () => {};
console.warn = () => {};
const log = (s: string) => process.stderr.write(s + "\n");

const START = parseInt(process.env.W0_START || "0", 10);
const END = parseInt(process.env.W0_END || "500", 10);
const SHARDNUM = parseInt(process.env.W0_SHARD || "0", 10);

// ---------------- deterministic contract (MISSION-PROTOCOL) ----------------
const TYPES = ["local-services","professional","restaurant","hospitality","health","fitness","beauty","automotive","real-estate","construction","manufacturing","logistics","retail","ecommerce","education","nonprofit","creator","consulting","finance","legal","tech","saas","enterprise","multi-location","franchise","marketplace","mobile-service","appointment","catalog","knowledge","project","membership"];
const DIMS = ["service-heavy","location-heavy","person-heavy","portfolio-heavy","event-heavy","transaction-heavy"];
const HOSTILES = ["no-jsonld","conflicting-hours","many-services","unsafe-urls","rtl-text","franchise-lookalike","stale-source","contradictory-sources","broken-media","clean"];
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const WA = ["Iron","Copper","Mesa","Grand","Pine","Red","Cedar","Stone","River","Alpine","Blue","Gold","Silver","Wild","Juniper","Aspen","Desert","Canyon","Summit","Valley"];
const WB = ["Peak","Ridge","Fork","Works","Co","Brothers","Sons","Supply","Care","Pro","Services","Studio","Shop","Masters","Crew","Point","Line","Craft","Build","Fix"];
const SUFFIX: Record<string,string> = {"local-services":"Services","professional":"Associates","restaurant":"Kitchen","hospitality":"Inn","health":"Clinic","fitness":"Fitness","beauty":"Studio","automotive":"Auto","real-estate":"Realty","construction":"Builders","manufacturing":"Manufacturing","logistics":"Logistics","retail":"Market","ecommerce":"Goods","education":"Learning","nonprofit":"Foundation","creator":"Media","consulting":"Consulting","finance":"Financial","legal":"Law","tech":"Labs","saas":"Software","enterprise":"Group","multi-location":"Centers","franchise":"Express","marketplace":"Exchange","mobile-service":"Mobile","appointment":"Booking","catalog":"Collection","knowledge":"Press","project":"Projects","membership":"Club"};
const SVCS = ["Installation","Repair","Maintenance","Consultation","Inspection","Cleaning","Upgrade","Support","Tune-up","Replacement","Assessment","Emergency service"];
const ROLES = ["Owner","Founder","Manager","Technician","Specialist","Coordinator"];

function worldAddress(i: number) {
  const r = mulberry32(i * 2654435761 % 4294967296);
  const type = TYPES[i % 32];
  const dim = DIMS[Math.floor(i / 32) % 6];
  const hostile = (i % 4 === 0) ? HOSTILES[Math.floor(i / 192) % 10] : "clean";
  const ownerIntent = (i % 5 === 0) ? "hide-object" : (i % 5 === 1) ? "correct-fact" : "none";
  return { r, type, dim, hostile, ownerIntent };
}
const pick = (r: () => number, arr: string[]) => arr[Math.floor(r() * arr.length)];
const phoneFor = (i: number) => "+1-555-01" + String(i).padStart(4, "0");

interface SrcRec { sourceId: string; fields: Record<string,string>; stale?: boolean; brokenMedia?: boolean; }

function buildSource(i: number, type: string, dim: string, hostile: string, r: () => number) {
  if (hostile === "stale-source") {
    const e: any = new Error("source fetch failed: stale-source simulated outage");
    e.typed = "ACQUISITION_FAILED";
    throw e;
  }
  let name = pick(r, WA) + " " + pick(r, WB) + " " + (SUFFIX[type] || "Services");
  if (hostile === "franchise-lookalike") name = "Mc" + pick(r, WB) + " " + (SUFFIX[type] || "Services");
  const phone = phoneFor(i);
  const descBase = name + " is a " + type.replace(/-/g, " ") + " business serving the local community.";
  const description = hostile === "rtl-text" ? "مرحبا " + descBase : descBase;
  const recA: SrcRec = {
    sourceId: "synthetic://world-" + i + "/source-a",
    fields: {
      name, phone,
      website: hostile === "unsafe-urls" ? "javascript:alert('xss')" : "https://example-" + i + ".test",
      hours: "Mon-Fri 9am-5pm",
      address: "123 Main St, Grand Junction, CO 81501",
      email: "contact" + i + "@example-" + i + ".test",
      description,
    },
  };
  if (hostile === "no-jsonld") {
    recA.fields = { name, phone, description }; // unstructured source: no fields
  }
  if (hostile === "broken-media") recA.brokenMedia = true;
  const recs = [recA];
  if (hostile === "conflicting-hours") {
    recs.push({ sourceId: "synthetic://world-" + i + "/source-b", fields: { name, hours: "Mon-Sat 8am-6pm" } });
  }
  if (hostile === "contradictory-sources") {
    recs.push({ sourceId: "synthetic://world-" + i + "/source-b", fields: { name, phone: phoneFor(i + 5000) } });
  }
  return { recs, name, phone, description };
}

function buildGraph(i: number, type: string, dim: string, hostile: string, r: () => number, recs: SrcRec[]) {
  const ts = "2026-09-23T20:11:00Z";
  const A = recs[0].fields;
  const bizId = "w" + i + "-biz";
  const mkObj = (id: string, schema: string, title: string, description: string, fields: Record<string,string>) => ({
    id, schema, controllerId: "w" + i + "-ctrl", visibility: "public" as const,
    title, description, fields,
    createdAt: ts, updatedAt: ts,
    provenance: { kind: "website-derived" as const, ref: "synthetic://world-" + i, derivedAt: ts },
  });
  const bizFields: Record<string,string> = {};
  if (A.phone) bizFields.phone = A.phone;
  if (A.website) bizFields.website = A.website;
  if (A.hours) bizFields.hours = A.hours;
  if (A.address) bizFields.address = A.address;
  if (A.email) bizFields.email = A.email;
  const biz = mkObj(bizId, "ping.social.business@1", A.name || ("Business " + i), A.description || "", bizFields);
  const objects: any[] = [biz];
  const rels: any[] = [];
  let n = 0;
  const add = (schema: string, role: string, title: string, pred: string) => {
    const id = "w" + i + "-" + role + "-" + (n++);
    // Description is neutral prose: it must NOT embed the business title,
    // otherwise the hidden-object leak check would false-positive on
    // harness-authored cross-references (the visibility seam filters
    // objects, not prose).
    objects.push(mkObj(id, schema, title, "A " + role + " offering: " + title + ".", {}));
    rels.push({ id: "w" + i + "-rel-" + id, subject: bizId, predicate: pred, object: id, status: "active" as const, createdAt: ts, evidenceRef: "synthetic://world-" + i });
  };
  const svcCount = hostile === "many-services" ? 12 : (dim === "service-heavy" ? 5 : 2);
  for (let k = 0; k < svcCount; k++) add("ping.social.service@1", "svc", SVCS[k % SVCS.length] + " " + (k + 1), "provides");
  if (dim === "location-heavy") for (let k = 0; k < 3; k++) add("ping.social.location@1", "loc", ["Downtown","Northside","West End"][k] + " branch", "located_at");
  else add("ping.social.location@1", "loc", "Main branch", "located_at");
  if (dim === "person-heavy") for (let k = 0; k < 4; k++) add("ping.social.person@1", "per", pick(r, WA) + " " + pick(r, WB) + ", " + ROLES[k % ROLES.length], "employs");
  else add("ping.social.person@1", "per", pick(r, WA) + " " + pick(r, WB) + ", Owner", "employs");
  const postCount = (dim === "portfolio-heavy" || dim === "event-heavy") ? 4 : 1;
  for (let k = 0; k < postCount; k++) add("ping.social.post@1", "post", "Update " + (k + 1), "publishes");
  if (dim === "transaction-heavy") for (let k = 0; k < 3; k++) add("ping.social.product@1", "prod", "Product " + (k + 1), "provides");
  return { objects, relationships: rels, bizId };
}

const digits = (s: string) => s.replace(/\D/g, "");

function runMission(i: number) {
  const stageMs: Record<string, number> = {};
  const t = (name: string, fn: () => any) => {
    const t0 = performance.now();
    const v = fn();
    stageMs[name] = Math.round((performance.now() - t0) * 100) / 100;
    return v;
  };
  const notes: string[] = [];
  let stage = "source";
  const rec: any = {
    mission: "world", shard: SHARDNUM, i, synthetic: true, testing_only: true,
    outcome: "GENERATED", failure_stage: null, stage_latencies_ms: stageMs,
  };
  try {
    const { r, type, dim, hostile, ownerIntent } = worldAddress(i);
    rec.type = type; rec.dim = dim; rec.hostile = hostile; rec.owner_intent = ownerIntent;
    const generatedAt = new Date(Date.parse("2026-09-23T20:11:00Z") + i * 1000).toISOString();

    const src = t("source", () => buildSource(i, type, dim, hostile, r));
    stage = "observation";
    const observations = t("observation", () => {
      const obs = src.recs.map((srec: SrcRec, k: number) => ({ obsId: "w" + i + "-obs-" + k, sourceId: srec.sourceId, fieldCount: Object.keys(srec.fields).length, brokenMedia: !!srec.brokenMedia }));
      if (hostile === "conflicting-hours") notes.push("evidence-conflict: hours differ between source-a and source-b; resolved by source-a precedence; rendered with warning");
      if (hostile === "contradictory-sources") notes.push("evidence-conflict: phone differs between sources; phone is identity-critical with no safe fail-closed; halted at evidence");
      if (hostile === "franchise-lookalike") notes.push("franchise-lookalike name pattern flagged; identity synthetic-independent by construction");
      return obs;
    });
    stage = "evidence";
    const evidence = t("evidence", () => src.recs.map((srec: SrcRec, k: number) => ({ evId: "w" + i + "-ev-" + k, ref: srec.sourceId, kind: "website-derived", conflict: hostile === "conflicting-hours" || hostile === "contradictory-sources" })));
    // contradictory-sources: phone conflict is identity-critical with no safe
    // fail-closed (unlike hours, which resolve by source-a precedence). Adopting
    // the factory-confirmed exemplar (shard-2, held by falsification FF-4):
    // halt at evidence, produce no site, terminal EVIDENCE_CONFLICT.
    if (hostile === "contradictory-sources") {
      rec.outcome = "EVIDENCE_CONFLICT"; rec.failure_stage = "evidence";
      rec.failure_signature = "hostile:contradictory-sources";
      rec.observation_count = observations.length; rec.evidence_count = evidence.length;
      rec.page_count = 0; rec.section_count = 0; rec.has_sections = false;
      rec.html_sha256 = null; rec.validator_errors = 0; rec.validator_warnings = 0;
      rec.unsafe_url_count = 0; rec.unbound_claim_count = 0; rec.hidden_leak_count = 0;
      rec.notes = notes.join(" | ").slice(0, 400);
      return rec;
    }
    stage = "objects";
    const built = t("objects", () => buildGraph(i, type, dim, hostile, r, src.recs));
    rec.object_count = built.objects.length;
    stage = "relationships";
    t("relationships", () => built.relationships.length);
    rec.relationship_count = built.relationships.length;
    rec.observation_count = observations.length;
    rec.evidence_count = evidence.length;

    stage = "owner_intent";
    let hiddenIds: string[] = [];
    let corrected: { field: string; sourceValue: string; ownerValue: string } | null = null;
    t("owner_intent", () => {
      if (ownerIntent === "hide-object") {
        const cands = built.objects.filter((o: any) => o.visibility === "public");
        const target = cands[Math.floor(r() * cands.length)];
        target.visibility = "private";
        hiddenIds = [target.id];
        notes.push("owner-intent: hide-object applied to " + target.id + " (" + target.title.slice(0, 40) + "); evidence records retained");
        if (target.id === built.bizId) notes.push("owner hid the business object itself; generator will find no owner");
      } else if (ownerIntent === "correct-fact") {
        const biz = built.objects.find((o: any) => o.id === built.bizId);
        const field = "phone";
        const sourceValue = biz.fields[field] || "";
        const ownerValue = phoneFor(i + 9000);
        biz.fields[field] = ownerValue;
        biz.ownerFieldCorrections = [{ field, label: "Phone", sourceValue: sourceValue || null, ownerValue,
          correctedAt: generatedAt, actorLabel: "Demo Owner (seeded, unverified)",
          basis: "Owner correction: the owner says this is the main phone number." }];
        corrected = { field, sourceValue, ownerValue };
        notes.push("owner-intent: correct-fact on " + field + "; effective value is owner-attested");
      }
    });
    rec.hidden_object_count = hiddenIds.length;

    stage = "projection";
    const publicGraph = t("projection", () => ({
      objects: built.objects.map((o: any) => ({ ...o })),
      relationships: built.relationships.slice(),
    }));

    stage = "sitespec";
    const spec = t("sitespec", () => generateSiteSpec(publicGraph, { generatedAt }));
    rec.page_count = spec.pages.length;

    stage = "render";
    const knownSchemas = new Set(publicGraph.objects.map((o: any) => o.schema));
    const findings: any[] = validateSiteSpec(spec, knownSchemas);
    const verr = findings.filter((f: any) => f.severity === "error");
    const vwarn = findings.filter((f: any) => f.severity === "warning");
    rec.validator_errors = verr.length;
    rec.validator_warnings = vwarn.length;

    // semantic render model + HTML string (no live browser)
    const ctx = buildRenderContext(spec, publicGraph, { viewerId: null, displayName: null });
    const modelPages = spec.pages.map((p: any) => ({
      slug: p.slug,
      sections: p.sections.map((s: any) => {
        let ids: string[] = [];
        try { ids = resolveQuery(s.query, ctx.graph, spec.ownerObjectId).map((o: any) => o.id); } catch (e) { ids = []; }
        return { id: s.id, component: s.component, objectIds: ids };
      }),
    }));
    rec.section_count = modelPages.reduce((n: number, p: any) => n + p.sections.length, 0);
    let html = "";
    try {
      const parts = spec.pages.map((p: any) =>
        '<div data-page="' + p.slug + '">' + renderToStaticMarkup(React.createElement(SitePageView, { page: p, ctx })) + "</div>"
      );
      html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' +
        (spec.pages[0] ? spec.pages[0].slug : "site") + "</title></head><body>" + parts.join("") + "</body></html>";
    } catch (e: any) {
      rec.outcome = "CRASH"; rec.failure_stage = "render";
      rec.failure_signature = "render-exception:" + String(e && e.message || e).slice(0, 120);
      rec.stage_latencies_ms = stageMs;
      return rec;
    }
    rec.render_html_len = html.length;
    t("render", () => html.length);

    stage = "verify";
    t("verify", () => {
      // assert 1: viewport meta present
      rec.viewport_meta = /<meta[^>]+name=["']viewport["']/.test(html);
      // assert 2: no unsafe URL schemes in output
      const unsafe = html.match(/(href|src|action)\s*=\s*["']?\s*(javascript|vbscript)\s*:/gi) || [];
      rec.unsafe_url_count = unsafe.length;
      // assert 3: hidden objects absent from public output. Match on token
      // boundaries: a hidden id "wX-svc-1" must not false-positive on the
      // public "wX-svc-10" (substring), and titles on word boundaries.
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const tok = (s: string) => new RegExp("(?<![\\w-])" + esc(s) + "(?![\\w-])");
      let leaks = 0;
      for (const hid of hiddenIds) {
        const o = built.objects.find((x: any) => x.id === hid);
        if (o && (tok(o.title).test(html) || tok(o.id).test(html))) leaks++;
      }
      rec.hidden_leak_count = leaks;
      // assert 4: unbound factual claims absent (contact values must be graph-bound)
      const graphPhones = new Set<string>(); const graphEmails = new Set<string>(); const graphSites = new Set<string>();
      for (const o of built.objects) {
        if (o.fields.phone) graphPhones.add(digits(o.fields.phone));
        if (o.fields.email) graphEmails.add(String(o.fields.email).toLowerCase());
        if (o.fields.website) graphSites.add(String(o.fields.website).toLowerCase());
      }
      let unbound = 0;
      const telHrefs = html.match(/href=["']tel:([^"']+)["']/gi) || [];
      for (const h of telHrefs) { const d = digits(h); if (d && ![...graphPhones].some((p) => d.endsWith(p.slice(-7)) || p.endsWith(d.slice(-7)))) unbound++; }
      const mailHrefs = html.match(/href=["']mailto:([^"']+)["']/gi) || [];
      for (const h of mailHrefs) { const m = h.replace(/^href=["']mailto:/i, "").replace(/["']$/i, "").toLowerCase(); if (m && !graphEmails.has(m)) unbound++; }
      rec.unbound_claim_count = unbound;
      // owner correction honored? Effective contact link must be owner-bound;
      // the source value may still appear in the evidence badge (by design:
      // SOURCE SAYS X / OWNER SAYS Y is never collapsed), just not as a tel: link.
      if (corrected) {
        const ownerDigits = digits(corrected.ownerValue);
        const srcDigits = digits(corrected.sourceValue);
        const telDigits = telHrefs.map((h: string) => digits(h));
        rec.correction_owner_present = ownerDigits ? telDigits.some((d: string) => d.includes(ownerDigits) || ownerDigits.includes(d)) : true;
        rec.correction_source_absent = !(srcDigits && telDigits.some((d: string) => d.includes(srcDigits)));
        if (!rec.correction_owner_present || !rec.correction_source_absent) { rec._review = "owner-correction-not-honored"; }
      }
      // assert 5: at least one section
      rec.has_sections = rec.section_count > 0;
    });

    // determinism spot-check (every 50th): regenerate and compare
    if (i % 50 === 0) {
      const spec2 = generateSiteSpec(publicGraph, { generatedAt });
      rec.deterministic = JSON.stringify(spec) === JSON.stringify(spec2);
    }

    // ---------------- outcome classification ----------------
    // Taxonomy (aligned with factory falsification FF-1/FF-2/FF-4, 2026-09-23):
    // a terminal outcome (ACQUISITION_FAILED / EVIDENCE_CONFLICT / UNSAFE_SOURCE /
    // UNSUPPORTED / CRASH) means the pipeline produced NO trustworthy site. A
    // conflict resolved by documented precedence, or an identity known by
    // synthetic construction, renders as GENERATED_WITH_WARNINGS instead.
    // IDENTITY_AMBIGUOUS is retained in the protocol set but unused for
    // synthetic worlds (provenance is known by construction).
    if (rec.unsafe_url_count > 0) { rec.outcome = "UNSAFE_SOURCE"; rec.failure_stage = "verify"; rec.failure_signature = "unsafe-scheme-in-output"; }
    else if (rec.hidden_leak_count > 0) { rec.outcome = "NEEDS_REVIEW"; rec.failure_stage = "verify"; rec.failure_signature = "hidden-object-leaked"; }
    else if (rec.unbound_claim_count > 0 || rec._review) { rec.outcome = "NEEDS_REVIEW"; rec.failure_stage = "verify"; rec.failure_signature = rec._review || "unbound-claims"; }
    else if (rec.validator_errors > 0 || !rec.has_sections) { rec.outcome = "UNSUPPORTED"; rec.failure_stage = "verify"; rec.failure_signature = rec.validator_errors > 0 ? "spec-errors:" + verr.map((f: any) => f.path).join(",").slice(0, 120) : "zero-sections"; }
    else if (rec.validator_warnings > 0 || hostile !== "clean" || ownerIntent !== "none" || (corrected && true)) {
      rec.outcome = "GENERATED_WITH_WARNINGS"; rec.failure_stage = null;
      rec.failure_signature = hostile !== "clean" ? "hostile:" + hostile : "owner-intent:" + ownerIntent;
    }
    rec.notes = notes.join(" | ").slice(0, 400);
    delete rec._review;
    return rec;
  } catch (e: any) {
    if (e && e.typed === "ACQUISITION_FAILED") {
      rec.outcome = "ACQUISITION_FAILED"; rec.failure_stage = "source";
      rec.failure_signature = "hostile:stale-source";
    } else {
      rec.outcome = "CRASH"; rec.failure_stage = stage;
      rec.failure_signature = "exception:" + String((e && e.message) || e).slice(0, 160);
    }
    rec.notes = notes.join(" | ").slice(0, 400);
    return rec;
  }
}

const t0 = Date.now();
let peakRss = 0;
let done = 0;
for (let i = START; i < END; i++) {
  const m0 = performance.now();
  const rec = runMission(i);
  rec.elapsed_ms = Math.round((performance.now() - m0) * 100) / 100;
  process.stdout.write("RESULT " + JSON.stringify(rec) + "\n");
  done++;
  const rss = process.memoryUsage().rss;
  if (rss > peakRss) peakRss = rss;
  if (done % 25 === 0) log("PROGRESS " + done + "/" + (END - START) + " worlds, elapsed " + Math.round((Date.now() - t0) / 1000) + "s, rss " + Math.round(rss / 1048576) + "MB");
}
process.stdout.write("PEAKRSS " + peakRss + "\n");
process.stdout.write("THROUGHPUT " + done + " " + (Date.now() - t0) + "\n");
log("DONE " + done + " worlds in " + Math.round((Date.now() - t0) / 1000) + "s");
TSXEOF
W0_START="__START__" W0_END="__END__" W0_SHARD="__SHARD__" timeout 1700 npx tsx --tsconfig /home/nolan/projects/ping/tsconfig.json /tmp/w0-shard0.tsx
OUTER
SHARDNUM="$(( START / 500 ))"
sed -i "s/__START__/$START/; s/__END__/$END/; s/__SHARD__/$SHARDNUM/" "$SHARD_DIR/_harness-body.sh"
echo "=== harness body written; START=$START END=$END ==="
