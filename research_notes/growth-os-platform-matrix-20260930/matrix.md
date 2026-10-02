# GROWTH-OS Platform Distribution Capability Matrix

Research date: 2026-09-30. Second PING training mission (INTELLIGENCE_RESEARCH): verify what each distribution platform actually allows programmatically.

Evidence grade: VERIFIED = read in official developer docs (or, where direct fetch was blocked, in the official-docs GitHub mirror / official policy text mirrored on GitHub, flagged). INFERRED = reasonable reading from corroborating secondary sources. UNKNOWN = could not confirm. No live API calls, no account creation, no publishing performed.

Claims (a)-(d) were assigned by the mission brief and are graded individually per platform.

---

## Cross-platform capability manifest

| Capability | Meta (FB+IG) | YouTube | TikTok | LinkedIn | X |
|---|---|---|---|---|---|
| supports_video | true | true | true | true | true |
| supports_short_video | true | partial | true | partial | true |
| supports_images | true | partial | true | true | true |
| supports_scheduling | partial | true | false | false | false |
| supports_drafts | partial | partial | partial | false | false |
| supports_metrics | true | true | partial | partial | partial |
| supports_comments | true | true | partial | partial | true |

Reading the "partial" rows: no platform offers the full GROWTH-OS distribution contract natively. Every connector must own scheduling state, draft state, dedup keys, and token refresh. See "Cross-cutting connector-contract implications."

---

## 1. META — Facebook Pages + Instagram

Primary sources: developers.facebook.com (via search-index snapshots; direct fetch returned HTTP 403, so official-doc claims are VERIFIED-with-caveat). Corroboration: Meta's facebookincubator solution docs, 2026 integrator runbooks.

### Capability manifest
- **supports_video**: true — FB `POST /{page-id}/videos` (resumable upload for large files); IG two-step containers with `media_type=VIDEO`, poll `status_code` to FINISHED, then `media_publish`.
- **supports_short_video**: true — FB dedicated Reels endpoint `POST /{page-id}/video_reels`; IG `media_type=REELS` on the container endpoint (business/creator accounts only; read `media_product_type` to distinguish, since published reels report `media_type=VIDEO`).
- **supports_images**: true — FB `POST /{page-id}/photos`; IG image containers (JPEG-only per integrator docs).
- **supports_scheduling**: partial — FB Pages: native `scheduled_publish_time` (10 minutes to 75 days). IG: NO native API scheduling; publish is immediate at `media_publish`. Self/third-party scheduling required.
- **supports_drafts**: partial — FB: `published=false` unpublished posts, flippable via `is_published=true`; unpublished photos attachable via `attached_media`. IG: no drafts; unpublished containers expire after 24h.
- **supports_metrics**: true — FB Page/Post insights (`/{page-id}/insights`, `/{post-id}/insights`, day/week/days_28/lifetime, ~2yr retention for public pages); IG account + per-media insights (daily granularity mostly). Caveats: metric names churn across API versions and between login families; empty data returns `[]`, not zeros.
- **supports_comments**: true — FB read/create/hide/delete via `/{post-id}/comments`; IG read/reply/hide/delete via `/{media-id}/comments`, `/{comment-id}/replies`, `?hide=true`. Webhooks recommended over polling.

### Publishing specifics (graded)
- FB feed posts: `message`, `link`, `child_attachments` (carousel), `object_attachment`; edit and delete supported. (VERIFIED-caveat)
- IG two-step container flow is mandatory: create container → poll `status_code` (Meta guidance: check ~1/min, max ~5 min) → `media_publish` on FINISHED only. (VERIFIED-caveat)
- IG media must be a public HTTPS URL Meta fetches (no direct binary upload for feed images); video gets resumable upload via `rupload.facebook.com/ig-api-upload`. (VERIFIED-caveat)
- IG Stories publishing is business-account-only; personal accounts fully excluded. (VERIFIED-caveat)
- IG Reels duration limits conflict across sources (90s API-strict vs up to 3 min): UNKNOWN/CONFLICTED, needs live doc read.
- IG carousel via API: up to 10 items (app allows 20). (INFERRED)

### OAuth, scopes, tokens (graded)
- Two login families: classic Facebook Login and newer Instagram API with Instagram Login (no linked Page required). Scope rename `instagram_*` → `instagram_business_*` reported in-flight; support both names. (VERIFIED-caveat / INFERRED)
- FB Page scopes: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`, `pages_read_user_content`, `read_insights`. Classic IG: `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`. New IG Login: `instagram_business_*` equivalents. (VERIFIED-caveat)
- Token lifecycle: short-lived user token (~1-2h) exchanged for long-lived ~60 days. Page access tokens effectively permanent only conditionally (die on revocation/password change/app removal). IG-Login tokens: 60-day max, refresh only while valid and ≥24h old; **no refresh-token rotation exists — 60 unrefreshed days = permanent death + re-auth**. (VERIFIED-caveat)

### App review / gates (graded)
- Dev mode: app admins/developers/testers get full publish/read on own assets, no review. (INFERRED, high confidence)
- Production on other businesses' accounts: Advanced Access per permission via App Review (written justification + screencast, multi-week cycles, business verification typical). (INFERRED)
- Access Verification: any business whose app is used by *other* businesses for publish-class permissions must be verified as a **Tech Provider** first. (VERIFIED-caveat)
- No IG publish sandbox: test posts are permanent on a real professional account. (VERIFIED-caveat)

### Quotas / rate limits (graded)
- IG: **100 API-published posts per rolling 24h per account** enforced at `media_publish`; carousel counts as 1; runtime quota readable via `GET /{ig-user-id}/content_publishing_limit` — never hardcode (Meta's own docs conflict: guide says 100, reference says 50). (VERIFIED-caveat)
- Graph API: Platform vs Business Use Case (BUC) rate limits; Page + all IG Graph calls are BUC, surfaced via `X-App-Usage` / `X-Business-Use-Case-Usage` headers; new apps start on a lower development tier. (VERIFIED-caveat)
- FB Page posts: 250/24h cited by one secondary source: UNKNOWN.

### AI-generated-content disclosure (graded)
- IG: native API parameter `is_ai_generated=true` on container creation applies Instagram's "AI info" label (self-disclosure, not enforced). Carousels: set on parent only. (VERIFIED-caveat)
- FB organic posts: no equivalent API parameter found: UNKNOWN. Meta's mandates historically target ads/political content.

### Automation restrictions (graded)
- Meta Platform Policy (inauthentic behavior/spam) applies to automation patterns; specific text not verified: UNKNOWN. Excessive posting triggers spam detection with no documented FB hard cap. (INFERRED)

### Specific claim (d) verdict: **VERIFIED**
"Instagram supports Reels publishing via API for business/creator accounts" — VERIFIED (container `media_type=REELS`, poll to FINISHED, `media_publish`; business/creator only). "Whether scheduling is native or third-party" — VERIFIED as NOT native: no schedule parameter in the container API; native scheduling exists only in-app/Business Suite; via API you self-schedule or use third-party. Facebook Pages are the counter-case with native `scheduled_publish_time`.

### Connector-breakers (Meta)
1. No refresh tokens anywhere; IG-Login tokens die permanently after 60 unrefreshed days. Connector must schedule proactive refresh and own a re-auth flow.
2. Multi-tenant serving needs App Review + Tech Provider verification (weeks). Ship single-tenant first.
3. Quota is runtime-read, never a constant (100 vs 50 doc conflict). Fetch `content_publishing_limit`.
4. Async publish with no idempotency keys; duplicate submission = duplicate post. Connector owns dedup keys; treat EXPIRED/ERROR containers as terminal.
5. IG feed images require publicly hosted media (S3/R2 + URL lifetime management).
6. No native IG scheduling or drafts; scheduler and draft store are connector-owned; IG containers expire 24h.
7. Metric-name churn across versions/login families; pin a Graph API version, validate metric sets, treat `[]` as missing.
8. Deprecations in flight (scope renames, `publish_video` dead, quarterly version sunsets); watch changelogs, capture `fbtrace_id` on failures.
9. No IG publish sandbox — CI needs a dedicated junk account.

### Meta sources
Official (via search-index; direct fetch 403-blocked): developers.facebook.com/docs/instagram-platform/content-publishing, /instagram-api-with-instagram-login/get-started, /documentation/instagram-platform/insights.md, /documentation/video-api/guides/reels-publishing, /docs/graph-api/overview/rate-limiting, /docs/graph-api/reference/page/feed, /docs/graph-api/reference/post, /docs/platforminsights/page, /docs/pages-api/changelog, /documentation/development/release/access-verification. Corroborating: facebookincubator/catalogue-of-api-solutions (organic content creation), 2026 integrator runbooks (social-scheduler, instagram-mcp, meta-oauth skill, cloudless.gr meta-business-suite skill).

---

## 2. YOUTUBE — YouTube Data API v3

Primary sources: developers.google.com/youtube (read directly), support.google.com, youtube.com ToS.

### Capability manifest
- **supports_video**: true — VERIFIED: `videos.insert` uploads to the authorized channel.
- **supports_short_video**: partial — INFERRED: no dedicated Shorts endpoint; a Short is a vertical ≤60s video via `videos.insert`; no API flag forces/checks Shorts status.
- **supports_images**: partial — VERIFIED: `thumbnails.set` for custom thumbnails (channel may need verified phone number); no community-post or general image publishing via API.
- **supports_scheduling**: true — VERIFIED: `status.publishAt` + `privacyStatus=private` = native scheduled publish. Constraints: only settable while private, and only if never published.
- **supports_drafts**: partial — VERIFIED: no draft resource; upload as `private` is the draft equivalent.
- **supports_metrics**: true — VERIFIED: YouTube Analytics API v2 (`reports.query`) + Reporting API v1 (bulk CSV), separate scopes (`yt-analytics.readonly`, `yt-analytics-monetary.readonly`). Data latency 48-72h; use Data API `statistics` for near-real-time.
- **supports_comments**: true — VERIFIED: `commentThreads` (list/insert/update) + `comments` (list/insert replies/update/delete/setModerationStatus); moderation needs owner authorization.

### Publishing specifics (graded)
- Resumable upload protocol: VERIFIED (init → session URI → chunked PUT, 256KB multiples, 308 resume).
- Max 256 GB; MIME `video/*`, `application/octet-stream`. (VERIFIED)
- Processing states: VERIFIED — `status.uploadStatus` {deleted, failed, processed, rejected, uploaded}; `failureReason`; `rejectionReason` includes **duplicate**; `processingDetails.processingStatus` {failed, processing, succeeded, terminated}. Poll `videos.list(part=status,processingDetails)`.
- Captions: `captions.insert` exists (VERIFIED); playlists resources exist (VERIFIED).
- Community posts: NOT in the public API (INFERRED, negative, corroborated). No DM surface. (INFERRED)

### OAuth, scopes, tokens (graded)
- Scopes: `youtube.upload` (narrowest), `youtube`, `youtubepartner`, `youtube.force-ssl`. (VERIFIED)
- **Service accounts do NOT work for channel access**; user OAuth with offline refresh tokens required. (INFERRED, multi-source)
- Testing-mode consent: refresh tokens expire in 7 days; unverified production apps show warning + 100-grant cap. (INFERRED, quoting official OAuth docs secondhand)

### App review / audit (graded)
- YouTube API Compliance Audit process; quota extensions via audit form; failing can cap or revoke access. (VERIFIED)
- **Private-only restriction: VERIFIED** — "All videos uploaded via the `videos.insert` endpoint from unverified API projects created after 28 July 2020 will be restricted to private viewing mode. To lift this restriction, each API project must undergo an audit." Pre-2020-07-28 projects exempt. Field reports suggest enforcement targets third-party uploads, but the safe connector assumption is: public/unlisted/scheduled uploads from a new unverified project come back `private` until audit passes.

### Quotas / rate limits (graded)
- Default: **100 `videos.insert`/day (own bucket), 100 `search.list`/day, 10,000 units/day for all other endpoints.** Reads ~1 unit, writes ~50 units (official tables for insert/search; per-op write costs from third-party). (VERIFIED for the bucket structure; old "1,600 units per upload" model is obsolete.)
- Quota increase via request form after (typically) passing audit; weeks-to-months; no money changes hands. (VERIFIED)
- Exhaustion: HTTP 403 `quotaExceeded`. (INFERRED)

### AI-generated-content disclosure (graded)
- Policy VERIFIED (YouTube Help): creators must disclose meaningfully altered/generated photorealistic content; enforcement up to Partner Program suspension.
- API exposure VERIFIED: `videos.insert` accepts **`status.containsSyntheticMedia`** as a settable property. Exact label behavior: UNKNOWN.

### Automation restrictions (graded)
- Developer Policies VERIFIED: no automating views/uploads/comments/likes "without the user's prior specific and express consent"; upload-enabling services must have users certify Community Guidelines compliance.
- Data handling VERIFIED: delete/refresh stored YouTube metadata after 30 days; user-requested deletion within 7 days.
- ToS: no unsolicited promotional content, no engagement-measurement manipulation. (VERIFIED)

### Specific claim (a) verdict: **VERIFIED**
"YouTube Data API supports authenticated video uploads, but new/unverified API projects face private-only restrictions until audit requirements are satisfied." VERIFIED verbatim from the official `videos.insert` reference. Caveats: pre-2020-07-28 projects exempt; enforcement appears aimed at third-party uploads but the documented behavior is the lock.

### Connector-breakers (YouTube)
1. Audit gate: new projects get `privacyStatus: "private"` regardless of request. Connector must read back actual privacy and treat requested≠actual as a hard gate state, not a retry.
2. Separate quota buckets; 100 uploads/day cap hits upload-heavy connectors first.
3. No service accounts; testing-mode refresh tokens die in 7 days (`invalid_grant`); unattended pipelines need "In production" status.
4. Upload ≠ processed ≠ published: three distinct states; poll `processingDetails`; a passed `publishAt` does not prove publication.
5. No idempotency key on `videos.insert`; unknown-outcome retries risk duplicates (`rejectionReason: "duplicate"`). Reconcile via list + fingerprint, never blind-retry.
6. Analytics 48-72h lag; Data API `statistics` for near-real-time.
7. 30-day metadata delete/refresh rule — no indefinite caching.
8. Thumbnails/captions are separate calls with own quota costs; thumbnails need verified phone on channel.
9. Consent certification required for upload-enabling services.

### YouTube sources
Official: developers.google.com/youtube/v3/docs/videos/insert, /docs/videos, /getting-started, /guides/quota_and_compliance_audits, /guides/using_resumable_upload_protocol, /guides/implementation/videos, /v3/docs/comments, /v3/docs/captions/insert, /v3/docs/thumbnails/set, /youtube/analytics, /youtube/analytics/reference, /youtube/analytics/data_model, /youtube/analytics/channel_reports, /youtube/reporting/v1/reports, /youtube/terms/developer-policies, /youtube/terms/developer-policies-guide, support.google.com/youtube/answer/14328491, youtube.com ToS. Corroborating (INFERRED-grade): veed.io Shorts guide, axiomworks-youtube-mcp API_GAPS, 2026 audit-experience and uploader-design docs on GitHub.

---

## 3. TIKTOK — TikTok for Developers

Primary sources: developers.tiktok.com (read directly). Business-API comment claims corroborated via TikTok's official business SDK docs on GitHub.

### Capability manifest
- **supports_video**: true — VERIFIED: Content Posting API Direct Post (`/v2/post/publish/video/init/`, scope `video.publish`).
- **supports_short_video**: true — VERIFIED: same API; up to 10 min / 4 GB (MP4/WebM/MOV); per-account max duration from `creator_info/query` (`max_video_post_duration_sec`). API ceiling (10 min) is below native app ceiling (60 min).
- **supports_images**: true — VERIFIED: photo posts via `/v2/post/publish/content/init/` (`media_type: PHOTO`, WebP/JPEG, 1080p max, 20 MB/image), `PULL_FROM_URL` only; photo mode must be enabled on the app.
- **supports_scheduling**: false — INFERRED: no schedule parameter in the official Direct Post request-body schema. Client-side timer only.
- **supports_drafts**: partial — VERIFIED with semantic caveat: Upload mode (`/v2/post/publish/inbox/video/init/`, scope `video.upload`, `post_mode: MEDIA_UPLOAD`) sends content to the user's inbox/drafts, but **the user must click the inbox notification in the TikTok app and manually complete the post** — the API cannot finalize or publish it. Drafts accept no caption/metadata via API. This is handoff, not staged publish.
- **supports_metrics**: partial — INFERRED: Display API (`POST /v2/video/query/`, scope `video.list`) returns own videos' like/comment/share/view counts (up to 20 IDs/request). Deeper insights live in the separate TikTok API for Business / Research API (separate onboarding).
- **supports_comments**: partial — INFERRED: consumer developer APIs expose NO comment read/reply; comment list/reply exist only in TikTok API for Business (`/business/comment/list`, `/business/comment/reply/create`), requiring separate business-account approval. Region restrictions may apply (e.g., EEA/CH/UK).

### Publishing specifics (graded)
- Two transfer modes: VERIFIED — `FILE_UPLOAD` (init returns `upload_url` on `open-upload.tiktokapis.com`; chunked PUT with Content-Range, URL valid 1 hour) and `PULL_FROM_URL` (requires **verified domain/URL-prefix ownership** in the portal; unverified → 403 `url_ownership_unverified`).
- Video constraints: VERIFIED — MP4 (recommended)/WebM/MOV; H.264 (recommended)/H.265/VP8/VP9; 23-60 FPS; 360px-4096px; max 10 min; max 4 GB. Caption max 2200 UTF-16 runes (INFERRED).
- Async contract: VERIFIED — init returns `publish_id`; poll `POST /v2/post/publish/status/fetch/` (PROCESSING_UPLOAD, PROCESSING_DOWNLOAD, SEND_TO_USER_INBOX, PUBLISH_COMPLETE, FAILED) or webhooks. Posting is never synchronous.
- `post_info` fields: VERIFIED — `privacy_level`, `title`, `disable_duet/stitch/comment`, `video_cover_timestamp_ms`, **`brand_content_toggle` (REQUIRED, paid partnership)**, `brand_organic_toggle`, **`is_aigc`** (true → "Creator labeled as AI-generated" tag in description), `source_info`.

### OAuth, scopes, tokens (graded)
- OAuth 2.0 authorization-code + PKCE; code exchange, refresh (`grant_type=refresh_token`), revoke. (VERIFIED)
- Scopes: `user.info.basic` (min; returns app-scoped `open_id`), `user.info.profile`, `user.info.stats`, `video.list`, `video.upload` (inbox), `video.publish` (Direct Post; requires enabling the Direct Post toggle in the portal). (VERIFIED)
- **Token lifecycle: VERIFIED — access_token 24 hours (`expires_in: 86400`); refresh_token 365 days (`refresh_expires_in: 31536000`).** Connector must refresh per run and persist the rotating refresh token.

### App review / audit (graded)
- Two gates, VERIFIED: (a) app review of requested scopes/products (justified use case, working product, privacy policy); (b) Direct Post **audit** with screen recordings of the full flow, graded against Content Sharing Guidelines UX rules (privacy dropdown from `creator_info`, unchecked-by-default toggles, commercial-disclosure toggles, content preview, Music Usage Confirmation).
- **Until audited: content restricted to private viewing, max 5 users posting per 24h, posting accounts must be private at posting time, `SELF_ONLY` only** (error `unaudited_client_can_only_post_to_private_accounts` blocks public posting). (VERIFIED)
- Intended-use policy: VERIFIED — audit rejects internal/private-only tools and arbitrary cross-platform reposting; single-operator internal schedulers are policy-risky.

### Quotas / rate limits (graded)
- VERIFIED (official): 6 requests/minute per user access token on publish endpoints; **~15 posts/day per creator via Direct Post, shared across ALL API clients**; per-client 24h active-creator cap from audit estimates. Exceeded → 403 `spam_risk_too_many_posts`; banned users → `spam_risk_user_banned_from_posting`. Status fetch 30 req/min per user (INFERRED).

### AI-generated-content disclosure (graded)
- `post_info.is_aigc` (bool): VERIFIED — "Set to true if the video is AI generated content," label applied in description. Broader product policy requires accurate AI labels on synthetic media. `brand_content_toggle` required for paid partnerships.

### Automation restrictions (graded)
- Content Sharing Guidelines VERIFIED: clients must facilitate authentic creators posting original content; no third-party watermarks/logos/promo branding baked in; pre-post UX must show creator nickname, preview, editable caption/hashtags, processing notice; must query `creator_info` before each post and honor `privacy_level_options` / `max_video_post_duration_sec`.
- **Explicit per-post consent is a product requirement, not just OAuth**: VERIFIED — "API Clients must only start sending content materials to TikTok after the user has expressly consent to the upload." Consent to scope ≠ consent to post; the audit scores recordings of this flow. Fully headless unattended Direct Posting conflicts with the letter of the guidelines (post-audit tools do it, at policy risk).

### Specific claim (b) verdict: **VERIFIED**
"TikTok Content Posting API supports both direct video posting and upload-to-draft, with approval/audit and explicit-consent requirements." VERIFIED on all four limbs from official docs, with one semantic correction: TikTok's "draft" is inbox-handoff (user completes in-app), not a staged draft the connector can publish later.

### Connector-breakers (TikTok)
1. Audit gate before any public effect: pre-audit = forced private, private accounts, 5 users/24h. Connector fails closed in pre-audit.
2. Explicit per-post consent is scored at audit; headless posting is policy-risky.
3. Draft ≠ staged publish: inbox upload ends the API's job; no API call moves a draft to published. Model as "handed off to user."
4. 24h access / 365d refresh tokens; rotation must persist server-side.
5. No native scheduling; connector owns fire-time.
6. Async publish via `publish_id` polling or webhooks; never synchronous.
7. No comments on consumer APIs (Business API only, separate onboarding).
8. Metrics are own-content-only basic counters; deeper = Business/Research API.
9. `PULL_FROM_URL` needs verified domain ownership.
10. `brand_content_toggle` required; `is_aigc` must be true for AI-generated content.
11. Daily caps shared across clients (~15/day/creator, 6 req/min/user).

### TikTok sources
Official: developers.tiktok.com/docs/en/content-posting-api-get-started, /doc/content-posting-api-get-started-upload-content, /docs/en/content-posting-api-reference-direct-post, /doc/content-sharing-guidelines, /docs/en/content-posting-api-media-transfer-guide, /docs/fr-CA/display-api-get-started, /docs/zh-Hans/minis-oauth. Corroborating: tiktok/tiktok-business-api-sdk (CommentsApi), commentdesk TikTok spec, 2026 integrator audit runbooks and capability matrices on GitHub.

---

## 4. LINKEDIN — LinkedIn Developer Platform

Primary sources: learn.microsoft.com/linkedin (read directly at versions li-lms-2026-07 / 2025-04 / 2024-04). One page (Share on LinkedIn self-serve) 403-blocked; claims resting on it are INFERRED.

### Capability manifest
- **supports_video**: true — VERIFIED: Posts API content table lists Videos = Yes (organic) and Yes (sponsored); full Videos API upload flow documented; sample video post in official docs.
- **supports_short_video**: partial — VERIFIED: 3s minimum length, but no dedicated short-video surface; short durations ride the standard video post path.
- **supports_images**: true — VERIFIED: single image + MultiImage (organic) via Posts API; Images API `initializeUpload` flow.
- **supports_scheduling**: false — VERIFIED (absence): full-page search for "schedul" on the official Posts API page returned zero hits; `lifecycleState: PUBLISHED` is the only creation-time value. Native scheduler exists in app/web UI only.
- **supports_drafts**: false — VERIFIED: DRAFT/PUBLISH_REQUESTED are response-only states; "PUBLISHED is the only accepted field during creation." Media can be uploaded without posting; a post cannot be assembled without publishing.
- **supports_metrics**: partial — VERIFIED: org-level analytics exist (Follower, Page, Share Statistics; Social Metadata; Video Analytics; newer Member Analytics) but require the approval-gated Community Management API; member-post detailed reads sit behind restricted scopes.
- **supports_comments**: partial — VERIFIED: Comments API documented (GET/CREATE/DELETE on `/rest/socialActions/{urn}/comments`, nested replies, reactions CREATE/DELETE). INFERRED caveat: live 2026 reports of member comment/post reads returning HTTP 403 `partnerApi*` on standard self-serve tokens — tighter gating than docs imply.

### Publishing specifics (graded)
- Organic content types VERIFIED: Text, Images, Videos, Documents, Article, MultiImage (organic only), Poll (organic only), Celebration (organic only); Carousels sponsored-only. Author = member or organization URN; org authorship needs a company page role. `POST /rest/posts` returns 201 with post URN in `x-restli-id` header.
- Article posts: API does NOT scrape URLs; `article.source`/`title`/`description`/`thumbnail` must be stated explicitly. (VERIFIED)
- Versioned APIs: VERIFIED — every request must carry `Linkedin-Version: YYYYMM` + `X-Restli-Protocol-Version: 2.0.0`; ~12-month sunset windows; **version 202510 sunsets 2026-10-15** — pinning is an operational break risk.
- Video upload flow VERIFIED: `POST /rest/videos?action=initializeUpload` (owner + fileSizeBytes) → per-part `uploadInstructions` (~4MB parts, byte ranges) → PUT parts collecting ETags → `finalizeUpload` (ordered part IDs) → poll asset to `AVAILABLE` → `POST /rest/posts` with `content.media.id`. Referencing a non-AVAILABLE asset = post goes out without media (documented failure mode).
- Video constraints VERIFIED: 3s-30min, 75KB-500MB, MP4; captions optional, English-only, one file; thumbnails optional.
- Upload URLs expire (typically 30 days); asset lifecycle `WAITING_UPLOAD` → `PROCESSING` → `AVAILABLE` / `PROCESSING_FAILED`. (VERIFIED)
- v202602+ attribution fields (`templateName`, `linkbackContext`) let LinkedIn display third-party-tool attribution — relevant to content-OS provenance display. (VERIFIED)

### OAuth, scopes, tokens (graded)
- 3-legged OAuth 2.0 authorization code; 30-minute code lifespan. (VERIFIED)
- Products: "Sign In with LinkedIn using OpenID Connect" (`openid`, `profile`, `email`, self-serve instant) + "Share on LinkedIn" (`w_member_social`, self-serve instant) for member posting; Community Management API (`r/w_organization_social`, `rw_organization_admin`) is vetted/approval-gated. (VERIFIED)
- Scopes: `w_member_social` (post/comment/like as member); `r_member_social` (**restricted, approved users only**); `w_organization_social`; `r_organization_social`. (VERIFIED)
- **Token lifecycle: VERIFIED — access tokens 60 days (`expires_in: 5184000`); programmatic refresh tokens 365 days fixed window, refreshing does NOT extend it.** The refresh doc explicitly scopes to approved Marketing Developer Platform partners; whether self-serve apps get refresh tokens is UNCONFIRMED — secondary sources claim self-serve must re-run browser OAuth ~every 60 days. Connector should budget an interactive re-auth cycle.
- Access tiers VERIFIED (official Increasing Access page): Development = 500 calls/app/24h, 100/member/24h, no BATCH_GET, no webhooks; Standard = full but requires application (form + screencast + test credentials, LinkedIn discretionary). Standard-tier upgrade required within 12 months or access removed.

### App review / gates (graded)
- New apps verified against an associated company Page. (VERIFIED)
- Community Management API: approval-gated vetted product, Development on application; LinkedIn selects partners at its discretion. (VERIFIED)
- Member-only posting via Share on LinkedIn + OpenID: self-serve (INFERRED, multi-source corroboration).
- Review turnaround: UNKNOWN (not published).

### Quotas / rate limits (graded)
- Official Development-tier: 500 app / 100 member calls per 24h. (VERIFIED)
- 429s with `Retry-After`; app Usage & Limits in portal. (VERIFIED)
- Self-serve 150 requests/member/day, 100k/app/day: widely cited, could not load the source page (403): INFERRED, planning figures only.

### AI-generated-content disclosure (graded)
- INFERRED: no AI-disclosure field in Posts/Videos API schemas (documented-schema absence + third-party consensus). LinkedIn labels AI media at ingest via embedded C2PA Content Credentials ("Content Credentials" badge); no text-post labeling, no API toggle.

### Automation restrictions (graded)
- INFERRED (via OpenTermsArchive mirror of Developer Terms, not read on an official page): "Use the Content or the APIs to automate posting on the LinkedIn Services" listed under restricted uses — automation is legitimate only through the approved products. User Agreement §8.2 prohibits bots/scrapers outside the APIs (secondary legal analyses). Re-verify against live Developer Terms before building.

### Specific claim (c) verdict: **VERIFIED**
"LinkedIn Posts API supports organic video posts." VERIFIED — official Posts API table (Videos: Yes organic), sample video post request body, and the full Videos API upload pipeline.

### Connector-breakers (LinkedIn)
1. Org posting, comment moderation at scale, and meaningful analytics need the approval-gated Community Management API (screencast, discretionary, 12-month production deadline). Self-serve covers member posting + identity only.
2. Mandatory `Linkedin-Version` pinning with ~12-month sunsets (202510 dies 2026-10-15); a pinned version silently becomes an outage.
3. 60-day tokens; 365-day non-renewing refresh documented only for MDP partners; self-serve refresh unconfirmed — budget interactive re-auth.
4. Development tier: 500 app / 100 member calls per day, no BATCH_GET, no webhooks (no push for comments/reactions).
5. 4-step stateful video upload pipeline with expiring URLs and per-step failure semantics; never reference non-AVAILABLE assets.
6. No drafts/scheduling server-side; connector owns timers; secondary reports of `CONTENT_DUPLICATE` rejection on identical reposts.
7. `r_member_social` restricted — publish-then-verify loops are degraded for member posts.
8. Terms risk: Developer Terms (mirrored) restrict API-driven automated posting to approved products.

### LinkedIn sources
Official: learn.microsoft.com — Posts API (li-lms-2026-07), Videos API (li-lms-2025-04), Social Metadata API, Comments API (li-lms-2024-04), Community Management overview (li-lms-2026-07), migration guide, increasing-access (li-lms-2026-09), integrations recent-changes, programmatic-refresh-tokens, error-handling. Corroborating (INFERRED-grade): 2026 LinkedIn API tutorials, publishing-kit skill, toolsconnector live-gating notes, OpenTermsArchive Developer Terms mirror, C2PA labeling analyses.

---

## 5. X — X API v2

Primary sources: official-docs GitHub mirror (xdevplatform/docs) and official policy text mirrored there — docs.x.com / developer.x.com were policy-blocked for direct fetch, so "VERIFIED" = corroborated by the mirror or official policy text, one hop from canonical. 2026 third-party integration references for pricing.

### Capability manifest
- **supports_video**: true — VERIFIED (mirror): chunked v2 media upload (INIT→APPEND→FINALIZE→STATUS), ≤512 MB, ≤140s (`tweet_video`); longer via `amplify_video` with Premium/ads allowlisting.
- **supports_short_video**: true — VERIFIED: short clips ≤140s are the standard path.
- **supports_images**: true — VERIFIED: up to 4 images per post (JPG/PNG/WEBP ≤5MB; GIF ≤15MB); 4 images OR 1 video OR 1 GIF per post, never mixed.
- **supports_scheduling**: false — INFERRED: no native organic scheduling API (Ads API has `scheduled_tweets` for promoted creatives only). Third-party tools hold schedules server-side.
- **supports_drafts**: false — VERIFIED (exhaustive index check in source: "draft" appears only on Articles pages across 382 v2 reference pages): no draft state for regular posts; only Articles drafts (`POST /2/articles/draft` → publish, Premium author required) and Ads API `draft_tweets` (promoted-only).
- **supports_metrics**: partial — VERIFIED (mirror): `public_metrics` broadly readable; `organic_metrics`/`non_public_metrics` only with user-context auth of the authoring account; promoted metrics via Ads API only.
- **supports_comments**: true — VERIFIED (mirror): replies via `reply.in_reply_to_tweet_id`; retrieval via `conversation_id:` search, mentions timeline, quote_tweets endpoint.

### Publishing specifics (graded)
- `POST /2/tweets` body VERIFIED (mirror): `text`, `reply.in_reply_to_tweet_id`, `quote_tweet_id`, `media.media_ids[]`, `poll` (2-4 options, 5-10080 min), `reply_settings` (following/mentionedUsers/subscribers/verified), `paid_partnership`, **`made_with_ai`** (bool, opt-in), `for_super_followers_only`, `community_id`, `geo.place_id`. Poll/media/quote mutually exclusive. Returns 201 with `data.id`. App-only bearer is rejected for writes (403 `unsupported-authentication`); needs OAuth 2.0 user context or OAuth 1.0a.
- Threads: no thread endpoint — N sequential POSTs chained by `reply.in_reply_to_tweet_id`; N posts = N billable calls, no atomicity. (VERIFIED)
- 280 chars non-Premium; up to 25,000 with X Premium on the authoring account (not the API tier). (INFERRED)
- Media upload VERIFIED (mirror + live reports): `https://api.x.com/2/media/upload`; one-shot JSON for images; chunked initialize→append→finalize→STATUS poll for video/GIF/large; OAuth 2.0 `media.write` scope or OAuth 1.0a. Legacy v1.1 upload endpoint retired for self-serve 2025-06-09 (INFERRED). One source: `media_id` expires after ~24h (INFERRED) — upload and post in the same job.

### OAuth, scopes, tokens (graded)
- OAuth 2.0 Authorization Code + PKCE recommended (`x.com/i/oauth2/authorize` → `api.x.com/2/oauth2/token`). Scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access` (needed for refresh token), `media.write`. (VERIFIED)
- **Access tokens expire in 2 hours** (`expires_in: 7200`); **refresh tokens ~6 months, rotating/single-use** — every refresh invalidates the old one; persist the new pair atomically before use; concurrent refreshes race and strand accounts. (VERIFIED)
- OAuth 1.0a still supported with long-lived tokens until revoked; remains the classic media-upload signer. (VERIFIED)

### App review / gates (graded)
- Standard posting: self-serve, no human review (create project/app, buy credits, enable OAuth 2.0). (INFERRED)
- Ads API (draft_tweets, scheduled_tweets, promoted metrics): approved access application, ~3 business days, plus ads account. (VERIFIED via Ads docs references)

### Quotas / rate limits (graded)
- **Pricing (Feb 2026 change) INFERRED from multiple 2026 sources citing the official pricing page: pay-per-use is the only option for new developers; Free/Basic/Pro closed to new signups (grandfathered only). ~$0.015/post, $0.200/post containing a URL** (13x link asymmetry); reads ~$0.005/resource (~$0.001 owned data); same resource re-requested within a UTC day charged once — cache aggressively. One-time $10 voucher reported for ex-Free users (single source).
- Legacy tiers (grandfathered): Free ~500 posts/month writes; Basic ($200/mo) ~50k/mo; Pro ($5k/mo) ~300k/mo. (INFERRED)
- Rate limits VERIFIED (mirror): `POST /2/tweets` 100/15min per user, 10,000/24h per app; one-shot media upload 500/24h per user, 50k/24h per app; chunked init 1,875/24h per user, 180k/24h per app.

### AI-generated-content disclosure (graded)
- `made_with_ai` boolean VERIFIED (mirror): opt-in flag labeling AI-generated **media** (not AI-written text); `paid_partnership` for branded content. Both opt-in, not mandatory gates.
- Platform policy VERIFIED (2026 reporting): Synthetic and Manipulated Media policy is a harm test, not a general label mandate; since Mar 2026, unlabeled AI-generated armed-conflict videos draw 90-day Creator Revenue Sharing suspension. INFERRED: EU AI Act Art. 50 deployer duties (effective Aug 2026) apply independently — connector should set `made_with_ai=true` for synthetic media by policy.

### Automation restrictions (graded)
- Developer policy VERIFIED (mirrored official text): no spam/platform manipulation; write-action services must follow X Automation Rules — explicit consent before automated replies/DMs, honor opt-outs, no bulk/aggressive/spammy actions, no identical/substantially similar content across accounts, bot accounts must self-identify (e.g., bio).
- **Duplicate rejection: VERIFIED — HTTP 403, error 187 ("Status is a duplicate")** on text matching recent posts. Cosmetic mutation to bypass = policy risk.
- Up to 10 accounts per person permitted, non-duplicative purposes only; duplicative cross-account posting prohibited. (VERIFIED)
- Account lock/suspension fails posting: connector must health-check account standing. (INFERRED)

### Assigned claim verdict: **REFUTED**
"X's Free tier includes write access sufficient for a small operation's routine posting" — REFUTED for current onboarding. As of Feb 2026 there is no free tier for new developers; write access requires prepaid credits. (Legacy Free did allow ~500 posts/month, which would have sufficed — unavailable to new connectors.)

### Connector-breakers (X)
1. Write is metered, never free: every post and read burns credits; connector needs a budget/spend guard (one tool ships a $1.00/day default cap posture); exhaustion is 402/429, not success.
2. URL price asymmetry: $0.200 vs $0.015 — link-bearing posts cost 13x; budget link attachment deliberately.
3. 2h access tokens + single-use rotating refresh (~6mo): single-flight refresh wrapper with atomic persist-before-use; lost rotation strands the account until human re-auth.
4. `media_id` TTL ~24h: upload and post in the same job.
5. No native drafts/scheduling: first-class connector-owned objects; threads non-atomic (stop-on-partial-failure policy needed); poll/media/quote mutually exclusive.
6. Duplicate rejection (403/187): dedupe per account before calling; never bypass cosmetically.
7. App-only bearer cannot write — typed auth routing per endpoint.
8. Metrics tiered: organic/non-public need author user-context; promoted needs approved Ads API.
9. Automation-policy gates: self-identified bots, consent for automated replies/DMs, no identical cross-account content, account-standing health checks.
10. Hard server-side media constraints (5MB images / 15MB GIF / 512MB-140s video); exceedances fail the upload pipeline, not the post call.

### X sources
Official-docs mirror: github.com/xdevplatform/docs (write endpoints, read endpoints, auth, rate limits, developer-terms policy.mdx). Corroborating 2026: jam-skills x-api/x-post, ai-hawk X posting doc, porcupineai X research, opencompany x-drafts-api-research, remix-studio integration plans, x-api-cli docs, postiz-docs providers/x.mdx, umwelten OAuth refresh report, twitterdev refresh-token tutorial, dev.to xdevs metrics guide.

---

## Cross-cutting connector-contract implications

### Scheduling correction (confirms GROWTH-OS plan revision)
Native scheduled publish exists only on **Facebook Pages** (`scheduled_publish_time`, 10min-75d) and **YouTube** (`publishAt`, private-only, never-published). Instagram, TikTok, LinkedIn, and X have NO native scheduling API. The connector contract must therefore separate **orchestration state** (PING-owned: artifact, approved version, target platform, desired window, execution ID, status, published URL/ID, failure/retry state) from **execution** (platform-native where available). "PING does not build a scheduler" is too broad; "PING does not rebuild each platform's scheduler" is correct.

### Draft semantics differ per platform (do not unify naively)
- Facebook: unpublished posts flippable to published (closest to true drafts).
- Instagram: no drafts; containers expire in 24h.
- YouTube: `private` upload = draft equivalent; `unlisted` = soft publish.
- TikTok: inbox handoff = "handed to user," not a queued state the API can finalize.
- LinkedIn: no drafts; DRAFT is read-back-only.
- X: no drafts for regular posts (Articles only).
Contract implication: `supports_drafts` must be a capability with platform-specific semantics, and the orchestration layer must own the canonical draft/schedule store.

### Token lifecycle table (connector must implement per-platform refresh)
| Platform | Access token | Refresh | Notes |
|---|---|---|---|
| Meta (IG Login) | 60 days | none (re-auth) | refresh only while valid and ≥24h old; 60 unrefreshed days = permanent death |
| Meta (Page token) | effectively permanent (conditional) | n/a | dies on revocation/password change/app removal |
| YouTube | 1h (standard Google) | offline refresh token | no service accounts; testing-mode refresh dies in 7 days |
| TikTok | 24 hours | 365 days, rotating | refresh per run; persist rotation server-side |
| LinkedIn | 60 days | 365 days, non-renewing (MDP partners) | self-serve refresh unconfirmed; budget interactive re-auth |
| X | 2 hours | ~6 months, single-use rotating | atomic persist-before-use; concurrent refresh races strand accounts |

### Review / audit gates before production use
| Platform | Gate |
|---|---|
| Meta | App Review per permission (Advanced Access) + Tech Provider verification for multi-tenant; dev mode covers own assets |
| YouTube | Compliance audit to lift private-lock (post-2020 projects); quota extensions via audit form (weeks-months) |
| TikTok | App review of scopes + Direct Post audit with recorded UX flow; pre-audit = private-only/5 users/24h |
| LinkedIn | Community Management API vetted approval (form + screencast, discretionary, 12-month production deadline); member posting self-serve |
| X | Self-serve (no review) for standard posting; Ads API needs approved application (~3 business days) |

### Quotas that shape throughput design
- IG: 100 API posts/24h/account (runtime-read, docs conflict 100 vs 50).
- YouTube: 100 uploads/day own bucket; 10k units/day general.
- TikTok: ~15 posts/day/creator shared across ALL clients; 6 req/min/user.
- LinkedIn: Development tier 500 app / 100 member calls/day; no batch, no webhooks.
- X: pay-per-use, no free tier; 100 posts/15min per user, 10k/24h per app; $0.015/post, $0.200 with URL.

### Duplicate-publication guards (platform-native, uneven)
- YouTube: `rejectionReason: "duplicate"` (server-side).
- X: HTTP 403 error 187 on duplicate text (server-side).
- LinkedIn: `CONTENT_DUPLICATE` reported (secondary).
- Meta/TikTok: no documented idempotency; connector must own dedup keys. **No platform offers an idempotency key on publish** — the orchestration layer's unknown-outcome reconciliation (publish → read-back → reconcile) is mandatory, not optional.

### AI-generated-content disclosure (platform-native flags, all opt-in)
- TikTok: `is_aigc` → "Creator labeled as AI-generated" tag. (VERIFIED)
- Instagram: `is_ai_generated` → "AI info" label. (VERIFIED-caveat)
- YouTube: `status.containsSyntheticMedia` settable on insert. (VERIFIED)
- X: `made_with_ai` → labels AI-generated media. (VERIFIED, mirror)
- LinkedIn: no API field; C2PA Content Credentials read at ingest. (INFERRED)
- None are mandatory API gates; all are self-disclosure. The connector should set them by policy (EU AI Act Art. 50 deployer duties apply independently of platform rules).

### Metrics are not semantically equivalent (normalization warning)
Raw metric definitions differ per platform and even per login family (IG metric-name churn). YouTube Analytics lags 48-72h (use Data API `statistics` for near-real-time); TikTok consumer metrics are own-content basic counters; LinkedIn member-post detailed reads are restricted; X non-public metrics need author user-context. The GROWTH-OS model stands: keep `RAW_PLATFORM_METRIC` intact and add `NORMALIZED_INTERPRETATION`; never discard the original; never compare raw views across platforms as equivalent.

---

## Unresolved / needs live-doc re-read before freezing a connector contract
- IG Reels API duration limits (sources conflict: 90s vs 3 min). (UNKNOWN/CONFLICTED)
- FB organic AI-disclosure parameter (none found). (UNKNOWN)
- Meta scope-rename deprecation status (`instagram_*` → `instagram_business_*`). (INFERRED)
- IG `content_publishing_limit` 100 vs 50 doc conflict. (VERIFIED-caveat)
- LinkedIn self-serve quota figures (150/member-day, 100k/app-day). (INFERRED)
- LinkedIn self-serve refresh-token availability. (UNKNOWN)
- LinkedIn Developer Terms automated-posting restriction (mirror only; re-verify on official page). (INFERRED)
- X exact pay-per-use dollar figures ($0.015/$0.200). (INFERRED from pricing-page reports)
- X new-developer signup standing/verification gates. (UNKNOWN)
- TikTok Display API field list (indexed official docs, not live-read). (INFERRED)
- YouTube per-operation quota costs outside official tables; 7-day testing-mode expiry (quoted secondhand). (INFERRED)
