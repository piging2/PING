# Controlled production drill procedure (tandem emit path)

Standing rule, 2026-09-14: a production observation may be replayed only
from exact canonical bytes retrieved from the durable source, or on an
explicit isolated test aggregate. Reconstructed semantic equivalents are
forbidden for byte-identity drills.

## Why this exists

2026-09-14, ambiguous emit-retry drill on the B run
(`20260914-102446-b-new-business-radar`). The operator replayed using
observation text reconstructed from `ingested.log` instead of the exact
original bytes. The sha256 differed, the duplicate guard correctly treated
it as a new observation, and a second production PING event was created:

- canonical event: `874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7`
  (observation hash `375ce6e2e45fef0d3fecf8eabb83d82fe0950cc7a43935db7345cc2e993f0a32`)
- orphaned duplicate: `2fd53ac8c3a17d5f945f27f46b8b4534893e67f861948bd433c17b719767082c`
  (observation hash `c082c03603425c32d56eb75ca3996d84a07d60d181fadb7c1f33aff87f8a664f`)

The orphaned event is historical append-only evidence. It is not deleted,
mutated, hidden, or compensated for. PING has no correction, supersession,
contradiction, or retraction event semantics (verified 2026-09-14 against
the gateway source and the distinct event_type vocabulary in ping_events),
so there is no existing truthful mechanism to annotate the row itself.
This document is the provenance record: the orphaned event is a drill
test artifact whose canonical counterpart is `874da5ee...`.

## The mechanical guard

`~/workspace/tandem/emit-observation.py --drill` runs a preflight that
classifies TEST INPUT IDENTITY before any POST:

- EXACT: candidate bytes hash to a stored canonical accepted observation
  hash, either on the sidecar's `accepted_by_ping` transitions or in
  `ping_events` via the crash-recovery probe. Hash equality is the proof
  of byte identity; reconstructions hash differently and can never be EXACT.
- ISOLATED: `--drill-namespace <ns>` forces the emission onto the dedicated
  aggregate `drill:<ns>` (aggregate_type `drill_pass`), with drill
  provenance in event_data. It can never touch a production aggregate.
- ABORT: neither holds. The drill BLOCKS with a typed `STATE=BLOCKED`
  line, a truthful `drill.log` record (`identity=ABORT`, `result=no_post`),
  and exit 2, before any POST.

`--force` is refused in `--drill` mode. Drill refusals and outcomes are
appended to `~/workspace/tandem/drill.log`.

## Running a drill

Byte-identity replay (e.g. POST succeeded, sidecar confirmation lost):

1. Fetch exact canonical bytes from the durable source:
   `python3 ~/workspace/tandem/emit-observation.py --fetch-event <canonical_event_id>`
2. Replay with the drill flag and the fetched bytes:
   `python3 ~/workspace/tandem/emit-observation.py --drill <brief_id> "<bytes>"`
3. Expected: preflight classifies EXACT, then the duplicate guard refuses
   (naming the existing event) or heals the sidecar. No new event is created.

Isolated machinery test (proving the emit path without production data):

`python3 ~/workspace/tandem/emit-observation.py --drill <brief_id> "<bytes>" --drill-namespace <ns>`

The row lands on aggregate `drill:<ns>` and is self-describing as a test
artifact. Never invent a namespace that collides with production
aggregates (production uses `meta-ai-<brief>`).

## Drill incident log

- 2026-09-14 ~17:3x UTC: reconstructed-text replay created orphaned event
  `2fd53ac8...` (canonical `874da5ee...`). Cause: operator error, guessed
  bytes. Lesson: drills must be exact or isolated. Recorded here; PING row
  untouched.
- 2026-09-14 19:29:53Z: negative test of the new guard. `--drill` with
  reconstructed text and no namespace. Result: `STATE=BLOCKED`, exit 2,
  `drill.log` `identity=ABORT result=no_post`. No POST made.
- 2026-09-14 19:30:03Z: positive test. `--fetch-event 874da5ee...`
  returned bytes hashing to the original accepted observation hash
  `375ce6e2...`. `--drill` replay classified EXACT (sidecar hash match,
  99ms), then the duplicate guard refused naming `874da5ee...`, exit 2.
  `drill.log` records `preflight_pass` then `duplicate_sidecar`. No POST
  made, no new event created.
