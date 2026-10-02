#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
cat > tests/ask-fyd/fceg-probe.mts <<'MTS'
import fc from "fast-check";
const arb = (fc as any).entityGraph(
  {
    business: { title: fc.constant("Test Business") },
    service: { title: fc.string({ minLength: 1, maxLength: 8 }) },
  },
  {
    business: { offers: { arity: "many", type: "service" } },
    service: {},
  },
  { initialPoolConstraints: { business: { minLength: 1, maxLength: 1 }, service: { maxLength: 3 } } },
);
const s = fc.sample(arb, 1)[0] as any;
console.log("keys:", Object.keys(s));
console.log("business[0]:", JSON.stringify(s.business[0]).slice(0, 300));
console.log("service count:", s.service.length);
MTS
npx tsx tests/ask-fyd/fceg-probe.mts 2>&1 | head -8
rm tests/ask-fyd/fceg-probe.mts
