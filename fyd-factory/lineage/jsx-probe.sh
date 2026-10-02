#!/bin/bash
cd /home/nolan/projects/ping || exit 1
mkdir -p src/fyd/lineage
cat > src/fyd/lineage/jsx-probe.tsx <<'TSEOF'
export function Probe() { return <div>hi</div>; }
console.log("probe loaded");
TSEOF
echo "--- with tracer tsconfig ---"
npx tsx --tsconfig /home/nolan/projects/ping/src/fyd/lineage/tsconfig.tracer.json src/fyd/lineage/jsx-probe.tsx 2>&1 | head -5
echo "--- tsconfig content ---"
cat src/fyd/lineage/tsconfig.tracer.json
echo "--- root jsx setting ---"
python3 -c "import json; d=json.load(open('tsconfig.json')); print(d['compilerOptions'].get('jsx'))"
