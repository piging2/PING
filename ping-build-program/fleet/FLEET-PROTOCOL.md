# Fleet protocol — MAXIMUM PARALLEL PROGRAM MODE

Matrices: `fleet/matrix-<cat>.tsv` (mission_id, category, family, title, objective, pass_criterion).
Claims: `fleet/claims/<cat>/NNNN-NNNN.claim` — one file per 50-mission range.
Claiming: `mv fleet/claims/<cat>/<range>.claim fleet/inprogress/<worker-id>/` — atomic; if mv fails, the range is taken, pick another.
Results: `fleet/results/<cat>/<mission-id>.json` — one JSON per mission:
  {"mission_id","verdict","summary","evidence_files":[],"confidence","followup":null}
Verdicts: PROVEN | REJECTED | ADAPT | NEEDS-FOLLOWUP | N-A
Ledger: append one line per drained range to `fleet/ledger.jsonl`:
  {"worker","category","range","missions":N,"verdicts":{"PROVEN":n,...},"at":"..."}
When a category's claims dir is empty, the worker moves to the next category with remaining claims (priority order: oracle, acquisition, backend, connector, perfops, release). Never idle while claims exist.

Rules:
- Read-only cognition always; isolated spikes go in fleet/work/<worker-id>/ (never /tmp, never the PING repo).
- No new canonical authorities, databases, or frameworks. No PING repo writes.
- Oracle missions: keep the proven Oracle baseline sacred; attack candidates/reproductions/harnesses only; promote only through the certification law.
- Backend missions: EVERY claim is BEFORE -> CHANGE -> AFTER with both numbers recorded.
- Acquisition missions: NEVER turn parser guess into fact; hostile inputs get typed failures or quarantine.
- Connector intel: map shapes from public docs; do NOT build every connector; no invented endpoints.
- Vendor veto gate: free experimentation in isolation; adoption recommendations must answer the gate questions.
- Credentials: none used; fixtures only. Secret-shaped data gets redacted and logged.
- A verdict of PROVEN requires evidence files or a cited measurement; N-A requires justification.
