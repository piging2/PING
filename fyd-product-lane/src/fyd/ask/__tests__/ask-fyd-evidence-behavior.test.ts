/**
 * Ask FYD evidence behavior: deterministic topic answers, partial support,
 * service-area honesty, and refusal discipline (FYD FINISH-STRONG).
 *
 * Synthetic Coppersmith-style graph: a website-derived business with four
 * actively offered services. Every test asserts the exact evidence
 * contract: supported clauses cite, unsupported clauses name unknowns,
 * and no claim is ever invented.
 */
import { buildAskContext, composeAnswer } from "../../../lib/ping/ask-composer";
import type { PingObject, PingRelationship } from "../../../lib/ping/types";

const WEBSITE = "https://www.coppersmithplumbing.com/";

function business(overrides: Partial<PingObject> = {}): PingObject {
  return {
    id: "website-business-test",
    schema: "ping.social.business@1",
    controllerId: "web:coppersmithplumbing.com",
    visibility: "public",
    title: "Coppersmith Plumbing",
    description: "Plumbing, heating, and cooling services.",
    fields: {
      phone: "+15415550100",
      website: WEBSITE,
      locality: "Testville, OR",
      hours: "Mon-Fri 8-5",
      area_served: "Benton, Linn, Marion, and Polk Counties, Oregon",
    },
    provenance: {
      kind: "website-derived",
      ref: `website-ingestion:${WEBSITE}`,
      derivedAt: "2026-09-21T13:50:00Z",
    },
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    ...overrides,
  };
}

function service(id: string, title: string, description: string): PingObject {
  return {
    id,
    schema: "ping.social.service@1",
    controllerId: "web:coppersmithplumbing.com",
    visibility: "public",
    title,
    description,
    fields: {},
    provenance: {
      kind: "website-derived",
      ref: `website-ingestion:${WEBSITE}services`,
      derivedAt: "2026-09-21T13:50:00Z",
    },
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
  };
}

const SERVICES = [
  service(
    "svc-plumbing",
    "Plumbing",
    "Are you working on new construction for residential homes or commercial buildings?",
  ),
  service(
    "svc-heating",
    "Heating & Cooling",
    "We maintain or repair furnaces, air conditioning units, heat pumps, mini split systems and more.",
  ),
  service(
    "svc-hvac",
    "HVAC",
    "We set up complete heating, cooling, and ventilation systems. Get your HVAC needs done.",
  ),
  service(
    "svc-vent",
    "Ventilation",
    "Building a new office complex or need the current system assessed? Our specialists can help.",
  ),
];

function offersRel(id: string, svc: string): PingRelationship {
  return {
    id,
    subject: "website-business-test",
    predicate: "offers",
    object: svc,
    status: "active",
    createdAt: "2026-09-21T00:00:00.000Z",
    evidenceRef: `website-ingestion:${WEBSITE}services`,
  };
}

const RELS = SERVICES.map((s, i) => offersRel(`rel-offers-${i}`, s.id));

function answerFor(question: string, opts: { target?: PingObject; rels?: PingRelationship[] } = {}) {
  const ctx = buildAskContext({
    viewer: { id: null, displayName: null },
    target: opts.target ?? business(),
    relatedObjects: SERVICES,
    relationships: opts.rels ?? RELS,
    plan: null,
  });
  return composeAnswer(ctx, question);
}

describe("Ask FYD deterministic topic answers", () => {
  test("commercial buildings -> Plumbing record, cited", () => {
    const ans = answerFor("Do they work on commercial buildings?");
    expect(ans.partial).toBe(false);
    expect(ans.answer).toContain("Yes.");
    expect(ans.answer).toContain("commercial buildings");
    expect(ans.answer).toMatch(/\[\d+\]/);
    // The claim binds to BOTH the Plumbing service object and the active
    // offers edge: edge-gated, never prose-only.
    const claim = ans.claimClassifications.find((c) => c.claim.includes("offers Plumbing"));
    expect(claim).toBeDefined();
    expect(claim!.evidenceRefIds).toEqual(["svc-plumbing", "rel-offers-0"]);
  });

  test("every offered service binds its own object and its own active edge", () => {
    const ans = answerFor("What services do you offer?");
    expect(ans.partial).toBe(false);
    const offeringClaims = ans.claimClassifications.filter((c) => c.claim.includes("offers "));
    expect(offeringClaims).toHaveLength(4);
    const bindings = new Map(offeringClaims.map((c) => [c.claim, c.evidenceRefIds]));
    expect(bindings.get("Coppersmith Plumbing offers Plumbing")).toEqual([
      "svc-plumbing",
      "rel-offers-0",
    ]);
    expect(bindings.get("Coppersmith Plumbing offers Heating & Cooling")).toEqual([
      "svc-heating",
      "rel-offers-1",
    ]);
    expect(bindings.get("Coppersmith Plumbing offers HVAC")).toEqual(["svc-hvac", "rel-offers-2"]);
    expect(bindings.get("Coppersmith Plumbing offers Ventilation")).toEqual([
      "svc-vent",
      "rel-offers-3",
    ]);
    // Each service gets its own cited sentence: no multi-service sentence
    // on a single marker.
    expect(ans.answer.match(/\[\d+\]/g)!.length).toBeGreaterThanOrEqual(4);
  });

  test("heat pumps -> Heating & Cooling record, cited", () => {
    const ans = answerFor("Do they service heat pumps?");
    expect(ans.partial).toBe(false);
    expect(ans.answer).toContain("Yes.");
    expect(ans.answer).toContain("heat pumps");
    const claim = ans.claimClassifications.find((c) => c.claim.includes("offers Heating & Cooling"));
    expect(claim).toBeDefined();
    expect(claim!.evidenceRefIds).toEqual(["svc-heating", "rel-offers-1"]);
  });

  test("HVAC services -> HVAC record, cited", () => {
    const ans = answerFor("What HVAC services do they offer?");
    expect(ans.partial).toBe(false);
    expect(ans.answer).toContain("HVAC");
    const claim = ans.claimClassifications.find((c) => c.claim.includes("offers HVAC"));
    expect(claim).toBeDefined();
  });

  test("where do they work -> area_served, not locality, no service dump", () => {
    const ans = answerFor("Where do they work?");
    expect(ans.partial).toBe(false);
    expect(ans.answer).toContain("Benton, Linn, Marion, and Polk Counties, Oregon");
    expect(ans.answer).not.toContain("Testville");
    // Geography intent suppresses the services branch: the answer is the
    // service area, not the catalog.
    expect(ans.answer).not.toContain("Plumbing");
    expect(ans.answer).not.toContain("Ventilation");
  });

  test("where do they work with no area_served -> listed locality + explicit unknown", () => {
    const target = business({
      fields: {
        phone: "+15415550100",
        locality: "Testville, OR",
      },
    });
    const ans = answerFor("Where do they work?", { target });
    expect(ans.partial).toBe(true);
    expect(ans.answer).toContain("Testville, OR");
    expect(ans.answer).toContain("service area is not on record");
    expect(ans.unknowns).toContain("service area of this business");
  });

  test("how do you know -> provenance, cited", () => {
    const ans = answerFor("How do you know?");
    expect(ans.answer).toMatch(/\[\d+\]/);
    expect(ans.answer).toContain("coppersmithplumbing.com");
  });

  test("combined services + provenance -> both answered", () => {
    const ans = answerFor("What services do you offer, and how do you know?");
    expect(ans.partial).toBe(false);
    expect(ans.answer).toContain("Plumbing");
    expect(ans.answer).toContain("coppersmithplumbing.com");
    expect(ans.answer.match(/\[\d+\]/g)!.length).toBeGreaterThanOrEqual(2);
  });

  test("provenance alone never rescues an unanswered question", () => {
    const ans = answerFor("Do you offer financing, and how do you know?");
    expect(ans.partial).toBe(true);
    // No cited evidence anywhere: total refusal, no provenance garnish.
    expect(ans.answer).not.toMatch(/\[\d+\]/);
    expect(ans.unknowns).toContain("financing");
  });
});

describe("Ask FYD partial support", () => {
  test("plumbing + financing -> cited plumbing, explicit financing unknown", () => {
    const ans = answerFor("Do you offer plumbing and financing?");
    expect(ans.answer).toContain("Plumbing");
    expect(ans.answer).toMatch(/\[\d+\]/);
    expect(ans.unknowns).toContain("financing");
    expect(ans.answer).toContain("I do not have evidence for: financing.");
    // Partial, not total refusal: there IS cited evidence.
    expect(ans.partial).toBe(true);
  });

  test("unsupported topic conjunction: heat pumps cited, pools unknown", () => {
    // No clause split on a bare "and": per-topic evaluation keeps the
    // supported topic cited and names the unsupported one explicitly.
    const ans = answerFor("Do they service heat pumps and install pools?");
    expect(ans.answer).toContain("heat pumps");
    expect(ans.answer).toMatch(/\[\d+\]/);
    expect(ans.unknowns).toContain("install pools");
    expect(ans.answer).toContain("I do not have evidence for: install pools.");
    expect(ans.partial).toBe(true);
  });

  test("unsupported topic alone -> honest refusal", () => {
    const ans = answerFor("Do you offer financing?");
    expect(ans.partial).toBe(true);
    expect(ans.answer).not.toMatch(/\[\d+\]/);
    expect(ans.unknowns).toContain("financing");
    expect(ans.answer).toContain("I do not have evidence for that");
  });

  test("prose-only service mentions never ground an offering claim", () => {
    const target = business({
      description: "Family-run shop: drains, water heaters, and repiping.",
    });
    const ans = answerFor("What services do you offer?", { target, rels: [] });
    expect(ans.partial).toBe(true);
    expect(ans.answer).not.toMatch(/\[\d+\]/);
    expect(ans.answer).not.toContain("water heaters");
  });

  test("stripped offers edges force refusal even with service objects present", () => {
    const ans = answerFor("What services do you offer?", { rels: [] });
    expect(ans.partial).toBe(true);
    expect(ans.answer).not.toMatch(/\[\d+\]/);
    expect(ans.unknowns).toContain("services offered by this business");
  });
});

describe("Ask FYD absence honesty", () => {
  test("no contact details -> uncited sentence + explicit unknown, never a supported absence claim", () => {
    const target = business({ fields: {} });
    const ans = answerFor("What is the phone number?", { target });
    expect(ans.answer).toContain("lists no public contact details");
    expect(ans.unknowns).toContain("contact details for this business");
    // No citation markers: absence is not evidence.
    expect(ans.answer).not.toMatch(/\[\d+\]/);
    expect(
      ans.claimClassifications.some((c) => /absence/i.test(c.claim)),
    ).toBe(false);
  });

  test("deterministic: same question, byte-identical answer", () => {
    const a = answerFor("Do they service heat pumps?");
    const b = answerFor("Do they service heat pumps?");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
