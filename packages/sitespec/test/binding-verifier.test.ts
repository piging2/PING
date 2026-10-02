/**
 * Binding-verifier tests: the no-invented-claims gate.
 *
 * Law under test: a FACTUAL render binding must resolve to
 * OBJECT FIELD -> CLAIM/FACT -> EVIDENCE REF, or to an explicitly
 * classified GENERATED PRESENTATION STRING. Anything else is UNBOUND,
 * and the emission gate (assertSpecBindingsVerified) FAILS CLOSED:
 * it throws before any spec is produced.
 */
import {
  assertSpecBindingsVerified,
  BindingVerificationError,
  verifyBinding,
  verifySpecBindings,
  type PresentationBinding,
} from "../src/binding-verifier";
import { buildVerifiedPublicProjection } from "../src/projection";
import type { ObjectGraph } from "../src/types";
import { HAPPY_PLACE_GRAPH } from "../fixtures/happy-place-graph";

const GRAPH = HAPPY_PLACE_GRAPH;
const OWNER = "website-business-6fa5ebd99d72c4cb";
const NOW = "2026-10-02T12:00:00Z";

function publicGraph(): ObjectGraph {
  return buildVerifiedPublicProjection(GRAPH).graph;
}

test("direct binding on an evidenced object is BOUND via evidence-ref", () => {
  const v = verifyBinding(
    { objectId: OWNER, field: "title", classification: "direct" },
    publicGraph(),
    [],
    { now: NOW },
  );
  expect(v.status).toBe("BOUND");
  if (v.status === "BOUND") {
    expect(v.source).toBe("evidence-ref");
    expect(v.value).toBe("Happy Place Carpentry LLC");
  }
});

test("direct binding with no evidence ref is UNBOUND (no evidence ref)", () => {
  const graph: ObjectGraph = {
    objects: publicGraph().objects.map((o) =>
      o.id === OWNER ? { ...o, provenance: { ...o.provenance, ref: "" } } : o,
    ),
    relationships: publicGraph().relationships,
  };
  const v = verifyBinding(
    { objectId: OWNER, field: "title", classification: "direct" },
    graph,
    [],
    { now: NOW },
  );
  expect(v.status).toBe("UNBOUND");
  if (v.status === "UNBOUND") expect(v.reason).toBe("no evidence ref");
});

test("FAIL-CLOSED: the emission gate throws on an unbound factual binding", () => {
  const graph: ObjectGraph = {
    objects: publicGraph().objects.map((o) =>
      o.id === OWNER ? { ...o, provenance: { ...o.provenance, ref: "" } } : o,
    ),
    relationships: publicGraph().relationships,
  };
  const bindings: PresentationBinding[] = [
    { objectId: OWNER, field: "title", classification: "direct" },
  ];
  const report = verifySpecBindings(bindings, graph, [], { now: NOW });
  expect(report.allBound).toBe(false);
  expect(() => assertSpecBindingsVerified(bindings, graph, [], { now: NOW })).toThrow(
    BindingVerificationError,
  );
});

test("FAIL-CLOSED: a factual binding on a stripped graph cannot reach the renderer", () => {
  // The pipeline path: one stripped object poisons the whole emission.
  const graph: ObjectGraph = JSON.parse(JSON.stringify(publicGraph()));
  const victim = graph.objects.find((o) => o.id !== OWNER && o.title !== "");
  expect(victim).toBeDefined();
  victim!.provenance.ref = "";
  const bindings: PresentationBinding[] = [
    { objectId: victim!.id, field: "title", classification: "direct" },
  ];
  expect(() =>
    assertSpecBindingsVerified(bindings, graph, [], { now: NOW }),
  ).toThrow(/Binding verification refused 1 of 1 factual bindings/);
});

test("stale evidence fails closed past the freshness horizon", () => {
  const v = verifyBinding(
    { objectId: OWNER, field: "title", classification: "direct" },
    publicGraph(),
    [],
    { now: "2027-10-02T12:00:00Z" }, // 376 days after derivedAt 2026-09-21
  );
  expect(v.status).toBe("UNBOUND");
  if (v.status === "UNBOUND") expect(v.reason).toMatch(/stale evidence/);
});

test("unknown object fails closed", () => {
  const v = verifyBinding(
    { objectId: "no-such-object", field: "title", classification: "direct" },
    publicGraph(),
    [],
    { now: NOW },
  );
  expect(v.status).toBe("UNBOUND");
  if (v.status === "UNBOUND") expect(v.reason).toBe("unknown object");
});

test("generated classification without a generator mark fails closed", () => {
  const v = verifyBinding(
    { objectId: OWNER, field: "title", classification: "generated" },
    publicGraph(),
    [],
    { now: NOW },
  );
  expect(v.status).toBe("UNBOUND");
  if (v.status === "UNBOUND") expect(v.reason).toBe("no generator ref");
});

test("non-website provenance kind cannot back a direct binding", () => {
  const graph: ObjectGraph = {
    objects: publicGraph().objects.map((o) =>
      o.id === OWNER
        ? { ...o, provenance: { ...o.provenance, kind: "overlay-authored" as const } }
        : o,
    ),
    relationships: publicGraph().relationships,
  };
  const v = verifyBinding(
    { objectId: OWNER, field: "title", classification: "direct" },
    graph,
    [],
    { now: NOW },
  );
  expect(v.status).toBe("UNBOUND");
  if (v.status === "UNBOUND")
    expect(v.reason).toBe('provenance kind "overlay-authored" cannot back direct evidence');
});
