/**
 * FYD-009 falsification probe (ping-perfecting-pass 2026-09-26).
 * Item proof: "test with one dangling ref fails closed."
 *
 * Usage: copy to fyd-build/src/fyd/ask/__tests__/fyd009-probe.test.ts,
 * run `npx jest src/fyd/ask/__tests__/fyd009-probe.test.ts` from the
 * fyd-build root (loader reads evidence/ relative to cwd), then delete
 * the copy. This file is the durable record of the probe.
 *
 * CASE A exercises the composer-side gate (unresolved ref -> whole-answer
 * refusal). CASE B exercises the FYD-009 post-answer validator itself
 * (withValidatedEvidence in visitor.ts): a ref that resolves to a record
 * but NOT to the snapshot the citing object claims must be dropped, the
 * answer recomposed, and the gap named. Both must fail closed: the
 * tampered object is never cited as support.
 */

import { answerVisitorQuestion } from "../visitor";
import type { AskFydAnswer } from "../types";
import type { ObjectGraph } from "../../sitespec/types";
import { HAPPY_PLACE_GRAPH } from "../../proceduralize/__fixtures__/happy-place-graph";

const QUESTION =
  "What services does this business offer, and how do you know?";
const SERVICE_SCHEMA = "ping.social.service@1";

function clone(): ObjectGraph {
  return JSON.parse(JSON.stringify(HAPPY_PLACE_GRAPH)) as ObjectGraph;
}

function firstService(graph: ObjectGraph) {
  const svc = graph.objects.find((o) => o.schema === SERVICE_SCHEMA);
  if (!svc) throw new Error("fixture has no service object");
  return svc;
}

function ask(graph: ObjectGraph): AskFydAnswer {
  return answerVisitorQuestion({
    siteSlug: "happy-place",
    question: QUESTION,
    graph,
  });
}

describe("FYD-009 dangling evidence_ref fails closed (falsification probe)", () => {
  test("baseline: untampered graph cites all services, no unknowns", () => {
    const answer = ask(clone());
    expect(answer.refusal).toBe(false);
    expect(answer.unknowns).toEqual([]);
    // business + 5 services
    expect(answer.evidence.length).toBe(6);
  });

  test("CASE A: tampered evidence_ref (no observation record) -> no dangling citation", () => {
    const graph = clone();
    const svc = firstService(graph);
    const tamperedId = svc.id;
    const tamperedTitle = svc.title;
    svc.fields["evidence_ref"] = "service-cards:ghost:no-such-service";
    const answer = ask(graph);
    // The tampered service must never appear as cited support.
    for (const citation of answer.evidence) {
      expect(citation.objectId).not.toBe(tamperedId);
    }
    // The answer must not present the tampered service as offered.
    expect(answer.answer).not.toContain(tamperedTitle);
    // The gap is named, not silent.
    expect(answer.unknowns.length).toBeGreaterThan(0);
  });

  test("CASE B: digest mismatch (wrong_snapshot) -> citation dropped, recomposed, gap named", () => {
    const graph = clone();
    const svc = firstService(graph);
    const tamperedId = svc.id;
    const tamperedTitle = svc.title;
    svc.fields["source_digest"] =
      "sha256:0000000000000000000000000000000000000000000000000000000000000000";
    const answer = ask(graph);
    for (const citation of answer.evidence) {
      expect(citation.objectId).not.toBe(tamperedId);
    }
    expect(answer.answer).not.toContain(tamperedTitle);
    // Fail closed means the gap is recorded, not hidden.
    expect(answer.unknowns.some((u) => u.includes(tamperedTitle))).toBe(true);
    // The surviving citations were recomposed with consistent numbering.
    expect(answer.evidence.length).toBe(5);
    answer.evidence.forEach((e, i) => expect(e.n).toBe(i + 1));
  });
});
