# Incident response (P0-8)

Lane 3 deliverable. Intended placement in the convergence worktree:
`docs/incident-response/`. Transplant the three files below as-is; they are
self-contained and touch no runtime code.

- `capture-evidence.sh` - on-demand, read-only evidence capture. Run on the
  host during an incident BEFORE any recovery. Bash only; needs docker CLI,
  journalctl, standard Linux tools. Never prunes or mutates.
- `INCIDENT-RUNBOOK.md` - PRESERVE EVIDENCE FIRST -> RECOVER SERVICE ->
  THEN ATTRIBUTE, with the evidence-pattern decision tree for each
  distinguishable cause (compose down/stop, docker stop, kill, daemon
  restart, host restart, OOM, health/restart policy, network disconnect,
  deployment automation, SSH/operator action).
- `RETROACTIVE-LIMITATIONS.md` - what cannot be captured retroactively
  (docker events ring buffer, removed-container logs, journald rotation,
  no API audit trail), so the next responder knows to run the script
  immediately.

Invocation: `./capture-evidence.sh --since "2026-09-20T00:45:00Z" --out /opt/ping/incident-evidence/<name>`
