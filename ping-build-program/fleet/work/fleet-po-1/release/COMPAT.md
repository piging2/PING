# compat matrix — producers x consumers
- consumer `results-gen.py` reads `matrix-*.tsv`: reads missions; schema v1
- consumer `results-gen.py` reads `topics/*.md`: reads analysis text
- consumer `ledger auditors` reads `ledger.jsonl`: append-only JSON lines
- consumer `release dry-runs` reads `results/*/*.json`: sha256 + json.load; tolerant of additive fields
- consumer `Nolan / morning review` reads `CHANGELOG.frag.md`: human-readable
