/**
 * Visitor-safe field allowlist: arbitrary private fields on a public
 * object must never reach a visitor answer (FYD FINISH-STRONG).
 */
import {
  VISITOR_SAFE_FIELDS,
  isVisitorSafeField,
  visitorSafeObject,
} from "../visitor-safe-fields";
import type { PingObject } from "../../../lib/ping/types";

function obj(fields: Record<string, string>): PingObject {
  return {
    id: "website-business-test",
    schema: "ping.social.business@1",
    controllerId: "web:test.example",
    visibility: "public",
    title: "Test Business",
    description: "A test business.",
    fields,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://test.example/",
      derivedAt: "2026-09-21T13:50:00Z",
    },
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
  };
}

describe("visitor-safe field allowlist", () => {
  test("known public fields survive", () => {
    const out = visitorSafeObject(
      obj({
        phone: "+15415550100",
        email: "a@test.example",
        website: "https://test.example/",
        locality: "Testville, OR",
        area_served: "Benton County, Oregon",
        hours: "Mon-Fri 8-5",
        category: "Plumber",
        bio: "Family-run shop.",
      }),
    );
    expect(out.fields).toEqual({
      phone: "+15415550100",
      email: "a@test.example",
      website: "https://test.example/",
      locality: "Testville, OR",
      area_served: "Benton County, Oregon",
      hours: "Mon-Fri 8-5",
      category: "Plumber",
      bio: "Family-run shop.",
    });
  });

  test("arbitrary private fields are dropped, including internal_note", () => {
    const out = visitorSafeObject(
      obj({
        phone: "+15415550100",
        internal_note: "owner is behind on rent, do not mention",
        private_metadata: "secret",
        owner_ssn: "000-00-0000",
        staff_notes: "do not publish",
      }),
    );
    expect(out.fields).toEqual({ phone: "+15415550100" });
    expect(out.fields).not.toHaveProperty("internal_note");
  });

  test("title, description, and provenance survive outside fields", () => {
    const out = visitorSafeObject(obj({ internal_note: "secret" }));
    expect(out.title).toBe("Test Business");
    expect(out.description).toBe("A test business.");
    expect(out.provenance?.kind).toBe("website-derived");
    expect(out.provenance?.ref).toBe("website-ingestion:https://test.example/");
  });

  test("isVisitorSafeField matches the allowlist", () => {
    expect(isVisitorSafeField("phone")).toBe(true);
    expect(isVisitorSafeField("area_served")).toBe(true);
    expect(isVisitorSafeField("internal_note")).toBe(false);
    expect(isVisitorSafeField("owner_ssn")).toBe(false);
    for (const f of VISITOR_SAFE_FIELDS) expect(isVisitorSafeField(f)).toBe(true);
  });

  test("pure: does not mutate the input object", () => {
    const original = obj({ phone: "1", internal_note: "x" });
    visitorSafeObject(original);
    expect(original.fields).toEqual({ phone: "1", internal_note: "x" });
  });
});
