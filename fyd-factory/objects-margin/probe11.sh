#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "##### object-overlay exports+structure #####"
grep -n "export\|function\|const.*=.*(" src/fyd/components/object-overlay.tsx | head -30
echo "##### AskObjectPanel signature #####"
grep -n "export" src/fyd/ui/ask-object-panel.tsx | head -10
echo "##### publicGraph usage in happy-place page #####"
grep -n "publicGraph\|SiteClient\|graph=" src/app/sites/happy-place/page.tsx | head -10
