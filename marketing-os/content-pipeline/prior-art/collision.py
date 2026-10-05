"""Prior-art collision classifier (MarketingOS content pipeline, idea #10a).

Binding source: Nolan's 2026-10-01 content directive. Prior-art collision analysis
is MANDATORY before a thesis becomes a publication candidate.

Stdlib only. Pure deterministic functions over dict/JSON. No network, no DB,
no new authorities or stores. This module classifies collisions; it never
decides truth, never publishes, and never upgrades epistemic state.

The six collision classes (a thesis-centric taxonomy: what can the thesis
honestly still claim as its own?):

  KNOWN
      Prior art shares the principle AND the application. No defensible
      novelty claim remains on the colliding points.

  KNOWN BUT DIFFERENT APPLICATION
      The principle is shared, but the thesis applies it in a different
      application than the prior art. The novelty lives in the application,
      not the principle.

  KNOWN PRINCIPLE + NEW EMPIRICAL RESULT
      The principle is shared, but the thesis brings an empirical result
      the prior art does not report. Both facts are stated; neither is
      upgraded or downgraded.

  APPARENTLY NOVEL IMPLEMENTATION
      No overlap flags fire and there is enough relation information to say
      the thesis shares the domain but not the method. The novelty is
      explicitly in the implementation, per explicit input.

  APPARENTLY NOVEL RESULT
      No overlap flags fire and there is enough relation information to say
      the thesis shares the domain but not the finding. The novelty is
      explicitly in the finding, per explicit input.

  UNKNOWN
      No information at all: no overlap flags, no relation notes. UNKNOWN is
      never upgraded to novel by this module or anything downstream.

Deterministic rule table (first match wins, evaluated in this order):

  R1  overlap.principle and overlap.application
      and not thesis_new_empirical_result      -> KNOWN
  R2  overlap.principle and overlap.application
      and thesis_new_empirical_result          -> KNOWN PRINCIPLE + NEW EMPIRICAL RESULT
  R3  overlap.principle and not overlap.application
      and thesis_new_empirical_result          -> KNOWN PRINCIPLE + NEW EMPIRICAL RESULT
  R4  overlap.principle and not overlap.application
      and not thesis_new_empirical_result      -> KNOWN BUT DIFFERENT APPLICATION
  R5  overlap.empirical_result and not overlap.principle
                                                   -> KNOWN
      (the finding itself is already reported; a known result is KNOWN
      regardless of whether the underlying principle overlaps. If the
      input claims both overlap.empirical_result AND a new empirical
      result, the overlap flag wins: fail closed, KNOWN.)
  R6  overlap.implementation and not overlap.principle
      and not overlap.empirical_result         -> APPARENTLY NOVEL RESULT
      (same tool, new finding: the result is apparently novel, but the
      implementation is shared, so APPARENTLY NOVEL IMPLEMENTATION is
      explicitly NOT the class.)
  R7  no overlap flags, relation info present,
      novelty_locus == "implementation"         -> APPARENTLY NOVEL IMPLEMENTATION
  R8  no overlap flags, relation info present,
      novelty_locus in ("result", None)        -> APPARENTLY NOVEL RESULT
  R9  no overlap flags, no relation info       -> UNKNOWN

Notes:
- "relation info present" = prior_art item has non-empty relation_notes or
  a non-empty title. Similar domain without any flags is an explicit human
  judgment; it is never inferred by this module.
- novelty_locus is explicit input consulted ONLY when no overlap flags
  fire. It is ignored otherwise (documented, not silent).
- thesis_new_empirical_result is explicit input: does the thesis bring an
  empirical result the prior art does not report?
"""

KNOWN = "KNOWN"
KNOWN_DIFFERENT_APPLICATION = "KNOWN BUT DIFFERENT APPLICATION"
KNOWN_PRINCIPLE_NEW_RESULT = "KNOWN PRINCIPLE + NEW EMPIRICAL RESULT"
APPARENTLY_NOVEL_IMPLEMENTATION = "APPARENTLY NOVEL IMPLEMENTATION"
APPARENTLY_NOVEL_RESULT = "APPARENTLY NOVEL RESULT"
UNKNOWN = "UNKNOWN"

COLLISION_CLASSES = (
    KNOWN,
    KNOWN_DIFFERENT_APPLICATION,
    KNOWN_PRINCIPLE_NEW_RESULT,
    APPARENTLY_NOVEL_IMPLEMENTATION,
    APPARENTLY_NOVEL_RESULT,
    UNKNOWN,
)

NOVELTY_LOCI = ("implementation", "result")


def _flags(item):
    """Normalize the overlap dict to four bools (missing = False)."""
    overlap = item.get("overlap") or {}
    return {
        "principle": bool(overlap.get("principle", False)),
        "application": bool(overlap.get("application", False)),
        "empirical_result": bool(overlap.get("empirical_result", False)),
        "implementation": bool(overlap.get("implementation", False)),
    }


def _has_relation_info(item):
    return bool((item.get("relation_notes") or "").strip()) or bool(
        (item.get("title") or "").strip()
    )


def classify_item(item):
    """Classify one prior-art item. Returns dict with class + rationale."""
    item_id = item.get("id")
    flags = _flags(item)
    new_result = bool(item.get("thesis_new_empirical_result", False))
    locus = item.get("novelty_locus")
    if locus is not None and locus not in NOVELTY_LOCI:
        raise ValueError(
            "item %r: novelty_locus must be one of %r, got %r"
            % (item_id, NOVELTY_LOCI, locus)
        )
    relation = _has_relation_info(item)

    # R1
    if flags["principle"] and flags["application"] and not new_result:
        return {
            "id": item_id,
            "class": KNOWN,
            "rationale": "R1: principle and application overlap; no new empirical result.",
        }
    # R2
    if flags["principle"] and flags["application"] and new_result:
        return {
            "id": item_id,
            "class": KNOWN_PRINCIPLE_NEW_RESULT,
            "rationale": "R2: principle and application overlap, but the thesis "
            "brings a new empirical result.",
        }
    # R3
    if flags["principle"] and not flags["application"] and new_result:
        return {
            "id": item_id,
            "class": KNOWN_PRINCIPLE_NEW_RESULT,
            "rationale": "R3: principle overlaps; application differs and the thesis "
            "brings a new empirical result.",
        }
    # R4
    if flags["principle"] and not flags["application"] and not new_result:
        return {
            "id": item_id,
            "class": KNOWN_DIFFERENT_APPLICATION,
            "rationale": "R4: principle overlaps but the application differs.",
        }
    # R5
    if flags["empirical_result"] and not flags["principle"]:
        return {
            "id": item_id,
            "class": KNOWN,
            "rationale": "R5: the empirical result is already reported in prior art.",
        }
    # R6
    if (
        flags["implementation"]
        and not flags["principle"]
        and not flags["empirical_result"]
    ):
        return {
            "id": item_id,
            "class": APPARENTLY_NOVEL_RESULT,
            "rationale": "R6: implementation is shared; the result is apparently "
            "novel, so the result class applies, not the implementation class.",
        }
    # R7
    if not any(flags.values()) and relation and locus == "implementation":
        return {
            "id": item_id,
            "class": APPARENTLY_NOVEL_IMPLEMENTATION,
            "rationale": "R7: no overlap; relation info present; novelty locus is "
            "explicitly implementation.",
        }
    # R8
    if not any(flags.values()) and relation:
        return {
            "id": item_id,
            "class": APPARENTLY_NOVEL_RESULT,
            "rationale": "R8: no overlap; relation info present; novelty locus is "
            "explicitly result (default).",
        }
    # R9
    return {
        "id": item_id,
        "class": UNKNOWN,
        "rationale": "R9: no overlap flags and no relation information; "
        "UNKNOWN is never upgraded to novel.",
    }


def classify_collision(thesis_claims, prior_art):
    """Classify every prior-art item against the thesis claims.

    thesis_claims: list of claim dicts (kept for interface symmetry with
        idea #1's claim ledger; the collision decision is driven by the
        explicit per-item overlap flags, not by inference over the claims).
    prior_art: list of {id, title, relation_notes, overlap{...},
        thesis_new_empirical_result, novelty_locus}.

    Returns:
        {
            "items": [ {id, class, rationale}, ... ],
            "thesis_novelty_summary": <str>,
        }
    """
    thesis_claims = list(thesis_claims or [])
    prior_art = list(prior_art or [])
    items = [classify_item(item) for item in prior_art]

    by_class = {}
    for it in items:
        by_class.setdefault(it["class"], []).append(it["id"])

    novel_impl = by_class.get(APPARENTLY_NOVEL_IMPLEMENTATION, [])
    novel_result = by_class.get(APPARENTLY_NOVEL_RESULT, [])
    known = (
        by_class.get(KNOWN, [])
        + by_class.get(KNOWN_DIFFERENT_APPLICATION, [])
        + by_class.get(KNOWN_PRINCIPLE_NEW_RESULT, [])
    )
    unknown = by_class.get(UNKNOWN, [])

    # Strongest defensible statement. Never upgrades UNKNOWN to novel:
    # UNKNOWN ids are listed only as uninformative, never as evidence
    # for or against novelty.
    parts = []
    if novel_impl or novel_result:
        novel_bits = []
        if novel_impl:
            novel_bits.append(
                "apparently novel implementation: %s" % ", ".join(novel_impl)
            )
        if novel_result:
            novel_bits.append(
                "apparently novel result: %s" % ", ".join(novel_result)
            )
        parts.append(
            "Defensible novelty (%d thesis claim(s) surveyed): %s."
            % (len(thesis_claims), "; ".join(novel_bits))
        )
    else:
        parts.append(
            "No defensible novelty claim over %d thesis claim(s) surveyed: "
            "no item classifies as apparently novel." % len(thesis_claims)
        )
    if known:
        parts.append(
            "Prior-art collisions (%d): %s." % (len(known), ", ".join(known))
        )
    if unknown:
        parts.append(
            "Insufficient information (%d): %s. These contribute nothing "
            "to the novelty claim either way." % (len(unknown), ", ".join(unknown))
        )

    return {
        "items": items,
        "thesis_novelty_summary": " ".join(parts),
    }
