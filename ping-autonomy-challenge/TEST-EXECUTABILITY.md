# PING Autonomy Grand Challenge: Test Executability Ranking

Date: 2026-09-24. Scope: all 9 `FAIL-N-*.md` reports and all 8 present
`FAIL-N-falsification.md` files (FAIL-4 has no falsification file as of this writing).
Research only. No product code was modified.

## Method

Every original falsifiable test and every strengthened test or fixture battery was
extracted as its own ranked row. Where a falsification proposed a battery of
independently executable fixtures with distinct harnesses, each fixture battery is
its own row. Where the fixtures share one harness and one oracle, they stay as one
row and the row lists the included poisons.

Scoring per test, each dimension 1 to 5 (higher = more executable):

- H: harness exists (1 = hypothetical, 5 = runnable today against real code)
- O: oracle cost (1 = needs a human or hours, 5 = seconds, automated)
- D: determinism of the test itself (1 = LLM / live-network dependent, 5 = local deterministic)
- P: poisoning feasibility (1 = cannot construct now, 5 = trivial fixture)

Total = 2H + O + D + P (max 30). Ties broken in favor of the higher H score, then in
favor of tests that cover the real production pipeline rather than a mock.

Spot checks were run against the working tree at `~/workspace/fyd/`. That tree is a
working copy (a repo snapshot directory plus lane scratch dirs), not necessarily the
canonical repository, so status labels describe what exists in this tree, not what is
shipped. Where the reports and the tree disagree, the tree wins.

Components of note:

- `safe-link.ts` and `safe-link.test.ts` exist with 16 cases. Branded URL capability
  types (HrefUrl / TelUrl / MailtoUrl) were not found; the resolver is function based.
- `binding-verifier.ts` exists with `verifyPresentationBinding`, `verifyBinding`,
  `verifySpecBindings`, `dropUnboundBindings`, `classifyRenderAtom`,
  `buildVerifiedRenderModel`, and dedicated test files.
- `structural-diff.ts` exists with `diffSiteSpecs` and `materiallyDifferent`, plus a
  real test file (trade vs knowledge tenant; same-input no-difference).
- `generated-presentation.ts` exists with the refusal behavior and
  `GeneratedCopySlot`.
- `~/workspace/fyd-lane/onboarding/extractor.ts` exists with the live @graph blindness
  confirmed at the `parseJsonLd` function.
- `step1-regen.ts` exists (`product-lane/regen/`).
- `render-model.ts`, `determinism-probe.ts`, `field-visibility.ts` exist.
- Overrides API exists (`api/fyd/objects/[objectId]/overrides/route.ts`,
  `patch-loop.ts`, `owner-context.ts`, plus tests).
- Owner decision store exists (`data/fyd-owner/happy-place.json`).
- Canonical fixtures exist
  (`src/fyd/object/__tests__/fixtures/projections/happy-place.json`,
  `coppersmith-plumbing.json`); raw corpora exist (`src/fyd/proceduralize/raw/`).
- Python Playwright with Chromium 1243 is installed in this sandbox, so browser
  oracle tests are locally runnable. WebKit is not installed, so WebKit engine-parity
  tests are blocked here.
- `jsonld@9.0.0` is pinned in package.json. Playwright is in devDependencies.
  Jest is the test runner and node_modules is installed.
- `canonical.ts` exposes `canonicalizeSpec` and `semanticDigestOf`.
- Ask FYD pipeline exists (`api/fyd/ask/`, `ask-pipeline.ts`, `src/fyd/ask/*`).
- No quarantine store, extraction receipts, shape-coverage registry, or
  declare-at-use dispatch were found.
- No `SOURCE_CHANGED_AGAINST_OWNER_ASSERTION` typed event, three-way merge policy,
  owner task queue, minting auth, positive-license gate, red-team mutation suite,
  channel registry, priority policy, or audit log were found.
- Tenant isolation is partial: tenant-scoped ask tests exist, but a global tenant
  filter at the data-access layer was not located.

## Harness inventory

### EXISTS (runnable today)

- Safe URL resolver plus test suite: `src/fyd/sitespec/safe-link.ts`,
  `src/fyd/sitespec/__tests__/safe-link.test.ts`
- Binding verifier plus tests: `src/fyd/sitespec/binding-verifier.ts`,
  `bindings.test.ts`, `binding-verifier.test.ts`, `verified-render-model.test.ts`
- Structural diff plus tests: `src/fyd/builder/structural-diff.ts`,
  `src/fyd/builder/__tests__/structural-diff.test.ts`
- Generated-copy refusal: `src/fyd/builder/generated-presentation.ts`
- Broken JSON-LD extractor under test: `~/workspace/fyd-lane/onboarding/extractor.ts`
- Field visibility seam plus tests: `src/fyd/sitespec/field-visibility.ts`,
  `field-visibility.test.ts`
- Render model plus determinism probe: `src/fyd/sitespec/render-model.ts`,
  `src/fyd/sitespec/__tests__/determinism-probe.ts`
- Regeneration pipeline script: `~/workspace/fyd/product-lane/regen/step1-regen.ts`
- Overrides API, patch loop, owner context, tests:
  `src/app/api/fyd/objects/[objectId]/overrides/`
- Owner decision store: `data/fyd-owner/happy-place.json`
- Canonical fixtures and raw corpora as listed above
- Browser oracle stack: python Playwright, Chromium 1243,
  `~/workspace/fyd/product-lane/step3-browser-proof.py`
- Ask FYD pipeline: `src/app/api/fyd/ask/`, `src/fyd/ask/`
- Semantic digest utilities: `src/fyd/builder/canonical.ts`
- Planner and source refresh: `src/fyd/builder/planner.ts`,
  `src/fyd/builder/source-refresh.ts`, `src/fyd/builder/semantic-diff.ts`

### PARTIAL

- Provenance-pointer contract: `classifyRenderAtom` emits classification plus
  `evidenceRef` / `ownerAssertionRef` and UNKNOWN-with-reason, but fail-closed
  behavior on a dangling pointer across regen was not observed.
- Tenant isolation: tenant-scoped ask tests exist; global enforcement not located.
- Post-generation oracle: browser proof script exists; the ancestor-tracing script
  named in FAIL-1 was not located; no gated promotion harness.
- Deny-by-default visibility: the visibility seam exists; deny-by-default for new
  fields was not verified.
- Merge machinery: `source-refresh.ts` exists; no three-way policy and no typed
  conflict event.
- Source diff: `semantic-diff.ts` exists; a first-class base-to-new diff artifact
  was not verified.
- Channel-level leak fix (Pergola follow-up): asserted in the falsification report;
  the SiteClient filtering code path was not located by name in this tree.

### NOT-FOUND

- Branded URL capability types, geometry capability types
- Quarantine store, UNRECOGNIZED_SHAPE events, extraction receipts, shape registry
- Second independent JSON-LD lineage (jsonld@9.0.0 is production's own)
- Typed conflict record, owner task queue, minting auth
- Positive-license projection gate, red-team mutation suite, channel registry
- Priority policy machinery, audit log, owner-action surfacing path
- Deterministic predicate extractor for free prose, answer-grammar enforcer
- WebKit runner, drain-SLA process, noise corpus, label-without-change ledger
- Graph-distance threshold calibration (FAIL-7 iv) and evidence-density bars

## Ranked test executability (all tests, most executable first)

O = original test, S = strengthened variant. Scores are H/O/D/P = total.

| # | ID | Test (short description) | Harness | H/O/D/P = total |
|---|----|--------------------------|---------|-----------------|
| 1 | F2-S1-O | Schema-typed trust: proceduralize end to end, hostile URL strings, grep rendered HTML | EXISTS safe-link suite, 16 cases | 5/5/5/5 = 25 |
| 2 | F5-S1-O | verifyPresentationBinding: 24/7 fixture, price conflict, unbound claim | EXISTS binding-verifier suite | 5/5/5/4 = 24 |
| 3 | F4-S4-O | Content-derived identity: double observe, grep for uuidv4, ID-list compare | EXISTS fixtures, grep | 5/5/5/4 = 24 |
| 4 | F7-S1-O | Variance coupling: diff happy-place vs coppersmith, byte-compare diff output | EXISTS structural-diff suite, raw corpora | 5/5/5/4 = 24 |
| 5 | F2-S2-O | Sink-side: poisoned renderer input model, invoke renderer directly, grep | EXISTS resolver, renderer exists | 4/5/5/5 = 23 |
| 6 | F3-S1-S | Refusal counterfactual: hostile fixture must route through registered handling or explicit refusal | EXISTS broken extractor, fixture exists | 4/5/5/5 = 23 |
| 7 | F2-S3-O | Fail-closed defaults: indeterminate inputs rendered through resolver, inspect output | EXISTS resolver | 4/4/5/5 = 22 |
| 8 | F7-S3-O | Provenance-typed slots: ungrounded claim, conflicting service lines, ungrounded hours | EXISTS generated-presentation refusal | 4/5/5/4 = 22 |
| 9 | F4-S1-O | Declared-input purity: 5 env-varied runs byte-compared, one-input-change re-run | PARTIAL env harness; step1-regen and probe exist | 4/4/5/4 = 21 |
| 10 | F8-S1-O | Typed patches: hostile re-dump, field vanish, store byte-compare, patch log | EXISTS owner store, overrides route | 4/4/4/4 = 20 |
| 11 | F8-S3-O | Golden-set survival: sabotage extractor a/b, skip overlays, require gate stop | PARTIAL needs golden suite built from STEP-07 fixtures | 3/4/5/4 = 19 |
| 12 | F4-S3-O | Typed semantic render model: 5 inputs, gate log, GENERATED excluded from hash, re-run with seed | PARTIAL render-model and verifier exist; hash gate unverified | 3/4/4/4 = 18 |
| 13 | F5-S3-O | Provenance pointers: dangling E9 claim, conflicting crawl, E9 deleted then regen | PARTIAL classification exists; regen-dangling behavior unverified | 3/4/4/4 = 18 |
| 14 | F2-S1-S | Shared oracle fix plus construction-site audit: entity-decode, WHATWG parse, sink audit | PARTIAL audit manual; URL parsing built in | 3/4/4/4 = 18 |
| 15 | F6-S1-O | Positive-license gate: 4-item fixture, canary sweep, denial log | NOT-FOUND gate; canary method trivial | 2/4/5/5 = 18 |
| 16 | F6-S2-O | Visibility schema attribute: flip, double regen, canonical diff | PARTIAL visibility seam exists; diff events unverified | 3/4/4/4 = 18 |
| 17 | F8-S3-S | Retraction, coverage roster, out-of-scope correction, gate bypass | PARTIAL roster check and bypass test doable on existing endpoints | 3/3/4/4 = 17 |
| 18 | F6-S3-O | Trusted-context tenant test: two tenants, canaries, attack set | PARTIAL tenant tests exist; full harness heavier | 3/3/4/4 = 17 |
| 19 | F4-S2-O | Replay-mismatch tripwire: 3 sabotage trials through publish gate | PARTIAL machinery exists; publish gate not built | 2/4/5/3 = 16 |
| 20 | F1-S2-O | Typed projection seam: 216px hero, javascript: URL, unbound claim, private address | PARTIAL URL side exists; geometry types NOT-FOUND | 2/4/4/4 = 16 |
| 21 | F3-S1-O | Shape-coverage registry: unregistered-shape gate, mutated fixture, extractor change | NOT-FOUND registry; fixtures exist | 2/4/5/3 = 16 |
| 22 | F1-S1-O | Post-generation oracle: Chromium 375px scrollWidth per frame, 10 runs, ancestry tracing, control frame | PARTIAL browser stack exists; fixture and tracing script must be rebuilt | 3/3/3/3 = 15 |
| 23 | F6-S4-O | Adversarial boundary suite: 2 mutations injected, determinism double-run | NOT-FOUND suite; mutations injectable by hand | 2/3/4/4 = 15 |
| 24 | F8-S4-O | Source-change diffing: phone change, added service, vanished field, scoping | PARTIAL source-refresh exists; diff artifact unverified | 2/3/4/4 = 15 |
| 25 | F8-S4-S | Out-of-band write, semantic-same string, resurrection of retracted fact | PARTIAL procedure scriptable; source of change must be simulated | 2/3/4/4 = 15 |
| 26 | F1-S3-O | Canonical pure projection: 4 runs, byte-compare, provenance log, version pin | PARTIAL determinism probe exists; purity guarantee and pin not built | 2/3/4/4 = 15 |
| 27 | F7-S2-O | Evidence-gated composition: graphs A/B, justification record, strip services | PARTIAL planner exists; bars and justification record absent | 2/4/4/3 = 15 |
| 28 | F3-S4-O | Dual-parser cross-check: disagreement events, quarantine on conflict | NOT-FOUND second lineage; jsonld pinned | 2/3/4/3 = 14 |
| 29 | F1-S2-S | Emergent composition, unbreakable token, scrollbar, embed code, spurious evidence, declassification | PARTIAL inventory audit by grep; static gate absent | 2/3/4/3 = 14 |
| 30 | F1-S3-S | Cross-machine, undeclared-input mutation, label-without-change, anchor-rot, repair composition, bump gate | PARTIAL two checkouts doable; digest pinning absent | 2/3/4/3 = 14 |
| 31 | F2-S3-S | Legitimate-variety corpus, boundary fuzzing, neutralization telemetry, cascade, re-arming | NOT-FOUND corpus and telemetry; fuzzing feasible | 2/3/3/4 = 14 |
| 32 | F3-S1-S | Declare-at-use dispatch, independent fixture oracle, refusal counterfactual | NOT-FOUND dispatch; refactor is the test | 2/3/4/3 = 14 |
| 33 | F7-S1-S | Gaming injection, explainability decomposition, duplicates, verifier corpus, owner attribution | NOT-FOUND d_out decomposition; fixtures easy | 2/3/3/4 = 14 |
| 34 | F7-S2-S | Median pair, bar-tuning audit, per-section counterfactual sweep, duplicate inflation | NOT-FOUND bars; sweep script doable | 2/3/4/3 = 14 |
| 35 | F7-S3-S | Runtime brand audit, cast audit, mismatched binding, minting authority, correction retirement, boilerplate budget | PARTIAL runtime brands need typing; most refusals testable | 2/3/4/3 = 14 |
| 36 | F8-S2-O | Three-way merge: fixture A/B/C, conflict event, resolutions, policy | NOT-FOUND merge machinery and typed event | 1/3/4/4 = 13 |
| 37 | F5-S3-S | In-place mutation, minting authority, conflict presentation, event consumer, graph outage | PARTIAL graph outage testable; minting auth absent | 2/3/3/3 = 13 |
| 38 | F6-S2-S | Unauthorized-actor marking, step-up, cache invalidation, missing attribute, mass flip, two-tenant | PARTIAL visibility seam; auth and cache layers absent | 2/3/3/3 = 13 |
| 39 | F8-S1-S | Merge/split re-anchor, multi-actor conflict, jurisdiction and actor test | PARTIAL store exists; real auth absent | 2/3/3/3 = 13 |
| 40 | F3-S2-O | Extraction receipts: invariant check, regen pair diff | NOT-FOUND receipts | 1/3/4/3 = 12 |
| 41 | F3-S3-O | Unknown-shape quarantine: quarantine store, gap events, control site | NOT-FOUND quarantine | 1/3/4/3 = 12 |
| 42 | F3-S2-S | Candidate definition, laundering closed, content-hash regen diff, correction-ID reconciliation | NOT-FOUND receipts | 1/3/4/3 = 12 |
| 43 | F6-S3-S | Multi-tenant build loop, mint-time substitution, cache keys, retrieval inspection, write isolation | PARTIAL tenant tests; heavier harness | 2/2/3/3 = 12 |
| 44 | F9-M1-O | First-class CONFLICTING: two observations, double run, Ask FYD both readings | NOT-FOUND CONFLICT record; LLM dependent | 2/3/2/3 = 12 |
| 45 | F9-M3-O | Auditable priority policy: conflicting hours, owner 7-4 correction, policy audit trail | NOT-FOUND policy machinery | 1/3/4/3 = 12 |
| 46 | F8-S2-S | Conflict-lifetime test, post-resolution audit, confirm-fact tie | NOT-FOUND clock policy | 2/2/3/3 = 12 |
| 47 | F1-S1-S | Font swap, lazy load, interaction, engine parity, scrollbar, repair determinism, divergence, correction placement, shipped-DOM compare | PARTIAL browser stack; WebKit not installed; interaction driver absent | 2/2/2/3 = 11 |
| 48 | F5-S1-S | Flourish battery, media pairing, hostile derivation, visibility through records, downstream collapse | NOT-FOUND flourish taxonomy; fixtures easy | 2/2/2/3 = 11 |
| 49 | F6-S1-S | Registry completeness, novel-channel property test, value-level canary, URL battery, evidence support | NOT-FOUND channel registry | 1/3/3/3 = 11 |
| 50 | F5-S2-O | Prevention-first generation: 20 high-temp runs, extract every predicate, zero unsupported | NOT-FOUND predicate extractor; LLM dependent | 2/2/1/3 = 10 |
| 51 | F9-M2-O | Certainty attenuation: conflicting vs agreeing fixture, grammar check | NOT-FOUND seam checker; LLM dependent | 2/2/1/3 = 10 |
| 52 | F9-M4-O | Owner task queue: two refetch cycles, exactly one open task | NOT-FOUND task queue | 1/2/3/3 = 10 |
| 53 | F2-S2-S | Versioned sink inventory, per-sink allowlists, Ask FYD renderer, encoded map URL | NOT-FOUND inventory; writing it is the test | 1/2/3/3 = 10 |
| 54 | F3-S4-S | Comparison projection, lineage assertion, positive control, sampler latency | NOT-FOUND second lineage and sampler | 1/2/3/3 = 10 |
| 55 | F6-S4-S | Registry-derived mutations, mutant reachability, fixture fidelity, normalization battery | NOT-FOUND registry | 1/2/3/3 = 10 |
| 56 | F9-M3-S | Legitimacy metadata, policy-version flip, non-engineer loser visibility, safety precedence, log integrity | NOT-FOUND policy and log | 1/2/3/3 = 10 |
| 57 | F9-M4-S | Owner-action path, resolved-then-refetch, owner-absent bound, flooding, contested ownership, task identity | NOT-FOUND task queue | 1/2/2/3 = 10 |
| 58 | F9-M1-S | Formatting-drift corpus, normalization rule, identity key, retention sweep, graph-only assertions | NOT-FOUND normalization rule; human oracle for semantic sameness | 1/2/2/3 = 9 |
| 59 | F3-S3-S | Noise corpus budget, classifier boundary controls, conflict controls, drain SLA | NOT-FOUND corpus, controls, drain process | 1/2/2/2 = 8 |
| 60 | F5-S2-S | Frozen predicate extractor, violation rate, adversarial paraphrase, intent channel, template alternative | NOT-FOUND extractor; LLM dependent | 1/2/1/3 = 8 |
| 61 | F9-M2-S | Prominence requirement, adversarial answer suite, machine seams, enforcer declaration, false-conflict bound | NOT-FOUND enforcer technology | 1/2/1/3 = 8 |

## Bottom quartile: the single missing harness piece per test

Rows 47 through 61 are the bottom 15. Each gets exactly one unblocker.

- 47, F1-S1-S: a real-device / WebKit runner. WebKit is not installed in this sandbox
  and no device farm is provisioned, so engine parity, font settling, and
  orientation tests cannot run here.
- 48, F5-S1-S: a written flourish taxonomy. Without it, "flourish vs factual" has no
  ground truth and the battery cannot be scored.
- 49, F6-S1-S: a channel registry enumerating every data path to a channel. Every
  other fixture in the battery keys off it.
- 50, F5-S2-O: an executable predicate instrument. "Extract every factual predicate"
  has no deterministic implementation, so the 20-run comparison cannot be computed.
- 51, F9-M2-O: an executable answer-seam checker (constrained decoding,
  post-hoc checker, or prompt contract). Without one there is no machine assertion.
- 52, F9-M4-O: an owner task queue (storage, queue, and surfacing). The test
  asserts on its contents and it does not exist.
- 53, F2-S2-S: an enumerated, versioned sink inventory. The test's premise is that
  the inventory exists to be tested against; writing it is the work.
- 54, F3-S4-S: a second independent JSON-LD lineage in the JS ecosystem. jsonld@9.0.0
  is production's own parser, so a same-version cross-check is circular.
- 55, F6-S4-S: the channel registry again. Mutations must be derived from it and
  fixture fidelity is checked against it.
- 56, F9-M3-S: priority-policy machinery with an append-only audit log. The battery
  asserts on policy versions, flips, and loser visibility, none of which exist.
- 57, F9-M4-S: the owner task queue with a staleness policy and an engaged-owner
  precondition. Without it every sub-test asserts on missing state.
- 58, F9-M1-S: a declared conflict normalization rule plus identity key (the Q1
  answer from the falsification). Without it, "formatting drift" has no decision
  procedure.
- 59, F3-S3-S: a drain-SLA process with a defined noise budget. The test measures
  time-to-drain against a policy that does not exist.
- 60, F5-S2-S: a frozen predicate extractor with a pre-registered violation rate
  and rubric. LLM-judged compliance cannot be scored without one.
- 61, F9-M2-S: the enforcement technology for the answer grammar. The battery
  requires naming it before any fixture is meaningful.

## Not actually falsifiable as written

These tests cannot discriminate their claims without the strengthened versions.
They are listed so Monday-morning work does not start on them.

- F5-S2-O: "extract every factual predicate from generated prose" has no
  deterministic implementation. The comparison procedure cannot be run. Its own
  falsification calls it unexecutable.
- F1-S1-O, poison #7: the structural-divergence signature is undefined and no
  fixture is given. That sub-claim is untestable as specified; everything else in
  the test is executable.
- F2-S1-O, F2-S2-O, F2-S3-O: the grep oracle is blind to entity-encoded payloads.
  A pass does not establish that the browser received nothing unsafe. The
  strengthened oracle (entity-decode plus WHATWG URL parse) is what makes them
  falsifiable.
- F3-S1-O, case (i): "add a form to accepted handling without touching the
  registry" is unexecutable because "accepted handling" is not observable without
  the declare-at-use dispatch the strengthened test requires.
- F9-M1-O: the fixture carries real timestamps that contradict its own
  determinism expectation, and the Ask FYD assertions are M2's work. The test
  cannot attribute a pass to M1.
- F9-M4-O: "exactly one open task" certifies permanent UNRESOLVED as success, and
  silence passes either way (an empty queue looks identical to a resolved one).
  It cannot discriminate the failure it names.
- F6-S4-O: the suite is green on the pre-Pergola architecture, so it does not
  discriminate the class it claims to prevent.
- F7-S1-O, injection (ii): the test passes gaming variants that dilute the signal,
  so a pass does not establish the anti-gaming claim. The strengthened gaming
  fixtures are the discriminating test.
- F1-S2-O, geometry sub-claim: the expected outcome (a 500 to 580px hero failing
  the constructor) contradicts the report's own physics. Emergent overflow means
  the fixture can pass the constructors while still overflowing, so the specified
  outcome cannot be produced even if the claim were true. Running it falsifies the
  mechanism, which is useful, but the sub-claim as specified is backwards.
- F8-S2-O, temporal sub-claim: the three modes are evaluated at merge time, so the
  lifetime attack (an unresolved conflict lasting too long) passes under the
  test. The time dimension is not covered.

## Caveats and notes

- FAIL-4 has no falsification file. Its four originals (F4-S1-O through F4-S4-O)
  were ranked from the original report only. They score well because the claimed
  harnesses (fixtures, step1-regen, determinism probe, semantic render model)
  were all found in the tree.
- The Ask FYD seam is the thinnest coverage in the whole set. F2-S2-O, F5-S1-O,
  F5-S2-O, and F5-S3-O all claim Ask FYD coverage, but their verdicts come from
  graph-side checks (resolver, binding verifier, render model) while the Ask FYD
  renderer and answer pipeline are exercised by none of them. A real FYD
  autonomous test for these claims needs an Ask FYD renderer fixture, which only
  appears in the strengthened batteries (F2-S2-S, F5-S1-S, F9-M2-S).
- F1-S1-O's 10-run protocol ran against one tenant family. The "arbitrary site"
  generality claim would need the tenant matrix from F1-S1-S to mean anything.
- F6-S3-O is ranked on the actual attack surface (tenant-scoped ask tests plus
  the data-access layer), which is narrower than the test's "full pipeline"
  wording. The strengthened battery is the full claim; the original is a
  starting slice.
- Scores are ordinal, not cardinal. A 20 is not twice as executable as a 10.
  The practical cut is: rows 1 through 24 can start Monday with existing code
  and fixtures; rows 25 through 46 need one or two new harnesses; rows 47
  through 61 are design work first.
