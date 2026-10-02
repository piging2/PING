#!/usr/bin/env python3
"""F7-B collateral repair (continued): gateway/constitution_version_authority.js
has the same latent constructor-order bug and a load-time singleton, so it
throws on require under the F7/D1 fail-closed boundary."""
import sys
p = '/home/nolan/worktrees/constitutional-convergence/gateway/constitution_version_authority.js'
old = """    this._authorityId = this._generateAuthorityId();
    this._authorityVersion = '5.0.0';"""
new = """    // F7-B repair: version must be assigned before _generateAuthorityId() -
    // its preimage includes the version. The old lenient serializer
    // silently hashed an undefined version; the F7/D1 fail-closed
    // boundary exposed this latent bug.
    this._authorityVersion = '5.0.0';
    this._authorityId = this._generateAuthorityId();"""
src = open(p).read()
assert src.count(old) == 1, f'anchor matched {src.count(old)}x'
open(p, 'w').write(src.replace(old, new))
print('OK: constitution_version_authority: version before _generateAuthorityId')
