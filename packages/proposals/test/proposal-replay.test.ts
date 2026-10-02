/**
 * ADVERSARIAL (Worker E, hunt 9): replay from canonical history.
 *
 * The canonical history is the ordered transition journal
 * (state.transitions) plus the approved proposals. Replay = start from
 * the initial spec, re-apply the same approved proposals in journal
 * order, and compare the semantic digest: final spec digest, transition
 * ids, and derived overrides must all match. appliedAt is wall-clock by
 * default, so tests pin it; transition ids exclude appliedAt, so the
 * commit identity is stable across replays.
 */
import { digestCanonical } from "../../trust/src/digest";
import { generateSiteSpec } from "../../sitespec/src/generator";
import type { FYDSiteSpec } from "../../sitespec/src/types";
import type { ObjectGraph } from "../../sitespec/src/types";
import { coppersmithWithEmergency } from "./helpers";
import {
  applyProposal,
  approveProposal,
  emptyProposalsState,
  proposePatch,
} from "../src";
import type { PatchProposal, ProposalsState } from "../src";

const T1 = "2026-10-02T16:30:00.000Z";
const GRAPH: ObjectGraph = coppersmithWithEmergency();

const PLANS = [
  ["Move emergency plumbing to the top.", { kind: "move_section_to_top", target: "emergency plumbing" }],
  ["Hide the links section.", { kind: "hide_section", target: "Links" }],
  ["Hide the people section.", { kind: "hide_section", target: "People" }],
] as const;

/** Draft each proposal against the CURRENT spec, approve, apply. */
function runOnce(): { initialSpec: FYDSiteSpec; proposals: PatchProposal[]; state: ProposalsState } {
  const initialSpec = generateSiteSpec(GRAPH, { generatedAt: T1 });
  let state = emptyProposalsState(initialSpec);
  const proposals: PatchProposal[] = [];
  PLANS.forEach(([text, intent], i) => {
    const drafted = proposePatch(text, intent as never, state.spec, GRAPH);
    if (!drafted.ok) throw new Error("draft failed: " + drafted.reason);
    const approved = approveProposal(drafted.proposal, {
      approvedBy: "demo-owner (seeded, unverified)",
      approvedAt: "2026-10-02T16:3" + i + ":00.000Z",
    });
    if (!approved.ok) throw new Error("approve failed: " + approved.reason);
    const applied = applyProposal(state, approved.proposal, {
      appliedAt: () => "2026-10-02T16:4" + i + ":00.000Z",
    });
    if (!applied.ok) throw new Error("apply failed: " + applied.reason);
    proposals.push(approved.proposal);
    state = applied.state;
  });
  return { initialSpec, proposals, state };
}

/** Replay: fresh state from the initial spec, re-apply the journal in order. */
function replay(initialSpec: FYDSiteSpec, proposals: PatchProposal[]): ProposalsState {
  let state = emptyProposalsState(initialSpec);
  proposals.forEach((p, i) => {
    const out = applyProposal(state, p, {
      appliedAt: () => "2026-10-02T16:5" + i + ":00.000Z",
    });
    if (!out.ok) throw new Error("replay apply failed: " + out.reason);
    state = out.state;
  });
  return state;
}

function semanticDigest(state: ProposalsState): string {
  return digestCanonical({
    spec: state.spec,
    transitions: state.transitions.map((t) => t.transitionId),
    overrides: state.overrides,
  });
}

describe("replay: rebuild from canonical history, compare semantic digest", () => {
  test("re-applying the journal in order reproduces the semantic digest", () => {
    const { initialSpec, proposals, state } = runOnce();
    expect(state.transitions).toHaveLength(3);

    const replayed = replay(initialSpec, proposals);
    expect(semanticDigest(replayed)).toBe(semanticDigest(state));
    expect(replayed.transitions.map((t) => t.transitionId)).toEqual(
      state.transitions.map((t) => t.transitionId),
    );
    expect(replayed.overrides).toEqual(state.overrides);
  });

  test("proposal ids are deterministic: re-drafting seals the same id", () => {
    const { proposals } = runOnce();
    const { proposals: again } = runOnce();
    expect(again.map((p) => p.id)).toEqual(proposals.map((p) => p.id));
  });

  test("replay must use journal order: out-of-order re-application is refused, not silently diverged", () => {
    const { initialSpec, proposals } = runOnce();
    // The proposals were drafted against successive spec versions; the
    // journal order is the only order that replays. Reversing it hits
    // the staleness gate: an honest refusal, never a silent divergence.
    let state = emptyProposalsState(initialSpec);
    const reversed = [...proposals].reverse();
    const out = applyProposal(state, reversed[0], {
      appliedAt: () => "2026-10-02T16:50:00.000Z",
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toContain("Stale proposal");
    }
    expect(state.transitions).toEqual([]);
  });
});
