#!/usr/bin/env python3
"""Rebuild the Lane F distribution snapshot to mirror the deploy layout:
  - git archive of a9cad2663 (candidate source, byte-exact)
  - repo .dockerignore applied (what `docker build` would send as context)
  - gateway/package*.json copied to snapshot root + `npm ci --only=production`
    (mirrors Dockerfile.gateway: COPY gateway/package*.json ./ ; RUN npm ci)
"""
import os, shutil, subprocess, fnmatch, sys

SNAP = "/tmp/lanef/snap"
R = "/home/nolan/worktrees/constitutional-convergence"
SHA = "a9cad266353679a90e54b318100efb8153ea988e"

if os.path.exists(SNAP):
    shutil.rmtree(SNAP)
os.makedirs(SNAP)

# 1. git archive
p1 = subprocess.run(["git", "archive", SHA], cwd=R, capture_output=True)
if p1.returncode != 0:
    print("git archive failed", file=sys.stderr); sys.exit(2)
p2 = subprocess.run(["tar", "-x", "-C", SNAP], input=p1.stdout, capture_output=True)
if p2.returncode != 0:
    print("tar extract failed", p2.stderr.decode()[-500:], file=sys.stderr); sys.exit(2)
print("archive files:", sum(len(fs) for _, _, fs in os.walk(SNAP)))

# 2. .dockerignore
raw = [l.strip() for l in open(os.path.join(R, ".dockerignore")).read().splitlines()
       if l.strip() and not l.strip().startswith("#")]

def match_result(rel, is_dir, pat):
    neg = pat.startswith("!")
    p = pat[1:] if neg else pat
    dir_only = p.endswith("/")
    p = p.rstrip("/")
    if "/" not in p:
        hit = fnmatch.fnmatch(os.path.basename(rel), p)
    elif p.startswith("**/"):
        sub = p[3:]
        hit = fnmatch.fnmatch(rel, p) or ("/" not in sub and fnmatch.fnmatch(os.path.basename(rel), sub)) or fnmatch.fnmatch(rel, "**/" + sub)
    else:
        hit = fnmatch.fnmatch(rel, p) or fnmatch.fnmatch(rel, p + "/*")
    if hit and dir_only and not is_dir:
        hit = False
    return (not neg) if hit else None

def excluded(rel, is_dir):
    verdict = None
    for pat in raw:
        m = match_result(rel, is_dir, pat)
        if m is not None:
            verdict = m
    return verdict is True

removed_files, removed_dirs = 0, 0
for dirpath, dirnames, filenames in os.walk(SNAP, topdown=True):
    rel_dir = os.path.relpath(dirpath, SNAP)
    for d in sorted(dirnames):
        rel = d if rel_dir == "." else rel_dir + "/" + d
        if excluded(rel, True):
            shutil.rmtree(os.path.join(dirpath, d))
            removed_dirs += 1
    dirnames[:] = [d for d in dirnames
                   if not excluded(d if rel_dir == "." else rel_dir + "/" + d, True)]
    for f in filenames:
        rel = f if rel_dir == "." else rel_dir + "/" + f
        if excluded(rel, False):
            os.remove(os.path.join(dirpath, f))
            removed_files += 1
print("dockerignore: removed files:", removed_files, "dirs:", removed_dirs)
print("snapshot files after exclusions:", sum(len(fs) for _, _, fs in os.walk(SNAP)))

# 3. deploy /app layout: gateway/package*.json -> snapshot root, npm ci --only=production
shutil.copy(os.path.join(R, "gateway/package.json"), os.path.join(SNAP, "package.json"))
shutil.copy(os.path.join(R, "gateway/package-lock.json"), os.path.join(SNAP, "package-lock.json"))
r = subprocess.run(["npm", "ci", "--only=production", "--no-audit", "--no-fund"],
                   cwd=SNAP, capture_output=True, text=True)
print(r.stdout.strip().splitlines()[-1:] )
if r.returncode != 0:
    print("npm ci failed:", r.stderr[-2000:], file=sys.stderr); sys.exit(2)
print("snapshot node_modules at root:", os.path.isdir(os.path.join(SNAP, "node_modules")))
print("SNAPSHOT_REBUILT")
