#!/usr/bin/env python3
"""FYD-010 adversarial privacy proof: canary grader.

Reads evidence/*.body, reports exactly which canary classes appear in each
anonymous response, and checks the HTTP status expectations.
Canary semantics:
  NEVER-SERVE  - must not appear in ANY anonymous response. Any appearance
                 is a FAIL leak, documented with the exact probe.
  EXACT-DENY   - must be blocked on the /api/ping reader path (name denylist);
                 recorded if it appears on the FYD projection path (boundary
                 disagreement: the FYD boundary has no name denylist).
  PUBLIC       - public field on a public object; appearance is correct.
  HIDE-TEST    - address-hide decision must remove these everywhere for the
                 anonymous viewer.
"""
import json
import sys
from pathlib import Path

EV = Path(__file__).parent / "evidence"
C = "CANARY-FYD010"

CANARIES = {
    "HIDDEN-MEMO": f"{C}-HIDDEN-MEMO",          # internalMemo field
    "PROVIDER-TOKEN": f"{C}-PROVIDER-TOKEN",    # providerToken field
    "API-SECRET": f"{C}-API-SECRET",            # apiSecret field
    "OWNER-PHONE": f"{C}-OWNER-PHONE",          # ownerPhone field
    "TENANT-REF": f"{C}-TENANT-REF",            # tenantRef field
    "PRIVATE-OBJ": f"{C}-PRIVATE-OBJ",          # private object's note
    "OWNER-CORR-UPDATE": f"{C}-OWNER-CORRECTION owner private correction must not leak",
    "UPDATED-MEMO": f"{C}-UPDATED-MEMO",
}
EXACT_DENY = {"EXACT-DENY": f"{C}-EXACT-DENY"}
PUBLIC_OK = {
    "PUB-EMAIL": f"{C}-CORRECTION-SOURCE",
    "PUB-PHONE": "+1-970-555-0142",
    "PUB-ADDR": "999 Canary Ave",
    # Owner-authorized contact correction (owner-store, composed pre-boundary
    # as the effective public value). Expected in the contact answer.
    "OWNER-CORR-PHONE": "555-0188",  # owner-store validates phones; distinct fictional digits
    # Pre-correction public source value of the phone (public website data).
    "SOURCE-PHONE": "970-245-3869",
}
HIDE_TEST = {
    "HIDE-ADDR": "777 Cut St",
}

EXPECTED_STATUS = {
    "P2": "404", "P4": "404", "P7": "404",
    "A3": "404", "A7": "400",
    "R2": "404",
}

PROBES = ["P1", "P2", "P3", "P4", "P5", "P6", "P6b", "P7",
          "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9",
          "R1", "R2", "R3", "R4", "R5", "S1"]

print(f"{'probe':<4} {'http':<4} {'NEVER-SERVE hits':<28} {'EXACT-DENY':<10} {'PUBLIC-OK hits'}")
print("-" * 120)
failures = []
for p in PROBES:
    body_f = EV / f"{p}.body"
    code_f = EV / f"{p}.code"
    if not body_f.exists():
        print(f"{p:<4} {'MISS':<4} evidence file missing")
        failures.append((p, "evidence file missing"))
        continue
    code = code_f.read_text().strip() if code_f.exists() else "?"
    raw = body_f.read_bytes()
    text = raw.decode("utf-8", errors="replace")
    never = [k for k, v in CANARIES.items() if v in text]
    deny = [k for k, v in EXACT_DENY.items() if v in text]
    pub = [k for k, v in PUBLIC_OK.items() if v in text]
    hide = [k for k, v in HIDE_TEST.items() if v in text]
    print(f"{p:<4} {code:<4} {','.join(never) or '-':<28} {','.join(deny) or '-':<10} {','.join(pub) or '-'}")
    if never:
        failures.append((p, f"NEVER-SERVE leak: {never}"))
    if hide:
        failures.append((p, f"address-hide failure: {hide} present"))
    if p in EXPECTED_STATUS and code != EXPECTED_STATUS[p]:
        failures.append((p, f"status {code}, expected {EXPECTED_STATUS[p]}"))

print()
print("== FAILURES / LEAKS ==")
if failures:
    for p, f in failures:
        print(f"  {p}: {f}")
else:
    print("  none: zero NEVER-SERVE canaries in any anonymous response")
print()
sys.exit(1 if failures else 0)
