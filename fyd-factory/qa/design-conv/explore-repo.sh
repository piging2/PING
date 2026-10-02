#!/bin/bash
# Explore repo layout for FYD factory: site pages, archetypes, components.
cd /home/nolan/projects/ping || exit 1
echo "=== branch ==="; git branch --show-current
echo "=== fyd dirs ==="; find src -maxdepth 3 -type d -iname "*fyd*" 2>/dev/null | head -20
echo "=== sites dirs ==="; find src -maxdepth 4 -type d -iname "*site*" 2>/dev/null | head -20
echo "=== archetype files ==="; find src -iname "*archetype*" 2>/dev/null | head -20
echo "=== app/sites routes ==="; ls src/app/sites 2>/dev/null || find src/app -maxdepth 2 -iname "*sites*" 2>/dev/null | head
