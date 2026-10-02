# Facebook read-path fallback — DESIGN ONLY (2026-09-26, Stream E)

No implementation against production. No browser driving from this stream.
Stefi stays quarantined. Classification stays PROVIDER_READ_PATH_DEGRADED
(never reframe as an account block).

## Read-surface inventory (probed 2026-09-26 ~12:15 MDT, read-only)

| Surface | Status | Notes |
|---|---|---|
| `groups posts` (stefi proxy) | DOWN, HTTP 500 server-side | Preferred enumeration path. Degraded probe target. |
| `timeline fetch` | DOWN, HTTP 403 server-side | Preferred enumeration path. |
| `feed newsfeed` | ALIVE | Ranked algorithmic feed. Observed content is national/global (Chicago Bulls, Bitcoin Magazine, Shift4) — NOT local-business. No dependable programmatic locality filter: `profile info` 403s on viewer-gated profiles. |
| `feed friends` | ALIVE | Friend posts only. Eligible for likes only per standing rules (no comments on personal profiles). Low outreach value. |
| `saved list` | ALIVE but stale | Pool is 2018 saves. Not a viable candidate source. |
| `post read --url` | Assumed usable (same read family) | Validation primitive. Needs a verification probe before use. |

## Recommended fallback, in trust order

### 1. URL-injection fallback (highest trust) — RECOMMENDED for design approval

- Candidates are post URLs observed elsewhere (Pig browser session, researcher-pasted
  links). Nothing is guessed, scraped, or constructed.
- Each URL validated read-only via `post read --url`: must resolve to a real post.
  Unresolvable URLs are dropped, never retried as IDs.
- Validated candidates flow through the UNCHANGED pipeline: never-re-engage guard →
  intent ledger (refuse honored) → Pig driver with existing pacing and halt-on-restriction.
- Fallback trust gate before ANY engagement from this source: 3 consecutive successful
  `post read` validations + guard-eligible + normal eligibility rules (local business
  Pages, comment voice). Caps at HALF the current pass caps while on fallback.

### 2. Newsfeed fallback — NOT RECOMMENDED without Nolan's explicit approval

- `feed newsfeed` enumerates real observed posts (no guessed IDs), paginated via
  `--after` cursor, deduped by post ID. The guard and ledger still apply.
- Fatal weakness: ranked content is overwhelmingly non-local and there is no reliable
  locality signal (`profile info` 403s). Expected eligible yield is very low, with real
  risk of off-target engagement that violates the local-business-only rule.
- If ever approved: locality gate required (author Page with verifiable Colorado /
  Western Slope signal, else skip), likes only until the gate is proven, half caps.

### 3. Friends-feed fallback — likes only

- Alive and trustworthy (known authors), but eligible for likes only and low outreach
  value. Only worth it if Nolan wants any activity rather than zero.

## Requirements mapping

- No engagement until enumeration trustworthy → fallback trust gate above; engagement
  never starts on a first-seen source.
- No guessed post IDs → every candidate is observed output or `post read`-validated.
- No bypass of account safety → same driver, same pacing, same halt-on-restriction;
  no guard weakening anywhere.
- No weakening checkpoint/rate-limit guards → unchanged.
- Fallback source recorded on every observation → add optional `acquisition_source`
  to intent records (values: `stefi-groups` | `url-injection` | `newsfeed` |
  `friends-feed`), defaulting to the preferred path; also stamped on the pass-log
  section. Backward compatible (optional field).
- Automatic return to preferred path only after a successful probe → extend
  `fb-degraded-probe.py` to a two-endpoint probe: preferred (`groups posts` on the
  CO BizNet probe group) + fallback (`feed newsfeed --limit 1`). States:
  PREFERRED_OK → run normal discovery; FALLBACK_ONLY → fallback-mode pass (if a
  fallback is approved); ALL_DOWN → NOT_ATTEMPTED, no dispatch. Return to preferred
  ONLY on a successful preferred probe. Repeated identical failure keeps collapsing
  to the one cheap probe instead of the expensive pass.

## What needs Nolan's approval

1. Whether to build/activate ANY fallback vs. waiting out stefi (zero engagement is
   currently correct and fail-closed; the fallback buys coverage at review cost).
2. The newsfeed variant specifically (off-target risk; recommendation is no).
3. Fallback caps (propose half of current pass caps while on fallback).
4. The optional `acquisition_source` ledger field (reversible schema addition).
5. stefi proxy support contact vs. building the fallback — the actual decision the
   outage has been waiting on.
