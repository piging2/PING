/**
 * Royal Mirror shape-system tests (Nolan, 2026-09-22): the frozen
 * CIRCLES + OVALS system is enforced at the token layer and in markup.
 *
 * - The ten required tokens exist as usable scalar values:
 *   fyd.color.royal, fyd.color.gold, fyd.surface.mirror, fyd.surface.depth,
 *   fyd.border.gold, fyd.radius.circle, fyd.radius.oval, fyd.shadow.mirror,
 *   fyd.motion.expand, fyd.motion.collapse.
 * - Shape facts: circle radius is 50%, oval radius is 999px, REST_D is 40.
 * - fydMirrorCard is a non-empty reflective surface string.
 * - ObjectPeekCard markup: the popup shell renders with the oval radius
 *   (999px) and carries no rounded-rectangle remnants.
 * - RestSheen renders nothing under prefers-reduced-motion, so the
 *   mirror shimmer is motion-safe by construction.
 *
 * Run: npx jest --config src/fyd/ui/jest.config.cjs
 */

import * as React from "react";
import { renderToString } from "react-dom/server";
import { fyd, fydMirrorCard } from "../object-layer/fyd-tokens";
import {
  ObjectPeekCard,
  ObjectRichCard,
  PEEK_H_EST,
  PEEK_W,
  REST_D,
  RestSheen,
  RICH_H,
  RICH_W,
} from "../object-layer/ObjectCircle";
import type { MarginObjectDescriptor } from "../object-layer/types";

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

describe("required token contract", () => {
  const scalar: Array<[string, unknown]> = [
    ["fyd.color.royal", fyd.color.royal],
    ["fyd.color.gold", fyd.color.gold],
    ["fyd.surface.mirror", fyd.surface.mirror],
    ["fyd.surface.depth", fyd.surface.depth],
    ["fyd.border.gold", fyd.border.gold],
    ["fyd.radius.circle", fyd.radius.circle],
    ["fyd.radius.oval", fyd.radius.oval],
    ["fyd.shadow.mirror", fyd.shadow.mirror],
  ];
  test.each(scalar)("%s exists as a usable scalar value", (_name, value) => {
    expect(typeof value).toBe("string");
    expect((value as string).length).toBeGreaterThan(0);
  });

  // Motion tokens are framer-motion transition configs: the usable value
  // is the object itself, consumed as transition={fyd.motion.expand}.
  test.each([
    ["fyd.motion.expand", fyd.motion.expand],
    ["fyd.motion.collapse", fyd.motion.collapse],
  ])("%s exists as a transition config", (_name, value) => {
    expect(typeof value).toBe("object");
    expect((value as { duration: number }).duration).toBeGreaterThan(0);
  });

  test("fydMirrorCard is a non-empty reflective surface", () => {
    expect(typeof fydMirrorCard).toBe("string");
    expect(fydMirrorCard.length).toBeGreaterThan(0);
  });
});

describe("frozen shape facts", () => {
  test("circle radius is 50%, oval radius is 999px", () => {
    expect(fyd.radius.circle).toBe("50%");
    expect(fyd.radius.oval).toBe("999px");
  });

  test("rest circle stays the small quiet 40px", () => {
    expect(REST_D).toBe(40);
  });

  test("peek is a vertical oval (taller than wide)", () => {
    expect(PEEK_W).toBeLessThan(PEEK_H_EST);
  });

  test("rich expand card is a vertical oval (taller than wide)", () => {
    expect(RICH_W).toBeLessThan(RICH_H);
  });

  test("gold is an edge/detail value, never a whole surface", () => {
    // The token layer exposes no solid-gold surface: gold appears only as
    // a color and a border, never as a background fill token.
    expect(fyd.surface.mirror).not.toContain(fyd.color.gold);
    expect(fydMirrorCard).not.toContain(fyd.color.gold);
  });
});

describe("peek popup markup", () => {
  const html = renderToString(
    <ObjectPeekCard
      descriptor={descriptor}
      onExpand={() => {}}
      onAsk={() => {}}
    />,
  );

  test("popup shell uses the oval radius", () => {
    expect(html).toContain("border-radius:999px");
  });

  test("no rounded-rectangle remnants in the popup", () => {
    expect(html).not.toContain("rounded-[14px]");
    expect(html).not.toContain("border-radius:14px");
  });

  test("expand ring renders concentric ovals, never rounded rectangles", () => {
    const rich = renderToString(<ObjectRichCard descriptor={descriptor} />);
    expect(rich).toContain("border-radius:50%");
    expect(rich).not.toContain("border-radius:20px");
    expect(rich).not.toContain("border-radius:15px");
    expect(rich).not.toContain("border-radius:11px");
  });

  test("no em dashes in rendered strings", () => {
    expect(html).not.toContain("—");
  });
});

describe("reduced motion", () => {
  test("RestSheen omits the shimmer when reduced motion is requested", () => {
    expect(renderToString(<RestSheen reduceMotion={true} />)).toBe("");
  });

  test("RestSheen renders the sweep when motion is allowed", () => {
    const html = renderToString(<RestSheen reduceMotion={false} />);
    expect(html.length).toBeGreaterThan(0);
  });
});
