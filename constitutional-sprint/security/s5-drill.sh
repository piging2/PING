cd /home/nolan/projects/ping-constitutional
echo "===== D1: slot-registry.ts dev bypass ====="
sed -n '1,80p' src/lib/slot-registry.ts
echo "===== D2: owner-mode gate.ts ====="
cat src/fyd/owner-mode/gate.ts
echo "===== D3: owner-mode capability.ts (head) ====="
sed -n '1,110p' src/fyd/owner-mode/capability.ts
echo "===== D4: assignment-store CREDENTIAL_INVESTIGATION log ====="
sed -n '150,200p' src/lib/assignment-store.ts
echo "===== D5: effective-project-gallery KV_CREDENTIALS log ====="
sed -n '195,235p' src/lib/effective-project-gallery.ts
echo "===== D6: auth-manager hasRefreshToken log ====="
sed -n '230,270p' src/lib/infrastructure/auth-manager.ts
