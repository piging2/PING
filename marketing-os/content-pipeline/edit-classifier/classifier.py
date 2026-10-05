"""Editorial edit classifier: PROPOSED THESIS v1 -> OWNER EDIT v2 -> APPROVED SCRIPT v3.

Pure deterministic functions, stdlib only. No network, no DB, no new authorities.

`classify_edits(v1, v2)` returns a list of findings. Each finding is a dict:
    {"class": <CLASS NAME>, "span": {"v1": [start, end], "v2": [start, end]},
     "evidence": <human-readable heuristic evidence>}

Line indices in spans are 0-based, end-exclusive, referring to the splitlines()
of v1 / v2 respectively.

HEURISTICS (explicit, documented, no magic):
  EDITORIAL REJECTION -- Whole-thesis rejection. Fires when v2 is effectively
    gone: SequenceMatcher line-ratio < 0.20 OR non-blank v2 chars < 25% of
    non-blank v1 chars. Early exit: no other classes are evaluated, because
    per-line diffs of a rejection are noise.
  HOOK REWRITTEN -- The hook is defined as the first non-blank paragraph
    (paragraphs split on blank lines). If v1's hook and v2's hook have
    difflib ratio < 0.90, the hook was rewritten. Pair-wise heuristics are
    skipped for replace-opcodes fully inside the rewritten hook span so the
    rewrite is reported once.
  STRUCTURE REORDERED -- Take the non-blank stripped lines common to v1 and
    v2. If at least 2 such lines exist and their relative order differs
    between v1 and v2 (v1 order sequence != v2 order sequence), blocks moved.
  CLAIM REMOVED -- A 'delete' opcode whose deleted lines contain at least one
    line where is_claim() is true.
    is_claim(line): (contains a digit-run via regex AND contains any of
    CLAIM_ASSERTION_WORDS) OR contains any of CLAIM_STRONG_WORDS.
  CLAIM QUALIFIED -- A 'replace' opcode pair where a v2 line and its v1
    counterpart have difflib ratio >= 0.60 and the v2 line contains a hedging
    word from HEDGING_WORDS (word-boundary match) that the v1 line lacks.
  TECHNICAL DETAIL ADDED -- An 'insert' opcode whose inserted lines contain a
    term from TECHNICAL_TERMS (case-insensitive substring).
  COUNTERARGUMENT ADDED -- An 'insert' opcode whose inserted lines contain a
    marker from COUNTERARGUMENT_MARKERS (case-insensitive substring).
  HUMOR ADDED -- An 'insert' opcode whose inserted lines contain a marker
    from JOKE_MARKERS.
  HUMOR REMOVED -- A 'delete' opcode whose deleted lines contain a marker
    from JOKE_MARKERS.
  JARGON REMOVED -- A 'delete' opcode (whole line) OR a 'replace' opcode
    where the v1 side contains a term from JARGON_TERMS (case-insensitive)
    and the v2 side no longer contains that term anywhere.
  EXPLANATION COMPRESSED -- A 'replace' opcode pair where len(v1 line) >= 80
    and len(v2 line) <= 0.60 * len(v1 line). Thresholds are fixed constants.
  EXAMPLE REPLACED -- A 'replace' opcode where both sides contain an example
    marker from EXAMPLE_MARKERS and the lines differ (ratio < 0.95).
  PERSONAL EXPERIENCE ADDED -- An 'insert' opcode whose inserted lines contain
    a marker from FIRST_PERSON_MARKERS (case-insensitive substring).

A single span may legitimately carry more than one class (e.g. a replaced line
that both drops jargon and compresses an explanation). Unclassified edits
(spelling fixes, punctuation) produce no finding: absence of a finding is not
a claim that nothing changed.
"""

from __future__ import annotations

import difflib
import re

# ---------------------------------------------------------------------------
# Explicit heuristic word lists. Every list below is a fixed, reviewable
# constant; classification decisions are traceable to these lists.
# ---------------------------------------------------------------------------

HEDGING_WORDS = [
    "might", "may", "could", "suggests", "suggest", "appears", "appear",
    "likely", "possibly", "probably", "seems", "seem", "arguably",
    "in some cases", "in many cases", "to some extent", "often", "sometimes",
    "generally", "typically", "roughly", "approximately",
]

JARGON_TERMS = [
    "synergy", "synergistic", "paradigm", "leverage", "disrupt",
    "disruptive", "holistic", "scalable", "robust", "seamless",
    "cutting-edge", "bleeding-edge", "deep dive", "bandwidth", "granular",
    "actionable", "next-gen", "utilize", "facilitate", "stakeholder",
    "thought leader", "low-hanging fruit", "move the needle", "circle back",
    "touch base", "deliverable", "ecosystem", "ideate", "pivot",
]

TECHNICAL_TERMS = [
    "kernel", "scheduler", "idempotency", "idempotent", "consensus",
    "quorum", "latency", "throughput", "backpressure", "sharding",
    "replication", "checkpoint", "deterministic replay", "event sourcing",
    "event log", "append-only", "vector index", "embedding", "hash",
    "signature", "protobuf", "mutex", "deadlock", "garbage collection",
    "opcode", "vector-clock", "idempotency key", "canonical bytes",
]

COUNTERARGUMENT_MARKERS = [
    "however", "on the other hand", "counterargument", "critics argue",
    "critic argues", "although", "despite", "nevertheless", "that said",
    "the objection", "rebuttal", "push back", "steelman",
]

JOKE_MARKERS = [
    "lol", "haha", "hehe", "lmao", "fun fact", "spoiler", "(joke",
    "dad joke", "punchline", "comedy", "tongue-in-cheek", "wink",
    "(yes, really)", "(no, really)",
]

FIRST_PERSON_MARKERS = [
    "i remember", "when i ", "i once", "my first", "i built", "i ran ",
    "i tried", "personally", "in my experience", "i learned", "i debugged",
    "i spent", "i watched", "i failed", "i shipped",
]

EXAMPLE_MARKERS = ["for example", "e.g.", "for instance", "such as", "like the"]

CLAIM_ASSERTION_WORDS = [
    "increase", "increases", "decrease", "decreases", "faster", "slower",
    "improves", "improve", "reduces", "reduce", "more", "less", "causes",
    "cause", "leads to", "proves", "prove", "shows", "demonstrates",
]

CLAIM_STRONG_WORDS = [
    "proves", "shows that", "demonstrates", "causes", "guarantees",
    "always", "never", "everyone", "no one",
]

_NUMBER_RE = re.compile(r"\d")


def _contains_any(text, terms):
    lowered = text.lower()
    return [t for t in terms if t in lowered]


def _contains_word(text, word):
    return re.search(r"\b" + re.escape(word) + r"\b", text.lower()) is not None


def is_claim(line):
    """A line is claim-bearing if it asserts a measurable/strong proposition.

    Heuristic: (has digits AND has an assertion word) OR has a strong claim
    word. Documented above; deliberately narrow so deletions of ordinary
    prose do not count as CLAIM REMOVED.
    """
    lowered = line.lower()
    has_number = bool(_NUMBER_RE.search(line))
    has_assertion = any(w in lowered for w in CLAIM_ASSERTION_WORDS)
    has_strong = any(w in lowered for w in CLAIM_STRONG_WORDS)
    return (has_number and has_assertion) or has_strong


def _paragraphs(lines):
    """Split lines into paragraphs on blank lines; returns (start, end, text)."""
    paras = []
    start = None
    for i, line in enumerate(lines + [""]):
        if line.strip():
            if start is None:
                start = i
        else:
            if start is not None:
                paras.append((start, i, "\n".join(lines[start:i])))
                start = None
    return paras


def _finding(cls, v1_span, v2_span, evidence):
    return {
        "class": cls,
        "span": {"v1": list(v1_span), "v2": list(v2_span)},
        "evidence": evidence,
    }


def _hook_span(lines):
    paras = _paragraphs(lines)
    if not paras:
        return (0, 0)
    return (paras[0][0], paras[0][1])


def classify_edits(v1, v2):
    """Classify the semantic edits between proposed thesis v1 and edited v2."""
    v1_lines = v1.splitlines()
    v2_lines = v2.splitlines()
    findings = []

    # --- EDITORIAL REJECTION (early exit) ---------------------------------
    matcher = difflib.SequenceMatcher(None, v1_lines, v2_lines, autojunk=False)
    v1_chars = sum(len(l) for l in v1_lines if l.strip())
    v2_chars = sum(len(l) for l in v2_lines if l.strip())
    rejected = matcher.ratio() < 0.20 or (
        v1_chars > 0 and v2_chars < 0.25 * v1_chars
    )
    if rejected:
        return [
            _finding(
                "EDITORIAL REJECTION",
                (0, len(v1_lines)),
                (0, len(v2_lines)),
                "line-ratio %.2f < 0.20 or kept-chars %d < 25%% of %d"
                % (matcher.ratio(), v2_chars, v1_chars),
            )
        ]

    # --- HOOK REWRITTEN ----------------------------------------------------
    hook_v1 = _hook_span(v1_lines)
    hook_v2 = _hook_span(v2_lines)
    hook_rewritten = False
    if hook_v1 != (0, 0) and hook_v2 != (0, 0):
        hook_text_v1 = "\n".join(v1_lines[hook_v1[0] : hook_v1[1]])
        hook_text_v2 = "\n".join(v2_lines[hook_v2[0] : hook_v2[1]])
        if hook_text_v1.strip() != hook_text_v2.strip():
            ratio = difflib.SequenceMatcher(
                None, hook_text_v1, hook_text_v2, autojunk=False
            ).ratio()
            if ratio < 0.90:
                hook_rewritten = True
                findings.append(
                    _finding(
                        "HOOK REWRITTEN",
                        hook_v1,
                        hook_v2,
                        "first-paragraph hook changed, difflib ratio %.2f < 0.90"
                        % ratio,
                    )
                )

    # --- STRUCTURE REORDERED -----------------------------------------------
    v1_common = [l.strip() for l in v1_lines if l.strip()]
    v2_common = [l.strip() for l in v2_lines if l.strip()]
    v2_set = set(v2_common)
    order_v1 = [l for l in v1_common if l in v2_set]
    v1_set = set(v1_common)
    order_v2 = [l for l in v2_common if l in v1_set]
    # dedupe while preserving first occurrence
    order_v1 = list(dict.fromkeys(order_v1))
    order_v2 = list(dict.fromkeys(order_v2))
    if (
        len(order_v1) >= 2
        and sorted(order_v1) == sorted(order_v2)
        and order_v1 != order_v2
    ):
        moved = [l for l in order_v1 if order_v1.index(l) != order_v2.index(l)]
        findings.append(
            _finding(
                "STRUCTURE REORDERED",
                (0, len(v1_lines)),
                (0, len(v2_lines)),
                "order of %d shared blocks differs; moved: %s"
                % (len(order_v1), "; ".join(m[:60] for m in moved[:3])),
            )
        )

    # --- opcode-driven classification --------------------------------------
    sm = difflib.SequenceMatcher(None, v1_lines, v2_lines, autojunk=False)
    v2_full = "\n".join(v2_lines).lower()

    def in_hook_span(a1, a2):
        return hook_rewritten and a1 >= hook_v1[0] and a2 <= hook_v1[1]

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        v1_seg = v1_lines[i1:i2]
        v2_seg = v2_lines[j1:j2]
        if tag == "delete":
            claims = [l for l in v1_seg if is_claim(l)]
            if claims:
                findings.append(
                    _finding(
                        "CLAIM REMOVED",
                        (i1, i2),
                        (j1, j1),
                        "deleted claim-bearing line(s): %s"
                        % "; ".join(c.strip()[:80] for c in claims),
                    )
                )
            jokes = [l for l in v1_seg if _contains_any(l, JOKE_MARKERS)]
            if jokes:
                findings.append(
                    _finding(
                        "HUMOR REMOVED",
                        (i1, i2),
                        (j1, j1),
                        "deleted joke-marker(s) %s in: %s"
                        % (
                            _contains_any(" ".join(jokes), JOKE_MARKERS),
                            " ".join(j.strip()[:60] for j in jokes),
                        ),
                    )
                )
            for l in v1_seg:
                dropped = [
                    t
                    for t in _contains_any(l, JARGON_TERMS)
                    if t not in v2_full
                ]
                if dropped:
                    findings.append(
                        _finding(
                            "JARGON REMOVED",
                            (i1, i2),
                            (j1, j1),
                            "dropped jargon term(s) %s from: %s"
                            % (dropped, l.strip()[:80]),
                        )
                    )
        elif tag == "insert":
            joined = " ".join(v2_seg)
            tech = _contains_any(joined, TECHNICAL_TERMS)
            if tech:
                findings.append(
                    _finding(
                        "TECHNICAL DETAIL ADDED",
                        (i1, i1),
                        (j1, j2),
                        "inserted technical term(s) %s in: %s"
                        % (tech, joined.strip()[:100]),
                    )
                )
            counter = _contains_any(joined, COUNTERARGUMENT_MARKERS)
            if counter:
                findings.append(
                    _finding(
                        "COUNTERARGUMENT ADDED",
                        (i1, i1),
                        (j1, j2),
                        "inserted counterargument marker(s) %s in: %s"
                        % (counter, joined.strip()[:100]),
                    )
                )
            jokes = _contains_any(joined, JOKE_MARKERS)
            if jokes:
                findings.append(
                    _finding(
                        "HUMOR ADDED",
                        (i1, i1),
                        (j1, j2),
                        "inserted joke-marker(s) %s in: %s"
                        % (jokes, joined.strip()[:100]),
                    )
                )
            firstp = _contains_any(joined, FIRST_PERSON_MARKERS)
            if firstp:
                findings.append(
                    _finding(
                        "PERSONAL EXPERIENCE ADDED",
                        (i1, i1),
                        (j1, j2),
                        "inserted first-person marker(s) %s in: %s"
                        % (firstp, joined.strip()[:100]),
                    )
                )
        elif tag == "replace" and not in_hook_span(i1, i2):
            # pair up lines by index; pair-wise heuristics need similar lines
            for k in range(max(len(v1_seg), len(v2_seg))):
                a = v1_seg[k] if k < len(v1_seg) else ""
                b = v2_seg[k] if k < len(v2_seg) else ""
                if not a.strip() or not b.strip():
                    continue
                ratio = difflib.SequenceMatcher(
                    None, a, b, autojunk=False
                ).ratio()
                # CLAIM QUALIFIED: hedging word inserted into a similar line
                new_hedges = [
                    w
                    for w in HEDGING_WORDS
                    if _contains_word(b, w.split()[0]) and w in b.lower()
                    and w not in a.lower()
                ]
                if ratio >= 0.60 and new_hedges:
                    findings.append(
                        _finding(
                            "CLAIM QUALIFIED",
                            (i1 + k, i1 + k + 1),
                            (j1 + k, j1 + k + 1),
                            "hedging word(s) %s inserted: %s -> %s"
                            % (new_hedges, a.strip()[:60], b.strip()[:60]),
                        )
                    )
                # JARGON REMOVED on replacement: term in v1 side, gone in v2
                dropped = [
                    t
                    for t in _contains_any(a, JARGON_TERMS)
                    if t not in v2_full
                ]
                if dropped:
                    findings.append(
                        _finding(
                            "JARGON REMOVED",
                            (i1 + k, i1 + k + 1),
                            (j1 + k, j1 + k + 1),
                            "dropped jargon term(s) %s: %s -> %s"
                            % (dropped, a.strip()[:60], b.strip()[:60]),
                        )
                    )
                # EXPLANATION COMPRESSED: long line shortened hard
                if len(a) >= 80 and len(b) <= 0.60 * len(a):
                    findings.append(
                        _finding(
                            "EXPLANATION COMPRESSED",
                            (i1 + k, i1 + k + 1),
                            (j1 + k, j1 + k + 1),
                            "line shortened %d -> %d chars (<=60%% of %d-char original)"
                            % (len(a), len(b), len(a)),
                        )
                    )
                # EXAMPLE REPLACED: both sides carry an example marker
                a_ex = _contains_any(a, EXAMPLE_MARKERS)
                b_ex = _contains_any(b, EXAMPLE_MARKERS)
                if a_ex and b_ex and ratio < 0.95:
                    findings.append(
                        _finding(
                            "EXAMPLE REPLACED",
                            (i1 + k, i1 + k + 1),
                            (j1 + k, j1 + k + 1),
                            "example changed: %s -> %s"
                            % (a.strip()[:70], b.strip()[:70]),
                        )
                    )

    return findings
