#!/usr/bin/env python3
"""F7-B collateral repair: constructor reorder for authorities whose
_generateAuthorityId() preimage includes a version field assigned AFTER the
_generateAuthorityId() call. Under the F7/D1 fail-closed boundary the old
'undefined version silently coerced' behavior now throws, so these classes
cannot be instantiated. The reorder is minimal and reversible.
Aborts without writing if any anchor fails."""
import sys

ROOT = '/home/nolan/worktrees/constitutional-convergence'
REPAIR_NOTE = ("    // F7-B repair: version must be assigned before _generateAuthorityId() -\n"
               "    // its preimage includes the version. The old lenient serializer\n"
               "    // silently hashed an undefined version; the F7/D1 fail-closed\n"
               "    // boundary exposed this latent bug.\n")

def replace_once(path, old, new, label):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    n = text.count(old)
    if n != 1:
        print(f'ABORT: anchor "{label}" matched {n}x (expected 1) in {path}')
        sys.exit(1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text.replace(old, new))
    print(f'OK: {label}')

# 1. identity_authority.js (proven crasher; in F7 scope)
p = ROOT + '/runtime/kernel/authorities/identity_authority.js'
replace_once(p,
"""    // Removed serializer reference - use CanonicalAuthority directly
    this._authorityId = this._generateAuthorityId();
    // F7/D2: V2 identity domain. The version is inside the hash preimage
    // (see generateId), so V2 IDs are domain-separated from V1. Era H (stored
    // 64-hex IDs) and V1 (zero persisted rows) are never rewritten.
    this._identityVersion = '2.0.0';""",
"""    // Removed serializer reference - use CanonicalAuthority directly
    // F7/D2: V2 identity domain. The version is inside the hash preimage
    // (see generateId), so V2 IDs are domain-separated from V1. Era H (stored
    // 64-hex IDs) and V1 (zero persisted rows) are never rewritten.
""" + REPAIR_NOTE + """    this._identityVersion = '2.0.0';
    this._authorityId = this._generateAuthorityId();""",
    'identity_authority: version before _generateAuthorityId')

# 2-5. same latent pattern, same fix (all route through the kernel canonical path)
for p, label in [
    (ROOT + '/runtime/kernel/authorities/capability_scheduler.js', 'capability_scheduler'),
    (ROOT + '/ping-runtime/agents/agent_memory_authority.js', 'agent_memory_authority'),
    (ROOT + '/ping-runtime/agents/distributed_desktop_agents.js', 'distributed_desktop_agents'),
    (ROOT + '/gateway/automatic_mission_generator.js', 'automatic_mission_generator'),
]:
    replace_once(p,
"""    this._authorityId = this._generateAuthorityId();
    this._authorityVersion = '36.0.0';""",
REPAIR_NOTE + """    this._authorityVersion = '36.0.0';
    this._authorityId = this._generateAuthorityId();""",
        label + ': version before _generateAuthorityId')

print('ALL COLLATERAL REPAIRS APPLIED')
