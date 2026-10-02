# LANE-ORACLE STATE (AGENT 11, 2026-09-23 night)
Status: PROVEN (read-only closure complete; design artifacts written; nothing applied remotely)

## Ledger
- RESEARCHED: host identity, docker engine, all containers, volumes, networks, images, compose artifacts, backup artifacts, PING repo native deps (sharp ^0.35.3, engines node 24.x, no sqlite)
- FALSIFIED: prior "Docker ABSENT, Git ABSENT" claims (docker.io 29.1.3 + git 2.43.0 live); "no host-level qdrant duplicate" (PID 1506 is the container process); "empty host" (3-container PING stack live)
- PROVEN: reboot auto-recovery (09-20 00:05 -> qdrant up in 59 s, no human action); all service ports loopback-only; secret intake env-only via 0600 .env
- IMPLEMENTED: compose.proposed.yaml (design artifact, NOT applied), ORACLE-DEPLOYMENT-CLOSURE.md, EVIDENCE-LOG.md, shared record lines (16)
- BLOCKED: applying the proposed compose (needs morning decisions: gateway generation, Ollama verdict); off-host backup copy (needs destination decision); no destructive ops permitted tonight

## Key corrections to program knowledge
1. The Oracle host is NOT empty. It runs a P18-era stack: ping-gateway (node 18, candidate image), ping-postgres (17-alpine), ping-qdrant (v1.7.0). Convergence must decide whether this stack or the build program output is canonical.
2. Live topology is hand-run `docker run` containers, not the checked-in compose files. Config drift is real.
3. Gateway has no healthcheck and no memory limit; two predecessors died with exit 137. Node 18 vs repo engines 24.x is drift.
4. Ollama image pulled (6.99 GB) but never run; veto gate says REJECT local production inference at 5.9 GB RAM / 0 swap.

## NEXT
- Morning: Nolan decisions on Ollama placement, gateway generation, backup destination; then apply compose.proposed.yaml (operator action, not this lane tonight).
- Integration notes for coordinator: gateway engines drift -> lane-dup; qdrant `knowledge` collection (144 pts, 768-dim) -> lane-f; trust-auth postgres + 0600 env -> lane-l; reboot-recovery proof -> lane-xexec.
