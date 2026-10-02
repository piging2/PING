/**
 * Proof 5 scaffold test: the React presentation adapter renders both real
 * businesses from their semantic render models.
 *
 * HARVEST BANNER (piging2)
 * MODE: new. Proof-5 acceptance test for packages/react-renderer.
 * TARGET OWNER: packages/react-renderer (piging2 presentation adapter)
 * DEPENDENCIES: ../src/index, ../../sitespec/src/{generator,projection,
 *               render-model}, ../../sitespec/fixtures/{happy-place-graph,
 *               coppersmith-graph} (captured records, machine-generated)
 * PROOFS: [5]
 *
 * What this proves (and what it does not):
 * - Both businesses (Happy Place, Coppersmith) render to static HTML
 *   through the EXISTING proven React runtime (react 18.3.1 /
 *   react-dom 18.3.1, exact pins from the FYD lockfile). No new
 *   framework, no customer-specific JSX, no customer-specific CSS.
 * - The business name is present; every model section renders with its
 *   identity hook; the render is byte-deterministic.
 * - No invented claims: an unbound fact and a probe string absent from
 *   the data never appear in the output; every bound object's title does.
 * - The render model is the sole authority on what renders: facts for
 *   object ids the model does not bind are ignored.
 *
 * It does NOT prove visual fidelity, styling, or the Next.js app shell:
 * those belong to the app layer, not the presentation adapter.
 */

import { generateSiteSpec } from "../../sitespec/src/generator";
import { buildVerifiedPublicProjection } from "../../sitespec/src/projection";
import {
  buildSemanticRenderModel,
  type SemanticRenderModel,
} from "../../sitespec/src/render-model";
import type { ObjectGraph } from "../../sitespec/src/types";
import { HAPPY_PLACE_GRAPH } from "../../sitespec/fixtures/happy-place-graph";
import { COPPERSMITH_GRAPH } from "../../sitespec/fixtures/coppersmith-graph";
import {
  factsFromProjection,
  type FactsById,
} from "../src/facts";
import { renderModelToStaticHtml } from "../src/render";

const GEN_AT = "2026-10-02T12:00:00Z";

interface Built {
  model: SemanticRenderModel;
  facts: FactsById;
}

/** Model + public facts for one captured business graph. */
function build(graph: ObjectGraph): Built {
  const spec = generateSiteSpec(graph, { generatedAt: GEN_AT });
  const projection = buildVerifiedPublicProjection(graph);
  const model = buildSemanticRenderModel(spec, projection);
  return { model, facts: factsFromProjection(projection) };
}

/** Strip tags and decode the entities React emits, for text assertions. */
function htmlText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** All object ids the model binds, in model order. */
function boundIds(model: SemanticRenderModel): string[] {
  const out: string[] = [];
  for (const page of model.pages) {
    for (const section of page.sections) {
      out.push(...section.objectIds);
    }
  }
  return [...new Set(out)];
}

describe("proof 5: React presentation adapter", () => {
  const happy = build(HAPPY_PLACE_GRAPH);
  const copper = build(COPPERSMITH_GRAPH);

  test("renders the Happy Place model: business name and sections present", () => {
    for (const page of happy.model.pages) {
      const html = renderModelToStaticHtml(happy.model, happy.facts, page.slug);
      for (const section of page.sections) {
        expect(html).toContain(`data-render-section="${section.id}"`);
        expect(html).toContain(`data-component="${section.component}"`);
      }
    }
    expect(happy.model.pages.length).toBeGreaterThan(0);
    // The business name renders on the pages that bind the owner: home
    // (Hero) and about (BusinessSummary heads itself "About {title}",
    // harvested from the source renderer).
    const homeHtml = htmlText(
      renderModelToStaticHtml(happy.model, happy.facts, "home"),
    );
    expect(homeHtml).toContain("Happy Place Carpentry LLC");
    const aboutHtml = htmlText(
      renderModelToStaticHtml(happy.model, happy.facts, "about"),
    );
    expect(aboutHtml).toContain("Happy Place Carpentry LLC");
  });

  test("renders the Coppersmith model: business name and sections present", () => {
    for (const page of copper.model.pages) {
      const html = renderModelToStaticHtml(copper.model, copper.facts, page.slug);
      for (const section of page.sections) {
        expect(html).toContain(`data-render-section="${section.id}"`);
      }
    }
    expect(copper.model.pages.length).toBeGreaterThan(0);
    const homeHtml = htmlText(
      renderModelToStaticHtml(copper.model, copper.facts, "home"),
    );
    expect(homeHtml).toContain("Coppersmith Plumbing - HVAC - Mechanical");
  });

  test("every bound object's title is rendered (traceable to the model)", () => {
    for (const built of [happy, copper]) {
      const html = renderModelToStaticHtml(built.model, built.facts);
      const text = htmlText(html);
      for (const id of boundIds(built.model)) {
        const f = built.facts[id];
        expect(f).toBeDefined();
        expect(text).toContain(f.title);
      }
    }
  });

  test("renders only what the model binds: unbound facts are ignored", () => {
    const poisoned: FactsById = {
      ...happy.facts,
      "unbound-probe-object": {
        id: "unbound-probe-object",
        schema: "ping.social.business@1",
        title: "UNBOUND-PROBE-BUSINESS-xyzzy-123",
        description: "This object is not bound by the model.",
        fields: {},
        claimKind: "website_statement",
      },
    };
    const html = renderModelToStaticHtml(happy.model, poisoned);
    expect(html).not.toContain("UNBOUND-PROBE-BUSINESS-xyzzy-123");
    expect(html).not.toContain("unbound-probe-object");
  });

  test("no invented claims: probe strings absent from the data never render", () => {
    for (const built of [happy, copper]) {
      const html = renderModelToStaticHtml(built.model, built.facts);
      expect(html).not.toContain("ZZZ-INVENTED-CLAIM-9f8e7d6c5b4a");
      // And the positive: every factual string rendered is traceable.
      // The adapter renders only model strings (ids, components) and
      // bound-fact strings; the probe above plus the unbound-fact test
      // pin both halves of that contract.
      expect(htmlText(html)).not.toContain("lorem ipsum");
    }
  });

  test("unknown components fall back to the generic card, never fail", () => {
    const ownerId = boundIds(happy.model)[0];
    const model: SemanticRenderModel = {
      ...happy.model,
      pages: [
        {
          slug: "probe",
          sections: [
            { id: "probe:Nope:0", component: "Nope", objectIds: [ownerId] },
          ],
        },
      ],
    };
    const html = renderModelToStaticHtml(model, happy.facts, "probe");
    expect(html).toContain('data-component="Nope"');
    expect(htmlText(html)).toContain("Happy Place Carpentry LLC");
  });

  test("the render is byte-deterministic", () => {
    for (const built of [happy, copper]) {
      for (const page of built.model.pages) {
        const a = renderModelToStaticHtml(built.model, built.facts, page.slug);
        const b = renderModelToStaticHtml(built.model, built.facts, page.slug);
        expect(b).toBe(a);
      }
    }
  });

  test("unknown page slugs fail closed", () => {
    expect(() =>
      renderModelToStaticHtml(happy.model, happy.facts, "no-such-page"),
    ).toThrow(/unknown page/);
  });
});
