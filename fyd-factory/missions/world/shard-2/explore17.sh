cd /home/nolan/projects/ping
grep -n "function LinksSection\|function CTASection\|function ObjectRailSection\|\"Links\"\|\"CTA\"\|\"ObjectRail\"" src/fyd/components/renderer.tsx src/fyd/components/registry.ts | head -20
