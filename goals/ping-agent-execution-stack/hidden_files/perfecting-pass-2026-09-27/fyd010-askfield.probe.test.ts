/**
 * FYD-010 falsification probe (ping-perfecting-pass, 2026-09-26, local plane).
 *
 * Invariant under test (BACKLOG_PING.md FYD-010 / NOW-5): field-level
 * privacy gate for Ask FYD. Public viewer context + hidden owner field
 * (phone / home address) -> the answer/context must not reveal it; owner
 * context -> it does.
 *
 * This probe runs against the fyd-build working copy
 * (~/workspace/fyd-build), the lane copy carrying the ask/evidence
 * machinery per the FYD-009 scope note. Scope is the WORKING COPY, not a
 * clean-checkout replay (see MEMORY.md 2026-09-26 lane self-report lesson).
 *
 * CASE A asserts the DESIRED invariant for a visitor: the built context
 * must not carry the hidden phone/home_address fields. A FAIL here is the
 * finding: the ask path has no field-level gate (context-builder.ts
 * filters whole objects via canSee; policy.ts filterGraphForViewer leaves
 * fields untouched by design comment).
 * CASE B asserts owner (demo_owner, this lane's owner-context label) still
 * sees the fields.
 */
import { buildAskFydContext } from "/home/hatch/workspace/fyd-build/src/fyd/ask/context-builder";
import type { PingObject } from "/home/hatch/workspace/fyd-build/src/lib/ping/types";
import type { AskFydContextInput } from "/home/hatch/workspace/fyd-build/src/fyd/ask/types";

const HIDDEN_PHONE = "+1-970-555-0142";
const HIDDEN_ADDRESS = "123 Main St, Grand Junction, CO 81501";

function businessObject(): PingObject {
  return {
    id: "website-business-probe010",
    schema: "ping.social.business@1",
    controllerId: "probe-fyd010",
    visibility: "public",
    title: "Probe Plumbing Co",
    description: "A probe fixture business.",
    fields: {
      website: "https://example.com",
      phone: HIDDEN_PHONE,
      home_address: HIDDEN_ADDRESS,
    },
    createdAt: "2026-09-26T00:00:00Z",
    updatedAt: "2026-09-26T00:00:00Z",
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://example.com",
      derivedAt: "2026-09-26T00:00:00Z",
    },
  };
}

function inputFor(mode: "visitor" | "demo_owner"): AskFydContextInput {
  return {
    viewer: { id: null, displayName: null, mode },
    targetObject: businessObject(),
    question: "What services do you offer?",
    relatedObjects: [],
    relationships: [],
    evidenceRefs: [],
    visibility: "public",
    allowedCapabilities: [],
  };
}

describe("FYD-010 field-level privacy gate (probe)", () => {
  test("CASE A: visitor context must not carry hidden owner fields", () => {
    const ctx = buildAskFydContext(inputFor("visitor"));
    expect(ctx.targetObject).not.toBeNull();
    const fields = ctx.targetObject!.fields;
    expect(fields["phone"]).toBeUndefined();
    expect(fields["home_address"]).toBeUndefined();
  });

  test("CASE B: demo_owner context still sees the owner fields", () => {
    const ctx = buildAskFydContext(inputFor("demo_owner"));
    expect(ctx.targetObject).not.toBeNull();
    const fields = ctx.targetObject!.fields;
    expect(fields["phone"]).toBe(HIDDEN_PHONE);
    expect(fields["home_address"]).toBe(HIDDEN_ADDRESS);
  });
});
