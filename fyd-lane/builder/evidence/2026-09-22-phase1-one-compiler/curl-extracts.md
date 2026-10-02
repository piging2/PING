# Live-HTML cross-check extracts (Phase 1, 2026-09-22)

Source: `curl --max-time 20 http://localhost:3100/build/<site>` executed on the Pig
(WSL side, dev server localhost:3100). Both returned HTTP 200.

## happy-place (200, 57961 bytes)

- "Featured object" rail heading present: 2 occurrences
- featured object id `website-service-51de038c1defe8bd`: 1 occurrence
- featured object title "Pergola Design Consultations": 2 occurrences
- Verdict: live HTML shows the SAME featured object the pipeline selected
  (richestObject -> website-service-51de038c1defe8bd, ping.social.service@1).

## coppersmith-plumbing (200, 61810 bytes)

- "Featured object" rail heading present: 2 occurrences
- featured object id `website-business-2f1327c09d622175-location`: 1 occurrence
- featured object title "Grand Junction, Colorado, 81501, United States": 2 occurrences
- Verdict: live HTML shows the SAME featured object the pipeline selected
  (richestObject -> website-business-2f1327c09d622175-location,
  ping.social.location@1).

Full HTML bodies were NOT retained (57-61 KB each); the match counts above are
the extracts. Method: `grep -o` / `grep -c` against the saved bodies before
/tmp/phase1-diff was removed.
