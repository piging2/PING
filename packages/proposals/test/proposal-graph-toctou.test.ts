/**
 * ADVERSARIAL (Worker E, hunt 7): proposal TOCTOU on the object graph.
 *
 * The proposal seal covers the spec (beforeDigest) but NOT the graph.
 * A patch op can reference object ids (featuredIds / objectOrder /
 * hiddenObjectIds). validatePatch checks those against the graph at DRAFT
 * time, but applyProposal re-validates WITHOUT the graph: if the object
 * is deleted between preview and apply, the approval still applies and
 * the spec is left with a DANGLING object reference the owner never
 * reviewed.
 *
 * The repair: applyProposal accepts the current graph via ApplyOptions
 * and re-runs the object-existence validation at effect time. When the
 * host supplies the graph, a proposal whose referenced objects vanished
 * is refused; without a graph the behavior is unchanged (the host that
 * does not track the graph cannot be protected from its changes).
 */
import { digestCanonical } from "../../trust/src/digest";
import { generateSiteSpec } from "../../sitespec/src/generator";
import { coppersmithWithEmergency } from "./helpers";
import { applyPatchToSpec } from "../src/apply";
import { proposalIdOf, validatePatch } from "../src/compiler";
import {
  applyProposal,
  approveProposal,
  emptyProposalsState,
} from "../src/proposal";
import type {
  PatchProposal,
  SiteSpecPatchOp,
} from "../src/types";

const T1 = "2026-10-02T16:30:00.000Z";
const APPROVED_AT = "2026-10-02T16:31:00.000Z";
const APPLIED_AT = "2026-10-02T16:32:00.000Z";
const OWNER_ID = "website-business-2f1327c09d622175";
const SERVICE_ID = OWNER_ID + "-service-emergency";

function draftFeaturedIdsProposal() {
  const graph = coppersmithWithEmergency();
  const spec = generateSiteSpec(graph, { generatedAt: T1 });
  const home = spec.pages.find((p) => p.slug === "home");
  if (!home) throw new Error("no home page");
  const services = home.sections.find((s) => s.component === "Services");
  if (!services) throw new Error("no Services section");
  const patch: SiteSpecPatchOp[] = [
    {
      op: "set_component_option",
      path:
        "pages.home.sections." +
        services.id +
        ".presentation.featuredIds",
      pageSlug: "home",
      sectionId: services.id,
      option: "featuredIds",
      before: null,
      after: [SERVICE_ID],
      rationale: "Owner request: feature Emergency Plumbing.",
    },
  ];
  // Draft-time validation WITH the graph: the object exists, so the
  // patch is legitimate when the owner reviews it.
  expect(validatePatch(spec, patch, graph)).toEqual([]);
  const beforeDigest = digestCanonical(spec);
  const afterDigest = digestCanonical(applyPatchToSpec(spec, patch));
  const preview = {
    title: "Feature Emergency Plumbing",
    before: ["featured: (none)"],
    after: ["featured: Emergency Plumbing"],
  };
  const intent = { kind: "hide_section", target: "unused" } as const;
  const proposal: PatchProposal = {
    id: proposalIdOf("Feature it.", intent, patch, beforeDigest, preview),
    commandText: "Feature it.",
    intent,
    patch,
    beforeDigest,
    afterDigest,
    preview,
    status: "proposed",
  };
  const approved = approveProposal(proposal, {
    approvedBy: "demo-owner (seeded, unverified)",
    approvedAt: APPROVED_AT,
  });
  if (!approved.ok) throw new Error("approve failed: " + approved.reason);
  return { spec, graph, proposal: approved.proposal };
}

describe("proposal TOCTOU: graph changes between preview and apply", () => {
  test("applying against a graph that lost the referenced object is refused", () => {
    const { spec, graph, proposal } = draftFeaturedIdsProposal();
    // The world changes after the owner reviewed the preview: the
    // service object is deleted from the graph.
    const graphAfter = {
      objects: graph.objects.filter((o) => o.id !== SERVICE_ID),
      relationships: graph.relationships.filter(
        (r) => r.subject !== SERVICE_ID && r.object !== SERVICE_ID,
      ),
    };
    const state = emptyProposalsState(spec);
    const out = applyProposal(state, proposal, {
      appliedAt: () => APPLIED_AT,
      graph: graphAfter,
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toContain(SERVICE_ID);
    }
    // Nothing applied: the spec is untouched and the journal is empty.
    expect(digestCanonical(state.spec)).toBe(proposal.beforeDigest);
    expect(state.transitions).toEqual([]);
  });

  test("unchanged graph: the same proposal still applies", () => {
    const { spec, graph, proposal } = draftFeaturedIdsProposal();
    const out = applyProposal(emptyProposalsState(spec), proposal, {
      appliedAt: () => APPLIED_AT,
      graph,
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.state.transitions).toHaveLength(1);
  });

  test("no graph supplied: legacy behavior preserved (no graph check)", () => {
    const { spec, proposal } = draftFeaturedIdsProposal();
    const out = applyProposal(emptyProposalsState(spec), proposal, {
      appliedAt: () => APPLIED_AT,
    });
    // Unchanged: without a graph the package cannot see graph drift.
    expect(out.ok).toBe(true);
  });
});
