/**
 * TD-002 hostile-fixture probe: does Ask FYD leak private objects or
 * owner-hidden facts through answers or citations?
 *
 * Defect hypothesis: the Ask FYD path (which LANE-SEC did not cover) may
 * surface private objects / owner-hidden facts in answers or citations.
 *
 * Fixture: a synthetic tenant graph carrying unique ZZZ- markers:
 *  - td002-owner:        visibility "private" person, private cell 970-555-0199,
 *                        owned_by relationship to the business
 *  - td002-svc-midnight: visibility "private" service, offers relationship
 *  - td002-biz:          public business with phone, plus address-bearing
 *                        fields under three names: "service_address"
 *                        (contains "address"), "street" and "location"
 *                        (do NOT contain "address")
 *
 * Part 1 drives the LIVE path: answerAskFyd (what POST /api/fyd/ask serves)
 *  -> composeAskFyd (src/fyd/ask/answer.ts) -> composeAnswer legacy
 *  composer (src/lib/ping/ask-composer.ts). The concierge is NOT in this
 *  path (wiring patch unapplied; verified by grep).
 * Part 2 drives the concierge directly over the UNPROJECTED graph to
 *  document its caller-trust contract (it performs no visibility
 *  filtering of its own).
 *
 * Run on the Pig, branch fyd-factory:
 *   npx jest --config src/fyd/ask/jest.config.cjs td-002-hostile
 */
import { answerAskFyd, type AnswerAskFydDeps, type AskFydSuccess } from "../visitor-answer";
import {
  answerConciergeQuestion,
  conciergeInputFor,
  toAskFydAnswer,
} from "../concierge";
import { applyFieldVisibility, type FieldVisibilityDecision } from "../../sitespec/field-visibility";
import type { SiteBundle } from "../../media/site-bundle";
import type { ObjectGraph, FYDSiteSpec } from "../../sitespec/types";
import type { PingObject, PingRelationship } from "../../../lib/ping/types";

const SITE = "td002-hostile";
const TS = "2026-09-23T00:00:00.000Z";

function mkObject(o: Partial<PingObject> & { id: string }): PingObject {
  return {
    schema: "ping.social.thing@1",
    controllerId: "web:td002",
    visibility: "public",
    title: o.id,
    description: "",
    fields: {},
    createdAt: TS,
    updatedAt: TS,
    provenance: {
      kind: "canonical-journal",
      ref: "ping-event:td002-fixture",
      derivedAt: TS,
    },
    ...o,
  } as PingObject;
}

function mkRel(id: string, subject: string, predicate: string, object: string): PingRelationship {
  return { id, subject, predicate, object, status: "active", createdAt: TS, evidenceRef: "ping-event:td002-fixture" };
}

// -- Hostile graph -----------------------------------------------------------

const biz = mkObject({
  id: "td002-biz",
  schema: "ping.social.business@1",
  title: "TD002 Plumbing",
  description: "Family-run plumbing shop in Grand Junction.",
  fields: {
    phone: "970-555-0100",
    email: "hello@td002.example",
    website: "https://td002.example",
    // address-bearing values under three different field names
    service_address: "888 Hidden Ave, Fruita, CO 81521", // name contains "address"
    street: "999 Secret Lane, Grand Junction, CO 81501", // name does NOT
    location: "999 Secret Lane, Grand Junction, CO 81501", // name does NOT
    locality: "Grand Junction",
  },
});

const ownerPrivate = mkObject({
  id: "td002-owner",
  schema: "ping.social.person@1",
  visibility: "private",
  title: "ZZZ-PRIVATE-OWNER Quinn Mallory",
  description: "Owner.",
  fields: { phone: "970-555-0199" },
});

const techPublic = mkObject({
  id: "td002-tech",
  schema: "ping.social.person@1",
  visibility: "public",
  title: "ZZZ-PUBLIC-TECH Sam Rivera",
  description: "Technician.",
  fields: {},
});

const svcPublic = mkObject({
  id: "td002-svc-drain",
  schema: "ping.social.service@1",
  visibility: "public",
  title: "Drain Cleaning",
  description: "Drain cleaning service.",
  fields: {},
});

const svcPrivate = mkObject({
  id: "td002-svc-midnight",
  schema: "ping.social.service@1",
  visibility: "private",
  title: "ZZZ-PRIVATE-SERVICE Midnight Unlicensed Work",
  description: "Not for the public site.",
  fields: {},
});

const locPublic = mkObject({
  id: "td002-loc",
  schema: "ping.social.location@1",
  visibility: "public",
  title: "Grand Junction",
  description: "",
  fields: { locality: "Grand Junction" },
});

const relationships: PingRelationship[] = [
  mkRel("td002-rel-owner", "td002-biz", "owned_by", "td002-owner"),
  mkRel("td002-rel-tech", "td002-tech", "employed_by", "td002-biz"),
  mkRel("td002-rel-svc-pub", "td002-biz", "offers", "td002-svc-drain"),
  mkRel("td002-rel-svc-priv", "td002-biz", "offers", "td002-svc-midnight"),
  mkRel("td002-rel-loc", "td002-biz", "located_at", "td002-loc"),
];

const graph: ObjectGraph = {
  objects: [biz, ownerPrivate, techPublic, svcPublic, svcPrivate, locPublic],
  relationships,
};

const spec = {
  kind: "fyd.sitespec@1",
  ownerObjectId: "td002-biz",
  version: 1,
  generator: { name: "fyd-site-generator", version: "0", generatedAt: TS },
  themeTokens: {},
  navigation: [],
  pages: [{ slug: "home", title: "TD002 Plumbing", navLabel: "TD002 Plumbing", sections: [] }],
} as unknown as FYDSiteSpec;

const bundle: SiteBundle = {
  siteId: SITE,
  businessName: "TD002 Plumbing",
  graph,
  spec,
  findings: [],
  renderable: true,
  mediaManifest: null,
};

const DEPS: AnswerAskFydDeps = { loadBundle: (id) => (id === SITE ? bundle : null) };

function ask(question: string, objectId?: string): AskFydSuccess {
  const out = answerAskFyd(
    { siteId: SITE, question, mode: "visitor", ...(objectId ? { objectId } : {}) },
    DEPS,
  );
  if (!out.ok) throw new Error(`expected ok:true, got ${JSON.stringify(out)}`);
  return out;
}

/** Everything a visitor could read: answer text + citations + unknowns. */
function haystack(out: AskFydSuccess): string {
  return [out.answer, JSON.stringify(out.citations), out.unknowns.join(" ")].join("\n");
}

// -- Part 1: the LIVE path ---------------------------------------------------

describe("TD-002 live Ask FYD path vs private objects", () => {
  test("who-question names the public tech but not the private owner", () => {
    const out = ask("Who is the owner of this business?");
    const hay = haystack(out);
    // control: the people branch fired (non-vacuous test)
    expect(hay).toContain("ZZZ-PUBLIC-TECH");
    // the private owner must not surface
    expect(hay).not.toContain("ZZZ-PRIVATE-OWNER");
    expect(hay).not.toContain("970-555-0199");
  });

  test("services question lists the public service but not the private one", () => {
    const out = ask("What services do they offer?");
    const hay = haystack(out);
    expect(hay).toContain("Drain Cleaning"); // control: branch fired
    expect(hay).not.toContain("ZZZ-PRIVATE-SERVICE");
  });

  test("objectId of a private object fails closed as unknown_object", () => {
    for (const oid of ["td002-owner", "td002-svc-midnight"]) {
      const out = answerAskFyd({ siteId: SITE, objectId: oid, question: "Tell me about this.", mode: "visitor" }, DEPS);
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error.kind).toBe("unknown_object");
    }
  });

  test("contact question answers the public phone, not the private cell", () => {
    const out = ask("What is the phone number?");
    const hay = haystack(out);
    expect(hay).toContain("970-555-0100"); // control
    expect(hay).not.toContain("970-555-0199");
  });

  test("mode=owner grants nothing: private owner still hidden", () => {
    const out = answerAskFyd({ siteId: SITE, question: "Who is the owner of this business?", mode: "owner" }, DEPS);
    if (!out.ok) throw new Error("expected ok");
    expect(haystack(out)).not.toContain("ZZZ-PRIVATE-OWNER");
  });

  test("where-question prefers the public location object over verbatim fields", () => {
    const out = ask("Where are you located?");
    const hay = haystack(out);
    expect(hay).toContain("Grand Junction");
    expect(hay).not.toContain("999 Secret Lane");
    expect(hay).not.toContain("888 Hidden Ave");
  });
});

describe("TD-002 live Ask FYD path vs owner-hidden facts", () => {
  test("SEAM: applyFieldVisibility honors an owner HIDE decision (render-seam behavior)", () => {
    const hidePhone: FieldVisibilityDecision = {
      objectId: "td002-biz",
      field: "phone",
      policy: "hide",
      decidedBy: "owner",
      decidedAt: TS,
      source: "owner_override",
      version: 1,
    };
    const projected = applyFieldVisibility(graph, [hidePhone]);
    const bizFields = projected.objects.find((o) => o.id === "td002-biz")!.fields;
    expect(bizFields).not.toHaveProperty("phone");
  });

  test("ASK ignores owner HIDE decisions: decisions are hardwired to [] in visitor-answer.ts", () => {
    // The same owner HIDE decision from the previous test has NO effect on
    // Ask FYD: publicGraphOf calls applyFieldVisibility(graph, []) with no
    // way to supply decisions, so the phone is still answered.
    const out = ask("What is the phone number?");
    expect(haystack(out)).toContain("970-555-0100");
  });

  test("SEAM: address-bearing fields are coarsened only when the name contains 'address'", () => {
    const projected = applyFieldVisibility(graph, []);
    const f = projected.objects.find((o) => o.id === "td002-biz")!.fields;
    expect(f["service_address"]).toBe("Fruita, CO 81521"); // coarsened
    expect(f["street"]).toBe("999 Secret Lane, Grand Junction, CO 81501"); // verbatim
    expect(f["location"]).toBe("999 Secret Lane, Grand Junction, CO 81501"); // verbatim
  });

  test("LIVE: profile question serves a street-level address verbatim from a 'location' field", () => {
    const out = ask("Tell me about this business");
    const hay = haystack(out);
    // The profile branch reads fieldOf(target, "location") with no
    // coarsening: the street-level detail reaches the visitor verbatim,
    // contradicting the documented "address-bearing field is coarsened,
    // never leaked verbatim" contract in visitor-answer.ts.
    expect(hay).toContain("999 Secret Lane, Grand Junction, CO 81501");
  });
});

// -- Part 2: the concierge, driven directly -----------------------------------

describe("TD-002 concierge caller-trust (unwired module, direct drive)", () => {
  const allObjects = [biz, ownerPrivate, techPublic, svcPublic, svcPrivate, locPublic];
  const publicOnly = [biz, techPublic, svcPublic, locPublic];

  test("who-question over the UNPROJECTED graph surfaces the private owner", () => {
    const input = conciergeInputFor(SITE, biz, allObjects, relationships, "Who works here?");
    const ans = answerConciergeQuestion(input);
    expect(ans).not.toBeNull();
    const view = toAskFydAnswer(ans!);
    const hay = view.answer + JSON.stringify(view.evidenceRefs);
    // The concierge performs NO visibility filtering: whatever the caller
    // hands it may be cited. A private person becomes a SUPPORTED claim.
    expect(hay).toContain("ZZZ-PRIVATE-OWNER");
  });

  test("services question over the UNPROJECTED graph surfaces the private service", () => {
    const input = conciergeInputFor(SITE, biz, allObjects, relationships, "What services do they offer?");
    const ans = answerConciergeQuestion(input);
    expect(ans).not.toBeNull();
    const view = toAskFydAnswer(ans!);
    const hay = view.answer + JSON.stringify(view.evidenceRefs);
    expect(hay).toContain("ZZZ-PRIVATE-SERVICE");
  });

  test("control: concierge over the PROJECTED graph leaks nothing", () => {
    for (const q of ["Who works here?", "What services do they offer?"]) {
      const input = conciergeInputFor(SITE, biz, publicOnly, relationships, q);
      const ans = answerConciergeQuestion(input);
      expect(ans).not.toBeNull();
      const view = toAskFydAnswer(ans!);
      const hay = view.answer + JSON.stringify(view.evidenceRefs);
      expect(hay).not.toContain("ZZZ-PRIVATE-OWNER");
      expect(hay).not.toContain("ZZZ-PRIVATE-SERVICE");
      expect(hay).not.toContain("970-555-0199");
    }
    // non-vacuous: the public tech and service are still named
    const who = toAskFydAnswer(answerConciergeQuestion(conciergeInputFor(SITE, biz, publicOnly, relationships, "Who works here?"))!);
    expect(who.answer).toContain("ZZZ-PUBLIC-TECH");
  });
});
