/**
 * Falsification probe for visibility-composeObjectView-bypass (BACKLOG_PING).
 *
 * composeObjectView() composes the public ObjectView (contact block,
 * capabilities, sample questions) from the raw PING-backed graph. The
 * site renderer applies the digest-verified owner field-visibility
 * decisions (loadCustomizedSite -> applyFieldVisibility); this path did
 * not, so an owner-hidden phone/email leaked through the ObjectView and
 * the Circle projection. Same defect class as the fixed publicGraphOf
 * hardcode (visibility-publicgraphof-visibility).
 *
 * Probe: a projection whose digest-verified fieldVisibility block hides
 * the business phone must not surface the phone in contact.phone or in a
 * tel: call capability. Run from the repo root so manifests resolve via
 * process.cwd().
 */

import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { composeObjectView, loadObjectView } from "../view";

const PROJECTIONS = join(__dirname, "fixtures", "projections");
const BUSINESS_ID = "website-business-6fa5ebd99d72c4cb";
const PHONE = "+15412865190";
const EMAIL = "taylor@happyplacecarpentry.com";

/**
 * Canonical JSON for digest recomputation: recursive key sort, array
 * order preserved. Mirrors src/lib/ping/ask-composer.ts canonicalize
 * (same mirror as by-id.test.ts); the lane's ts-jest config has no @/
 * path mapping, so the probe stays import-clean.
 */
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(rec[k])}`).join(",")}}`;
  }
  return "null";
}

/**
 * Byte-copy of the happy-place fixture with a digest-verified
 * fieldVisibility block hiding the business phone. Graph bytes are
 * untouched, so the existing graphDigest still verifies.
 */
function projectionWithHiddenPhone(): string {
  const dir = mkdtempSync(join(tmpdir(), "fyd-vis-probe-"));
  const doc = JSON.parse(
    readFileSync(join(PROJECTIONS, "happy-place.json"), "utf8"),
  );
  const block = {
    decisions: [
      {
        objectId: BUSINESS_ID,
        field: "phone",
        policy: "hide",
        version: 1,
        proposalDigest: "probe",
        approval: {
          proposalDigest: "probe",
          approvedBy: "probe",
          approvedAt: "2026-09-26T19:00:00.000Z",
          note: "probe",
        },
      },
    ],
    provenance: { kind: "owner-field-visibility", note: "probe", eventIds: [] },
  };
  doc.fieldVisibility = block;
  doc.meta.fieldVisibilityDigest = createHash("sha256")
    .update(canonicalize(block), "utf8")
    .digest("hex");
  writeFileSync(join(dir, "happy-place.json"), JSON.stringify(doc));
  return dir;
}

beforeEach(() => {
  // Isolate owner state so tests never touch real demo data.
  process.env.FYD_OWNER_DIR = mkdtempSync(join(tmpdir(), "fyd-vis-probe-owner-"));
});

test("baseline: no visibility block -> phone surfaces (control)", () => {
  process.env.FYD_PROJECTION_DIR = PROJECTIONS;
  const view = loadObjectView("happy-place");
  expect(view).not.toBeNull();
  expect(view!.contact.phone).toBe(PHONE);
  expect(view!.capabilities.some((c) => c.kind === "call")).toBe(true);
});

test("owner-hidden phone does not leak through loadObjectView", () => {
  process.env.FYD_PROJECTION_DIR = projectionWithHiddenPhone();
  const view = loadObjectView("happy-place");
  expect(view).not.toBeNull();
  expect(view!.contact.phone).toBeNull();
  expect(view!.capabilities.some((c) => c.kind === "call")).toBe(false);
  // Untouched fields still surface.
  expect(view!.contact.email).toBe(EMAIL);
});

describe("composeObjectView visibility opts", () => {
  type PingObject = import("../../../lib/ping/types").PingObject;
  type ObjectGraph = import("../../sitespec/types").ObjectGraph;
  type FieldVisibilityDecision =
    import("../../sitespec/field-visibility").FieldVisibilityDecision;

  function fixtureGraph(): { graph: ObjectGraph; business: PingObject } {
    const doc = JSON.parse(
      readFileSync(join(PROJECTIONS, "happy-place.json"), "utf8"),
    );
    const graph = doc.graph as ObjectGraph;
    const business = graph.objects.find(
      (o) => o.id === BUSINESS_ID,
    ) as PingObject;
    return { graph, business };
  }

  function hidePhone(policy: "hide" | "members"): FieldVisibilityDecision {
    return {
      objectId: BUSINESS_ID,
      field: "phone",
      policy,
      decidedBy: "owner",
      decidedAt: "2026-09-26T19:00:00.000Z",
      source: "owner_override",
      version: 1,
    };
  }

  const PUBLIC = { viewerId: null, displayName: null, role: "public" as const };

  test("hide decision drops the phone for public viewers", () => {
    const { graph, business } = fixtureGraph();
    const view = composeObjectView(graph, "happy-place", business, "happy-place", "happy-place", {
      decisions: [hidePhone("hide")],
      viewer: PUBLIC,
    });
    expect(view.contact.phone).toBeNull();
    expect(view.capabilities.some((c) => c.kind === "call")).toBe(false);
    expect(view.contact.email).toBe(EMAIL);
  });

  test("members decision: hidden for public, visible for members", () => {
    const { graph, business } = fixtureGraph();
    const pub = composeObjectView(graph, "happy-place", business, "happy-place", "happy-place", {
      decisions: [hidePhone("members")],
      viewer: PUBLIC,
    });
    expect(pub.contact.phone).toBeNull();
    const mem = composeObjectView(graph, "happy-place", business, "happy-place", "happy-place", {
      decisions: [hidePhone("members")],
      viewer: { viewerId: "m1", displayName: "Member", role: "member" },
    });
    expect(mem.contact.phone).toBe(PHONE);
  });

  test("owner viewer sees source values verbatim (owner preview)", () => {
    const { graph, business } = fixtureGraph();
    const view = composeObjectView(graph, "happy-place", business, "happy-place", "happy-place", {
      decisions: [hidePhone("hide")],
      viewer: { viewerId: "o1", displayName: "Owner", role: "owner" },
    });
    expect(view.contact.phone).toBe(PHONE);
  });

  test("no opts: backward compatible, phone surfaces", () => {
    const { graph, business } = fixtureGraph();
    const view = composeObjectView(graph, "happy-place", business, "happy-place", "happy-place");
    expect(view.contact.phone).toBe(PHONE);
  });

  test("source graph is not mutated by composition", () => {
    const { graph, business } = fixtureGraph();
    composeObjectView(graph, "happy-place", business, "happy-place", "happy-place", {
      decisions: [hidePhone("hide")],
      viewer: PUBLIC,
    });
    const after = graph.objects.find((o) => o.id === BUSINESS_ID) as PingObject;
    expect((after.fields as Record<string, unknown>)["phone"]).toBe(PHONE);
  });
});
