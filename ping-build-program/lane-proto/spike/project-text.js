/**
 * Projection B (alternate human rendering): canonical Business object ->
 * plain-text business card. No CSS, no JS, no browser. READ-ONLY.
 *
 * Purpose: proves the website is not the object. If the FYD website
 * renderer became unusable tomorrow, this rendering carries the same
 * facts to a human (CLI, SMS, printed card, accessibility fallback).
 */
"use strict";

const {
  publicFacts,
  publicServices,
  factValue,
  projectionHeader,
  evidenceManifest,
} = require("./projection-common");

const RULE = "=".repeat(64);
const THIN = "-".repeat(64);

function line(label, value) {
  return `  ${label.padEnd(10)} ${value}`;
}

function projectText(canonical) {
  const h = projectionHeader(canonical, "text");
  const name = factValue(canonical, "title") || "(unnamed)";
  const phone = factValue(canonical, "phone") || "(no phone)";
  const website = factValue(canonical, "website") || "(no website)";
  const desc = factValue(canonical, "description") || "";
  const hours = factValue(canonical, "hours");
  const logo = factValue(canonical, "has_logo");

  const addr = {
    locality: factValue(canonical, "address_locality"),
    region: factValue(canonical, "address_region"),
    postal: factValue(canonical, "postal_code"),
    country: factValue(canonical, "address_country"),
  };
  const addrParts = [addr.locality, addr.region, addr.postal, addr.country].filter(Boolean);
  const privateWithheld = (canonical.facts || []).some(
    (f) => f.visibility !== "public" && f.field === "street_address",
  );

  const services = publicServices(canonical).map((s) => s.name);

  const out = [];
  out.push(RULE);
  out.push("PING PROJECTION: plain-text business card (NOT canonical)");
  out.push(RULE);
  out.push("");
  out.push(name);
  out.push("");
  // Every public field gets an explicit labeled line: the text projection
  // must cover exactly what the JSON-LD projection covers (equivalence
  // property; the verifier enforces text-covers:* per field).
  if (desc) out.push(line("Description:", desc));
  out.push(line("Phone:", phone));
  out.push(line("Web:", website));
  if (hours) {
    const hval = Array.isArray(hours) ? hours.join("; ") : String(hours);
    out.push(line("Hours:", hval));
  }
  if (addr.locality) out.push(line("Locality:", addr.locality));
  if (addr.region) out.push(line("Region:", addr.region));
  if (addr.postal) out.push(line("Postal:", addr.postal));
  if (addr.country) out.push(line("Country:", addr.country));
  if (addrParts.length > 0) {
    out.push(line("Location:", addrParts.join(", ") + " (joined)"));
  }
  if (privateWithheld) {
    out.push(line("", "(street address withheld: private by policy)"));
  }
  if (logo) {
    out.push(line("Logo:", logo));
  }
  out.push("");
  out.push("  Services offered:");
  for (const s of services) out.push(`    - ${s}`);
  out.push("");
  out.push(THIN);
  out.push("  Evidence: every claim above traces to PING evidence ids.");
  for (const e of evidenceManifest(canonical)) {
    const v = Array.isArray(e.value) ? e.value.join("; ") : String(e.value);
    out.push(`    ${e.field} = ${v.slice(0, 60)}  <- ${e.evidence.join(", ")}`);
  }
  out.push(THIN);
  out.push(`  projectionId: ${h.projectionId}`);
  out.push(`  canonicalId:  ${h.canonicalId} @ ${h.canonicalGraphVersion}`);
  out.push(`  inputHash:    ${h.inputHash}`);
  out.push("");
  out.push("  THIS IS A PROJECTION, NOT THE AUTHORITY.");
  out.push("  The canonical PING object graph is the authority.");
  out.push("  Do not treat this text as a source of truth for edits.");
  out.push(RULE);
  return out.join("\n") + "\n";
}

if (require.main === module) {
  const fs = require("fs");
  const canonical = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  process.stdout.write(projectText(canonical));
}

module.exports = { projectText };
