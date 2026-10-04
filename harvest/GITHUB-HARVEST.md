# GitHub Harvest Program

One high-value repo per day. Source: `~/workspace/directives/2026-10-04-backend-assault-narrowed.md` sections 15-17 (Nolan, binding, 2026-10-04).

Note: this directory also hosts the older engagement-dedup harvest (`dedup.py`, `DEDUPLICATION-CONTRACT.md`, `lanes/`, `reports/`, `research/`). That is a separate program; do not mix its artifacts with this one. GitHub harvest artifacts live in `LOG.md`, `QUEUE.md`, and `manifests/`.

## Pipeline (per repo)

DISCOVER -> LICENSE -> SECURITY -> ARCHITECTURE -> PRIMITIVES -> TESTS -> DEPENDENCY COST -> ADOPT/ADAPT/REJECT -> TINY HARVEST -> PROVENANCE MANIFEST

- DISCOVER: what the repo is, who maintains it, current version/tag, why it matters to FYD/PING.
- LICENSE: license type, commercial-use compatibility, any CLA/copyright-header concerns.
- SECURITY: known CVEs/advisories, credential handling, network behavior, supply-chain posture (pinned deps? lockfile?).
- ARCHITECTURE: how it is organized, key modules, what it owns vs delegates.
- PRIMITIVES: the reusable patterns worth stealing (the actual harvest target).
- TESTS: does it have tests, do they pass, what do they prove.
- DEPENDENCY COST: what pulling it in would cost (LOC, transitive deps, runtime weight).
- ADOPT/ADAPT/REJECT: the verdict. Rejection is a valid, good outcome.
- TINY HARVEST: if useful, extract patterns/primitives only — never whole frameworks. No authority models; PING OWNS AUTHORITY.
- PROVENANCE MANIFEST: one manifest per repo in `manifests/`, using the template.

## Verdicts

- ADOPT: take as a dependency (rare; must earn it).
- ADAPT: take a pattern/primitive, reimplemented in PING terms.
- REJECT: examined, not useful. Recorded so nobody re-examines it blindly.

Target ratio after 30 days: 30 examined / ~8 useful / ~3 dependencies / ~5 patterns adapted / ~22 rejected. Rejection is success, not failure.

## Files

- `LOG.md` — one line per repo: date, repo, verdict, manifest path.
- `QUEUE.md` — upcoming queue with one-line WHY per repo.
- `manifests/TEMPLATE.md` — manifest template (copy per repo).
- `manifests/<repo>-<date>.md` — per-repo provenance manifests.
