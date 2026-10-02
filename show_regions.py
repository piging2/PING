import io
repo = "/home/nolan/ping-wave-gw2-088"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")
def show(a, b, label):
    print("=== %s (tip %d-%d) ===" % (label, a, b))
    for n in range(a, b+1):
        print(n, tip[n-1])
show(341, 352, "inbox")
show(419, 433, "trace")
show(434, 445, "knowledge")
show(481, 492, "activity")
show(527, 530, "replay-stats-head")
show(539, 540, "replay-stats-witness")
show(575, 585, "witness-stats")
show(598, 615, "replay-trace")
