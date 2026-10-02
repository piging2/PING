# Proof-artifact convention (written 2026-09-25, ping-perfecting-pass)

Audit 2026-09-25 ~14:05 MDT of 4 recent dated proof artifacts
(goals/ping-agent-execution-stack/hidden_files/):

- perfecting-pass-2026-09-24/hygiene-sweep.md: date/lane/claim/evidence all present. GOOD.
- orca-a6-readiness-2026-09-23.md: all present. GOOD.
- mirror-resilience-2026-09-23.md: date/claim/evidence present; lane/owner missing. PARTIAL.
- pig-health-fix-2026-09-23.md: date/claim/evidence present; lane/owner missing. PARTIAL.

Drift: 2 of 4 lack an explicit lane/owner field. The convention was unwritten;
artifacts followed it by habit, which is why it drifted.

## The convention (one header block, top of every dated proof artifact)

```
# <title> — <date>
Lane/owner: <lane or agent id>          # who ran it; required
Claim: <one sentence>                   # what this artifact proves/decides
Evidence: <tool results, digests, file paths>   # the proof, not narration
Status: <proven claim or next step>     # optional
```

Why lane/owner matters: when a later pass finds the artifact, the owner field
is the only way to know which lane's invariant it belongs to without
re-reading the whole file. Date alone does not identify ownership.
