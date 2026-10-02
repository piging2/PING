"""Patch emit-overlay.py: FYD_GATEWAY_URL override + FYD_GATEWAY_NO_AUTH flag.
Runs ON THE PIG. Idempotent.
"""
import sys

P = "/home/nolan/ping/tools/fyd-site-projection/emit-overlay.py"
src = open(P, encoding="utf-8").read()
if "FYD_GATEWAY_URL" in src:
    print("ALREADY-PATCHED")
    sys.exit(0)

# 1. Gateway URL becomes env-overridable.
anchor1 = 'GATEWAY_URL = "http://127.0.0.1:8080/events"\n'
assert src.count(anchor1) == 1
new1 = ('# FYD_GATEWAY_URL overrides the target (demo: http://127.0.0.1:18199/events).\n'
        '# FYD_GATEWAY_NO_AUTH=1 skips the Bearer header (the repo-booted demo\n'
        '# gateway has no auth on its event route; the 8080 deployment does).\n'
        'GATEWAY_URL = os.environ.get("FYD_GATEWAY_URL", "http://127.0.0.1:8080/events")\n'
        'GATEWAY_NO_AUTH = bool(os.environ.get("FYD_GATEWAY_NO_AUTH"))\n')
src = src.replace(anchor1, new1)

# 2. Auth becomes conditional in emit().
anchor2 = '''    pig_cmd = (
        "echo '%s' | base64 -d > /tmp/emit-body.json && "
        "TOKEN=$(docker exec ping-gateway printenv MUSE_LEVEL_1_KEY) && "
        "[ -n \\"$TOKEN\\" ] && "
        "curl -s -m 20 -X POST '%s' "
        "-H \\"Authorization: Bearer $TOKEN\\" "
        "-H 'Content-Type: application/json' "
        "--data @/tmp/emit-body.json; ec=$?; "
        "rm -f /tmp/emit-body.json; echo; exit $ec"
        % (body_b64, GATEWAY_URL)
    )
'''
assert src.count(anchor2) == 1, "emit anchor not found"
new2 = '''    if GATEWAY_NO_AUTH:
        auth_setup = ""
        auth_header = ""
    else:
        auth_setup = ("TOKEN=$(docker exec ping-gateway printenv MUSE_LEVEL_1_KEY) && "
                      "[ -n \\"$TOKEN\\" ] && ")
        auth_header = "-H \\"Authorization: Bearer $TOKEN\\" "
    pig_cmd = (
        "echo '%s' | base64 -d > /tmp/emit-body.json && "
        + auth_setup +
        "curl -s -m 20 -X POST '%s' "
        + auth_header +
        "-H 'Content-Type: application/json' "
        "--data @/tmp/emit-body.json; ec=$?; "
        "rm -f /tmp/emit-body.json; echo; exit $ec"
        % (body_b64, GATEWAY_URL)
    )
'''
src = src.replace(anchor2, new2)

open(P, "w", encoding="utf-8").write(src)
print("EMIT-PATCH-OK")
