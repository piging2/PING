/**
 * Wiring test: runExtractionPipeline emits designSignal as a SIBLING of the
 * business extraction (presentation-observations.md: "Signal, not evidence").
 *
 * NOTE: this suite stubs ../feed-parser because the lane's node_modules is
 * missing the fast-xml-parser dependency (pre-existing breakage that also
 * fails the lane's own proceduralizer.test.ts; not touched here). The stub
 * only removes the broken import from the module graph; the wiring under
 * test is unchanged.
 */

jest.mock("../feed-parser", () => ({
  feedFacts: () => [],
}));

jest.mock("../structured-data", () => ({
  extractStructuredData: () => ({
    facts: [],
    relationships: [],
    entities: [],
    unsupported: [],
    stats: {
      blocksTotal: 0,
      blocksOk: 0,
      blocksMalformed: 0,
      nodesVisited: 0,
      nodeIds: [],
      privateFactsWithheld: 0,
    },
  }),
  selectPrimaryBusiness: () => null,
}));

import { runExtractionPipeline, type AcquiredSource } from "../proceduralizer";

const BASE = "https://www.example.com";

const FIXTURE_HTML = `<!DOCTYPE html>
<html>
<head><title>Example Carpentry Co</title></head>
<body>
<header><nav><a href="/">Home</a><a href="/services">Services</a></nav></header>
<main>
<section id="hero"><h1>We Build Beautiful Decks</h1>
<img src="/images/hero-deck.jpg" alt="new cedar deck project we completed" width="1600" height="900">
</section>
<section id="services"><h2>Our Services</h2><p>Decks and fences.</p></section>
</main>
</body>
</html>`;

describe("designSignal wiring in the proceduralizer", () => {
  test("emits designSignal alongside (not inside) the business extraction", async () => {
    const acquired: AcquiredSource[] = [
      {
        url: BASE + "/",
        sourceType: "html",
        discoveredAt: "2026-09-25T00:00:00.000Z",
        raw: FIXTURE_HTML,
        ok: true,
        status: 200,
      },
    ];
    const out = await runExtractionPipeline(acquired, {
      sourceUrl: BASE + "/",
      observedAt: "2026-09-25T00:00:00.000Z",
      controllerId: "test-controller",
    });
    // Existing extraction path intact.
    expect(out.graph).toBeDefined();
    expect(Array.isArray(out.fields)).toBe(true);
    expect(out.report).toBeDefined();
    // designSignal: sibling block, separate from business evidence.
    expect(Array.isArray(out.designSignal)).toBe(true);
    expect(out.designSignal).toHaveLength(1);
    const signal = out.designSignal[0];
    expect(signal.authority).toBe("signal-not-authority");
    expect(signal.sourceUrl).toBe(BASE + "/");
    expect(signal.navigation.labels).toEqual(["Home", "Services"]);
    // The business evidence blocks do not contain presentation fields.
    expect(out.report).not.toHaveProperty("brandColors");
    expect(out.report).not.toHaveProperty("navigation");
    expect(out.graph).not.toHaveProperty("designSignal");
    expect(JSON.stringify(out.fields)).not.toContain("signal-not-authority");
  });

  test("failed or non-HTML sources yield no design signal (nothing fabricated)", async () => {
    const acquired: AcquiredSource[] = [
      {
        url: BASE + "/dead",
        sourceType: "html",
        discoveredAt: "2026-09-25T00:00:00.000Z",
        raw: "",
        ok: false,
        status: 404,
      },
    ];
    const out = await runExtractionPipeline(acquired, {
      sourceUrl: BASE + "/dead",
      observedAt: "2026-09-25T00:00:00.000Z",
      controllerId: "test-controller",
    });
    expect(out.designSignal).toEqual([]);
  });
});
