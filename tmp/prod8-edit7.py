"""PROD-8: unit tests for detectOrphanedCorrections. Edit 7: append to owner-overlay.test.ts"""

PATH = "/home/nolan/projects/ping/src/fyd/object/__tests__/owner-overlay.test.ts"

src = open(PATH, encoding="utf-8").read()

# --- extend imports ---
old = 'import { mkdtempSync } from "node:fs";'
new = 'import { mkdtempSync, readdirSync, readFileSync } from "node:fs";'
assert src.count(old) == 1, "fs import anchor not found"
src = src.replace(old, new, 1)

old = """import {
  applyOwnerFieldCorrections,
  findBusinessObject,
  ownerCorrectionForObject,
  rawFieldValue,
} from "../owner-overlay";"""
new = """import {
  applyOwnerFieldCorrections,
  detectOrphanedCorrections,
  findBusinessObject,
  ownerCorrectionForObject,
  rawFieldValue,
} from "../owner-overlay";"""
assert src.count(old) == 1, "overlay import anchor not found"
src = src.replace(old, new, 1)

# --- append the PROD-8 describe block ---
addition = '''
describe("PROD-8: orphaned-correction detection", () => {
  const NAMES = new Map([
    ["svc-a", "Service A"],
    ["svc-b", "Service B"],
  ]);

  function serviceObject(id: string, title: string): PingObject {
    return {
      id,
      schema: "ping.social.service@1",
      controllerId: "web:happy-place",
      visibility: "public",
      title,
      description: title + " description.",
      fields: {},
      createdAt: "2026-09-21T00:00:00Z",
      updatedAt: "2026-09-21T00:00:00Z",
      provenance: {
        kind: "website-derived",
        ref: "website-ingestion:https://happy-place-platform.vercel.app/",
        derivedAt: "2026-09-21T13:50:00Z",
      },
    };
  }

  function graphWithServices(ids: string[]): ObjectGraph {
    const biz = businessObject(SOURCE_PHONE);
    return {
      objects: [
        biz,
        ...ids.map((id, i) => serviceObject(id, "Service " + i)),
      ],
      relationships: ids.map((id, i) => ({
        id: "rel-" + i,
        subject: biz.id,
        predicate: "offers",
        object: id,
        status: "active" as const,
        createdAt: "2026-09-21T00:00:00Z",
        evidenceRef: "test",
      })),
    };
  }

  function recordServiceOrder(ids: string[]) {
    applyOwnerCommand(
      SITE,
      { type: "move-service", id: ids[0], to: "first" },
      ids,
      NAMES,
    );
  }

  test("service order naming only renamed services is orphaned with the owner-facing warning", () => {
    recordServiceOrder(["svc-a", "svc-b"]);
    // Against the graph the correction was recorded on: applies, no warning.
    expect(detectOrphanedCorrections(graphWithServices(["svc-a", "svc-b"]), SITE)).toEqual([]);
    // The source re-observes with renamed services: the correction now
    // applies to nothing (the Mission O seq-12 shape).
    const orphans = detectOrphanedCorrections(graphWithServices(["svc-x", "svc-y"]), SITE);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].reason).toBe("service-order-orphaned");
    expect(orphans[0].target).toBe("services:order");
    expect(orphans[0].correction).toBeNull();
    expect(orphans[0].detail).toContain(
      "This correction does not apply to anything. It may reference a deleted or renamed item.",
    );
  });

  test("service order that still names a current service is not orphaned", () => {
    recordServiceOrder(["svc-a", "svc-b"]);
    // One service renamed, one still current: the correction still applies.
    expect(detectOrphanedCorrections(graphWithServices(["svc-b", "svc-c"]), SITE)).toEqual([]);
  });

  test("empty service order is never orphaned", () => {
    expect(detectOrphanedCorrections(graphWithServices(["svc-x"]), SITE)).toEqual([]);
  });

  test("hidden service that no longer exists is orphaned", () => {
    applyOwnerCommand(
      SITE,
      { type: "set-service-visibility", id: "svc-a", visible: false },
      ["svc-a", "svc-b"],
      NAMES,
    );
    expect(detectOrphanedCorrections(graphWithServices(["svc-a", "svc-b"]), SITE)).toEqual([]);
    const orphans = detectOrphanedCorrections(graphWithServices(["svc-x"]), SITE);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].reason).toBe("service-visibility-orphaned");
    expect(orphans[0].target).toBe("service:svc-a");
    expect(orphans[0].detail).toContain(
      "This correction does not apply to anything. It may reference a deleted or renamed item.",
    );
  });

  test("field corrections orphaned by the overlay surface through detection too", () => {
    applyOwnerCommand(
      SITE,
      { type: "set-contact-field", field: "phone", value: OWNER_PHONE },
      [],
      new Map(),
      { sourceValue: SOURCE_PHONE },
    );
    // A refresh that drops the business object orphans the field correction.
    const orphans = detectOrphanedCorrections({ objects: [], relationships: [] }, SITE);
    expect(
      orphans.some(
        (o) => o.reason === "no-business-object" && o.target === "contact:phone",
      ),
    ).toBe(true);
  });

  test("detection never writes to the journal", () => {
    recordServiceOrder(["svc-a", "svc-b"]);
    const dir = process.env.FYD_OWNER_DIR!;
    const before = readdirSync(dir).sort();
    const snapshot = new Map(
      before.map((f) => [f, readFileSync(join(dir, f), "utf8")] as const),
    );
    detectOrphanedCorrections(graphWithServices(["svc-x"]), SITE);
    detectOrphanedCorrections(graphWithServices(["svc-a", "svc-b"]), SITE);
    const after = readdirSync(dir).sort();
    expect(after).toEqual(before);
    for (const f of after) {
      expect(readFileSync(join(dir, f), "utf8")).toBe(snapshot.get(f));
    }
  });
});
'''

assert src.rstrip().endswith("});"), "unexpected test file tail"
src = src.rstrip("\n") + "\n" + addition
open(PATH, "w", encoding="utf-8").write(src)
print("owner-overlay.test.ts edited OK")
