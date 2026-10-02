cd /home/nolan/projects/ping && sed -n 100,175p src/fyd/sitespec/graph.ts; echo ===; grep -rn "export function resolveBoundField" src/fyd --include=*.ts | grep -v __tests__
