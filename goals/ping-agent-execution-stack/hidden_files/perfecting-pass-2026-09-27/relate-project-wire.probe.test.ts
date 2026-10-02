/**
 * FALSIFICATION PROBE for objectgraph-relate-output-dropped
 * (FYD_EXECUTABLE_HARVEST.md G6; backlog P2 OBJECT COMPILATION).
 *
 * Invariant: the RELATE stage is not dead weight. The links_to pairs that
 * relate() emits for social URLs must reach the PROJECT stage's output
 * graph as relationships with evidence refs.
 *
 * EXPECTED STATE: FAILS at HEAD (project() has no pairs parameter; the
 * pairs die at the stage boundary). Passes once the wiring lands.
 */
import {
  relate,
  project,
  __resetProjectCounter,
  ExtractedField,
} from "../proceduralizer";

const NOW = "2026-09-27T12:00:00.000Z";

function mk(
  name: string,
  value: string | string[],
): ExtractedField {
  return {
    name,
    value,
    sourceUrl: "https://acme.example/",
    sourceType: "html" as const,
    observedAt: NOW,
    evidenceRef: "ev:" + name,
    confidence: 1.0,
    public: true,
    claimKind: "website_statement" as const,
  };
}

describe("relate -> project wiring (objectgraph-relate-output-dropped)", () => {
  beforeEach(() => {
    __resetProjectCounter();
  });

  test("links_to pairs emitted by relate() appear in project()'s graph", () => {
    const fields = [
      mk("title", "Acme Plumbing"),
      mk("socials", ["https://facebook.com/acme", "https://instagram.com/acme"]),
    ];
    const pairs = relate(fields);
    expect(pairs).toHaveLength(2);

    const g = project(fields, "https://acme.example", NOW, "controller-1", pairs);

    const links = g.relationships.filter((r) => r.predicate === "links_to");
    expect(links).toHaveLength(2);
    const businessId = g.objects[0].id;
    for (const l of links) {
      expect(l.subject).toBe(businessId);
      expect(typeof l.object).toBe("string");
      expect(l.object).toMatch(/^https:\/\//);
      expect(l.evidenceRef).toBeTruthy();
      expect(l.status).toBe("active");
    }
    const targets = links.map((l) => l.object).sort();
    expect(targets).toEqual([
      "https://facebook.com/acme",
      "https://instagram.com/acme",
    ]);
  });

  test("no pairs: no links_to relationships, no regression", () => {
    const g = project([mk("title", "Acme")], "https://acme.example", NOW, "controller-1", []);
    expect(
      g.relationships.filter((r) => r.predicate === "links_to"),
    ).toHaveLength(0);
  });
});
