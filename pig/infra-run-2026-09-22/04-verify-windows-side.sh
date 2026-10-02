echo "=== pre-existing FYD-Tailscale-3100 rule detail ==="
netsh.exe advfirewall firewall show rule name="FYD-Tailscale-3100" < /dev/null
echo "=== Windows-side HTTP checks via Tailscale IP ==="
for p in "/" "/sites/happy-place" "/objects"; do
  code=$(curl.exe -s -o NUL -w "%{http_code}" --max-time 15 "http://100.79.154.43:3100$p" < /dev/null 2>&1 | tr -d '\r\n')
  echo "$p -> $code"
done
