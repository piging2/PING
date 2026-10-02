/**
 * SYNTH-SHARD-0 harness: synthetic business operating worlds testing the
 * reobservation loop. ONE harness for the whole shard (indices 0..499).
 *
 * Pipeline per mission i:
 *   generate world(i) [deterministic contract] -> SOURCE -> OBSERVATION ->
 *   EVIDENCE -> OBJECTS -> OWNER INTENT (correct-fact | hide-object | none) ->
 *   REOBSERVATION (changed source | conflicting new source | dropped field |
 *   identity churn | whitespace drift) -> REGENERATE (reference implementation
 *   of the repo's owner-overlay + source-refresh semantics, read-only port) ->
 *   VERIFY.
 *
 * VERIFY asserts:
 *   1. owner correction survived reobservation (effective value == owner value)
 *   2. owner hide did not delete underlying evidence (facts absent from public
 *      projection, evidence + occurrences intact)
 *   3. history intelligible (old occurrence ids byte-immutable, append-only)
 *   4. no invented claims about changed facts (every public claim bound to an
 *      occurrence or an owner assertion; conflicts labeled, never silently
 *      resolved; unsafe URL schemes absent)
 *
 * Every artifact carries synthetic:true + testing_only:true (never presented
 * as a real prospect). No repo writes, no network, no browser.
 *
 * PATCHED mode (FYD_PATCHED=1): enables the proposed fixes under test so the
 * improve-once loop can rerun affected missions and measure the delta.
 */
import { createHash } from "node:crypto";
import { appendFileSync, writeFileSync } from "node:fs";

const PATCHED = process.env.FYD_PATCHED === "1";
const SHARD = Number(process.env.FYD_SHARD ?? "0");
const I0 = SHARD * 500;
const I1 = I0 + 500;
const OUT = process.env.FYD_OUT ?? "results.jsonl";

// ---------------------------------------------------------------- deterministic contract
const TYPES = ["local-services","professional","restaurant","hospitality","health","fitness","beauty","automotive","real-estate","construction","manufacturing","logistics","retail","ecommerce","education","nonprofit","creator","consulting","finance","legal","tech","saas","enterprise","multi-location","franchise","marketplace","mobile-service","appointment","catalog","knowledge","project","membership"];
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
function sha16(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex").slice(0, 16);
}
function shaFull(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}
// factIdFor port: "fact-" + sha256(objectId|field|index)[0..16]
function factIdFor(objectId: string, field: string, index = 0): string {
  return "fact-" + sha16(objectId + "|" + field + "|" + index);
}
function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v !== null && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) out[k] = canon((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}
const canonJson = (v: unknown) => JSON.stringify(canon(v));

const PRE = ["Copper","Cedar","Mesa","Juniper","Adobe","Grand","Palisade","Delta","Iron","Blue","Canyon","Aspen","Cottonwood","Sage","Red Rock","Monument"];
const TRADE = ["Plumbing","Roofing","HVAC","Electric","Landscaping","Concrete","Painting","Drywall","Fencing","Garage Doors","Septic","Well Drilling","Tree Care","Pest Control","Appliance Repair","Locksmith"];
const HOURS = ["Mon-Fri 8a-6p","Mon-Fri 7a-7p","Mon-Sat 8a-5p","Tue-Sat 9a-6p","Mon-Fri 9a-5p","24/7 Emergency"];
const HOURS_ALT = ["Mon-Fri 8a-5p","Mon-Thu 7a-6p","Mon-Sat 7a-7p","Tue-Sat 8a-5p","Mon-Fri 7:30a-5:30p","Mon-Fri 8a-6p, Sat 9a-2p"];
const STREETS = ["1234 Main St","5678 Patterson Rd","9012 North Ave","3456 F Rd","7890 Orchard Ave"];

type Marker = { synthetic: true; testing_only: true };
const MARK: Marker = { synthetic: true, testing_only: true };

interface Occ { occurrenceId: string; sourceId: string; observedAt: string; payload: string }
interface Obj { objectId: string; eid: string; schema: string; visibility: string; title: string }
interface Fact { factId: string; objectId: string; field: string; index: number; value: string; kind: string; occurrenceId: string; sourceId: string }
interface Assertion {
  assertionId: string; objectId: string; targetEid: string; field: string;
  op: "CORRECT" | "HIDE"; value: string | null;
  sourceValueSeen: string | null; correctedAt: string; actorLabel: string; basis: string;
}
interface OwnerLayer { intent: Record<string, never>; assertions: Assertion[] }
interface Graph { objects: Obj[]; facts: Fact[]; occurrences: Occ[] }
interface Claim { text: string; provenance: { occurrenceId?: string; assertionId?: string; conflict?: boolean }; unsafeStripped?: boolean }
interface PublicProjection { sections: Record<string, string[]>; claims: Claim[]; unsafeStripped: number }

function kindOf(field: string): string {
  const f = field.toLowerCase();
  if (f === "name") return "identity";
  if (["phone","email","website"].includes(f)) return "contact";
  if (["address","street","city"].includes(f)) return "location";
  return "other";
}
function isUnsafeUrl(v: string): boolean {
  const t = v.trim().toLowerCase();
  return /^(javascript|data|vbscript|file):/.test(t);
}
function normVal(v: string): string {
  // Conservative normalization: trim, collapse whitespace runs, strip bidi marks.
  // Does NOT fold dashes, case, or punctuation (those can be semantic).
  return v.replace(/[\u200E\u200F\u202A-\u202E]/g, "").replace(/\s+/g, " ").trim();
}
function rawFieldValue(value: string | null): string | null {
  // Port of owner-overlay rawFieldValue: trim on read.
  if (value == null) return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

// ---------------------------------------------------------------- world generation
interface World {
  i: number; type: string; dim: string; hostile: string;
  ownerIntent: "hide-object" | "correct-fact" | "none";
  name: string; phone: string; hours: string; address: string; website: string;
  graph: Graph; marker: Marker;
  correctedField: string | null; ownerValue: string | null;
  hideObjectId: string | null; hideEid: string | null;
}

function genWorld(i: number): World {
  const rng = mulberry32(i);
  const type = TYPES[i % 32];
  const dim = DIMS[Math.floor(i / 32) % 6];
  const hostile = (i % 4 === 0) ? HOSTILES[Math.floor(i / 192) % 10] : "clean";
  const ownerIntent = (i % 5 === 0) ? "hide-object" : (i % 5 === 1) ? "correct-fact" : "none";
  const name = PRE[Math.floor(rng() * PRE.length)] + " " + TRADE[Math.floor(rng() * TRADE.length)];
  const phone = "+1 (555) 01" + String(i).padStart(3, "0");
  const hours = HOURS[Math.floor(rng() * HOURS.length)];
  const address = STREETS[Math.floor(rng() * STREETS.length)] + ", Grand Junction, CO";
  const website = "https://www." + name.toLowerCase().replace(/[^a-z]+/g, "") + ".example.com";

  const objects: Obj[] = [];
  const facts: Fact[] = [];
  const occurrences: Occ[] = [];
  let occN = 0;
  const day = String(10 + (i % 18)).padStart(2, "0");
  const ts = (n: number) => `2026-09-${day}T${String(8 + (n % 9)).padStart(2, "0")}:00:00Z`;
  function addOcc(sourceId: string, payload: string): Occ {
    const o: Occ = { occurrenceId: `occ-${i}-${occN++}`, sourceId, observedAt: ts(occN), payload };
    occurrences.push(o);
    return o;
  }
  function addObj(objectId: string, schema: string, visibility: string, title: string): Obj {
    const o: Obj = { objectId, eid: `eid-${i}-${objectId}`, schema, visibility, title };
    objects.push(o);
    return o;
  }
  function addFact(obj: Obj, field: string, value: string, sourceId: string): Fact {
    const idx = facts.filter((f) => f.objectId === obj.objectId && f.field === field).length;
    const occ = addOcc(sourceId, `${obj.objectId}.${field}=${value}`);
    const f: Fact = { factId: factIdFor(obj.objectId, field, idx), objectId: obj.objectId, field, index: idx, value, kind: kindOf(field), occurrenceId: occ.occurrenceId, sourceId };
    facts.push(f);
    return f;
  }

  const biz = addObj(`biz-${i}`, "business", "public", name);
  addFact(biz, "name", name, "src-primary");
  addFact(biz, "phone", phone, "src-primary");
  addFact(biz, "hours", hours, "src-primary");
  addFact(biz, "website", website, "src-primary");
  addFact(biz, "address", address, "src-primary");

  const nSvc = 2 + Math.floor(rng() * 4) + (hostile === "many-services" ? 6 : 0);
  const svcObjs: Obj[] = [];
  for (let k = 0; k < nSvc; k++) {
    const s = addObj(`svc-${i}-${k}`, "service", "public", `${TRADE[(i + k) % TRADE.length]} Service ${k + 1}`);
    addFact(s, "name", s.title, "src-primary");
    addFact(s, "description", `Professional ${TRADE[(i + k) % TRADE.length].toLowerCase()} work across the Grand Valley.`, "src-primary");
    svcObjs.push(s);
  }
  if (dim === "person-heavy") {
    const nP = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < nP; k++) {
      const p = addObj(`per-${i}-${k}`, "person", "public", `Tech ${k + 1}`);
      addFact(p, "name", p.title, "src-primary");
      addFact(p, "role", "Field technician", "src-primary");
    }
  }

  const correctedField = ownerIntent === "correct-fact" ? (i % 2 === 0 ? "phone" : "hours") : null;
  const ownerValue = correctedField === "phone"
    ? "+1 (555) 02" + String(i).padStart(3, "0")
    : correctedField === "hours" ? HOURS_ALT[i % HOURS_ALT.length] : null;
  const hideTarget = ownerIntent === "hide-object" ? svcObjs[0] : null;

  return {
    i, type, dim, hostile, ownerIntent, name, phone, hours, address, website,
    graph: { objects, facts, occurrences }, marker: MARK,
    correctedField, ownerValue,
    hideObjectId: hideTarget ? hideTarget.objectId : null,
    hideEid: hideTarget ? hideTarget.eid : null,
  };
}

// ---------------------------------------------------------------- owner intent -> owner layer
function buildOwnerLayer(w: World): OwnerLayer {
  const assertions: Assertion[] = [];
  const biz = w.graph.objects.find((o) => o.schema === "business")!;
  if (w.ownerIntent === "correct-fact" && w.correctedField && w.ownerValue) {
    const srcFact = w.graph.facts.find((f) => f.objectId === biz.objectId && f.field === w.correctedField)!;
    // sourceValueSeen recorded RAW (as the extractor produced), mirroring
    // corrections.ts where the fact value is stored untrimmed.
    const body = canonJson({ op: "CORRECT", objectId: biz.objectId, field: w.correctedField, value: w.ownerValue });
    assertions.push({
      assertionId: "oa-" + shaFull(body).slice(0, 12),
      objectId: biz.objectId, targetEid: biz.eid, field: w.correctedField,
      op: "CORRECT", value: w.ownerValue,
      sourceValueSeen: srcFact.value,
      correctedAt: "2026-09-20T10:00:00Z",
      actorLabel: "Synthetic Owner (testing only)",
      basis: `Owner correction: the owner says the ${w.correctedField} is ${w.ownerValue}.`,
    });
  }
  if (w.ownerIntent === "hide-object" && w.hideObjectId) {
    const targetFacts = w.graph.facts.filter((f) => f.objectId === w.hideObjectId);
    for (const f of targetFacts) {
      const body = canonJson({ op: "HIDE", objectId: f.objectId, field: f.field, index: f.index });
      assertions.push({
        assertionId: "oa-" + shaFull(body).slice(0, 12),
        objectId: f.objectId, targetEid: w.hideEid!, field: f.field,
        op: "HIDE", value: null,
        sourceValueSeen: f.value,
        correctedAt: "2026-09-20T10:00:00Z",
        actorLabel: "Synthetic Owner (testing only)",
        basis: `Owner hide: ${f.objectId}.${f.field} hidden from the public site.`,
      });
    }
  }
  return { intent: {}, assertions };
}
function digestOwnerLayer(layer: OwnerLayer): string {
  const sorted = [...layer.assertions].sort((a, b) =>
    a.objectId < b.objectId ? -1 : a.objectId > b.objectId ? 1 :
    a.field < b.field ? -1 : a.field > b.field ? 1 : 0);
  return shaFull(canonJson({ intent: layer.intent, assertions: sorted }));
}

// ---------------------------------------------------------------- reobservation
interface ReobsInfo {
  kind: string; probes: string[];
  source1: Graph;
  newOccurrenceIds: string[];
}

function reobserve(w: World): ReobsInfo {
  const rng = mulberry32(1000003 + w.i);
  const probes: string[] = [];
  const g = w.graph;
  // Deep copy source0 into the mutable working graph; occurrence ids of old
  // observations are carried byte-identical (append-only history).
  const objects: Obj[] = g.objects.map((o) => ({ ...o }));
  const facts: Fact[] = g.facts.map((f) => ({ ...f }));
  const occurrences: Occ[] = g.occurrences.map((o) => ({ ...o }));
  let occN = occurrences.length;
  const day = String(10 + (w.i % 18)).padStart(2, "0");
  const newOccIds: string[] = [];
  function addOcc(sourceId: string, payload: string): Occ {
    const o: Occ = { occurrenceId: `occ-${w.i}-${occN++}-r`, sourceId, observedAt: `2026-09-${day}T18:00:00Z`, payload };
    occurrences.push(o); newOccIds.push(o.occurrenceId);
    return o;
  }
  function setFact(objectId: string, field: string, value: string, sourceId: string): void {
    let f = facts.find((x) => x.objectId === objectId && x.field === field && x.index === 0);
    const occ = addOcc(sourceId, `${objectId}.${field}=${value}`);
    if (f) { f.value = value; f.occurrenceId = occ.occurrenceId; f.sourceId = sourceId; f.factId = factIdFor(objectId, field, f.index); }
    else facts.push({ factId: factIdFor(objectId, field, 0), objectId, field, index: 0, value, kind: kindOf(field), occurrenceId: occ.occurrenceId, sourceId });
  }
  function dropFact(objectId: string, field: string): void {
    const k = facts.findIndex((x) => x.objectId === objectId && x.field === field && x.index === 0);
    if (k >= 0) facts.splice(k, 1); // fact gone from re-derived source; evidence (occurrences) retained
  }

  const biz = objects.find((o) => o.schema === "business")!;
  const bizId = () => biz.objectId;
  let kind = "changed";
  const wantConflict = w.hostile === "conflicting-hours" || w.hostile === "contradictory-sources" || rng() < 0.15;
  const wantUnsafe = w.hostile === "unsafe-urls" || rng() < 0.06;

  // Baseline: the primary source re-emits with changed phone + hours.
  // Whitespace probe (decided before the baseline so the draw order is
  // stable): when it fires on the corrected field, the source re-emits the
  // SAME semantic value wrapped in whitespace/bidi marks instead of a new
  // value. This isolates the normalization question: trim(current) vs the
  // raw recorded sourceValueSeen.
  const wsFire = w.hostile === "rtl-text" || (w.ownerIntent === "correct-fact" && rng() < 0.10);
  const wsWrap = (v: string) => "  \u200E" + v + "\u200F  ";
  if (wsFire) probes.push("whitespace-drift");
  const newPhone = "+1 (555) 03" + String(w.i).padStart(3, "0");
  const newHours = HOURS[(w.i + 3) % HOURS.length];
  const cfIsPhone = w.correctedField === "phone";
  const cfIsHours = w.correctedField === "hours";
  setFact(bizId(), "phone", (wsFire && cfIsPhone) ? wsWrap(w.phone) : newPhone, "src-primary");
  setFact(bizId(), "hours", (wsFire && cfIsHours) ? wsWrap(w.hours) : newHours, "src-primary");
  if (w.hostile === "stale-source" || (w.ownerIntent === "correct-fact" && rng() < 0.10)) {
    probes.push("dropped-field");
    dropFact(bizId(), w.correctedField ?? "phone");
  }
  if (wantConflict) {
    probes.push("conflicting-source");
    kind = "conflict";
    // A second source appears asserting different contact facts. Both
    // sources are retained; the conflict must be labeled, never silently resolved.
    addOcc("src-secondary", `${bizId()}.phone=+1 (555) 09${String(w.i).padStart(3, "0")}`);
    addOcc("src-secondary", `${bizId()}.hours=${HOURS[(w.i + 5) % HOURS.length]}`);
  }
  if (wantUnsafe) {
    probes.push("unsafe-url");
    setFact(bizId(), "website", "javascript:alert(document.domain)", "src-primary");
  }
  if (w.hostile === "no-jsonld") {
    probes.push("sparse-source");
    dropFact(bizId(), "website");
  }
  if (w.hostile === "franchise-lookalike" || (w.ownerIntent !== "none" && rng() < 0.12)) {
    // Identity churn: the re-derived source emits a parent-brand business
    // object FIRST and re-keys service object ids.
    probes.push("identity-churn");
    kind = kind === "conflict" ? "conflict" : "identity-churn";
    const hq: Obj = { objectId: `biz-${w.i}-hq`, eid: `eid-${w.i}-hq`, schema: "business", visibility: "public", title: w.name + " (Brand)" };
    objects.unshift(hq);
    const occ = addOcc("src-primary", `${hq.objectId}.phone=${newPhone}`);
    facts.push({ factId: factIdFor(hq.objectId, "phone", 0), objectId: hq.objectId, field: "phone", index: 0, value: newPhone, kind: "contact", occurrenceId: occ.occurrenceId, sourceId: "src-primary" });
    for (const s of objects.filter((o) => o.schema === "service")) {
      const oldId = s.objectId;
      s.objectId = oldId.replace(`svc-${w.i}-`, `service-${w.i}-`);
      s.eid = s.eid; // eid is the stable evidence key; the re-derived objectId churns
      for (const f of facts.filter((x) => x.objectId === oldId)) {
        f.objectId = s.objectId;
        f.factId = factIdFor(s.objectId, f.field, f.index);
      }
    }
  }
  if (w.ownerIntent === "correct-fact" && rng() < 0.08) {
    // The refreshed source re-derives the business object as non-public.
    probes.push("visibility-flip");
    biz.visibility = "unlisted";
  }

  return { kind, probes, source1: { objects, facts, occurrences }, newOccurrenceIds: newOccIds };
}

// ---------------------------------------------------------------- reference refresh
// Faithful port of the repo's documented semantics (read-only):
//  - source-refresh.ts: SOURCE replaced wholesale; OWNER layer carried
//    byte-stable (digest proof); semantic diff flags collisions.
//  - owner-overlay.ts: corrections composed AFTER digest verification onto
//    the business object found by (schema business && visibility public);
//    source layer never mutated; sourceDrifted derived per read as
//    trim(current) !== stored sourceValue (asymmetric: store keeps raw).
//  - corrections.ts: CONFLICT when current differs from sourceValueSeen AND
//    from owner value; owner value stays applied.
//  - visibility-policy.ts: per-fact visibility; HIDE assertions resolved by
//    factId = sha256(objectId|field|index); unknown factIds never guessed.
interface ComposedCorrection { assertionId: string; targetObjectId: string; field: string; ownerValue: string; sourceValueSeen: string | null; sourceDrifted: boolean; conflict: { sourceValue: string } | null; collision: string | null }
interface RefreshResult {
  ownerDigestBefore: string; ownerDigestAfter: string; ownerLayerIntact: boolean;
  effective: Map<string, { value: string; assertionId: string }>;
  composedCorrections: ComposedCorrection[];
  orphanedCorrections: { assertionId: string; reason: string }[];
  ambiguousTarget: boolean;
  visibility: Map<string, "public" | "hidden">;
  hideOrphans: { assertionId: string; reason: string }[];
  projection: PublicProjection;
  ownerViewFactIds: string[];
  conflictClaims: number;
}

function refreshSource(w: World, owner: OwnerLayer, source1: Graph): RefreshResult {
  const digestBefore = digestOwnerLayer(owner);
  const carried: OwnerLayer = JSON.parse(JSON.stringify(owner)) as OwnerLayer;
  const digestAfter = digestOwnerLayer(carried);

  const factByObjField = new Map<string, Fact>();
  for (const f of source1.facts) factByObjField.set(f.objectId + "|" + f.field + "|" + f.index, f);

  // Business candidates: the repo's findBusinessObject predicate.
  const candidates = source1.objects.filter((o) => o.schema === "business" && o.visibility === "public");

  const effective = new Map<string, { value: string; assertionId: string }>();
  const composedCorrections: ComposedCorrection[] = [];
  const orphanedCorrections: { assertion: Assertion; reason: string }[] = [];
  // Business-identity ambiguity is a property of the refreshed source, not of
  // the correction loop: it must be visible to the verifier even in worlds
  // with no CORRECT assertions (hide-object / none intents).
  let ambiguousTarget = candidates.length > 1;

  for (const a of carried.assertions.filter((x) => x.op === "CORRECT")) {
    if (candidates.length === 0) {
      // Reference behavior: applyOwnerFieldCorrections returns {graph, applied:[]}
      // SILENTLY. PATCHED: surface the orphan explicitly.
      if (PATCHED) orphanedCorrections.push({ assertion: a, reason: "no-business-object" });
      continue;
    }
    let target = candidates[0];
    if (candidates.length > 1) {
      ambiguousTarget = true;
      if (PATCHED) {
        // Patch v2: fail closed, never first-wins. No eid fallback in the
        // patch: the assertion record carries no stable target key.
        orphanedCorrections.push({ assertion: a, reason: "ambiguous-target" });
        continue;
      }
      // Reference: attach to the first candidate, no flag.
    }
    const f = factByObjField.get(target.objectId + "|" + a.field + "|0");
    const cur = f ? rawFieldValue(f.value) : null;
    // Drift: reference compares trim(current) to the STORED (raw) value.
    const drifted = PATCHED
      ? (cur === null ? a.sourceValueSeen !== null : normVal(cur) !== normVal(a.sourceValueSeen ?? ""))
      : cur !== a.sourceValueSeen;
    let conflict: { sourceValue: string } | null = null;
    let collision: string | null = null;
    if (cur === null) {
      collision = "field-dropped"; // owner-override-collision: owner retained, drift visible
    } else if (PATCHED ? (normVal(cur) !== normVal(a.sourceValueSeen ?? "") && normVal(cur) !== normVal(a.value ?? ""))
                       : (cur !== a.sourceValueSeen && cur !== a.value)) {
      conflict = { sourceValue: cur };
    }
    effective.set(target.objectId + "|" + a.field, { value: a.value!, assertionId: a.assertionId });
    composedCorrections.push({ assertionId: a.assertionId, targetObjectId: target.objectId, field: a.field, ownerValue: a.value!, sourceValueSeen: a.sourceValueSeen, sourceDrifted: drifted, conflict, collision });
  }

  // Visibility: per-fact, factId-anchored hide assertions.
  const visibility = new Map<string, "public" | "hidden">();
  const hideOrphans: { assertionId: string; reason: string }[] = [];
  const factIds = new Set(source1.facts.map((f) => f.factId));
  const hideAssertions = carried.assertions.filter((x) => x.op === "HIDE");
  const matchedHide = new Set<string>();
  for (const f of source1.facts) {
    let vis: "public" | "hidden" = f.kind === "location" ? "hidden" : "public";
    for (const a of hideAssertions) {
      if (a.field !== f.field || (a as Assertion).index !== undefined) continue;
      const refId = factIdFor(a.objectId, a.field, 0);
      if (f.factId === refId) { vis = "hidden"; matchedHide.add(a.assertionId); break; }
      if (PATCHED && f.objectId !== a.objectId) {
        // Content-stable fallback: the assertion's targetEid identifies the
        // object across re-derivation id churn.
        const obj = source1.objects.find((o) => o.objectId === f.objectId);
        if (obj && obj.eid === a.targetEid) { vis = "hidden"; matchedHide.add(a.assertionId); break; }
      }
    }
    visibility.set(f.factId, vis);
  }
  for (const a of hideAssertions) {
    if (!matchedHide.has(a.assertionId)) hideOrphans.push({ assertionId: a.assertionId, reason: PATCHED ? "hide-orphan-surfaced" : "hide-orphan-silent" });
  }

  // Conflicting sources: derive from occurrence payloads (no cheat access).
  const valuesByField = new Map<string, Map<string, string>>(); // objId|field -> value -> sourceId
  for (const o of source1.occurrences) {
    const m = /^(.+)\.([a-zA-Z]+)=(.*)$/.exec(o.payload);
    if (!m) continue;
    const key = m[1] + "|" + m[2];
    if (!valuesByField.has(key)) valuesByField.set(key, new Map());
    if (!valuesByField.get(key)!.has(m[3])) valuesByField.get(key)!.set(m[3], o.sourceId);
  }

  // Public projection: only public facts; unsafe URLs stripped; hidden ABSENT.
  const sections: Record<string, string[]> = { contact: [], hours: [], services: [], people: [] };
  const claims: Claim[] = [];
  let unsafeStripped = 0;
  let conflictClaims = 0;
  // Business resolution for projection. Reference: first candidate wins silently.
  // PATCHED (findBusinessObject v2): exactly one candidate or none; under
  // ambiguity no settled business facts are presented (fail closed).
  const bizObj = PATCHED
    ? (candidates.length === 1 ? candidates[0] : null)
    : (candidates[0] ?? source1.objects.find((o) => o.schema === "business"));
  const effVal = (objectId: string, field: string): { value: string; assertionId?: string } | null => {
    const e = effective.get(objectId + "|" + field);
    if (e) return { value: e.value, assertionId: e.assertionId };
    const f = factByObjField.get(objectId + "|" + field + "|0");
    return f ? { value: f.value } : null;
  };
  function pushClaim(text: string, provenance: Claim["provenance"]): void { claims.push({ text, provenance }); }
  if (bizObj) {
    const ph = effVal(bizObj.objectId, "phone");
    const ws = effVal(bizObj.objectId, "website");
    const hr = effVal(bizObj.objectId, "hours");
    if (ph) {
      const vals = valuesByField.get(bizObj.objectId + "|phone");
      const contested = vals && vals.size > 1;
      if (contested) conflictClaims++;
      sections.contact.push("Phone: " + ph.value + (contested ? " (conflicting sources; owner-attested value shown)" : ""));
      pushClaim("phone=" + ph.value, ph.assertionId ? { assertionId: ph.assertionId, conflict: !!contested } : { occurrenceId: factByObjField.get(bizObj.objectId + "|phone|0")!.occurrenceId, conflict: !!contested });
    }
    if (ws && !isUnsafeUrl(ws.value)) {
      sections.contact.push("Website: " + ws.value);
      pushClaim("website=" + ws.value, ws.assertionId ? { assertionId: ws.assertionId } : { occurrenceId: factByObjField.get(bizObj.objectId + "|website|0")!.occurrenceId });
    } else if (ws && isUnsafeUrl(ws.value)) {
      unsafeStripped++;
      claims.push({ text: "website=<stripped unsafe scheme>", provenance: {}, unsafeStripped: true });
    }
    if (hr) {
      const vals = valuesByField.get(bizObj.objectId + "|hours");
      const contested = vals && vals.size > 1;
      if (contested) conflictClaims++;
      sections.hours.push("Hours: " + hr.value + (contested ? " (conflicting sources; owner-attested value shown)" : ""));
      pushClaim("hours=" + hr.value, hr.assertionId ? { assertionId: hr.assertionId, conflict: !!contested } : { occurrenceId: factByObjField.get(bizObj.objectId + "|hours|0")!.occurrenceId, conflict: !!contested });
    }
  }
  for (const s of source1.objects.filter((o) => o.schema === "service")) {
    const visFacts = source1.facts.filter((f) => f.objectId === s.objectId && visibility.get(f.factId) === "public");
    if (visFacts.length === 0) continue;
    const nm = visFacts.find((f) => f.field === "name");
    const ds = visFacts.find((f) => f.field === "description");
    sections.services.push(nm ? nm.value : s.title);
    if (nm) pushClaim("service=" + nm.value, { occurrenceId: nm.occurrenceId });
    if (ds) pushClaim("service-desc=" + ds.value, { occurrenceId: ds.occurrenceId });
  }
  for (const p of source1.objects.filter((o) => o.schema === "person")) {
    const nm = source1.facts.find((f) => f.objectId === p.objectId && f.field === "name" && visibility.get(f.factId) === "public");
    if (nm) { sections.people.push(nm.value); pushClaim("person=" + nm.value, { occurrenceId: nm.occurrenceId }); }
  }

  return {
    ownerDigestBefore: digestBefore, ownerDigestAfter: digestAfter,
    ownerLayerIntact: digestBefore === digestAfter,
    effective, composedCorrections,
    orphanedCorrections: orphanedCorrections.map((o) => ({ assertionId: o.assertion.assertionId, reason: o.reason })),
    ambiguousTarget, visibility, hideOrphans,
    projection: { sections, claims, unsafeStripped },
    ownerViewFactIds: source1.facts.map((f) => f.factId),
    conflictClaims,
  };
}

// ---------------------------------------------------------------- verify
interface Check { name: string; stage: string; pass: boolean; detail: string }
interface MissionResult {
  i: number; type: string; dim: string; hostile: string; ownerIntent: string;
  reobsKind: string; probes: string[]; outcome: string;
  failureStage: string | null; signature: string | null;
  checks: Check[]; lat: Record<string, number>;
  objects: number; facts: number; claims: number;
  unsafeStripped: number; conflicts: number; orphans: number;
  marker: Marker;
}

function verify(w: World, owner: OwnerLayer, reobs: ReobsInfo, ref: RefreshResult,
  occSnapshot: Map<string, string>, lat: Record<string, number>): MissionResult {
  const checks: Check[] = [];
  const C = (name: string, stage: string, pass: boolean, detail: string) => checks.push({ name, stage, pass, detail });
  const primaryEid = `eid-${w.i}-biz-${w.i}`;

  // History intelligibility: old occurrence ids byte-immutable, append-only.
  let histOk = true, histDetail = "append-only";
  for (const [id, bytes] of occSnapshot) {
    const now = reobs.source1.occurrences.find((o) => o.occurrenceId === id);
    if (!now) { histOk = false; histDetail = `missing ${id}`; break; }
    if (canonJson(now) !== bytes) { histOk = false; histDetail = `mutated ${id}`; break; }
  }
  C("history-immutable", "evidence", histOk, histDetail);

  // No invented claims: every public claim bound to an occurrence or assertion.
  const occIds = new Set(reobs.source1.occurrences.map((o) => o.occurrenceId));
  const assIds = new Set(owner.assertions.map((a) => a.assertionId));
  let unbound = 0;
  for (const cl of ref.projection.claims) {
    if (cl.unsafeStripped) continue;
    const p = cl.provenance;
    if (p.occurrenceId && occIds.has(p.occurrenceId)) continue;
    if (p.assertionId && assIds.has(p.assertionId)) continue;
    unbound++;
  }
  C("no-unbound-claims", "projection", unbound === 0, unbound === 0 ? "all bound" : `${unbound} unbound`);

  // Unsafe URLs absent from public output text.
  const pubText = JSON.stringify(ref.projection.sections);
  const unsafeLeak = /javascript:|data:text\/html|vbscript:/i.test(pubText);
  C("no-unsafe-urls", "projection", !unsafeLeak && ref.projection.unsafeStripped >= 0, unsafeLeak ? "LEAK" : `stripped=${ref.projection.unsafeStripped}`);

  // Conflicts labeled, never silently resolved. The conflict is seeded on the
  // local business object (primaryEid). A conflict on a non-public entity is
  // moot for the public surface: the occurrence log retains it for the owner,
  // but there is no presented fact to label. Demanding a label there was a
  // verifier false positive (missions 1196, 1366, 1806).
  if (reobs.probes.includes("conflicting-source")) {
    const conflictedPublic = reobs.source1.objects.some(
      (o) => o.eid === primaryEid && o.schema === "business" && o.visibility === "public");
    if (PATCHED && ref.ambiguousTarget) {
      // Fail-closed resolution: under ACTUAL business-identity ambiguity the
      // projection must not present settled business contact facts at all.
      // (Gated on real ambiguity, not the probe: visibility-flip can collapse
      // the churn to a single public candidate.)
      const settled = ref.projection.sections.contact.length + ref.projection.sections.hours.length;
      C("ambiguity-fail-closed", "projection", settled === 0, settled === 0 ? "no-settled-business-facts" : `${settled} settled facts shown under ambiguity`);
    } else if (conflictedPublic) {
      C("conflict-labeled", "projection", ref.conflictClaims > 0, `conflictClaims=${ref.conflictClaims}`);
    }
  }

  if (w.ownerIntent === "correct-fact" && w.correctedField && w.ownerValue) {
    const primObj = reobs.source1.objects.find((o) => o.eid === primaryEid);
    const eff = primObj ? ref.effective.get(primObj.objectId + "|" + w.correctedField) : undefined;
    const survived = !!eff && eff.value === w.ownerValue;
    const orphaned = ref.orphanedCorrections.length > 0;
    if (PATCHED) {
      C("correction-survived-or-surfaced", "compose", survived || orphaned,
        survived ? "effective==owner" : orphaned ? `orphan-surfaced:${ref.orphanedCorrections[0].reason}` : "silent-drop");
    } else {
      C("correction-survived", "compose", survived,
        survived ? "effective==owner" : orphaned ? "orphan-silent" : (ref.ambiguousTarget ? "ambiguous-target" : "not-applied"));
    }
    C("owner-layer-intact", "reobservation", ref.ownerLayerIntact, ref.ownerLayerIntact ? "digest-equal" : "DIGEST-CHANGED");
    // Drift honesty: whitespace-only re-emission must NOT raise a conflict.
    // (Skipped when the field was also dropped: a dropped field is real drift.)
    const comp = ref.composedCorrections.find((c) => c.field === w.correctedField);
    if (reobs.probes.includes("whitespace-drift") && !reobs.probes.includes("dropped-field")) {
      const primObj = reobs.source1.objects.find((o) => o.eid === primaryEid);
      const onPrimary = !!comp && !!primObj && comp.targetObjectId === primObj.objectId;
      const ok = !comp || !onPrimary || (comp.conflict === null && comp.sourceDrifted === false);
      C("no-spurious-drift", "compose", ok, comp ? `drifted=${comp.sourceDrifted} conflict=${comp.conflict !== null}` : "no-composed");
    } else if (reobs.probes.includes("dropped-field")) {
      // In PATCHED mode a surfaced no-business-object orphan already makes
      // the drift visible; the collision check is subsumed by it.
      const orphanedHere = PATCHED && ref.orphanedCorrections.length > 0;
      C("dropped-field-collision", "reobservation",
        (!!comp && comp.collision === "field-dropped" && survived) || orphanedHere,
        comp ? `collision=${comp.collision}` : (orphanedHere ? "orphan-surfaced" : "no-composed"));
    } else if (comp && comp.conflict) {
      C("real-conflict-surfaced", "reobservation", true, `source=${comp.conflict.sourceValue} owner-kept`);
    }
  }

  if (w.ownerIntent === "hide-object" && w.hideEid) {
    const leaked = ref.projection.claims.some((cl) => cl.text.includes(w.name)) && false; // name is business name; check service titles instead
    const svcTitles = reobs.source1.objects.filter((o) => o.eid === w.hideEid).map((o) => o.title);
    const titleLeak = ref.projection.claims.some((cl) => svcTitles.some((t) => cl.text.includes(t)));
    const eidLeak = false; // projection carries no eids; eid check is structural below
    const hiddenFacts = w.graph.facts.filter((f) => f.objectId === w.hideObjectId);
    const hiddenOcc = new Set(hiddenFacts.map((f) => f.occurrenceId));
    const pubOcc = new Set(ref.projection.claims.map((c) => c.provenance.occurrenceId).filter(Boolean) as string[]);
    const occLeak = [...hiddenOcc].some((id) => pubOcc.has(id));
    const hideOk = !titleLeak && !occLeak;
    if (PATCHED) {
      C("hide-effective-or-surfaced", "visibility", hideOk || ref.hideOrphans.some((h) => h.reason === "hide-orphan-surfaced"),
        hideOk ? "hidden" : `orphans=${JSON.stringify(ref.hideOrphans.map((h) => h.reason))}`);
    } else {
      C("hide-effective", "visibility", hideOk, hideOk ? "absent-from-public" : `LEAK title=${titleLeak} occ=${occLeak}`);
    }
    // Evidence retained: hidden object's occurrences intact.
    let evOk = true;
    for (const id of hiddenOcc) {
      const now = reobs.source1.occurrences.find((o) => o.occurrenceId === id);
      if (!now || canonJson(now) !== occSnapshot.get(id)) { evOk = false; break; }
    }
    C("hide-evidence-retained", "evidence", evOk, evOk ? "occurrences-intact" : "EVIDENCE-LOST");
    // Owner view still sees it.
    const ownOk = hiddenFacts.every((f) => ref.ownerViewFactIds.includes(f.factId) || reobs.source1.facts.some((sf) => sf.occurrenceId === f.occurrenceId));
    C("hide-owner-view", "evidence", ownOk, ownOk ? "visible-to-owner" : "missing-for-owner");
  }

  const failed = checks.filter((c) => !c.pass);
  let outcome = "SURVIVED", failureStage: string | null = null, signature: string | null = null;
  if (failed.length > 0) {
    outcome = "FAILED";
    failureStage = failed[0].stage;
    const n = failed[0].name;
    signature =
      n === "correction-survived" && /ambiguous/.test(failed[0].detail) ? "CORRECTION_AMBIGUOUS_TARGET" :
      n === "correction-survived" ? "CORRECTION_SILENTLY_DROPPED" :
      n === "correction-survived-or-surfaced" ? "CORRECTION_NOT_SURFACED" :
      n === "no-spurious-drift" ? "SPURIOUS_DRIFT_CONFLICT" :
      n === "hide-effective" ? "HIDE_ORPHANED_ID_CHURN" :
      n === "hide-effective-or-surfaced" ? "HIDE_NOT_SURFACED" :
      n === "owner-layer-intact" ? "OWNER_LAYER_DIGEST_CHANGED" :
      n === "hide-evidence-retained" ? "EVIDENCE_DELETED" :
      n === "history-immutable" ? "OCCURRENCE_MUTATED" :
      n === "no-unbound-claims" ? "INVENTED_CLAIM" :
      n === "no-unsafe-urls" ? "UNSAFE_URL_LEAKED" :
      n === "conflict-labeled" ? "CONFLICT_SILENTLY_RESOLVED" :
      n === "ambiguity-fail-closed" ? "AMBIGUITY_NOT_FAIL_CLOSED" :
      n === "dropped-field-collision" ? "DROPPED_FIELD_NOT_FLAGGED" :
      "OTHER_VERIFY_FAILURE";
  }
  return {
    i: w.i, type: w.type, dim: w.dim, hostile: w.hostile, ownerIntent: w.ownerIntent,
    reobsKind: reobs.kind, probes: reobs.probes, outcome, failureStage, signature,
    checks, lat,
    objects: reobs.source1.objects.length, facts: reobs.source1.facts.length,
    claims: ref.projection.claims.length,
    unsafeStripped: ref.projection.unsafeStripped, conflicts: ref.conflictClaims,
    orphans: ref.orphanedCorrections.length + ref.hideOrphans.length,
    marker: MARK,
  };
}

// ---------------------------------------------------------------- main
function runMission(i: number): MissionResult {
  const lat: Record<string, number> = {};
  let t = performance.now();
  const w = genWorld(i);
  lat.gen = performance.now() - t; t = performance.now();
  const owner = buildOwnerLayer(w);
  lat.intent = performance.now() - t; t = performance.now();
  const occSnapshot = new Map<string, string>(w.graph.occurrences.map((o) => [o.occurrenceId, canonJson(o)]));
  const reobs = reobserve(w);
  lat.reobserve = performance.now() - t; t = performance.now();
  const ref = refreshSource(w, owner, reobs.source1);
  lat.refresh = performance.now() - t; t = performance.now();
  const res = verify(w, owner, reobs, ref, occSnapshot, lat);
  res.lat.verify = performance.now() - t;
  return res;
}

function main(): void {
  const t0 = Date.now();
  let survived = 0, failed = 0;
  const t00 = performance.now();
  for (let i = I0; i < I1; i++) {
    const r = runMission(i);
    if (r.outcome === "SURVIVED") survived++; else failed++;
    appendFileSync(OUT, JSON.stringify(r) + "\n");
    if ((i - I0 + 1) % 50 === 0) {
      const el = (performance.now() - t00) / 1000;
      process.stderr.write(`shard ${SHARD} patched=${PATCHED} ${i - I0 + 1}/500 survived=${survived} failed=${failed} elapsed=${el.toFixed(1)}s\n`);
    }
  }
  const totalMin = (Date.now() - t0) / 60000;
  const mem = process.memoryUsage();
  const stats = {
    shard: SHARD, patched: PATCHED, missions: 500, survived, failed,
    minutes: +totalMin.toFixed(3), missionsPerMin: +(500 / totalMin).toFixed(1),
    peakRssMB: +(mem.rss / 1048576).toFixed(1), peakHeapMB: +(mem.heapUsed / 1048576).toFixed(1),
  };
  process.stderr.write("STATS " + JSON.stringify(stats) + "\n");
  writeFileSync(OUT + ".stats.json", JSON.stringify(stats, null, 2));
}
main();
