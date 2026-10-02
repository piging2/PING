cd /home/nolan/projects/ping
echo "===== dump.py search ====="
find . -name "dump*.py" -not -path "*/node_modules/*" 2>/dev/null | head
echo ""
echo "===== overlay validation in dump ====="
grep -rln "FYD_SITE_OVERLAY" --include="*.py" . 2>/dev/null | grep -v node_modules | head
