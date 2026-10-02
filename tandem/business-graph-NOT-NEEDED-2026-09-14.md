# Business Graph Projection: NOT JUSTIFIED (2026-09-14)

Verdict: route-next.py does not need a relationship projection. Building one now
would be speculative machinery with no consumer, and per the present-state
doctrine and Nolan's standing rule (never let the graph become a second PING),
it must not be built.

## What the router actually consumes, verified 2026-09-14

route-next.py v2 routes candidates one at a time. Each routing decision reads,
per business, only:

1. Its dossier (~/workspace/tandem/knowledge/dossiers/): next_justified_action,
   pipeline status/priority, sync_gaps, contact_absence fact, verification block.
2. Its pipeline-gaps row (pipeline-jsonl-gaps.jsonl): sync/disposition fields.
3. Its PING brief (business-context.py): contact_routes, platform_account,
   verification_status, ping_accepted, decision_rule. platform_account is
   consumed as a scalar string ("UNKNOWN (no-account-evidenced)"), never as a
   node, never joined to anything.
4. Its own prior outcomes from routing-decisions.jsonl (per-business match only).
5. Mission from next-brief.py, standing AUTHORITY-V2, static TRADE_PRIORITY ranks,
   and the static INTEL_FINDINGS list.

The decision tree asks exactly: dossier present? sync_first (A11)? PING
verification checkable? contact_routes == "none published" with no prior
research? Static priority rank? None of these questions requires a relationship,
and no line of route-next.py joins across businesses, platform accounts,
interactions, signals, or events.

## Relationship facts in the source material

Dossier facts across the 509 dossiers carry only these kinds: pipeline_note (80
dossiers), contact_absence (9), address (4). No partner, referral, platform
account, interaction, or signal facts exist. There is nothing to project an
edge from. The BUSINESS -> PLATFORM ACCOUNT -> INTERACTION -> SIGNAL chain is
nearly all UNKNOWN by design; a projection would mostly be a pretty print of
absent evidence, which business-context.py already reports more honestly.

## What would have to change for a graph projection to become justified

All of these, not one: (1) a demonstrated Business Agent or router code path
that asks a question unanswerable per-business, e.g. "which businesses share
this platform account / referral channel / event", "what recent outcomes for
similar trades justify this action"; (2) dossiers carrying relationship-typed
facts with source refs (edges must derive from canonical sources, identity
stays inferred/UNKNOWN, never false-merged); (3) a demonstrated performance
problem with the current machinery: flat JSON reads + normalized-name
resolution being insufficient for the real workload (the standing bar before
any graph database is even discussed). Until then, per-business dossiers +
decisions + pipeline gaps + PING briefs are the whole projection stack, and
adding a graph would duplicate PING's event/knowledge plane without a
consumer.

## Rebuildability note (for the future graph, if ever)

Any graph projection would follow the entity-dossier.py --self-test contract:
build twice from sources only, byte-identical output, hash recorded, source
refs on every edge, zero graph-only facts, non-authoritative by construction.

Status: no graph built. This note is the deliverable.
