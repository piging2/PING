/**
 * Hostile object-layer tests (Nolan's 12-point program, point 2: HOSTILE INPUTS).
 *
 * Fail closed or degrade explicitly; never invent data. Every case drives a
 * hostile input at the object kernel and asserts the typed failure mode:
 *   - duplicate submissions -> GraphVerificationError (typed, coded)
 *   - missing required fields -> error findings from the schema validator
 *   - unknown schema strings -> rejected at graph verification, never
 *     admitted as renderable objects
 *   - missing evidence refs -> rejected (no fact without a traceable basis)
 *   - illegal predicates and private-endpoint relationships -> rejected,
 *     never silently dropped or laundered
 *
 * Pure and deterministic: no I/O, no clock, no randomness.
 */

import { GraphVerificationError, verifyObjectGraph } from "../src/verify";
import {
  BUSINESS_SCHEMA,
  SERVICE_SCHEMA,
  getSchemaDef,
  validateAgainstSchema,
} from "../src/schema";
import { deriveObjectId, websiteObjectId } from "../src/identity";
import type { ObjectGraph } from "../src/graph";

function biz(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    schema: "ping.social.business@1",
    controllerId: "test",
    visibility: "public",
    title: "Test Business",
    description: "Does things.",
    fields: {},
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://example.com/",
      derivedAt: "2026-01-01T00:00:00Z",
    },
    ...over,
  };
}

function svc(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    schema: "ping.social.service@1",
    controllerId: "test",
    visibility: "public",
    title: "Test Service",
    description: "A service.",
    fields: {},
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://example.com/",
      derivedAt: "2026-01-01T00:00:00Z",
    },
    ...over,
  };
}

function rel(
  id: string,
  subject: string,
  object: string,
  over: Record<string, unknown> = {},
) {
  return {
    id,
    subject,
    predicate: "provides",
    object,
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    evidenceRef: "evt:test",
    ...over,
  };
}

function expectGraphError(
  graph: ObjectGraph,
  code: string,
  reason: RegExp,
) {
  let caught: unknown = null;
  try {
    verifyObjectGraph(graph);
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(GraphVerificationError);
  const err = caught as GraphVerificationError;
  expect(err.code).toBe(code);
  expect(err.message).toMatch(reason);
}

describe("hostile objects: duplicate submissions fail closed", () => {
  test("the same object submitted twice is rejected with a typed error", () => {
    const b = biz("dup-1") as never;
    expectGraphError(
      { objects: [b, b], relationships: [] } as unknown as ObjectGraph,
      "OBJECT_GRAPH_ID",
      /duplicate object id "dup-1"/,
    );
  });

  test("duplicate relationship ids are rejected", () => {
    const b = biz("b1") as never;
    const s = svc("s1") as never;
    const r1 = rel("rel-1", "b1", "s1") as never;
    const r2 = rel("rel-1", "b1", "s1") as never;
    expectGraphError(
      { objects: [b, s], relationships: [r1, r2] } as unknown as ObjectGraph,
      "OBJECT_GRAPH_ID",
      /duplicate relationship id "rel-1"/,
    );
  });

  test("empty ids are rejected", () => {
    const b = biz("") as never;
    expectGraphError(
      { objects: [b], relationships: [] } as unknown as ObjectGraph,
      "OBJECT_GRAPH_ID",
      /empty id/,
    );
  });
});

describe("hostile objects: missing required fields", () => {
  test("a business without a title yields an error finding, never a pass", () => {
    const findings = validateAgainstSchema(
      BUSINESS_SCHEMA,
      { title: "", description: "x", fields: {} },
      "o1",
    );
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.path === "object.title")).toBe(true);
    expect(findings.some((f) => f.authority !== "piging2.objects.validator")).toBe(
      false,
    );
  });

  test("a service without a description yields an error finding", () => {
    const findings = validateAgainstSchema(
      SERVICE_SCHEMA,
      { title: "x", description: "", fields: {} },
      "o1",
    );
    expect(
      findings.some((f) => f.severity === "error" && f.path === "object.description"),
    ).toBe(true);
  });

  test("a type change against the evolution law is an error, not a warning", () => {
    const findings = validateAgainstSchema(
      BUSINESS_SCHEMA,
      { title: "x", description: "y", fields: { socials: "not-an-array" } },
      "o1",
    );
    expect(
      findings.some((f) => f.severity === "error" && f.path === "object.socials"),
    ).toBe(true);
  });
});

describe("hostile objects: unknown schema on ingest", () => {
  test("getSchemaDef admits only registered definitions", () => {
    expect(getSchemaDef("ping.social.business@1")).toBe(BUSINESS_SCHEMA);
    expect(getSchemaDef("ping.social.fake@9")).toBeUndefined();
    expect(getSchemaDef("")).toBeUndefined();
  });

  test("an object with an unregistered schema fails closed at verification", () => {
    const b = biz("b1", { schema: "ping.social.fake@9" }) as never;
    expectGraphError(
      { objects: [b], relationships: [] } as unknown as ObjectGraph,
      "OBJECT_GRAPH_SCHEMA",
      /unregistered schema "ping.social.fake@9"/,
    );
  });
});

describe("hostile objects: missing evidence fails closed", () => {
  test("an object without a provenance ref is rejected", () => {
    const b = biz("b1", {
      provenance: { kind: "website-derived", ref: "", derivedAt: "" },
    }) as never;
    expectGraphError(
      { objects: [b], relationships: [] } as unknown as ObjectGraph,
      "OBJECT_GRAPH_EVIDENCE",
      /lacks a provenance ref/,
    );
  });

  test("a relationship without an evidenceRef is rejected", () => {
    const b = biz("b1") as never;
    const s = svc("s1") as never;
    const r = rel("r1", "b1", "s1", { evidenceRef: "" }) as never;
    expectGraphError(
      { objects: [b, s], relationships: [r] } as unknown as ObjectGraph,
      "OBJECT_GRAPH_EVIDENCE",
      /lacks an evidenceRef/,
    );
  });
});

describe("hostile objects: illegal relationships fail closed", () => {
  test("a predicate the subject schema does not allow is rejected", () => {
    const b = biz("b1") as never;
    const s = svc("s1") as never;
    const r = rel("r1", "b1", "s1", { predicate: "likes" }) as never;
    expectGraphError(
      { objects: [b, s], relationships: [r] } as unknown as ObjectGraph,
      "OBJECT_GRAPH_RELATIONSHIP",
      /not allowed for schema/,
    );
  });

  test("a relationship to an unknown endpoint is rejected", () => {
    const b = biz("b1") as never;
    const r = rel("r1", "b1", "ghost") as never;
    expectGraphError(
      { objects: [b], relationships: [r] } as unknown as ObjectGraph,
      "OBJECT_GRAPH_RELATIONSHIP",
      /unknown object "ghost"/,
    );
  });

  test("a relationship through a private endpoint is rejected, never silently dropped", () => {
    const b = biz("b1") as never;
    const s = svc("s1", { visibility: "private" }) as never;
    const r = rel("r1", "b1", "s1") as never;
    // Fail closed means the caller gets a typed refusal, not a quietly
    // pruned graph: the graph as given is unusable as evidence.
    expectGraphError(
      { objects: [b, s], relationships: [r] } as unknown as ObjectGraph,
      "OBJECT_GRAPH_VISIBILITY",
      /non-public object "s1" as evidence/,
    );
  });

  test("an illegal visibility value is rejected", () => {
    const b = biz("b1", { visibility: "internal" }) as never;
    expectGraphError(
      { objects: [b], relationships: [] } as unknown as ObjectGraph,
      "OBJECT_GRAPH_VISIBILITY",
      /illegal visibility/,
    );
  });
});

describe("hostile objects: identity dedupe is deterministic", () => {
  test("the same (namespace, key) always mints the same id: resubmission dedupes", () => {
    expect(deriveObjectId("website", "article:hello")).toBe(
      deriveObjectId("website", "article:hello"),
    );
    expect(deriveObjectId("journal", "evt:123")).toBe("obj:68832f7615eed540");
  });

  test("colon-injected web: parts are rejected: ids stay parseable", () => {
    expect(() => websiteObjectId("arti:cle", "x")).toThrow();
    expect(() => websiteObjectId("article", "a:b")).toThrow();
  });
});
