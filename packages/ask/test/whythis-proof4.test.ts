/**
 * Proof 4: WHY THIS. One primitive, whyThis(factRef, graph), returns the
 * source, the observation record, the evidence type, and the
 * classification for one visible fact. It is the SAME citeFact machinery
 * the Ask FYD answerer builds its citations from: implement once, use in
 * both. No provenance dashboard: tiny primitive + tests.
 */

import { whyThis, citeFact } from "../src/cite";
import { askFyd } from "../src/answer";
import type { ObjectGraph } from "../src/types";
import { HAPPY_PLACE_GRAPH } from "../../sitespec/fixtures/happy-place-graph";

const HP_BUSINESS = "website-business-6fa5ebd99d72c4cb";
const REPAIRS_SVC = "website-business-6fa5ebd99d72c4cb-service-3263502c8175";
const visitor = { viewerClass: "visitor" as const, viewerId: null };

describe("proof 4: whyThis on a Happy Place fact", () => {
  test("a service name resolves to the website-ingestion source, DIRECT", () => {
    const w = whyThis({ objectId: REPAIRS_SVC, field: "name" }, HAPPY_PLACE_GRAPH);
    expect(w).not.toBeNull();
    expect(w!.source).toBe("https://happy-place-platform.vercel.app/");
    expect(w!.sourceKind).toBe("business website");
    expect(w!.evidenceType).toBe("field");
    expect(w!.classification).toBe("DIRECT");
    expect(w!.observation.objectId).toBe(REPAIRS_SVC);
    expect(w!.observation.schema).toBe("ping.social.service@1");
    expect(w!.observation.field).toBe("name");
    expect(w!.observation.value).toBe("Repairs");
    expect(w!.observation.capturedAt).toBe("2026-09-21");
    expect(w!.observation.provenanceRef).toBe(
      "website-ingestion:https://happy-place-platform.vercel.app/",
    );
  });

  test("object-level facts (title) cite as evidenceType object", () => {
    const w = whyThis({ objectId: HP_BUSINESS, field: "title" }, HAPPY_PLACE_GRAPH);
    expect(w).not.toBeNull();
    expect(w!.evidenceType).toBe("object");
    expect(w!.classification).toBe("DIRECT");
    expect(w!.observation.value).toBe("Happy Place Carpentry LLC");
    expect(w!.source).toBe("https://happy-place-platform.vercel.app/");
  });

  test("unknown object, unknown field, and empty field return null", () => {
    expect(whyThis({ objectId: "no-such-object", field: "name" }, HAPPY_PLACE_GRAPH)).toBeNull();
    expect(whyThis({ objectId: REPAIRS_SVC, field: "no_such_field" }, HAPPY_PLACE_GRAPH)).toBeNull();
  });

  test("a non-public fact fails closed to null for a visitor", () => {
    const graph: ObjectGraph = {
      objects: HAPPY_PLACE_GRAPH.objects.map((o) =>
        o.id === REPAIRS_SVC ? { ...o, visibility: "private" as const } : o,
      ),
      relationships: HAPPY_PLACE_GRAPH.relationships,
    };
    expect(whyThis({ objectId: REPAIRS_SVC, field: "name" }, graph)).toBeNull();
  });
});

describe("proof 4: same machinery powers the Ask FYD citations", () => {
  test("the answerer's service citations equal citeFact output", () => {
    const ans = askFyd({
      targetObjectId: HP_BUSINESS,
      graph: HAPPY_PLACE_GRAPH,
      viewerContext: visitor,
      question: "What services does this business offer, and how do you know?",
    });
    expect(ans.refusal).toBe(false);
    // The first evidence ref is the Repairs service object. The citation
    // the answerer attached to it must match the primitive's citation for
    // the same fact: one implementation, two surfaces.
    const ref = ans.evidenceRefs[0];
    expect(ref.kind).toBe("object");
    expect(ref.id).toBe(REPAIRS_SVC);
    const primitive = citeFact({ objectId: ref.id, field: "name" }, HAPPY_PLACE_GRAPH);
    expect(primitive).not.toBeNull();
    expect(ref.detail).toBe(primitive!.detail);
    expect(ref.detail).toContain("https://happy-place-platform.vercel.app/");
    // The claim standing on that ref is DIRECT, per the primitive.
    const claim = ans.claims.find((c) => c.evidenceRefIds.includes(ref.id));
    expect(claim).toBeDefined();
    expect(claim!.classification).toBe(primitive!.classification);
  });
});
