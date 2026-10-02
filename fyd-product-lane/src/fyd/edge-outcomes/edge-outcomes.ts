/**
 * EDGE OUTCOMES: the compiler explains every candidate edge.
 *
 * Boundary: the object builder (builder/object-builder.ts) decides what is
 * known and attests the verified graph; the planner binds sections. This
 * module sits between intake and projection and answers, for every
 * candidate edge proposal, exactly one question: what happened to it.
 *
 * Lifecycle stages a candidate moves through:
 *   OBSERVED   intake saw evidence for the fact
 *   RESOLVED   endpoints and predicate are legal and identity-mapped
 *   FILTERED   eligibility, visibility, and owner-intent decisions
 *   PROJECTED  the planner bound it into a section binding
 *   RENDERED   it made it into the rendered surface
 *
 * A candidate dies at exactly one stage; the outcome names the stage and
 * the reason. No candidate is ever silently dropped: unknown shapes throw
 * (fail closed), and every well-formed candidate gets exactly one outcome.
 *
 * Outcome vocabulary (1:1 with the CEO's seven; kebab-case for the
 * two-word ones):
 *   accepted           rendered            the edge projected into a section and renders
 *   unresolved         observed            seen but untraceable: no evidence or observation ref
 *   ambiguous          observed            two candidate predicates, one fact: needs more evidence
 *   duplicate          resolved            the same fact already accepted via another candidate
 *   unsupported        filtered|projected  resolved but no supported path (private endpoint,
 *                                          ineligible component, or no binding consumes it)
 *   policy-suppressed  projected           bound into a section the owner's operating
 *                                          constraints remove: projected but never rendered
 *   schema-rejected    resolved            illegal predicate or dangling endpoint
 *
 * Existing vocabulary note: semantic-diff.ts names diff kinds
 * (added/removed/status-changed/endpoints-changed), not per-edge outcomes,
 * so this module defines the outcome enum above and documents the mapping
 * instead of borrowing diff words.
 *
 * Deterministic: candidates are processed in a canonical order (the
 * canonical forward form of an inverse pair first, then id order) and
 * outcomes are emitted sorted by candidate id. Same inputs, same outcomes.
 */

import type { PingObject } from "@/lib/ping/types";
import type { ObjectGraph } from "../sitespec/types";
import type { EligibilityReport } from "../builder/eligibility";
import {
  OPERATING_CONSTRAINT_COMPONENTS,
  resolveOperatingConstraints,
} from "../builder/owner-intent";

export const EDGE_OUTCOMES_VERSION = "fyd-edge-outcomes@1";

/** A candidate edge proposal from intake. */
export interface EdgeCandidate {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  evidenceRef: string | null;
  observationRef: string | null;
}

/** A planner binding a candidate can project into. */
export interface EdgeBinding {
  bindingId: string;
  component: string;
  predicates: string[];
}

export type EdgeOutcomeKind =
  | "accepted"
  | "unresolved"
  | "ambiguous"
  | "duplicate"
  | "unsupported"
  | "policy-suppressed"
  | "schema-rejected";

export type EdgeStage =
  | "observed"
  | "resolved"
  | "filtered"
  | "projected"
  | "rendered";

export interface EdgeOutcome {
  candidateId: string;
  outcome: EdgeOutcomeKind;
  /** The lifecycle stage where the candidate stopped (rendered for accepted). */
  stage: EdgeStage;
  /** One-line human reason naming the stage and the cause. */
  reason: string;
  /** The binding id, winning candidate id, or null when none decided it. */
  via: string | null;
}

export type EdgeOutcomesCode = "EDGE_OUTCOMES_SHAPE" | "EDGE_OUTCOMES_INPUT";

export class EdgeOutcomesError extends Error {
  readonly code: EdgeOutcomesCode;
  constructor(code: EdgeOutcomesCode, message: string) {
    super(message);
    this.name = "EdgeOutcomesError";
    this.code = code;
  }
}

/**
 * Predicate vocabulary the pipeline can reason over. Mirrors
 * LEGAL_PREDICATES in builder/object-builder.ts (that file is the
 * authority; this copy exists because the constant is not exported).
 */
const LEGAL_PREDICATES = new Set<string>([
  "provides",
  "offers",
  "located_at",
  "has_location",
  "employs",
  "has_member",
  "publishes",
  "works_for",
  "links_to",
  "member_of",
]);

/**
 * Inverse pairs, canonical (traversal) form first. Mirrors the
 * works_for-inverse-employs and member_of-inverse-has_member derivation
 * rules in builder/object-builder.ts: the forward form is what the
 * generator traverses, so it wins when both directions are candidates.
 */
const INVERSE_PAIRS: Array<[canonical: string, inverse: string]> = [
  ["employs", "works_for"],
  ["has_member", "member_of"],
];

function inversePartner(predicate: string): string | null {
  for (const [canonical, inverse] of INVERSE_PAIRS) {
    if (predicate === canonical) return inverse;
    if (predicate === inverse) return canonical;
  }
  return null;
}

function isCanonicalForm(c: EdgeCandidate): boolean {
  return inversePartner(c.predicate) === null || INVERSE_PAIRS.some(([canonical]) => canonical === c.predicate);
}

/** Rewrite an inverse-form edge into its canonical direction. */
function canonicalEndpoints(c: EdgeCandidate): {
  subject: string;
  predicate: string;
  object: string;
} {
  for (const [canonical, inverse] of INVERSE_PAIRS) {
    if (c.predicate === inverse) {
      return { subject: c.object, predicate: canonical, object: c.subject };
    }
  }
  return { subject: c.subject, predicate: c.predicate, object: c.object };
}

/** Identity key for the fact a candidate asserts (direction-normalized). */
function factKey(c: EdgeCandidate): string {
  const k = canonicalEndpoints(c);
  return k.subject + "|" + k.predicate + "|" + k.object;
}

function hasTrace(c: EdgeCandidate): boolean {
  const ev = typeof c.evidenceRef === "string" ? c.evidenceRef : "";
  const ob = typeof c.observationRef === "string" ? c.observationRef : "";
  return ev.length > 0 || ob.length > 0;
}

function orderedPairKey(c: EdgeCandidate): string {
  return c.subject + "" + c.object;
}

export interface CompileEdgeOutcomesOptions {
  /**
   * Owner operating constraints, e.g. ["no-people"]. Resolved with the
   * same table the planner honors (builder/owner-intent.ts); unknown
   * constraints are recorded, never applied.
   */
  ownerOperatingConstraints?: string[];
}

/**
 * Compile one outcome per candidate edge. Pure and deterministic.
 * Throws EdgeOutcomesError on unknown input shapes (fail closed).
 */
export function compileEdgeOutcomes(
  candidates: EdgeCandidate[],
  verifiedGraph: ObjectGraph,
  eligibility: EligibilityReport,
  bindings: EdgeBinding[],
  opts?: CompileEdgeOutcomesOptions,
): EdgeOutcome[] {
  if (!Array.isArray(candidates)) {
    throw new EdgeOutcomesError(
      "EDGE_OUTCOMES_INPUT",
      "candidates must be an array: refusing to explain a non-list",
    );
  }
  if (!verifiedGraph || !Array.isArray(verifiedGraph.objects)) {
    throw new EdgeOutcomesError(
      "EDGE_OUTCOMES_INPUT",
      "verifiedGraph must carry an objects array: refusing to explain against nothing",
    );
  }
  // Shape gate: fail closed on unknown shapes. Never guess, never drop.
  const seenIds = new Set<string>();
  for (const c of candidates) {
    const raw = c as unknown as Record<string, unknown>;
    const label =
      raw && typeof raw.id === "string" && (raw.id as string).length > 0
        ? `"${raw.id as string}"`
        : "<unidentifiable>";
    for (const field of ["id", "subject", "predicate", "object"] as const) {
      const v = raw ? raw[field] : undefined;
      if (typeof v !== "string" || v.length === 0) {
        throw new EdgeOutcomesError(
          "EDGE_OUTCOMES_SHAPE",
          `candidate ${label} has empty or non-string "${field}": refusing to guess what was meant`,
        );
      }
    }
    const id = (c as EdgeCandidate).id;
    if (seenIds.has(id)) {
      throw new EdgeOutcomesError(
        "EDGE_OUTCOMES_SHAPE",
        `duplicate candidate id "${id}": refusing to guess which is which`,
      );
    }
    seenIds.add(id);
  }

  const objects = new Map<string, PingObject>(
    verifiedGraph.objects.map((o) => [o.id, o]),
  );
  const sortedBindings = [...bindings].sort((a, b) =>
    a.bindingId < b.bindingId ? -1 : a.bindingId > b.bindingId ? 1 : 0,
  );
  const removedComponents = new Set(
    resolveOperatingConstraints(opts?.ownerOperatingConstraints ?? []).removed,
  );
  const constraintsFor = (component: string): string[] =>
    Object.keys(OPERATING_CONSTRAINT_COMPONENTS)
      .filter((name) => OPERATING_CONSTRAINT_COMPONENTS[name].includes(component))
      .sort();

  const outcomes: EdgeOutcome[] = [];
  const emit = (
    c: EdgeCandidate,
    outcome: EdgeOutcomeKind,
    stage: EdgeStage,
    reason: string,
    via: string | null = null,
  ): void => {
    outcomes.push({ candidateId: c.id, outcome, stage, reason, via });
  };

  // Observed gate 1: no trace, no explanation possible. The fact was
  // observed but cannot be resolved to evidence.
  const traced = new Map<string, EdgeCandidate>();
  for (const c of candidates) {
    if (!hasTrace(c)) {
      emit(
        c,
        "unresolved",
        "observed",
        "no evidenceRef and no observationRef: the fact was observed but cannot be traced to evidence",
      );
    } else {
      traced.set(c.id, c);
    }
  }

  // Observed gate 2: ambiguity. Two candidate predicates for the same
  // ordered fact pair that are not inverse-equivalent: the evidence
  // cannot decide which predicate the fact carries.
  const ambiguousIds = new Set<string>();
  const byPair = new Map<string, EdgeCandidate[]>();
  for (const c of traced.values()) {
    const key = orderedPairKey(c);
    const list = byPair.get(key) ?? [];
    list.push(c);
    byPair.set(key, list);
  }
  for (const list of byPair.values()) {
    const predicates = [...new Set(list.map((c) => c.predicate))].sort();
    if (predicates.length > 1) {
      const pair = `"${list[0].subject}", "${list[0].object}"`;
      const named =
        predicates.length === 2
          ? `"${predicates[0]}" and "${predicates[1]}"`
          : predicates.map((p) => `"${p}"`).join(", ");
      for (const c of list) {
        ambiguousIds.add(c.id);
        emit(
          c,
          "ambiguous",
          "observed",
          `candidate predicates ${named} assert the same fact (${pair}): evidence cannot disambiguate, more evidence needed`,
        );
      }
    }
  }

  // Resolve, filter, project. Processing order is canonical: the forward
  // form of an inverse pair is evaluated first so it wins
  // deterministically; the rest sort by id.
  const remaining = [...traced.values()]
    .filter((c) => !ambiguousIds.has(c.id))
    .sort((a, b) => {
      const ac = isCanonicalForm(a) ? 0 : 1;
      const bc = isCanonicalForm(b) ? 0 : 1;
      if (ac !== bc) return ac - bc;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  const acceptedByFactKey = new Map<string, string>();

  for (const c of remaining) {
    // Resolve gate: predicate legality, then endpoint existence.
    if (!LEGAL_PREDICATES.has(c.predicate)) {
      emit(
        c,
        "schema-rejected",
        "resolved",
        `illegal predicate "${c.predicate}": outside the schema vocabulary the planner can reason over`,
      );
      continue;
    }
    const subject = objects.get(c.subject);
    const object = objects.get(c.object);
    if (!subject) {
      emit(
        c,
        "schema-rejected",
        "resolved",
        `dangling subject "${c.subject}": no object with that id in the verified graph`,
      );
      continue;
    }
    if (!object) {
      emit(
        c,
        "schema-rejected",
        "resolved",
        `dangling object "${c.object}": no object with that id in the verified graph`,
      );
      continue;
    }
    // Duplicate gate: the same canonical fact already accepted. The
    // canonical (forward) form wins; the inverse is the duplicate.
    const key = factKey(c);
    const winner = acceptedByFactKey.get(key);
    if (winner !== undefined) {
      const canon = canonicalEndpoints(c);
      emit(
        c,
        "duplicate",
        "resolved",
        `same fact as accepted candidate "${winner}" (canonical "${canon.subject} ${canon.predicate} ${canon.object}"): inverse form, no double-count`,
        winner,
      );
      continue;
    }
    // Filter gate: visibility. A private endpoint cannot be used as
    // evidence or rendered; the edge is unsupported, not silently dropped.
    if (subject.visibility !== "public") {
      emit(
        c,
        "unsupported",
        "filtered",
        `subject "${c.subject}" is private: the fact cannot be used as evidence or rendered`,
      );
      continue;
    }
    if (object.visibility !== "public") {
      emit(
        c,
        "unsupported",
        "filtered",
        `object "${c.object}" is private: the fact cannot be used as evidence or rendered`,
      );
      continue;
    }
    // Project gate: the planner binding that consumes this predicate in
    // either direction, mirroring the generator's bidirectional match.
    const expansion = new Set<string>([c.predicate]);
    const partner = inversePartner(c.predicate);
    if (partner) expansion.add(partner);
    const match =
      sortedBindings.find((b) => b.predicates.some((p) => expansion.has(p))) ??
      null;
    if (!match) {
      emit(
        c,
        "unsupported",
        "projected",
        `no planner binding consumes predicate "${c.predicate}": schema-legal but no section can present the fact`,
      );
      continue;
    }
    // Filter gate: component eligibility (the planner's defensive filter).
    if (eligibility.eligible[match.component] !== true) {
      const why = eligibility.reasons[match.component] ?? "no reason recorded";
      emit(
        c,
        "unsupported",
        "filtered",
        `component "${match.component}" is not eligible: ${why}`,
        match.bindingId,
      );
      continue;
    }
    // Project gate: owner operating constraints. The binding exists, so
    // the edge projected; the constraint suppresses the component, so it
    // never renders.
    if (removedComponents.has(match.component)) {
      const names = constraintsFor(match.component);
      emit(
        c,
        "policy-suppressed",
        "projected",
        `bound into "${match.component}" via binding "${match.bindingId}" but owner operating constraint ${names
          .map((n) => `"${n}"`)
          .join(", ")} removes the component: projected, never rendered`,
        match.bindingId,
      );
      continue;
    }
    acceptedByFactKey.set(key, c.id);
    emit(
      c,
      "accepted",
      "rendered",
      `bound into "${match.component}" via binding "${match.bindingId}": renders`,
      match.bindingId,
    );
  }

  outcomes.sort((a, b) =>
    a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0,
  );
  return outcomes;
}
