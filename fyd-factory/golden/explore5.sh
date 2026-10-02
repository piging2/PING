#!/bin/bash
mkdir -p /home/hatch/workspace/fyd-factory/golden/evidence
rm -f /tmp/hpp-vercel.html
# Candidate A: vercel deployment HTML
curl -s --max-time 30 https://happy-place-platform.vercel.app/ -o /home/hatch/workspace/fyd-factory/golden/evidence/vercel-home.html -w "vercel: HTTP %{http_code}, %{size_download} bytes\n"
# Candidate B: Pig dev-server FYD clone HTML
curl -s --max-time 60 http://localhost:3100/sites/happy-place -o /home/hatch/workspace/fyd-factory/golden/evidence/pig-route-home.html -w "pig-route: HTTP %{http_code}, %{size_download} bytes\n"
echo "=== vercel: title + h1/h2 outline ==="
grep -o "<title>[^<]*</title>" /home/hatch/workspace/fyd-factory/golden/evidence/vercel-home.html | head -2
python3 - <<'EOF'
import re, html
for name in ["vercel-home.html","pig-route-home.html"]:
    p = f"/home/hatch/workspace/fyd-factory/golden/evidence/{name}"
    s = open(p, encoding="utf-8", errors="replace").read()
    print(f"--- {name} ---")
    print("title:", html.unescape(re.search(r"<title>(.*?)</title>", s, re.S).group(1)) if re.search(r"<title>(.*?)</title>", s, re.S) else "no title")
    for tag in ["h1","h2"]:
        heads = [html.unescape(re.sub(r"<[^>]+>","",h)).strip()[:80] for h in re.findall(rf"<{tag}[^>]*>(.*?)</{tag}>", s, re.S)]
        print(tag, "count:", len(heads))
        for h in heads[:14]: print("   ", h)
    print("generator meta:", re.findall(r'<meta name="generator"[^>]*>', s)[:1])
    print("nextjs data:", "self.__next_f" in s, "| __NEXT_DATA__" in s)
EOF
