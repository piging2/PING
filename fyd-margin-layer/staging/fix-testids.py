"""Add data-testid hooks to the margin object-layer card renders."""
import io

p = "/home/nolan/projects/ping/src/fyd/ui/object-layer/ObjectCircle.tsx"
s = io.open(p, encoding="utf-8").read()

# 1. MarginObject expanded overlay card.
old1 = """        <motion.div
          role="group"
          aria-label={`${name}: follow, like, website actions`}
          onClick={handleCardBackground}"""
new1 = """        <motion.div
          data-testid="object-circle-card"
          role="group"
          aria-label={`${name}: follow, like, website actions`}
          onClick={handleCardBackground}"""
assert old1 in s, "margin card not found"
s = s.replace(old1, new1)

# 2. Cluster member card.
old2 = """    <motion.div
      ref={cardRef}
      role="group"
      aria-label={`${descriptor.name}: follow, like, website actions`}"""
new2 = """    <motion.div
      data-testid="object-circle-card"
      ref={cardRef}
      role="group"
      aria-label={`${descriptor.name}: follow, like, website actions`}"""
assert old2 in s, "cluster member card not found"
s = s.replace(old2, new2)

# 3. Static (mobile sheet) card.
old3 = """    <div
      role="group"
      aria-label={`${descriptor.name}: follow, like, website actions`}
      className="mx-auto overflow-hidden rounded-full bg-neutral-900\""""
new3 = """    <div
      data-testid="object-card-static"
      role="group"
      aria-label={`${descriptor.name}: follow, like, website actions`}
      className="mx-auto overflow-hidden rounded-full bg-neutral-900\""""
assert old3 in s, "static card not found"
s = s.replace(old3, new3)

io.open(p, "w", encoding="utf-8").write(s)
print("testids added")
