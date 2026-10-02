#!/bin/bash
cd /home/nolan/projects/ping
echo "##### CTA copy hunting"
grep -rn "consultation\|Consultation" src/fyd/ --include='*.ts' -l | grep -v __tests__ | head -20
echo "--- quote-style CTA"
grep -rni "get a quote\|request a quote\|get your quote" src/fyd/ --include='*.ts' | grep -v __tests__ | head -10
echo "--- CTA component copy sources"
grep -rn "ctaLabel\|cta_label\|ctaCopy" src/fyd/sitespec/types.ts | head -10
grep -rn "component:" src/fyd/proceduralize/generator.ts | sort -u | head -30
