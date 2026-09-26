/**
 * FYD media pipeline invariants (Phase 4 verification).
 *
 * These tests pin the download + digest + derivative contract against the
 * committed pipeline manifests and the derivative bytes on disk:
 * - every published manifest asset answers where it came from
 *   (provenance.sourceUrl), when it was observed (provenance.observedAt),
 *   and what bytes generated its derivatives (digest), with a recorded
 *   rights basis;
 * - every derivative variant is served FYD-local (/fyd-media/...) and the
 *   bytes on disk sha256-match the manifest entry;
 * - unacquired (rights-rejected) references never surface as media:
 *   the dead happyplacecarpentry.com OG image exists only as an
 *   unacquired reference in the happy-place observations and never
 *   becomes a src; third-party manufacturer catalog imagery demoted by
 *   the 2026-09-26 rights review is reference-only for the same reason;
 * - end to end: loadObjectViewById("coppersmith-plumbing", businessId)
 *   lists all 13 bound assets with local srcs, and the circle adapter picks
 *   the logo/hero derivative for the background.
 *
 * Run from the repo root so manifests resolve via process.cwd():
 * npx jest --config src/fyd/media/jest.config.cjs
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPingObjectGraphSync } from "@/fyd/data/ping-object-source";
import { loadObjectViewById } from "../../object/by-id";
import { objectViewToCircleProjection } from "../../object/circle-adapter";
import {
  getMediaManifest,
  getPipelineManifest,
  validatePipelineManifest,
} from "../bundle-media";
import {
  GRADIENT_BASIS,
  gradientFor,
  resolveCircleBackground,
} from "../circle-background";
import { heroMediaFor, listObjectMedia } from "../select";
import { isAcquirable, MEDIA_MODULE_VERSION } from "../types";

const PROJECTIONS = join(
  __dirname,
  "..",
  "..",
  "object",
  "__tests__",
  "fixtures",
  "projections",
);

const COPPER = {
  site: "coppersmith-plumbing",
  business: "website-business-2f1327c09d622175",
};
const HAPPY = {
  site: "happy-place",
  business: "website-business-6fa5ebd99d72c4cb",
};
/** Exists only as an unacquired reference in the happy-place business fields. */
const HAPPY_UNACQUIRED_HERO =
  "https://happyplacecarpentry.com/images/hero-background-enhanced.jpg";

const HEX64 = /^[0-9a-f]{64}$/;

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

beforeEach(() => {
  process.env.FYD_OWNER_DIR = mkdtempSync(join(tmpdir(), "fyd-media-inv-"));
  process.env.FYD_PROJECTION_DIR = PROJECTIONS;
});

describe("committed manifest provenance + rights invariants", () => {
  test("coppersmith: all 13 bound assets carry sourceUrl + observedAt + digest + rights", () => {
    const manifest = getPipelineManifest(COPPER.site);
    expect(manifest).not.toBeNull();
    expect(manifest!.media).toHaveLength(13);
    for (const m of manifest!.media) {
      expect(m.lifecycle).toBe("published");
      expect(m.provenance.sourceUrl).toMatch(/^https:\/\//);
      expect(m.provenance.sourcePage).toMatch(/^https:\/\//);
      expect(m.provenance.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(m.digest).toMatch(HEX64);
      expect(isAcquirable(m.rightsSource)).toBe(true);
      expect(m.rightsBasis.trim().length).toBeGreaterThan(0);
      expect(m.variants.length).toBeGreaterThan(0);
    }
  });

  test("coppersmith: every derivative is FYD-local and its bytes digest-match", () => {
    const manifest = getPipelineManifest(COPPER.site);
    expect(manifest).not.toBeNull();
    let checked = 0;
    for (const m of manifest!.media) {
      for (const v of m.variants) {
        // Served URL is FYD-local: never a hotlink to the source site.
        expect(v.url.startsWith("/fyd-media/")).toBe(true);
        expect(v.url).not.toContain("coppersmithplumbing.com");
        const diskPath = join(process.cwd(), "public", v.url);
        expect(existsSync(diskPath)).toBe(true);
        expect(sha256File(diskPath)).toBe(v.digest);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("unacquired references never surface as media", () => {
  test("happy-place: every acquired asset carries sourceUrl + observedAt + digest + rights", () => {
    const manifest = getPipelineManifest(HAPPY.site);
    expect(manifest).not.toBeNull();
    expect(manifest!.media).toHaveLength(10);
    for (const m of manifest!.media) {
      expect(m.lifecycle).toBe("published");
      expect(m.provenance.sourceUrl).toMatch(/^https:\/\//);
      expect(m.provenance.sourcePage).toMatch(/^https:\/\//);
      expect(m.provenance.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(m.digest).toMatch(HEX64);
      expect(isAcquirable(m.rightsSource)).toBe(true);
      expect(m.rightsBasis.trim().length).toBeGreaterThan(0);
      expect(m.variants.length).toBeGreaterThan(0);
      for (const v of m.variants) {
        expect(v.url.startsWith("/fyd-media/")).toBe(true);
        expect(v.url).not.toContain("happy-place-platform.vercel.app");
      }
    }
  });

  test("happy-place: media surfaces through selectors; the unacquired dead-domain reference never does", () => {
    const graph = getPingObjectGraphSync(HAPPY.site).graph;
    expect(listObjectMedia(HAPPY.site, graph, HAPPY.business)).toHaveLength(10);
    expect(heroMediaFor(HAPPY.site, graph, HAPPY.business)).not.toBeNull();
    expect(getMediaManifest(HAPPY.site)?.items).toHaveLength(10);
    const view = loadObjectViewById(HAPPY.site, HAPPY.business);
    expect(view).not.toBeNull();
    expect(view!.media).toHaveLength(10);
    for (const m of view!.media) {
      expect(m.src.startsWith("/fyd-media/")).toBe(true);
      expect(m.src).not.toContain("happyplacecarpentry.com");
    }
    // The unacquired dead-domain OG image is an ingest observation only:
    // never a src.
    expect(JSON.stringify(view!.media)).not.toContain(HAPPY_UNACQUIRED_HERO);
  });

  test("happy-place: circle background serves the acquired hero derivative", () => {
    const bg = resolveCircleBackground(HAPPY.site);
    expect(bg.kind).toBe("image");
    if (bg.kind === "image") {
      expect(bg.src.startsWith("/fyd-media/")).toBe(true);
      expect(bg.src).not.toContain("happyplacecarpentry.com");
      expect(bg.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  test("coppersmith: rights-demoted manufacturer imagery is reference-only, never a src", () => {
    const manifest = getPipelineManifest(COPPER.site);
    expect(manifest).not.toBeNull();
    const demotions = manifest!.observations.filter(
      (o) => o.outcome === "rejected" && (o.reason ?? "").includes("Rights demotion"),
    );
    // 8 manufacturer catalog shots + 1 placeholder graphic.
    expect(demotions).toHaveLength(9);
    const view = loadObjectViewById(COPPER.site, COPPER.business);
    expect(view).not.toBeNull();
    const srcs = JSON.stringify(view!.media);
    for (const d of demotions) {
      expect(srcs).not.toContain(d.sourceUrl);
    }
  });
});

describe("coppersmith end to end: object view media + circle adapter", () => {
  test("loadObjectViewById lists all 13 bound assets with local srcs", () => {
    const view = loadObjectViewById(COPPER.site, COPPER.business);
    expect(view).not.toBeNull();
    expect(view!.media).toHaveLength(13);
    // Logos lead, then heroes, then gallery: stable content-driven order.
    expect(view!.media[0].role).toBe("logo");
    for (const m of view!.media) {
      expect(m.src.startsWith("/fyd-media/")).toBe(true);
      expect(m.src).not.toContain("coppersmithplumbing.com");
      expect(m.digest).toMatch(HEX64);
      expect(isAcquirable(m.rightsSource)).toBe(true);
      expect(m.rightsBasis.trim().length).toBeGreaterThan(0);
      expect(m.sourceUrl).toMatch(/^https:\/\//);
      expect(m.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
    // Responsive contract: multi-rendition assets carry an honest srcset
    // (actual variant widths, ascending); single-rendition assets carry null.
    const hero = view!.media.find((m) => m.role === "hero");
    expect(hero).toBeDefined();
    expect(hero!.srcset).toMatch(/480w, .*768w/);
    for (const cand of hero!.srcset!.split(", ")) {
      expect(cand).toMatch(/^\/fyd-media\/coppersmith-plumbing\/[0-9a-f]{64}\/\S+ \d+w$/);
    }
    const logo = view!.media.find((m) => m.role === "logo");
    expect(logo).toBeDefined();
    expect(logo!.srcset).toBeNull();
  });

  test("heroMediaFor picks the hero-role derivative, never a logo", () => {
    const graph = getPingObjectGraphSync(COPPER.site).graph;
    const hero = heroMediaFor(COPPER.site, graph, COPPER.business);
    expect(hero).not.toBeNull();
    expect(hero!.role).toBe("hero");
    expect(hero!.src.startsWith("/fyd-media/")).toBe(true);
  });

  test("circle adapter picks the logo derivative for the background", () => {
    const view = loadObjectViewById(COPPER.site, COPPER.business);
    expect(view).not.toBeNull();
    const circle = objectViewToCircleProjection(view!);
    const bg = circle.background;
    expect(bg.kind).toBe("image");
    if (bg.kind === "image") {
      // First hero/logo entry in view.media order wins: the logo.
      expect(bg.src).toBe(view!.media[0].src);
      expect(bg.src.startsWith("/fyd-media/")).toBe(true);
      expect(bg.digest).toBe(view!.media[0].digest);
      expect(bg.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  test("resolveCircleBackground serves the acquired hero derivative", () => {
    const bg = resolveCircleBackground(COPPER.site);
    expect(bg.kind).toBe("image");
    if (bg.kind === "image") {
      expect(bg.src.startsWith("/fyd-media/")).toBe(true);
      expect(bg.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});

describe("validator provenance hardening (Phase 4)", () => {
  const TS = "2026-09-21T00:00:00.000Z";
  const item = (overrides: Record<string, unknown> = {}): unknown => ({
    id: "fyd-media-test",
    schema: "ping.social.media@1",
    title: "Test",
    mediaType: "image",
    roles: ["gallery"],
    rightsSource: "public-demo-source",
    rightsBasis: "test basis",
    lifecycle: "published",
    provenance: {
      sourceUrl: "https://example.com/t.jpg",
      sourcePage: "https://example.com/",
      observedAt: TS,
    },
    digest: "a".repeat(64),
    originalFormat: "jpeg",
    width: 100,
    height: 100,
    variants: [
      {
        name: "thumbnail",
        width: 100,
        height: 100,
        format: "webp",
        url: "/fyd-media/test/thumbnail-100w.webp",
        bytes: 10,
        digest: "a".repeat(64),
        derivedFrom: "a".repeat(64),
      },
    ],
    depicts: [],
    altText: null,
    altTextSource: "none",
    visibility: "public",
    ...overrides,
  });
  const manifest = (media: unknown[]): unknown => ({
    siteId: "phase4-test",
    generatedAt: TS,
    generator: MEDIA_MODULE_VERSION,
    ingestRunId: "test-run-id",
    pipelineVersion: MEDIA_MODULE_VERSION,
    observations: [],
    media,
  });

  test("rejects an item missing provenance.sourceUrl", () => {
    const bad = item({
      provenance: { sourcePage: "https://example.com/", observedAt: TS },
    });
    expect(validatePipelineManifest(manifest([bad]), "phase4-test")).toBeNull();
  });

  test("rejects an item missing provenance.observedAt", () => {
    const bad = item({
      provenance: {
        sourceUrl: "https://example.com/t.jpg",
        sourcePage: "https://example.com/",
      },
    });
    expect(validatePipelineManifest(manifest([bad]), "phase4-test")).toBeNull();
  });

  test("accepts the committed coppersmith manifest", () => {
    const raw = JSON.parse(
      readFileSync(
        join(process.cwd(), "src", "fyd", "media", "manifests", COPPER.site + ".json"),
        "utf8",
      ),
    );
    expect(validatePipelineManifest(raw, COPPER.site)).not.toBeNull();
  });
});
