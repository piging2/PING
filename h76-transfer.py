import subprocess, sys

with open("/tmp/h76-chunks.txt") as f:
    chunks = [ln.rstrip("\n") for ln in f if ln.strip()]

BATCH = 12
batches = [chunks[i:i+BATCH] for i in range(0, len(chunks), BATCH)]
print("total chunks:", len(chunks), "batches:", len(batches), file=sys.stderr)

for bi, batch in enumerate(batches):
    lines = []
    if bi == 0:
        lines.append("rm -f /tmp/h76-patch.py")
    for c in batch:
        lines.append("echo '%s' | base64 -d >> /tmp/h76-patch.py" % c)
    script = " && ".join(lines)
    r = subprocess.run(["/home/hatch/workspace/pig/pigwsl-run.sh", script],
                       capture_output=True, text=True)
    print("batch %d/%d exit=%d" % (bi+1, len(batches), r.returncode), file=sys.stderr)
    if r.returncode != 0:
        print("STDOUT:", r.stdout[-2000:], file=sys.stderr)
        print("STDERR:", r.stderr[-2000:], file=sys.stderr)
        sys.exit(1)
print("transfer complete")
