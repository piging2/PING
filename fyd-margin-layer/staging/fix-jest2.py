"""Repair the FYD lane jest config so the margin placement tests can run.

Pre-existing bugs fixed:
- rootDir was "../../.." (one level above the repo); corrected to "../..".
- moduleNameMapper dropped the "@/" capture ("<rootDir>/src/" with no $1).
"""
import io

p = "/home/nolan/projects/ping/src/fyd/jest.config.cjs"
s = io.open(p, encoding="utf-8").read()

old_root = 'rootDir: "../../.."'
new_root = 'rootDir: "../.."'
assert old_root in s, "rootDir not found"
s = s.replace(old_root, new_root)

old_map = '"^@/(.*)$": "<rootDir>/src/"'
new_map = '"^@/(.*)$": "<rootDir>/src/$1"'
assert old_map in s, "moduleNameMapper not found"
s = s.replace(old_map, new_map)

io.open(p, "w", encoding="utf-8").write(s)
print("jest config repaired")
