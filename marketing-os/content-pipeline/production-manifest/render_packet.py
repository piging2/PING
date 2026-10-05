"""Lightweight pre-generation storyboard gate / render packet (idea #5b).

Built AFTER editorial approval, BEFORE generation. The packet is a compact
decision surface for Nolan: normally GO_GENERATE, or change 2-3 things.

Pure deterministic functions over dict/JSON. Stdlib only. No network, no DB,
no new authorities. Epistemic state is never upgraded: forbidden_visual_claims
are passed through VERBATIM.
"""

import hashlib

RENDER_PACKET_VERSION = "1"

MIN_BEAT_SECONDS = 3.0


def _sections_of(approved_script):
    """Return a list of (title, text) beats in script order.

    Accepted script shapes:
      {"sections": [{"title"|"heading": ..., "text"|"body": ...}, ...]}
      {"sections": {"Title": "text", ...}}            (dict, insertion order)
      {"text": "..."}                                 (split on blank lines)
    """
    sections = approved_script.get("sections")
    if isinstance(sections, list):
        out = []
        for i, s in enumerate(sections):
            title = s.get("title", s.get("heading", "beat-%d" % (i + 1)))
            text = s.get("text", s.get("body", ""))
            out.append((str(title), str(text)))
        return out
    if isinstance(sections, dict):
        return [(str(k), str(v)) for k, v in sections.items()]
    text = approved_script.get("text", "")
    parts = [p.strip() for p in str(text).split("\n\n")]
    return [
        ("beat-%d" % (i + 1), p) for i, p in enumerate(parts) if p
    ] or [("beat-1", "")]


def _word_count(text):
    return len(text.split())


def _visual_purpose(title, index, total):
    """Deterministic visual purpose per beat from title keywords."""
    lowered = title.lower()
    if index == 0 or any(k in lowered for k in ("hook", "intro", "opening")):
        return "hook the viewer and set the thesis"
    if any(k in lowered for k in ("demo", "demonstration", "reproduce", "repro")):
        return "demonstrate the claim with real evidence or a live reproduction"
    if any(k in lowered for k in ("evidence", "proof", "result", "finding")):
        return "show the evidence that supports the claim"
    if any(k in lowered for k in ("counter", "objection", "limitation", "caveat")):
        return "acknowledge the counterargument honestly"
    if any(k in lowered for k in ("outro", "conclusion", "cta", "call")):
        return "land the takeaway and the call to action"
    return "explain the point: %s" % title


def _proportional_durations(word_counts, total_seconds):
    """Split total_seconds across beats proportional to word count.

    Every beat gets at least MIN_BEAT_SECONDS. Rounding is deterministic:
    tenths, remainder assigned to the largest beats in order.
    """
    n = len(word_counts)
    if n == 0:
        return []
    weights = [max(w, 1) for w in word_counts]
    total_w = sum(weights)
    raw = [max(MIN_BEAT_SECONDS, total_seconds * w / total_w) for w in weights]
    # If minimums blew the budget, scale down proportionally.
    if sum(raw) > total_seconds:
        raw = [total_seconds * w / total_w for w in weights]
    tenths = [int(r * 10) for r in raw]
    remainder = int(round(total_seconds * 10)) - sum(tenths)
    order = sorted(range(n), key=lambda i: (-weights[i], i))
    for i in range(remainder):
        tenths[order[i % n]] += 1
    return [t / 10.0 for t in tenths]


def build_render_packet(approved_script, options):
    """Build the render packet dict.

    approved_script:
      {"script_id": str, "version": str,
       "sections": [...] | {...} | absent (then "text" is split),
       "editorial_approval_status": str (must be APPROVED to gate GENERATE)}
    options:
      voice, style, target_duration_seconds, aspect_ratios (list),
      forbidden_visual_claims (list, passthrough verbatim),
      claim_bindings (optional): {section_index_or_title: [claim_id, ...]},
      screen_recordings (optional): {section_index_or_title: [desc, ...]},
      diagrams (optional): {section_index_or_title: [desc, ...]},
      text_overlays (optional): {section_index_or_title: [desc, ...]},
      thumbnail_concept (optional)

    Returns the packet dict. The decision field is "GO_GENERATE" only when
    editorial_approval_status == "APPROVED"; otherwise "NOT_GATED".
    """
    if "script_id" not in approved_script or "version" not in approved_script:
        raise ValueError("approved_script needs script_id and version")

    sections = _sections_of(approved_script)
    word_counts = [_word_count(text) for _, text in sections]
    total_seconds = float(
        options.get(
            "target_duration_seconds",
            max(30.0, sum(word_counts) / 2.5),
        )
    )
    durations = _proportional_durations(word_counts, total_seconds)

    claim_bindings = options.get("claim_bindings", {}) or {}
    screen_recordings = options.get("screen_recordings", {}) or {}
    diagrams = options.get("diagrams", {}) or {}
    text_overlays = options.get("text_overlays", {}) or {}

    # Forbidden visual claims pass through VERBATIM: never reworded, never merged.
    forbidden = list(options.get("forbidden_visual_claims", []))

    def _lookup(mapping, index, title):
        for key in (index, str(index), title):
            if key in mapping:
                return list(mapping[key])
        return []

    beats = []
    cursor = 0.0
    for i, ((title, text), wc, dur) in enumerate(
        zip(sections, word_counts, durations)
    ):
        beat_id = "beat-%02d" % (i + 1)
        claims = _lookup(claim_bindings, i, title)
        beats.append(
            {
                "beat_id": beat_id,
                "section_index": i,
                "section_title": title,
                "text": text,
                "word_count": wc,
                "target_duration_seconds": dur,
                "starts_at_seconds": round(cursor, 1),
                "ends_at_seconds": round(cursor + dur, 1),
                "visual_purpose": _visual_purpose(title, i, len(sections)),
                "factual_visuals_required": claims,
                "screen_recordings_needed": _lookup(screen_recordings, i, title),
                "diagrams_needed": _lookup(diagrams, i, title),
                "text_overlays": _lookup(text_overlays, i, title),
                "generation_prompt": (
                    "Generate a %s visual for beat %s (%s): %s. "
                    "Visual purpose: %s. Style: %s. "
                    "Do NOT depict any of: %s. No unsupported visual claims."
                    % (
                        options.get("style", "technical"),
                        beat_id,
                        title,
                        text[:200],
                        _visual_purpose(title, i, len(sections)),
                        options.get("style", "technical"),
                        "; ".join(forbidden) if forbidden else "n/a",
                    )
                ),
            }
        )
        cursor += dur

    # Derivative opportunities, derived deterministically from beats:
    # each beat is a short-form cut candidate; first beat doubles as the
    # thumbnail anchor; beats with numbers are pull-quote candidates.
    derivative_opportunities = []
    for b in beats:
        derivative_opportunities.append(
            {
                "kind": "short_form_cut",
                "source_beat": b["beat_id"],
                "window_seconds": [b["starts_at_seconds"], b["ends_at_seconds"]],
                "rationale": "self-contained semantic beat",
            }
        )
    if beats:
        derivative_opportunities.insert(
            0,
            {
                "kind": "thumbnail_concept",
                "source_beat": beats[0]["beat_id"],
                "rationale": options.get(
                    "thumbnail_concept", "hook beat visual, no clickbait claims"
                ),
            },
        )
    for b in beats:
        if any(ch.isdigit() for ch in b["text"]):
            derivative_opportunities.append(
                {
                    "kind": "pull_quote_graphic",
                    "source_beat": b["beat_id"],
                    "rationale": "beat contains numeric evidence",
                }
            )

    approval = approved_script.get("editorial_approval_status")
    decision = "GO_GENERATE" if approval == "APPROVED" else "NOT_GATED"

    packet_id = hashlib.sha256(
        ("%s|%s" % (approved_script["script_id"], approved_script["version"]))
        .encode("utf-8")
    ).hexdigest()[:16]

    return {
        "packet_version": RENDER_PACKET_VERSION,
        "packet_id": packet_id,
        "script_id": approved_script["script_id"],
        "script_version": approved_script["version"],
        "editorial_approval_status": approval,
        "decision": decision,
        "voice": options.get("voice"),
        "style": options.get("style"),
        "target_duration_seconds": total_seconds,
        "aspect_ratios": list(options.get("aspect_ratios", ["16:9"])),
        "forbidden_visual_claims": forbidden,
        "beats": beats,
        "derivative_opportunities": derivative_opportunities,
        "gate_options": ["GO_GENERATE", "REQUEST_CHANGES"],
    }
