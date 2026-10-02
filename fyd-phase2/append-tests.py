"""Append Phase 2 tests: UI node-control tests + view ask-gating tests."""
import sys

# --- UI tests ---
UI_PATH = "/home/nolan/projects/ping/src/fyd/ui/__tests__/fyd-circle.test.tsx"
with open(UI_PATH, "r", encoding="utf-8") as f:
    ui = f.read()

old_import = 'import { FydCircle, circleActionsFor } from "../fyd-circle";'
new_import = (
    'import {\n'
    '  FydCircle,\n'
    '  FydCircleNodeLink,\n'
    '  circleActionsFor,\n'
    '  nodeControlFor,\n'
    '} from "../fyd-circle";'
)
assert ui.count(old_import) == 1, "ui import anchor"
ui = ui.replace(old_import, new_import, 1)

ui_tests = '''
describe("FydCircleNodeLink (Phase 2: optional Open Node control)", () => {
  test("renders a circular link to the node href, never a button or card", () => {
    const html = renderToString(
      <FydCircleNodeLink href="/node/obj-1" name="Happy Place" />,
    );
    expect(html).toContain('href="/node/obj-1"');
    expect(html).toContain("fydc-act");
    expect(html).toContain("border-radius:50%");
    expect(html).toContain("Open node view of Happy Place");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("card");
  });

  test("node control exists exactly when nodeHref is set (pure helper)", () => {
    // The action row is expanded-state-only (client state); nodeControlFor
    // is exactly what renderExpanded maps over, so testing the helper
    // tests the render rule, mirroring circleActionsFor above.
    expect(nodeControlFor(undefined, "Happy Place")).toBeNull();
    expect(nodeControlFor("", "Happy Place")).toBeNull();
    const el = nodeControlFor("/node/obj-1", "Happy Place");
    expect(el).not.toBeNull();
    const html = renderToString(el!);
    expect(html).toContain('href="/node/obj-1"');
    expect(html).toContain("fydc-node");
  });

  test("circle without nodeHref renders no node control", () => {
    const html = renderToString(<FydCircle projection={baseProjection} />);
    expect(html).not.toContain("fydc-node");
    expect(html).not.toContain("Open node view of");
  });
});
'''
ui = ui.rstrip("\n") + "\n" + ui_tests
with open(UI_PATH, "w", encoding="utf-8") as f:
    f.write(ui)
print("ok: ui tests")

# --- view tests ---
VIEW_PATH = "/home/nolan/projects/ping/src/fyd/object/__tests__/view.test.ts"
with open(VIEW_PATH, "r", encoding="utf-8") as f:
    view = f.read()

old_vimport = """import {
  buildObjectView,
  knownServices,
  listObjectIds,
  loadObjectView,
} from "../view";"""
new_vimport = """import {
  buildCapabilities,
  buildObjectView,
  knownServices,
  listObjectIds,
  loadObjectView,
} from "../view";"""
assert view.count(old_vimport) == 1, "view import anchor"
view = view.replace(old_vimport, new_vimport, 1)

view_tests = '''
describe("buildCapabilities ask gating (Phase 2)", () => {
  const emptyContact = {
    phone: null,
    email: null,
    website: null,
    locality: null,
    addressVisibility: "hidden",
  } as const;

  test("no evidence -> no ask capability (follow/like remain)", () => {
    const caps = buildCapabilities(emptyContact, { summary: "", services: [] });
    expect(caps.some((c) => c.kind === "ask")).toBe(false);
    expect(caps.some((c) => c.kind === "follow")).toBe(true);
    expect(caps.some((c) => c.kind === "like")).toBe(true);
  });

  test("summary text gates ask on", () => {
    const caps = buildCapabilities(emptyContact, {
      summary: "A real business.",
      services: [],
    });
    expect(caps.some((c) => c.kind === "ask")).toBe(true);
  });

  test("a visible service gates ask on", () => {
    const caps = buildCapabilities(emptyContact, {
      summary: "",
      services: [
        {
          id: "s1",
          name: "Consult",
          basis: "structured",
          basisLabel: "From the site data",
          visible: true,
        },
      ],
    });
    expect(caps.some((c) => c.kind === "ask")).toBe(true);
  });

  test("contact evidence gates ask on", () => {
    const caps = buildCapabilities(
      { ...emptyContact, phone: "+15551234567" },
      { summary: "", services: [] },
    );
    expect(caps.some((c) => c.kind === "ask")).toBe(true);
  });
});
'''
view = view.rstrip("\n") + "\n" + view_tests
with open(VIEW_PATH, "w", encoding="utf-8") as f:
    f.write(view)
print("ok: view tests")
