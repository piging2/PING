/**
 * Proof 6 tests (a)-(e): the owner correction round trip.
 *
 * source says X -> owner CORRECTs to Y -> regeneration -> Y survives,
 * conflicts surface honestly, and the corrected graph passes the REAL
 * SiteSpec binding verifier's owner-assertion lane (the assertion is
 * itself evidence: kind "owner-assertion", ref to the assertion id).
 */
import {
  applyCorrections,
  assertCorrection,
  assertionFactId,
  chainHeads,
  type OwnerAssertion,
} from "../src/corrections";
import { DEMO_OWNER_LABEL, demoProvenance } from "../src/provenance";
import { projectPublicGraph } from "../src/visibility";
import type { ObjectGraph } from "../../sitespec/src/types";
import {
  classifyRenderAtom,
  ownerAssertionsFromGraph,
  verifyBinding,
} from "../../sitespec/src/binding-verifier";

const NOW = "2026-10-02T14:00:00.000Z";
const PHONE_X = "+19705550100"; // what the source says
const PHONE_Y = "+19705550199"; // what the owner asserts
const PHONE_Z = "+19705550222"; // what the source later changes to

function sourceGraph(phone: string): ObjectGraph {
  return {
    objects: [
      {
        id: "biz-1",
        schema: "ping.social.business@1",
        controllerId: "web:https://example.com/",
        visibility: "public",
        title: "Example Plumbing",
        description: "A plumbing business.",
        fields: { phone, email: "hello@example.com" },
        createdAt: NOW,
        updatedAt: NOW,
        provenance: {
          kind: "website-derived",
          ref: "website-ingestion:https://example.com/",
          derivedAt: NOW,
        },
      },
    ],
    relationships: [],
  };
}

function correctPhone(
  seen: string | null,
  value: string,
  supersedes: string | null = null,
): OwnerAssertion {
  return assertCorrection({
    factRef: { objectId: "biz-1", field: "phone" },
    op: "CORRECT",
    value,
    provenance: demoProvenance(supersedes, () => NOW),
    sourceValueSeen: seen,
  });
}

test("(a) CORRECT projects the owner value and keeps the provenance chain", () => {
  const graph = sourceGraph(PHONE_X);
  const a = correctPhone(PHONE_X, PHONE_Y);
  const result = applyCorrections(graph, [a]);
  const factId = assertionFactId(a);
  const obj = result.graph.objects[0];

  // The corrected value is the effective value.
  expect(obj.fields["phone"]).toBe(PHONE_Y);
  // Source provenance is untouched: the source record still carries its
  // own evidence ref. SOURCE SAYS X / OWNER SAYS Y is never collapsed.
  expect(obj.provenance.ref).toBe("website-ingestion:https://example.com/");
  // The owner assertion is recorded on the read seam with both values.
  expect(obj.ownerFieldCorrections).toHaveLength(1);
  expect(obj.ownerFieldCorrections?.[0]).toMatchObject({
    field: "phone",
    sourceValue: PHONE_X,
    ownerValue: PHONE_Y,
    actorLabel: DEMO_OWNER_LABEL,
  });
  // The ref behind the evidence: factId -> assertionId.
  expect(result.assertionRefs[factId]).toBe(a.assertionId);
  expect(result.applied).toEqual([
    { assertionId: a.assertionId, op: "CORRECT", factId },
  ]);
  expect(result.conflicts).toEqual([]);
  expect(result.orphaned).toEqual([]);
  // The input graph is never mutated.
  expect(graph.objects[0].fields["phone"]).toBe(PHONE_X);
  expect(graph.objects[0].ownerFieldCorrections).toBeUndefined();
});

test("(a2) the corrected graph passes the binding verifier as owner-assertion evidence", () => {
  const a = correctPhone(PHONE_X, PHONE_Y);
  const result = applyCorrections(sourceGraph(PHONE_X), [a]);
  const assertions = ownerAssertionsFromGraph(result.graph);

  // owner_authored binding: BOUND, kind "owner-assertion".
  const authored = verifyBinding(
    { objectId: "biz-1", field: "phone", classification: "owner_authored" },
    result.graph,
    assertions,
    { now: NOW },
  );
  expect(authored.status).toBe("BOUND");
  if (authored.status === "BOUND") {
    expect(authored.source).toBe("owner-assertion");
    expect(authored.value).toBe(PHONE_Y);
  }

  // A corrected field's direct binding verifies through the
  // owner-assertion path too (never laundered as direct evidence).
  const direct = verifyBinding(
    { objectId: "biz-1", field: "phone", classification: "direct" },
    result.graph,
    assertions,
    { now: NOW },
  );
  expect(direct.status).toBe("BOUND");
  if (direct.status === "BOUND") {
    expect(direct.source).toBe("owner-assertion");
  }

  // The render atom carries kind "owner-assertion" + the assertion ref.
  const atom = classifyRenderAtom(
    { objectId: "biz-1", field: "phone", classification: "owner_authored" },
    result.graph,
    assertions,
    { now: NOW },
  );
  expect(atom.classification).toBe("OWNER_ASSERTED");
  expect(atom.value).toBe(PHONE_Y);
  expect(atom.ownerAssertionRef).toBe("owner-assertion:biz-1#phone");

  // A bare owner_authored LABEL with no recorded assertion stays UNBOUND.
  const bare = verifyBinding(
    { objectId: "biz-1", field: "email", classification: "owner_authored" },
    result.graph,
    assertions,
    { now: NOW },
  );
  expect(bare.status).toBe("UNBOUND");
  if (bare.status === "UNBOUND") {
    expect(bare.reason).toBe("no owner assertion");
  }
});

test("(b) CONFIRM marks the fact confirmed without changing the value", () => {
  const a = assertCorrection({
    factRef: { objectId: "biz-1", field: "phone" },
    op: "CONFIRM",
    provenance: demoProvenance(null, () => NOW),
    sourceValueSeen: PHONE_X,
  });
  const result = applyCorrections(sourceGraph(PHONE_X), [a]);
  expect(result.graph.objects[0].fields["phone"]).toBe(PHONE_X);
  expect(result.confirmations).toEqual([
    { factId: assertionFactId(a), owner: DEMO_OWNER_LABEL, assertedAt: NOW },
  ]);
  expect(result.applied).toHaveLength(1);
});

test("(b2) CONFIRM on a changed source: stale confirmation surfaces a conflict and changes nothing", () => {
  const a = assertCorrection({
    factRef: { objectId: "biz-1", field: "phone" },
    op: "CONFIRM",
    provenance: demoProvenance(null, () => NOW),
    sourceValueSeen: PHONE_X,
  });
  const result = applyCorrections(sourceGraph(PHONE_Z), [a]);
  expect(result.conflicts).toHaveLength(1);
  expect(result.conflicts[0]).toMatchObject({
    assertionId: a.assertionId,
    sourceValue: PHONE_Z,
    ownerValue: PHONE_X,
  });
  expect(result.graph.objects[0].fields["phone"]).toBe(PHONE_Z);
  expect(result.applied).toEqual([]);
  expect(result.confirmations).toEqual([]);
});

test("(c) HIDE removes the fact from the public projection; the graph value is unchanged", () => {
  const a = assertCorrection({
    factRef: { objectId: "biz-1", field: "phone" },
    op: "HIDE",
    provenance: demoProvenance(null, () => NOW),
    sourceValueSeen: PHONE_X,
  });
  const result = applyCorrections(sourceGraph(PHONE_X), [a]);
  const factId = assertionFactId(a);
  expect(result.hiddenFactIds).toEqual([factId]);
  // The fact value is unchanged in the graph.
  expect(result.graph.objects[0].fields["phone"]).toBe(PHONE_X);

  const pub = projectPublicGraph(result.graph, result.hiddenFactIds);
  expect(pub.objects[0].fields["phone"]).toBeUndefined();
  // Everything else survives the projection.
  expect(pub.objects[0].fields["email"]).toBe("hello@example.com");
  // The projection never mutates its input.
  expect(result.graph.objects[0].fields["phone"]).toBe(PHONE_X);
});

test("(d) regeneration: the same assertions over a FRESH graph preserve Y", () => {
  const a = correctPhone(PHONE_X, PHONE_Y);
  // Simulate re-observation: a brand-new graph object, same source values.
  const fresh = sourceGraph(PHONE_X);
  const result = applyCorrections(fresh, [a]);
  expect(result.graph.objects[0].fields["phone"]).toBe(PHONE_Y);
  expect(result.conflicts).toEqual([]);
  expect(result.orphaned).toEqual([]);
  expect(result.applied).toHaveLength(1);
});

test("(e) conflict: source moves to Z; conflict surfaced, Y stays applied", () => {
  const a = correctPhone(PHONE_X, PHONE_Y);
  const result = applyCorrections(sourceGraph(PHONE_Z), [a]);

  expect(result.conflicts).toHaveLength(1);
  expect(result.conflicts[0]).toMatchObject({
    assertionId: a.assertionId,
    sourceValue: PHONE_Z,
    ownerValue: PHONE_Y,
  });
  // The owner's value stays applied: corrections survive regen.
  expect(result.graph.objects[0].fields["phone"]).toBe(PHONE_Y);
  // The drift is visible on the read-seam record, not silent.
  expect(result.graph.objects[0].ownerFieldCorrections?.[0].sourceDrifted).toBe(
    true,
  );
  // And the verifier still binds the owner's value as owner-assertion.
  const assertions = ownerAssertionsFromGraph(result.graph);
  const verdict = verifyBinding(
    { objectId: "biz-1", field: "phone", classification: "owner_authored" },
    result.graph,
    assertions,
    { now: NOW },
  );
  expect(verdict.status).toBe("BOUND");
  if (verdict.status === "BOUND") expect(verdict.source).toBe("owner-assertion");
});

test("(e2) source adopts the owner value: no conflict, assertion satisfied", () => {
  const a = correctPhone(PHONE_X, PHONE_Y);
  const result = applyCorrections(sourceGraph(PHONE_Y), [a]);
  expect(result.conflicts).toEqual([]);
  expect(result.graph.objects[0].fields["phone"]).toBe(PHONE_Y);
});

test("supersedes: only chain heads apply; the log stays append-only", () => {
  const a1 = correctPhone(PHONE_X, "+19705550001");
  const a2 = correctPhone(PHONE_X, PHONE_Y, a1.assertionId);
  expect(chainHeads([a1, a2]).map((a) => a.assertionId)).toEqual([
    a2.assertionId,
  ]);
  const result = applyCorrections(sourceGraph(PHONE_X), [a1, a2]);
  expect(result.graph.objects[0].fields["phone"]).toBe(PHONE_Y);
  expect(result.applied.map((a) => a.assertionId)).toEqual([a2.assertionId]);
  // The superseded assertion was passed in and kept; it just does not win.
  expect(result.orphaned).toEqual([]);
});

test("orphaned: assertion on an unknown fact is kept, not applied, not dropped", () => {
  const a = assertCorrection({
    factRef: { objectId: "no-such-object", field: "phone" },
    op: "CORRECT",
    value: PHONE_Y,
    provenance: demoProvenance(null, () => NOW),
    sourceValueSeen: null,
  });
  const result = applyCorrections(sourceGraph(PHONE_X), [a]);
  expect(result.orphaned).toHaveLength(1);
  expect(result.orphaned[0].assertionId).toBe(a.assertionId);
  expect(result.applied).toEqual([]);
});

test("orphaned: CORRECT on a field the read seam cannot express", () => {
  const a = assertCorrection({
    factRef: { objectId: "biz-1", field: "title" },
    op: "CORRECT",
    value: "New Title",
    provenance: demoProvenance(null, () => NOW),
    sourceValueSeen: "Example Plumbing",
  });
  const result = applyCorrections(sourceGraph(PHONE_X), [a]);
  expect(result.orphaned).toHaveLength(1);
  expect(result.orphaned[0].reason).toMatch("not expressible on the verifier's read seam");
  // Not projected: the title is untouched.
  expect(result.graph.objects[0].title).toBe("Example Plumbing");
});

test("assertCorrection refuses honestly and ids are deterministic", () => {
  expect(() =>
    assertCorrection({
      factRef: { objectId: "biz-1", field: "phone" },
      op: "CORRECT",
      provenance: demoProvenance(null, () => NOW),
    }),
  ).toThrow("CORRECT requires a non-empty corrected value");
  expect(() =>
    assertCorrection({
      factRef: { objectId: "biz-1", field: "phone" },
      op: "CONFIRM",
      value: "x",
      provenance: demoProvenance(null, () => NOW),
    }),
  ).toThrow("does not take a value");
  const a1 = correctPhone(PHONE_X, PHONE_Y);
  const a2 = correctPhone(PHONE_X, PHONE_Y);
  expect(a1.assertionId).toBe(a2.assertionId);
  expect(a1.assertionId).toMatch(/^oa-[0-9a-f]{16}$/);
});
