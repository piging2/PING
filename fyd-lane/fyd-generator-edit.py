"""Add FYD_SITE_OVERLAY to the PING event generator's Phase 3 production list.
Runs ON THE PIG (target: /home/nolan/ping). Idempotent: no-op if already present.
"""
import sys

Q = chr(39)  # single quote, avoids shell-quoting hazards in transit
GEN = "/home/nolan/ping/gateway/generated/event_generator.js"

src = open(GEN, encoding="utf-8").read()
if "FYD_SITE_OVERLAY" in src:
    print("ALREADY-PRESENT")
    sys.exit(0)

anchor = "{ event_type: " + Q + "AI_RESPONSE_REJECTED" + Q + ", authority_owner: " + Q + "KnowledgePromoter" + Q + ", event_class: " + Q + "observation" + Q + " },"
assert src.count(anchor) == 1, "anchor count=%d" % src.count(anchor)

addition = anchor + """
      // FYD site overlay (2026-09-21): an owner-correction / site-customization patch
      // for a compiled FYD site projection. Emitted by
      // tools/fyd-site-projection/emit-overlay.py, consumed by
      // tools/fyd-site-projection/dump.py. Registered for repo-booted (demo/dev)
      // gateways; the 8080 deployment image carries its own baked registry and is
      // owned by the deployment lane.
      { event_type: """ + Q + "FYD_SITE_OVERLAY" + Q + ", authority_owner: " + Q + "FydSiteAuthority" + Q + ", event_class: " + Q + "business" + Q + " },"
open(GEN, "w", encoding="utf-8").write(src.replace(anchor, addition))
print("EDIT-OK")
