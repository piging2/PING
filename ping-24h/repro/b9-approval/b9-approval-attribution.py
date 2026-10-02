#!/usr/bin/env python3
"""
B9: APPROVAL DIGEST SUBSTITUTION (control holds) + APPROVAL ATTRIBUTION FORGERY.

Uses the REAL approval primitive (mc-approval/approval_request.py at HEAD,
stdlib-only, read-only copy) against a scratch store. No production state.

Findings under test:
  1. Digest substitution: authorize with a wrong digest -> must refuse
     (the primitive compares expected_digest == rec["proposal_digest"]
     exactly; route.ts additionally enforces 64-char hex).
  2. Attribution: the route takes `approver` from the CALLER body (default
     'nolan:demo-owner') and the primitive records decided_by verbatim.
     The route has no caller authentication (middleware.ts does no auth;
     only dispatch + tenant-gate use x-mc-caller-key), and :3100 listens
     on *:3100. So anyone reaching the port can approve AS Nolan, and the
     journal's "who approved" is self-certified.

Run: python3 b9-approval-attribution.py   (writes only ./scratch-store.json)
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

# Event sink stub: the real emit.py needs pass_policy_engine (not copied;
# irrelevant to the authorization logic under test). Stub the sink so the
# primitive under test (digest check + decided_by recording) runs unmodified.
import types
_emit_stub = types.ModuleType("emit")
_emit_stub.emit_approval_event = lambda *a, **k: ({"stub": True}, "stubbed")
sys.modules["emit"] = _emit_stub

sys.path.insert(0, HERE)
from approval_request import ApprovalStore, request_approval, authorize_approval_transition

STORE = os.path.join(HERE, "scratch-store.json")
if os.path.exists(STORE):
    os.remove(STORE)
store = ApprovalStore(STORE)

# A recorded proposal awaiting Nolan.
req = request_approval(
    store,
    proposal={"action": "publish", "site": "happy-place", "diff": "homepage hero text"},
    capability="site.publish",
    actor="mission-control",
    consequence={"reversibility": "reversible", "external_effect": True, "publication": True},
    summary="Publish homepage hero update",
    dry_run=True,
)
assert req["ok"], req
aid = req["record"]["id"]
digest = req["record"]["proposal_digest"]
print(f"proposal {aid} digest={digest[:12]}... status={req['record']['status']}")

# 1. CONTROL: digest substitution must refuse.
bad = authorize_approval_transition(store, aid, "nolan:demo-owner", "0" * 64, dry_run=True)
ctl = (not bad["ok"]) and bad["reason"] == "digest_mismatch" and store.get(aid)["status"] == "WAITING_APPROVAL"
print(f"[CONTROL digest substitution] refused={not bad['ok']} reason={bad['reason']} "
      f"state_unchanged={store.get(aid)['status'] == 'WAITING_APPROVAL'} => {'HOLDS' if ctl else 'BROKEN'}")

# 2. ATTACK: correct digest (visible via unauthenticated GET /api/mc/approvals)
#    + self-asserted approver identity (route default is 'nolan:demo-owner',
#    taken from the caller body with no verification).
ok = authorize_approval_transition(store, aid, "nolan:demo-owner", digest, dry_run=True)
rec = store.get(aid)
atk = ok["ok"] and rec["status"] == "APPROVED" and rec["decided_by"] == "nolan:demo-owner"
print(f"[ATTACK attribution] approved={ok['ok']} decided_by={rec['decided_by']!r} "
      f"=> {'FORGERY ACCEPTED' if atk else 'rejected'}: the journal records Nolan as approver "
      f"on a decision made by whoever POSTed.")

# 3. The identity is a free string: a second proposal approved as anyone.
req2 = request_approval(store, {"action": "x"}, "site.publish", "mission-control",
                       {"reversibility": "reversible"}, approval_id="b9-second", dry_run=True)
d2 = req2["record"]["proposal_digest"]
ok2 = authorize_approval_transition(store, "b9-second", "mallory:lan-attacker", d2, dry_run=True)
rec2 = store.get("b9-second")
print(f"[ATTACK free identity] decided_by={rec2['decided_by']!r} => "
      f"{'ACCEPTED' if ok2['ok'] else 'rejected'}: approver_identity is caller-controlled text.")

print("\nRESULT: digest substitution FAILS CLOSED (exact-match); approver attribution is "
      "SELF-CERTIFIED (no auth on POST /api/mc/approvals, :3100 on *:3100, approver from body). "
      "WHAT is bound; WHO is not.")
print("FALSIFIES IF: the deployed route authenticates the caller and binds approver_identity "
      "to the authenticated principal instead of the request body.")
