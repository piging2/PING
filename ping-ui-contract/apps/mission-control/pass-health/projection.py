#!/usr/bin/env python3
"""Pass-health panel projection builders (ping-ui-contract MC slice).

Pure functions over journal rows. This is the projection half of the
spine's final leg (MC PROJECTION); the query half lives in
mission-control/pass_queries.py. Honest builders: a gap is labeled as a
gap, a missing value renders as unknown, never as zero and never as
fresh. No prose pass logs are read; if the events and the prose ever
disagree, the events win.

Spec: ~/workspace/orca-mc-convergence/PANEL-SPEC.md
"""

import os
import sys
from datetime import datetime, timezone

_HERE = os.path.dirname(os.path.abspath(__file__))
_MC = os.path.normpath(os.path.join(_HERE, "..", "..", "..",
                                    "mission-control"))
if _MC not in sys.path:
    sys.path.insert(0, _MC)

from pass_queries import (  # noqa: E402
    latest_closed, seven_day_rollup, unknown_count_for_pass,
    _pass_rows, _pass_id_of,
)

UNKNOWN = "unknown"


def _display(value):
    """Unknown renders as the word 'unknown', never as 0 or blank."""
    return UNKNOWN if value is None else value


def pass_health_first_block(platform, rows, now=None):
    """The panel's first block for one platform tab.

    Returns a dict with every field the PANEL-SPEC first block shows,
    each either a real value or None (unknown). The renderer turns None
    into the literal "unknown".
    """
    now = now or datetime.now(timezone.utc)
    closed = latest_closed(platform, rows)
    if closed is None:
        return {
            "platform": platform,
            "has_data": False,
            "status": None,          # no pass data, not "zero"
            "actions_landed": None,
            "caps_total": None,
            "unknown": None,
            "candidates": None,
            "eligible": None,
            "skipped": None,
            "seven_day": None,
            "pass_id": None,
            "closed_at": None,
        }
    d = closed.get("event_data", {}) or {}
    pid = d.get("pass_id") or _pass_id_of(closed)

    # candidates / eligible / skipped come from the pass's own
    # MC_PASS_CANDIDATES, not from today's numbers.
    cand_rows = [r for r in _pass_rows(rows, platform)
                 if r.get("event_type") == "MC_PASS_CANDIDATES"
                 and _pass_id_of(r) == pid]
    candidates = eligible = skipped = None
    if cand_rows:
        cd = (cand_rows[-1].get("event_data", {}) or {})
        candidates = cd.get("candidates")
        eligible = cd.get("eligible")
        skipped = cd.get("skipped")

    fold = unknown_count_for_pass(platform, pid, rows)
    # fold is None when the journal has no MC_PASS_INTENTS for this pass:
    # the intent set is not visible to the journal, so the count is
    # UNKNOWN (never zero). Until the ledger emits journal events, this
    # stays a labeled gap for passes the observer did not fold.
    unknown = fold["unknown"] if fold is not None else None

    caps_total = d.get("caps_total")
    if caps_total is None and isinstance(d.get("caps"), dict):
        caps_total = sum(v for v in d["caps"].values()
                         if isinstance(v, (int, float)))

    return {
        "platform": platform,
        "has_data": True,
        "status": d.get("pass_class"),
        "actions_landed": d.get("actions_landed"),
        "caps_total": caps_total,
        "unknown": unknown,
        "unknown_detail": fold,
        "candidates": candidates,
        "eligible": eligible,
        "skipped": skipped,
        "seven_day": seven_day_rollup(platform, rows, now=now),
        "pass_id": pid,
        "closed_at": closed.get("timestamp"),
        "stop_kind": d.get("stop_kind"),
    }


def render_first_block_text(block):
    """Minimal text rendering of the first block (for the proof view).

    Every line names its source event type in brackets, per the panel
    spec's traceability rule.
    """
    p = block["platform"]
    if not block["has_data"]:
        return ("[%s] last pass: %s [no MC_PASS_CLOSED in journal]"
                % (p, UNKNOWN))
    lines = [
        "[%s] last pass: %s [MC_PASS_CLOSED %s]"
        % (p, _display(block["status"]), block["pass_id"]),
        "[%s] actions: %s / %s [MC_PASS_CLOSED]"
        % (p, _display(block["actions_landed"]),
           _display(block["caps_total"])),
        "[%s] unknown: %s [MC_PASS_INTENTS + MC_PASS_OBSERVATION fold]"
        % (p, _display(block["unknown"])),
        "[%s] candidates: %s  eligible: %s  skipped: %s "
        "[MC_PASS_CANDIDATES]"
        % (p, _display(block["candidates"]), _display(block["eligible"]),
           _display(block["skipped"])),
    ]
    r = block["seven_day"]
    if r is None:
        lines.append("[%s] 7-day: %s [no MC_PASS_CLOSED in window]"
                     % (p, UNKNOWN))
    else:
        lines.append(
            "[%s] 7-day: passes %s | actions %s | failures %s | "
            "unknown %s | blocks %s [MC_PASS_CLOSED window]"
            % (p, r["passes"], r["actions"], r["failures"],
               _display(r["unknown"]), r["blocks"]))
    return "\n".join(lines)
