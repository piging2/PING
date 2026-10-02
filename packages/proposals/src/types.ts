/**
 * @piging2/proposals: conversational customization + regeneration.
 *
 * PROOF 7: a planned owner intent (structured input; the LLM plans, this
 * package never calls one) compiles to a TYPED SiteSpec patch proposal
 * with a before/after preview. Approval is a real gate: only an approved
 * proposal applies, and applying appends a canonical transition record to
 * an append-only journal. No direct filesystem mutation anywhere in this
 * path: everything is pure data in, pure data out.
 *
 * PROOF 8: regeneration over a fresh observation. Evidence diff (new vs
 * old evidence records) -> affected object ids -> affected SiteSpec paths
 * -> the generator re-runs for affected pages only -> owner assertions
 * (CORRECT/CONFIRM/HIDE) re-apply -> presentation overrides re-apply ->
 * a new SiteSpec version. Corrections and overrides survive regeneration
 * by construction; a changeless observation is a byte-identical no-op.
 *
 * HARVEST (adapted + new).
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f8347
 *   - src/fyd/customize/owner-command-compiler.ts (intent vocabulary and
 *     section/object resolution semantics)
 *   - src/fyd/customize/owner-proposal.ts (draft -> approve -> apply ->
 *     replay lifecycle, digest-bound proposal ids, append-only owner state)
 *   - src/fyd/ask/site-patch.ts (typed patch ops bound to a spec digest,
 *     before/after review card)
 *   - src/fyd/owner-mode/corrections.ts (assertion algebra: append-only
 *     assertions, chain heads, REGENERATION projects assertions over
 *     freshly extracted facts, conflict surfacing)
 * TARGET OWNER: packages/proposals (piging2 conversational customization)
 * DEPENDENCIES: ../../trust/src/digest (digests),
 *   ../../sitespec/src/* (SiteSpec types, generator, query seam,
 *   evidence derivation, render model)
 * PROOFS: [7, 8]
 *
 * ADAPTATIONS, honestly stated:
 * - The planner is upstream structured input (PlannedIntent). The source
 *   compiled plain English with keyword matchers; that parsing stays out
 *   of this package (it is the LLM's job here, software validates).
 * - Patch ops are SiteSpec-typed (reorder_section, set_visibility,
 *   set_component_option) instead of the source's SitePatchBody, because
 *   the piging2 SiteSpec carries presentation.* as the override surface.
 * - Owner assertions: the canonical shape and algebra live in the owner
 *   package (packages/owner/src/corrections.ts). The provisional shape
 *   sketched here first was retired when that package landed (2026-10-02);
 *   the semantics were identical, so convergence changed no behavior.
 */

import type { FYDSiteSpec } from "../../sitespec/src/types";
import type { EvidenceRecord } from "../../sitespec/src/evidence";

// ---------------------------------------------------------------------------
// Planned intents: structured planner output. The "LLM plans" step arrives
// here already typed; software validates everything downstream.
// ---------------------------------------------------------------------------

/** The small fixed intent set this compiler accepts. Extend only with justification. */
export type PlannedIntent =
  | { kind: "move_section_to_top"; target: string }
  | { kind: "hide_section"; target: string }
  | { kind: "show_section"; target: string };

// ---------------------------------------------------------------------------
// Typed patch operations. Each op carries its target path, the before
// value (must match the current spec), the after value (must be
// schema-valid), and the rationale the planner gave.
// ---------------------------------------------------------------------------

export type SiteSpecPatchOp =
  | {
      op: "reorder_section";
      /** e.g. "pages.home.sections" */
      path: string;
      pageSlug: string;
      /** Section ids in current spec order. Must match the spec at apply time. */
      before: string[];
      /** Section ids in proposed order. Must be a permutation of before. */
      after: string[];
      rationale: string;
    }
  | {
      op: "set_visibility";
      /** e.g. "pages.home.sections.home:People:5.presentation.hidden" */
      path: string;
      pageSlug: string;
      sectionId: string;
      before: boolean;
      after: boolean;
      rationale: string;
    }
  | {
      op: "set_component_option";
      /** e.g. "pages.home.sections.home:Services:2.presentation.objectOrder" */
      path: string;
      pageSlug: string;
      sectionId: string;
      /** Allowlisted presentation option key (see VALID_COMPONENT_OPTIONS). */
      option: string;
      before: unknown;
      after: unknown;
      rationale: string;
    };

// ---------------------------------------------------------------------------
// Proposals: drafted -> approved -> applied. The id is a deterministic
// digest of the patch + the spec version it was drafted against, so a
// tampered or stale proposal can never be approved or applied.
// ---------------------------------------------------------------------------

export type ProposalStatus = "proposed" | "approved" | "applied";

export interface ProposalPreview {
  title: string;
  before: string[];
  after: string[];
}

/** Explicit approval. There is no auto-approve path in this package. */
export interface ProposalApproval {
  approvedBy: string;
  approvedAt: string;
  note?: string;
}

export interface PatchProposal {
  /**
   * Deterministic: "pp-" + digestCanonical({ commandText, intent, patch,
   * specDigest }). The same draft over the same spec always yields the
   * same id; any tampering changes it.
   */
  id: string;
  /** The owner's words, carried for the record. Never parsed here. */
  commandText: string;
  intent: PlannedIntent;
  patch: SiteSpecPatchOp[];
  /** digestCanonical of the spec the proposal was drafted against. */
  beforeDigest: string;
  /** digestCanonical of the spec after the patch (computed at draft). */
  afterDigest: string;
  preview: ProposalPreview;
  status: ProposalStatus;
  approval?: ProposalApproval;
}

/** A canonical, append-only transition record: one per applied proposal. */
export interface SpecTransition {
  kind: "proposals.spec-transition@1";
  /** Deterministic: "st-" + digestCanonical({ proposalId, beforeDigest, afterDigest }). */
  transitionId: string;
  proposalId: string;
  beforeDigest: string;
  afterDigest: string;
  opCount: number;
  /** digestCanonical of the patch ops, for independent verification. */
  opsDigest: string;
  approvedBy: string;
  approvedAt: string;
  /** Injectable clock; tests pin it. */
  appliedAt: string;
}

// ---------------------------------------------------------------------------
// Presentation overrides: the owner-presentation layer that regeneration
// must preserve. Derived from applied proposals; re-applied after every
// regeneration. Absolute (not deltas), so re-application is idempotent.
// ---------------------------------------------------------------------------

export type PresentationOverride =
  | { kind: "section_order"; pageSlug: string; sectionIds: string[] }
  | { kind: "section_visibility"; pageSlug: string; sectionId: string; hidden: boolean }
  | { kind: "object_order"; pageSlug: string; sectionId: string; objectIds: string[] }
  | {
      kind: "component_option";
      pageSlug: string;
      sectionId: string;
      option: string;
      value: unknown;
    };

/** Everything the proposal path owns. Append-only where it matters. */
export interface ProposalsState {
  spec: FYDSiteSpec;
  /** Derived from applied proposals, in apply order. */
  overrides: PresentationOverride[];
  /** Append-only journal of canonical transitions. */
  transitions: SpecTransition[];
  appliedProposalIds: string[];
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Owner assertions: the canonical shape and algebra live in the owner
// package (packages/owner/src/corrections.ts). Re-exported here so this
// package's inputs reference the single assertion authority. (The
// provisional shape sketched here first was retired when that package
// landed on 2026-10-02; the semantics were identical, so convergence
// changed no behavior.)
// ---------------------------------------------------------------------------

import type {
  AppliedAssertion,
  CorrectionConflict,
  OrphanedAssertion,
  OwnerAssertion,
} from "../../owner/src/corrections";

export type {
  AppliedAssertion,
  CorrectionConflict,
  OrphanedAssertion,
  OwnerAssertion,
};

// ---------------------------------------------------------------------------
// Regeneration.
// ---------------------------------------------------------------------------

export interface EvidenceDiff {
  added: EvidenceRecord[];
  removed: EvidenceRecord[];
  /** Union of objectIds across added and removed records, sorted. */
  affectedObjectIds: string[];
}

export interface RegenerateInput {
  /** The current source graph (what the live spec was built from). */
  graph: import("../../sitespec/src/types").ObjectGraph;
  /** The fresh observation: newly extracted source facts. */
  newObservation: import("../../sitespec/src/types").ObjectGraph;
  /** The live SiteSpec (carries owner overrides already applied). */
  spec: FYDSiteSpec;
  assertions: OwnerAssertion[];
  presentationOverrides: PresentationOverride[];
  /** Pinned by the caller so runs are reproducible. */
  generatedAt: string;
}

export interface RegenerateResult {
  /** The new SiteSpec version. Byte-identical to input.spec when noOp. */
  spec: FYDSiteSpec;
  /** The asserted graph the spec was generated from (assertions composed over the fresh observation). */
  graph: import("../../sitespec/src/types").ObjectGraph;
  /** True when the observation carried no changes: the spec is untouched. */
  noOp: boolean;
  evidenceDiff: EvidenceDiff;
  /** Spec paths whose bound objects changed, e.g. "pages.home.sections.home:Services:2". */
  affectedPaths: string[];
  /** Page slugs re-generated (fresh generator output spliced in). */
  freshPages: string[];
  assertions: {
    applied: AppliedAssertion[];
    orphaned: OrphanedAssertion[];
    conflicts: CorrectionConflict[];
  };
  /** factIds hidden by HIDE assertions, for the visibility layer. */
  hiddenFactIds: string[];
  /** How many presentation overrides were re-applied after regeneration. */
  overridesReapplied: number;
  /** digestCanonical of the resulting spec. Equals the input digest when noOp. */
  specDigest: string;
}

export type ProposeOutcome =
  | { ok: true; proposal: PatchProposal }
  | { ok: false; reason: string };

export type ApproveOutcome =
  | { ok: true; proposal: PatchProposal }
  | { ok: false; reason: string };

export interface ApplySuccess {
  state: ProposalsState;
  proposal: PatchProposal;
  transition: SpecTransition | null;
  /** True when the proposal was already applied (idempotent no-op). */
  alreadyApplied: boolean;
  summary: string;
}

export type ApplyOutcome = { ok: true } & ApplySuccess | { ok: false; reason: string };
