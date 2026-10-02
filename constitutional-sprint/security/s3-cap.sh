cd /home/nolan/projects/ping-constitutional
echo "===== 6: capability/role elevation ====="
grep -rEn --include='*.ts' --include='*.tsx' -i "grant[A-Z]|elevat|impersonat|makeAdmin|setRole|assumeRole|sudo|superuser|root" src 2>/dev/null | grep -vi "grand|elegant" | head -50
echo "===== 5: direct DB writes (INSERT/execute/insert/write paths) ====="
grep -rEn --include='*.ts' --include='*.tsx' -i "INSERT INTO|insertMany|\.insert\(|\.execute\(|\.write\(|db\.put|store\.put|collection\.insert" src 2>/dev/null | head -60
echo "===== 5b: storage clients in use ====="
grep -rEn --include='*.ts' --include='*.tsx' -i "supabase|prisma|drizzle|qdrant|redis|kv\.|blob\." src/lib src/fyd 2>/dev/null | grep -i "from\|import\|require\|new " | head -40
