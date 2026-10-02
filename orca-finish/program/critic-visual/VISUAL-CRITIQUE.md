# VISUAL CRITIQUE — ORCA FINISH, CRITIC-VISUAL

Date: 2026-09-23 ~21:10 MDT. Read-only. Website repo not touched; no commits.
Method: source read + artifact inspection. No live browser (unavailable to this lane); never claimed a visit.

## Access limits (honest, not hidden)

- The Pig repos (/home/nolan/ping, /home/nolan/projects/ping) are not mounted in this sandbox and SSH to the Pig (muse-ssh@100.79.154.43) is blocked from here (operation not permitted). I could NOT re-verify the C7 audit's file:line citations against live source. Where I cite C7's quoted code, the grade is CITED (from the audit), not independently re-verified.
- No rendered run-observability UI exists in either repo per C7. So "what the viewer sees" for most Mission Control items is the JSON consumer's view, plus one chat-header UI.

## Verdicts: C7 Mission Control syntheses

### 1. ExecutiveDashboard `|| 0` defaults — SYNTHETIC, trending MISLEADING
- Quoted code (CITED): `closure_rate`/`engineering_velocity`/`worker_efficiency` evaluate to `0` when there is no data (`(mergedCount + rejectedCount) > 0 ? ... : 0`); every report field is `|| 0`-defaulted when its source object is absent.
- What a viewer sees: a dashboard panel reading e.g. "Closure rate: 0%". That renders as a measured zero. The honest state is "no merge data exists." A viewer cannot tell the difference, which is the definition of misleading presentation. It is not a hardcoded fake number, it is a synthesized value where the honest answer is no-data. C7's own sibling standard (mission_control.js: empty widget + precise upstream reason) already shows the honest pattern.
- Open question for C7: the consumption path of ExecutiveDashboard.generate() is unstated in the audit. If no UI consumes it and only JSON readers see it, the mislead lands on API consumers; the audit should name the consumer.

### 2. MissionControlHeader.tsx Math.random() latency — MISLEADING (fabrication)
- Quoted code (CITED): `// Simulate runtime updates`, `latency: Math.random() * 100 + 50`, `contextUsage: Math.random() * 4096`, hardcoded `model: 'qwen3-coder'`, `gateway: 'healthy'`, `ollama: 'connected'`.
- What a viewer sees: a header with fluctuating latency numbers that look measured and health badges that assert gateway/ollama state. All of it is fiction. The comment says "simulate" in source, but the render surface shows no such disclaimer, so the viewer is not told.
- Scope honesty: this is the chat UI header, not run observability, and it is the only "Mission Control"-named UI surface. That scoping is correct and important: it does not mislead about RUNS, it misleads about RUNTIME HEALTH. Verdict stands at its own scope.

### 3. Hardcoded `scope` literals in stats — SYNTHETIC, low severity
- Quoted code (CITED): `mission_runtime.getStats()` appends `scope: 'persistent'`; scheduler/worker/bridge append `scope: 'session'`. Literals, not queried.
- What a viewer sees: a provenance claim ("this stat comes from persistent storage" / "session scope") that is asserted, not measured. If the underlying storage ever changed, the label would be wrong and nothing would catch it. Low severity, but it is asserted provenance: SYNTHETIC, not HONEST.

### 4. /mc/dashboard negative-clamp — MISLEADING (masks anomalies)
- Quoted code (CITED): `for (const k of Object.keys(business)) { if (business[k] < 0) business[k] = 0; }`
- What a viewer sees: always-coherent non-negative business metrics. A negative value (e.g. more INVOICE_PAID than INVOICE_SENT) is a data-integrity anomaly signal, and the clamp destroys it before the viewer can see it. The same endpoint honestly reports truncation metadata, so the clamp is inconsistent with its own honesty standard. SYNTHETIC at minimum; MISLEADING because it actively hides the signal that would tell a viewer the underlying event stream is inconsistent.

## Verdicts: FYD visual claims

### Mobile object experience — claims vs render path
- The patch scripts in ~/workspace/fyd/mobile-fix are the best available record of render-path intent (the website repo itself is unreadable from here):
  - `margin-layer-fix.py`: OLD render = fixed edge tab (`fixed right-0 top-1/2`, dots + count). NEW render (per that patch) = ONE in-flow full-width "All objects (N)" button after the hero, no fixed UI.
  - `remove-all-objects.py`: LATER binding directive (Nolan, 2026-09-23) reverted that too. Mobile projection now renders NOTHING customer-facing; the MobileSheet survives only behind `?objectDebug=1`.
- Falsification: any document or claim still describing the in-flow "All objects (N)" trigger (or the constellation/dock/bottom-sheet) as the current customer-facing mobile UI is STALE. The FYD-MOBILE-OBJECT-EXPERIENCE-REBUILD-2026-09-23.md design doc describes the constellation/dock; the All-objects control portion of that design is superseded by the later removal directive. Desktop margin-plane render is unaffected per the same directive.
- The W2 HTML artifacts (below) are /sites/* tenant pages, NOT the PING homepage, so they contain no MarginObjectLayer and cannot confirm or deny the constellation render path. The constellation render path is UNVERIFIED from this lane and goes on the follow-on queue.

### /o object page rendering symptom (seam owned by CRITIC-SECURITY)
- Per QA-HOSTILE (cited, not re-run): `website: "javascript:alert('A35')"` rendered as a LIVE `<a href="javascript:alert('A35')">Website</a>` end-to-end; `<img src="javascript:alert('A44')">` rendered on the hero. What a viewer sees: a normal-looking "Website" link that executes script on click. Render-path fact, one line, no further comment; the seam itself is security's.

## Verdicts: other lanes' visual claims

### P-7 inflated closureRate on GET /orchestration/engine — MISLEADING
- Per phantom-hunt PHANTOM-REGISTRY.md (P-7) and critic-security F1: `startAutonomousLoop()` fabricates findings inline (hardcoded `confidence: 0.85`, `bypass_type: 'auto_scan'`, `line: 0`), runs real consensus over them, and the dashboard closure rates are computed over fabricated completions. A viewer of `GET /orchestration/engine` sees an inflated `closureRate` presented as a measured metric.
- Grade: reported LIVE by other lanes (redteam F1 repro shape). Independent re-verification from this sandbox is blocked (Pig unreachable). The claim is internally consistent across two lanes; kept in registry pending live re-proof.

### Repo-local evidence dirs presented without synthetic marking — MISLEADING
- Per critic-security SECURITY-CRITIQUE.md: `event_queue/` and `artifact_store/` under ping-runtime/orchestration/ are presented as evidence (proposals, consensus artifacts, "replay proofs"), reload on restart, and nothing marks fabricated outputs synthetic. A consumer reading those files cannot distinguish fabricated from real. Render/presentational verdict: MISLEADING.

## W2-MISSIONS HTML artifacts — real output, not mockups

Files: ~/workspace/orca-finish/wave2/missions/artifacts/coppersmith-plumbing.html, happy-place.html (~74KB each).

- VERDICT: real captured server-rendered output. Evidence (STATIC, inspected in this session): Next.js SSR flight payload with real chunk hashes (`app/sites/coppersmith-plumbing/page-567a17b4664048b3.js` vs `app/sites/happy-place/page-4a75e4e37b26cd48.js`), embedded SiteSpec + object-graph + provenance JSON ("Generated from website-ingestion graph objects. All claims are website_statement, not verified fact."), live media-derivative preloads (`/fyd-media/db347abf.../card-768w.webp`), and honest surface labeling ("Generated site demo", "Procedural clone proof"). This matches DRY-RUN-REPORT.md: fetched from the live demo server ~2026-09-23 20:00 MDT. NOT mockups.
- Caveats a viewer must know:
  1. Snapshot of an UNPINNED build: demo server on fyd-factory @ e48ef710 with 83 dirty files (per dry-run report). Not reproducible from a pinned commit.
  2. happy-place.html: ZERO `<img>` tags, `heroMedia: null` in the embedded spec. The Happy Place generated site renders with no imagery at all. Confirms factory VQ-004 (zero media) statically for this snapshot. Any claim that the Happy Place demo shows media-backed generation is FALSE for this artifact; the render PASS verdict was about spec validation, not visual quality.
  3. Motion-gate mechanism PRESENT in served markup (both files): `.fyd-io [data-motion='enter'].fyd-io-pending { opacity: 0; transform: translateY(16px) }` with JS-driven `.fyd-inview` release. VQ-001 (motion gates content) mechanism confirmed statically; whether content is actually hidden without JS is runtime-only and NOT statically verifiable (consistent with the dry-run report's correction).
  4. These are /sites/* demo pages, not the /o object page: the XSS seam is not exercised here, and MarginObjectLayer is absent.

## SYNTHETIC / MISLEADING registry

| # | Render path | Verdict | What viewer sees vs truth | Grade | Status |
|---|---|---|---|---|---|
| R-1 | ExecutiveDashboard closure/velocity `|| 0` | SYNTHETIC / MISLEADING | "0%" metrics read as measured zero; truth is no-data | CITED (C7 audit) | Open: fix or re-back |
| R-2 | MissionControlHeader.tsx random latency/health | MISLEADING | Fluctuating latency + health badges, all fabricated | CITED (C7 audit) | Open |
| R-3 | getStats() `scope` literals | SYNTHETIC (low) | Asserted provenance, not measured | CITED (C7 audit) | Open |
| R-4 | /mc/dashboard negative-clamp | MISLEADING | Coherent metrics; anomaly signal destroyed | CITED (C7 audit) | Open |
| R-5 | P-7: GET /orchestration/engine closureRate | MISLEADING | Inflated closureRate over fabricated 0.85 findings | Reported LIVE (phantom/security) | Awaiting live re-proof |
| R-6 | event_queue/artifact_store as "evidence" | MISLEADING | Fabricated vs real indistinguishable, no synthetic marking | CITED (critic-security) | Open |
| R-7 | happy-place.html "generated site" | HONEST-as-render, MISLEADING-if-claimed-media-rich | Real render; zero images, heroMedia null | STATIC (this session) | Recorded |
| R-8 | FYD docs describing All-objects trigger/dock as current UI | STALE | Later directive removed it; mobile renders nothing customer-facing | STATIC (patch scripts) | Recorded |
| R-9 | /o page "Website" link (A35) | MISLEADING render symptom | Normal-looking link with javascript: href | CITED (QA-HOSTILE) | Security's seam |

HONEST confirmations (kept for balance): /mc PG-backed routes fail closed (503/degraded/404) per C7; dead-letter 404 honest; /mc/dashboard truncation metadata honest; W2 artifacts honestly labeled "Generated site demo"/"Procedural clone proof" with website_statement provenance.

## Follow-on queue

1. Constellation/dock desktop render path: unverified (Pig unreachable). Re-check MarginObjectLayer.tsx desktop branch when access returns.
2. ExecutiveDashboard consumption path: does any UI render it, or only JSON readers? Ask C7 lane.
3. P-7 closureRate: live re-proof when Pig access returns (F1 repro shape on file).
4. Any new visual claim ("dashboard shows X", "projection renders Y") landing in orca-finish: inspect render path, verdict, registry append.
5. FYD docs hygiene: flag any doc still describing the removed All-objects mobile trigger as current.
