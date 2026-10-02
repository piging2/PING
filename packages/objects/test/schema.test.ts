/**
 * Schema derivation tests (adapted from ping-fyd-converged SHA 32f8347
 * src/fyd/sitespec/__tests__/schemas.test.ts).
 *
 * Only the object-kernel derivations are carried over: the proof schemas,
 * the validator, and the relationship rules. Component eligibility,
 * capability options, and agent tool descriptions belong to the renderer
 * and capability layers and are not harvested here.
 */

import {
  BUSINESS_SCHEMA,
  POST_SCHEMA,
  SERVICE_SCHEMA,
  getSchemaDef,
  isAllowedPredicate,
  validateAgainstSchema,
} from "../src/schema";

function record(over: Record<string, unknown> = {}) {
  return {
    title: "Happy Place Carpentry",
    description: "Decks and fences.",
    fields: { category: "Carpentry", ...over },
  };
}

describe("schema derivations", () => {
  test("exactly three proof schemas", () => {
    expect(getSchemaDef("ping.social.business@1")).toBe(BUSINESS_SCHEMA);
    expect(getSchemaDef("ping.social.service@1")).toBe(SERVICE_SCHEMA);
    expect(getSchemaDef("ping.social.post@1")).toBe(POST_SCHEMA);
    expect(getSchemaDef("ping.social.unknown@1")).toBeUndefined();
  });

  test("validator accepts a complete business, rejects a missing title", () => {
    expect(validateAgainstSchema(BUSINESS_SCHEMA, record(), "o1")).toEqual([]);
    const bad = validateAgainstSchema(
      BUSINESS_SCHEMA,
      { title: "", description: "x", fields: {} },
      "o1",
    );
    expect(bad.some((f) => f.severity === "error" && f.path === "object.title")).toBe(true);
  });

  test("validator flags type changes per the evolution law", () => {
    const bad = validateAgainstSchema(BUSINESS_SCHEMA, record({ socials: "not-an-array" }), "o1");
    expect(bad.some((f) => f.severity === "error" && f.path === "object.socials")).toBe(true);
  });

  test("validator warns on a malformed url field, tolerates unknown fields", () => {
    const findings = validateAgainstSchema(BUSINESS_SCHEMA, record({ website: "not a url", extra: "x" }), "o1");
    expect(findings.some((f) => f.severity === "warning" && f.path === "object.website")).toBe(true);
    expect(findings.some((f) => f.severity === "info" && f.path === "object.fields.extra")).toBe(true);
  });

  test("relationship rules gate predicates", () => {
    expect(isAllowedPredicate("ping.social.business@1", "provides")).toBe(true);
    expect(isAllowedPredicate("ping.social.business@1", "likes")).toBe(false);
    expect(isAllowedPredicate("ping.social.post@1", "replies_to")).toBe(true);
  });
});
