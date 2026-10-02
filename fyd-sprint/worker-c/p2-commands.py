p = "src/fyd/object/commands.ts"
s = open(p).read()

anchor = """  // Owner contact corrections. The summary names what the owner asserts;"""
confirm_block = """  // CONFIRM verb: the owner asserts the current effective value of a contact
  // field is correct. Records an owner assertion (actor + timestamp) without
  // changing any value. Bare phrasings with no field ("that's right", "correct")
  // are ambiguous and return null so the surface can answer them as Q&A.
  // Placed BEFORE the correction patterns so "my phone is correct" is not
  // misread as a correction to the value "correct".
  if ((m = lower.match(/^(?:confirm|verify)\\s+(?:(?:the|our|my)\\s+)?(phone|email|website)$/))) {
    const field = m[1] as "phone" | "email" | "website";
    return {
      command: { type: "confirm-contact-field", field },
      summary:
        "Record an owner confirmation that the current " +
        field +
        " is correct, with actor and timestamp. The source record is unchanged.",
    };
  }
  if ((m = lower.match(/^(?:(?:our|my|the)\\s+)?(phone|email|website)\\s+is\\s+(?:correct|right|accurate)$/))) {
    const field = m[1] as "phone" | "email" | "website";
    return {
      command: { type: "confirm-contact-field", field },
      summary:
        "Record an owner confirmation that the current " +
        field +
        " is correct, with actor and timestamp. The source record is unchanged.",
    };
  }
  if (
    (m = lower.match(
      /^(?:that's right|yes,?\\s+that's (?:right|correct|accurate)),?\\s+(?:my|our|the)\\s+(phone|email|website)$/,
    ))
  ) {
    const field = m[1] as "phone" | "email" | "website";
    return {
      command: { type: "confirm-contact-field", field },
      summary:
        "Record an owner confirmation that the current " +
        field +
        " is correct, with actor and timestamp. The source record is unchanged.",
    };
  }
  if (
    (m = lower.match(/^(?:correct|right|accurate),?\\s+(?:my|our|the)\\s+(phone|email|website)$/))
  ) {
    const field = m[1] as "phone" | "email" | "website";
    return {
      command: { type: "confirm-contact-field", field },
      summary:
        "Record an owner confirmation that the current " +
        field +
        " is correct, with actor and timestamp. The source record is unchanged.",
    };
  }
""" + anchor
assert anchor in s, "anchor"
s = s.replace(anchor, confirm_block)
open(p, "w").write(s)
print("commands.ts patched")
