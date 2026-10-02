p = "src/fyd/object/commands.ts"
s = open(p).read()

start = s.index("  // Address presentation decision (SHOW/HIDE):")
end_marker = """      summary:
        "Show the business address on the public page. The address itself is unchanged.",
    };
  }
"""
end = s.index(end_marker) + len(end_marker)
block = s[start:end]
s = s[:start] + s[end:]

# Insert before the service hide/show block, with a precedence note.
block = block.replace(
  "  // Address presentation decision (SHOW/HIDE):",
  "  // Address presentation decision (SHOW/HIDE): placed BEFORE the service\n"
  "  // hide/show so \"hide the address\" is not consumed as an unknown\n"
  "  // service name.",
  1,
)
anchor = "  if ((m = lower.match(/^(hide|show)\\s+(.+)$/))) {"
assert anchor in s, "service hide/show anchor"
s = s.replace(anchor, block + anchor, 1)

open(p, "w").write(s)
print("address block moved before service hide/show")
