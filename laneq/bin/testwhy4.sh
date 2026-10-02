cd /home/nolan/projects/ping
grep -n '"test' package.json | head -10
echo "=== jest key in package.json ==="
python3 -c "import json; d=json.load(open('package.json')); print(list(d.get('jest', {}).keys()) if 'jest' in d else 'no jest key')"
echo "=== other jest configs ==="
find . -maxdepth 3 -name "jest.config*" -not -path "*/node_modules/*" 2>/dev/null
