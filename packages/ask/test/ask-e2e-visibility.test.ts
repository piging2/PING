/**
 * P0#2 (FYD-010 privacy gate), ask-path wiring: owner HIDE decisions must
 * be threaded END-TO-END through the ask path, not just accepted by the
 * projection boundary.
 *
 * THE GAP: projectGraphForViewer accepts visibilityDecisions, but no
 * caller passes any: askFyd, projectedGraphFor, citeFact, and whyThis all
 * projected with zero decisions, so an owner HIDE never reached an
 * anonymous askFyd answer. AskInput now carries the decisions channel
 * (hiddenFactIds, the existing owner vocabulary); these tests fail until
 * it is wired through every visitor-class answer path.
 *
 * Owner-class callers keep A2's semantics: a verified owner is exempt
 * from their own HIDE decisions and still sees the title.
 */

import { askFyd, projectedGraphFor } from "../src/answer";
import { citeFact, whyThis } from "../src/cite";
import { factIdFor } from "../../owner/src/provenance";
import type { AskInput, ObjectGraph } from "../src/types";

const SECRET_TITLE = "Secret Midnight Service";

function testGraph(): ObjectGraph {
  const provenance = {
    kind: "website-derived",
    ref: "website-ingestion:https://example.com/",
    derivedAt: "2026-10-02T00:00:00Z",
  };
  return {
    objects: [
      {
        id: "biz-1",
        schema: "ping.social.business@1",
        controllerId: "owner-1",
        visibility: "public",
        title: "Test Business",
        description: "A test business.",
        fields: { name: "Test Business" },
        createdAt: "2026-10-02T00:00:00Z",
        updatedAt: "2026-10-02T00:00:00Z",
        provenance,
      },
      {
        id: "svc-1",
        schema: "ping.social.service@1",
        controllerId: "owner-1",
        visibility: "public",
        title: SECRET_TITLE,
        description: "A service the owner hid from the public record.",
        fields: { name: SECRET_TITLE },
        createdAt: "2026-10-02T00:00:00Z",
        updatedAt: "2026-10-02T00:00:00Z",
        provenance,
      },
    ],
    relationships: [
      {
        id: "rel-offers-1",
        subject: "biz-1",
        predicate: "offers",
        object: "svc-1",
        status: "active",
        createdAt: "2026-10-02T00:00:00Z",
        evidenceRef: "website-ingestion:https://example.com/",
      },
    ],
  };
}

const HIDE_SERVICE_TITLE = [factIdFor("svc-1", "title", 0)];

function visitorInput(hiddenFactIds?: string[]): AskInput {
  return {
    targetObjectId: "biz-1",
    graph: testGraph(),
    viewerContext: { viewerClass: "visitor", viewerId: null },
    question: "What services does this business offer?",
    hiddenFactIds,
  };
}

describe("end-to-end ask enforces owner HIDE decisions (P0#2)", () => {
  test("FALSIFIES THE GAP: an owner-HIDE'd service title never reaches an anonymous askFyd answer", () => {
    const answer = askFyd(visitorInput(HIDE_SERVICE_TITLE));
    expect(answer.refusal).toBe(false);
    expect(answer.answer).not.toContain(SECRET_TITLE);
    expect(JSON.stringify(answer.claims)).not.toContain(SECRET_TITLE);
    expect(JSON.stringify(answer.evidenceRefs)).not.toContain(SECRET_TITLE);
  });

  test("control: without decisions the title still reaches the answer", () => {
    const answer = askFyd(visitorInput());
    expect(answer.refusal).toBe(false);
    expect(answer.answer).toContain(SECRET_TITLE);
  });

  test("the verified owner is exempt: they still get the HIDE'd title", () => {
    const answer = askFyd({
      ...visitorInput(HIDE_SERVICE_TITLE),
      viewerContext: { viewerClass: "owner", viewerId: "owner-1" },
    });
    expect(answer.refusal).toBe(false);
    expect(answer.answer).toContain(SECRET_TITLE);
  });

  test("projectedGraphFor honors hiddenFactIds for visitor-class input", () => {
    const input = visitorInput(HIDE_SERVICE_TITLE);
    const projected = projectedGraphFor(input.graph, input);
    const svc = projected.objects.find((o) => o.id === "svc-1");
    expect(svc).toBeDefined();
    expect(svc!.title).toBe("");
  });

  test("citeFact honors hiddenFactIds: a HIDE'd title cites null", () => {
    const hidden = citeFact(
      { objectId: "svc-1", field: "title" },
      testGraph(),
      null,
      HIDE_SERVICE_TITLE,
    );
    expect(hidden).toBeNull();
    const visible = citeFact(
      { objectId: "svc-1", field: "title" },
      testGraph(),
      null,
    );
    expect(visible).not.toBeNull();
  });

  test("whyThis honors hiddenFactIds: a HIDE'd title yields no observation", () => {
    const hidden = whyThis(
      { objectId: "svc-1", field: "title" },
      testGraph(),
      null,
      HIDE_SERVICE_TITLE,
    );
    expect(hidden).toBeNull();
    const visible = whyThis(
      { objectId: "svc-1", field: "title" },
      testGraph(),
      null,
    );
    expect(visible).not.toBeNull();
  });

  test("unknown hidden fact ids are ignored, never fatal", () => {
    const answer = askFyd(visitorInput(["fact-0000000000000000"]));
    expect(answer.refusal).toBe(false);
    expect(answer.answer).toContain(SECRET_TITLE);
  });
});
