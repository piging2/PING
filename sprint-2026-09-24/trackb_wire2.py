#!/usr/bin/env python3
import sys
P = "/home/nolan/projects/ping/src/app/api/fyd/objects/[objectId]/overrides/owner-context.ts"
src = open(P).read()
old = "    const actor: DemoActor = { id: this.actor.id, label: this.actor.label };"
new = "    const actor: DemoActor = { id: this.actor.actorId, label: this.actor.label };"
assert src.count(old) == 1, f"anchor: {src.count(old)}"
open(P, "w").write(src.replace(old, new, 1))
print("actorId fixed")
