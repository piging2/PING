#!/usr/bin/env python3
"""compare remote 'KEY value' lines (argv[2]) vs gateway-inspect.json (argv[1]).
Prints human-readable diffs, or NONE."""
import json, sys
base = json.load(open(sys.argv[1]))
fields = {}
for line in open(sys.argv[2]):
    line = line.strip()
    if " " not in line:
        continue
    k, v = line.split(" ", 1)
    fields[k] = v
checks = {
    "image": ("IMAGE", base["image"]),
    "ports": ("PORTS", json.dumps(base["port_bindings"], separators=(",", ":"))),
    "restart": ("RESTART", base["restart_policy"]),
    "memory": ("MEM", str(base["memory"])),
    "hctest": ("HCTEST", json.dumps(base["healthcheck_test"], separators=(",", ":"))),
    "hc": ("HC", " ".join([base["healthcheck_interval"], base["healthcheck_timeout"],
                           base["healthcheck_start_period"], str(base["healthcheck_retries"])])),
}
diffs = []
for name, (k, want) in checks.items():
    got = fields.get(k, "ABSENT")
    if got != want:
        diffs.append("%s: got=%s want=%s" % (name, got[:60], want[:60]))
print(" | ".join(diffs) or "NONE")
