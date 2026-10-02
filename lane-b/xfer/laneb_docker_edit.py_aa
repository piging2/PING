p = "/home/nolan/ping/gateway/Dockerfile"
s = open(p).read()

old = """RUN npm install --no-save typescript @types/node && \\
    ./node_modules/.bin/tsc runtime/constitutional/src/identity-authority.ts runtime/constitutional/src/hash-authority.ts \\
      --outDir gateway/constitutional-dist --module commonjs --target es2020 \\
      --esModuleInterop --skipLibCheck --types node && \\
    npm uninstall --no-save typescript @types/node"""

new = """RUN npm install --no-save typescript @types/node && \\
    ./node_modules/.bin/tsc runtime/constitutional/src/identity-authority.ts runtime/constitutional/src/hash-authority.ts runtime/constitutional/src/ping-vocabulary.ts \\
      --outDir gateway/constitutional-dist --module commonjs --target es2020 \\
      --esModuleInterop --skipLibCheck --types node && \\
    npm uninstall --no-save typescript @types/node"""

assert old in s, "tsc compile block not found"
s = s.replace(old, new)
open(p, "w").write(s)
print("Dockerfile updated OK")
