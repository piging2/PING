cd /home/nolan/projects/ping
grep -n "SCHEMA_ROLES\s*[:=]" -A 25 src/fyd/sitespec/schemas.ts | head -40
echo === PingObject ===
grep -n "export interface PingObject" -A 30 src/lib/ping/types.ts | head -45
echo === FieldVisibilityDecision ===
grep -n "export type FieldVisibilityDecision\|export interface FieldVisibilityDecision" -A 12 src/fyd/sitespec/field-visibility.ts | head -30
echo === tsconfig paths ===
grep -n "\"paths\"" -A 8 tsconfig.json
