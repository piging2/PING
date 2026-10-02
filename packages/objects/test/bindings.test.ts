/**
 * verifyPresentationBinding: the evidence-bound field read fails closed.
 *
 * Adapted from ping-fyd-converged SHA 32f8347
 * src/fyd/sitespec/__tests__/bindings.test.ts. The source test traces a
 * real value from the proceduralize fixture; this version inlines a small
 * synthetic fixture instead (no proceduralize/FYD coupling).
 *
 * Every failed binding must resolve to undefined so the caller omits the
 * value instead of rendering an unverified claim.
 */

import {
  resolveBoundField,
  verifyPresentationBinding,
  type ObjectGraph,
  type PresentationBinding,
} from "../src/graph";
import type { PingObject, PingRelationship } from "../src/object-types";

const T = "2026-09-21T02:44:00Z";

function obj(id: string, fields: Record<string, string | string[]> = {}, provRef = "evidence:1"): PingObject {
  return {
    id,
    schema: "ping.social.business@1",
    controllerId: "controller:1",
    visibility: "public",
    title: id,
    description: "",
    fields,
    createdAt: T,
    updatedAt: T,
    provenance: { kind: "website-derived", ref: provRef, derivedAt: T },
  };
}

function rel(id: string, subject: string, predicate: string, object: string): PingRelationship {
  return { id, subject, predicate, object, status: "active", createdAt: T, evidenceRef: "evidence:1" };
}

function graph(objects: PingObject[], relationships: PingRelationship[]): ObjectGraph {
  return { objects, relationships };
}

describe("verifyPresentationBinding", () => {
  test("traces a real value: value -> object field -> evidence ref", () => {
    const g = graph(
      [obj("biz", { locality: "Grand Junction, Colorado" })],
      [rel("r1", "biz", "located_at", "loc")],
    );
    const binding: PresentationBinding = { objectId: "biz", field: "locality", classification: "direct" };
    const verdict = verifyPresentationBinding(binding, g);
    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      expect(verdict.value).toBe("Grand Junction, Colorado");
    }
    expect(resolveBoundField(g, binding)).toBe("Grand Junction, Colorado");
  });

  test("fails closed: unknown object id", () => {
    const g = graph([obj("biz")], []);
    const binding: PresentationBinding = { objectId: "does-not-exist", field: "locality", classification: "direct" };
    expect(verifyPresentationBinding(binding, g)).toEqual({ ok: false, reason: "unknown object" });
    expect(resolveBoundField(g, binding)).toBeUndefined();
  });

  test("fails closed: unbound field", () => {
    const g = graph([obj("biz", {})], []);
    const binding: PresentationBinding = { objectId: "biz", field: "phone", classification: "direct" };
    expect(verifyPresentationBinding(binding, g)).toEqual({ ok: false, reason: "unbound field" });
    expect(resolveBoundField(g, binding)).toBeUndefined();
  });

  test("fails closed: no evidence ref on a direct binding", () => {
    const g = graph([obj("biz", { locality: "x" }, "")], []);
    const binding: PresentationBinding = { objectId: "biz", field: "locality", classification: "direct" };
    expect(verifyPresentationBinding(binding, g)).toEqual({ ok: false, reason: "no evidence ref" });
    expect(resolveBoundField(g, binding)).toBeUndefined();
  });

  test("fails closed: generated binding without a generator ref", () => {
    const g = graph([obj("biz", { locality: "x" })], []);
    const binding: PresentationBinding = { objectId: "biz", field: "locality", classification: "generated" };
    expect(verifyPresentationBinding(binding, g)).toEqual({ ok: false, reason: "no generator ref" });
  });

  test("generated binding with name@version resolves", () => {
    const g = graph([obj("biz", { locality: "x" })], []);
    const binding: PresentationBinding = {
      objectId: "biz",
      field: "locality",
      classification: "generated",
      generatorRef: "copywriter@3",
    };
    expect(verifyPresentationBinding(binding, g)).toEqual({ ok: true, value: "x" });
  });
});
