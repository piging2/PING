/**
 * ADVERSARIAL authority-boundary tests (Nolan 12-point program, point 3, owner lane).
 *
 * What this file proves:
 * - A visitor (public viewer identity) can READ the public projection but
 *   cannot mutate canonical owner state through any public path. The public
 *   paths are pure projections; mutating their output never reaches the
 *   canonical graph or the assertion store.
 * - An unverified "owner" claim classifies to visitor and gets the identical
 *   projection (zero-canary rule): private values never enter the answer
 *   path for ANY viewer class.
 * - Ask FYD must never convert an INFERRED pipeline classification into a
 *   DIRECT fact claim. One invariant FAILS today (marked); the failure is
 *   evidence, not a gap in the test.
 * - The demo owner context (DEMO_OWNER_CONTEXT, verified: false literal)
 *   can never satisfy the verified-owner gate. Authorization fails closed.
 * - Invalid owner corrections fail closed: typed refusals for bad ops,
 *   orphaned-not-dropped for refs the current extraction cannot resolve.
 * - Secret-looking values in private context never enter a public artifact:
 *   the ask projection drops non-allowlisted fields and non-public
 *   objects; the visibility rule floors private source visibility to
 *   hidden and the projection drops hidden facts.
 * - An owner correction outranks regenerated presentation where policy
 *   says so: the owner's value stays applied and source drift is an
 *   explicit conflict record, never silent.
 *
 * No production code is touched by this file. DEMO_OWNER_CONTEXT is used
 * explicitly wherever owner provenance is needed; nothing here fakes
 * production authentication.
 */
import { askFyd } from "../../ask/src/answer";
import type {
  AskInput,
  AskPingObject,
  AskPingRelationship,
  ObjectGraph as AskGraph,
} from "../../ask/src/types";
import {
  classifyAskViewer,
  projectGraphForViewer,
} from "../../ask/src/viewer";
import {
  applyCorrections,
  assertCorrection,
  extractGraphFacts,
} from "../src/corrections";
import {
  DemoIdentityProvider,
  OwnerAuthorizationError,
  isDemoContext,
  requireVerifiedOwner,
} from "../src/identity";
import { DEMO_OWNER_LABEL, demoProvenance } from "../src/provenance";
import { effectiveVisibility, projectPublicGraph } from "../src/visibility";
import type { ObjectGraph } from "../../sitespec/src/types";

const NOW = "2026-10-02T16:00:00.000Z";
const PHONE_X = "+19705550100";
const PHONE_Y = "+19705550199";
const PHONE_Z = "+19705550222";

function ownerGraph(phone: string): ObjectGraph {
  return {
    objects: [
      {
        id: "biz-1",
        schema: "ping.social.business@1",
        controllerId: "web:https://example.com/",
        visibility: "public",
        title: "Example Plumbing",
        description: "A plumbing business.",
        fields: { phone, email: "hello@example.com" },
        createdAt: NOW,
        updatedAt: NOW,
        provenance: {
          kind: "website-derived",
          ref: "website-ingestion:https://example.com/",
          derivedAt: NOW,
        },
      },
    ],
    relationships: [],
  };
}

function svcObject(
  id: string,
  title: string,
  claimKind: string,
): AskPingObject {
  return {
    id,
    schema: "ping.social.service@1",
    controllerId: "web:https://example.com/",
    visibility: "public",
    title,
    description: title + " description.",
    fields: {
      name: title,
      claimKind,
      service_href: "https://example.com/" + id,
    },
    createdAt: NOW,
    updatedAt: NOW,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://example.com/",
      derivedAt: NOW,
    },
  };
}

function offersRel(id: string, objectId: string): AskPingRelationship {
  return {
    id,
    subject: "biz-1",
    predicate: "offers",
    object: objectId,
    status: "active",
    createdAt: NOW,
    evidenceRef: "test:rel:" + id,
  };
}

function askGraph(): AskGraph {
  const biz: AskPingObject = {
    id: "biz-1",
    schema: "ping.social.business@1",
    controllerId: "web:https://example.com/",
    visibility: "public",
    title: "Example Plumbing",
    description: "A plumbing business.",
    fields: {
      name: "Example Plumbing",
      phone: "+19705550100",
      claimKind: "website_statement",
    },
    createdAt: NOW,
    updatedAt: NOW,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://example.com/",
      derivedAt: NOW,
    },
  };
  const privateBiz: AskPingObject = {
    id: "biz-private",
    schema: "ping.social.business@1",
    controllerId: "web:https://internal.example.com/",
    visibility: "private",
    title: "Internal Only",
    description: "Not for the public site.",
    fields: {
      name: "Internal Only",
      claimKind: "website_statement",
      internal_api_key: "sk-live-ADVERSARIAL-SECRET-002",
    },
    createdAt: NOW,
    updatedAt: NOW,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://internal.example.com/",
      derivedAt: NOW,
    },
  };
  return {
    objects: [
      biz,
      svcObject("svc-direct", "Drain Cleaning", "website_statement"),
      svcObject("svc-inferred", "Inferred Service", "INFERENCE"),
      privateBiz,
    ],
    relationships: [
      offersRel("rel-1", "svc-direct"),
      offersRel("rel-2", "svc-inferred"),
    ],
  };
}

function secretFieldGraph(): AskGraph {
  const g = askGraph();
  const svc = g.objects.find((o) => o.id === "svc-direct");
  if (svc) {
    svc.fields = {
      ...svc.fields,
      internal_api_key: "sk-live-ADVERSARIAL-SECRET-001",
      ssn: "000-00-0001",
    };
  }
  return g;
}

function askInput(graph: AskGraph): AskInput {
  return {
    targetObjectId: "biz-1",
    graph,
    viewerContext: { viewerClass: "visitor", viewerId: null },
    question: "What services do they offer?",
  };
}

// ---------------------------------------------------------------------------
// A. The visitor can read the public projection but cannot mutate owner
//    state through the public path.
// ---------------------------------------------------------------------------

describe("authority: visitor read vs owner mutation", () => {
  test("mutating the public projection never reaches canonical owner state", () => {
    const graph = ownerGraph(PHONE_X);
    const assertion = assertCorrection({
      factRef: { objectId: "biz-1", field: "phone" },
      op: "CORRECT",
      value: PHONE_Y,
      provenance: demoProvenance(null, () => NOW),
      sourceValueSeen: PHONE_X,
    });
    const corrected = applyCorrections(graph, [assertion]);
    expect(corrected.graph.objects[0].fields["phone"]).toBe(PHONE_Y);

    // The public path: project, then ATTACK the projection output.
    const pub = projectPublicGraph(corrected.graph, corrected.hiddenFactIds);
    pub.objects[0].fields["phone"] = "MUTATED-BY-VISITOR";
    pub.objects[0].fields["injected"] = "not-owner-data";

    // Canonical state is untouched: the projection is a detached copy.
    expect(corrected.graph.objects[0].fields["phone"]).toBe(PHONE_Y);
    expect(
      "injected" in corrected.graph.objects[0].fields,
    ).toBe(false);
    expect(corrected.hiddenFactIds).toEqual([]);
    // The input graph was never mutated either.
    expect(graph.objects[0].fields["phone"]).toBe(PHONE_X);
  });

  test("an unverified owner claim classifies to visitor and gets the identical projection", () => {
    const graph = askGraph();
    const unverified = { id: "mallory", displayName: null, verified: false };
    expect(classifyAskViewer(unverified)).toBe("visitor");
    expect(classifyAskViewer(null)).toBe("visitor");
    expect(classifyAskViewer(undefined)).toBe("visitor");
    expect(
      classifyAskViewer({ id: "owner-1", displayName: null, verified: true }),
    ).toBe("owner");

    const asVisitor = projectGraphForViewer(graph, unverified);
    const asNull = projectGraphForViewer(graph, null);
    const asVerifiedOwner = projectGraphForViewer(graph, {
      id: "owner-1",
      displayName: null,
      verified: true,
    });
    // Zero-canary: the projection is identical for every viewer class.
    expect(asVisitor.viewerClass).toBe("visitor");
    expect(asVisitor.graph).toEqual(asNull.graph);
    expect(asVerifiedOwner.graph).toEqual(asNull.graph);
    // Private objects never survive, for any viewer.
    expect(
      asVisitor.graph.objects.some((o) => o.id === "biz-private"),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// B. Ask FYD must never convert inference into fact.
// ---------------------------------------------------------------------------

describe("authority: inference is never emitted as fact", () => {
  test("INVARIANT [FAILS TODAY]: an INFERRED classification is never emitted as a DIRECT fact claim", () => {
    const answer = askFyd(askInput(askGraph()));
    expect(answer.refusal).toBe(false);
    const inferredClaim = answer.claims.find((c) =>
      c.claim.includes("Inferred Service"),
    );
    expect(inferredClaim).toBeDefined();
    // The pipeline classified this service INFERENCE. The answerer's
    // per-service claim currently hardcodes classification DIRECT
    // (packages/ask/src/answer.ts), converting the labeled inference
    // into a recorded fact. The citation for the same object already
    // says INFERRED ("Inferred from the site data"); the claim
    // disagrees with its own evidence.
    expect(inferredClaim && inferredClaim.classification).toBe("INFERRED");
  });

  test("honest classes survive: website_statement stays DIRECT, the count stays DERIVED", () => {
    const answer = askFyd(askInput(askGraph()));
    const directClaim = answer.claims.find((c) =>
      c.claim.includes("Drain Cleaning"),
    );
    expect(directClaim && directClaim.classification).toBe("DIRECT");
    const countClaim = answer.claims.find((c) =>
      c.claim.includes("in total"),
    );
    expect(countClaim && countClaim.classification).toBe("DERIVED");
  });

  test("unsupported questions refuse instead of guessing", () => {
    const input = askInput(askGraph());
    input.question = "What is the owner's favorite color?";
    const answer = askFyd(input);
    expect(answer.refusal).toBe(true);
    expect(answer.claims).toEqual([]);
    expect(answer.unknowns.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// C. The demo context can never authorize owner capabilities.
// ---------------------------------------------------------------------------

describe("authority: identity seam fails closed", () => {
  test("the demo identity provider resolves unverified and the gate refuses it", async () => {
    const provider = new DemoIdentityProvider();
    const identity = await provider.resolveIdentity();
    expect(identity.verified).toBe(false);
    expect(isDemoContext(identity)).toBe(true);
    let code: string | null = null;
    try {
      requireVerifiedOwner(identity);
    } catch (e) {
      expect(e).toBeInstanceOf(OwnerAuthorizationError);
      code = (e as OwnerAuthorizationError).code;
    }
    expect(code).toBe("OWNER_NOT_VERIFIED");
  });

  test("null identity is refused", () => {
    expect(() => requireVerifiedOwner(null)).toThrow(OwnerAuthorizationError);
  });

  test("a genuinely verified identity passes the gate (logic check, not auth)", () => {
    const verified = {
      identityId: "owner-1",
      verified: true as const,
      method: "sso",
      note: "synthetic test identity; not production auth",
    };
    expect(requireVerifiedOwner(verified).identityId).toBe("owner-1");
  });
});

// ---------------------------------------------------------------------------
// D. Invalid owner corrections fail closed.
// ---------------------------------------------------------------------------

describe("authority: invalid corrections fail closed", () => {
  const prov = () => demoProvenance(null, () => NOW);

  test("CORRECT with an empty value is a typed refusal, never a record", () => {
    expect(() =>
      assertCorrection({
        factRef: { objectId: "biz-1", field: "phone" },
        op: "CORRECT",
        value: "   ",
        provenance: prov(),
      }),
    ).toThrow(/non-empty/);
  });

  test("CONFIRM and HIDE must not carry a value", () => {
    expect(() =>
      assertCorrection({
        factRef: { objectId: "biz-1", field: "phone" },
        op: "CONFIRM",
        value: PHONE_Y,
        provenance: prov(),
      }),
    ).toThrow(/does not take a value/);
    expect(() =>
      assertCorrection({
        factRef: { objectId: "biz-1", field: "phone" },
        op: "HIDE",
        value: PHONE_Y,
        provenance: prov(),
      }),
    ).toThrow(/does not take a value/);
  });

  test("a correction on a nonexistent object is orphaned, never applied, never dropped", () => {
    const graph = ownerGraph(PHONE_X);
    const ghost = assertCorrection({
      factRef: { objectId: "ghost-biz", field: "phone" },
      op: "CORRECT",
      value: PHONE_Y,
      provenance: prov(),
      sourceValueSeen: PHONE_X,
    });
    const result = applyCorrections(graph, [ghost]);
    expect(result.applied).toEqual([]);
    expect(result.orphaned).toHaveLength(1);
    expect(result.orphaned[0].reason).toContain("not in the current extraction");
    // The orphaned assertion is KEPT (returned), not dropped silently.
    expect(result.orphaned[0].assertionId).toBe(ghost.assertionId);
    // State is uncorrupted: the real object's phone is untouched.
    expect(result.graph.objects[0].fields["phone"]).toBe(PHONE_X);
  });

  test("a CORRECT on a non-read-seam field is orphaned, not laundered as direct evidence", () => {
    const graph = ownerGraph(PHONE_X);
    const a = assertCorrection({
      factRef: { objectId: "biz-1", field: "title" },
      op: "CORRECT",
      value: "Renamed Plumbing",
      provenance: prov(),
      sourceValueSeen: "Example Plumbing",
    });
    const result = applyCorrections(graph, [a]);
    expect(result.applied).toEqual([]);
    expect(result.orphaned).toHaveLength(1);
    expect(result.orphaned[0].reason).toContain("read seam");
    expect(result.graph.objects[0].title).toBe("Example Plumbing");
  });
});

// ---------------------------------------------------------------------------
// E. Secrets never enter the public projection.
// ---------------------------------------------------------------------------

describe("authority: redaction of private context", () => {
  test("non-allowlisted fields and private objects are absent from the ask projection", () => {
    const proj = projectGraphForViewer(secretFieldGraph(), null).graph;
    const text = JSON.stringify(proj);
    expect(text).not.toContain("ADVERSARIAL-SECRET-001");
    expect(text).not.toContain("ADVERSARIAL-SECRET-002");
    expect(text).not.toContain("000-00-0001");
    // The public phone survives; the private object does not.
    expect(text).toContain("+19705550100");
    expect(
      proj.objects.some((o) => o.id === "biz-private"),
    ).toBe(false);
  });

  test("the visibility rule floors private source visibility to hidden and the projection drops it", () => {
    const graph = ownerGraph(PHONE_X);
    graph.objects[0].visibility = "private";
    graph.objects[0].fields["internal_api_key"] =
      "sk-live-ADVERSARIAL-SECRET-003";
    // Drive the documented boundary: effectiveVisibility (source floor)
    // decides hidden for every fact of a private object; the projection
    // drops hidden facts.
    const hidden: string[] = [];
    for (const f of extractGraphFacts(graph)) {
      const v = effectiveVisibility({
        sourceVisibility: graph.objects[0].visibility as "private",
        systemDefault: "public",
        ownerOverride: null,
      });
      expect(v.visibility).toBe("hidden");
      expect(v.decidedBy).toBe("source");
      hidden.push(f.factId);
    }
    const pub = projectPublicGraph(graph, hidden);
    const text = JSON.stringify(pub);
    expect(text).not.toContain("ADVERSARIAL-SECRET-003");
    expect(text).not.toContain(PHONE_X);
  });
});

// ---------------------------------------------------------------------------
// F. Owner correction outranks regenerated presentation where policy says so.
// ---------------------------------------------------------------------------

describe("authority: owner correction outranks source drift", () => {
  test("source drift after a correction surfaces an explicit conflict; the owner value stays applied", () => {
    const corrected = applyCorrections(ownerGraph(PHONE_X), [
      assertCorrection({
        factRef: { objectId: "biz-1", field: "phone" },
        op: "CORRECT",
        value: PHONE_Y,
        provenance: demoProvenance(null, () => NOW),
        sourceValueSeen: PHONE_X,
      }),
    ]);
    // T2: the source re-observed and now says Z, which the owner never saw.
    const drifted = applyCorrections(ownerGraph(PHONE_Z), corrected.applied.length
      ? [
          assertCorrection({
            factRef: { objectId: "biz-1", field: "phone" },
            op: "CORRECT",
            value: PHONE_Y,
            provenance: demoProvenance(null, () => NOW),
            sourceValueSeen: PHONE_X,
          }),
        ]
      : []);
    expect(drifted.conflicts).toHaveLength(1);
    expect(drifted.conflicts[0]).toMatchObject({
      sourceValue: PHONE_Z,
      ownerValue: PHONE_Y,
    });
    // Policy: the owner's value stays applied. Nothing wins silently.
    expect(drifted.graph.objects[0].fields["phone"]).toBe(PHONE_Y);
    expect(drifted.conflicts[0].reason.length).toBeGreaterThan(0);
  });

  test("a source that adopted the owner value is not a conflict", () => {
    const a = assertCorrection({
      factRef: { objectId: "biz-1", field: "phone" },
      op: "CORRECT",
      value: PHONE_Y,
      provenance: demoProvenance(null, () => NOW),
      sourceValueSeen: PHONE_X,
    });
    const result = applyCorrections(ownerGraph(PHONE_Y), [a]);
    expect(result.conflicts).toEqual([]);
    expect(result.graph.objects[0].fields["phone"]).toBe(PHONE_Y);
    expect(result.applied).toHaveLength(1);
  });
});

describe("authority: provenance is attributable", () => {
  test("the corrected graph carries who asserted what and when", () => {
    const a = assertCorrection({
      factRef: { objectId: "biz-1", field: "phone" },
      op: "CORRECT",
      value: PHONE_Y,
      provenance: demoProvenance(null, () => NOW),
      sourceValueSeen: PHONE_X,
    });
    const result = applyCorrections(ownerGraph(PHONE_X), [a]);
    const rec = result.graph.objects[0].ownerFieldCorrections?.[0];
    expect(rec).toMatchObject({
      field: "phone",
      sourceValue: PHONE_X,
      ownerValue: PHONE_Y,
      actorLabel: DEMO_OWNER_LABEL,
      correctedAt: NOW,
    });
    expect(rec && rec.basis).toContain(a.assertionId);
  });
});
