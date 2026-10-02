#!/bin/bash
# check schema role mapping in generator and field-visibility + unsafe URL handling
cd /home/nolan/projects/ping
echo "=== FYDSchemaRole detection ==="; grep -n "roleForSchema\|schemaRole\|FYDSchemaRole" src/fyd/proceduralize/generator.ts | head -15
echo "=== schemaRoleOf impl ==="; grep -rn "function roleForSchema\|const roleForSchema\|schemaRoleOf" src/fyd --include="*.ts" | grep -v test | head -5
echo "=== applyFieldVisibility location ==="; grep -rln "applyFieldVisibility" src --include="*.ts" | grep -v test | head -5
echo "=== PingRelationship ==="; grep -n "interface PingRelationship" src/lib/ping/types.ts; sed -n "$(grep -n 'interface PingRelationship' src/lib/ping/types.ts | cut -d: -f1),+20p" src/lib/ping/types.ts
echo "=== ObjectVisibility ==="; grep -n "type ObjectVisibility\|ObjectVisibility =" src/lib/ping/types.ts | head -3
echo "=== unsafe url handling in renderer/visibility ==="; grep -rln "javascript:\|unsafe" src/fyd/sitespec/*.ts src/fyd/object/*.ts 2>/dev/null | head -5
