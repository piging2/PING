/**
 * QA-HOSTILE supplementary micro-attacks (temporary, untracked).
 * Closes two coverage gaps from the main sweep:
 *  S1: phone value containing ONLY newline whitespace (TEL_ALLOWED \s path)
 *  S2: directions capability with hostile locality (location role)
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  contactMethodFor,
  type ClaimEvidence,
} from "../../object/object-projection";
import { buildCapabilities } from "../../object/view";
import type { ObjectContactView } from "../../object/types";

const EV: ClaimEvidence = { state: "observed", receipt: "hostile-test", asOf: "2026-09-23", steps: [] };
const out: Record<string, unknown>[] = [];

function anchor(href: string, label: string): string {
  return renderToStaticMarkup(React.createElement("a", { href }, label));
}

// S1: pure-newline phone
{
  const value = "+1\n(970)\n555-0100";
  const m = contactMethodFor("phone", value, EV);
  const html = m ? anchor(m.actionUri, "Call") : "(no method)";
  out.push({
    id: "S1",
    gate: m ? "method actionUri=" + JSON.stringify(m.actionUri) : "null (rejected)",
    displayValue: m ? JSON.stringify(m.value) : null,
    renderedAnchor: html,
    hasLiveScript: /<script[\s>]/.test(html),
    hasEventHandler: /\son[a-z]+\s*=\s*"/i.test(html),
  });
}

// S2: directions with hostile locality, location role
{
  const contact: ObjectContactView = {
    phone: null, email: null, website: null,
    locality: "\"><script>alert('S2')</script>",
    addressVisibility: "public",
  };
  const caps = buildCapabilities("ping.knowledge.location@1", "loc-1", contact, { summary: "x", services: [] });
  const html = caps
    .map((c) => ("href" in c ? anchor(c.href, c.label) : ""))
    .join("");
  out.push({
    id: "S2",
    caps: caps.map((c) => ("href" in c ? { kind: c.kind, href: c.href } : c.kind)),
    renderedHtml: html.slice(0, 400),
    hasLiveScript: /<script[\s>]/.test(html),
    hasEventHandler: /\son[a-z]+\s*=\s*"/i.test(html),
    hasJsHref: /href="javascript:/i.test(html),
  });
}

test("supplementary hostile micro-attacks", () => {
  console.log("HOSTILE_JSON_BEGIN");
  console.log(JSON.stringify(out));
  console.log("HOSTILE_JSON_END");
  expect(out).toHaveLength(2);
});
