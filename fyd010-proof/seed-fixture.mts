/**
 * FYD-010 adversarial privacy proof: fixture seeder.
 *
 * Fixture data only. No real PII. Canary prefix: CANARY-FYD010.
 *
 * Writes (under $FYD010_OUT = ~/workspace/fyd010-proof):
 *  fixture/projections/fyd010-fixture.json      standalone digest-signed projection
 *  fixture/projections/coppersmith-plumbing.json base pinned graph + fixture objects,
 *                                               digest-signed (why-this / /o path)
 *  fixture/overlay.json                          fixture objects/rels for the gateway stub
 *  fixture/owner/<site>.json                     owner state via applyOwnerCommand
 *     - set-contact-field phone  (owner correction, fictional digits)
 *     - set-address-visibility hide (owner hide decision)
 *     for sites "fyd010-fixture" and "coppersmith-plumbing".
 *
 * Run from anywhere:  npx tsx seed-fixture.mts
 * Env: FYD010_REPO, FYD010_OUT
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.FYD010_REPO!;
const OUT = process.env.FYD010_OUT!;
const PROJ_DIR = join(OUT, "fixture/projections");
const OWNER_DIR = join(OUT, "fixture/owner");

const { canonicalize, sha256Hex } = await import(
  join(REPO, "src/lib/ping/digest.ts")
);
const { applyOwnerCommand } = await import(
  join(REPO, "src/fyd/object/owner-store.ts")
);
const { COPPERSMITH_GRAPH } = await import(
  join(REPO, "src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts")
);

const C = "CANARY-FYD010";
const TS = "2026-10-04T20:30:00.000Z";

const bizFields: Record<string, string> = {
  name: "Fixture Plumbing Co",
  phone: "+1-970-555-0142",
  email: "source-says-CANARY-FYD010-CORRECTION-SOURCE@example.com",
  website: "https://fixture-plumbing.example.com",
  address: "999 Canary Ave, Grand Junction, CO 81501",
  // -- sensitive field classes (plain fields whose names do NOT appear in
  // -- the legacy reader denylist) --
  internalMemo: `${C}-HIDDEN-MEMO owner private note never for visitors`,
  providerToken: `${C}-PROVIDER-TOKEN sk-fixture-9f8e7d6c5b4a`,
  apiSecret: `${C}-API-SECRET shh-fixture-321`,
  ownerPhone: `${C}-OWNER-PHONE +1-970-555-0199`,
  tenantRef: `${C}-TENANT-REF tenant-acme-corp-secret-42`,
  // -- exact-denylist controls (reader sanitizeFields blocks these names) --
  password: `${C}-EXACT-DENY password hunter2`,
  token: `${C}-EXACT-DENY token tok_exact_123`,
  privateKey: `${C}-EXACT-DENY privateKey pk_exact_456`,
};

function pingObject(
  id: string,
  schema: string,
  visibility: "public" | "private",
  title: string,
  description: string,
  fields: Record<string, string>,
) {
  return {
    id,
    schema,
    controllerId: "owner-fixture-1",
    visibility,
    title,
    description,
    fields,
    createdAt: TS,
    updatedAt: TS,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://fixture-plumbing.example.com/",
      derivedAt: TS,
    },
  };
}

const fixtureObjects = [
  pingObject(
    "fyd010-biz",
    "ping.social.business@1",
    "public",
    "Fixture Plumbing Co",
    "Public description of the fixture business.",
    bizFields,
  ),
  pingObject(
    "fyd010-loc",
    "ping.social.location@1",
    "public",
    "999 Canary Ave, Grand Junction, CO 81501",
    "Location record for the fixture business.",
    {
      address: "999 Canary Ave, Grand Junction, CO 81501",
      locality: "Grand Junction",
      address_region: "Colorado",
      postal_code: "81501",
    },
  ),
  pingObject(
    "fyd010-loc2",
    "ping.social.location@1",
    "public",
    "777 Cut St, Grand Junction, CO 81501",
    "Second location (hide-traversal test).",
    { address: "777 Cut St, Grand Junction, CO 81501", locality: "Grand Junction" },
  ),
  pingObject(
    "fyd010-private",
    "ping.social.business@1",
    "private",
    "Private Fixture Co",
    "This whole object is private to its owner.",
    {
      name: "Private Fixture Co",
      privateNote: `${C}-PRIVATE-OBJ whole object is private must 404`,
    },
  ),
];

const fixtureRels = [
  {
    id: "fyd010-rel-located",
    subject: "fyd010-biz",
    object: "fyd010-loc",
    predicate: "located_at",
    status: "active",
    evidenceRef: "website-ingestion:https://fixture-plumbing.example.com/",
  },
  {
    id: "fyd010-rel-located2",
    subject: "fyd010-biz",
    object: "fyd010-loc2",
    predicate: "located_at",
    status: "active",
    evidenceRef: "website-ingestion:https://fixture-plumbing.example.com/",
  },
];

// NOTE: on the Ask-FYD journal-overlay seam the fixture business object is
// served with schema ping.social.organization@1 (NOT a business schema) so
// the coppersmith business-candidate count stays exactly 1 and the owner
// phone correction still composes instead of orphaning as ambiguous. The
// projection-dir seam uses the business schema (needed for the correction
// to target the fixture business there).
const overlayObjects = fixtureObjects.map((o) =>
  o.id === "fyd010-biz" ? { ...o, schema: "ping.social.organization@1" } : o,
);

function projectionDoc(siteId: string, graph: { objects: unknown[]; relationships: unknown[] }) {
  const graphDigest = sha256Hex(canonicalize(graph));
  return {
    meta: {
      siteId,
      dumpedAt: TS,
      dumperVersion: "fyd010-proof-fixture@1",
      baseDigest: graphDigest,
      fixtureFileDigest: graphDigest,
      fixtureHeader: "fyd010 adversarial fixture",
      overlayEventIds: [],
      graphDigest,
      generatedAt: TS,
      eventSequences: null,
    },
    graph,
  };
}

mkdirSync(PROJ_DIR, { recursive: true });
mkdirSync(OWNER_DIR, { recursive: true });

writeFileSync(
  join(PROJ_DIR, "fyd010-fixture.json"),
  JSON.stringify(
    projectionDoc("fyd010-fixture", { objects: fixtureObjects, relationships: fixtureRels }),
    null,
    1,
  ),
);

// coppersmith-plumbing projection: pinned base graph + fixture objects/rels.
// The base-business -> fyd010-loc2 located_at edge exercises the owner
// address-hide traversal cut on this path too.
const copperGraph = {
  objects: [...(COPPERSMITH_GRAPH as any).objects, ...fixtureObjects],
  relationships: [
    ...(COPPERSMITH_GRAPH as any).relationships,
    ...fixtureRels,
    {
      id: "fyd010-rel-base-located",
      subject: "website-business-2f1327c09d622175",
      object: "fyd010-loc2",
      predicate: "located_at",
      status: "active",
      evidenceRef: "website-ingestion:https://fixture-plumbing.example.com/",
    },
  ],
};
writeFileSync(
  join(PROJ_DIR, "coppersmith-plumbing.json"),
  JSON.stringify(projectionDoc("coppersmith-plumbing", copperGraph), null, 1),
);

// Overlay ops source for the gateway stub (single definition of the objects).
writeFileSync(
  join(OUT, "fixture/overlay.json"),
  JSON.stringify(
    {
      objects: overlayObjects,
      relationships: [
        ...fixtureRels,
        {
          id: "fyd010-rel-base-located",
          subject: "website-business-2f1327c09d622175",
          object: "fyd010-loc2",
          predicate: "located_at",
          status: "active",
        },
        {
          id: "fyd010-rel-xref",
          subject: "fyd010-biz",
          object: "foreign-tenant-obj-99",
          predicate: "references",
          status: "active",
        },
      ],
    },
    null,
    1,
  ),
);
console.log("wrote projections + overlay.json");

// Owner state through the repo's own writer.
for (const siteId of ["fyd010-fixture", "coppersmith-plumbing"]) {
  applyOwnerCommand(
    siteId,
    { type: "set-contact-field", field: "phone", value: "+1-970-555-0188" },
    [],
    new Map(),
    {
      sourceValue: siteId === "fyd010-fixture" ? "+1-970-555-0142" : "970-245-3869",
      actorLabel: "fyd010-proof",
    },
  );
  applyOwnerCommand(
    siteId,
    { type: "set-address-visibility", visibility: "hide" },
    [],
    new Map(),
    { actorLabel: "fyd010-proof" },
  );
  console.log("seeded owner state for", siteId);
}
console.log("SEED_OK");
