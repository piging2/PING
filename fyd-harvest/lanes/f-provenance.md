# LANE F — Provenance / Coverage / Knowledge-Compounding Audit

**Date:** 2026-09-22 (MDT). **Read-only.** Branch `fyd/builder-composition` @ website repo `/home/nolan/projects/ping`; PING core `/home/nolan/ping` @ `refactor/runtime-authority-convergence`. No writes, no installs, no commits; all Pig access via `~/workspace/pig/pigwsl-run.sh`.

---

## 1. PROVENANCE AUDIT — three backward walks

### The layers (bottom-up, as verified in code)

| Stage | Artifact | Provenance carried |
|---|---|---|
| ACQUIRE | `src/fyd/proceduralize/raw/<site>/` (index.html, rss.xml, sitemap.xml) + README table | byte snapshots, observed_at, robots note |
| PARSE/EXTRACT | `ParsedFact` (proceduralizer.ts) | name, value, sourceType (true tier), inferred, claimKind, evidenceDetail, factClass, visibility, property, entityId, extractor (name@version, optional) |
| PROVENANCE choke | `ExtractedField` | + sourceUrl, observedAt, evidenceRef (content hash or span id), confidence |
| RESOLVE | `resolve()` — winner per field name | conflicts resolved by SOURCE_PRIORITY + confidence; **losers silently dropped** |
| PROJECT | `PingObject` | **per-field provenance dropped**; object-level `{kind, ref, derivedAt}` only. Optional sidecar `fieldClasses` (Grill 7 class per field) |
| DUMP | `dump.py` (PING tooling) → `/home/nolan/ping/var/fyd-projections/<slug>.json` | fixture header: script path, pipeline git commit, source URL, per-file sha256 digests, observedAt. **fieldClasses NOT carried into the dump** |
| READ SEAM | `src/fyd/data/ping-object-source.ts` | Law: "NO CUSTOMER FACT WITHOUT A TRACEABLE BASIS" — every object must carry non-empty `provenance.ref`; digest-verified |
| RENDER | `renderer.tsx` → `boundField` → `verifyPresentationBinding` (sitespec/graph.ts) | fail-closed: unverified field → omit |

### FACT 1 — "Pergola Design Consultations" (Happy Place service name)

Rendered (`ObjectView.services[].name`) → relationship `rel-a9834ffb0c62122f` predicate `provides` (`evidenceRef: ping-event:39fc9971a47f807ef38cf8976cb9d4ff4360c27b52bf14f4cc1f4393094d78fd`) → service object `website-service-51de038c1defe8bd` (`provenance.kind: canonical-journal`, `ref: ping-event:39fc99…`, `derivedAt: 2026-09-21T19:26:26Z`) → projection meta `overlayEventIds: [39fc99…]` → FYD_SITE_OVERLAY event in the demo journal (via `tools/fyd-site-projection/emit-overlay.py --add-service`) → **a demo operator typed a service name and description**.

**Break: MISLABELED KIND.** `dump.py` `add_object` **forces** `provenance.kind = "canonical-journal"` (line ~302). But the website repo added `ObjectProvenanceKind = "overlay-authored"` (2026-09-22, `src/lib/ping/types.ts:97`): "content added by a demo/overlay operator into the site record. It is neither the website's own words nor a recorded journal fact, and must never be classified as either." The badge renderer (`claimBadgeLabel`) honors `overlay-authored` → "Demo addition"; the PING-side dump never emits it. Cross-repo mismatch: the overlay-authored kind exists in the consumer but not in the producer. A demo-operator-typed service currently presents as a canonical journal fact. (The dump.py working-tree diff is presentation-intent only; it does not touch this.)

The `ref: ping-event:<eid>` pointer itself is true (the event exists) but the website read seam **never resolves it against the PING journal** — it is a string pointer, unverified.

### FACT 2 — Happy Place phone `+15412865190`

Rendered (`contact.phone` → capability `call`) → `obj.fields.phone` → business object `website-business-6fa5ebd99d72c4cb` (`provenance: {kind: website-derived, ref: website-ingestion:https://happy-place-platform.vercel.app/, derivedAt: 2026-09-21T13:50:00Z}`) → fixture `src/fyd/proceduralize/__fixtures__/happy-place-graph.ts` header (MACHINE-GENERATED; script `/home/nolan/fyd-proof-run/regen.ts`; pipeline git commit; source URL; source digest sha256 over pinned raw bytes; per-file digests; observedAt 2026-09-21T13:50:00Z; "Every claim is labeled website_statement") → raw bytes in `src/fyd/proceduralize/raw/happy-place-platform/`.

**Break: per-field granularity lost.** Which file carried the phone? Which extraction tier (json-ld vs meta)? What was the evidenceRef (content hash/span)? What confidence? Which extractor version? All recorded on `ExtractedField` at the PROVENANCE choke, all **dropped in `project()`**. Only the object-level ref survives. The fixture header proves *which bytes* the fixture came from but not *which bytes produced which field*.

### FACT 3 — Coppersmith phone `970-245-3869` (+ `hours`, `locality`)

Same object-level chain as Fact 2 (`ref: website-ingestion:https://www.coppersmithplumbing.com/`). Additional evidence: `runs/2026-09-21-coppersmith-plumbing/RUN-NOTES.md` honest failure #1 — the 12:01 run **missed** this phone (JSON-LD @graph invisible to the old flattener); the 13:50 regen with pipeline commit `3e30503b3b819d820c276d4dc379048baba7c27e` caught it. **The phone fact is extractor-version-sensitive, and extractor version is not recorded per field.** The newest lane tags `extractor: "service-cards@2026-09-22"` on `ParsedFact` — but `project()` drops `extractor`. The version-sensitivity that RUN-NOTES documents is structurally unrecorded.

`locality: "Grand Junction, Colorado, 81501, United States"` — DERIVED_FACT (assembled from PostalAddress coarse parts; precise street address withheld by Grill 19). Its `FactClass` (DERIVED_FACT) is the classification the renderer *should* see, but `fieldClasses` is dropped at dump, so the renderer re-derives "direct" by default. An assembled value renders under the same binding as a verbatim quote.

### Chain-break summary (where each link dies)

| Link | Status |
|---|---|
| Rendered claim → object field | ✓ (`boundField` → verifier, fail-closed) |
| Object field → object provenance | ✓ (read seam law: every object needs a ref) |
| Object provenance → source URL + bytes | ✓ (fixture header: source digest, per-file digests, observedAt, pipeline commit) |
| Field → its source file / tier / span | ✗ dropped in `project()` (`ExtractedField` → scalar map) |
| Field → extraction method + version | ✗ (`extractor` name@version dropped in `project()`) |
| Field → confidence | ✗ dropped in `project()` |
| Field → FactClass (Grill 7) | ✗ survives in `ProjectedGraph.fieldClasses` but **dropped by dump.py**; absent from served projection |
| Overlay content → honest kind | ✗ `dump.py` forces `canonical-journal`; `overlay-authored` never emitted |
| `ping-event:<eid>` refs → journal verification | ✗ string pointers, never resolved (PING EvidenceAuthority not consulted) |
| Model + prompt version for intelligent extraction | N/A — no LLM extraction exists today; the slot is designed (`INFERENCE` class, `altTextSource: "generated"`) but unfilled |

---

## 2. "NO INVENTED CLAIMS" OWNERSHIP

No single authority owns it. Four seams each own a slice:

1. **Data-source seam** — `src/fyd/data/ping-object-source.ts`: the "NO CUSTOMER FACT WITHOUT A TRACEABLE BASIS" law. Every object must carry a non-empty `provenance.ref`; the graph digest must verify. Owns *object-level* traceability. Does not check fields.
2. **Renderer seam** — `verifyPresentationBinding` (`src/fyd/sitespec/graph.ts`), called via `boundField` in `renderer.tsx` for every factual field (title, description, contact, website, services). Fail-closed: unverified → omit. Classifications: `direct` (requires object ref), `generated` (requires `generatorRef` name@version), `derived`/`owner_authored` (pass on value). **Owns the render-time veto.** Prior art: `~/workspace/fyd-binding-verifier/` (the test harness this grew from).
3. **Planner seam** — `verifyGeneratedPresentation` (`src/fyd/builder/generated-presentation.ts`): generated copy slots must carry `CopyBinding`s with `claimRef` matching the object's provenance ref at bind time; ungrounded copy refused; planner throws (no spec produced).
4. **Ask seam** — `src/fyd/ask/visitor-answer.ts`: 3-class contract (supported / derived / unknown); no cited evidence → refusal, never a guess. Claim badges (`claimBadgeLabel`) name the source per object; "Mixed sources" for mixed sections.

**Who decides the classification? The renderer, implicitly.** `boundField(ctx, o, kind, correction ? "owner_authored" : "direct")` — the default is "direct". The extractor's Grill-7 `FactClass` (DIRECT_FACT / DERIVED_FACT / INFERENCE / GENERATED_COPY / USER_OVERRIDE) never reaches the renderer because `project()` drops it and the dump drops `fieldClasses`. So a `DERIVED_FACT` (assembled locality) and a verbatim `DIRECT_FACT` both render as "direct". The classification is re-derived at render time, not carried from extraction.

**Smallest existing seam that could enforce it:** `verifyPresentationBinding` + the read seam, IF two things flow:
- (a) `fieldClasses` (or per-field ExtractedField provenance) survives `project()` → dump → projection, so the verifier can check the extractor's classification instead of the renderer's default;
- (b) `dump.py` emits `overlay-authored` for `add_object` (and a matching kind for `set_field` on overlay ops) so the classifier can't lie about operator content.
No new ClaimAuthority is needed to start; the missing piece is **provenance survival across the project/dump seam**, not a new module.

**Dead gate found:** the "generated" classification requires `generatorRef` (name@version), but **nothing in the codebase ever supplies one** — the gate is correct but the producer side is unwired. Generated copy is bound via the planner's `CopyBinding.claimRef` instead. The harvest-report.md claim of renderer copy classes DIRECT / DERIVED / GENERATED PRESENTATION / OWNER COPY describes the *design vocabulary*; in code the renderer only ever binds `direct` / `owner_authored` (generated/derived classifications have no call sites in renderer.tsx).

**Secondary leak:** `claimKind` ("website_statement") is injected **as a data field** on objects (`proceduralizer.ts:819,855`) so the badge can read it. Provenance metadata traveling inside `fields` is a hack that works today but will confuse any consumer that treats `fields` as pure business data (Ask FYD, future API consumers).

---

## 3. VISIBILITY ≠ EXTRACTION

**Extraction-side (exists, wired):** `visibilityForField` (proceduralizer.ts:134) — `street_address` et al. → `private`; `resolve()` withholds private fields before merging/projection (defense in depth in `project()` too). `privateWithheld` counted in the report. The Coppersmith locality is the model: precise address → private, coarse "Grand Junction, Colorado, 81501, United States" → public DERIVED_FACT. Never baked into bytes: raw files keep the street address; the graph doesn't.

**Visibility-side (designed, mostly unwired):**
- `src/fyd/sitespec/field-visibility.ts`: per-object-per-field `FieldVisibilityPolicy` ("show" | "hide" | "coarse"), conservative defaults (any field with "address" in the name → "coarse"; everything else → "show"), owner decisions win by version. Header says it plainly: **"INTEGRATION POINT (site routes are frozen; not wired)"**. Ask FYD calls `applyFieldVisibility(graph, [])` — with an **empty decisions list**, so only conservative defaults apply there. No `FieldVisibilityDecision[]` store exists anywhere.
- `owner-store.ts` / `OwnerOverrides`: `set-address-visibility` (public/hidden, site-level) and `set-service-visibility` (per-service) commands exist and are journaled with `ref: "command:…"`. But: **no per-field phone/email visibility command** — `set-contact-field` only *corrects* values, it cannot hide them. The desired "owner can say SHOW/HIDE ADDRESS/PHONE per field" is half-built: address yes (site-level), phone no.

| Desired | Exists | Missing |
|---|---|---|
| Safe defaults at extraction | ✓ street_address → private, withheld before graph | — |
| Safe defaults at render | ~ address → coarse default only in Ask path | not wired into site generation/render path |
| Owner SHOW/HIDE per field | ~ address public/hidden at site level | per-field phone/email; "coarse" choice not exposed to owner |
| Never baked into extraction | ✓ visibility is a projection-time decision; raw bytes untouched | — |
| Decision store | ✗ | no FieldVisibilityDecision store; decisions have nowhere to live |

---

## 4. ENTITY RESOLUTION

`src/fyd/proceduralize/structured-data.ts`:
- **Exact-match only.** `entityCandidates` merges nodes with the **same @id string**; blank nodes re-keyed by content hash (`blank:<sha256>`) so identity never depends on the library's `_:bN` allocation order. Identical blank nodes merge ("same address stated twice is one address"); **no fuzzy matching anywhere** — no silent merging of ambiguous entities.
- `sameAs` → captured as the `socials` field (exact literals); `relate()` turns page-scope socials into `links_to` relationships consumed by `project()`.
- Cross-source resolution (same field from JSON-LD vs OG vs meta) is the RESOLVE stage: strict SOURCE_PRIORITY (json-ld > opengraph > html-meta > rss > atom > sitemap > html), then confidence. RUN-NOTES #3 fixed a real bug here (facts now tagged with their true discovery tier).
- **Record ambiguity behavior:** conflicts are **silently resolved, not recorded**. `resolve()` keeps the winner, drops the losers, and emits no conflict record. Two sources disagreeing on `phone` leaves no trace that a disagreement existed. (Coverage-report implication below.)
- **No cross-page / cross-site dedup:** `deriveBusinessId` hashes (url, controller, fields) — deterministic per site, but there is no sameAs/@id/phone canonicalization across sites, no canonical-URL table, no entity registry. Out of scope for the two-site demo but absent as machinery.

---

## 5. COVERAGE REPORT DESIGN (design, not built)

The pipeline already computes a `PipelineReport` (`runExtractionPipeline`): `factsDiscovered`, `factsByClass` (Grill 7), `factsBySource`, `objectsGenerated`, `relationshipsGenerated`, `unsupported` (the UNSUPPORTED TYPES list), `privateWithheld`, `graphNodesVisited`/`graphNodeIds` (@GRAPH VERIFIED). It is **returned in memory but never persisted** — the runs dir holds only prose RUN-NOTES.

| Desired metric | Computable today? | Notes |
|---|---|---|
| SIGNALS DISCOVERED | ✓ | `factsDiscovered`, `factsByClass`, `factsBySource` — in-memory only, persist it |
| SIGNALS CONSUMED | ~ | derivable: `resolve()` output count vs `fields` input count; NOT recorded — needs one counter at the resolve call site |
| SIGNALS UNUSED | ~ | `factsDiscovered − consumed` (resolve losers + normalize drops); needs instrumentation (resolve currently returns only winners) |
| UNSUPPORTED TYPES | ✓ | `report.unsupported` (`malformed-block`, `expansion-failed`, `unmapped-property`, `unmapped-node-type`, `site-chrome-node`) — already structured |
| PAGES DISCOVERED | ✓ | `discover()` output (4 candidates/site) — not aggregated into the report; trivial to add |
| PAGES FETCHED / FAILED | ✓ | `acquire()` returns `ok`/`status` per source — the `acquired[]` array is already the input; aggregate counts + status codes into the report |
| OBJECTS / RELATIONSHIPS | ✓ | `objectsGenerated`, `relationshipsGenerated` — already there |
| CONFLICTS | ✗ | **needs new instrumentation**: `resolve()` must record (field, winner value+source, loser values+sources) per conflict. Losers are currently discarded. This is the highest-value missing metric — it is the honest record of "two sources disagreed" |
| MEDIA coverage | ✓ | manifest `observations` already carry outcome ingested/failed/rejected/duplicate per URL (Coppersmith: 11 ingested / 3 rejected). The media side is the most complete coverage surface |

Design constraints honored: no single confidence number — the report keeps classes, sources, and conflict records separate. Proposed report shape: one JSON per run (`runs/<date>-<site>/report.json`) = PipelineReport + acquisition summary + consumed/unused + conflicts[], sitting next to the raw bytes and RUN-NOTES. Persisting `fields` (ExtractedField[]) beside it would restore per-field provenance for every run retroactively.

---

## 6. KNOWLEDGE COMPOUNDING — the economics map

The loop exists informally; there is no first-class recipe store (grep for "recipe" in src/fyd: zero hits).

| Expensive intelligence | Cheap deterministic replay | Where the artifact lives today | Path exists? |
|---|---|---|---|
| Real fetch + honest failure list (RUN-NOTES #1–10) | extractor fixes (`@graph` expansion, true-tier tagging, feed `<title>` fix) | `runs/2026-09-21-*/RUN-NOTES.md` → code comments cite "RUN-NOTES #N" | **yes, by convention** — comments literally reference note numbers; the note is the learned artifact, the commit is the recipe |
| Site pattern learned (Elementor CTA layout, estimate-card markup) | named deterministic detectors | `service-cards.ts`: `pattern: "elementor-cta-services" \| "estimate-service-card"`, `extractor: "service-cards@2026-09-22"`, evidenceDetail (selector + span) | **yes** — this is the Firecrawl-`deterministicJson` shape done manually: pattern name ≈ schema key, detector ≈ cached extractor |
| Owner-corrected contact field | persistent first-party fact, SOURCE SAYS X / OWNER SAYS Y | `data/fyd-owner/<siteId>.json` (owner store) + `OwnerFieldCorrection` records + `USER_OVERRIDE` FactClass + `sourceDrifted` flag | **yes** |
| Component/ordering preference | persistent override | `OwnerOverrides`: `serviceOrder`, `hiddenServices`, `addedServices`, `addressVisibility` | **yes** |
| Full acquisition run | replayable fixture | fixture header: source digest, per-file digests, pipeline git commit, script path, observedAt | **partial** — reproducible *in principle* (same bytes + same commit + regen.ts), but `regen.ts` lives outside the repo (`/home/nolan/fyd-proof-run/`) and the per-field provenance to verify a replay is dropped (see §1) |

**Firecrawl `deterministicJson` comparison (concept level):** Firecrawl's idea is schema → cached extractor: once a page's extraction is solved, the (schema, site) pair maps to a frozen extractor that replays cheaply. FYD's manual version: the fixture + regen.ts + raw bytes *is* the cached result; `service-cards.ts` named patterns are the closest thing to cached extractors. What's missing for the full concept: (a) a keyed store of (source-URL, bytes-digest, extractor-version) → extraction result, so a re-ingest of unchanged bytes skips re-extraction entirely; (b) versioning on the extractor side that the *consumer* can read (the `extractor` tag exists on ParsedFact but is dropped at project()).

**Shareable vs tenant-specific (TenantOS):**
- **Safely shareable across tenants:** extractor code and named patterns (service-cards), RESOLVE priority, FactClass/Visibility vocabularies, visibility defaults, badge rules, the verifier itself. These are capabilities, not data.
- **MUST stay tenant-specific:** the extracted values, `fields`, media manifests (siteId-keyed, `/fyd-media/<hash>/` is content-addressed but manifests are per-site), projections, owner overrides/corrections/decisions, `depicts`/relationships. The owner store and projection dir are already per-site; no cross-tenant join exists in the FYD read path. The `controllerId: identity_fyd_compiler_test` on demo fixtures is a test identity, not a tenant boundary — a real multi-tenant promotion needs per-tenant controller ids.

**Top compounding-loop backlog candidates:**
1. **Persist `ExtractedField[]` + PipelineReport per run** (`runs/<date>-<site>/report.json`) — one write, unlocks: per-field provenance retroactively, the coverage report (§5), and replay verification.
2. **Survive per-field provenance through `project()` → dump → projection** — the single seam fix behind §1 and §2. Minimal shape: `fieldProvenance: Record<objectId, Record<field, {sourceUrl, sourceType, observedAt, evidenceRef, confidence, extractor, factClass}>>` on the projection; the read seam already has the shape for it.
3. **Record resolve() conflicts** — (field, winner, losers) — the honest-disagreement metric; feeds both the coverage report and owner review.
4. **`overlay-authored` in dump.py** — emit the kind the website repo already understands; stop labeling operator content as canonical journal fact.
5. **Keyed extraction cache** (bytes-digest, extractor-version) → skip re-extraction of unchanged pages — the actual Firecrawl-shaped compounding; safe to share extractors across tenants, never the values.
6. **Wire `field-visibility.ts` into the render path + a decision store** — the design is done; it needs storage and the call site the header names.

---

## 7. MEDIA AUDIT (Nolan's pipeline)

Against SOURCE ASSET → DIGEST → METADATA → OBJECT RELATION → DERIVATIVES → RESPONSIVE DELIVERY, on the live Coppersmith manifest (`generator: fyd-media@2`, 11 ingested / 3 rejected):

| Stage | Status | Evidence |
|---|---|---|
| SOURCE ASSET | ✓ | `MediaObservation` per attempt: sourceUrl, sourcePage, observedAt, outcome (ingested/failed/rejected/duplicate), reason, digest, redirectChain |
| DIGEST | ✓ | `digest` = sha256 of original bytes, dedupe key; per-asset + per-variant digests |
| METADATA | ✓ | width, height, originalFormat; `altText` + `altTextSource` ("source" \| "generated" \| "none") — generated alt text is labeled, never presented as source |
| OBJECT RELATION | ~ | `depicts: string[]` exists but is **empty on all assets**; the actual join is graph relationships (`represented_by`, via attach.ts). Two mechanisms, one unused — the join works through the graph, `depicts` is vestigial |
| DERIVATIVES | ✓ | `MediaVariant[]` with `derivedFrom` = original sha256 (verified: `derivedFrom == digest` on inspected variants), shape + proof (declared dims + content digest) |
| RESPONSIVE DELIVERY | ✓ | served locally from `/fyd-media/<hash>/` (`servedFrom`), never hotlinked |

**Rights classification** (`RightsSource`, enforced by `isAcquirable`, single vocabulary):
- `business-provided` ≈ OWNER-IMPORTED (strongest basis; none on the demos yet)
- `public-demo-source` ≈ CACHE/DERIVATIVE — **current behavior**: bytes fetched once, derivatives generated, served locally. NOT hotlink. Rights basis sentence recorded; explicitly never implies FYD copyright ownership
- `unclear-reference-only` ≈ UNKNOWN RIGHTS — pipeline **refuses** to fetch/derive/serve; reference retained in manifest observations only (the 3 rejected Coppersmith observations). Never infer ownership from display ✓

Media provenance query surface (`media/provenance.ts`, `getMediaProvenance`/`listMediaProvenance`) exposes the full chain per asset: source URL, source page, observedAt, digest, dimensions, rights classification, derived-asset lineage. This is the strongest provenance implementation in the whole lane.

---

## Cross-cutting findings

1. **The evidence model is strongest at the edges, weakest in the middle.** Acquisition records rich per-field evidence (`ExtractedField`); rendering enforces fail-closed binding verification; the media pipeline is exemplary. The middle — `project()` → `dump.py` → projection — **strips per-field provenance down to an object-level ref**. Every "where the chain breaks" finding in §1 is the same break at different facts.
2. **Parallel universes confirmed.** PING core `EvidenceAuthority` (`ping-runtime/evidence/evidence_authority.js`: accumulate → verify → rank over `ping_events`, with hash/lineage/namespace checks) has **zero references from the FYD codebase and zero FYD references in it**. The only connection is the journal-as-transport for `FYD_SITE_OVERLAY` events and `ping-event:<eid>` string pointers the FYD side never resolves. FYD does not write to PING's `objects`/`lineage`/`projections` tables. Answer to the audit question: **parallel universes, joined only by unverified string refs.** The natural seam, if ever wanted: the read seam could resolve `ping-event:` refs through the journal — but nothing needs it today since overlay content is demo-scoped.
3. **Classification is decided at render, not at extraction.** The extractor's Grill-7 classes die in `project()`; the renderer defaults to "direct". The honest fix is provenance survival (§2a), not a new authority.
4. **The overlay path is the weakest honesty link.** Operator-authored demo content is labeled `canonical-journal` by the producer while the consumer already has the truthful `overlay-authored` kind. One-line-class fix in `dump.py`, high honesty value.
