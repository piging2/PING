/**
 * PublicFamilyPage (product lane, V1).
 *
 * The PUBLIC surface of the FYD Builder family. Renders exactly the
 * planned family sections from a HomePagePlan, in plan order, through
 * the family registry. Nothing else:
 *
 * - sections with status !== "planned" are omitted (proposed,
 *   owner-edit, deprecated never reach the public DOM);
 * - unknown components or variants render nothing (fail closed);
 * - no owner chrome, no trust panels, no dev diagnostics, regardless of
 *   NEXT_PUBLIC_FYD_DEMO_OWNER_MODE or any other environment flag;
 * - data-theme carries the compiled theme name ("hpp" | "coppersmith");
 * - the theme seam is family.css: Tailwind v4 + the compiled @theme
 *   blocks and .tokens.css for both locked themes.
 *
 * The consuming route sets <html lang> and imports this module (which
 * pulls in family.css as a side effect). The fixed homePage() generator
 * is untouched; cutover wires a route to this component later.
 */

import "./family.css";

import { Fragment } from "react";
import type { HomePagePlan, PlannedSection } from "../proceduralize/planner";
import { buildFamilyCtx, type FamilyRenderInput } from "./types";
import { resolveFamilySection } from "./registry";
import { visualScaleFor } from "./hierarchy";
import { FOCUS_RING, cx } from "./shared";

/** Chrome sections live outside <main>; everything else is main content. */
const CHROME = new Set(["Navigation", "AskFYD", "AskFYD-entry"]);

function sortChromeFirst(sections: PlannedSection[]): {
  chrome: PlannedSection[];
  flow: PlannedSection[];
} {
  const chrome: PlannedSection[] = [];
  const flow: PlannedSection[] = [];
  for (const s of sections) {
    (CHROME.has(s.component) ? chrome : flow).push(s);
  }
  return { chrome, flow };
}

/**
 * The sticky mobile call bar renders when a planned Navigation section
 * carries a primary CTA binding. The page reserves bottom clearance on
 * small viewports so footer content is never covered by it.
 */
function hasStickyBar(plan: HomePagePlan): boolean {
  return plan.sections.some(
    (s) =>
      s.status === "planned" &&
      s.component === "Navigation" &&
      s.ctaBindings.some((c) => c.tier === "primary"),
  );
}

/**
 * SectionTransition: a hairline tone break after PRIMARY moments (hero,
 * major visual proof), before the rhythm steps down. Aria-hidden: pure
 * visual rhythm, never content.
 */
function SectionTransition(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="fyd-section-transition bg-gradient-to-r from-transparent via-border-subtle to-transparent"
      data-motion="section-transition"
    />
  );
}

export function PublicFamilyPage({ input }: { input: FamilyRenderInput }): JSX.Element {
  const ctx = buildFamilyCtx(input);
  const plan: HomePagePlan = input.plan;
  const { chrome, flow } = sortChromeFirst(plan.sections);

  const renderFlow = (sections: PlannedSection[]) =>
    sections.map((s) => {
      const el = resolveFamilySection(s, ctx);
      if (!el) return null;
      const primary = visualScaleFor(s) === "PRIMARY";
      return (
        <Fragment key={s.id}>
          {el}
          {primary && <SectionTransition />}
        </Fragment>
      );
    });

  const render = (sections: PlannedSection[]) =>
    sections.map((s) => {
      const el = resolveFamilySection(s, ctx);
      return el ? <Fragment key={s.id}>{el}</Fragment> : null;
    });

  return (
    <div
      data-theme={ctx.themeDataTheme}
      data-family-page="true"
      className={cx(
        "min-h-screen bg-surface-content font-body text-text-primary antialiased",
        // Clearance for the sticky mobile call bar (thumb-reachable phone
        // CTA) so it never covers footer content on small viewports.
        hasStickyBar(plan) && "pb-[76px] md:pb-0",
      )}
    >
      <a
        href="#main"
        className={cx(
          "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50",
          "focus:rounded-pill focus:bg-cta-primary-background focus:px-5 focus:py-3",
          "focus:font-body focus:text-body focus:text-cta-primary-text",
          FOCUS_RING,
        )}
      >
        Skip to content
      </a>
      {render(chrome)}
      <main id="main">{renderFlow(flow)}</main>
    </div>
  );
}
