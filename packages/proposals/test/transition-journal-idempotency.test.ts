/**
 * ADVERSARIAL (Worker E, hunt 1): the double-apply guard and the journal
 * can disagree.
 *
 * applyProposal's idempotency guard reads state.appliedProposalIds, but
 * the durable commit evidence is state.transitions (the append-only
 * journal). If the commit marker is lost while the journal survives (a
 * partial state restore after a crash), a retry re-applies and the journal
 * grows a SECOND transition with the SAME deterministic transitionId: a
 * double-apply the idempotency guard was supposed to prevent.
 *
 * The transition id is deterministic over (proposalId, beforeDigest,
 * afterDigest), so it is the stable commit marker across restores.
 */
import { generateSiteSpec } from "../../sitespec/src/generator";
import { coppersmithWithEmergency } from "./helpers";
import {
  applyProposal,
  approveProposal,
  emptyProposalsState,
  proposePatch,
  transitionIdFor,
  type ProposalsState,
} from "../src";

const T1 = "2026-10-02T16:30:00.000Z";
const APPROVED_AT = "2026-10-02T16:31:00.000Z";
const APPLIED_AT = "2026-10-02T16:32:00.000Z";

function draftApproved() {
  const graph = coppersmithWithEmergency();
  const spec = generateSiteSpec(graph, { generatedAt: T1 });
  const drafted = proposePatch(
    "Move emergency plumbing to the top.",
    { kind: "move_section_to_top", target: "emergency plumbing" },
    spec,
    graph,
  );
  if (!drafted.ok) throw new Error("draft failed: " + drafted.reason);
  const approved = approveProposal(drafted.proposal, {
    approvedBy: "demo-owner (seeded, unverified)",
    approvedAt: APPROVED_AT,
  });
  if (!approved.ok) throw new Error("approve failed: " + approved.reason);
  return { spec, proposal: approved.proposal };
}

describe("transition-id idempotency: journal and guard must agree", () => {
  test("transitionIdFor is deterministic: same proposal -> same commit marker", () => {
    const { proposal } = draftApproved();
    expect(transitionIdFor(proposal)).toBe(transitionIdFor(proposal));
    expect(transitionIdFor(proposal)).toMatch(/^st-[0-9a-f]{64}$/);
  });

  test("partial restore (journal survived, commit marker lost): retry must not double-apply", () => {
    const { spec, proposal } = draftApproved();
    const state0 = emptyProposalsState(spec);
    const first = applyProposal(state0, proposal, {
      appliedAt: () => APPLIED_AT,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.state.transitions).toHaveLength(1);
    const commitId = transitionIdFor(proposal);
    expect(first.state.transitions[0].transitionId).toBe(commitId);

    // The crash: the journal (transitions) was persisted, but the
    // appliedProposalIds commit marker was lost. The host restores a
    // state where the effect is recorded in the journal only.
    const restored: ProposalsState = {
      ...state0,
      transitions: first.state.transitions,
    };
    expect(restored.appliedProposalIds).toEqual([]);

    const retry = applyProposal(restored, proposal, {
      appliedAt: () => APPLIED_AT,
    });
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    // The journal already records this deterministic commit: no-op.
    expect(retry.alreadyApplied).toBe(true);
    expect(retry.transition).toBeNull();
    expect(retry.state.transitions).toHaveLength(1);
    const ids = retry.state.transitions.map((t) => t.transitionId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
