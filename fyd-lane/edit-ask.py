"""One-shot edit: close the AskAnswer output-contract gaps.

- types.ts: AskClaimClassification + AskAnswer.claimClassifications/unknowns/sourceUrls
- ask-composer.ts: carry fieldClasses + sourceUrls through the context; populate
  the new answer fields (services branch proven; other branches honest empties)
- fyd/ask/answer.ts: baseFields picks the new fields through

Idempotent: exits 0 without changes if already applied.
"""
import io
import sys

REPO = "/home/nolan/projects/ping"


def edit(path, pairs):
    s = io.open(REPO + "/" + path, encoding="utf-8").read()
    changed = False
    for old, new in pairs:
        if new in s:
            continue
        assert s.count(old) == 1, "anchor not unique in %s: %r" % (path, old[:60])
        s = s.replace(old, new)
        changed = True
    if changed:
        io.open(REPO + "/" + path, "w", encoding="utf-8").write(s)
    print(("updated " if changed else "unchanged ") + path)


# --- types.ts ---
edit("src/lib/ping/types.ts", [
    ("""export interface AskEvidenceRef {
  kind: "object" | "relationship" | "field";
  id: string;
  label: string;
  detail?: string;
}
""",
     """export interface AskEvidenceRef {
  kind: "object" | "relationship" | "field";
  id: string;
  label: string;
  detail?: string;
}

/** Per-claim epistemic status for the factual claims in an AskAnswer. */
export interface AskClaimClassification {
  /** The claim text as stated in the answer. */
  claim: string;
  /**
   * Epistemic status. Reuses the extraction pipeline's FactClass vocabulary
   * (DIRECT_FACT, DERIVED_FACT, INFERENCE, GENERATED_COPY, USER_OVERRIDE)
   * when the ask context carries field classes; otherwise the object's own
   * claim kind (e.g. "website_statement").
   */
  classification: string;
  /** Ids into the answer's evidenceRefs supporting this claim. */
  evidenceRefIds: string[];
}
"""),
    ("""  /** Draft only. Agents propose, cannot publish. Human approves exact digest. */
  proposal: AskProposal | null;
  partial: boolean;
}
""",
     """  /** Draft only. Agents propose, cannot publish. Human approves exact digest. */
  proposal: AskProposal | null;
  partial: boolean;
  /** Per-claim epistemic status for the factual claims in `answer`. */
  claimClassifications: AskClaimClassification[];
  /** What the question asked about that has no supporting evidence. */
  unknowns: string[];
  /** Deduped source URLs behind the evidence (from object provenance refs). */
  sourceUrls: string[];
}
"""),
    # AskContext: carry field classes + source urls for the composer
    ("""export interface AskContext {
  viewer: { id: string | null; displayName: string | null };
  target: PingObject | null;
  schemaLabel: string;
  relatedObjects: PingObject[];
  relationships: PingRelationship[];
  evidenceRefs: AskEvidenceRef[];
  plan: CapabilityPlan | null;
  limits: { maxRelated: number; maxRelationships: number; maxFieldChars: number };
}""",
     """export interface AskContext {
  viewer: { id: string | null; displayName: string | null };
  target: PingObject | null;
  schemaLabel: string;
  relatedObjects: PingObject[];
  relationships: PingRelationship[];
  evidenceRefs: AskEvidenceRef[];
  plan: CapabilityPlan | null;
  limits: { maxRelated: number; maxRelationships: number; maxFieldChars: number };
  /** Per-object field epistemic classes, when the caller has them. */
  fieldClasses: Record<string, Record<string, string>>;
  /** Deduped source URLs behind the evidence (from object provenance refs). */
  sourceUrls: string[];
}"""),
])

# --- ask-composer.ts ---
edit("src/lib/ping/ask-composer.ts", [
    # import the new type
    ("""import type {
  AskAnswer,
  AskContext,""",
     """import type {
  AskAnswer,
  AskClaimClassification,
  AskContext,"""),
    # input carries optional field classes
    ("""export interface AskContextInput {
  viewer: { id: string | null; displayName: string | null };
  target: PingObject | null;
  relatedObjects: PingObject[];
  relationships: PingRelationship[];
  plan: CapabilityPlan | null;
}""",
     """export interface AskContextInput {
  viewer: { id: string | null; displayName: string | null };
  target: PingObject | null;
  relatedObjects: PingObject[];
  relationships: PingRelationship[];
  plan: CapabilityPlan | null;
  /** Optional per-object field epistemic classes (pipeline FactClass vocabulary). */
  fieldClasses?: Record<string, Record<string, string>>;
}"""),
    # AskContext lives in types.ts; extended in the types.ts edit below.
    # helpers are inserted before truncateField.
    ("""function truncateField(value: string | string[]): string | string[] {""",
     """/** Extract deduped source URLs from object provenance refs. Deterministic. */
function provenanceSourceUrls(objects: Array<PingObject | null>): string[] {
  const urls = new Set<string>();
  for (const o of objects) {
    const ref = o?.provenance?.ref;
    if (!ref) continue;
    const m = /^website-ingestion:(https?:\\/\\/.+)$/.exec(ref);
    if (m) {
      urls.add(m[1]);
      continue;
    }
    const u = /https?:\\/\\/[^\\s"']+/.exec(ref);
    if (u) urls.add(u[0]);
  }
  return [...urls].sort();
}

/**
 * Epistemic classification for one object field claim. Prefers the
 * pipeline FactClass vocabulary when the context carries field classes;
 * falls back to the object's own claim kind; never invents certainty.
 */
function claimClassification(
  fieldClasses: Record<string, Record<string, string>>,
  obj: PingObject,
  field: string,
): string {
  const fc = fieldClasses[obj.id]?.[field];
  if (fc) return fc;
  const ck = obj.fields["claimKind"];
  return typeof ck === "string" && ck !== "" ? ck : "unknown";
}"""),
    # buildAskContext: compute and attach
    ("""  return {
    viewer: input.viewer,
    target,
    schemaLabel: target ? schemaLabel(target.schema) : "none",
    relatedObjects: related,
    relationships,
    evidenceRefs,
    plan: input.plan,
    limits: { ...ASK_LIMITS, maxRelated: ASK_LIMITS.maxRelated, maxRelationships: ASK_LIMITS.maxRelationships, maxFieldChars: ASK_LIMITS.maxFieldChars },
  };
}""",
     """  return {
    viewer: input.viewer,
    target,
    schemaLabel: target ? schemaLabel(target.schema) : "none",
    relatedObjects: related,
    relationships,
    evidenceRefs,
    plan: input.plan,
    limits: { ...ASK_LIMITS, maxRelated: ASK_LIMITS.maxRelated, maxRelationships: ASK_LIMITS.maxRelationships, maxFieldChars: ASK_LIMITS.maxFieldChars },
    fieldClasses: input.fieldClasses ?? {},
    sourceUrls: provenanceSourceUrls([target, ...related]),
  };
}"""),
    # baseAnswer: extend the picked fields
    ("""function baseAnswer(ctx: AskContext): Pick<AskAnswer, "evidenceRefs" | "relatedObjects" | "suggestedActions"> {
  return {
    evidenceRefs: ctx.evidenceRefs,""",
     """function baseAnswer(
  ctx: AskContext,
): Pick<
  AskAnswer,
  | "evidenceRefs"
  | "relatedObjects"
  | "suggestedActions"
  | "claimClassifications"
  | "unknowns"
  | "sourceUrls"
> {
  return {
    evidenceRefs: ctx.evidenceRefs,
    claimClassifications: [],
    unknowns: [],
    sourceUrls: ctx.sourceUrls,"""),
    # noEvidenceAnswer: unknowns param
    ("""function noEvidenceAnswer(ctx: AskContext, question: string): AskAnswer {""",
     """function noEvidenceAnswer(ctx: AskContext, question: string, unknowns: string[] = []): AskAnswer {"""),
    ("""  return {
    ...baseAnswer(ctx),
    answer: [""",
     """  return {
    ...baseAnswer(ctx),
    unknowns,
    answer: ["""),
    # services branch: per-claim classifications + named unknown on refusal
    ("""    if (hasWord(q, "service", "services", "offer", "offers", "provide", "do")) {
      const services = fieldOf(target, "services");
      const relatedServices = ctx.relatedObjects.filter((o) =>
        ["ping.social.service@1", "ping.social.product@1", "ping.social.offer@1"].includes(o.schema),
      );
      if (services) sentences.push({ text: `Services on record: ${services}.`, cites: [0] });
      if (relatedServices.length > 0) {
        const evIdx = ctx.evidenceRefs.findIndex((e) => e.id === relatedServices[0].id);
        sentences.push({
          text: `Related offerings: ${relatedServices.map((o) => o.title).join("; ")}.`,
          cites: evIdx >= 0 ? [evIdx] : [],
        });
      }
      if (!services && relatedServices.length === 0) {
        return noEvidenceAnswer(ctx, question);
      }
    }""",
     """    if (hasWord(q, "service", "services", "offer", "offers", "provide", "do")) {
      const services = fieldOf(target, "services");
      const relatedServices = ctx.relatedObjects.filter((o) =>
        ["ping.social.service@1", "ping.social.product@1", "ping.social.offer@1"].includes(o.schema),
      );
      if (services) sentences.push({ text: `Services on record: ${services}.`, cites: [0] });
      if (relatedServices.length > 0) {
        const evIdx = ctx.evidenceRefs.findIndex((e) => e.id === relatedServices[0].id);
        sentences.push({
          text: `Related offerings: ${relatedServices.map((o) => o.title).join("; ")}.`,
          cites: evIdx >= 0 ? [evIdx] : [],
        });
        for (const s of relatedServices) {
          const refId = ctx.evidenceRefs.find((e) => e.id === s.id)?.id;
          claimClassifications.push({
            claim: `${title} offers ${s.title}`,
            classification: claimClassification(ctx.fieldClasses, s, "name"),
            evidenceRefIds: refId ? [refId] : [],
          });
        }
      }
      if (!services && relatedServices.length === 0) {
        return noEvidenceAnswer(ctx, question, ["services offered by this business"]);
      }
    }"""),
    # sentences declaration: add the classifications accumulator
    ("""  if (target) {
    const sentences: Sentence[] = [];
    const title = target.title || target.id;""",
     """  if (target) {
    const sentences: Sentence[] = [];
    const claimClassifications: AskClaimClassification[] = [];
    const title = target.title || target.id;"""),
    # final sentences return carries the classifications
    ("""    if (sentences.length > 0) {
      return {
        ...base,
        answer: sentences.map((s) => cite(s.text, s.cites)).join("\\n\\n"),
        proposal: null,
        partial: false,
      };
    }""",
     """    if (sentences.length > 0) {
      return {
        ...base,
        answer: sentences.map((s) => cite(s.text, s.cites)).join("\\n\\n"),
        claimClassifications,
        proposal: null,
        partial: false,
      };
    }"""),
])

# --- fyd/ask/answer.ts ---
edit("src/fyd/ask/answer.ts", [
    ("""function baseFields(ctx: AskFydContext): Pick<AskAnswer, "evidenceRefs" | "relatedObjects" | "suggestedActions"> {
  return {
    evidenceRefs: ctx.base.evidenceRefs,""",
     """function baseFields(
  ctx: AskFydContext,
): Pick<
  AskAnswer,
  | "evidenceRefs"
  | "relatedObjects"
  | "suggestedActions"
  | "claimClassifications"
  | "unknowns"
  | "sourceUrls"
> {
  return {
    evidenceRefs: ctx.base.evidenceRefs,
    claimClassifications: ctx.base.claimClassifications,
    unknowns: ctx.base.unknowns,
    sourceUrls: ctx.base.sourceUrls,"""),
])

print("done")
