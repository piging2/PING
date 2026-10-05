"""Claim ledger compiler + epistemic upgrade guard (MarketingOS content pipeline, idea #1).

Binding source: Nolan's 2026-10-01 content directive:
"Every serious artifact carries a machine-readable claim ledger: Claim | State |
Evidence | Counterevidence | Reproduction | Publication treatment."
"The writer must not be able to accidentally turn INFERRED into PROVEN during
prose generation."

Stdlib only. Pure deterministic functions over dict/JSON. No network, no DB,
no new authorities or stores. This module is machinery, not an authority:
it compiles and checks, it never publishes or decides truth.
"""

STATES = ("CONFIRMED", "PARTIALLY_SUPPORTED", "INFERRED", "UNKNOWN", "REFUTED")

# States the prose guard watches. Any certainty language applied to one of these
# claims is an epistemic upgrade and must be flagged.
GUARDED_STATES = ("INFERRED", "PARTIALLY_SUPPORTED", "UNKNOWN")

# Explicit certainty-phrase list. Phrases here are documented because the guard's
# job is only as good as this list; extend it, never silently.
# Matching is case-insensitive word/phrase boundary matching.
CERTAINTY_PHRASES = (
    "proven",          # "proven to", "has proven"
    "proved",          # "we proved that"
    "guaranteed",      # no outcome can be guaranteed
    "guarantee",       # "we guarantee"
    "always",          # universal claims from partial evidence
    "never fails",
    "definitely",
    "certainly",
    "without doubt",
    "no doubt",
    "undeniably",
    "conclusively",
    "incontrovertible",
    "established fact",
    "ironclad",
    "100%",
    "zero risk",
    # novelty claims: allowed only with prior-art basis (ties to idea #10).
    # The guard flags these when attached to a non-CONFIRMED claim; the
    # prior-art check itself lives in the prior-art classifier.
    "we invented",
    "novel",
    "first ever",
    "revolutionary",
)

# Publication treatment per state. Deterministic mapping: state in, treatment out.
TREATMENTS = {
    "CONFIRMED": {
        "mode": "publish_as_stated",
        "guidance": "May be asserted as fact in prose.",
        "allowed_wording": ["we confirmed", "measured", "reproduced"],
        "forbidden": [],
    },
    "PARTIALLY_SUPPORTED": {
        "mode": "hedge_required",
        "guidance": "May be published only with explicit qualification naming the limits.",
        "allowed_wording": [
            "evidence suggests",
            "in our tests so far",
            "appears to",
            "preliminary evidence indicates",
        ],
        "forbidden": ["proven", "guaranteed", "always", "definitely"],
    },
    "INFERRED": {
        "mode": "explicit_hedging_mandatory",
        "guidance": (
            "Must be framed as inference or hypothesis, never as established fact. "
            "The reasoning path (evidence -> inference) must stay visible."
        ),
        "allowed_wording": [
            "we infer",
            "hypothesis",
            "a plausible explanation",
            "our working model",
        ],
        "forbidden": ["proven", "guaranteed", "always", "definitely", "we invented"],
    },
    "UNKNOWN": {
        "mode": "render_as_unknown",
        "guidance": (
            "Must render as unknown: an open question, an unresolved limitation, "
            "never a factual assertion."
        ),
        "allowed_wording": [
            "unknown",
            "we do not yet know",
            "remains unresolved",
            "open question",
        ],
        "forbidden": ["proven", "guaranteed", "always", "definitely"],
    },
    "REFUTED": {
        "mode": "exclude_or_label_refuted",
        "guidance": (
            "Must be excluded from publication, or included only explicitly labeled "
            "as refuted (it may become the most trustworthy sentence)."
        ),
        "allowed_wording": ["refuted", "disproven", "turned out wrong", "did not hold"],
        "forbidden": ["proven", "guaranteed", "works", "confirmed"],
    },
}

# Words ignored when matching prose sentences to claims.
STOPWORDS = frozenset(
    """
    the a an and or of to in on for with we our us it is are was were be been
    this that these those as by at from into than then so but not no do does
    did has have had will would can could should may might must there their
    they them he she his her its what which who whom how when where why
    """.split()
)


def _validate_claim(claim):
    """Fail-closed validation of one raw claim dict."""
    if not isinstance(claim, dict):
        raise ValueError("claim must be a dict, got %r" % type(claim).__name__)
    missing = [k for k in ("id", "text", "state") if k not in claim]
    if missing:
        raise ValueError("claim missing required keys: %s" % ", ".join(missing))
    if claim["state"] not in STATES:
        raise ValueError(
            "claim %r has invalid state %r; must be one of %s"
            % (claim.get("id"), claim.get("state"), ", ".join(STATES))
        )
    if not claim["id"] or not str(claim["id"]).strip():
        raise ValueError("claim id must be non-empty")
    if not claim["text"] or not str(claim["text"]).strip():
        raise ValueError("claim %r text must be non-empty" % claim.get("id"))
    for key in ("evidence_refs", "counterevidence"):
        val = claim.get(key, [])
        if not isinstance(val, list):
            raise ValueError("claim %r %s must be a list" % (claim["id"], key))
    repro = claim.get("reproduction", {})
    if repro is None:
        repro = {}
    if not isinstance(repro, dict):
        raise ValueError("claim %r reproduction must be a dict" % claim["id"])
    return repro


def compile_ledger(claims):
    """Compile raw claims into ledger rows with publication treatments.

    claims: list of dicts, each with id, text, state, and optional
        evidence_refs (list), counterevidence (list), reproduction (dict).

    Returns list of ledger rows in input order. Each row:
        {id, text, state, evidence_refs, counterevidence, reproduction,
         publication_treatment}
    Raises ValueError on any invalid claim (fail closed).
    """
    if not isinstance(claims, list):
        raise ValueError("claims must be a list")
    seen = set()
    rows = []
    for claim in claims:
        repro = _validate_claim(claim)
        cid = str(claim["id"])
        if cid in seen:
            raise ValueError("duplicate claim id: %r" % cid)
        seen.add(cid)
        state = claim["state"]
        rows.append(
            {
                "id": cid,
                "text": str(claim["text"]),
                "state": state,
                "evidence_refs": list(claim.get("evidence_refs", [])),
                "counterevidence": list(claim.get("counterevidence", [])),
                "reproduction": dict(repro),
                "publication_treatment": dict(TREATMENTS[state]),
            }
        )
    return rows


def _keywords(text):
    """Content keywords of a claim: lowercase words, len>=5, minus stopwords."""
    words = []
    for token in str(text).lower().replace("/", " ").replace("-", " ").split():
        token = "".join(c for c in token if c.isalnum())
        if len(token) >= 5 and token not in STOPWORDS:
            words.append(token)
    # de-duplicated, order-preserving
    return list(dict.fromkeys(words))


def _split_sentences(prose):
    sentences = []
    buf = []
    for ch in str(prose):
        buf.append(ch)
        if ch in ".!?":
            s = "".join(buf).strip()
            if s:
                sentences.append(s)
            buf = []
    tail = "".join(buf).strip()
    if tail:
        sentences.append(tail)
    return sentences


def _mentions(sentence, keywords):
    """Does the sentence plausibly refer to the claim?"""
    if not keywords:
        return False
    lowered = " " + sentence.lower() + " "
    hits = sum(1 for k in keywords if (" " + k) in lowered or lowered.startswith(k + " "))
    needed = min(2, len(keywords))
    return hits >= needed


def _find_certainty_phrases(sentence):
    lowered = sentence.lower()
    found = []
    for phrase in CERTAINTY_PHRASES:
        if phrase in lowered:
            found.append(phrase)
    return found


def check_prose(ledger, prose):
    """Scan prose for epistemic upgrades against the ledger.

    For each claim in a GUARDED_STATE (INFERRED, PARTIALLY_SUPPORTED, UNKNOWN),
    if a sentence plausibly refers to the claim AND uses certainty language
    from CERTAINTY_PHRASES, flag a violation:
        {claim_id, state, offending_phrase, sentence}

    Returns a list of violations (empty list = prose is clean). Deterministic.
    """
    if not isinstance(ledger, list):
        raise ValueError("ledger must be a list of rows from compile_ledger")
    prose = str(prose or "")
    sentences = _split_sentences(prose)
    violations = []
    for row in ledger:
        if row.get("state") not in GUARDED_STATES:
            continue
        keywords = _keywords(row.get("text", ""))
        for sentence in sentences:
            if not _mentions(sentence, keywords):
                continue
            for phrase in _find_certainty_phrases(sentence):
                violations.append(
                    {
                        "claim_id": row["id"],
                        "state": row["state"],
                        "offending_phrase": phrase,
                        "sentence": sentence.strip()[:200],
                    }
                )
    return violations
