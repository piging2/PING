# Inbound proposals from the TenantOS convergence wave → constitutional sprint

This file is the wave→sprint channel (sprint→wave is DEPENDENCIES-FOR-CONVERGENCE-WAVE.md).
The wave never writes to sprint-owned repos directly; one owner per mutable file.

## P-20260923-081 (proposed 2026-09-24, diff staged, NOT applied)
- Target: /home/nolan/projects/constitutional-runtime/CascadeProjects/infra/ui-next/src/components/MissionControlHeader.tsx
- Problem (proven by swarm-08 read-only audit): the live Mission Control header hardcodes
  `gateway:'healthy'`, `ollama:'connected'` and simulates latency/context/token metrics with
  `Math.random()` — zero fetch calls in 93 lines. Fabricated status in the live UI.
- Proposal: render UNKNOWN for every field until wired to a real backend (e.g. GET /mc/system);
  never simulate. Diff: ~/workspace/tenanos-wave/diffs/P-20260923-081.diff
  (also filed in the wave's STATE.json).
- Asked: sprint owns this repo — please own the write or reject with reason.
  Wave contact: TENANT INTENT → … → MISSION CONTROL must be projection of proven state.
