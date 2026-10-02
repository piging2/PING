cd /home/nolan/projects/ping
grep -n "export interface PingRelationship" -A 12 src/lib/ping/types.ts
sed -n "89,96p" src/lib/ping/types.ts
