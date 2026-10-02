#!/usr/bin/env python3
"""Surgical rewrite of the factual block of ask-composer.ts.

Extracts the `if (target) {...}` body into answerClause(ctx, clause, target),
adds answerTarget aggregation, and applies the FYD FINISH-STRONG fixes:
- services require active offers/provides edges (edge-gated)
- per-service evidence-bound sentences (no multi-service one-marker sentence)
- topic matching against service title/description
- partial-clause support with explicit unknowns
- per-clause provenance (subordinate, never rescues)
- service-area vs locality distinction
- absence claims become uncited sentences + unknowns (no supported absence claims)
- id-free public evidence labels (handled separately)
"""
import re, sys

P = "src/lib/ping/ask-composer.ts"
s = open(P).read()

def rep(old: str, new: str, count: int = 1) -> None:
    global s
    found = s.count(old)
    assert found == count, f"expected {count}, found {found} for: {old[:80]!r}"
    s = s.replace(old, new)

# ---------------------------------------------------------------- helpers
old_helpers = '''/** Words describing the services on record (services field, titles, descriptions). */
function serviceVocabulary(target: PingObject, relatedServices: PingObject[]): Set<string> {
  const vocab = new Set<string>();
  const add = (text: string | null): void => {
    if (!text) return;
    for (const w of text.toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length > 2 && !GENERIC_WORDS.has(w)) vocab.add(w);
    }
  };
  add(fieldOf(target, "services"));
  for (const o of relatedServices) {
    add(o.title);
    add(o.description);
  }
  return vocab;
}
'''

new_helpers = '''/**
 * Split a multi-intent question into clauses on ";" or on "and" when the
 * next clause opens with an interrogative/auxiliary ("what services ...,
 * and how do you know?"). The lookahead keeps "heating and cooling" style
 * noun phrases intact: "and" only splits when a question word follows.
 */
function splitClauses(question: string): string[] {
  const parts = question
    .split(/\\s*;\\s*|\\s+and\\s+(?=(?:what|which|who|whom|whose|when|where|why|how|do|does|did|is|are|was|were|can|could|would|should|will|shall|may|might|must|tell|list|name)\\b)/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts : [question.trim()];
}

/** A provenance question ("how do you know?") asks for the basis of an answer. */
function clauseAsksProvenance(clauseLower: string): boolean {
  return (
    hasWord(clauseLower, "source", "sources", "sourcing", "provenance") ||
    (hasWord(clauseLower, "how") && hasWord(clauseLower, "know")) ||
    (hasWord(clauseLower, "where") && hasWord(clauseLower, "come") && hasWord(clauseLower, "from"))
  );
}

/**
 * Does a service record match the question's topic words? A topic matches
 * when it appears (or a stem of it does: plurals, -ing) in the service's
 * own title or description. "Do they service heat pumps?" matches the
 * Heating & Cooling record ("heat pumps" in its description); "do they
 * do financing?" matches nothing and is refused honestly.
 */
function serviceMatchesTopics(service: PingObject, topics: string[]): boolean {
  const hay = `${service.title ?? ""} ${service.description ?? ""}`.toLowerCase();
  for (const t of topics) {
    if (hay.includes(t)) return true;
    if (t.length > 4 && t.endsWith("s") && hay.includes(t.slice(0, -1))) return true;
    if (t.length > 5 && t.endsWith("ing") && hay.includes(t.slice(0, -3))) return true;
  }
  return false;
}

/**
 * Every service object named in the answer gets its own evidence ref so
 * the sentence citing it binds to THAT object. Returns the ref index.
 */
function ensureObjectRef(ctx: AskContext, obj: PingObject): number {
  const existing = ctx.evidenceRefs.findIndex((e) => e.id === obj.id);
  if (existing >= 0) return existing;
  ctx.evidenceRefs.push({
    kind: "object",
    id: obj.id,
    label: `${schemaLabel(obj.schema)}: ${obj.title || "(untitled record)"}`,
  });
  return ctx.evidenceRefs.length - 1;
}
'''
rep(old_helpers, new_helpers)

# --------------------------------- extract the factual block into functions
hdr = "  // -- Factual intents about the target -------------------------------------"
start = s.index(hdr)
if_target = s.index("  if (target) {", start)
tail_marker = "\n  // -- No target -------------------------------------------------------------"
tail = s.index(tail_marker, if_target)
# block ends at the last "  }" before the tail marker
block_end = s.rindex("\n  }", if_target, tail) + len("\n  }")
inner_start = s.index("\n", if_target) + 1
inner = s[if_target:inner_start] + ""  # placeholder, not used
body = s[inner_start:block_end].rstrip("\n")
# body is the inner content of if (target) { ... } (4-space indented)
assert body.strip().startswith("const sentences: Sentence[] = [];"), body[:120]

# --- (a) locals: per-clause q + clauseUnknowns
old = """    const sentences: Sentence[] = [];
    const claimClassifications: AskClaimClassification[] = [];
    const title = target.title || "This business";"""
new = """    const q = clause.toLowerCase().trim();
    const sentences: Sentence[] = [];
    const claimClassifications: AskClaimClassification[] = [];
    const clauseUnknowns: string[] = [];
    const title = target.title || "This business";"""
assert body.count(old) == 1
body = body.replace(old, new)

# --- (b) provenance becomes per-clause
old = """    // Provenance questions ("how do you know?") are identified early:
    // the services branch below must not claim them via its broad "do"
    // trigger. A provenance question is never a services question; a
    // combined question ("what services ... and how do you know?") still
    // reaches the services branch through an explicit services word.
    const asksProvenance =
      hasWord(q, "source", "sources", "sourcing", "provenance") ||
      (hasWord(q, "how") && hasWord(q, "know")) ||
      (hasWord(q, "where") && hasWord(q, "come") && hasWord(q, "from"));"""
new = """    // Provenance ("how do you know?") is per-clause now: clauses are
    // split before this function runs. The services branch below must not
    // claim a provenance clause via its broad "do" trigger."""
assert body.count(old) == 1
body = body.replace(old, new)
old = "    if (asksProvenance) {"
assert body.count(old) == 1
body = body.replace(old, "    if (clauseAsksProvenance(q)) {")
old = '      (hasWord(q, "do") && !asksProvenance);'
assert body.count(old) == 1
body = body.replace(old, '      (hasWord(q, "do") && !clauseAsksProvenance(q));')

# --- (c) people early-return -> uncited sentence + unknown
old = """      if (persons.length === 0 && associations === 0) {
        return {
          ...base,
          unknowns: ["people associated with this business"],
          answer: [
            `The site data contains no person records for ${title}, so I cannot answer that: there is no owner or staff information on record.`,
            "I will not guess at names, roles, or personal details that are not on record.",
          ].join("\\n\\n"),
          proposal: null,
          partial: true,
        };
      }"""
new = """      if (persons.length === 0 && associations === 0) {
        // Absence of a person record is not evidence of absence in the
        // real world: say what is on record, uncited, and name the gap.
        sentences.push({
          text: `The site data contains no person records for ${title}, so I cannot name an owner or staff.`,
          cites: [],
        });
        clauseUnknowns.push("people associated with this business");
      }"""
assert body.count(old) == 1
body = body.replace(old, new)

# --- (d) services branch: edge-gated, per-service sentences, topic matching
svc_start = body.index("    const asksServices =")
svc_anchor = '          return noEvidenceAnswer(ctx, question, ["services offered by this business"]);'
svc_anchor_idx = body.index(svc_anchor)
svc_end = body.index("\n      }\n    }", svc_anchor_idx) + len("\n      }\n    }")
new_services = """    // Offering claims require an ACTIVE offers/provides relationship
    // from the business to the service object. Prose mentions
    // ("plumbing" in a description) and unlinked records never ground
    // "X offers Y": stripping the edges forces an honest refusal.
    const asksServices =
      hasWord(q, "service", "services", "offer", "offers", "provide") ||
      (hasWord(q, "do") && !clauseAsksProvenance(q));
    if (asksServices && !(targetIsService && profileIntent)) {
      const servicesField = fieldOf(target, "services");
      const offeredIds = new Set<string>();
      for (const r of ctx.relationships) {
        if (r.status !== "active") continue;
        if (r.subject === target.id && (r.predicate === "offers" || r.predicate === "provides"))
          offeredIds.add(r.object);
        else if (
          r.object === target.id &&
          (r.predicate === "offered_by" || r.predicate === "provided_by")
        )
          offeredIds.add(r.subject);
      }
      const offered = ctx.relatedObjects.filter(
        (o) =>
          (o.schema === "ping.social.service@1" || o.schema === "ping.social.product@1") &&
          offeredIds.has(o.id),
      );
      // A specific topic ("heat pumps") must match the service's own
      // title/description before it is claimed; a general question lists
      // every actively offered service. Every named service binds to its
      // own object evidence ref: no multi-service sentence on one marker.
      const topics = topicWords(q);
      const isYesNo = hasWord(q, "do", "does", "is", "are", "can", "could", "would", "will", "did");
      const matched =
        topics.length === 0 ? offered : offered.filter((s) => serviceMatchesTopics(s, topics));
      if (topics.length === 0 && servicesField)
        pushClaim(
          `Services on record: ${servicesField}.`,
          [0],
          `${title} services field`,
          target,
          "services",
        );
      for (const svc of matched) {
        const i = ensureObjectRef(ctx, svc);
        const desc = svc.description ? `${svc.title}: ${svc.description}` : (svc.title ?? "");
        pushClaim(
          `${isYesNo && topics.length > 0 ? "Yes. " : ""}On record: ${desc}.`,
          [i],
          `${title} offers ${svc.title}`,
          svc,
          "name",
        );
      }
      if (topics.length > 0 && matched.length === 0) clauseUnknowns.push(topics.join(" "));
      else if (topics.length === 0 && !servicesField && matched.length === 0)
        clauseUnknowns.push("services offered by this business");
    }"""
body = body[:svc_start] + new_services + body[svc_end:]

# --- (e) contact absence: uncited + unknown
old = """      if (!site && !email && !phone) {
        pushClaim(
          `${title} has no contact details on record.`,
          [0],
          `${title} contact absence`,
          target,
          "contact",
        );
      }"""
new = """      if (!site && !email && !phone) {
        sentences.push({
          text: `${title} lists no public contact details in the current context.`,
          cites: [],
        });
        clauseUnknowns.push("contact details for this business");
      }"""
assert body.count(old) == 1, "contact absence"
body = body.replace(old, new)

# --- (f) location: service-area vs locality; absence -> uncited + unknown
old = """    if (hasWord(q, "where", "location", "address", "based")) {
      const loc = fieldOf(target, "location");
      if (loc)
        pushClaim(`Location on record: ${loc}.`, [0], `${title} location`, target, "location");
      else
        pushClaim(
          `${title} has no location on record.`,
          [0],
          `${title} location absence`,
          target,
          "location",
        );
    }"""
new = """    // Service area ("where do they work?") is not locality ("where are
    // they listed?"): prefer an explicit area_served field and never
    // equate the two.
    const asksServiceArea =
      hasWord(q, "where", "area", "areas", "coverage", "region", "regions") &&
      hasWord(q, "work", "works", "serve", "serves", "serving", "service", "services");
    if (asksServiceArea) {
      const area = fieldOf(target, "area_served", "areaServed", "serviceArea", "service_area");
      if (area)
        pushClaim(
          `Service area on record: ${area}.`,
          [0],
          `${title} service area`,
          target,
          "area_served",
        );
      else {
        const loc = fieldOf(target, "location", "address", "city", "locality");
        sentences.push({
          text: loc
            ? `${title} is listed in ${loc}; its service area is not on record.`
            : `No public service area is on record for ${title}.`,
          cites: [],
        });
        clauseUnknowns.push("service area of this business");
      }
    } else if (hasWord(q, "where", "location", "address", "based")) {
      const loc = fieldOf(target, "location");
      if (loc)
        pushClaim(`Location on record: ${loc}.`, [0], `${title} location`, target, "location");
      else {
        sentences.push({
          text: `No public location is on record for ${title}.`,
          cites: [],
        });
        clauseUnknowns.push("location of this business");
      }
    }"""
assert body.count(old) == 1, "location"
body = body.replace(old, new)

# --- (g) review absence: uncited + unknown
old = """      if (verified)
        pushClaim(
          `${title} carries an explicit verified mark.`,
          [0],
          `${title} verified mark`,
          target,
          "verified",
        );
      else
        pushClaim(
          `${title} has no verified mark on record.`,
          [0],
          `${title} verification absence`,
          target,
          "verified",
        );"""
new = """      if (verified)
        pushClaim(
          `${title} carries an explicit verified mark.`,
          [0],
          `${title} verified mark`,
          target,
          "verified",
        );
      else {
        sentences.push({
          text: `${title} carries no verified mark in the current context.`,
          cites: [],
        });
        clauseUnknowns.push("verification status of this business");
      }"""
assert body.count(old) == 1, "review absence"
body = body.replace(old, new)

# --- (h) final block: return accumulators instead of answering
old = """    if (sentences.length > 0) {
      return {
        ...base,
        answer: sentences.map((s) => cite(s.text, s.cites)).join("\\n\\n"),
        claimClassifications,
        proposal: null,
        partial: false,
      };
    }

    // Fallback: no branch had grounded content answering the question.
    // Say so explicitly with no citations, so the visitor layer surfaces
    // a refusal. The description is deliberately not dumped here: citing
    // it would look like an answer while answering nothing.
    return noEvidenceAnswer(ctx, question);"""
new = """    return { sentences, claimClassifications, unknowns: clauseUnknowns };"""
assert body.count(old) == 1, "final block"
body = body.replace(old, new)

# sanity: no remaining whole-question returns inside the clause body
assert "return noEvidenceAnswer" not in body, "leftover refusal return"
assert "...base" not in body, "leftover base spread"

# --- build the two new functions and splice them in
functions = """/**
 * One clause of a visitor question, answered from the graph on its own
 * terms. Returns the factual sentences, their classifications, and the
 * explicitly named gaps; aggregation happens in answerTarget.
 */
interface ClauseResult {
  sentences: Sentence[];
  claimClassifications: AskClaimClassification[];
  unknowns: string[];
}

function answerClause(ctx: AskContext, clause: string, target: PingObject): ClauseResult {
""" + body + """
}

/**
 * Aggregate clause results into one answer. Supported clauses produce
 * cited claims; unsupported clauses produce explicit unknowns. A partial
 * answer (citations plus unknowns, or uncited informative sentences)
 * is NOT a total refusal: total refusal is only for zero sentences.
 * Provenance clauses run only when a substantive clause produced cited
 * evidence: "how do you know?" elaborates an answer, never rescues one.
 */
function answerTarget(
  ctx: AskContext,
  base: Omit<AskAnswer, "answer" | "proposal" | "partial">,
  question: string,
  target: PingObject,
): AskAnswer {
  const clauses = splitClauses(question);
  const substantive = clauses.filter((c) => !clauseAsksProvenance(c.toLowerCase()));
  const provenanceOnly = clauses.filter((c) => clauseAsksProvenance(c.toLowerCase()));
  const run = (substantive.length > 0 ? substantive : provenanceOnly).map((c) =>
    answerClause(ctx, c, target),
  );
  if (
    substantive.length > 0 &&
    run.some((r) => r.sentences.some((s) => s.cites.length > 0))
  ) {
    for (const c of provenanceOnly) run.push(answerClause(ctx, c, target));
  }
  const sentences: Sentence[] = [];
  const claimClassifications: AskClaimClassification[] = [];
  const unknowns: string[] = [];
  for (const r of run) {
    sentences.push(...r.sentences);
    claimClassifications.push(...r.claimClassifications);
    for (const u of r.unknowns) if (!unknowns.includes(u)) unknowns.push(u);
  }
  // The description is deliberately not dumped as a fallback: citing it
  // would look like an answer while answering nothing.
  if (sentences.length === 0) return noEvidenceAnswer(ctx, question, unknowns);
  const parts = sentences.map((s) => cite(s.text, s.cites));
  if (unknowns.length > 0) parts.push(`I do not have evidence for: ${unknowns.join("; ")}.`);
  const cited = sentences.some((s) => s.cites.length > 0);
  return {
    ...base,
    answer: parts.join("\\n\\n"),
    claimClassifications,
    unknowns,
    proposal: null,
    partial: unknowns.length > 0 || !cited,
  };
}

"""

old_block = s[start:block_end]
new_block = functions + """  // -- Factual intents about the target -------------------------------------
  if (target) {
    return answerTarget(ctx, base, question, target);
  }"""
rep(old_block, new_block)

open(P, "w").write(s)
print("composer surgery OK")
