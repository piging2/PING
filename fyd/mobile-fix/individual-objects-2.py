#!/usr/bin/env python3
"""Individual-object experience, part 2: /o page, evidence-chrome,
object-affordance, reference button, tests."""
import sys

P = "/home/nolan/projects/ping/"

def replace_once(path, old, new, label):
    full = P + path
    s = open(full).read()
    n = s.count(old)
    if n != 1:
        print(f"FAIL {label}: found {n} occurrences, expected 1")
        sys.exit(1)
    open(full, "w").write(s.replace(old, new, 1))
    print(f"OK {label}")

def replace_all(path, old, new, label, expected):
    full = P + path
    s = open(full).read()
    n = s.count(old)
    if n != expected:
        print(f"FAIL {label}: found {n} occurrences, expected {expected}")
        sys.exit(1)
    open(full, "w").write(s.replace(old, new))
    print(f"OK {label}")

PAGE = "src/app/o/[objectId]/page.tsx"

# --- keep the tenant siteId from the resolver (both call sites) ---
old_res = "  const view = loadObjectViewBySlugOrId(objectId)?.view ?? null;"
new_res = """  const resolved = loadObjectViewBySlugOrId(objectId);
  const view = resolved?.view ?? null;
  const tenantId = resolved?.siteId ?? null;"""
replace_all(PAGE, old_res, new_res, "page-resolver", 2)

# --- services become links to their own object nodes ---
old_svc = """              {visibleServices.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3.5"
                >
                  <span className="text-base font-semibold">{s.name}</span>
                  <span className="mt-0.5 block text-xs text-stone-400" title={s.basisLabel}>
                    {s.basis === "owner" ? "Added by the owner" : "From the site data"}
                  </span>
                </li>
              ))}"""
new_svc = """              {visibleServices.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3.5 transition-colors hover:border-amber-300 hover:bg-amber-50/40"
                >
                  <Link
                    href={"/o/" + encodeURIComponent(s.id)}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                  >
                    <span className="text-base font-semibold text-amber-900 underline-offset-2 hover:underline">{s.name}</span>
                    <span className="mt-0.5 block text-xs text-stone-400" title={s.basisLabel}>
                      {s.basis === "owner" ? "Added by the owner" : "From the site data"} · Open service
                    </span>
                  </Link>
                </li>
              ))}"""
replace_once(PAGE, old_svc, new_svc, "page-service-links")

# --- ActionButtons: render directions + reference ---
old_ask_case = """      case "ask":
        return (
          <a
            key={i}
            href="#ask"
            className={cls + " border border-stone-300 bg-white text-stone-800 hover:bg-stone-100"}
          >
            <MessageCircleQuestion className="h-5 w-5" aria-hidden="true" /> Ask
          </a>
        );"""
new_ask_case = """      case "ask":
        return (
          <a
            key={i}
            href="#ask"
            className={cls + " border border-stone-300 bg-white text-stone-800 hover:bg-stone-100"}
          >
            <MessageCircleQuestion className="h-5 w-5" aria-hidden="true" /> Ask
          </a>
        );
      case "directions":
        return (
          <a
            key={i}
            href={cap.href}
            target="_blank"
            rel="noreferrer"
            className={cls + " border border-stone-300 bg-white text-stone-800 hover:bg-stone-100"}
          >
            <MapPin className="h-5 w-5" aria-hidden="true" /> {cap.label}
          </a>
        );
      case "reference":
        return <ReferenceButton key={i} objectId={cap.objectId} className={cls + " border border-stone-300 bg-white text-stone-800 hover:bg-stone-100"} />;"""
replace_once(PAGE, old_ask_case, new_ask_case, "page-action-cases")

# --- import the reference button ---
old_imp = 'import { AskObjectPanel } from "@/fyd/ui/ask-object-panel";'
new_imp = '''import { AskObjectPanel } from "@/fyd/ui/ask-object-panel";
import { ReferenceButton } from "@/fyd/ui/reference-button";'''
replace_once(PAGE, old_imp, new_imp, "page-import")

# --- scope Ask to the selected object with the real tenant ---
old_panel = """            <AskObjectPanel
              siteId={view.id}
              objectName={view.name}
              sampleQuestions={view.sampleQuestions}
            />"""
new_panel = """            <AskObjectPanel
              siteId={tenantId ?? view.id}
              objectId={view.id}
              objectName={view.name}
              sampleQuestions={view.sampleQuestions}
            />"""
replace_once(PAGE, old_panel, new_panel, "page-ask-scope")

# --- evidence-chrome: render directions + reference in CapabilityAction ---
old_ec = """    default:
      // follow/like: no static affordance on these surfaces, exactly as in
      // the existing Circle primitive. Never a dead button.
      return null;
  }
}"""
new_ec = """    case "directions":
      return (
        <a href={cap.href} target="_blank" rel="noreferrer" className={QUIET_BTN}>
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {cap.label}
        </a>
      );
    case "reference":
      return (
        <ReferenceButton objectId={cap.objectId} className={QUIET_BTN} compact />
      );
    default:
      // follow/like: no static affordance on these surfaces, exactly as in
      // the existing Circle primitive. Never a dead button.
      return null;
  }
}"""
replace_once("src/fyd/object/evidence-chrome.tsx", old_ec, new_ec, "ec-cases")

# --- object-affordance: Ask FYD goes to the object's own node ---
old_aff = """          <a
            href="#ask"
            className="inline-flex min-h-[44px] items-center rounded px-4 py-2 text-sm font-semibold\""""
# (guard: verify exact text below instead)
full_aff = P + "src/fyd/components/object-affordance.tsx"
s_aff = open(full_aff).read()
if 'href="#ask"' not in s_aff:
    print("FAIL affordance: href=\"#ask\" not found")
    sys.exit(1)
s_aff = s_aff.replace('href="#ask"', 'href={detailHref + "#ask"}', 1)
open(full_aff, "w").write(s_aff)
print("OK affordance-ask-href")

# --- reference button client component ---
ref_btn = '''"use client";

/**
 * ReferenceButton: copy a stable link to this object (its /o node).
 * The honest primitive behind the "reference" capability: no backend,
 * no fake action, just the object's address on the clipboard.
 */

import { useState } from "react";
import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReferenceButton({
  objectId,
  className,
  compact,
}: {
  objectId: string;
  className?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={cn(className)}
      aria-live="polite"
      onClick={async () => {
        const url =
          window.location.origin + "/o/" + encodeURIComponent(objectId);
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard unavailable: leave the label unchanged, never fake it.
        }
      }}
    >
      <Link2 className="h-5 w-5" aria-hidden="true" />
      {copied ? "Link copied" : "Reference"}
    </button>
  );
}
'''
open(P + "src/fyd/ui/reference-button.tsx", "w").write(ref_btn)
print("OK reference-button")

# --- evidence-chrome: import ReferenceButton ---
old_ec_imp = None
full_ec = P + "src/fyd/object/evidence-chrome.tsx"
s_ec = open(full_ec).read()
# find the lucide import line to extend
import re
m = re.search(r'import \{ ([^}]*) \} from "lucide-react";', s_ec)
if not m:
    print("FAIL ec-import: lucide import not found")
    sys.exit(1)
names = m.group(1)
if "MapPin" not in names:
    s_ec = s_ec.replace(m.group(0), 'import { ' + names + ', MapPin } from "lucide-react";', 1)
# add ReferenceButton import after the lucide import
s_ec = s_ec.replace(
    'from "lucide-react";',
    'from "lucide-react";\nimport { ReferenceButton } from "@/fyd/ui/reference-button";',
    1,
)
open(full_ec, "w").write(s_ec)
print("OK ec-imports")

# --- tests: update buildCapabilities calls for the new signature ---
T = "src/fyd/object/__tests__/view.test.ts"
s_t = open(P + T).read()
s_t = s_t.replace(
    "buildCapabilities(emptyContact, { summary: \"\", services: [] })",
    'buildCapabilities("ping.social.business@1", "b1", emptyContact, { summary: "", services: [] })',
)
s_t = s_t.replace(
    'buildCapabilities(emptyContact, {\n      summary: "A real business.",\n      services: [],\n    })',
    'buildCapabilities("ping.social.business@1", "b1", emptyContact, {\n      summary: "A real business.",\n      services: [],\n    })',
)
s_t = s_t.replace(
    'buildCapabilities(emptyContact, {\n      summary: "",\n      services: [',
    'buildCapabilities("ping.social.business@1", "b1", emptyContact, {\n      summary: "",\n      services: [',
)
s_t = s_t.replace(
    "buildCapabilities(\n      { ...emptyContact, phone: \"+15551234567\" },\n      { summary: \"\", services: [] },\n    )",
    'buildCapabilities(\n      "ping.social.business@1",\n      "b1",\n      { ...emptyContact, phone: "+15551234567" },\n      { summary: "", services: [] },\n    )',
)
# business no longer gets "like": fix the expectation
s_t = s_t.replace(
    'expect(caps.some((c) => c.kind === "like")).toBe(true);',
    'expect(caps.some((c) => c.kind === "like")).toBe(false); // business: no like',
)
# add schema-decision coverage at the end of the describe block
s_t = s_t.replace(
    """  test("contact evidence gates ask on", () => {""",
    """  test("service gets reference, not follow/like/contact", () => {
    const caps = buildCapabilities("ping.social.service@1", "s7", emptyContact, {
      summary: "Emergency plumbing.",
      services: [],
    });
    expect(caps.some((c) => c.kind === "ask")).toBe(true);
    expect(caps.some((c) => c.kind === "reference")).toBe(true);
    expect(caps.some((c) => c.kind === "follow")).toBe(false);
    expect(caps.some((c) => c.kind === "like")).toBe(false);
    expect(caps.some((c) => c.kind === "call")).toBe(false);
  });

  test("location with locality gets directions", () => {
    const caps = buildCapabilities(
      "ping.social.location@1",
      "l1",
      { ...emptyContact, locality: "Grand Junction, CO" },
      { summary: "", services: [] },
    );
    const dir = caps.find((c) => c.kind === "directions");
    expect(dir).toBeDefined();
    expect((dir as { href: string }).href).toContain("google.com/maps");
    expect(caps.some((c) => c.kind === "follow")).toBe(false);
  });

  test("person gets follow, post gets like", () => {
    const person = buildCapabilities("ping.social.person@1", "p1", emptyContact, {
      summary: "A tech.",
      services: [],
    });
    expect(person.some((c) => c.kind === "follow")).toBe(true);
    expect(person.some((c) => c.kind === "like")).toBe(false);
    const post = buildCapabilities("ping.social.post@1", "po1", emptyContact, {
      summary: "Hello.",
      services: [],
    });
    expect(post.some((c) => c.kind === "like")).toBe(true);
    expect(post.some((c) => c.kind === "reference")).toBe(true);
    expect(post.some((c) => c.kind === "follow")).toBe(false);
  });

  test("contact evidence gates ask on", () => {""",
    1,
)
open(P + T, "w").write(s_t)
print("OK tests")

print("ALL EDITS APPLIED")
