"""Effect chain tracker + artifact lineage projection.

track_chain(events):
    Ordered effect chain:
        ARTIFACT -> AUTHORIZATION -> DISTRIBUTION -> VERIFIED EFFECT ->
        QUALIFIED ATTENTION -> EXPERT RESPONSE -> ADOPTION/INTENT ->
        OUTCOME -> ATTRIBUTION -> LEARNING
    Each link is {stage, state: KNOWN|UNKNOWN, evidence_refs|reason}.
    events: list of {"stage": STAGE_NAME, "evidence_ref": str}. A stage with
    at least one event is KNOWN (its evidence_refs listed); a stage with no
    event is UNKNOWN with an explicit reason -- never treated as complete.

    Anti-conflation guards (fail-safe, documented):
      - WORKER_COMPLETED != EFFECT VERIFIED (a worker finishing is not a
        verified effect; VERIFIED EFFECT needs evidence_refs of its own).
      - ENGAGEMENT != BUSINESS OUTCOME (engagement metrics do not populate
        the OUTCOME link; only outcome-class evidence does).

project_lineage(lineage_events):
    Mission Control lineage projection nodes:
        RESEARCH -> SOURCE PACKET -> EDIT -> SCRIPT APPROVED -> RECORDING ->
        RECORDING VERIFIED -> MEDIA BUILD -> MEDIA VERIFIED ->
        PUBLICATION APPROVED -> DISTRIBUTION -> EFFECT -> OUTCOME -> LEARNING
    Each node answers seven questions:
        what_is_this, produced_by, digest_version, evidence,
        changed_from_previous, approval, blocks_next.
    lineage_events: {node_name: {question_key: value}}. Any missing node or
    missing answer is the literal string "UNKNOWN" with a reason -- never
    invented. Digests are never fabricated.
"""

EFFECT_CHAIN_STAGES = (
    "ARTIFACT",
    "AUTHORIZATION",
    "DISTRIBUTION",
    "VERIFIED_EFFECT",
    "QUALIFIED_ATTENTION",
    "EXPERT_RESPONSE",
    "ADOPTION_INTENT",
    "OUTCOME",
    "ATTRIBUTION",
    "LEARNING",
)

LINEAGE_NODES = (
    "RESEARCH",
    "SOURCE_PACKET",
    "EDIT",
    "SCRIPT_APPROVED",
    "RECORDING",
    "RECORDING_VERIFIED",
    "MEDIA_BUILD",
    "MEDIA_VERIFIED",
    "PUBLICATION_APPROVED",
    "DISTRIBUTION",
    "EFFECT",
    "OUTCOME",
    "LEARNING",
)

LINEAGE_QUESTIONS = (
    "what_is_this",
    "produced_by",
    "digest_version",
    "evidence",
    "changed_from_previous",
    "approval",
    "blocks_next",
)

_UNKNOWN = "UNKNOWN"

# Static node definitions: what each node is. produced_by / digest / evidence
# / changed / approval / blocks come from lineage_events or are UNKNOWN.
_NODE_DEFINITIONS = {
    "RESEARCH": "foundational evidence and observations for the artifact",
    "SOURCE_PACKET": "overcomplete editorial intelligence packet compiled from research",
    "EDIT": "owner/editorial edit pass over the packet and script",
    "SCRIPT_APPROVED": "script text approved for production",
    "RECORDING": "recorded audio/video performance of the script",
    "RECORDING_VERIFIED": "recording checked against the approved script",
    "MEDIA_BUILD": "assembled media artifact (video render, subtitles, thumbnail)",
    "MEDIA_VERIFIED": "media checked against recording, script, and facts",
    "PUBLICATION_APPROVED": "publication proposal approved for distribution",
    "DISTRIBUTION": "artifact published to destinations",
    "EFFECT": "observed downstream effects of distribution",
    "OUTCOME": "business or mission outcomes attributed to the artifact",
    "LEARNING": "recorded learnings feeding future artifacts",
}

# Guard notes attached to the chain output. These are enforcement of the
# binding rule that effect-class evidence must never be implied from
# activity-class evidence.
_CHAIN_GUARDS = [
    "WORKER_COMPLETED != EFFECT VERIFIED: worker completion events may not "
    "populate VERIFIED_EFFECT; that link requires effect-class evidence.",
    "ENGAGEMENT != BUSINESS OUTCOME: engagement metrics may not populate "
    "OUTCOME; that link requires outcome-class evidence.",
]


def track_chain(events):
    """Build the 10-link effect chain from evidence events.

    Returns {"links": [ {stage, state, evidence_refs|reason}, ... ],
             "guard_notes": [...], "unknown_stages": [...]}.
    """
    events = events or []
    by_stage = {}
    for ev in events:
        stage = (ev or {}).get("stage")
        if stage in EFFECT_CHAIN_STAGES:
            by_stage.setdefault(stage, []).append(ev.get("evidence_ref", _UNKNOWN))

    links = []
    for stage in EFFECT_CHAIN_STAGES:
        if stage in by_stage:
            links.append({
                "stage": stage,
                "state": "KNOWN",
                "evidence_refs": list(by_stage[stage]),
            })
        else:
            links.append({
                "stage": stage,
                "state": "UNKNOWN",
                "reason": "no evidence event recorded for stage %s" % stage,
            })

    return {
        "links": links,
        "guard_notes": list(_CHAIN_GUARDS),
        "unknown_stages": [l["stage"] for l in links if l["state"] == "UNKNOWN"],
    }


def project_lineage(lineage_events):
    """Project the 13-node Mission Control lineage.

    Returns {"nodes": [ {node, what_is_this, produced_by, digest_version,
    evidence, changed_from_previous, approval, blocks_next,
    missing: [...]}, ... ]}. Missing answers are explicit UNKNOWN; digests
    are never invented.
    """
    lineage_events = lineage_events or {}
    nodes = []
    for node in LINEAGE_NODES:
        provided = lineage_events.get(node) or {}
        entry = {"node": node, "what_is_this": _NODE_DEFINITIONS[node]}
        missing = []
        for q in ("produced_by", "digest_version", "evidence",
                  "changed_from_previous", "approval", "blocks_next"):
            value = provided.get(q)
            if value is None or value == "":
                entry[q] = _UNKNOWN
                missing.append(q)
            else:
                entry[q] = value
        entry["missing"] = missing
        entry["note"] = ("node absent from input" if node not in lineage_events
                         else "node partially documented")
        nodes.append(entry)
    return {"nodes": nodes}
