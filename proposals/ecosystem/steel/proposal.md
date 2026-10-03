# Harvest Proposal: Steel — browser execution as infrastructure

VERDICT: **ADAPT** — take the session/replay *record mechanism*, rewrite to PING semantics. Do NOT adopt Steel as a dependency (no third-party browser service in the FYD acquisition path).

## What I read (official docs and source only)

All fetched 2026-10-02 via browser_open/browser_search. Concatenated sha256 of the verbatim notes below: `sha256:a9a7e96f1fde0abc4f302a2f31603b49b43939a2c27efec9efe76b30572327f0` (inputs recorded in /tmp/steel-harvest-inputs/01..08, order as listed here).

1. `https://docs.steel.dev/overview/sessions-api/session-lifecycle` — session object, three states, lifecycle, timeouts, release.
2. `https://docs.steel.dev/overview/sessions-api/quickstart` + `https://docs.steel.dev/llms.txt` — session create fields, SDK contract, WSS connect URL construction, scrape response shape.
3. `https://docs.steel.dev/overview/sessions-api/configuration` — full session create option table (profileId, persistProfile, sessionContext, credentials, debugConfig, optimizeBandwidth, extensionIds, dimensions, projectId/namespace).
4. `https://github.com/steel-dev/docs/blob/HEAD/content/docs/cookbook/profiles.mdx` — persistent profiles: full Chromium user-data-dir capture, `prof_<id>` IDs, profile lifecycle, trust warning ("treat the profile like an account").
5. `https://github.com/steel-dev/docs/blob/HEAD/content/docs/cookbook/auth-context.mdx` — session context snapshot (cookies/localStorage/sessionStorage/indexedDB) as one read call + one create option.
6. `https://github.com/steel-dev/skills` (repo at commit `35bf278371312964a177f15b679b5e290f9ef275` as observed in fetch URLs) — `steel-session-debugging` SKILL.md (frontmatter: `license: MIT`) + references: `log-event-types.md`, `agent-traces.md`, `replay-and-screenshots.md`, `failure-taxonomy.md`, `investigation-workflow.md`.
7. `https://github.com/steel-dev/steel-mcp-server/blob/HEAD/docs/SESSIONS.md` — saved identity: profile UUID/status/timestamps catalog, 10-minute signed configuration tokens, single persistent writer, READY/UPLOADING profile states, credential namespaces never entering model context.
8. `https://github.com/thegreatsura/steel-browser` README (mirror; canonical org is `steel-dev/steel-browser`, image `ghcr.io/steel-dev/steel-browser`) — Apache-2.0 license, sessions vs quick-actions split, Docker self-host.

Nothing was copied from marketing copy; Steel Cloud specifics (billing per session-minute, app.steel.dev viewer URLs) were treated as product description, not harvestable mechanism. No proprietary code was copied — the mechanism below is re-derived from public API semantics.

## Object model (re-derived from the docs)

- **Session**: `{ id, state, timeout_ms, inactivityTimeout_ms, created_at, region, profile_id?, proxy_status, cdp_url, sessionViewerUrl, playerUrl }`. `id` is a UUID — server-generated, or caller-supplied via `sessionId` at create (must be a valid UUID, e.g. so a job row can reserve it before the browser exists). Steel does not accept arbitrary ID formats.
- **Profile**: `{ id: "prof_<...>", status: READY | UPLOADING, created_at, updated_at }`. Captures the *full Chromium user-data directory* (cookies, localStorage, IndexedDB, extensions + config, autofill, history, bookmarks, site permissions) — not just cookies. Docs warn explicitly: "Treat the profile like an account. Anyone who can call `sessions.create({ profileId })` on your workspace can drive a browser logged in as you."
- **SessionContext**: a portable auth snapshot (cookies, localStorage, sessionStorage, indexedDB) — one read call (`sessions.context(id)`) to capture, one create option (`sessionContext`) to restore into a fresh session.
- **Credentials**: stored server-side under exact-origin namespaces; the account catalog exposes only UUID + status + timestamps. Stored values, cookies, fingerprints, usernames, passwords, TOTP secrets *never enter model context*.
- **Files**: per-session VM filesystem namespace (`sessions.files.list/upload/download`) — uploaded bytes land at a path the browser can read and mean nothing on the caller's machine.
- **Action traces (semantic)**: `{ action_type: click|fill|type|wait|navigate|extract|screenshot, target_accessible_name, selector_candidates, element_refs, input_values(redacted), url_before, url_after, result|error|timeout }`.
- **Replay artifacts**: live viewer URL (current state), player URL (past replay), HLS recording when available, agent/command screenshots, final page URL + visible text of last snapshot.

## ID scheme

- Sessions: UUID v4 (server-generated or caller-reserved; caller reservation exists precisely so the ID can be written to a job row *before* the browser boots — an idempotency-friendly pattern).
- Profiles: `prof_` + short token (`prof_9f3c...`).
- CDP attach: `wss://connect.steel.dev?apiKey=<key>&sessionId=<id>` — session ID is the correlation key across REST, WebSocket, and viewer URLs.
- Auth: `steel-api-key` header; MCP non-default plans use short-lived *signed configuration tokens* bound to the credential, expiring after 10 minutes.

## State transitions

```
        create(sessionId?)
  STARTED ──→ Live ──→ Released   (explicit release / releaseAll / timeout elapsed / inactivityTimeout)
              │
              └──→ Failed          (crash / connection loss; auto-cleaned)
```
- Default lifetime 5 min; `timeout` (ms) is the immutable hard cap (cannot be edited on a live session); plan max 24 h.
- `inactivityTimeout` releases on zero CDP/input activity (protects against stalled clients); if ≥ `timeout` it is a no-op.
- Released/Failed are terminal: resources cleaned up, no commands accepted.
- Profile upload happens *on release* and is asynchronous (skipping release delays the profile snapshot until timeout).
- Profile status transition: `UPLOADING → READY`; exactly one persistent writer per profile at a time.

## Authority boundary

- Steel owns the Chrome process: you cannot attach Steel to a pre-existing external browser. Sessions are isolated browser instances; the platform controls process lifecycle, proxy chain, fingerprint, and cleanup.
- The *agent* owns intent; the *platform* owns execution. Steel's MCP server doctrine is explicit: the process "only owns the browser" — the client brings the model. Secrets (credentials, cookies, TOTP) stay platform-side and never cross into model context.
- Identity/account actions are namespaced: credential catalog exposes UUID/status/timestamps only; loading a profile is read-only unless `persist_profile` was explicitly planned.
- Scopes: `steel_profile=browse|scrape` presets; plain reads use the stateless scrape endpoint (no session) — a cheap-path vs session-path separation.

## Persistence semantics

- Sessions are ephemeral by design (minutes-to-hours, billed per minute). Durable state lives in exactly three places: **profiles** (full user-data dir, versioned READY/UPLOADING), **session-context snapshots** (portable, but cookies expire), and **files** (session-scoped VM filesystem, gone with the session).
- Profile snapshots are *eventually consistent* (async upload on release).
- No cross-session mutable state except via an explicit profile ID; no timeout extension on a live session — plan the lifetime up front.

## Evidence / receipts (the part worth harvesting)

Steel separates evidence into four non-blendable tiers, and its debugging skill *requires* naming the surface that backs each claim:
1. **Metadata** — "what session was this": lifecycle status, creation time, URLs, region, profile, proxy status, release/failure state.
2. **Browser logs** — "what did the page/browser report": console errors, navigation errors, failed requests, page crashes, timeout markers, CAPTCHA/proxy events.
3. **Raw agent logs** — CDP-derived event stream (low-level timing, used when the semantic trace is incomplete).
4. **Agent traces** — "what did the agent intend and do": semantic actions with accessible names, selectors, URL before/after, results.
5. **Replay** — live viewer, past-replay player, HLS recording, screenshots, final URL + visible text.
- **Redaction rule is structural**: cookies, Bearer tokens, API keys, passwords, form values, obvious PII are redacted *before* summarization — not as an afterthought.
- **Failure taxonomy is closed and typed**: Setup/Platform, Browser/Page, Agent Behavior, Auth/Reliability classes (e.g. `extraction-read-from-old-state`, `profile-session-context-mismatch`, `incomplete-cleanup-or-unreleased-session`).
- **Test evidence exists upstream**: `steel-dev/skills` ships `evals/evals.json` + `scripts/validate-skills.mjs` (routing/behavior assertions), and cookbook recipes carry `RecipeMeta` with pinned commit SHAs (e.g. `e86cfbf8ba715cdbbc49fc2ef13e9fd7798695dc`).

## Retries / failures

- Client-side `try/finally` release is mandatory doctrine (a missing release bills until timeout); `releaseAll()` for bulk cleanup.
- Session failure classes distinguish *invalid/expired session*, *session ended early*, *unavailable logs or traces*, and *platform-side incident* — i.e., "no evidence" is itself a failure class, not a silent empty.
- HLS replay is conditional ("when available") — downstream consumers must handle absent recordings as expected, not as errors.

## Revocation model

- `release(sessionId)` / `releaseAll()` — immediate resource revocation; failed sessions auto-revoked.
- `profiles.delete(id)` — identity revocation; docs frame it as account rotation ("rotate or delete when the identity is done").
- Credential namespaces are origin-bound and discoverable only by catalog (UUID/status/timestamps); signed session-configuration tokens expire in 10 minutes.
- Self-hosted deployments return named *unsupported-capability* results for cloud-only features (profiles/persistence/credentials/proxies/CAPTCHA) — a graceful-degradation pattern, not a hard failure.

## Tests (upstream, for the mechanism only)

- `steel-dev/skills`: `node scripts/validate-skills.mjs`, `evals/evals.json` per skill.
- `steel-dev/steel-cookbook` examples with `RecipeMeta` pinned commits.
- Self-hosted: `http://localhost:3000/documentation` (Swagger) per session.

## Verdict: ADAPT (mechanism only, zero-dependency)

**Do not adopt Steel** — FYD's acquisition path must not depend on a third-party cloud browser service (availability, cost-per-minute, data-exfiltration surface of a full profile sent to someone else's Chrome). The *infrastructure* is correctly rejected.

**Do adapt the mechanism**: Steel's contribution is a *typed, four-tier evidence record for browser execution* — the exact audit shape FYD's acquisition boundary (untrusted URL → validated request → fetch → evidence) currently lacks. Steel proves that an acquisition run is only trustworthy when it is recorded as: session identity + semantic action traces (URL before/after, accessible-name target, result) + raw event stream + browser logs + replay artifacts + a closed failure taxonomy + structural redaction before summarization. The smallest useful piece is the record *shape*, not any code.

## SMALLEST MISSING PRIMITIVE

**`AcquisitionSession` record (trust-kernel)** — the typed receipt for one browser-backed acquisition of a website:

```
AcquisitionSession {
  session_id: UUID            // reserved before the browser boots (job-row idempotency)
  target_url: URL
  profile_id?: prof_<id>      // provenance of reused identity; null = fresh
  transitions: [STARTED→LIVE→RELEASED|FAILED] with ts each
  action_traces: [{ ts, action, target_accessible_name?, url_before, url_after, result|error }]
  artifacts: [{ kind: screenshot|replay|dom_snapshot, digest }]   // sha256, byte-faithful
  bytes_digest: sha256 of the canonical bytes the run produced     // binds run → evidence
  failure_class?: <closed taxonomy enum>   // absence-of-evidence is a class, never silent
  redaction_applied: bool     // structural, before any summarization
}
```

FYD/PING today has evidence objects and a trust kernel, but no typed answer to "under what observed execution did these website bytes arrive." This primitive plugs the trust kernel's fetch boundary (per the brutal-ceo-harvest doctrine: untrusted URL → FYD trust kernel → validated request → crawler → untrusted result → normalization/evidence) with a verifiable execution receipt, and it feeds proofs 1–3 (ingest Happy Place / Coppersmith with explainable acquisition), proof 3's deterministic evidence-backed graphs (acquisition provenance as graph edges), and proof 6 (Ask FYD can cite *how* a fact was observed).

## Dependency analysis

Zero-dependency. No `steel-sdk`, no Steel Cloud, no CDP client required — only the record shape and the four-tier evidence separation, reimplemented in PING semantics. Every other mapped concept (profile persistence, signed tokens) is a documented extension, not a dependency. No proof_id exists without the primitive itself, so no dependency is named.

## License finding

- `steel-browser` (canonical `steel-dev/steel-browser`): **Apache-2.0** — README "## License — Apache 2.0". Clean for adaptation.
- `steel-dev/skills` `steel-session-debugging` SKILL.md frontmatter: **MIT**.
- No GPL/copyleft/SSPL/BSL anywhere in the read material. Nothing to flag to Nolan.
- Since verdict is ADAPT-mechanism (no code taken), license exposure is documentation-level only.

## Mapping to proof_ids

`[1, 2, 3, 6]` — 1/2: ingest Happy Place and Coppersmith through real browsing with a verifiable receipt; 3: acquisition provenance as evidence-backed graph edges; 6: Ask FYD answers carry the execution receipt. Explicitly NOT 9–14 (this is trust-boundary material, not mission execution).

## Open questions for the coordinator

- Should `AcquisitionSession` live under `trust/` (fetch boundary) or `objects/` (record shape)? I set AUTHORITY_OWNER to `trust-kernel` because its binding value is the digest-to-execution link; the plain record shape is secondary.
- FYD currently uses Crawl4AI per the brutal-ceo-harvest directive; the primitive should wrap *whatever* acquisition driver produces the bytes — it is driver-agnostic by design.
