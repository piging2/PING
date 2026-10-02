/**
 * ADVERSARIAL (Worker E, hunt 4): regeneration must preserve owner
 * intent when the source changes.
 *
 * Section ids were positional: "pageSlug:component:index" with index =
 * emission order. Any source change that inserts or removes a section
 * (e.g. the owner adds a description -> BusinessSummary appears at index
 * 1) SHIFTED every downstream section id. Presentation overrides keyed by
 * section id then silently stopped matching: applyOverrides ignores
 * unknown ids, so the owner's hide/reorder survived regeneration only
 * by luck of position.
 *
 * The repair: section ids are per-component ordinals
 * ("pageSlug:component:n", n = the nth section of that component on the
 * page). Each component is emitted at most once per page, so ids are
 * stable under insertion/removal of SIBLING sections, and a reorder no
 * longer renames the sections it moves. The generator version is bumped
 * because the id formulation changed.
 */
import { digestCanonical } from "../../trust/src/digest";
import { generateSiteSpec } from "../../sitespec/src/generator";
import type { ObjectGraph } from "../../sitespec/src/types";
import { coppersmithWithEmergency } from "./helpers";
import {
  applyProposal,
  approveProposal,
  emptyProposalsState,
  proposePatch,
  regenerate,
} from "../src";

const T1 = "2026-10-02T16:30:00.000Z";
const APPROVED_AT = "2026-10-02T16:31:00.000Z";
const APPLIED_AT = "2026-10-02T16:32:00.000Z";
const OWNER_ID = "website-business-2f1327c09d622175";

function sectionIdsOf(spec: ReturnType<typeof generateSiteSpec>): string[] {
  return spec.pages.flatMap((p) => p.sections.map((s) => s.id));
}

/** The owner removes their description: BusinessSummary vanishes. */
function graphWithoutDescription(graph: ObjectGraph): ObjectGraph {
  const next = JSON.parse(JSON.stringify(graph)) as ObjectGraph;
  const owner = next.objects.find((o) => o.id === OWNER_ID);
  if (!owner) throw new Error("owner missing");
  owner.description = "";
  if (owner.fields) delete owner.fields["description"];
  return next;
}

describe("regeneration: section identity survives source changes", () => {
  test("sibling insert/remove does not rename surviving sections", () => {
    const graph = coppersmithWithEmergency();
    const before = generateSiteSpec(graph, { generatedAt: T1 });
    const after = generateSiteSpec(graphWithoutDescription(graph), {
      generatedAt: T1,
    });
    const beforeIds = new Set(sectionIdsOf(before));
    const afterIds = new Set(sectionIdsOf(after));
    // Only the removed section's id may disappear; every survivor keeps
    // its id byte for byte.
    for (const id of afterIds) {
      expect(beforeIds.has(id)).toBe(true);
    }
    expect(afterIds.has("home:BusinessSummary:0")).toBe(false);
    expect(afterIds.has("home:Contact:0")).toBe(true);
  });

  test("owner hide override survives a source change that shifts positions", () => {
    const graph = coppersmithWithEmergency();
    const spec = generateSiteSpec(graph, { generatedAt: T1 });
    const drafted = proposePatch(
      "Hide the contact section.",
      { kind: "hide_section", target: "Contact" },
      spec,
      graph,
    );
    if (!drafted.ok) throw new Error("draft failed: " + drafted.reason);
    const approved = approveProposal(drafted.proposal, {
      approvedBy: "demo-owner (seeded, unverified)",
      approvedAt: APPROVED_AT,
    });
    if (!approved.ok) throw new Error("approve failed: " + approved.reason);
    const applied = applyProposal(emptyProposalsState(spec), approved.proposal, {
      appliedAt: () => APPLIED_AT,
    });
    if (!applied.ok) throw new Error("apply failed: " + applied.reason);
    expect(applied.state.overrides.length).toBeGreaterThan(0);

    // Source change: the description is removed, BusinessSummary
    // disappears, every positional id after index 1 would shift.
    const result = regenerate({
      graph,
      newObservation: graphWithoutDescription(graph),
      spec: applied.state.spec,
      assertions: [],
      presentationOverrides: applied.state.overrides,
      generatedAt: T1,
    });
    expect(result.noOp).toBe(false);
    const home = result.spec.pages.find((p) => p.slug === "home");
    const contact = home?.sections.find((s) => s.component === "Contact");
    expect(contact).toBeDefined();
    // The owner's hide intent survived the regeneration.
    expect(contact?.presentation.hidden).toBe(true);
    expect(result.overridesReapplied).toBeGreaterThan(0);
  });

  test("reorder override survives a source change that shifts positions", () => {
    const graph = coppersmithWithEmergency();
    const spec = generateSiteSpec(graph, { generatedAt: T1 });
    const drafted = proposePatch(
      "Move services to the top.",
      { kind: "move_section_to_top", target: "Services" },
      spec,
      graph,
    );
    if (!drafted.ok) throw new Error("draft failed: " + drafted.reason);
    const approved = approveProposal(drafted.proposal, {
      approvedBy: "demo-owner (seeded, unverified)",
      approvedAt: APPROVED_AT,
    });
    if (!approved.ok) throw new Error("approve failed: " + approved.reason);
    const applied = applyProposal(emptyProposalsState(spec), approved.proposal, {
      appliedAt: () => APPLIED_AT,
    });
    if (!applied.ok) throw new Error("apply failed: " + applied.reason);
    const homeAfterApply = applied.state.spec.pages.find(
      (p) => p.slug === "home",
    );
    expect(homeAfterApply?.sections[0].component).toBe("Services");

    const result = regenerate({
      graph,
      newObservation: graphWithoutDescription(graph),
      spec: applied.state.spec,
      assertions: [],
      presentationOverrides: applied.state.overrides,
      generatedAt: T1,
    });
    const home = result.spec.pages.find((p) => p.slug === "home");
    // Services is still first: the section_order override re-applied
    // against stable ids.
    expect(home?.sections[0].component).toBe("Services");
  });
});
