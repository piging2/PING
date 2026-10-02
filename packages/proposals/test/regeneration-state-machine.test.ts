/**
 * ADVERSARIAL regeneration-as-a-state-machine tests (Nolan 12-point program, point 4).
 *
 * The sequence under test, exactly as the program orders it:
 *   T1 source -> generate -> owner changes presentation -> owner corrects
 *   a fact -> T2 source changes -> regenerate.
 *
 * What this file proves:
 * - SOURCE STATE, OWNER OVERRIDE, and GENERATED PRESENTATION are three
 *   separate states, never conflated. The regenerate() input carries them
 *   as three distinct artifacts (graph, assertions, presentationOverrides,
 *   spec), and the output keeps them attributable.
 * - New legitimate source evidence (a new service) appears in the
 *   regenerated output, with its evidence records in the diff.
 * - The owner correction remains attributable after regeneration: the
 *   owner value is applied, and the record carries who asserted it, when,
 *   what the source said then, and the assertion id.
 * - The presentation customization (section reorder) survives
 *   regeneration: the override is re-applied after the fresh generator
 *   run, counted in overridesReapplied.
 * - A genuine conflict (source changed the asserted field to a third
 *   value) becomes an EXPLICIT conflict record: both values carried, the
 *   owner's value stays applied, nothing wins silently.
 * - Nothing silently disappears: every T1 object id that is gone from the
 *   regenerated graph is accounted for in the evidence diff's removed
 *   records, and every added evidence record's object is present.
 * - A changeless observation is a byte-identical no-op.
 *
 * DEMO_OWNER_LABEL is used explicitly as the approver/actor label;
 * nothing here fakes production auth.
 */
import { digestCanonical } from "../../trust/src/digest";
import { generateSiteSpec } from "../../sitespec/src/generator";
import { resolveQuery } from "../../sitespec/src/query";
import type { ObjectGraph } from "../../sitespec/src/types";
import type {
  PingObject,
  PingRelationship,
} from "../../sitespec/src/ping-types";
import { assertCorrection } from "../../owner/src/corrections";
import { DEMO_OWNER_LABEL, demoProvenance } from "../../owner/src/provenance";
import { coppersmithWithEmergency } from "./helpers";
import {
  approveProposal,
  applyProposal,
  diffEvidence,
  emptyProposalsState,
  proposePatch,
  regenerate,
} from "../src";
import type { OwnerAssertion } from "../src";

const OWNER_ID = "website-business-2f1327c09d622175";
const T1 = "2026-10-02T16:20:00.000Z";
const T2 = "2026-10-02T18:20:00.000Z";
const PHONE_X = "970-245-3869"; // what the T1 source says
const PHONE_Y = "970-245-3000"; // what the owner asserts
const PHONE_Z = "970-245-3999"; // what the T2 source changed to
const REMOVED_SVC = OWNER_ID + "-service-a2008c93fb04"; // "Ventilation"
const NEW_SVC = OWNER_ID + "-service-waterheater";

/** T2: source drift on the asserted field, one new service, one removed service. */
function t2Observation(t1: ObjectGraph): ObjectGraph {
  const g = JSON.parse(JSON.stringify(t1)) as ObjectGraph;
  const biz = g.objects.find((o) => o.id === OWNER_ID);
  if (!biz) throw new Error("fixture lost the business object");
  biz.fields["phone"] = PHONE_Z;
  biz.updatedAt = T2;

  const svc: PingObject = {
    id: NEW_SVC,
    schema: "ping.social.service@1",
    controllerId: "identity_fyd_compiler_test",
    visibility: "public",
    title: "Water Heater Install",
    description: "Tank and tankless water heater installation.",
    fields: {
      name: "Water Heater Install",
      description: "Tank and tankless water heater installation.",
      service_href: "https://coppersmithplumbing.com/services/plumbing/water-heaters/",
      claimKind: "website_statement",
    },
    createdAt: T2,
    updatedAt: T2,
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://www.coppersmithplumbing.com/",
      derivedAt: T2,
    },
  };
  const rel: PingRelationship = {
    id: "rel-test-waterheater",
    subject: OWNER_ID,
    predicate: "offers",
    object: NEW_SVC,
    status: "active",
    createdAt: T2,
    evidenceRef: "test:t2:water-heater",
  };
  g.objects.push(svc);
  g.relationships.push(rel);

  g.objects = g.objects.filter((o) => o.id !== REMOVED_SVC);
  g.relationships = g.relationships.filter(
    (r) => r.object !== REMOVED_SVC && r.subject !== REMOVED_SVC,
  );
  return g;
}

function correctPhone(): OwnerAssertion {
  return assertCorrection({
    factRef: { objectId: OWNER_ID, field: "phone" },
    op: "CORRECT",
    value: PHONE_Y,
    provenance: demoProvenance(null, () => T1),
    sourceValueSeen: PHONE_X,
  });
}

/** Build the full world: T1 -> generate -> presentation change -> correction -> T2. */
function buildWorld() {
  const t1 = coppersmithWithEmergency();
  const specT1 = generateSiteSpec(t1, { generatedAt: T1 });

  // Owner changes presentation: move emergency plumbing to the top.
  const drafted = proposePatch(
    "Move emergency plumbing to the top.",
    { kind: "move_section_to_top", target: "emergency plumbing" },
    specT1,
    t1,
  );
  if (!drafted.ok) throw new Error("draft failed: " + drafted.reason);
  const approved = approveProposal(drafted.proposal, {
    approvedBy: DEMO_OWNER_LABEL,
    approvedAt: T1,
  });
  if (!approved.ok) throw new Error("approve failed: " + approved.reason);
  const applied = applyProposal(emptyProposalsState(specT1), approved.proposal, {
    appliedAt: () => T1,
  });
  if (!applied.ok) throw new Error("apply failed: " + applied.reason);
  const op = drafted.proposal.patch[0];
  if (op.op !== "reorder_section") throw new Error("expected reorder_section");
  const servicesFirst = op.after[0];

  // Owner corrects a fact.
  const correction = correctPhone();

  // T2 source changes.
  const t2 = t2Observation(t1);

  const result = regenerate({
    graph: t1,
    newObservation: t2,
    spec: applied.state.spec,
    assertions: [correction],
    presentationOverrides: applied.state.overrides,
    generatedAt: T2,
  });

  return {
    t1,
    t2,
    specT1,
    servicesFirst,
    state1: applied.state,
    overrides1: applied.state.overrides,
    correction,
    result,
  };
}

describe("regen state machine: the three states stay separate", () => {
  test("SOURCE STATE, OWNER OVERRIDE, GENERATED PRESENTATION are distinct artifacts", () => {
    const w = buildWorld();
    // Owner-presentation state: one absolute override, standalone.
    expect(w.overrides1).toHaveLength(1);
    expect(w.overrides1[0].kind).toBe("section_order");
    // Owner-fact state: one assertion, standalone.
    // Generated presentation: the live spec carries the override applied.
    const home = w.state1.spec.pages.find((p) => p.slug === "home");
    expect(home && home.sections[0].id).toBe(w.servicesFirst);
    // After regeneration the spec changed (source did) but the override
    // list is the same object-shape: re-applied, not re-derived.
    expect(digestCanonical(w.result.spec)).not.toBe(
      digestCanonical(w.state1.spec),
    );
    expect(w.result.overridesReapplied).toBeGreaterThan(0);
  });

  test("new legitimate source evidence appears in the regenerated output", () => {
    const w = buildWorld();
    const addedForNew = w.result.evidenceDiff.added.filter(
      (r) => r.objectId === NEW_SVC,
    );
    expect(addedForNew.length).toBeGreaterThan(0);
    expect(
      w.result.evidenceDiff.affectedObjectIds.includes(NEW_SVC),
    ).toBe(true);
    const inGraph = w.result.graph.objects.find((o) => o.id === NEW_SVC);
    expect(inGraph && inGraph.title).toBe("Water Heater Install");
    expect(w.result.affectedPaths.length).toBeGreaterThan(0);
    // The SiteSpec is declarative: sections carry queries, not titles.
    // The new service must be BOUND by the Services section query in the
    // regenerated spec, resolved against the regenerated graph.
    const servicesPage = w.result.spec.pages.find((p) => p.slug === "services");
    if (!servicesPage) throw new Error("no services page");
    const servicesSection = servicesPage.sections.find(
      (s) => s.component === "Services",
    );
    if (!servicesSection) throw new Error("no Services section");
    const bound = resolveQuery(
      servicesSection.query,
      w.result.graph,
      w.result.spec.ownerObjectId,
    ).map((o) => o.id);
    expect(bound).toContain(NEW_SVC);
    expect(w.result.noOp).toBe(false);
  });
});

describe("regen state machine: owner intent survives", () => {
  test("the owner correction remains attributable after regeneration", () => {
    const w = buildWorld();
    const biz = w.result.graph.objects.find((o) => o.id === OWNER_ID);
    expect(biz && biz.fields["phone"]).toBe(PHONE_Y);
    expect(w.result.assertions.applied.map((a) => a.assertionId)).toContain(
      w.correction.assertionId,
    );
    const rec = biz && biz.ownerFieldCorrections && biz.ownerFieldCorrections[0];
    expect(rec).toMatchObject({
      field: "phone",
      sourceValue: PHONE_X,
      ownerValue: PHONE_Y,
      actorLabel: DEMO_OWNER_LABEL,
      correctedAt: T1,
    });
    expect(rec && rec.basis).toContain(w.correction.assertionId);
  });

  test("the presentation customization survives regeneration", () => {
    const w = buildWorld();
    const home = w.result.spec.pages.find((p) => p.slug === "home");
    expect(home && home.sections[0].id).toBe(w.servicesFirst);
    expect(w.result.overridesReapplied).toBeGreaterThan(0);
  });

  test("genuine conflict becomes an explicit record; the owner value stays applied", () => {
    const w = buildWorld();
    expect(w.result.assertions.conflicts).toHaveLength(1);
    const c = w.result.assertions.conflicts[0];
    expect(c.assertionId).toBe(w.correction.assertionId);
    expect(c.sourceValue).toBe(PHONE_Z);
    expect(c.ownerValue).toBe(PHONE_Y);
    expect(c.reason.length).toBeGreaterThan(0);
    const biz = w.result.graph.objects.find((o) => o.id === OWNER_ID);
    expect(biz && biz.fields["phone"]).toBe(PHONE_Y);
  });
});

describe("regen state machine: nothing silently disappears", () => {
  test("the removed service is accounted for in the evidence diff", () => {
    const w = buildWorld();
    const removedForSvc = w.result.evidenceDiff.removed.filter(
      (r) => r.objectId === REMOVED_SVC,
    );
    expect(removedForSvc.length).toBeGreaterThan(0);
    expect(
      w.result.graph.objects.some((o) => o.id === REMOVED_SVC),
    ).toBe(false);
  });

  test("every T1 object that vanished is named in the removed evidence; every added record resolves", () => {
    const w = buildWorld();
    const t1Ids = new Set(w.t1.objects.map((o) => o.id));
    const outIds = new Set(w.result.graph.objects.map((o) => o.id));
    const removedIds = new Set(
      w.result.evidenceDiff.removed.map((r) => r.objectId),
    );
    const vanished = [...t1Ids].filter((id) => !outIds.has(id));
    expect(vanished.length).toBeGreaterThan(0);
    for (const id of vanished) {
      expect(removedIds.has(id)).toBe(true);
    }
    for (const r of w.result.evidenceDiff.added) {
      expect(outIds.has(r.objectId)).toBe(true);
    }
    // Cross-check with the independent diff function: same story.
    const independent = diffEvidence(w.t1, w.t2);
    expect(
      independent.removed.some((r) => r.objectId === REMOVED_SVC),
    ).toBe(true);
  });

  test("a changeless observation is a byte-identical no-op", () => {
    const t1 = coppersmithWithEmergency();
    const spec = generateSiteSpec(t1, { generatedAt: T1 });
    const frozen = JSON.parse(JSON.stringify(t1)) as ObjectGraph;
    const result = regenerate({
      graph: t1,
      newObservation: frozen,
      spec,
      assertions: [],
      presentationOverrides: [],
      generatedAt: T2,
    });
    expect(result.noOp).toBe(true);
    expect(result.specDigest).toBe(digestCanonical(spec));
    expect(result.affectedPaths).toEqual([]);
    expect(result.freshPages).toEqual([]);
  });
});
