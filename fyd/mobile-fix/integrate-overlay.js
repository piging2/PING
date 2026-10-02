const fs = require("fs");
const path = "/home/nolan/projects/ping/src/app/sites/_shared/site-client.tsx";
let c = fs.readFileSync(path, "utf8");

// 1. Add import for ObjectOverlay and useState/useEffect (check if already imported)
if (!c.includes('from "@/fyd/components/object-overlay"')) {
  // Find the FydMotionFallback import and add after it
  const importLine = 'import { FydMotionFallback } from "@/fyd/components/fyd-motion-fallback";';
  if (c.includes(importLine)) {
    c = c.replace(
      importLine,
      importLine + '\nimport { ObjectOverlay } from "@/fyd/components/object-overlay";'
    );
    console.log("added overlay import");
  }
}

// 2. Add overlay state and click interception inside SiteClient
// Find the useState declarations and add overlay state after them
const stateAnchor = "const [patchError, setPatchError] = useState<string | null>(null);";
if (c.includes(stateAnchor) && !c.includes("overlayObject")) {
  c = c.replace(
    stateAnchor,
    stateAnchor + `
  const [overlayObjectId, setOverlayObjectId] = useState<string | null>(null);`
  );
  console.log("added overlay state");
}

// 3. Add click interception effect
// Find where useMemo for ctx is, and add the effect before the return
const ctxAnchor = "const page = spec.pages.find((p) => p.slug === activeSlug) ?? spec.pages[0];";
if (c.includes(ctxAnchor) && !c.includes("data-object-overlay")) {
  const effectCode = `
  // Object overlay: intercept taps/clicks on /o/ links and open rich overlay.
  // Close returns to exact scroll position (handled by ObjectOverlay).
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="/o/"]') as HTMLAnchorElement | null;
      if (!link) return;
      // Let modifier clicks (new tab) and #ask links pass through.
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      const href = link.getAttribute("href") || "";
      if (href.includes("#ask")) return;
      const match = href.match(/^\\/o\\/([^#?]+)/);
      if (!match) return;
      const objectId = decodeURIComponent(match[1]);
      // Verify the object exists in the public graph.
      const obj = graph.objects.find((o) => o.id === objectId);
      if (!obj) return;
      e.preventDefault();
      setOverlayObjectId(objectId);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [graph]);`;
  
  c = c.replace(ctxAnchor, ctxAnchor + effectCode);
  console.log("added click interception");
}

// 4. Render the overlay at the end of the component
// Find the return statement's closing and add overlay before it
// Look for the FydMotionFallback render
if (c.includes("<FydMotionFallback />") && !c.includes("<ObjectOverlay")) {
  // Find the overlay object from graph
  const overlayRender = `
      {overlayObjectId && (() => {
        const obj = graph.objects.find((o) => o.id === overlayObjectId);
        if (!obj) return null;
        return (
          <ObjectOverlay
            object={obj}
            siteId={siteId ?? ""}
            onClose={() => setOverlayObjectId(null)}
          />
        );
      })()}`;
  
  c = c.replace(
    "<FydMotionFallback />",
    "<FydMotionFallback />" + overlayRender
  );
  console.log("added overlay render");
}

fs.writeFileSync(path, c);
console.log("done");
