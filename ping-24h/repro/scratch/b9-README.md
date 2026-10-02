# B9: journal write-authority forgery

`b9-journal-authority-forgery.mjs` runs the REAL journal semantics (B4's scratch
copy of `mc-dispatch.ts` at HEAD 0264d517: real `appendDispatchEvent`,
`mintEventId`, `loadJournalEvents`, `projectMissions`) against a scratch journal
and demonstrates two forgeries:

- Attack A: a second `MC_AGENT_AUTHORIZED` with a divergent summary is APPENDED
  (dedupe key is kind|missionId|eventType|summary only) and the projector adopts
  the forged `capabilities_granted` and `work_order_id`. No adapter binding.
- Attack B: a hand-written JSON line with a random event_id (no API at all) is
  loaded and flips a mission from UNKNOWN to SUCCEEDED with a forged
  output_digest. No marker, reconciliation_state cleared.

Verdict: write access to the journal file is write access to authority. The only
defense is OS file permissions.

Safety: the script refuses to run unless `MC_SCRATCH_JOURNAL` points inside this
directory. No production state is touched.

Replay: `bash b9-run.sh`
