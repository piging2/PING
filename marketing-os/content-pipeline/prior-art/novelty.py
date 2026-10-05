"""Novelty class recorder (MarketingOS content pipeline, idea #10b).

Binding source: Nolan's 2026-10-01 content directive. Three novelty classes
are recorded EXPLICITLY per claim so a publication candidate can never
accidentally use "we invented this" language.

Stdlib only. Pure deterministic functions over dict/JSON. No network, no DB,
no new authorities or stores. This module records what was explicitly
asserted; it never infers a novelty class and never upgrades a claim.

The three novelty classes:

  empirical     The claim asserts a new observed fact: a measurement, an
                outcome, a result that was not previously reported.

  mechanistic   The claim asserts a new causal mechanism: why or how
                something works, the process behind an observed effect.

  explanatory   The claim asserts a new explanation or framing: a
                reorganization of existing facts that yields new
                understanding, without new facts or mechanisms.

Recording is explicit: the novelty_class must be present on every claim
and must be one of the enum values. A missing or invalid value is an
error, not a default.
"""

NOVELTY_CLASSES = ("empirical", "mechanistic", "explanatory")


def record_novelty(claims):
    """Tag each claim with its novelty class.

    claims: list of {id, text, novelty_class}.

    Returns a list of {id, text, novelty_class} in the same order.
    Raises ValueError when novelty_class is missing or not in the enum.
    """
    recorded = []
    for i, claim in enumerate(claims or []):
        claim_id = claim.get("id", "<claim #%d>" % i)
        cls = claim.get("novelty_class")
        if cls is None:
            raise ValueError(
                "claim %r: novelty_class is required and must be explicit; "
                "got no value" % (claim_id,)
            )
        if cls not in NOVELTY_CLASSES:
            raise ValueError(
                "claim %r: novelty_class must be one of %r, got %r"
                % (claim_id, NOVELTY_CLASSES, cls)
            )
        recorded.append(
            {
                "id": claim_id,
                "text": claim.get("text", ""),
                "novelty_class": cls,
            }
        )
    return recorded


def novelty_statement(claims):
    """Honest aggregate over recorded claims.

    Restates nothing beyond the recorded classes: counts per class and
    the total. No adjectives, no upgrades, no implied importance.
    """
    recorded = record_novelty(claims)
    counts = {cls: 0 for cls in NOVELTY_CLASSES}
    for claim in recorded:
        counts[claim["novelty_class"]] += 1
    total = len(recorded)
    per_class = ", ".join(
        "%d %s" % (counts[cls], cls) for cls in NOVELTY_CLASSES
    )
    return (
        "%d of %d claims recorded with a novelty class (%s). "
        "This restates the recorded classes only."
        % (total, total, per_class)
    )
