/**
 * GRAPH PROPERTIES — fast-check entityGraph over fixture-shaped graphs.
 *
 * Generates arbitrary business/service/location/person topologies (random
 * visibility, random service counts, optional location/person) and runs
 * each through the production path: buildAskFydContext (FYD-010
 * projection) -> composeAskFyd. The epistemic invariants must hold for
 * EVERY generated graph, not just the two fixtures:
 *   1. TOTALITY: the path never throws.
 *   2. EVIDENCE CLOSURE: every evidenceRef id resolves to an object in
 *      the projected context (no dangling refs).
 *   3. PRIVACY: no private-visibility object appears in evidence refs,
 *      and its title never appears in the answer text.
 *   4. DETERMINISM: the same graph asked twice yields the same answer
 *      digest.
 *
 * FALSIFIABILITY QUESTIONNAIRE
 * WHAT INVARIANT? The four properties above, universally quantified over
 *   fixture-shaped graphs.
 * WHO OWNS IT? projectAskContextForViewer (src/fyd/ask/context-projection.ts)
 *   and composeAskFyd (src/lib/ping/ask-composer.ts); this file owns the
 *   generator and the mapping.
 * HOW CAN IT FAIL? A generated topology where a private object leaks, a
 *   dangling evidence ref, or a crash (shrinking finds the minimal graph).
 * WHAT ATTACK DISPROVES IT? The generator itself: random visibility flips
 *   and cardinalities are the attack.
 * WHAT EVIDENCE PROVES IT? fast-check run report; the seed on failure.
 * CAN IT BE REPLAYED? Yes: fixed fixtures as node templates + printed seed.
 * DOES THE FAILURE BECOME PERMANENT REGRESSION KNOWLEDGE? Yes: the shrunk
 *   graph becomes a pinned fixture case.
 * WHY CAN EXISTING RUNNER + LIBRARY + EXISTING PING AUTHORITY NOT EXPRESS
 *   THIS? Existing tests use two fixed graphs; none quantify over graph
 *   shape. fast-check's entityGraph (4.9) is the only in-repo generator
 *   for interconnected entities; no new framework was added.
 */
import fc from "fast-check";
import { createHash } from "node:crypto";
import { buildAskFydContext } from "@/fyd/ask/context-builder";
import { composeAskFyd } from "@/fyd/ask/answer";
import type { PingObject } from "@/lib/ping/types";

const QUESTION = "Tell me about the business.";

function mkObject(
  id: string,
  schema: string,
  title: string,
  visibility: string,
  fields: Record<string, string | string[]>,
): PingObject {
  return {
    id,
    schema,
    controllerId: "identity_fyd_compiler_test",
    visibility: visibility as PingObject["visibility"],
    title,
    description: `${title} description.`,
    fields,
    createdAt: "2026-09-21T13:50:00Z",
    updatedAt: "2026-09-21T13:50:00Z",
    provenance: {
      kind: "website-derived",
      ref: "website-ingestion:https://example.com/",
      derivedAt: "2026-09-21T13:50:00Z",
    },
  } as PingObject;
}

const visArb = fc.constantFrom("public", "private");
// Titles carry a visibility-distinct prefix so a private title can never
// be a substring of a public title (avoids false substring matches).
// The seed/title combination happens in mapGraph, where the entity's
// own visibility is known.
const seedArb = fc.string({ minLength: 4, maxLength: 12 }).filter((s) => /^[A-Za-z0-9]+$/.test(s));


const graphArb = (fc as any).entityGraph(
  {
    business: {
      title: fc.constant("Test Business"),
      visibility: visArb,
    },
    service: { titleSeed: seedArb, visibility: visArb },
    location: { title: fc.constant("Test City, TS"), visibility: visArb },
    person: { titleSeed: seedArb, visibility: visArb },
  },
  {
    business: {
      offers: { arity: "many", type: "service" },
      located_at: { arity: "0-1", type: "location" },
    },
    service: {},
    location: {},
    person: { works_for: { arity: "1", type: "business" } },
  },
  {
    initialPoolConstraints: {
      business: { minLength: 1, maxLength: 1 },
      service: { maxLength: 4 },
      location: { maxLength: 1 },
      person: { maxLength: 2 },
    },
  },
);

interface MappedGraph {
  objects: PingObject[];
  relationships: any[];
  businessId: string;
  privateIds: Set<string>;
  privateTitles: string[];
}

function mapGraph(g: any): MappedGraph {
  const objects: PingObject[] = [];
  const relationships: any[] = [];
  const privateIds = new Set<string>();
  const privateTitles: string[] = [];
  const idOf = new Map<object, string>();

  const biz = g.business[0];
  const business = mkObject("test-business", "ping.social.business@1", "Test Business", biz.visibility, {
    phone: "970-245-3869",
    hours: "Mo-Fr 09:00-17:00",
    // NOTE: no locality field here: the location object carries the
    // address fact, so a private location cannot false-positive against
    // a public business field.
  });
  objects.push(business);
  if (biz.visibility === "private") {
    privateIds.add(business.id);
    privateTitles.push(business.title);
  }

  g.service.forEach((s: any, i: number) => {
    const id = `test-svc-${i}`;
    idOf.set(s, id);
    const title = `Svc-${s.visibility === "private" ? "PRIV" : "PUB"}-${s.titleSeed}`;
    const o = mkObject(id, "ping.social.service@1", title, s.visibility, {});
    objects.push(o);
    if (s.visibility === "private") {
      privateIds.add(id);
      privateTitles.push(title);
    }
  });
  g.location.forEach((l: any, i: number) => {
    const id = `test-loc-${i}`;
    idOf.set(l, id);
    // Unique per index: two locations must never share a title, or a
    // public one's title false-positives against a private one's.
    const title = `Test City ${i}, TS`;
    const o = mkObject(id, "ping.social.location@1", title, l.visibility, {
      address_locality: `Test City ${i}`,
    });
    objects.push(o);
    if (l.visibility === "private") {
      privateIds.add(id);
      privateTitles.push(l.title);
    }
  });
  g.person.forEach((p: any, i: number) => {
    const id = `test-person-${i}`;
    idOf.set(p, id);
    const title = `Person-${p.visibility === "private" ? "PRIV" : "PUB"}-${p.titleSeed}`;
    const o = mkObject(id, "ping.social.person@1", title, p.visibility, {});
    objects.push(o);
    if (p.visibility === "private") {
      privateIds.add(id);
      privateTitles.push(title);
    }
  });

  let ri = 0;
  const rel = (subject: string, predicate: string, object: string) =>
    relationships.push({
      id: `test-rel-${ri++}`,
      subject,
      predicate,
      object,
      status: "active",
      createdAt: "2026-09-21T13:50:00Z",
    });
  for (const s of biz.offers ?? []) rel("test-business", "offers", idOf.get(s)!);
  // arity "0-1" yields a single linked object (or undefined), not an array.
  const located = biz.located_at == null ? [] : [biz.located_at];
  for (const l of located) rel("test-business", "located_at", idOf.get(l)!);
  for (const p of g.person) {
    // arity "1" yields a single linked object.
    if (p.works_for != null) rel(idOf.get(p)!, "works_for", "test-business");
  }
  return { objects, relationships, businessId: "test-business", privateIds, privateTitles };
}

function answerDigest(answer: string): string {
  return createHash("sha256").update(answer).digest("hex").slice(0, 16);
}

describe("graph properties over generated fixture-shaped graphs", () => {
  test("projection + composer invariants hold for every generated graph", () => {
    fc.assert(
      fc.property(graphArb, (g: any) => {
        const mapped = mapGraph(g);
        const business = mapped.objects.find((o) => o.id === mapped.businessId)!;
        const related = mapped.objects.filter((o) => o.id !== mapped.businessId);
        const input = {
          viewer: { id: "prop-visitor", displayName: "Property Visitor" },
          target: business,
          relatedObjects: related,
          relationships: mapped.relationships,
          plan: null,
          grants: [] as string[],
          siteSpec: null,
          question: QUESTION,
          fieldVisibilityDecisions: [],
          fieldConflicts: [],
        };
        // 1. TOTALITY: the production path never throws on generated graphs.
        const ctx: any = buildAskFydContext(input as any);
        const answer = composeAskFyd(ctx, QUESTION);

        const projectedIds = new Set<string>(
          (ctx.base?.evidenceRefs ?? []).map((r: any) => r.id),
        );
        // 2. EVIDENCE CLOSURE: every cited claim ref resolves to a
        //    projected evidence ref (no dangling citations).
        for (const c of answer.claimClassifications ?? []) {
          for (const refId of c.evidenceRefIds ?? []) {
            expect(projectedIds.has(refId)).toBe(true);
          }
        }
        // 3. PRIVACY: private objects never appear in evidence refs and
        //    their titles never appear in the answer text.
        for (const pid of mapped.privateIds) {
          expect(projectedIds.has(pid)).toBe(false);
        }
        for (const t of mapped.privateTitles) {
          expect(answer.answer.includes(t)).toBe(false);
        }
        // 4. DETERMINISM: same graph, same question -> same answer digest.
        const ctx2: any = buildAskFydContext(input as any);
        const answer2 = composeAskFyd(ctx2, QUESTION);
        expect(answerDigest(answer2.answer)).toBe(answerDigest(answer.answer));
      }),
      { numRuns: 40 },
    );
  });
});
