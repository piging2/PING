#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== renderer 830-880 ==="; sed -n '830,880p' src/fyd/components/renderer.tsx
echo; echo "=== contact-link rest ==="; sed -n '80,220p' src/fyd/components/contact-link.tsx
