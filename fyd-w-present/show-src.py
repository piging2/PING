import sys
sys.path.insert(0, "/home/hatch/workspace/fyd-w-present")
lines = open("/home/nolan/projects/ping/src/fyd/data/ping-object-source.ts").read().splitlines()
for i, l in enumerate(lines[140:230], start=141):
    print(i, l)
