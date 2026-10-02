# Q21 — MARKETING COPY VS PRODUCT STATE
Audited: 2026-10-01 ~18:24 MDT
Worktree SHA: 2b5c95eef02f3c271c3c1966ec80df2f7e629876 (branch codex/ping-parallel-review, dirty — visual crew active)
Homepage file: src/app/page.tsx (592 lines, sha256 e151d2d412a559a0e2d38a174985eb1577740846cd1e55a135da0699bc89f7cc)

Method: read page.tsx + every diagram component for data fetching (fetch/XHR/API reads). No fetches in any diagram component; all animate hardcoded constants.

## Section table

| # | Section (page.tsx) | Classification | Evidence |
|---|---|---|---|
| 01 | HERO copy ("Systems that remember, agents you can trust" + TenantOS tenant note) | MARKETING + EXPLANATION | page.tsx:183-217. H1/tagline explain the promise; the honesty note ("runtime under active construction", "Maturity labels say what is real") is explanation, not proof. |
| 01b | HeroEvidenceCard (beside hero) | INTERACTIVE PROOF (captured) + SNAPSHOT LABELED LIVE | src/components/architecture/hero-evidence-card.tsx. Steps auto-rotate ("replaying captured record") over hardcoded CAPTURED_STEPS from the 2026-07-28 commissioning run — labeled captured, honest. BUT lines 100-114 render a pulsing green dot + "ping-gateway: healthy · constitution 1.0.0 · auth enforced on reads" + badge "Live · probed 2026-09-16". No fetch exists in the component; the "Live" indicator is a hardcoded string snapshot 15 days old at audit time. The file comment says "a real live gateway probe (2026-09-16)" — that was a probe at build time, not a live read. |
| — | PortalHost (object portals in page margins) | LIVE PRODUCT STATE | page.tsx:172,235. `listObjectIds()` → `buildPortalProjection(id)` run server-side per request over verified public projections (src/fyd/object/view.ts:63, src/fyd/preview/pipeline.ts:112). Real object data, fail-closed. Decorative placement, real content. |
| 02 | /truth problem statement | MARKETING | page.tsx:238-253. A technician anecdote + "infrastructure for turning activity into durable organizational intelligence." No product state. |
| 03 | /observe loop beats (OBSERVE/REMEMBER/CONNECT/ACT/PROVE) | EXPLANATION (with maturity labels) | page.tsx:36-105, 258-310. Prose cards with MaturityLabel; claims audited separately in Q25. |
| 03b | KnowledgeLoop diagram | DECORATION | src/components/architecture/knowledge-loop.tsx. useEffect animation only; no fetch; hardcoded steps. |
| 03c | BusinessGraph ("See your business") | INTERACTIVE ILLUSTRATION (not real data) | src/components/architecture/business-graph.tsx. Clickable nodes/edges, but NODES/EDGES are hardcoded constants (customer→event→lead→project…), not the tenant graph. Teaches the concept; shows no real business. |
| 04 | /govern authority layers (DEFAULT DENY / SCOPED GRANTS / AUDIT AND REPLAY) | EXPLANATION | page.tsx:107-129, 317-350. Prose with maturity labels. |
| 04b | "IntelligenceWorker: OFF" box | EXPLANATION | page.tsx:352-365. Honest posture note. |
| 04c | AgentAuthority diagram | DECORATION | src/components/architecture/agent-authority.tsx. Animation only. |
| 04d | TenantModel + tenancy frame | DECORATION + EXPLANATION | src/components/architecture/tenant-model.tsx (animated model, hardcoded) + page.tsx:368-395 prose. |
| 05 | /prove receipt cards ("Every answer comes with receipts") | STATIC PROOF DISPLAY (interactive promise unfulfilled) | page.tsx:403-460. Section heading says "Tap through the lineage: the observation, the event, the mission it caused, the workers that ran" — the cards are static `<dl>` markup with NO links; nothing is tappable. IDs are real (traced in Q23) but the page does not route them anywhere. |
| 05b | ReplayEvidence diagram | DECORATION | src/components/architecture/replay-evidence.tsx. Animation only. |
| 06 | /run MultiRuntime | EXPLANATION (hardcoded) | src/components/architecture/multi-runtime.tsx:13-22. Runtime cards are hardcoded constants with maturity labels; no live status reads. |
| 07 | /applied PING Social + benefit cards | MARKETING | page.tsx:476-530. "Fewer missed opportunities / Less busywork / Humans in control" — benefit claims, no proof attached. |
| 07b | "From the build" changelog | HARDCODED SNAPSHOT OF REAL COMMITS (stale) | page.tsx:132-136. Hardcoded 3 entries from 2026-09-16; hashes verified real in /home/nolan/ping (c5f7808b2, 813364025, 15d0a9b83). The copy says "this feed shows real recent entries" and "A stale journal is worse than none" — but the array is static, so it goes stale by construction. |
| 08 | /status "What is real" strip | EXPLANATION (prose status claims) | page.tsx:111-129, 537-565. Maturity-labeled prose assertions; audited in Q25. |
| 09 | /follow newsletter | LIVE PRODUCT STATE (functional) | NewsletterSignup posts to src/app/api/newsletter/subscribe/route.ts — a real working API route (validates email, syncs via @/lib/kit, logs event). |
| 10 | CTASection ("Talk to us about your business.") | MARKETING (functional link) | src/components/cta-section.tsx. Link to /contact works; copy is marketing. |

## Verdict

PROPOSITION: "Which homepage section shows an illustration followed by more marketing copy instead of inspectable product state?"
STATUS: FAIL (partial). The /prove section (05) is the hit: it shows receipt cards and says "Tap through the lineage" while offering zero tappable lineage — the IDs terminate on the page. The hero's "Live" gateway badge is a hardcoded snapshot wearing a live indicator (hero-evidence-card.tsx:100-114). The "From the build" feed is a hardcoded 3-commit array labeled as a live feed. The only truly live product-state sections are the PortalHost object margins and the newsletter form.

SMALLEST FIX IF FAIL: (1) make receipt-card IDs actual links to their lineage view (or change the heading to stop promising "tap through"); (2) delete the pulsing-green "Live" badge or wire it to a build-time probe with the probe timestamp; (3) generate the changelog from git at build time instead of a hardcoded array.

## Evidence locations
- page.tsx.txt, hero-evidence-card.tsx, business-graph.tsx, multi-runtime.tsx in this dir
- Full file: ~/workspace/gaps/swarm/product/worktree-audit/page.tsx.txt
