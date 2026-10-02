#!/usr/bin/env python3
P = "/home/nolan/projects/ping/src/fyd/object/__tests__/confirm-command.test.ts"
src = open(P).read()

subs = [
    # hide assertion block
    ('''      { type: "set-address-visibility", visibility: "hidden" },
      KNOWN_IDS,
      KNOWN_NAMES,
    );
    expect(o.addressVisibility).toBe("hidden");''',
     '''      { type: "set-address-visibility", visibility: "hide" },
      KNOWN_IDS,
      KNOWN_NAMES,
    );
    expect(o.addressVisibility).toBe("hide");'''),
    ('''    expect(a!.value).toBe("hidden");
    expect(a!.visibility).toBe("hidden");''',
     '''    expect(a!.value).toBe("hide");
    expect(a!.visibility).toBe("hide");'''),
    # show supersedes hide
    ('''      { type: "set-address-visibility", visibility: "hidden" },
      KNOWN_IDS,
      KNOWN_NAMES,
    );
    const hideId = hid.addressVisibilityAssertion!.eventId;''',
     '''      { type: "set-address-visibility", visibility: "hide" },
      KNOWN_IDS,
      KNOWN_NAMES,
    );
    const hideId = hid.addressVisibilityAssertion!.eventId;'''),
    ('''      { type: "set-address-visibility", visibility: "public" },
      KNOWN_IDS,
      KNOWN_NAMES,
    );
    expect(shown.addressVisibility).toBe("public");''',
     '''      { type: "set-address-visibility", visibility: "show" },
      KNOWN_IDS,
      KNOWN_NAMES,
    );
    expect(shown.addressVisibility).toBe("show");'''),
    # interpreter rows
    ('''    ["hide the address", "hidden"],
    ["hide the business address", "hidden"],
    ["show the address", "public"],
    ["show the business address", "public"],
    ["make the address public", "public"],''',
     '''    ["hide the address", "hide"],
    ["hide the business address", "hide"],
    ["show the address", "show"],
    ["show the business address", "show"],
    ["make the address public", "show"],'''),
    # tier row: address visibility is MEDIUM since 2026-09-25
    ('''    [{ type: "set-address-visibility", visibility: "hidden" }, "LOW"],''',
     '''    // Address visibility is MEDIUM (FYD product authority directive,
    // Nolan 2026-09-25): it alters public factual presentation, so it
    // needs explicit confirmation and no automatic LOW undo.
    [{ type: "set-address-visibility", visibility: "hide" }, "MEDIUM"],'''),
]
for old, new in subs:
    assert src.count(old) == 1, f"anchor miss: {old[:60]!r} ({src.count(old)})"
    src = src.replace(old, new, 1)
open(P, "w").write(src)
print("confirm-command.test.ts: tri-state literals + MEDIUM tier")
print("OK")
