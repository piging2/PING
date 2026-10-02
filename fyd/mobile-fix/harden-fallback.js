const fs = require("fs");
const path = "/home/nolan/projects/ping/src/fyd/components/fyd-motion-fallback.tsx";
let c = fs.readFileSync(path, "utf8");

const oldDoc = `/**
 * IntersectionObserver fallback for FYD scroll entrances (compose lane).
 *
 * Native CSS \`animation-timeline: view()\` drives \`[data-motion='enter']\`
 * entrances where supported (see FydMotionStyles). This client component
 * arms the \`.fyd-io\` fallback path only when:
 *   - the viewer has not requested reduced motion, and
 *   - the browser does not support scroll-driven animation timelines.
 *
 * It never touches layout or scrolling: it only adds \`fyd-io\` to
 * <html> and \`fyd-inview\` to elements as they enter the viewport, then
 * unobserves them. Under reduced motion it renders nothing and changes
 * nothing.
 */`;

const newDoc = `/**
 * IntersectionObserver fallback for FYD scroll entrances (compose lane).
 *
 * Native CSS \`animation-timeline: view()\` drives \`[data-motion='enter']\`
 * entrances where supported (see FydMotionStyles). This client component
 * arms the \`.fyd-io\` fallback path when:
 *   - the viewer has not requested reduced motion, and
 *   - the browser does not support scroll-driven animation timelines,
 *   OR the native timeline is present but stuck (false-positive feature
 *   detection: @supports passes yet elements remain at opacity 0).
 *
 * It never touches layout or scrolling: it only adds \`fyd-io\` to
 * <html> and \`fyd-inview\`/\`fyd-force-visible\` to elements as they enter
 * the viewport, then unobserves them. Under reduced motion it renders
 * nothing and changes nothing.
 */`;

if (c.includes(oldDoc)) {
  c = c.replace(oldDoc, newDoc);
  console.log("doc updated");
}

const oldLogic = `    if (
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline: view()")
    ) {
      return; // native scroll timelines handle [data-motion='enter']
    }`;

const newLogic = `    const nativeOK =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline: view()");
    if (!nativeOK) {
      armIOFallback();
      return;
    }
    // Native claimed: verify it actually drives. If [data-motion='enter']
    // elements visible in the viewport are still at opacity 0 after 2s,
    // the timeline is stuck (false positive) — force them visible.
    window.setTimeout(() => {
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
    return;

    function armIOFallback() {`;

if (c.includes(oldLogic)) {
  c = c.replace(oldLogic, newLogic);
  console.log("logic updated");
} else {
  console.log("logic pattern NOT found");
}

// Close the armIOFallback function: the original body after the early
// return needs to be wrapped. Find the document.documentElement.classList.add
// and wrap from there to the end of the useEffect.
const oldBody = `    document.documentElement.classList.add("fyd-io");`;
const newBody = `    armIOFallbackBody();\n    }\n\n    function armIOFallbackBody() {\n    document.documentElement.classList.add("fyd-io");`;

// Actually simpler: the structure is now:
//   if (!nativeOK) { armIOFallback(); return; }
//   ... timeout ...
//   return;
//   function armIOFallback() {
//     document.documentElement.classList.add("fyd-io");
//     ... rest ...
//   }
// We need to close the function at the end. Find the useEffect cleanup return.

fs.writeFileSync(path, c);
console.log("written, needs manual closure check");
