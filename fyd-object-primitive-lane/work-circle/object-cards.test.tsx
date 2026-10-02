/**
 * Tests for the Circle's compact projection contract and markup rules
 * (Nolan, 2026-09-22 visual correction: REST -> OBJECT -> ASK; hover
 * opens the compact card directly, there is no peek card and no Expand).
 *
 * - compactActionsFor: schema + evidence + capabilities -> ranked actions
 *   (Website, Contact, Follow, Like, Ask FYD last). An action renders only
 *   when the underlying value exists and passes URL safety; the "view"
 *   capability never renders; call+email collapse into one Contact;
 *   address/location schemas never expose Like or Follow.
 * - budgetShortDescription / shortDescriptionFor: one sentence, ~80-140
 *   chars, never invented. Precedence: owner-authored > derived
 *   presentation > source-excerpt fallback.
 * - compactProjectionFor: the Circle's information budget for Happy Place
 *   AND Coppersmith through the same generic component.
 * - shouldShowFollowReceipt: only a server-confirmed false -> true
 *   transition earns the receipt.
 - ObjectCardBody markup (STATE 2): identity, punchy description,
 *   contact, coherent two-column action grid, full-width Ask FYD; NO
 *   scrollbars; suggestions never leak into the compact card.
 * - askRequestBody: objectId is included only when known.
 *
 * Run: npx jest --config src/fyd/ui/jest.config.cjs
 */

import * as React from "react";
import { renderToString } from "react-dom/server";
import {
  OBJECT_H,
  OBJECT_W,
  ObjectCardBody,
  REST_D,
  RICH_H,
  RICH_W,
  actionAllowedBySchema,
  compactActionsFor,
  compactProjectionFor,
  shouldShowFollowReceipt,
  shortDescriptionFor,
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

function happyPlaceProjection(): ObjectProjection {
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
    facts: [fact("License", "CCB# 254240", "observed")],
    people: [],
    externalIdentities: [],
    serviceRefs: [
      ref("svc-1", "Repairs", "Offers", "observed"),
      ref("svc-2", "Fencing", "Offers", "observed"),
    ],
    locationRef: null,
    contact: {
      phone: fact("Phone", "(555) 123-4567", "observed"),
      email: null,
      website: null,
    },
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

function coppersmithProjection(): ObjectProjection {
  return {
    id: "coppersmith-plumbing",
    schema: "fyd:Business",
    kindLabel: "Business",
    name: "Coppersmith Plumbing - HVAC - Mechanical",
    category: fact("Category", "Plumbing", "observed"),
    location: fact("Location", "Grand Junction, CO, US", "observed"),
    summary: fact(
      "Summary",
      "Family-owned plumbing and HVAC company serving the Grand Valley for over two decades.",
      "observed",
    ),
    facts: [],
    people: [],
    externalIdentities: [],
    serviceRefs: [ref("svc-9", "Drain cleaning", "Offers", "observed")],
    locationRef: null,
    contact: {
      phone: fact("Phone", "(970) 555-0199", "observed"),
      email: fact("Email", "hello@coppersmithplumbing.com", "observed"),
      website: null,
    },
    capabilities: [
      { kind: "ask" },
      { kind: "follow" },
      { kind: "like" },
      { kind: "call", href: "tel:+19705550199", label: "Call" },
      { kind: "website", href: "https://coppersmithplumbing.com", label: "Website" },
      { kind: "view" },
    ],
    provenance: {
      label: "Information observed on coppersmithplumbing.com",
      ref: "website-ingestion:https://coppersmithplumbing.com/",
      derivedAt: "2026-09-21",
    },
    sampleQuestions: ["Do you offer emergency service?"],
    ownerUpdatedAt: null,
    media: [],
  };
}

function descriptorFor(objectId: string, name: string, websiteUrl: string | null): MarginObjectDescriptor {
  return {
    objectId,
    name,
    imageSrc: null,
    imageSrcSet: null,
    websiteUrl,
    anchorKey: objectId,
    priority: 100,
  };
}

describe("rest geometry", () => {
  test("rest diameter is the small quiet 40px", () => {
    expect(REST_D).toBe(40);
  });

  test("STATE 2 object card is a compact vertical oval: 300 wide, 400 tall", () => {
    expect(OBJECT_W).toBe(300);
    expect(OBJECT_H).toBe(400);
    expect(OBJECT_W).toBeLessThan(OBJECT_H);
  });

  test("STATE 3 ask mode is a vertical oval: 300 wide, 460 tall", () => {
    expect(RICH_W).toBe(300);
    expect(RICH_H).toBe(460);
    expect(RICH_W).toBeLessThan(RICH_H);
  });
});

describe("compactActionsFor: schema + evidence + capabilities", () => {
  test("empty capabilities -> no actions", () => {
    expect(compactActionsFor("fyd:Business", [], null)).toEqual([]);
  });

  test("the view capability never renders an action", () => {
    expect(compactActionsFor("fyd:Business", [{ kind: "view" }], null)).toEqual([]);
  });

  test("ranked order: website, contact, follow, like, ask last", () => {
    const caps: ObjectCapability[] = [
      { kind: "ask" },
      { kind: "follow" },
      { kind: "like" },
      { kind: "call", href: "tel:+15551234567", label: "Call" },
      { kind: "email", href: "mailto:hello@example.com", label: "Email" },
      { kind: "website", href: "https://happyplacecarpentry.com", label: "Website" },
    ];
    const actions = compactActionsFor("fyd:Business", caps, null);
    expect(actions.map((a) => a.kind)).toEqual([
      "website",
      "contact",
      "follow",
      "like",
      "ask",
    ]);
  });

  test("call and email collapse into one Contact, call preferred", () => {
    const actions = compactActionsFor(
      "fyd:Business",
      [
        { kind: "call", href: "tel:+15551234567", label: "Call" },
        { kind: "email", href: "mailto:hello@example.com", label: "Email" },
      ],
      null,
    );
    expect(actions).toEqual([
      { kind: "contact", label: "Contact", href: "tel:+15551234567" },
    ]);
  });

  test("email-only object gets a mailto Contact", () => {
    const actions = compactActionsFor(
      "fyd:Business",
      [{ kind: "email", href: "mailto:hello@example.com", label: "Email" }],
      null,
    );
    expect(actions).toEqual([
      { kind: "contact", label: "Contact", href: "mailto:hello@example.com" },
    ]);
  });

  test("website falls back to the evidence-backed descriptor URL", () => {
    const actions = compactActionsFor(
      "fyd:Business",
      [{ kind: "ask" }],
      "https://happyplacecarpentry.com",
    );
    expect(actions.map((a) => a.kind)).toEqual(["website", "ask"]);
    expect(actions[0]?.href).toBe("https://happyplacecarpentry.com");
  });

  test("unsafe website URLs never render", () => {
    const actions = compactActionsFor(
      "fyd:Business",
      [{ kind: "website", href: "javascript:alert(1)", label: "Website" }],
      null,
    );
    expect(actions.some((a) => a.kind === "website")).toBe(false);
  });

  test("an address never exposes Like or Follow", () => {
    expect(actionAllowedBySchema("fyd:Address", "like")).toBe(false);
    expect(actionAllowedBySchema("fyd:Address", "follow")).toBe(false);
    expect(actionAllowedBySchema("fyd:Address", "website")).toBe(true);
    const actions = compactActionsFor(
      "fyd:Address",
      [{ kind: "like" }, { kind: "follow" }, { kind: "ask" }],
      null,
    );
    expect(actions.map((a) => a.kind)).toEqual(["ask"]);
  });

  test("a person keeps Follow", () => {
    const actions = compactActionsFor(
      "fyd:Person",
      [{ kind: "follow" }, { kind: "ask" }],
      null,
    );
    expect(actions.map((a) => a.kind)).toEqual(["follow", "ask"]);
  });
});

describe("short description: one sentence, budgeted, never invented", () => {
  test("owner-authored copy wins and is marked owner", () => {
    const d = shortDescriptionFor({
      ownerShortDescription: "Custom carpentry, repairs, and finish work built to last.",
      category: "Carpentry",
      summary: "Licensed Oregon carpentry contractor building decks and fences.",
    });
    expect(d?.source).toBe("owner");
    expect(d?.text).toBe("Custom carpentry, repairs, and finish work built to last.");
  });

  test("derived presentation composes category, location, services", () => {
    const d = shortDescriptionFor({
      category: "Carpentry",
      location: "Adair Village, OR, US",
      services: ["Repairs", "Fencing"],
    });
    expect(d?.source).toBe("derived");
    expect(d?.text).toBe("Carpentry in Adair Village, OR, US: Repairs, Fencing.");
  });

  test("source excerpt fallback uses the first sentence of the summary", () => {
    const d = shortDescriptionFor({
      summary:
        "Licensed Oregon carpentry contractor building decks and fences. Second sentence here.",
    });
    expect(d?.source).toBe("excerpt");
    expect(d?.text).toBe(
      "Licensed Oregon carpentry contractor building decks and fences.",
    );
  });

  test("long text is cut at a word boundary within budget", () => {
    const long =
      "Licensed Oregon carpentry contractor building decks and fences and pergolas and gazebos and outdoor kitchens and custom staircases for lovely clients everywhere.";
    const d = shortDescriptionFor({ summary: long });
    expect(d!.text.length).toBeLessThanOrEqual(141);
    expect(d!.text.endsWith("…")).toBe(true);
    expect(d!.text).not.toMatch(/\S…$/);
  });

  test("null when there is nothing to project", () => {
    expect(shortDescriptionFor({})).toBeNull();
  });
});

describe("compactProjectionFor: the Circle's information budget", () => {
  test("Happy Place projects identity, description, contact, actions", () => {
    const p = happyPlaceProjection();
    const d = descriptorFor("happy-place", p.name, "https://happyplacecarpentry.com");
    const c = compactProjectionFor(p, d);
    expect(c.display_name).toBe("Happy Place Carpentry LLC");
    expect(c.object_type).toBe("Business");
    expect(c.short_description?.source).toBe("derived");
    expect(c.short_description!.text.length).toBeLessThanOrEqual(141);
    expect(c.location_summary).toBe("Adair Village, OR, US");
    expect(c.contact_summary.phone).toBe("(555) 123-4567");
    expect(c.primary_url).toBe("https://happyplacecarpentry.com");
    expect(c.available_actions.map((a) => a.kind)).toEqual([
      "website",
      "contact",
      "follow",
      "like",
      "ask",
    ]);
  });

  test("Coppersmith projects through the same component with different data", () => {
    const p = coppersmithProjection();
    const d = descriptorFor("coppersmith-plumbing", p.name, "https://coppersmithplumbing.com");
    const c = compactProjectionFor(p, d);
    expect(c.display_name).toBe("Coppersmith Plumbing - HVAC - Mechanical");
    expect(c.location_summary).toBe("Grand Junction, CO, US");
    expect(c.primary_url).toBe("https://coppersmithplumbing.com");
    expect(c.available_actions.map((a) => a.kind)).toEqual([
      "website",
      "contact",
      "follow",
      "like",
      "ask",
    ]);
    expect(c.short_description?.text).not.toBe(
      compactProjectionFor(
        happyPlaceProjection(),
        descriptorFor("happy-place", "Happy Place Carpentry LLC", "https://happyplacecarpentry.com"),
      ).short_description?.text,
    );
  });

  test("unknown-evidence values are omitted, never guessed", () => {
    const p = happyPlaceProjection();
    p.summary = fact("Summary", "Invented prose", "unknown");
    p.location = null;
    p.contact.phone = null;
    const d = descriptorFor("happy-place", p.name, null);
    d.location = null;
    const c = compactProjectionFor(p, d);
    // Category still observed -> derived tier fires without location.
    expect(c.short_description?.source).toBe("derived");
    expect(c.location_summary).toBeNull();
    expect(c.contact_summary.phone).toBeNull();
  });

  test("owner short-description override outranks derivation", () => {
    const p = happyPlaceProjection();
    const d = descriptorFor("happy-place", p.name, "https://happyplacecarpentry.com");
    d.shortDescription = "Custom carpentry, repairs, and finish work built to last.";
    const c = compactProjectionFor(p, d);
    expect(c.short_description?.source).toBe("owner");
    expect(c.short_description?.text).toBe(
      "Custom carpentry, repairs, and finish work built to last.",
    );
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

describe("ObjectCardBody markup: STATE 2, compact, never scrolls", () => {
  function renderBody(p: ObjectProjection, d: MarginObjectDescriptor): string {
    return renderToString(
      <ObjectCardBody
        data={compactProjectionFor(p, d)}
        descriptor={d}
        onAsk={() => {}}
      />,
    );
  }

  const hp = happyPlaceProjection();
  const hpDescriptor = descriptorFor("happy-place", hp.name, "https://happyplacecarpentry.com");
  const html = renderBody(hp, hpDescriptor);

  test("name, description, and contact are immediately visible", () => {
    expect(html).toContain("Happy Place Carpentry LLC");
    expect(html).toContain("Business · Adair Village, OR, US");
    expect(html).toContain("Carpentry in Adair Village, OR, US: Repairs, Fencing.");
    expect(html).toContain("(555) 123-4567");
  });

  test("no scrollbars: no overflow scrolling anywhere in the compact card", () => {
    expect(html).not.toContain("overflow-y:auto");
    expect(html).not.toContain("overflow-y:scroll");
    expect(html).not.toContain("overflow:auto");
    expect(html).not.toContain("overflow-x:auto");
    expect(html).not.toContain("overflow-x:scroll");
  });

  test("Website is a first-class action", () => {
    expect(html).toContain("Website");
  });

  test("Follow and Like sit side-by-side in the two-column grid", () => {
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("Follow");
    expect(html).toContain("Like");
  });

  test("Ask FYD is one full-width action, visible but not dominant", () => {
    expect(html).toContain("Ask FYD");
    expect(html).toContain("w-full");
  });

  test("Ask FYD suggestions never leak into the compact card", () => {
    expect(html).not.toContain("What services do you offer?");
  });

  test("same component renders Coppersmith with its own data", () => {
    const cp = coppersmithProjection();
    const cd = descriptorFor(
      "coppersmith-plumbing",
      cp.name,
      "https://coppersmithplumbing.com",
    );
    const cHtml = renderBody(cp, cd);
    expect(cHtml).toContain("Coppersmith Plumbing - HVAC - Mechanical");
    expect(cHtml).toContain("Grand Junction, CO, US");
    expect(cHtml).toContain("Website");
    expect(cHtml).not.toContain("Happy Place Carpentry LLC");
  });

  test("no em dashes in rendered strings", () => {
    expect(html).not.toContain("—");
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
