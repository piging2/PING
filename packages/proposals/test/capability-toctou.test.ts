/**
 * ADVERSARIAL (Worker E, hunt 8): capability TOCTOU at the approval gate.
 *
 * The package's approval gate is a sealed record: once approveProposal
 * returns ok:true, applyProposal trusts the approval forever. If the
 * approver's capability is revoked between approval and effect (owner
 * role removed, session invalidated, demo context never verified), the
 * package has no point at which the host can re-evaluate authorization
 * at execution time: the stale approval still applies.
 *
 * The repair is a seam, not a policy: ApplyOptions.authorizeApproval is
 * the host's live authorization check, invoked at effect time. When the
 * host supplies it, a revoked capability refuses the apply; when absent,
 * the package keeps trusting the sealed approval record (the host
 * attests). The package never invents its own capability model.
 */
import { generateSiteSpec } from "../../sitespec/src/generator";
import { coppersmithWithEmergency } from "./helpers";
import {
  applyProposal,
  approveProposal,
  emptyProposalsState,
  proposePatch,
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

describe("capability TOCTOU: authorization is re-evaluated at effect time", () => {
  test("revoked capability: the live check refuses the apply", () => {
    const { spec, proposal } = draftApproved();
    // Between approval and effect the host revoked the approver's
    // capability. The live check now says no.
    let authorized = true;
    authorized = false;
    const out = applyProposal(emptyProposalsState(spec), proposal, {
      appliedAt: () => APPLIED_AT,
      authorizeApproval: () => authorized,
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toMatch(/authorization|revoked/i);
    }
  });

  test("live check still green: the apply proceeds", () => {
    const { spec, proposal } = draftApproved();
    const out = applyProposal(emptyProposalsState(spec), proposal, {
      appliedAt: () => APPLIED_AT,
      authorizeApproval: () => true,
    });
    expect(out.ok).toBe(true);
  });

  test("no live check supplied: sealed approval record is trusted (host attests)", () => {
    const { spec, proposal } = draftApproved();
    const out = applyProposal(emptyProposalsState(spec), proposal, {
      appliedAt: () => APPLIED_AT,
    });
    expect(out.ok).toBe(true);
  });

  test("a throwing authorizer becomes a refusal, never a throw past the caller", () => {
    const { spec, proposal } = draftApproved();
    let threw: unknown = null;
    let out: ReturnType<typeof applyProposal> | null = null;
    try {
      out = applyProposal(emptyProposalsState(spec), proposal, {
        appliedAt: () => APPLIED_AT,
        authorizeApproval: () => {
          throw new Error("auth service down");
        },
      });
    } catch (e) {
      threw = e;
    }
    expect(threw).toBeNull();
    expect(out && out.ok).toBe(false);
  });
});
