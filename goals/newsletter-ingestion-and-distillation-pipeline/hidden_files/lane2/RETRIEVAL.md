# Finance digest retrieval (newsletter lane 2)

Chat agents answering "what did the finance newsletters say about X?" run this
via pigwsl-exec. Read-only; no credentials needed; no new database or authority
(all digests live in brain-postgres `ping_runtime.ping_events`).

## Why Postgres full-text search (2026-10-04)

- `brain-qdrant` / `ping-qdrant` expose their 6333 ports container-internal
  only and were unreachable from the Pig shell; newsletter digests are not
  being embedded there (nothing in the distill path writes to Qdrant).
- The gateway has ingest routes only; no query endpoint for digests.
- `pg_trgm` is not installed; built-in `tsvector`/`plainto_tsquery` works with
  zero extensions. Cheapest viable path wins: full-text search on the payload
  (sender, subject, brief text, topics, key points).

## Exact query command

From this VM:

```
~/workspace/bin/pigwsl-exec "python3 /home/nolan/newsletter-ingest/finance-search.py <query> --days 30 --limit 10"
```

For multi-word queries, wrap the query in double quotes inside the outer
double quotes (pigwsl-exec mangles literal single-quoted substrings):

```
~/workspace/bin/pigwsl-exec "python3 /home/nolan/newsletter-ingest/finance-search.py \"market crash\" --days 60"
```

Examples:

- `.../finance-search.py bitcoin --days 30`
- `.../finance-search.py "bond yields" --days 90 --limit 5`

## Output shape

One block per matching digest:

```
DATE: 2026-10-04 15:01:23.087+00
SENDER: quoththeraven@substack.com
SUBJECT: ...
BRIEF: ...
EVIDENCE: source_event_id=<event id of the original EMAIL_RECEIVED>
---
```

If nothing matches: `NO_MATCHES` (exit 0).

## Scope notes

- Searches ALL NEWSLETTER_DIGEST_DERIVED payloads (namespace core::owner),
  not only finance-lane ones. Say so if the answer mixes lanes.
- Default window is the last 30 days; digests are ~1 per newsletter issue, so
  widen `--days` for sparse topics.
- Stemming is English (`plainto_tsquery`); "rates" matches "rate", etc.
- The brief (`text` field) is distiller-generated DERIVED content (confidence
  0.7); ground claims in the original newsletter via `source_event_id` when it
  matters.
