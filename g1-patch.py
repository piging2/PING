#!/usr/bin/env python3
"""G1 patch: restore ObjectFeed eligibility generically + align planner feedable with registry."""
import sys

REPO = "/home/nolan/projects/ping"

def patch(path, old, new, count=1):
    with open(REPO + "/" + path) as f:
        src = f.read()
    n = src.count(old)
    assert n == count, f"{path}: found {n} occurrences, expected {count}"
    src = src.replace(old, new, count)
    with open(REPO + "/" + path, "w") as f:
        f.write(src)
    print(f"patched {path}")

# --- 1. registry.ts: restore business/product/location/person to ObjectFeed ---
old_feed = '  { name: "ObjectFeed", label: "Object feed", description: "Chronological feed of objects, newest first.", acceptsSchemas: [...SCHEMA_ROLES.post, ...SCHEMA_ROLES.article, ...SCHEMA_ROLES.service, KNOWLEDGE_WEBSITE], ownerBound: false, requiresData: true },'
new_feed = '''  // G1 (2026-09-24): business/product/location/person are feed content again.
  // The 2026-09-23 convergence dropped them from ObjectFeed as "stale drift"
  // at the mechanism level, which silently removed the Explore page for real
  // businesses (bemis-electric, gear-junction: business+person/location graphs).
  // Product semantics win over mechanism convergence: a refactor may change
  // implementation, it must not silently change generated pages. Pinned by
  // the page-inventory test (proceduralize/__tests__/page-inventory.test.ts).
  { name: "ObjectFeed", label: "Object feed", description: "Chronological feed of objects, newest first.", acceptsSchemas: [...SCHEMA_ROLES.business, ...SCHEMA_ROLES.product, ...SCHEMA_ROLES.location, ...SCHEMA_ROLES.person, ...SCHEMA_ROLES.post, ...SCHEMA_ROLES.article, ...SCHEMA_ROLES.service, KNOWLEDGE_WEBSITE], ownerBound: false, requiresData: true },'''
patch("src/fyd/components/registry.ts", old_feed, new_feed)

# --- 2. eligibility.ts: derive feedable from the registry (single source) ---
old_import = 'import { resolveWebsiteUrl } from "../sitespec/graph";'
new_import = ('import { resolveWebsiteUrl } from "../sitespec/graph";\n'
              'import { componentsForSchema } from "../components/registry";')
patch("src/fyd/builder/eligibility.ts", old_import, new_import)

old_feedable = '''  // ObjectFeed renders any feed-eligible content (posts, articles, services,
  // products): eligibility mirrors what the generator can actually emit so
  // the planner never filters a generator-emitted section.
  const feedable = counts.posts + counts.articles + counts.services + counts.products;
  set("ObjectFeed", feedable > 0, "feed-eligible count " + feedable + " > 0");'''
new_feedable = '''  // ObjectFeed renders any feed-eligible content. Feed eligibility is
  // DERIVED from the component registry (the single schema<->component
  // mapping), mirroring exactly what the generator's explorePage can emit,
  // so the planner never filters a generator-emitted Explore section.
  // G1 (2026-09-24): the previous hand-count (posts+articles+services+
  // products) drifted from the registry and would have filtered a
  // restored Explore page; one definition now serves both.
  const feedable = graph.objects.filter(
    (o) =>
      o.visibility === "public" &&
      componentsForSchema(o.schema).includes("ObjectFeed"),
  ).length;
  set(
    "ObjectFeed",
    feedable > 0,
    "feed-eligible public objects " + feedable + " > 0 (registry-derived)",
  );'''
patch("src/fyd/builder/eligibility.ts", old_feedable, new_feedable)

# --- 3. schemas.test.ts: update the mechanism-level pin to the restored semantics ---
old_pin = '''    // Converged truth (2026-09-23): the registry's component-authored
    // coverage wins over the deleted hand table's stale omissions.
    // Note: ObjectFeed is deliberately absent for business (converged
    // 2026-09-23): the registry's ObjectFeed accepts post/article/service/
    // website only. The deleted hand table's business->ObjectFeed entry was
    // the same class of stale drift as the four omissions fixed here.
    expect(eligibleComponents("ping.social.business@1")).toEqual([
      "Hero",
      "IdentityCard",
      "BusinessSummary",
      "ObjectGrid",
      "RecentObjects",
      "Contact",
      "Links",
      "SocialProof",
      "CTA",
      "AskFYD",
      "ObjectRail",
    ]);'''
new_pin = '''    // Restored truth (2026-09-24, G1): ObjectFeed is feed content for
    // business/product/location/person again. The 2026-09-23 convergence
    // dropped it as "stale drift" at the mechanism level, but that silently
    // removed the Explore page for real businesses (bemis-electric,
    // gear-junction). Product semantics outrank mechanism convergence: the
    // page-level effect is pinned by the page-inventory test, and this pin
    // records the restored mechanism truth.
    expect(eligibleComponents("ping.social.business@1")).toEqual([
      "Hero",
      "IdentityCard",
      "BusinessSummary",
      "ObjectGrid",
      "ObjectFeed",
      "RecentObjects",
      "Contact",
      "Links",
      "SocialProof",
      "CTA",
      "AskFYD",
      "ObjectRail",
    ]);
    expect(eligibleComponents("ping.social.person@1")).toContain("ObjectFeed");
    expect(eligibleComponents("ping.social.location@1")).toContain("ObjectFeed");
    expect(eligibleComponents("ping.social.product@1")).toContain("ObjectFeed");'''
patch("src/fyd/sitespec/__tests__/schemas.test.ts", old_pin, new_pin)

print("ALL PATCHES APPLIED")
