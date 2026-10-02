/**
 * Projection A (machine-readable): canonical Business object -> schema.org
 * JSON-LD (@graph: Plumber/Organization + PostalAddress + services as
 * Service nodes). READ-ONLY: pure function, no canonical mutation.
 *
 * Why JSON-LD: it is the inverse of PING's own ingestion vocabulary.
 * src/fyd/proceduralize/structured-data.ts reads schema.org JSON-LD into
 * pipeline facts; this projector writes pipeline facts back out as
 * schema.org JSON-LD. The website renderer can die tomorrow and the same
 * facts survive in the exact vocabulary Google's crawlers read.
 */
"use strict";

const {
  publicFacts,
  publicServices,
  factValue,
  projectionHeader,
  evidenceManifest,
} = require("./projection-common");

/** pipeline field -> schema.org property (inverse of PING's LITERAL_FACTS). */
const FIELD_TO_SCHEMA = {
  title: "name",
  description: "description",
  phone: "telephone",
  email: "email",
  website: "url",
  hours: "openingHours",
  price_range: "priceRange",
  slogan: "slogan",
  has_logo: "logo",
  address_locality: "addressLocality",
  address_region: "addressRegion",
  postal_code: "postalCode",
  address_country: "addressCountry",
  latitude: "latitude",
  longitude: "longitude",
};

const ADDRESS_FIELDS = new Set([
  "address_locality",
  "address_region",
  "postal_code",
  "address_country",
  "street_address", // always private; never emitted
]);

function projectJsonLd(canonical) {
  const orgId = `urn:ping:${canonical.canonicalId}`;
  const organization = {
    "@type": ["Plumber", "Organization", "LocalBusiness"],
    "@id": orgId + "#organization",
  };

  const address = { "@type": "PostalAddress", "@id": orgId + "#address" };
  let hasAddress = false;

  for (const f of publicFacts(canonical)) {
    if (ADDRESS_FIELDS.has(f.field)) {
      if (f.field === "street_address") continue; // private: withheld by construction
      address[FIELD_TO_SCHEMA[f.field]] = f.value;
      hasAddress = true;
      continue;
    }
    const prop = FIELD_TO_SCHEMA[f.field];
    if (!prop) continue; // unmapped field: dropped here, recorded in manifest as absent
    organization[prop] = f.value;
  }

  const graph = [organization];
  if (hasAddress) {
    graph.push(address);
    organization.address = { "@id": address["@id"] };
  }

  for (const s of publicServices(canonical)) {
    graph.push({
      "@type": "Service",
      "@id": orgId + "#service-" + s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: s.name,
      provider: { "@id": organization["@id"] },
    });
  }

  const pingMeta = projectionHeader(canonical, "jsonld");
  graph.push({
    "@type": "CreativeWork",
    "@id": orgId + "#projection-meta",
    name: "PING projection metadata (not canonical)",
    pingProjection: {
      ...pingMeta,
      isAuthority: false,
      evidenceManifest: evidenceManifest(canonical),
      privateFactsWithheld: (canonical.facts || []).filter((f) => f.visibility !== "public").length,
      note: "Projection only. The canonical PING object graph is the authority. Do not write edits against this document.",
    },
  });

  return { "@context": "https://schema.org", "@graph": graph };
}

if (require.main === module) {
  const fs = require("fs");
  const canonical = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  process.stdout.write(JSON.stringify(projectJsonLd(canonical), null, 2) + "\n");
}

module.exports = { projectJsonLd, FIELD_TO_SCHEMA };
