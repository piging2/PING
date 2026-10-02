# Harvest Deduplication Contract

Standing order from Nolan, 2026-09-25 ~14:45 MDT.

## The rule

One candidate, one pinned SHA, one license record, many mechanisms.

- A **candidate** is a repository identity: canonical `owner/repo`.
- A **mechanism** is something harvested from that repository
  (an algorithm, pattern, compatibility law, SDK, extraction strategy).
- A **label** is not a candidate: "Lexicons", "ActivityPub", "Nostr" are
  mechanisms or protocol names. They live in the owning repository's
  `mechanisms` / `aliases` arrays. They never create new candidate rows.

## Primary dedup key

Canonical repository identity, normalized by `dedup.py`:

- case-insensitive (`UNCLECODE/crawl4ai` == `unclecode/crawl4ai`)
- URL or bare form accepted
  (`https://github.com/owner/repo` == `owner/repo`)
- trailing `/` and `.git` stripped

## Fail closed

If one repo identity carries more than one distinct pinned SHA, or more
than one distinct license record, `dedup.py` aborts with `DedupConflict`
instead of choosing silently. A human resolves the conflict in
`candidates.json`, then the run is repeated.

## SHA policy

- A pin is a full 40-character lowercase hex commit SHA, verified against
  the live repository (GitHub commits API, same day as the report).
- The pin is the contract, not moving HEAD. If the default branch has
  advanced past the pin, the pin is kept and the advancement is noted in
  `license_evidence`.
- A SHA that cannot be verified is recorded as `UNVERIFIED`, never invented.

## License policy

- Each candidate carries exactly one license record, verified against the
  live repository's license endpoint (or the root license file where the
  API cannot classify, e.g. dual licensing).
- Standing classifications: Firecrawl core AGPL-3.0, ATProto Lexicons
  research material, Granary CC0, Temporal MIT donor-only, n8n Sustainable
  Use watch-only, PostHog path-level.

## Scorecard

Derived only from the deduped unique records. Old-versus-new counts:
the "old" count is the raw input row count. If no source ledger of the
raw input survives, the old count is reported as unverifiable, not
reconstructed from prose.

## Files

- `candidates.json` — the canonical machine-readable registry (the living
  CANDIDATES table the intake note calls for).
- `dedup.py` — the deterministic dedup/scorecard implementation.
- `test_dedup.py` — fixture tests proving aliases and protocol labels
  collapse, shadows never become rows, conflicts fail closed.
- `reports/` — human-readable passes, regenerated from the registry.
