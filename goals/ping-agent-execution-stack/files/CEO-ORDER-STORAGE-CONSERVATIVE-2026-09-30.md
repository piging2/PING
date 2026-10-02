# CEO STORAGE DIRECTIVE — RETURN TO CONSERVATIVE MODE (2026-09-30 ~19:50 MDT, Nolan, binding)

Sent to main chat (operator) in two messages:
- b3ea1aec-4c80-4fb1-b47a-05f719d7a822 (the directive)
- 18cb5efc-ef9b-474b-9e70-e3a030d514b7 (structural refinement: organize NUSYN around semantic ownership, not agents)

Key correction Nolan made before sending: do NOT tell the crew to move data to E:. Incident evidence established E: as hardware-failed/retired after repeated disk errors. D: is usable but small. Until the NUSYN 1 TB SSD arrives: C: HOT + D: carefully selected temporary cold storage + Oracle for the small verified database backup. E: remains quarantined.

Full directive text as sent is in the main chat transcript. Summary of binding terms:

- C: ~71 GB free / ~15.4% (GUARDED boundary). Adequate headroom, not permission to refill.
- C: = HOT compute/runtime plane. D: = temporary warm/cold relief only. E: = retired/quarantined, no new writes. NUSYN 1 TB = future capacity plane.
- No redesign before NUSYN. No WSL/Docker migration, no database relocation, no VHDX compaction unless thresholds require, no cache cleaning for its own sake.
- Storage work is exception-driven, not continuous cleanup.
- Do not touch canonical PING event/evidence state for capacity optimization.
- D: receives only clearly classified non-hot material; do not copy huge trees of tiny files loose (D: large allocation units — classify, archive/compress, verify, copy, verify, manifest). Every move must compute logical bytes, expected destination allocated bytes, actual C: recovery, dependencies, recovery semantics.
- Agent storage multiplication stops: one durable project state, many disposable execution surfaces. Agents get isolated worktrees/scratch, not independent authoritative PING/FYD copies.
- Until NUSYN: writers stay storage-aware; stop and inspect before unexpectedly creating gigabytes.
- Cheap storage watch: C free, 24h C delta, WSL VHDX, Docker VHDX, Docker build cache, largest writable layers, voice data, worktree total, journal/WAL, D free. Ladder: >20% normal, 15-20% guarded, 10-15% warn, 5-10% stop nonessential bulk writes, <5% emergency.
- NUSYN: read-only migration manifest now, no execution. Arrival-day rule: identify, verify capacity/health/filesystem, performance sanity, create structure, small copy test, hash verify, read-back, only then migrate.
- Migration priority by bytes saved / operational risk. WSL/Docker backing storage last, only if justified by measured NUSYN performance and real pressure.
- /home/nolan/<canonical-active-repo> in WSL/ext4 stays the HOT Linux dev location; prove Git/npm/test performance with one sacrificial worktree before any active worktree on NUSYN.
- Voice: small active capture on C:, verified durable originals to NUSYN, derivatives regenerable, temporaries deleted after verified processing.
- CosyVoice Docker writable-layer defect: real bug, fix in an owned maintenance unit later, not tonight.
- NUSYN != backup. Do not remove the independent Oracle database copy when NUSYN arrives.
- Product lanes resume. Storage is a guardrail. Until NUSYN, reports need only: C free, 24h delta, storage state, unexpected >1 GB growth, action required yes/no.
- NUSYN structure refinement: organize around semantic ownership (PROJECTS/DATA/ARTIFACTS/MODELS/MEDIA/AGENTS/{muse,devin,hermes}/ARCHIVE/BACKUP-STAGING), not around agents. D: is a small staging valve, not a miniature NUSYN.
