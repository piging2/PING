/**
 * P1 PRODUCT proof: Ask FYD against the REAL Coppersmith projection.
 * (Consolidated recovery directive follow-up, 2026-09-24.)
 *
 * The synthetic Acme proof (ask-fyd-evidence-proof.test.ts) proved the
 * composer contract on a hand-built graph. This test runs the SAME proven
 * composer (answerAskFyd -> composeAskFyd) over the real coppersmith-plumbing
 * projection through the authorized read seam (getFydTenantGraph:
 * digest-pinned fixture base + journal overlays), so the evidence contract
 * is proven on real projection data, not a fixture shaped to the test.
 *
 * The overlay journal is stubbed unreachable (the :18199 demo journal is
 * not guaranteed in CI): the proof also asserts the honest degradation
 * contract. The answer must stand on the verified base and NAME the
 * overlay gap in unknowns instead of guessing.
 *
 * Run with: npx jest --config src/fyd/ask/jest.config.cjs
 */
import { answerAskFyd } from "../visitor-answer";
import { getFydTenantGraph } from "../../data/fyd-tenant-graph";
import { generateSiteSpec } from "../../proceduralize/generator";
import { isRenderable, validateSiteSpec } from "../../sitespec/validator";
import { getMediaManifest } from "../../media/bundle-media";
import type { SiteBundle } from "../../media/site-bundle";
import type { PingObject, PingRelationship } from "../../../lib/ping/types";

const SITE_ID = "coppersmith-plumbing";
const QUESTION = "What services does this business offer, and how do you know?";

/** Stub reader: the overlay journal is unreachable. The seam must degrade
 *  honestly: serve the digest-verified base, mark overlaysAvailable=false,
 *  never invent overlay values. */
const UNREACHABLE_JOURNAL = {
  queryFydSiteOverlays: async (_siteId: string): Promise<never[]> => {
    throw new Error("stub: overlay journal unreachable");
  },
};

async function coppersmithBundle(): Promise<SiteBundle> {
  const tenant = await getFydTenantGraph(SITE_ID, {
    reader: UNREACHABLE_JOURNAL,
  });
  const spec = generateSiteSpec(tenant.graph, {
    generatedAt: tenant.meta.generatedAt,
    eventSequences: tenant.meta.eventSequences ?? undefined,
  });
  const findings = validateSiteSpec(
    spec,
    new Set(tenant.graph.objects.map((o: PingObject) => o.schema)),
  );
  const business = tenant.graph.objects.find(
    (o: PingObject) => o.schema === "ping.social.business@1" && o.visibility === "public",
  );
  return {
    siteId: SITE_ID,
    businessName: business?.title?.trim() || SITE_ID,
    graph: tenant.graph,
    spec,
    findings,
    renderable: isRenderable(findings),
    meta: tenant.meta,
    mediaManifest: getMediaManifest(SITE_ID),
  };
}

describe("Ask FYD live proof: real Coppersmith projection", () => {
  test("services question answered from the real projection with cited evidence", async () => {
    const bundle = await coppersmithBundle();

    // The authorized read seam actually served the real projection.
    expect(bundle.meta.siteId).toBe(SITE_ID);
    expect(bundle.meta.overlaysAvailable).toBe(false);
    const services = bundle.graph.objects.filter(
      (o: PingObject) => o.schema === "ping.social.service@1" && o.visibility === "public",
    );
    expect(services.length).toBeGreaterThan(0);

    const outcome = answerAskFyd(
      { siteId: SITE_ID, question: QUESTION, mode: "visitor" },
      { loadBundle: (id) => (id === SITE_ID ? bundle : null) },
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.refusal).toBe(false);

    // Every service on record is named, none invented.
    const titles = services.map((s: PingObject) => s.title);
    for (const t of titles) {
      expect(outcome.answer).toContain(t);
    }
    // Every citation carries an epistemic class and real evidence.
    expect(outcome.citations.length).toBeGreaterThan(0);
    for (const c of outcome.citations) {
      expect(["supported", "derived"]).toContain(c.claimClass);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.source.length).toBeGreaterThan(0);
    }
    // The unreadable journal is named honestly, never papered over.
    expect(outcome.unknowns.join("\n")).toMatch(
      /correction journal was unreachable/i,
    );
    // No inferred claims leak as plain facts: every cited claim is
    // labeled "supported" (cited evidence) here because the real graph
    // carries website-derived records only.
    expect(
      outcome.citations.every((c) => c.claimClass === "supported"),
    ).toBe(true);
  });

  test("answer is byte-identical across two runs on the real projection", async () => {
    const bundle = await coppersmithBundle();
    const run = () =>
      answerAskFyd(
        { siteId: SITE_ID, question: QUESTION, mode: "visitor" },
        { loadBundle: (id) => (id === SITE_ID ? bundle : null) },
      );
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  test("prose-only services on the real record refuse honestly", async () => {
    // Strip the offers relationships from the real graph: the answer must
    // name the gap, never the business description's prose hints.
    const bundle = await coppersmithBundle();
    const stripped = {
      ...bundle,
      graph: {
        ...bundle.graph,
        relationships: bundle.graph.relationships.filter(
          (r: PingRelationship) => !(r.predicate === "offers" || r.predicate === "provides"),
        ),
      },
    };
    const outcome = answerAskFyd(
      { siteId: SITE_ID, question: QUESTION, mode: "visitor" },
      { loadBundle: (id) => (id === SITE_ID ? stripped : null) },
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.refusal).toBe(true);
    for (const invented of ["Plumbing", "Ventilation", "HVAC"]) {
      expect(outcome.answer).not.toContain("offers " + invented);
    }
  });
});
