#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== renderer dir ==="; ls src/fyd/components/ | head -40
echo "=== registry ==="; grep -n "data-component\|data-section\|sectionLabel\|label:" src/fyd/components/registry.ts 2>/dev/null | head -30; ls src/fyd/components/registry* 2>/dev/null
echo "=== python bs4 ==="; python3 -c "import bs4; print('bs4 OK', bs4.__version__)" 2>&1
