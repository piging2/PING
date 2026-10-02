/**
 * Regression tests: identifier-derived filesystem paths stay contained.
 *
 * getPingObjectGraph(Sync) and getPipelineManifest() used to join a
 * caller-supplied site id straight into a path (path.join normalizes
 * ".."), so a crafted id could escape the operator-controlled root.
 * Both seams now refuse unsafe ids via assertSafeSiteId() before any I/O.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertSafeSiteId, SITE_ID_PATTERN } from "../site-id-guard";
import { getPingObjectGraphSync } from "../ping-object-source";
import { getPipelineManifest } from "@/fyd/media/bundle-media";

describe("assertSafeSiteId", () => {
  it("accepts legitimate site ids", () => {
    expect(() => assertSafeSiteId("happy-place")).not.toThrow();
    expect(() => assertSafeSiteId("coppersmith-plumbing")).not.toThrow();
    expect(() => assertSafeSiteId("a")).not.toThrow();
    expect(() => assertSafeSiteId("x".repeat(64))).not.toThrow();
  });

  it("rejects traversal, absolute, and separator-bearing ids", () => {
    for (const bad of [
      "../evil",
      "..",
      "../../etc/hostname",
      "a/b",
      "/abs",
      "\\\\win",
      "",
      "UPPER",
      "has space",
      "dot.json",
      "colon:id",
      "x".repeat(65),
      "..%2f..",
    ]) {
      expect(() => assertSafeSiteId(bad)).toThrow(/unsafe site id/);
      expect(SITE_ID_PATTERN.test(bad)).toBe(false);
    }
  });
});

describe("getPingObjectGraphSync containment", () => {
  let dir: string;
  let outside: string;
  const OLD_ENV = process.env.FYD_PROJECTION_DIR;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "fyd-proj-contain-"));
    // A sentinel file OUTSIDE the projection root, shaped like a target.
    outside = join(tmpdir(), "fyd-proj-contain-evil.json");
    writeFileSync(outside, JSON.stringify({ planted: true }), "utf8");
    process.env.FYD_PROJECTION_DIR = dir;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { force: true });
    if (OLD_ENV === undefined) delete process.env.FYD_PROJECTION_DIR;
    else process.env.FYD_PROJECTION_DIR = OLD_ENV;
  });

  it("refuses a traversal id before touching the filesystem", () => {
    expect(() => getPingObjectGraphSync("../fyd-proj-contain-evil")).toThrow(
      /unsafe site id/,
    );
  });

  it("still resolves legitimate ids under the configured root", () => {
    // No projection file present: the failure must be the honest
    // missing-projection error naming the in-root path, not a refusal.
    expect(() => getPingObjectGraphSync("happy-place")).toThrow(
      /no PING projection/,
    );
  });
});

describe("getPipelineManifest containment", () => {
  it("returns null for traversal ids instead of reading outside manifests/", () => {
    expect(getPipelineManifest("../../etc/hostname")).toBeNull();
    expect(getPipelineManifest("..")).toBeNull();
  });

  it("still serves the committed manifests for legitimate ids", () => {
    const manifest = getPipelineManifest("happy-place");
    expect(manifest).not.toBeNull();
    expect(manifest!.siteId).toBe("happy-place");
  });
});
