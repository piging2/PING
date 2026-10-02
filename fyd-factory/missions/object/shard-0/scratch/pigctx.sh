cd /home/nolan/projects/ping
echo "--- imports (1-40 tail) ---"; sed -n 33,40p src/fyd/components/object-rail.tsx
echo "--- hunk1 context ---"; sed -n 88,96p src/fyd/components/object-rail.tsx
echo "--- hunk2 context ---"; sed -n 276,284p src/fyd/components/object-rail.tsx
echo "--- git status of file ---"; git status --short src/fyd/components/object-rail.tsx; git diff --stat src/fyd/components/object-rail.tsx | tail -1
