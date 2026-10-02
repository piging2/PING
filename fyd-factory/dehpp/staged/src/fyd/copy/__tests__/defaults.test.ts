/**
 * Copy table tests (P5/P6/P7): the renderer looks copy up in data tables,
 * never hardcodes English next to JSX. These tests pin the seeded
 * vocabulary so a table edit is a deliberate, reviewed change.
 */

import {
  claimKindLabel,
  copyArchetype,
  copyFor,
  ctaHeadingFor,
} from "../defaults";

describe("copyFor (P5)", () => {
  test("generic archetype returns the seeded neutral defaults", () => {
    expect(copyFor("generic", "Services")).toBe("Services");
    expect(copyFor("generic", "Products")).toBe("Products");
    expect(copyFor("generic", "Locations")).toBe("Where we work");
    expect(copyFor("generic", "People")).toBe("The people");
    expect(copyFor("generic", "Posts")).toBe("Latest");
    expect(copyFor("generic", "ObjectGrid")).toBe("Browse");
    expect(copyFor("generic", "ObjectFeed")).toBe("Explore");
    expect(copyFor("generic", "RecentObjects")).toBe("Recent");
    expect(copyFor("generic", "Contact")).toBe("Contact");
    expect(copyFor("generic", "Links")).toBe("Find us");
    expect(copyFor("generic", "SocialProof")).toBe("What people say");
    expect(copyFor("generic", "ObjectRail")).toBe("Featured object");
    expect(copyFor("generic", "GenericObjectCard")).toBe("More");
    expect(copyFor("generic", "Gallery")).toBe("Gallery");
  });

  test("unknown section component returns null, never throws", () => {
    expect(copyFor("generic", "Nope")).toBeNull();
  });

  test("unlisted archetypes fall back to the generic column", () => {
    expect(copyFor("trade", "Services")).toBe("Services");
    expect(copyFor("knowledge", "Locations")).toBe("Where we work");
  });
});

describe("copyArchetype", () => {
  test("normalizes the spec archetype into the table vocabulary", () => {
    expect(copyArchetype(null)).toBe("generic");
    expect(copyArchetype(undefined)).toBe("generic");
    expect(copyArchetype("trade")).toBe("trade");
    expect(copyArchetype("knowledge")).toBe("knowledge");
    expect(copyArchetype("technical")).toBe("technical");
    expect(copyArchetype("something-else")).toBe("generic");
  });
});

describe("claimKindLabel (P6)", () => {
  test("the five seeded labels are unchanged", () => {
    expect(claimKindLabel("website_statement")).toBe("Website statement");
    expect(claimKindLabel("site_record")).toBe("Site record");
    expect(claimKindLabel("demo_addition")).toBe("Demo addition");
    expect(claimKindLabel("feed_item")).toBe("Feed item");
    expect(claimKindLabel("mixed_sources")).toBe("Mixed sources");
  });

  test("unknown kinds render raw, never throw", () => {
    expect(claimKindLabel("press_release")).toBe("press_release");
  });
});

describe("ctaHeadingFor (P7)", () => {
  test("every archetype seeds the neutral default", () => {
    expect(ctaHeadingFor("generic")).toBe("Start the conversation");
    expect(ctaHeadingFor("trade")).toBe("Start the conversation");
    expect(ctaHeadingFor("knowledge")).toBe("Start the conversation");
    expect(ctaHeadingFor("technical")).toBe("Start the conversation");
  });
});
