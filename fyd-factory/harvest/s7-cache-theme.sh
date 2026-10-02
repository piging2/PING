#!/bin/bash
# s7: authority-loader (cache), tokens/theme, ui components, search, observability (read-only)
cd /home/nolan/projects/ping || exit 1
echo "########## authority-loader.ts head ##########"; head -80 src/lib/authority-loader.ts
echo; echo "########## motionTokens.ts head ##########"; head -50 src/motion/motionTokens.ts
echo; echo "########## ui components ##########"; ls src/components/ui/ 2>/dev/null | head -40
echo; echo "########## search impls ##########"
grep -rli --include='*.ts' --include='*.tsx' -E 'lunr|fuse|minisearch|flexsearch|algolia|typesense|elasticsearch' src/lib src/components src/services 2>/dev/null | head -10
echo "########## tracing/logger impls ##########"
grep -rli --include='*.ts' --include='*.tsx' -E 'opentelemetry|@opentelemetry|tracer|createSpan|pino|winston' src/lib src/components src/services src/app/api 2>/dev/null | grep -v fyd | head -10
echo "########## tests inventory ##########"; ls src/lib/__tests__/ src/lib/ping/__tests__/ 2>/dev/null
echo "########## globals css ##########"; ls src/app/globals.css 2>/dev/null && grep -c '\-\-' src/app/globals.css 2>/dev/null
