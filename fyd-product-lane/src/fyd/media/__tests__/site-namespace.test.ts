/**
 * Tests for the structural cross-business contamination guarantee
 * (presentation-observations.md B.3).
 *
 * - Derivative paths are namespaced per siteId:
 *   /fyd-media/<siteId>/<hash>/<variant>. A selector parameterized with
 *   siteId A can never return a variant URL containing siteId B, because
 *   the read path loads exactly one site's manifest and the URL carries
 *   the siteId as a structural segment.
 * - Unsafe siteId segments are rejected at path-construction time
 *   (no traversal, no empty, no slashes).
 *
 * Runs sharp for real against tiny generated PNGs; no network.
 */

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  assertSiteIdSegment,
  generateDerivatives,
  hashContentBytes,
} from "../derivatives";
import { readPipelineManifest } from "../select";
import type { MediaManifest } from "../types";

jest.mock("../bundle-media", () => {
  const siteA: MediaManifest = {
    siteId: "site-a",
    generatedAt: "2026-09-25T00:00:00.000Z",
    generator: "fyd-media@2",
    ingestRunId: "run-a",
    pipelineVersion: "fyd-media@2",
    observations: [],
    media: [
      {
        id: "fyd-media-aaaa",
        schema: "ping.social.media@1",
        title: "Site A photo",
        mediaType: "image",
        roles: ["gallery"],
        rightsSource: "public-demo-source",
        rightsBasis: "Public marketing imagery on the business site; FYD claims no copyright.",
        lifecycle: "published",
        provenance: {
          sourceUrl: "https://a.example/images/photo.jpg",
          sourcePage: "https://a.example/",
          observedAt: "2026-09-25T00:00:00.000Z",
        },
        digest: "a".repeat(64),
        originalFormat: "jpeg",
        width: 800,
        height: 600,
        variants: [
          {
            name: "card",
            width: 768,
            height: 576,
            format: "webp",
            url: "/fyd-media/site-a/" + "a".repeat(64) + "/card-768w.webp",
            bytes: 42000,
            digest: "c".repeat(64),
            derivedFrom: "a".repeat(64),
          },
        ],
        depicts: [],
        altText: "Site A photo",
        altTextSource: "source",
        visibility: "public",
      },
    ],
  };
  return {
    getPipelineManifest: (siteId: string) => (siteId === "site-a" ? siteA : null),
  };
});

async function tinyPng(): Promise<Buffer> {
  return sharp({
    create: { width: 64, height: 48, channels: 3, background: { r: 40, g: 120, b: 180 } },
  })
    .png()
    .toBuffer();
}

describe("siteId namespacing in derivative paths", () => {
  test("variant URLs carry the siteId segment and never another site's", async () => {
    const input = await tinyPng();
    const digest = hashContentBytes(input);
    const dir = mkdtempSync(join(tmpdir(), "fyd-ns-test-"));
    try {
      const genA = await generateDerivatives(input, digest, dir, "site-a");
      const genB = await generateDerivatives(input, digest, dir, "site-b");
      for (const v of genA.variants) {
        expect(v.url).toContain("/fyd-media/site-a/" + digest + "/");
        expect(v.url).not.toContain("site-b");
      }
      for (const v of genB.variants) {
        expect(v.url).toContain("/fyd-media/site-b/" + digest + "/");
        expect(v.url).not.toContain("site-a");
      }
      // Same bytes, different sites: URLs differ by construction.
      expect(genA.variants[0].url).not.toBe(genB.variants[0].url);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("derivative bytes land under <publicDir>/<siteId>/<hash>/", async () => {
    const input = await tinyPng();
    const digest = hashContentBytes(input);
    const dir = mkdtempSync(join(tmpdir(), "fyd-ns-test-"));
    try {
      const gen = await generateDerivatives(input, digest, dir, "site-a");
      for (const v of gen.variants) {
        const file = v.url.split("/").pop()!;
        expect(existsSync(join(dir, "site-a", digest, file))).toBe(true);
        expect(existsSync(join(dir, digest, file))).toBe(false);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("unsafe siteId segments are rejected, never sanitized", async () => {
    const input = await tinyPng();
    const digest = hashContentBytes(input);
    const dir = mkdtempSync(join(tmpdir(), "fyd-ns-test-"));
    try {
      for (const bad of ["../evil", "a/b", "", ".", "..", "a b", "site;id"]) {
        await expect(generateDerivatives(input, digest, dir, bad)).rejects.toThrow(
          /unsafe siteId/,
        );
      }
      expect(() => assertSiteIdSegment("ok-site_123")).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("manifest-scoped read path (B.3.2)", () => {
  test("a selector call parameterized with siteId A returns only site A's URLs", () => {
    const manifest = readPipelineManifest("site-a");
    expect(manifest).not.toBeNull();
    for (const m of manifest!.media) {
      for (const v of m.variants) {
        expect(v.url).toContain("/site-a/");
        expect(v.url).not.toContain("/site-b/");
      }
    }
  });

  test("there is no cross-manifest query: site B has no manifest here", () => {
    expect(readPipelineManifest("site-b")).toBeNull();
  });
});
