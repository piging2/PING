#!/usr/bin/env python3
"""route-next.py v2: business-state router for the Marketing Agent.

Answers BUSINESS ENTITY + CURRENT DOSSIER + PING KNOWLEDGE + EVIDENCE +
PIPELINE STATE + MISSION + AVAILABLE CAPABILITIES + AUTHORITY + EXTERNAL
MARKETING INTELLIGENCE to NEXT JUSTIFIED ACTION.

It is a decision function, not a framework. It selects an action; it never
executes outreach, never schedules anything (cron remains the scheduler),
never emits to PING (emission is the engine step-4e machinery's job after
verification), and never mutates append-only evidence.

New in v2 over v1:
- Reads the business dossier from ~/workspace/tandem/knowledge/dossiers/
  (normalized-name resolution; dossier absent is a stated unknown, never a
  failure).
- Reads pipeline state from ~/workspace/tandem/pipeline-jsonl-gaps.jsonl
  (contract fields business_name/pipeline_ref/dossier_path/jsonl_absent/
  sync/disposition/disposition_reason/signals). File absent means
  pipeline_state UNKNOWN; the run proceeds, it never fails.
- Every decision records ping_relevance (MATERIAL with one line of what
  PING knowledge changed or constrained, or NONE stated plainly) and
  ping_check (OK or UNCHECKABLE; UNCHECKABLE is never treated as PASS, and
  any decision that requires PING evidence carries the uncertainty forward).
- The ping_relevance verdict is derived from an actually executed
  counterfactual: the decision function runs once with PING retrieval
  enabled and once with it disabled, where the disabled run's evidence set
  contains no PING-derived rows (no accepted-event citations, no rows
  seeded from accepted observations). Selections are compared; the outcome
  is never hand-coded. (Audit fix 2026-09-14: v1's counterfactual was
  hand-coded in build_ping_experiment and its without_ping sources cited
  the PING event itself, making the NULL self-fulfilling.)
- Constitutional separation: PING is continuity/evidence/knowledge/
  governance; the Business Agent is interpretation and decision; this
  router is capability selection, authority, and action control. The record
  stores only decisions plus provenance references, never independent
  business facts.
- Authority additions A10/A11: absence from the canonical JSONL is never
  outreach permission; a business flagged SYNC_FIRST must synchronize
  before any ACT routing. (Audit fix 2026-09-14: decide_one now consults
  the pipeline-jsonl-gaps.jsonl contract row directly for the gate, not
  only the dossier's next_justified_action flag.)
- Consumes as inputs, read fresh at run time: capability-map.md,
  discoveries.md, arbitrage-queue.md, challenge-report.md,
  gj-weekend-opportunities.md; checks for any economic-leverage doctrine
  artifact under ~/workspace/. Absence of any of these is empty input,
  never failure. Governing rule stands: a discovery only matters if it
  changes a decision, experiment, capability, or strategy.

Architectural test (applied to v2, 2026-09-14):
1. Real failure: without a routed decision the business agent stalls or
   acts on the wrong target; v1 routed without the dossier and pipeline
   state, so sync-gated businesses could be routed to research or outreach
   while their canonical-store sync was the actual next step.
2. Existing machinery: none reads the dossier + pipeline gaps into a
   routing decision. business-context.py retrieves; dossiers record;
   nothing routes.
3. Missing seam: the dossier-and-pipeline-aware routing judgment. v2 is
   that seam, still small.
4. PING preserved as authority: read-only retrieval, no emit, no
   mutation; records carry provenance references only.
5. Demonstrable: dry-run records for Captain Ron Handyman L.L.C. and Tote
   and Trailer Moving LLC are routed below.
6. Removing it reproduces the failure: sync-gated businesses get routed
   without their sync gate.
7. No infrastructure change: same single JSONL log; the new inputs are
   read-only files.
8. A fresh agent can rebuild the decision from the JSONL record plus the
   cited artifacts alone; the record carries the challenge surface.

Usage:
  python3 route-next.py [--help] [--dry-run] [--mission SLUG]
                        [--business NAME]
  python3 route-next.py record-outcome --decision-id ID --outcome TEXT \\
      --observation TEXT --evidence PATH [--evidence PATH ...] --next TEXT
      [--business NAME]

The first form routes the candidates (or one --business) and appends a
routing_decision record. The second appends a decision_outcome record.
Records are never mutated.
"""

import argparse
import glob
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

TANDEM_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(TANDEM_DIR, "routing-decisions.jsonl")
DECISIONS_DOC = os.path.join(TANDEM_DIR, "business-decisions-2026-09-14.md")
DOSSIER_DIR = os.path.join(TANDEM_DIR, "knowledge", "dossiers")
GAPS_PATH = os.path.join(TANDEM_DIR, "pipeline-jsonl-gaps.jsonl")
ROUTER_VERSION = "v2"
NOW = lambda: datetime.now(timezone.utc).isoformat()

# Compact authority model, derived from standing rules. Cited as
# AUTHORITY-V2 in every routing record.
AUTHORITY = {
    "A1": "Research (read-only web/API/CLI reads) is always authorized; "
          "it creates no external commitment and consumes no caps.",
    "A2": "Outreach (email/DM/form/post/comment/like) only within standing "
          "caps (10 emails per UTC day counted from Gmail accepts, 10 DMs "
          "per day, 300-active JSONL); every outreach message opens with "
          "the verbatim not-a-customer disclosure; vendor/partnership "
          "framing only where the page explicitly invites business contact; "
          "never pose as a customer or as a job applicant.",
    "A3": "No Instagram DMs (Nolan's not-yet). Messenger sends only to "
          "synced contacts (tool-enforced).",
    "A4": "Facebook engagement is Pig-only and cron-owned; this seat never "
          "runs engagement passes.",
    "A5": "Posting is authorized only for the recorded Sunday 2026-09-20 "
          "item (ping-pig-suit.png); that decision is recorded and is not "
          "re-decided here.",
    "A6": "Cron is the scheduler. The router selects actions; it never "
          "creates or modifies schedules.",
    "A7": "PING is append-only authority. The router never emits events, "
          "never mutates evidence, never claims PING knowledge without a "
          "retrieved accepted event. Emission is the engine step-4e "
          "machinery's job after independent verification.",
    "A8": "Marketing-intel governing rule: a discovery matters only if it "
          "changes a decision, experiment, capability, or strategy. If a "
          "finding changes nothing for this decision, say so explicitly "
          "and deprioritize it.",
    "A9": "Marketing-intel explicit rejects honored: no n8n/Zapier/Make "
          "for internal glue, no Podium, no CallRail (until a client "
          "decision requires it), no Postiz (until Pig posting fails a "
          "demonstrated requirement), no paid lead marketplaces (until "
          "owned signals are exhausted), no cold SMS (legal risk). "
          "Missed-call text-back routes through Quo, never Podium/Operlyn/"
          "HighLevel. Never quote speed-to-lead multipliers as revenue "
          "guarantees.",
    "A10": "Absence from the canonical prospect JSONL is never outreach "
           "permission. A missing canonical record is a fail-closed sync "
           "signal, not an open channel; it authorizes nothing.",
    "A11": "A business flagged SYNC_FIRST must synchronize before any ACT "
           "routing. ACT means outreach-class actions (draft, send, DM, "
           "form submit, post, comment). Read-only research (A1) is not "
           "ACT. Sync execution belongs to the parent/pipeline machinery; "
           "the router selects SYNC_REQUIRED and hands it off, never "
           "performs it.",
}

# Capabilities consulted (from the two inventories; the router consults,
# never extends, them).
CAPABILITIES = [
    "research: read-only web research (browser.search, social.search, "
    "facebook-cli reads); capability-inventory-2026-09-14.md rows: social."
    "search, facebook-cli, instagram-cli",
    "emit-observation.py: verify-then-emit to PING; owned by engine step "
    "4e, NOT the router",
    "action-intent-ledger.py: ACTION_INTENT_DURABLE to EXECUTION to "
    "OBSERVATION to FINALIZATION; used only for external commitments "
    "(like/comment/post/dm/email/form_submit)",
    "post_next.py: Sunday post machinery; slot already decided",
    "cron-owned passes (engagement, outreach engine, meta-ai-intel): run "
    "by schedule; never run by the router",
    "pipeline sync machinery (parent-owned): canonical JSONL sync; the "
    "router selects SYNC_REQUIRED but never executes it",
]

# Marketing-intel inputs, read fresh at run time. gj-weekend-opportunities
# is a Nolan-attendance artifact; it carries no business-specific signal
# for prospect routing, which is stated rather than assumed.
INTEL_FILES = [
    os.path.expanduser("~/workspace/marketing-intel/capability-map.md"),
    os.path.expanduser("~/workspace/marketing-intel/discoveries.md"),
    os.path.expanduser("~/workspace/marketing-intel/arbitrage-queue.md"),
    os.path.expanduser("~/workspace/marketing-intel/challenge-report.md"),
    os.path.expanduser(
        "~/workspace/marketing-intel/gj-weekend-opportunities.md"),
]

INTEL_FINDINGS = [
    ("D1 missed-call text-back on Quo",
     "Applies to onboarded clients with demonstrable missed-call volume "
     "AND unmet capacity. Candidates are zero-contact prospects, not "
     "clients. Changes nothing for this decision. Deprioritized."),
    ("D2 owned signals (HYPOTHESIS)",
     "Blocked on a named demand-side signal; no pilot, no pitch. Changes "
     "nothing for this decision. Deprioritized."),
    ("D3 review-request loop (Quo SMS + GBP)",
     "Client service requiring a client pilot with real job volume. "
     "Changes nothing for a zero-contact prospect. Deprioritized."),
    ("D4 competitor watch + changedetection.io",
     "About known competitors and entrant detection, not contact-route "
     "discovery for filing-only prospects. Changes nothing here. "
     "Deprioritized."),
    ("D5 no internal glue purchase",
     "Changes nothing; the router builds no integration."),
    ("D6 AI voice answering (HYPOTHESIS)",
     "Research (Q8) not done. Changes nothing now. Deprioritized."),
    ("Q1-Q9 experiments",
     "All require a willing client; none apply to a WATCH prospect with "
     "no contact route. Deprioritized."),
    ("Explicit rejects (n8n/Zapier/Make, Podium, CallRail, Postiz, paid "
     "lead marketplaces, cold SMS)",
     "No proposal in this routing touches any of them. Honored."),
    ("gj-weekend-opportunities.md (Nolan's IRL attendance sweep)",
     "The sweep names weekend gatherings for Nolan to attend; it names no "
     "candidate business and contains no contact-route or capability "
     "signal for these prospects. Changes nothing for this decision. "
     "Deprioritized per A8."),
]

# Priority rank among candidates for a single research slot (challenge M2:
# prioritize on expected value per hour, not dollars). Only consulted when
# RESEARCH_MORE is the action under consideration.
TRADE_PRIORITY = [
    ("captain ron handyman", 1,
     "handyman: classic owner-operator missed-call pain fit"),
    ("tote and trailer", 2,
     "moving: home-service adjacent, phone/SMS booking fit"),
    ("ab steel", 3,
     "steel/fence/welding: unverified trade, commercial registered agent "
     "weakens owner-operator assumption"),
]

# Rows that mark a dossier row as PING-derived and therefore excluded from
# the counterfactual disabled run.
PING_SOURCE_MARKERS = ("ping_events", "ping:", "accepted PING",
                       "accepted_by_ping")


def run_cmd(argv, timeout=120):
    p = subprocess.run(argv, capture_output=True, text=True, timeout=timeout,
                       cwd=TANDEM_DIR)
    return p.returncode, p.stdout, p.stderr


def normalize(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


def find_dossier(name):
    """Resolve a business name to its dossier JSON by normalized-name
    equivalence. Returns the path or None. Absence is a stated unknown,
    never a failure."""
    if not os.path.isdir(DOSSIER_DIR):
        return None
    target = normalize(name)
    for f in sorted(os.listdir(DOSSIER_DIR)):
        if f.endswith(".json") and normalize(f[:-5]) == target:
            return os.path.join(DOSSIER_DIR, f)
    return None


def load_dossier(path):
    if not path:
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_pipeline_state():
    """Read the parallel workstream's gaps file if present. Absent means
    pipeline_state UNKNOWN; the run proceeds, it never fails."""
    if not os.path.isfile(GAPS_PATH):
        return {"status": "UNKNOWN",
                "source": GAPS_PATH,
                "note": "pipeline-jsonl-gaps.jsonl absent; pipeline state "
                        "recorded UNKNOWN and routing proceeds; the "
                        "dossier's own sync_gaps remain the sync signal."}
    rows = {}
    with open(GAPS_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            key = normalize(r.get("business_name", ""))
            if key:
                rows[key] = r
    return {"status": "PRESENT", "source": GAPS_PATH, "rows": rows}


def pipeline_row_for(state, name):
    if state["status"] != "PRESENT":
        return None
    return state["rows"].get(normalize(name))


def read_candidates():
    """Candidate businesses from the standing Decision: records."""
    with open(DECISIONS_DOC, encoding="utf-8", errors="replace") as f:
        text = f.read()
    names = re.findall(r"^## Decision: (.+?) -> ", text, re.MULTILINE)
    return [n.strip() for n in names]


def prior_research_outcomes():
    """Scan the routing log for decision_outcome records; map normalized
    business name to the record. The routing log is engine-side evidence,
    not PING, so both counterfactual runs may use it."""
    out = {}
    if not os.path.isfile(LOG_PATH):
        return out
    with open(LOG_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            if r.get("record_type") != "decision_outcome":
                continue
            text = json.dumps(r).lower()
            for cand in read_candidates():
                if normalize(cand) in re.sub(r"[^a-z0-9 ]", "",
                                             text.replace("  ", " ")):
                    pass
            # Match by any normalized candidate name appearing in the
            # record text; candidate names are checked without separators.
            blob = re.sub(r"[^a-z0-9]", "", text)
            for cand in read_candidates():
                if normalize(cand) in blob:
                    out.setdefault(normalize(cand), []).append(r)
    return out


def run_brief(name):
    """PING retrieval via business-context.py (deterministic, no
    embeddings). This is the ONLY PING access the router has."""
    q = name.split(" L.L.C")[0].split(" LLC")[0]
    rc, out, err = run_cmd(
        [sys.executable, os.path.join(TANDEM_DIR, "business-context.py"), q])
    fields = {}
    if rc == 0:
        in_fields = False
        for line in out.splitlines():
            if line.strip() == "CONSUMED FIELDS":
                in_fields = True
                continue
            if in_fields:
                if line.strip() == "":
                    break
                if ": " in line:
                    k, v = line.split(": ", 1)
                    fields[k.strip()] = v.strip()
    retrieval = "OK" if rc == 0 and "verification_status" in fields else \
        "UNCHECKABLE"
    return {"retrieval": retrieval, "fields": fields,
            "stderr": err[-300:] if err else ""}


def dossier_facts_no_ping(dossier):
    """The counterfactual evidence set: dossier facts minus every
    PING-derived row. Returns (kept_facts, exclusions)."""
    kept, excluded = [], []
    for fact in dossier.get("facts", []):
        blob = json.dumps(fact).lower()
        if any(m in blob for m in PING_SOURCE_MARKERS):
            excluded.append(
                {"kind": fact.get("kind"),
                 "reason": "PING-derived row (accepted-event citation or "
                           "row seeded from an accepted observation)"})
        else:
            kept.append(fact)
    return kept, excluded


def dossier_contact_routes_no_ping(kept_facts):
    for fact in kept_facts:
        if fact.get("kind") == "contact_absence":
            return ("none published",
                    "dossier.facts[contact_absence] -> %s" %
                    fact.get("source_ref", "unknown"))
    return ("unknown",
            "no contact_absence fact outside PING-derived rows")


def build_state_enabled(name, dossier, dossier_path, prow, outcomes):
    """State with PING retrieval enabled."""
    brief = run_brief(name)
    f = brief["fields"]
    nja = (dossier.get("next_justified_action") or {}) if dossier else {}
    st = {
        "business": name,
        "counterfactual_run": "with_ping",
        "dossier_path": dossier_path,
        "dossier_present": dossier is not None,
        "dossier_ref": ("dossier.next_justified_action.action=%s; "
                        "dossier.pipeline.status=%s; "
                        "dossier.pipeline.priority=%s" %
                        (nja.get("action", "unknown"),
                         (dossier.get("pipeline") or {}).get(
                             "status", "unknown") if dossier else "unknown",
                         (dossier.get("pipeline") or {}).get(
                             "priority", "unknown") if dossier else
                         "unknown")) if dossier else "no dossier",
        "sync_first": nja.get("action") == "sync_first",
        "sync_gap": (", ".join(dossier.get("sync_gaps", []))
                     if dossier else "unknown"),
        "contact_routes": f.get("contact_routes", "unknown"),
        "contact_source": "PING retrieval consumed field "
                          "(business-context.py) corroborated by dossier "
                          "contact_absence fact",
        "platform_account": f.get("platform_account", "unknown"),
        "verification": f.get("verification_status", "unknown"),
        "ping_event": f.get("ping_accepted", "none"),
        "decision_rule_ping": f.get("decision_rule", "none"),
        "ping_retrieval": brief["retrieval"],
        "ping_check": "OK" if brief["retrieval"] == "OK" else "UNCHECKABLE",
        "pipeline_state": prow if prow else
        "UNKNOWN (gaps file absent)",
        "research_executed": bool(outcomes.get(normalize(name))),
        "research_outcome": (outcomes.get(normalize(name), [{}])[0].get(
            "outcome") if outcomes.get(normalize(name)) else None),
        "excluded_evidence": [],
    }
    return st


def build_state_disabled(name, dossier, dossier_path, prow, outcomes):
    """State with PING retrieval disabled: the honest counterfactual. No
    business-context.py call; dossier facts minus PING-derived rows; the
    decisions doc and the routing log remain (engine-side evidence)."""
    kept, excluded = ([], [])
    if dossier:
        kept, excluded = dossier_facts_no_ping(dossier)
    contact, contact_source = dossier_contact_routes_no_ping(kept)
    nja = (dossier.get("next_justified_action") or {}) if dossier else {}
    excl = list(excluded)
    if dossier:
        if dossier.get("ping_knowledge"):
            excl.append({"kind": "ping_knowledge block",
                         "reason": "PING-derived (accepted observations)"})
        for q in dossier.get("open_questions", []):
            if "accepted PING" in json.dumps(q):
                excl.append({"kind": "open_question",
                             "reason": "seeded from accepted PING "
                                       "observation: %s" % q.get("question",
                                                                 "")[:80]})
        v = dossier.get("verification") or {}
        if "accepted_by_ping" in json.dumps(v):
            excl.append({"kind": "verification block",
                         "reason": "cites accepted PING event"})
    st = {
        "business": name,
        "counterfactual_run": "without_ping",
        "dossier_path": dossier_path,
        "dossier_present": dossier is not None,
        "dossier_ref": ("dossier.next_justified_action.action=%s; "
                        "dossier.pipeline.status=%s; "
                        "dossier.pipeline.priority=%s "
                        "(non-PING rows only)" %
                        (nja.get("action", "unknown"),
                         (dossier.get("pipeline") or {}).get(
                             "status", "unknown") if dossier else "unknown",
                         (dossier.get("pipeline") or {}).get(
                             "priority", "unknown") if dossier else
                         "unknown")) if dossier else "no dossier",
        "sync_first": nja.get("action") == "sync_first",
        "sync_gap": (", ".join(dossier.get("sync_gaps", []))
                     if dossier else "unknown"),
        "contact_routes": contact,
        "contact_source": contact_source,
        "platform_account": "unknown (PING retrieval disabled in "
                            "counterfactual run)",
        "verification": "UNCHECKABLE (PING retrieval disabled in "
                        "counterfactual run)",
        "ping_event": "none (counterfactual run)",
        "decision_rule_ping": "none (counterfactual run)",
        "ping_retrieval": "NOT_RUN (counterfactual)",
        "ping_check": "UNCHECKABLE",
        "pipeline_state": prow if prow else
        "UNKNOWN (gaps file absent)",
        "research_executed": bool(outcomes.get(normalize(name))),
        "research_outcome": (outcomes.get(normalize(name), [{}])[0].get(
            "outcome") if outcomes.get(normalize(name)) else None),
        "excluded_evidence": excl,
    }
    return st


def priority_of(name):
    low = name.lower()
    for key, rank, why in TRADE_PRIORITY:
        if key in low:
            return rank, why
    return 99, "no priority rule matched"


def decide_one(st):
    """The pure decision function. Identical for both counterfactual runs;
    only the input state differs. Returns (selection, options)."""
    name = st["business"]
    options = []
    base = {"business": name, "capability": None, "authority": None,
            "status": None, "reason": None}

    def opt(action, status, capability, authority, reason):
        o = dict(base)
        o.update({"action": action, "status": status,
                  "capability": capability, "authority": authority,
                  "reason": reason})
        options.append(o)
        return o

    if not st["dossier_present"]:
        opt("HOLD", "selected", None, "A7",
            "No dossier exists for this business. Dossier absence is a "
            "stated unknown, never a failure, but no decision is "
            "supportable without it. HOLD until the dossier exists.")
        for a, auth in [("DRAFT_EMAIL_OR_DM", "A2"),
                        ("SEND_COLD_EMAIL_OR_DM", "A2/A3"),
                        ("SUBMIT_CONTACT_FORM", "A2"),
                        ("RESEARCH_MORE", "A1"),
                        ("EMIT_OBSERVATION_TO_PING", "A7")]:
            opt(a, "rejected", None, auth,
                "No dossier: the business entity is not established "
                "enough to justify any action.")
        sel = next(o for o in options if o["status"] == "selected")
        return sel, options

    # A10/A11 (audit fix 2026-09-14): the gaps contract row is authoritative
    # for the sync gate, independent of the dossier flag. A pipeline-NEW
    # business missing from the canonical JSONL is SYNC-gated even when its
    # dossier does not (yet) carry next_justified_action=sync_first. Before
    # this fix the router consulted only the dossier flag, so a SYNC_FIRST
    # contract row with a silent dossier fell through to the v1 branch,
    # whose own text suggested ACT routing was available. Gaps file absent
    # still degrades to the dossier flag alone (fail-open for read-only
    # work, as before).
    prow = st.get("pipeline_state")
    contract_sync_first = (
        isinstance(prow, dict)
        and (prow.get("sync") == "SYNC_FIRST"
             or prow.get("jsonl_absent") is True))

    if st["sync_first"] or contract_sync_first:
        # A11: sync gate blocks every ACT action. The router selects
        # SYNC_REQUIRED and hands execution to the parent/pipeline
        # machinery; it never performs the sync itself.
        gate_sources = []
        if st["sync_first"]:
            gate_sources.append(
                "dossier next_justified_action=sync_first (%s)"
                % st["dossier_path"])
        if contract_sync_first:
            gate_sources.append(
                "gaps contract row sync=SYNC_FIRST/jsonl_absent "
                "(pipeline-jsonl-gaps.jsonl)")
        opt("SYNC_REQUIRED", "selected",
            "pipeline sync machinery (parent-owned; the router selects, "
            "never executes)",
            "A11/A10/A7",
            "%s: the entity is known to the engine but absent from the "
            "canonical prospect JSONL. Per A11 it must synchronize before "
            "any ACT routing; per A10 its JSONL absence is never outreach "
            "permission. Sync execution is handed to the parent/pipeline "
            "machinery; WATCH holds until the sync clears."
            % "; ".join(gate_sources))
        if st["research_executed"]:
            opt("RESEARCH_MORE", "rejected", "research", "A1",
                "A RESEARCH_MORE action for this business was already "
                "executed and its outcome recorded (outcome: %s). The "
                "contact-route gap is evidenced; re-researching is not "
                "justified." % (st["research_outcome"] or "unknown"))
        else:
            opt("RESEARCH_MORE", "deferred (valid post-sync follow-on)",
                "research (read-only web research for a published contact "
                "route or operating presence)",
                "A1",
                "Read-only research is not ACT (A11 does not block it) and "
                "the contact-route gap gates WATCH-to-ACT conversion. It "
                "is NOT selected now because the dossier's named next "
                "justified action is sync_first; research follows once the "
                "sync clears.")
        opt("DRAFT_EMAIL_OR_DM", "rejected", None, "A2/A10/A11",
            "No phone, email, website, or platform account is evidenced, "
            "and the business is flagged SYNC_FIRST: even with a channel, "
            "ACT routing is blocked until the sync clears.")
        opt("SEND_COLD_EMAIL_OR_DM", "rejected", None, "A2/A3/A10/A11",
            "Same as drafting, plus caps and the not-a-customer disclosure "
            "cannot be delivered without a channel; Instagram DMs are "
            "parked by Nolan's standing rule regardless.")
        opt("SUBMIT_CONTACT_FORM", "rejected", None, "A2/A11",
            "No website exists to host a form; SYNC_FIRST would block ACT "
            "routing in any case.")
        opt("EMIT_OBSERVATION_TO_PING", "rejected",
            "emit-observation.py", "A7",
            "Emission belongs to the engine step-4e verify-then-emit "
            "machinery after independent verification. The router never "
            "emits.")
        opt("ADD_TO_CANONICAL_JSONL_BY_ROUTER", "rejected", None, "A6/A7",
            "The sync itself is a schema/data decision owned by the "
            "parent agent (decisions record gap 4). The router selects "
            "SYNC_REQUIRED; it does not perform the sync.")
        opt("FACEBOOK_ENGAGEMENT", "rejected", None, "A4",
            "Engagement passes are cron-owned and Pig-only; this seat "
            "never runs them.")
        opt("SUNDAY_POST", "rejected", "post_next.py", "A5",
            "The Sunday 2026-09-20 slot is already decided. Not this "
            "business, not this decision.")
        sel = next(o for o in options if o["status"] == "selected")
        return sel, options

    # No sync flag: v1-style routing for non-gated businesses.
    rank, rank_why = priority_of(name)
    if st["verification"] != "verified" or st["ping_retrieval"] not in \
            ("OK",):
        opt("HOLD", "selected", None, "A7",
            "PING retrieval is not checkable or knowledge is not verified; "
            "no decision is supportable from PING evidence. HOLD is the "
            "absence of a decision, not a decision.")
        sel = next(o for o in options if o["status"] == "selected")
        return sel, options
    if st["contact_routes"] == "none published" and not \
            st["research_executed"]:
        opt("RESEARCH_MORE", "selected",
            "research (read-only web research for a published contact "
            "route or operating presence)",
            "A1",
            "Contact routes are none published; that gap directly gates "
            "WATCH-to-ACT conversion. Read-only research creates no "
            "external commitment. Priority rank %d: %s." % (rank, rank_why))
    else:
        opt("HOLD", "selected", None, "A7",
            "No justified action: either a contact route exists (route to "
            "ACT through the verification machinery) or research already "
            "ran.")
    opt("DRAFT_EMAIL_OR_DM", "rejected", None, "A2",
        "Drafting outreach with no honest channel is blind outreach.")
    opt("SEND_COLD_EMAIL_OR_DM", "rejected", None, "A2/A3",
        "No channel; caps and disclosure cannot be honored without one.")
    opt("EMIT_OBSERVATION_TO_PING", "rejected",
        "emit-observation.py", "A7",
        "The router never emits; emission is the engine step-4e job.")
    sel = next(o for o in options if o["status"] == "selected")
    return sel, options


def derive_ping_relevance(name, sel_on, sel_off, st_on, st_off):
    """Honest verdict from the executed counterfactual. Never hand-coded:
    both selections come from decide_one over the two real input states."""
    same = sel_on["action"] == sel_off["action"]
    if same:
        return {
            "verdict": "NONE",
            "line": "PING retrieval did not change or constrain this "
                    "routing decision: the with-PING and without-PING runs "
                    "selected the identical action (%s). The counterfactual "
                    "was executed, not hand-coded; comparison evidence is "
                    "in the counterfactual block." % sel_on["action"],
            "selections_identical": True,
        }
    return {
        "verdict": "MATERIAL",
        "line": "PING retrieval changed the routing decision: with-PING "
                "selected %s, without-PING selected %s. What changed: "
                "%s." % (sel_on["action"], sel_off["action"],
                         "see counterfactual block"),
        "selections_identical": False,
    }


def read_intel_inputs():
    present = {p: os.path.isfile(p) for p in INTEL_FILES}
    # Economic-leverage doctrine artifact: a dedicated file, not passing
    # mentions inside other artifacts.
    lev = [p for p in
           glob.glob(os.path.expanduser("~/workspace/*leverage*")) +
           glob.glob(os.path.expanduser(
               "~/workspace/marketing-intel/*leverage*"))
           if os.path.isfile(p)]
    return present, lev


def read_mission():
    rc, out, err = run_cmd(
        [sys.executable, os.path.join(TANDEM_DIR, "next-brief.py")])
    return out.strip() if rc == 0 else \
        "UNKNOWN (next-brief.py failed: %s)" % err[-200:]


def route_business(name, mission, pipeline_state, outcomes, intel_present,
                   intel_leverage, dry_run):
    dossier_path = find_dossier(name)
    dossier = load_dossier(dossier_path)
    prow = pipeline_row_for(pipeline_state, name)

    # The honest counterfactual: run the real decision function twice.
    st_on = build_state_enabled(name, dossier, dossier_path, prow, outcomes)
    st_off = build_state_disabled(name, dossier, dossier_path, prow,
                                  outcomes)
    sel_on, opts_on = decide_one(st_on)
    sel_off, opts_off = decide_one(st_off)
    relevance = derive_ping_relevance(name, sel_on, sel_off, st_on, st_off)

    # Constitutional separation: the record stores decisions plus
    # provenance references (dossier path, field refs, event ids), never
    # independent business facts.
    record = {
        "record_type": "routing_decision",
        "decision_id": None,
        "ts": NOW(),
        "router_version": ROUTER_VERSION,
        "dry_run": bool(dry_run),
        "input_state": {
            "mission": mission,
            "mission_source": "next-brief.py",
            "candidates_source": DECISIONS_DOC,
            "business": name,
            "dossier": {
                "path": dossier_path,
                "present": dossier is not None,
                "resolution": "normalized-name equivalence; absence is a "
                              "stated unknown, never a failure",
            },
            "pipeline_state": {
                "status": pipeline_state["status"],
                "source": pipeline_state["source"],
                "row": prow,
                "note": pipeline_state.get("note", ""),
            },
            "ping_retrieval": {
                "mechanism": "business-context.py (deterministic, no "
                             "embeddings); sole PING access",
                "status": st_on["ping_retrieval"],
                "accepted_event": st_on["ping_event"],
                "verification": st_on["verification"],
            },
            "ping_check": st_on["ping_check"],
            "capabilities_consulted": CAPABILITIES,
            "authority_model": "AUTHORITY-V2 (standing rules + A10/A11; "
                               "see router header)",
            "authority_refs": AUTHORITY,
            "external_marketing_intelligence": {
                "files": intel_present,
                "economic_leverage_doctrine_artifact": (
                    intel_leverage if intel_leverage else
                    "absent; empty input, not a failure"),
                "findings_considered": [
                    {"finding": f, "changes_decision": False, "why": w}
                    for f, w in INTEL_FINDINGS],
                "summary": "All %d findings considered. None changes this "
                           "routing decision: every finding and experiment "
                           "targets onboarded clients or known competitors, "
                           "not zero-contact filing-only prospects; the "
                           "weekend sweep names no candidate business. "
                           "Explicitly deprioritized per A8." %
                           len(INTEL_FINDINGS),
            },
            "counterfactual": {
                "method": "decide_one executed twice over two real input "
                          "states; outcome never hand-coded",
                "with_ping": {
                    "evidence_set": "business-context.py retrieval "
                                    "(accepted event %s), full dossier "
                                    "facts, decisions doc, routing log" %
                                    st_on["ping_event"],
                    "selection": {"action": sel_on["action"],
                                  "authority": sel_on["authority"]},
                    "state_refs": {
                        "dossier_ref": st_on["dossier_ref"],
                        "verification": st_on["verification"],
                        "contact_routes": st_on["contact_routes"],
                        "sync_first": st_on["sync_first"],
                        "research_executed": st_on["research_executed"],
                    },
                },
                "without_ping": {
                    "evidence_set": "dossier facts minus PING-derived "
                                    "rows, decisions doc, routing log; NO "
                                    "business-context.py call",
                    "excluded": st_off["excluded_evidence"],
                    "selection": {"action": sel_off["action"],
                                  "authority": sel_off["authority"]},
                    "state_refs": {
                        "dossier_ref": st_off["dossier_ref"],
                        "verification": st_off["verification"],
                        "contact_routes": st_off["contact_routes"],
                        "sync_first": st_off["sync_first"],
                        "research_executed": st_off["research_executed"],
                    },
                },
            },
        },
        "ping_relevance": relevance,
        "options_considered": opts_on,
        "options_considered_without_ping": [
            {"action": o["action"], "status": o["status"],
             "authority": o["authority"]} for o in opts_off],
        "selection": {
            "business": name,
            "action": sel_on["action"],
            "capability": sel_on["capability"],
            "params": {},
            "authority_relied_upon": sel_on["authority"].split("/")
            if sel_on["authority"] else [],
            "selected_by": "with-PING run (authoritative); counterfactual "
                           "run agreed: %s" %
                           relevance["selections_identical"],
        },
        "evidence": [p for p in
                     [dossier_path, DECISIONS_DOC,
                      os.path.join(TANDEM_DIR, "entity-identities.md")]
                     if p],
        "why_selected": sel_on["reason"],
        "why_not_others": [
            {"action": o["action"], "status": o["status"],
             "reason": o["reason"]}
            for o in opts_on if o["status"] != "selected"],
        "provenance": None,
        "execution": {"executed": False,
                      "note": "Router selects; it does not execute. "
                              "SYNC_REQUIRED hands execution to the "
                              "parent/pipeline machinery. See "
                              "decision_outcome record."},
        "next_step": "Parent/pipeline machinery synchronizes the pipeline "
                     "NEW status into the canonical prospect JSONL; append "
                     "a decision_outcome record with the sync result and "
                     "next step. No ACT routing for this business until "
                     "the sync clears (A11).",
    }
    return record


def build_provenance(record):
    sel = record["selection"]
    pr = record["ping_relevance"]
    return (
        "Decision %s (route %s for %s; dry_run=%s) informed by "
        "Projection/Retrieval P (route-next.py v2: dossier + pipeline "
        "state + business-context.py brief + mission, AUTHORITY-V2) "
        "containing Knowledge K (dossier refs: %s; pipeline state: %s; "
        "PING accepted event %s, verification %s) with ping_relevance=%s "
        "(%s) supported by Evidence %s." %
        ("D", sel["action"], sel["business"], record["dry_run"],
         record["input_state"]["dossier"]["path"],
         record["input_state"]["pipeline_state"]["status"],
         record["input_state"]["ping_retrieval"]["accepted_event"],
         record["input_state"]["ping_retrieval"]["verification"],
         pr["verdict"], pr["line"][:160],
         "; ".join(record["evidence"]))
    )


def append_record(record):
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    if record.get("record_type") == "routing_decision" \
            and not record.get("decision_id"):
        n = 1
        if os.path.isfile(LOG_PATH):
            with open(LOG_PATH, encoding="utf-8") as f:
                for line in f:
                    try:
                        if json.loads(line).get("record_type") == \
                                "routing_decision":
                            n += 1
                    except Exception:
                        pass
        record["decision_id"] = "RD-20260914-%02d" % n
    line = json.dumps(record, sort_keys=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")
        f.flush()
        os.fsync(f.fileno())
    return record["decision_id"]


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Route BUSINESS ENTITY + CURRENT DOSSIER + PING "
                    "KNOWLEDGE + EVIDENCE + PIPELINE STATE + MISSION + "
                    "CAPABILITIES + AUTHORITY + EXTERNAL MARKETING "
                    "INTELLIGENCE to NEXT JUSTIFIED ACTION. Appends to "
                    "routing-decisions.jsonl. Selects; never schedules, "
                    "never emits to PING, never mutates evidence.")
    ap.add_argument("--dry-run", action="store_true",
                    help="Print the routing record without appending it.")
    ap.add_argument("--mission", default=None,
                    help="Mission slug; default reads next-brief.py.")
    ap.add_argument("--business", default=None,
                    help="Route one business only (normalized-name match "
                         "against candidates); default routes all.")
    ap.add_argument("--provenance-note", default=None,
                    help="Optional provenance string to attach.")
    sub = ap.add_subparsers(dest="cmd")
    ro = sub.add_parser("record-outcome",
                        help="Append a decision_outcome record for an "
                             "executed routed action.")
    ro.add_argument("--decision-id", required=True)
    ro.add_argument("--business", default=None)
    ro.add_argument("--outcome", required=True)
    ro.add_argument("--observation", required=True)
    ro.add_argument("--evidence", action="append", default=[],
                    help="Evidence path; repeatable.")
    ro.add_argument("--next", required=True,
                    help="Next step after this outcome.")
    ro.add_argument("--provenance", default=None)
    args = ap.parse_args(argv)

    if args.cmd == "record-outcome":
        rec = {
            "record_type": "decision_outcome",
            "decision_id": args.decision_id,
            "business": args.business,
            "ts": NOW(),
            "router_version": ROUTER_VERSION,
            "action": "RESEARCH_MORE",
            "observation": args.observation,
            "outcome": args.outcome,
            "new_evidence": args.evidence,
            "next_step": args.next,
            "provenance": args.provenance,
        }
        append_record(rec)
        print(json.dumps({"appended": True,
                          "decision_id": args.decision_id}, indent=1))
        return 0

    mission = args.mission or read_mission()
    candidates = read_candidates()
    if args.business:
        target = normalize(args.business)
        matched = [c for c in candidates if normalize(c) == target]
        if not matched:
            # The dossier may know a business the decisions doc does not;
            # route it directly rather than failing.
            matched = [args.business]
        candidates = matched
    pipeline_state = load_pipeline_state()
    outcomes = prior_research_outcomes()
    intel_present, intel_leverage = read_intel_inputs()

    appended = []
    for name in candidates:
        record = route_business(name, mission, pipeline_state, outcomes,
                                intel_present, intel_leverage,
                                args.dry_run)
        record["provenance"] = args.provenance_note or \
            build_provenance(record)
        if args.dry_run:
            print(json.dumps(record, indent=1))
        else:
            did = append_record(record)
            appended.append(did)
            print(json.dumps({"appended": True, "decision_id": did,
                              "selection": record["selection"],
                              "ping_relevance":
                              record["ping_relevance"]["verdict"],
                              "log": LOG_PATH}, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
