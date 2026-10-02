#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== FYDSpecProvenance ====="
grep -n "interface FYDSpecProvenance" -A 20 src/fyd/sitespec/types.ts
echo "===== EvidenceState values ====="
sed -n '10,40p' src/fyd/ui/evidence-state.tsx
echo "===== FYD-DECISIONS search ====="
grep -rln "FYD-DECISIONS" --include="*.md" . 2>/dev/null | grep -v node_modules | head
find . -maxdepth 4 -iname "*DECISION*" -not -path "./node_modules/*" 2>/dev/null | head
echo "===== renderer: what fields do Hero/Services/Contact read ====="
grep -n "function HeroSection\|function ServicesSection\|function ContactSection\|function BusinessSummarySection\|function LocationsSection" src/fyd/components/renderer.tsx
echo "===== ContactMethod / ClaimEvidence type ====="
grep -n "interface ClaimEvidence\|interface ContactMethod" -A 25 src/fyd/object/object-projection.ts | head -70
