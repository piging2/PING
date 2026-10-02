# Video-Generator Integration Survey  -  Full Report

Date: 2026-09-30. Research-only: no signups, no paid calls, no code changes.
Directive: our self-compiled video was not good enough. Find an integration so the pipeline becomes: we do content ideas, scripts, judgment; the integration makes it aesthetically pleasing.

Audience: senior engineers watching evidence-heavy technical pieces.
Non-negotiable: CLAIM CONTROL  -  exact narration + exact on-screen text rendered verbatim, no paraphrase, no invented visuals that sever the claim chain. Every frame carries our provenance footer.

Evidence grades: VENDOR-DESCRIBED / INDEPENDENT / UNVERIFIED. Detail lives in notes/ (avatar-platforms.md, generative-script2video.md, code-driven.md), 662 lines with inline grades.

## The landscape splits four ways

### 1. Avatar-led / talking-head platforms

**HeyGen  -  STRONG CANDIDATE.** REST API v3 (api.heygen.com, X-Api-Key), POST /v3/videos, HMAC-signed webhooks (video.completed/video.failed), template API with {{variables}}, brand kit + glossary endpoints (INDEPENDENT). Cleanest API in the field per a 2026 third-party estimate (INDEPENDENT). Best aesthetic ceiling of the eight: Avatar V photorealistic, short clips "indistinguishable from real video," though 5-minute talking heads still show AI tells (INDEPENDENT hands-on test). Script-in is verbatim; avoid Video Agent mode (auto-writes scripts and visuals  -  paraphrase risk). Captioned variant downloadable via API; caption style not customizable via API. Cost: Creator $29/mo; credit math CONFLICTS across sources (600 vs 200 credits); API pay-as-you-go ~$99/100 credits (~$3/min est). Render 2-5 min short, 8-15 min long. Paid plans remove watermark.

**Tavus  -  STRONG CANDIDATE, best provenance story.** REST API v2 (tavusapi.com/v2, x-api-key), POST /v2/videos with replica_id + script or audio_url, callback_url webhooks (INDEPENDENT, verified 2026-07-10). audio_url mode = maximum claim control: we render our own audio, Tavus only lip-syncs. G2 reviewers: "remarkably lifelike" replicas, docs thorough, steeper learning curve, mostly developer users (INDEPENDENT). watermark_image_url is a NATIVE API parameter  -  the only platform with a first-class image-overlay hook, the natural slot for our provenance strip; transparent_background also available (INDEPENDENT). Pricing most transparent: Starter $59/mo (10 gen min), Growth $397/mo (100 min), overage ~$0.32-0.37/min. Captions and render times UNVERIFIED.

**Synthesia  -  VIABLE FALLBACK, expensive and corporate-looking.** REST API api.synthesia.io/v2, webhooks, test:true gives free watermarked test videos (30/day cap), but API gated behind Creator $89/mo (INDEPENDENT; a $64 claim conflicts). ScriptText supports <break> and <sub alias> pronunciation overrides; auto closed captions + SRT (INDEPENDENT). Reviews call output "professional but slightly robotic"  -  the default reads as corporate training video, the slop risk for senior engineers (INDEPENDENT). ~$3/min, highest per-minute of the eight. Pick only if SOC 2/ISO 42001/GDPR certifications matter more than cost and aesthetics.

**D-ID  -  WEAK FIT.** Talks API (image URL + script, poll to done), MP4 always (INDEPENDENT). No native webhooks confirmed (UNVERIFIED). Head/shoulders photo-animation only, lower resolution, lowest aesthetic ceiling (INDEPENDENT). No captions in API output, no brand kit confirmed  -  we own captions entirely. ~$3/min. Budget fallback for single clips only.

**Colossyan  -  MARGINAL.** REST API app.colossyan.com/api/v1, async jobs + webhook callbacks (INDEPENDENT). "Everything in Studio via API" is VENDOR-DESCRIBED only. API requires Business/Enterprise ($88/mo+, INDEPENDENT). Realism "trails HeyGen and Synthesia," e-learning look (INDEPENDENT). Trial only if HeyGen/Tavus fail on cost.

**Elai.io  -  NOT RECOMMENDED NOW.** Acquired by Panopto (INDEPENDENT); standalone roadmap is Panopto's now. Cheapest (~$1.50-2/min) but too much uncertainty for a pipeline dependency.

**Hour One  -  NOT VIABLE FOR NOW.** Acquired by Wix 2025 (INDEPENDENT); MakeReals API endpoints, auth, webhooks all UNVERIFIED. Thinnest evidence base.

**Rephrase.ai  -  EXCLUDED.** Acquired by Adobe November 2023 (INDEPENDENT); no standalone product or public API in 2026.

Global finding across all eight: every platform's script-in endpoint speaks verbatim; paraphrase risk lives only in opt-in AI-agent/prompt-to-video modes  -  use script-in endpoints only. And NO platform offers a native every-frame footer bar; plan on ffmpeg burn-in post-render (Tavus watermark_image_url is the one native shortcut).

### 2. Generative video (Runway, Pika, Luma)

**Categorically wrong for us.** Runway Gen-4.5: real REST API + SDKs, $7.20/min output  -  but no narration, no text overlays, every pixel invented (VENDOR-DESCRIBED + INDEPENDENT). Pika 2.5: official API, keyframes-to-video closest to scene control, $2.40-5.40/min  -  same invented-visual problem. Luma Ray3.2: REST API, $3.60/min 720p up to $14.40/min 1080p  -  photorealism makes fake evidence MORE dangerous. None take narration or exact text. They sever the claim chain by design. See DO-NOT-USE.md.

### 3. Script-to-video (Pictory, InVideo, Fliki)

**InVideo  -  DISQUALIFIED.** No public developer API (two INDEPENDENT 2026 sources); only a beta MCP server. Cannot drive renders programmatically.

**Fliki  -  best structural fit of the three.** Template API (POST api.fliki.ai/v1/generate/template) injects exact text per scene layer + webhook + brand kits (VENDOR-DESCRIBED). Template-pinned media = zero invented visuals possible. ~$0.05/min of narrated output (VENDOR-DESCRIBED). API gated behind Premium ($88/mo). End-to-end verbatim behavior UNVERIFIED without a test render.

**Pictory  -  backup.** Published API with webhooks, zero-credit preview loop, per-scene clip swapping; Script-to-Video reads script verbatim via TTS (VENDOR-DESCRIBED). $79/mo, ~$0.66/min at full use. Stock-first workflow needs per-scene policing; article mode paraphrases  -  avoid.

### 4. Code-driven / programmable

**Remotion  -  BEST FIT.** React code renders MP4. Pixel-exact control over code displays, diagrams, kinetic typography. Perfect claim control: no AI anywhere in the pipeline. Per-frame footers trivial (it is code). Cost: free at our scale (team of <=3 per license terms, VENDOR-DESCRIBED), else $0.01/render + $100/mo minimum; self-render infra roughly $0.01-0.05/render (UNVERIFIED). Highest integration effort: we own render infra. Note: we already compile PIL frames + ffmpeg, so this is an upgrade path, not a new discipline.

**Shotstack  -  best API-first fallback.** JSON timeline in, MP4 out; verbatim text, webhooks, renders in seconds (VENDOR-DESCRIBED + INDEPENDENT). ~$0.20-0.30/min; ~$12-24/mo at our volume. Cannot generate beauty, only composite  -  but compositing our frames IS our pipeline.

**Creatomate  -  capable API, wrong shape.** REST + RenderScript + webhooks (VENDOR-DESCRIBED), but template-slot filler for bulk marketing variants; real API entry $129/mo (Essential tier has no API). Template-slop risk for senior-engineer explainers.

**Bannerbear  -  sidekick only.** Template animations with verbatim text swaps, ~$5.88/min of animation (VENDOR-DESCRIBED). Fine for a branded bumper/outro, not main content.

**Placid  -  exclude.** Image API with non-animated video overlays only; video pricing worst in survey ($9-23/min low tiers; ~$249/mo at our volume).

**Kapwing  -  exclude.** No public developer API exists (three INDEPENDENT 2026 sources). Browser editor only. Not programmable.

**Veed  -  exclude.** Category error: its API is generative (Fabric 1.0 talking-head, lip-sync via fal.ai), not a timeline editor. Generative pixels structurally violate claim control; $9/min at 720p anyway.

**Descript  -  manual polish only.** Overdub is patch-quality (good for fixing one word, not full monologues  -  INDEPENDENT); API is open beta with share-link-only export. Not the narration layer, not the assembly layer.

**Hybrid verdict (worker):** Remotion (visuals + assembly) + dedicated TTS API (ElevenLabs/OpenAI TTS) for verbatim narration with word timestamps driving kinetic type is the strongest architecture for our constraints. Shotstack is the credible no-infra fallback. TTS provider pricing was out of scope this pass  -  one verification check remains.

## The aesthetic question, answered bluntly

For senior engineers watching evidence-heavy technical pieces, three aesthetics compete:
- Talking-head avatars (HeyGen/Tavus at their best): credible for presenter-led formats, but the default reads as corporate training. Wrong genre for evidence-heavy pieces.
- AI B-roll / stock montages (generative trio, Pictory stock-first): faceless slop. Actively harms credibility with this audience.
- Precision rendering (Remotion/Shotstack): pixel-exact code, traces, diagrams, kinetic typography. This is the aesthetic senior engineers respect  -  it looks like the work itself, not a commercial about the work.

Our pipeline already produces the raw material for the third aesthetic (recorded trial SQL, rendered evidence frames). The integration question is who renders it beautifully, not who invents footage.
