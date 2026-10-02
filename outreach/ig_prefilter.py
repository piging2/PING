#!/usr/bin/env python3
"""ig_prefilter.py — cheap pre-filter for the Instagram pipeline queue builder.

Build order (every stage below is FREE: local files only, zero instagram-cli
calls):

  SOURCE POOL -> canonical identity/dedupe -> already-engaged ->
  suppression/policy -> eligibility -> (expensive vetting) -> proposed queue

This module owns the first five stages. Expensive vetting (vet_handle, which
spends user-profile / posts / media-understanding API calls) is the caller's
job; the pre-filter guarantees that already-engaged and suppressed handles
never reach it.

Authorities (reused, never duplicated):
  - canonical identity: engagement-guard.norm_ig_handle (the single IG
    identity authority; strip @, lowercase)
  - already-engaged: engagement-guard never-re-engage index
    (platforms.instagram.handles) UNION
    goals/ping-social-outreach-campaign/hidden_files/engagement-passes/
    engaged-handles-latest.json UNION open pass manifests for today
    (in-flight actions). Decided through guard.check_instagram so the
    pre-filter cannot disagree with the dispatch-time authority.
  - suppression/policy: the guard's fuzzy BLOCKED verdict (a candidate whose
    canonical handle closely resembles an engaged handle is suppressed,
    failing closed) — decided by the guard, not reimplemented here.
  - eligibility: guard verdict UNKNOWN-UNCHECKABLE (no identifiable handle)
    -> INELIGIBLE; ELIGIBLE -> passed to vetting.

FAIL-CLOSED RULE: the guard's never-re-engage index is required for the
check_instagram decision (it powers the fuzzy BLOCKED suppression). If the
index cannot be read, no candidate can be decided: handles found in the
other readable engaged sources are still marked ALREADY_ENGAGED (a positive
signal), but every other handle becomes INELIGIBLE with a fail-closed
reason. Absence from a partial history is never read as "safe to vet".
A missing history must never be read as "nobody was engaged".

The dispatch-time guard (engagement-guard.py cmd_filter, run before the
engagement pass) remains the safety boundary. This pre-filter is a cost
saver, not a second authority. Unreadable engaged SOURCES are skipped with
a note (never guessed as empty); an unreadable guard INDEX fails the whole
decision closed (see FAIL-CLOSED RULE above).

Metrics emitted: INPUT, ALREADY_ENGAGED, SUPPRESSED, INELIGIBLE,
ELIGIBLE_FOR_VETTING. The caller adds VETTED (handles passed to vet_handle)
and ACCEPTED (handles vet_handle accepted). Every filtered identity stays
visible in the decisions list with its stage and reason.
"""
import importlib.util
import json
import os

HOME = os.path.expanduser("~")
OUTREACH = os.path.join(HOME, "workspace", "outreach")
ENGAGED_JSON = os.path.join(
    HOME, "workspace", "goals", "ping-social-outreach-campaign",
    "hidden_files", "engagement-passes", "engaged-handles-latest.json")

_guard = None


def _guard_mod():
    """Load engagement-guard.py as a module (same pattern as pass_policy_engine)."""
    global _guard
    if _guard is None:
        path = os.path.join(OUTREACH, "engagement-guard.py")
        spec = importlib.util.spec_from_file_location(
            "engagement_guard_prefilter_mod", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _guard = mod
    return _guard


def canonical(handle):
    """Canonical IG identity. Delegates to the guard's authority."""
    return _guard_mod().norm_ig_handle(handle or "")


def load_engaged_handles():
    """Return (set_of_canonical_handles, notes).

    Union of the guard's never-re-engage index, engaged-handles-latest.json,
    and today's open pass manifests. A source that cannot be read is skipped
    with a note; it is never treated as empty evidence of non-engagement.
    """
    g = _guard_mod()
    engaged = set()
    notes = []
    # 1. the durable never-re-engage index (authoritative history)
    try:
        index = g.load_index()
        engaged |= set(index["platforms"]["instagram"]["handles"] or [])
    except Exception as e:
        notes.append("guard_index_unreadable: %s" % str(e)[:120])
    # 2. the cheap flat latest list
    try:
        with open(ENGAGED_JSON, encoding="utf-8") as f:
            raw = json.load(f)
        items = raw if isinstance(raw, list) else raw.get("handles", [])
        engaged |= {g.norm_ig_handle(h) for h in items if h}
    except Exception as e:
        notes.append("engaged_handles_json_unreadable: %s" % str(e)[:120])
    # 3. today's in-flight pass manifests (executed actions)
    try:
        engaged |= set(g.open_manifests("instagram") or [])
    except Exception as e:
        notes.append("open_manifests_unreadable: %s" % str(e)[:120])
    engaged.discard("")
    return engaged, notes


def prefilter(candidates):
    """Run the cheap pre-filter.

    candidates: iterable of (raw_handle, source_tag).
    Returns dict with:
      eligible: [(canonical_handle, source_tag), ...] in stable sorted order
      decisions: [{handle, source, stage, reason}, ...] for EVERY candidate,
                 including the filtered ones
      metrics: {INPUT, DEDUPED_INPUT, ALREADY_ENGAGED, SUPPRESSED,
                INELIGIBLE, ELIGIBLE_FOR_VETTING, notes:[...]}
    Stages: ALREADY_ENGAGED / SUPPRESSED / INELIGIBLE per the guard's own
    check_instagram verdicts (ALREADY_ENGAGED / BLOCKED / UNKNOWN-UNCHECKABLE).
    """
    g = _guard_mod()
    decisions = []
    metrics = {"INPUT": 0, "DEDUPED_INPUT": 0, "ALREADY_ENGAGED": 0,
               "SUPPRESSED": 0, "INELIGIBLE": 0,
               "ELIGIBLE_FOR_VETTING": 0, "notes": []}

    # SOURCE POOL -> canonical identity/dedupe
    pool = {}
    for raw, source in candidates:
        ch = canonical(raw)
        if not ch:
            decisions.append({"handle": raw, "source": source,
                              "stage": "INELIGIBLE",
                              "reason": "INELIGIBLE: empty identity after "
                                        "canonicalization; cannot be checked "
                                        "or vetted"})
            metrics["INELIGIBLE"] += 1
            continue
        metrics["INPUT"] += 1
        if ch not in pool:
            pool[ch] = source
    metrics["DEDUPED_INPUT"] = len(pool)

    if not pool:
        return {"eligible": [], "decisions": decisions, "metrics": metrics}

    engaged, notes = load_engaged_handles()
    metrics["notes"].extend(notes)

    # Build a guard index view with the merged engaged set so check_instagram
    # decides on the fullest history. Never mutate the guard's cached index:
    # work on a shallow copy of the instagram payload. If the index is
    # unreadable, FAIL CLOSED (see module docstring): the fuzzy suppression
    # check cannot run, so undecided handles are INELIGIBLE for vetting.
    try:
        index = g.load_index()
        payload = dict(index["platforms"]["instagram"])
        merged = set(payload.get("handles") or []) | engaged
        payload["handles"] = sorted(merged)
        view = {"platforms": {"instagram": payload}}
        have_index = True
    except Exception as e:
        metrics["notes"].append(
            "guard_check_unavailable: %s; engaged-set membership only"
            % str(e)[:120])
        view = None
        have_index = False

    eligible = []
    for ch in sorted(pool):
        source = pool[ch]
        if have_index:
            verdict, reason = g.check_instagram(view, ch)
        elif ch in engaged:
            verdict, reason = (g.ALREADY_ENGAGED,
                               "handle @%s in engaged set (guard index "
                               "unavailable; membership fallback)" % ch)
        else:
            # FAIL CLOSED: without the guard index the fuzzy BLOCKED
            # suppression cannot run, so absence from the partial engaged
            # set proves nothing. INELIGIBLE until the index is readable.
            verdict, reason = (g.UNKNOWN,
                               "guard index unavailable; failing closed, no "
                               "expensive vetting without a suppression check")
        if verdict == g.ALREADY_ENGAGED:
            stage = "ALREADY_ENGAGED"
            metrics["ALREADY_ENGAGED"] += 1
        elif verdict == g.BLOCKED:
            stage = "SUPPRESSED"
            metrics["SUPPRESSED"] += 1
        elif verdict == g.UNKNOWN:
            stage = "INELIGIBLE"
            metrics["INELIGIBLE"] += 1
        else:
            stage = "ELIGIBLE_FOR_VETTING"
            metrics["ELIGIBLE_FOR_VETTING"] += 1
            eligible.append((ch, source))
        decisions.append({"handle": "@" + ch, "source": source,
                          "stage": stage,
                          "reason": "%s: %s" % (stage, reason)})
    return {"eligible": eligible, "decisions": decisions, "metrics": metrics}
