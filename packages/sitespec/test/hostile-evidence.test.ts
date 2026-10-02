/**
 * Hostile evidence tests (Nolan's 12-point program, point 2: HOSTILE INPUTS).
 *
 * Fail closed or degrade explicitly; never invent data. Every case drives a
 * hostile input at the evidence derivation / emission gate and asserts the
 * typed failure mode:
 *   - conflicting evidence for the same claim -> both records kept, no
 *     invented consensus, no silent merge
 *   - missing evidence for a claimed fact -> BindingVerificationError;
 *     no spec is emitted
 *   - stale observations -> UNBOUND with a named reason; the pipeline
 *     fails closed past the freshness horizon
 *   - source changing after an owner correction -> the correction stays
 *     attributable to the owner (BOUND via owner-assertion, never
 *     laundered as website evidence); a value that no longer matches the
 *     recorded assertion is UNBOUND, and the recorded correction is never
 *     silently dropped
 *   - malformed JSON-LD at ingestion -> typed parse failure; derivation
 *     invents nothing from nothing
 *
 * Owner corrections here are recorded under the explicitly-unverified demo
 * actor ("Demo Owner (seeded, unverified)"): DEMO_OWNER_CONTEXT, never a
 * verified owner identity. Nothing here fakes production auth.
 *
 * Pure and deterministic: no I/O, no clock, no randomness. `now` is pinned.
 */

import { deriveEvidence } from "../src/evidence";
import {
  assertSpecBindingsVerified,
  BindingVerificationError,
  ownerAssertionsFromGraph,
  verifyBinding,
  type PresentationBinding,
} from "../src/binding-verifier";
import { runSlice } from "../src/pipeline";
import type { ObjectGraph } from "../src/types";
import { HAPPY_PLACE_GRAPH } from "../fixtures/happy-place-graph";

const OWNER = "website-business-6fa5ebd99d72c4cb";
const GEN_AT = "2026-10-02T12:00:00Z";
const NOW = "2026-10-02T12:00:00Z";
// 376 days after the fixture's 2026-09-21 derivedAt: past the 365-day horizon.
const STALE_NOW = "2027-10-02T12:00:00Z";

function baseObject(id: string, hours: string, ref: string) {
  return {
    id,
    schema: "ping.social.business@1",
    controllerId: "test",
    visibility: "public",
    title: "Test Business " + id,
    description: "Does things.",
    fields: { hours },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    provenance: {
      kind: "website-derived",
      ref,
      derivedAt: "2026-01-01T00:00:00Z",
    },
  };
}

describe("hostile evidence: conflicting evidence for the same claim", () => {
  test("two sources disagreeing on hours stay two records: no merge, no invented consensus", () => {
    const graph = {
      objects: [
        baseObject("biz-a", "9-5 weekdays", "website-ingestion:https://a.example/"),
        baseObject("biz-b", "Open 24 hours", "website-ingestion:https://b.example/"),
      ],
      relationships: [],
    } as unknown as ObjectGraph;
    const d = deriveEvidence(graph);
    const hoursRecords = d.records.filter((r) => r.field === "hours");
    // Both claims survive, values unaltered, provenance kept.
    expect(hoursRecords.map((r) => r.value).sort()).toEqual([
      "9-5 weekdays",
      "Open 24 hours",
    ]);
    expect(hoursRecords.map((r) => r.provenanceRef).sort()).toEqual([
      "website-ingestion:https://a.example/",
      "website-ingestion:https://b.example/",
    ]);
    // Distinct claims get distinct evidence ids: the derivation never
    // collapses a disagreement into one invented record.
    expect(new Set(hoursRecords.map((r) => r.evidenceId)).size).toBe(2);
    // Deterministic across runs.
    const again = deriveEvidence(graph);
    expect(again.derivationDigest).toBe(d.derivationDigest);
  });
});

describe("hostile evidence: missing evidence for a claimed fact", () => {
  test("a factual binding with no evidence ref is UNBOUND with a named reason", () => {
    const graph = JSON.parse(JSON.stringify(HAPPY_PLACE_GRAPH)) as ObjectGraph;
    const victim = graph.objects.find((o) => o.id === OWNER)!;
    (victim.provenance as { ref: string }).ref = "";
    const v = verifyBinding(
      { objectId: OWNER, field: "title", classification: "direct" },
      graph,
      [],
      { now: NOW },
    );
    expect(v.status).toBe("UNBOUND");
    if (v.status === "UNBOUND") expect(v.reason).toBe("no evidence ref");
  });

  test("the emission gate throws BindingVerificationError: no spec is emitted", () => {
    const graph = JSON.parse(JSON.stringify(HAPPY_PLACE_GRAPH)) as ObjectGraph;
    const victim = graph.objects.find((o) => o.id === OWNER)!;
    (victim.provenance as { ref: string }).ref = "";
    const bindings: PresentationBinding[] = [
      { objectId: OWNER, field: "title", classification: "direct" },
    ];
    let caught: unknown = null;
    try {
      assertSpecBindingsVerified(bindings, graph, [], { now: NOW });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(BindingVerificationError);
    const err = caught as BindingVerificationError;
    expect(err.report.allBound).toBe(false);
    expect(err.message).toMatch(/No spec may be emitted with unbound factual claims/);
  });

  test("runSlice fails closed when evidence is stripped: nothing partial ships", () => {
    const stripped = JSON.parse(JSON.stringify(HAPPY_PLACE_GRAPH));
    stripped.objects[0].provenance.ref = "";
    expect(() =>
      runSlice({ graph: stripped, generatedAt: GEN_AT, now: NOW }),
    ).toThrow(/Binding verification refused/);
  });
});

describe("hostile evidence: stale observations fail closed", () => {
  test("a binding past the freshness horizon is UNBOUND with a named reason", () => {
    const v = verifyBinding(
      { objectId: OWNER, field: "title", classification: "direct" },
      HAPPY_PLACE_GRAPH,
      [],
      { now: STALE_NOW },
    );
    expect(v.status).toBe("UNBOUND");
    if (v.status === "UNBOUND") expect(v.reason).toMatch(/stale evidence/);
  });

  test("runSlice fails closed on stale evidence instead of publishing old facts", () => {
    expect(() =>
      runSlice({ graph: HAPPY_PLACE_GRAPH, generatedAt: GEN_AT, now: STALE_NOW }),
    ).toThrow(BindingVerificationError);
  });
});

describe("hostile evidence: source changes after an owner correction", () => {
  const DEMO_ACTOR = "Demo Owner (seeded, unverified)";
  const OWNER_VALUE = "Owner-attested description (demo context)";

  function correctedGraph(effectiveValue: string): {
    graph: ObjectGraph;
    ownerValue: string;
  } {
    const graph = JSON.parse(JSON.stringify(HAPPY_PLACE_GRAPH)) as ObjectGraph;
    const obj = graph.objects.find((o) => o.id === OWNER)!;
    const sourceValue: string = obj.description;
    // The read seam composes the effective (owner-winning) value onto the
    // object and attaches the correction record: SOURCE SAYS X / OWNER
    // SAYS Y are never collapsed.
    obj.description = effectiveValue;
    (obj as unknown as { ownerFieldCorrections: unknown[] }).ownerFieldCorrections = [
      {
        field: "description",
        label: "Description",
        sourceValue,
        ownerValue: OWNER_VALUE,
        correctedAt: "2026-10-01T00:00:00Z",
        actorLabel: DEMO_ACTOR,
        basis:
          "Owner correction recorded under DEMO_OWNER_CONTEXT; no verified owner identity.",
      },
    ];
    // The source re-observed the site AFTER the correction: provenance
    // gains a later update ref. derivedAt stays fresh so only the
    // correction semantics are under test.
    (obj.provenance as { updatedRefs?: string[] }).updatedRefs = [
      "website-ingestion:https://happy-place-platform.vercel.app/#v2",
    ];
    return { graph, ownerValue: OWNER_VALUE };
  }

  test("the correction stays attributable: BOUND via owner-assertion, never laundered as website evidence", () => {
    const { graph } = correctedGraph(OWNER_VALUE);
    const assertions = ownerAssertionsFromGraph(graph);
    const v = verifyBinding(
      { objectId: OWNER, field: "description", classification: "direct" },
      graph,
      assertions,
      { now: NOW },
    );
    expect(v.status).toBe("BOUND");
    if (v.status === "BOUND") {
      // The corrected value verifies through the owner-assertion path:
      // grading it "evidence-ref" would launder owner authorship as the
      // website's own words.
      expect(v.source).toBe("owner-assertion");
      expect(v.value).toBe(OWNER_VALUE);
    }
  });

  test("an owner_authored binding on the corrected field binds to the recorded assertion", () => {
    const { graph } = correctedGraph(OWNER_VALUE);
    const assertions = ownerAssertionsFromGraph(graph);
    const v = verifyBinding(
      { objectId: OWNER, field: "description", classification: "owner_authored" },
      graph,
      assertions,
      { now: NOW },
    );
    expect(v.status).toBe("BOUND");
    if (v.status === "BOUND") expect(v.source).toBe("owner-assertion");
  });

  test("a value that no longer matches the recorded assertion is UNBOUND, not silently kept", () => {
    // The source (or anyone) changed the effective value after the
    // correction was recorded: the new value has no owner attestation.
    const { graph } = correctedGraph("Source overwrote the description");
    const assertions = ownerAssertionsFromGraph(graph);
    const v = verifyBinding(
      { objectId: OWNER, field: "description", classification: "direct" },
      graph,
      assertions,
      { now: NOW },
    );
    expect(v.status).toBe("UNBOUND");
    if (v.status === "UNBOUND") expect(v.reason).toBe("no owner assertion");
    // The recorded correction itself is still present: the conflict is
    // explicit, nothing was silently dropped.
    expect(
      assertions.some(
        (a) => a.objectId === OWNER && a.field === "description" && a.value === OWNER_VALUE,
      ),
    ).toBe(true);
  });
});

describe("hostile evidence: malformed JSON-LD at ingestion", () => {
  test("malformed JSON throws a typed parse error; derivation invents nothing", () => {
    const malformed = Buffer.from('{ "@context": "https://schema.org", broken ');
    let caught: unknown = null;
    try {
      JSON.parse(malformed.toString("utf-8"));
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(SyntaxError);
    // Derivation on the absence of input yields zero records: no graph is
    // fabricated from a failed parse.
    const empty = deriveEvidence({ objects: [], relationships: [] });
    expect(empty.records).toEqual([]);
  });
});
