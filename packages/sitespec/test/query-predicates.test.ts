/**
 * Minor (Worker P2): FYDQuery.related.predicate is a free string; an
 * unknown predicate (typo "offres") silently resolved to [], rendering
 * an empty section nobody could explain. The query seam now refuses
 * TYPED (UnknownPredicateError) against the ROLE_PREDICATES vocabulary.
 */

import { resolveQuery, UnknownPredicateError } from "../src/query";
import type { ObjectGraph } from "../src/types";
import type { PingObject, PingRelationship } from "../src/ping-types";

const T = "2026-10-02T12:00:00Z";

function biz(): PingObject {
  return {
    id: "obj-biz-a",
    schema: "ping.social.business@1",
    controllerId: "tenant-a",
    visibility: "public",
    title: "Corner Bakery",
    description: "A neighborhood bakery.",
    fields: { name: "Corner Bakery", claimKind: "website_statement" },
    createdAt: T,
    updatedAt: T,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://corner-bakery.example/",
      derivedAt: T,
    },
  };
}

function svc(): PingObject {
  return {
    ...biz(),
    id: "obj-svc",
    schema: "ping.social.service@1",
    title: "Sourdough Loaves",
    description: "Baked fresh.",
    fields: { name: "Sourdough Loaves", claimKind: "website_statement" },
  };
}

function graph(): ObjectGraph {
  const rel: PingRelationship = {
    id: "rel-1",
    subject: "obj-biz-a",
    predicate: "offers",
    object: "obj-svc",
    status: "active",
    createdAt: T,
    evidenceRef: "website-ingestion:https://corner-bakery.example/#rel-1",
  };
  return { objects: [biz(), svc()], relationships: [rel] };
}

describe("unknown relationship predicates fail TYPED", () => {
  test("a typo predicate throws UnknownPredicateError, never silent []", () => {
    expect(() =>
      resolveQuery(
        { kind: "related", from: "obj-biz-a", predicate: "offres" },
        graph(),
        "obj-biz-a",
      ),
    ).toThrow(UnknownPredicateError);
  });

  test("an unknown predicate inside predicates[] throws", () => {
    expect(() =>
      resolveQuery(
        {
          kind: "related",
          from: "obj-biz-a",
          predicate: "offers",
          predicates: ["offers", "offres"],
        },
        graph(),
        "obj-biz-a",
      ),
    ).toThrow(UnknownPredicateError);
  });

  test("the error names the offending predicate", () => {
    try {
      resolveQuery(
        { kind: "related", from: "obj-biz-a", predicate: "offres" },
        graph(),
        "obj-biz-a",
      );
      throw new Error("did not throw");
    } catch (e) {
      expect(e).toBeInstanceOf(UnknownPredicateError);
      expect((e as UnknownPredicateError).predicate).toBe("offres");
    }
  });

  test("known predicates still resolve (non-vacuous baseline)", () => {
    const out = resolveQuery(
      { kind: "related", from: "obj-biz-a", predicate: "offers" },
      graph(),
      "obj-biz-a",
    );
    expect(out.map((o) => o.id)).toEqual(["obj-svc"]);
  });
});
