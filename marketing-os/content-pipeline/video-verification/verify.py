"""Multimodal video verification engine.

MarketingOS content-pipeline idea #6 (video-verification).

The finished video can lie even with perfect narration: narration says one
architecture and the diagram shows another, a subtitle changes a number, a
screenshot is stale, a code sample does not match the described behavior, chart
labels do not match the narration, a generated visual implies something
unsupported, B-roll shows credentials or private data.

Crucially: SCRIPT VERIFIED does not imply VIDEO VERIFIED. The final video
needs its own bounded verification pass. That is what this module does.

Pure stdlib Python 3. Pure deterministic functions over dict/JSON. No network,
no DB, no new authorities or stores. Determinism notes:
  - Number matching is token-based and case-insensitive; commas are stripped.
  - Datetime comparisons are naive wall-clock (tzinfo is stripped, never
    converted), so results do not depend on the machine timezone.
  - Iteration order follows report order; findings are emitted in check order.

Finding classes (exactly one per finding; PASS is a verdict only):
  CONTENT ERROR            - the visual track asserts a concrete number the
                             narration never says (onscreen-text divergence)
  VISUAL CONTRADICTION     - a diagram claim contradicts the transcript
                             (shares the topic, asserts a different figure)
  SUBTITLE ERROR           - a subtitle introduces a number absent from the
                             transcript (subtitles may condense, never invent)
  PRIVACY-SECRET RISK      - onscreen text / described content matches a
                             secret pattern (PUBLICATION_BLOCKED)
  STALE SCREENSHOT         - screenshot captured_at older than the freshness
                             bound in inputs (or missing/unparseable)
  UNSUPPORTED VISUAL CLAIM - a diagram claim the transcript never supports
                             (no contradiction, just no backing)
  TIMING-EDITORIAL ISSUE   - negative, duplicate, or non-monotonic timestamps
  PASS                     - verdict only: zero findings
"""

from __future__ import annotations

import re
from datetime import datetime

FINDING_CLASSES = (
    "CONTENT ERROR",
    "VISUAL CONTRADICTION",
    "SUBTITLE ERROR",
    "PRIVACY-SECRET RISK",
    "STALE SCREENSHOT",
    "UNSUPPORTED VISUAL CLAIM",
    "TIMING-EDITORIAL ISSUE",
    "PASS",
)

# Blocking classes per Nolan's 2026-10-04 workflow-freeze directive: a content
# error or a privacy/secret risk in the finished video blocks publication.
BLOCKING = {"CONTENT ERROR", "PRIVACY-SECRET RISK"}

_VERDICTS = ("PUBLICATION_BLOCKED", "NEEDS_FIX", "PASS")


# ---------------------------------------------------------------------------
# Check 1/2/3 shared helpers: numbers and keywords
# ---------------------------------------------------------------------------

_NUMBER_RE = re.compile(r"\d[\d,]*(?:\.\d+)?%?")

# Number words map to values and compose across adjacent words, so
# "three layers" vs "four layers" and "nine percent" vs "nine hundred
# percent" are real number comparisons, not string misses.
_WORD_VAL = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
    "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30,
    "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
    "eighty": 80, "ninety": 90,
}
_MAGNITUDE = {
    "hundred": 100, "thousand": 1000, "million": 1000000, "billion": 1000000000,
}

_WORD_RE = re.compile(r"[a-z0-9]+")

_STOPWORDS = frozenset(
    "the a an and or of to in is are was were be been with for on at by it its "
    "this that these those as from our we you your i my if but not no so than "
    "then there their they them he she his her has have had do does did will "
    "would can could should may might must about into over after before between "
    "all any each other such only also just now".split()
)


def _word_numbers(text):
    """Compose adjacent number words: "nine hundred" -> 900, "two" -> 2.

    A run of number words accumulates; a non-number word flushes the run.
    "hundred" multiplies the current run ("two hundred" -> 200); thousand/
    million/billion multiply and bank into the total ("one million two
    hundred" -> 1000200 is NOT handled - runs bank only at thousand-scale
    boundaries, which covers the realistic narration cases).
    """
    out = set()
    total = 0
    current = 0
    active = False

    def flush():
        nonlocal total, current, active
        if active:
            out.add(str(total + current))
        total, current, active = 0, 0, False

    for word in _WORD_RE.findall((text or "").lower()):
        if word in _WORD_VAL:
            current += _WORD_VAL[word]
            active = True
        elif word in _MAGNITUDE:
            current = (current or 1) * _MAGNITUDE[word]
            active = True
            if _MAGNITUDE[word] >= 1000:
                total += current
                current = 0
        else:
            flush()
    flush()
    return out


def _numbers(text):
    """All numbers in text: digit tokens (commas stripped) plus composed
    number words.

    CHECK DOCUMENTATION (check 1, subtitle-vs-transcript): a subtitle may omit
    numbers from the transcript (condensation is normal) but must never
    introduce a number the transcript never said. Any subtitle number not in
    the transcript number set is a SUBTITLE ERROR. This asymmetry is
    deliberate: omission is editorial, invention is fabrication.
    """
    if not text:
        return set()
    found = {m.group(0).replace(",", "").lower() for m in _NUMBER_RE.finditer(text)}
    found |= _word_numbers(text)
    return found


def _normalize(text):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", (text or "").lower())).strip()


def _keywords(text):
    return {
        w for w in _WORD_RE.findall((text or "").lower())
        if w not in _STOPWORDS
    }


def _claim_supported(claim, transcript_norm, transcript_keywords):
    """CHECK DOCUMENTATION (check 2, diagram-vs-transcript): a diagram claim is
    supported when its normalized text is a substring of the transcript, or when
    every content keyword of the claim appears in the transcript. Otherwise it
    is unsupported, and the caller distinguishes contradiction (same topic, new
    number) from merely unsupported (no topic overlap, no new number)."""
    claim_norm = _normalize(claim)
    if claim_norm and claim_norm in transcript_norm:
        return True
    claim_keys = _keywords(claim)
    if claim_keys and claim_keys <= transcript_keywords:
        return True
    return False


# ---------------------------------------------------------------------------
# Check 4: secret patterns
# ---------------------------------------------------------------------------

# CHECK DOCUMENTATION (check 4, privacy-secret risk): explicit list of secret
# patterns scanned over every visual_timeline onscreen_text, every screenshot
# described_content, and every subtitle text. A hit means B-roll / a screenshot /
# the screen recording shows something credential-like. This is deliberately
# conservative: it cannot prove a value is a live secret, but a finished video
# that *looks* like it leaks credentials is blocked until a human clears it.
_SECRET_PATTERNS = [
    (re.compile(r"api[_-]?key\s*[:=]"), "api_key="),
    (re.compile(r"\bpassword\b", re.IGNORECASE), "password"),
    (re.compile(r"\bpasswd\b", re.IGNORECASE), "passwd"),
    (re.compile(r"\bsecret\b", re.IGNORECASE), "secret"),
    (re.compile(r"\bcredential", re.IGNORECASE), "credential-like"),
    (re.compile(r"\bsk-[A-Za-z0-9_-]{8,}"), "sk-"),
    (re.compile(r"\bbearer\s+[A-Za-z0-9._~+/=-]{8,}", re.IGNORECASE), "bearer token"),
    (re.compile(r"\baws_access_key_id\b", re.IGNORECASE), "aws_access_key_id"),
    (re.compile(r"\baws_secret_access_key\b", re.IGNORECASE), "aws_secret_access_key"),
    (re.compile(r"\bxox[bap]-", re.IGNORECASE), "slack token"),
    (re.compile(r"\bghp_[A-Za-z0-9]{8,}"), "github token"),
    (re.compile(r"-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----"), "private key"),
]


def _scan_secrets(text):
    hits = []
    for pattern, label in _SECRET_PATTERNS:
        if pattern.search(text or ""):
            hits.append(label)
    return hits


# ---------------------------------------------------------------------------
# Check 3: screenshot freshness
# ---------------------------------------------------------------------------

def _parse_iso(value):
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _naive(dt):
    return dt.replace(tzinfo=None) if dt is not None else None


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def _check_subtitles(report):
    """CHECK 1 documented in _numbers above."""
    findings = []
    transcript_numbers = _numbers(report.get("transcript"))
    for i, cue in enumerate(report.get("subtitles") or []):
        for num in sorted(_numbers(cue.get("text"))):
            if num not in transcript_numbers:
                findings.append({
                    "check": "subtitle_numbers",
                    "class": "SUBTITLE ERROR",
                    "detail": (
                        "subtitle cue %d introduces number '%s' absent from the "
                        "transcript" % (i, num)
                    ),
                    "artifact": {"cue": i, "t": cue.get("t"), "text": cue.get("text")},
                })
    return findings


def _check_onscreen(report):
    """CHECK DOCUMENTATION: any number shown on screen must be spoken in the
    narration. An unspoken onscreen number is a CONTENT ERROR: the visual track
    asserts a concrete fact the narration never says (e.g. chart label says
    "500 users" while narration says "200")."""
    findings = []
    transcript_numbers = _numbers(report.get("transcript"))
    for i, beat in enumerate(report.get("visual_timeline") or []):
        for num in sorted(_numbers(beat.get("onscreen_text"))):
            if num not in transcript_numbers:
                findings.append({
                    "check": "onscreen_numbers",
                    "class": "CONTENT ERROR",
                    "detail": (
                        "visual beat %d (t=%s) shows number '%s' on screen that "
                        "the transcript never says" % (i, beat.get("t"), num)
                    ),
                    "artifact": {
                        "beat": i, "t": beat.get("t"),
                        "onscreen_text": beat.get("onscreen_text"),
                    },
                })
    return findings


def _check_diagrams(report):
    """CHECK 2 documented in _claim_supported above. Split:

    - VISUAL CONTRADICTION: unsupported claim that shares topic keywords with
      the transcript but asserts a number the transcript never says (e.g.
      narration says "three layers", diagram claim says "four layers").
    - UNSUPPORTED VISUAL CLAIM: unsupported claim with no topic overlap and no
      new number (e.g. diagram advertises a tier the narration never mentions).
    """
    findings = []
    transcript = report.get("transcript") or ""
    transcript_norm = _normalize(transcript)
    transcript_keys = _keywords(transcript)
    transcript_numbers = _numbers(transcript)
    for diagram in report.get("diagrams") or []:
        for claim in diagram.get("claims_shown") or []:
            if _claim_supported(claim, transcript_norm, transcript_keys):
                continue
            claim_keys = _keywords(claim)
            new_numbers = _numbers(claim) - transcript_numbers
            if (claim_keys & transcript_keys) and new_numbers:
                findings.append({
                    "check": "diagram_claims",
                    "class": "VISUAL CONTRADICTION",
                    "detail": (
                        "diagram '%s' claim contradicts transcript: shares "
                        "topic but asserts number(s) %s absent from narration"
                        % (diagram.get("id"),
                           ", ".join("'%s'" % n for n in sorted(new_numbers)))
                    ),
                    "artifact": {"diagram": diagram.get("id"), "claim": claim},
                })
            else:
                findings.append({
                    "check": "diagram_claims",
                    "class": "UNSUPPORTED VISUAL CLAIM",
                    "detail": (
                        "diagram '%s' claim has no support in transcript: %s"
                        % (diagram.get("id"), claim)
                    ),
                    "artifact": {"diagram": diagram.get("id"), "claim": claim},
                })
    return findings


def _check_screenshots(report, inputs):
    """CHECK 3 DOCUMENTATION: a screenshot whose captured_at is older than
    inputs["screenshot_freshness_days"] before inputs["now"] is STALE
    SCREENSHOT. Missing or unparseable captured_at is also STALE SCREENSHOT:
    freshness cannot be proven, so it fails closed. If inputs["now"] is absent
    the check cannot be evaluated and is skipped (no finding)."""
    findings = []
    days = inputs.get("screenshot_freshness_days", 30)
    now = _naive(_parse_iso(inputs.get("now")))
    for shot in report.get("screenshots") or []:
        captured = _naive(_parse_iso(shot.get("captured_at")))
        if captured is None:
            findings.append({
                "check": "screenshot_freshness",
                "class": "STALE SCREENSHOT",
                "detail": (
                    "screenshot '%s' has no usable captured_at; freshness "
                    "cannot be proven" % shot.get("id")
                ),
                "artifact": {"screenshot": shot.get("id")},
            })
        elif now is None:
            continue
        elif (now - captured).total_seconds() > days * 86400:
            findings.append({
                "check": "screenshot_freshness",
                "class": "STALE SCREENSHOT",
                "detail": (
                    "screenshot '%s' captured at %s is older than the %d-day "
                    "freshness bound" % (shot.get("id"), shot.get("captured_at"), days)
                ),
                "artifact": {
                    "screenshot": shot.get("id"),
                    "captured_at": shot.get("captured_at"),
                },
            })
    return findings


def _check_secrets(report):
    """CHECK 4 documented in _SECRET_PATTERNS above."""
    findings = []
    surfaces = []
    for i, beat in enumerate(report.get("visual_timeline") or []):
        surfaces.append(("visual_timeline[%d].onscreen_text" % i, beat.get("onscreen_text")))
    for shot in report.get("screenshots") or []:
        surfaces.append(
            ("screenshots['%s'].described_content" % shot.get("id"), shot.get("described_content"))
        )
    for i, cue in enumerate(report.get("subtitles") or []):
        surfaces.append(("subtitles[%d].text" % i, cue.get("text")))
    for surface, text in surfaces:
        for label in _scan_secrets(text):
            findings.append({
                "check": "secret_patterns",
                "class": "PRIVACY-SECRET RISK",
                "detail": (
                    "secret pattern '%s' matched in %s" % (label, surface)
                ),
                "artifact": {"surface": surface},
            })
    return findings


def _check_timing(report):
    """CHECK 5 DOCUMENTATION (timing/overlap anomalies): timestamps must be
    non-negative, and strictly increasing within each ordered list. A negative
    t, a duplicate t, or a t earlier than its predecessor is a
    TIMING-EDITORIAL ISSUE. Duplicate t is flagged even for overlapping
    overlays: simultaneous visuals belong in one beat. Missing t is skipped,
    not flagged (absence of timing is not an anomaly)."""
    findings = []
    for name in ("visual_timeline", "subtitles"):
        prev = None
        for i, item in enumerate(report.get(name) or []):
            t = item.get("t")
            if t is None:
                continue
            if t < 0:
                detail = "%s[%d] has negative timestamp t=%s" % (name, i, t)
            elif prev is not None and t < prev:
                detail = "%s[%d] timestamp t=%s precedes previous t=%s" % (name, i, t, prev)
            elif prev is not None and t == prev:
                detail = "%s[%d] duplicate timestamp t=%s" % (name, i, t)
            else:
                prev = t
                continue
            findings.append({
                "check": "timing",
                "class": "TIMING-EDITORIAL ISSUE",
                "detail": detail,
                "artifact": {"list": name, "index": i, "t": t},
            })
            prev = t
    return findings


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def verify_media(report, inputs=None):
    """Run the full bounded verification pass over a finished-video report.

    report: {recording_digest, transcript, visual_timeline[{t, description,
              onscreen_text}], subtitles[{t, text}],
              screenshots[{id, captured_at, described_content}],
              diagrams[{id, claims_shown[]}]}
    inputs: {"now": ISO datetime string, "screenshot_freshness_days": int}

    Returns a list of findings, each {"check", "class", "detail", "artifact"}.
    An empty list means no violations were found; verdict() maps that to PASS.
    """
    report = report or {}
    inputs = inputs or {}
    findings = []
    findings += _check_subtitles(report)
    findings += _check_onscreen(report)
    findings += _check_diagrams(report)
    findings += _check_screenshots(report, inputs)
    findings += _check_secrets(report)
    findings += _check_timing(report)
    return findings


def verdict(findings):
    """Map findings to a publication verdict.

    PUBLICATION_BLOCKED if any CONTENT ERROR or PRIVACY-SECRET RISK is present;
    NEEDS_FIX for any other finding; PASS when there are no findings.
    """
    classes = {f.get("class") for f in (findings or [])}
    if classes & BLOCKING:
        return "PUBLICATION_BLOCKED"
    if findings:
        return "NEEDS_FIX"
    return "PASS"
