# DO NOT USE  -  Video-Generator Integration Survey

Date: 2026-09-30. These services fail our non-negotiables (claim control, programmability, or aesthetic fit for senior engineers). Reasons are structural, not pricing quibbles.

## Categorical failures (claim control)

**Runway Gen-4.5**  -  Real API, $7.20/min, but no narration input, no text overlays, and every pixel invented. Severs the claim chain by design. A photorealistic fake terminal session is worse than no footage.

**Pika 2.5**  -  Same structural problem: $2.40-5.40/min for invented pixels, no narration or exact text in the render.

**Luma Dream Machine**  -  Same problem, more dangerous: photorealism makes fake evidence MORE credible-looking. $3.60-14.40/min. Never near a claim-controlled pipeline.

**Veed API**  -  Category error. Its API is generative (Fabric 1.0 talking-head, lip-sync), not a timeline editor. Generative pixels structurally violate claim control. $9/min at 720p anyway.

## Not programmable (no API, no pipeline)

**InVideo**  -  No public developer API (two independent 2026 sources). Beta MCP server only. Cannot drive renders programmatically, full stop.

**Kapwing**  -  No public developer API exists (three independent 2026 sources). Browser editor only.

**Rephrase.ai**  -  Acquired by Adobe November 2023; no standalone product or public API in 2026. Dead.

## Acquired / roadmap-dead

**Elai.io**  -  Acquired by Panopto; standalone roadmap is Panopto's now. Cheapest per-minute in the survey but a pipeline dependency on an uncertain roadmap is disqualifying.

**Hour One**  -  Acquired by Wix 2025; MakeReals API endpoints, auth, and webhooks all unverified. Thinnest evidence base in the survey.

## Wrong shape / wrong economics

**Creatomate**  -  Capable API (REST + RenderScript + webhooks), but it is a template-slot filler for bulk marketing variants, and real API access starts at $129/mo. Template-slop risk for senior-engineer explainers.

**Placid**  -  Image API with non-animated video overlays only; worst video pricing in the survey ($9-23/min at low tiers, ~$249/mo at our volume).

**Bannerbear**  -  Fine product, wrong job: template animations with verbatim text swaps (~$5.88/min of animation). Acceptable ONLY as a branded bumper/outro sidekick, never the main content renderer.

**Descript**  -  Not a pipeline layer. Overdub is patch-quality (one word, not monologues  -  independent), API is open beta with share-link-only export. Keep for manual polish of recorded material.

## The pattern

Everything rejected falls into three buckets: it invents pixels (generative), it cannot be driven by code (no API), or it was acquired into someone else's roadmap. Our non-negotiable  -  exact narration, exact on-screen text, no paraphrase, no invented visuals, provenance on every frame  -  eliminates the entire generative category on first principles. What survives is code-driven rendering (Remotion), JSON-timeline APIs (Shotstack), template APIs with locked media (Fliki), and script-in avatar APIs (Tavus, HeyGen) for presenter-led formats only.
