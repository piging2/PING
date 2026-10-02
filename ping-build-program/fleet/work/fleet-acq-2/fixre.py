import sys
p = "/home/hatch/workspace/ping-build-program/fleet/work/fleet-acq-2/jsonld_harness.py"
src = open(p).read()
bs = chr(92)
n1 = src.count(bs*2 + "d{2}")
src = src.replace(bs*2 + "d{2}", bs + "d{2}")
n2 = src.count(bs*2 + "d{4}")
src = src.replace(bs*2 + "d{4}", bs + "d{4}")
open(p, "w").write(src)
print("fixed", n1, n2)
