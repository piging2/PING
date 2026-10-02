# Video-Generator Integration Survey — 2026-09-30

Context: PING Social / Nolan's team. Audience: SENIOR ENGINEERS watching evidence-heavy technical-marketing content.
NON-NEGOTIABLE: claim control — exact narration + exact on-screen text rendered verbatim, no paraphrase, no invented visuals that sever the claim chain. Every frame carries a provenance footer.

Evidence grades: VENDOR-DESCRIBED (vendor's own docs/pages) | INDEPENDENT (third-party review/profile) | UNVERIFIED (no source found or conflict) | ANALYSIS (our judgment, no external source).

---

## 1. Runway (Gen-4 / Gen-4.5 / API)

### 1. API quality
- Official developer platform at dev.runwayml.com with docs at docs.dev.runwayml.com; REST API + official Python/Node SDKs (VENDOR-DESCRIBED: https://docs.dev.runwayml.com/).
- Endpoints: `POST /v1/text_to_video`, `POST /v1/image_to_video` (+ video-to-video via Aleph, lip-sync, upscale) with params: promptText (max 6000 chars), model, resolution, duration, seed, promptExpansionMode (VENDOR-DESCRIBED: https://docs.dev.runwayml.com/api.md).
- Auth: Bearer token + X-Runway-Version header (INDEPENDENT: api-evangelist/runway profile).
- Async: submit returns task id; poll `GET /v1/tasks/{id}` until SUCCEEDED/FAILED (VENDOR-DESCRIBED; INDEPENDENT: openrouterteam docs note identical submit/poll lifecycle, `estimatedCost.credits` on submit).
- Webhooks: NOT evidenced. Official reference and integrator docs show poll-only; a third-party knowledge doc claimed webhooks but no vendor confirmation found (UNVERIFIED).
- Scene/voice/text control: NONE. It is a prompt-to-video generator only. No narration track, no captions, no text-overlay parameters in the API reference (VENDOR-DESCRIBED by absence of params).
- `promptExpansionMode: disabled` keeps the prompt verbatim, but that governs the text prompt, not any narration or on-screen text (VENDOR-DESCRIBED).

### 2. Aesthetic ceiling (technical content, senior-engineer audience)
- Best-in-class generative quality among the six (Gen-4.5); strong for cinematic B-roll (INDEPENDENT).
- ANALYSIS: every pixel is invented. For evidence-heavy content this is a liability, not an asset: an AI-generated "server room," "architecture diagram," or "code on screen" is an unverified visual claim. Senior engineers spot synthetic B-roll instantly and it reads as decoration covering a thin argument. Credible only as abstract/ambient background; never as illustrative evidence.

### 3. Claim control
- Auto-generated visuals: YES, and unavoidable — the entire output is model-invented from a prompt. This SEVERS the claim chain by default (ANALYSIS, follows from API design).
- Exact narration verbatim: NOT SUPPORTED — no narration/audio input param (VENDOR-DESCRIBED).
- Exact on-screen text verbatim: NOT SUPPORTED — text inside generated video is unreliable AI-rendered glyphs (ANALYSIS; no text-overlay params exist).
- Disable auto B-roll: N/A — there is no B-roll assembly; the whole clip is generated (ANALYSIS).

### 4. Cost model (per minute of output) + rate limits
- $0.01/credit; Gen-4.5 = 12 credits/sec = **$0.12/sec = $7.20/min**; Gen-4 Turbo = 5 credits/sec = **$0.05/sec = $3.00/min** (VENDOR-DESCRIBED via developer portal pricing; corroborated INDEPENDENT: holus knowledge doc, cubric-vision research).
- $10 minimum API credit top-up; API credits separate from app subscriptions, do not expire (INDEPENDENT: cubric-vision).
- Rate limits: self-serve tiers exist; higher usage via exception request on usage page (VENDOR-DESCRIBED). Specific RPM/concurrency numbers: UNVERIFIED.

### 5. Integration effort
- REST + SDKs, API-key auth; straightforward (VENDOR-DESCRIBED).
- Render time: ~3-5 min per 5-10s clip (INDEPENDENT: holus doc). A 60s video = 6+ clips + stitching = ~20-30 min wall clock plus our own assembly (ANALYSIS).
- 10s max per generation (extendable) — long-form narration requires multi-clip assembly we own (VENDOR-DESCRIBED: model docs; INDEPENDENT).

### 6. Provenance
- No native watermark on API outputs per available docs; no footer/text-overlay capability (UNVERIFIED for watermark-free guarantee; VENDOR-DESCRIBED absence of overlay params). Provenance footer must be burned in by us post-render (ANALYSIS).

---

## 2. Pika (2.x / official API at dev.pika.art)

### 1. API quality
- Official first-party API at dev.pika.art (models, pricing, llms.txt) (VENDOR-DESCRIBED). Also exposed via fal.ai (`fal-ai/pika/v2.2/text-to-video`) (INDEPENDENT).
- Text-to-video request schema: prompt (required), seed, negative_prompt, aspect_ratio, resolution (480p/720p/1080p), duration (5 or 10s) (INDEPENDENT: fal.ai API docs mirror).
- Keyframes-to-video endpoint accepts 2-5 keyframe images + per-transition prompts (INDEPENDENT: fal.ai docs) — closest thing to scene control.
- Webhooks: "async queue-based processing with optional webhook callbacks" per third-party profile (INDEPENDENT: api-evangelist/pika); fal.ai platform supports webhookUrl on queue submit (INDEPENDENT). Official dev.pika.art webhook param: UNVERIFIED.
- Rate limit: 20 generations/min, HTTP 429 (INDEPENDENT: api-evangelist/pika).
- Scene/voice/text control: no narration, no captions, no text overlays (prompt-to-video only). Pika API price table lists "Pika Speech" audio TTS at $0.01/min as a separate audio product (VENDOR-DESCRIBED: dev.pika.art pricing page) — but muxing TTS with video is our job; no combined endpoint evidenced.

### 2. Aesthetic ceiling
- Positioned as budget/social-media tier; quality below Runway Gen-4.5 (INDEPENDENT: multiple integrator docs rank it for high-volume social, not premium).
- ANALYSIS: same invented-visual problem as Runway at lower fidelity. For senior engineers, AI B-roll of "a developer at a desk" or "abstract tech" reads as faceless-content filler and actively cheapens an evidence argument. Not credible for technical pieces.

### 3. Claim control
- Auto-generated visuals: YES, unavoidable (ANALYSIS).
- Exact narration verbatim: NOT in the video endpoint; Pika Speech TTS is a separate audio API — verbatim TTS is plausible but untested, and sync/composition is ours (VENDOR-DESCRIBED for TTS existing; UNVERIFIED for verbatim fidelity in our pipeline).
- Exact on-screen text: NOT SUPPORTED (ANALYSIS; no overlay params).
- Disable auto B-roll: N/A — whole clip is generated (ANALYSIS).

### 4. Cost model + rate limits
- Official: Pika 2.5 text-to-video $0.04/sec 720p (**$2.40/min**), $0.09/sec 1080p (**$5.40/min**) (VENDOR-DESCRIBED: dev.pika.art pricing).
- Via fal.ai: $0.20 per 5s 720p, $0.45 per 5s 1080p — identical per-second math (INDEPENDENT).
- Rate limit: 20 generations/min all API users (INDEPENDENT).

### 5. Integration effort
- REST, API key; submit + poll or fal SDK with webhookUrl (VENDOR-DESCRIBED/INDEPENDENT).
- Render time: ~210s per request reported on a third-party host (INDEPENDENT: wavespeed.ai FAQ — host-specific, not Pika-direct).
- 5-10s clips; long-form = our assembly (INDEPENDENT: fal.ai schema).

### 6. Provenance
- No native watermark/branding controls evidenced; footer must be burned in post-render (UNVERIFIED/ANALYSIS).

---

## 3. Luma Dream Machine (Ray series / API)

### 1. API quality
- Official API: base `https://api.lumalabs.ai/dream-machine/v1`, REST, API key from platform.lumalabs.ai; Python/JS/Go SDKs + CLI (VENDOR-DESCRIBED: https://docs.lumalabs.ai/; INDEPENDENT: api-evangelist/luma-ai profile).
- Submit (`POST /v1/generations`) + poll (`GET /v1/generations/{id}`) semantics; video (Ray) + image (Photon) generation, keyframes, extend, modify (VENDOR-DESCRIBED; INDEPENDENT: n8n/Make community usage).
- Webhooks: fal.ai-hosted Luma models support `webhookUrl` (INDEPENDENT). Official Luma callback: an open GitHub issue (lumalabs/lumaai-api #3, since Sep 2024) asks whether any callback_url parameter exists — no vendor-confirmed answer found (UNVERIFIED for first-party).
- Scene/voice/text control: none — prompt-to-video only; no narration, no captions, no text overlays (ANALYSIS; no such params in evidenced schemas).

### 2. Aesthetic ceiling
- Strong photorealism reputation (INDEPENDENT: integrator docs rank it for photorealistic scenes).
- ANALYSIS: same verdict as Runway/Pika — invented pixels. Photorealism makes it *more* dangerous for claim control, not less: a photorealistic-but-fake lab, dashboard, or demo screenshot is a fabricated evidence visual. Senior engineers treat photoreal AI B-roll as a trust negative in technical content.

### 3. Claim control
- Auto-generated visuals: YES, unavoidable (ANALYSIS).
- Exact narration: NOT SUPPORTED (ANALYSIS).
- Exact on-screen text: NOT SUPPORTED (ANALYSIS).
- Disable auto B-roll: N/A (ANALYSIS).

### 4. Cost model + rate limits
- Official API (Ray3.2, SDR): 5s 720p $0.30 (**$3.60/min**); 5s 1080p $1.20 (**$14.40/min**); 10s = $0.90/$3.60 respectively — note: NOT a flat per-second rate, 10s is 3x the 5s price (INDEPENDENT: magichour.ai review quoting Luma's API page, Sept 2026).
- Older Ray 2 API pricing: $0.95/5s 1080p = $11.40/min (INDEPENDENT: eesel.ai).
- Rate limits (Build tier): 10 concurrent generations, 20 create req/min, $5,000/mo default cap before Scale tier (INDEPENDENT: eesel.ai citing Luma).
- API failed generations are refunded; subscription failures are not (INDEPENDENT: eesel.ai) — relevant to cost-per-usable-clip.

### 5. Integration effort
- REST + SDKs, key auth; moderate (VENDOR-DESCRIBED).
- Render time: minutes per 5-10s clip (community reports; exact P50 UNVERIFIED). Long-form = our multi-clip assembly.

### 6. Provenance
- Free-tier exports watermarked (INDEPENDENT: gaga.art); API output watermark status UNVERIFIED. No footer/overlay controls; burn-in is ours (ANALYSIS).

---

## 4. Pictory (script-to-video / API)

### 1. API quality
- Published API with documented endpoints, webhooks, and render destinations (INDEPENDENT: homehustlehub.com comparison, Aug 2026 — author runs it daily via Make.com; Pictory maintains an official Make app with storyboard/transcription/render modules + completion triggers).
- Community MCP server documents API actions: `create_preview` (0 credits, returns scene breakdown + thumbnails + timings), `update_scene` (surgical per-scene clip/text tweak), `render_storyboard` (INDEPENDENT: softreviewed/pictory-coupon-code-mcp repo).
- Auth/plan gating: API Self-Serve plan; API for Enterprises custom (VENDOR-DESCRIBED: https://pictory.ai/pictory-api-pricing-inr).
- Script in → video out: yes — script/article/URL/prompt → storyboard → voiceover + captions + stock visuals → MP4 (VENDOR-DESCRIBED/INDEPENDENT).
- Scene control: per-scene edit/swap via `update_scene` before final render; zero-credit preview loop (INDEPENDENT). Full programmatic scene construction schema: UNVERIFIED (docs not fetched in this pass).

### 2. Aesthetic ceiling
- Stock-footage (Getty/Storyblocks, 18M clips on API tier) + auto captions + TTS = the canonical "faceless YouTube channel" look (INDEPENDENT: multiple reviews; one reviewer's whole channel is Pictory output).
- ANALYSIS, blunt: to senior engineers this aesthetic is the slop signature — generic B-roll of handshakes and servers under robot narration. The "Visuals to Video" path (our own images/screenshots assembled with transitions) is the only variant with any credibility, and even then the caption styling and pacing scream template.

### 3. Claim control — MIXED, best of the script-to-video three
- Auto stock B-roll: DEFAULT behavior — "Pictory's AI pairs [the script] with relevant imagery and videos from its extensive stock library" (INDEPENDENT: vocal.media review; emergingtechdaily). Auto-paired stock visuals are unverified visuals matched by keyword — claim-chain severance risk on every scene (ANALYSIS).
- Mitigations exist: upload own assets, swap any clip per scene, and via API `create_preview` → `update_scene` to pin each scene's visual before render (INDEPENDENT). Whether auto-stock can be disabled at creation (vs. swapped after) is UNVERIFIED.
- Exact narration verbatim: script text is read by TTS/voiceover artists — verbatim reading of provided script is the designed behavior (VENDOR-DESCRIBED: "voiceover artists to read your script"; INDEPENDENT). Paraphrase risk is low for Script-to-Video mode; HIGH for Article-to-Video mode (auto-summary "pretty generic... skipped key points" — INDEPENDENT: techpoint.africa hands-on test). Use Script-to-Video only.
- Exact on-screen text verbatim: text overlays take "your key sentences" (INDEPENDENT); auto captions generated from narration (INDEPENDENT). Verbatim control plausible via scene text editing; exact API-level guarantee UNVERIFIED.

### 4. Cost model + rate limits
- API Self-Serve: **$79/mo billed annually**, 120 video minutes/month, incl. 1,440 ElevenLabs voiceover min/yr (VENDOR-DESCRIBED: pictory.ai API pricing page) → **$0.66/min at full utilization**.
- Consumer plans (for reference): Starter $29/mo, Pro $59/mo, Team $199/mo; minutes counted on export only (INDEPENDENT).
- Rate limits: UNVERIFIED.

### 5. Integration effort
- REST API + webhooks + official Make/Zapier/N8N modules; moderate (INDEPENDENT). Render: "video draft in two to three minutes" for typical lengths (INDEPENDENT: shelbyaideals guide). Zero-credit preview before render reduces wasted spend (INDEPENDENT).

### 6. Provenance
- Brand kits: logo watermark, colors, fonts (VENDOR-DESCRIBED/INDEPENDENT); unlimited brand kits on API tier (VENDOR-DESCRIBED). A persistent provenance *footer strip with text* would need a custom template element — capability UNVERIFIED; logo watermark alone does not carry a claim-chain footer (ANALYSIS).

---

## 5. InVideo (AI / "API")

### 1. API quality
- **No public developer API.** No documentation, no developer signup, no API plan; ToS never mentions one (INDEPENDENT: homehustlehub.com, Aug 2026). Corroborated: "No public changelog, public status page, or developer API could be found... Documentation at help.invideo.io covers basic usage... no developer portal or SDK reference" (INDEPENDENT: metadatamarketer.com intelligence report, Sept 2026). A beta MCP server exists but "connects AI assistants to InVideo... not a route into your own system" (INDEPENDENT).
- VERDICT: fails the "drive the whole render programmatically" requirement outright. Script in → video out exists only in the web app.

### 2. Aesthetic ceiling
- Template-driven marketing videos; photorealism "more limited" than generative rivals; v3.0 integrates Veo 3.1 and Sora 2 as generation models (INDEPENDENT: fahimai.com; metadatamarketer.com).
- ANALYSIS, blunt: stock-assembly + template captions = faceless-slop aesthetic. Senior engineers will read it as content-farm output. No path to credibility without replacing the visuals ourselves, which the product doesn't let us do programmatically.

### 3. Claim control
- Auto stock/B-roll: core mechanism — "automatically selecting stock footage, adding music, and creating scripts" from a prompt (INDEPENDENT: costbench.com). Claim chain severed by design (ANALYSIS).
- Exact narration: script lines editable in UI (INDEPENDENT: picwand.ai); no API to enforce verbatim at scale.
- Exact on-screen text: subtitles adjustable in UI (INDEPENDENT); no programmatic guarantee.
- N/A for API-level disable — no API.

### 4. Cost model + rate limits
- Free: 10 AI videos/week, watermarked 720p. Plus **$28/mo** (50 videos/mo), Max **$50/mo** (200 videos/mo) (INDEPENDENT: costbench.com 2026). Per-video capped, not per-minute. Rough: Plus at ~3 min avg video ≈ $0.19/min — but length caps and per-video metering make this subscription-shaped, not usage-shaped (ANALYSIS).
- Rate limits: N/A (no API).

### 5. Integration effort
- No API → integration effort is "not possible"; only manual web-app or unofficial MCP (INDEPENDENT).

### 6. Provenance
- Paid plans remove watermark; branding/logo options on higher tiers (INDEPENDENT). No API to inject a provenance footer (ANALYSIS).

---

## 6. Fliki (script-to-video / API)

### 1. API quality
- Official API docs at developer.fliki.ai; REST: `POST https://api.fliki.ai/v1/generate/template` with Bearer API key (VENDOR-DESCRIBED).
- Request body: `fileId` (template created in UI), `webhook` (POST callback on completion — VENDOR-DESCRIBED), `scenes` array of `{key, layers: [{key, text}]}` — per-scene, per-layer **exact text** injection (VENDOR-DESCRIBED: https://developer.fliki.ai/docs/api/generate/template).
- Template-based: media, voices, layout are pinned in the UI-built template; API supplies the text content per scene. This is the strongest verbatim-text story of the six (ANALYSIS).
- API access gated behind Premium ($88/mo) or Enterprise — plan-gating reported by two independent reviews (INDEPENDENT: revid.ai comparison; byskh.com review). Exact current gating on Fliki's own pricing page: UNVERIFIED in this pass (not fetched).
- Voice/TTS: 2,000+ voices, 80+ languages; voiceover generated from scene text (INDEPENDENT: revid.ai, fahimai.com).

### 2. Aesthetic ceiling
- Narration-first product: scene editor pairs script with stock or AI media (INDEPENDENT: revid.ai). Output = narrated slideshow/stock assembly with captions.
- ANALYSIS, blunt: same faceless-slop family as Pictory/InVideo to a senior-engineer eye — stock B-roll under TTS. BUT: because media is template-pinned rather than auto-selected per render, we can build a template whose scenes contain ONLY our own screenshots/diagrams/code (no stock at all). That makes Fliki the only one of the six where the default pipeline can be configured to emit zero invented visuals. Credibility then depends on our assets, not the platform.

### 3. Claim control — STRONGEST of the six
- Auto stock B-roll: the product *can* auto-pair stock, but the API flow is template-driven — visuals come from the template we build, and `scenes` only injects text per layer (VENDOR-DESCRIBED). If the template pins our own media per scene, no auto-selection runs at render time (ANALYSIS — inferred from documented request schema; end-to-end behavior UNVERIFIED without a test render).
- Exact narration verbatim: scene `text` → TTS voiceover; verbatim reading is the designed mechanism (VENDOR-DESCRIBED schema + INDEPENDENT product descriptions). Highest confidence of the six.
- Exact on-screen text verbatim: `layers[].text` is literal text content per layer (VENDOR-DESCRIBED). Highest confidence of the six.
- Disable auto B-roll: achievable via template design (own media pinned) — mechanism UNVERIFIED end-to-end, but architecturally supported (ANALYSIS).

### 4. Cost model + rate limits
- Premium: **$88/mo** ($66/mo annual), 600 credits/mo; Standard $28/mo (180 credits); Free watermarked (INDEPENDENT: zebracat.ai, byskh.com, revid.ai — consistent).
- Credit burn (Fliki's own credits docs, via zebracat.ai): voiceover 0.25–2 credits/min by voice tier; export 0.1 credits/min; AI video 0.1–6 credits/sec (INDEPENDENT).
- Derived: a 1-min narrated video (standard voice, no AI video) ≈ 0.35 credits → Premium's 600 credits ≈ **~1,700 min of narrated output ≈ $0.05/min** (ANALYSIS — arithmetic on independent figures; AI-video B-roll would multiply cost 100x+, so keep templates stock/AI-video-free).
- Rate limits: UNVERIFIED.

### 5. Integration effort
- REST + webhook, Bearer auth; low-moderate. Two-step: build template once in UI, then `fileId` + scenes per render (VENDOR-DESCRIBED). Render time per minute: UNVERIFIED (no source found).

### 6. Provenance
- Brand kits in the API: logo watermark, intro/outro clips, brand colors and fonts; pass `brandId` at generate time and "every video that request creates comes out branded" (VENDOR-DESCRIBED: developer.fliki.ai API reference). A text-based provenance footer would be a template layer with fixed text — architecturally supported via layers, UNVERIFIED end-to-end (ANALYSIS).

---

## Cross-platform verdict (for the claim-control requirement)

| Platform | Programmatic render | Verbatim narration | Verbatim on-screen text | Can eliminate invented visuals | $/min output (approx) |
|---|---|---|---|---|---|
| Runway Gen-4.5 | Yes (poll) | No | No | No (all pixels invented) | $7.20 |
| Pika 2.5 | Yes (poll/webhook via fal) | Partial (separate TTS API) | No | No | $2.40–$5.40 |
| Luma Ray3.2 | Yes (poll; webhook unverified 1P) | No | No | No | $3.60–$14.40 |
| Pictory | Yes (API + webhooks) | Yes (script→TTS) | Likely (scene text) | Mitigable (preview→swap per scene) | $0.66 |
| InVideo | **No API** | UI only | UI only | No | sub-only |
| Fliki | Yes (template + webhook) | Yes (scene text→TTS) | Yes (layer text) | Yes (template-pinned media) | ~$0.05 |

Bottom line for PING: the generative trio (Runway/Pika/Luma) are categorically wrong for claim-controlled technical content — they cannot take narration or exact text, and every frame is an invented visual. InVideo is disqualified (no API). Of the script-to-video three, **Fliki's template API is the best structural fit** (verbatim text layers + webhook + brand kits + pinned media, cheapest per minute), with **Pictory as backup** (real API + webhooks + zero-credit preview loop, but stock-first workflow needs per-scene policing). Both still need a human/template gate to guarantee zero invented visuals, and the provenance footer must be verified frame-accurate before it counts as a claim chain.
