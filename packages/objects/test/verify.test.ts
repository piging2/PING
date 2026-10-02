/**
 * Graph verification tests (contract adapted from ping-fyd-converged
 * SHA 32f8347 src/fyd/builder/__tests__/object-builder.test.ts).
 *
 * The source test wrapped graphs in a tenant PingProjection; the kernel
 * verifier takes the graph directly (tenant machinery is not harvested).
 * Fixture helpers are adapted from the source's fixtures.ts.
 */

import type { PingObject, PingRelationship } from "../src/object-types";
import type { ObjectGraph } from "../src/graph";
import {
  GraphVerificationError,
  OBJECT_KERNEL_VERSION,
  verifyObjectGraph,
} from "../src/verify";

const TS = "2026-09-21T00:00:00.000Z";
const BIZ = "ping.social.business@1";
const SVC = "ping.social.service@1";
const POST = "ping.social.post@1";

function makeObject(id: string, schema: string, opts?: Partial<PingObject>): PingObject {
  return {
    id,
    schema,
    controllerId: "test-controller",
    visibility: "public",
    title: id,
    description: "",
    fields: {},
    createdAt: TS,
    updatedAt: TS,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://example.com/",
      derivedAt: TS,
    },
    ...(opts ?? {}),
  };
}

function makeRelationship(id: string, subject: string, predicate: string, object: string): PingRelationship {
  return {
    id,
    subject,
    predicate,
    object,
    status: "active",
    createdAt: TS,
    evidenceRef: "website-ingestion:https://example.com/",
  };
}

/** A local trade graph: owner + services + posts, all on registered schemas. */
function tradeGraph(): ObjectGraph {
  return {
    objects: [
      makeObject("biz-trade", BIZ, {
        title: "Acme Plumbing",
        description: "Full-service plumbing for the valley.",
        fields: { phone: "555-0100", website: "https://acme-plumbing.example.com/", locality: "Grand Junction, Colorado" },
      }),
      makeObject("svc-drains", SVC, { title: "Drain cleaning", description: "Clear slow drains fast." }),
      makeObject("svc-heaters", SVC, { title: "Water heaters", description: "Install and repair." }),
      makeObject("post-1", POST, { title: "Winterizing tips", description: "How to winterize." }),
      makeObject("post-2", POST, { title: "Pipe thaw update", description: "A follow-up." }),
    ],
    relationships: [
      makeRelationship("rel-1", "biz-trade", "provides", "svc-drains"),
      makeRelationship("rel-2", "biz-trade", "provides", "svc-heaters"),
      makeRelationship("rel-3", "biz-trade", "publishes", "post-1"),
      makeRelationship("rel-4", "svc-drains", "provided_by", "biz-trade"),
      makeRelationship("rel-5", "post-2", "replies_to", "post-1"),
    ],
  };
}

function expectCode(fn: () => void, code: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(GraphVerificationError);
    expect((e as GraphVerificationError).code).toBe(code);
    return;
  }
  throw new Error("expected GraphVerificationError " + code);
}

describe("verifyObjectGraph", () => {
  test("a clean graph verifies and is attested", () => {
    const v = verifyObjectGraph(tradeGraph());
    expect(v.attestation.builderVersion).toBe(OBJECT_KERNEL_VERSION);
    expect(v.attestation.objectCount).toBe(5);
    expect(v.attestation.relationshipCount).toBe(5);
    expect(v.attestation.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(v.attestation.checks).toEqual([
      "ids-unique",
      "schema-catalog",
      "evidence-references",
      "relationship-legality",
      "visibility",
    ]);
    expect(v.graph).toBeDefined();
  });

  test("attestation digest is deterministic for the same graph", () => {
    expect(verifyObjectGraph(tradeGraph()).attestation.digest).toBe(
      verifyObjectGraph(tradeGraph()).attestation.digest,
    );
  });

  test("duplicate object id throws OBJECT_GRAPH_ID", () => {
    const g = tradeGraph();
    g.objects.push(makeObject("biz-trade", BIZ));
    expectCode(() => verifyObjectGraph(g), "OBJECT_GRAPH_ID");
  });

  test("duplicate relationship id throws OBJECT_GRAPH_ID", () => {
    const g = tradeGraph();
    g.relationships.push(makeRelationship("rel-1", "biz-trade", "provides", "svc-drains"));
    expectCode(() => verifyObjectGraph(g), "OBJECT_GRAPH_ID");
  });

  test("unregistered schema throws OBJECT_GRAPH_SCHEMA", () => {
    const g = tradeGraph();
    g.objects.push(makeObject("mystery", "ping.social.mystery@9"));
    expectCode(() => verifyObjectGraph(g), "OBJECT_GRAPH_SCHEMA");
  });

  test("missing provenance ref throws OBJECT_GRAPH_EVIDENCE", () => {
    const g = tradeGraph();
    g.objects[0].provenance.ref = "";
    expectCode(() => verifyObjectGraph(g), "OBJECT_GRAPH_EVIDENCE");
  });

  test("missing relationship evidenceRef throws OBJECT_GRAPH_EVIDENCE", () => {
    const g = tradeGraph();
    g.relationships[0].evidenceRef = "";
    expectCode(() => verifyObjectGraph(g), "OBJECT_GRAPH_EVIDENCE");
  });

  test("unknown relationship endpoint throws OBJECT_GRAPH_RELATIONSHIP", () => {
    const g = tradeGraph();
    g.relationships.push(makeRelationship("rel-x", "biz-trade", "provides", "ghost"));
    expectCode(() => verifyObjectGraph(g), "OBJECT_GRAPH_RELATIONSHIP");
  });

  test("predicate outside the schema rules throws OBJECT_GRAPH_RELATIONSHIP", () => {
    const g = tradeGraph();
    // "provides" is a business rule; a service may not provide.
    g.relationships.push(makeRelationship("rel-x", "svc-drains", "provides", "svc-heaters"));
    expectCode(() => verifyObjectGraph(g), "OBJECT_GRAPH_RELATIONSHIP");
  });

  test("illegal relationship status throws OBJECT_GRAPH_RELATIONSHIP", () => {
    const g = tradeGraph();
    (g.relationships[0] as unknown as { status: string }).status = "pending";
    expectCode(() => verifyObjectGraph(g), "OBJECT_GRAPH_RELATIONSHIP");
  });

  test("non-public endpoint on a relationship leg throws OBJECT_GRAPH_VISIBILITY", () => {
    const g = tradeGraph();
    g.objects[1].visibility = "private";
    expectCode(() => verifyObjectGraph(g), "OBJECT_GRAPH_VISIBILITY");
  });

  test("illegal object visibility throws OBJECT_GRAPH_VISIBILITY", () => {
    const g = tradeGraph();
    (g.objects[0] as unknown as { visibility: string }).visibility = "friends";
    expectCode(() => verifyObjectGraph(g), "OBJECT_GRAPH_VISIBILITY");
  });
});
