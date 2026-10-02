import io, subprocess
repo = "/home/nolan/ping-wave-gw2-088"
# 1. generate diff from pristine to regenerated
subprocess.run(["cp", "gateway/routes/mission_control.js", "088-dbg/pristine.js"], cwd=repo, check=True)
subprocess.run(["cp", "088-dbg/mission_control.p03.js", "gateway/routes/mission_control.js"], cwd=repo, check=True)
r = subprocess.run(["git", "diff", "--", "gateway/routes/mission_control.js"], cwd=repo,
                   capture_output=True, text=True)
io.open(repo + "/088-fixed/patch-03-mc-routes-tenant-gate.diff", "w", encoding="utf-8").write(r.stdout)
print("new patch-03 lines:", len(r.stdout.splitlines()))
# restore pristine
subprocess.run(["cp", "088-dbg/pristine.js", "gateway/routes/mission_control.js"], cwd=repo, check=True)
print("restored pristine:", subprocess.run(["git", "status", "--short", "--", "gateway/routes/mission_control.js"],
      cwd=repo, capture_output=True, text=True).stdout.strip() == "")
# 2. verify it applies
r2 = subprocess.run(["git", "apply", "--check", "088-fixed/patch-03-mc-routes-tenant-gate.diff"],
                    cwd=repo, capture_output=True, text=True)
print("apply --check rc:", r2.returncode, r2.stderr.strip()[:100])
