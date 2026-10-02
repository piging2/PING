# Notes — Comparable projects (all via index, 2026-09-15)
## 1. Chromium chrome-headless-shell
- Official separate Chromium binary for the "old headless" mode (developer.chrome.com/blog/chrome-headless-shell, quoted in a puppeteer SKILL: "does not match the behavior of the regular Chrome completely but it is currently more performant for automation tasks where the complete Chrome feature set is not needed"). puppeteer.launch({headless:'shell'}); install via `npx @puppeteer/browsers install chrome-headless-shell`; chromedp/headless-shell Docker image exists (curvegrid/testcafe-browser-provider-puppeteer-core README). Rasterisation-optimised; screenshot/PDF workloads run faster than unified headless (maket issue #28).

## 2. Crawlee (Apify)
- OSS (Apache-2.0), JS/TS + Python; ~24,392 stars; "crawler classes: BasicCrawler, HttpCrawler, CheerioCrawler, JSDOMCrawler, LinkeDOMCrawler, PuppeteerCrawler, PlaywrightCrawler, AdaptivePlaywrightCrawler with shared autoscaling, proxy, session, queue, dataset infra" (api-evangelist/crawlee, crawled 42 days before 2026-09-15). Rule of thumb: start with CheerioCrawler (no JS), escalate to PlaywrightCrawler (openclaw/skills crawlee SKILL). ~80,765 npm weekly downloads; launched on HN 2022.

## 3. Browserless
- Cloud/self-hosted managed headless Chrome: connect over CDP with `wss://<key>@chrome.browserless.io` — zero session-creation API overhead; sessions close when CDP drops (medium.com/tech-stackups benchmark article, Feb 2026). Self-host: `docker run -p 3000:3000 ghcr.io/browserless/chromium` (n8n-automation README). "Safest default if you need full browser control at production scale... and a self-hosting path" (Medium @kevinmenesesgonzalez, Aug 2026).

## 4. Steel.dev
- Open-source browser API for AI agents (Apache 2.0), ~7,200 GH stars / 939 forks; self-host single `docker run` on :3000 with session-inspection UI; clients for Browser Use, LangGraph, CrewAI, Pydantic AI, Mastra, Stagehand. Built-in CAPTCHA solving, cookie/localStorage persistence, session up to 24h, avg session start <1s same-region (sourceforge listing + Medium @alexanie Jul 2026). Pricing conflict: scored.tools (Best AI Browser Automation Tools 2026) says Steel Cloud from $29/month; sourceforge says $99/month. Report the disagreement.
- Caveat: Selenium integration lacks some features of CDP sessions API (Medium @alexanie).

## 5. Browserbase
- Managed stealth Chromium for AI agents: configurable fingerprinting, automatic CAPTCHA solving, proxies, live session view/replay, logs+network (sourceforge listing). Starting price $39/month per sourceforge (third-party; verify on official site). Ranked "best-in-class stealth" (scored.tools 2026).

## 6. Firecrawl (bonus)
- Scraping API; "automatically spins up a headless browser when JS rendering is detected, with no extra configuration"; zero-selector ML/NLP extraction to JSON/Markdown; global cache; managed proxies (dev.to/apify Firecrawl vs Apify, ~400 days old).

## Context: Lightpanda login-bridge
- dev.to/raknaos (2026-09, 7 days before read): community "Lightpanda Session Bridge" forwards cookies over CDP from a logged-in Chrome into Lightpanda — evidence the community sees Lightpanda's login limitation as real, and a workaround pattern (treat cookie-relay as SSRF-risky; don't blindly adopt).
