# FYD GOLDEN PATH + OWNER TRUST LOOP — FORENSIC VERIFICATION (Phase 21 / P9)

Date: 2026-09-23. Investigator: forensic subagent (read-only; one authorized docstring patch, uncommitted).
Bases:
- (a) ADAPTER surface: /home/nolan/projects/ping-constitutional, branch constitutional-convergence-v2, HEAD a69bb68f. All src/fyd + src/lib + src/app citations below are against this tree unless noted.
- (b) CANONICAL CORE: /home/nolan/ping — read-only; only the projection-dump crossing was consulted (tools/fyd-site-projection/dump.py, var/fyd-projections/). No secrets read, nothing written, no processes touched.
- Deployed app: /home/nolan/projects/ping (separate repo, github.com:piging2/fyd.git) serving on Pig :3100. Trust-loop-critical files are byte-identical between (a) and the deployed repo (verified via full-tree diff; only drift: builder/owner-intent.ts has an extra `strategy` field in the deployed repo, plus unrelated test/component files).

Method: built on predecessor's raw pulls in ~/workspace/constitutional-sprint/fyd-path/batch-*.txt (spot-verified against live tree; no re-pull needed), plus live grep/sed/curl verification of every load-bearing claim. Statuses: VERIFIED (file:line) / PARTIAL / BROKEN / UNVERIFIABLE.

Headline: the trust loop is REAL and mechanically sound (corrections survive regeneration; evidence is never mutated; Ask FYD is deterministic and LLM-free). The golden path's FRONT HALF (auth → claim) is code-complete but operationally hollow on the deployed app (Google auth 503/unconfigured; demo-owner identity only; no Facebook anywhere). The BACK HALF (customize → persist) is fail-closed-broken on the live serve path because the demo journal is unreachable (phantom 127.0.0.1:18199).

---

## 1. Golden-path per-arrow verification table

| # | Arrow | Status | Evidence |
|---|-------|--------|----------|
| 1 | Unauthenticated visitor → entry | VERIFIED | `src/app/fyd/page.tsx:1-13` — /fyd onboarding entry: PASTE URL → preview → claim → authenticate. Registration never placed before value. |
| 2a | Continue with GOOGLE (auth leg) | VERIFIED (code) / INACTIVE (deployed) | `src/fyd/identity/provider.ts` (Google OIDC: PKCE S256, JWKS RS256 verification, iss/aud/exp/iat/nonce checks), `src/fyd/identity/callback-flow.ts` (start/callback, state+nonce+PKCE verifier in signed cookie), `src/fyd/identity/principal.ts:57` (deriveIdentityId = uuidv5(FYD_IDENTITY_NAMESPACE, "provider-account:"+provider::issuer::subject)), `src/fyd/identity/session.ts:15,16,70,80` (signed session/state cookies), `src/app/api/fyd/auth/google/start|callback|session|signout|unlink|link/google/*` routes. **Live 2026-09-23:** `/api/fyd/auth/google/start` → 503 AUTH_NOT_CONFIGURED; `/api/fyd/auth/session` → `{"authenticated":false,"reason":"session_not_configured"}`. Provider-console credentials not installed. |
| 2b | Continue with FACEBOOK (auth leg) | BROKEN (absent) | No Facebook Login, Facebook App, App ID, or FB OAuth anywhere in src/fyd (grep: only hits are `src/fyd/harvest/IDENTITY-PROOF-EVIDENCE.json` and a raw harvested HTML fixture — not auth). |
| 3 | Callback → session | VERIFIED (code) | `callback-flow.ts` completeGoogleCallback: BAD_STATE/STATE_MISMATCH/MISSING_CODE typed failures; `session.ts:119-131` serializeSessionCookie. Unverifiable live (no credentials). |
| 4 | PING identity minting | VERIFIED (adapter-local) | `principal.ts:57` deriveIdentityId; `principal.ts:156` signInOrSignUp (no silent email merge — collision flagged, separate identity); `principal.ts:200` linkProviderAccount (requires fresh verified proof; refuses steal via ACCOUNT_BOUND_ELSEWHERE; refuses unlinking last auth method). Bindings durable in `data/fyd-identity/accounts/*.json` (`identity/file-store.ts:44`). **Seam note:** this is a FYD-local uuidv5 namespace, NOT a core-PING person-identity mint. No core identity authority is created or written to. |
| 5 | Provider authorization record (grant storage) | BROKEN-BY-DESIGN | Deliberately no grant store: "Sign-in scopes are openid, profile, email only. We never request offline_access and we discard provider tokens after the ID token is verified" (`identity/provider.ts` header; `callback-flow.ts`: `tokens = null`). There is nothing to refresh because nothing is kept. |
| 6 | Anonymous URL → preview (onboarding) | VERIFIED | `src/fyd/onboarding/anonymous-preview.ts:136` generateAnonymousPreview — the ONLY anonymous entry point doing network I/O; gate (`net/rate-limit.ts`) → `net/safe-fetch.ts:251` safeFetchPage (SSRF gate: bad schemes, credential URLs, private/loopback/link-local/CGNAT DNS, hostile redirects) → crawl budget → origin semaphore → dedup cache. Leaves OBSERVED claim + nothing else. |
| 7 | Business candidate discovery (Facebook) | BROKEN (unavailable) | `src/fyd/refresh/facebook-source.ts` checkFacebookAvailability: genuinely unavailable (no FB link on site, no page surfaced, facebook-cli not on Pig). Conflict machinery proved on a clearly-labeled synthetic fixture. Website discovery: VERIFIED (`refresh/website-observe.ts` extractRawFacts, claims graded `website_statement`). |
| 8 | Owner confirmation (claim) | VERIFIED | `src/fyd/claim/machine.ts:80` claim() — requires authenticated identity (null → fail closed), refuses DEMO_CONTEXT_IDS (`:22`), refuses non-observed states. Claims durable: `data/fyd-claims/<resourceId>.json`, atomic writes (`claim/store.ts`). |
| 9 | Verify control (proof of ownership) | PARTIAL | `claim/machine.ts:113` verifyControl requires proof from an implemented method; `claim/verification-seam.ts:69,84` — exactly one method implemented (operator-attestation, honestly labeled "a statement, not a cryptographic proof"); dns-txt / well-known-file / html-meta-tag / cms-integration / provider-evidence all `implemented:false`. |
| 10 | BUILD MY FYD (one operation) | BROKEN (absent) | No `buildBusiness` anywhere in src/. The pipeline exists as components, not as the single BuildBusiness operation (see §5 divergence). |
| 11 | Acquisition | PARTIAL | `acquisition/acquisition-adapter.ts` header: "Types only. No implementation in this module." L0–L3 implemented (safe-fetch, budgets, extractor); L4 AI interpretation designed but NO LLM/AI-SDK wiring anywhere in src/fyd (grep llm/openai/anthropic/ai-sdk/gemini/vertex/bedrock → zero hits in src/fyd; the one ai-sdk hit is `src/lib/sentiment/classifier-provider.ts`, VADER rule-based, unused in the ask path). |
| 12 | Evidence | VERIFIED | Claim/Observation model with grades (`website_statement`), provenance refs, conflict detection keeping both claims (`refresh/conflict.ts:49`). |
| 13 | Object synthesis / entity resolution | PARTIAL | `builder/object-builder.ts` + `proceduralize/` pipeline exist; conflict machinery (`conflictSurfaceText`) implements "we found two different addresses, which is current?" semantics with both claims preserved. The one-business-object invariant is enforced structurally by the overlay/projection seam (one graph per site), not by a verified entity-resolution module — not fully audited here. |
| 14 | Site projection | VERIFIED | `builder/planner.ts` planSite (deterministic); prohibitedPositioning enforced (`planner.ts:386` assertGeneratedPresentationVerified); **emission gate wired**: `buildVerifiedRenderModel` (`sitespec/binding-verifier.ts:523`) throws BindingVerificationError on ANY UNKNOWN atom; planner calls it at `:398` before returning the spec. Renderer can never be handed an unverified model. |
| 15 | Render | VERIFIED | Demo routes render; `ui/fail-closed.tsx` (unreadable data → Unknown/Unavailable, never fake healthy/zero); `ui/evidence-state.tsx` (observed/inferred/unverified/unknown/unavailable/withheld labels with receipts). |
| 16 | Owner preview / correct / hide / confirm | VERIFIED (code) | `src/app/api/fyd/objects/[objectId]/overrides/route.ts`: PROPOSE (typed OwnerCommand + preview + digests, nothing written) → APPROVE (409 stale_proposal on digest mismatch, capability re-evaluated per call, authority-gradient consequence tiers, bound approval record). **Deploy gate (HEAD a69bb68f):** both stages require demo-owner env + private host (`owner-mode/gate.ts` isDemoOwnerModeEnabled/isPrivateHost); otherwise typed 403 `demo_owner_mode_required` before any object I/O. |
| 17 | Customize with FYD | PARTIAL (fail-closed on live path) | `customize/server.ts` loadCustomizedSite (projection → spec → approved intent layer; directives whose target vanished are `unresolved`, kept not dropped). Approve journals FYD_SITE_OVERLAY via `emitOverlayEvent` (`:78`) → demo journal at `FYD_CUSTOMIZE_GATEWAY_URL ?? http://127.0.0.1:18199/events` (`:70`). On journal failure the route returns **502 journal_unavailable: "The approval was NOT recorded"** — nothing applied (`src/app/api/fyd/customize/route.ts:304-314`). Per the reachability report the live serve path has the gateway disconnected → this arrow is BROKEN-but-honest on the deployed app: approvals can never journal. |
| 18 | Publish | BROKEN (absent) | No publish route. `owner-mode/capability.ts:150-155`: demo denies `owner.publish` ("publishing would be an external effect"). Ask agent boundary: `ask/capabilities.ts` FORBIDDEN_AGENT_EFFECTS includes site.publish. Social writes go only through PING's canonical signed-envelope path. |
| 19 | Ask FYD (concierge) | VERIFIED | See §3. |

---

## 2. Owner trust-loop verdict

**VERDICT: the trust loop holds. Owner corrections survive regeneration; evidence is never mutated; the two are kept structurally separate.**

Proof points (all in the worktree):

1. **Corrections are durable, append-only state.** `src/fyd/object/owner-events.ts:622` appendOwnerEvent — every owner command appends one provenance-backed event; `projectOwnerState` is a pure projection over the log. Store: `data/fyd-owner/<objectId>.json`, separate from source state ("Source re-ingestion reads and writes only source state; it can never erase owner intent" — `object/owner-store.ts` header). Reverting appends an `owner.restored-fact` event; the correction event stays.

2. **Corrections are composed at the read seam, never into the source.** `src/fyd/data/ping-object-source.ts:241-249`: digest is verified FIRST; the owner overlay (`object/owner-overlay.ts` applyOwnerFieldCorrections) is composed AFTER verification. The projection file is never mutated, its digest still verifies, and the raw `/api/fyd/projection` endpoint still serves source-truth. Source re-dump rewrites only the projection; the overlay re-reads the owner store on every serve — a refresh cannot silently wipe a correction. When the source value drifts from what it said at correction time, the composed record carries `sourceDrifted:true` (derived per read, never written back): owner value still wins, drift is visible.

3. **Regeneration provably preserves the owner layer.** `src/fyd/builder/source-refresh.ts:118` refreshSource is pure: "never mutates its input, never writes the owner layer, never touches GENERATED or PROJECTION state"; it returns `ownerLayerIntact: before === after` — a sha256 digest proof (`digestOwnerLayer`, `:108`) that the owner layer crossed the refresh byte-identical.

4. **The constitutional law is enforced: evidence is not corrected.** `src/fyd/refresh/conflict.ts:91-108` resolveConflict: "The losing claim is NOT deleted; status flips to resolved with the decision trail." Ask FYD citations keep the distinction explicit: `src/lib/ping/ask-composer.ts:788-800` renders "Owner correction by {actorLabel}: the owner says {ownerValue}; the site lists {sourceValue}" — a separate FIELD-level evidence ref (the correction), not the business object, so the Why-this view can never mislabel the number as a website statement. The binding verifier requires a RECORDED owner assertion matching exactly the presented value for `owner_authored` bindings (`sitespec/binding-verifier.ts:168-180`); a label alone fails UNBOUND.

5. **Owner intent vs. generated presentation.** `builder/owner-intent.ts`: `prohibitedPositioning` is HONORED (the evidence-binding verifier refuses any slot containing those predicates); `operatingConstraints` remove components only via the closed table `OPERATING_CONSTRAINT_COMPONENTS` — unknown strings are recorded in manifest notes, never applied, never fatal. Customize lane law (`customize/README.md`): FACTS never written by the lane; an intent that would manufacture a factual claim resolves to honest `unresolved`.

6. **Two honest degradations, both fail-closed:**
   - Presentation-intent persistence requires the demo journal. Live (gateway disconnected): approve → 502 `journal_unavailable`, "The approval was NOT recorded." Nothing is silently applied or silently dropped.
   - The only implemented verification method is operator-attestation (honestly labeled as a statement, not cryptographic proof). The five real methods are declared with `implemented:false` so no caller can mistake them for present (`verification-seam.ts` header).

---

## 3. Ask-FYD verdict: evidence-bounded, LLM-free

**VERDICT: the answer path actually consults evidence. There is no LLM in the loop to hallucinate from.**

- Zero LLM/AI-SDK references anywhere in src/fyd (verified by grep: llm/openai/anthropic/ai-sdk/gemini/vertex/bedrock/deepseek). The only AI-named file in the wider tree is `src/lib/sentiment/classifier-provider.ts` — a VADER rule-based review-moderation classifier, unused in the ask path.
- `src/lib/ping/ask-composer.ts:1-17` header: "No LLM, no agent runtime, no new authority. The composer is a pure function of (bounded context, question): same inputs always produce the same answer."
- `composeAnswer` (`ask-composer.ts:416`) is keyword-anchored deterministic branching (profile/services/contact/provenance branches). Every factual sentence is emitted through `cite(text, cites)` (`:249`); `pushClaim` attaches per-claim epistemic classification.
- No-evidence → honest refusal: `noEvidenceAnswer` (`ask-composer.ts:398`): "I do not have evidence for that in the current context, so I will not guess." The visitor layer (`ask/visitor-answer.ts`) loads the projection through the same verified read seam + owner overlay, reduces every answer to a 3-class contract, and treats unloadable projections as `projection_unavailable`: "I could not load this site's data, so I cannot answer your question. The answer is unknown." (`visitor-answer.ts:398-408`).
- The wired route is `POST /api/fyd/ask/[siteId]` → `ask-pipeline.ts:44,242` → `answerAskFyd` (visitor-answer.ts). `composeAskFyd` (`ask/answer.ts`) delegates non-patch questions to the same deterministic composer.
- Agent capability boundary: `ask/capabilities.ts` FORBIDDEN_AGENT_EFFECTS (`site.publish`, `message.send`, `purchase.make`, `ad.buy`, `provider.call`, `business.mutate`); unknown grants denied, not allowed.

**Claim vocabulary classification** (three non-conflated vocabularies — the code explicitly forbids conflating the first two, `binding-verifier.ts:296-304`):

| Layer | Vocabulary | Source |
|-------|-----------|--------|
| Render atoms (projection seam) | OWNER_ASSERTED / DIRECT_EVIDENCE / DETERMINISTIC_DERIVATION / GENERATED_PRESENTATION / UNKNOWN | `sitespec/binding-verifier.ts:324-331` |
| Ask answers (3-class contract) | supported / derived / unknown (= refusal, no cited evidence) | `ask/visitor-answer.ts` claimClassFor (`:66-88`); route response `answerClass` |
| Fact classes (extraction → ask mapping) | DIRECT_FACT / DERIVED_FACT / INFERENCE / GENERATED_COPY / USER_OVERRIDE (+ pipeline's `website_statement`, `canonical-journal` → DIRECT_FACT at `ask-composer.ts:149`) | `lib/ping/types.ts` AskClaimClassification (`ask-claim-class.txt:267-281`) |
| Claim lifecycle | observed / claimed / verified-controlled | `claim/types.ts` |
| UI evidence states | observed / inferred / unverified / unknown / unavailable / withheld | `ui/evidence-state.tsx` |

Classification semantics that matter: unrecognized classifications land on "supported" only because the citation still names real evidence (basis text stays neutral); DERIVED_FACT/INFERENCE/GENERATED_COPY are always labeled "derived"; GENERATED_PRESENTATION atoms require a generator mark AND an evidence ref, and a generated factual atom with no evidence ref classifies UNKNOWN and fails the emission gate.

---

## 4. Adapter/core seam notes

Crossings (adapter → core direction of writes; core → adapter direction of reads):

1. **Projection write (core side):** `/home/nolan/ping/tools/fyd-site-projection/dump.py` writes `/home/nolan/ping/var/fyd-projections/<siteId>.json`. It embeds the source object graph AND `presentationIntent` (from FYD_SITE_OVERLAY journal overlays, `dump.py:194-253`; default reads the FYD demo journal on 127.0.0.1:18199 backed by ping-test-pg). **Owner field corrections are NOT in the projection** — they stay adapter-local (`data/fyd-owner/`).
2. **Projection read (adapter side):** `getPingObjectGraph` (`data/ping-object-source.ts:262`) reads the core-written file, digest-verifies it (tamper → fail closed, `:232-239`), then applies the owner overlay. The adapter never writes to the core projection directory.
3. **Reachability consequence:** the served site renders from dump JSON with the gateway disconnected (per the reachability report). Net effect on the trust loop: field corrections still apply (read-side, adapter-local); presentation-intent customizations are inert on the deployed path (journal emit → 502). The overlay-event emit defaults to the phantom journal `http://127.0.0.1:18199/events` (`customize/server.ts:70`) — acceptable for demo, but it means the customize arrow's durability currently depends on a journal that does not exist in production. **This is the single most consequential broken boundary in the domain.**
4. **Identity seam:** FYD identity IDs are uuidv5 under a FYD-local namespace (`identity/uuid.ts`, `principal.ts:57`). This is a local derivation, not a mint into any core PING person-identity authority. The constitutional IdentityAuthority question from the handoff (§3) resolves as: FYD does NOT create a second canonical identity authority — but the FYD identity namespace's relationship to PING's person identity is UNVERIFIED (no mapping exists in code; a future Google-adapter wiring must decide whether to bind or bridge).
5. **No new authority or event system created in the adapter.** The verifier owns no authority (`binding-verifier.ts` header: "no ClaimAuthority is created: the existing evidence/object machinery plus this verifier owns the invariant"). Journal writes go through the repo-booted gateway (separate authority), and the customize lane's docstring is explicit that "nothing here touches the main deployment journal" (`customize/server.ts:8-11`).

---

## 5. Where findings differ from the archaeology handoff

1. **The auth leg is Google, not Facebook.** The handoff's arrows 1–5 assumed "Continue with Facebook" and flagged a Facebook App + App Review as the #1 gap. Reality: there is no Facebook Login at all; the built auth lane is Google OIDC (code-complete, PKCE, JWKS, deterministic binding). The handoff's gap #1 (Facebook App) and #2 (OAuth login infra) are superseded: the login infra EXISTS, the missing piece is procedural (installing Google provider-console credentials), and Facebook-as-auth-source was never built.
2. **The entry point is anonymous-preview-first, not auth-first.** `/fyd` = paste URL → generated preview → claim → authenticate. The handoff's linear auth→discovery→build sequence doesn't match the implemented funnel.
3. **The claim/ownership machine exists.** The handoff had arrows 6–7 (candidate discovery, owner confirmation) as PARTIAL/NOT-STARTED with no implementation known. The claim machine (OBSERVED→CLAIMED→VERIFIED-CONTROLLED), claim store, verification seam, and resource-id model are implemented and tested.
4. **The evidence-binding emission gate is wired, not aspirational.** The handoff listed evidence-binding enforcement as gap #9 ("mostly verification + gap-closing, if factory wave delivered"). It delivered: the planner throws before emitting any spec containing an UNKNOWN atom.
5. **The owner overlay + append-only event log + refresh digest proof are new since the handoff** (or were unverified then). These are the mechanical core of the trust-loop verdict above.
6. **Demo-owner gating (HEAD commit a69bb68f) postdates the handoff.** Owner mutation routes are now env+host gated with typed 403s — the handoff's worry about the ungated demo seam is addressed.
7. **BuildBusiness still doesn't exist** (handoff arrow 9 was directive-only; still no `buildBusiness` in src/). The single-operation contract remains unimplemented — the pipeline is components, not one operation.
8. **Publish is still fully open** (handoff arrow 18 NOT-STARTED; still no publish path).
9. **Deployed-repo drift:** `/home/nolan/projects/ping` (the served repo) carries a `strategy` field in OwnerIntent that the worktree lacks; trust-loop files are otherwise byte-identical.

---

## 6. Patch record (Nolan-authorized patch rule)

**Applied in /home/nolan/projects/ping-constitutional (NO commit):**
- WHY: `src/fyd/claim/identity.ts` docstring asserted the Google adapter was still "being built in parallel" and would add a ClaimedIdentity kind "when that adapter lands" — factually stale; the adapter (provider, callback flow, session routes, file store, audit) had already landed in-tree at the referenced path. A stale comment on the auth seam is a truthfulness defect in safety-relevant code.
- EVIDENCE: `src/fyd/identity/{provider,callback-flow,principal,session,config,file-store,audit}.ts` all present; `src/app/api/fyd/auth/google/*` routes present; live 503 proves the lane exists-but-unconfigured (not absent).
- MINIMUM CHANGE: 7 insertions / 4 deletions, comment-only, inside the `/** */` block; new text contains no `*/` terminator; block delimiters untouched.
- TEST: (1) `git diff` proves only comment lines changed; (2) no test file covers this module (`src/fyd/claim/__tests__` = machine/resource-id/seam only); (3) jest not runnable in-worktree (no node_modules; installing would alter the sprint tree — declined). RESULT: behaviorally inert by construction; no behavioral regression possible. SSH flakiness during verification was infra, not code.
- Script retained at `~/workspace/constitutional-sprint/fyd-path/patch-identity-comment.py` for replay.

**Proposed (NOT applied) — for /home/nolan/ping: none required.** No trust-loop defect on the core side was found; the dump.py overlay/journal logic is core-owned and working as designed. No patch proposal written (nothing to propose).

**Proposed (NOT applied) — worktree features, not safe patches:**
- Wire the Google session identity into `claim/identity.ts` (add a `"google"` ClaimedIdentity kind backed by the session cookie). This is a FEATURE requiring design decisions (session→claim mapping, email-collision semantics, CSRF) — explicitly not a minimal patch. Flagged for the factory/orchestration lane.

---

## 7. Shared findings table (convergence-auditor format)

DOMAIN=FYD-GOLDEN-PATH for all rows.

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FYD-GOLDEN-PATH | identity/provider.ts, callback-flow.ts, auth routes | Google OIDC lane is code-complete: PKCE S256, JWKS RS256 verification, deterministic uuidv5 identity binding, signed session cookies | provider.ts loadGoogleConfig/buildAuthorizationUrl/verifyGoogleIdToken; principal.ts:57 deriveIdentityId; session.ts:15,70,80; routes api/fyd/auth/google/* | /fyd visitor | Google OAuth | (none; tokens discarded) | session route | FYD owns binding (module docstring) | VERIFIED | HIGH | none | provider-console credentials (human/procedural) | onboarding, trust-loop |
| FYD-GOLDEN-PATH | /api/fyd/auth/* (deployed :3100) | Google sign-in is INACTIVE on the deployed app: 503 AUTH_NOT_CONFIGURED, session_not_configured | live curl 2026-09-23: start→503, session→{"authenticated":false,"reason":"session_not_configured"} | visitor | auth routes | — | — | — | BROKEN | HIGH | none (fails closed) | credential install (human) | trust-loop, onboarding |
| FYD-GOLDEN-PATH | (no Facebook auth code) | No Facebook Login, Facebook App, or App ID exists anywhere in src/fyd | grep facebook login/app_id in src/fyd → only harvest evidence JSON + raw HTML fixture | — | — | — | — | — | BROKEN | HIGH | none | none | trust-loop, acquisition |
| FYD-GOLDEN-PATH | claim/identity.ts | resolveClaimIdentity returns ONLY demo-owner identity; Google adapter exists but is not consumed by the claim flow | claim/identity.ts resolveClaimIdentity (docstring corrected 2026-09-23 by this investigation) | claims routes | resolveClaimIdentity | — | — | — | PARTIAL | HIGH | none | Google-adapter wiring (feature, proposed) | trust-loop |
| FYD-GOLDEN-PATH | claim/machine.ts, claim/store.ts | OBSERVED→CLAIMED→VERIFIED-CONTROLLED with immutable transitions + audit history; anonymous claim refused; demo fixtures unclaimable | machine.ts:48,80,113,159; :22 DEMO_CONTEXT_IDS; store data/fyd-claims | claims routes | machine fns | claim/store.ts | claims routes | claim module | VERIFIED | HIGH | none | trust-loop, onboarding |
| FYD-GOLDEN-PATH | claim/verification-seam.ts | Only operator-attestation is implemented; 5 cryptographic/provider methods are declared-not-implemented | verification-seam.ts:69 isVerificationMethodImplemented, :84 attestOperatorControl | verify route | attestOperatorControl | claim store | — | — | PARTIAL | HIGH | none | trust-loop |
| FYD-GOLDEN-PATH | object/owner-events.ts, owner-store.ts | Owner state is an append-only event log; current state is a pure projection; revert appends, never deletes | owner-events.ts:622 appendOwnerEvent; store header (data/fyd-owner/<id>.json) | overrides route | appendOwnerEvent | data/fyd-owner/*.json | readOverrides | owner-store | VERIFIED | HIGH | none | trust-loop, regen |
| FYD-GOLDEN-PATH | data/ping-object-source.ts | Owner overlay is composed AFTER digest verification; projection file never mutated; refresh cannot erase corrections; sourceDrifted surfaced per-read | ping-object-source.ts:232-249, :262 getPingObjectGraph | site pages, Ask FYD | applyOwnerFieldCorrections | (read-side only) | all read seams | — | VERIFIED | HIGH | none | trust-loop, ask, render |
| FYD-GOLDEN-PATH | builder/source-refresh.ts | refreshSource is pure: never writes the owner layer; returns ownerLayerIntact sha256 digest proof | source-refresh.ts:108 digestOwnerLayer, :118 refreshSource | regen pipeline | refreshSource | — | — | — | VERIFIED | HIGH | PING-side dump cadence (core) | regen, trust-loop |
| FYD-GOLDEN-PATH | refresh/conflict.ts | Conflicts keep both claims with provenance; resolution records the decision and never deletes the losing claim | conflict.ts:49 detectConflicts, :91 resolveConflict | refresh pipeline | detectConflicts/resolveConflict | — | — | — | VERIFIED | HIGH | none | trust-loop, owner-UI |
| FYD-GOLDEN-PATH | lib/ping/ask-composer.ts, ask/visitor-answer.ts | Ask FYD is deterministic and LLM-free; every factual sentence cites [n]; no evidence → honest refusal | ask-composer.ts:416 composeAnswer, :398 noEvidenceAnswer, :249 cite; visitor-answer.ts:398 projection_unavailable; zero llm/openai/anthropic/ai-sdk imports in src/fyd | ask routes | answerAskFyd | — | — | — | VERIFIED | HIGH | projection availability | ask, visitor-UI |
| FYD-GOLDEN-PATH | binding-verifier.ts, visitor-answer.ts, lib/ping/types.ts | Three non-conflated claim vocabularies: render atoms (5 classes), ask 3-class (supported/derived/unknown), FactClass (DIRECT_FACT/DERIVED_FACT/INFERENCE/GENERATED_COPY/USER_OVERRIDE) | binding-verifier.ts:296-331; visitor-answer claimClassFor; ask-composer.ts:149 | — | — | — | — | — | VERIFIED | HIGH | none | ask, convergence-auditor |
| FYD-GOLDEN-PATH | sitespec/binding-verifier.ts + builder/planner.ts | Planner throws BindingVerificationError on ANY UNKNOWN atom before emitting a spec — emission gate is wired | binding-verifier.ts:523 buildVerifiedRenderModel; planner.ts:386,398 | planner | buildVerifiedRenderModel | — | — | — | VERIFIED | HIGH | none | render, trust-loop |
| FYD-GOLDEN-PATH | builder/owner-intent.ts | OwnerIntent planner input; prohibitedPositioning refused by verifier; unknown constraints recorded, never applied | owner-intent.ts; planner.ts:386 assertGeneratedPresentationVerified | planner | normalizeOwnerIntent | — | — | — | VERIFIED | HIGH | none | customize, planner |
| FYD-GOLDEN-PATH | customize/server.ts, customize route | Customize = intent→proposal→digest-bound approve→journal; journal failure → 502 journal_unavailable, nothing applied | customize/server.ts:78 emitOverlayEvent, :70 gateway default 127.0.0.1:18199; customize route :304-314 | customize UI | emitOverlayEvent | demo journal | dump.py | — | PARTIAL | HIGH | demo journal availability; dump re-run | customize, regen |
| FYD-GOLDEN-PATH | customize/server.ts (deployed path) | With the gateway disconnected (live, per reachability report), NO presentation-intent customization can persist; field corrections unaffected | server.ts:70 phantom default; route 502 path; reachability report | — | — | — | — | — | BROKEN | HIGH | journal→dump→projection chain | reachability (sibling), customize, regen |
| FYD-GOLDEN-PATH | owner-mode/capability.ts, route inventory | No publish path exists; owner.publish denied in demo; agent suggestions can never authorize site.publish | capability.ts:150-155; no publish route; ask/capabilities.ts FORBIDDEN_AGENT_EFFECTS | — | — | — | — | — | BROKEN | HIGH | none | publish agents |
| FYD-GOLDEN-PATH | /home/nolan/ping/tools/fyd-site-projection/dump.py → var/fyd-projections/ | Core-side dumper writes projections incl. presentationIntent from journal overlays; adapter reads and digest-verifies | dump.py:194-253; ping-object-source.ts:88-90 | dump (cron/manual) | dump.py | var/fyd-projections/*.json | getPingObjectGraph | PING dump / FYD verify | VERIFIED | HIGH | dump cadence (core) | core-runtime, regen |
| FYD-GOLDEN-PATH | identity/principal.ts, identity/uuid.ts | FYD identity IDs are a local uuidv5 derivation, NOT a mint into core PING person identity; mapping is undecided | principal.ts:57; uuid.ts FYD_IDENTITY_NAMESPACE | callback flow | deriveIdentityId | data/fyd-identity/accounts | — | — | UNVERIFIABLE | MEDIUM | constitutional identity audit (sibling) | identity, convergence-auditor |
| FYD-GOLDEN-PATH | (no buildBusiness in src/) | The single BuildBusiness operation does not exist; the pipeline is components, not one operation | grep buildBusiness → 0 hits in src/ | — | — | — | — | — | BROKEN | HIGH | factory/orchestration (sibling) | orchestration |
| FYD-GOLDEN-PATH | acquisition/acquisition-adapter.ts | Acquisition adapter is types-only; L4 AI interpretation designed but no LLM wired anywhere in src/fyd | adapter header; zero LLM imports in src/fyd | — | — | — | — | — | PARTIAL | HIGH | none | acquisition |
| FYD-GOLDEN-PATH | refresh/facebook-source.ts | Authorized Facebook data genuinely unavailable; conflict machinery proved on labeled synthetic fixture only | facebook-source.ts checkFacebookAvailability | refresh | — | — | — | — | PARTIAL | MEDIUM | facebook-cli / provider auth (sibling/human) | acquisition, trust-loop |
| FYD-GOLDEN-PATH | projects/ping vs worktree | Deployed repo has an extra `strategy` field in OwnerIntent absent from the worktree; all trust-loop files otherwise byte-identical | diff owner-intent.ts | — | — | — | — | — | UNVERIFIABLE | HIGH | sync machinery (sibling) | deploy, convergence-auditor |
| FYD-GOLDEN-PATH | overrides route, commit a69bb68f | Owner mutation routes require demo-owner env + private host; otherwise typed 403 before any object I/O | overrides/route.ts; owner-mode/gate.ts isPrivateHost; commit stat | owner UI | ctx.evaluateCapability | owner store | — | — | VERIFIED | HIGH | none | trust-loop, security |
| FYD-GOLDEN-PATH | ask-composer.ts:788-800 | Ask citations render the SOURCE SAYS X / OWNER SAYS Y distinction via a separate field-level evidence ref | ask-composer.ts:788 ownerCorrectionForObject usage | ask | ownerCorrectionForObject | — | — | — | VERIFIED | HIGH | none | ask, trust-loop |

---

## 8. Open questions / recommended follow-ups

1. **Google-adapter → claim-flow wiring (feature, proposed not patched):** decide session→ClaimedIdentity mapping, email-collision semantics, and CSRF before wiring; the state machine needs no changes.
2. **FYD identity namespace vs PING person identity:** the constitutional IdentityAuthority question is unresolved — no code maps FYD uuidv5 identities to core PING persons. Needs the identity-audit sibling's input before any production owner launch.
3. **Customize durability on the deployed path:** with the demo journal phantom, approved presentation intents cannot persist. Either stand up the journal the dumper reads or re-home the intent layer to an adapter-local durable store with dump integration.
4. **Verification methods:** only operator-attestation exists. Any production owner launch needs at least one cryptographic method (dns-txt or well-known-file) flipped to implemented.
5. **Publish path:** entirely absent — hosting, domains, deploy primitive, publish authorization all open.
6. **BuildBusiness:** the one-operation contract remains unimplemented; the orchestration lane should decide whether to build it or retire the contract.
7. **Deployed drift:** reconcile the `strategy` field in OwnerIntent between the worktree and /home/nolan/projects/ping (sync direction TBD by the deploy lane).
