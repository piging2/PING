/**
 * Tests for the peek/rich card data contract and markup rules of the
 * object-primitive lane (Nolan, 2026-09-22: REST -> PEEK -> EXPAND ->
 * ACT -> RECEIPT).
 *
 * - richActionsFor: capability-only actions (an action renders only when
 *   the underlying capability exists; the "view" capability never
 *   renders an action).
 * - richCardDataFor: unknown-evidence values are omitted (never
 *   guessed); "Service"-label facts are covered by the services section
 *   and not duplicated; empty sections are the caller's cue to omit the
 *   heading.
 * - shouldShowFollowReceipt: only a server-confirmed false -> true
 *   transition earns the receipt.
 * - ObjectPeekCard markup: identity + essential context + exactly the
 *   three entry actions (Ask FYD, Follow, Expand); null fields are
 *   omitted; REST_D is 40; rendered strings contain no em dashes.
 * - askRequestBody: objectId is included only when known.
 *
 * Run: npx jest --config src/fyd/ui/jest.config.cjs
 */

import * as React from "react";
import { renderToString } from "react-dom/server";
import {
  ObjectPeekCard,
  ObjectRichCard,
  PEEK_H_EST,
  PEEK_W,
  REST_D,
  RICH_H,
  RICH_W,
  richActionsFor,
  richCardDataFor,
  shouldShowFollowReceipt,
} from "../object-layer/ObjectCircle";
import { askRequestBody } from "../ask-object-panel";
import type { MarginObjectDescriptor } from "../object-layer/types";
import type {
  Fact,
  ObjectCapability,
  ObjectProjection,
  RelatedRef,
} from "@/fyd/object/object-projection";

const observed = { state: "observed" as const };
const unknown = { state: "unknown" as const };

function fact(label: string, value: string, state: "observed" | "unknown"): Fact {
  return { label, value, evidence: state === "observed" ? observed : unknown };
}

function ref(
  id: string,
  name: string,
  relation: string,
  state: "observed" | "unknown",
): RelatedRef {
  return {
    id,
    name,
    kindLabel: "Service",
    relation,
    evidence: state === "observed" ? observed : unknown,
  };
}

function baseProjection(): ObjectProjection {
  return {
    id: "happy-place",
    schema: "fyd:Business",
    kindLabel: "Business",
    name: "Happy Place Carpentry LLC",
    category: fact("Category", "Carpentry", "observed"),
    location: fact("Location", "Adair Village, OR, US", "observed"),
    summary: fact(
      "Summary",
      "Licensed Oregon carpentry contractor building decks and fences.",
      "observed",
    ),
    facts: [
      fact("License", "CCB# 254240", "observed"),
      fact("Service", "Repairs", "observed"),
      fact("Service area", "Adair Village", "observed"),
      fact("Founded", "2020", "unknown"),
    ],
    people: [ref("person-1", "Nolan Geske", "Founder", "observed")],
    externalIdentities: [],
    serviceRefs: [
      ref("svc-1", "Repairs", "Offers", "observed"),
      ref("svc-2", "Fencing", "Offers", "observed"),
      ref("svc-3", "Mystery", "Offers", "unknown"),
    ],
    locationRef: null,
    contact: { phone: null, email: null, website: null },
    capabilities: [
      { kind: "ask" },
      { kind: "follow" },
      { kind: "like" },
      { kind: "call", href: "tel:+15551234567", label: "Call" },
      { kind: "email", href: "mailto:hello@example.com", label: "Email" },
      { kind: "website", href: "https://happyplacecarpentry.com", label: "Website" },
      { kind: "view" },
    ],
    provenance: {
      label: "Information observed on happyplacecarpentry.com",
      ref: "website-ingestion:https://happyplacecarpentry.com/",
      derivedAt: "2026-09-21",
    },
    sampleQuestions: ["What services do you offer?"],
    ownerUpdatedAt: null,
    media: [],
  };
}

const descriptor: MarginObjectDescriptor = {
  objectId: "happy-place",
  name: "Happy Place Carpentry LLC",
  imageSrc: null,
  imageSrcSet: null,
  websiteUrl: "https://happyplacecarpentry.com",
  anchorKey: "happy-place",
  priority: 100,
  category: "Carpentry",
  location: "Adair Village, OR, US",
  whyHere: "Licensed Oregon carpentry contractor building decks and fences.",
};

describe("rest geometry", () => {
  test("rest diameter is the small quiet 40px", () => {
    expect(REST_D).toBe(40);
  });

  test("peek card is a vertical oval: 200 wide, 300 tall", () => {
    expect(PEEK_W).toBe(200);
    expect(PEEK_H_EST).toBe(300);
    expect(PEEK_W).toBeLessThan(PEEK_H_EST);
  });

  test("rich card is a vertical oval: 300 wide, 460 tall", () => {
    expect(RICH_W).toBe(300);
    expect(RICH_H).toBe(460);
    expect(RICH_W).toBeLessThan(RICH_H);
  });
});

describe("expand-path shapes: ovals only, no rectangles", () => {
  test("peek popup shell renders the fixed vertical-oval dimensions", () => {
    const html = renderToString(
      <ObjectPeekCard descriptor={descriptor} onExpand={() => {}} onAsk={() => {}} />,
    );
    expect(html).toContain("width:200px");
    expect(html).toContain("height:300px");
    expect(html).toContain("border-radius:999px");
  });

  test("rich expand ring is a concentric oval, not a rounded rectangle", () => {
    const html = renderToString(<ObjectRichCard descriptor={descriptor} />);
    expect(html).toContain("border-radius:50%");
    expect(html).not.toContain("border-radius:20px");
    expect(html).not.toContain("border-radius:15px");
    expect(html).not.toContain("border-radius:11px");
    expect(html).toContain("width:300px");
    expect(html).toContain("height:460px");
  });
});

describe("richActionsFor: capability-only actions", () => {
  test("empty capabilities -> no actions", () => {
    expect(richActionsFor([])).toEqual([]);
  });

  test("the view capability never renders an action", () => {
    expect(richActionsFor([{ kind: "view" }])).toEqual([]);
  });

  test("every non-view capability renders exactly once, in order", () => {
    const caps: ObjectCapability[] = [
      { kind: "ask" },
      { kind: "follow" },
      { kind: "like" },
      { kind: "call", href: "tel:+15551234567", label: "Call" },
      { kind: "email", href: "mailto:hello@example.com", label: "Email" },
      { kind: "website", href: "https://happyplacecarpentry.com", label: "Website" },
    ];
    const actions = richActionsFor(caps);
    expect(actions.map((a) => a.kind)).toEqual([
      "ask",
      "follow",
      "like",
      "call",
      "email",
      "website",
    ]);
    expect(actions.find((a) => a.kind === "call")?.href).toBe("tel:+15551234567");
    expect(actions.find((a) => a.kind === "website")?.href).toBe(
      "https://happyplacecarpentry.com",
    );
  });

  test("an object without an email capability has no Email action", () => {
    const actions = richActionsFor([
      { kind: "call", href: "tel:+15551234567", label: "Call" },
      { kind: "website", href: "https://example.com", label: "Website" },
    ]);
    expect(actions.some((a) => a.kind === "email")).toBe(false);
    expect(actions.map((a) => a.kind)).toEqual(["call", "website"]);
  });
});

describe("richCardDataFor: evidence-backed sections, nothing invented", () => {
  test("known summary, facts, services, people, provenance flow through", () => {
    const d = richCardDataFor(baseProjection());
    expect(d.name).toBe("Happy Place Carpentry LLC");
    expect(d.kindLabel).toBe("Business");
    expect(d.location).toBe("Adair Village, OR, US");
    expect(d.summary).toContain("Licensed Oregon carpentry contractor");
    expect(d.facts).toEqual([
      { label: "License", value: "CCB# 254240" },
      { label: "Service area", value: "Adair Village" },
    ]);
    expect(d.services.map((s) => s.name)).toEqual(["Repairs", "Fencing"]);
    expect(d.people.map((p) => p.name)).toEqual(["Nolan Geske"]);
    expect(d.hasAsk).toBe(true);
    expect(d.sampleQuestions).toEqual(["What services do you offer?"]);
    expect(d.provenanceLabel).toBe(
      "Information observed on happyplacecarpentry.com",
    );
  });

  test("unknown-evidence values are omitted, never guessed", () => {
    const p = baseProjection();
    p.summary = fact("Summary", "Invented prose", "unknown");
    p.location = null;
    const d = richCardDataFor(p);
    expect(d.summary).toBeNull();
    expect(d.location).toBeNull();
    expect(d.facts.some((f) => f.label === "Founded")).toBe(false);
    expect(d.services.some((s) => s.name === "Mystery")).toBe(false);
  });

  test("Service-label facts are covered by the services section, not duplicated", () => {
    const d = richCardDataFor(baseProjection());
    expect(d.facts.some((f) => f.label === "Service")).toBe(false);
    expect(d.services.length).toBeGreaterThan(0);
  });

  test("no ask capability -> no Ask section", () => {
    const p = baseProjection();
    p.capabilities = p.capabilities.filter((c) => c.kind !== "ask");
    const d = richCardDataFor(p);
    expect(d.hasAsk).toBe(false);
    expect(d.actions.some((a) => a.kind === "ask")).toBe(false);
  });
});

describe("shouldShowFollowReceipt", () => {
  test("server-confirmed false -> true earns the receipt", () => {
    expect(shouldShowFollowReceipt(false, true)).toBe(true);
  });

  test("initial load never earns the receipt", () => {
    expect(shouldShowFollowReceipt(null, true)).toBe(false);
    expect(shouldShowFollowReceipt(null, false)).toBe(false);
  });

  test("no transition, no receipt", () => {
    expect(shouldShowFollowReceipt(true, true)).toBe(false);
    expect(shouldShowFollowReceipt(false, false)).toBe(false);
    expect(shouldShowFollowReceipt(true, false)).toBe(false);
    expect(shouldShowFollowReceipt(null, null)).toBe(false);
  });
});

describe("ObjectPeekCard markup", () => {
  const html = renderToString(
    <ObjectPeekCard
      descriptor={descriptor}
      onExpand={() => {}}
      onAsk={() => {}}
    />,
  );

  test("is the peek card, labeled with the name", () => {
    expect(html).toContain('data-object-card="peek"');
    expect(html).toContain('aria-label="Happy Place Carpentry LLC: quick preview"');
  });

  test("shows identity + essential context", () => {
    expect(html).toContain("Happy Place Carpentry LLC");
    expect(html).toContain("Carpentry · Adair Village, OR, US");
    expect(html).toContain(
      "Licensed Oregon carpentry contractor building decks and fences.",
    );
  });

  test("has exactly the three entry actions", () => {
    expect(html).toContain("Ask FYD");
    expect(html).toContain("Follow");
    expect(html).toContain("Expand");
  });

  test("no em dashes in rendered strings", () => {
    expect(html).not.toContain("—");
  });

  test("null fields are omitted, never invented", () => {
    const sparse = renderToString(
      <ObjectPeekCard
        descriptor={{ ...descriptor, category: null, location: null, whyHere: null }}
        onExpand={() => {}}
        onAsk={() => {}}
      />,
    );
    expect(sparse).toContain("Happy Place Carpentry LLC");
    expect(sparse).not.toContain("Adair Village");
    expect(sparse).not.toContain("contractor building decks");
  });
});

describe("askRequestBody: object targeting", () => {
  test("includes objectId when known", () => {
    expect(askRequestBody("happy-place", "happy-place", "What do you do?")).toEqual({
      siteId: "happy-place",
      objectId: "happy-place",
      question: "What do you do?",
      mode: "visitor",
    });
  });

  test("omits objectId when unknown", () => {
    const body = askRequestBody("happy-place", undefined, "What do you do?");
    expect(body).toEqual({
      siteId: "happy-place",
      question: "What do you do?",
      mode: "visitor",
    });
    expect("objectId" in body).toBe(false);
  });
});
