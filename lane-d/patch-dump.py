#!/usr/bin/env python3
"""Lane D patch for /home/nolan/ping/tools/fyd-site-projection/dump.py.

Adds the presentation-intent overlay op kinds (set_presentation_intent /
clear_presentation_intent), the digest-verified presentationIntent block,
and meta.presentationIntentDigest. Exact-match replacements; aborts loudly
if an anchor is missing. Idempotent-safe: refuses to run twice."""

DUMP = "/home/nolan/ping/tools/fyd-site-projection/dump.py"


def edit(old, new, count=1):
    with open(DUMP) as f:
        src = f.read()
    # Full-text idempotency probe (a prefix probe false-skips extension
    # edits where new starts with old).
    if new in src:
        print("SKIP: already patched")
        return
    n = src.count(old)
    assert n == count, "anchor found %dx, expected %dx" % (n, count)
    with open(DUMP, "w") as f:
        f.write(src.replace(old, new, count))
    print("OK")


# 1. Docstring: new op kinds.
edit(
    """  {op:"deactivate_object", objectId}              # visibility -> "private"
                                                  # (drops out of public render)
""",
    """  {op:"deactivate_object", objectId}              # visibility -> "private"
                                                  # (drops out of public render)
  {op:"set_presentation_intent", intentId,        # PRESENTATION INTENT layer:
      siteIntent, proposal, approval}             # approval carries the demo-owner
                                                  # marker and the proposal digest;
                                                  # upserted by intentId
  {op:"clear_presentation_intent", intentId}     # remove an intent directive
""",
)

# 2. Docstring: output shape.
edit(
    """  { meta: { siteId, dumpedAt, dumperVersion, baseDigest, fixtureFileDigest,
            fixtureHeader, overlayEventIds[], graphDigest,
            generatedAt, eventSequences },
    graph: { objects: [...], relationships: [...] } }
""",
    """  { meta: { siteId, dumpedAt, dumperVersion, baseDigest, fixtureFileDigest,
            fixtureHeader, overlayEventIds[], graphDigest,
            generatedAt, eventSequences, presentationIntentDigest },
    graph: { objects: [...], relationships: [...] },
    presentationIntent: { directives: [...],        # owner-approved display
                          provenance: {...} } }    # directives; digest = meta
                                                   # .presentationIntentDigest
""",
)

# 3. Dumper version bump.
edit(
    'DUMPER_VERSION = "fyd-projection-dump@1.0.0"',
    'DUMPER_VERSION = "fyd-projection-dump@1.1.0"',
)

# 4. apply_overlays: collect presentation intents separately.
edit(
    '''def apply_overlays(graph, events):
    """Apply overlay ops deterministically. Returns (graph, applied_event_ids).
    Any malformed op aborts the whole dump (fail closed)."""
    objects = {o["id"]: o for o in graph["objects"]}
    rel_ids = {r["id"] for r in graph["relationships"]}
    applied = []''',
    '''def apply_overlays(graph, events):
    """Apply overlay ops deterministically.
    Returns (graph, applied_event_ids, presentation_intents).
    Presentation-intent ops never touch the graph: they accumulate in a
    separate journal-ordered list, upserted by intentId. Any malformed op
    aborts the whole dump (fail closed)."""
    objects = {o["id"]: o for o in graph["objects"]}
    rel_ids = {r["id"] for r in graph["relationships"]}
    applied = []
    presentation_intents = []''',
)

edit(
    '''            elif kind == "deactivate_object":
                oid = op.get("objectId")
                if not (isinstance(oid, str) and oid in objects):
                    raise ValueError("event %s: bad deactivate_object %r" % (eid, op))
                objects[oid]["visibility"] = "private"
                prov = objects[oid].setdefault("provenance", {})
                refs = prov.setdefault("updatedRefs", [])
                ref = "ping-event:" + eid
                if ref not in refs:
                    refs.append(ref)
            else:
                raise ValueError("event %s: unknown op kind %r" % (eid, kind))
        applied.append(eid)
    return graph, applied''',
    '''            elif kind == "deactivate_object":
                oid = op.get("objectId")
                if not (isinstance(oid, str) and oid in objects):
                    raise ValueError("event %s: bad deactivate_object %r" % (eid, op))
                objects[oid]["visibility"] = "private"
                prov = objects[oid].setdefault("provenance", {})
                refs = prov.setdefault("updatedRefs", [])
                ref = "ping-event:" + eid
                if ref not in refs:
                    refs.append(ref)
            elif kind == "set_presentation_intent":
                # PRESENTATION INTENT layer. Validated strictly; never merged
                # into the object graph. The website's read seam re-verifies
                # the block digest and the apply layer re-resolves targets.
                intent_id = op.get("intentId")
                site_intent = op.get("siteIntent")
                proposal = op.get("proposal")
                approval = op.get("approval")
                ok = (
                    isinstance(intent_id, str) and intent_id
                    and isinstance(site_intent, dict)
                    and isinstance(site_intent.get("kind"), str)
                    and isinstance(proposal, dict)
                    and isinstance(proposal.get("proposalDigest"), str)
                    and proposal["proposalDigest"]
                    and isinstance(approval, dict)
                    and all(isinstance(approval.get(k), str) and approval[k]
                            for k in ("proposalDigest", "approvedBy", "approvedAt", "note"))
                )
                if not ok:
                    raise ValueError("event %s: bad set_presentation_intent %r" % (eid, op))
                if approval["proposalDigest"] != proposal["proposalDigest"]:
                    raise ValueError("event %s: approval digest != proposal digest" % eid)
                if "DEMO OWNER MODE" not in approval["note"]:
                    raise ValueError("event %s: approval note lacks the demo-owner marker" % eid)
                directive = {
                    "intentId": intent_id,
                    "siteIntent": site_intent,
                    "proposal": proposal,
                    "approval": {
                        "proposalDigest": approval["proposalDigest"],
                        "approvedBy": approval["approvedBy"],
                        "approvedAt": approval["approvedAt"],
                        "note": approval["note"],
                        "eventId": eid,
                    },
                }
                for i, existing in enumerate(presentation_intents):
                    if existing["intentId"] == intent_id:
                        presentation_intents[i] = directive
                        break
                else:
                    presentation_intents.append(directive)
            elif kind == "clear_presentation_intent":
                intent_id = op.get("intentId")
                if not (isinstance(intent_id, str) and intent_id):
                    raise ValueError("event %s: bad clear_presentation_intent %r" % (eid, op))
                presentation_intents[:] = [
                    d for d in presentation_intents if d["intentId"] != intent_id
                ]
            else:
                raise ValueError("event %s: unknown op kind %r" % (eid, kind))
        applied.append(eid)
    return graph, applied, presentation_intents''',
)

# 5. dump_site: build and digest the intent block.
edit(
    '''    events = query_overlays(site)
    graph, applied = apply_overlays(graph, events)
    graph_digest = sha256_hex(canonicalize(graph).encode("utf-8"))
    import datetime
    doc = {
        "meta": {
            "siteId": site,
            "dumpedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "dumperVersion": DUMPER_VERSION,
            "baseDigest": base_digest,
            "fixtureFileDigest": fixture_file_digest,
            "fixtureHeader": header,
            "overlayEventIds": applied,
            "graphDigest": graph_digest,
            "generatedAt": cfg["generatedAt"],
            "eventSequences": cfg["eventSequences"],
        },
        "graph": graph,
    }''',
    '''    events = query_overlays(site)
    graph, applied, presentation_intents = apply_overlays(graph, events)
    graph_digest = sha256_hex(canonicalize(graph).encode("utf-8"))
    # PRESENTATION INTENT block: digest-verified by the website read seam
    # (src/fyd/data/ping-object-source.ts) exactly like the graph digest.
    intent_block = {
        "directives": presentation_intents,
        "provenance": {
            "kind": "owner-presentation-intent",
            "note": "Owner-approved presentation intents (PRESENTATION INTENT "
                    "layer). Not source facts; re-applied over the base graph on "
                    "every dump. Journaled via FYD_SITE_OVERLAY events.",
            "eventIds": [d["approval"]["eventId"] for d in presentation_intents],
        },
    }
    intent_digest = sha256_hex(canonicalize(intent_block).encode("utf-8"))
    import datetime
    doc = {
        "meta": {
            "siteId": site,
            "dumpedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "dumperVersion": DUMPER_VERSION,
            "baseDigest": base_digest,
            "fixtureFileDigest": fixture_file_digest,
            "fixtureHeader": header,
            "overlayEventIds": applied,
            "graphDigest": graph_digest,
            "generatedAt": cfg["generatedAt"],
            "eventSequences": cfg["eventSequences"],
            "presentationIntentDigest": intent_digest,
        },
        "graph": graph,
        "presentationIntent": intent_block,
    }''',
)

edit(
    '''    print("wrote %s (base %s.., overlays %d, graphDigest %s..)"
          % (out_path, base_digest[:12], len(applied), graph_digest[:12]))''',
    '''    print("wrote %s (base %s.., overlays %d, graphDigest %s.., intents %d, intentDigest %s..)"
          % (out_path, base_digest[:12], len(applied), graph_digest[:12],
             len(presentation_intents), intent_digest[:12]))''',
)

print("ALL DUMP.PY EDITS APPLIED")
