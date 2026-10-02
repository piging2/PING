/**
 * Point 7: IDEMPOTENCY 10X.
 *
 * Ingest the same source 10 times and prove nothing duplicates:
 * no duplicate objects / relationships / corrections / transitions /
 * sections, and the semantic digest after run 10 equals run 1.
 *
 * The lane has no database: the pipeline is pure in-memory. The
 * "ingest" under test is the generic upsert-by-deterministic-id store
 * any caller builds at the acquisition boundary, plus the lane's own
 * append-only assertion algebra (assertCorrection dedupes by
 * deterministic assertionId) and the regenerate no-op/merge path.
 */

import { runSlice } from "../src/pipeline";
import { generateSiteSpec } from "../src/generator";
import { regenerate } from "../../proposals/src/regenerate";
import type { RegenerateInput } from "../../proposals/src/types";
import {
  applyCorrections,
  assertCorrection,
  type OwnerAssertion,
} from "../../owner/src/corrections";
import { DEMO_OWNER_LABEL } from "../../owner/src/provenance";
import { digestCanonical } from "../../trust/src/digest";
import {
  BUSINESSES,
  PINNED_GENERATED_AT,
  PINNED_NOW,
} from "../scripts/loop-harness";
import { HAPPY_PLACE_GRAPH } from "../fixtures/happy-place-graph";
import type { ObjectGraph } from "../src/types";

const RUNS = 10;

/** Generic acquisition-boundary store: upsert by deterministic id. */
class IdempotentStore {
  readonly objects = new Map<string, unknown>();
  readonly relationships = new Map<string, unknown>();

  ingest(g: ObjectGraph): void {
    for (const o of g.objects) this.objects.set(o.id, o);
    for (const r of g.relationships) this.relationships.set(r.id, r);
  }

  snapshotDigest(): string {
    return digestCanonical({
      objects: [...this.objects.keys()].sort(),
      relationships: [...this.relationships.keys()].sort(),
    });
  }
}

function reversed(g: ObjectGraph): ObjectGraph {
  return {
    objects: [...g.objects].reverse(),
    relationships: [...g.relationships].reverse(),
  };
}

function freshCopy(g: ObjectGraph): ObjectGraph {
  return JSON.parse(JSON.stringify(g)) as ObjectGraph;
}

function demoCorrection(): OwnerAssertion {
  const business = HAPPY_PLACE_GRAPH.objects.find(
    (o) => o.id === "website-business-6fa5ebd99d72c4cb",
  );
  if (!business) throw new Error("fixture business missing");
  return assertCorrection({
    factRef: {
      objectId: "website-business-6fa5ebd99d72c4cb",
      field: "description",
    },
    op: "CORRECT",
    value: "OWNER-CORRECTED (demo): " + business.description,
    provenance: {
      owner: DEMO_OWNER_LABEL,
      assertedAt: PINNED_NOW,
      supersedes: null,
    },
    sourceValueSeen: business.description,
  });
}

describe("idempotency 10x", () => {
  test("10 ingests (alternating order): no duplicate objects/relationships; digest run1 == run10", () => {
    const store = new IdempotentStore();
    const digests: string[] = [];
    for (let i = 0; i < RUNS; i++) {
      // Alternate ingestion order: an order-sensitive store would drift.
      store.ingest(i % 2 === 0 ? HAPPY_PLACE_GRAPH : reversed(HAPPY_PLACE_GRAPH));
      digests.push(store.snapshotDigest());
      if (i === 0) {
        expect(store.objects.size).toBe(HAPPY_PLACE_GRAPH.objects.length);
        expect(store.relationships.size).toBe(
          HAPPY_PLACE_GRAPH.relationships.length,
        );
      }
    }
    expect(store.objects.size).toBe(HAPPY_PLACE_GRAPH.objects.length);
    expect(store.relationships.size).toBe(
      HAPPY_PLACE_GRAPH.relationships.length,
    );
    for (const d of digests) expect(d).toBe(digests[0]);
  });

  test("10 ingests of the second business: same idempotency", () => {
    const store = new IdempotentStore();
    const b = BUSINESSES.copper.graph;
    const first = (() => {
      store.ingest(b);
      return store.snapshotDigest();
    })();
    for (let i = 1; i < RUNS; i++) {
      store.ingest(i % 2 === 0 ? b : reversed(b));
    }
    expect(store.objects.size).toBe(b.objects.length);
    expect(store.relationships.size).toBe(b.relationships.length);
    expect(store.snapshotDigest()).toBe(first);
  });

  test("10 identical corrections: one assertion record (dedupe by deterministic assertionId)", () => {
    // assertCorrection is deterministic: same inputs (pinned clock) ->
    // same assertionId. The assertion log dedupes on it, so re-asserting
    // the same correction 10 times stores exactly one record.
    const log = new Map<string, OwnerAssertion>();
    for (let i = 0; i < RUNS; i++) {
      const a = demoCorrection();
      log.set(a.assertionId, a);
    }
    expect(log.size).toBe(1);
  });

  test("10 applyCorrections over fresh observations: identical corrected graph, no conflicts, no orphans", () => {
    const assertion = demoCorrection();
    const digests: string[] = [];
    for (let i = 0; i < RUNS; i++) {
      const corrected = applyCorrections(freshCopy(HAPPY_PLACE_GRAPH), [
        assertion,
      ]);
      expect(corrected.conflicts).toHaveLength(0);
      expect(corrected.orphaned).toHaveLength(0);
      expect(corrected.applied).toHaveLength(1);
      digests.push(digestCanonical(corrected.graph));
    }
    for (const d of digests) expect(d).toBe(digests[0]);
  });

  test("10 regenerate passes: identical spec digest, no runaway transitions", () => {
    const assertion = demoCorrection();
    const spec = generateSiteSpec(HAPPY_PLACE_GRAPH, {
      generatedAt: PINNED_GENERATED_AT,
    });
    const base: RegenerateInput = {
      graph: HAPPY_PLACE_GRAPH,
      newObservation: HAPPY_PLACE_GRAPH,
      spec,
      assertions: [assertion],
      presentationOverrides: [],
      generatedAt: PINNED_GENERATED_AT,
    };
    const specDigests: string[] = [];
    for (let i = 0; i < RUNS; i++) {
      const out = regenerate({ ...base });
      // The assertion touches exactly one fact: applied stays 1, no
      // conflicts, no orphans, no accumulating transitions.
      expect(out.assertions.applied).toHaveLength(1);
      expect(out.assertions.conflicts).toHaveLength(0);
      expect(out.assertions.orphaned).toHaveLength(0);
      specDigests.push(out.specDigest);
    }
    for (const d of specDigests) expect(d).toBe(specDigests[0]);
  });

  test("10 runSlice passes: section count and model digest identical", () => {
    const digests: string[] = [];
    const sections: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const r = runSlice({
        graph: HAPPY_PLACE_GRAPH,
        generatedAt: PINNED_GENERATED_AT,
        now: PINNED_NOW,
      });
      digests.push(r.renderModel.modelDigest);
      sections.push(r.spec.sectionCount);
    }
    for (const d of digests) expect(d).toBe(digests[0]);
    for (const s of sections) expect(s).toBe(sections[0]);
  });
});
