// PROJECTION-SHARD-1 harness: missions 500-999.
// One graph -> 16 projections -> per-projection verification.
// Reused repo authorities (read-only): src/fyd/builder/visibility.ts
// (publicObjects, assertNoPrivateLeak), src/fyd/ask/concierge.ts
// (answerConciergeQuestion, conciergeInputFor, toAskFydAnswer,
// CONCIERGE_QUESTIONS), src/fyd/sitespec/field-visibility.ts
// (applyFieldVisibility, resolveFieldVisibility, coarsenAddress).
// All projection composition + verification is harness code (test only).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const REPO = process.env.REPO_DIR ?? "/home/nolan/projects/ping";
const FIXDIR = process.env.FIX_DIR ?? "/home/nolan/fyd-fixtures";

async function main() {
const vis = await import(join(REPO, "src/fyd/builder/visibility.ts"));
const cj = await import(join(REPO, "src/fyd/ask/concierge.ts"));
const fv = await import(join(REPO, "src/fyd/sitespec/field-visibility.ts"));

const { publicObjects, assertNoPrivateLeak } = vis;
const { answerConciergeQuestion, conciergeInputFor, toAskFydAnswer, CONCIERGE_QUESTIONS } = cj;
const { applyFieldVisibility, coarsenAddress } = fv;

type Obj = {
  id: string;
  visibility?: string;
  title?: string;
  description?: string;
  fields?: Record<string, string | string[]>;
  ownerFieldCorrections?: any[];
  [k: string]: any;
};
type Rel = { id: string; subject: string; predicate: string; object: string; [k: string]: any };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(rng: () => number, arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }
const str = (v: any): string => (typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v));

function allJson(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    try { if (statSync(p).isDirectory()) out.push(...allJson(p)); else if (e.endsWith(".json")) out.push(p); } catch { /* ignore */ }
  }
  return out.sort();
}
const FIXTURES = allJson(FIXDIR);

function loadGraph(path: string): { siteId: string; objects: Obj[]; relationships: Rel[] } | null {
  try {
    const j = JSON.parse(readFileSync(path, "utf8"));
    const g = j?.graph ?? j;
    if (!g || !Array.isArray(g.objects)) return null;
    const rels = Array.isArray(g.relationships) ? g.relationships : [];
    return { siteId: String(j.site_id ?? j.siteId ?? basename(path, ".json")), objects: g.objects, relationships: rels };
  } catch { return null; }
}

// Deterministic mutation with seed i: inject private object+fields,
// owner-hidden object, owner corrections, field decisions.
function mutate(objects: Obj[], rels: Rel[], i: number) {
  const rng = mulberry32(i);
  const objs: Obj[] = JSON.parse(JSON.stringify(objects));
  if (objs.length === 0) return { objs, rels, privateMarkers: [] as string[], hiddenMarkers: [] as string[], corrections: [] as any[], decisions: [] as any[] };
  const privIdx = Math.floor(rng() * objs.length);
  const priv = objs[privIdx];
  priv.visibility = "private";
  priv.fields = priv.fields ?? {};
  const privEmail = `prv-${i}@example.test`;
  priv.fields.ownerEmail = privEmail;
  priv.fields.internalNote = `PRV-${i} internal staff note`;
  const privateMarkers = [privEmail, `PRV-${i} internal staff note`, `PRV-${i}`];

  let hidIdx = -1;
  const hiddenMarkers: string[] = [];
  if (i % 5 === 0 && objs.length > 1) {
    hidIdx = Math.floor(rng() * objs.length);
    if (hidIdx === privIdx) hidIdx = (hidIdx + 1) % objs.length;
    const hid = objs[hidIdx];
    hid.visibility = "hidden";
    hid.fields = hid.fields ?? {};
    hid.fields.internalCode = `HID-${i}`;
    hiddenMarkers.push(`HID-${i}`);
    // owner-hidden FIELD on a public object (not just hidden objects)
    const pub = objs.find((o, k) => k !== privIdx && k !== hidIdx && o.visibility === "public");
    if (pub) { pub.fields = pub.fields ?? {}; pub.fields.ownerInternal = `HIDF-${i}`; hiddenMarkers.push(`HIDF-${i}`); }
  }

  const corrections: any[] = [];
  if (i % 5 === 1) {
    const pub = objs.find((o, k) => k !== privIdx && k !== hidIdx && o.visibility === "public");
    if (pub) {
      pub.fields = pub.fields ?? {};
      const srcPhone = str(pub.fields.phone) || "(970) 555-0000";
      const ownPhone = `+1 (970) 555-${String(1000 + (i % 9000))}`;
      pub.fields.phone = ownPhone; // effective value is owner-winning
      pub.ownerFieldCorrections = [{
        field: "phone", label: "Phone", sourceValue: srcPhone, ownerValue: ownPhone,
        correctedAt: "2026-09-23T20:00:00Z", provenance: "owner-console:test",
      }];
      corrections.push({ objectId: pub.id, field: "phone", sourceValue: srcPhone, ownerValue: ownPhone });
    }
  }

  // Field-level decisions: hide private field, coarse address.
  const decisions: any[] = [];
  for (const o of objs) {
    if (o.visibility === "public" && o.fields && ("address" in o.fields || "streetAddress" in o.fields)) {
      const f = "address" in o.fields ? "address" : "streetAddress";
      decisions.push({ objectId: o.id, field: f, policy: "coarse", decidedBy: "owner", decidedAt: "2026-09-23T20:00:00Z", source: "owner_override", version: 1 });
    }
    if (o.fields && "ownerInternal" in o.fields) {
      decisions.push({ objectId: o.id, field: "ownerInternal", policy: "hide", decidedBy: "owner", decidedAt: "2026-09-23T20:00:00Z", source: "owner_override", version: 1 });
    }
    if (o.fields && "pricingInternal" in o.fields) { /* none in fixtures */ }
  }
  // Add a private field on the primary public business object
  const biz = objs.find((o, k) => k !== privIdx && k !== hidIdx && o.visibility === "public");
  if (biz) {
    biz.fields = biz.fields ?? {};
    biz.fields.pricingInternal = `PRVF-${i} margin sheet`;
    decisions.push({ objectId: biz.id, field: "pricingInternal", policy: "hide", decidedBy: "owner", decidedAt: "2026-09-23T20:00:00Z", source: "owner_override", version: 1 });
    privateMarkers.push(`PRVF-${i} margin sheet`, `PRVF-${i}`);
  }
  return { objs, rels, privateMarkers, hiddenMarkers, corrections, decisions, privId: priv.id, hidId: hidIdx >= 0 ? objs[hidIdx].id : null };
}

function meta(kind: string, siteId: string) {
  return {
    _projection: {
      kind, of: siteId, synthetic: true, testing_only: true,
      canonicalAuthority: false,
      note: "Derived projection. Does not claim canonical authority. Source truth stays in the graph; the owner store holds owner intent; observations are evidence.",
    },
  };
}

const CANON_CLAIM = /(\bis|\bare|as)\s+(the\s+)?(canonical|authoritative)(\s+(source|record|truth|version))?/i;
const SOT_CLAIM = /source of truth|authoritative record|system of record|single source of truth/i;

function scanLeaks(text: string, markers: string[]): string[] {
  const hits: string[] = [];
  for (const m of markers) if (m && text.includes(m)) hits.push(m);
  return hits;
}

interface CheckResult { name: string; pass: boolean; detail?: string; }

function finding(domain: string, component: string, claim: string, evidence: string,
  caller: string, callee: string, writer: string, reader: string,
  classification: string, confidence: number, brokenBoundary: string) {
  return {
    DOMAIN: domain, COMPONENT: component, CLAIM: claim, EVIDENCE: evidence,
    CALLER: caller, CALLEE: callee, WRITER: writer, READER: reader,
    AUTHORITY: "PROJECTION-SHARD-1 harness (mission worker, not the repo)",
    CLASSIFICATION: classification, CONFIDENCE: confidence,
    BROKEN_BOUNDARY: brokenBoundary,
    DEPENDENCIES: ["src/fyd/builder/visibility.ts", "src/fyd/ask/concierge.ts", "src/fyd/sitespec/field-visibility.ts"],
    AFFECTS_AGENTS: ["projection-missions", "site-render", "ask-fyd", "owner-dashboard"],
  };
}

function mission(i: number) {
  const t0 = Date.now();
  const checks: CheckResult[] = [];
  const findings: any[] = [];
  const note = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail });
  try {
    const fixPath = FIXTURES[i % FIXTURES.length];
    const loaded = loadGraph(fixPath);
    if (!loaded) return { mission: i, outcome: "UNSUPPORTED", fixture: basename(fixPath), reason: "no-object-graph", checks, findings, latMs: Date.now() - t0 };
    const siteId = loaded.siteId;
    const m = mutate(loaded.objects, loaded.relationships, i);
    const { privateMarkers, hiddenMarkers, corrections, decisions } = m;
    const leakMarkers = [...privateMarkers, ...hiddenMarkers];

    // Gates (repo authorities)
    const graph = { objects: m.objs, relationships: m.rels } as any;
    let visGraph: any;
    try { visGraph = applyFieldVisibility(graph, decisions); }
    catch (e: any) { note("field-visibility-apply", false, String(e?.message ?? e)); return { mission: i, outcome: "THROW", fixture: basename(fixPath), reason: "applyFieldVisibility threw", checks, findings, latMs: Date.now() - t0 }; }
    const pubObjs: Obj[] = publicObjects(visGraph);
    const pubIds = new Set(pubObjs.map(o => o.id));
    const pubRels: Rel[] = m.rels.filter(r => pubIds.has(r.subject) && pubIds.has(r.object));
    const biz: Obj = pubObjs[0];
    if (!biz) return { mission: i, outcome: "UNSUPPORTED", fixture: basename(fixPath), reason: "no-public-object", checks, findings, latMs: Date.now() - t0 };
    note("object-gate-public-nonempty", pubObjs.length > 0, `${pubObjs.length} public of ${m.objs.length}`);

    // Gate fail-closed test: private id in binding must throw.
    let gateThrew = false;
    try { assertNoPrivateLeak(graph, [m.privId]); } catch { gateThrew = true; }
    note("gate-refuses-private-binding", gateThrew, gateThrew ? "threw as expected" : "DID NOT THROW");
    if (!gateThrew) findings.push(finding("projection", "builder/visibility.assertNoPrivateLeak", "private object binding refused",
      `mission ${i}: assertNoPrivateLeak accepted private id ${m.privId}`, "harness", "assertNoPrivateLeak", "builder/visibility", "site-spec composer",
      "PRIVACY_LEAK_GATE_BROKEN", 0.95, "PRESENTATION: non-public object admitted into public binding"));
    let gateOk = true;
    try { assertNoPrivateLeak(graph, pubObjs.map(o => o.id)); } catch (e: any) { gateOk = false; note("gate-accepts-public-bindings", false, String(e?.message ?? e)); }
    note("gate-accepts-public-bindings", gateOk);

    const services = pubObjs.filter(o => o.id !== biz.id);
    const svcNames = services.map(o => str(o.title || o.id));
    const phone = str(biz.fields?.phone);
    const addr = str(biz.fields?.address ?? biz.fields?.streetAddress);
    const coarseAddr = addr ? coarsenAddress(addr) : "";

    // ---- Build 16 projections ----
    const P: Record<string, any> = {};
    P["website-sections"] = { ...meta("website-sections", siteId), sections: [
      { id: "hero", title: biz.title, description: str(biz.description) },
      { id: "services", items: svcNames },
      { id: "contact", phone, email: str(biz.fields?.email), serviceArea: coarseAddr },
    ]};
    P["mobile-summary"] = { ...meta("mobile-summary", siteId), summary: `${biz.title ?? ""}: ${svcNames.slice(0, 3).join("; ")}${phone ? ` · ${phone}` : ""}`.slice(0, 280) };
    // ask-answers via repo concierge
    const qIdx = [i % 7, (i + 3) % 7, (i + 5) % 7];
    const askOut: any[] = [];
    let askThrew = "";
    for (const qi of qIdx) {
      const q = CONCIERGE_QUESTIONS[qi].question;
      try {
        const input = conciergeInputFor(siteId, biz as any, pubObjs as any, pubRels as any, q);
        const ans = answerConciergeQuestion(input);
        if (!ans) { askOut.push({ question: q, outcome: "no-match" }); continue; }
        const view = toAskFydAnswer(ans);
        askOut.push({ question: q, outcome: ans.refused ? "refused" : "answered", grades: ans.claims.map((c: any) => c.grade),
          evidenceCount: ans.evidence.length, unknowns: ans.unknowns.length,
          claimsNoEvidence: ans.claims.filter((c: any) => c.grade !== "UNKNOWN" && (!c.evidence || c.evidence.length === 0)).length,
          text: ans.text, evidenceRefs: view.evidenceRefs.map((e: any) => e.id), classifications: view.claimClassifications });
      } catch (e: any) { askThrew = `${q} :: ${e?.message ?? e}`.slice(0, 200); askOut.push({ question: q, outcome: "throw", error: askThrew }); }
    }
    P["ask-answers"] = { ...meta("ask-answers", siteId), answers: askOut.map(a => { const { text, ...rest } = a; return { ...rest, answerText: text }; }) };
    P["owner-dashboard-view"] = {
      ...meta("owner-dashboard-view", siteId), audience: "owner-only",
      layers: {
        sourceFacts: pubObjs.map(o => ({ kind: "SOURCE_FACT", objectId: o.id, fields: { ...o.fields } })),
        ownerIntents: [
          ...corrections.map((c: any) => ({ kind: "OWNER_INTENT", action: "correct-fact", ...c })),
          ...(m.hidId ? [{ kind: "OWNER_INTENT", action: "hide-object", objectId: m.hidId }] : []),
        ],
        observations: [{ kind: "OBSERVATION", basis: "fixture-ingest", asOf: "2026-09-23", note: "synthetic fixture observation" }],
      },
      hiddenObjects: m.objs.filter(o => o.visibility !== "public").map(o => ({ objectId: o.id, visibility: o.visibility })),
    };
    P["circle-context"] = { ...meta("circle-context", siteId), related: pubRels.filter(r => r.subject === biz.id).map(r => {
      const t = pubObjs.find(o => o.id === r.object); return { id: r.object, name: str(t?.title), relation: str(r.predicate) };
    }) };
    P["mcp-context"] = { ...meta("mcp-context", siteId), business: { name: biz.title, phone }, services: svcNames, serviceArea: coarseAddr };
    P["search-doc"] = { ...meta("search-doc", siteId), title: biz.title, snippet: str(biz.description).slice(0, 200), keywords: svcNames.join(" ") };
    P["faq"] = { ...meta("faq", siteId), items: svcNames.slice(0, 5).map((s, k) => ({ q: `Do you offer ${s}?`, a: `${biz.title} lists ${s} among its services.` })) };
    P["catalog"] = { ...meta("catalog", siteId), services: services.map(o => ({ name: str(o.title), description: str(o.description).slice(0, 160) })) };
    P["directory-entry"] = { ...meta("directory-entry", siteId), name: biz.title, phone, serviceArea: coarseAddr };
    P["portfolio-card"] = { ...meta("portfolio-card", siteId), title: biz.title, summary: str(biz.description).slice(0, 140), serviceCount: svcNames.length };
    P["proposal-draft"] = { ...meta("proposal-draft", siteId), status: "draft", headline: `Proposal: services from ${biz.title}`,
      bullets: svcNames.slice(0, 4), contact: phone, disclaimer: "Draft generated from public business facts. Not an offer." };
    P["lead-intake-schema"] = { ...meta("lead-intake-schema", siteId), prefill: "none", fields: [
      { name: "fullName", type: "string" }, { name: "phone", type: "phone" }, { name: "service", type: "enum", options: svcNames.slice(0, 8) }, { name: "notes", type: "text" } ] };
    P["campaign-draft"] = { ...meta("campaign-draft", siteId), status: "draft", subject: `${biz.title} services in ${coarseAddr || "your area"}`,
      body: `Hi, this is a draft campaign message for ${biz.title}. Services: ${svcNames.slice(0, 3).join(", ")}.` };
    P["landing-page"] = { ...meta("landing-page", siteId), headline: biz.title, subhead: str(biz.description).slice(0, 120), cta: { label: "Call", target: "contact" }, services: svcNames.slice(0, 6) };
    P["analytics-view"] = { ...meta("analytics-view", siteId), counts: {
      objects: m.objs.length, public: pubObjs.length, hidden: m.objs.filter(o => o.visibility === "hidden").length,
      private: m.objs.filter(o => o.visibility === "private").length, services: services.length, relationships: pubRels.length } };

    const publicKinds = Object.keys(P).filter(k => k !== "owner-dashboard-view");

    // ---- Verify ----
    // 1. No leaks into public projections.
    for (const k of publicKinds) {
      const text = JSON.stringify(P[k]);
      const hits = scanLeaks(text, leakMarkers);
      note(`leak-scan:${k}`, hits.length === 0, hits.length ? `HITS: ${hits.slice(0, 4).join("|")}` : "clean");
      if (hits.length) findings.push(finding("projection", k, "private/owner-hidden facts never appear on public surfaces",
        `mission ${i} fixture ${basename(fixPath)}: public projection '${k}' contains: ${hits.join(", ")}`, "harness", k, "projection composer", "public surface reader",
        "PRIVACY_LEAK", 0.99, "PRESENTATION: public surface carries non-public facts"));
    }
    // 2. Owner dashboard may carry hidden facts but must label them.
    {
      const d = JSON.stringify(P["owner-dashboard-view"]);
      const unlabeled = leakMarkers.filter(mk => d.includes(mk) && !d.includes('"visibility":"hidden"') && !d.includes('"kind":"OWNER_INTENT"') && !d.includes('"kind":"SOURCE_FACT"'));
      note("owner-dashboard-labels", unlabeled.length === 0, unlabeled.length ? `UNLABELED: ${unlabeled.join("|")}` : "labeled");
    }
    // 3. Projection != truth: marker present, no canonical claims.
    for (const k of Object.keys(P)) {
      const p = P[k];
      const okMarker = p._projection && p._projection.canonicalAuthority === false && p._projection.synthetic === true;
      note(`projection-marker:${k}`, okMarker);
      const t = JSON.stringify(p);
      const canonHit = CANON_CLAIM.test(t) || SOT_CLAIM.test(t);
      note(`no-canonical-claim:${k}`, !canonHit, canonHit ? "claims canonical authority" : "ok");
      if (canonHit) findings.push(finding("projection", k, "projections never claim canonical authority",
        `mission ${i}: projection '${k}' text claims canonical authority`, "harness", k, "projection composer", "public surface reader",
        "MISLABELING_CANONICAL", 0.9, "EPISTEMIC: projection presented as source truth"));
      if (!okMarker) findings.push(finding("projection", k, "every projection carries a non-canonical projection marker",
        `mission ${i}: projection '${k}' missing marker`, "harness", k, "projection composer", "surface consumer",
        "MISLABELING_MARKER", 0.9, "EPISTEMIC: projection not labeled as projection"));
    }
    // 4. Public stays public: public business titles appear in key public projections.
    {
      const ws = JSON.stringify(P["website-sections"]);
      const missing = pubObjs.filter(o => o.title && !ws.includes(str(o.title)));
      note("public-stays-public", missing.length === 0, missing.length ? `missing: ${missing.map(o => o.id).join(",")}` : `${pubObjs.length} present`);
    }
    // 5. Owner-hidden stays hidden: hidden OBJECTS' injected markers absent
    // from public projections. (Title-substring matching is intentionally
    // NOT used: fixture location objects share city names with public
    // business objects, which is legitimate public data, not a leak.)
    {
      const probs: string[] = [];
      for (const k of publicKinds) {
        const t = JSON.stringify(P[k]);
        for (const mk of hiddenMarkers) if (mk && t.includes(mk)) probs.push(`${k}:${mk}`);
      }
      note("hidden-stays-hidden", probs.length === 0, probs.length ? probs.join("|") : "ok");
      if (probs.length) findings.push(finding("projection", "visibility-gate", "owner-hidden objects absent from public surfaces",
        `mission ${i}: ${probs.join(", ")}`, "harness", "projection composer", "visibility gate", "public surface reader",
        "PRIVACY_LEAK", 0.95, "PRESENTATION: hidden object rendered publicly"));
    }
    // 6. SOURCE FACT != OWNER INTENT != OBSERVATION labeled distinctly.
    {
      const layers = P["owner-dashboard-view"].layers;
      const kinds = new Set([...layers.sourceFacts.map((f: any) => f.kind), ...layers.ownerIntents.map((f: any) => f.kind), ...layers.observations.map((f: any) => f.kind)]);
      // The three LAYERS are distinct by key; each present fact carries its
      // layer's label. Owner-intent absence is not a mislabeling.
      const allLabeled = layers.sourceFacts.every((f: any) => f.kind === "SOURCE_FACT")
        && layers.ownerIntents.every((f: any) => f.kind === "OWNER_INTENT")
        && layers.observations.every((f: any) => f.kind === "OBSERVATION");
      note("layers-distinct", allLabeled && "sourceFacts" in layers && "ownerIntents" in layers && "observations" in layers, [...kinds].join(",") || "no-intents-present");
      const badCorr = layers.ownerIntents.filter((c: any) => c.action === "correct-fact" && !("sourceValue" in c && "ownerValue" in c));
      note("corrections-distinct-keys", badCorr.length === 0, badCorr.length ? "merged source/owner values" : "ok");
      if (badCorr.length) findings.push(finding("projection", "owner-dashboard-view", "source value and owner value carried under distinct keys",
        `mission ${i}: ${badCorr.length} corrections merge sourceValue/ownerValue`, "harness", "owner-dashboard-view", "correction composer", "owner",
        "MISLABELING_SOURCE_INTENT", 0.9, "EPISTEMIC: source fact and owner intent conflated"));
      // public projections must not show the stale source phone when owner corrected it
      if (corrections.length) {
        const stale = corrections[0].sourceValue;
        const pubText = publicKinds.map(k => JSON.stringify(P[k])).join(" ");
        const staleHit = stale && stale !== corrections[0].ownerValue && pubText.includes(stale);
        note("no-stale-source-on-public", !staleHit, staleHit ? `stale source phone '${stale}' on public surface` : "owner value only");
        if (staleHit) findings.push(finding("projection", "correction-composer", "owner correction wins on public surfaces; stale source value retired",
          `mission ${i}: stale source '${stale}' visible publicly`, "harness", "projection composer", "correction composer", "public surface reader",
          "MISLABELING_STALE", 0.9, "EPISTEMIC: superseded source fact presented as current"));
      }
    }
    // 7. Field-level gate: hide/coarse applied in public view.
    {
      const bizPub = pubObjs.find(o => o.id === biz.id);
      const f = bizPub?.fields ?? {};
      note("field-hide-applied", !("pricingInternal" in f) && !("ownerInternal" in f), "private fields absent");
      if (("pricingInternal" in f) || ("ownerInternal" in f)) findings.push(finding("projection", "field-visibility", "owner-hidden fields absent from public projection",
        `mission ${i}: ${(Object.keys(f).filter(k => k === "pricingInternal" || k === "ownerInternal")).join(",")} present`, "harness", "applyFieldVisibility", "field gate", "public surface reader",
        "PRIVACY_LEAK", 0.95, "PRESENTATION: hidden field rendered publicly"));
      if (addr && coarseAddr) {
        const firstSeg = addr.split(",")[0].trim();
        const streetLeaked = publicKinds.some(k => firstSeg.length > 4 && JSON.stringify(P[k]).includes(firstSeg));
        note("address-coarsened", !streetLeaked || addr === coarseAddr, streetLeaked && addr !== coarseAddr ? `street '${firstSeg}' leaked` : "coarse");
      }
    }
    // 8. Ask concierge checks.
    {
      const askText = JSON.stringify(P["ask-answers"]);
      const hits = scanLeaks(askText, leakMarkers);
      note("ask-no-leak", hits.length === 0, hits.length ? hits.join("|") : "clean");
      if (hits.length) findings.push(finding("ask", "concierge", "ask answers cite the visible graph only",
        `mission ${i}: ask text contains ${hits.join(", ")}`, "harness", "answerConciergeQuestion", "concierge", "visitor",
        "PRIVACY_LEAK", 0.99, "PRESENTATION: non-public facts in ask answer"));
      const noEv = askOut.reduce((n, a) => n + (a.claimsNoEvidence || 0), 0);
      note("ask-claims-evidenced", noEv === 0 && !askThrew, askThrew ? `threw: ${askThrew}` : `${noEv} unevidenced`);
      if (noEv > 0 || askThrew) findings.push(finding("ask", "concierge", "graded claims carry evidence; no throw on normal input",
        `mission ${i}: ${askThrew || noEv + " unevidenced claims"}`, "harness", "answerConciergeQuestion", "concierge", "visitor",
        noEv > 0 ? "MISLABELING_EVIDENCE" : "THROW", 0.85, "EPISTEMIC: answer integrity"));
      const evRefs = askOut.flatMap(a => a.evidenceRefs ?? []);
      // Evidence refs are OBJECT ids, FIELD refs (objId#field), or RELATIONSHIP
      // ids (relationId). Object/field refs must name public objects;
      // relationship refs must join two public endpoints.
      const relById = new Map(m.rels.map(r => [r.id, r]));
      const badRefs = evRefs.filter((id: string) => {
        const s = String(id);
        if (s.includes("#")) { const oid = s.split("#")[0]; return !pubIds.has(oid); }
        if (pubIds.has(s)) return false;
        const r = relById.get(s);
        if (r) return !(pubIds.has(r.subject) && pubIds.has(r.object));
        return true; // references neither a public object nor a known relationship
      });
      note("ask-evidence-public-only", badRefs.length === 0, badRefs.length ? badRefs.slice(0, 3).join("|") : "ok");
      if (badRefs.length) findings.push(finding("ask", "concierge", "evidence cites public objects only",
        `mission ${i}: ${badRefs.slice(0, 5).join(", ")}`, "harness", "answerConciergeQuestion", "concierge", "visitor",
        "PRIVACY_LEAK", 0.9, "PRESENTATION: non-public object cited in evidence"));
    }

    const failed = checks.filter(c => !c.pass);
    const hasLeak = findings.some(f => f.CLASSIFICATION === "PRIVACY_LEAK");
    const hasMis = findings.some(f => String(f.CLASSIFICATION).startsWith("MISLABELING"));
    const outcome = hasLeak ? "LEAK" : hasMis ? "MISLABELING" : failed.length ? "NEEDS_REVIEW" : (askOut.some(a => a.outcome === "refused") ? "PASS_WITH_NOTES" : "PASS");
    return {
      mission: i, outcome, fixture: basename(fixPath),
      checksPassed: checks.length - failed.length, checksTotal: checks.length,
      failures: failed.map(f => `${f.name}: ${f.detail ?? ""}`.slice(0, 160)),
      findings, latMs: Date.now() - t0,
      counts: { objects: m.objs.length, public: pubObjs.length, projections: Object.keys(P).length, askAnswered: askOut.filter(a => a.outcome === "answered").length },
    };
  } catch (e: any) {
    return { mission: i, outcome: "THROW", fixture: "unknown", reason: String(e?.message ?? e).slice(0, 200), checks, findings, latMs: Date.now() - t0 };
  }
}

const [START, END] = [Number(process.argv[2] ?? 500), Number(process.argv[3] ?? 999)];
console.error(`PROJECTION-SHARD-1: missions ${START}-${END}, fixtures=${FIXTURES.length}, ts=${Date.now()}`);
const tAll = Date.now();
let peak = 0;
for (let i = START; i <= END; i++) {
  const r = mission(i);
  console.log(JSON.stringify(r));
  peak = Math.max(peak, process.memoryUsage().heapUsed);
  if ((i - START + 1) % 50 === 0) console.error(`progress: ${i - START + 1}/${END - START + 1} elapsed=${((Date.now() - tAll) / 1000).toFixed(1)}s`);
}
console.error(`DONE elapsed=${((Date.now() - tAll) / 1000).toFixed(1)}s missions=${END - START + 1} peakHeapMB=${(peak / 1048576).toFixed(1)}`);
}

main().catch((e) => { console.error('FATAL ' + (e && e.message ? e.message : e)); process.exit(1); });
