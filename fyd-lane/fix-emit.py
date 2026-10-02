"""Fix % vs + precedence in emit-overlay.py pig_cmd construction. Runs ON THE PIG."""
import sys

Q = chr(39)   # single quote (shell quoting inside the pig command)
DQ = chr(34)  # double quote (Python string delimiters in the target file)
P = "/home/nolan/ping/tools/fyd-site-projection/emit-overlay.py"
src = open(P, encoding="utf-8").read()
if "pig_template" in src:
    print("ALREADY-FIXED")
    sys.exit(0)

def dl(s):
    # one target-file line: 8-space indent, double-quoted Python string
    return "        " + DQ + s + DQ + "\n"

old = (
    "    pig_cmd = (\n"
    + dl("echo " + Q + "%s" + Q + " | base64 -d > /tmp/emit-body.json && ")
    + "        + auth_setup +\n"
    + dl("curl -s -m 20 -X POST " + Q + "%s" + Q + " ")
    + "        + auth_header +\n"
    + dl("-H " + Q + "Content-Type: application/json" + Q + " ")
    + dl("--data @/tmp/emit-body.json; ec=$?; ")
    + dl("rm -f /tmp/emit-body.json; echo; exit $ec")
    + '        % (body_b64, GATEWAY_URL)\n'
    + "    )\n"
)
assert src.count(old) == 1, "anchor count=%d" % src.count(old)

new = (
    "    pig_template = (\n"
    + dl("echo " + Q + "%s" + Q + " | base64 -d > /tmp/emit-body.json && ")
    + "        + auth_setup +\n"
    + dl("curl -s -m 20 -X POST " + Q + "%s" + Q + " ")
    + "        + auth_header +\n"
    + dl("-H " + Q + "Content-Type: application/json" + Q + " ")
    + dl("--data @/tmp/emit-body.json; ec=$?; ")
    + dl("rm -f /tmp/emit-body.json; echo; exit $ec")
    + "    )\n"
    + "    pig_cmd = pig_template % (body_b64, GATEWAY_URL)\n"
)
open(P, "w", encoding="utf-8").write(src.replace(old, new))
print("EMIT-FIX-OK")
