#!/bin/bash
cd /home/nolan/projects/ping || exit 1
F=/home/nolan/workspace/fyd-factory/qa/design-conv
echo "=== happy-place contact affordances + buttons + dead ends ==="
python3 - <<'EOF'
import json
d = json.load(open('/home/nolan/workspace/fyd-factory/qa/design-conv/analysis.json'))
hp = d['happy-place']
print("CONTACT:", json.dumps(hp['conversion_contact_affordances'], indent=1))
print("BUTTONS:", json.dumps(hp['conversion_site_region_buttons'], indent=1))
print("DEAD:", json.dumps(hp['conversion_dead_ends'], indent=1))
print("FIXED:", json.dumps(hp['conversion_fixed_or_sticky_in_site'], indent=1))
print("HERO:", json.dumps(hp['design_hero'], indent=1))
print("SVC count:", hp['conversion_services']['cards'], "obj hrefs:", len(set(hp['conversion_services']['object_hrefs'])))
print("REACHABILITY:", json.dumps(d['_reachability'], indent=1))
EOF
echo; echo "=== ask widget disabled logic ==="; grep -n "disabled" src/fyd/components/ask-fyd-widget.tsx | head
echo; echo "=== /o/ detail route check ==="
curl -s -o /tmp/o-test.html -w 'HTTP %{http_code}\n' "http://localhost:3100/o/website-business-2f1327c09d622175-service-139408827c27"
grep -o "<title>[^<]*" /tmp/o-test.html | head -2; grep -c "Plumbing" /tmp/o-test.html
