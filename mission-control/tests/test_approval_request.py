#!/usr/bin/env python3
"""Deterministic tests for the canonical ApprovalRequest primitive.

Covers: mission-control/approval_request.py (request/propose, the single
canonical authorization transition, deny, expiry, WAITING_APPROVAL
projection), mission-control/emit.py (MC_APPROVAL_* vocabulary +
idempotency), and the chat / Mission Control adapters (same transition,
identical canonical event).

Constitutional properties under test:
- approval binds an EXACT digest (mismatch refuses, no state change)
- double-approve is idempotent-safe
- ambiguous approval without an id is impossible by construction
- silence is never approval
- expiry never approves (all mission-class policies)
- no EXPIRE_APPROVE anywhere

Hermetic: all imports resolve inside this branch checkout (paths relative
to this file); journal and store are temp files. Nothing touches the live
journal or any live state.
Exit 0 = all green, 1 = any divergence.
"""

import json
import os
import sys

FAILURES = []


def check(name, cond, detail=""):
    print(("PASS" if cond else "FAIL"), name, detail)
    if not cond:
        FAILURES.append(name)


# ---- resolve this branch checkout ------------------------------------
THIS = os.path.dirname(os.path.abspath(__file__))
MC = os.path.normpath(os.path.join(THIS, ".."))
ADAPTERS = os.path.join(MC, "adapters")
for _p in (MC, ADAPTERS):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import tempfile

import approval_request as ar
import emit
import chat_approval
import mc_approval

T0 = 1790000000.0  # fixed clock for determinism

CONSEQ = {
    "reversibility": "reversible",
    "external_effect": "none",
    "money": "0",
    "publication": "none",
    "privacy": "none",
    "credential_access": "none",
    "destructive_scope": "none",
    "commitment": "none",
}

PROPOSAL = {
    "kind": "site_patch",
    "targetPage": "services",
    "targetSection": "services:cards:2",
    "propsDiff": {"presentation.hidden": True},
    "reason": "Hide the seasonal offer section.",
}


def fresh():
    tmp = tempfile.mkdtemp(prefix="apr-test-")
    journal = os.path.join(tmp, "events.jsonl")
    store = ar.ApprovalStore(os.path.join(tmp, "approvals.json"))
    return tmp, journal, store


def journal_rows(journal):
    rows = []
    if not os.path.exists(journal):
        return rows
    with open(journal, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def by_type(rows, event_type):
    return [r for r in rows if r.get("event_type") == event_type]


def make_request(store, journal, proposal=None, actor="worker:spine",
                 capability="social.publish", expires_at=None,
                 policy="HOLD", now=T0):
    return ar.request_approval(
        store, proposal or dict(PROPOSAL), capability, actor, dict(CONSEQ),
        summary="Hide the seasonal offer section",
        why="Owner asked to hide it until spring",
        cost="$0",
        expires_at=expires_at, expiry_policy=policy, now=now,
        journal_file=journal)


# ---- 1. digest canonicalization --------------------------------------
d1 = ar.proposal_digest({"b": 2, "a": 1})
d2 = ar.proposal_digest({"a": 1, "b": 2})
check("digest: key order irrelevant", d1 == d2, d1[:12])
d3 = ar.proposal_digest({"a": 1, "b": 2, "nonce": "xyz",
                         "requested_at": "whenever"})
check("digest: volatile keys excluded", d1 == d3, d3[:12])
d4 = ar.proposal_digest({"a": 1, "b": 3})
check("digest: different body, different digest", d1 != d4)

# ---- 2. request -> WAITING_APPROVAL + event ---------------------------
tmp, journal, store = fresh()
res = make_request(store, journal)
rec = res["record"]
check("request: ok and created", res["ok"] and res["created"])
check("request: status WAITING_APPROVAL", rec["status"] == "WAITING_APPROVAL",
      rec["id"])
check("request: digest pinned on record",
      rec["proposal_digest"] == ar.proposal_digest(PROPOSAL))
rows = journal_rows(journal)
req_ev = by_type(rows, "MC_APPROVAL_REQUESTED")
check("request: MC_APPROVAL_REQUESTED emitted", len(req_ev) == 1)
check("request: event carries digest not raw body",
      req_ev[0]["event_data"].get("proposal_digest") == rec["proposal_digest"]
      and "proposal" not in req_ev[0]["event_data"])
check("request: aggregate names the approval",
      req_ev[0]["aggregate_id"] == "mc:approval:" + rec["id"]
      and req_ev[0]["aggregate_type"] == "mc_approval")

# ---- 3. idempotent re-request -----------------------------------------
res2 = make_request(store, journal)
check("re-request: same id returned",
      res2["ok"] and not res2["created"]
      and res2["record"]["id"] == rec["id"])
check("re-request: no second REQUESTED event",
      len(by_type(journal_rows(journal), "MC_APPROVAL_REQUESTED")) == 1)

# ---- 4. approve with exact digest --------------------------------------
ok = ar.authorize_approval_transition(
    store, rec["id"], "nolan:operator", rec["proposal_digest"],
    now=T0 + 10, journal_file=journal)
check("approve: ok", ok["ok"] and not ok.get("idempotent"))
check("approve: status APPROVED",
      store.get(rec["id"])["status"] == "APPROVED")
appr = by_type(journal_rows(journal), "MC_APPROVAL_APPROVED")
check("approve: MC_APPROVAL_APPROVED emitted", len(appr) == 1,
      appr[0]["event_id"] if appr else "")
check("approve: event binds exact digest",
      appr and appr[0]["event_data"]["expected_digest"] ==
      rec["proposal_digest"])

# ---- 5. double approve is idempotent-safe ------------------------------
again = ar.authorize_approval_transition(
    store, rec["id"], "nolan:operator", rec["proposal_digest"],
    now=T0 + 20, journal_file=journal)
check("double-approve: ok and idempotent",
      again["ok"] and again.get("idempotent") is True)
check("double-approve: still APPROVED",
      store.get(rec["id"])["status"] == "APPROVED")
check("double-approve: no second APPROVED event",
      len(by_type(journal_rows(journal), "MC_APPROVAL_APPROVED")) == 1)

# ---- 6. digest mismatch refuses, no state change -----------------------
tmp, journal, store = fresh()
res = make_request(store, journal)
rid = res["record"]["id"]
bad = ar.authorize_approval_transition(
    store, rid, "nolan:operator", "0" * 64, now=T0 + 10,
    journal_file=journal)
check("mismatch: refused", not bad["ok"]
      and bad["reason"] == "digest_mismatch")
check("mismatch: still WAITING",
      store.get(rid)["status"] == "WAITING_APPROVAL")
check("mismatch: no APPROVED event",
      len(by_type(journal_rows(journal), "MC_APPROVAL_APPROVED")) == 0)
check("mismatch: MC_APPROVAL_REFUSED emitted",
      len(by_type(journal_rows(journal), "MC_APPROVAL_REFUSED")) == 1)

# ---- 7. wrong digest on an approved request refuses --------------------
ar.authorize_approval_transition(
    store, rid, "nolan:operator",
    res["record"]["proposal_digest"], now=T0 + 11, journal_file=journal)
wrong = ar.authorize_approval_transition(
    store, rid, "nolan:operator", "f" * 64, now=T0 + 12,
    journal_file=journal)
check("approved+mismatch: refused, stays APPROVED",
      not wrong["ok"] and wrong["reason"] == "digest_mismatch"
      and store.get(rid)["status"] == "APPROVED")

# ---- 8. unknown id ------------------------------------------------------
tmp, journal, store = fresh()
n0 = len(journal_rows(journal))
unk = ar.authorize_approval_transition(
    store, "apr-doesnotexist", "nolan:operator", "ab" * 32,
    now=T0, journal_file=journal)
check("unknown id: refused", not unk["ok"] and unk["reason"] == "unknown_id")
check("unknown id: journal untouched",
      len(journal_rows(journal)) == n0)

# ---- 9. ambiguous approval without id is impossible --------------------
try:
    ar.authorize_approval_transition(store)
    no_id_ok = True
except TypeError:
    no_id_ok = False
check("no-id approve: impossible by construction (TypeError)", not no_id_ok)
suspicious = [n for n in dir(ar)
              if "latest" in n.lower() or "newest" in n.lower()
              or "recent" in n.lower()]
check("no latest/newest resolver exists", suspicious == [], str(suspicious))

# ---- 10. deny -----------------------------------------------------------
tmp, journal, store = fresh()
res = make_request(store, journal)
rid = res["record"]["id"]
den = ar.deny_approval(store, rid, "nolan:operator", reason="not now",
                       now=T0 + 5, journal_file=journal)
check("deny: ok", den["ok"])
check("deny: status DENIED", store.get(rid)["status"] == "DENIED")
check("deny: MC_APPROVAL_DENIED emitted",
      len(by_type(journal_rows(journal), "MC_APPROVAL_DENIED")) == 1)
den2 = ar.deny_approval(store, rid, "nolan:operator", now=T0 + 6,
                        journal_file=journal)
check("deny twice: wrong_state refused",
      not den2["ok"] and den2["reason"] == "wrong_state")

# ---- 11. silence is never approval --------------------------------------
tmp, journal, store = fresh()
res = make_request(store, journal)  # no expiry, no action at all
rid = res["record"]["id"]
check("silence: still WAITING",
      store.get(rid)["status"] == "WAITING_APPROVAL")
types = {r["event_type"] for r in journal_rows(journal)}
check("silence: journal has only REQUESTED",
      types == {"MC_APPROVAL_REQUESTED"}, str(sorted(types)))

# ---- 12. expiry never approves, all policies ----------------------------
EXPECTED = {"HOLD": "EXPIRED", "EXPIRE_DENY": "DENIED",
            "EXPIRE_CANCEL": "CANCELLED", "EXPIRE_REPLAN": "SAFE_NOOP"}
for policy, outcome in EXPECTED.items():
    tmp, journal, store = fresh()
    res = make_request(store, journal, expires_at=T0 + 3600,
                       policy=policy, now=T0)
    rid = res["record"]["id"]
    ev = ar.evaluate_expiry(store, rid, now=T0 + 7200,
                            journal_file=journal)
    check("expiry %s: outcome %s" % (policy, outcome),
          ev["ok"] and ev.get("transitioned") and ev.get("outcome") == outcome,
          ev.get("outcome"))
    check("expiry %s: never APPROVED" % policy,
          store.get(rid)["status"] != "APPROVED")
    exp_rows = by_type(journal_rows(journal), "MC_APPROVAL_EXPIRED")
    check("expiry %s: MC_APPROVAL_EXPIRED carries outcome" % policy,
          len(exp_rows) == 1 and exp_rows[0]["event_data"]["outcome"] == outcome)

# ---- 13. approve after expiry goes to expiry, not approval --------------
tmp, journal, store = fresh()
res = make_request(store, journal, expires_at=T0 + 3600,
                   policy="EXPIRE_DENY", now=T0)
rid = res["record"]["id"]
late = ar.authorize_approval_transition(
    store, rid, "nolan:operator", res["record"]["proposal_digest"],
    now=T0 + 7200, journal_file=journal)
check("late approve: refused as expired, outcome DENIED",
      not late["ok"] and late["reason"] == "expired"
      and late.get("expiry_outcome") == "DENIED"
      and store.get(rid)["status"] == "DENIED")
check("late approve: no APPROVED event",
      len(by_type(journal_rows(journal), "MC_APPROVAL_APPROVED")) == 0)

# ---- 14. chat and MC invoke the SAME transition -------------------------
check("adapters: same transition function object",
      chat_approval.TRANSITION is mc_approval.TRANSITION
      and mc_approval.TRANSITION is ar.authorize_approval_transition)
tmp, journal, store = fresh()
r1 = make_request(store, journal, actor="worker:spine", now=T0)
r2 = make_request(store, journal, actor="worker:hermes", now=T0)
d = r1["record"]["proposal_digest"]
c = chat_approval.chat_approve(store, r1["record"]["id"],
                               "nolan:chat-session", d,
                               now=T0 + 10, journal_file=journal)
m = mc_approval.mc_approve(store, r2["record"]["id"],
                           "nolan:mc-operator", d,
                           now=T0 + 10, journal_file=journal)
check("adapters: both approve ok", c["ok"] and m["ok"])
appr = by_type(journal_rows(journal), "MC_APPROVAL_APPROVED")
check("adapters: two APPROVED events", len(appr) == 2)


def normalize(ev):
    # Identical modulo request-specific fields: the transition, the
    # digest binding, and the event shape must be the same.
    data = dict(ev["event_data"])
    for k in ("approval_id", "actor", "approver_identity", "stamp"):
        data[k] = "X"
    return {"event_type": ev["event_type"],
            "aggregate_type": ev["aggregate_type"], "event_data": data}


check("adapters: identical canonical event",
      normalize(appr[0]) == normalize(appr[1]),
      json.dumps(normalize(appr[0]), sort_keys=True)[:80])

# chat refuses to self-authorize: no identity -> ValueError
try:
    chat_approval.chat_approve(store, r1["record"]["id"], "", d,
                               journal_file=journal)
    chat_noid_ok = True
except ValueError:
    chat_noid_ok = False
check("chat: empty identity rejected", not chat_noid_ok)

# ---- 15. WAITING_APPROVAL projection -------------------------------------
tmp, journal, store = fresh()
make_request(store, journal, actor="worker:spine", now=T0,
             expires_at=T0 + 3600, policy="HOLD")
make_request(store, journal, actor="worker:hermes", now=T0,
             proposal={"kind": "publish", "url": "https://example.com/p"})
rows = ar.list_waiting_approvals(store, now=T0 + 100,
                                 journal_file=journal)
check("projection: two waiting rows", len(rows) == 2)
need = {"id", "what", "why", "who", "cost", "consequence",
        "waiting_since"}
check("projection: what/why/who/cost/consequence/waiting-since present",
      all(need <= set(r.keys()) for r in rows), str(sorted(rows[0].keys())))
check("projection: who/waiting_since truthful",
      rows[0]["who"] == "worker:spine"
      and rows[0]["waiting_since"] == ar._iso(T0))

# an expired request drops out of the projection (and transitions)
tmp, journal, store = fresh()
res = make_request(store, journal, expires_at=T0 + 10, policy="HOLD",
                   now=T0)
rows = ar.list_waiting_approvals(store, now=T0 + 9999,
                                 journal_file=journal)
check("projection: expired request not listed", rows == [])
check("projection: expired request transitioned to EXPIRED",
      store.get(res["record"]["id"])["status"] == "EXPIRED")

# ---- 16. server-controlled persistence across restart -------------------
tmp, journal, store = fresh()
res = make_request(store, journal, now=T0)
rid = res["record"]["id"]
store2 = ar.ApprovalStore(store.path)  # "restart": fresh instance
check("restart: record survives",
      store2.get(rid) is not None
      and store2.get(rid)["status"] == "WAITING_APPROVAL")
ok = ar.authorize_approval_transition(
    store2, rid, "nolan:operator", res["record"]["proposal_digest"],
    now=T0 + 10, journal_file=journal)
check("restart: transition works on reloaded state",
      ok["ok"] and store2.get(rid)["status"] == "APPROVED")

# ---- 17. no EXPIRE_APPROVE anywhere --------------------------------------
import io
import tokenize


def code_tokens(path):
    toks = []
    with open(path, "rb") as f:
        for tok in tokenize.tokenize(f.readline):
            if tok.type in (tokenize.COMMENT, tokenize.STRING,
                            tokenize.ENCODING, tokenize.NEWLINE,
                            tokenize.NL, tokenize.INDENT, tokenize.DEDENT,
                            tokenize.ENDMARKER):
                continue
            toks.append(tok.string)
    return " ".join(toks)


for fname in ("approval_request.py", "emit.py",
              os.path.join("adapters", "chat_approval.py"),
              os.path.join("adapters", "mc_approval.py")):
    code = code_tokens(os.path.join(MC, fname))
    check("no EXPIRE_APPROVE in code of %s" % fname,
          "EXPIRE_APPROVE" not in code and "expire_approve" not in code)
check("no expiry policy maps to APPROVED (runtime)",
      "APPROVED" not in set(ar.EXPIRY_POLICY_OUTCOMES.values()),
      str(ar.EXPIRY_POLICY_OUTCOMES))
check("no MC_APPROVAL auto type registered",
      not [t for t in emit.MC_APPROVAL_EVENT_TYPES if "AUTO" in t])

# ---- 18. consequence validation ------------------------------------------
tmp, journal, store = fresh()
try:
    ar._validate_consequence({"mind_reading": True})
    bad_key_ok = True
except ValueError:
    bad_key_ok = False
check("consequence: unknown key rejected", not bad_key_ok)
try:
    ar._validate_consequence("high")
    bad_type_ok = True
except ValueError:
    bad_type_ok = False
check("consequence: non-dict rejected", not bad_type_ok)

# ---- 19. missing arguments -----------------------------------------------
tmp, journal, store = fresh()
res = make_request(store, journal)
miss = ar.authorize_approval_transition(
    store, res["record"]["id"], "nolan:operator", "",
    journal_file=journal)
check("missing digest: refused",
      not miss["ok"] and miss["reason"] == "missing_argument")

print()
if FAILURES:
    print("FAILURES: %d" % len(FAILURES))
    for f in FAILURES:
        print(" -", f)
    sys.exit(1)
print("ALL GREEN")
