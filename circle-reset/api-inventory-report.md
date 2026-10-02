All data gathered. Nothing was modified. Here is my full report.

## Inventory: Ask FYD APIs + Follow/Like APIs (PING repo, branch fyd/builder-composition)

### 1. Ask API comparison

**POST `/api/fyd/ask` (flat route)** — route.ts is thin; the contract lives in its docblock + `ask-pipeline.ts`:
- Request: `{ siteId: string, objectId?: string, question: string, mode?: "visitor" | "owner" }`
- Response: `{ ok: true, answer, answerClass, refusal, citations, unknowns, suggestedActions, proposal, tenantId }`
  - `answerClass`: `"supported" | "derived" | "unknown"` (`"unknown"` = refusal)
  - `unknowns: string[]`, `suggestedActions` ([] when none), `proposal`: draft AskProposal | null; every citation carries `claimClass` ("supported"|"derived")
  - Errors are structured JSON (404 unknown site, 400 bad question/mode/tenant_mismatch, 503 projection unavailable, 500); answer is unknown in every failure case, never an empty body
- Evidence-bounded: **yes** — refusal says unknown when evidence is missing; unknowns explicitly listed
- Identity/object context: **yes** — `siteId` (tenant) + optional `objectId` (which object inside the site). `mode: "visitor"` (default) is anonymous, public objects only, no grants; `"owner"` is accepted but treated as visitor-safe until an auth lane exists
- The route's own docblock calls this the **"legacy flat route"** and says new callers should prefer the trusted-path **POST `/api/fyd/ask/[siteId]`** (tenant from route path; body-supplied tenant refused on mismatch; body is `{ question, objectId?, mode? }`)
- Live callers (flat): `ask-fyd-widget.tsx`, `src/fyd/capabilities/runtime.ts`, `ask-object-panel.tsx`, **`fyd-circle.tsx`** (the Circle: posts `{ siteId: siteId ?? projection.id, objectId: projection.id, question, mode: "visitor" }`). Live callers (trusted-path): `identity-object.tsx` (`/api/fyd/ask/[siteId]`), `spatial-ask-panel.tsx` (`/api/fyd/ask/happy-place`)

**POST `/api/ping/ask` (BFF)** — 30 lines:
- Request: `{ question: string, targetObjectId?: string }` (question required, max 2000 chars)
- Response: `AskAnswer` — `{ answer, partial, evidenceRefs, relatedObjects, suggestedActions, proposal }`
- Evidence-bounded: **yes** — "The composer never fabricates: no evidence means an honest partial answer"; every factual sentence cites evidence as [n]
- Identity/object context: **yes** — `targetObjectId`; viewer comes from the practice session cookie (`getPracticeIdentityId()`)
- Live callers: **exactly one** — `ask-ping.tsx` (AskPingPanel), rendered in `node-sections.tsx` and `feed/feed-client.tsx` (Node page + Feed page = internal PING practice surfaces). No FYD surface uses it.

### 2. `src/components/ping/ask-ping.tsx` (363 lines)
A full chat **panel**, not a floating control: `AskPingPanel({ targetObjectId, initialPrefill, onChanged, className })`. Includes an input form, answer rendering with paragraph breaks, clickable evidence list, related-objects links, suggested actions via `ActionButtons`, and a `ProposalCard` with Approve/Reject flow (object_update / site_patch / create_object), including before/after review, exact-digest display, and submission to `/api/ping/proposal` signed as the viewer identity ("Agents propose; they cannot publish").
**Verdict: build smaller, do not reuse.** It is owner/power-user machinery for the internal practice surface, bound to `/api/ping/ask` + session identity + the proposal-governance flow. The "ONE small global FYD assistant" wants the `ask-fyd-widget` pattern (small input + answer + collapsed "Why this?" citations disclosure, 320px-mobile-safe, no proposal machinery) — which `fyd-circle.tsx` already implements inline against `/api/fyd/ask`.

### 3. Follow/Like comparison

**`/api/fyd/follow` + `/api/fyd/like`** — local demo pair, **no backend events**:
- follow: `GET ?objectId=` → `{ ok, following }`; `POST { objectId, action: "follow"|"unfollow" }` → `{ ok, following }` (400 bad shape, 404 unknown object)
- like: `GET ?objectId=` → `{ ok, liked }`; `POST { objectId, action: "like"|"unlike" }` → `{ ok, liked }`
- Backend: writes server-local JSON (`data/fyd-follows/local.json`, `data/fyd-likes/local.json`) for a single demo-local "local" viewer. **Emits no events.** No auth. objectId must match `^[a-z0-9-]+$` and be a known object.
- Live callers: `fyd-circle.tsx` (follow status GET + POST toggle), `portal-circle.tsx` (follow + like), `portal-host.tsx`, `capabilities/runtime.ts`. Note: `fyd-circle.tsx` has **no like button** — like is only wired in `portal-circle.tsx` and the capability runtime.

**`/api/practice/follow` + `/api/practice/like`** — the event-emitting pair:
- follow: `POST { targetId }` → 201 `{ relationshipId }`; `DELETE ?targetId=` → `{ ok: true }`
- like: `POST { objectId }` → 201 `{ ok: true }`; `DELETE ?objectId=` → `{ ok: true }`
- Backend events: each call submits a **signed canonical event** to the PING gateway `POST /events`, always of type **`RELATIONSHIP_CREATED`** (signed ed25519 as the subject identity; metadata `{ patch: "7B", source: "ping-website-practice", producedAt }`):
  - follow: `{ subject, predicate: "follows", object: targetId }`
  - unfollow: `{ subject, predicate: "follows", object: targetId, status: "inactive" }`
  - like: `{ subject, predicate: "likes", object: objectId }`
  - unlike: `{ subject, predicate: "likes", object: objectId, status: "inactive" }`
  - (Unfollow/unlike are also RELATIONSHIP_CREATED with `status:"inactive"` — revocations, not a separate event type. Counts are projections computed from these events.)
- Auth: **requires practice identity session** — httpOnly cookie `ping_practice_identity` (7-day, sameSite lax). No session → 400 "No active practice identity. Select an identity first." Follow rejects self-follow. Signing requires the identity's dev key to be configured.
- Live callers: `action-buttons.tsx` (follow/unfollow on identity targets, like/unlike on object targets), `intelligent-circle.tsx`, `practice/page.tsx` — all internal practice surfaces.

### 4. `src/components/ping/action-buttons.tsx` (220 lines)
Renders a server-computed `PlannedAction[]` (CapabilityPlan) as buttons; deterministic, same model drives UI and agent context. Actions: **follow** (POST `/api/practice/follow` `{targetId: identityId}`), **unfollow** (DELETE `/api/practice/follow?targetId=`), **like** (POST `/api/practice/like` `{objectId}`), **unlike** (DELETE `/api/practice/like?objectId=`), **open/open_site** (link to `/node/[objectId]`), **open_website** (external link), **ask/reply/propose_update/propose_site_patch** (callback `onAsk` → opens Ask PING panel prefilled), **reference** (copies stable reference id). Follow/unfollow gated to identity targets; like/unlike to object targets; pending spinners + error display.

---

## Deliverable

**(a) Recommended single Ask API: POST `/api/fyd/ask/[siteId]` (trusted-path), flat `/api/fyd/ask` kept for existing callers.**
Contract: `POST /api/fyd/ask/[siteId]` with body `{ question: string, objectId?: string, mode?: "visitor" | "owner" }` → `{ ok: true, answer, answerClass: "supported"|"derived"|"unknown", refusal, citations[] (each with claimClass), unknowns: string[], suggestedActions, proposal: AskProposal|null, tenantId }`; errors 400/404/503/500 all structured JSON, answer always unknown on failure. The flat variant adds required `siteId` in the body. Rationale: it is the route family the Circle already uses, it is evidence-bounded (refusal = says unknown), it is anonymous visitor-safe with no grants, and its `objectId` param lets one assistant answer about whichever Circle is selected. `/api/ping/ask` stays for the internal Node/feed panels (session-viewer, proposal machinery) — wrong fit for a small visitor assistant.

**(b) Recommended single follow/like pair: POST/DELETE `/api/practice/follow` + `/api/practice/like` — the only pair that emits backend events.**
- Follow: `POST /api/practice/follow` `{ targetId }` → 201 `{ relationshipId }` (event: RELATIONSHIP_CREATED `{ subject, predicate: "follows", object: targetId }`); `DELETE /api/practice/follow?targetId=` → `{ ok: true }` (event: same type + `status: "inactive"`)
- Like: `POST /api/practice/like` `{ objectId }` → 201 `{ ok: true }` (event: RELATIONSHIP_CREATED `{ subject, predicate: "likes", object: objectId }`); `DELETE /api/practice/like?objectId=` → `{ ok: true }` (event: same type + `status: "inactive"`)
- Semantic difference vs the FYD pair: practice **follow is identity→identity** (`targetId`), practice **like is identity→object** (`objectId`); the FYD pair uses `objectId` for both and is local-only.

**(c) Verdict on ask-ping.tsx: do not reuse — build the small assistant.** AskPingPanel is 363 lines of owner/practice machinery (proposal cards, digest approval, ActionButtons). The small primitive is the `ask-fyd-widget` style (input + answer + collapsed citations) or the inline ask implementation already in `fyd-circle.tsx`, posting to the `/api/fyd/ask` family.

**(d) Auth/session requirements for the Circle's follow/like button.** The practice pair requires the `ping_practice_identity` httpOnly session cookie; without it the API returns 400 for every call, and events are signed with the subject identity's ed25519 dev key (must be configured). **Critical caveat for the parent:** the FYD Circle is an anonymous visitor surface (`mode: "visitor"`, no grants) — anonymous visitors have no practice identity, so wiring the Circle's follow/like to the practice pair will 400 for every anonymous visitor unless a visitor-identity decision is made first. Options: (1) show follow/like only where a practice session exists (fail closed to "unavailable" like `fyd-circle.tsx` already does), or (2) define a visitor identity/auth story before wiring. Note the FYD follow store's own docblock says "Real user identity is a separate gate." The currently-wired `/api/fyd/follow`/`/api/fyd/like` are local-file, single-viewer demo stores with no auth and no events — they do not satisfy the "triggers a backend event" requirement.