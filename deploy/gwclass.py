import os, re, ipaddress, sys
from urllib.parse import urlparse

vals = {}
v = os.environ.get("PING_GATEWAY_BASE_URL")
if v:
    vals["env:PING_GATEWAY_BASE_URL"] = v
for f in [".env.local", ".env"]:
    if os.path.exists(f):
        for line in open(f):
            m = re.match(r"\s*(PING_GATEWAY_BASE_URL|FYD_PING_GATEWAY_BASE_URL|FYD_CUSTOMIZE_GATEWAY_URL)\s*=\s*(.*)", line)
            if m:
                vals[f + ":" + m.group(1)] = m.group(2).strip().strip("\"'")

def classify(url):
    try:
        h = (urlparse(url).hostname or "").lower()
    except Exception:
        return "UNPARSEABLE"
    if not h:
        return "EMPTY_HOST"
    if h == "localhost":
        return "LOCALHOST"
    try:
        ip = ipaddress.ip_address(h)
        if ip.is_loopback:
            return "LOOPBACK"
        if ip.is_private:
            return "PRIVATE_RFC1918"
        return "PUBLIC_IP"
    except ValueError:
        pass
    if h.endswith(".local") or h.endswith(".internal") or h.endswith(".ts.net") or h.endswith(".tailscale"):
        return "PRIVATE_DNS"
    return "PUBLIC_DNS_CANDIDATE"

if not vals:
    print("RESULT: PING_GATEWAY_BASE_URL not set in env/.env.local/.env")
else:
    for src, val in vals.items():
        u = urlparse(val)
        print("RESULT src=%s class=%s scheme=%s" % (src, classify(val), u.scheme or "?"))
