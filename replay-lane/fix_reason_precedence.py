#!/usr/bin/env python3
"""Fix verdict reason precedence: a typed provider failure status
(era_mismatch, identity_space_mixed, conversion_failed, no_events,
kernel_error) must surface as the reason; 'incomplete_input_set' applies
only when the provider reached 'ok' over an INCOMPLETE window."""
import io, sys

PATH = '/home/nolan/worktrees/constitutional-convergence/ping-runtime/workers/canonical_workers.js'
with io.open(PATH, 'r', encoding='utf-8') as f:
    src = f.read()

old = "      reason: isVerified ? 'kernel_verified' : (incomplete ? 'incomplete_input_set' : (kernelResult.status || 'kernel_failed')),\n"
new = "      reason: isVerified ? 'kernel_verified'\n        : (kernelResult.status && kernelResult.status !== 'ok' ? kernelResult.status\n          : (incomplete ? 'incomplete_input_set' : 'kernel_failed')),\n"

count = src.count(old)
if count != 1:
    sys.stderr.write('MISMATCH: found %d (need 1)\n' % count)
    sys.exit(1)
src = src.replace(old, new, 1)
with io.open(PATH, 'w', encoding='utf-8') as f:
    f.write(src)
print('applied reason precedence fix')
