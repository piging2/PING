/**
 * HARVEST BANNER (piging2)
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f83474
 *         src/fyd/ask/visitor-answer.ts (answerAskFyd: the refusal shape,
 *         "A refusal is an answer with no cited evidence: the pipeline
 *         had nothing to stand on, so it says so instead of guessing"),
 *         src/fyd/ask/answer.ts (refusalAnswer)
 * TARGET OWNER: packages/ask (piging2 Ask FYD)
 * MODE: ADAPT. The source routes through a general composer with an LLM
 * in the loop for later proofs; proof 3 keeps only the deterministic
 * core: intent detection, evidence lookup, classification, citation, and
 * the refusal contract. The proof-3 answerer handles exactly one intent
 * (the services question). Any other question is refused with its topic
 * recorded in unknowns. Absence/negation questions ("a service they don't
 * advertise") also refuse: the record only names what the site states, so
 * an unadvertised service can never be evidenced and is never named.
 * No LLM in the answer path: classification and evidence binding are
 * mechanical.
 * DEPENDENCIES: ./types, ./viewer, ./cite
 * PROOFS: [3]
 *
 * HONESTY CONTRACT (enforced in code):
 * - A service is named only when a service object with an active
 *   "offers" relationship from the target exists in the projected graph.
 * - A claim is made only with evidenceRefIds that resolve to served
 *   evidence refs.
 * - The derived count claim is computed, labeled DERIVED, never stated
 *   as a recorded fact.
 * - When the graph cannot support the answer: refusal, answerState
 *   UNKNOWN, claims [], unknowns non-empty. The answer text says
 *   "FYD does not have evidence", never a guess, never filler.
 */

import type {
  AskAnswer,
  AskClaimClassification,
  AskEvidenceRef,
  AskInput,
  AskViewerIdentity,
  ObjectGraph,
} from "./types";
import { projectGraphForViewer, decisionsFromHiddenFactIds } from "./viewer";
import { citeFact } from "./cite";
import { claimClassFor } from "./classify";

const SERVICE_SCHEMA = "ping.social.service@1";
const OFFERS_PREDICATE = "offers";
const MAX_QUESTION_CHARS = 2000;

/** The one intent this slice answers: questions about offered services. */
function isServicesQuestion(question: string): boolean {
  return /\bservices?\b/i.test(question);
}

/**
 * Absence/negation questions about services ("a service they don't
 * advertise", "services not advertised") cannot be evidenced: the record
 * only names what the site states. They fail closed to refusal even
 * though they contain the word "service"; naming an unadvertised
 * service would be a guess.
 */
function isUnadvertisedAsk(question: string): boolean {
  return /\b(unadvertised|not advertised|doesn'?t advertise|does not advertise|never (advertised|offered|offer))\b/i.test(
    question,
  );
}

function refusalAnswer(answer: string, unknowns: string[]): AskAnswer {
  return {
    ok: true,
    answer,
    refusal: true,
    answerState: "UNKNOWN",
    claims: [],
    evidenceRefs: [],
    unknowns,
  };
}

function viewerOf(input: AskInput): AskViewerIdentity {
  return {
    id: input.viewerContext.viewerId,
    displayName: null,
    verified: input.viewerContext.viewerClass === "owner",
  };
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Answer one question mechanically from evidence. Pure, deterministic,
 * no I/O, no model. The input graph is projected for the viewer before
 * anything reads it: the answerer cannot see non-public data.
 */
export function askFyd(input: AskInput): AskAnswer {
  const question = input.question.trim();
  if (question === "") {
    return refusalAnswer("Ask a question first.", ["question"]);
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return refusalAnswer(
      "That question is too long. Please keep it under 2000 characters.",
      ["question"],
    );
  }

  const viewer = viewerOf(input);
  // Owner HIDE decisions travel on AskInput.hiddenFactIds and are
  // converted through the existing owner converter, then enforced on the
  // visitor-class projection below (verified owners are exempt inside
  // projectGraphForViewer per the viewer.ts BOUNDARY DECISION).
  const decisions = decisionsFromHiddenFactIds(input.graph, input.hiddenFactIds);
  const { graph } = projectGraphForViewer(input.graph, viewer, decisions);

  // Object-scoped ask: the target must survive the viewer projection.
  // An unknown id or a non-public object fails closed to refusal.
  const target =
    graph.objects.find((o) => o.id === input.targetObjectId) ?? null;
  if (!target) {
    return refusalAnswer(
      "FYD does not have evidence to answer that question: the requested object is not visible in the public record.",
      [`object ${input.targetObjectId}`],
    );
  }

  if (!isServicesQuestion(question)) {
    return refusalAnswer(
      "FYD does not have evidence to answer that question. " +
        "Try asking about the business, its services, contact details, or location.",
      [question.slice(0, 120)],
    );
  }

  if (isUnadvertisedAsk(question)) {
    return refusalAnswer(
      "FYD cannot evidence what this business does not advertise: the record " +
        "only names what the site states, and naming an unadvertised service " +
        "would be a guess.",
      [question.slice(0, 120)],
    );
  }

  // Services branch: service-bearing objects are service-schema objects
  // joined to the target by an active "offers" relationship. Sorted by id
  // so the answer is deterministic.
  const services = sortById(
    graph.objects.filter(
      (o) =>
        o.schema === SERVICE_SCHEMA &&
        graph.relationships.some(
          (r) =>
            r.status === "active" &&
            r.subject === target.id &&
            r.predicate === OFFERS_PREDICATE &&
            r.object === o.id,
        ),
    ),
  );

  if (services.length === 0) {
    return refusalAnswer(
      "FYD does not have evidence for that: the site record names no services for this business.",
      ["services offered"],
    );
  }

  const evidenceRefs: AskEvidenceRef[] = [];
  const claims: AskClaimClassification[] = [];
  const listed: string[] = [];

  services.forEach((svc, i) => {
    const rel = graph.relationships.find(
      (r) =>
        r.status === "active" &&
        r.subject === target.id &&
        r.predicate === OFFERS_PREDICATE &&
        r.object === svc.id,
    );
    // The relationship is guaranteed by the filter above; the guard is
    // belt-and-braces so a claim can never cite a missing rel.
    const relId = rel ? rel.id : `missing-rel:${svc.id}`;
    const citation = citeFact({ objectId: svc.id, field: "name" }, graph, viewer);
    evidenceRefs.push({
      kind: "object",
      id: svc.id,
      label: `Service: ${svc.title}`,
      detail: citation ? citation.detail : "Site record",
    });
    evidenceRefs.push({
      kind: "relationship",
      id: relId,
      label: `${target.title} offers ${svc.title}`,
      detail: citation ? citation.detail : "Site record",
    });
    // The claim epistemic class comes from the service object claimKind
    // through the same mapping citeFact uses: an INFERRED service must
    // never be emitted as a DIRECT fact claim.
    const svcClaimKind =
      typeof svc.fields?.["claimKind"] === "string"
        ? (svc.fields["claimKind"] as string)
        : undefined;
    claims.push({
      claim: `${target.title} offers ${svc.title}.`,
      classification: claimClassFor(svcClaimKind),
      evidenceRefIds: [svc.id, relId],
    });
    // Marker numbering is 1-based into evidenceRefs (types.ts contract).
    // Each service contributes TWO refs (object record, then the
    // offers-relationship record), so the service's visible marker is the
    // odd position of its object record: marker [n] always resolves to
    // evidenceRefs[n-1]. The even positions are the relationship records
    // the claims cite by id. Numbering per service ([i+1]) misattributes
    // every marker past [1] to the previous service's relationship.
    listed.push(`${svc.title} [${2 * i + 1}]`);
  });

  // Derived claim: the count is computed from evidence, labeled DERIVED.
  claims.push({
    claim: `${target.title} offers ${services.length} services in total.`,
    classification: "DERIVED",
    evidenceRefIds: services.map((s) => s.id),
  });

  // "How FYD knows": name the source from the first service's citation.
  const firstCitation = citeFact(
    { objectId: services[0].id, field: "name" },
    graph,
    viewer,
  );
  const sourceLine = firstCitation
    ? `observed from the business website (${firstCitation.source})` +
      (firstCitation.lastChecked ? `, captured ${firstCitation.lastChecked}` : "") +
      `. ${firstCitation.basis}.`
    : "recorded in the site evidence.";

  // If any listed service is an inference rather than a website statement,
  // say so plainly: inferred entries are labeled, not verified.
  const anyInferred = claims.some((c) => c.classification === "INFERRED");
  const answer =
    `${target.title} offers ${services.length} services: ${listed.join(", ")}.\n\n` +
    `How FYD knows: each marker above points to a service record ${sourceLine} ` +
    (anyInferred
      ? `Some entries are FYD's labeled inferences from site data, not the website's own statements; FYD has not independently verified them.`
      : `These are the website's own statements; FYD has not independently verified them.`);

  return {
    ok: true,
    answer,
    refusal: false,
    answerState: "KNOWN",
    claims,
    evidenceRefs,
    unknowns: [],
  };
}

/**
 * Re-exported for tests: the projected graph the answerer reasons over.
 * The decisions channel comes from the input: owner HIDE assertions on
 * AskInput.hiddenFactIds are enforced for visitor-class viewers.
 */
export function projectedGraphFor(
  graph: ObjectGraph,
  input: AskInput,
): ObjectGraph {
  return projectGraphForViewer(
    graph,
    viewerOf(input),
    decisionsFromHiddenFactIds(graph, input.hiddenFactIds),
  ).graph;
}
