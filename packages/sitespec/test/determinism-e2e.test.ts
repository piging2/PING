/**
 * Point 6: DETERMINISM E2E.
 *
 * Invariant: the same source bytes + config + owner state + schema
 * versions yield identical semantic objects / relationships / SiteSpec /
 * render model. Proven by:
 *   (a) two in-process runs,
 *   (b) reversed ingestion order (objects and relationships reversed),
 *   (c) separate OS processes (the harness compiled with tsc, run under
 *       node, digests compared against the in-process run),
 *   (d) a documented exclusion list: the `now` reference instant is a
 *       freshness-gate input and is deliberately NOT part of the canonical
 *       artifact, while generatedAt IS semantic.
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { runSlice } from "../src/pipeline";
import { generateSiteSpec } from "../src/generator";
import { digestCanonical } from "../../trust/src/digest";
import {
  BUSINESSES,
  PINNED_GENERATED_AT,
  PINNED_NOW,
  runHeadlessLoop,
  type LoopBusiness,
  type LoopReport,
} from "../scripts/loop-harness";
import type { ObjectGraph } from "../src/types";

const KEYS = ["hpp", "copper"] as const;

function reversedIngestion(b: LoopBusiness): ObjectGraph {
  return {
    objects: [...b.graph.objects].reverse(),
    relationships: [...b.graph.relationships].reverse(),
  };
}

/** Strip the large canonical string for readable diffs. */
function publicOf(r: LoopReport): Record<string, unknown> {
  const { renderModelCanonical: _omit, ...rest } = r;
  void _omit;
  return rest as Record<string, unknown>;
}

describe("determinism end to end", () => {
  test.each(KEYS)(
    "same source bytes + config + owner state: two in-process runs agree (%s)",
    (key) => {
      const a = publicOf(runHeadlessLoop(BUSINESSES[key]));
      const b = publicOf(runHeadlessLoop(BUSINESSES[key]));
      expect(b).toEqual(a);
    },
  );

  test.each(KEYS)(
    "reversed ingestion order yields identical semantic artifacts (%s)",
    (key) => {
      const b = BUSINESSES[key];
      const fwd = runSlice({
        graph: b.graph,
        generatedAt: PINNED_GENERATED_AT,
        now: PINNED_NOW,
      });
      const rev = runSlice({
        graph: reversedIngestion(b),
        generatedAt: PINNED_GENERATED_AT,
        now: PINNED_NOW,
      });
      // Every stage attests order-independence: evidence, projection,
      // bindings, and the canonical render bytes.
      expect(rev.evidence.derivationDigest).toBe(
        fwd.evidence.derivationDigest,
      );
      expect(rev.projection.checkpoint).toBe(fwd.projection.checkpoint);
      expect(rev.renderModel.modelDigest).toBe(fwd.renderModel.modelDigest);
      expect(rev.renderModelCanonical).toBe(fwd.renderModelCanonical);
      expect(rev.spec.sectionCount).toBe(fwd.spec.sectionCount);
    },
  );

  test("the `now` reference instant is excluded from the canonical artifact", () => {
    // `now` is a freshness-gate input only: it decides whether evidence is
    // fresh enough to emit, never what the render model contains.
    const b = BUSINESSES.hpp;
    const a = runSlice({
      graph: b.graph,
      generatedAt: PINNED_GENERATED_AT,
      now: PINNED_NOW,
    });
    const later = runSlice({
      graph: b.graph,
      generatedAt: PINNED_GENERATED_AT,
      now: "2026-10-03T12:00:00Z",
    });
    expect(later.renderModelCanonical).toBe(a.renderModelCanonical);
    expect(later.renderModel.modelDigest).toBe(a.renderModel.modelDigest);
  });

  test("generatedAt is semantic at the SiteSpec level; the render manifest is generatedAt-agnostic", () => {
    // Documents the boundary precisely:
    // - generatedAt is pinned config and part of the SPEC's identity: two
    //   specs generated at different instants differ (byte-identical only
    //   when generatedAt is pinned).
    // - the semantic RENDER MODEL is a section-binding manifest over the
    //   projection checkpoint (graphDigest:decisionsDigest) + versions +
    //   bindings. It deliberately does not carry the spec's generatedAt:
    //   the same projection always renders the same manifest, whenever
    //   the spec was generated.
    const b = BUSINESSES.hpp;
    const specA = generateSiteSpec(b.graph, {
      generatedAt: PINNED_GENERATED_AT,
    });
    const specC = generateSiteSpec(b.graph, {
      generatedAt: "2026-10-03T12:00:00Z",
    });
    expect(digestCanonical(specC)).not.toBe(digestCanonical(specA));
    const a = runSlice({
      graph: b.graph,
      generatedAt: PINNED_GENERATED_AT,
      now: PINNED_NOW,
    });
    const c = runSlice({
      graph: b.graph,
      generatedAt: "2026-10-03T12:00:00Z",
      now: PINNED_NOW,
    });
    expect(c.renderModel.modelDigest).toBe(a.renderModel.modelDigest);
  });

  /**
   * Compile the harness (and its cross-package imports) with the real
   * TypeScript compiler under the package's own settings (strict, like
   * ts-jest), then run it under node in a fresh OS process. Genuine
   * process separation, not a second call in the same heap.
   *
   * NOTE: the flags must mirror packages/sitespec/tsconfig.json. A bare
   * `npx tsc file.ts` ignores the tsconfig (strict off) and then even
   * textbook discriminated-union narrowing fails to typecheck
   * (binding-verifier.ts:283) — a compiler-settings artifact, not a
   * source defect: the project builds green under its own strict config.
   */
  function compileHarness(): string {
    const repoRoot = path.resolve(__dirname, "..", "..", "..");
    const entry = path.join(
      repoRoot,
      "packages",
      "sitespec",
      "scripts",
      "loop-harness.ts",
    );
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "fyd-loop-harness-"));
    let stderr = "";
    try {
      execFileSync(
        "npx",
        [
          "tsc",
          entry,
          "--outDir",
          outDir,
          "--module",
          "commonjs",
          "--target",
          "es2022",
          "--moduleResolution",
          "node",
          "--esModuleInterop",
          "--skipLibCheck",
          "--strict",
          "--types",
          "node",
        ],
        {
          cwd: path.join(repoRoot, "packages", "sitespec"),
          stdio: "pipe",
          timeout: 180000,
          encoding: "utf8",
        },
      );
    } catch (e) {
      stderr = String(
        (e as { stderr?: unknown }).stderr ?? (e as Error).message,
      );
    }
    // tsc infers the common source root as <repo>/packages, so the entry
    // lands at <outDir>/sitespec/scripts/loop-harness.js.
    const harnessJs = path.join(outDir, "sitespec", "scripts", "loop-harness.js");
    expect(stderr).toBe("");
    expect(fs.existsSync(harnessJs)).toBe(true);
    return harnessJs;
  }

  describe("separate processes", () => {
    let harnessJs: string;

    beforeAll(() => {
      harnessJs = compileHarness();
    }, 240000);

    test.each(KEYS)(
      "child process digests match the in-process run (%s)",
      (key) => {
        const expected = publicOf(runHeadlessLoop(BUSINESSES[key]));
        const stdout = execFileSync("node", [harnessJs, key], {
          encoding: "utf8",
          timeout: 120000,
        });
        const actual = JSON.parse(stdout) as Record<string, unknown>;
        expect(actual).toEqual(expected);
      },
      180000,
    );
  });

  test("documented exclusion list: only pinned inputs shape the artifact", () => {
    // The canonical render artifact is a function of:
    //   source bytes (fixture record), generatedAt, owner state
    //   (assertions with pinned assertedAt), schema versions
    //   (generator/renderer/design-token versions).
    // Deliberately EXCLUDED (operational metadata, documented why):
    //   - `now`: freshness-gate reference instant; proven above that it
    //     does not move the canonical bytes. Rationale: freshness is a
    //     runtime emission rule, not rendered content.
    //   - ingestion order: the pipeline sorts every collection by id at
    //     each stage ("input order irrelevant" per projection.ts);
    //     proven above via reversed ingestion.
    //   - process argv/env/wall clock: never read by the pipeline.
    //   - assertion wall-clock: assertedAt is provenance (semantic) and
    //     is pinned by the caller in tests; production passes the real
    //     instant, which is then part of the assertion's identity.
    const a = runHeadlessLoop(BUSINESSES.hpp);
    const b = runHeadlessLoop(BUSINESSES.hpp, {
      generatedAt: PINNED_GENERATED_AT,
      now: "2026-10-03T12:00:00Z",
    });
    expect(b.renderModelDigest).toBe(a.renderModelDigest);
    expect(digestCanonical({})).toMatch(/^[0-9a-f]{64}$/);
  });
});
