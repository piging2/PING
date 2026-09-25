#!/usr/bin/env python3
"""Canonical prospect-store access: locked read-modify-write + capacity admission.

QUALITY CAP (Nolan's call, engine spec): max 300 ACTIVE prospects
(any priority_state except SUPPRESS). Every mutation of
~/workspace/your_files/western-co-prospects.jsonl goes through this module
so the cap is enforced at a single choke point.

JSONL SAFETY (engine spec hard rule): never open the canonical JSONL with
'w' before the new content is fully built and verified; always read fully,
build new records in memory, validate, write to a .tmp file, re-read and
verify, then os.replace atomically. This module adds an exclusive fcntl
lock around the whole read-modify-write so concurrent workers cannot both
admit overflow.

Archive rule (engine spec): when a merge would exceed 300 active, first
archive the weakest WATCH rows (no signal in 2+ sweeps, lowest fit) by
appending them to ~/workspace/outreach/prospect-archive.jsonl, never
deleting. Protection: rows with active consequential work are never
eligible (follow-up ladder, sent actions awaiting follow-up, queued drafts,
owner authorization pending, UNKNOWN effects, existing email route).
Deterministic selection: weakness tier, then oldest last_signal, then
business_name (case-insensitive).
"""
import fcntl
import json
import os
import re
import tempfile

CANON = "/home/hatch/workspace/your_files/western-co-prospects.jsonl"
ARCHIVE = "/home/hatch/workspace/outreach/prospect-archive.jsonl"
ACTIVE_CAP = 300
FRESH_CUTOFF = "2026-09-24"  # rows first seen on/after this date are too new to judge weak

DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def active_count(rows):
    return sum(1 for r in rows if (r.get("priority_state") or "") != "SUPPRESS")


def _row_dates(r):
    """All YYYY-MM-DD dates mentioned in last_signal/source/intel_updated."""
    dates = []
    for k in ("last_signal", "source", "intel_updated"):
        v = r.get(k) or ""
        dates.extend(DATE_RE.findall(v))
    return dates


def is_fresh(r):
    """True when the row was first seen on/after FRESH_CUTOFF: too new to
    judge weak (has not had 2+ sweeps to prove no-signal)."""
    dates = _row_dates(r)
    return bool(dates) and max(dates) >= FRESH_CUTOFF


def protect_reasons(r):
    """Reasons a row must NOT be archived. Empty list = eligible."""
    reasons = []
    ss = (r.get("suppression_state") or "").lower()
    nx = (r.get("next_eligible_action") or "").lower()
    ls = (r.get("last_signal") or "").lower()
    nt = (r.get("notes") or "").lower()
    if "ladder" in ss or "f1 eligible" in nx or "f2 eligible" in nx:
        reasons.append("followup-ladder")
    if "queued-draft" in ss or "queued-draft" in nx:
        reasons.append("queued-draft")
    if "sent" in ls and ("gmail" in ls or "cold sent" in ls or "dm sent" in ls):
        reasons.append("sent-awaiting-followup")
    if "unknown" in (ss + nx) and "effect" in (ss + nx):
        reasons.append("unknown-effect")
    if "owner" in nx and ("authoriz" in nx or "pending" in nx or "approval" in nx):
        reasons.append("owner-authorization-pending")
    if r.get("email"):
        reasons.append("has-email-route")
    if is_fresh(r):
        reasons.append("fresh-not-yet-judged")
    return reasons


def _weakness_key(r):
    """Sort key: weakest first. Tier 0 = no email and no website;
    tier 1 = no email (has website). Then oldest last_signal, then name."""
    no_email = not (r.get("email") or "").strip()
    no_site = not (r.get("website") or "").strip()
    tier = 0 if (no_email and no_site) else 1
    dates = _row_dates(r)
    oldest = min(dates) if dates else ""
    return (tier, oldest, (r.get("business_name") or "").lower())


def select_archive_candidates(rows, n):
    """Deterministically select n weakest WATCH rows eligible for archival.
    Raises ValueError when fewer than n are eligible."""
    cands = [r for r in rows
             if (r.get("priority_state") or "") == "WATCH"
             and not protect_reasons(r)]
    cands.sort(key=_weakness_key)
    if len(cands) < n:
        raise ValueError(
            "only %d eligible archive candidates, need %d" % (len(cands), n))
    return cands[:n]


def admit(rows, incoming):
    """Capacity admission: returns (to_archive, merged_rows).

    to_archive: weakest WATCH rows to append to the archive (may be empty).
    merged_rows: rows + incoming with archived rows removed.
    Guarantees active(merged_rows) <= ACTIVE_CAP or raises ValueError.
    Duplicate incoming business_names are dropped (collision rule).
    """
    existing_names = {r.get("business_name") for r in rows}
    new_rows = [r for r in incoming if r.get("business_name") not in existing_names]
    need = active_count(rows) + active_count(new_rows) - ACTIVE_CAP
    to_archive = select_archive_candidates(rows, need) if need > 0 else []
    drop = {r.get("business_name") for r in to_archive}
    merged = [r for r in rows if r.get("business_name") not in drop] + new_rows
    assert active_count(merged) <= ACTIVE_CAP, "admission failed to fit cap"
    return to_archive, merged


def _validate(rows):
    names = [r.get("business_name") for r in rows]
    assert all(names), "row missing business_name"
    assert len(set(names)) == len(names), "duplicate business_name"
    return True


class ProspectStore:
    """Exclusive-locked read-modify-write session for the canonical JSONL."""

    def __init__(self, path=CANON):
        self.path = path
        self._fh = None
        self.rows = None

    def __enter__(self):
        self._fh = open(self.path, "r+")
        fcntl.flock(self._fh.fileno(), fcntl.LOCK_EX)
        self._fh.seek(0)
        self.rows = [json.loads(l) for l in self._fh if l.strip()]
        return self

    def commit(self, rows, archived_rows=None, archive_path=ARCHIVE,
               archive_reason=""):
        """Validate in memory, write .tmp, re-read/verify, atomic replace.
        Appends archived_rows to the archive with archived_at/reason."""
        _validate(rows)
        if archived_rows:
            with open(archive_path, "a") as af:
                for a in archived_rows:
                    rec = dict(a)
                    rec["archived_at"] = "2026-09-25"
                    rec["archive_reason"] = archive_reason
                    af.write(json.dumps(rec) + "\n")
        d = os.path.dirname(self.path)
        fd, tmp = tempfile.mkstemp(prefix=".prospects.", suffix=".tmp", dir=d)
        try:
            with os.fdopen(fd, "w") as f:
                for r in rows:
                    f.write(json.dumps(r) + "\n")
            verify = [json.loads(l) for l in open(tmp) if l.strip()]
            assert len(verify) == len(rows), "tmp verify line-count mismatch"
            assert [r.get("business_name") for r in verify] == \
                   [r.get("business_name") for r in rows], "tmp verify order mismatch"
            os.replace(tmp, self.path)
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)
        self.rows = rows

    def __exit__(self, *exc):
        try:
            if self._fh:
                fcntl.flock(self._fh.fileno(), fcntl.LOCK_UN)
                self._fh.close()
        finally:
            self._fh = None
