import io
repo = "/home/nolan/ping-wave-gw2-088"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")
def show(a, b, label):
    print("=== %s (tip %d-%d) ===" % (label, a, b))
    for n in range(a, b+1):
        print(n, tip[n-1][:95])
show(62, 100, "dashboard")
show(375, 418, "queues-type+missions")
show(636, 700, "dlq")
