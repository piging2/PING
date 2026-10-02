p = "src/fyd/object/commands.ts"
s = open(p).read()

old = """  if ((m = lower.match(/^(hide|show)\\s+(.+)$/))) {
    const id = findServiceId(m[2], names);
    if (!id) return null;
    const visible = m[1] === "show";
    return {
      command: { type: "set-service-visibility", id, visible },
      summary: visible
        ? `Show ${names.get(id)} on the public page.`
        : `Hide ${names.get(id)} from the public page.`,
    };
  }"""
new = """  if ((m = lower.match(/^(hide|show)\\s+(.+)$/))) {
    const id = findServiceId(m[2], names);
    if (!id) return null;
    const visible = m[1] === "show";
    return {
      command: { type: "set-service-visibility", id, visible },
      summary: visible
        ? `Show ${names.get(id)} on the public page.`
        : `Hide ${names.get(id)} from the public page.`,
    };
  }
  // Address presentation decision (SHOW/HIDE): the pipeline never owns it;
  // the owner asserts it persistently. A local presentation change, so it
  // rides the fast proposal/undo tier.
  if (
    lower.match(
      /^(?:hide|make\\s+private|remove)\\s+(?:the\\s+)?(?:business\\s+)?address$/,
    )
  ) {
    return {
      command: { type: "set-address-visibility", visibility: "hidden" },
      summary:
        "Hide the business address from the public page. The address itself is unchanged.",
    };
  }
  if (
    lower.match(
      /^(?:show|make\\s+public|display|publish)\\s+(?:the\\s+)?(?:business\\s+)?address$/,
    )
  ) {
    return {
      command: { type: "set-address-visibility", visibility: "public" },
      summary:
        "Show the business address on the public page. The address itself is unchanged.",
    };
  }"""
assert old in s, "address phrasing"
s = s.replace(old, new)
open(p, "w").write(s)
print("address NL phrasing added")
