#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== buildVerifiedRenderModel (520-580) ====="
sed -n '520,580p' src/fyd/sitespec/binding-verifier.ts
echo "===== slotBindingsForVerification ====="
grep -n "slotBindingsForVerification" src/fyd/builder/planner.ts | head -5
echo "===== GeneratedPresentation type / slots ====="
grep -n "interface GeneratedPresentation\|interface PresentationSlot\|bindings" src/fyd/builder/planner.ts | head -20
echo "===== does FYDSiteSpec carry bindings? ====="
grep -n "binding" src/fyd/sitespec/types.ts | head -20
echo "===== existing audit/observe modules on sites path (convergence wave overlap check) ====="
ls src/fyd/sitespec/ src/fyd/builder/ 2>/dev/null
grep -rln "renderAudit\|claimAudit\|verifySites\|sitesAudit\|auditVerdict" src/fyd/ src/app/sites/ 2>/dev/null | head
