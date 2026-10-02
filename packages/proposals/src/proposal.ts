/**
 * The proposal lifecycle: drafted -> approved -> applied.
 *
 * Approval is a REAL GATE, not a flag:
 *   - approveProposal refuses when the proposal is not in "proposed"
 *     status, when no explicit approval is supplied, or when the
 *     proposal id does not recompute (tampered body).
 *   - applyProposal refuses when the proposal is not approved, when the
 *     id does not recompute, when the proposal was drafted against a
 *     different spec (stale beforeDigest), or when the patch fails
 *     validation. Applying appends a canonical transition record to the
 *     append-only journal and derives presentation overrides from the
 *     ops, so regeneration (./regenerate.ts) can preserve them.
 *
 * Pure: every function returns new values, never mutates inputs.
 */

import { digestCanonical } from "../../trust/src/digest";
import { deepClone } from "./clone";
import type { FYDSiteSpec } from "../../sitespec/src/types";
import { proposalIdOf, validatePatch } from "./compiler";
import { applyPatchToSpec } from "./apply";
import type {
  ApplyOutcome,
  ApproveOutcome,
  PatchProposal,
  PresentationOverride,
  ProposalApproval,
  ProposalsState,
  SiteSpecPatchOp,
  SpecTransition,
} from "./types";

/** A fresh, empty owner layer over a generated spec. */
export function emptyProposalsState(spec: FYDSiteSpec): ProposalsState {
  return {
    spec: deepClone(spec) as FYDSiteSpec,
    overrides: [],
    transitions: [],
    appliedProposalIds: [],
  };
}

function recomputedId(p: PatchProposal): string {
  return proposalIdOf(p.commandText, p.intent, p.patch, p.beforeDigest, p.preview);
}

/**
 * Approve a drafted proposal. The approval must be explicit: a missing
 * approval, or an approval without an approver identity, is a refusal.
 * The proposal id is recomputed so a tampered body can never be
 * approved.
 */
export function approveProposal(
  proposal: PatchProposal,
  approval: ProposalApproval | null | undefined,
): ApproveOutcome {
  if (proposal.status !== "proposed") {
    return {
      ok: false,
      reason:
        "Proposal " + proposal.id + " is '" + proposal.status + "', not proposed; only proposed drafts can be approved.",
    };
  }
  if (!approval || approval.approvedBy.trim() === "" || approval.approvedAt.trim() === "") {
    return {
      ok: false,
      reason:
        "Explicit approval required: proposals are never auto-approved. Supply { approvedBy, approvedAt }.",
    };
  }
  if (recomputedId(proposal) !== proposal.id) {
    return {
      ok: false,
      reason:
        "Proposal body does not verify against its id; it may have been tampered with. Refusing to approve.",
    };
  }
  return {
    ok: true,
    proposal: { ...proposal, status: "approved", approval },
  };
}

/**
 * Derive the presentation overrides an applied patch establishes.
 * Overrides are ABSOLUTE (the full desired state), so re-applying them
 * after regeneration is idempotent.
 */
export function deriveOverrides(ops: SiteSpecPatchOp[]): PresentationOverride[] {
  const out: PresentationOverride[] = [];
  for (const op of ops) {
    if (op.op === "reorder_section") {
      out.push({ kind: "section_order", pageSlug: op.pageSlug, sectionIds: [...op.after] });
    } else if (op.op === "set_visibility") {
      out.push({
        kind: "section_visibility",
        pageSlug: op.pageSlug,
        sectionId: op.sectionId,
        hidden: op.after,
      });
    } else if (op.op === "set_component_option") {
      if (op.option === "objectOrder" && Array.isArray(op.after)) {
        out.push({
          kind: "object_order",
          pageSlug: op.pageSlug,
          sectionId: op.sectionId,
          objectIds: [...(op.after as string[])],
        });
      } else {
        out.push({
          kind: "component_option",
          pageSlug: op.pageSlug,
          sectionId: op.sectionId,
          option: op.option,
          value: deepClone(op.after),
        });
      }
    }
  }
  return out;
}

/**
 * Apply presentation overrides to a spec. Pure. Unknown pages/sections
 * are ignored (an override may outlive a section the source removed);
 * section_order lists the full desired order for known ids and appends
 * any unlisted sections in their current order.
 */
export function applyOverrides(
  spec: FYDSiteSpec,
  overrides: PresentationOverride[],
): { spec: FYDSiteSpec; reapplied: number } {
  const next = deepClone(spec) as FYDSiteSpec;
  let reapplied = 0;
  for (const o of overrides) {
    const page = next.pages.find((p) => p.slug === o.pageSlug);
    if (!page) continue;
    if (o.kind === "section_order") {
      const byId = new Map(page.sections.map((s) => [s.id, s] as const));
      const listed = o.sectionIds.filter((id) => byId.has(id));
      const unlisted = page.sections.filter((s) => !o.sectionIds.includes(s.id));
      page.sections = [...listed.map((id) => byId.get(id) as (typeof page.sections)[number]), ...unlisted];
      reapplied++;
      continue;
    }
    const section = page.sections.find((s) => s.id === o.sectionId);
    if (!section) continue;
    if (o.kind === "section_visibility") {
      section.presentation.hidden = o.hidden;
      reapplied++;
    } else if (o.kind === "object_order") {
      section.presentation.objectOrder = [...o.objectIds];
      reapplied++;
    } else {
      (section.presentation as Record<string, unknown>)[o.option] = JSON.parse(
        JSON.stringify(o.value),
      );
      reapplied++;
    }
  }
  return { spec: next, reapplied };
}

/**
 * The deterministic commit marker for a proposal: "st-" + digestCanonical
 * over (proposalId, beforeDigest, afterDigest). Stable across restores, so
 * a persisted journal can recognize a retried commit without trusting an
 * in-memory applied-set. Exported for hosts that persist transitions.
 */
export function transitionIdFor(proposal: PatchProposal): string {
  return (
    "st-" +
    digestCanonical({
      proposalId: proposal.id,
      beforeDigest: proposal.beforeDigest,
      afterDigest: proposal.afterDigest,
    })
  );
}

function transitionFor(
  proposal: PatchProposal,
  appliedAt: string,
): SpecTransition {
  return {
    kind: "proposals.spec-transition@1",
    transitionId: transitionIdFor(proposal),
    proposalId: proposal.id,
    beforeDigest: proposal.beforeDigest,
    afterDigest: proposal.afterDigest,
    opCount: proposal.patch.length,
    opsDigest: digestCanonical(proposal.patch),
    approvedBy: proposal.approval?.approvedBy ?? "",
    approvedAt: proposal.approval?.approvedAt ?? "",
    appliedAt,
  };
}

export interface ApplyOptions {
  /** Injectable clock; tests pin it. */
  appliedAt?: () => string;
  /**
   * The current object graph, when the host tracks one. Supplied, the
   * patch is re-validated against it at effect time, so object ids the
   * patch references (featuredIds / objectOrder / hiddenObjectIds) that
   * vanished after the preview are refused instead of applied dangling.
   * Absent, graph drift is invisible to the package (legacy behavior).
   */
  graph?: import("../../sitespec/src/types").ObjectGraph;
}

/**
 * Apply an approved proposal to the owner layer state. Pure: returns a
 * new state, never mutates inputs. Refuses (never partially applies)
 * when the proposal is not approved, is tampered, is stale, or fails
 * validation. Re-applying an applied proposal is an idempotent no-op,
 * recognized two ways: the applied-set, or the deterministic transition
 * id already present in the journal (so a partial restore after a crash
 * can never double-apply).
 */
export function applyProposal(
  state: ProposalsState,
  proposal: PatchProposal,
  opts: ApplyOptions = {},
): ApplyOutcome {
  if (state.appliedProposalIds.includes(proposal.id)) {
    // Idempotent re-apply: the journal already records this proposal.
    // Checked before the status gate so replaying an applied proposal is
    // a no-op rather than a refusal.
    return {
      ok: true,
      state,
      proposal: { ...proposal, status: "applied" },
      transition: null,
      alreadyApplied: true,
      summary: "already applied (idempotent no-op)",
    };
  }
  if (state.transitions.some((t) => t.transitionId === transitionIdFor(proposal))) {
    // The journal records this deterministic commit even though the
    // applied-set does not (partial restore after a crash). Re-applying
    // would append a second transition with the same transition id: the
    // effect is already committed, so this is an idempotent no-op.
    return {
      ok: true,
      state,
      proposal: { ...proposal, status: "applied" },
      transition: null,
      alreadyApplied: true,
      summary: "already applied (journal holds the deterministic commit)",
    };
  }
  if (proposal.status !== "approved" || !proposal.approval) {
    return {
      ok: false,
      reason:
        "Approval gate: refusing to apply proposal " + proposal.id + " with status '" +
        proposal.status + "'. Only explicitly approved proposals apply.",
    };
  }
  if (recomputedId(proposal) !== proposal.id) {
    return {
      ok: false,
      reason:
        "Proposal body does not verify against its id; it may have been tampered with. Refusing to apply.",
    };
  }
  if (digestCanonical(state.spec) !== proposal.beforeDigest) {
    return {
      ok: false,
      reason:
        "Stale proposal: it was drafted against a different spec version (beforeDigest mismatch). Re-draft against the current spec.",
    };
  }
  // Re-validate against the live graph when the host supplies one:
  // object ids the patch references may have vanished after the owner
  // reviewed the preview (proposal TOCTOU). A dangling reference is
  // never applied.
  const violations = validatePatch(state.spec, proposal.patch, opts.graph);
  if (violations.length > 0) {
    return {
      ok: false,
      reason: "Patch failed validation: " + violations.join(" "),
    };
  }
  const nextSpec = applyPatchToSpec(state.spec, proposal.patch);
  if (digestCanonical(nextSpec) !== proposal.afterDigest) {
    return {
      ok: false,
      reason:
        "Implementation drift: the applied spec digest does not match the approved afterDigest. Refusing to record the transition.",
    };
  }
  const appliedAt = opts.appliedAt ? opts.appliedAt() : new Date().toISOString();
  const transition = transitionFor(proposal, appliedAt);
  const overrides = deriveOverrides(proposal.patch);
  return {
    ok: true,
    state: {
      spec: nextSpec,
      overrides: [...state.overrides, ...overrides],
      transitions: [...state.transitions, transition],
      appliedProposalIds: [...state.appliedProposalIds, proposal.id],
    },
    proposal: { ...proposal, status: "applied" },
    transition,
    alreadyApplied: false,
    summary:
      "applied " + proposal.patch.length + " op(s): " + proposal.preview.title,
  };
}
