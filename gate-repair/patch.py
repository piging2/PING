import io

old = '  moduleNameMapper: {\n    "^@/(.*)$": "<rootDir>/src/$1",\n  },'
new = (
    '  moduleNameMapper: {\n'
    '    "^@/(.*)$": "<rootDir>/src/$1",\n'
    '    "\\\\.css$": "<rootDir>/src/fyd/components/__tests__/css-stub.js",\n'
    '  },'
)
for lane in ("ask", "customize", "media"):
    p = "src/fyd/%s/jest.config.cjs" % lane
    s = io.open(p, encoding="utf-8").read()
    n = s.count(old)
    assert n == 1, (p, n)
    io.open(p, "w", encoding="utf-8").write(s.replace(old, new))
    print("patched %s" % p)
