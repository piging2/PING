cd /home/nolan/projects/ping
grep -n "export type FieldVisibilityPolicy" -A 3 src/fyd/sitespec/field-visibility.ts
grep -n "export type ObjectVisibility" -A 3 src/lib/ping/types.ts
grep -n "export interface ObjectProvenance" -A 12 src/lib/ping/types.ts
grep -n "export interface FYDRelationship\|export interface ObjectGraph" -A 10 src/fyd/sitespec/types.ts | head -40
