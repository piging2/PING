# Harvest Manifest: <REPO>

Copy this template to `manifests/<repo-slug>-<YYYY-MM-DD>.md` and fill every field. No field left blank; use UNKNOWN only when genuinely unverifiable, with a note on what was tried.

## REPO
- URL:
- SHA/TAG examined:
- DATE examined:

## LICENSE
- Type:
- Commercial-use compatible (yes/no/conditional):
- Notes:

## WHY
- One paragraph: why this repo was in the queue, what FYD/PING problem it could solve.

## PRIMITIVE
- The reusable pattern(s) worth stealing, stated as capabilities not code:
- What PING already owns that overlaps (do not duplicate):

## VERDICT
- ADOPT / ADAPT / REJECT (+ one-line reason)

## TINY HARVEST
- BYTES/LOC TAKEN:
- What was taken (file or pattern description + where it now lives in the workspace):
- What was deliberately NOT taken (and why):

## DEPENDENCIES
- Would-be transitive dependencies if adopted:
- Wrapper needed (yes/no, describe):

## TEST
- Repo has tests (yes/no):
- Tests run (yes/no, result):
- What the tests prove relevant to us:

## SECURITY NOTES
- Known CVEs/advisories:
- Credential handling observed:
- Network behavior:
- Supply-chain posture (pinned deps, lockfile, maintainer activity):

## ARCHITECTURE NOTES
- How it is organized (2-4 lines):
- Key modules and what they own:

## KEEP/REMOVE
- KEEP (what stays in our tree) / REMOVE (what was examined and discarded):
- Re-examination blackout (do not re-examine before):

## AUTHORITY CHECK
- Confirm: no authority model imported. PING owns authority. (yes + one line on what was excluded)
