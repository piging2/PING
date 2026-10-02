# VEIN-3 Q1 HUNT: live duplicate / single-field entity collapse
Date: 2026-09-28 (MDT). Researcher: vein-3 harvest subagent. Pass: fyd-ping-daily-harvest, RESEARCH/AUDIT ONLY.
Program law: ~/workspace/sprint-2026-09-24/FYD-PING-HARVEST-PROGRAM-2026-09-25.md (WRITER GATE CORRECTION read).
Background paper: ~/workspace/harvest/research/2026-09-27/vein3-entity-resolution.md.
No writes were made to any repo. No subagents spawned.

## Checkout verified
- Path: /home/nolan/projects/ping on the Pig (reachable via pigwsl, BatchMode=yes).
- Branch: fyd/sprint-integration-2026-09-24. HEAD: 4a8c5f2e92eef2a3cb6a11582c37f01c38dfacd9.
- Working tree has 147 uncommitted modified files (lane work in progress). Two audited files are dirty
  (src/fyd/acquisition/live-loop.ts, src/fyd/data/fyd-tenant-graph.ts); both diffs are 5-line,
  net -3-line changes containing none of the collapse keywords (verified via keyword-filtered diff).
- crx-runtime /home/nolan/ping on the Pig: contains archives, manifests, backups, zips only;
  no src/lib/app code tree exists there. Nothing to audit; PING checkout is the live surface.

## Q1 as stated
Writer-gate Q1 needs a demonstrated LIVE duplicate or LIVE single-field entity collapse in PING
ingestion: code that takes two observations sharing one field (name, URL, phone, email, provider
account) and treats them as the same entity without further evidence, or a live store where the
same real-world entity appears twice with no dedupe.

## Verdict: Q1 STILL OPEN
No live single-field collapse found. No live store found where the same real-world entity
appears twice with no dedupe. The nearest neighbors are documented below with the exact reason
each fails the Q1 bar. This is an honest negative result, not a fabricated defect.

Absence of evidence is not evidence of absence. Search surface: keyword-grep audit
(dedup, duplicate, upsert, onConflict, unique, findBy, merge, sameAs, canonical keying)
across src/fyd, src/lib, src/services at the pinned HEAD, plus targeted reads of every
hit in ingestion/observation/identity/object/proceduralize paths. Not a line-by-line read
of the whole tree. Outreach-pipeline dedup (never-re-engage guard, check-prospect-collision.py,
engagement guards) explicitly out of scope per the background paper: pipeline dedup, not core
PING entity resolution.

## Searches performed (what was searched, what was found)

### S1. Schema/ORM definition files
- Searched: find for *.prisma, schema*.sql, drizzle*, migration files under src/, prisma/, db/, migrations/.
- Found: nothing. No ORM schema files; only src/fyd/sitespec/schema-roles.ts and schemas.ts
  (site-spec validation schemas, not a database schema).

### S2. `unique` keyword in TS
- Searched: grep -rl -e 'unique' across src/fyd, src/lib, src/services (tests excluded).
- Found hits in: src/fyd/builder/object-builder.ts, src/fyd/customize/owner-command-compiler.ts,
  src/fyd/customize/apply-layer.ts, src/fyd/proceduralize/proceduralizer.ts,
  src/fyd/owner-mode/gate.ts, src/fyd/sitespec/validator.ts, src/fyd/sitespec/binding-verifier.ts,
  src/fyd/net/safe-fetch.ts, src/lib/editor/sequence-authority.ts, src/lib/blob-storage.ts,
  src/lib/effective-project-gallery.ts, src/lib/visual-asset-registry.ts, src/lib/faq.ts.
- Traced the consequential ones:
  - object-builder.ts:24: comment "IDs: object and relationship ids are non-empty and unique";
    object-builder.ts:191: checks.push("ids-unique"). This is an invariant on minted IDs
    (identity minting), not a single-field entity key.
  - proceduralizer.ts:1204: `const uniqueRelationships = relationships.filter(...)` dedupes
    relationships by deterministic relationship ID (deriveRelationshipId, subject|predicate|object
    hash). Re-projection dedup, not entity collapse.

### S3. upsert / onConflict
- Searched: grep -rln -e 'upsert' -e 'onConflict' -e 'ON CONFLICT' across src/ (tests excluded).
- Found: src/lib/kit.ts, src/fyd/builder/object-builder.ts, src/fyd/customize/server.ts,
  src/fyd/object/owner-overlay.ts, src/fyd/owner-mode/corrections.ts.
- Traced:
  - src/lib/kit.ts:374: "Kit's subscriber endpoint is an email-keyed upsert". This is the
    HPP-to-Kit OUTBOUND boundary (newsletter/lead capture sync PING -> Kit). The email-keyed
    upsert semantics belong to Kit's provider API, not PING's canonical truth. No local
    subscriber/lead entity store keyed by email was found (S12).
  - src/fyd/customize/server.ts:289 (comment): tenant-graph "set upserts by intentId with a
    re-approved intent moving to the end". Keyed by intentId (deterministic intent IDs),
    journal accumulation. Not field-keyed.
  - src/fyd/builder/object-builder.ts:129-131: "Proposed object upserts; empty in this lane."
    Proposal type only.
  - src/fyd/object/owner-overlay.ts: grep count for 'upsert' = 0 (stale hit from filename-level
    scan; nothing present).
  - src/fyd/owner-mode/corrections.ts: no upsert hits on re-grep.

### S4. dedup / duplicate in acquisition, identity, object, data, resolve, proceduralize
- Searched: grep -rln -e 'dedup' -e 'duplicate' in those six dirs (tests excluded).
- Found and traced each:
  - src/fyd/acquisition/live-loop.ts: duplicates counter only; media duplicate classification
    lives in src/fyd/media/ingest.ts (see S7).
  - src/fyd/object/services.ts:59: "Returns title-cased service names in observed order,
    deduplicated." Display-level list dedup, not entity merge.
  - src/fyd/object/related.ts:51: "Best-edge-wins comparison for dedup when one object is
    reachable twice." Graph-traversal dedup, not entity merge.
  - src/fyd/object/object-projection.ts: projection dedup by object ID.
  - src/fyd/proceduralize/patch.ts:184: "dedupe preserving the requested sequence" (patch
    op ordering).
  - src/fyd/proceduralize/structured-data.ts:224: "Compact schema.org type names, sorted, deduped."
    Type-name list dedup.

### S5. findBy* single-field lookup helpers
- Searched: grep -rln -e 'findBy' across src/fyd, src/lib, src/services (tests excluded).
- Found: src/fyd/identity/principal.ts, src/fyd/identity/file-store.ts, src/lib/projects.ts,
  src/lib/media.ts, src/lib/events.ts, src/lib/registries.ts, src/lib/authority-loader.ts,
  src/lib/faq.ts, src/lib/before-after.ts, src/lib/reviews.ts.
- Traced:
  - src/fyd/identity/principal.ts:90,111: `findByVerifiedEmail(email)` on
    IdentityBindingStore; used at principal.ts:177 and :235 ONLY for email-collision
    DETECTION. The module header states the non-negotiable semantics verbatim:
    "ProviderAccount is keyed by PROVIDER + PROVIDER-STABLE SUBJECT (issuer + sub).
    Email is an attribute/claim, NEVER canonical identity. Never silently merge two
    accounts because email strings match. A second provider with the same verified
    email gets its own identity on sign-up (flagged as an email collision for the
    owner to resolve), unless the owner explicitly links it while authenticated."
    Verified in code: sign-up with a colliding verified email mints a NEW identity
    (deriveIdentityId from provider/issuer/subject) and sets emailCollision=true;
    linkProviderAccount requires authenticated proof and throws ACCOUNT_BOUND_ELSEWHERE
    rather than stealing. This is an explicit PASS on the program hard law.
  - src/fyd/identity/file-store.ts:88: same findByVerifiedEmail, collision-scan only.
  - src/lib/* findById/findBySlug: static authority-manifest lookups (website demo layer),
    not entity resolution.

### S6. src/fyd/resolve/spike (entity-resolution spike)
- Read: README.md, and checked live wiring with grep -rn -e 'resolve/spike' across src/ and app/.
- Found: the spike contains an EXACT tier with three deterministic MATCH rules
  (exact-url, exact-phone, exact-name-address) that DO declare two rows the same entity on
  one shared normalized field. The README proven-on-corpus note (2026-09-21, 328 outreach
  candidates vs 318-row corpus, 91 EXACT matches) is real work.
- But: README header states verbatim "Status: SPIKE. Not production. Not wired into anything."
  The precise import check returned ZERO imports outside src/fyd/resolve/spike itself.
  The AMBIGUOUS tier is explicitly never auto-merged ("the type has no matchedIds field at all").
- Q1 assessment: a single-field MATCH rule exists in code, but it is not live in PING
  ingestion. Not a Q1 collapse. Closest thing to the gated defect, kept at BACKLOG correctly.

### S7. Media duplicate classifier
- Searched: 'duplicate' across src/fyd/media and src/fyd/acquisition.
- Found: src/fyd/media/ingest.ts:193, outcome "duplicate", reason "Identical bytes already
  ingested as <id>". Decision logic (acquireOne, ~line 178): `if (seenDigests.has(media.digest))`
  where digest is the content digest of the acquired bytes, scoped to one ingest run.
- Q1 assessment: identical-byte content dedup within a single run. Legitimate. Not entity collapse.

### S8. Claim store keying (observation bookkeeping)
- Read: src/fyd/claim/resource-id.ts, store.ts; usage in src/fyd/onboarding/anonymous-preview.ts:214-220.
- Found: claimResourceIdForUrl derives the claim ID from the normalized URL ORIGIN only
  ("different pages on the same site claim the same resource"), and anonymous-preview does
  `if (!claimExists(resourceId)) writeClaim(createObserved(resourceId, res.finalUrl))`
  ("Idempotent: never overwrite an existing claim").
- Q1 assessment: adjacent but not Q1. This is observation-receipt idempotency (first-claim-wins
  per origin), not entity truth; it never declares two distinct real-world entities to be one.
  Noted as a minor coarseness (first fetched page's URL is stored for the whole origin), not a defect.

### S9. Proceduralizer business ID derivation (nearest live neighbor)
- Read: src/fyd/proceduralize/proceduralizer.ts:643-695.
- Found: `deriveBusinessId(entityUrl)` = "website-business-" + sha256Hex(canonicalEntityUrl(entityUrl)).
  canonicalEntityUrl normalizes: lowercase host, strip www., drop default ports, strip trailing slash.
  The comment block states the "G2 corrected identity model (2026-09-24): STABLE ENTITY IDENTITY +
  evolving OBSERVATIONS. The id is derived ONLY from the canonical entity URL... a phone-number or
  description change must not remint the business", and the earlier comment (line ~676) states it is
  "a derived projection key, not a canonical PING identity" (Grill 28 verdict: KEEP), with canonical
  IDs minted by the runtime on promotion via the proposal path.
- Q1 assessment: this is the closest live mechanism to single-field keying, and it is NOT a
  collapse under the hard law. The URL here is the identity of the observation source itself
  (the website being ingested), not a claimed attribute of an entity observed from elsewhere.
  Two different input URLs always yield two different business IDs; only www/trailing-slash
  variants of the SAME site normalize together. It never takes two observations sharing a
  name, phone, or email and treats them as the same entity. Re-projection of the same URL
  yielding the same projection ID is stability, not collapse.

### S10. sameAs handling in proceduralizer
- Read: src/fyd/proceduralize/proceduralizer.ts:958-987 (ensureExternalIdentity).
- Found: sameAs URLs become `ping.social.external_identity@1` objects with `links_to`
  relationships carrying evidence refs (`proceduralizer:project:sameAs:<key>`). The within-run
  Map is keyed by URL but scoped per businessId: extId = businessId + "-ext-" + url hash, so
  the same external URL linked from two different businesses mints two separate objects.
  No cross-business URL collapse; relationship-with-evidence, not merge.

### S11. Builder / onboarding / source-refresh binding
- Searched: onboarding dir for findBy/lookup/existing-entity logic; builder/source-refresh.ts
  for tenant binding; object/commands.ts for existing-object lookup.
- Found: nothing that looks up an existing business by name/phone/URL/email. source-refresh
  binds by explicit tenantId input. anonymous-preview claim logic is S8. commands.ts:472 is a
  broadcast-intent safety regex, not a store.

### S12. Local subscriber/lead stores; social actions; follows/likes
- Searched: 'subscribers'/'newsletter' stores; dedup/upsert/merge in src/fyd/social;
  edge keying in follows.ts/likes.ts.
- Found: no local email-keyed subscriber entity store (hits were types, fixtures, sitemap,
  and the commands.ts safety regex). src/fyd/social/actions.ts "deduped" = event
  idempotency (nothing re-emitted). follows/likes stores keyed by object id.

## What was NOT covered
- Line-by-line read of the full src tree (grep-led audit only).
- The 147 dirty working-tree files were not individually diffed beyond the two audited ones.
- Outreach pipeline dedup (explicitly out of scope).
- Closed-competitor inference (not applicable; this pass audited PING itself).

## Bottom line
Q1 STILL OPEN. The live PING tree at 4a8c5f2e shows strong identity minting, an explicit
no-silent-merge law in the identity module (with tests and collision flags), a deliberately
unwired entity-resolution spike, and only legitimate content/projection-level dedup
(identical bytes, deterministic re-projection IDs, origin-keyed observation receipts).
No code was found that collapses two observations into one entity on a single shared
name/URL/phone/email/provider-account field, and no store was found where the same
real-world entity appears twice without dedupe. All four vein-3 donors stay at
BACKLOG/REJECT until a live duplicate or live collapse is demonstrated.
