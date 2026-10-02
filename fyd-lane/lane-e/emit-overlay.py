#!/usr/bin/env python3
"""Emit one FYD_SITE_OVERLAY event to the PING gateway.

The event is a REAL PING backend state change: it lands in ping_events via
POST /events and is picked up by tools/fyd-site-projection/dump.py on the
next projection regen. The Bearer <redacted> is resolved at runtime from the
ping-gateway container env (never stored, never echoed).

Usage:
  emit-overlay.py <site-slug> <ops-json-file>
  emit-overlay.py --add-service <site-slug> <service-title> <service-description>

ops JSON file shape:
  { "ops": [ {"op":"set_field","objectId":"...","field":"phone","value":"..."},
             {"op":"add_object","object":{...}},
             {"op":"add_relationship","relationship":{...}},
             {"op":"deactivate_object","objectId":"..."} ] }

Prints the accepted event_id. Exit 0 only on gateway acceptance.
"""
import base64
import hashlib
import json
import os
import subprocess
import sys
import tempfile

# FYD_GATEWAY_URL overrides the target (demo: http://127.0.0.1:18199/events).
# FYD_GATEWAY_NO_AUTH=1 skips the Bearer header (the repo-booted demo
# gateway has no auth on its event route; the 8080 deployment does).
GATEWAY_URL = os.environ.get("FYD_GATEWAY_URL", "http://127.0.0.1:8080/events")
GATEWAY_NO_AUTH = bool(os.environ.get("FYD_GATEWAY_NO_AUTH"))
AGGREGATE_TYPE = "fyd_site"
EVENT_TYPE = "FYD_SITE_OVERLAY"
BRIDGE = os.path.expanduser("~/workspace/pig/pigwsl-run.sh")

OWNER_IDS = {
    "happy-place": "website-business-6fa5ebd99d72c4cb",
    "coppersmith-plumbing": "website-business-2f1327c09d622175",
}

# FYD-037: journal identity. The overlay journal asserts a live-derived
# identity marker on its base URL (FYD demo journal: GET / -> {"journal":
# "fyd-demo-journal@<derived>"}; main PING journal: GET /health ->
# {"journal": "ping-main-journal@<derived>"}). emit() performs exactly one
# pre-flight GET before POSTing, compares the asserted marker against
# EXPECTED_OVERLAY_JOURNAL_MARKER, and fails closed with the typed
# WRONG_JOURNAL error on mismatch OR on an unreadable marker. Zero POSTs
# happen before this check passes, so a misconfigured FYD_GATEWAY_URL can
# never silently write an FYD overlay into the wrong journal (2026-09-21
# incident class). FYD overlays belong in the FYD demo journal: the main
# PING journal does not accept FYD_SITE_OVERLAY (FL-20260921-231), and its
# /health journal field is pending the gateway cutover HOLD, so main-mode
# emits fail closed until that field exists.
EXPECTED_OVERLAY_JOURNAL_MARKER = os.environ.get(
    "FYD_EXPECTED_OVERLAY_JOURNAL", "fyd-demo-journal")


class WrongJournalError(RuntimeError):
    """Typed FYD-037 failure: the target journal did not prove the expected
    overlay-journal identity (marker mismatch or unreadable marker).
    Always fail closed: never POST, never retry against another journal."""


def _journal_marker_ok(asserted, expected):
    """The derived suffix after '@' is allowed to vary (the journal
    re-derives it live from its store); the marker name must match."""
    return (isinstance(asserted, str)
            and (asserted == expected
                 or asserted.startswith(expected + "@")))


def _preflight_journal():
    """One pre-flight GET against the target journal's identity endpoint.

    Runs on the Pig via the bridge (the same path as the POST): the
    journals are Pig-loopback. Raises WrongJournalError on mismatch or on
    any unreadable marker. Must be called before any POST is attempted.
    """
    base = GATEWAY_URL
    if base.endswith("/events"):
        base = base[: -len("/events")]
    expected = EXPECTED_OVERLAY_JOURNAL_MARKER
    # The main PING journal asserts its identity on /health; the FYD demo
    # journal asserts on /.
    probe_url = base.rstrip("/") + (
        "/health" if expected.startswith("ping-main-journal") else "/")
    pig_cmd = "curl -s -m 20 '%s'; ec=$?; echo; exit $ec" % probe_url
    p = subprocess.run([BRIDGE, pig_cmd], stdin=subprocess.DEVNULL,
                       capture_output=True, text=True, timeout=60)
    out = (p.stdout or "").strip()
    if p.returncode != 0:
        raise WrongJournalError(
            "WRONG_JOURNAL: journal identity unreadable at %s "
            "(pre-flight GET failed, rc=%d)" % (probe_url, p.returncode))
    try:
        doc = json.loads(out)
    except Exception:
        raise WrongJournalError(
            "WRONG_JOURNAL: journal identity unreadable at %s "
            "(non-JSON response)" % probe_url)
    asserted = doc.get("journal") if isinstance(doc, dict) else None
    if not _journal_marker_ok(asserted, expected):
        raise WrongJournalError(
            "WRONG_JOURNAL: expected overlay journal marker %r at %s, "
            "got %r" % (expected, probe_url, asserted))


def emit(site, ops):
    _preflight_journal()  # FYD-037: fail closed before any POST.
    envelope = {
        "event_type": EVENT_TYPE,
        "aggregate_id": "fyd-site:" + site,
        "aggregate_type": AGGREGATE_TYPE,
        "event_data": {"siteId": site, "ops": ops},
    }
    body_b64 = base64.b64encode(json.dumps(envelope).encode("utf-8")).decode()
    # Runs on the Pig via the bridge. The Bearer <redacted> is resolved inside the
    # Pig-side script from the gateway container env; it never leaves the Pig,
    # never touches disk, never appears in output.
    if GATEWAY_NO_AUTH:
        auth_setup = ""
        auth_header = ""
    else:
        auth_setup = ("TOKEN=$(docker exec ping-gateway printenv MUSE_LEVEL_1_KEY) && "
                      "[ -n \"$TOKEN\" ] && ")
        auth_header = "-H \"Authorization: Bearer $TOKEN\" "
    pig_template = (
        "echo '%s' | base64 -d > /tmp/emit-body.json && "
        + auth_setup +
        "curl -s -m 20 -X POST '%s' "
        + auth_header +
        "-H 'Content-Type: application/json' "
        "--data @/tmp/emit-body.json; ec=$?; "
        "rm -f /tmp/emit-body.json; echo; exit $ec"
    )
    pig_cmd = pig_template % (body_b64, GATEWAY_URL)
    p = subprocess.run([BRIDGE, pig_cmd], stdin=subprocess.DEVNULL,
                       capture_output=True, text=True, timeout=90)
    out = (p.stdout or "").strip()
    if p.returncode != 0 or "EMIT_ERROR" in out:
        sys.stderr.write("emit failed (rc=%d): %s %s\n" % (p.returncode, out, p.stderr))
        return 1
    try:
        resp = json.loads(out)
    except Exception:
        sys.stderr.write("emit: non-JSON gateway response: %s\n" % out)
        return 1
    eid = resp.get("event_id") or resp.get("id")
    if not eid:
        sys.stderr.write("emit rejected: %s\n" % out)
        return 1
    print(eid)
    return 0


def add_service_ops(site, title, desc):
    oid = "website-service-" + hashlib.sha256((site + title).encode()).hexdigest()[:16]
    owner = OWNER_IDS[site]
    rid = "rel-" + hashlib.sha256((oid + owner).encode()).hexdigest()[:16]
    return [
        {"op": "add_object", "object": {
            "id": oid,
            "schema": "ping.social.service@1",
            "controllerId": "identity_fyd_compiler_test",
            "visibility": "public",
            "title": title,
            "description": desc,
            "fields": {"title": title, "description": desc},
            "createdAt": "2026-09-21T00:00:00.000Z",
            "updatedAt": "2026-09-21T00:00:00.000Z",
            "provenance": {"kind": "canonical-journal",
                           "ref": "pending-emit",
                           "derivedAt": "2026-09-21T00:00:00.000Z"},
        }},
        {"op": "add_relationship", "relationship": {
            "id": rid,
            "subject": owner, "predicate": "provides", "object": oid,
            "status": "active", "createdAt": "2026-09-21T00:00:00.000Z",
            "evidenceRef": "pending-emit",
        }},
    ]


def main(argv):
    try:
        return _main(argv)
    except WrongJournalError as e:
        # FYD-037: typed fail-closed. The message names the expected marker
        # and what the journal asserted, so the misconfiguration is visible.
        sys.stderr.write("%s\n" % e)
        return 3


def _main(argv):
    if len(argv) == 5 and argv[1] == "--add-service":
        site, title, desc = argv[2], argv[3], argv[4]
        if site not in OWNER_IDS:
            sys.stderr.write("unknown site: %s\n" % site)
            return 1
        return emit(site, add_service_ops(site, title, desc))
    if len(argv) == 3 and not argv[1].startswith("--"):
        site, ops_file = argv[1], argv[2]
        with open(ops_file, encoding="utf-8") as f:
            doc = json.load(f)
        ops = doc.get("ops")
        if not isinstance(ops, list):
            sys.stderr.write("ops file must contain {\"ops\": [...]}\n")
            return 1
        return emit(site, ops)
    sys.stderr.write(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
