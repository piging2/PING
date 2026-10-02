/**
 * Object identity tests: deterministic ids, pinned formulation.
 */

import { digestCanonical } from "../../trust/src/digest";
import {
  OBJECT_ID_ALGORITHM,
  deriveObjectId,
  isWebsiteObjectId,
  websiteObjectId,
  websiteRelationshipId,
} from "../src/identity";

describe("deriveObjectId", () => {
  test("is deterministic: same (namespace, key) -> same id, across calls", () => {
    expect(deriveObjectId("website", "article:hello")).toBe(deriveObjectId("website", "article:hello"));
  });

  test("reuses the trust kernel digest with a pinned formulation", () => {
    const expected =
      "obj:" +
      digestCanonical({ algo: OBJECT_ID_ALGORITHM, v: 1, namespace: "journal", key: "evt:123" }).slice(0, 16);
    expect(deriveObjectId("journal", "evt:123")).toBe(expected);
    // Pinned vector: the formulation must never drift silently.
    expect(deriveObjectId("journal", "evt:123")).toBe("obj:68832f7615eed540");
  });

  test("namespace isolates id spaces", () => {
    expect(deriveObjectId("website", "a")).not.toBe(deriveObjectId("journal", "a"));
  });

  test("ids carry the obj: prefix and 16 hex chars", () => {
    expect(deriveObjectId("website", "a")).toMatch(/^obj:[0-9a-f]{16}$/);
  });

  test("rejects empty or whitespace-bearing parts", () => {
    expect(() => deriveObjectId("", "a")).toThrow();
    expect(() => deriveObjectId("website", "")).toThrow();
    expect(() => deriveObjectId("web site", "a")).toThrow();
    // Colons are legal in digest-addressed keys: the input record is
    // structured, so "evt:123" is a perfectly good key.
    expect(deriveObjectId("journal", "evt:123")).toMatch(/^obj:[0-9a-f]{16}$/);
  });
});

describe("website id scheme", () => {
  test("follows the proven web:<kind>:<key> contract", () => {
    expect(websiteObjectId("article", "my-post")).toBe("web:article:my-post");
    expect(websiteRelationshipId("provides", "svc-1")).toBe("web:rel:provides:svc-1");
  });

  test("isWebsiteObjectId distinguishes namespaces", () => {
    expect(isWebsiteObjectId("web:article:x")).toBe(true);
    expect(isWebsiteObjectId("obj:abcd1234efgh5678")).toBe(false);
    expect(isWebsiteObjectId("evt:123")).toBe(false);
  });

  test("the web: scheme rejects colons in its parts (unparseable ids)", () => {
    expect(() => websiteObjectId("arti:cle", "x")).toThrow();
    expect(() => websiteRelationshipId("provides", "a:b")).toThrow();
  });
});
