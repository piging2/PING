#!/usr/bin/env python3
import re, sys
files = ['runtime/kernel/authorities/capability_scheduler.js',
 'runtime/kernel/authorities/witness_authority.js',
 'ping-runtime/agents/agent_memory_authority.js',
 'ping-runtime/agents/distributed_desktop_agents.js',
 'ping-runtime/authorities/workflow_identity_authority.js',
 'gateway/prompt_authority.js',
 'gateway/control_center_subscription.js',
 'gateway/automatic_mission_generator.js',
 'gateway/memory_vector_store_authority.js',
 'gateway/semantic_authority.js',
 'runtime/kernel/authorities/identity_authority.js']
for f in files:
    src = open(f).read()
    m = re.search(r'_generateAuthorityId\(\) \{(.*?)\n  \}', src, re.S)
    body = m.group(1) if m else ''
    refs = sorted(set(re.findall(r'this\.(_\w+)', body)))
    cm = re.search(r'constructor\(.*?\) \{(.*?)\n  \}', src, re.S)
    order_issue = []
    if cm:
        ctor = cm.group(0)
        gen_pos = ctor.find('this._authorityId = this._generateAuthorityId()')
        for r in refs:
            apos = ctor.find(r + ' =')
            if apos != -1 and gen_pos != -1 and apos > gen_pos:
                order_issue.append(r)
    hashes = ('CanonicalAuthority.hash' in body) or ('CanonicalBytes.serialize' in body)
    print(f)
    print('   this-refs:', refs, '| assigned-after-gen:', order_issue, '| hashes:', hashes)
