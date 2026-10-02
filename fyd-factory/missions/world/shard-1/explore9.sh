cd /home/nolan/projects/ping
sed -n '1,40p' src/fyd/jest.config.cjs
echo "===== window/document refs in renderer chain (top-level) ====="
grep -n "typeof window\|globalThis.window" src/fyd/components/renderer.tsx | head -5
