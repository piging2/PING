#!/usr/bin/env node
/**
 * Lane E spike: ONE schema definition -> nine targets.
 * Reads spike/schemas.canonical.json, generates each target into spike/out/,
 * runs red-team checks, prints an evidence scorecard.
 * Zero dependencies. No em dashes in outputs.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "out");
fs.mkdirSync(OUT, { recursive: true });
const CANON = JSON.parse(fs.readFileSync(path.join(ROOT, "schemas.canonical.json"), "utf8"));
const schemas = CANON.schemas;
const results = [];

function rec(target, status, evidence) {
  results.push({ target, status, evidence });
  console.log(`[${status}] ${target}\n       ${evidence}`);
}

// ---------------------------------------------------------------- 1. VALIDATOR
function genValidator() {
  // Mirrors PING's validateAgainstSchema (findings shape), generated from fields.
  let js = "// GENERATED from schemas.canonical.json. Do not hand-edit.\n";
  js += "function validate(def, record, resourceId) {\n";
  js += "  const findings = [];\n";
  js += "  const known = new Set(def.schema.fields.map(f => f.name));\n";
  js += "  for (const f of def.schema.fields) {\n";
  js += "    const raw = f.name === 'title' ? record.title\n";
  js += "      : f.name === 'description' ? record.description\n";
  js += "      : record.fields[f.name];\n";
  js += "    if (raw === undefined || raw === null || raw === '') {\n";
  js += "      if (f.required) findings.push({ severity: 'error', authority: 'lane-e.spike.validator', resourceId, path: 'object.' + f.name, message: `Required field '${f.name}' is missing.` });\n";
  js += "      continue;\n";
  js += "    }\n";
  js += "    const ok = f.type === 'string' ? typeof raw === 'string'\n";
  js += "      : f.type === 'string[]' ? (Array.isArray(raw) && raw.every(e => typeof e === 'string'))\n";
  js += "      : typeof raw === 'string';\n";
  js += "    if (!ok) findings.push({ severity: 'error', authority: 'lane-e.spike.validator', resourceId, path: 'object.' + f.name, message: `Field '${f.name}' must be ${f.type} (evolution law: types never change).` });\n";
  js += "    if (f.type === 'url' && typeof raw === 'string' && !/^https?:\\/\\//.test(raw) && !raw.startsWith('/'))\n";
  js += "      findings.push({ severity: 'warning', authority: 'lane-e.spike.validator', resourceId, path: 'object.' + f.name, message: `Field '${f.name}' does not look like a URL.` });\n";
  js += "  }\n";
  js += "  for (const key of Object.keys(record.fields)) {\n";
  js += "    if (!known.has(key)) findings.push({ severity: 'info', authority: 'lane-e.spike.validator', resourceId, path: 'object.fields.' + key, message: `Unknown field '${key}' tolerated and passed through.` });\n";
  js += "  }\n";
  js += "  return findings;\n";
  js += "}\nmodule.exports = { validate };\n";
  fs.writeFileSync(path.join(OUT, "validator.js"), js);
  const { validate } = require(path.join(OUT, "validator.js"));
  const B = schemas[0];
  const good = validate(B, { title: "Happy Place Carpentry", description: "Decks and fences.", fields: { category: "Carpentry", website: "https://example.com" } }, "o1");
  const missingTitle = validate(B, { title: "", description: "x", fields: {} }, "o2");
  const typeChange = validate(B, { title: "x", description: "x", fields: { socials: "not-an-array" } }, "o3");
  const badUrl = validate(B, { title: "x", description: "x", fields: { website: "not a url" } }, "o4");
  const unknown = validate(B, { title: "x", description: "x", fields: { locality: "Grand Junction, CO" } }, "o5");
  const ok = good.length === 0
    && missingTitle.some(f => f.severity === "error" && f.path === "object.title")
    && typeChange.some(f => f.severity === "error" && f.path === "object.socials")
    && badUrl.some(f => f.severity === "warning")
    && unknown.some(f => f.severity === "info");
  if (!ok) throw new Error("validator self-test failed");
  rec("1. validator", "PROVEN",
    "Generated validator accepts a complete business, errors on missing title, errors on socials type change, warns on non-URL website, info-tolerates unknown fields. Same semantics as PING's hand-written validateAgainstSchema; derivation is mechanical.");
}

// ------------------------------------------------------------- 2. TYPESCRIPT TYPE
function genTsTypes() {
  const tsType = t => (t === "string[]" ? "string[]" : "string");
  let out = "// GENERATED from schemas.canonical.json. Do not hand-edit.\n";
  out += "// url is a branded string so generated code can distinguish it.\n";
  out += "export type FYDUrl = string & { readonly __fydUrl: unique symbol };\n\n";
  for (const s of schemas) {
    const iname = s.label;
    out += `/** ${s.id}. ${s.summary} */\n`;
    out += `export interface ${iname} {\n`;
    for (const f of s.schema.fields) {
      const opt = f.required ? "" : "?";
      const t = f.type === "url" ? "FYDUrl" : tsType(f.type);
      out += `  /** ${f.meaning} */\n  ${f.name}${opt}: ${t};\n`;
    }
    out += "}\n\n";
  }
  fs.writeFileSync(path.join(OUT, "schema-types.d.ts"), out);
  const hasBusiness = out.includes("export interface Business") && out.includes("title: string;") && out.includes("socials?: string[];") && out.includes("website?: FYDUrl;");
  const hasPost = out.includes("export interface Post") && out.includes("tags?: string[];");
  if (!hasBusiness || !hasPost) throw new Error("ts-types self-test failed");
  rec("2. TypeScript type", "PROVEN",
    "Generated interfaces Business/Service/Post with required vs optional preserved and url branded as FYDUrl. The field-type map is total over the three-type vocabulary, deterministic, no contortion. Caveat: PING's read model uses generic projections (PingObject/ObjectView), so generated types serve ingestion/editor boundaries, not the read model.");
}

// ----------------------------------------------------------------- 3. OBJECT EDITOR
function genEditor() {
  // Generates a flat form spec: widget per field type. Then red-teams it.
  const widget = f => (f.type === "url" ? "url-input" : f.type === "string[]" ? "tag-list" : (f.name === "description" || f.name === "text" ? "textarea" : "text-input"));
  const spec = {};
  for (const s of schemas) {
    spec[s.id] = {
      title: s.label,
      fields: s.schema.fields.map(f => ({
        name: f.name, label: f.label, widget: widget(f), required: f.required,
        help: f.meaning,
      })),
    };
  }
  fs.writeFileSync(path.join(OUT, "editor-spec.json"), JSON.stringify(spec, null, 2));
  // RED TEAM: can the generated spec express real PING product requirements?
  const failures = [];
  // (a) nested object: Company.address { city, region, country } (src/types/index.ts)
  failures.push("nested object: Company.address{city,region,country} has no representation in the three-type vocabulary; a generator would flatten or drop it.");
  // (b) dual-value owner correction: SOURCE SAYS X / OWNER SAYS Y (OwnerFieldCorrection)
  failures.push("owner correction: OwnerFieldCorrection keeps sourceValue AND ownerValue per field with provenance; a flat generated editor writes one value and destroys the distinction.");
  // (c) conditional logic: EstimateQuestion.next (answer -> next question) style branching
  failures.push("conditionals: no if/then, show-when, or required-when in the vocabulary; real forms need them.");
  // (d) custom widgets: media picker, map pin, rating stars (Review.rating is numeric, not even expressible)
  failures.push("custom widgets: the spec can name widget ids, but every real product eventually needs a widget the generator does not know (media, map); that is customer code by another name.");
  fs.writeFileSync(path.join(OUT, "editor-redteam.md"),
    "# Editor generation red team\n\nThe generated editor spec covers flat CRUD for the three proof schemas.\nIt FAILS on these real PING requirements:\n\n" + failures.map(f => "- " + f).join("\n") + "\n");
  rec("3. object editor", "PARTIAL",
    "Flat form spec (widget per type) generates cleanly for the three proof schemas. Red team: nested objects, dual-value owner corrections, conditionals, and custom widgets are inexpressible; those are real product requirements in PING today (Company.address, OwnerFieldCorrection, estimate branching). Matches the ecosystem finding: every mature system needs a second UI layer (uiSchema/admin config).");
}

// ------------------------------------------------------- 4. COMPONENT ELIGIBILITY
function genComponentEligibility() {
  // Derived from the DECLARED components list + role projection for knowledge vocabulary.
  const bySchema = {};
  for (const s of schemas) bySchema[s.id] = s.declared.components;
  for (const [role, ids] of Object.entries(CANON.roles)) {
    const proofId = ids[0];
    for (const id of ids.slice(1)) bySchema[id] = bySchema[proofId];
  }
  const eligible = schemaId => bySchema[schemaId] || ["GenericObjectCard"];
  fs.writeFileSync(path.join(OUT, "component-eligibility.json"), JSON.stringify(bySchema, null, 2));
  const ok = eligible("ping.social.business@1").includes("Hero")
    && eligible("ping.social.service@1").includes("Services")
    && eligible("ping.social.post@1").includes("ObjectFeed")
    && eligible("ping.knowledge.service@1").includes("Services")
    && JSON.stringify(eligible("ping.social.mystery@9")) === JSON.stringify(["GenericObjectCard"]);
  if (!ok) throw new Error("component-eligibility self-test failed");
  rec("4. component eligibility", "PROVEN",
    "Eligibility lists generated; knowledge vocabulary projects onto proof roles via schemaRole-equivalent; unknown schemas fall back to GenericObjectCard. HONEST LABEL: the mapping is DECLARED in the definition (or lives registry-side), not inferred from field shapes; no field-shape inference could produce 'Hero'. Same shape as PING's wired eligibleComponents().");
}

// ----------------------------------------------------- 5. RELATIONSHIP ELIGIBILITY
function genRelationshipEligibility() {
  const rules = {};
  for (const s of schemas) rules[s.id] = s.schema.relationships;
  fs.writeFileSync(path.join(OUT, "relationship-rules.json"), JSON.stringify(rules, null, 2));
  const allowed = (schemaId, predicate) => (rules[schemaId] || []).some(r => r.predicate === predicate);
  const ok = allowed("ping.social.business@1", "provides") && !allowed("ping.social.business@1", "replies_to")
    && allowed("ping.social.post@1", "replies_to");
  if (!ok) throw new Error("relationship self-test failed");
  const gap = "NOT expressible: cardinality (provides 0..n vs located_at 0..1), required relationships, inverse traversal hints, or relationship-scoped validation. Real relationship governance needs more than predicate->targetSchemas.";
  fs.writeFileSync(path.join(OUT, "relationship-redteam.md"), "# Relationship rules red team\n\nAllow-list (predicate + target schemas): derivable, tested.\n\n" + gap + "\n");
  rec("5. relationship eligibility", "PARTIAL",
    "Predicate allow-lists (isAllowedPredicate equivalent) derive cleanly and are tested. Full relationship governance (cardinality, required edges, inverses) is not expressible in the definition; documented in relationship-redteam.md.");
}

// ---------------------------------------------------------------- 6. SEARCH FIELDS
function genSearchFields() {
  // string and string[] fields are text-indexable; url is an identifier, not text.
  const fields = {};
  for (const s of schemas) {
    fields[s.id] = {
      text: ["title", "description", ...s.schema.fields.filter(f => f.type === "string" || f.type === "string[]").map(f => f.name)].filter((v, i, a) => a.indexOf(v) === i),
      excludedAsIdentifiers: s.schema.fields.filter(f => f.type === "url").map(f => f.name),
    };
  }
  fs.writeFileSync(path.join(OUT, "search-fields.json"), JSON.stringify(fields, null, 2));
  const b = fields["ping.social.business@1"];
  if (!b.text.includes("title") || !b.text.includes("socials") || !b.excludedAsIdentifiers.includes("website")) throw new Error("search-fields self-test failed");
  rec("6. search fields", "PROVEN",
    "Text-indexable field lists derive mechanically: string/string[] in, url out as identifier. Unwired in PING (lane F owns search); handoff-ready as JSON.");
}

// ------------------------------------------------------ 7. AGENT TOOL DESCRIPTION
function genAgentToolDescription() {
  const descs = {};
  for (const s of schemas) {
    const lines = [];
    lines.push(`Object type ${s.id} (${s.label}).`);
    lines.push(s.summary);
    lines.push("Fields:");
    for (const f of s.schema.fields) lines.push(`  - ${f.name} (${f.type}${f.required ? ", required" : ", optional"}): ${f.meaning}`);
    if (s.schema.relationships.length) {
      lines.push("Relationships:");
      for (const r of s.schema.relationships) lines.push(`  - ${r.predicate} -> ${r.targetSchemas.join(", ")}: ${r.meaning}`);
    }
    descs[s.id] = lines.join("\n");
  }
  fs.writeFileSync(path.join(OUT, "agent-tool-descriptions.json"), JSON.stringify(descs, null, 2));
  if (!descs["ping.social.business@1"].includes("Public business phone.")) throw new Error("agent-desc self-test failed");
  rec("7. agent tool description", "PROVEN",
    "Deterministic tool-description text per schema from label/summary/fields/relationships. Same semantics as PING's hand-written agentToolDescription(); derivation is mechanical and cacheable. Handoff-ready for lane I (MCP) / lane G (Ask FYD context).");
}

// ------------------------------------------------ 8. CONNECTOR NORMALIZATION TARGET
function genNormalizationTarget() {
  // Emits a JSON-Schema-shaped target spec: connector adapters map provider fields onto it.
  const toJsonSchema = s => ({
    $id: s.id,
    type: "object",
    title: s.label,
    properties: Object.fromEntries(s.schema.fields.map(f => [f.name, f.type === "string[]" ? { type: "array", items: { type: "string" } } : { type: "string", ...(f.type === "url" ? { format: "uri" } : {}) }])),
    required: s.schema.fields.filter(f => f.required).map(f => f.name),
    additionalProperties: true, // harvest T5 tolerance: unknown fields pass through as info
  });
  const targets = Object.fromEntries(schemas.map(s => [s.id, toJsonSchema(s)]));
  fs.writeFileSync(path.join(OUT, "normalization-targets.json"), JSON.stringify(targets, null, 2));
  // Red team: PING's proceduralizer derives extra fields (locality DERIVED_FACT) and
  // connector data is OBSERVATION, never canonical; a prescriptive gate would reject real output.
  const warn = "ADVISORY ONLY: additionalProperties must stay true (harvest T5 tolerance). PING's ingestion derives fields the schema does not name (e.g. locality) and classifies evidence; a strict schema-as-gate would reject valid ingestion output and violate observation-never-canonical. The target spec is a mapping contract for adapters, not a validation gate.";
  fs.writeFileSync(path.join(OUT, "normalization-redteam.md"), "# Connector normalization red team\n\n" + warn + "\n");
  const ok = targets["ping.social.business@1"].required.includes("title")
    && targets["ping.social.business@1"].properties.socials.type === "array"
    && targets["ping.social.business@1"].additionalProperties === true;
  if (!ok) throw new Error("normalization self-test failed");
  rec("8. connector normalization target", "PARTIAL",
    "JSON-Schema target spec generates cleanly and gives adapters a mapping contract. Red team: must stay advisory (additionalProperties: true); prescriptive validation would break PING's evidence-first ingestion and the constitutional observation rule.");
}

// ---------------------------------------------------- 9. PROTOCOL PROJECTION HINTS
function genProtocolHints() {
  const hints = Object.fromEntries(schemas.map(s => [s.id, s.declared.protocolHints]));
  fs.writeFileSync(path.join(OUT, "protocol-hints.json"), JSON.stringify(hints, null, 2));
  const honest = "HONEST LABEL: hints are DECLARED metadata, not derived. No field-shape analysis yields 'ActivityPub Organization'; Service has no natural ActivityPub type (left null rather than forced). Carrying them in the definition is convenient co-location, not generation.";
  fs.writeFileSync(path.join(OUT, "protocol-hints-note.md"), "# Protocol projection hints\n\n" + honest + "\n");
  rec("9. protocol projection hints", "PARTIAL", honest);
}

// ---------------------------------------------------------------- run
try {
  genValidator();
  genTsTypes();
  genEditor();
  genComponentEligibility();
  genRelationshipEligibility();
  genSearchFields();
  genAgentToolDescription();
  genNormalizationTarget();
  genProtocolHints();
} catch (e) {
  console.error("SPIKE FAILED:", e.message);
  process.exit(1);
}

// ------------------------------------------------------- red team: evolution law
console.log("\n--- red-team: schema evolution ---");
const evolved = JSON.parse(JSON.stringify(schemas[0]));
evolved.schema.fields.push({ name: "tagline", type: "string", required: false, label: "Tagline", meaning: "Short marketing line." });
const { validate } = require(path.join(OUT, "validator.js"));
const oldRecord = { title: "x", description: "y", fields: { category: "z" } };
const findings = validate(evolved, oldRecord, "o-evo");
const evoOk = findings.length === 0;
console.log(`[${evoOk ? "PASS" : "FAIL"}] adding optional field keeps old records valid (${findings.length} findings)`);
const broken = JSON.parse(JSON.stringify(schemas[0]));
broken.schema.fields.find(f => f.name === "socials").type = "string"; // illegal type change
const findings2 = validate(broken, { title: "x", description: "y", fields: { socials: ["a", "b"] } }, "o-brk");
const brkOk = findings2.some(f => f.severity === "error" && f.path === "object.socials");
console.log(`[${brkOk ? "PASS" : "FAIL"}] illegal type change is caught by generated validator (evolution law enforced)`);
if (!evoOk || !brkOk) { console.error("EVOLUTION RED-TEAM FAILED"); process.exit(1); }

// red team: inexpressible real requirements
console.log("\n--- red-team: expressiveness ceiling ---");
const vocab = new Set(["string", "string[]", "url"]);
const realNeeds = [
  ["Review.rating", "number 1..5"],
  ["Project.completedAt", "date-time"],
  ["Company.address", "nested object {city,region,country}"],
  ["Company.owners", "array of objects"],
  ["OwnerAssertion.value", "unknown/any"],
  ["EstimateQuestion.next", "conditional branching"],
];
const inexpressible = realNeeds.filter(([, t]) => !vocab.has(t.split(" ")[0]));
for (const [name, t] of inexpressible) console.log(`[CEILING] ${name} needs '${t}': NOT expressible in the three-type vocabulary`);
fs.writeFileSync(path.join(OUT, "expressiveness-ceiling.json"), JSON.stringify({ vocabulary: [...vocab], inexpressible: inexpressible.map(([n, t]) => ({ field: n, needs: t })) }, null, 2));

// ------------------------------------------------------- scorecard
const proven = results.filter(r => r.status === "PROVEN").length;
const partial = results.filter(r => r.status === "PARTIAL").length;
const failed = results.filter(r => r.status === "FAILED").length;
fs.writeFileSync(path.join(ROOT, "scorecard.json"), JSON.stringify({ generatedAt: new Date().toISOString(), definition: "spike/schemas.canonical.json", results, totals: { proven, partial, failed } }, null, 2));
console.log(`\nSCORECARD: ${proven} PROVEN / ${partial} PARTIAL / ${failed} FAILED`);
console.log("Outputs in spike/out/. Scorecard: spike/scorecard.json");
