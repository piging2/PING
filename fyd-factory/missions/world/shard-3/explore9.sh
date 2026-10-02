#!/bin/bash
cd /home/nolan/projects/ping
echo "=== contact-link.ts ==="; grep -n "resolveSafeLink\|non_navigable\|render" src/fyd/components/contact-link.tsx | head -20
echo "=== projection-seam-attack test expectation ==="; grep -n "javascript\|non_navigable\|href" src/fyd/boundary/__tests__/projection-seam-attack.test.ts | head -20
