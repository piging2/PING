/**
 * Proof 3: Ask FYD answers "What services does this business offer, and how
 * do you know?" from evidence, mechanically. No LLM in the answer path.
 *
 * (a) Happy Place: services returned, DIRECT classifications, evidence refs.
 * (b) Coppersmith: same question, same machinery, different graph.
 * (c) A question with no evidence ("What is the owner's home address?")
 *     is refused: UNKNOWN, never invented.
 * (d) A visitor cannot see non-public objects (fail closed, in code).
 */

import { askFyd } from "../src/answer";
import { projectGraphForViewer } from "../src/viewer";
import type { AskInput, ObjectGraph } from "../src/types";
import { HAPPY_PLACE_GRAPH } from "../../sitespec/fixtures/happy-place-graph";
import { COPPERSMITH_GRAPH } from "../../sitespec/fixtures/coppersmith-graph";

const HP_BUSINESS = "website-business-6fa5ebd99d72c4cb";
const COPPER_BUSINESS = "website-business-2f1327c09d622175";
const QUESTION = "What services does this business offer, and how do you know?";

const visitor = { viewerClass: "visitor" as const, viewerId: null };

function ask(graph: ObjectGraph, targetObjectId: string, question = QUESTION): ReturnType<typeof askFyd> {
  const input: AskInput = { targetObjectId, graph, viewerContext: visitor, question };
  return askFyd(input);
}

describe("proof 3a: Happy Place services question", () => {
  test("answers from evidence: 5 DIRECT service claims + 1 DERIVED count claim", () => {
    const ans = ask(HAPPY_PLACE_GRAPH, HP_BUSINESS);
    expect(ans.refusal).toBe(false);
    expect(ans.answerState).toBe("KNOWN");
    expect(ans.unknowns).toEqual([]);

    // Deterministic id order: Repairs, Fencing, Painting, Drywall, Restoration.
    const direct = ans.claims.filter((c) => c.classification === "DIRECT");
    expect(direct.map((c) => c.claim)).toEqual([
      "Happy Place Carpentry LLC offers Repairs.",
      "Happy Place Carpentry LLC offers Fencing.",
      "Happy Place Carpentry LLC offers Painting.",
      "Happy Place Carpentry LLC offers Drywall.",
      "Happy Place Carpentry LLC offers Restoration.",
    ]);
    const derived = ans.claims.filter((c) => c.classification === "DERIVED");
    expect(derived).toHaveLength(1);
    expect(derived[0].claim).toBe(
      "Happy Place Carpentry LLC offers 5 services in total.",
    );
    expect(ans.claims).toHaveLength(6);
  });

  test("every claim's evidenceRefIds resolve to served evidence refs", () => {
    const ans = ask(HAPPY_PLACE_GRAPH, HP_BUSINESS);
    const served = new Set(ans.evidenceRefs.map((r) => r.id));
    expect(served.size).toBe(10); // 5 service objects + 5 offers relationships
    for (const claim of ans.claims) {
      expect(claim.evidenceRefIds.length).toBeGreaterThan(0);
      for (const id of claim.evidenceRefIds) {
        expect(served.has(id)).toBe(true);
      }
    }
  });

  test("answer-text [n] markers resolve 1-based into evidenceRefs", () => {
    // Regression: the answer used to number markers per service ([i+1])
    // while pushing two refs per service, so every marker past [1]
    // resolved to the previous service's offers-relationship record.
    // The types.ts contract: marker [n] -> evidenceRefs[n-1].
    const ans = ask(HAPPY_PLACE_GRAPH, HP_BUSINESS);
    const services = ["Repairs", "Fencing", "Painting", "Drywall", "Restoration"];
    services.forEach((svc, i) => {
      expect(ans.answer).toContain(`${svc} [${2 * i + 1}]`);
      const ref = ans.evidenceRefs[2 * i + 1 - 1];
      expect(ref.kind).toBe("object");
      expect(ref.label).toBe(`Service: ${svc}`);
      // The even position is the offers-relationship record for the
      // SAME service, cited by the claim's evidenceRefIds.
      const relRef = ans.evidenceRefs[2 * i + 1];
      expect(relRef.kind).toBe("relationship");
      expect(relRef.label).toBe(`Happy Place Carpentry LLC offers ${svc}`);
    });
  });

  test("answer text names the services and the website-ingestion source", () => {
    const ans = ask(HAPPY_PLACE_GRAPH, HP_BUSINESS);
    for (const svc of ["Repairs", "Fencing", "Painting", "Drywall", "Restoration"]) {
      expect(ans.answer).toContain(svc);
    }
    expect(ans.answer).toContain("https://happy-place-platform.vercel.app/");
    expect(ans.answer).toContain("How FYD knows");
    expect(ans.evidenceRefs[0].detail).toContain(
      "https://happy-place-platform.vercel.app/",
    );
  });
});

describe("proof 3b: Coppersmith, identical machinery, different graph", () => {
  test("4 services, DIRECT, evidence refs, website source", () => {
    const ans = ask(COPPERSMITH_GRAPH, COPPER_BUSINESS);
    expect(ans.refusal).toBe(false);
    expect(ans.answerState).toBe("KNOWN");
    const direct = ans.claims.filter((c) => c.classification === "DIRECT");
    expect(direct.map((c) => c.claim)).toEqual([
      "Coppersmith Plumbing - HVAC - Mechanical offers Plumbing.",
      "Coppersmith Plumbing - HVAC - Mechanical offers Heating & Cooling.",
      "Coppersmith Plumbing - HVAC - Mechanical offers HVAC.",
      "Coppersmith Plumbing - HVAC - Mechanical offers Ventilation.",
    ]);
    const derived = ans.claims.filter((c) => c.classification === "DERIVED");
    expect(derived).toHaveLength(1);
    expect(derived[0].claim).toBe(
      "Coppersmith Plumbing - HVAC - Mechanical offers 4 services in total.",
    );
    // The person and external-profile objects are not services: they never
    // appear as service claims.
    for (const claim of ans.claims) {
      expect(claim.claim).not.toContain("coppersmithplm");
    }
    expect(ans.answer).toContain("https://www.coppersmithplumbing.com/");
    expect(ans.unknowns).toEqual([]);
  });
});

describe("proof 3c: no evidence means refusal, never invention", () => {
  test("the owner's home address is refused as UNKNOWN", () => {
    const ans = ask(HAPPY_PLACE_GRAPH, HP_BUSINESS, "What is the owner's home address?");
    expect(ans.refusal).toBe(true);
    expect(ans.answerState).toBe("UNKNOWN");
    expect(ans.claims).toEqual([]);
    expect(ans.evidenceRefs).toEqual([]);
    expect(ans.unknowns.length).toBeGreaterThan(0);
    expect(ans.answer).toContain("FYD does not have evidence");
  });

  test("the refusal invents nothing: no service names, no contact data", () => {
    const ans = ask(HAPPY_PLACE_GRAPH, HP_BUSINESS, "What is the owner's home address?");
    for (const leaked of [
      "Repairs",
      "Fencing",
      "Painting",
      "Drywall",
      "Restoration",
      "+15412865190",
      "taylor@happyplacecarpentry.com",
    ]) {
      expect(ans.answer).not.toContain(leaked);
    }
  });

  test("a business with no services in the record is refused", () => {
    const graph: ObjectGraph = {
      objects: [
        {
          id: "biz-1",
          schema: "ping.social.business@1",
          controllerId: "test",
          visibility: "public",
          title: "No Services Co",
          description: "",
          fields: {},
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          provenance: { kind: "website-derived", ref: "website-ingestion:https://example.com/", derivedAt: "2026-01-01T00:00:00Z" },
        },
      ],
      relationships: [],
    };
    const ans = ask(graph, "biz-1");
    expect(ans.refusal).toBe(true);
    expect(ans.answerState).toBe("UNKNOWN");
    expect(ans.unknowns).toEqual(["services offered"]);
  });
});

describe("proof 3d: visitor boundary is enforced in code", () => {
  const privateSvcId = "website-business-6fa5ebd99d72c4cb-service-SECRET";
  const graphWithPrivate: ObjectGraph = {
    objects: [
      ...HAPPY_PLACE_GRAPH.objects,
      {
        id: privateSvcId,
        schema: "ping.social.service@1",
        controllerId: "identity_fyd_compiler_test",
        visibility: "private",
        title: "Secret Interior Work",
        description: "",
        fields: { name: "Secret Interior Work", claimKind: "website_statement" },
        createdAt: "2026-09-21T13:50:00Z",
        updatedAt: "2026-09-21T13:50:00Z",
        provenance: {
          kind: "website-derived",
          ref: "website-ingestion:https://happy-place-platform.vercel.app/",
          derivedAt: "2026-09-21T13:50:00Z",
        },
      },
    ],
    relationships: [
      ...HAPPY_PLACE_GRAPH.relationships,
      {
        id: "rel-private",
        subject: HP_BUSINESS,
        predicate: "offers",
        object: privateSvcId,
        status: "active",
        createdAt: "2026-09-21T13:50:00Z",
        evidenceRef: "test:private",
      },
    ],
  };

  test("a visitor's answer never names a non-public service", () => {
    const ans = ask(graphWithPrivate, HP_BUSINESS);
    expect(ans.refusal).toBe(false);
    const text = ans.answer + JSON.stringify(ans.claims) + JSON.stringify(ans.evidenceRefs);
    expect(text).not.toContain("Secret Interior Work");
    expect(text).not.toContain(privateSvcId);
    expect(ans.claims).toHaveLength(6); // still exactly the 5 public services + count
  });

  test("targeting a non-public object fails closed to refusal", () => {
    const ans = ask(graphWithPrivate, privateSvcId);
    expect(ans.refusal).toBe(true);
    expect(ans.answerState).toBe("UNKNOWN");
    expect(ans.claims).toEqual([]);
  });

  test("the projection drops non-public objects and unsafe fields", () => {
    const leaky: ObjectGraph = {
      objects: [
        {
          ...HAPPY_PLACE_GRAPH.objects[0],
          fields: {
            ...HAPPY_PLACE_GRAPH.objects[0].fields,
            home_address: "123 Secret Lane",
            _internal_notes: "do not show",
          },
        },
        {
          ...HAPPY_PLACE_GRAPH.objects[2],
          visibility: "private",
        },
      ],
      relationships: [],
    };
    const projected = projectGraphForViewer(leaky, null).graph;
    expect(projected.objects).toHaveLength(1);
    expect(projected.objects[0].visibility).toBe("public");
    expect(projected.objects[0].fields["home_address"]).toBeUndefined();
    expect(projected.objects[0].fields["_internal_notes"]).toBeUndefined();
    // Safe fields survive.
    expect(projected.objects[0].fields["phone"]).toBe("+15412865190");
  });
});
