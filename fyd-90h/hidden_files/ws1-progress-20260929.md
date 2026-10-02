# WS1 progress — 2026-09-29 (strict L3 reds closure)
Clock: T+0 = 2026-09-29 ~05:06 MDT; WS1 started ~07:35 MDT; deadline 2026-10-02 ~23:06 MDT.

## Task
Close the 4 strict L3 reds (Decision 4 cutover stays RED until all green):
1. `/` 404 on missing responsive-image derivative (/fyd-media/.../w480-480w.webp) — minimal pipeline/generate-or-repoint fix
2. Incognito at 1 width only — browser-protocol item, no code fix
3. #ask doorway touch target 43px vs 44px — minimal CSS fix
4. Desktop-1440 dialog extends below viewport — minimal CSS containment fix

## Progress log
- [x] ~07:40 Read EXECUTION-PLAN.md, AGENTS.md (SSH/quoting/restart rules), wave2-status (L3 strict reds), L3 proof artifacts (widths-report.json, incognito.json)
- [ ] Verify Pig worktree /home/nolan/projects/ping-fyd-converged @ 5732485b + running :3100 identity
- [ ] RED-1: locate missing derivative srcset + fix
- [ ] RED-3: locate #ask doorway CSS + fix
- [ ] RED-4: locate dialog CSS + fix
- [ ] Rebuild via tree's own scripts; commit (serialized, explicit pathspecs)
- [ ] Restart :3100 via /home/nolan/start-3100.sh (non-PTY ssh, stdio on files)
- [ ] Verify env flag live + approve path; pin new build ID + served digests
- [ ] Verify Decision 4 non-browser green list (ask endpoint, execFile state, rollback, /o/{id} doorways)
- [ ] Curl-verify the three fixes at served-byte level
- [ ] Write browser protocol to ws1-browser-protocol-20260929.md
- [ ] Final report with per-item verdicts

## Notes
- 2BFLbt5EHFUJeXfd0E6zT = old build ID. New one must be re-pinned after rebuild+restart.
- Pig tunnel had a ~30-min commute-blackout event ~07:30 MDT, recovered. Use BatchMode=yes; checkpoint here if it drops again.
