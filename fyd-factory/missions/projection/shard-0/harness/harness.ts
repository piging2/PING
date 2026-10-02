/**
 * PROJECTION-SHARD-0 harness: one graph, many surfaces, attacked.
 * Runs on the Pig (repo is read-only; imported via absolute paths).
 * Usage: tsx harness.ts --start 0 --end 500 --fixture-dir /home/nolan/fyd-fixtures-p0 --out /home/nolan/fyd-projection-out/shard-0
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { answerConciergeQuestion, conciergeInputFor, CONCIERGE_QUESTIONS } from "/home/nolan/projects/ping/src/fyd/ask/concierge";

// ---------------------------------------------------------------- utils
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const hex6 = (r: () => number) => Math.floor(r() * 0xffffff).toString(16).padStart(6, "0");
const now = () => Date.now();

type Vis = "public" | "private" | "hidden";
type ClaimClass = "SOURCE_FACT" | "OWNER_INTENT" | "OBSERVATION" | "PROJECTION_NOTE";
interface Claim { text: string; claimClass: string; visibility: Vis; basis: string; }
interface Projection {
  kind: string; audience: "public" | "owner";
  labelVocabulary: string;
  claims: Claim[];
  body: unknown;
  failures: string[];
}
interface Secrets {
  privateValues: string[]; hiddenValues: string[];
  privateTitles: string[]; hiddenTitles: string[];
  privateFieldNames: string[]; hiddenFieldNames: string[];
  ownerCorrection: { field: string; label: string; sourceValue: string; ownerValue: string } | null;
  ownerHiddenAddressValues: string[];
  publicContact: { phone: string | null; email: string | null; website: string | null };
  contaminationValues: string[]; // private values also present in public source text
}
interface Finding {
  DOMAIN: string; COMPONENT: string; CLAIM: string; EVIDENCE: string;
  CALLER: string; CALLEE: string; WRITER: string; READER: string;
  AUTHORITY: string; CLASSIFICATION: string; CONFIDENCE: number;
  BROKEN_BOUNDARY: string; DEPENDENCIES: string[]; AFFECTS_AGENTS: string[];
  mission: number; signature: string;
}
const CANON_RE = /canonical\s+(truth|record|authority)|source of truth|authoritative\s+(truth|record)|definitive\s+truth|the one true record|official canonical/i;

// ---------------------------------------------------------------- mutation
interface Mutated { graph: any; secrets: Secrets; fixtureName: string; }

function mutateGraph(fixture: any, fixtureName: string, i: number): Mutated {
  const r = mulberry32(i * 7919 + 13);
  const graph = clone(fixture.graph ?? fixture);
  const objects: any[] = graph.objects ?? [];
  const rels: any[] = graph.relationships ?? [];
  const biz = objects.find((o: any) => String(o.schema ?? "").includes("business")) ?? objects[0];
  const tag = `i${i}-${hex6(r)}`;
  const pvRate = `PX-PRIVATE-RATE-${tag}`;
  const pvNote = `PX-PRIVATE-NOTE-${tag}`;
  const pvCell = `PX-PRIVATE-CELL-${tag}`;
  const hvName = `HID-SVC-${tag}`;
  const hvRate = `PX-HIDDEN-RATE-${tag}`;

  const secrets: Secrets = {
    privateValues: [pvRate, pvNote, pvCell], hiddenValues: [hvName, hvRate],
    privateTitles: [`Internal Cost Sheet ${i}`], hiddenTitles: [`Hidden Service ${i}`],
    privateFieldNames: ["internalCostRate", "internalNote", "staffCellPhone"],
    hiddenFieldNames: ["hiddenServiceName", "hiddenServiceRate"],
    ownerCorrection: null, ownerHiddenAddressValues: [],
    publicContact: { phone: null, email: null, website: null },
    contaminationValues: [],
  };

  // private internal object
  objects.push({
    id: `${biz?.id ?? "biz"}-internal-cost-${i}`, schema: "ping.social.internal_note@1",
    controllerId: "fixture_synthetic", visibility: "private",
    title: secrets.privateTitles[0],
    description: `Internal only. ${pvNote}`,
    fields: { internalCostRate: pvRate, internalNote: `margin review ${pvNote}`, staffCellPhone: pvCell },
    createdAt: "2026-09-23T00:00:00Z", updatedAt: "2026-09-23T00:00:00Z",
    provenance: { kind: "overlay-authored", ref: "owner-store:internal", derivedAt: "2026-09-23T00:00:00Z" },
  });
  // owner-hidden object (a service the owner chose not to show)
  const hiddenSvcId = `${biz?.id ?? "biz"}-hidden-svc-${i}`;
  objects.push({
    id: hiddenSvcId, schema: "ping.social.service@1",
    controllerId: "fixture_synthetic", visibility: "hidden",
    title: secrets.hiddenTitles[0],
    description: `Owner-hidden service. ${hvRate}`,
    fields: { hiddenServiceName: hvName, hiddenServiceRate: hvRate },
    createdAt: "2026-09-23T00:00:00Z", updatedAt: "2026-09-23T00:00:00Z",
    provenance: { kind: "overlay-authored", ref: "owner-store:hidden-services", derivedAt: "2026-09-23T00:00:00Z" },
  });
  // private fields on the public business object
  if (biz) {
    biz.fields = biz.fields ?? {};
    biz.fields["internalCostRate"] = pvRate;
    biz.fields["staffCellPhone"] = pvCell;
    if (typeof biz.fields["phone"] === "string") secrets.publicContact.phone = biz.fields["phone"];
    if (typeof biz.fields["email"] === "string") secrets.publicContact.email = biz.fields["email"];
    if (typeof biz.fields["website"] === "string") secrets.publicContact.website = biz.fields["website"];
    // owner corrects the phone: SOURCE SAYS X / OWNER SAYS Y
    if (secrets.publicContact.phone) {
      const srcPhone = secrets.publicContact.phone;
      const ownerPhone = `(970) 555-02${String(10 + (i % 80)).padStart(2, "0")}`;
      biz.ownerFieldCorrections = biz.ownerFieldCorrections ?? [];
      biz.ownerFieldCorrections.push({
        field: "phone", label: "Phone", sourceValue: srcPhone, ownerValue: ownerPhone,
        correctedAt: "2026-09-23T00:00:00Z", actorLabel: "Demo Owner (seeded, unverified)",
        basis: "Owner correction: the owner says this is the main number.",
      });
      biz.fields["phone"] = ownerPhone; // effective value (owner wins)
      secrets.ownerCorrection = { field: "phone", label: "Phone", sourceValue: srcPhone, ownerValue: ownerPhone };
      secrets.publicContact.phone = ownerPhone;
    }
  }

  // adversarial variants, rotated
  const variant = i % 6;
  if (variant === 1) {
    // hidden service linked from the public business by an active provides edge
    rels.push({ id: `rel-hidden-${i}`, subject: biz?.id, predicate: "provides", object: hiddenSvcId, status: "active", createdAt: "2026-09-23T00:00:00Z", evidenceRef: "fixture:synthetic" });
  } else if (variant === 2) {
    // source contamination: private value inside a PUBLIC description
    if (biz) { biz.description = `${biz.description ?? ""} Internal ref ${pvNote}.`.trim(); secrets.contaminationValues.push(pvNote); }
  } else if (variant === 3) {
    // name confusion: private field named like a public one
    if (biz) { biz.fields["altPhone"] = `PX-ALT-${tag}`; secrets.privateValues.push(`PX-ALT-${tag}`); secrets.privateFieldNames.push("altPhone"); }
  } else if (variant === 4) {
    // hidden object -> public object relationship; owner hides address
    const pubSvc = objects.find((o: any) => o.visibility === "public" && String(o.schema ?? "").includes("service"));
    if (pubSvc) rels.push({ id: `rel-h2p-${i}`, subject: hiddenSvcId, predicate: "related_to", object: pubSvc.id, status: "active", createdAt: "2026-09-23T00:00:00Z", evidenceRef: "fixture:synthetic" });
    if (biz) {
      for (const f of ["address", "street", "city", "state", "zip", "locality"]) {
        if (typeof biz.fields?.[f] === "string" && biz.fields[f].length > 0) {
          secrets.ownerHiddenAddressValues.push(biz.fields[f]);
          delete biz.fields[f];
        }
      }
    }
  } else if (variant === 5) {
    // private object referencing the business from the object side of a relationship
    rels.push({ id: `rel-p2b-${i}`, subject: `${biz?.id ?? "biz"}-internal-cost-${i}`, predicate: "notes_about", object: biz?.id, status: "active", createdAt: "2026-09-23T00:00:00Z", evidenceRef: "fixture:synthetic" });
  }
  return { graph, secrets, fixtureName };
}

// ---------------------------------------------------------------- SDK: the surface factory under attack
// Single visibility gate every public surface must pass through.
function isPublic(o: any): boolean { return o?.visibility === "public"; }
const SENSITIVE_NAME_RE = /^(internal|private|secret|cost|staff|hidden|alt)/i;
function publicScalarFields(o: any, s: Secrets): Record<string, string> {
  const out: Record<string, string> = {};
  const f = o?.fields ?? {};
  for (const [k, v] of Object.entries(f)) {
    if (typeof v !== "string") continue;
    if (s.privateFieldNames.includes(k) || s.hiddenFieldNames.includes(k)) continue;
    if (SENSITIVE_NAME_RE.test(k)) continue;
    if (s.privateValues.includes(v) || s.hiddenValues.includes(v)) continue;
    out[k] = v;
  }
  return out;
}
const C = (text: string, claimClass: ClaimClass | string, visibility: Vis, basis: string): Claim =>
  ({ text, claimClass, visibility, basis });
function publicObjects(graph: any): any[] { return (graph.objects ?? []).filter(isPublic); }
function businessOf(graph: any): any {
  return publicObjects(graph).find((o: any) => String(o.schema ?? "").includes("business")) ?? publicObjects(graph)[0] ?? null;
}
function relatedPublic(graph: any, id: string, preds: string[]): any[] {
  const out: any[] = [];
  for (const rel of graph.relationships ?? []) {
    if (rel.status !== "active") continue;
    if (!preds.includes(rel.predicate)) continue;
    const other = rel.subject === id ? rel.object : rel.object === id ? rel.subject : null;
    if (!other) continue;
    const o = (graph.objects ?? []).find((x: any) => x.id === other);
    if (o && isPublic(o) && !out.some((x) => x.id === o.id)) out.push(o);
  }
  return out;
}
function failClosed(kind: string, audience: "public" | "owner", err: unknown): Projection {
  return { kind, audience, labelVocabulary: "claim-classes", claims: [], body: { failed: true, reason: String(err).slice(0, 200) }, failures: [String(err).slice(0, 120)] };
}
function ownerPhoneClaim(s: Secrets, biz: any): Claim[] {
  if (!s.ownerCorrection) return [];
  const eff = biz?.fields?.["phone"] ?? s.publicContact.phone;
  return [C(`${s.ownerCorrection.label}: ${eff}`, "OWNER_INTENT", "public",
    `Owner correction (${s.ownerCorrection.sourceValue} -> owner value). Source record untouched.`)];
}
function contactClaims(s: Secrets, biz: any): Claim[] {
  const f = biz ? publicScalarFields(biz, s) : {};
  const out: Claim[] = [];
  if (f["phone"] || s.ownerCorrection) out.push(...ownerPhoneClaim(s, biz));
  if (f["email"]) out.push(C(`Email: ${f["email"]}`, "SOURCE_FACT", "public", "Business website contact fields."));
  if (f["website"]) out.push(C(`Website: ${f["website"]}`, "SOURCE_FACT", "public", "Business website contact fields."));
  return out;
}

type Gen = (graph: any, s: Secrets) => Projection;
const GENS: Record<string, Gen> = {
  "website-sections"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const services = relatedPublic(graph, biz.id, ["provides", "offers"]);
    const people = relatedPublic(graph, biz.id, ["works_for", "has_team_member", "employs"]);
    const claims: Claim[] = [
      C(biz.title ?? biz.id, "SOURCE_FACT", "public", "Business record title."),
      C((biz.description ?? "").slice(0, 400), "SOURCE_FACT", "public", "Business website description."),
      ...contactClaims(s, biz),
      ...services.map((x) => C(`Service: ${x.title}`, "OBSERVATION", "public", "provides/offers relationship in graph.")),
      ...people.map((x) => C(`Team: ${x.title}`, "OBSERVATION", "public", "team relationship in graph.")),
      C("Only services the business chose to show are listed.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "website-sections", audience: "public", labelVocabulary: "claim-classes", claims,
      body: { sections: ["hero", "contact", "services", "people"], name: biz.title, services: services.map((x) => x.title), people: people.map((x) => x.title) }, failures: [] };
  },
  "mobile-summary"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const services = relatedPublic(graph, biz.id, ["provides", "offers"]);
    const claims: Claim[] = [
      C(biz.title ?? biz.id, "SOURCE_FACT", "public", "Business record title."),
      C((biz.description ?? "").slice(0, 140), "SOURCE_FACT", "public", "Business website description (truncated for mobile)."),
      ...ownerPhoneClaim(s, biz),
      C(`${services.length} services listed`, "OBSERVATION", "public", "Count of public provides/offers relationships."),
      C("Truncated for a small screen; full detail on the website.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "mobile-summary", audience: "public", labelVocabulary: "claim-classes", claims, body: { name: biz.title, serviceCount: services.length }, failures: [] };
  },
  "owner-dashboard-view"(graph, s) {
    const claims: Claim[] = [];
    for (const o of graph.objects ?? []) {
      const vis: Vis = o.visibility === "public" ? "public" : o.visibility === "private" ? "private" : "hidden";
      claims.push(C(`${vis === "public" ? "Public" : vis === "private" ? "Private (owner only)" : "Hidden by owner"} object: ${o.title ?? o.id}`, "OBSERVATION", vis, "Graph object inventory."));
      const f = o.fields ?? {};
      for (const [k, v] of Object.entries(f)) {
        if (typeof v !== "string") continue;
        if (s.privateValues.includes(v) || s.privateFieldNames.includes(k))
          claims.push(C(`Private field ${k}: ${v}`, "SOURCE_FACT", "private", "Owner store / internal record."));
        else if (s.hiddenValues.includes(v) || s.hiddenFieldNames.includes(k))
          claims.push(C(`Hidden field ${k}: ${v}`, "SOURCE_FACT", "hidden", "Owner-hidden record."));
      }
    }
    if (s.ownerCorrection) claims.push(C(`Owner-corrected phone: ${s.ownerCorrection.ownerValue} (source said ${s.ownerCorrection.sourceValue})`, "OWNER_INTENT", "public", s.ownerCorrection ? "Owner field correction record." : ""));
    claims.push(C("This dashboard is an owner working view, not the public record.", "PROJECTION_NOTE", "public", "Projection rendering rule."));
    return { kind: "owner-dashboard-view", audience: "owner", labelVocabulary: "claim-classes", claims,
      body: { objectCount: (graph.objects ?? []).length }, failures: [] };
  },
  "circle-context"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const people = relatedPublic(graph, biz.id, ["works_for", "has_team_member", "employs"]);
    const claims: Claim[] = [
      C(biz.title ?? biz.id, "SOURCE_FACT", "public", "Business record title."),
      ...ownerPhoneClaim(s, biz),
      ...people.map((x) => C(`Circle member: ${x.title}`, "OBSERVATION", "public", "team relationship in graph.")),
      C("Circle context shows public profile facts only.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "circle-context", audience: "public", labelVocabulary: "claim-classes", claims, body: { name: biz.title }, failures: [] };
  },
  "mcp-context"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const claims: Claim[] = [
      C(biz.title ?? biz.id, "SOURCE_FACT", "public", "Business record title."),
      ...contactClaims(s, biz),
      C("Machine context derived from the public graph snapshot.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "mcp-context", audience: "public", labelVocabulary: "claim-classes", claims,
      body: { name: biz.title, tools: ["get_contact", "list_services"] }, failures: [] };
  },
  "search-doc"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const services = relatedPublic(graph, biz.id, ["provides", "offers"]);
    const claims: Claim[] = [
      C(biz.title ?? biz.id, "SOURCE_FACT", "public", "Business record title."),
      C(biz.description ?? "", "SOURCE_FACT", "public", "Business website description."),
      ...services.map((x) => C(`Indexed service: ${x.title}`, "OBSERVATION", "public", "provides/offers relationship.")),
      C("Search document indexes public facts only.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "search-doc", audience: "public", labelVocabulary: "claim-classes", claims,
      body: { docId: biz.id, terms: [biz.title, ...services.map((x) => x.title)] }, failures: [] };
  },
  "faq"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const services = relatedPublic(graph, biz.id, ["provides", "offers"]);
    const f = publicScalarFields(biz, s);
    const claims: Claim[] = [
      C(`Q: What does ${biz.title} do? A: ${(biz.description ?? "").slice(0, 200)}`, "SOURCE_FACT", "public", "Business website description."),
      ...services.slice(0, 5).map((x) => C(`Q: Do they offer ${x.title}? A: Yes, listed on their services page.`, "OBSERVATION", "public", "provides/offers relationship.")),
      ...(f["hours"] ? [C(`Q: What are the hours? A: ${f["hours"]}`, "SOURCE_FACT", "public", "Business website hours.")] : []),
      C("Answers are generated from public facts; not independently verified.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "faq", audience: "public", labelVocabulary: "claim-classes", claims, body: { qaCount: claims.length - 1 }, failures: [] };
  },
  "catalog"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const services = relatedPublic(graph, biz.id, ["provides", "offers"]);
    const claims: Claim[] = [
      ...services.map((x) => C(`Catalog item: ${x.title}`, "OBSERVATION", "public", "Public provides/offers relationship; owner-hidden services excluded.")),
      C("Catalog lists public services only.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "catalog", audience: "public", labelVocabulary: "claim-classes", claims, body: { items: services.map((x) => x.title) }, failures: [] };
  },
  "directory-entry"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const f = publicScalarFields(biz, s);
    const claims: Claim[] = [
      C(biz.title ?? biz.id, "SOURCE_FACT", "public", "Business record title."),
      ...contactClaims(s, biz),
      ...(f["address"] ? [C(`Address: ${f["address"]}`, "SOURCE_FACT", "public", "Business website address.")] : [C("Address not shown.", "PROJECTION_NOTE", "public", "Projection rendering rule.")]),
      C("Directory entry mirrors the public listing.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "directory-entry", audience: "public", labelVocabulary: "claim-classes", claims, body: { name: biz.title }, failures: [] };
  },
  "portfolio-card"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const services = relatedPublic(graph, biz.id, ["provides", "offers"]);
    const claims: Claim[] = [
      C(biz.title ?? biz.id, "SOURCE_FACT", "public", "Business record title."),
      C((biz.description ?? "").slice(0, 120), "SOURCE_FACT", "public", "Business website description (excerpt)."),
      C(`${services.length} public services`, "OBSERVATION", "public", "Count of public provides/offers relationships."),
      ...ownerPhoneClaim(s, biz),
      C("Card excerpt; not the full record.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "portfolio-card", audience: "public", labelVocabulary: "claim-classes", claims, body: { name: biz.title }, failures: [] };
  },
  "proposal-draft"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const services = relatedPublic(graph, biz.id, ["provides", "offers"]);
    const phone = biz.fields?.["phone"] ?? s.publicContact.phone;
    const claims: Claim[] = [
      C(`Draft proposal from ${biz.title}`, "PROJECTION_NOTE", "public", "Draft generator."),
      ...services.slice(0, 4).map((x) => C(`Proposed service: ${x.title}`, "OBSERVATION", "public", "Public provides/offers relationship.")),
      ...(phone ? [C(`Contact: ${phone}`, "OWNER_INTENT", "public", "Owner-effective contact value.")] : []),
      C("Pricing available on request. Internal rates are never included in drafts.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "proposal-draft", audience: "public", labelVocabulary: "claim-classes", claims,
      body: { draft: `Proposal from ${biz.title}: ${services.slice(0, 4).map((x) => x.title).join(", ")}.` }, failures: [] };
  },
  "lead-intake-schema"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const claims: Claim[] = [
      C("Schema fields: name, phone, service, message.", "PROJECTION_NOTE", "public", "Fixed intake schema."),
      C("Internal fields are never part of the intake schema.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "lead-intake-schema", audience: "public", labelVocabulary: "claim-classes", claims,
      body: { schema: { name: "string", phone: "string", service: "string", message: "string" } }, failures: [] };
  },
  "campaign-draft"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const services = relatedPublic(graph, biz.id, ["provides", "offers"]);
    const claims: Claim[] = [
      C(`Ad headline: ${biz.title} - ${(services[0]?.title ?? "local services")}`, "OBSERVATION", "public", "Composed from public facts."),
      C("Ad copy is a draft; claims must be verified before publishing.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "campaign-draft", audience: "public", labelVocabulary: "claim-classes", claims,
      body: { headline: `${biz.title}` }, failures: [] };
  },
  "landing-page"(graph, s) {
    const biz = businessOf(graph); if (!biz) throw new Error("no public business");
    const services = relatedPublic(graph, biz.id, ["provides", "offers"]);
    const claims: Claim[] = [
      C(biz.title ?? biz.id, "SOURCE_FACT", "public", "Business record title."),
      C((biz.description ?? "").slice(0, 300), "SOURCE_FACT", "public", "Business website description."),
      ...contactClaims(s, biz),
      ...services.slice(0, 6).map((x) => C(`Featured: ${x.title}`, "OBSERVATION", "public", "Public provides/offers relationship.")),
      C("Landing page is a marketing projection, not the business record.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "landing-page", audience: "public", labelVocabulary: "claim-classes", claims, body: { name: biz.title }, failures: [] };
  },
  "analytics-view"(graph, s) {
    const counts: Record<string, number> = {};
    for (const o of graph.objects ?? []) counts[o.visibility ?? "public"] = (counts[o.visibility ?? "public"] ?? 0) + 1;
    const claims: Claim[] = [
      C(`Objects by visibility: ${JSON.stringify(counts)}`, "OBSERVATION", "public", "Graph inventory count."),
      C("Aggregate counts only; no private values in this view.", "PROJECTION_NOTE", "public", "Projection rendering rule."),
    ];
    return { kind: "analytics-view", audience: "owner", labelVocabulary: "claim-classes", claims, body: { counts }, failures: [] };
  },
};
const GEN_ORDER = Object.keys(GENS);

// ---------------------------------------------------------------- ask-answers via the repo's concierge
const ASK_QS = [CONCIERGE_QUESTIONS[0].question, CONCIERGE_QUESTIONS[1].question, CONCIERGE_QUESTIONS[2].question];

function toPingObject(o: any): any {
  return {
    id: o.id, schema: o.schema, controllerId: o.controllerId ?? "fixture_synthetic",
    visibility: o.visibility === "public" ? "public" : "private",
    title: o.title ?? o.id, description: o.description ?? "",
    fields: Object.fromEntries(Object.entries(o.fields ?? {}).filter(([, v]) => typeof v === "string")),
    createdAt: o.createdAt ?? "2026-09-23T00:00:00Z", updatedAt: o.updatedAt ?? "2026-09-23T00:00:00Z",
    provenance: { kind: "website-derived", ref: o.provenance?.ref ?? "fixture:synthetic", derivedAt: o.provenance?.derivedAt ?? "2026-09-23T00:00:00Z" },
    ...(o.ownerFieldCorrections ? { ownerFieldCorrections: o.ownerFieldCorrections } : {}),
  };
}
function toPingRel(r: any): any {
  return { id: r.id, subject: r.subject, predicate: r.predicate, object: r.object, status: r.status === "active" ? "active" : "inactive", createdAt: r.createdAt ?? "2026-09-23T00:00:00Z", evidenceRef: r.evidenceRef ?? "fixture:synthetic" };
}

function askAnswers(graph: any, s: Secrets, onlyPublic: boolean): { projection: Projection; leaked: string[] } {
  const objs = (graph.objects ?? []).filter((o: any) => !onlyPublic || isPublic(o));
  const ids = new Set(objs.map((o: any) => o.id));
  const rels = (graph.relationships ?? []).filter((r: any) => ids.has(r.subject) && ids.has(r.object));
  const target = toPingObject(businessOf(graph) ?? objs[0]);
  const pObjs = objs.map(toPingObject);
  const pRels = rels.map(toPingRel);
  const claims: Claim[] = [];
  const leaked: string[] = [];
  for (const q of ASK_QS) {
    try {
      const ans = answerConciergeQuestion(conciergeInputFor("fixture-site", target, pObjs, pRels, q));
      if (!ans) { claims.push(C(`Question refused by concierge: ${q}`, "PROJECTION_NOTE", "public", "Concierge returned null.")); continue; }
      const gradeMap: Record<string, string> = { SUPPORTED: "SOURCE_FACT", DERIVED: "OBSERVATION", INFERRED: "OBSERVATION", UNKNOWN: "PROJECTION_NOTE" };
      for (const cl of ans.claims) claims.push(C(cl.text, gradeMap[cl.grade] ?? "PROJECTION_NOTE", "public", `Concierge grade ${cl.grade}.`));
      if (ans.text) claims.push(C(`Answer: ${ans.text.slice(0, 300)}`, "PROJECTION_NOTE", "public", "Concierge rendered text."));
    } catch (e) {
      claims.push(C(`Concierge error on "${q}": ${String(e).slice(0, 120)}`, "PROJECTION_NOTE", "public", "Fail-closed."));
    }
  }
  claims.push(C("Ask answers are projections over the visible graph; grades label the basis.", "PROJECTION_NOTE", "public", "Projection rendering rule."));
  const text = JSON.stringify(claims);
  const watch = [...s.privateValues, ...s.hiddenValues, ...s.privateTitles, ...s.hiddenTitles];
  for (const v of watch) if (v && text.includes(v) && !s.contaminationValues.includes(v)) leaked.push(v);
  return { projection: { kind: onlyPublic ? "ask-answers" : "ask-answers-adversarial", audience: "public", labelVocabulary: "concierge-grades+mapped", claims, body: { questions: ASK_QS.length }, failures: [] }, leaked };
}

// ---------------------------------------------------------------- verifier (independent of the SDK)
const ALLOWED_CLASSES = new Set(["SOURCE_FACT", "OWNER_INTENT", "OBSERVATION", "PROJECTION_NOTE"]);
const CONCIERGE_GRADES = new Set(["SUPPORTED", "DERIVED", "INFERRED", "UNKNOWN"]);
const CONTACT_KINDS = new Set(["website-sections", "directory-entry", "landing-page", "mobile-summary", "proposal-draft", "portfolio-card"]);

function verifyMission(i: number, m: Mutated, projections: Projection[], advLeaked: string[]): { outcome: string; findings: Finding[]; warnings: number } {
  const findings: Finding[] = []; let warnings = 0;
  const s = m.secrets;
  const F = (cls: string, component: string, claim: string, evidence: string, broken: string, signature: string, conf = 0.9): Finding => ({
    DOMAIN: "PROJECTION", COMPONENT: component, CLAIM: claim, EVIDENCE: evidence,
    CALLER: "projection SDK surface generator", CALLEE: "graph (single source)",
    WRITER: "shard-0 harness", READER: "public surface consumer / owner",
    AUTHORITY: "mission verifier (independent path)", CLASSIFICATION: cls, CONFIDENCE: conf,
    BROKEN_BOUNDARY: broken, DEPENDENCIES: ["visibility gate", "field gate", "owner-intent overlay", "labeling"],
    AFFECTS_AGENTS: ["projection", "owner", "ask"],
    mission: i, signature,
  });
  const allWatch = [...s.privateValues, ...s.hiddenValues, ...s.privateTitles, ...s.hiddenTitles, ...s.privateFieldNames, ...s.hiddenFieldNames];
  const classSet = new Set<string>();

  for (const p of projections) {
    const text = JSON.stringify(p);
    for (const cl of p.claims) classSet.add(cl.claimClass);
    if (p.audience === "public") {
      for (const v of allWatch) {
        if (!v || !text.includes(v)) continue;
        if (s.contaminationValues.includes(v)) {
          warnings++;
          findings.push(F("WARNING", p.kind, "Private value present in a public source field; projection repeats the source.", `value=${v} projection=${p.kind} fixture=${m.fixtureName}`, "source hygiene (not a projection leak)", `warning:source-contamination:${p.kind}`, 0.7));
          continue;
        }
        findings.push(F("LEAK", p.kind, `Non-public value surfaced on a public projection: ${v.slice(0, 40)}`, `projection=${p.kind} fixture=${m.fixtureName} mission=${i}`, "public/private visibility boundary", `leak:${p.kind}:nonpublic-value`, 0.95));
      }
      if (s.ownerCorrection && s.ownerCorrection.sourceValue !== s.ownerCorrection.ownerValue) {
        // Stale source value check applies to claim TEXT (surface-visible
        // prose), not to `basis` lineage: the honest SOURCE SAYS X / OWNER
        // SAYS Y lineage legitimately records what the source said.
        const claimText = p.claims.map((c) => c.text).join("\n");
        if (claimText.includes(s.ownerCorrection.sourceValue))
          findings.push(F("MISLABEL", p.kind, "Stale source phone value presented in public claim text after owner correction.", `projection=${p.kind} stale=${s.ownerCorrection.sourceValue}`, "SOURCE SAYS X / OWNER SAYS Y precedence", `mislabel:${p.kind}:stale-source-value`, 0.9));
      }
      for (const av of s.ownerHiddenAddressValues) {
        if (av && text.includes(av))
          findings.push(F("LEAK", p.kind, "Owner-hidden address value appears on a public projection.", `projection=${p.kind} value="${av.slice(0, 50)}" owner hid address on the business object; the same value survives on a related public location object and is cited via located_at traversal`, "owner address-visibility decision (not propagated to related objects)", `leak:${p.kind}:hidden-address`, 0.85));
      }
      // public stays public
      if (CONTACT_KINDS.has(p.kind) && s.publicContact.phone && !text.includes(s.publicContact.phone)) {
        warnings++;
        findings.push(F("WARNING", p.kind, "Public contact phone missing from a contact-bearing public projection.", `projection=${p.kind} fixture=${m.fixtureName}`, "public-stays-public", `warning:public-drop:${p.kind}`, 0.8));
      }
    } else {
      // owner audience: private/hidden allowed but must be labeled; values must be present in dashboard
      if (p.kind === "owner-dashboard-view") {
        const hasPriv = s.privateValues.some((v) => v && text.includes(v));
        const hasHid = s.hiddenValues.some((v) => v && text.includes(v));
        if (!hasPriv || !hasHid)
          findings.push(F("MISLABEL", p.kind, "Owner dashboard omits private/hidden data it should surface to the owner.", `hasPriv=${hasPriv} hasHid=${hasHid}`, "owner working view completeness", `mislabel:dashboard-incomplete`, 0.85));
        const visTags = new Set(p.claims.map((c) => c.visibility));
        if (!visTags.has("private") || !visTags.has("hidden"))
          findings.push(F("MISLABEL", p.kind, "Dashboard claims lack private/hidden visibility tags.", `tags=${[...visTags].join(",")}`, "visibility labeling", `mislabel:dashboard-no-vis-tags`, 0.85));
      }
    }
    if (CANON_RE.test(text))
      findings.push(F("MISLABEL", p.kind, "Projection claims canonical authority.", `matched canonical-authority phrase in ${p.kind}`, "PROJECTION != TRUTH", `mislabel:${p.kind}:canonical-authority`, 0.9));
    for (const cl of p.claims) {
      if (!ALLOWED_CLASSES.has(cl.claimClass) && !CONCIERGE_GRADES.has(cl.claimClass))
        findings.push(F("MISLABEL", p.kind, `Claim carries unknown label: ${cl.claimClass}`, `claim="${cl.text.slice(0, 80)}"`, "label vocabulary", `mislabel:${p.kind}:unknown-label`, 0.9));
    }
  }
  // SOURCE FACT != OWNER INTENT != OBSERVATION distinctly labeled across the mission
  const need = ["SOURCE_FACT", "OBSERVATION"];
  if (s.ownerCorrection) need.push("OWNER_INTENT");
  for (const n of need) {
    if (!classSet.has(n)) {
      warnings++;
      findings.push(F("WARNING", "mission", `Expected claim class ${n} absent across all projections.`, `mission=${i}`, "label coverage", `warning:label-missing:${n}`, 0.7));
    }
  }
  // owner-corrected value must be labeled OWNER_INTENT wherever it appears as a claim
  if (s.ownerCorrection) {
    for (const p of projections) {
      for (const cl of p.claims) {
        if (cl.text.includes(s.ownerCorrection.ownerValue) && cl.claimClass !== "OWNER_INTENT" && p.kind !== "ask-answers") {
          findings.push(F("MISLABEL", p.kind, "Owner-effective value labeled as something other than OWNER_INTENT.", `claim="${cl.text.slice(0, 80)}" class=${cl.claimClass}`, "SOURCE FACT != OWNER INTENT", `mislabel:${p.kind}:owner-value-wrong-class`, 0.9));
        }
      }
    }
  }
  // adversarial concierge: repo code with the FULL graph
  if (advLeaked.length > 0) {
    findings.push(F("LEAK", "ask/concierge.ts", "Repo concierge repeats non-public values when handed the full graph.", `leaked=${advLeaked.slice(0, 3).map((v) => v.slice(0, 30)).join("|")} fixture=${m.fixtureName}`, "concierge input contract (visible graph only)", `leak:concierge:full-graph:${m.fixtureName}`, 0.9));
  }
  const leaks = findings.filter((f) => f.CLASSIFICATION === "LEAK").length;
  const mis = findings.filter((f) => f.CLASSIFICATION === "MISLABEL").length;
  const outcome = leaks && mis ? "LEAK_AND_MISLABEL" : leaks ? "LEAK" : mis ? "MISLABEL" : warnings ? "WARNINGS" : "PASS";
  return { outcome, findings, warnings };
}

// ---------------------------------------------------------------- main
function parseArgs() {
  const a = process.argv.slice(2);
  const g = (k: string, d: string) => { const x = a.find((y) => y.startsWith(k + "=")); return x ? x.slice(k.length + 1) : d; };
  return {
    start: parseInt(g("--start", "0"), 10), end: parseInt(g("--end", "500"), 10),
    fixtureDir: g("--fixture-dir", "/home/nolan/fyd-fixtures-p0"),
    out: g("--out", "/home/nolan/fyd-projection-out/shard-0"),
    rerun: a.includes("--rerun"),
  };
}

function listFixtures(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".json")) {
        // Fail closed at selection: only true graph fixtures (graph.objects
        // array present). Sidecars like provenance.json are not worlds.
        try {
          const f = JSON.parse(fs.readFileSync(p, "utf8"));
          const objs = (f.graph ?? f).objects;
          if (Array.isArray(objs) && objs.length > 0) out.push(p);
        } catch { /* unreadable: not a fixture */ }
      }
    }
  };
  walk(dir);
  return out.sort();
}

function main() {
  const args = parseArgs();
  fs.mkdirSync(args.out, { recursive: true });
  const fixtures = listFixtures(args.fixtureDir);
  const resultsPath = path.join(args.out, "results.jsonl");
  const findingsPath = path.join(args.out, "findings.jsonl");
  if (args.rerun) {
    // drop old lines for the rerun range, keep the rest
    if (fs.existsSync(resultsPath)) {
      const kept = fs.readFileSync(resultsPath, "utf8").split("\n").filter((l) => {
        if (!l.trim()) return false;
        try { const j = JSON.parse(l); return !(j.mission >= args.start && j.mission < args.end); } catch { return true; }
      });
      fs.writeFileSync(resultsPath, kept.join("\n") + (kept.length ? "\n" : ""));
    }
  }
  let pass = 0, warn = 0, leak = 0, mis = 0, both = 0, genErr = 0;
  let totalMs = 0; const projMs: Record<string, number[]> = {};
  const t0 = now();
  for (let i = args.start; i < args.end; i++) {
    const mt0 = now();
    let rec: any;
    try {
      const fixturePath = fixtures[i % fixtures.length];
      const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
      const m = mutateGraph(fixture, path.basename(fixturePath), i);
      const projections: Projection[] = [];
      for (const kind of GEN_ORDER) {
        const pt0 = now();
        try { projections.push(GENS[kind](m.graph, m.secrets)); }
        catch (e) { projections.push(failClosed(kind, "public", e)); }
        const dt = now() - pt0;
        (projMs[kind] = projMs[kind] || []).push(dt);
      }
      const { projection: askP, leaked: askLeaked } = askAnswers(m.graph, m.secrets, true);
      projections.push(askP);
      const { leaked: advLeaked } = askAnswers(m.graph, m.secrets, false);
      const { outcome, findings, warnings } = verifyMission(i, m, projections, advLeaked);
      const dt = now() - mt0;
      totalMs += dt;
      if (outcome === "PASS") pass++;
      else if (outcome === "WARNINGS") warn++;
      else if (outcome === "LEAK") leak++;
      else if (outcome === "MISLABEL") mis++;
      else if (outcome === "LEAK_AND_MISLABEL") both++;
      rec = {
        mission: i, fixture: path.basename(fixturePath), variant: i % 6,
        outcome, warnings, leakCount: findings.filter((f) => f.CLASSIFICATION === "LEAK").length,
        mislabelCount: findings.filter((f) => f.CLASSIFICATION === "MISLABEL").length,
        projections: projections.length, claims: projections.reduce((n, p) => n + p.claims.length, 0),
        ms: dt, synthetic: true, testing_only: true,
      };
      for (const f of findings) fs.appendFileSync(findingsPath, JSON.stringify(f) + "\n");
    } catch (e) {
      genErr++;
      rec = { mission: i, outcome: "GENERATOR_ERROR", error: String(e).slice(0, 200), ms: now() - mt0, synthetic: true, testing_only: true };
    }
    fs.appendFileSync(resultsPath, JSON.stringify(rec) + "\n");
    if ((i - args.start) % 25 === 0) {
      const el = ((now() - t0) / 1000).toFixed(1);
      console.log(`[${new Date().toISOString()}] mission ${i} outcome=${rec.outcome} elapsed=${el}s`);
    }
  }
  const pct = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return { p50: s[Math.floor(s.length / 2)] ?? 0, p95: s[Math.floor(s.length * 0.95)] ?? 0 }; };
  const summary = {
    shard: "projection-0", range: [args.start, args.end], rerun: args.rerun,
    outcomes: { PASS: pass, WARNINGS: warn, LEAK: leak, MISLABEL: mis, LEAK_AND_MISLABEL: both, GENERATOR_ERROR: genErr },
    totalMs, missionsPerMin: ((args.end - args.start) / (totalMs / 60000)).toFixed(1),
    peakRssMB: Math.round(process.memoryUsage().rss / 1048576),
    projectionLatencyMs: Object.fromEntries(Object.entries(projMs).map(([k, v]) => [k, pct(v)])),
    fixtures: fixtures.length,
  };
  fs.writeFileSync(path.join(args.out, "run-summary.json"), JSON.stringify(summary, null, 2));
  console.log("RUN_SUMMARY " + JSON.stringify(summary));
}

main();
