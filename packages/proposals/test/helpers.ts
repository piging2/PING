/**
 * Shared test helpers for the proposals proofs. Not a test file itself
 * (does not match *.test.ts), so importing it never double-registers tests.
 */
import type { ObjectGraph } from "../../sitespec/src/types";
import type { PingObject, PingRelationship } from "../../sitespec/src/ping-types";
import { COPPERSMITH_GRAPH } from "../../sitespec/fixtures/coppersmith-graph";

const OWNER_ID = "website-business-2f1327c09d622175";

/**
 * Test-local augmentation: the fixture has Plumbing / Heating & Cooling
 * / HVAC / Ventilation. "Move emergency plumbing to the top" needs an
 * emergency-plumbing object to resolve, so the test adds one service +
 * its offers relationship. The fixture file is not edited.
 */
export function coppersmithWithEmergency(): ObjectGraph {
  const graph = JSON.parse(JSON.stringify(COPPERSMITH_GRAPH)) as ObjectGraph;
  const service: PingObject = {
    id: OWNER_ID + "-service-emergency",
    schema: "ping.social.service@1",
    controllerId: "identity_fyd_compiler_test",
    visibility: "public",
    title: "Emergency Plumbing",
    description: "24/7 emergency plumbing response for burst pipes and major leaks.",
    fields: {
      name: "Emergency Plumbing",
      description: "24/7 emergency plumbing response for burst pipes and major leaks.",
      service_href: "https://coppersmithplumbing.com/services/plumbing/emergency/",
      claimKind: "website_statement",
    },
    createdAt: "2026-09-21T13:50:00Z",
    updatedAt: "2026-09-21T13:50:00Z",
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://www.coppersmithplumbing.com/",
      derivedAt: "2026-09-21T13:50:00Z",
    },
  };
  const rel: PingRelationship = {
    id: "rel-test-emergency",
    subject: OWNER_ID,
    predicate: "offers",
    object: service.id,
    status: "active",
    createdAt: "2026-09-21T13:50:00Z",
    evidenceRef: "test:augmentation:emergency-plumbing",
  };
  graph.objects.push(service);
  graph.relationships.push(rel);
  return graph;
}
