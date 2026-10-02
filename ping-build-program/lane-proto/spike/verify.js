/**
 * Spike red-team: equivalence / divergence / exfiltration / staleness /
 * authority-labeling checks over the two projections.
 *
 * Reads the two rendered projections as opaque documents (the way a real
 * consumer would), extracts (field, value) claim pairs from each, and
 * cross-checks them against the canonical object and each other.
 */
"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { inputHash } = require("./projection-common");

function extractJsonLdClaims(doc) {
  const graph = doc["@graph"] || [];
  const org = graph.find((n) => (n["@type"] || []).includes("Organization")) || {};
  const address = graph.find((n) => n["@type"] === "PostalAddress") || {};
  const meta = graph.find((n) => n.pingProjection) || {};
  const claims = new Map();
  const MAP = {
    name: "title", description: "description", telephone: "phone",
    email: "email", url: "website", openingHours: "hours",
    priceRange: "price_range", slogan: "slogan", logo: "has_logo",
  };
  for (const [prop, field] of Object.entries(MAP)) {
    if (org[prop] !== undefined) claims.set(field, JSON.stringify(org[prop]));
  }
  const AMAP = {
    addressLocality: "address_locality", addressRegion: "address_region",
    postalCode: "postal_code", addressCountry: "address_country",
    streetAddress: "street_address",
  };
  for (const [prop, field] of Object.entries(AMAP)) {
    if (address[prop] !== undefined) claims.set(field, JSON.stringify(address[prop]));
  }
  for (const n of graph) {
    if (n["@type"] === "Service" && n.name) claims.set("service:" + n.name, JSON.stringify(n.name));
  }
  return { claims, header: meta.pingProjection || null };
}

/** Parse the plain-text projection back into claim pairs. Consumers must
 *  be able to read facts out of the text form too, so we keep the text
 *  rendering machine-parseable (label-aligned). */
function extractTextClaims(text) {
  const claims = new Map();
  const lines = text.split("\n");
  const LABELS = {
    "Phone:": "phone", "Web:": "website", "Hours:": "hours",
    "Description:": "description",
    "Locality:": "address_locality", "Region:": "address_region",
    "Postal:": "postal_code", "Country:": "address_country",
    "Location:": "address_joined", "Logo:": "has_logo",
  };
  let inServices = false;
  let title = null;
  for (const line of lines) {
    const t = line.trim();
    if (t === "Services offered:") { inServices = true; continue; }
    if (inServices) {
      if (t.startsWith("- ")) { claims.set("service:" + t.slice(2), JSON.stringify(t.slice(2))); continue; }
      if (t === "") { inServices = false; continue; }
    }
    for (const [label, field] of Object.entries(LABELS)) {
      if (t.startsWith(label)) claims.set(field, JSON.stringify(t.slice(label.length).trim()));
    }
    if (!title && t && !t.startsWith("=") && !t.startsWith("-") && !t.startsWith("PING") && !t.startsWith("  ")) {
      title = t;
    }
  }
  if (title) claims.set("title", JSON.stringify(title));
  // evidence section
  const evidence = [];
  let inEv = false;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("Evidence: every claim")) { inEv = true; continue; }
    if (inEv && t.startsWith("----")) break;
    if (inEv && t.includes(" <- ")) evidence.push(t);
  }
  return { claims, evidence };
}

function canonPublicPairs(canonical) {
  const out = new Map();
  for (const f of (canonical.facts || []).filter((x) => x.visibility === "public")) {
    out.set(f.field, JSON.stringify(f.value));
  }
  for (const s of (canonical.services || []).filter((x) => x.visibility === "public")) {
    out.set("service:" + s.name, JSON.stringify(s.name));
  }
  return out;
}

function main() {
  const [canonicalPath, jsonldPath, textPath] = process.argv.slice(2);
  const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
  const jsonld = JSON.parse(fs.readFileSync(jsonldPath, "utf8"));
  const text = fs.readFileSync(textPath, "utf8");
  const expectedHash = inputHash(canonical);
  const expected = canonPublicPairs(canonical);
  const { claims: jl, header } = extractJsonLdClaims(jsonld);
  const { claims: tx, evidence } = extractTextClaims(text);

  const results = [];
  const check = (name, ok, detail) => results.push({ name, ok, detail: detail || "" });

  // 1. JSON-LD covers every public canonical field (no silent drops).
  for (const [field, val] of expected) {
    if (field === "address_joined") continue; // text-only derived label
    check(`jsonld-covers:${field}`, jl.get(field) === val, `expected ${val}, got ${jl.get(field)}`);
  }

  // 2. Divergence: JSON-LD and text must agree on every shared claim.
  for (const [field, val] of jl) {
    if (field === "address_joined") continue;
    if (tx.has(field)) {
      let textVal = tx.get(field);
      // text renders arrays joined; normalize the comparison for hours.
      if (field === "hours") textVal = JSON.stringify(JSON.parse(textVal).split("; "));
      check(`no-divergence:${field}`, textVal === val, `jsonld=${val} text=${textVal}`);
    } else {
      check(`text-covers:${field}`, false, `jsonld has ${field}, text missing`);
    }
  }

  // 3. Exfiltration: the private street address must appear NOWHERE.
  const secret = "Maldonado";
  check("exfiltration:jsonld", !JSON.stringify(jsonld).includes(secret), "private fact leaked into JSON-LD");
  check("exfiltration:text", !text.includes(secret), "private fact leaked into text");

  // 4. Authority labeling: projections declare they are not canonical.
  check("label:jsonld-meta", !!header && header.isProjectionNotAuthority === true && header.isAuthority === false,
    "JSON-LD must carry pingProjection.isProjectionNotAuthority=true, isAuthority=false");
  check("label:text-banner", text.includes("NOT canonical") && text.includes("THIS IS A PROJECTION, NOT THE AUTHORITY."),
    "text must carry the not-canonical banner");
  check("label:staleness-headers", !!header && header.inputHash === expectedHash &&
    text.includes(expectedHash), `projections must embed inputHash ${expectedHash}`);

  // 5. Evidence traceability: every rendered claim traces to evidence ids.
  const manifest = (header && header.evidenceManifest) || [];
  check("evidence:jsonld-manifest-covers", manifest.length >= expected.size,
    `manifest entries ${manifest.length}, public fields ${expected.size}`);
  check("evidence:text-section", evidence.length >= expected.size,
    `text evidence lines ${evidence.length}, public fields ${expected.size}`);

  // 6. Round-trip: JSON-LD re-parsed through PING's ingestion vocabulary
  //    (schema.org -> pipeline fields) yields the same public field set.
  const roundTrip = new Set([...jl.keys()].filter((k) => !k.startsWith("service:")));
  const canonicalFields = new Set(
    [...expected.keys()].filter((k) => !k.startsWith("service:") && !["address_locality","address_region","postal_code","address_country"].includes(k)),
  );
  canonicalFields.add("address_joined_check");
  const jlAddrFields = ["address_locality","address_region","postal_code","address_country"].filter((k) => jl.has(k));
  check("roundtrip:address-complete", jlAddrFields.length === 4, `address fields: ${jlAddrFields.join(",")}`);
  for (const f of canonicalFields) {
    if (f === "address_joined_check") continue;
    check(`roundtrip:${f}`, roundTrip.has(f), "field lost in JSON-LD round trip");
  }

  const failures = results.filter((r) => !r.ok);
  for (const r of results) {
    process.stdout.write(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : " :: " + r.detail}\n`);
  }
  process.stdout.write(`\n${results.length - failures.length}/${results.length} checks passed\n`);
  if (failures.length > 0) process.exit(1);
}

if (require.main === module) main();
module.exports = {};
