# Business-context demonstration log 2026-09-14

Objective: prove the chain VERIFIED KNOWLEDGE to PING ACCEPTANCE to
DETERMINISTIC RETRIEVAL to BUSINESS AGENT CONTEXT to DECISION, using only
existing machinery. No embeddings, no semantic search, no new databases.

## Step 1. Verified knowledge and PING acceptance (already on record)

Round 52 b-new-business-radar (20260914-102446, 2026-09-14) verified three
genuine recent Colorado filings and the general finding that new-business
claims require a verified Colorado SOS formation date. Accepted PING event:

  event_id: 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7
  accepted_at: 2026-09-14 17:19:46 UTC (sidecar accepted_by_ping at 17:19:45Z)
  sidecar: ~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260914-102446-b-new-business-radar.provenance.json

Canonical bytes check (exact observation bytes PING stored):

  $ python3 emit-observation.py --fetch-event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7
  VERIFIED: Meta AI new-business-radar newness claims are unreliable without a Colorado SOS formation date. In the 2026-09-14 b-new-business-radar pass, all 10 named businesses were independently verified via SOS-filing mirrors and directory listings. Only 3 of 10 had SOS formation ...
  FETCH-EXIT: 0

## Step 2. Deterministic retrieval (the probe)

Command (read-only SELECT through the existing pg_probe path):

  $ python3 -c "
  from pg_probe import query_events
  sql = \"SELECT event_id, created_at, payload->>'verification_status' AS vs, payload->>'brief_id' AS b FROM ping_events WHERE payload->>'observation' ILIKE '%captain ron%' ESCAPE '\\\\' ORDER BY created_at;\"
  rows = query_events(sql, timeout=60)
  ..."

Output:

  SQL: SELECT event_id, created_at, payload->>'verification_status' AS vs, payload->>'brief_id' AS b FROM ping_events WHERE payload->>'observation' ILIKE '%captain ron%' ESCAPE '\' ORDER BY created_at;
  ROWS RETURNED: 1
  874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7 | 2026-09-14 17:19:46.57168+00 | verified | b-new-business-radar

Retrieval is a case-insensitive substring match over
ping_events.payload->>'observation'. Same query, same store, same rows.

## Step 3. Business-agent context (the script)

Command:

  $ python3 business-context.py "Captain Ron Handyman"
  EXIT: 0

Output (verbatim):

  CONTEXT BRIEF (format v1, deterministic retrieval, no embeddings)
  QUERY: Captain Ron Handyman
  RETRIEVAL STATUS: OK

  PING EVENTS
  - event_id: 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7
    accepted_at: 2026-09-14 17:19:46.57168+00
    verification_status: verified
    brief_id: b-new-business-radar
    observation_excerpt: VERIFIED: Meta AI new-business-radar newness claims are unreliable without a Colorado SOS formation date. In the 2026-09-14 b-new-business-radar pass, all 10 named businesses were independently verified via SOS-filing mirrors and directory listings. Only 3 of 10 had SOS formation...

  DISK EVIDENCE
  - [raw-artifact] /home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260914-102446-b-new-business-radar.md :: mentions business
  - [sidecar] /home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260914-102446-b-new-business-radar.provenance.json :: accepted_by_ping event_id=874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7 at 2026-09-14T17:19:45Z (linked via retrieved PING event)

  CONSUMED FIELDS
  business_name: Captain Ron Handyman
  ping_accepted: 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7
  verification_status: verified
  sos_formation_date: 2026-07-14
  contact_routes: none published
  platform_account: UNKNOWN (no-account-evidenced)
  decision_rule: Operational rule: never add a new-business-radar prospect to the pipeline without a verified filing date; treat every other newness claim as unverified.

  DECISION PROVENANCE
  Decision D informed by Projection/Retrieval P containing Knowledge K accepted from Observation 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7 supported by Evidence /home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260914-102446-b-new-business-radar.md; /home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260914-102446-b-new-business-radar.provenance.json.
  Knowledge K: the accepted observation for brief_id=b-new-business-radar (verification_status=verified, accepted_at=2026-09-14 17:19:46.57168+00).

  NOTES
  - Retrieval: ILIKE substring match on ping_events.payload->>'observation' plus substring scan of meta-ai-intel sidecars/artifacts/ledger. Deterministic: same query, same store, same brief.
  - Identity: BUSINESS ENTITY vs PLATFORM ACCOUNT vs INTERACTION are distinct layers (see entity-identities.md). platform_account is UNKNOWN unless an evidence-backed identity relation says otherwise; never inferred.
  - PING evidence is append-only and was not mutated by this run.

Determinism check: two consecutive runs produced byte-identical output.

  $ python3 business-context.py "Captain Ron Handyman" | sha256sum
  f021e3d2606e016774ba84b9aa78b44159f9e4386a56336c79218a3800b1b621  -

Both runs hashed to f021e3d2606e016774ba84b9aa78b44159f9e4386a56336c79218a3800b1b621.

The other two Round 52 businesses retrieve the same accepted event with
their own extracted fields:

  Tote and Trailer Moving -> sos_formation_date 2026-06-24, contact_routes none published, platform_account UNKNOWN (no-account-evidenced)
  AB Steel -> sos_formation_date 2026-06-23, contact_routes none published, platform_account UNKNOWN (no-account-evidenced)

## Step 4. Decision

Decision D1 informed by Projection/Retrieval P1 containing Knowledge K1
accepted from Observation 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7
supported by Evidence
/home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260914-102446-b-new-business-radar.md
and
/home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260914-102446-b-new-business-radar.provenance.json.

  D1: HOLD Captain Ron Handyman L.L.C. as WATCH. No outreach action is
  justified today. The entity is verified as a genuine recent Colorado
  filing (SOS formation 2026-07-14, inside the window) in a target trade and
  geography, but no phone, email, website, or platform account is evidenced,
  and the accepted operational rule forbids pipeline adds without a verified
  filing date plus a contactable route. The next justified action is a
  re-check for a published contact route in a later radar pass; acting now
  would mean blind outreach with no honest channel.

  P1: the business-context.py retrieval run above (deterministic ILIKE
  lookup plus sidecar/artifact scan), output format v1.
  K1: "Captain Ron Handyman LLC is a genuine recent Colorado filing (SOS
  2026-07-14); none of the 3 qualified filings had a published phone,
  email, or website; watch-only; never add a new-business-radar prospect to
  the pipeline without a verified filing date."
  O1: ping event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7
  (OBSERVATION_CREATED, verification_status=verified).
  E1: the raw answer artifact and the sidecar carrying the accepted_by_ping
  transition, paths cited above.

This matches the parallel per-business decision record
(~/workspace/tandem/business-decisions-2026-09-14.md: "Decision: Captain Ron
Handyman L.L.C. -> WATCH ... Justified action: none today.").

## Consumed present-state field set (the minimum the decision used)

Documented in business-context.py's header; the decision consumed exactly:

  business_name, ping_accepted, verification_status, sos_formation_date,
  contact_routes, platform_account, decision_rule

Everything else in the retrieved artifacts (full observation text beyond
the cited spans, research_agent, context pack version, raw filing mirrors)
is cited as evidence, not consumed. No generalized present-state system
was built.

## Audit surface for a fresh agent

* Re-run `python3 business-context.py "Captain Ron Handyman"` and compare
  to the brief above. Challenge each link: was the evidence sufficient (one
  accepted event plus raw artifact plus sidecar), was the PING knowledge
  relevant (the observation names this business with a filing date in the
  window), was the identity correct (entity resolved to the SOS LLC;
  platform account UNKNOWN per the evidence-backed identity log, never
  merged with any account).
* The identity log ~/workspace/tandem/entity-identities.md is append-only;
  every relation cites its evidence; it holds relationships and provenance,
  never independent business facts.

## Caveats and repairs found during this work

1. pg_probe.py transport bug (repaired, minimal, verified live): a parallel
   hardening pass had dropped the "muse-ssh@100.79.154.43:" host prefix from
   both scp commands, so scp parsed "C:/..." as remote host "C" and every
   probe call failed instantly. Fixed by splitting bare Windows paths (used
   inside the on-Pig ps1) from prefixed scp destinations; verified with a
   live SELECT returning row count 1983 and the Captain Ron query above.
   Flag for the parallel agent that owns the hardening pass.
2. A second bug in my own new code (repaired before the demo): the ILIKE
   query emitted ESCAPE '\\' (two characters), which Postgres rejects;
   corrected to ESCAPE '\'.
3. Egress proxy flakiness: scp/ssh through hatch-egress-proxy intermittently
   returned "nc: proxy read: Broken pipe". pg_probe retries bounded and the
   script fails closed to UNCHECKABLE when unreachable. The demo runs above
   all completed against the live store.
4. Earlier in this session, hand-rolled (non-pg_probe) query attempts
   intermittently returned stale/wrong result sets; the hardened pg_probe
   (unique per-call temp files, sha256 verification of the SQL payload,
   psql exit-code check) plus the transport fix above resolved this. The
   demo used only pg_probe.
