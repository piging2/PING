cd /home/nolan/projects/ping
echo "===== OwnerFieldCorrection full ====="
sed -n '133,168p' src/lib/ping/types.ts
echo "===== FieldVisibilityDecision ====="
grep -n "interface FieldVisibilityDecision\|type FieldVisibilityDecision" -A 15 src/fyd/sitespec/field-visibility.ts | head -25
echo "===== ObjectProvenanceKind ====="
grep -n "ObjectProvenanceKind" src/lib/ping/types.ts | head -3
