/**
 * FYD-010 adversarial privacy proof: fixture gateway stub.
 *
 * Serves the canonical event shapes the deployed code reads, with FIXTURE
 * data only. Fixture data: no real PII. Canary prefix: CANARY-FYD010.
 *
 * Two seams:
 *  1. FYD journal overlays: GET /events/FYD_SITE_OVERLAY?tenant=<siteId>
 *     -> { events: [{ event_id, timestamp, event_data: { siteId, ops } }] }
 *     consumed by PingObjectReader.queryFydSiteOverlays -> getFydTenantGraph
 *     -> loadBundleWithOwnerOverlay -> verifyPublicProjection (Ask FYD path).
 *     Objects/relationships come from fixture/overlay.json (written by the
 *     seed script; single definition shared with the projection seam).
 *  2. Canonical object events: GET /events/OBJECT_CREATED, /events/OBJECT_UPDATED,
 *     /events/RELATIONSHIP_CREATED -> { events: [{ timestamp, event_data }] }
 *     consumed by the legacy /api/ping/* reader path (denylist sanitizer).
 *     NOTE: the reader resolves an OBJECT_CREATED row's object id as
 *     eventId(row) || payload.objectId, so these rows carry NO separate
 *     event_id (matching real journal rows for object events).
 *
 * The privacy boundaries under test live in the app code (the reader's
 * sanitizeFields/visibleTo, verifyPublicProjection, the Ask composer); this
 * stub only supplies shaped fixture input, like the real journal would.
 *
 * Usage: node fixture-gateway.mjs <port>
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const C = "CANARY-FYD010";
const TS = "2026-10-04T20:30:00.000Z";

const HERE = dirname(fileURLToPath(import.meta.url));
const overlay = JSON.parse(readFileSync(join(HERE, "fixture/overlay.json"), "utf8"));

// --- Seam 1: FYD journal overlays for tenant coppersmith-plumbing ---------
const overlayOps = [
  ...overlay.objects.map((object) => ({ op: "add_object", object })),
  ...overlay.relationships.map((relationship) => ({ op: "add_relationship", relationship })),
];

const overlayEvent = {
  event_id: "fyd010-ev-overlay-1",
  timestamp: TS,
  event_data: { siteId: "coppersmith-plumbing", ops: overlayOps },
};

// --- Seam 2: canonical object events for the legacy /api/ping/* reader ---
const mkEvent = (event_data, timestamp = TS) => ({ timestamp, event_data });

const createdEvents = [
  mkEvent({
    objectId: "fyd010-biz",
    schema: "ping.social.organization@1",
    visibility: "public",
    identityId: "owner-fixture-1",
    title: "Fixture Plumbing Co",
    name: "Fixture Plumbing Co",
    phone: "+1-970-555-0142",
    email: "source-says-CANARY-FYD010-CORRECTION-SOURCE@example.com",
    website: "https://fixture-plumbing.example.com",
    address: "999 Canary Ave, Grand Junction, CO 81501",
    internalMemo: `${C}-HIDDEN-MEMO owner private note never for visitors`,
    providerToken: `${C}-PROVIDER-TOKEN sk-fixture-9f8e7d6c5b4a`,
    apiSecret: `${C}-API-SECRET shh-fixture-321`,
    ownerPhone: `${C}-OWNER-PHONE +1-970-555-0199`,
    tenantRef: `${C}-TENANT-REF tenant-acme-corp-secret-42`,
    password: `${C}-EXACT-DENY password hunter2`,
    token: `${C}-EXACT-DENY token tok_exact_123`,
    privateKey: `${C}-EXACT-DENY privateKey pk_exact_456`,
  }),
  mkEvent({
    objectId: "fyd010-private",
    schema: "ping.social.business@1",
    visibility: "private",
    identityId: "owner-fixture-1",
    title: "Private Fixture Co",
    name: "Private Fixture Co",
    privateNote: `${C}-PRIVATE-OBJ whole object is private must 404`,
  }),
];

const updatedEvents = [
  mkEvent(
    {
      objectId: "fyd010-biz",
      object_id: "fyd010-biz",
      schema: "ping.social.organization@1",
      // Owner-only correction arriving as a canonical update: the owner
      // corrected a field to a value that must stay owner-only.
      changes: {
        ownerCorrection: `${C}-OWNER-CORRECTION owner private correction must not leak`,
        internalMemo2: `${C}-UPDATED-MEMO updated private note via OBJECT_UPDATED`,
      },
    },
    "2026-10-04T20:35:00.000Z",
  ),
];

const relEvents = [
  mkEvent({
    subject: "fyd010-biz",
    object: "fyd010-loc",
    predicate: "located_at",
    status: "active",
  }),
];

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  process.stderr.write(`[stub] ${req.method} ${url.pathname}?${url.searchParams}\n`);
  const send = (obj, status = 200) => {
    const body = JSON.stringify(obj);
    res.writeHead(status, { "content-type": "application/json" });
    res.end(body);
  };
  if (url.pathname === "/events/FYD_SITE_OVERLAY") {
    const tenant = url.searchParams.get("tenant");
    if (tenant === "coppersmith-plumbing") return send({ events: [overlayEvent] });
    return send({ events: [] });
  }
  if (url.pathname === "/events/OBJECT_CREATED") return send({ events: createdEvents });
  if (url.pathname === "/events/OBJECT_UPDATED") return send({ events: updatedEvents });
  if (url.pathname === "/events/RELATIONSHIP_CREATED") return send({ events: relEvents });
  return send({ error: "unknown fixture path" }, 404);
});

const port = parseInt(process.argv[2] || "3299", 10);
server.listen(port, "127.0.0.1", () => {
  console.log(`fyd010 fixture gateway on 127.0.0.1:${port}`);
});
