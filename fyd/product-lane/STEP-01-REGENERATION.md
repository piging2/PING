# STEP 1 — REGENERATION RECORD (2026-09-23)

Both experiences regenerated from the CURRENT canonical projections
(`src/fyd/object/__tests__/fixtures/projections/*.json`) with digest
verification (siteId match, provenance ref on every object, sha256 over
canonical JSON compared to meta.graphDigest). `generateSiteSpec` run
twice per site; digests identical.

## happy-place (Website A)

- graphDigest: 8f4737d846b4e75491b2f8092fabd8d792bb4c896e1e331dd2aac58b38be3607
- objects: 3 (business, location, service), relationships: 2 (located_at, provides)
- specDigest: d302ab17e261b0d60146f78a86bbe71cdc0bf44e2fc73fbf5af3337dba6744e6 (run1 == run2)
- deterministic: YES
- pages: home, about, services
- home sections: Hero, BusinessSummary, Services, Locations, Contact, Links, CTA, AskFYD, ObjectRail
- object→section: business→Hero/BusinessSummary/Contact/Links/CTA;
  service(website-service-51de038c1defe8bd)→Services + services page + ObjectRail;
  location→Locations
- capabilities (visitor): business [open, ask, reference, follow, open_website];
  service [open, ask, reference, like]; location [generic only]

## coppersmith-plumbing (Website B, post planner-fix)

- graphDigest: afbc132fc86b90fb3959d05dd3114a823018c6a28e00cf0b09dcb4a820f70664
- objects: 4 (business, external_identity, location, person), relationships: 3 (located_at, works_for, links_to)
- specDigest: eb78eb023a2efec1c7df555d6038b61eb11c266b5d170442a3a5a95ede32d8ee (run1 == run2)
- deterministic: YES
- pages: home, about, explore
- home sections: Hero, BusinessSummary, Locations, People, Contact, Links, CTA, AskFYD, ObjectRail
- object→section: business→Hero/BusinessSummary/Contact/Links/CTA;
  location→Locations; person(website-business-2f1327c09d622175-person-377048d67856)→People (via works_for inverse) + ObjectRail + explore feed;
  external_identity→(no section; connection composed via Links)
- capabilities (visitor): business [open, ask, reference, follow, open_website];
  person [People, ObjectGrid, ObjectFeed, ObjectRail components; generic caps];
  location [Locations, ObjectGrid, ObjectFeed]; external_identity [GenericObjectCard]

## Zero customer-specific code

The render path is: page.tsx (SITE_ID only) → getPingObjectGraph →
generateSiteSpec → applyPresentationIntent → validate → render.
The generator never mentions a company name (verified: no "Happy Place",
"Coppersmith", or name conditionals in generator.ts, renderer.tsx,
schemas.ts). All facts arrive via the graph; all composition via role
predicates. CUSTOMER-SPECIFIC CODE: ZERO.
