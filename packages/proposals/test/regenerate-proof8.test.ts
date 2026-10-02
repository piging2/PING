/**
 * PROOF 8: regeneration preserving owner corrections and presentation
 * overrides.
 *
 *   new observation -> evidence diff -> affected objects ->
 *   affected SiteSpec paths -> generator re-runs for affected pages only
 *   -> owner assertions re-apply -> presentation overrides re-apply ->
 *   new SiteSpec version.
 */

import { digestCanonical } from "../../trust/src/digest";
import { generateSiteSpec } from "../../sitespec/src/generator";
import type { ObjectGraph } from "../../sitespec/src/types";
import {
  applyProposal,
  approveProposal,
  chainHeads,
  deepClone,
  assertCorrection,
  emptyProposalsState,
  proposePatch,
  regenerate,
  renderSpecDigest,
} from "../src";
import type { ProposalsState } from "../src";
import { coppersmithWithEmergency } from "./helpers";

const GENERATED_AT = "2026-10-02T14:00:00.000Z";
const APPROVED_AT = "2026-10-02T14:05:00.000Z";
const APPLIED_AT = "2026-10-02T14:06:00.000Z";
const OWNER_ID = "website-business-2f1327c09d622175";
const HVAC_ID = OWNER_ID + "-service-78962f315c55";

const OLD_PHONE = "970-245-3869";
const OWNER_PHONE = "970-555-0100";

/**
 * Run the Proof-7 loop once so the owner layer carries a real applied
 * proposal: "Move emergency plumbing to the top." -> section_order
 * presentation override on the home page.
 */
function proof7State(graph: ObjectGraph): ProposalsState {
  const spec = generateSiteSpec(graph, { generatedAt: GENERATED_AT });
  const drafted = proposePatch(
    "Move emergency plumbing to the top.",
    { kind: "move_section_to_top", target: "emergency plumbing" },
    spec,
    graph,
  );
  if (!drafted.ok) throw new Error("proof-7 setup failed: " + drafted.reason);
  const approved = approveProposal(drafted.proposal, { approvedBy: "owner", approvedAt: APPROVED_AT });
  if (!approved.ok) throw new Error("proof-7 setup failed: " + approved.reason);
  const applied = applyProposal(emptyProposalsState(spec), approved.proposal, {
    appliedAt: () => APPLIED_AT,
  });
  if (!applied.ok) throw new Error("proof-7 setup failed: " + applied.reason);
  return applied.state;
}

function ownerPhone(graph: ObjectGraph): string {
  const owner = graph.objects.find((o) => o.id === OWNER_ID);
  const v = owner?.fields["phone"];
  return typeof v === "string" ? v : "";
}

function serviceDescription(graph: ObjectGraph, id: string): string {
  return graph.objects.find((o) => o.id === id)?.description ?? "";
}

describe("proof 8: regeneration", () => {
  test("(a) new observation changes a service description: diff identifies it, spec regenerates, owner phone correction survives", () => {
    const graph = coppersmithWithEmergency();
    const state = proof7State(graph);

    // The owner corrects the phone number (source said OLD_PHONE).
    const phoneAssertion = assertCorrection({
      factRef: { objectId: OWNER_ID, field: "phone" },
      op: "CORRECT",
      value: OWNER_PHONE,
      provenance: { owner: "owner", assertedAt: APPROVED_AT, supersedes: null },
      sourceValueSeen: OLD_PHONE,
    });
    expect(phoneAssertion.assertionId).toMatch(/^oa-[0-9a-f]{16}$/);

    // New observation: the HVAC service description changed on the source site.
    const newObservation = JSON.parse(JSON.stringify(graph)) as ObjectGraph;
    const hvac = newObservation.objects.find((o) => o.id === HVAC_ID);
    const NEW_DESC = "We install and service complete heating, cooling, and ventilation systems across Western Colorado.";
    hvac!.description = NEW_DESC;
    hvac!.fields["description"] = NEW_DESC;

    const result = regenerate({
      graph,
      newObservation,
      spec: state.spec,
      assertions: [phoneAssertion],
      presentationOverrides: state.overrides,
      generatedAt: GENERATED_AT,
    });

    expect(result.noOp).toBe(false);

    // Evidence diff identifies the changed service.
    expect(result.evidenceDiff.affectedObjectIds).toContain(HVAC_ID);
    expect(result.evidenceDiff.added.length).toBeGreaterThan(0);
    expect(result.evidenceDiff.removed.length).toBeGreaterThan(0);

    // Affected paths point at the sections binding the changed service.
    expect(result.affectedPaths.some((p) => p.includes("home:Services:2"))).toBe(true);
    expect(result.freshPages).toContain("home");
    expect(result.freshPages).toContain("services");

    // The regenerated spec is built over the new observation.
    expect(serviceDescription(result.graph, HVAC_ID)).toBe(NEW_DESC);

    // The owner's phone correction SURVIVES the regeneration.
    expect(ownerPhone(result.graph)).toBe(OWNER_PHONE);
    expect(result.assertions.applied.map((a) => a.assertionId)).toContain(phoneAssertion.assertionId);
    expect(result.assertions.conflicts).toHaveLength(0);
    expect(result.assertions.orphaned).toHaveLength(0);

    // The spec's STRUCTURE is stable here, and that is the honest
    // outcome: the generator never embeds descriptions, so a
    // description-only change re-derives byte-identical sections (same
    // structure in, same structure out). What changed is the underlying
    // observation, which the regenerated RENDER reflects: the render
    // digest moves because the projection checkpoint (graphDigest) moved.
    expect(result.specDigest).toBe(digestCanonical(state.spec));
    const renderBefore = renderSpecDigest(state.spec, graph);
    const renderAfter = renderSpecDigest(result.spec, result.graph);
    expect(renderAfter.digest).not.toBe(renderBefore.digest);
    expect(result.spec).not.toBe(state.spec);
  });

  test("(a2) a structural observation change updates the spec content", () => {
    const graph = coppersmithWithEmergency();
    const state = proof7State(graph);
    const hasPeople = (s: { pages: Array<{ sections: Array<{ component: string }> }> }) =>
      s.pages.some((p) => p.sections.some((sec) => sec.component === "People"));
    expect(hasPeople(state.spec)).toBe(true);

    // New observation: the person is no longer linked to the business
    // (the works_for relationship is gone from the source).
    const newObservation = deepClone(graph);
    newObservation.relationships = newObservation.relationships.filter(
      (r) => r.predicate !== "works_for",
    );

    const result = regenerate({
      graph,
      newObservation,
      spec: state.spec,
      assertions: [],
      presentationOverrides: state.overrides,
      generatedAt: GENERATED_AT,
    });

    expect(result.noOp).toBe(false);
    // The People sections are affected (their bound set changed)...
    expect(result.affectedPaths.some((p) => p.includes("People"))).toBe(true);
    expect(result.freshPages).toContain("home");
    // ...and the regenerated spec drops them: the spec content changed.
    expect(hasPeople(result.spec)).toBe(false);
    expect(result.specDigest).not.toBe(digestCanonical(state.spec));
    // The owner's section order still holds on the home page.
    const home = result.spec.pages.find((p) => p.slug === "home");
    expect(home!.sections[0].component).toBe("Services");
  });

  test("(b) the Proof-7 section order (presentation override) survives regeneration", () => {
    const graph = coppersmithWithEmergency();
    const state = proof7State(graph);

    const newObservation = JSON.parse(JSON.stringify(graph)) as ObjectGraph;
    const hvac = newObservation.objects.find((o) => o.id === HVAC_ID);
    hvac!.description = "Updated HVAC description for the regeneration proof.";
    hvac!.fields["description"] = "Updated HVAC description for the regeneration proof.";

    const result = regenerate({
      graph,
      newObservation,
      spec: state.spec,
      assertions: [],
      presentationOverrides: state.overrides,
      generatedAt: GENERATED_AT,
    });

    expect(result.noOp).toBe(false);
    expect(result.overridesReapplied).toBeGreaterThan(0);
    const home = result.spec.pages.find((p) => p.slug === "home");
    // The owner-approved order (Services first) survived the fresh generation.
    expect(home!.sections[0].id).toBe("home:Services:2");
    expect(home!.sections[0].component).toBe("Services");
  });

  test("(c) a changeless observation is a byte-identical no-op", () => {
    const graph = coppersmithWithEmergency();
    const state = proof7State(graph);

    const result = regenerate({
      graph,
      newObservation: JSON.parse(JSON.stringify(graph)) as ObjectGraph,
      spec: state.spec,
      assertions: [],
      presentationOverrides: state.overrides,
      generatedAt: GENERATED_AT,
    });

    expect(result.noOp).toBe(true);
    expect(result.evidenceDiff.added).toHaveLength(0);
    expect(result.evidenceDiff.removed).toHaveLength(0);
    expect(result.affectedPaths).toHaveLength(0);
    expect(result.freshPages).toHaveLength(0);
    expect(result.specDigest).toBe(digestCanonical(state.spec));
    expect(digestCanonical(result.spec)).toBe(digestCanonical(state.spec));
  });

  test("conflict: source changes a CORRECTed field after the owner asserted -> conflict surfaced, owner value stays", () => {
    const graph = coppersmithWithEmergency();
    const state = proof7State(graph);

    const phoneAssertion = assertCorrection({
      factRef: { objectId: OWNER_ID, field: "phone" },
      op: "CORRECT",
      value: OWNER_PHONE,
      provenance: { owner: "owner", assertedAt: APPROVED_AT, supersedes: null },
      sourceValueSeen: OLD_PHONE,
    });

    // The source later changes the phone to something else entirely.
    const newObservation = JSON.parse(JSON.stringify(graph)) as ObjectGraph;
    const owner = newObservation.objects.find((o) => o.id === OWNER_ID);
    owner!.fields["phone"] = "970-111-2222";

    const result = regenerate({
      graph,
      newObservation,
      spec: state.spec,
      assertions: [phoneAssertion],
      presentationOverrides: state.overrides,
      generatedAt: GENERATED_AT,
    });

    expect(result.noOp).toBe(false);
    // The owner's value stays applied AND the conflict is explicit.
    expect(ownerPhone(result.graph)).toBe(OWNER_PHONE);
    expect(result.assertions.conflicts).toHaveLength(1);
    const c = result.assertions.conflicts[0];
    expect(c.sourceValue).toBe("970-111-2222");
    expect(c.ownerValue).toBe(OWNER_PHONE);
  });

  test("chain heads: only the latest assertion in a supersedes chain applies", () => {
    const first = assertCorrection({
      factRef: { objectId: OWNER_ID, field: "phone" },
      op: "CORRECT",
      value: "970-555-0001",
      provenance: { owner: "owner", assertedAt: "2026-10-02T13:00:00.000Z", supersedes: null },
      sourceValueSeen: OLD_PHONE,
    });
    const second = assertCorrection({
      factRef: { objectId: OWNER_ID, field: "phone" },
      op: "CORRECT",
      value: OWNER_PHONE,
      provenance: { owner: "owner", assertedAt: APPROVED_AT, supersedes: first.assertionId },
      sourceValueSeen: "970-555-0001",
    });
    const heads = chainHeads([first, second]);
    expect(heads).toHaveLength(1);
    expect(heads[0].assertionId).toBe(second.assertionId);
  });
});
