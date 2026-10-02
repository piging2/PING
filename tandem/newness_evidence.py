#!/usr/bin/env python3
"""Newness-evidence gate for b-new-business-radar (self-audit 2026-09-24).

Production evidence: run 20260924-210718 (b-new-business-radar) named 10
items. The 3 collision-clear names that verified as real businesses carried
ZERO dated newness evidence inside the 60-90 day radar window:
  - Garage Doors And More LLC: quoted SOS filing 2025-01-18 (615 days old).
  - Resolve Garage Motor: "new Facebook page with zero reviews" contradicted
    by dated reviews back to 2021 (operating 5+ years).
  - Pure Air: "opened its doors in 2026" (bare year, unresolvable).
Round verdict: ZERO new-filing qualifications; 3 staged as ordinary
newly-discovered prospects with no newness claim.

RULE (precise): a b-new-business-radar item qualifies as a new-business hit
ONLY with explicit dated evidence that resolves to a calendar date within
90 days before the run date:
  dated evidence = (calendar date, source fragment) pairs from
    SOS formation/filing/organization/registration dates,
    dated grand-opening announcements,
    dated launch posts,
    dated chamber new-member listings.
The brief asks "last 60-90 days"; a date fresher than 60 days is strictly
fresher signal, never a failure. The fail condition is ONLY age > 90 days.

Classification for (entry_text, run_date):
  OK           at least one resolvable newness date, none older than
               run_date - 90 days.
  WINDOW_FAIL  at least one resolvable newness date older than
               run_date - 90 days.
  INSUFFICIENT no resolvable newness date, or a bare year that straddles
               the window floor. Thin website, zero reviews,
               "appears new", "brand-new", "just launched" without a date,
               unverified agent assertions, and undated "new member" claims
               are INSUFFICIENT. Missing or imprecise evidence is never
               positive evidence.
               A bare year FULLY outside the window (Dec 31 of the year
               predates run_date - 90d) counts as WINDOW_FAIL: it is
               evidence of age, just imprecise.

INSUFFICIENT / WINDOW_FAIL items may still stage as ordinary
newly-discovered prospects (no new-filing tag); they never count as radar
hits. This gate governs distill qualification, NOT the answer contract
minimum: an entry without a resolvable date is still a real business for
the "at least 3 real businesses" count. Missing evidence stays neutral at
contract time; it only fails at radar-hit time.
"""
import importlib.util
import os
import re
from datetime import date, datetime, timedelta

_TANDEM = os.path.expanduser("~/workspace/tandem")


def _load_validate():
    spec = importlib.util.spec_from_file_location(
        "validate_research_contract",
        os.path.join(_TANDEM, "validate-research-contract.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_NEWNESS_RE = re.compile(
    r"form(?:s|ed|ation)?\b|fil(?:ed|ing)|incorporat|organiz"
    r"|regist(?:ered|ration)|found(?:ed)?|grand opening|opened|opening"
    r"|launch(?:ed|es|ing)?|new member|joined|established"
    r"|in business since|\bsince\s+20\d{2}\b|opened its doors"
    r"|just (?:opened|launched)|newly (?:opened|launched|formed)",
    re.I)

_MONTHS = {"january": 1, "february": 2, "march": 3, "april": 4, "may": 5,
           "june": 6, "july": 7, "august": 8, "september": 9, "october": 10,
           "november": 11, "december": 12}

# "Month D, YYYY" is missing from shared parse_timing() but is the most
# common formation-date form in Meta answers. Parse it locally; do not
# touch shared parse_timing() semantics (c-brief timing tests depend on them).
_MONTH_D_YYYY_RE = re.compile(
    r"(january|february|march|april|may|june|july|august|september|october"
    r"|november|december)\s+(\d{1,2}),\s*(20\d{2})",
    re.I)

_BARE_YEAR_RE = re.compile(r"\b(20\d{2})\b")


def _newness_date(sentence):
    m = _MONTH_D_YYYY_RE.search(sentence)
    if m:
        try:
            return date(int(m.group(3)), _MONTHS[m.group(1).lower()],
                        int(m.group(2)))
        except ValueError:
            return None
    return None

# Phrases that LOOK like newness claims but carry no calendar evidence.
_INFERENCE_RE = re.compile(
    r"appears?\s+new|looks?\s+new|seems?\s+new|thin\s+(?:profile|website|web)"
    r"|zero\s+reviews|no\s+reviews|no\s+web\s+presence|brand[\s-]?new"
    r"|just\s+(?:started|opened|launched)\b(?!\s+(?:in|on)\s)",
    re.I)


def _as_date(run_date):
    if isinstance(run_date, datetime):
        return run_date.date()
    return run_date


def extract_newness_dates(entry_text):
    """Return the list of resolvable newness dates in the entry.

    Only sentences that carry a newness keyword are parsed, so review
    dates, contract dates, and background dates are never mistaken for
    formation evidence. parse_timing() semantics are reused: a bare year,
    a year range, or vague words return None (unresolvable, not failure).
    """
    va = _load_validate()
    dates = []
    for sentence in re.split(r"(?<=[.!?])\s+|\n", entry_text or ""):
        if _NEWNESS_RE.search(sentence):
            d = _newness_date(sentence)
            if d is None:
                # Fall back to shared parse_timing(); pass a dummy
                # far-future run_date so relative offsets can never
                # accidentally land in-window (they are filtered below).
                d = va.parse_timing(sentence, date(2099, 12, 31))
            if d is not None and d <= date(2099, 6, 1):
                dates.append(d)
    return dates


def extract_bare_newness_years(entry_text):
    """Bare years inside newness sentences (no resolvable month/day).

    A bare year fully outside the window is still evidence of age: if
    Dec 31 of the year predates run_date - 90d, the business predates the
    window. A bare year that straddles the window floor (the current
    calendar year, or the prior year when the floor falls in it) stays
    INSUFFICIENT: imprecise is not failure. Sentences that already yielded
    a resolvable date are skipped.
    """
    va = _load_validate()
    years = []
    for sentence in re.split(r"(?<=[.!?])\s+|\n", entry_text or ""):
        if not _NEWNESS_RE.search(sentence):
            continue
        if _newness_date(sentence) is not None:
            continue
        if va.parse_timing(sentence, date(2099, 12, 31)) is not None:
            continue
        for m in _BARE_YEAR_RE.finditer(sentence):
            years.append(int(m.group(1)))
    return sorted(set(years))


def classify_newness(entry_text, run_date):
    """Classify a b-radar entry's newness evidence.

    Returns dict(version, verdict, dates, reason). verdict in
    {OK, WINDOW_FAIL, INSUFFICIENT}. Deterministic: same text + same
    run_date always yields the same verdict.
    """
    rd = _as_date(run_date)
    dates = extract_newness_dates(entry_text)
    oldest_allowed = rd - timedelta(days=90)
    # 2026-09-26 (production, run 20260926-030517): a newness date AFTER the
    # run date is not opening evidence. "Ribbon cutting set for Nov 10"
    # (future of the run) classified OK as "in-window" because the gate
    # only rejected dates older than the floor. A future celebration cannot
    # show the business opened in the last 60-90 days, so future dates are
    # excluded from the evidence set; the entry stands or falls on its past
    # dates alone. Exclusion (not WINDOW_FAIL) so a future grand opening
    # alongside a genuine in-window filing still passes on the filing.
    future = [d for d in dates if d > rd]
    dates = [d for d in dates if d <= rd]
    future_note = (f" {len(future)} future-dated claim(s) excluded as "
                   f"non-evidence." if future else "")
    if not dates:
        for year in extract_bare_newness_years(entry_text):
            if date(year, 12, 31) < oldest_allowed:
                return {"version": "newness-evidence-v1",
                        "verdict": "WINDOW_FAIL",
                        "dates": [],
                        "reason": f"bare-year newness evidence {year} "
                                  f"predates window floor "
                                  f"{oldest_allowed.isoformat()} "
                                  f"(whole calendar year outside window)"}
        reason = ("no resolvable newness date (thin profile / zero reviews / "
                  "'appears new' language is inference, not evidence)" +
                  future_note)
        return {"version": "newness-evidence-v1", "verdict": "INSUFFICIENT",
                "dates": [], "reason": reason}
    aged = [d for d in dates if d < oldest_allowed]
    if aged:
        return {"version": "newness-evidence-v1", "verdict": "WINDOW_FAIL",
                "dates": [d.isoformat() for d in dates],
                "reason": f"newness date {min(dates).isoformat()} older than "
                          f"90 days before {rd.isoformat()} "
                          f"(window floor {oldest_allowed.isoformat()})" +
                          future_note}
    return {"version": "newness-evidence-v1", "verdict": "OK",
            "dates": [d.isoformat() for d in dates],
            "reason": f"dated newness evidence within 90 days of "
                      f"{rd.isoformat()}" + future_note}
