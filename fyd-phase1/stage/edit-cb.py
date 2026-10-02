p = "/home/nolan/projects/ping/src/fyd/media/circle-background.ts"
s = open(p).read()
a = 'const GRADIENT_BASIS = "Deterministic fallback, no authorized site media";'
b = "export " + a
assert s.count(a) == 1, "GRADIENT_BASIS anchor"
s = s.replace(a, b)
c = "function gradientFor(objectId: string): { css: string; digest: string } {"
d = "export " + c
assert s.count(c) == 1, "gradientFor anchor"
s = s.replace(c, d)
open(p, "w").write(s)
print("edited ok")
