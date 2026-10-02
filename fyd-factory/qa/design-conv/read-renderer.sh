#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== renderer data attrs ==="; grep -n "data-\|aria-label\|role=" src/fyd/components/renderer.tsx | head -40
echo "=== contact-link ==="; cat src/fyd/components/contact-link.tsx | head -80
