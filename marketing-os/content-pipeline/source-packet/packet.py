"""Source packet builder (MarketingOS content pipeline, idea #2).

A source packet is a deliberately OVERCOMPLETE editorial intelligence packet.
It is NOT a polished script: it gathers everything the research found (including
observations that do not fit the narrative, contradictions, and unknowns) so
downstream editorial stages can choose, not inherit, a conclusion.

Pure stdlib Python, deterministic functions over dict/JSON. No network, no DB,
no new authorities/stores.
"""

from __future__ import annotations

import copy

CLAIM_STATES = ("CONFIRMED", "REFUTED", "UNCLEAR")

# All sections a complete packet must carry.
SECTIONS = (
    "thesis",
    "why_now",
    "audience",
    "evidence",
    "interesting_observations",
    "possible_arguments",
    "counterargument",
    "unknowns",
    "firsthand_evidence",
    "demonstrations_available",
    "hook_candidates",
    "narrative_candidates",
    "claim_matrix",
    "visual_opportunities",
    "source_material",
)

# Source-material provenance fields every entry must carry.
PROVENANCE_FIELDS = ("retrieved_at", "source_uri", "content_hash")

# Sections that must be non-empty for the packet to be editorially usable.
REQUIRED_NONEMPTY = (
    "thesis",
    "why_now",
    "audience",
    "evidence",
    "counterargument",
    "unknowns",
    "narrative_candidates",
    "claim_matrix",
    "source_material",
)


def _as_text(value):
    """Coerce to str; None becomes ''."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def _as_list(value):
    """Coerce to a fresh list; None becomes []."""
    if value is None:
        return []
    if isinstance(value, list):
        return list(value)
    return [value]


def _as_dict(value):
    """Coerce to a fresh dict; None becomes {}."""
    if value is None:
        return {}
    if isinstance(value, dict):
        return dict(value)
    return {}


def _deep_copy(value):
    return copy.deepcopy(value)


def _empty(value):
    """True when a section value carries no usable content."""
    if value is None:
        return True
    if isinstance(value, (str, list, dict)):
        return len(value) == 0
    return False


def _normalize_audience(raw):
    """audience = {who: str, sophistication: str}."""
    aud = _as_dict(raw)
    return {
        "who": _as_text(aud.get("who")),
        "sophistication": _as_text(aud.get("sophistication")),
    }


def _normalize_evidence(raw):
    """evidence = {primary: [], independent: [], weaker: [], contradictions: []}."""
    ev = _as_dict(raw)
    return {
        "primary": [_deep_copy(i) for i in _as_list(ev.get("primary"))],
        "independent": [_deep_copy(i) for i in _as_list(ev.get("independent"))],
        "weaker": [_deep_copy(i) for i in _as_list(ev.get("weaker"))],
        "contradictions": [_deep_copy(i) for i in _as_list(ev.get("contradictions"))],
    }


def _normalize_claim_matrix(raw):
    """claim_matrix = [{claim: str, state: CONFIRMED|REFUTED|UNCLEAR, note: str}].

    build_packet does NOT coerce or upgrade states: an unknown state is kept
    verbatim so validate_packet can flag it instead of silently fixing it.
    """
    out = []
    for item in _as_list(raw):
        entry = _as_dict(item)
        out.append(
            {
                "claim": _as_text(entry.get("claim")),
                "state": _as_text(entry.get("state")),
                "note": _as_text(entry.get("note")),
            }
        )
    return out


def _normalize_narrative_candidates(raw):
    """narrative_candidates = [{name: str, arc: str, notes: str}]."""
    out = []
    for item in _as_list(raw):
        cand = _as_dict(item)
        out.append(
            {
                "name": _as_text(cand.get("name")),
                "arc": _as_text(cand.get("arc")),
                "notes": _as_text(cand.get("notes")),
            }
        )
    return out


def _normalize_source_material(raw):
    """source_material = [{..., retrieved_at, source_uri, content_hash}].

    Provenance fields are never invented: missing provenance stays missing and
    validate_packet flags it.
    """
    out = []
    for item in _as_list(raw):
        src = _as_dict(item)
        out.append(_deep_copy(src))
    return out


def build_packet(research):
    """Build a complete source packet from a research dict.

    Missing input sections yield empty sections (empty string, empty list,
    or section-shaped empties), never exceptions. Every key in SECTIONS is
    always present in the returned packet. Deterministic: identical input
    dicts produce identical packet dicts.
    """
    research = _as_dict(research)
    return {
        "thesis": _as_text(research.get("thesis")),
        "why_now": _as_text(research.get("why_now")),
        "audience": _normalize_audience(research.get("audience")),
        "evidence": _normalize_evidence(research.get("evidence")),
        "interesting_observations": [
            _as_text(o) for o in _as_list(research.get("interesting_observations"))
        ],
        "possible_arguments": [
            _as_text(a) for a in _as_list(research.get("possible_arguments"))
        ],
        "counterargument": _as_text(research.get("counterargument")),
        "unknowns": [_as_text(u) for u in _as_list(research.get("unknowns"))],
        "firsthand_evidence": [
            _deep_copy(f) for f in _as_list(research.get("firsthand_evidence"))
        ],
        "demonstrations_available": [
            _deep_copy(d) for d in _as_list(research.get("demonstrations_available"))
        ],
        "hook_candidates": [
            _as_text(h) for h in _as_list(research.get("hook_candidates"))
        ],
        "narrative_candidates": _normalize_narrative_candidates(
            research.get("narrative_candidates")
        ),
        "claim_matrix": _normalize_claim_matrix(research.get("claim_matrix")),
        "visual_opportunities": [
            _deep_copy(v) for v in _as_list(research.get("visual_opportunities"))
        ],
        "source_material": _normalize_source_material(
            research.get("source_material")
        ),
    }


def validate_packet(packet):
    """Return a list of missing/weak section findings for a packet.

    Each finding is a dict: {code: str, section: str, detail: str}.
    An empty list means the packet is structurally complete and editorially
    usable. Deterministic.
    """
    findings = []
    packet = _as_dict(packet)

    # 1. Every section key must exist.
    for section in SECTIONS:
        if section not in packet:
            findings.append(
                {
                    "code": "MISSING_SECTION",
                    "section": section,
                    "detail": "section key absent from packet",
                }
            )

    # 2. Required sections must be non-empty.
    for section in REQUIRED_NONEMPTY:
        if section not in packet:
            continue  # already reported above
        value = packet[section]
        if _empty(value):
            findings.append(
                {
                    "code": "EMPTY_SECTION",
                    "section": section,
                    "detail": "section present but empty",
                }
            )

    # 3. At least 2 narrative candidates (genuinely different, not one conclusion).
    if "narrative_candidates" in packet:
        cands = _as_list(packet.get("narrative_candidates"))
        if len(cands) < 2:
            findings.append(
                {
                    "code": "TOO_FEW_NARRATIVES",
                    "section": "narrative_candidates",
                    "detail": "fewer than 2 narrative candidates: "
                    "found %d, need at least 2" % len(cands),
                }
            )

    # 4. Counterargument must be substantive, not a placeholder.
    if "counterargument" in packet:
        ca = _as_text(packet.get("counterargument")).strip()
        if len(ca) < 20:
            findings.append(
                {
                    "code": "WEAK_COUNTERARGUMENT",
                    "section": "counterargument",
                    "detail": "counterargument missing or too short to be a "
                    "serious objection (need >= 20 chars, have %d)" % len(ca),
                }
            )

    # 5. Claim matrix states restricted to CONFIRMED / REFUTED / UNCLEAR.
    for idx, entry in enumerate(_as_list(packet.get("claim_matrix"))):
        entry = _as_dict(entry)
        state = _as_text(entry.get("state"))
        if state not in CLAIM_STATES:
            findings.append(
                {
                    "code": "INVALID_CLAIM_STATE",
                    "section": "claim_matrix",
                    "detail": "entry %d has state %r; allowed: %s"
                    % (idx, state, "/".join(CLAIM_STATES)),
                }
            )
        if not _as_text(entry.get("claim")).strip():
            findings.append(
                {
                    "code": "EMPTY_CLAIM_TEXT",
                    "section": "claim_matrix",
                    "detail": "entry %d has empty claim text" % idx,
                }
            )

    # 6. Every source_material item must carry provenance.
    for idx, src in enumerate(_as_list(packet.get("source_material"))):
        src = _as_dict(src)
        missing = [f for f in PROVENANCE_FIELDS if not _as_text(src.get(f)).strip()]
        if missing:
            findings.append(
                {
                    "code": "MISSING_PROVENANCE",
                    "section": "source_material",
                    "detail": "entry %d missing provenance fields: %s"
                    % (idx, ", ".join(missing)),
                }
            )

    # 7. Audience needs both who and sophistication.
    if "audience" in packet:
        aud = _as_dict(packet.get("audience"))
        if not _as_text(aud.get("who")).strip():
            findings.append(
                {
                    "code": "AUDIENCE_WHO_MISSING",
                    "section": "audience",
                    "detail": "audience.who is empty",
                }
            )
        if not _as_text(aud.get("sophistication")).strip():
            findings.append(
                {
                    "code": "AUDIENCE_SOPHISTICATION_MISSING",
                    "section": "audience",
                    "detail": "audience.sophistication is empty",
                }
            )

    return findings
