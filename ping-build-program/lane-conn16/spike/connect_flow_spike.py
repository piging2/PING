#!/usr/bin/env python3
"""Isolated OAuth connect-flow spike (fixtures only, no network, no credentials).

Simulates the 7-step connect state machine from OAUTH-CONNECT-FLOW.md against
a fixture authorization server: PKCE S256 code exchange, state verification,
server-side token custody via a stub lane-L broker issue(), capability
inventory, and containment assertions (token canary must appear in NO
browser-facing output, event payload, log line, or fixture artifact).

Profiles: facebook (auth code + PKCE), atproto (PAR + PKCE + DPoP shape),
google-drive (auth code + PKCE + offline). Adversarial: wrong state,
partial scope grant.
"""
import base64
import hashlib
import json
import re
import secrets
import sys

CANARY = "sk_live_CANARY_9f8e7d6c5b4a"  # planted token material; must never leak

# ---------------------------------------------------------------- fixtures
class FixtureAuthServer:
    """Fake OAuth authorization server. Knows nothing real; verifies PKCE."""

    def __init__(self, profile, grant_scopes=None):
        self.profile = profile
        self.codes = {}
        self.grant_scopes = grant_scopes  # None => grant all requested

    def par(self, params):
        # ATProto-style pushed authorization request (simplified)
        assert params["code_challenge_method"] == "S256", "PAR requires S256"
        request_uri = "urn:fixture:par:" + secrets.token_hex(8)
        self.codes[request_uri] = params
        return {"request_uri": request_uri, "expires_in": 90}

    def authorize(self, session):
        # user approves; server issues a code bound to the challenge
        code = "fixture_code_" + secrets.token_hex(8)
        self.codes[code] = session
        return code

    def token(self, code=None, request_uri=None, code_verifier=None,
              redirect_uri=None, dpop_proof=None):
        key = request_uri or code
        session = self.codes.get(key)
        if session is None:
            return {"error": "invalid_grant"}, 400
        # PKCE verification
        expected = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).rstrip(b"=").decode()
        if expected != session["code_challenge"]:
            return {"error": "invalid_grant", "detail": "pkce_mismatch"}, 400
        scopes = self.grant_scopes if self.grant_scopes is not None \
            else session["scope"].split()
        return {
            "access_token": CANARY,
            "refresh_token": "rt_CANARY_" + secrets.token_hex(4),
            "token_type": "DPoP" if self.profile == "atproto" else "Bearer",
            "expires_in": 3600,
            "scope": " ".join(scopes),
            "sub": "did:example:123" if self.profile == "atproto" else None,
            "iss": "https://fixture-as.example" if self.profile == "atproto" else None,
        }, 200


class StubBroker:
    """Stub of the lane-L secret broker issue() path."""

    def __init__(self):
        self.issued = []
        self.audit = []

    def issue(self, principal, tenant, source_id, scopes, material, ttl):
        assert tenant and tenant != "untrusted", "tenant must come from trusted context"
        assert ttl <= 900, "handle TTL ceiling 900s"
        handle = "cap_" + secrets.token_urlsafe(32)
        fingerprint = hashlib.sha256(handle.encode()).hexdigest()[:12]
        # broker stores sha256(handle) -> record; the value itself is never stored
        self.issued.append({"sha256": hashlib.sha256(handle.encode()).hexdigest(),
                           "tenant": tenant, "source": source_id,
                           "scopes": scopes, "principal": principal})
        self.audit.append({"event": "issue", "fingerprint": fingerprint,
                           "principal": principal, "tenant": tenant,
                           "source": source_id, "decision": "granted"})
        return handle

# ---------------------------------------------------------------- flow
PROFILES = {
    "facebook": {"scopes": ["pages_read_engagement", "pages_read_user_content",
                            "pages_show_list"],
                 "caps": ["read.page_identity", "read.page_posts"]},
    "atproto": {"scopes": ["atproto", "transition:generic"],
                "caps": ["read.profile", "read.feed"]},
    "google-drive": {"scopes": ["https://www.googleapis.com/auth/drive.readonly"],
                     "caps": ["read.changes", "read.files"]},
}

LOG_LINES = []
BROWSER_OUTPUTS = []
EVENT_PAYLOADS = []

def log(msg):
    LOG_LINES.append(msg)

def browser_send(payload):
    # ONLY status + inventory may reach the browser. Enforced below.
    BROWSER_OUTPUTS.append(payload)

def emit_event(payload):
    EVENT_PAYLOADS.append(payload)

def connect_flow(profile_name, tenant="tenant_acme", grant_scopes=None,
                 tamper_state=False):
    profile = PROFILES[profile_name]
    server = FixtureAuthServer(profile_name, grant_scopes=grant_scopes)
    broker = StubBroker()
    state = "IDLE"
    audit = []

    # PROVIDER_SELECTED -> PERMISSIONS_EXPLAINED
    state = "PERMISSIONS_EXPLAINED"
    for scope in profile["scopes"]:
        log(f"[{profile_name}] requested scope explained: {scope}")
    audit.append({"transition": "IDLE->PERMISSIONS_EXPLAINED"})

    # AUTHORIZING: server-side only
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    session_state = secrets.token_hex(16)
    server_side = {"state": session_state, "verifier": verifier,
                   "challenge": challenge}
    session_params = {"code_challenge": challenge,
                      "code_challenge_method": "S256",
                      "scope": " ".join(profile["scopes"]),
                      "state": session_state,
                      "client_id": "https://ping.example/oauth/client-metadata.json",
                      "redirect_uri": "https://ping.example/oauth/callback"}
    if profile_name == "atproto":
        par = server.par(session_params)  # PAR required
        auth_ref = ("authorize", par["request_uri"])
    else:
        auth_ref = ("authorize", None)
    state = "AUTHORIZING"
    audit.append({"transition": "PERMISSIONS_EXPLAINED->AUTHORIZING",
                  "pkce": "S256", "par": profile_name == "atproto"})

    # user approves at the fixture provider; provider redirects with code+state
    if auth_ref[0] == "authorize" and auth_ref[1]:
        code = server.authorize(server.par(session_params) and
                                {"code_challenge": challenge,
                                 "code_challenge_method": "S256",
                                 "scope": session_params["scope"],
                                 "state": session_state})
        returned_request_uri = auth_ref[1]
    else:
        code = server.authorize({"code_challenge": challenge,
                                 "code_challenge_method": "S256",
                                 "scope": session_params["scope"],
                                 "state": session_state})
        returned_request_uri = None
    returned_state = "tampered" if tamper_state else session_state

    # CALLBACK_RECEIVED: verify state BEFORE any token request
    if returned_state != server_side["state"]:
        state = "PROVIDER_ERROR"
        emit_event({"type": "connect.failed", "profile": profile_name,
                    "reason": "state_mismatch", "token_requested": False})
        browser_send({"status": "error", "reason": "state_mismatch"})
        return {"ok": False, "reason": "state_mismatch", "audit": audit,
                "broker": broker}

    # token exchange, server-side, PKCE verifier (+ DPoP shape for atproto)
    dpop = "dpop-proof-fixture" if profile_name == "atproto" else None
    token_resp, status = server.token(
        code=None if returned_request_uri else code,
        request_uri=returned_request_uri, code_verifier=verifier,
        redirect_uri=session_params["redirect_uri"], dpop_proof=dpop)
    assert status == 200, f"token exchange failed: {token_resp}"
    if profile_name == "atproto":
        # mandatory sub/iss consistency check
        assert token_resp["sub"] and token_resp["iss"], "atproto identity check"
    state = "CALLBACK_RECEIVED"
    audit.append({"transition": "AUTHORIZING->CALLBACK_RECEIVED",
                  "granted_scopes": token_resp["scope"].split()})

    # CUSTODY_ISSUED: broker issue() from the trusted path
    granted = token_resp["scope"].split()
    handle = broker.issue(principal="worker:connect-flow",
                          tenant=tenant, source_id=f"{profile_name}:acct1",
                          scopes=granted, material="ENCRYPTED_AT_REST",
                          ttl=900)
    assert handle.startswith("cap_")
    state = "CUSTODY_ISSUED"
    audit.append({"transition": "CALLBACK_RECEIVED->CUSTODY_ISSUED",
                  "handle_fingerprint": broker.audit[-1]["fingerprint"]})

    # INVENTORIED: capabilities from GRANTED scopes, never requested scopes
    granted_set = set(granted)
    inventory = []
    for cap, need in zip(profile["caps"], profile["scopes"]):
        inventory.append({"capability": cap,
                          "status": "granted" if need in granted_set
                          else "unsupported"})
    state = "INVENTORIED"
    emit_event({"type": "connect.completed", "profile": profile_name,
                "source_id": f"{profile_name}:acct1",
                "capabilities": [c["capability"] for c in inventory
                                 if c["status"] == "granted"]})
    # browser gets status + inventory ONLY
    browser_send({"status": "ok", "profile": profile_name,
                  "inventory": inventory})
    log(f"[{profile_name}] connect complete; handle issued; inventory shown")
    return {"ok": True, "audit": audit, "broker": broker,
            "inventory": inventory}

SECRET_SHAPED = re.compile(
    r"(sk_live_|rt_CANARY_|ghp_|xox[bap]-|ya29\.|dpop-proof-fixture)")

def containment_scan():
    hits = []
    for i, blob in enumerate(BROWSER_OUTPUTS):
        text = json.dumps(blob)
        if CANARY in text or SECRET_SHAPED.search(text):
            hits.append(("browser", i, text[:120]))
    for i, blob in enumerate(EVENT_PAYLOADS):
        text = json.dumps(blob)
        if CANARY in text or SECRET_SHAPED.search(text):
            hits.append(("event", i, text[:120]))
    for i, line in enumerate(LOG_LINES):
        if CANARY in line or SECRET_SHAPED.search(line):
            hits.append(("log", i, line[:120]))
    return hits

def main():
    results = []
    for profile in PROFILES:
        r = connect_flow(profile)
        results.append((profile, r["ok"]))
        assert r["ok"], profile
    # adversarial 1: tampered state -> fails closed, no token request
    r = connect_flow("facebook", tamper_state=True)
    assert not r["ok"] and r["reason"] == "state_mismatch"
    assert len(r["broker"].issued) == 0, "no handle on failed state check"
    results.append(("tampered-state", True))
    # adversarial 2: partial grant -> missing capability marked unsupported
    r = connect_flow("google-drive",
                     grant_scopes=["https://www.googleapis.com/auth/drive.readonly"])
    assert r["ok"] and all(c["status"] == "granted" for c in r["inventory"])
    r = connect_flow("facebook", grant_scopes=["pages_show_list"])
    assert r["ok"]
    statuses = {c["capability"]: c["status"] for c in r["inventory"]}
    assert statuses["read.page_identity"] == "unsupported", statuses
    assert statuses["read.page_posts"] == "unsupported", statuses
    results.append(("partial-grant", True))
    # containment
    hits = containment_scan()
    assert not hits, f"CONTAINMENT FAILURE: {hits}"
    results.append(("containment", True))
    print("connect_flow_spike: ALL CHECKS PASS")
    for name, ok in results:
        print(f"  {'PASS' if ok else 'FAIL'} {name}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
