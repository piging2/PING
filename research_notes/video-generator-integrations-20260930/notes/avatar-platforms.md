# Avatar-Led Video Platform Survey
Research date: 2026-09-30
Purpose: survey 8 avatar/talking-head video platforms for PING Social's technical-marketing pipeline aimed at SENIOR ENGINEERS.
Grading lens (non-negotiable): claim control (exact narration and exact on-screen text rendered verbatim; no paraphrase; no invented visuals) plus a provenance footer on every frame.
Evidence grades: [VENDOR-DESCRIBED] = vendor's own docs/marketing; [INDEPENDENT] = third-party reviews, hands-on tests, skill docs citing official docs; [UNVERIFIED] = could not confirm, do not rely.

## Global findings (apply to all platforms)

1. Narration verbatim: every platform's script-in API speaks the submitted script verbatim. No platform's base API paraphrases the script. The paraphrase risk lives in opt-in "AI agent / prompt-to-video / script assistant" modes (HeyGen Video Agent, Synthesia AI Video Assistant, Colossyan AI script assistant, Elai AI Storyboard, Tavus conversational personas). For claim control, use script-in endpoints only and never the agentic modes. [INDEPENDENT across multiple sources]
2. No invented visuals IF you supply the visuals: script-to-video with a fixed template/avatar/background is deterministic. Invented-visual risk appears only in auto-generated B-roll/stock-visual features and prompt-to-video modes. Lock the template in the API call. [INDEPENDENT]
3. Provenance footer on every frame: NO platform natively offers a persistent every-frame footer bar. Closest native hooks: Tavus `watermark_image_url` (image overlay) [INDEPENDENT]; HeyGen/Synthesia/Colossyan/Elai brand kits (logo + colors + fonts) [VENDOR-DESCRIBED/INDEPENDENT]. A true per-frame provenance footer will need Tavus watermark overlay with a footer-strip image, or ffmpeg burn-in post-processing (the standard approach: render video, then overlay a lower-third bar before publishing). Plan on owning this step, not on any platform providing it.
4. Caption styling is limited via API everywhere it exists (HeyGen, Synthesia). Exact-verbatim captions require either the platform's captioned variant or a post-render caption step (ZapCap/Whisper + ffmpeg). For absolute verbatim guarantee, PING should own the caption layer, not trust the platform's auto-captions.
5. Pronunciation control: HeyGen brand glossary (audio-only respellings; captions keep original spelling) [INDEPENDENT]; Synthesia `<sub alias="spoken">` overrides inside ScriptText [INDEPENDENT]. Both let technical terms be spoken correctly without changing the spelled claim.

---

## 1. HeyGen

Status: active, independent. Avatar V launched 2026.

### (1) API quality / programmatic render control
REST API v3 at `https://api.heygen.com`, `X-Api-Key` auth. `POST /v3/videos` takes `video_inputs` (avatar ID + voice `input_text` + background) [INDEPENDENT]. Webhooks: `video.completed`, `video.failed`, plus `avatar_video.success`/`avatar_video.fail` events; HMAC signed with `Heygen-Signature` header [INDEPENDENT]. Template API with `{{variables}}` for dynamic substitution [INDEPENDENT]. Brand kit endpoint `POST /v3/brand-kits {url}` (import from website URL; colors, fonts, logo placement) [INDEPENDENT]. Brand glossary endpoint for pronunciation overrides [INDEPENDENT]. One third-party finance source called HeyGen's 2026 API "the cleanest" of the field [INDEPENDENT]. API quality: HIGH.

### (2) Aesthetic ceiling for technical content
Avatar V is photorealistic; Avatar IV already handled lip sync and facial expression well [INDEPENDENT]. A 14-day hands-on test of 5 tools found: a 15-second vertical clip from the top three is "indistinguishable from real video to most viewers"; a 5-minute talking head is not, AI tells remain [INDEPENDENT]. HeyGen rated best-in-class realism vs Synthesia (more natural expressions, better lip sync, minimal uncanny valley) [INDEPENDENT]. Digital twin from a 2-minute webcam video; studio avatar from 30+ min recording [INDEPENDENT]. Caution for senior engineers: casual/creator-leaning vibe on stock avatars can read slightly less serious than Synthesia for formal topics [INDEPENDENT]. Best ceiling of the eight for realism, but still visibly AI at long lengths.

### (3) Claim control (verbatim narration/captions)
Script-in speaks verbatim [INDEPENDENT]. Pronunciation: brand glossary terms respell audio only, captions keep original spelling [INDEPENDENT]. RISK: "Video Agent" mode auto-writes the script and builds visuals from a prompt (docs.heygen.com "create-video-with-video-agent") [VENDOR-DESCRIBED]; this is exactly the paraphrase/invented-visual path PING must avoid. Never use it in the pipeline. Captions: HeyGen auto-generates a captioned variant, downloadable via API (`video create` status response carries `caption_url`; also `GET /v1/video/captions`) [INDEPENDENT]. Default caption style not customizable via API (web UI or ffmpeg post-processing only) [INDEPENDENT]. No known per-caption edit endpoint to force verbatim wording: if a caption misspells a technical term, expect to re-caption in post.

### (4) Cost per minute + rate limits
Plans (INDEPENDENT; one source verified against the official pricing page Aug 2026): Free $0, 3 videos/month, watermark; Creator $29/mo, 600 credits; Pro $49/mo, 1000 credits; Business $149/mo, 1500 credits. CONFLICT: one third-party source said Creator $29/mo = 200 credits. Treat credits as unverified at point of sign-up; recheck official page. Avatar IV burn ~20 credits/min via web vs ~6 credits/min via API (third-party estimate, so Creator ~= 30 min/mo of Avatar IV on web pricing or ~100 min/mo via API) [INDEPENDENT, unverified numbers]. API has a separate pay-as-you-go plan at ~$99/mo for 100 credits (~$0.99/credit) per one 2026 source [INDEPENDENT]. Third-party estimate: API ~= $3/min [INDEPENDENT, estimate]. Rate limits: a concurrent-job limit exists; exceeding it returns "Rate limited", documented remedy is wait and retry in ~5 min [INDEPENDENT]. Free tier: watermark, no commercial use [INDEPENDENT].

### (5) Integration effort + render times
Render times: 2-5 min for a short video, 8-15 min for long [INDEPENDENT]. Polling pattern: `video_status.get` returns completed/failed [INDEPENDENT]. Webhook path available for push completion [INDEPENDENT]. Integration effort: MEDIUM-LOW (clean REST, templates, webhooks, community CLI/skill tooling exists).

### (6) Provenance footer / watermark / branding
Brand kits via API (colors, fonts, logo from website import) [INDEPENDENT]. Free tier watermark; paid removes it [INDEPENDENT]. No native every-frame footer bar: use ffmpeg burn-in post-render. Verdict: STRONG CANDIDATE. Best API + realism combo; claim control good if script-in only; cost math needs verification against the live pricing page because credit burn differs web vs API.

---

## 2. Synthesia

Status: active, independent (London, founded 2017). Enterprise compliance focus.

### (1) API quality / programmatic render control
REST API at `https://api.synthesia.io/v2`, `Authorization` header auth, `POST /v2/videos` with `scriptText` or `scriptAudio` [INDEPENDENT]. Webhooks: `video.completed`, `video.failed` [INDEPENDENT]. `test: true` returns a free watermarked test video; capped at 30 test videos/day [INDEPENDENT, from docs-derived skill notes]. API access gated behind Creator plan ($89/mo) [INDEPENDENT]. API quality: HIGH, slightly more enterprise-gated than HeyGen.

### (2) Aesthetic ceiling for technical content
"Expressive Avatars" (Avatar 2.0) add micro-expressions, eyebrow raises, natural nods [INDEPENDENT]. Reviews: "professional but slightly robotic"; "convincing enough for professional training" but expressions can look synthetic in longer clips; lip sync imperfect on complex phonemes [INDEPENDENT]. Rated less realistic than HeyGen head-to-head [INDEPENDENT]. Aesthetic ceiling for senior engineers: the platform reads as corporate training video by default. That is the "corporate training slop" risk for a technical audience. Custom personal avatar ($1,000/year add-on per independent review; higher tiers) reduces the generic look [INDEPENDENT].

### (3) Claim control (verbatim narration/captions)
ScriptText is spoken verbatim. Pronunciation overrides: `<break time="1s"/>` and `<sub alias="spoken">displayed</sub>` inside the script [INDEPENDENT, docs-derived]. RISK: AI Video Assistant generates scripts from documents/links/briefs (opt-in) [VENDOR-DESCRIBED/INDEPENDENT]; the assistant also "recommends transitions, effects, and media" [INDEPENDENT], which is an invented-visual risk if enabled. Use raw scriptText API only. Captions: auto closed captions on every video [INDEPENDENT]; MP4 1080p + SRT subtitles available [INDEPENDENT]. Script box supports up to 5 min per scene [INDEPENDENT].

### (4) Cost per minute + rate limits
Free 3 min/month [INDEPENDENT]. Starter $29/mo, 10 min [INDEPENDENT]. Creator $89/mo, 30 min + API access [INDEPENDENT]. Enterprise custom [INDEPENDENT]. CONFLICT: one third-party n8n doc priced API access at $64/mo; majority says $89/mo. Recheck official page. Effective cost at Creator: ~$3/min of finished video, the most expensive per-minute of the eight. Test videos via `test: true` are free (watermarked, 30/day) [INDEPENDENT]. Rate limits: UNVERIFIED beyond the test-video cap.

### (5) Integration effort + render times
Render: 3-5 min for a typical quickstart video [INDEPENDENT]. Webhooks make the async loop clean. Integration effort: MEDIUM-LOW, but the API gate at $89/mo makes experimentation costly; `test: true` mitigates this. SOC 2 Type II, ISO 42001, GDPR listed [INDEPENDENT].

### (6) Provenance footer / watermark / branding
Brand Kit: logo, colors, style auto-applied across videos [INDEPENDENT]. Free tier output is watermarked test video [INDEPENDENT]. No native every-frame footer: ffmpeg burn-in post-render. Verdict: VIABLE BUT EXPENSIVE. Strong API and compliance story; aesthetic defaults to corporate training; highest per-minute cost; best when compliance certifications matter more than cost.

---

## 3. D-ID

Status: active, independent.

### (1) API quality / programmatic render control
Talks API: `POST /talks` with image URL + script text (or audio input MP3/FLAC/M4A/MP4/WAV), Basic/Bearer auth; returns a talk ID; poll `GET` until status "done"; output always MP4 [INDEPENDENT]. Clips API with stock presenters (e.g. `v2_public_Amber@0zSz8kflCN`) [INDEPENDENT]. Multi-scene composition requires an external composer (Fabric.js in one third-party demo) [INDEPENDENT]. Webhooks: UNVERIFIED (could not confirm native webhook delivery; polling is the documented pattern). API quality: MEDIUM. Fine for single talking-head clips; no native multi-scene story.

### (2) Aesthetic ceiling for technical content
Head/shoulders photo-animation only, no full-body avatars [INDEPENDENT]. Reviews note lower resolution and less natural mouth motion than HeyGen/Synthesia [INDEPENDENT]. One honest 2026 hands-on review of the broader field excluded D-ID from the top tier entirely. For senior engineers: reads as animated-photo demo, weakest realism of the eight. Cheap to test, but the ceiling is low.

### (3) Claim control (verbatim narration/captions)
Talks API speaks the submitted script text verbatim; there is no paraphrase-generating mode in the API path [INDEPENDENT]. Captions: NOT supported in API output (MP4 only); captions require manual ffmpeg overlay [INDEPENDENT by omission: the tutorial's retrieval step downloads only the result URL, no caption endpoint documented]. For PING's verbatim-caption requirement this is a minus: own the caption layer entirely. No brand kit in API [UNVERIFIED]. Photo input must be rights-cleared: PING would supply its own presenter image or use D-ID stock presenters.

### (4) Cost per minute + rate limits
Trial free (3 min) [INDEPENDENT]. Lite $5.90/mo, 10 min, WITH watermark [INDEPENDENT]. Plus ~$16/mo, watermark removed [INDEPENDENT]. Pro ~$48/mo, API access + priority rendering [INDEPENDENT]. Enterprise custom [INDEPENDENT]. One review source: API billed ~$0.05/sec = $3/min [INDEPENDENT, single source]. Scale claim: API "can handle tens of thousands of parallel requests" [INDEPENDENT, tutorial claim, treat as marketing-adjacent]. Rate limits: UNVERIFIED numerically.

### (5) Integration effort + render times
Short clips render "in seconds" [INDEPENDENT]. Polling loop is simple; no webhook means PING owns the polling worker. Integration effort: LOW for single clips, MEDIUM for multi-scene (external composer needed). Refund-policy complaints appear in reviews [INDEPENDENT]: if trialing, start on the free trial and document everything.

### (6) Provenance footer / watermark / branding
Watermark on Lite; removed on Plus+ [INDEPENDENT]. No native every-frame footer; ffmpeg burn-in. Verdict: WEAK FIT. Cheap and fast for single clips, but no webhooks, no captions, lowest aesthetic ceiling, photo-animation look will not impress senior engineers. Only as a budget fallback.

---

## 4. Colossyan

Status: active, independent (London/NYC, est. 2020). L&D-focused.

### (1) API quality / programmatic render control
REST API, base `https://app.colossyan.com/api/v1`, `POST /v1/video-generation-jobs` [INDEPENDENT]. Async jobs with webhook callback on completion [INDEPENDENT, api-evangelist profile built from public surface 2026-06-21]. "Everything in Studio can be generated via API", including embedded text, images, and audio [VENDOR-DESCRIBED, still needs vendor confirmation]. Lists avatars/presenters, voices, templates; instant avatar and voice clone creation endpoints [INDEPENDENT]. API access requires Business or Enterprise plan [INDEPENDENT, needs vendor confirmation]. API quality: MEDIUM-HIGH on paper; gated behind the $88/mo tier.

### (2) Aesthetic ceiling for technical content
150+ stock avatars, 600+ voices [INDEPENDENT]. Independent reviews: realism "trails HeyGen and Synthesia"; training-video aesthetic; "not ideal" for cinematic/stylized or high-realism needs [INDEPENDENT]. BlockSentient briefing (2026-07-16): best for L&D/compliance, not for marketing agencies needing stylized video [INDEPENDENT]. For senior engineers: reads as e-learning module narration. Adequate for explainers, not impressive.

### (3) Claim control (verbatim narration/captions)
Script-in API speaks the script verbatim [VENDOR-DESCRIBED/INDEPENDENT]. RISK: AI script assistant rewrites scripts; prompt-to-video mode builds scenes from text [INDEPENDENT]; both are opt-in paraphrase/invented-visual paths. Avoid. Subtitle generation is a listed product feature [INDEPENDENT]; whether subtitles are retrievable via API is UNVERIFIED. Brand kits apply via API [VENDOR-DESCRIBED].

### (4) Cost per minute + rate limits
Free 3 min [INDEPENDENT]. Starter $27/mo, 15 min [INDEPENDENT]. Business $88/mo (seat/month per one source): unlimited minutes on NEO1 model + 10 min on NEO2 [INDEPENDENT]. Enterprise custom [INDEPENDENT]. API gate at Business = $88/mo minimum for programmatic use [INDEPENDENT]. Rate limits: UNVERIFIED.

### (5) Integration effort + render times
Async job + callback webhook is the clean pattern [INDEPENDENT]. Render time: one independent review reported 10+ minutes render for a 1-minute video (anecdotal; treat as weak evidence, likely queue-dependent) [INDEPENDENT, single anecdote]. Integration effort: MEDIUM (template/variable substitution via API; needs the Business tier to even start).

### (6) Provenance footer / watermark / branding
Paid plans: no watermark + full video rights [INDEPENDENT]. Brand kits via API [VENDOR-DESCRIBED]. No native every-frame footer; ffmpeg burn-in. Verdict: MARGINAL. API looks capable but the gate is high ($88/mo), aesthetic ceiling is e-learning, and several claims are still vendor-described only. Only worth a trial if HeyGen/Synthesia fail on cost.

---

## 5. Elai.io

Status: ACQUIRED BY PANOPTO (independent reporting). Strategic direction risk: the standalone product's roadmap is now Panopto's.

### (1) API quality / programmatic render control
REST API exists; API keys at Settings > API Keys; available on both free trial and paid accounts [INDEPENDENT, fahimai 2026 guide]. Webhooks: claimed in one review ("REST API with webhooks") but UNVERIFIED against docs. Endpoint/auth details: UNVERIFIED. API quality: LOW VERIFIABILITY. Cannot recommend integration effort planning until docs are confirmed.

### (2) Aesthetic ceiling for technical content
80+ avatars, 75+ languages, 450+ voices [INDEPENDENT]. Mid-tier realism; no independent source ranks it above HeyGen/Synthesia on quality. Selfie avatar ($199/yr) and studio avatar ($500/yr) add-ons [INDEPENDENT]. For senior engineers: competent but unremarkable; Panopto ownership makes its 2026+ product future uncertain.

### (3) Claim control (verbatim narration/captions)
Script editor speaks the text; no paraphrase in the base flow [INDEPENDENT]. RISK: AI Storyboard auto-creates multi-scene video structure from a pasted article URL or text block (opt-in; paraphrase + auto scene building) [INDEPENDENT]. Brand Kit exists in product (logo, colors, fonts applied across scenes) [INDEPENDENT]; API-side brand kit control UNVERIFIED. Captions via API: UNVERIFIED.

### (4) Cost per minute + rate limits
Free 1 min [INDEPENDENT]. Creator $23/mo annual ($29 monthly), 15 min [INDEPENDENT]. Team $100/mo annual ($125 monthly), 50 min [INDEPENDENT]. Enterprise custom [INDEPENDENT]. Add-ons: extra minutes $2 each; voice cloning $200/yr; selfie avatar $199/yr; studio avatar $500/yr [INDEPENDENT]. Effective: ~$1.50-2/min at Creator. Rate limits: UNVERIFIED.

### (5) Integration effort + render times
Render times: UNVERIFIED. Integration effort: UNKNOWN until API docs are confirmed. Cheapest per-minute of the eight, but the evidence base is thin.

### (6) Provenance footer / watermark / branding
Brand Kit in product [INDEPENDENT]. No native every-frame footer; ffmpeg burn-in. Verdict: NOT RECOMMENDED NOW. Acquisition by Panopto + thin API evidence = too much uncertainty for a pipeline dependency. Revisit only if Panopto publishes a stable developer story.

---

## 6. Hour One

Status: ACQUIRED BY WIX IN 2025 (independent reporting). Product future tied to Wix.

### (1) API quality / programmatic render control
An API exists: the "Studio / MakeReals API" turns text and templates into AI presenter videos programmatically [INDEPENDENT, api-evangelist profile from public surface]. Endpoint details, auth, webhooks: UNVERIFIED. Do NOT confuse with "Magic Hour" (magichour.ai), a different face-swap/generative API company whose endpoints and pricing polluted several search results [INDEPENDENT]. API quality: UNVERIFIED.

### (2) Aesthetic ceiling for technical content
"Lifelike AI presenters (characters)" per independent profile [INDEPENDENT]. No strong independent aesthetic reviews found in this survey; evidence base is the thinnest of the eight. Wix acquisition suggests the standalone studio product may be deprioritized. UNVERIFIED for senior-engineer suitability.

### (3) Claim control (verbatim narration/captions)
UNVERIFIED across the board. No confirmed paraphrase features; no confirmed caption endpoints.

### (4) Cost per minute + rate limits
Free 3 min; Lite $25/mo, 10 min; Business $95/mo, 20 min; Enterprise custom [INDEPENDENT, api-evangelist]. Whether self-serve plans are still sold post-acquisition is UNVERIFIED.

### (5) Integration effort + render times
UNVERIFIED.

### (6) Provenance footer / watermark / branding
UNVERIFIED. Verdict: NOT VIABLE FOR NOW. Acquired by Wix, thinnest evidence base, API details unverifiable. Revisit only if Wix publishes a clear developer story for MakeReals.

---

## 7. Tavus

Status: active, independent. Developer-first positioning.

### (1) API quality / programmatic render control
REST API v2 at `https://tavusapi.com/v2`, `x-api-key` header. `POST /v2/videos` takes `replica_id` + `script` (or `audio_url`) [INDEPENDENT]. `callback_url` webhooks for completion [INDEPENDENT]. 100+ stock replicas (e.g. `r90bbd427f71`); custom replica training takes 3-4 hours [INDEPENDENT]. Params include `background_url`, `background_source_url`, `watermark_image_url`, `transparent_background` [INDEPENDENT, skill docs verified 2026-07-10 against docs.tavus.io]. API quality: HIGH for developers. G2 reviewers: thorough API docs, steeper learning curve, mostly developer users [INDEPENDENT].

### (2) Aesthetic ceiling for technical content
G2 reviewers call replicas "remarkably lifelike" [INDEPENDENT, via third-party summary]. Developer-first brand means less marketing gloss, which can read as more credible to engineers. Custom replica of a real PING presenter is the path to a non-generic look (3-4 hr training) [INDEPENDENT]. Strong ceiling, especially with a custom replica.

### (3) Claim control (verbatim narration/captions)
`/v2/videos` with `script` speaks it verbatim; `audio_url` mode uses your own audio (maximum claim control: PING renders its own TTS/audio and Tavus only lip-syncs) [INDEPENDENT]. RISK: the Conversational Video Interface product is LLM-driven (personas that improvise responses); that is a separate product surface from the scripted video endpoint. Do not mix them. Captions: UNVERIFIED (no caption endpoint confirmed). For verbatim captions, use `audio_url` + own the caption layer in post.

### (4) Cost per minute + rate limits
Free tier exists [INDEPENDENT]. Starter $59/mo (100 conversational min + 10 video-gen min); Growth $397/mo (500 conv + 100 gen min) [INDEPENDENT]. Overage $0.32-0.37/min [INDEPENDENT]. Effective video-gen cost at Growth: ~$4/min all-in for the plan, or overage ~$0.35/min. Rate limits: UNVERIFIED numerically. Pricing is the most transparent of the eight.

### (5) Integration effort + render times
`callback_url` webhook pattern is clean [INDEPENDENT]. Custom replica training 3-4 hours one-time [INDEPENDENT]. Video generation render time: UNVERIFIED. Integration effort: MEDIUM (developer-friendly docs, steeper learning curve reported).

### (6) Provenance footer / watermark / branding
`watermark_image_url` is a native API parameter: this is the ONLY platform in the survey with a first-class image-overlay hook, and it is the natural place to inject a PING provenance strip (render a footer-strip PNG and pass it as the watermark image) [INDEPENDENT]. `transparent_background` also available for compositing PING's own lower thirds [INDEPENDENT]. Free tier watermark presumably applies; verify at trial. Verdict: STRONG CANDIDATE, best provenance story. Highest developer fit; cost is mid-range; confirm caption support and render times in a trial.

---

## 8. Rephrase.ai

Status: ACQUIRED BY ADOBE, November 2023 [INDEPENDENT: VentureBeat, TechMonitor, Verdict; re-confirmed in a 2026-09-02 TechCrunch-sourced digest]. Team folded into Adobe's generative video efforts. Website traffic near zero; no standalone product or public API in 2026 [INDEPENDENT].

All six criteria: NOT APPLICABLE. Verdict: EXCLUDED. Do not build on it. If Adobe ships a Rephrase-derived API later, re-survey then.

---

## Cross-platform comparison (what the parent needs)

| Platform | API quality | Aesthetic ceiling (senior eng.) | Claim control | Cost/min (est.) | API gate | Provenance hooks |
|---|---|---|---|---|---|---|
| HeyGen | HIGH | Highest (photorealistic, casual lean) | Good (script-in only; avoid Video Agent) | ~$1-3 | Paid plan + API plan | Brand kit API |
| Synthesia | HIGH | Corporate-training look | Good (scriptText + sub overrides; avoid assistant) | ~$3 | Creator $89/mo | Brand Kit |
| D-ID | MEDIUM | Lowest (photo-animation) | Narration verbatim; no captions API | ~$0.6-3 | Pro ~$48/mo | None confirmed |
| Colossyan | MEDIUM-HIGH (paper) | E-learning look | Good (avoid script assistant) | ~$1.8 (Starter) | Business $88/mo | Brand kits (vendor) |
| Elai | LOW verifiability | Mid, unremarkable | Unknown API-side | ~$1.50-2 | None (trial has API) | Brand Kit (product) |
| Hour One | UNVERIFIED | UNVERIFIED | UNVERIFIED | ~$2.50 (Lite) | Unknown | UNVERIFIED |
| Tavus | HIGH (dev-first) | High (lifelike; custom replica) | Best (audio_url mode) | ~$0.35 overage / ~$4 plan | Free tier exists | watermark_image_url (native) |
| Rephrase.ai | n/a | n/a | n/a | n/a | n/a | n/a |

## Recommendations for the parent

1. Shortlist: HeyGen + Tavus. HeyGen for realism and the cleanest API; Tavus for the native provenance overlay and developer fit. Trial both on the same script and compare.
2. Synthesia is the fallback if compliance certifications (SOC 2, ISO 42001) become a requirement; accept the cost and the corporate-training aesthetic.
3. Exclude Rephrase.ai (dead), Hour One (acquired, unverifiable), Elai (acquired, thin API evidence). Park D-ID and Colossyan as budget fallbacks.
4. Pipeline architecture regardless of vendor: script-in only (never agentic/prompt-to-video modes), lock avatar + template + background in the API call, own the caption layer (Whisper + ffmpeg) for verbatim guarantee, burn the provenance footer in post with ffmpeg (or Tavus watermark_image_url as the native shortcut).
5. Verify before buying: HeyGen credit math (200 vs 600 credits on Creator; web vs API burn rate), Synthesia $89 vs $64 API gate, D-ID webhook existence, Colossyan API plan gate, Tavus render times and caption support.
