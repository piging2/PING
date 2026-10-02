#!/bin/bash
# Re-probe codex after the ChatGPT-plan quota reset (~3:33 PM MDT 2026-09-28).
# Deliberately re-enable ONLY on a clean PROBE_OK. Never re-enable on failure.
# Owner order (2026-09-28): unblock codex when it is actually healthy; the block
# was only ever a quota guard, not a security measure.
set -u
export CODEX_HOME=/mnt/c/Users/nolan/.codex
CODEX=$(find /mnt/c/Users/nolan/.codex/bin/wsl -maxdepth 2 -name codex -type f 2>/dev/null | head -1)
if [ -z "$CODEX" ]; then echo "CODEX_STILL_BLOCKED reason=no_binary"; exit 0; fi
OUT=$(timeout 100 "$CODEX" exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check -C /tmp "Reply with exactly the single word PROBE_OK and nothing else." 2>&1)
if echo "$OUT" | grep -qx "PROBE_OK" && ! echo "$OUT" | grep -qi "usage limit"; then
  echo "probe passed, re-enabling deliberately"
  python3 << 'PYEOF'
import io
p = '/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js'
s = io.open(p, encoding='utf-8').read()
old_block = "    blockedExternal: { reason: 'ChatGPT plan usage exhausted (observed 2026-09-16). Re-blocked 2026-09-28 per owner: expiry is ELIGIBLE FOR RE-EVALUATION, not AUTHORIZED FOR WORK. Re-enable only by deliberate decision, never by timestamp.' },"
new_block = "    // Re-enabled 2026-09-28 per owner after live probe returned PROBE_OK (quota restored).\n    // Deliberate decision, not timestamp expiry. Re-block by restoring blockedExternal."
assert s.count(old_block) == 1, "blockedExternal line not found exactly once"
s = s.replace(old_block, new_block)
old_c = "    // Re-blocked 2026-09-28 per owner: the 2026-09-17 deadline lapsed but expiry\n    // is not authorization. No timestamp may silently re-enable this agent."
new_c = "    // Was BLOCKED_EXTERNAL 2026-09-16 (ChatGPT plan usage limit); re-blocked 2026-09-28\n    // per owner after timer lapse; deliberately re-enabled 2026-09-28 after live probe\n    // confirmed the quota was restored."
assert s.count(old_c) == 1, "comment block not found exactly once"
s = s.replace(old_c, new_c)
io.open(p, 'w', encoding='utf-8').write(s)
print("re-enable edit applied")
PYEOF
  node --check /home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js && echo "SYNTAX OK"
  node -e "
const m = require('/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js');
const r = m.authorizeWorkOrder({ agentId: 'codex', capability: 'text.summarize', namespace: 'tenant::t1', constraints: { read_only: true, no_writes: true, no_network: true, no_canonical_events: true, no_mission_state_writes: true } });
console.log('codex granted:', r.granted);
if (!r.granted) { console.error('RE-ENABLE FAILED'); process.exit(1); }
"
  echo "CODEX_REENABLED"
else
  echo "CODEX_STILL_BLOCKED"
  echo "$OUT" | grep -i -m2 "usage limit" | head -2
fi
