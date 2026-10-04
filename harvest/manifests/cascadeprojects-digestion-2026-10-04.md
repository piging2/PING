# Harvest Manifest: CascadeProjects local dirs (crx-digestion-worker + crx-newsletter-brain)

## REPO
- URL: local only, /mnt/c/Users/nolan/CascadeProjects/crx-digestion-worker and crx-newsletter-brain
- SHA/TAG examined: n/a (unversioned working dirs, June 2026)
- DATE examined: 2026-10-04

## LICENSE
- Type: Nolan's own code (no third-party license)
- Commercial-use compatible (yes/no/conditional): yes
- Notes: No license headers; treated as owner-authored. No copyleft risk.

## WHY
- The 2026-10-04 directive ordered harvesting the newsletter IMAP client and the
  content-digestion loop for the PING newsletter ingestion lane, and the ops
  investigation flagged both as the two directly reusable pieces. Port the
  logic, not the code.

## PRIMITIVE
- crx-digestion-worker digestion loop (fetch → summarize → topic-extract → store):
  RSS poll on a 15-min cycle; URL-keyed dedup (`article_exists`); Ollama
  summarize with a SUMMARY:/TAGS: parse contract; SQLite row + markdown archive
  write; constitutional event emit per processed article (imports `emit_event`
  from the sibling `brain` project's src/constitutional). Source registry pattern:
  sources.yaml -> register_source() in DB, so the sender list is config, not code.
- crx-newsletter-brain: IMAP client (imaplib -> imap.mail.yahoo.com:993) and the
  100-newsletter-candidate detector (newsletter_candidates.json). Got as far as
  identifying candidates; the SQLite digest pipeline stalled (6/100 persisted).
- What PING already owns that overlaps (do not duplicate): Bee adapter's
  learning-domain event pattern (domain=learning, learn_from=true,
  speaker_privacy_envelope). The newsletter ingestion worker (2026-10-04) already
  ported the IMAP client + candidate detector into /home/nolan/newsletter-ingest/
  and emits EMAIL_RECEIVED learning events; dedup via cursors.jsonl. Do not
  rebuild what that lane built.

## VERDICT
- ADAPT (+ harvest the loop shape and the SUMMARY:/TAGS: contract; reject the SQLite/markdown store)

## TINY HARVEST
- BYTES/LOC TAKEN: 0 bytes copied. Patterns recorded for the newsletter distill lane.
- What was taken (pattern description + where it now lives in the workspace):
  documented here; the live port lives in /home/nolan/newsletter-ingest/ (newsletter lane).
- What was deliberately NOT taken (and why):
  - database.py (SQLite store): PING owns the event spine; a second canonical store is forbidden.
  - archive.py (markdown dump): portable-evidence-bundle pattern is known; no need for a parallel archive.
  - dashboard.py: UI wave is on hold per directive; Mission Control covers projection.
  - Ollama summarizer: deferred; the directive says raw content events first, summarization is a distill concern.

## DEPENDENCIES
- Would-be transitive dependencies if adopted: feedparser, ollama, pyyaml (all small, standard)
- Wrapper needed (yes/no, describe): no; patterns only.

## TEST
- Repo has tests (yes/no): yes (test_pipeline.py)
- Tests run (yes/no, result): no (not run; patterns-only harvest, no adoption)
- What the tests prove relevant to us: n/a

## SECURITY NOTES
- Known CVEs/advisories: none known
- Credential handling observed: POOR in source (Yahoo app password in mode-777 .env plaintext).
  The newsletter lane already fixed this: creds now in Windows user env, .env scrubbed to
  <moved-to-windows-user-env-2026-10-04>. Never reintroduce plaintext secrets.
- Network behavior: outbound IMAP (993) + RSS fetch; read-only in the new design.
- Supply-chain posture (pinned deps, lockfile, maintainer activity): single-author, June 2026, inactive.

## ARCHITECTURE NOTES
- How it is organized (2-4 lines): single-process loop (worker.py) on a 900s cycle,
  tools.py = fetch, summarizer.py = Ollama, database.py = SQLite, archive.py = markdown,
  sources.yaml = sender registry. Notably it already emitted constitutional events to
  the sibling brain project's constitutional module, the same instinct PING later formalized.
- Key modules and what they own: worker.py (cycle + dedup), summarizer.py (SUMMARY:/TAGS:
  parse contract), tools.py (RSS fetch + HTML strip), database.py (sources + articles).

## KEEP/REMOVE
- KEEP (what stays in our tree): this manifest; the live port at /home/nolan/newsletter-ingest/.
- REMOVE (what was examined and discarded): the dirs themselves stay on C: untouched;
  cleanup recommendations recorded below, deletion is Nolan's call only.
- Re-examination blackout (do not re-examine before): 2027-01-01

## AUTHORITY CHECK
- Confirm: no authority model imported. PING owns authority. (yes: the old code's
  `emit_event` import from brain/src/constitutional was EXCLUDED; the new lane emits
  through the PING gateway /ingest with the Bee learning-domain envelope.)

## CLEANUP RECOMMENDATIONS (not executed; Nolan decides)
- crx-newsletter-brain/.env: already scrubbed by the newsletter lane (verified 2026-10-04).
- Dead weight deletion candidates: resolve_automation, research-pipeline,
  05_Broll, 06_Sound_Design, PING-lab, PING-vos (all zero-byte or one-file dead).
- Happy Place variants: repo clone untouchable; hermes/forensic/main are analysis
  workspaces (~4.2GB total incl. 770MB regenerable node_modules/.next) — findings
  should be distilled into the FYD gap registry before any cleanup.
