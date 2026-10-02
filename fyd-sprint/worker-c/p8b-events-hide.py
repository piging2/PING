p = "src/fyd/object/owner-events.ts"
s = open(p).read()

old = """        if (e.target === ADDRESS_TARGET) {
          o.addressVisibility = "hidden";
        } else if (e.target.startsWith("service:")) {"""
new = """        if (e.target === ADDRESS_TARGET) {
          o.addressVisibility = "hidden";
          // Persistent HIDE assertion carrying the full OwnerAssertion
          // contract: the pipeline never owns the presentation decision.
          const priorHide = o.addressVisibilityAssertion;
          o.addressVisibilityAssertion = {
            subject: e.objectId,
            path: ADDRESS_TARGET,
            operation: "hide",
            value: "hidden",
            visibility: "hidden",
            actor: { kind: e.actor.kind, label: e.actor.label },
            at: e.at,
            supersedes: priorHide?.eventId ?? null,
            evidence: {
              kind: e.evidence.kind,
              ref: e.evidence.ref,
              detail: e.evidence.detail,
            },
            eventId: e.id,
          };
        } else if (e.target.startsWith("service:")) {"""
assert old in s, "hide projection"
s = s.replace(old, new)

open(p, "w").write(s)
print("hide assertion patched")
