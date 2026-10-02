# EXECUTION-ADAPTER — forensic findings (EXECUTION chain, adapter side)

**Base:** `/home/nolan/projects/ping-constitutional` (Pig), branch `constitutional-convergence-v2`, HEAD `a69bb68f` (verified clean, 2026-09-23).
**Investigator domain:** EXECUTION-ADAPTER (sibling covers EXECUTION-CORE; the seam is noted, not re-audited).
**Mode:** READ-ONLY. Method: local read-only snapshot of `src/` + `scripts/` taken 2026-09-23 ~19:35 MDT (via documented Pig scp fast path; transfer file deleted after), `grep` sweeps, per-file reads, core-gateway cross-check (read-only, no processes touched) for Task 4 only.
**Program update (20-agent program):** findings table in shared record format appended at end for Agent 20 (convergence auditor). Patch-rule verdict: **NO patches applied, NO core diffs proposed** — see §6; nothing met Nolan's "unambiguously established" bar.

---

## 1. Per-path table: every adapter path that CAUSES consequential execution

Columns: PATH (route → function → sink) | EFFECT (what state changes, where) | AUTHORIZED BY (authn/authz, file:line, or NONE) | DIGEST+APPROVAL? | STATUS.

| # | PATH | EFFECT | AUTHORIZED BY | DIGEST + APPROVAL? | STATUS |
|---|---|---|---|---|---|
| P1 | `POST /api/fyd/social/identity` → `createFydIdentity` (src/fyd/social/actions.ts:52) → `POST <gw>/identities` (actions.ts:67) + signed `OBJECT_CREATED` profile envelope → `POST <gw>/events` (envelope.ts:76) | Mints gateway identity (`identity_<16hex>`), escrows Ed25519 keypair on disk (`FYD_DEV_KEY_DIR`, key-custody.ts:67), journals public profile | **NONE.** Route has no authn/authz; `assertIdentityId` (actions.ts:38-42) is format-only on the *returned* id | Fires **unbound**. Only C1 deterministic action ID + C4 attestation re-read (attestation-gate.ts:72,130) — neither is approval | **LIVE** |
| P2 | `POST/DELETE /api/fyd/social/follow` → `followIdentity`/`unfollowIdentity` (actions.ts:193,198) → signed `RELATIONSHIP_CREATED` → `POST <gw>/events` | Journals follow/revocation in `ping_events` | **NONE** (format-only `assertIdentityId`) | Unbound (C1/C4 only) | **LIVE** |
| P3 | `POST /api/fyd/social/post` → `createFydPost` (actions.ts:215) → signed `OBJECT_CREATED ping.social.post@1` → `POST <gw>/events` | Journals post object | **NONE** | Unbound (C1/C4 only) | **LIVE** |
| P4 | `POST /api/practice/identities` → `reader.createIdentity` (ping-object-reader.ts:582) → `POST <gw>/identities` (reader:600) + signed profile `OBJECT_CREATED` | Same as P1, second lane; keys under `PING_DEV_KEY_DIR` (dev-signer.ts:132) | **NONE** (sets its own session cookie after mint) | Unbound | **LIVE, DUPLICATE** of P1 (two mint paths, two key custodians — authority-map Overlap 2) |
| P5 | `POST/DELETE /api/practice/follow`, `POST/DELETE /api/practice/like`, `PATCH /api/practice/bio` → `reader.follow/unfollow/like/unlike/updateBio` (reader:645-686) → `submitSignedEvent` (reader:343) → `POST <gw>/events` (reader:370) | Journals relationships / profile updates | **Unsigned cookie assertion only.** `getPracticeIdentityId()` (session.ts:23-33) reads raw `ping_practice_identity` httpOnly cookie; server signs with that identity's escrowed dev key. Cookie can name any existing dev identity | Unbound | **LIVE** |
| P6 | `POST /api/ping/proposal` → `reader.submitProposal` (reader:1297) → `submitSignedEvent` | Journals `OBJECT_UPDATED`/`OBJECT_CREATED` as the viewer identity | Unsigned cookie for viewerId + **real checks**: `verifyProposalDigest` (reader:1299; ask-composer.ts:55), controller-equals-viewer (reader:1305,1324), `grantsForViewer` `site.propose` (reader:1329), site-patch envelope `payload_hash == digest` (reader:1336) + current-spec-digest re-read (route:49-62) | **YES — digest-bound approval.** The only adapter path that binds execution to a proposal digest + controller + grants | **LIVE** |
| P7 | `POST/DELETE /api/practice/session` → `set/clearPracticeIdentityId` (session.ts:36-47) | Writes/clears the unsigned identity cookie | POST select validates the id exists in the gateway's dev-identity list (session/route.ts:57-61) | n/a (session management) | **LIVE** |
| P8 | `POST /api/fyd/objects/[objectId]/overrides` (propose/approve) → `applyOwnerCommand` (owner-store.ts:150) → `appendOwnerEvent` (owner-events.ts) | Appends provenance-backed event to `data/fyd-owner/<objectId>.json` (atomic tmp+rename) | **Demo-owner gate** (flag + private Host; overrides/route.ts:113-135) **AND** OwnerContext capability verdict `owner.correct-fact` (route:308-321). Actor is the seeded demo actor, never a verified identity | **YES — digest-bound two-step.** approve must echo `baseStateDigest`+`baseViewDigest`+`patchDigest`; stale → 409; patch mismatch → 400 (route:227-280) | **DORMANT by design** (flag off). See §3 |
| P9 | `POST /api/fyd/customize` `approve`/`clear` → `emitOverlayEvent` (customize/server.ts:78) → `POST <gw>/events` with **unsigned** `{event_type, aggregate_id, aggregate_type, event_data}` | Journals `FYD_SITE_OVERLAY` presentation-intent ops into the journal | Demo gate (flag + private Host) + `evaluateCapability(owner.customize-approve)` (customize/route.ts:44-72). `parse` stage: no gate, no persistence | YES for approve: full chain re-derived from text, `proposalDigest` + full-body equality re-verified (route:207-238) | **DORMANT by design** (flag off). See §3 |
| P10 | `POST /api/fyd/claims/[resourceId]/claim` → `claim()` (machine.ts) → `writeClaim` (store.ts:68) | `OBSERVED→CLAIMED`; writes `data/fyd-claims/<resourceId>.json` | `resolveClaimIdentity()` (claim/route.ts:37) — **flag-only**, no host check (see §3 asymmetry) | Unbound | **DORMANT by design** (flag off) |
| P11 | `POST /api/fyd/claims/[resourceId]/release` → `release()` → `writeClaim` | `CLAIMED→OBSERVED`; claim file rewritten, audit history preserved | Flag-only + claimant-must-hold-claim (release/route.ts:44-52) | Unbound | **DORMANT by design** |
| P12 | `POST /api/fyd/claims/[resourceId]/verify` → `verifyControl` → `writeClaim` | `CLAIMED→VERIFIED-CONTROLLED`; method is `operator-attestation` (self-asserted statement, honestly labeled) | Demo gate flag + private Host (verify/route.ts:38-60) | Unbound (attestation is a label, not a proof) | **DORMANT by design** |
| P13 | `GET /api/fyd/auth/google/callback` → `completeGoogleCallback` → `signInOrSignUp` (principal.ts:150) → `FileIdentityBindingStore.putAccount` | Writes `data/fyd-identity/accounts/<sha256>.json` (atomic tmp+rename) + sets HMAC session cookie | **Verified Google ID token** (OAuth code exchange + state check; callback-flow.ts) | n/a (identity binding, not execution) | **LIVE** |
| P14 | `GET /api/fyd/auth/link/google/callback` → `linkProviderAccount` (principal.ts:196) | Appends provider-account binding file | Verified ID token + fresh proof + CSRF | n/a | **LIVE** |
| P15 | `POST /api/fyd/auth/unlink` → `unlinkProviderAccount` (principal.ts:243) | Removes binding file (refuses last auth method) | HMAC session cookie + CSRF token (unlink/route.ts:29-42) | n/a | **LIVE** |
| P16 | `POST /api/fyd/auth/signout` | Clears session cookie | Session cookie itself | n/a | **LIVE** |
| P17 | `POST /api/kit/webhook` → `logEvent` (lib/events.ts:205) | Appends to in-memory HPP event log (non-durable) | **NONE** — no signature/shared-secret check (security sweep F1) | Unbound | **LIVE** (owned by security lane) |
| P18 | `POST /api/newsletter/subscribe` → `syncNewsletterSubscriber` (lib/kit.ts) + `logEvent` | **External mutation:** creates/tags Kit subscriber, enrolls sequence | **NONE** (email regex only) | Unbound | **LIVE** (owned by security lane) |
| P19 | `POST /api/resources/download` → `findSubscriberByEmail` + `applyGuideDownloadTag` + `logEvent` | **External mutation:** tags arbitrary Kit subscriber; reflected open redirect | **NONE** (security sweep F2) | Unbound | **LIVE** (owned by security lane) |
| P20 | `POST /api/fyd/onboarding/preview` → `generateAnonymousPreview` → `writeClaim(createObserved(...))` (anonymous-preview.ts:217) | Writes OBSERVED claim file **only if absent** (idempotent, best-effort) + SSRF-gated outbound fetch | **NONE** (rate-limited per clientId; SSRF gate in fyd/net) | n/a | **LIVE** (idempotent, low consequence) |
| P21 | `POST /api/fyd/follow`, `POST /api/fyd/like` → `setFollowing`/`setLiked` | Viewer-local JSON (`data/fyd-follows|likes/local.json`) | **NONE** | Unbound | **LIVE** (demo-local, negligible) |
| P22 | Executor shims: `executeFollow/executeLike/executeAsk` (src/fyd/capabilities/runtime.ts:27-60) | Client-side POSTs to P21 + `/api/fyd/ask` | n/a (UI executor) | n/a | **LIVE** |
| P23 | `src/lib/api/client.ts:49` `post()`; `src/fyd/adapters/activitypub/signing.ts:40` `postToInbox`; `scripts/{dbg-slots,verify-interactions,verify-portal}.ts` | Generic HTTP helper (zero importers); ActivityPub federation stub (no route wiring, outbox stubbed "not_implemented"); scripts have no fetch/write/mutation | n/a | n/a | **DORMANT** (all three) |
| P24 | `POST /api/estimate` target (src/services/estimate.ts:95) | References a route that **does not exist** in `src/app/api` | n/a | n/a | **DORMANT** (dead client call) |

Read-only POSTs (no execution, excluded from the table): `/api/fyd/ask`, `/api/fyd/ask/[siteId]`, `/api/ping/ask` (proposal drafting only); `GET`-only routes (`/api/fyd/media`, `/api/fyd/auth/session`, social feed/state, ping actions GET). **No mission triggers exist adapter-side** (core has `missions.js`/`mission_control.js` routes; `grep -rniE mission` in adapter `src` hits only marketing copy). Executor `CapabilityAuthority` lives in the core — adapter grants (`grants.ts`) explicitly disclaim it.

---

## 2. Authorization summary

- **Genuinely authenticated writes (LIVE):** P13–P16 (verified OIDC tokens, HMAC session, CSRF).
- **Digest-bound approval (LIVE):** P6 (proposal), P8 (overrides two-step, but dormant), P9-approve (customize, but dormant).
- **Unbound writes (LIVE):** P1–P5 (dev social + practice BFF — no authn, no digest; the only binding is server-side key custody + the core's signature check), P17–P19 (unauthenticated marketing ingest — security lane), P20–P21 (low consequence).
- **Demo-gated writes (DORMANT by design):** P8–P12 — see §3.

---

## 3. Demo-owner-mode gate — exact map

Gate definition: `isDemoOwnerModeEnabled()` (src/fyd/owner-mode/gate.ts:29) = `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE === "1"` (build-time inlined, client-visible); `isPrivateHost(host)` (gate.ts:46-77) = loopback / RFC-1918 / link-local / IPv6 ULA / Tailscale `100.64/10` / `.local`/`.internal`/`.lan` — **computed from the client-controlled `Host` header** (e.g. customize/route.ts:54, overrides/route.ts:118, verify/route.ts:42).

Guarded execution routes and their exact gate composition:

| Route | Flag | Private-Host | Capability verdict | What executes when all pass |
|---|---|---|---|---|
| `POST /api/fyd/objects/[objectId]/overrides` (overrides/route.ts:113-135) | yes | yes | `owner.correct-fact` via OwnerContext (route:308-321) | `applyOwnerCommand` → appends event to `data/fyd-owner/<objectId>.json` |
| `POST /api/fyd/customize` approve/clear (customize/route.ts:44-72) | yes | yes | `evaluateCapability(owner.customize-approve)` (route:61) | `emitOverlayEvent` → **unsigned** `FYD_SITE_OVERLAY` POST to gateway `/events` |
| `POST /api/fyd/claims/[resourceId]/verify` (verify/route.ts:38-60) | yes | yes | — (method allowlist only) | `verifyControl` → claim file rewritten `VERIFIED-CONTROLLED` |
| `POST /api/fyd/claims/[resourceId]/claim` (via `resolveClaimIdentity`, claim/identity.ts:16-17) | yes | **NO** | — | `claim()` → `OBSERVED→CLAIMED`, claim file written |
| `POST /api/fyd/claims/[resourceId]/release` (via `resolveClaimIdentity`) | yes | **NO** | holder-equals-claimant | `release()` → `CLAIMED→OBSERVED`, claim file rewritten |
| `GET /api/fyd/claims/identity` (via `resolveClaimIdentity`) | yes | **NO** | — | returns the demo actor label (read-only) |

**Asymmetry (flag-only vs flag+host):** claim/release consult only the env flag; verify/overrides/customize additionally require a private Host. The verify route's own header calls its gate "same contract as the customize approval API and the object overrides route" — claim/release follow a different, weaker contract.

**If the flag is ON in production (the binding risk):**
1. The "actor" is always `DEMO_OWNER_ACTOR` (`demo-owner`, capability.ts:103) — a label, never a verified identity — treated as **controller of every site** by hard-coded mapping (capability.ts:93-111). `owner.publish` stays denied (capability.ts:148), everything else in the demo set allows.
2. Any remote caller can drive claim/release (OBSERVED↔CLAIMED↔OBSERVED) on any resourceId — host is not checked. Verify/overrides/customize additionally need a private-looking Host; the header is client-controlled (spoofable on a direct/self-hosted bind; routing-constrained on Vercel).
3. Overrides approve remains digest-bound (base/view/patch digests, stale-proposal 409) and customize approve remains re-derivation-bound — those properties survive misconfiguration; what collapses is *who* may approve.
4. The writes are functionally real: claim JSON files, owner event logs, and — via customize — **unsigned** `FYD_SITE_OVERLAY` events into the gateway journal (the canonical-spine path performs no signature check; see §4).
5. `resolveClaimIdentity` deliberately does NOT consult the OIDC adapter (claim/identity.ts:6-11): there is no upgrade path where real auth backs these routes today.

---

## 4. Adapter→core trace (Task 4): one full execution call

**Traced call:** practice BFF `submitSignedEvent` → `POST {PING_GATEWAY_BASE_URL}/events` (reader:343-385), the same seam the FYD social lane uses (`submitEnvelope`, envelope.ts:68-90).

### What the adapter assumes vs what it sends vs what the core does

| Aspect | Adapter assumption (code) | Actually sent | Core behavior (read-only check, base b) | Verdict |
|---|---|---|---|---|
| Envelope version | `bff-envelope@1`: `{type, payload, proof, metadata}`, Ed25519 over canonical-json(type,payload,metadata) (envelope.ts:1-16) | Exactly that shape; `proof = {algorithm:"ed25519", publicKey (PEM SPKI), signature (base64)}` | `social_ingest_adapter.js` declares `BFF_ENVELOPE='bff-envelope@1'`, verifies the proof fail-closed (INVALID_PROOF / INVALID_SIGNATURE), and documents the contract as "verified here exactly as the BFF constructs it" | **MATCH** |
| Canonicalization | `canonicalizeJson` (dev-signer.ts:61): sorted keys, recursive, `undefined` dropped | Signed bytes = that serialization | `bffCanonicalize` (social_ingest_adapter.js:52-65) is a verbatim port with the same undefined-dropped semantics, documented as such | **MATCH** |
| Identity format | `^identity_[0-9a-f]{16}$` asserted (actions.ts:38; key-custody.ts:38) | Minted id echoed back into profile payloads as `identityId`/`controller`/`subject` | `IdentityAuthority.generateId('identity', …)` returns `` `${type}_${hash16}` `` (identity-authority.js:105-110); `POST /identities` accepts `{displayName, handle, bio, publicKey (PEM or SPKI-DER hex), algorithm:"ed25519"}` (identities.js:95-150), idempotent on (display_name, public_key) | **MATCH** |
| Sequence semantics | Adapter returns `event_id`; attestation re-reads the journal and mirrors latest-wins by `(sequence, created_at, event_id)` (attestation-gate.ts:86-91) | `sequence` read from journal query responses (readers.ts) | Core assigns sequence server-side via `eventRuntime.emit`; `POST /events` returns both `event_id` and `id` with the comment "BFF-reader compatibility: the website BFF reads `id`" (events.js:95-99) | **MATCH** |
| Signer binding | Adapter trusts its own server-side key custody: signs with the key for the cookie identity | `proof.publicKey` of the escrowed key | **For OBJECT_UPDATED:** core resolves `updated_by` from the *key* (SPKI-DER-hex lookup against `ping_events` `ping.identity@1`, `SIGNER_UNKNOWN` if unregistered) — the payload's claimed controller is not authoritative. **For RELATIONSHIP_CREATED (follow/like):** core takes `payload.subject` **as-given**; no signer-vs-subject check (social_ingest_adapter.js:240-250) | **SEAM NOTE (see M2)** |
| Vocabulary | Revocation = status `inactive` on same predicate; no `unfollows`/`unlikes` (actions.ts:18-21) | `status:"inactive"` | Enforced: `PREDICATE_NOT_CANONICAL` rejects `unfollows`/`unlikes`; only `active`/`inactive` accepted | **MATCH** |

### Seam mismatches for the EXECUTION-CORE investigator's log

- **M1 — Unsigned overlay path bypasses the signed ingest entirely.** `emitOverlayEvent` (customize/server.ts:78-121) sends `{event_type:"FYD_SITE_OVERLAY", aggregate_id:"fyd-site:"+siteId, aggregate_type:"fyd_site", event_data:{siteId, ops}}` — no proof, no signature, no digest. The core's `POST /events` branches on shape (events.js:71-128): bodies with `type`+`payload` (and no `event_type`) go through `social_ingest_adapter` (signature verified); bodies with `event_type`+`aggregate_id`+`aggregate_type`+`event_data` take the **canonical-spine branch and are emitted with no signature verification, no vocabulary enforcement, no identity binding**. The adapter's own comment admits "no auth on its event route" (customize/server.ts:7-13). Consequence: the demo-owner gate on the route is the *only* authorization for `FYD_SITE_OVERLAY` writes; if the flag is ever on in production (§3), unsigned overlay events land in the journal.
- **M2 — Subject trust asymmetry.** The core binds the signer for `OBJECT_UPDATED` (`updated_by` from key resolution) but trusts `payload.subject` for `RELATIONSHIP_CREATED`. Combined with the unsigned practice cookie (P5), a caller can select any existing dev identity and the server will sign follow/like events as it. Contained to the dev lane by design, but the boundary is "dev identities only", not per-user.
- **M3 — "Separate FYD journal" is config-only; defaults collapse.** Three modules claim the FYD demo journal is a separate deployment from the main gateway (ping-object-reader.ts:259-264; customize/server.ts:7-13), yet all three default to the same endpoint: `fydGatewayBaseUrl()` → `http://127.0.0.1:18199` (config.ts:22-28), `fydJournalBase()` → `http://127.0.0.1:18199` (reader:261-264), `emitOverlayEvent` → `FYD_CUSTOMIZE_GATEWAY_URL ?? "http://127.0.0.1:18199/events"` (customize/server.ts:69-71). Separation exists only when env vars are set; in the default config, overlays land in the main `ping_events` journal — contradicting the comments.

---

## 5. Classification counts

| STATUS | Count | Members |
|---|---|---|
| LIVE | 15 | P1, P2, P3, P5, P6, P7, P13, P14, P15, P16, P17, P18, P19, P20, P21 (+P22 executor) |
| LIVE, DUPLICATE | 1 | P4 (of P1; second key custodian) |
| DORMANT by design | 5 | P8, P9, P10, P11, P12 (demo-owner gate off) |
| DORMANT (unreachable) | 2 | P23 (no importers/route wiring), P24 (dead route reference) |
| CONFLICTING | 1 | M3 (separate-journal comments vs identical defaults) |

---

## 6. Patch-target rule verdict (Nolan's 20-agent program)

**Patches applied to `/home/nolan/projects/ping-constitutional`: NONE. Core diffs proposed for `/home/nolan/ping`: NONE. Commits created: NONE.**

Rationale, per candidate:
- *Claim/release flag-only gating (§3 asymmetry):* adding the host check is not "unambiguously established" — `resolveClaimIdentity` is deliberately flag-only by its documented design (claim/identity.ts:6-17), and the verify route's header implies distinct contracts. This is a design decision for Nolan, not an evident bug.
- *Unsigned practice cookie (P5):* documented dev-lane design ("does NOT grant capabilities", session.ts:23-33); the actual capability binding is server-side key custody + core signature verification. Changing it is architecture, not a correction.
- *Unsigned overlay path (M1):* the unsigned shape is deliberate in both repos (adapter comment + core canonical-spine branch); the fix would be a cross-repo auth-design decision. Noted for the seam log, not patched.
- *Three default gateway URLs (M3):* the comments claim separation while defaults collapse; but env-based separation is a supported config and the "correct" default is a deployment decision, not a code correction.
- *Two canonical-JSON serializers:* documented divergence ("labeled dev stand-in", envelope.ts:12-17); the core verifies against the same construction. Not an error.
- No other finding met the bar. The read-only posture stands.

---

## 7. Findings table — shared record format (for Agent 20, convergence auditor)

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EXECUTION-ADAPTER | `POST /api/fyd/social/{identity,follow,post}` (P1–P3) | Three routes cause signed gateway writes (identity mint + follow/unfollow + post) with no authn/authz and no digest-bound approval | src/app/api/fyd/social/identity/route.ts (no auth, calls createFydIdentity); follow/route.ts; post/route.ts; src/fyd/social/actions.ts:52,67,193,198,215; src/fyd/social/envelope.ts:46,73 | any HTTP caller | `createFydIdentity`/`followIdentity`/`unfollowIdentity`/`createFydPost` → `submitEnvelope` | PING gateway journal (`ping_events`) via `POST /events`, `POST /identities`; key escrow files under `FYD_DEV_KEY_DIR` | attestation re-reads (`attestation-gate.ts`), journal readers | Ed25519 key custody (key-custody.ts:67) + core `social_ingest_adapter` signature check — format-only `assertIdentityId` adapter-side | LIVE | HIGH | none (dev-lane design; the boundary is "dev identities only") | EXECUTION-CORE (ingest adapter behavior, sequence semantics) | Agent 20; identity lane (three identity namespaces, no bridge) |
| EXECUTION-ADAPTER | Practice BFF writes (P5): follow/like/bio | Practice routes journal relationships and profile updates as whichever dev identity the unsigned cookie names | src/app/api/practice/follow/route.ts, like/route.ts, bio/route.ts; src/lib/ping/session.ts:23-33 (unsigned `ping_practice_identity` cookie); src/lib/ping/ping-object-reader.ts:343-385 (`submitSignedEvent`), :637-687 | any HTTP caller | `getPingObjectReader().follow/like/updateBio` → `submitSignedEvent` → `POST /events` | gateway journal | journal readers / practice UI | server-side dev key custody (dev-signer.ts:132) — cookie is an assertion, the key is the binding | LIVE | HIGH | cookie-as-identity (unsigned); core trusts `payload.subject` for RELATIONSHIP_CREATED (seam M2) | EXECUTION-CORE (signer-vs-subject binding decision) | Agent 20 |
| EXECUTION-ADAPTER | Practice identity mint (P4) | Second, unauthenticated `POST /identities` path with its own key custodian, duplicating the FYD social mint | src/app/api/practice/identities/route.ts; ping-object-reader.ts:582-635 (POST /identities at :600); src/lib/ping/dev-signer.ts:132 vs src/fyd/social/key-custody.ts:67 | any HTTP caller | `reader.createIdentity` | gateway journal + `PING_DEV_KEY_DIR` key files | practice session route | none adapter-side (core verifies signature, mints id) | LIVE, DUPLICATE | HIGH | duplicate key custodians, divergent identity-format validation (strict vs loose regex) | EXECUTION-CORE; identity lane | Agent 20 |
| EXECUTION-ADAPTER | Proposal approval (P6) | The only adapter execution path bound to a proposal digest + controller + grants before journaling | src/app/api/ping/proposal/route.ts (site-patch spec-digest re-read :49-62); ping-object-reader.ts:1297-1355 (`verifyProposalDigest` :1299, controller check :1305/:1324, `grantsForViewer` :1329, envelope `payload_hash == digest` :1336) | Ask PING UI / agent context builder | `submitProposal` → `submitSignedEvent` | gateway journal | proposal draft pipeline | digest law (ask-composer.ts:55; ask/envelope.ts:37) + grants.ts | LIVE | HIGH | none — this is the positive reference implementation | EXECUTION-CORE (envelope/digest verification parity) | Agent 20 |
| EXECUTION-ADAPTER | Demo-owner-mode gate (P8–P12) | Five mutation surfaces are dormant-by-design behind a build-time flag; claim/release check the flag only, while verify/overrides/customize also require a private Host header | src/fyd/owner-mode/gate.ts:29,46-77; src/fyd/claim/identity.ts:16-17 (flag-only); verify/route.ts:38-60, overrides/route.ts:113-135, customize/route.ts:44-72 (flag+host); capability.ts:93-148 (hard-coded controller mapping, `owner.publish` denied) | demo UI panels | `applyOwnerCommand`, `emitOverlayEvent`, `claim`/`release`/`verifyControl` | `data/fyd-claims/*.json`, `data/fyd-owner/*.json`, gateway journal (FYD_SITE_OVERLAY) | claim/owner stores, Ask FYD overlay reader | demo gate — explicitly not authentication (gate.ts:1-21) | DORMANT (by design) | HIGH | demo-auth-as-authz if flag enabled in production (§3); Host header is client-controlled | SECURITY lane (F3 overlap); identity lane (no OIDC bridge by design) | Agent 20; Nolan (flag-on-in-prod is a deployment decision) |
| EXECUTION-ADAPTER | Unsigned overlay emission (M1) | Customize approvals POST unsigned `{event_type, aggregate_id, aggregate_type, event_data}` envelopes that the core's canonical-spine branch journals without signature verification | src/fyd/customize/server.ts:69-121 (comment: "no auth on its event route"); core /home/nolan/ping/gateway/routes/events.js:71-128 (shape branch: signed adapter vs unsigned spine) | customize approve/clear (dormant) | `emitOverlayEvent` → `POST /events` | gateway `ping_events` | `queryFydSiteOverlays` (reader:279) → Ask FYD tenant graph | route-level demo gate only | DORMANT (by design), misconfiguration-sensitive | HIGH | canonical-spine ingest has no signature/auth gate at this layer | EXECUTION-CORE (ingest-branch auth design) | Agent 20 |
| EXECUTION-ADAPTER | Gateway URL defaults (M3) | Three modules claim a separate FYD demo journal but all default to `http://127.0.0.1:18199` | src/fyd/social/config.ts:22-28; ping-object-reader.ts:259-264; src/fyd/customize/server.ts:69-71 | config | gateway HTTP endpoints | gateway journal | all adapter readers | env config | CONFLICTING | HIGH | comments assert separation the defaults do not provide | EXECUTION-CORE (which journal actually receives overlays in prod config) | Agent 20 |
| EXECUTION-ADAPTER | Envelope seam verified (Task 4) | Adapter's signed-envelope assumptions (bff-envelope@1 shape, canonicalization, identity format, sequence, vocabulary) match the core's `social_ingest_adapter` | adapter: envelope.ts:1-16, dev-signer.ts:61, actions.ts:38; core: /home/nolan/ping/gateway/social_ingest_adapter.js (BFF_ENVELOPE, bffCanonicalize :52-65, verifyBffProof, normalizeBffEnvelope :288), identity-authority.js:105-110, routes/events.js:71-99 | submitSignedEvent / submitEnvelope | core `POST /events` → `normalizeBffEnvelope` → `eventRuntime.emit` | gateway journal | attestation readers | `social_ingest_adapter` (fail-closed) | LIVE (seam healthy) | HIGH | none found on the signed path | EXECUTION-CORE (owns the adapter side of this seam) | Agent 20 |
| EXECUTION-ADAPTER | Marketing ingest (P17–P19) | Unauthenticated routes cause external Kit mutations and in-memory event writes | src/app/api/kit/webhook/route.ts; newsletter/subscribe/route.ts (`syncNewsletterSubscriber`); resources/download/route.ts (`findSubscriberByEmail`, `applyGuideDownloadTag`); src/lib/events.ts:205 | any HTTP caller | `logEvent`, `lib/kit.ts` Kit API calls | Kit (ConvertKit) subscriber state; in-memory event log | — | NONE | LIVE | HIGH | already owned by security sweep (F1/F2) — not re-litigated here | SECURITY lane (owns F1/F2) | Agent 20; security lane |
| EXECUTION-ADAPTER | Auth-lane writes (P13–P15) | Identity binding writes are gated by verified OIDC tokens / HMAC session / CSRF — the properly-authorized reference | src/app/api/fyd/auth/google/callback/route.ts; link/google/callback/route.ts; unlink/route.ts:29-42; src/fyd/identity/principal.ts:150,196,243; session.ts:43-217 | OAuth flow / session holder | `signInOrSignUp`/`linkProviderAccount`/`unlinkProviderAccount` | `data/fyd-identity/accounts/*.json` | auth session route | verified ID token; HMAC-SHA256 session; CSRF | LIVE | HIGH | none | identity lane | Agent 20 |
| EXECUTION-ADAPTER | Onboarding preview write (P20) | Unauthenticated preview POST writes an idempotent OBSERVED claim file (never overwrites) | src/app/api/fyd/onboarding/preview/route.ts:40; src/fyd/onboarding/anonymous-preview.ts:215-220 (`claimExists` guard) | any HTTP caller (rate-limited) | `generateAnonymousPreview` | `data/fyd-claims/*.json` (OBSERVED only) | claim routes | rate limit + SSRF gate (fyd/net) | LIVE | HIGH | none material (idempotent, non-ownership) | — | Agent 20 |
| EXECUTION-ADAPTER | Dead/dormant executors (P23–P24) | API client helper, ActivityPub federation, and `/api/estimate` client call have no live callers or targets | src/lib/api/client.ts (zero importers); src/fyd/adapters/activitypub/{endpoints,signing}.ts (no route wiring, outbox stubbed); src/services/estimate.ts:95 (no `/api/estimate` route exists) | — | — | — | — | — | DORMANT | HIGH | none (dead code) | — | Agent 20 |

---

## 8. Notes for the coordinator

- Snapshot was taken from a verified-clean worktree at `a69bb68f`; base files were never written. Local snapshot at `/tmp/ro-snap` is disposable (may be wiped).
- The signed-envelope seam (Task 4) is **healthy**: the adapter's assumptions match the core's documented, fail-closed `social_ingest_adapter`. The live risks are the **unsigned overlay path (M1)** and the **default-URL collapse (M3)** — both are cross-repo design facts for the convergence decision, not in-repo bugs.
- Strongest adapter-side authorization references for convergence: P6 (digest-bound proposal approval) and P8 (digest-bound propose/approve two-step). Weakest live surfaces: P1–P5 (dev social + practice BFF: no authn, unbound) and P17–P19 (marketing ingest — security lane owns).
- No browser work was required or performed; no secrets were read or printed (secret paths referenced metadata-only: `FYD_DEV_KEY_DIR`, `PING_DEV_KEY_DIR` locations).
