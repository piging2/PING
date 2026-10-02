import subprocess, os

DRAFT = os.path.expanduser("~/workspace/tenanos-wave/swarm-17/src-draft")
OUT = os.path.expanduser("~/workspace/tenanos-wave/diffs/P-20260923-002.diff")
# (local relative path, repo-relative path)
FILES = [("tenanos/budgets.ts", "src/tenanos/budgets.ts"),
         ("tenanos/__tests__/budgets.test.ts", "src/tenanos/__tests__/budgets.test.ts")]

parts = []
for local_rel, rel in FILES:
    local = os.path.join(DRAFT, local_rel)
    with open(local, "rb") as f:
        data = f.read()
    text = data.decode("utf-8")
    assert data.endswith(b"\n"), f"missing trailing newline: {rel}"
    for i, line in enumerate(text.split("\n")[:-1], 1):
        assert not line.endswith(" ") and not line.endswith("\t"), f"trailing ws {rel}:{i}"
    h = subprocess.run(["git", "hash-object", local], capture_output=True, text=True).stdout.strip()
    n = text.count("\n")
    parts.append(f"diff --git a/{rel} b/{rel}")
    parts.append("new file mode 100644")
    parts.append(f"index 0000000..{h}")
    parts.append("--- /dev/null")
    parts.append(f"+++ b/{rel}")
    parts.append(f"@@ -0,0 +1,{n} @@")
    for line in text.split("\n")[:-1]:
        parts.append("+" + line)

with open(OUT, "w") as f:
    f.write("\n".join(parts) + "\n")
print("wrote", OUT, os.path.getsize(OUT), "bytes")

scratch = os.path.expanduser("~/workspace/tenanos-wave/swarm-17/.applycheck")
os.makedirs(scratch, exist_ok=True)
r = subprocess.run(["git", "apply", "--check", OUT], cwd=scratch, capture_output=True, text=True)
print("apply --check rc:", r.returncode)
print(r.stderr[:2000] if r.returncode else "clean")
