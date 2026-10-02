"""LANE B (SEC): redact generated key material from ExteriorAuthMiddleware logs.

The ERA-R production mechanism prints generated API keys in plaintext to
stdout at two seed sites. The ERA-C port must not preserve that behavior
("never expose secret values"). This is a deliberate, documented divergence
from the byte-identical port; everything else stays identical.

Run on the Pig: python3 /tmp/patch_mw_logging.py
"""
import hashlib
import sys

P = "/home/nolan/worktrees/constitutional-convergence/gateway/exterior_auth_middleware.js"
src = open(P).read()

old = """    if (source === 'generated') {
      console.log('[ExteriorAuthMiddleware] Muse Level 1 API key:', museKey);
      console.log('[ExteriorAuthMiddleware] Muse Level 2 API key:', museLevel2Key);
    } else {"""

new = """    if (source === 'generated') {
      // LANE B (SEC): never log generated key material. Retrieve credentials
      // from the credential store (exterior_agent_credentials table or the
      // in-memory map), never from logs.
      console.log('[ExteriorAuthMiddleware] Generated credentials stored for agent_ids: muse, muse-level-2 (key material not logged)');
    } else {"""

n = src.count(old)
if n != 2:
    print(f"ABORT: expected 2 occurrences, found {n} -- file unchanged")
    sys.exit(1)
src = src.replace(old, new)
open(P, "w").write(src)
print("patched OK, md5:", hashlib.md5(src.encode()).hexdigest())
