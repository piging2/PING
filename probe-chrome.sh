HOSTIP=$(grep nameserver /etc/resolv.conf | head -1 | awk '{print $2}')
echo "windows host ip: $HOSTIP"
curl -s -m 5 http://$HOSTIP:9333/json/version | head -c 300; echo
echo "---"
# also check what the windows chrome logged
tail -5 /mnt/c/Users/nolan/transfer/chrome-debug.log 2>/dev/null
ps aux | grep -c "[c]hrome.exe.*9333"
