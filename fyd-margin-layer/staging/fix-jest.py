"""Widen the FYD jest config testMatch to include the margin object-layer tests."""
import io

p = "/home/nolan/projects/ping/src/fyd/jest.config.cjs"
s = io.open(p, encoding="utf-8").read()
old = '"<rootDir>/src/fyd//__tests__/*.test.ts"'
new = (
    '"<rootDir>/src/fyd//__tests__/*.test.ts",\n'
    '    "<rootDir>/src/fyd/ui/__tests__/placement.test.ts"'
)
assert old in s, "testMatch not found"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new))
print("jest config updated")
