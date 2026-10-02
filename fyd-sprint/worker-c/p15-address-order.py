p = "src/fyd/object/commands.ts"
s = open(p).read()

addr_hide = """  // Address presentation decision (SHOW/HIDE): the pipeline never owns it;
  // the owner asserts it persistently. A local presentation change, so it
  // rides the fast proposal/undo tier. Placed BEFORE the service
  // hide/show so "hide the address" is not consumed as an unknown
  // service name.
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
  }
"""
# Remove from its current position (after the service hide/show block).
assert addr_hide in s, "address block present"
s = s.replace(addr_hide, "")

anchor = """  if ((m = lower.match(/^(hide|show)\\s+(.+)$/))) {"""
assert anchor in s, "service hide/show anchor"
s = s.replace(anchor, addr_hide + anchor)

open(p, "w").write(s)
print("address phrasing reordered")
