# LANE D — WEB ACQUISITION — STATE

Mission: keep the proven acquisition pipeline; escalate HTTP -> JSON-LD/OG/META
-> HTML -> browser -> intelligence only where needed. P0 (2026-09-23 steering):
HOSTILE-INPUT-CONTRACT.md for the FYD 500-site factory's crawl workers.

Status: PROVEN (ladder formalized, spike proven on 3 real sites, red team
23/23; no repo writes — research artifacts only, per operating model).

## Ledger

- RESEARCHED 2026-09-23: full read-only archaeology of PING's acquisition surface.
  `src/fyd/proceduralize/ACQUISITION-STACK.md` already documents the L0-L4
  escalation design, egress policy, AcquisitionAdapter types, and a crawl4ai
  0.9.3 / Playwright 1.63.0 evaluation (HARVEST engine design, REJECT Docker
  server / LLM extraction / proxy escalation / robots-off default).
  `src/fyd/acquisition/acquisition-adapter.ts` is types-only; no L0-L3
  implementation exists yet.
- RESEARCHED 2026-09-23: `src/fyd/net/` is the ONE canonical fetch gate:
  safe-fetch.ts (SSRF: scheme allowlist, per-hop DNS re-resolution, IP
  blocklist incl. 169.254.169.254 and CGNAT, max 5 manual redirects,
  content-type allowlist, content-length pre-check + streaming abort;
  defaults 15MB/20s; safeFetchPage text/html 5MB), budgets.ts
  (CrawlBudget/OriginSemaphore/DedupCache), rate-limit.ts
  (TokenBucket/GenerationQuota/AnonymousGate).
- RESEARCHED 2026-09-23: extraction surface: onboarding/extractor.ts
  (regex, strips script/style, bounded loops), refresh/website-observe.ts
  (heuristic claim facts, pure function), proceduralize/structured-data.ts
  (jsonld library, never hand-rolled). Playwright ^1.63.0 is a devDependency;
  its only in-repo user is preview/capture.ts (manual screenshot script for
  authorized sites; regex-only URL check; not hostile-safe).
- RESEARCHED 2026-09-23: gaps found: no worker/process isolation, no
  robots.txt honoring in the fetch path, no PDF handling, no parse-stage
  resource caps, no scratch-sandbox filesystem policy, no anti-bot/CAPTCHA
  doctrine in code.
- IMPLEMENTED 2026-09-23: HOSTILE-INPUT-CONTRACT.md v1 (P0 deliverable):
  testable bounds F1-F12 / P1-P8 / R1-R6 / D1-D7 / S1-S5 / E1-E5 / C1-C4,
  minimum viable hardened boundary (separate OS process, one fetch gate,
  narrow typed IPC, per-run scratch sandbox, robots honored, browser only
  at L2, PDFs rejected by default), every violation mapped to the lane-K
  13-class taxonomy with never-silent records, failure-mode doctrine
  (bot detection/CAPTCHA/cookie walls/infinite scroll recorded as blocked,
  never bypassed), fixture requirements for lane R.
- IMPLEMENTED 2026-09-23: ESCALATION-LADDER.md v1 — reconciles Nolan's
  ladder vocabulary (HTTP -> JSON-LD -> HTML -> browser -> intelligence)
  with PING's L0-L4. New connective tissue: explicit sufficiency predicate
  with typed gaps, per-rung input hashing + CONTENT_CHANGED fail-closed,
  conflict rule (structured vs visible claims both preserved, never
  silently adjudicated at fetch time), per-rung cost budgets, R4/R5/R6 as
  typed decision points (R4 execution delegated to the factory).
- IMPLEMENTED 2026-09-23: SANITIZATION-BOUNDARY.md v1 — the exact line raw
  bytes cross to become observations: extraction rules, contact-fact
  precedence (tel:/mailto: > JSON-LD > body regex), URL canonicalization,
  robots/ToS respect, parse caps, redirect/meta-refresh/compression-bomb
  doctrine, prompt-injection boundary, 5 testable invariants.
- IMPLEMENTED 2026-09-23: spike/ (ladder.mjs, run-acquire.mjs, probe.mjs,
  redteam.mjs) — minimal deterministic ladder mirroring PING's proven
  components (safe-fetch.ts semantics, jsonld 9.0.0, extractor.ts
  semantics), injectable DNS/fetch deps for fixtures. Research artifact;
  NOT a repo write.
- PROVEN 2026-09-23: 3 real business sites acquired read-only via the
  ladder on production-like egress (PROOF-3-SITES.md). Coppersmith Plumbing
  (FYD demo): R0->R1->R2 terminal, Rank Math @graph expanded by the jsonld
  library (name + telephone "970-245-3869"), no escalation. Happy Place
  Carpentry (FYD demo): R0->R1->R2 terminal (name + phone from JSON-LD),
  no escalation. stan.store: R0->R1->R2->R3->R4 escalation-decided on
  typed CONTENT_BEHIND_CLIENT_RENDER (empty `<div id="app">` shell);
  byte-identical evidenceHash across runs 30 min apart (determinism
  invariant holds). Bonus: vagaro.com + linktr.ee R0 robots blocks;
  cava/warbyparker/beacons.ai 403s typed BLOCKED with zero bypass attempts.
- PROVEN 2026-09-23: red team 23/23 (REDTEAM.md) — injection, refresh
  loops, 10MB HTML, gzip bomb, 6-hop chains, DNS-rebinding to
  169.254.169.254, javascript: redirects, fake JSON-LD vs visible content
  (both preserved, CONFLICTING_SOURCES flagged), 404 mid-ladder (terminal,
  never escalates), inter-rung content mutation (CONTENT_CHANGED detected).
  The red team caught 3 real spike bugs (jsonld.flatten returns an array,
  not @graph; hop-gate rejections must be terminal; JS-marker regex missed
  `<div id="app">`) — all fixed and re-verified.
- HARVESTED 2026-09-23: HARVEST-REPORT.md — ADOPT jsonld 9.0.0
  (BSD-3-Clause, already in PING) + the ladder/boundary/conflict/hash
  machinery; ADAPT robots-parser (MIT) for the R0 robots gap + crawl4ai's
  anti-bot detection tiers + CMP consent list as factory references;
  REJECT crawl4ai-as-dependency/Docker/LLM-extraction/proxy-escalation,
  Firecrawl hot path (vendor veto: custody, determinism, cost),
  Readability (wrong tool), building a crawler platform (non-goal).
- STANDING DECISIONS absorbed 2026-09-23: (1) connector credentials queued
  for Nolan's morning; lane D needs no live credentials (fixture-driven +
  public read-only fetches). (2) Vendor veto: YES for adoption, NO for
  experimentation; the only production addition proposed is robots-parser
  (small, mature, MIT — below the veto bar); Playwright stays factory-owned.

## NEXT

1. Hand the factory: ESCALATION-LADDER.md + SANITIZATION-BOUNDARY.md +
   HARVEST-REPORT.md are the integration proposal (feature-flagged behind
   the existing AcquisitionAdapter types; no repo writes made by this lane).
   The factory writes the thin production wrapper (sufficiency predicate,
   escalation records, rung hashing, conflict flag, robots-parser).
2. Lane R: REDTEAM.md residual risks are fixture requirements — recorded
   browser fixtures for R4 and a challenge-page classifier (200-with-JS
   challenge pages currently look like CONTENT_BEHIND_CLIENT_RENDER).
3. WEB-ACQUISITION-AUDIT.md (from the earlier plan) is now largely
   superseded by PROOF-3-SITES.md + HARVEST-REPORT.md; fold any remainder
   into the factory handoff rather than a new doc.
4. Per the NO STOPPING CONDITIONS invariant: continue read-only harvest —
   next gap is the R4 worker contract (what the factory's Playwright
   worker must prove before touching hostile targets), coordinated via
   state files without duplicating the factory.

## BLOCKED

Nothing. No credentials needed. No repo writes made or pending.
Constitutional-sprint WIP untouched (separate worktree/branch; lane D
operated read-only against fyd-factory plus its own state dir).
