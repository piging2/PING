/**
 * PROOF 7: conversational customization.
 *
 * "Move emergency plumbing to the top." -> request -> TYPED SiteSpec
 * patch proposal -> before/after -> APPROVAL -> canonical transition ->
 * regenerated render.
 *
 * The planner is upstream: the test supplies the planned intent as
 * structured input (the LLM plans; software validates and applies).
 *
 * Fixture note: the Coppersmith graph has no "emergency plumbing"
 * service, so the test derives a graph with one added (documented
 * below). The fixture file itself is untouched.
 */

import { digestCanonical } from "../../trust/src/digest";
import { generateSiteSpec } from "../../sitespec/src/generator";
import { coppersmithWithEmergency } from "./helpers";
import {
  approveProposal,
  applyProposal,
  emptyProposalsState,
  proposePatch,
  renderSpecDigest,
  validatePatch,
} from "../src";

const GENERATED_AT = "2026-10-02T14:00:00.000Z";
const APPROVED_AT = "2026-10-02T14:05:00.000Z";
const APPLIED_AT = "2026-10-02T14:06:00.000Z";


describe("proof 7: conversational customization", () => {
  const graph = coppersmithWithEmergency();
  const spec = generateSiteSpec(graph, { generatedAt: GENERATED_AT });

  test("the home page has a Services section binding Emergency Plumbing", () => {
    const home = spec.pages.find((p) => p.slug === "home");
    expect(home).toBeDefined();
    const services = home!.sections.find((s) => s.component === "Services");
    expect(services).toBeDefined();
    expect(services!.id).toBe("home:Services:2");
  });

  test("proposePatch drafts a typed proposal with before/after", () => {
    const out = proposePatch(
      "Move emergency plumbing to the top.",
      { kind: "move_section_to_top", target: "emergency plumbing" },
      spec,
      graph,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const p = out.proposal;
    expect(p.id).toMatch(/^pp-[0-9a-f]{64}$/);
    expect(p.status).toBe("proposed");
    expect(p.patch).toHaveLength(1);
    const op = p.patch[0];
    expect(op.op).toBe("reorder_section");
    if (op.op !== "reorder_section") return;
    expect(op.pageSlug).toBe("home");
    expect(op.after[0]).toBe("home:Services:2");
    expect([...op.after].sort()).toEqual([...op.before].sort());
    expect(p.beforeDigest).toBe(digestCanonical(spec));
    expect(p.afterDigest).not.toBe(p.beforeDigest);
    expect(p.preview.before.length).toBeGreaterThan(0);
    expect(p.preview.after.length).toBeGreaterThan(0);
    expect(p.preview.after[0]).toContain("Services");
  });

  test("proposal ids are deterministic: same draft twice, same id", () => {
    const a = proposePatch("Move emergency plumbing to the top.", { kind: "move_section_to_top", target: "emergency plumbing" }, spec, graph);
    const b = proposePatch("Move emergency plumbing to the top.", { kind: "move_section_to_top", target: "emergency plumbing" }, spec, graph);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.proposal.id).toBe(b.proposal.id);
  });

  test("unresolvable targets are honest refusals, never empty proposals", () => {
    const out = proposePatch("Move quantum plumbing to the top.", { kind: "move_section_to_top", target: "quantum plumbing" }, spec, graph);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain("quantum plumbing");
  });

  test("approval gate: no explicit approval, no approval", () => {
    const drafted = proposePatch("Move emergency plumbing to the top.", { kind: "move_section_to_top", target: "emergency plumbing" }, spec, graph);
    expect(drafted.ok).toBe(true);
    if (!drafted.ok) return;
    expect(approveProposal(drafted.proposal, null).ok).toBe(false);
    expect(approveProposal(drafted.proposal, undefined).ok).toBe(false);
    const noWho = approveProposal(drafted.proposal, { approvedBy: "", approvedAt: APPROVED_AT });
    expect(noWho.ok).toBe(false);
    if (!noWho.ok) expect(noWho.reason).toContain("Explicit approval required");
  });

  test("approval gate: tampered proposal body fails id verification", () => {
    const drafted = proposePatch("Move emergency plumbing to the top.", { kind: "move_section_to_top", target: "emergency plumbing" }, spec, graph);
    expect(drafted.ok).toBe(true);
    if (!drafted.ok) return;
    const tampered = {
      ...drafted.proposal,
      patch: drafted.proposal.patch.map((op) =>
        op.op === "reorder_section" ? { ...op, after: [...op.after].reverse() } : op,
      ),
    };
    const out = approveProposal(tampered, { approvedBy: "owner", approvedAt: APPROVED_AT });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("tampered");
  });

  test("approval gate blocks unapproved apply", () => {
    const drafted = proposePatch("Move emergency plumbing to the top.", { kind: "move_section_to_top", target: "emergency plumbing" }, spec, graph);
    expect(drafted.ok).toBe(true);
    if (!drafted.ok) return;
    const state = emptyProposalsState(spec);
    const out = applyProposal(state, drafted.proposal, { appliedAt: () => APPLIED_AT });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("Approval gate");
  });

  test("full loop: approve -> apply -> emergency section first, transition appended", () => {
    const drafted = proposePatch("Move emergency plumbing to the top.", { kind: "move_section_to_top", target: "emergency plumbing" }, spec, graph);
    expect(drafted.ok).toBe(true);
    if (!drafted.ok) return;
    const approved = approveProposal(drafted.proposal, { approvedBy: "owner", approvedAt: APPROVED_AT });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.proposal.status).toBe("approved");

    const state = emptyProposalsState(spec);
    const applied = applyProposal(state, approved.proposal, { appliedAt: () => APPLIED_AT });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;

    // The applied spec has the emergency section first.
    const home = applied.state.spec.pages.find((p) => p.slug === "home");
    expect(home!.sections[0].id).toBe("home:Services:2");
    expect(home!.sections[0].component).toBe("Services");

    // The transition record is appended (canonical, append-only).
    expect(applied.state.transitions).toHaveLength(1);
    const t = applied.state.transitions[0];
    expect(t.kind).toBe("proposals.spec-transition@1");
    expect(t.transitionId).toMatch(/^st-[0-9a-f]{64}$/);
    expect(t.proposalId).toBe(drafted.proposal.id);
    expect(t.beforeDigest).toBe(drafted.proposal.beforeDigest);
    expect(t.afterDigest).toBe(drafted.proposal.afterDigest);
    expect(t.approvedBy).toBe("owner");
    expect(t.approvedAt).toBe(APPROVED_AT);
    expect(t.appliedAt).toBe(APPLIED_AT);
    expect(t.opCount).toBe(1);

    // The presentation override is recorded for regeneration.
    expect(applied.state.overrides).toHaveLength(1);
    const ov = applied.state.overrides[0];
    expect(ov.kind).toBe("section_order");
    if (ov.kind === "section_order") {
      expect(ov.pageSlug).toBe("home");
      expect(ov.sectionIds[0]).toBe("home:Services:2");
    }

    // The applied proposal carries its new status.
    expect(applied.proposal.status).toBe("applied");
    expect(applied.state.appliedProposalIds).toContain(drafted.proposal.id);

    // Re-applying is an idempotent no-op.
    const again = applyProposal(applied.state, applied.proposal, { appliedAt: () => APPLIED_AT });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.alreadyApplied).toBe(true);
    expect(again.state.transitions).toHaveLength(1);
  });

  test("stale proposal (drafted against a different spec) is refused", () => {
    const drafted = proposePatch("Move emergency plumbing to the top.", { kind: "move_section_to_top", target: "emergency plumbing" }, spec, graph);
    expect(drafted.ok).toBe(true);
    if (!drafted.ok) return;
    const approved = approveProposal(drafted.proposal, { approvedBy: "owner", approvedAt: APPROVED_AT });
    if (!approved.ok) return;
    // Apply a different proposal first so the spec moves on.
    const hide = proposePatch("Hide the team section.", { kind: "hide_section", target: "team" }, spec, graph);
    expect(hide.ok).toBe(true);
    if (!hide.ok) return;
    const hideApproved = approveProposal(hide.proposal, { approvedBy: "owner", approvedAt: APPROVED_AT });
    if (!hideApproved.ok) return;
    let state = emptyProposalsState(spec);
    const first = applyProposal(state, hideApproved.proposal, { appliedAt: () => APPLIED_AT });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = first.state;
    // The move proposal was drafted against the pre-hide spec: stale.
    const stale = applyProposal(state, approved.proposal, { appliedAt: () => APPLIED_AT });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.reason).toContain("Stale proposal");
  });

  test("hide_section compiles and applies: the team section hides", () => {
    const drafted = proposePatch("Hide the team section.", { kind: "hide_section", target: "team" }, spec, graph);
    expect(drafted.ok).toBe(true);
    if (!drafted.ok) return;
    const op = drafted.proposal.patch[0];
    expect(op.op).toBe("set_visibility");
    if (op.op !== "set_visibility") return;
    expect(op.after).toBe(true);
    const approved = approveProposal(drafted.proposal, { approvedBy: "owner", approvedAt: APPROVED_AT });
    if (!approved.ok) return;
    const applied = applyProposal(emptyProposalsState(spec), approved.proposal, { appliedAt: () => APPLIED_AT });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const home = applied.state.spec.pages.find((p) => p.slug === "home");
    const people = home!.sections.find((s) => s.component === "People");
    expect(people!.presentation.hidden).toBe(true);
    // Hiding an already-hidden section is an honest no-op refusal.
    const again = proposePatch("Hide the team section.", { kind: "hide_section", target: "team" }, applied.state.spec, graph);
    expect(again.ok).toBe(false);
  });

  test("validatePatch catches a tampered before value", () => {
    const drafted = proposePatch("Hide the team section.", { kind: "hide_section", target: "team" }, spec, graph);
    expect(drafted.ok).toBe(true);
    if (!drafted.ok) return;
    const tampered = drafted.proposal.patch.map((op) =>
      op.op === "set_visibility" ? { ...op, before: true } : op,
    );
    const violations = validatePatch(spec, tampered, graph);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toContain("stale");
  });

  test("re-render: the applied spec renders differently, and deterministically", () => {
    const drafted = proposePatch("Move emergency plumbing to the top.", { kind: "move_section_to_top", target: "emergency plumbing" }, spec, graph);
    if (!drafted.ok) return;
    const approved = approveProposal(drafted.proposal, { approvedBy: "owner", approvedAt: APPROVED_AT });
    if (!approved.ok) return;
    const applied = applyProposal(emptyProposalsState(spec), approved.proposal, { appliedAt: () => APPLIED_AT });
    if (!applied.ok) return;

    const before = renderSpecDigest(spec, graph);
    const after = renderSpecDigest(applied.state.spec, graph);
    // The reorder changed the render: the Services section leads the home page.
    expect(after.digest).not.toBe(before.digest);
    expect(after.model.pages.find((p) => p.slug === "home")!.sections[0].component).toBe("Services");
    // Re-rendering is byte-identical.
    const again = renderSpecDigest(applied.state.spec, graph);
    expect(again.canonical).toBe(after.canonical);
    expect(again.digest).toBe(after.digest);
  });
});
