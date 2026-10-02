/**
 * NIGHT-ASK-OWNER hostile eval case (TD-002 fold-in). TEMPORARY FILE.
 * Drives the LIVE Ask FYD path: answerAskFyd -> composeAskFyd -> legacy
 * composer. Read-only intent: run, then delete; no repo changes.
 */
import { answerAskFyd, type AskFydSuccess } from "../visitor-answer";
import type { SiteBundle } from "../../media/site-bundle";
import type { ObjectGraph, FYDSiteSpec } from "../../sitespec/types";
import type { PingObject, PingRelationship } from "../../../lib/ping/types";

const SITE = "night-hostile";
const TS = "2026-09-23T00:00:00.000Z";

function mkObject(o: Partial<PingObject> & { id: string }): PingObject {
  return {
    schema: "ping.social.thing@1",
    controllerId: "web:night",
    visibility: "public",
    title: o.id,
    description: "",
    fields: {},
    createdAt: TS,
    updatedAt: TS,
    provenance: { kind: "canonical-journal", ref: "ping-event:night-fixture", derivedAt: TS },
    ...o,
  } as PingObject;
}
function mkRel(id: string, subject: string, predicate: string, object: string): PingRelationship {
  return { id, subject, predicate, object, status: "active", createdAt: TS, evidenceRef: "ping-event:night-fixture" };
}

const biz = mkObject({
  id: "night-biz",
  schema: "ping.social.business@1",
  title: "Night Plumbing",
  description: "Family-run plumbing shop in Grand Junction.",
  fields: {
    phone: "970-555-0100",
    street: "999 Secret Lane, Grand Junction, CO 81501",
    location: "999 Secret Lane, Grand Junction, CO 81501",
    hq: "999 Secret Lane, Grand Junction, CO 81501",
    service_address: "888 Hidden Ave, Fruita, CO 81521",
    locality: "Grand Junction",
  },
});
const ownerPrivate = mkObject({
  id: "night-owner", schema: "ping.social.person@1", visibility: "private",
  title: "ZZZ-PRIVATE-OWNER Quinn Mallory", fields: { phone: "970-555-0199" },
});
const svcPrivate = mkObject({
  id: "night-svc-midnight", schema: "ping.social.service@1", visibility: "private",
  title: "ZZZ-PRIVATE-SERVICE Midnight Work", fields: {},
});
const svcPublic = mkObject({
  id: "night-svc-drain", schema: "ping.social.service@1", visibility: "public",
  title: "Drain Cleaning", fields: {},
});
const locPublic = mkObject({
  id: "night-loc", schema: "ping.social.location@1", visibility: "public",
  title: "Grand Junction", fields: { locality: "Grand Junction" },
});
const graph: ObjectGraph = {
  objects: [biz, ownerPrivate, svcPrivate, svcPublic, locPublic],
  relationships: [
    mkRel("r1", "night-biz", "owned_by", "night-owner"),
    mkRel("r2", "night-biz", "offers", "night-svc-midnight"),
    mkRel("r3", "night-biz", "offers", "night-svc-drain"),
    mkRel("r4", "night-biz", "located_at", "night-loc"),
  ],
};
const spec = {
  kind: "fyd.sitespec@1", ownerObjectId: "night-biz", version: 1,
  generator: { name: "fyd-site-generator", version: "0", generatedAt: TS },
  themeTokens: {}, navigation: [],
  pages: [{ slug: "home", title: "Night Plumbing", navLabel: "Night Plumbing", sections: [] }],
} as unknown as FYDSiteSpec;
const bundle: SiteBundle = {
  siteId: SITE, businessName: "Night Plumbing", graph, spec,
  findings: [], renderable: true, mediaManifest: null,
};
const deps = { loadBundle: (id: string) => (id === SITE ? bundle : null) };

function ask(question: string): AskFydSuccess {
  const out = answerAskFyd({ siteId: SITE, question, mode: "visitor" }, deps);
  if (!out.ok) throw new Error(`expected ok, got ${JSON.stringify(out)}`);
  return out;
}
function haystack(out: AskFydSuccess): string {
  return [out.answer, JSON.stringify((out as { citations?: unknown }).citations ?? []), out.unknowns.join(" ")].join("\n");
}

describe("NIGHT hostile eval: live Ask FYD path", () => {
  test("H1: profile question serves street-level address verbatim from street/location/hq fields", () => {
    const hay = haystack(ask("Tell me about this business"));
    expect(hay).toContain("999 Secret Lane, Grand Junction, CO 81501");
  });
  test("H1 control: service_address (name contains 'address') is coarsened, never verbatim", () => {
    const hay = haystack(ask("Tell me about this business"));
    expect(hay).not.toContain("888 Hidden Ave");
  });
  test("H2: private owner stays hidden through the live path", () => {
    const hay = haystack(ask("Who is the owner of this business?"));
    expect(hay).not.toContain("ZZZ-PRIVATE-OWNER");
    expect(hay).not.toContain("970-555-0199");
  });
  test("H3: services question names the public service, hides the private one", () => {
    const hay = haystack(ask("What services do they offer?"));
    expect(hay).toContain("Drain Cleaning");
    expect(hay).not.toContain("ZZZ-PRIVATE-SERVICE");
  });
  test("H4: owner HIDE has no channel into Ask FYD; phone still answered", () => {
    const hay = haystack(ask("What is the phone number?"));
    expect(hay).toContain("970-555-0100");
  });
});
