#!/usr/bin/env python3
"""Finance digest retrieval (newsletter lane 2, chat path).

Cheapest viable option: Postgres full-text search (tsvector/tsquery,
built-in, no extensions, no new database, no new authority) over
NEWSLETTER_DIGEST_DERIVED payloads (namespace core::owner):
sender, subject, brief text, topics, key points.

Usage: finance-search.py "your query" [--days 30] [--limit 10]

Prints matching digests with date, sender, subject, brief, and
evidence_links (source_event_id) for grounding.
Read-only. Never prints or logs credentials.
"""
import argparse
import json
import subprocess
import sys

LIVE_DB = ["docker", "exec", "brain-postgres", "psql", "-U", "postgres",
           "-d", "ping_runtime", "-tA", "-c"]

SEARCH_SQL = """
SELECT "timestamp",
       payload->>'newsletter_sender',
       payload->>'source_subject',
       payload->>'text',
       payload->>'source_event_id',
       jsonb_array_length(COALESCE(payload->'evidence_links','[]'))
FROM ping_events
WHERE event_type='NEWSLETTER_DIGEST_DERIVED'
  AND namespace='core::owner'
  AND "timestamp" > now() - make_interval(days => %d)
  AND to_tsvector('english',
        coalesce(payload->>'newsletter_sender','') || ' ' ||
        coalesce(payload->>'source_subject','') || ' ' ||
        coalesce(payload->>'text','') || ' ' ||
        coalesce(payload->>'topics','') || ' ' ||
        coalesce(payload->>'key_points',''))
      @@ plainto_tsquery('english', $$%s$$)
ORDER BY "timestamp" DESC
LIMIT %d;
"""


def psql(query: str) -> str:
    out = subprocess.run(LIVE_DB + [query], capture_output=True, text=True,
                         timeout=60)
    if out.returncode != 0:
        raise RuntimeError("psql failed: " + out.stderr[:300])
    return out.stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("query", help="keyword query, e.g. bitcoin")
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--limit", type=int, default=10)
    a = ap.parse_args()
    # $$-quoting is safe against embedded single quotes; strip any literal $$.
    qtext = a.query.replace("$$", "")
    try:
        out = psql(SEARCH_SQL % (a.days, qtext, a.limit))
    except RuntimeError as e:
        print("SEARCH_QUERY_FAILED: " + str(e), file=sys.stderr)
        return 2
    rows = [l for l in out.splitlines() if l.strip()]
    if not rows:
        print("NO_MATCHES")
        return 0
    for line in rows:
        ts, sender, subject, text, src_eid, _nlinks = line.split("|", 5)
        brief = (text or "").strip()
        if len(brief) > 600:
            brief = brief[:600] + "..."
        print("DATE: %s\nSENDER: %s\nSUBJECT: %s\nBRIEF: %s\n"
              "EVIDENCE: source_event_id=%s\n---" %
              (ts, sender, subject, brief, src_eid))
    return 0


if __name__ == "__main__":
    sys.exit(main())
