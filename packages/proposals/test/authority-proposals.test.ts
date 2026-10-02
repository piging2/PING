/**
 * ADVERSARIAL authority-boundary tests (Nolan 12-point program, point 3, proposals lane).
 *
 * What this file proves:
 * - An agent can PROPOSE a typed SiteSpec patch but cannot APPROVE it:
 *   approval requires an explicit { approvedBy, approvedAt } record, and
 *   applyProposal refuses anything that is not explicitly approved. The
 *   canonical spec is never mutated by a bare proposal.
 * - A tampered proposal body (any bit changed after drafting) fails the
 *   deterministic id check and is rejected at approve AND at apply.
 * - A replayed proposal (same proposal submitted twice) does not
 *   double-apply: the second apply is an idempotent no-op keyed on the
 *   proposal id, with no second journal entry.
 * - A stale proposal (drafted against a different spec version) is
 *   refused at apply time via the beforeDigest check.
 * - Unauthorized mutation is rejected at the composed identity boundary:
 *   the caller verifies the owner identity BEFORE constructing an
 *   approval record; the demo context throws OwnerAuthorizationError, so
 *   no approval record (and therefore no application) can exist for it.
 *   Documented honestly: the pure approveProposal gate checks
 *   EXPLICITNESS (non-empty approver + timestamp), not identity; the
 *   identity binding is the caller's composition with the owner seam
 *   (packages/owner/src/identity.ts). There is no auto-approve path.
 *
 * DEMO_OWNER_LABEL is used explicitly as the approver label wherever a
 * legitimate approval is needed; nothing here fakes production auth.
 */
import { digestCanonical } from "../../trust/src/digest";
import { generateSiteSpec } from "../../sitespec/src/generator";
import {
  DemoIdentityProvider,
  OwnerAuthorizationError,
  requireVerifiedOwner,
} from "../../owner/src/identity";
import { DEMO_OWNER_LABEL } from "../../owner/src/provenance";
import { coppersmithWithEmergency } from "./helpers";
import {
  approveProposal,
  applyProposal,
  emptyProposalsState,
  proposePatch,
} from "../src";
import type { PatchProposal, ProposalApproval } from "../src";

const GENERATED_AT = "2026-10-02T16:10:00.000Z";
const APPROVED_AT = "2026-10-02T16:15:00.000Z";
const APPLIED_AT = "2026-10-02T16:16:00.000Z";

function draft() {
  const graph = coppersmithWithEmergency();
  const spec = generateSiteSpec(graph, { generatedAt: GENERATED_AT });
  const out = proposePatch(
    "Move emergency plumbing to the top.",
    { kind: "move_section_to_top", target: "emergency plumbing" },
    spec,
    graph,
  );
  if (!out.ok) throw new Error("fixture draft failed: " + out.reason);
  return { graph, spec, proposal: out.proposal };
}

/** An explicit approval carrying the DEMO label. Never production auth. */
function demoApproval(): ProposalApproval {
  return { approvedBy: DEMO_OWNER_LABEL, approvedAt: APPROVED_AT };
}

function approveGood(p: PatchProposal): PatchProposal {
  const out = approveProposal(p, demoApproval());
  if (!out.ok) throw new Error("fixture approval failed: " + out.reason);
  return out.proposal;
}

describe("authority: propose is not approve", () => {
  test("no explicit approval, no approval: null, undefined, empty approver, empty timestamp", () => {
    const { proposal } = draft();
    expect(approveProposal(proposal, null).ok).toBe(false);
    expect(approveProposal(proposal, undefined).ok).toBe(false);
    expect(
      approveProposal(proposal, { approvedBy: "", approvedAt: APPROVED_AT })
        .ok,
    ).toBe(false);
    expect(
      approveProposal(proposal, { approvedBy: "agent", approvedAt: "" }).ok,
    ).toBe(false);
    // The draft is untouched by the refusals.
    expect(proposal.status).toBe("proposed");
    expect(proposal.approval).toBeUndefined();
  });

  test("an unapproved proposal never mutates canonical state", () => {
    const { spec, proposal } = draft();
    const state = emptyProposalsState(spec);
    const digestBefore = digestCanonical(state.spec);
    const out = applyProposal(state, proposal);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("Approval gate");
    // Nothing moved: same digest, no journal entries, no applied ids.
    expect(digestCanonical(state.spec)).toBe(digestBefore);
    expect(state.transitions).toEqual([]);
    expect(state.appliedProposalIds).toEqual([]);
    expect(state.overrides).toEqual([]);
  });
});

describe("authority: tamper and replay", () => {
  test("a tampered proposal body is rejected at approve time", () => {
    const { proposal } = draft();
    const tampered: PatchProposal = {
      ...proposal,
      patch: proposal.patch.map((op) =>
        op.op === "reorder_section"
          ? { ...op, after: [...op.after].reverse() }
          : op,
      ),
    };
    const out = approveProposal(tampered, demoApproval());
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("tampered");
  });

  test("a tampered approved proposal is rejected at apply time", () => {
    const { spec, proposal } = draft();
    const approved = approveGood(proposal);
    const tampered: PatchProposal = {
      ...approved,
      patch: approved.patch.map((op) =>
        op.op === "reorder_section"
          ? { ...op, after: [...op.after].reverse() }
          : op,
      ),
    };
    const out = applyProposal(emptyProposalsState(spec), tampered, {
      appliedAt: () => APPLIED_AT,
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("tampered");
  });

  test("a replayed proposal does not double-apply", () => {
    const { spec, proposal } = draft();
    const approved = approveGood(proposal);
    const first = applyProposal(emptyProposalsState(spec), approved, {
      appliedAt: () => APPLIED_AT,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.alreadyApplied).toBe(false);
    expect(first.transition).not.toBeNull();
    expect(first.state.transitions).toHaveLength(1);
    expect(first.state.appliedProposalIds).toEqual([proposal.id]);
    const digestAfterFirst = digestCanonical(first.state.spec);

    // Replay: same proposal, same state. Idempotent no-op.
    const second = applyProposal(first.state, approved, {
      appliedAt: () => APPLIED_AT,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyApplied).toBe(true);
    expect(second.transition).toBeNull();
    expect(second.summary).toContain("already applied");
    // No second journal entry, no spec change, same state object back.
    expect(second.state.transitions).toHaveLength(1);
    expect(second.state.appliedProposalIds).toEqual([proposal.id]);
    expect(digestCanonical(second.state.spec)).toBe(digestAfterFirst);
  });
});

describe("authority: staleness", () => {
  test("a proposal drafted against an older spec version is refused at apply", () => {
    const { spec, proposal } = draft();
    const approved = approveGood(proposal);
    // The world moved on: a different spec (one section hidden) under
    // the same logical site.
    const movedOn = JSON.parse(JSON.stringify(spec)) as typeof spec;
    const home = movedOn.pages.find((p) => p.slug === "home");
    if (!home || home.sections.length === 0) {
      throw new Error("fixture has no home sections");
    }
    home.sections[0].presentation.hidden = true;
    const out = applyProposal(emptyProposalsState(movedOn), approved, {
      appliedAt: () => APPLIED_AT,
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("Stale proposal");
  });
});

describe("authority: the identity boundary is composed, and fails closed", () => {
  test("an unverified identity cannot produce an approval record", async () => {
    const { proposal } = draft();
    const identity = await new DemoIdentityProvider().resolveIdentity();
    // The composed boundary: verify identity BEFORE constructing the
    // approval. The demo context throws here, so no approval record
    // can ever exist for it.
    let thrown: unknown = null;
    try {
      requireVerifiedOwner(identity);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(OwnerAuthorizationError);
    // And without an approval, the draft cannot apply.
    const out = applyProposal(
      emptyProposalsState(generateSiteSpec(coppersmithWithEmergency(), {
        generatedAt: GENERATED_AT,
      })),
      proposal,
    );
    expect(out.ok).toBe(false);
  });

  test("documented boundary: the pure gate checks explicitness, not identity", () => {
    const { proposal } = draft();
    // A non-empty approver string passes the pure gate. This is honest
    // explicitness-only checking; production callers compose
    // requireVerifiedOwner (above) before reaching this function.
    // There is deliberately no auto-approve path to abuse instead.
    const out = approveProposal(proposal, {
      approvedBy: "mallory (unverified test label)",
      approvedAt: APPROVED_AT,
    });
    expect(out.ok).toBe(true);
  });

  test("approving an already-approved proposal is refused", () => {
    const { proposal } = draft();
    const approved = approveGood(proposal);
    const again = approveProposal(approved, demoApproval());
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toContain("not proposed");
  });
});
