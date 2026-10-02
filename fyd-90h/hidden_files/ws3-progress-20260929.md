# WS3 progress — 2026-09-29

## 07:36 MDT — Pig reachable, :3214/:18201 verified UP (no re-serve needed)
- SSH via `ssh -F /home/hatch/.ssh/pig-config -o BatchMode=yes pigwsl` — tunnel recovered, instant connect.
- :3214 UP (200). Serving process: PID 78879, started 2026-09-29 05:56:37:
  `node ./node_modules/.bin/next dev -p 3214 -H 127.0.0.1` (cwd /home/nolan/projects/ping-wave2-ownerloop).
- Worktree HEAD: 3235804d (= W2's commit). `.git` is a gitfile (detached worktree).
- :18201 journal gateway UP (200): `fyd-journal-gateway`, store `/home/nolan/ping/var/fyd-ownerloop-journal/events.jsonl` (6 events), journal id `fyd-demo-journal@769318245958`. No /events, /api/events, or /health endpoints — root only; journal cross-checks are via the events.jsonl file.

## 07:38-07:44 MDT — curl end-state verification (read-only)
- Demo page is `/sites/happy-place`, NOT `/`. (`/` serves the PING marketing homepage.)
- Served `/sites/happy-place`: 234,024 bytes. H1: "Generated site demo", "Happy Place Carpentry LLC".
- Checklist vs W2 end state:
  - Locations hidden: MATCH. No "Where we work" anywhere; no locations-bearing h2.
  - h2 order: MATCH. "Start the conversation" (CTA) -> "Services" -> "About Happy Place Carpentry LLC" -> "Gallery" -> "Contact" -> "Find us" -> "Ask FYD about Happy Place Carpentry LLC" -> "Customize this site". (One empty decorative h2 precedes the CTA h2 in the DOM.)
  - Refresh marker: MATCH with clarification. Page carries "[owner-loop source refresh 2026-09-29]" in the area_served field ("Benton, Linn, Marion & Polk Counties. [owner-loop source refresh 2026-09-29]"), 17 "refresh" occurrences. The literal token "x17" does NOT appear in served bytes or the journal — W2's "marker x17" reads as "the refresh marker, x17 occurrences".
  - Journal events (6): 3 FYD_SITE_OVERLAY (step1 hide-locations fyd-ovl-mummdrwn-2aae5eb60e2d / intent pi-0eaa4fff820090c6; step2 services-first fyd-ovl-mummfg1q-ef5b62c2ad9e; 3a move-cta fyd-ovl-mummg29d-6ab48fa66fb1 / intent pi-d9bba96c8a57e391) + APPROVAL_SUPERSEDED ef62c86d... + APPROVAL_DENIED 3f5052bc... + APPROVAL_EXPIRED 07915825...
- Verdict: served state MATCHES W2's end state. No re-serve performed, no mutations made (read-only per task).
- No broken boundary found in steps 4-9 served state. Known W2 broken sub-boundary (strict Ask-drafted -> F1 approval path) stands as documented; not browser-provable, out of WS3 scope.

## Next
- Protocol written: ~/workspace/fyd-90h/hidden_files/ws3-browser-protocol-20260929.md
- Parent runs the browser proof; step 9 needs runtime infra authorization (gateway kill/restart).
