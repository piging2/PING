# GOLDEN PATH ARCHAEOLOGY — HANDOFF TO CONSTITUTIONAL CONVERGENCE SPRINT (PHASE 17)

Date: 2026-09-23. Author: Golden Path Archaeology coordinator (Pigi).
Status: WOUND DOWN before worker results returned. Four segment workers (auth-identity, facebook-source, discovery-acquisition, graph-to-publish) were spawned and stood down ~1 minute later per the wind-down order. Their assigned segment files (`segments/01-auth-identity.md` through `segments/04-graph-to-publish.md`) were NOT produced. The briefs they carried are preserved in §6 so Phase 17 can re-run them verbatim.

Everything below is PROVEN/PARTIAL/NOT-STARTED strictly from the inherited parent context (FYD factory wave, autonomy challenge, standing directives, memory). Nothing below is the product of new investigation in this session. Treat PARTIAL items as "believed true from prior waves, re-verify against the repo before building on them."

The golden path being traced:

UNAUTHENTICATED VISITOR → CONTINUE WITH FACEBOOK → CALLBACK → PING IDENTITY → PROVIDER AUTHORIZATION RECORD → BUSINESS CANDIDATE DISCOVERY → OWNER CONFIRMATION → WEBSITE DISCOVERY / ONE URL QUESTION → BUILD MY FYD → ACQUISITION → EVIDENCE → OBJECT GRAPH → SITE SPEC → RENDER → OWNER PREVIEW → CORRECT / HIDE / CONFIRM → CUSTOMIZE WITH FYD → PUBLISH (+ ASK FYD concierge).

---

## 1. Per-arrow findings

### Arrow 1: UNAUTHENTICATED VISITOR
Status: NOT-STARTED.
What is known: no FYD landing/onboarding surface is known to exist. The PING repo serves demo routes (`/sites/happy-place`, `/sites/coppersmith-plumbing` on the Pig, port 3100) but no public "Create my FYD" entry point has been surfaced in any prior wave.

### Arrow 2: CONTINUE WITH FACEBOOK
Status: NOT-STARTED.
What is known: no Facebook Login button/flow exists in PING or FYD. No evidence of a PING/FYD Facebook App, App ID, or app secret anywhere in prior waves. **This is a suspected-large gap, not a verified one** — Phase 17 must grep the repo (`facebook`, `FB App`, `app_id`, `oauth`) to confirm absence before treating it as greenfield.

### Arrow 3: CALLBACK (OAuth callback → session)
Status: NOT-STARTED.
What is known: no OAuth callback route, no PKCE flow, no session-creation path for a provider login is known. PING's existing session model (if any) was never audited in prior waves. `~/docs/connectors.md` is believed to document OAuth patterns for connectors — worth harvesting before inventing.

### Arrow 4: PING IDENTITY (create/reuse person identity)
Status: PARTIAL.
What is established: PING's constitution (SOUL.md) declares an IdentityAuthority as the single owner of identity generation. What is NOT verified in-session: what the person-identity model actually looks like in code, whether persons are deduplicated today, and what `authenticated_via` would attach to. Prior waves treat "PING person identity" as an existing primitive — Phase 17 should verify with one targeted read, not a re-dig.

### Arrow 5: PROVIDER AUTHORIZATION RECORD (grant storage)
Status: NOT-STARTED (with one adjacent known).
What is known: no stored provider-grant record (scopes granted, expiry, refresh token, account claim) has been surfaced. Adjacent known: credential storage goes through the Secure Vault / approved connection flows (standing safety rule); raw tokens must never land in files, memory, or chat. The FacebookAccountClaim concept (Person → authenticated_via → FacebookAccountClaim) is a DESIGN from Nolan's directive, not a verified implementation.

### Arrow 6: BUSINESS CANDIDATE DISCOVERY
Status: PARTIAL.
What is established: `/opt/hatch/skills/facebook-cli/SKILL.md` exists and is the current Facebook data-access path, but its exact operation/field surface was never fully audited in-session (a worker was assigned exactly this; stand-down hit before delivery). The candidate schema is DESIGNED (provider stable ID, name, category, public URL, website URL, public location, authorized public metadata, authorization evidence) and the ranking rule is DECIDED (deterministic, no AI; one strong candidate → one-click "Build FYD for X?"; multiple → chooser). No ranking implementation is known.

### Arrow 7: OWNER CONFIRMATION
Status: NOT-STARTED.
Design is fully specified in the directive ("Is this your business?" → [Yes, build my FYD]; multi-candidate chooser). No implementation known. Depends on Arrow 4/5 primitives.

### Arrow 8: WEBSITE DISCOVERY / ONE URL QUESTION
Status: NOT-STARTED.
Design is fully specified (normalize URL → follow safe redirects → verify domain → acquire; fall back to authorized/public evidence; then ask exactly ONE question, "What's your website?"; never manufacture a domain). No implementation verified: URL normalization, safe-redirect following (SSRF/private-IP protection), and domain-verification primitives were on the stood-down worker's checklist, unexecuted.

### Arrow 9: BUILD MY FYD (the one operation)
Status: PARTIAL.
What is established: the factory wave was directed to build exactly one conceptual operation, `BuildBusiness(sourceManifest)` returning `build_id, status, sources, observations, evidence, objects, relationships, media, site_spec, render, warnings, conflicts, missing_information, provenance_coverage, next_actions`. This is DIRECTIVE, not verified implementation — the factory coordinator acknowledged the steering but no completion report is on record in this context. Phase 17 must ask the factory coordinator for its status rather than re-deriving the contract.

### Arrow 10: ACQUISITION
Status: PARTIAL.
What is established: PING has observation/crawl machinery (Crawl4AI 0.9.3 was verified 2026-09-22 as having hardened hostile-crawl boundaries: SSRF, arbitrary file writes, unbounded PDF resource use, XSS). The Pig has browser-escalation paths (headed Chrome, CDP). The cheapest-first intelligence escalation ladder is DECIDED (deterministic → structured evidence → heuristics → browser → small intelligence → strong intelligence → owner question). NOT verified: JSON-LD `@graph` extraction quality, hostile-URL neutralization (`javascript:`, `data:`), robots handling, and whether acquisition output is typed per the factory contract.

### Arrow 11: EVIDENCE
Status: PARTIAL.
What is established: evidence is constitutional in PING (EvidenceAuthority declared; "evidence before eloquence"). The FYD-specific binding (every factual rendered claim resolves to direct evidence / derived claim with inputs / owner assertion / marked-generated presentation) is DIRECTIVE from the factory steering, implementation status unknown. The gauntlet list (unbound claims, conflicting evidence, `@graph` blindness) suggests this is under active work, not done.

### Arrow 12: OBJECT GRAPH
Status: PARTIAL.
What is established: PING has an object graph with ObjectView, Circle, `/o/` routes, object APIs, and rail/margin concepts (directed to be harvested as augmentation, not replacement, for FYD sites). Entity-resolution rule is DECIDED: website and Facebook are EVIDENCE around ONE business object, never separate truths; keep both observations; resolve where evidence supports it; surface conflicts to the owner ("We found two different addresses. Which is current?" [Y] [Z] [Both locations]). The FYD business-object excellence checklist (identity → capabilities, 20 fields; missing allowed, invented not) is DIRECTIVE, not verified.

### Arrow 13: SITE SPEC
Status: PARTIAL.
What is established: the factory wave is deriving the planner from the golden HPP implementation via CLONE → PROVE FIDELITY → PARAMETERIZE → SUBSTITUTE → COMPARE → GENERALIZE (Nolan's binding correction, 2026-09-23). Planner status: in progress, no completion report on record. Design constraints DECIDED: constrained design grammar, intelligence chooses WITHIN constraints, no customer-name conditionals, data-driven structural variation (not forced difference).

### Arrow 14: RENDER
Status: PARTIAL.
What is established: demo routes `/sites/happy-place` and `/sites/coppersmith-plumbing` render on the Pig (port 3100). The HPP-derived deterministic renderer is under construction via the factory wave; fidelity proof (GOLDEN ≈ CLONE) was the gating requirement, outcome not on record. Renderer must-verifies (responsive 320–1440, no overflow, no unsafe URLs, deterministic output) are DIRECTIVE.

### Arrow 15: OWNER PREVIEW
Status: NOT-STARTED.
Design DECIDED: first result is the ACTUAL WEBSITE (not an editor), then [Looks good] / [Customize with FYD]; progress UI during build shows plain-language states (connected identity, found business, found website, reading business information, found location, found services, found social presence, building FYD) and NEVER exposes JSON-LD, object IDs, SiteSpec, projections, or canonical events. No implementation known.

### Arrow 16: CORRECT / HIDE / CONFIRM
Status: PARTIAL (design-complete, implementation unknown).
What is DECIDED: visibility model = OBSERVED VALUE + VISIBILITY POLICY + OWNER OVERRIDE (no global private classification of street addresses); owner gets Show publicly / Hide / Correct per applicable field; decisions persist across regeneration and source refresh. "Why This?" is secondary UI (website, observed date, structured source/provider, owner override). Lightweight Correct on inferred items; provenance available without making the product feel like an audit tool. Implementation status: not verified.

### Arrow 17: CUSTOMIZE WITH FYD
Status: NOT-STARTED (design-complete).
What is DECIDED: conversational changes compile PROMPT → PLAN → TYPED PATCH → VALIDATE → PREVIEW DIFF → OWNER APPROVAL → APPLY → VERSION → REGENERATE; no direct AI DOM editing; no SiteSpec in user language. Authority UX matches consequence (low → immediate/undo; medium → confirm; high → explicit preview/authorization). First-run correction asks only high-value uncertainties, never a 40-field form. No implementation verified.

### Arrow 18: PUBLISH
Status: NOT-STARTED.
Believed open question: where generated sites live (PING hosting? subdomain? custom domain?), what the deploy primitive is, and what authorization gates external publish (high-consequence → explicit preview/authorization per Arrow 17's tiering). Nothing on record.

### Concierge: ASK FYD
Status: PARTIAL (design-complete, implementation unknown).
What is DECIDED: full evidence-bounded Q&A over the graph for visitors, constrained to authorized-visible info; answers distinguish SUPPORTED / DERIVED / INFERRED / UNKNOWN; unknown is valid; citations resolve to real evidence; never hallucinate capabilities. "How do you know?" / "What conflicts?" / "What is unknown?" are first-class. Implementation status: not verified.

---

## 2. Ranked missing-gap hypotheses

Each: what / why needed / size (S = days, M = 1–3 weeks, L = longer; procedural = calendar-gated, not effort-gated).

1. **Facebook App + App Review for pages_* scopes** — why: without an approved app, customer OAuth grants for `pages_show_list` / `pages_read_engagement` cannot work in production; this gates the entire "Continue with Facebook" source leg. Size: PROCEDURAL (Meta review calendar; could be weeks) + S engineering. Flag as HUMAN DECISION, not just a technical gap.
2. **OAuth login + callback + session infrastructure for FYD** — why: arrows 2–3 have no known implementation; the golden path cannot start without it. Size: M if PING has session primitives to harvest, L if greenfield. (Verify `~/docs/connectors.md` OAuth patterns first.)
3. **Provider authorization record store (grants, scopes, expiry, refresh)** — why: arrows 5–6 and the three-independent-jobs invariant require durable, refreshable grant records; none known. Size: M.
4. **Real owner-auth seam (authenticated human + proven control → owner capabilities)** — why: every downstream owner power (correct/hide, customization approval, publish authorization, visibility overrides) depends on it; interim demo adapter is acceptable only if clearly marked and unconfusable with prod. Size: M (S for the clearly-marked demo adapter).
5. **Publish path (hosting, domains, deploy primitive, publish authorization)** — why: arrow 18 is fully open; nothing can go live without it. Size: M.
6. **Deterministic business-candidate ranking implementation** — why: arrow 6 design is complete; needs only the ranking inputs wired to facebook_cli + website evidence. Size: S.
7. **URL normalization + safe redirect following + domain verification** — why: arrow 8 safety and correctness depend on it; hostile-URL handling is a security boundary. Size: S.
8. **Typed customization patch pipeline (plan → typed patch → validate → preview → approval → apply → version)** — why: arrow 17 is the actual builder product; design complete, build missing. Size: M.
9. **Evidence binding enforcement (every rendered claim → evidence)** — why: the trust guarantee is the product differentiator; gauntlet items suggest partial coverage. Size: M (mostly verification + gap-closing, if factory wave delivered).
10. **"Why This?" secondary UI + progress-state UI** — why: trust infrastructure must be available without dominating UX; pure presentation work. Size: S.

---

## 3. Single biggest architectural unknown

**Whether PING's existing identity/auth substrate can carry a real customer-facing provider-login lifecycle, or whether FYD must grow its own account/grant/session system.** Everything downstream of the callback — provider authorization records, the `controls?` relationship, owner capabilities, visibility overrides, customization approvals, publish authorization — hangs on this seam. If the substrate can carry it, the golden path is mostly wiring plus the Facebook App procedural gate. If not, FYD needs an identity-adjacent subsystem, which is the one place a "new framework" temptation will appear and must be resisted (harvest, don't rebuild; one constitutional owner per concern).

---

## 4. Load-bearing notes for the factory orchestration stage (Phase 17)

These constraints from Nolan's directives must survive into whatever orchestration Phase 17 builds:

1. **One operation.** `BuildBusiness(sourceManifest)` → `build_id, status, sources, observations, evidence, objects, relationships, media, site_spec, render, warnings, conflicts, missing_information, provenance_coverage, next_actions`. Do not invent a second contract.
2. **Terminal states are product.** `READY / READY_WITH_WARNINGS / NEEDS_OWNER_INPUT / ACQUISITION_BLOCKED / FAILED`. One-click must never pretend everything worked; example: "We found 12 services, 2 locations, 4 people, 37 media assets. We need your help with: 2 conflicting phone numbers, 1 uncertain social account." Never hallucinate certainty to reach READY.
3. **No new authority or event system.** Explicitly forbidden: `FYDFactoryAuthority`, a second event log. Harvest PING mission/run/execution machinery; use existing authorities/events underneath.
4. **Three independent Facebook jobs in the data model.** Authentication ≠ authorized source ≠ external action provider. FB auth must never implicitly make a Page the canonical identity; `controls?` needs provider ownership evidence, then a human.
5. **Failure taxonomy per stage.** Every pipeline stage needs typed input/output, evidence, failure classification, and retry/escalation policy. The cheapest-first intelligence ladder (deterministic → structured evidence → heuristics → browser → small intelligence → strong intelligence → owner question) is the cost-control mechanism.
6. **Worker bar.** Every mechanism must prevent ≥2 observed failure classes or materially improve a must-win (mobile UX, contact discoverability, service discoverability, performance, evidence/trust, customization speed), or be rejected.
7. **Visibility = observed value + policy + owner override**, persisted across regeneration. No global private classification.
8. **CEO metric: time to trusted first site** (authentication → useful generated FYD). Instrument it from day one.
9. **Traceability is internal, not UI.** Preserve SOURCE → OBSERVATION → EVIDENCE → OBJECT → RELATIONSHIP → SITE DECISION → COMPONENT → CLAIM per build so "why is this here?" is answerable and a wrong output identifies which compiler stage failed — without exposing it in onboarding.
10. **Optionality, not pages.** The compounding asset is the owner-corrected, evidence-backed structured business object. The website is one compiler target. Do not optimize the orchestration for page count.

---

## 5. What was NOT done (explicitly)

- No repo reads, no greps, no session audits were performed in this session beyond the inherited context.
- The facebook_cli skill (`/opt/hatch/skills/facebook-cli/SKILL.md`) was NOT re-read here.
- `~/docs/connectors.md` OAuth patterns were NOT harvested here.
- App Review / Facebook App existence was NOT verified — it remains the highest-priority verification for Phase 17, ideally as a human-confirmed fact from Nolan (does a PING/FYD Facebook App exist?) plus a repo grep.
- Factory coordinator's `BuildBusiness` implementation status was NOT re-checked — ask the factory coordinator directly.

## 6. Stood-down worker briefs (re-runnable by Phase 17)

Four read-only archaeology segments were defined; each brief instructed: read-only, no writes/commits/migrations; PING repo via `ssh -F /home/hatch/.ssh/pig-config pigwsl` + `wsl -- bash -c '...'` (read-only commands only; repo has unrelated dirty work, do not touch); per-arrow seven fields ((1) existing implementation + status LIVE/PARTIAL/DORMANT/MISSING, (2) harvestable implementation + source, (3) missing FYD-specific delta, (4) authority boundary, (5) failure state, (6) retry/idempotency, (7) user-visible state); write to `segments/0N-<name>.md`; do not invent findings.

- **01-auth-identity**: arrows 1–5 (visitor → continue-with-FB → callback → PING identity → provider auth record). Verify: Facebook App existence, App ID config, OAuth callback routes, session handling, IdentityAuthority behavior, token storage/refresh, Secure Vault, `~/docs/connectors.md` OAuth patterns. Flag App Review as HUMAN DECISION if unverifiable.
- **02-facebook-source**: read `/opt/hatch/skills/facebook-cli/SKILL.md` completely; document exact operations + retrievable fields + session ownership + rate limits; delta analysis of customer OAuth scopes (`pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, `pages_manage_metadata`); App Review reality per scope; write-back capabilities.
- **03-discovery-acquisition**: arrows 6–10. Candidate derivation inputs, deterministic ranking, owner confirmation, URL normalization, safe redirect following, domain verification, crawl/fetch primitives, JSON-LD `@graph` extraction, hostile-URL handling, robots, browser escalation. Do not duplicate 02's skill audit.
- **04-graph-to-publish**: arrows 11–18 + Ask FYD. Targeted verification (not rediscovery) of: evidence model/EvidenceAuthority, entity resolution, SiteSpec planner + HPP-donor renderer state in `~/workspace/fyd-factory` and `src/fyd`, owner correction loop, typed patches, visibility/override persistence, publish path, Ask FYD evidence-boundedness — against the established facts in §1 above; correct where wrong.
