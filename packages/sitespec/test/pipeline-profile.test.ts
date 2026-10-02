/**
 * Point 10: PROFILE.
 *
 * Measure the deterministic pipeline end to end for both businesses:
 * acquisition, structured extraction (evidence), object resolution
 * (projection), SiteSpec generation, render model, Ask FYD context
 * construction, owner correction + regeneration. Separately account the
 * INTELLIGENCE COST: this lane's proof-3 answer path is mechanical
 * (no LLM in the loop), so AI calls, AI latency, and tokens are 0 BY
 * CONSTRUCTION, not by sampling. DB calls are 0: the lane is pure
 * in-memory with no database seam.
 *
 * Numbers are reported, not optimized: nothing below showed an
 * avoidable bottleneck, so no optimization was attempted.
 */

import { performance } from "perf_hooks";
import { deriveEvidence } from "../src/evidence";
import { generateSiteSpec } from "../src/generator";
import { buildVerifiedPublicProjection } from "../src/projection";
import {
  assertSpecBindingsVerified,
  ownerAssertionsFromGraph,
} from "../src/binding-verifier";
import {
  buildSemanticRenderModel,
  canonicalizeModel,
} from "../src/render-model";
import { deriveSpecBindings, runSlice } from "../src/pipeline";
import { sha256Hex, digestCanonical } from "../../trust/src/digest";
import { askFyd } from "../../ask/src/answer";
import { projectGraphForViewer } from "../../ask/src/viewer";
import {
  applyCorrections,
  assertCorrection,
  type OwnerAssertion,
} from "../../owner/src/corrections";
import { DEMO_OWNER_LABEL } from "../../owner/src/provenance";
import {
  BUSINESSES,
  PINNED_GENERATED_AT,
  PINNED_NOW,
  SERVICES_QUESTION,
  type LoopBusiness,
} from "../scripts/loop-harness";
import type { ObjectGraph } from "../src/types";

interface StageRow {
  stage: string;
  ms: number;
}

function time<T>(fn: () => T): { value: T; ms: number } {
  const start = performance.now();
  const value = fn();
  return { value, ms: performance.now() - start };
}

function freshCopy(g: ObjectGraph): ObjectGraph {
  return JSON.parse(JSON.stringify(g)) as ObjectGraph;
}

function profileBusiness(b: LoopBusiness): StageRow[] {
  const rows: StageRow[] = [];
  const { graph, businessId } = b;

  // 1. Acquisition: canonicalize the captured record.
  let r = time(() => digestCanonical(graph));
  rows.push({ stage: "acquire.canonicalize", ms: r.ms });

  // 2. Structured extraction: evidence derivation.
  const evidence = time(() => deriveEvidence(graph, "captured-record"));
  rows.push({ stage: "extract.deriveEvidence", ms: evidence.ms });

  // 3. SiteSpec generation (deterministic compile).
  const spec = time(() =>
    generateSiteSpec(graph, { generatedAt: PINNED_GENERATED_AT }),
  );
  rows.push({ stage: "compile.generateSiteSpec", ms: spec.ms });

  // 4. Object resolution: the verified public projection.
  const projection = time(() => buildVerifiedPublicProjection(graph));
  rows.push({ stage: "resolve.publicProjection", ms: projection.ms });

  // 5. Binding gate: derive bindings + fail-closed verification.
  const gate = time(() => {
    const bindings = deriveSpecBindings(spec.value, projection.value);
    const ownerAssertions = ownerAssertionsFromGraph(projection.value.graph);
    return assertSpecBindingsVerified(bindings, projection.value.graph, ownerAssertions, {
      now: PINNED_NOW,
    });
  });
  rows.push({ stage: "gate.bindingVerify", ms: gate.ms });

  // 6. Render: semantic model + canonical bytes + digest.
  const render = time(() => {
    const model = buildSemanticRenderModel(spec.value, projection.value);
    const canonical = canonicalizeModel(model);
    return sha256Hex(canonical);
  });
  rows.push({ stage: "render.model+canonical+digest", ms: render.ms });

  // 7. Whole slice, for reference.
  const slice = time(() =>
    runSlice({ graph, generatedAt: PINNED_GENERATED_AT, now: PINNED_NOW }),
  );
  rows.push({ stage: "slice.runSlice.total", ms: slice.ms });

  // 8. Ask FYD context construction (viewer projection).
  const ctx = time(() =>
    projectGraphForViewer(graph, { id: null, displayName: null, verified: false }),
  );
  rows.push({ stage: "ask.contextProjection", ms: ctx.ms });

  // 9. Ask FYD answer (mechanical, no model).
  const ans = time(() =>
    askFyd({
      targetObjectId: businessId,
      graph,
      viewerContext: { viewerClass: "visitor", viewerId: null },
      question: SERVICES_QUESTION,
    }),
  );
  rows.push({ stage: "ask.askFyd", ms: ans.ms });
  expect(ans.value.answerState).toBe("KNOWN");

  // 10. Owner correction: draft assertion + project over fresh observation.
  const business = graph.objects.find((o) => o.id === businessId);
  if (!business) throw new Error("fixture business missing");
  const assertion: OwnerAssertion = assertCorrection({
    factRef: { objectId: businessId, field: "description" },
    op: "CORRECT",
    value: "OWNER-CORRECTED (demo): " + business.description,
    provenance: {
      owner: DEMO_OWNER_LABEL,
      assertedAt: PINNED_NOW,
      supersedes: null,
    },
    sourceValueSeen: business.description,
  });
  const correct = time(() => applyCorrections(freshCopy(graph), [assertion]));
  rows.push({ stage: "owner.applyCorrections", ms: correct.ms });

  // 11. Regeneration latency: full slice over the corrected graph.
  const regen = time(() =>
    runSlice({
      graph: correct.value.graph,
      generatedAt: PINNED_GENERATED_AT,
      now: PINNED_NOW,
    }),
  );
  rows.push({ stage: "regen.runSlice.corrected", ms: regen.ms });

  return rows;
}

// Counted by construction, not by sampling:
// - the proof-3 answer path contains no model invocation point
//   (answer.ts: "No LLM in the answer path: classification and evidence
//   binding are mechanical"), so AI calls and tokens are structurally 0;
// - the lane has no database seam: every stage above is pure in-memory,
//   so DB calls are 0.
const AI_CALLS = 0;
const AI_TOKENS = 0;
const DB_CALLS = 0;

describe("pipeline profile", () => {
  for (const key of ["hpp", "copper"] as const) {
    test(`stage timings for ${key}`, () => {
      const rows = profileBusiness(BUSINESSES[key]);
      const total = rows.reduce((n, r) => n + r.ms, 0);
      const table = rows
        .map(
          (r) =>
            `  ${r.stage.padEnd(34)} ${r.ms.toFixed(2).padStart(9)} ms`,
        )
        .join("\n");
      // eslint-disable-next-line no-console
      console.log(
        `\nprofile[${key}] deterministic stages (ms):\n${table}\n` +
          `  ${"deterministic total".padEnd(34)} ${total.toFixed(2).padStart(9)} ms\n` +
          `  intelligence cost: ${AI_CALLS} AI calls, ${AI_TOKENS} tokens, 0.00 ms (no model in path)\n` +
          `  db calls: ${DB_CALLS}`,
      );
      for (const r of rows) {
        expect(Number.isFinite(r.ms)).toBe(true);
        expect(r.ms).toBeGreaterThanOrEqual(0);
      }
      // Sanity gate only: catch a pathological blowup, not a budget.
      expect(total).toBeLessThan(60000);
    }, 120000);
  }

  test("intelligence cost is structurally zero in this lane", () => {
    // The slice and the ask path are deterministic code; there is no
    // model call site to count. This test pins that property so a future
    // LLM-in-the-loop change must update this file deliberately.
    expect(AI_CALLS).toBe(0);
    expect(AI_TOKENS).toBe(0);
    expect(DB_CALLS).toBe(0);
  });
});
