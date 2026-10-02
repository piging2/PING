# PING Visual Grammar — Notes for Future MarketingOS Use
Captured 2026-10-01 during conservative visual convergence. Notes only; no MarketingOS work authorized.

## The three families (canonical compositions, not illustrations)
Source PNGs archived at `C:\Users\nolan\2026-10-01\so\outputs\assets\` (do not move).
Optimized WebPs committed in repo: `apps/editorial-preview/public/art/primitives/{continuity,evidence,knowledge}.webp`
Each: 1536x512, transparent background, triptych strip (three 512px panels = three phases/stages).

- **CONTINUITY** — things persist and evolve without losing identity.
  Site use: homepage hero, phases Record (observation enters) / Connect (relates to knowledge) / Carry forward (context survives).
  Component: `<PrimitiveArtwork concept="continuity" phase={0|1|2} />`
- **EVIDENCE** — claims are grounded in observable support.
  Site use: beside FYD's source explanation; caption "Keep the source in view."
  Grammar extension: CLAIM -> SUPPORT SET -> OBSERVATION -> SOURCE; uncertainty states SUPPORTED / PARTIAL / CONFLICTING / UNKNOWN.
- **KNOWLEDGE** — observations become connected understanding.
  Site use: beside the relationship explorer; caption "An idea becomes connected understanding."
  Rule: knowledge viz = objects/claims/evidence/relationships. Never the same nodes-and-lines as journal.

## Symbol vocabulary (small grammar)
`src/fyd/components/editorial-symbols.tsx` — single programmatic `<svg>`, driven by `data-symbol` / `data-phase`.
Covers: identity, capability, event, lineage, relationship, evidence, object, execution, etc.
Styles: `apps/editorial-preview/app/symbol-language.css`.
Use for: intelligence-loop stages, diagram language, future social/explainer graphics. Same symbols everywhere = recognizable without the logo.

## Journal vs Knowledge (central distinction)
- JOURNAL = WHAT HAPPENED: sequence, causation, decisions, effects, verification.
- KNOWLEDGE = WHAT PING UNDERSTANDS: objects, claims, evidence, relationships.
Never render both as the same graph with different headings.

## Intelligence loop (compact, one place)
OBSERVE -> UNDERSTAND -> DECIDE -> AUTHORIZE -> ACT -> VERIFY -> LEARN. Each stage can carry a symbol.

## MarketingOS reuse patterns (when authorized)
- UNKNOWN/HOLD post: Evidence grammar showing an effect leaving known state, entering unresolved verification.
- Durable learning post: Knowledge grammar.
- Provenance post: Evidence + Continuity combined.
- Rule: the art becomes a language for explaining the machine, not decoration.

## Constraints carried forward
- No new visual families until these three are exhausted.
- No generic AI-art dilution (no gradient blobs, robots, stock, fake terminals/dashboards).
- Three.js only where depth explains (relationship/topology/lineage/continuity/object structure).
- Motion must encode meaning; honor prefers-reduced-motion; search repo for stranded FYD motion vocabulary before writing new.
- Copy: ban AI-powered/revolutionize/unlock/seamless/next-generation/transform-your-workflow unless earned; 100-homepages test.

## P1 visual-refinement session notes (2026-10-01, worker 0f350b19)

Close bar applied per section (CONCEPT -> PROOF):
- HERO (continuity): three product-language stages OBSERVE/UNDERSTAND/PROJECT; stage selection changes picture + sentence + evidence/object/projection annotation. Dark panel, gold accents.
- EVIDENCE: chain widget CLAIM -> SUPPORT SET -> SOURCE -> OBSERVED AT -> VERDICT built from live /api/public-preview; honest UNKNOWN when unreachable (adversarially verified).
- KNOWLEDGE: bounded object inspector as 5-step story (Object/Relationships/Evidence/Lineage/New observation); selecting a relationship explains type/direction/evidence/status. Dark-native (atlas section is ink bg rgb(21,23,21): probe computed bg before styling, never assume light).
- JOURNAL: chronological spine (oldest left, newest right) above cards; WHAT HAPPENED as sequence, visually distinct from knowledge inspector.
- ASK PING (killer interaction): evidence-bounded interrogation of the inspected object; deterministic verdicts SUPPORTED/PARTIAL/UNSUPPORTED/CONFLICT from reached record+relationships; unsupported refused honestly; conflict check runs every time.
- FYD-AS-PROJECTION: SOURCE -> OBSERVATION -> EVIDENCE -> OBJECT -> RELATIONSHIPS -> SITE SPEC -> FYD chain under the live preview; relationships link back to #understanding; owner rule stated (presentation changes, never the record).

Reusable verdict model (Ask PING): SUPPORTED = published evidence attached; PARTIAL = recorded but thin provenance; UNSUPPORTED = no evidence, say so; CONFLICT = claims disagree, expose. Deterministic, no model, no fetch.

Lane lessons:
- pigwsl-exec flakes (broken pipes): back off, do not hammer; chain commands to reduce round trips.
- pig-put hash MISMATCH means concurrent edit: pull (base64 chunked), merge, push; never overwrite blind.
- Backend worker pasted python scripts into symbol-language.css 3x (journal inventory, Q2 fork classification, J3 uniques scan): excise to ~/workspace/*-recovered.py, rejoin CSS fragments from context, leave NOTE, report the collision. Do not silently absorb another lane's paste.
- symbol-language.css is shared/mixed-authorship: commit only owned .tsx files; leave CSS dirty with an honest note rather than misattributing a rewrite.
- Mirror QA: Pig build -> static mirror (index.html + _next/static + art + fonts + real /api/public-preview JSON via Pig curl) -> chunked base64 pull -> :8321 + playwright-core. SSR HTML carries client component initial DOM; verify interactions (clicks) not just presence.
- Favicon 404 in console is pre-existing noise, not a defect.
- The dirty presentation.ts (another session) drives section order/theme/eyebrows; components must adapt to it, never fight it. Do not touch presentation.ts, editorial-interactions.tsx, public-design.css (all dirty, other lanes).
