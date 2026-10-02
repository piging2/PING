# FYD HARVEST AUDIT — LANE C: ECOSYSTEM COMPARISON

**Date:** 2026-09-22/23 (verified 2026-09-22 ~19:36-20:30 MDT)
**Lane:** read-only audit, depth 2, no subagents spawned. No installs (per task). No repo writes.
**Method note:** Crawl4AI / Firecrawl / Lightpanda / Browser Use verdicts are **doc/version/evidence-based, no installs** — stated explicitly per the task. Only Playwright was exercised live (already the repo's installed devDep), plus static HTTP fetches. Every version below was verified against a primary source (PyPI JSON/project page, GitHub releases, vendor docs) on 2026-09-22. README performance claims were not trusted; none are cited as evidence.
**Prior art:** builds on `~/workspace/fyd-harvest/harvest-report.md` Sheets 6-7 (Crawl4AI, Lightpanda, 2026-09-21/22) and `src/fyd/proceduralize/ACQUISITION-STACK.md` / `src/fyd/harvest/PUBLIC-SOCIAL-DATA-FABRIC.md`. Those verdicts are updated here, not redone.

---

## 1. Crawl4AI — verified current: 0.9.3 (PyPI), Apache-2.0

- **Version:** 0.9.3, current on PyPI as of 2026-09-22 (PyPI project page: "Check out latest update v0.9.3"; no 0.9.4+ published). Source: https://pypi.org/project/crawl4ai/
- **License:** Apache-2.0 (stated on the PyPI project page: "This project is licensed under the Apache License 2.0").
- **What changed in 2026 (security hardening history, from release blogs + CHANGELOG):**
  - 0.8.7 (Jun 2026): security-hardening release — AST sandbox escape RCE, hook sandbox RCE, hardcoded JWT secret, SSRF on webhook and crawl endpoints, arbitrary file write, monitor auth bypass, stored XSS, unauthenticated JS execution. Added DomainMapper.
  - 0.8.9 (Jun 2026): **proxy-mediated SSRF patch** — the SSRF destination check validated the crawl target but not the proxy; an unauthenticated request could point a proxy at an internal IP and route the browser through it (cloud-metadata reachable). Fix: every proxy destination validated with the global-routability check; `--proxy-server`/`--host-resolver-rules`/`--proxy-bypass-list`/`--proxy-pac-url` in `extra_args` stripped.
  - 0.9.0 (Jun 2026): **secure-by-default Docker server** (breaking, Docker-server only): auth on by default, loopback bind, request body treated as untrusted trust boundary, hooks declarative, `output_path` replaced by artifact store, TLS verification on, CORS deny-by-default, Redis loopback+password. pip library unchanged. CHANGELOG: SSRF filter gaps closed on IPv6 transition forms (NAT64 `64:ff9b::/96`, 6to4 `2002::/16`, IPv4-mapped, `::`); `O_NOFOLLOW` symlink/TOCTOU hardening on artifact writes; **LLM credential exfiltration closed** (LLM endpoints ignore request-supplied `base_url`; `LLMConfig` refuses to resolve protected env vars via `env:`).
  - 0.9.2: maintenance (MemoryAdaptiveDispatcher leak, Docker Playground/Monitor auth, Playwright headless-shell packaging).
  - 0.9.3 (Aug 2026): security release — five coordinated disclosures, four in the PDF path sharing one root cause (`PDFContentScrapingStrategy` selectable from an untrusted Docker request body, downloading via `requests` outside the Chromium control plane): arbitrary file write, PDF-download SSRF via redirect, uncapped PDF DoS, XSS in `cleaned_html`; plus DOM XSS in the Playground (operator API token theft). New defaults: PDF cap 100 MiB / 2000 pages, `limits.wall_clock_s` 300s.
- **Watch item (vendor flag):** PyPI page now advertises **"Crawl4AI Cloud API — Closed Beta (Launching Soon)"** — a hosted crawl service. Any future use of it is a hosted-vendor dependency requiring an explicit decision. It does not affect the library verdict.
- **Assessment vs prior art:** 0.9.3 is a security/bugfix release with no architectural change since the 2026-09-21 verdict. Standing verdict **CONFIRMED**.

| Primitive | Verdict | Rationale |
|---|---|---|
| Deep-crawl dispatchers (BFS/DFS), `resume_state` crash recovery (0.8.0), `prefetch` discovery | **ADAPT (design)** | Nolan's directive: test Crawl4AI *only* for acquisition escalation (deep crawl / resume / discovery). These are the escalation primitives worth re-implementing in FYD's own bounded adapter. Already in ACQUISITION-STACK.md. |
| DomainMapper / AsyncUrlSeeder discovery patterns | **ADAPT (design)** | Standing harvest; no change. |
| Declarative request trust boundary, SSRF destination validation (incl. proxy + IPv6-transition coverage) | **ADAPT (design)** | The 2026 advisory history is a *checklist of failure modes*, not just a pattern: validate proxy destinations, pin redirects, cap PDFs, never echo resolved addresses. Adopt the checklist. |
| PruningContentFilter, Shadow DOM flattening, CMP consent list, 3-tier anti-bot *detection* (telemetry only) | **ADAPT (design)** | Standing harvest; no change. |
| pip package as a dependency | **REJECT** | Python package inside the TS runtime (subprocess/IPC), browser fleet management — architecture mismatch, already decided. |
| Docker API server | **REJECT** | Five-release advisory history of RCE/SSRF/file-write/auth-bypass on the server surface; Nolan: never expose arbitrary crawler controls. |
| LLM extraction strategies | **REJECT** | Nondeterministic; prompt-injection surface. FYD extraction must be deterministic and evidence-typed. |
| Arbitrary hooks / user scripts / `check_robots_txt=false` default | **REJECT** | Nolan's directive (never expose arbitrary crawler controls) + fail-closed posture. |
| Crawl4AI Cloud API (closed beta) | **REJECT / explicit decision flag** | Hosted-vendor dependency. No evaluation without Nolan's explicit call. |

- **Dependency weight:** N/A under rejection (design harvest only).
- **Security effect:** net positive as a *negative template*: the 2026 advisories enumerate exactly the SSRF/file-write/credential-exfiltration classes FYD's own adapter must be built against.

---

## 2. Firecrawl — verified current: v2.11.0 (GitHub releases), core AGPL-3.0 / SDKs MIT

- **Version:** v2.11.0, top of the releases page as of 2026-09-22 (no newer tag). Source: https://github.com/firecrawl/firecrawl/releases
- **License:** core **AGPL-3.0**; specified SDKs and UI components MIT. Hosted service at firecrawl.dev under commercial ToS. (Corroborated by three independent third-party deployment docs; the repo carries AGPL-3.0.)
- **The primitive that matters — `deterministicJson` (new in v2.11.0):** "a format that returns structured JSON without running an LLM on every request. Firecrawl generates a reusable extractor for your schema and caches it per site, so repeat scrapes are cheaper and return consistent results." Mechanism (from the merged PR `tom/deterministic-json`): optional `schema` + `prompt` → codegen'd **reusable JS extractors**, validated, **cached in DB** (`deterministic_json_scripts`, `deterministic_json_llm_cache` tables), reused per site; sandbox execution over WebSocket (`CODE_SANDBOX_URL`) in a jsdom harness; anchor-based context builder, HTML simplifier, **selector repair**; monitors get JSON field-level diffs. Billing: deterministic JSON = 7 credits/page vs plain JSON = 5/page vs base scrape = 1/page. Available on `/v2/scrape`, `/v2/batch/scrape`, `/v2/crawl`, `/v2/parse`, `/v2/extract`.
- **Comparison to FYD's desired loop (UNKNOWN SITE → intelligence learns → deterministic recipe → replay → failure → relearn):** this is the **closest existing implementation of that loop** found in this lane. Map: UNKNOWN SITE → first request runs the codegen model (expensive, LLM) → deterministic JS extractor cached per site (the "recipe") → repeat scrapes replay it with no LLM (cheap, consistent) → failure → selector repair / relearn. Differences that matter for FYD: (a) the recipe is *theirs* (opaque, vendor-held, billed per replay); (b) learning cost is denominated in Firecrawl credits, not FYD-controlled compute; (c) schema is caller-supplied but the extractor is not inspectable/portable; (d) failure→relearn is their black box, not evidence-typed. FYD wants the same *shape* with FYD-owned, inspectable, evidence-typed recipes.
- **Other 2026 moves (context):** `/parse` endpoint, Lockdown Mode (zero-egress, zero-retention), `question`/`highlights`/`video` formats, `redactPII`, `/interact` browser sessions with raw `cdpUrl` handoff, keyless access for core endpoints (IP-capped), official Go/Rust/PHP/Ruby/.NET SDKs, monitor field-level JSON diffs.
- **Hosted-vendor implications (explicit decision flag):** Firecrawl Cloud = API key, credit metering (Hobby $16/5k credits; deterministic JSON 7 credits/page), ToS + privacy policy, crawled data transits vendor infra, model fallback chains on their side. Self-host = AGPL-3.0 with §13 network obligations if served, ~5-8 containers (API, Playwright workers, Postgres, Redis, RabbitMQ, code-sandbox), ~1-2 GB baseline, plus an LLM provider for the codegen step. Either path is a heavyweight commitment.

| Primitive | Verdict | Rationale |
|---|---|---|
| deterministicJson loop shape (learn-once → cached deterministic extractor → cheap replay → repair-on-failure) | **ADAPT (design)** | **Highest-leverage ADAPT in this lane.** The pattern is exactly FYD's learn-once-replay-cheap loop; FYD should design its own recipe store (site + schema → versioned deterministic extractor → replay → failure evidence → relearn) with FYD-owned, inspectable artifacts. Pattern only — zero Firecrawl code. |
| Selector-repair-on-failure as an explicit recipe lifecycle state | **ADAPT (design)** | FYD's proceduralizer should type this: recipe VALID → STALE (repaired) → RELEARN, with evidence attached, not silent retries. |
| `/map` domain discovery, `redactPII` (PII stripping pre-return), Lockdown Mode (zero-egress option) | **ADAPT (concepts)** | Discovery shape matches the escalation ladder; PII redaction and an egress-off mode are good *requirements* for FYD's adapter, implementable in-house. |
| Hosted API / SDK as a dependency | **REJECT / explicit decision flag** | Hosted-vendor dependency: credit meter, data egress, ToS. Not evaluated without Nolan's explicit call. |
| Self-hosted Firecrawl code | **REJECT** | AGPL-3.0 (§13) + multi-container operational weight + still needs an LLM provider. Fails "boring infrastructure" and license posture. |

- **Dependency weight:** heavy (vendor meter or 5-8 containers + LLM). Rejected as a dependency; the design harvest costs nothing.
- **Security effect:** positive as pattern source (redactPII, Lockdown Mode, sandbox'd extractor execution are the right *requirements* for FYD's adapter).

---

## 3. Lightpanda — verified current: nightly builds (no stable semver), browser repo AGPL-3.0

- **Version:** distribution is **nightly builds** (docs: `https://github.com/lightpanda-io/browser/releases/tag/nightly`); the nightly tag currently resolves to commit `8ec22ca` ("dom: implement MutationObserver", merge PR #246). **No 0.4.x found on the releases page** — the task premise could not be confirmed from primary sources; the only versioned reference found was a third-party doc citing native release v0.2.6, and the npm `@lightpanda/browser` wrappers (1.x) are client wrappers from a different repo. Treat as: nightly-only, beta, explicitly "work in progress" upstream.
- **License:** browser repo **AGPL-3.0** (GitHub org listing); JS/Python/Go client SDKs Apache-2.0. Telemetry **on by default** (`LIGHTPANDA_DISABLE_TELEMETRY=true` to disable) — must be disabled if ever used; a product crawling real small businesses cannot phone home usage data.
- **CDP + WebDriver BiDi:** confirmed in the 2026 changelog — "WebDriver BiDi support (with a `[classic]` WebDriver start); protocol selection via CLI; both CDP and BiDi can be served on the same port." Plus Playwright/Puppeteer-compatible CDP, native MCP server.
- **PandaScript (the saved-script hypothesis test):** **confirmed from docs** — `lightpanda agent` drives the browser via LLM (or `--no-llm` REPL); "The output of an agent session is a **PandaScript**: vanilla JavaScript with a small set of native browser primitives built directly into Lightpanda. Run `/save` to export one from your current session, then replay it with `lightpanda agent <script>.js`. Scripts are **deterministic and token-free**, so you can prototype with the LLM and ship the output to production without a model at runtime." **Verdict on the hypothesis: the shape exists today** — intelligence learns the interaction once, software replays the learned procedure. **Caveats for FYD's loop:** (1) PandaScript records *interaction flows* (navigate/click/fill), not *extraction schemas* — it is half of FYD's loop (the "how to drive" half, not the "what to extract per site+schema" half); (2) no documented selector-repair/relearn story when the site changes (contrast Firecrawl's explicit selector repair); (3) extraction primitives (`LP.getMarkdown`, `LP.getStructuredData`, `LP.getSemanticTree`) exist but the learn→cache→replay binding for extraction is the operator's job, not the product's.
- **What changed in 2026 (from release bodies):** WebDriver BiDi, HTTP WebDriver sessions, CORS (experimental), IndexedDB, `matchMedia`/custom-elements fixes, ad blocker, SQLite cache backend, `--load-resources` granularity, **breaking: iframes and workers no longer load by default** (nothing loads unless asked), `canvas.toDataURL` returns a **1x1 PNG**, **screenshots render the page's markdown (not pixels)**, CSS custom properties (basic), `obeyRobots` in `LP.configureCDP`.
- **Beta/fidelity caveats that block foundational use:** partial Web API coverage (MutationObserver landed ~this week); screenshots are text renders, not pixel evidence — useless for FYD visual checks; no headed mode; no persistent profiles/extensions; iframes/workers/stylesheets off by default changes page behavior vs real browsers; no Windows binary (Pig is Windows-native for headed work); Cloudflare/managed challenges not defeatable (correct per fail-closed posture, but limits the corpus); telemetry default-on; AGPL-3.0.
- **Standing:** HELD benchmark (Nolan's 2026-09-21 trigger) unchanged. PandaScript does not overturn "benchmark-vs-real-failures only, not foundational."

| Primitive | Verdict | Rationale |
|---|---|---|
| PandaScript concept (learn-once → saved deterministic procedure → token-free replay) | **ADAPT (design)** | Second independent witness (with Firecrawl's deterministicJson) that the learn-once-replay-cheap loop is the right shape. FYD's own recipe store should steal the *contract* (deterministic, no model at runtime) while FYD owns extraction-schema binding + repair. |
| `LP.*` native extraction commands (getMarkdown / getStructuredData / getSemanticTree / getInteractiveElements) | **ADAPT (vocabulary)** | A clean extraction-primitive vocabulary to compare FYD's adapter output shapes against. Nothing to import. |
| `obeyRobots` in the CDP surface | **ADAPT (requirement)** | FYD's adapter should carry robots compliance as a first-class, non-optional flag. |
| Lightpanda as an acquisition engine (default or foundational) | **REJECT** | AGPL-3.0, beta fidelity gaps (markdown screenshots, 1x1 canvas, resources off by default), telemetry default-on, no Windows binary. Stays a trigger-gated benchmark candidate only. |
| PandaScript files as FYD recipes | **REJECT** | Interaction-flow scripts, no extraction-schema binding, no documented repair-on-change story, tied to the Lightpanda runtime. FYD recipes must be engine-neutral, evidence-typed, FYD-owned. |

- **Dependency weight:** low technically (single static binary, CDP-compatible) but the license + telemetry + beta terms dominate.
- **Security effect:** neutral as a held candidate; positive as a design witness. If the trigger ever fires, the benchmark must disable telemetry first and measure *observation fidelity* (not vendor speed claims — 9x/16x are Lightpanda's own benchmarks, not trusted).

---

## 4. Browser Use — verified current: 0.13.10 (PyPI), MIT

- **Version:** **0.13.10** is the current release (PyPI JSON `release_url` points at `https://pypi.org/project/browser-use/0.13.10/`). Source: https://pypi.org/pypi/browser-use/json
- **License:** **MIT** (PyPI classifier + README: "This open-source library is licensed under the MIT License").
- **What it is (verified from README + PyPI metadata):** Python (≥3.11) library + CLI that lets an LLM agent drive a browser: opens pages, clicks, types, fills forms; custom tools via `Tools()`; skill install for agent CLIs (`browser-use skill install`); integrations/docs/MCP (`mcp==2.1.1` in deps); 35 direct deps including `browser-harness`, `cdp-use`, `bubus` (event bus), `posthog` (**telemetry in the dependency set**), `browser-use-sdk` (their cloud SDK). Cloud story is prominent: ChatBrowserUse models, managed cloud browsers ("leading stealth, proxy rotation"), fully-hosted cloud agent with "Best stealth with proxy rotation and **captcha solving**", "Rerunnable scripts fetch live data, even when sites change" (cloud guide), 1000+ integrations, persistent filesystem. FAQ explicitly pushes cloud for production ("Chrome can consume a lot of memory... use our Cloud API").
- **vs FYD's loop:** Browser Use's loop is *agent-driven navigation* (LLM decides each step, every run) — the opposite of learn-once-replay-cheap. Their closest analog ("rerunnable scripts fetch live data, even when sites change") is a **cloud-hosted** feature, i.e., the replay recipe lives on their infrastructure. Nothing in the open-source library provides a cached deterministic extractor.
- **Security/vendor notes:** `posthog` telemetry bundled in the dependency set; the cloud trajectory (stealth browsers, CAPTCHA solving, "captcha solving" as a selling point) runs against FYD's fail-closed, no-circumvention posture; model processing necessarily leaves your infra unless self-hosted with local models.

| Primitive | Verdict | Rationale |
|---|---|---|
| Agent loop (LLM drives browser step-by-step) | **REJECT** | Nondeterministic by construction; contradicts FYD's deterministic escalation (static first, browser only when static evidence insufficient) and "intelligence produces data" discipline. |
| Structured output / custom tools / MCP surface | **REJECT (as dependency); pattern already covered** | Nothing here that FYD doesn't already get from the AI-SDK-shaped future intelligence lane; not worth a 35-dep Python runtime in a TS product. |
| Cloud browsers / hosted agent / "rerunnable scripts" | **REJECT / explicit decision flag** | Hosted-vendor dependency + stealth/CAPTCHA-s
...[truncated 11861 chars]