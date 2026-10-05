/**
 * FALSIFICATION LANE - Arrow 2: FYD intent -> mission intake.
 *
 * Edge-map claim under test: "an Ask FYD SitePatchIntent reaches a mission."
 * This test asserts the bridge EXISTS. It is EXPECTED TO FAIL, and it must
 * fail for exactly one honest reason: zero code turns a SitePatchIntent into
 * a mission-intake call. No caller exists in the ask/intent modules, and no
 * FYD-side dispatch route exists. Do NOT "fix" this test by wiring anything;
 * wiring belongs to a decision-backed integration lane.
 *
 * Run with: npx jest src/fyd/ask/__tests__/arrow2-intent-to-mission.falsification.test.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAskFydContext } from "../context-builder";
import { grantsForViewer } from "../../../lib/ping/grants";
import { detectSitePatchIntent } from "../site-patch";
import type { PingObject } from "../../../lib/ping/types";
import type { SiteSpecSummary } from "../site-spec";
import type { AskFydContextInput } from "../types";

const ALICE = "alice-test-id";

function makeObject(overrides: Partial<PingObject> = {}): PingObject {
  return {
    id: "obj-1",
    schema: "ping.social.business@1",
    controllerId: ALICE,
    visibility: "public",
    title: "Alice Electric",
    description: "Electrical services in Grand Junction.",
    fields: {},
    provenance: { kind: "canonical-journal", ref: "evt-test-1", derivedAt: "2026-09-21T00:00:00.000Z" },
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    ...overrides,
  };
}

function makeService(id: string, title: string): PingObject {
  return makeObject({ id, schema: "ping.social.service@1", title, controllerId: ALICE });
}

function makeSpec(): SiteSpecSummary {
  return {
    siteId: "obj-1",
    pageSlug: "home",
    digest: "a".repeat(64),
    page: {
      slug: "home",
      title: "Alice Electric",
      navLabel: "Home",
      sections: [
        {
          id: "home:Services:1",
          component: "Services",
          query: { kind: "all", schema: "ping.social.service@1" },
          presentation: {},
        },
      ],
    },
    sectionObjects: { "home:Services:1": ["svc-plumbing", "svc-electrical"] },
    presentation: { "home:Services:1": { featuredIds: [] } },
  };
}

function makeCtx(overrides: Partial<AskFydContextInput> = {}) {
  const target = makeObject();
  const related = [makeService("svc-electrical", "Electrical"), makeService("svc-plumbing", "Plumbing")];
  return buildAskFydContext({
    viewer: { id: ALICE, displayName: "Alice" },
    target,
    relatedObjects: related,
    relationships: [],
    plan: null,
    grants: grantsForViewer({ viewerId: ALICE, controllerId: ALICE, isSite: true }),
    siteSpec: makeSpec(),
    question: "Put my electrical services first",
    ...overrides,
  });
}

/** Every module that touches the intent on its FYD-side path. */
const INTENT_PATH_FILES = [
  "fyd/ask/site-patch.ts",
  "fyd/ask/answer.ts",
  "fyd/ask/types.ts",
  "app/api/ping/proposal/route.ts",
];

function intentPathSource(): string {
  const root = join(__dirname, "../../..");
  return INTENT_PATH_FILES.map((f) => readFileSync(join(root, f), "utf8")).join("\n");
}

describe("Arrow 2 falsification: SitePatchIntent -> mission intake", () => {
  it("a SitePatchIntent is detectable (the arrow's input exists)", () => {
    const ctx = makeCtx();
    const intent = detectSitePatchIntent(ctx, "Put my electrical services first");
    expect(intent).not.toBeNull();
    expect(intent).toEqual({ kind: "reorder_services_first", serviceName: "electrical services" });
  });

  it("the intent path contains a caller to mission intake (THIS SHOULD FAIL: no caller exists)", () => {
    // The two candidate intake endpoints are the FYD-side POST /api/mc/dispatch
    // and the PING gateway POST /missions. A bridge requires the intent path to
    // reference one of them (or a named dispatch helper that does).
    const src = intentPathSource();
    expect(src).toMatch(/\/api\/mc\/dispatch|\/missions|dispatchMission|createMission|submitMission/);
  });

  it("a FYD-side mission dispatch route exists (THIS SHOULD FAIL: no route exists)", () => {
    const root = join(__dirname, "../../..");
    expect(existsSync(join(root, "app/api/mc/dispatch/route.ts"))).toBe(true);
  });
});
