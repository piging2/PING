// Standalone stub FYD journal gateway for the live Pig end-to-end check.
// Serves the exact canned payloads from
// src/app/api/fyd/ask/__tests__/stub-journal.ts on 127.0.0.1:18199
// (the default FYD_JOURNAL_GATEWAY_URL).
const { createServer } = require("node:http");

const EVENTS = [
  {
    id: "stub-ev-001",
    ts: "2026-09-19T18:30:59.221Z",
    siteId: "happy-place",
    ops: [
      {
        op: "add_object",
        object: {
          id: "website-service-51de038c1defe8bd",
          schema: "ping.social.service@1",
          controllerId: "identity_fyd_demo_operator",
          visibility: "public",
          title: "Pergola Design Consultations",
          description: "Complimentary consultations for custom pergola design",
          fields: {
            name: "Pergola Design Consultations",
            serviceType: "Consultation",
            availability: "Limited slots",
          },
          createdAt: "2026-09-19T18:30:59.221Z",
          updatedAt: "2026-09-19T18:30:59.221Z",
          provenance: {
            kind: "overlay-authored",
            ref: "demo-overlay:happy-place",
            derivedAt: "2026-09-19T18:30:59.221Z",
          },
        },
      },
    ],
  },
  {
    id: "stub-ev-002",
    ts: "2026-09-19T18:32:14.908Z",
    siteId: "happy-place",
    ops: [
      {
        op: "add_relationship",
        relationship: {
          id: "rel-demo-pergola-01",
          subject: "website-business-6fa5ebd99d72c4cb",
          predicate: "offers",
          object: "website-service-51de038c1defe8bd",
          status: "active",
          createdAt: "2026-09-19T18:32:14.908Z",
        },
      },
    ],
  },
  {
    id: "stub-ev-007",
    ts: "2026-09-19T18:36:14.017Z",
    siteId: "happy-place",
    ops: [
      { op: "deactivate_object", objectId: "website-service-51de038c1defe8bd" },
      {
        op: "set_field",
        objectId: "website-business-6fa5ebd99d72c4cb",
        field: "tagline",
        value: "Built right. Built to last.",
      },
    ],
  },
  { id: "stub-ev-008", ts: "2026-09-19T18:40:00.000Z", siteId: "site-a", ops: [] },
];

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/events/FYD_SITE_OVERLAY") {
    const body = JSON.stringify({
      events: EVENTS.map((e) => ({
        event_id: e.id,
        timestamp: e.ts,
        event_type: "FYD_SITE_OVERLAY",
        event_data: { siteId: e.siteId, ops: e.ops },
      })),
    });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(body);
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end("{}");
});

server.listen(18199, "127.0.0.1", () => {
  console.log("stub journal on 127.0.0.1:18199");
});
