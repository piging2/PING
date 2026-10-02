p = "src/fyd/object/commands.ts"
s = open(p).read()

old = """  if (
    lower.match(
      /^(?:hide|make\\s+private|remove)\\s+(?:the\\s+)?(?:business\\s+)?address$/,
    )
  ) {"""
new = """  if (
    lower.match(
      /^(?:hide|remove)\\s+(?:the\\s+)?(?:business\\s+)?address$|^make\\s+(?:the\\s+)?(?:business\\s+)?address\\s+private$|^make\\s+private\\s+(?:the\\s+)?(?:business\\s+)?address$/,
    )
  ) {"""
assert old in s, "hide pattern"
s = s.replace(old, new)

old = """  if (
    lower.match(
      /^(?:show|make\\s+public|display|publish)\\s+(?:the\\s+)?(?:business\\s+)?address$/,
    )
  ) {"""
new = """  if (
    lower.match(
      /^(?:show|display|publish)\\s+(?:the\\s+)?(?:business\\s+)?address$|^make\\s+(?:the\\s+)?(?:business\\s+)?address\\s+public$|^make\\s+public\\s+(?:the\\s+)?(?:business\\s+)?address$/,
    )
  ) {"""
assert old in s, "show pattern"
s = s.replace(old, new)

open(p, "w").write(s)
print("address patterns accept both word orders")
