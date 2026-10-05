"""Script -> recording semantic diff: APPROVED SCRIPT vs RECORDING TRANSCRIPTION.

Pure deterministic functions, stdlib only. No network, no DB, no new authorities.

`diff_script_recording(script, transcript)` returns a list of findings. Each
finding is a dict:
    {"type": <TYPE>, "location": <where in the script>, "evidence": <text>}

HEURISTICS (explicit, documented):
  Normalization (applied before every comparison): lowercase, expand
    contractions via CONTRACTION_MAP ("can't" -> "cannot", ...), strip all
    punctuation, collapse whitespace. Consequence: case/punctuation-only
    differences and contraction variants NEVER produce findings.
  Sentence alignment: split both texts on [.!?] boundaries. Each script
    sentence takes its best difflib ratio match among transcript sentences.
    ratio > 0.50 = aligned pair; anything lower = unmatched. Greedy, one
    transcript sentence used at most once, in script order (deterministic).
  NUMBER_CHANGED -- an aligned pair (ratio > 0.50) whose digit sequences
    (regex NUMBER_RE) differ: order-sensitive comparison of extracted
    numbers. Covers "44" -> "45", "1,000" -> "900", "3.5" -> "4".
  PROPER_NOUN_CHANGED -- per aligned pair: proper nouns are tokens matching
    ^[A-Z][a-z]{2,}$ that are NOT the first token of their sentence and NOT
    in COMMON_WORDS. A script proper noun is flagged only if its lowercase
    form does not appear among the transcript sentence's lowercase tokens,
    so case-only differences ("Denver" vs "denver") never flag while true
    substitutions ("Denver" -> "Boulder") do. (Set-based, so a noun that
    merely moved within the sentence does not flag.)
  CLAIM_CHANGED -- an aligned pair with 0.50 < ratio < 0.995 where both
    sides carry a claim word from CLAIM_WORDS, digit sequences are equal,
    but normalized text differs: the technical claim was reworded in a
    substantive way.
  QUALIFIER_REMOVED -- a qualifier from QUALIFIER_WORDS present in the
    script sentence (word-boundary or phrase match) but absent from the
    aligned transcript sentence; also fires when the whole script sentence
    is unmatched in the transcript.
  NEW_CLAIM_INTRODUCED -- a transcript sentence with no script match
    (best ratio <= 0.50) that carries a factual payload: a digit, a claim
    word from CLAIM_WORDS, or a proper noun. Pure filler ("um", "so yeah")
    is ignored.
  SECTION_OMITTED -- markdown headers (^#{1,6} ) in the script whose
    normalized header text does not appear as a substring of the normalized
    transcript. One finding per missing header.
  DISCLAIMER_REMOVED -- a disclaimer marker from DISCLAIMER_MARKERS present
    in the script (sentence-level or header-level) but absent from the
    aligned transcript sentence / whole transcript.

Limitations (documented, not hidden): word-form numbers ("forty-four") are
not tracked; proper-noun detection is orthographic, not linguistic; claim
word lists are fixed and reviewable.
"""

from __future__ import annotations

import difflib
import re

CONTRACTION_MAP = {
    "can't": "cannot", "won't": "will not", "don't": "do not",
    "doesn't": "does not", "didn't": "did not", "isn't": "is not",
    "aren't": "are not", "wasn't": "was not", "weren't": "were not",
    "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
    "couldn't": "could not", "shouldn't": "should not",
    "wouldn't": "would not", "mustn't": "must not", "needn't": "need not",
    "it's": "it is", "that's": "that is", "there's": "there is",
    "here's": "here is", "what's": "what is", "let's": "let us",
    "i'm": "i am", "you're": "you are", "we're": "we are",
    "they're": "they are", "i've": "i have", "you've": "you have",
    "we've": "we have", "i'll": "i will", "you'll": "you will",
    "it'll": "it will", "i'd": "i would", "you'd": "you would",
}

NUMBER_RE = re.compile(r"\b\d[\d,]*\.?\d*\b")
SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")
HEADER_RE = re.compile(r"^#{1,6}\s+(.+)$", re.MULTILINE)
PROPER_NOUN_RE = re.compile(r"^[A-Z][a-z]{2,}$")

CLAIM_WORDS = [
    "causes", "caused", "leads to", "proves", "proves that", "shows that",
    "demonstrates", "increases", "decreases", "improves", "reduces",
    "faster", "slower", "always", "never", "guarantees", "eliminates",
    "cures", "destroys",
]

QUALIFIER_WORDS = [
    "might", "may", "could", "possibly", "probably", "likely", "suggests",
    "appears", "seems", "in some cases", "often", "sometimes", "generally",
    "typically", "approximately", "roughly", "estimated", "about",
]

DISCLAIMER_MARKERS = [
    "disclaimer", "not legal advice", "not financial advice",
    "not medical advice", "results may vary", "your mileage may vary",
    "no guarantee", "this is not", "consult a professional",
    "do your own research", "for informational purposes", "no warranty",
    "at your own risk", "we don't know", "unknown", "uncertain",
]

COMMON_WORDS = {
    "The", "A", "An", "This", "That", "These", "Those", "It", "We", "You",
    "They", "He", "She", "I", "And", "But", "Or", "For", "Nor", "Yet",
    "So", "If", "Then", "When", "While", "Because", "As", "At", "By",
    "In", "On", "Of", "To", "From", "With", "About", "Into", "Over",
    "After", "Before", "Between", "During", "Through", "Here", "There",
    "What", "Which", "Who", "How", "Why", "Not", "No", "Yes", "All",
    "Any", "Each", "Few", "More", "Most", "Other", "Some", "Such", "Only",
    "One", "Two", "First", "Now", "Today",
}

ALIGN_THRESHOLD = 0.50


def normalize(text):
    """Lowercase, expand contractions, strip punctuation, collapse space."""
    t = text.lower()
    for contracted, expanded in CONTRACTION_MAP.items():
        t = re.sub(r"\b" + re.escape(contracted) + r"\b", expanded, t)
    t = re.sub(r"[^\w\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def split_sentences(text):
    return [s.strip() for s in SENTENCE_RE.split(text.strip()) if s.strip()]


def extract_numbers(sentence):
    return NUMBER_RE.findall(normalize(sentence))


def extract_proper_nouns(sentence):
    """Orthographic proper nouns: Capitalized tokens, not sentence-initial."""
    tokens = re.findall(r"[A-Za-z][\w']*", sentence)
    nouns = set()
    for i, tok in enumerate(tokens):
        if i == 0:
            continue
        if PROPER_NOUN_RE.match(tok) and tok not in COMMON_WORDS:
            nouns.add(tok)
    return nouns


def _has_any(normalized_sentence, terms):
    hits = []
    for term in terms:
        if " " in term:
            if term in normalized_sentence:
                hits.append(term)
        elif re.search(r"\b" + re.escape(term) + r"\b", normalized_sentence):
            hits.append(term)
    return hits


def align_sentences(script_sents, transcript_sents):
    """Greedy alignment: script order, best unused transcript match > 0.50.

    Returns (pairs, unmatched_script, unmatched_transcript) where pairs are
    (script_idx, transcript_idx, ratio).
    """
    norm_s = [normalize(s) for s in script_sents]
    norm_t = [normalize(s) for s in transcript_sents]
    used = set()
    pairs = []
    unmatched_script = []
    for si, ns in enumerate(norm_s):
        best, best_r = None, 0.0
        for ti, nt in enumerate(norm_t):
            if ti in used:
                continue
            r = difflib.SequenceMatcher(None, ns, nt, autojunk=False).ratio()
            if r > best_r:
                best, best_r = ti, r
        if best is not None and best_r > ALIGN_THRESHOLD:
            used.add(best)
            pairs.append((si, best, best_r))
        else:
            unmatched_script.append(si)
    unmatched_transcript = [ti for ti in range(len(norm_t)) if ti not in used]
    return pairs, unmatched_script, unmatched_transcript


def _finding(ftype, location, evidence):
    return {"type": ftype, "location": location, "evidence": evidence}


def diff_script_recording(script, transcript):
    """Semantic diff between approved script and recording transcription."""
    findings = []
    norm_transcript = normalize(transcript)

    script_sents = split_sentences(script)
    transcript_sents = split_sentences(transcript)
    pairs, unmatched_script, unmatched_transcript = align_sentences(
        script_sents, transcript_sents
    )

    for si, ti, ratio in pairs:
        s_sent, t_sent = script_sents[si], transcript_sents[ti]
        ns, nt = normalize(s_sent), normalize(t_sent)
        loc = "script sentence #%d: %s" % (si, s_sent[:70])

        s_nums = extract_numbers(s_sent)
        t_nums = extract_numbers(t_sent)
        if s_nums != t_nums:
            findings.append(
                _finding(
                    "NUMBER_CHANGED",
                    loc,
                    "numbers %s -> %s" % (s_nums, t_nums),
                )
            )

        s_nouns = extract_proper_nouns(s_sent)
        t_tokens_lower = set(re.findall(r"[A-Za-z][\w']*", t_sent.lower()))
        for noun in sorted(s_nouns):
            if noun.lower() not in t_tokens_lower:
                findings.append(
                    _finding(
                        "PROPER_NOUN_CHANGED",
                        loc,
                        "proper noun '%s' absent from aligned transcript sentence: %s"
                        % (noun, t_sent[:70]),
                    )
                )

        if 0.50 < ratio < 0.995 and s_nums == t_nums:
            s_claims = _has_any(ns, CLAIM_WORDS)
            t_claims = _has_any(nt, CLAIM_WORDS)
            if (s_claims or t_claims) and ns != nt:
                findings.append(
                    _finding(
                        "CLAIM_CHANGED",
                        loc,
                        "claim reworded (%s -> %s): %s ||| %s"
                        % (s_claims, t_claims, s_sent[:60], t_sent[:60]),
                    )
                )

        for q in _has_any(ns, QUALIFIER_WORDS):
            if q not in _has_any(nt, QUALIFIER_WORDS):
                findings.append(
                    _finding(
                        "QUALIFIER_REMOVED",
                        loc,
                        "qualifier '%s' present in script, absent in transcript"
                        % q,
                    )
                )

        for d in _has_any(ns, DISCLAIMER_MARKERS):
            if d not in _has_any(nt, DISCLAIMER_MARKERS):
                findings.append(
                    _finding(
                        "DISCLAIMER_REMOVED",
                        loc,
                        "disclaimer '%s' present in script, absent in transcript"
                        % d,
                    )
                )

    # Unmatched script sentences: check what was lost with them.
    for si in unmatched_script:
        s_sent = script_sents[si]
        ns = normalize(s_sent)
        loc = "script sentence #%d (no transcript match): %s" % (si, s_sent[:70])
        for q in _has_any(ns, QUALIFIER_WORDS):
            findings.append(
                _finding(
                    "QUALIFIER_REMOVED", loc,
                    "sentence carrying qualifier '%s' absent from transcript" % q,
                )
            )
        for d in _has_any(ns, DISCLAIMER_MARKERS):
            findings.append(
                _finding(
                    "DISCLAIMER_REMOVED", loc,
                    "sentence carrying disclaimer '%s' absent from transcript" % d,
                )
            )
        s_nums = extract_numbers(s_sent)
        if s_nums:
            findings.append(
                _finding(
                    "NUMBER_CHANGED", loc,
                    "numbers %s present in script, sentence absent from transcript"
                    % s_nums,
                )
            )

    # Unmatched transcript sentences: new factual claims introduced?
    for ti in unmatched_transcript:
        t_sent = transcript_sents[ti]
        nt = normalize(t_sent)
        nums = extract_numbers(t_sent)
        claims = _has_any(nt, CLAIM_WORDS)
        nouns = extract_proper_nouns(t_sent)
        if nums or claims or nouns:
            findings.append(
                _finding(
                    "NEW_CLAIM_INTRODUCED",
                    "transcript sentence #%d: %s" % (ti, t_sent[:70]),
                    "unscripted factual payload: numbers=%s claims=%s nouns=%s"
                    % (nums, claims, sorted(nouns)),
                )
            )

    # SECTION_OMITTED: markdown headers in script missing from transcript.
    for header in HEADER_RE.findall(script):
        if normalize(header) not in norm_transcript:
            findings.append(
                _finding(
                    "SECTION_OMITTED",
                    "script header: %s" % header.strip(),
                    "header text absent from normalized transcript",
                )
            )

    return findings
