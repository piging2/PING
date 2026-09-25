/**
 * Tests for presentation observations (presentation-obs@1,
 * presentation-observations.md Part A).
 *
 * Contract:
 * - The `authority: "signal-not-authority"` marker is mandatory and
 *   validated at write time: missing/tampered markers are rejected,
 *   never defaulted.
 * - The 12 observation fields are derived deterministically from served
 *   HTML + CSS only: same bytes in, same record out.
 * - Confidence tiers (direct | derived | inferred) are honest per field.
 * - runExtractionPipeline emits designSignal as a SIBLING of the
 *   business extraction, without altering the existing extraction path.
 */

import {
  isHtmlDocument,
  isPresentationObservation,
  observeDesignSignals,
  observePresentation,
  validatePresentationObservation,
  type PresentationObservation,
} from "../presentation-observe";

const BASE = "https://www.example.com";

const FIXTURE_HTML = `<!DOCTYPE html>
<html>
<head>
<title>Example Carpentry Co</title>
<meta property="og:image" content="/images/og-brand.png">
<link rel="icon" href="/favicon.ico">
<style>
h1 { font-family: Georgia, "Times New Roman", serif; font-size: 48px; color: #B4552D; }
p { font-family: Arial, Helvetica, sans-serif; font-size: 16px; }
section { padding-top: 80px; padding-bottom: 80px; }
.btn-primary { background-color: #B4552D; color: #FFFFFF; border-radius: 8px; }
.cta { border-color: #B4552D; }
.card { border-radius: 8px; background-color: #F5F1E8; }
a { color: #1F5C5C; }
footer { background-color: #2B2B2B; }
</style>
<script type="application/ld+json">{"@type":"LocalBusiness","name":"Example Carpentry Co","logo":"https://www.example.com/logo-jsonld.png"}</script>
</head>
<body>
<header>
<nav>
<a href="/">Home</a>
<a href="/services">Services</a>
<a href="/about">About</a>
<a href="/contact" class="btn btn-primary">Get a Quote</a>
<img src="/images/logo-header.png" alt="Business logo" width="180" height="60">
</nav>
</header>
<main>
<section id="hero" class="hero-section">
<h1>We Build Beautiful Decks</h1>
<img src="/images/hero-deck.jpg" alt="new cedar deck project we completed" width="1600" height="900">
<a href="tel:+15551234567" class="btn btn-primary">Call Now</a>
</section>
<section id="services">
<h2>Our Services</h2>
<img src="/images/deck-thumb.jpg" alt="deck framing" width="800" height="600">
<img src="/images/fence-thumb.jpg" alt="fence" width="600" height="800">
<img src="/images/stock-photo.jpg" alt="" width="400" height="300">
</section>
<section id="projects">
<h2>Our Work</h2>
<p>Take a look at recent projects around town.</p>
<img src="/images/porch.jpg" alt="porch before and after" width="1200" height="800">
</section>
<section id="testimonials">
<h2>Customer Reviews</h2>
<p>Neighbors love our work.</p>
</section>
</main>
<footer>
<img src="/images/footer-brand.png" alt="brand mark" width="120" height="40">
<a href="/privacy">Privacy</a>
</footer>
</body>
</html>`;

function observe(): PresentationObservation {
  const obs = observePresentation({
    url: BASE + "/",
    observedAt: "2026-09-25T00:00:00.000Z",
    html: FIXTURE_HTML,
    cssTexts: [],
    level: 1,
  });
  expect(obs).not.toBeNull();
  return obs!;
}

describe("signal-not-authority write-time gate", () => {
  test("a real observed record passes validation", () => {
    const obs = observe();
    expect(() => validatePresentationObservation(obs)).not.toThrow();
    expect(isPresentationObservation(obs)).toBe(true);
  });

  test("missing marker is rejected, never defaulted", () => {
    expect(() => validatePresentationObservation({})).toThrow(/signal-not-authority/);
    expect(() => validatePresentationObservation(null)).toThrow(/signal-not-authority/);
    expect(isPresentationObservation({})).toBe(false);
  });

  test("a tampered marker is rejected", () => {
    const obs = observe();
    const tampered = { ...obs, authority: "canonical" };
    expect(() => validatePresentationObservation(tampered)).toThrow(/signal-not-authority/);
    expect(isPresentationObservation(tampered)).toBe(false);
  });

  test("every observed record carries the literal marker and schema version", () => {
    const obs = observe();
    expect(obs.authority).toBe("signal-not-authority");
    expect(obs.obsVersion).toBe("presentation-obs@1");
    expect(obs.levelUsed).toBe(1);
    expect(obs.sourceUrl).toBe(BASE + "/");
    expect(obs.sourceHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("determinism", () => {
  test("same bytes in, same record out", () => {
    expect(observe()).toEqual(observe());
  });

  test("empty or non-HTML input yields no observation (nothing fabricated)", () => {
    expect(
      observePresentation({ url: BASE, observedAt: "2026-09-25T00:00:00.000Z", html: "", cssTexts: [], level: 1 }),
    ).toBeNull();
    expect(
      observePresentation({ url: BASE, observedAt: "2026-09-25T00:00:00.000Z", html: "just text", cssTexts: [], level: 1 }),
    ).toBeNull();
    expect(isHtmlDocument("just text")).toBe(false);
    expect(isHtmlDocument("<html><body>hi</body></html>")).toBe(true);
  });
});

describe("field extractors", () => {
  test("A.1 logos: header, og-image, jsonld, favicon, footer fallback", () => {
    const obs = observe();
    const byPos = new Map(obs.logo.map((l) => [l.position, l]));
    expect(byPos.get("header")!.url).toBe(BASE + "/images/logo-header.png");
    expect(byPos.get("header")!.dimensions).toEqual({ width: 180, height: 60, measured: "intrinsic" });
    expect(byPos.get("header")!.format).toBe("png");
    expect(byPos.get("header")!.confidence).toBe("direct");
    expect(byPos.get("og-image")!.url).toBe(BASE + "/images/og-brand.png");
    expect(byPos.get("jsonld")!.url).toBe("https://www.example.com/logo-jsonld.png");
    expect(byPos.get("favicon")!.url).toBe(BASE + "/favicon.ico");
    const footer = byPos.get("footer")!;
    expect(footer.url).toBe(BASE + "/images/footer-brand.png");
    expect(footer.confidence).toBe("inferred");
  });

  test("A.2 brand colors: ranked evidence list, normalized hex, occurrence counts", () => {
    const obs = observe();
    expect(obs.brandColors.length).toBeGreaterThan(0);
    const top = obs.brandColors[0];
    expect(top.color).toBe("#B4552D");
    expect(top.occurrences).toBe(3); // background-color, color, border-color
    expect(top.roles.sort()).toEqual(["background-color", "border-color", "color"]);
    expect(top.confidence).toBe("direct");
    // Sorted by occurrences desc, then color asc (deterministic ties).
    for (let i = 1; i < obs.brandColors.length; i++) {
      expect(obs.brandColors[i - 1].occurrences).toBeGreaterThanOrEqual(obs.brandColors[i].occurrences);
    }
    expect(obs.brandColors.length).toBeLessThanOrEqual(12);
  });

  test("A.3 typography: display/body stacks and scale ratio", () => {
    const obs = observe();
    expect(obs.typography.displayStack).toEqual(["Georgia", "Times New Roman", "serif"]);
    expect(obs.typography.bodyStack).toEqual(["Arial", "Helvetica", "sans-serif"]);
    expect(obs.typography.headingBodyScaleRatio).toBeCloseTo(3.0, 10);
    expect(obs.typography.confidence).toBe("direct");
  });

  test("A.4 image aspects: buckets, dominant, share", () => {
    const obs = observe();
    expect(obs.imageAspects.total).toBe(5);
    expect(obs.imageAspects.buckets).toEqual({ square: 0, portrait: 1, landscape: 4, wide: 0 });
    expect(obs.imageAspects.dominant).toBe("landscape");
    expect(obs.imageAspects.dominantShare).toBeCloseTo(0.8, 10);
    expect(obs.imageAspects.confidence).toBe("direct");
  });

  test("A.5 image density: derived band", () => {
    const obs = observe();
    expect(obs.imageDensity.imagesPerSection).toBeCloseTo(5 / 4, 10);
    expect(["low", "medium", "high"]).toContain(obs.imageDensity.band);
    expect(obs.imageDensity.confidence).toBe("derived");
  });

  test("A.6 navigation: labels, hrefs, nav CTA (inferred on L1)", () => {
    const obs = observe();
    expect(obs.navigation.labels).toEqual(["Home", "Services", "About", "Get a Quote"]);
    expect(obs.navigation.hrefs[1]).toBe(BASE + "/services");
    expect(obs.navigation.depth).toBe(4);
    expect(obs.navigation.navCta).toEqual({ label: "Get a Quote", href: BASE + "/contact" });
    expect(obs.navigation.sticky).toBe(false);
    expect(obs.navigation.confidence).toBe("inferred");
  });

  test("A.7 section sequence: semantic kinds in DOM order", () => {
    const obs = observe();
    expect(obs.sectionSequence.map((s) => s.sectionKind)).toEqual([
      "hero",
      "services",
      "projects",
      "testimonials",
    ]);
    expect(obs.sectionSequence.map((s) => s.order)).toEqual([0, 1, 2, 3]);
    expect(obs.sectionSequence.every((s) => s.kind === "semantic")).toBe(true);
    expect(obs.sectionSequence[0].heading).toBe("We Build Beautiful Decks");
    expect(obs.sectionSequence[0].heightPx).toBeNull(); // L1: no rendered heights
  });

  test("A.8 CTA inventory: tiers, placement, target kinds", () => {
    const obs = observe();
    const labels = obs.ctas.items.map((i) => i.label);
    expect(labels).toContain("Get a Quote");
    expect(labels).toContain("Call Now");
    const quote = obs.ctas.items.find((i) => i.label === "Get a Quote")!;
    expect(quote.observedTier).toBe("primary");
    expect(quote.placement).toBe("in-nav");
    expect(quote.targetKind).toBe("form"); // /contact matches the form target rule
    const call = obs.ctas.items.find((i) => i.label === "Call Now")!;
    expect(call.observedTier).toBe("primary");
    expect(call.placement).toBe("hero");
    expect(call.targetKind).toBe("tel:");
    expect(obs.ctas.primaryCount).toBe(2);
    expect(obs.ctas.dominantPrimaryLabel).toBe("Get a Quote"); // tie: first in DOM order
  });

  test("A.9 layout density: median section padding -> comfortable", () => {
    const obs = observe();
    expect(obs.layoutDensity.medianSectionPaddingY).toBe(160);
    expect(obs.layoutDensity.rhythm).toBe("comfortable");
    expect(obs.layoutDensity.contentMaxWidth).toBeNull();
    expect(obs.layoutDensity.confidence).toBe("direct");
  });

  test("A.10 border radius: median 8px -> soft", () => {
    const obs = observe();
    expect(obs.borderRadius.medianRadiusPx).toBe(8);
    expect(obs.borderRadius.shape).toBe("soft");
    expect(obs.borderRadius.confidence).toBe("direct");
  });

  test("A.11 image treatment: photography, polished majority, declared method", () => {
    const obs = observe();
    expect(obs.imageTreatment.medium).toBe("photography");
    expect(obs.imageTreatment.finish).toBe("polished");
    expect(obs.imageTreatment.finishMethod).toContain("V1 finish rule");
    expect(obs.imageTreatment.confidence).toBe("inferred");
  });

  test("every field carries provenance back to the source", () => {
    const obs = observe();
    const methods = [
      obs.typography.provenance.method,
      obs.imageAspects.provenance.method,
      obs.navigation.provenance.method,
      obs.layoutDensity.provenance.method,
      obs.borderRadius.provenance.method,
      obs.imageTreatment.provenance.method,
    ];
    for (const m of methods) {
      expect(["served-css", "computed-style", "dom-structure", "meta-tag"]).toContain(m);
    }
    expect(obs.brandColors[0].provenance.observedFrom).toContain("background-color");
  });

  test("A.8 CTA inventory: anchors and buttons merge in true DOM order", () => {
    const html = `<!DOCTYPE html><html><head><title>T</title></head><body>
<main>
<button class="btn-primary">Book Now</button>
<a href="/quote" class="btn-primary">Get a Quote</a>
</main>
</body></html>`;
    const obs = observePresentation({
      url: BASE + "/",
      observedAt: "2026-09-25T00:00:00.000Z",
      html,
      cssTexts: [],
      level: 1,
    })!;
    expect(obs.ctas.items.map((i) => i.label)).toEqual(["Book Now", "Get a Quote"]);
    // Tie in primary counts: first in DOM order wins.
    expect(obs.ctas.dominantPrimaryLabel).toBe("Book Now");
  });

  test("A.7 section sequence: only DIRECT children of main are entries (nested excluded)", () => {
    const html = `<!DOCTYPE html><html><head><title>T</title></head><body>
<main>
<section id="services"><h2>Services</h2>
<section id="nested-detail"><h3>Detail</h3></section>
</section>
<section id="contact"><h2>Contact</h2></section>
</main>
</body></html>`;
    const obs = observePresentation({
      url: BASE + "/",
      observedAt: "2026-09-25T00:00:00.000Z",
      html,
      cssTexts: [],
      level: 1,
    })!;
    // Per the locked A.7 observed-from: direct children of main only.
    expect(obs.sectionSequence.map((s) => s.sectionKind)).toEqual(["services", "contact"]);
    expect(obs.sectionSequence.map((s) => s.order)).toEqual([0, 1]);
  });
});

describe("observeDesignSignals helper", () => {
  test("derives one record per HTML source, skipping failed ones", () => {
    const signals = observeDesignSignals(
      [
        { url: BASE + "/a", raw: FIXTURE_HTML, ok: true },
        { url: BASE + "/b", raw: "", ok: false },
      ],
      "2026-09-25T00:00:00.000Z",
    );
    expect(signals).toHaveLength(1);
    expect(signals[0].sourceUrl).toBe(BASE + "/a");
    expect(signals[0].authority).toBe("signal-not-authority");
  });
});
