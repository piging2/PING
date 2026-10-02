"""LANE N edits for src/fyd/sitespec/binding-verifier.ts (D1, D3, D4)."""
import sys

PATH = "/home/nolan/projects/ping/src/fyd/sitespec/binding-verifier.ts"

with open(PATH) as f:
    src = f.read()

edits = []

# 1. imports: add ObjectProvenanceKind + PingObject
edits.append((
    'import type { OwnerFieldCorrection } from "@/lib/ping/types";',
    '''import type {
  ObjectProvenanceKind,
  OwnerFieldCorrection,
  PingObject,
} from "@/lib/ping/types";''',
))

# 2. header determinism line
edits.append((
    """ * Determinism: pure function of (bindings, graph, ownerAssertions). No
 * clock, no randomness, no I/O, no LLM, no network.
 */""",
    """ * Determinism: pure function of (bindings, graph, ownerAssertions, now).
 * No randomness, no I/O, no LLM, no network; now defaults to the current
 * instant when the caller omits it, so production callers always enforce
 * the evidence-freshness rule.
 */""",
))

# 3. UNBOUND reason list
edits.append((
    """ *                                       evidence, no owner assertion, no
 *                                       generator ref, unknown
 *                                       classification).""",
    """ *                                       evidence, no owner assertion, no
 *                                       generator ref, stale evidence,
 *                                       non-website provenance kind on a
 *                                       direct binding, unknown
 *                                       classification).""",
))

# 4. freshness options + horizon + helpers, before the BindingSource comment
edits.append((
    """/**
 * The accepted source a BOUND verdict traces to. These are the three""",
    '''/**
 * Evidence-freshness horizon (LANE-CLAIM D1). A factual binding whose
 * object provenance was derived more than this many days before the
 * reference instant is downgraded: it no longer verifies as evidence
 * (UNBOUND, reason "stale evidence"), so the atom is withheld rather
 * than published as fact. Re-ingesting the evidence refreshes derivedAt
 * and restores the binding: the rule is reversible.
 *
 * 365 days is the safest reversible default: it catches the proven
 * 20-month-stale case while leaving normal annual re-verification cycles
 * untouched. Tune by changing this constant only.
 */
export const EVIDENCE_FRESHNESS_HORIZON_DAYS = 365;

/**
 * Reference instant for the evidence-freshness rule. Deterministic when
 * supplied (tests pin it); when omitted the current instant is used at
 * the call boundary so production callers always enforce the rule.
 */
export interface VerifyBindingOptions {
  /** ISO-8601 reference instant for the evidence-freshness check. */
  now?: string;
}

function resolveNowIso(opts?: VerifyBindingOptions): string {
  return opts?.now ?? new Date().toISOString();
}

/**
 * True when the object's evidence is fresh enough to back a factual
 * claim: derivedAt is within the horizon of the reference instant. A
 * missing or unparseable derivedAt cannot be judged stale, so it is
 * treated as fresh here; the ref-presence and kind gates still apply. A
 * derivedAt in the future (clock skew) is never stale.
 */
function evidenceIsFresh(obj: PingObject | undefined, nowIso: string): boolean {
  const derivedAt = obj?.provenance?.derivedAt;
  if (!derivedAt) return true;
  const derivedMs = Date.parse(derivedAt);
  const nowMs = Date.parse(nowIso);
  if (Number.isNaN(derivedMs) || Number.isNaN(nowMs)) return true;
  const ageMs = nowMs - derivedMs;
  if (ageMs < 0) return true;
  return ageMs <= EVIDENCE_FRESHNESS_HORIZON_DAYS * 24 * 60 * 60 * 1000;
}

function staleEvidenceReason(obj: PingObject | undefined): string {
  return (
    "stale evidence: derivedAt " +
    (obj?.provenance?.derivedAt ?? "unknown") +
    " is past the " +
    EVIDENCE_FRESHNESS_HORIZON_DAYS +
    "-day freshness horizon"
  );
}

/**
 * The accepted source a BOUND verdict traces to. These are the three''',
))

# 5. verifyBinding signature
edits.append((
    """export function verifyBinding(
  binding: PresentationBinding,
  graph: ObjectGraph,
  ownerAssertions: readonly OwnerAssertion[] = [],
): SpecBindingVerdict {
  const base = verifyPresentationBinding(binding, graph);
  if (!base.ok) {
    return { status: "UNBOUND", binding, reason: base.reason };
  }
  const value = base.value;""",
    """export function verifyBinding(
  binding: PresentationBinding,
  graph: ObjectGraph,
  ownerAssertions: readonly OwnerAssertion[] = [],
  opts: VerifyBindingOptions = {},
): SpecBindingVerdict {
  const base = verifyPresentationBinding(binding, graph);
  if (!base.ok) {
    return { status: "UNBOUND", binding, reason: base.reason };
  }
  const nowIso = resolveNowIso(opts);
  const value = base.value;""",
))

# 6. direct case: D4 kind gate + D1 freshness
edits.append((
    """      // verifyPresentationBinding already required a non-empty
      // provenance ref: the object's own evidence ref backs this value.
      return { status: "BOUND", binding, source: "evidence-ref", value };
    }""",
    """      // LANE-CLAIM D4: DIRECT_EVIDENCE is website evidence. An object
      // whose provenance kind is not website-derived (overlay-authored,
      // canonical-journal) can never back a direct binding: the kind's
      // own contract (src/lib/ping/types.ts) forbids classifying it as
      // the website's words. Such bindings are UNBOUND here, never
      // silently graded as direct evidence.
      const provenanceKind = obj?.provenance?.kind;
      if (provenanceKind !== "website-derived") {
        return {
          status: "UNBOUND",
          binding,
          reason:
            "provenance kind \\"" +
            (provenanceKind ?? "missing") +
            "\\" cannot back direct evidence",
        };
      }
      // LANE-CLAIM D1: staleness is modeled. Evidence derived past the
      // freshness horizon no longer verifies as direct evidence: the
      // binding is downgraded (UNBOUND with a named reason), never
      // silently published as DIRECT_EVIDENCE.
      if (!evidenceIsFresh(obj, nowIso)) {
        return { status: "UNBOUND", binding, reason: staleEvidenceReason(obj) };
      }
      // verifyPresentationBinding already required a non-empty
      // provenance ref: the object's own evidence ref backs this value.
      return { status: "BOUND", binding, source: "evidence-ref", value };
    }""",
))

# 7. derived case: D1 freshness
edits.append((
    """      if (evidenceRef === "") {
        return { status: "UNBOUND", binding, reason: "no input evidence" };
      }
      return { status: "BOUND", binding, source: "object-field", value };""",
    """      if (evidenceRef === "") {
        return { status: "UNBOUND", binding, reason: "no input evidence" };
      }
      // LANE-CLAIM D1: the input evidence behind a derived claim is
      // subject to the same freshness horizon as direct evidence.
      if (!evidenceIsFresh(obj, nowIso)) {
        return { status: "UNBOUND", binding, reason: staleEvidenceReason(obj) };
      }
      return { status: "BOUND", binding, source: "object-field", value };""",
))

# 8. generated case: D1 freshness
edits.append((
    """      if (evidenceRef === "") {
        return { status: "UNBOUND", binding, reason: "no evidence ref" };
      }
      return {""",
    """      if (evidenceRef === "") {
        return { status: "UNBOUND", binding, reason: "no evidence ref" };
      }
      // LANE-CLAIM D1: generated factual atoms bind to evidence, so the
      // freshness horizon applies here too.
      if (!evidenceIsFresh(obj, nowIso)) {
        return { status: "UNBOUND", binding, reason: staleEvidenceReason(obj) };
      }
      return {""",
))

# 9. resolveBoundFieldVerified threads opts
edits.append((
    """export function resolveBoundFieldVerified(
  graph: ObjectGraph,
  binding: PresentationBinding,
  ownerAssertions: readonly OwnerAssertion[] = [],
): string | undefined {
  const verdict = verifyBinding(binding, graph, ownerAssertions);""",
    """export function resolveBoundFieldVerified(
  graph: ObjectGraph,
  binding: PresentationBinding,
  ownerAssertions: readonly OwnerAssertion[] = [],
  opts: VerifyBindingOptions = {},
): string | undefined {
  const verdict = verifyBinding(binding, graph, ownerAssertions, opts);""",
))

# 10. verifySpecBindings threads opts
edits.append((
    """export function verifySpecBindings(
  bindings: readonly PresentationBinding[],
  graph: ObjectGraph,
  ownerAssertions: readonly OwnerAssertion[] = [],
): SpecBindingReport {
  const verdicts = bindings.map((b) =>
    verifyBinding(b, graph, ownerAssertions),
  );""",
    """export function verifySpecBindings(
  bindings: readonly PresentationBinding[],
  graph: ObjectGraph,
  ownerAssertions: readonly OwnerAssertion[] = [],
  opts: VerifyBindingOptions = {},
): SpecBindingReport {
  const verdicts = bindings.map((b) =>
    verifyBinding(b, graph, ownerAssertions, opts),
  );""",
))

# 11. assertSpecBindingsVerified threads opts
edits.append((
    """export function assertSpecBindingsVerified(
  bindings: readonly PresentationBinding[],
  graph: ObjectGraph,
  ownerAssertions: readonly OwnerAssertion[] = [],
): SpecBindingReport {
  const report = verifySpecBindings(bindings, graph, ownerAssertions);""",
    """export function assertSpecBindingsVerified(
  bindings: readonly PresentationBinding[],
  graph: ObjectGraph,
  ownerAssertions: readonly OwnerAssertion[] = [],
  opts: VerifyBindingOptions = {},
): SpecBindingReport {
  const report = verifySpecBindings(bindings, graph, ownerAssertions, opts);""",
))

# 12. RenderAtom carries provenanceKind
edits.append((
    """  /** Present only when classification is UNKNOWN: why the atom failed. */
  unknownReason?: string;
}""",
    """  /** Present only when classification is UNKNOWN: why the atom failed. */
  unknownReason?: string;
  /**
   * The object's provenance kind, carried on every atom (LANE-CLAIM D4).
   * Model-level rule: only "website-derived" provenance can back a
   * DIRECT_EVIDENCE atom. The kind rides the atom so the invariant is
   * checkable without re-reading the graph.
   */
  provenanceKind?: ObjectProvenanceKind;
}""",
))

# 13. lineage helpers before classifyRenderAtom
edits.append((
    """/**
 * Classify one binding into a render atom. Pure and deterministic.""",
    '''/**
 * The object's authoritative evidence-ref lineage (LANE-CLAIM D1/D3):
 * the provenance ref plus every later update ref. The claim gate reads
 * updatedRefs so supersession is modeled: a carrier pinned to an older
 * ref in this lineage cites superseded evidence.
 */
function evidenceRefLineage(obj: PingObject | undefined): string[] {
  if (!obj?.provenance) return [];
  const lineage = [obj.provenance.ref];
  for (const r of obj.provenance.updatedRefs ?? []) {
    if (!lineage.includes(r)) lineage.push(r);
  }
  return lineage;
}

/**
 * The object's current evidence ref: the latest update ref when the
 * object has been updated, else the base provenance ref.
 */
function currentEvidenceRef(obj: PingObject | undefined): string {
  let current = obj?.provenance?.ref ?? "";
  for (const r of obj?.provenance?.updatedRefs ?? []) current = r;
  return current;
}

/**
 * Classify one binding into a render atom. Pure and deterministic.''',
))

# 14. classifyRenderAtom: signature, kind carrying, carrier checks, model-level D4 guard
edits.append((
    """export function classifyRenderAtom(
  binding: PresentationBinding,
  graph: ObjectGraph,
  ownerAssertions: readonly OwnerAssertion[] = [],
): RenderAtom {
  const verdict = verifyBinding(binding, graph, ownerAssertions);
  if (verdict.status === "UNBOUND") {
    return unknownAtom(binding, verdict.reason);
  }
  const objects = new Map(graph.objects.map((o) => [o.id, o]));
  const obj = objects.get(binding.objectId);
  const evidenceRef = obj && obj.provenance ? obj.provenance.ref : "";
  // LANE-CLAIM H5: a binding may carry its own per-field evidence ref (the
  // planner's slot claimRef, pre-checked against the object's ref by
  // assertGeneratedPresentationVerified). Silently substituting the
  // object-level ref misattributes the claim's source, so the carrier is
  // honored on the atom when present. The carrier is never authoritative
  // on its own: the verdict above still required the object's evidence.
  const reportedRef = binding.evidenceRef ?? evidenceRef;
  switch (verdict.source) {
    case "evidence-ref":
      return {
        id: renderAtomId(binding, "DIRECT_EVIDENCE"),
        value: verdict.value,
        classification: "DIRECT_EVIDENCE",
        evidenceRef: reportedRef,
      };""",
    """export function classifyRenderAtom(
  binding: PresentationBinding,
  graph: ObjectGraph,
  ownerAssertions: readonly OwnerAssertion[] = [],
  opts: VerifyBindingOptions = {},
): RenderAtom {
  const verdict = verifyBinding(binding, graph, ownerAssertions, opts);
  const objects = new Map(graph.objects.map((o) => [o.id, o]));
  const obj = objects.get(binding.objectId);
  // LANE-CLAIM D4: the provenance kind rides every atom, including
  // UNKNOWN ones, so the model-level invariant stays checkable.
  const provenanceKind = obj?.provenance?.kind;
  if (verdict.status === "UNBOUND") {
    return { ...unknownAtom(binding, verdict.reason), provenanceKind };
  }
  const evidenceRef = obj && obj.provenance ? obj.provenance.ref : "";
  // LANE-CLAIM H5 + D3: a binding may carry its own per-field evidence
  // ref (the planner's slot claimRef, pre-checked against the object's
  // ref by assertGeneratedPresentationVerified). The carrier is honored
  // ONLY when it names evidence the object actually carries: it must be
  // a member of the object's authoritative ref lineage
  // (provenance.ref plus provenance.updatedRefs). A carrier outside the
  // lineage is refused outright, mirroring the slot path's claim-mismatch
  // refusal; a carrier inside the lineage but superseded by later
  // updates (LANE-CLAIM D1) is refused as well. Never silently
  // substituted.
  const carrier = binding.evidenceRef;
  if (carrier !== undefined) {
    const lineage = evidenceRefLineage(obj);
    if (!lineage.includes(carrier)) {
      return {
        ...unknownAtom(
          binding,
          "carrier evidence ref is not in the object's ref lineage",
        ),
        provenanceKind,
      };
    }
    if (carrier !== currentEvidenceRef(obj)) {
      return {
        ...unknownAtom(
          binding,
          "carrier evidence ref is superseded by later object updates",
        ),
        provenanceKind,
      };
    }
  }
  const reportedRef = carrier ?? evidenceRef;
  switch (verdict.source) {
    case "evidence-ref": {
      // LANE-CLAIM D4, model level: no DIRECT_EVIDENCE atom may carry a
      // non-website-derived provenance kind. verifyBinding already
      // refuses these; this guard keeps the invariant at the model even
      // if the verdict path is ever bypassed.
      if (provenanceKind !== "website-derived") {
        return {
          ...unknownAtom(
            binding,
            "provenance kind \\"" +
              (provenanceKind ?? "missing") +
              "\\" cannot back DIRECT_EVIDENCE",
          ),
          provenanceKind,
        };
      }
      return {
        id: renderAtomId(binding, "DIRECT_EVIDENCE"),
        value: verdict.value,
        classification: "DIRECT_EVIDENCE",
        evidenceRef: reportedRef,
        provenanceKind,
      };
    }""",
))

# 15. object-field atom carries kind
edits.append((
    """    case "object-field":
      return {
        id: renderAtomId(binding, "DETERMINISTIC_DERIVATION"),
        value: verdict.value,
        classification: "DETERMINISTIC_DERIVATION",
        evidenceRef: reportedRef,
      };""",
    """    case "object-field":
      return {
        id: renderAtomId(binding, "DETERMINISTIC_DERIVATION"),
        value: verdict.value,
        classification: "DETERMINISTIC_DERIVATION",
        evidenceRef: reportedRef,
        provenanceKind,
      };""",
))

# 16. owner-assertion atom carries kind
edits.append((
    """      return {
        id: renderAtomId(binding, "OWNER_ASSERTED"),
        value: verdict.value,
        classification: "OWNER_ASSERTED",
        ownerAssertionRef: match ? ownerAssertionRefFor(match) : undefined,
      };""",
    """      return {
        id: renderAtomId(binding, "OWNER_ASSERTED"),
        value: verdict.value,
        classification: "OWNER_ASSERTED",
        ownerAssertionRef: match ? ownerAssertionRefFor(match) : undefined,
        provenanceKind,
      };""",
))

# 17. generated-presentation atom carries kind
edits.append((
    """      return {
        id: renderAtomId(binding, "GENERATED_PRESENTATION"),
        value: verdict.value,
        classification: "GENERATED_PRESENTATION",
        evidenceRef: reportedRef,
        generatorRef: binding.generatorRef,
      };""",
    """      return {
        id: renderAtomId(binding, "GENERATED_PRESENTATION"),
        value: verdict.value,
        classification: "GENERATED_PRESENTATION",
        evidenceRef: reportedRef,
        generatorRef: binding.generatorRef,
        provenanceKind,
      };""",
))

# 18. BuildVerifiedRenderModelOptions gains now
edits.append((
    """export interface BuildVerifiedRenderModelOptions {
  /** Identifies the render semantics the model was built for. */
  rendererVersion: string;
  viewerId?: string | null;
}""",
    """export interface BuildVerifiedRenderModelOptions {
  /** Identifies the render semantics the model was built for. */
  rendererVersion: string;
  viewerId?: string | null;
  /**
   * Reference instant (ISO-8601) for the evidence-freshness rule.
   * Defaults to the current instant; tests pin it for determinism.
   */
  now?: string;
}""",
))

# 19. buildVerifiedRenderModel threads now
edits.append((
    """  const atoms = bindings.map((b) => classifyRenderAtom(b, graph, ownerAssertions));""",
    """  const atoms = bindings.map((b) =>
    classifyRenderAtom(b, graph, ownerAssertions, { now: opts.now }),
  );""",
))

# 20. buildVerifiedRenderModel determinism doc
edits.append((
    """ * Deterministic: same (bindings, graph, ownerAssertions, rendererVersion,
 * viewerId) -> same model and digest. Binding order, graph object order,""",
    """ * Deterministic: same (bindings, graph, ownerAssertions, rendererVersion,
 * viewerId, now) -> same model and digest. Binding order, graph object order,""",
))

failed = []
for i, (old, new) in enumerate(edits):
    count = src.count(old)
    if count != 1:
        failed.append((i, count))
    else:
        src = src.replace(old, new, 1)

if failed:
    print("FAILED EDITS:", failed)
    sys.exit(1)

with open(PATH, "w") as f:
    f.write(src)
print("OK: all", len(edits), "edits applied")
