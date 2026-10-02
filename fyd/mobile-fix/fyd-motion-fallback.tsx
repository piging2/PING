/**
 * IntersectionObserver fallback for FYD scroll entrances (compose lane).
 *
 * Native CSS `animation-timeline: view()` drives `[data-motion='enter']`
 * entrances where supported (see FydMotionStyles). This client component
 * arms the `.fyd-io` fallback path when:
 *   - the viewer has not requested reduced motion, and
 *   - the browser does not support scroll-driven animation timelines,
 *   OR the native timeline is present but stuck (false-positive feature
 *   detection: @supports passes yet elements remain at opacity 0).
 *
 * It never touches layout or scrolling: it only adds `fyd-io` to
 * <html> and `fyd-inview`/`fyd-force-visible` to elements as they enter
 * the viewport, then unobserves them. Under reduced motion it renders
 * nothing and changes nothing.
 */
"use client";

import { useEffect } from "react";

export function FydMotionFallback() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    const nativeOK =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline: view()");

    if (!nativeOK) {
      armIOFallback();
      return;
    }

    // Native claimed support: verify it actually drives. If
    // [data-motion='enter'] elements in the viewport are still at
    // opacity 0 after 2s, the timeline is stuck (false-positive feature
    // detection) — force them visible rather than leaving them hidden.
    const timer = window.setTimeout(() => {
      const stuck = Array.from(
        document.querySelectorAll("[data-motion='enter']")
      ).filter((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        const inView = r.top < window.innerHeight && r.bottom > 0;
        if (!inView) return false;
        const op = parseFloat(getComputedStyle(el).opacity);
        return op < 0.05;
      });
      if (stuck.length > 0) {
        document.documentElement.classList.add("fyd-io");
        stuck.forEach((el) => el.classList.add("fyd-force-visible"));
      }
    }, 2000);

    return () => window.clearTimeout(timer);

    function armIOFallback() {
      document.documentElement.classList.add("fyd-io");
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("fyd-inview");
              io.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
      );
      document
        .querySelectorAll("[data-motion='enter']")
        .forEach((el) => io.observe(el));
      return () => {
        io.disconnect();
        document.documentElement.classList.remove("fyd-io");
      };
    }
  }, []);
  return null;
}
