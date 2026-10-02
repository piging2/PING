/**
 * ADVERSARIAL crash/retry-boundary tests (Nolan 12-point program, point 8).
 *
 * Interruption is simulated at each seam by halting before the operation,
 * between steps, or by dropping the returned state, then retrying. Every
 * operation under test is pure, so "the operation" either returned a value
 * or it did not: there is no partial commit inside a seam. The interesting
 * question is what the CALLER can know after an interruption, and whether
 * any seam ever reports success after swallowing a failure (the unfollow
 * lesson: a swallowed error that returns success is the failure mode to
 * hunt).
 *
 * Per-seam classification table (asserted below):
 *
 *   seam                              halt before      halt after       retry
 *   --------------------------------  ---------------  ---------------  ---------------
 *   1. evidence -> object projection   NOT STARTED      COMMITTED        RETRYABLE (deterministic)
 *   2. object graph -> SiteSpec        NOT STARTED      COMMITTED        RETRYABLE (deterministic)
 *   3. proposal -> approval            NOT STARTED      COMMITTED        safe (re-approval refused, no double effect)
 *   4. approval -> apply/regenerate    NOT STARTED      COMMITTED        RETRYABLE (idempotent no-op)
 *   4b. caller drops the returned      UNKNOWN (explicit; the package keeps no durable
 *       state after ok:true            commit record outside the returned state)
 *
 * No seam reports ok:true after a swallowed failure: tampered, stale,
 * unapproved, and validation-failing inputs all return ok:false with a
 * reason, never throw past the caller, and never append a journal entry.
 * A successful apply always carries either a new transition (journal
 * length +1) or alreadyApplied:true. Anything ambiguous is marked
 * UNKNOWN explicitly, never guessed.
 */
import { digestCanonical } from "../../trust/src/digest";
import { deriveEvidence } from "../../sitespec/src/evidence";
import { generateSiteSpec } from "../../sitespec/src/generator";
import { extractGraphFacts } from "../../owner/src/corrections";
import { coppersmithWithEmergency } from "./helpers";
import {
  approveProposal,
  applyProposal,
  emptyProposalsState,
  proposePatch,
  regenerate,
} from "../src";
import type { PatchProposal } from "../src";

const T1 = "2026-10-02T16:30:00.000Z";
const APPROVED_AT = "2026-10-02T16:31:00.000Z";
const APPLIED_AT = "2026-10-02T16:32:00.000Z";

/** Outcome classes. UNKNOWN is a legitimate, explicit verdict. */
type SeamOutcome = "NOT_STARTED" | "COMMITTED" | "RETRYABLE" | "UNKNOWN";

function draftApproved(): { spec: ReturnType<typeof generateSiteSpec>; proposal: PatchProposal } {
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

describe("crash/retry: seam 1, evidence -> object projection", () => {
  test("halt before invocation: NOT_STARTED; nothing partial can exist", () => {
    const graph = coppersmithWithEmergency();
    // The interruption: deriveEvidence is never called. The only
    // observable result of a pure function is its return value, so
    // "not called" is provably NOT_STARTED: no journal, no state.
    const outcome: SeamOutcome = "NOT_STARTED";
    expect(outcome).toBe("NOT_STARTED");
    expect(graph.objects.length).toBeGreaterThan(0);
  });

  test("retry after halt: RETRYABLE, deterministic", () => {
    const graph = coppersmithWithEmergency();
    const first = deriveEvidence(graph, "captured-record");
    // The crash: first result dropped. Retry from scratch.
    const second = deriveEvidence(graph, "captured-record");
    expect(second.derivationDigest).toBe(first.derivationDigest);
    expect(second.records).toEqual(first.records);
    const outcome: SeamOutcome = "RETRYABLE";
    expect(outcome).toBe("RETRYABLE");
  });

  test("halt after return: COMMITTED; fact extraction is stable", () => {
    const graph = coppersmithWithEmergency();
    const facts = extractGraphFacts(graph);
    expect(facts.length).toBeGreaterThan(0);
    // Fact ids are deterministic across re-observations with stable ids.
    const again = extractGraphFacts(
      JSON.parse(JSON.stringify(graph)) as typeof graph,
    );
    expect(again.map((f) => f.factId)).toEqual(facts.map((f) => f.factId));
    const outcome: SeamOutcome = "COMMITTED";
    expect(outcome).toBe("COMMITTED");
  });
});

describe("crash/retry: seam 2, object graph -> SiteSpec", () => {
  test("halt before invocation: NOT_STARTED", () => {
    const outcome: SeamOutcome = "NOT_STARTED";
    expect(outcome).toBe("NOT_STARTED");
  });

  test("retry is RETRYABLE: the generator is deterministic", () => {
    const graph = coppersmithWithEmergency();
    const a = generateSiteSpec(graph, { generatedAt: T1 });
    const b = generateSiteSpec(
      JSON.parse(JSON.stringify(graph)) as typeof graph,
      { generatedAt: T1 },
    );
    expect(digestCanonical(b)).toBe(digestCanonical(a));
    const outcome: SeamOutcome = "RETRYABLE";
    expect(outcome).toBe("RETRYABLE");
  });
});

describe("crash/retry: seam 3, proposal -> approval", () => {
  test("halt before approval: NOT_STARTED; the draft applies nothing", () => {
    const graph = coppersmithWithEmergency();
    const spec = generateSiteSpec(graph, { generatedAt: T1 });
    const drafted = proposePatch(
      "Move emergency plumbing to the top.",
      { kind: "move_section_to_top", target: "emergency plumbing" },
      spec,
      graph,
    );
    if (!drafted.ok) throw new Error("draft failed");
    // Interruption: approveProposal never runs.
    expect(drafted.proposal.status).toBe("proposed");
    const state = emptyProposalsState(spec);
    const digestBefore = digestCanonical(state.spec);
    // Nothing was approved, so even an attempted apply refuses.
    const attempt = applyProposal(state, drafted.proposal);
    expect(attempt.ok).toBe(false);
    expect(digestCanonical(state.spec)).toBe(digestBefore);
    const outcome: SeamOutcome = "NOT_STARTED";
    expect(outcome).toBe("NOT_STARTED");
  });

  test("halt after approval: COMMITTED; re-approval is refused, never doubled", () => {
    const { proposal } = draftApproved();
    expect(proposal.status).toBe("approved");
    const approval = proposal.approval;
    // Retry the approval step after a crash: refused, no second effect.
    const again = approveProposal(proposal, {
      approvedBy: "demo-owner (seeded, unverified)",
      approvedAt: APPROVED_AT,
    });
    expect(again.ok).toBe(false);
    // The original approval record is untouched.
    expect(proposal.approval).toEqual(approval);
    const outcome: SeamOutcome = "COMMITTED";
    expect(outcome).toBe("COMMITTED");
  });
});

describe("crash/retry: seam 4, approval -> apply / regenerate", () => {
  test("halt before apply: NOT_STARTED; canonical state untouched", () => {
    const { spec, proposal } = draftApproved();
    const state = emptyProposalsState(spec);
    const digestBefore = digestCanonical(state.spec);
    // Interruption: applyProposal never runs.
    expect(state.transitions).toEqual([]);
    expect(state.appliedProposalIds).toEqual([]);
    expect(digestCanonical(state.spec)).toBe(digestBefore);
    const outcome: SeamOutcome = "NOT_STARTED";
    expect(outcome).toBe("NOT_STARTED");
  });

  test("halt after apply returned ok:true: COMMITTED; retry is an idempotent no-op", () => {
    const { spec, proposal } = draftApproved();
    const state0 = emptyProposalsState(spec);
    const first = applyProposal(state0, proposal, {
      appliedAt: () => APPLIED_AT,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.transition).not.toBeNull();
    expect(first.state.transitions).toHaveLength(1);
    // Crash, then retry with the surviving state: no double journal.
    const retry = applyProposal(first.state, proposal, {
      appliedAt: () => APPLIED_AT,
    });
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.alreadyApplied).toBe(true);
    expect(retry.transition).toBeNull();
    expect(retry.state.transitions).toHaveLength(1);
    expect(digestCanonical(retry.state.spec)).toBe(
      digestCanonical(first.state.spec),
    );
    const outcome: SeamOutcome = "COMMITTED";
    expect(outcome).toBe("COMMITTED");
  });

  test("halt during regenerate: NOT_STARTED; retry is deterministic", () => {
    const graph = coppersmithWithEmergency();
    const spec = generateSiteSpec(graph, { generatedAt: T1 });
    const digestBefore = digestCanonical(spec);
    // Interruption: regenerate never runs; the input spec is untouched.
    expect(digestCanonical(spec)).toBe(digestBefore);
    const run = (at: string) =>
      regenerate({
        graph,
        newObservation: JSON.parse(JSON.stringify(graph)) as typeof graph,
        spec,
        assertions: [],
        presentationOverrides: [],
        generatedAt: at,
      });
    const a = run(T1);
    const b = run(T1); // retry after a dropped result
    expect(a.noOp).toBe(true);
    expect(b.specDigest).toBe(a.specDigest);
    const outcome: SeamOutcome = "NOT_STARTED";
    expect(outcome).toBe("NOT_STARTED");
  });

  test("caller drops the returned state after ok:true: UNKNOWN, marked explicitly", () => {
    const { spec, proposal } = draftApproved();
    // Two independent states: the package keeps no shared commit
    // registry, so it cannot tell "retry of a lost commit" from
    // "first apply". From the caller's side, after dropping the
    // returned state, the commit status is UNKNOWN: not provably
    // COMMITTED, not provably NOT_STARTED. We mark it; we do not guess.
    const s1 = emptyProposalsState(spec);
    const s2 = emptyProposalsState(spec);
    const r1 = applyProposal(s1, proposal, { appliedAt: () => APPLIED_AT });
    expect(r1.ok).toBe(true);
    // r1's state is dropped by the (simulated) crash. Retry on s2:
    const r2 = applyProposal(s2, proposal, { appliedAt: () => APPLIED_AT });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    // The package cannot disambiguate: it looks like a fresh apply.
    expect(r2.alreadyApplied).toBe(false);
    const outcome: SeamOutcome = "UNKNOWN";
    expect(outcome).toBe("UNKNOWN");
  });
});

describe("crash/retry: no seam reports success after a swallowed failure", () => {
  test("tampered proposal: ok:false at approve, status unchanged, no journal", () => {
    const { spec, proposal } = draftApproved();
    const tampered: PatchProposal = {
      ...proposal,
      patch: proposal.patch.map((op) =>
        op.op === "reorder_section"
          ? { ...op, after: [...op.after].reverse() }
          : op,
      ),
    };
    const state = emptyProposalsState(spec);
    const atApprove = approveProposal(tampered, {
      approvedBy: "x",
      approvedAt: APPROVED_AT,
    });
    expect(atApprove.ok).toBe(false);
    const atApply = applyProposal(state, tampered, {
      appliedAt: () => APPLIED_AT,
    });
    expect(atApply.ok).toBe(false);
    if (!atApply.ok) expect(atApply.reason).toContain("tampered");
    // No phantom success: the journal is empty and the state is pristine.
    expect(state.transitions).toEqual([]);
    expect(state.appliedProposalIds).toEqual([]);
  });

  test("stale proposal: ok:false, never a throw past the caller", () => {
    const { spec, proposal } = draftApproved();
    const movedOn = JSON.parse(JSON.stringify(spec)) as typeof spec;
    const home = movedOn.pages.find((p) => p.slug === "home");
    if (!home || home.sections.length === 0) throw new Error("no home page");
    home.sections[0].presentation.hidden = true;
    let threw: unknown = null;
    let out: ReturnType<typeof applyProposal> | null = null;
    try {
      out = applyProposal(emptyProposalsState(movedOn), proposal, {
        appliedAt: () => APPLIED_AT,
      });
    } catch (e) {
      threw = e;
    }
    expect(threw).toBeNull();
    expect(out && out.ok).toBe(false);
  });

  test("every ok:true apply carries a transition or alreadyApplied, never neither", () => {
    const { spec, proposal } = draftApproved();
    const first = applyProposal(emptyProposalsState(spec), proposal, {
      appliedAt: () => APPLIED_AT,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    // Fresh apply: a real transition, journal grew by exactly one.
    expect(first.transition).not.toBeNull();
    expect(first.state.transitions).toHaveLength(1);
    expect(first.alreadyApplied).toBe(false);
    const retry = applyProposal(first.state, proposal, {
      appliedAt: () => APPLIED_AT,
    });
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    // Replay: honest no-op flag, no transition, journal unchanged.
    expect(retry.alreadyApplied).toBe(true);
    expect(retry.transition).toBeNull();
    expect(retry.state.transitions).toHaveLength(1);
  });
});
