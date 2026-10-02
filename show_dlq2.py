import io
repo = "/home/nolan/ping-wave-gw2-088"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")
for n in range(670, 730):
    print(n, tip[n-1][:95])
print("total lines:", len(tip))
