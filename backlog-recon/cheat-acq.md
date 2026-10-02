## acq-ordered-rule-bundles
HARVEST P2 [FYD PROCEDURAL ACQUISITION] WHY: Current extraction is JSON-LD only with no per-field fallback chain. Metascraper's ordered rule bundles (first reso
WHY: 
EV: 
ACC: 

## acq-microdata-walker
HARVEST P2 [FYD PROCEDURAL ACQUISITION] WHY: Ports WHATWG microdata-to-JSON traversal (extruct's algorithm) to TypeScript, unlocking LocalBusiness/hours/address
WHY: 
EV: 
ACC: 

## acq-content-fingerprint
HARVEST P2 [FYD PROCEDURAL ACQUISITION] WHY: Trafilatura's simhash plus exact bag-of-words hash gives refresh change detection that suppresses cosmetic noise. C
WHY: 
EV: 
ACC: 

## acq-aria-snapshot-observation
HARVEST P2 [FYD PROCEDURAL ACQUISITION] WHY: Playwright's `ariaSnapshot()` is a compact browser-computed semantic projection of rendered DOM, useful for JS-rend
WHY: 
EV: 
ACC: 

## acq-request-fingerprint
HARVEST P3 [FYD PROCEDURAL ACQUISITION] WHY: Crawlee's request fingerprinting (lowercase, sorted query, fragment policy, method plus payload extension) deduplic
WHY: 
EV: 
ACC: 

## acq-readability-gate
HARVEST P3 [FYD PROCEDURAL ACQUISITION] WHY: Mozilla Readability gives deterministic main-content isolation for a fixed DOM (in-page via Playwright, zero new ru
WHY: 
EV: 
ACC: 

## acq-refresh-normalize-then-hash
HARVEST P3 [FYD PROCEDURAL ACQUISITION] WHY: urlwatch's ordered per-URL filters (CSS element selection, declared order) then sha256 of normalized bytes. The nor
WHY: 
EV: 
ACC: 

## acq-service-tier1-extraction
DONE_VERIFIED P1 [FYD PROCEDURAL ACQUISITION] WHY: Tier 1 direct JSON-LD extraction of Service and Offer objects into the machine path is committed and tested. This i
WHY: 
EV: 
ACC: 

## acq-real-capture-service-gap
OPEN P1 [FYD PROCEDURAL ACQUISITION] WHY: Running the Tier 1 pipeline over the real captures (coppersmith index.html, happy-place-platform index.html) yields
WHY: 
EV: 
ACC: 

## acq-predicate-consistency
OPEN P2 [FYD PROCEDURAL ACQUISITION] WHY: The schema declares `provides`, the proceduralizer emits `offers`, the generator accepts both, but `makes_offer` re
WHY: 
EV: 
ACC: 

## acq-deterministic-ids
DONE_VERIFIED P1 [FYD PROCEDURAL ACQUISITION] WHY: Business IDs (`website-business-` + sha256 of canonical url/controller/fields), relationship IDs (`rel-` + sha256 o
WHY: 
EV: 
ACC: 

## acq-observedat-digest-observations
DONE_VERIFIED P2 [FYD PROCEDURAL ACQUISITION] WHY: Byte-identical regen proofs across processes and key orders depend on pinned observedAt and source-content digests.
WHY: 
EV: 
ACC: 

## acq-rss-sitemap-sources
PROVE P3 [FYD PROCEDURAL ACQUISITION] WHY: The proof pipeline already consumes index.html plus rss.xml plus sitemap.xml for coppersmith (per `regen.ts` SITES
WHY: 
EV: 
ACC: 

## acq-remote-context-refusal
OPEN P2 [FYD PROCEDURAL ACQUISITION] WHY: The JSON-LD extraction path (jsonld@9.0.0, whose defaults changed to RDFC-1.0 per the service extraction report) mu
WHY: 
EV: 
ACC: 

## acq-social-identity
OPEN P3 [FYD PROCEDURAL ACQUISITION] WHY: `rel=me` and `sameAs` are the canonical discovery mechanisms for social and external identities. Coppersmith has an
WHY: 
EV: 
ACC: 

## acq-crawl-recipe-artifact
PROVE P3 [FYD PROCEDURAL ACQUISITION] WHY: The proof codified a crawl recipe per site (URL seed, source types, observedAt pin) in `regen.ts`, but the recipe i
WHY: 
EV: 
ACC: 

## acq-hostile-input-fixtures
DONE_VERIFIED P2 [FYD PROCEDURAL ACQUISITION] WHY: Hostile fixture discipline (XSS text in name/quote fields, `javascript:` URLs in website/social fields, long malfor
WHY: 
EV: 
ACC: 

## sitespec-spec-is-data
DONE_VERIFIED P1 [SITESPEC] WHY: SiteSpec is the declarative product state. It owns pages, sections, ordering, bindings, tokens, navigation, and man
WHY: 
EV: 
ACC: 

## sitespec-schema-evolution-law
DONE_VERIFIED P2 [SITESPEC] WHY: Schema evolution is codified: add new fields as optional, never change an existing field's type, never remove. Brea
WHY: 
EV: 
ACC: 

## sitespec-canonical-serialization-digest
DONE_VERIFIED P1 [SITESPEC] WHY: Canonical JSON (sorted keys) plus a SHA-256 semantic digest excluding volatile stamps is the identity of the spec.
WHY: 
EV: 
ACC: 

## sitespec-eligibility-contract
DONE_VERIFIED P2 [SITESPEC] WHY: `deriveEligibility` gives every component a data-driven eligibility verdict with reasons. The planner defensively f
WHY: 
EV: 
ACC: 

## sitespec-objectfeed-external-identity
OPEN P1 [SITESPEC] WHY: The Explore page's ObjectFeed uses an `all` query over schemas including `ping.social.external_identity@1`, which t
WHY: 
EV: 
ACC: 

## sitespec-dependency-manifest
DONE_VERIFIED P2 [SITESPEC] WHY: Every section binding records component version, object field, claim reference, classification, and confidence. The
WHY: 
EV: 
ACC: 

## sitespec-confidence-law
DONE_VERIFIED P2 [SITESPEC] WHY: Presentation confidence can never exceed fact confidence (`assertConfidenceLaw`). A weakly evidenced fact cannot be
WHY: 
EV: 
ACC: 

## sitespec-owner-patch-loop
DONE_VERIFIED P2 [SITESPEC] WHY: Structured SitePatch intents (reorder, hide/show, feature object, edit presentation copy, edit theme tokens), a dig
WHY: 
EV: 
ACC: 

## sitespec-correction-survives-regen
PROVE P1 [SITESPEC] WHY: The intended pipeline is SOURCE T2 -> OBJECT DIFF -> DEPENDENCY IMPACT -> GENERATED BASE UPDATE -> REAPPLY OWNER OV
WHY: 
EV: 
ACC: 

## sitespec-must-win-density
DONE_VERIFIED P2 [SITESPEC] WHY: Planner density caps (maxSectionsPerPage) can drop sections, but must-win components (Hero, BusinessSummary, Servic
WHY: 
EV: 
ACC: 

## sitespec-navigation-derived
DONE_VERIFIED P3 [SITESPEC] WHY: Navigation is derived from surviving pages, never authored separately. Pages only exist when data exists.
WHY: 
EV: 
ACC: 

## sitespec-design-tokens
DONE_VERIFIED P3 [SITESPEC] WHY: Design tokens are structured, additive, and versioned (v1 frozen). Token changes are presentation-only and can neve
WHY: 
EV: 
ACC: 

## renderer-javascript-url-sink
DONE_VERIFIED P1 [FYD RENDERER] WHY: Hostile proof found that `javascript:` URLs in website and social fields reached raw `href` (FL-20260921-032). The
WHY: 
EV: 
ACC: 

## renderer-mobile-minw0
DONE_VERIFIED P1 [FYD RENDERER] WHY: The standing mobile-overflow lesson: genuine overflow at 320px was owned by Ask FYD design-token rows (label `flex`
WHY: 
EV: 
ACC: 

## renderer-overflow-instrumentation
DONE_VERIFIED P3 [FYD RENDERER] WHY: `fydOverflowTrace()` walks ancestors bottom-up and names the exact overflow owner (the narrowest element whose `scr
WHY: 
EV: 
ACC: 

## renderer-hostile-text-escaping
DONE_VERIFIED P2 [FYD RENDERER] WHY: React text escaping passed for script tags, image-onerror strings, SVG payloads, quote-breaking text, and literal e
WHY: 
EV: 
ACC: 

## renderer-missing-data
DONE_VERIFIED P2 [FYD RENDERER] WHY: Missing data means the section or page does not exist. Nothing is invented. Unknown schemas fall back to GenericObj
WHY: 
EV: 
ACC: 

## renderer-render-model-fixtures
DONE_VERIFIED P2 [FYD RENDERER] WHY: Semantic render determinism (same ObjectGraph + SiteSpec + ViewerContext + renderer version yields the same semanti
WHY: 
EV: 
ACC: 

## renderer-responsive-matrix
DONE_VERIFIED P2 [FYD RENDERER] WHY: The 320/375/768/1280 browser proof matrix exists with artifacts. Desktop and mobile are green after the exact CSS d
WHY: 
EV: 
ACC: 

## renderer-a11y-touch-motion
PROVE P2 [FYD RENDERER] WHY: Gates require WCAG 2.2 AA 24x24 touch targets, no hover-only interactions, and reduced-motion honored (measured in
WHY: 
EV: 
ACC: 

## renderer-performance-budgets
PROVE P3 [FYD RENDERER] WHY: Performance is a hard engineering budget (LCP/INP/CLS, image weight, payload), never a product metric used to excus
WHY: 
EV: 
ACC: 

## registry-declared-contracts
IN_PROGRESS P2 [COMPONENT REGISTRY] WHY: Every component should eventually declare accepted schemas, required and optional fields, capabilities, responsive
WHY: 
EV: 
ACC: 

## registry-unknown-component
DONE_VERIFIED P3 [COMPONENT REGISTRY] WHY: Unknown component kinds never fail. Unknown schemas fall back to GenericObjectCard. This is the resilience floor fo
WHY: 
EV: 
ACC: 

## registry-socialproof-dormant
OPEN P3 [COMPONENT REGISTRY] WHY: SocialProof appears in the schema-component map for business objects, but the generator never emits it and eligibil
WHY: 
EV: 
ACC: 

## registry-ai-vocabulary
HARVEST P3 [COMPONENT REGISTRY] WHY: json-render's first primitive is a catalog-derived machine-readable AI vocabulary: the registry becomes the prompta
WHY: 
EV: 
ACC: 

## registry-object-rail
DONE_VERIFIED P3 [COMPONENT REGISTRY] WHY: ObjectRail is the featured-object doorway: the richest related object rendered inline with image, title, subtitle,
WHY: 
EV: 
ACC: 

## registry-askfyd-answer-shape
OPEN P2 [COMPONENT REGISTRY] WHY: Ask FYD correctly refuses to invent (adversarial test PASS), but the `AskAnswer` shape is missing three required fi
WHY: 
EV: 
ACC: 

## escalation-stack-pinned
DONE_VERIFIED P2 [WEBSITE ACQUISITION ESCALATION] WHY: The current stack is documented: static HTTP fetch as the default (L0/L1), Playwright as the rendered-site escalati
WHY: 
EV: 
ACC: 

## escalation-crawl4ai-design-harvest
HARVEST P2 [WEBSITE ACQUISITION ESCALATION] WHY: Crawl4AI is design-harvest only: SSRF destination validation, declarative request trust boundary, Shadow DOM flatte
WHY: 
EV: 
ACC: 

## escalation-lightpanda-ladder
HARVEST P3 [WEBSITE ACQUISITION ESCALATION] WHY: Lightpanda is rejected as a default and as browser-proof replacement (no real rendering engine, no meaningful scree
WHY: 
EV: 
ACC: 

## escalation-benchmark-trigger
DECISION P3 [WEBSITE ACQUISITION ESCALATION] WHY: Benchmarks of alternative acquisition tooling are held per Nolan's 2026-09-21 FOCUS NOW directive. The trigger is e
WHY: 
EV: 
ACC: 

## escalation-ssrf-media-fetch
PROVE P1 [WEBSITE ACQUISITION ESCALATION] WHY: Remote media fetch needs an SSRF boundary: allow only HTTP/HTTPS public origins; reject localhost, loopback, RFC191
WHY: 
EV: 
ACC: 

## escalation-no-circumvention
DECISION P3 [WEBSITE ACQUISITION ESCALATION] WHY: Anti-bot circumvention and proxy escalation are explicitly rejected. Platform constraints fail closed: a detected r
WHY: 
EV: 
ACC: 