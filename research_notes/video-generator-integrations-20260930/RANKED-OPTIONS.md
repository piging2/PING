# Ranked Video-Generator Integration Options

Date: 2026-09-30. Full evidence in report.md and notes/. Ranked for: senior-engineer audience, evidence-heavy technical content, claim control non-negotiable, provenance footer on every frame.

## The ranking

### 1. Remotion (code-driven)  -  RECOMMENDED

| Criterion | Assessment |
|---|---|
| API quality | Fully programmatic: React code renders MP4 locally or on Lambda. No vendor API in the loop at all. |
| Aesthetic ceiling | HIGHEST for technical content. Pixel-exact code displays, SQL traces, diagrams, kinetic typography synced to narration. Looks like the work itself, not a commercial about the work. |
| Claim control | PERFECT. No AI anywhere in the render pipeline. Every pixel is ours; nothing can paraphrase or invent. |
| Cost | Free at our scale (team <=3, VENDOR-DESCRIBED); self-render infra roughly $0.01-0.05/render (UNVERIFIED). Effectively near-zero per artifact. |
| Integration effort | HIGHEST. We own render infra and the component library. Mitigated: we already compile PIL frames + ffmpeg, so this is an upgrade path, not a new discipline. |
| Provenance | Trivial: burn the footer in code on every frame. |

Why it wins: it is the only option where claim control is structural rather than contractual. We never have to trust a vendor not to paraphrase, because there is no vendor in the render path. For our audience, precision IS the aesthetic.

### 2. Shotstack (JSON timeline API)  -  best no-infra fallback

| Criterion | Assessment |
|---|---|
| API quality | Excellent. JSON timeline in, MP4 out, webhooks on completion, renders in seconds. |
| Aesthetic ceiling | As good as our frames. It composites; it does not generate beauty. Our design ability is the ceiling. |
| Claim control | Excellent. Verbatim text overlays, our audio, our images. |
| Cost | ~$0.20-0.30/min; ~$12-24/mo at our volume (VENDOR-DESCRIBED). |
| Integration effort | LOW. REST calls, no infra to operate. |
| Provenance | Yes: text/image overlays for the footer strip. |

When to pick it over Remotion: if render-infra ownership becomes a burden. It does everything our current PIL+ffmpeg pipeline does, as an API.

### 3. Fliki (template API)  -  best script-to-video fit

| Criterion | Assessment |
|---|---|
| API quality | Good. Template API injects exact text per scene layer, webhooks, brand kits. |
| Aesthetic ceiling | Template-bound. Decent, but the template shapes the piece; slop risk if templates are generic. |
| Claim control | Good IF templates are pinned and media is locked. End-to-end verbatim UNVERIFIED without a test render. Template-pinned media means zero invented visuals possible. |
| Cost | ~$0.05/min of narrated output (VENDOR-DESCRIBED); API gated behind Premium $88/mo. |
| Integration effort | LOW. |
| Provenance | Brand kits (logo/intro/outro); per-frame footer via template. |

Caveat: the one option here that still needs a paid test render before we trust the verbatim claim.

### 4. Tavus  -  best avatar option, best provenance hook

| Criterion | Assessment |
|---|---|
| API quality | Excellent. REST v2, callback webhooks, audio_url mode (we render our own audio, Tavus only lip-syncs) = maximum claim control for avatars. |
| Aesthetic ceiling | Best-in-class talking heads, but talking heads are the wrong genre for evidence-heavy pieces. Reserve for presenter-led formats only. |
| Claim control | Best of the avatar class via audio_url. |
| Cost | Most transparent: overage ~$0.32-0.37/min (VENDOR-DESCRIBED). |
| Integration effort | MEDIUM. Custom replica trains 3-4 hours. |
| Provenance | BEST IN CLASS: watermark_image_url is a native API parameter  -  the natural slot for our provenance strip. |

### 5. HeyGen  -  best avatar API, talking-head ceiling

Cleanest API in the field (INDEPENDENT), Avatar V photorealistic, ~$3/min. Same genre caveat as Tavus: great for presenter-led, wrong for evidence-heavy. Script-in only; avoid Video Agent mode.

### 6. Pictory  -  backup script-to-video

Published API, webhooks, verbatim TTS script mode, ~$0.66/min at full use. Stock-first workflow needs per-scene policing. Behind Fliki on structure.

### Rejected but not categorically failed

Synthesia (viable, but ~$3/min and reads as corporate training  -  pick only for compliance certifications), D-ID (weak fit, budget fallback), Colossyan (marginal, high API gate), Creatomate (wrong shape, $129/mo API gate), Bannerbear (bumper/outro sidekick only), Descript (manual polish, not a pipeline layer).

## The recommended plan

**Architecture: Remotion renders visuals + assembly; dedicated TTS renders verbatim narration; word timestamps drive kinetic type.**

What we send in (all already exist in our pipeline):
- The script draft, sentence by sentence (from the 40-60 block format).
- The claim ledger: every spoken line resolves to a ledger claim's PUBLIC WORDING within its MAXIMUM DEFENSIBLE WORDING. The render is rejected if any line cannot resolve.
- Evidence frames: recorded trial SQL, rendered diagrams, code blocks  -  the same material our PIL pipeline already produces, upgraded to React components.
- Narration audio from a TTS API with word-level timestamps (ElevenLabs or OpenAI TTS  -  pricing UNVERIFIED, one check before buying).

What comes out:
- One MP4 per artifact: kinetic typography synced to word timestamps, code/trace/diagram shots rendered pixel-exact, provenance footer burned into every frame in code, headline slot parameterized until Nolan's pick.

Where human review sits:
1. Script + ledger + accuracy/overclaim/L6 passes (existing, unchanged).
2. Render preview to Nolan  -  he reviews the EXACT artifact.
3. Nolan approves that exact artifact (or picks the headline, which slots in with zero other changes).
4. Distribution only from that approval. No silent mutation between approval and distribution.

Cost per artifact: roughly $0.01-0.05 render compute + TTS minutes (pennies). At our volume, effectively zero marginal cost  -  versus ~$3/min for avatar APIs and $7.20/min for generative.

Fallback: if Remotion's infra ownership proves heavy, Shotstack takes the same inputs (frames, audio, timeline JSON) over REST with no infra, at ~$0.20-0.30/min.

Open verification items before building: TTS provider pricing + word-timestamp quality; one Remotion Lambda cost measurement on a real render.
