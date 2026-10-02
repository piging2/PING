/**
 * G1 class-B cohort (20): the boundary cohort for ObjectFeed / Explore
 * semantics and page-inventory pinning.
 *
 * "Class-B" is defined HERE (no workspace artifact defined it as of
 * 2026-09-24): the 20 boundary graphs that probe every eligibility gate,
 * every page outcome, and every object fate in the generator -> planner
 * pipeline. For each case the test asserts:
 *   1. the page inventory is pinned: exactly the 4 canonical entries, every
 *      plannerOutcome in the typed vocabulary, never an unexplained drop;
 *   2. Explore is emitted exactly when the rule holds (public objects >= 4
 *      AND a feed-renderable schema present), with the typed reason
 *      otherwise;
 *   3. no unexplained page disappearance: a generator-emitted page is
 *      either planned or carries a planner drop reason;
 *   4. no unexplained object disappearance: every object has a typed fate
 *      (bound / private / owner-hidden / eligibility-only / unrelated);
 *   5. the Explore binding matches the renderer contract: newest-first, id
 *      tie-break, limit 20 honored;
 *   6. semantic digest stability across two runs.
 *
 * The G1 regression core is B4: business + 3 locations (4 public objects,
 * zero posts/services). The old eligibility rule (posts+articles+services+
 * products > 0) stripped the generator-emitted Explore page; the fixed
 * rule (the generator's emission rule, mirrored exactly) keeps it.
 */
import { planSite, type PlannedSite } from "../planner";
import { COPPERSMITH_VECTOR } from "../dimensions";
import { makeObject, makeRelationship } from "./fixtures";
import { resolveQuery } from "../../sitespec/query";
import type { PingObject, PingRelationship } from "@/lib/ping/types";
import type { ObjectGraph } from "../../sitespec/types";

const CTX = { tenantId: "class-b-cohort" };
const STAMP = "2026-09-24T00:00:00.000Z";
const STAMP2 = "2026-09-24T12:00:00.000Z";

const BIZ = "ping.social.business@1";
const SVC = "ping.social.service@1";
const LOC = "ping.social.location@1";
const PERSON = "ping.social.person@1";
const POST = "ping.social.post@1";
const ARTICLE = "ping.social.article@1";
const EXT = "ping.social.external_identity@1";
const KBIZ = "ping.knowledge.business@1";
const KSVC = "ping.knowledge.service@1";
const KPOST = "ping.knowledge.post@1";

function plan(graph: ObjectGraph, ownerIntent?: { operatingConstraints?: string[] }): PlannedSite {
  return planSite({
    ctx: CTX,
    graph,
    vector: COPPERSMITH_VECTOR,
    generatedAt: STAMP,
    ...(ownerIntent ? { ownerIntent } : {}),
  });
}

/** The planner's owner: public business, lowest id wins. Mirrors ownerOf. */
function ownerIdOf(graph: ObjectGraph): string {
  const bs = graph.objects
    .filter((o) => o.schema === BIZ || o.schema === KBIZ)
    .filter((o) => o.visibility === "public")
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return bs[0]?.id ?? "";
}

function biz(id: string, extra?: Partial<PingObject>): PingObject {
  return makeObject(id, BIZ, { title: "Biz " + id, ...extra });
}

/** Typed fate of every object: no unexplained object disappearance. */
function objectFate(o: PingObject, planned: PlannedSite, graph: ObjectGraph): string {
  if (o.visibility !== "public") return "private";
  if (o.ownerPresentationOverride?.hidden) return "owner-hidden";
  const ownerId = ownerIdOf(graph);
  const bound = planned.spec.pages.some((p) =>
    p.sections.some((s) => resolveQuery(s.query, graph, ownerId).some((b) => b.id === o.id)),
  );
  if (bound) return "bound";
  if (o.schema === EXT) return "eligibility-only:external-identity";
  return "unrelated:bound-by-no-section";
}

/** The shared per-case assertions: inventory pinning + stability. */
function assertPinned(
  planned: PlannedSite,
  graph: ObjectGraph,
  ownerIntent?: { operatingConstraints?: string[] },
): void {
  const inv = planned.pageInventory;
  expect(inv.map((r) => r.slug).sort()).toEqual(["about", "explore", "home", "services"]);
  const outcomes = new Set([
    "planned",
    "generator:no-data",
    "planner:intent-removed",
    "planner:ineligible",
    "planner:empty",
  ]);
  for (const r of inv) {
    expect(outcomes.has(r.plannerOutcome)).toBe(true);
    if (r.generatorEmitted) {
      // A generator-emitted page is either planned or carries a planner
      // drop reason: never unexplained.
      expect(["planned", "planner:intent-removed", "planner:ineligible", "planner:empty"]).toContain(
        r.plannerOutcome,
      );
      if (r.plannerOutcome !== "planned") {
        expect(r.sectionOutcomes.length).toBeGreaterThan(0);
      }
    } else {
      expect(r.plannerOutcome).toBe("generator:no-data");
      expect(r.planned).toBe(false);
    }
  }
  // Every object has a typed fate.
  for (const o of graph.objects) {
    const fate = objectFate(o, planned, graph);
    expect(typeof fate).toBe("string");
  }
  // Semantic stability across two runs (same inputs, including intent).
  const again = plan(graph, ownerIntent);
  expect(again.semanticDigest).toBe(planned.semanticDigest);
  expect(again.canonicalSpecJson).toBe(planned.canonicalSpecJson);
}

function exploreOutcome(planned: PlannedSite): string {
  return planned.pageInventory.find((r) => r.slug === "explore")!.plannerOutcome;
}

function exploreBinding(planned: PlannedSite, graph: ObjectGraph): PingObject[] {
  const ownerId = ownerIdOf(graph);
  const explore = planned.spec.pages.find((p) => p.slug === "explore");
  if (!explore) return [];
  const feed = explore.sections.find((s) => s.component === "ObjectFeed")!;
  return resolveQuery(feed.query, graph, ownerId);
}

describe("G1 class-B cohort (20)", () => {
  test("B1 baseline trade graph: all four pages planned, all objects bound", () => {
    const owner = biz("biz", { description: "Full-service plumbing." });
    const graph: ObjectGraph = {
      objects: [
        owner,
        makeObject("svc-a", SVC, { title: "Drains" }),
        makeObject("svc-b", SVC, { title: "Heaters" }),
        makeObject("loc", LOC, { title: "Grand Junction" }),
        makeObject("person", PERSON, { title: "Jo Rivera" }),
        makeObject("ext", EXT, { fields: { url: "https://example.com/x", platform: "x" } }),
        makeObject("post", POST, { title: "Tips" }),
      ],
      relationships: [
        makeRelationship("r1", "biz", "provides", "svc-a"),
        makeRelationship("r2", "biz", "provides", "svc-b"),
        makeRelationship("r3", "biz", "located_at", "loc"),
        makeRelationship("r4", "person", "works_for", "biz"),
        makeRelationship("r5", "biz", "links_to", "ext"),
        makeRelationship("r6", "biz", "publishes", "post"),
      ],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    expect(exploreOutcome(planned)).toBe("planned");
    const fates = new Map(graph.objects.map((o) => [o.id, objectFate(o, planned, graph)]));
    expect(fates.get("biz")).toBe("bound");
    expect(fates.get("svc-a")).toBe("bound");
    expect(fates.get("post")).toBe("bound");
    expect(fates.get("ext")).toBe("eligibility-only:external-identity");
    const bound = exploreBinding(planned, graph);
    expect(bound.length).toBe(6); // biz, 2 svc, loc, person, post
    expect(bound.map((o) => o.id)).not.toContain("ext");
  });

  test("B2 bare business: home only, everything else generator:no-data", () => {
    const graph: ObjectGraph = { objects: [biz("biz")], relationships: [] };
    const planned = plan(graph);
    assertPinned(planned, graph);
    const bySlug = new Map(planned.pageInventory.map((r) => [r.slug, r.plannerOutcome]));
    expect(bySlug.get("home")).toBe("planned");
    expect(bySlug.get("about")).toBe("generator:no-data");
    expect(bySlug.get("services")).toBe("generator:no-data");
    expect(bySlug.get("explore")).toBe("generator:no-data");
    expect(planned.spec.pages.map((p) => p.slug)).toEqual(["home"]);
  });

  test("B3 business with description: home + about, no explore below the gate", () => {
    const graph: ObjectGraph = {
      objects: [biz("biz", { description: "We fix pipes." })],
      relationships: [],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    expect(planned.spec.pages.map((p) => p.slug).sort()).toEqual(["about", "home"]);
    expect(exploreOutcome(planned)).toBe("generator:no-data");
  });

  test("B4 business + 3 locations: explore EMITTED (the G1 regression case)", () => {
    // The old eligibility rule (posts+articles+services+products > 0) said
    // ObjectFeed was not eligible here and the planner stripped the
    // generator-emitted Explore page: an unexplained page disappearance.
    // The fixed rule mirrors the generator's emission rule exactly.
    const graph: ObjectGraph = {
      objects: [
        biz("biz", { description: "Three towns served." }),
        makeObject("loc-a", LOC, { title: "Town A", updatedAt: "2026-09-20T00:00:00.000Z" }),
        makeObject("loc-b", LOC, { title: "Town B", updatedAt: "2026-09-22T00:00:00.000Z" }),
        makeObject("loc-c", LOC, { title: "Town C", updatedAt: "2026-09-21T00:00:00.000Z" }),
      ],
      relationships: [
        makeRelationship("r1", "biz", "located_at", "loc-a"),
        makeRelationship("r2", "biz", "located_at", "loc-b"),
        makeRelationship("r3", "biz", "located_at", "loc-c"),
      ],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    expect(exploreOutcome(planned)).toBe("planned");
    expect(planned.eligibility.eligible["ObjectFeed"]).toBe(true);
    const bound = exploreBinding(planned, graph);
    // Feed contract: newest-first by updatedAt, id tie-break (biz and
    // loc-c share an updatedAt; "biz" < "loc-c" wins the tie).
    expect(bound.map((o) => o.id)).toEqual(["loc-b", "biz", "loc-c", "loc-a"]);
    const feed = planned.spec.pages
      .find((p) => p.slug === "explore")!
      .sections.find((s) => s.component === "ObjectFeed")!;
    const feedQuery = feed.query as { kind: "all"; schemas: string[]; limit: number };
    expect(feedQuery.kind).toBe("all");
    expect(feedQuery.limit).toBe(20);
    expect(feedQuery.schemas).toEqual(
      expect.arrayContaining(["ping.social.business@1", "ping.social.location@1"]),
    );
  });

  test("B5 business + 2 services: services page yes, explore no (public 3 < 4)", () => {
    const graph: ObjectGraph = {
      objects: [biz("biz"), makeObject("svc-a", SVC), makeObject("svc-b", SVC)],
      relationships: [
        makeRelationship("r1", "biz", "provides", "svc-a"),
        makeRelationship("r2", "biz", "provides", "svc-b"),
      ],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    expect(planned.spec.pages.map((p) => p.slug).sort()).toEqual(["home", "services"]);
    const explore = planned.pageInventory.find((r) => r.slug === "explore")!;
    expect(explore.plannerOutcome).toBe("generator:no-data");
    expect(explore.generatorReason).toMatch(/public objects 3 < 4/);
  });

  test("B6 business + 3 services: explore emitted at the gate boundary", () => {
    const graph: ObjectGraph = {
      objects: [
        biz("biz"),
        makeObject("svc-a", SVC),
        makeObject("svc-b", SVC),
        makeObject("svc-c", SVC),
      ],
      relationships: [
        makeRelationship("r1", "biz", "provides", "svc-a"),
        makeRelationship("r2", "biz", "provides", "svc-b"),
        makeRelationship("r3", "biz", "provides", "svc-c"),
      ],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    expect(exploreOutcome(planned)).toBe("planned");
  });

  test("B7 business + 3 posts: explore emitted, posts feed-renderable", () => {
    const graph: ObjectGraph = {
      objects: [
        biz("biz"),
        makeObject("post-a", POST),
        makeObject("post-b", POST),
        makeObject("post-c", POST),
      ],
      relationships: [
        makeRelationship("r1", "biz", "publishes", "post-a"),
        makeRelationship("r2", "biz", "publishes", "post-b"),
        makeRelationship("r3", "biz", "publishes", "post-c"),
      ],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    expect(exploreOutcome(planned)).toBe("planned");
    expect(planned.eligibility.eligible["ObjectFeed"]).toBe(true);
  });

  test("B8 business + 3 external identities: explore binds only feed-renderable schemas", () => {
    const graph: ObjectGraph = {
      objects: [
        biz("biz"),
        makeObject("ext-a", EXT, { fields: { url: "https://example.com/a", platform: "a" } }),
        makeObject("ext-b", EXT, { fields: { url: "https://example.com/b", platform: "b" } }),
        makeObject("ext-c", EXT, { fields: { url: "https://example.com/c", platform: "c" } }),
      ],
      relationships: [
        makeRelationship("r1", "biz", "links_to", "ext-a"),
        makeRelationship("r2", "biz", "links_to", "ext-b"),
        makeRelationship("r3", "biz", "links_to", "ext-c"),
      ],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    // The business is feed-renderable per the schema contract, so Explore
    // IS emitted; the external identities are not feed-renderable and stay
    // out of the feed (eligibility-only fate).
    expect(exploreOutcome(planned)).toBe("planned");
    expect(planned.eligibility.eligible["ObjectFeed"]).toBe(true);
    const bound = exploreBinding(planned, graph);
    expect(bound.map((o) => o.id)).toEqual(["biz"]);
    const feed = planned.spec.pages
      .find((p) => p.slug === "explore")!
      .sections.find((s) => s.component === "ObjectFeed")!;
    const feedQuery = feed.query as { kind: "all"; schemas: string[] };
    expect(feedQuery.schemas).toEqual(["ping.social.business@1"]);
    expect(objectFate(graph.objects[1], planned, graph)).toBe(
      "eligibility-only:external-identity",
    );
  });

  test("B9 private business: no owner, no pages, all generator:no-data", () => {
    const graph: ObjectGraph = {
      objects: [biz("biz", { visibility: "private" })],
      relationships: [],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    expect(planned.spec.pages).toEqual([]);
    for (const r of planned.pageInventory) {
      expect(r.plannerOutcome).toBe("generator:no-data");
    }
    expect(objectFate(graph.objects[0], planned, graph)).toBe("private");
  });

  test("B10 private service: never bound, never leaked, typed fate", () => {
    const graph: ObjectGraph = {
      objects: [
        biz("biz"),
        makeObject("svc-a", SVC),
        makeObject("svc-b", SVC),
        makeObject("svc-secret", SVC, { visibility: "private", title: "Secret menu" }),
      ],
      relationships: [
        makeRelationship("r1", "biz", "provides", "svc-a"),
        makeRelationship("r2", "biz", "provides", "svc-b"),
        makeRelationship("r3", "biz", "provides", "svc-secret"),
      ],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    expect(objectFate(graph.objects[3], planned, graph)).toBe("private");
    // planSite itself runs assertNoPrivateLeak over every section binding.
    const allBound = planned.spec.pages.flatMap((p) =>
      p.sections.flatMap((s) => resolveQuery(s.query, graph, "biz").map((o) => o.id)),
    );
    expect(allBound).not.toContain("svc-secret");
  });
  test("B11 owner-hidden post: excluded from listings, own record survives", () => {
    const hidden: PingObject = makeObject("post-x", POST, { title: "Hidden draft" });
    hidden.ownerPresentationOverride = {
      hidden: true,
      decidedAt: STAMP,
      actorLabel: "owner",
      basis: "Owner decision: hide draft from the public page.",
    };
    const graph: ObjectGraph = {
      objects: [
        biz("biz"),
        makeObject("svc-a", SVC),
        makeObject("svc-b", SVC),
        hidden,
      ],
      relationships: [
        makeRelationship("r1", "biz", "provides", "svc-a"),
        makeRelationship("r2", "biz", "provides", "svc-b"),
        makeRelationship("r3", "biz", "publishes", "post-x"),
      ],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    // Public by source visibility (4 public), so explore is still emitted...
    expect(exploreOutcome(planned)).toBe("planned");
    // ...but the owner-hidden object binds to NO section.
    expect(objectFate(hidden, planned, graph)).toBe("owner-hidden");
    expect(exploreBinding(planned, graph).map((o) => o.id)).not.toContain("post-x");
    // The object's own record survives: hiding is presentation, not truth.
    expect(graph.objects.find((o) => o.id === "post-x")!.visibility).toBe("public");
  });

  test("B12 intent no-posts: explore dropped with typed intent reason", () => {
    const graph: ObjectGraph = {
      objects: [
        biz("biz", { description: "Plumbing." }),
        makeObject("svc-a", SVC),
        makeObject("post-a", POST),
        makeObject("post-b", POST),
      ],
      relationships: [
        makeRelationship("r1", "biz", "provides", "svc-a"),
        makeRelationship("r2", "biz", "publishes", "post-a"),
        makeRelationship("r3", "biz", "publishes", "post-b"),
      ],
    };
    const intent = { operatingConstraints: ["no-posts"] };
    const planned = plan(graph, intent);
    assertPinned(planned, graph, intent);
    const explore = planned.pageInventory.find((r) => r.slug === "explore")!;
    expect(explore.generatorEmitted).toBe(true);
    expect(explore.plannerOutcome).toBe("planner:intent-removed");
    expect(explore.sectionOutcomes.some((s) => s.includes("removed by operating constraint"))).toBe(true);
    // Home survives: only the post-related sections were removed.
    expect(planned.pageInventory.find((r) => r.slug === "home")!.plannerOutcome).toBe("planned");
  });

  test("B13 intent no-people: section removed, home survives, typed note", () => {
    const graph: ObjectGraph = {
      objects: [
        biz("biz", { description: "Plumbing." }),
        makeObject("svc-a", SVC),
        makeObject("person", PERSON, { title: "Jo" }),
        makeObject("post-a", POST),
      ],
      relationships: [
        makeRelationship("r1", "biz", "provides", "svc-a"),
        makeRelationship("r2", "person", "works_for", "biz"),
        makeRelationship("r3", "biz", "publishes", "post-a"),
      ],
    };
    const intent = { operatingConstraints: ["no-people"] };
    const planned = plan(graph, intent);
    assertPinned(planned, graph, intent);
    expect(planned.pageInventory.find((r) => r.slug === "home")!.plannerOutcome).toBe("planned");
    const components = planned.spec.pages
      .find((p) => p.slug === "home")!
      .sections.map((s) => s.component);
    expect(components).not.toContain("People");
    expect(
      planned.manifest.notes.some((n) => n.includes("removed by operating constraint")),
    ).toBe(true);
  });

  test("B14 no owner: no site, all pages generator:no-data", () => {
    const graph: ObjectGraph = {
      objects: [
        makeObject("post-a", POST, { updatedAt: "2026-09-20T00:00:00.000Z" }),
        makeObject("post-b", POST, { updatedAt: "2026-09-21T00:00:00.000Z" }),
        makeObject("post-c", POST, { updatedAt: "2026-09-22T00:00:00.000Z" }),
        makeObject("post-d", POST, { updatedAt: "2026-09-23T00:00:00.000Z" }),
        makeObject("post-e", POST, { updatedAt: "2026-09-19T00:00:00.000Z" }),
      ],
      relationships: [],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    // "No owner, no site": the generator agrees with the eligibility law,
    // so Explore is not emitted for ownerless graphs either.
    for (const r of planned.pageInventory) {
      expect(r.plannerOutcome).toBe("generator:no-data");
    }
    const explore = planned.pageInventory.find((r) => r.slug === "explore")!;
    expect(explore.generatorReason).toMatch(/no owner, no site/);
    expect(planned.spec.pages).toEqual([]);
  });

  test("B15 knowledge vocabulary: roles project, explore emitted", () => {
    const graph: ObjectGraph = {
      objects: [
        makeObject("kbiz", KBIZ, { title: "Consulting", description: "Automation." }),
        makeObject("ksvc-a", KSVC, { title: "Calls" }),
        makeObject("ksvc-b", KSVC, { title: "Follow-up" }),
        makeObject("kpost-a", KPOST, { title: "Essay" }),
        makeObject("kpost-b", KPOST, { title: "Essay 2" }),
      ],
      relationships: [
        makeRelationship("r1", "kbiz", "offers", "ksvc-a"),
        makeRelationship("r2", "kbiz", "offers", "ksvc-b"),
        makeRelationship("r3", "kbiz", "publishes", "kpost-a"),
        makeRelationship("r4", "kbiz", "publishes", "kpost-b"),
      ],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    expect(exploreOutcome(planned)).toBe("planned");
    expect(planned.spec.pages.map((p) => p.slug).sort()).toEqual(
      expect.arrayContaining(["home", "services", "explore"]),
    );
  });

  test("B16 duplicate inverse employment: person bound once", () => {
    const graph: ObjectGraph = {
      objects: [
        biz("biz"),
        makeObject("person", PERSON, { title: "Jo" }),
        makeObject("svc-a", SVC),
        makeObject("post-a", POST),
      ],
      relationships: [
        makeRelationship("r1", "person", "works_for", "biz"),
        makeRelationship("r2", "biz", "employs", "person"),
        makeRelationship("r3", "biz", "provides", "svc-a"),
        makeRelationship("r4", "biz", "publishes", "post-a"),
      ],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    const people = planned.spec.pages
      .find((p) => p.slug === "home")!
      .sections.find((s) => s.component === "People")!;
    const bound = resolveQuery(people.query, graph, "biz");
    expect(bound.map((o) => o.id)).toEqual(["person"]);
  });

  test("B17 large feed: limit 20 honored, newest-first", () => {
    const objects: PingObject[] = [biz("biz", { description: "Many posts." })];
    const relationships: PingRelationship[] = [];
    for (let i = 1; i <= 25; i++) {
      const id = "post-" + String(i).padStart(2, "0");
      const day = String(i).padStart(2, "0");
      objects.push(
        makeObject(id, POST, { title: "Post " + i, updatedAt: "2026-09-" + day + "T00:00:00.000Z" }),
      );
      relationships.push(makeRelationship("rp" + i, "biz", "publishes", id));
    }
    const graph: ObjectGraph = { objects, relationships };
    const planned = plan(graph);
    assertPinned(planned, graph);
    const bound = exploreBinding(planned, graph);
    expect(bound.length).toBe(20);
    expect(bound[0].id).toBe("post-25");
    // The business itself is feed-renderable (updatedAt 2026-09-21, between
    // post-21 and post-20), so the 20th slot is post-07, not post-06.
    expect(bound[19].id).toBe("post-07");
    expect(bound.map((o) => o.id)).toContain("biz");
    expect(bound.map((o) => o.id)).not.toContain("post-06");
    // The manifest's binding query is the render contract: limit recorded.
    const feed = planned.spec.pages
      .find((p) => p.slug === "explore")!
      .sections.find((s) => s.component === "ObjectFeed")!;
    expect((feed.query as { kind: "all"; limit: number }).limit).toBe(20);
    const binding = planned.manifest.bindings.find((b) => b.bindingId === feed.id)!;
    expect(binding.objectField).toContain("all:");
  });

  test("B18 timestamp ties: id tie-break, deterministic across runs", () => {
    const mk = (): ObjectGraph => ({
      objects: [
        biz("biz"),
        makeObject("post-b", POST, { updatedAt: "2026-09-20T00:00:00.000Z" }),
        makeObject("post-a", POST, { updatedAt: "2026-09-20T00:00:00.000Z" }),
        makeObject("post-c", POST, { updatedAt: "2026-09-20T00:00:00.000Z" }),
      ],
      relationships: [
        makeRelationship("r1", "biz", "publishes", "post-a"),
        makeRelationship("r2", "biz", "publishes", "post-b"),
        makeRelationship("r3", "biz", "publishes", "post-c"),
      ],
    });
    const a = plan(mk());
    const b = plan(mk());
    expect(a.semanticDigest).toBe(b.semanticDigest);
    const idsA = exploreBinding(a, mk()).map((o) => o.id);
    expect(idsA).toEqual(["biz", "post-a", "post-b", "post-c"]);
    expect(exploreBinding(b, mk()).map((o) => o.id)).toEqual(idsA);
  });

  test("B19 private objects do not count toward the explore gate", () => {
    const graph: ObjectGraph = {
      objects: [
        biz("biz"),
        makeObject("svc-a", SVC),
        makeObject("svc-b", SVC, { visibility: "private" }),
        makeObject("post-x", POST, { visibility: "private" }),
      ],
      relationships: [
        makeRelationship("r1", "biz", "provides", "svc-a"),
        makeRelationship("r2", "biz", "provides", "svc-b"),
        makeRelationship("r3", "biz", "publishes", "post-x"),
      ],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    // Only 2 public objects (biz + svc-a): below the gate even though 4
    // objects exist in the graph.
    const explore = planned.pageInventory.find((r) => r.slug === "explore")!;
    expect(explore.plannerOutcome).toBe("generator:no-data");
    expect(explore.generatorReason).toMatch(/public objects 2 < 4/);
    expect(objectFate(graph.objects[2], planned, graph)).toBe("private");
    expect(objectFate(graph.objects[3], planned, graph)).toBe("private");
  });

  test("B20 articles only: explore emitted, recent objects bind articles", () => {
    const graph: ObjectGraph = {
      objects: [
        biz("biz", { description: "Essays." }),
        makeObject("art-a", ARTICLE, { title: "Essay A" }),
        makeObject("art-b", ARTICLE, { title: "Essay B" }),
        makeObject("art-c", ARTICLE, { title: "Essay C" }),
      ],
      relationships: [
        makeRelationship("r1", "biz", "publishes", "art-a"),
        makeRelationship("r2", "biz", "publishes", "art-b"),
        makeRelationship("r3", "biz", "publishes", "art-c"),
      ],
    };
    const planned = plan(graph);
    assertPinned(planned, graph);
    expect(exploreOutcome(planned)).toBe("planned");
    const recent = planned.spec.pages
      .find((p) => p.slug === "home")!
      .sections.find((s) => s.component === "RecentObjects")!;
    expect(resolveQuery(recent.query, graph, "biz").map((o) => o.id).sort()).toEqual([
      "art-a",
      "art-b",
      "art-c",
    ]);
  });

  test("cohort summary: every page outcome in the typed vocabulary, no unexplained drops", () => {
    // A final sweep asserting the pin holds structurally: each inventory
    // entry's outcome is one of the five typed values, and a dropped page
    // always names its sections' fates.
    const graph: ObjectGraph = {
      objects: [biz("biz", { description: "Sweep." })],
      relationships: [],
    };
    const planned = plan(graph);
    const vocab = [
      "planned",
      "generator:no-data",
      "planner:intent-removed",
      "planner:ineligible",
      "planner:empty",
    ];
    for (const r of planned.pageInventory) {
      expect(vocab).toContain(r.plannerOutcome);
    }
  });
});
