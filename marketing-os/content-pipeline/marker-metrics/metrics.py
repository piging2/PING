"""Fact-check marker measurer (MarketingOS projection content pipeline, idea #3).

Per Nolan's binding 2026-10-04 workflow-freeze directive, the first evaluation of a
source packet measures its red fact-check markers after Nolan's review pass, then
computes two scores that matter more than likes/impressions:

  research_accuracy  -- how often questionable assertions survived verification
  editorial_distance -- how much Nolan had to transform valid material before recording

All functions here are pure and deterministic: same JSON in, same JSON out, no
wall-clock, no network, no DB, no new authorities. Stdlib Python 3 only.

Marker schema
-------------
Each marker is a dict::

    {"id": "m-001", "resolution": "CONFIRMED", "note": "optional free text"}

``resolution`` must be one of: CONFIRMED, CORRECTED, QUALIFIED, REMOVED,
UNRESOLVED.

Formula 1: research_accuracy
----------------------------
    research_accuracy =
        (CONFIRMED + 0.5 * QUALIFIED)
        / (CONFIRMED + CORRECTED + QUALIFIED + REMOVED)

Rationale for the weights:
  - CONFIRMED (weight 1.0): the researcher's assertion stood as written.
  - QUALIFIED (weight 0.5): the assertion survived but needed a scope/degree
    caveat, so it counts as half-right.
  - CORRECTED (weight 0.0 in numerator): factually wrong as drafted; drags the
    score down via the denominator.
  - REMOVED (weight 0.0 in numerator): assertion was unusable as drafted.
  - UNRESOLVED: excluded from the denominator entirely (documented in the
    output under ``unresolved_note``). A pending investigation is not evidence
    of bad research, so it neither helps nor hurts the score.

If the denominator is 0 (no resolved markers at all), research_accuracy is
``None`` and ``accuracy_note`` explains why.

Formula 2: editorial_distance
-----------------------------
Input is a list of owner edits; each edit is a dict::

    {"edit_class": "CLAIM REMOVED", "note": "optional free text"}

    editorial_distance = sum of EDIT_WEIGHTS[edit_class] over all edits

``EDIT_WEIGHTS`` measures how far the owner moved the material away from what
was drafted, on a rough 1-3 scale:

  - weight 3 (claim-level surgery): CLAIM REMOVED, EDITORIAL REJECTION.
    A whole assertion died or an entire passage was rejected; the draft's
    information content changed, not just its polish.
  - weight 2 (substance changed, not deleted): CLAIM QUALIFIED,
    TECHNICAL DETAIL ADDED, COUNTERARGUMENT ADDED, EXAMPLE REPLACED.
  - weight 1.5 (framing/shape changed): HOOK REWRITTEN,
    EXPLANATION COMPRESSED, STRUCTURE REORDERED, PERSONAL EXPERIENCE ADDED.
  - weight 1 (surface polish): HUMOR ADDED/REMOVED, JARGON REMOVED.

Irreducibly-human classes (``IRREDUCIBLY_HUMAN``) are counted in the distance
like everything else but are additionally reported in
``human_flagged_edits``. Today that is PERSONAL EXPERIENCE ADDED: no research
system can supply Nolan's own lived experience, so the pipeline must never
treat that edit class as a failure to be optimized away. A reader of the report
can therefore separate "the draft needed real fixing" from "the draft needed
Nolan's voice".

Class names mirror the edit-classifier idea (#4) so the two modules share one
vocabulary. Unknown edit classes raise ValueError rather than being silently
ignored (unknown is a failure state, never a zero).
"""

from fractions import Fraction

RESOLUTIONS = ("CONFIRMED", "CORRECTED", "QUALIFIED", "REMOVED", "UNRESOLVED")

# Edit classes, shared vocabulary with the edit-classifier (idea #4).
EDIT_WEIGHTS = {
    "CLAIM REMOVED": 3.0,
    "EDITORIAL REJECTION": 3.0,
    "CLAIM QUALIFIED": 2.0,
    "TECHNICAL DETAIL ADDED": 2.0,
    "COUNTERARGUMENT ADDED": 2.0,
    "EXAMPLE REPLACED": 2.0,
    "HOOK REWRITTEN": 1.5,
    "EXPLANATION COMPRESSED": 1.5,
    "STRUCTURE REORDERED": 1.5,
    "PERSONAL EXPERIENCE ADDED": 1.5,
    "HUMOR ADDED/REMOVED": 1.0,
    "JARGON REMOVED": 1.0,
}

# Edits no research/draft system can ever supply; flagged separately so the
# system does not blindly optimize them away.
IRREDUCIBLY_HUMAN = frozenset({"PERSONAL EXPERIENCE ADDED"})

UNRESOLVED_NOTE = (
    "UNRESOLVED markers are excluded from the research_accuracy denominator: "
    "a pending investigation is not evidence of bad research, so it neither "
    "helps nor hurts the score. The unresolved marker ids are listed in "
    "unresolved_ids for follow-up."
)


def _validate_marker(marker):
    if not isinstance(marker, dict):
        raise TypeError("each marker must be a dict, got %r" % type(marker).__name__)
    if "id" not in marker:
        raise ValueError("marker missing required key 'id': %r" % (marker,))
    resolution = marker.get("resolution")
    if resolution not in RESOLUTIONS:
        raise ValueError(
            "marker %r has invalid resolution %r; expected one of %s"
            % (marker.get("id"), resolution, RESOLUTIONS)
        )
    return marker["id"], resolution


def _validate_edit(edit):
    if not isinstance(edit, dict):
        raise TypeError("each edit must be a dict, got %r" % type(edit).__name__)
    edit_class = edit.get("edit_class")
    if edit_class not in EDIT_WEIGHTS:
        raise ValueError(
            "unknown edit class %r; expected one of %s"
            % (edit_class, sorted(EDIT_WEIGHTS))
        )
    return edit_class


def measure_markers(markers):
    """Measure a list of fact-check markers.

    Returns a dict with per-resolution ``counts``, ``total``, ``unresolved_ids``,
    ``unresolved_note``, ``research_accuracy`` (float, or None when the
    denominator is 0), and ``accuracy_note``.
    """
    markers = list(markers)
    counts = {resolution: 0 for resolution in RESOLUTIONS}
    unresolved_ids = []
    for marker in markers:
        marker_id, resolution = _validate_marker(marker)
        counts[resolution] += 1
        if resolution == "UNRESOLVED":
            unresolved_ids.append(marker_id)

    denominator = (
        counts["CONFIRMED"]
        + counts["CORRECTED"]
        + counts["QUALIFIED"]
        + counts["REMOVED"]
    )
    numerator = counts["CONFIRMED"] + Fraction(1, 2) * counts["QUALIFIED"]
    if denominator == 0:
        accuracy = None
        accuracy_note = (
            "research_accuracy is undefined: no markers resolved yet "
            "(all markers UNRESOLVED or empty input)."
        )
    else:
        accuracy = float(Fraction(numerator, denominator))
        accuracy_note = (
            "research_accuracy = (CONFIRMED + 0.5*QUALIFIED) / "
            "(CONFIRMED + CORRECTED + QUALIFIED + REMOVED); "
            "UNRESOLVED excluded from the denominator."
        )

    return {
        "counts": counts,
        "total": len(markers),
        "unresolved_ids": unresolved_ids,
        "unresolved_note": UNRESOLVED_NOTE,
        "research_accuracy": accuracy,
        "accuracy_note": accuracy_note,
    }


def editorial_distance(edits):
    """Measure owner transformation distance over a list of owner edits.

    Returns a dict with ``edit_counts`` (per class), ``total_edits``,
    ``editorial_distance`` (float weighted sum), ``distance_note``, and
    ``human_flagged_edits`` (list of indices of irreducibly-human edits).
    """
    edits = list(edits)
    edit_counts = {cls: 0 for cls in EDIT_WEIGHTS}
    human_flagged = []
    for index, edit in enumerate(edits):
        edit_class = _validate_edit(edit)
        edit_counts[edit_class] += 1
        if edit_class in IRREDUCIBLY_HUMAN:
            human_flagged.append(index)

    distance = sum(EDIT_WEIGHTS[cls] * n for cls, n in edit_counts.items())
    return {
        "edit_counts": edit_counts,
        "total_edits": len(edits),
        "editorial_distance": float(distance),
        "distance_note": (
            "editorial_distance = sum of EDIT_WEIGHTS per edit class; weights "
            "3=claim surgery, 2=substance changed, 1.5=framing changed, "
            "1=surface polish. See module docstring for the full rationale."
        ),
        "human_flagged_edits": human_flagged,
        "human_flagged_note": (
            "Indices of edits in irreducibly-human classes %s: the draft system "
            "must not treat these as failures to optimize away."
            % sorted(IRREDUCIBLY_HUMAN)
        ),
    }


def measure_pipeline(markers, edits):
    """Convenience: measure markers and owner edits together into one report."""
    return {
        "markers": measure_markers(markers),
        "edits": editorial_distance(edits),
    }
