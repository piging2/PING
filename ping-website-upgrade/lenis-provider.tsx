"use client";

import { useEffect, createContext, useContext, ReactNode, useState } from "react";
import Lenis from "@studio-freight/lenis";
import { usePathname } from "next/navigation";
import { useVisualEffects } from "@/components/effects-provider";

interface LenisContextValue {
  lenis: Lenis | null;
}

const LenisContext = createContext<LenisContextValue>({ lenis: null });

/**
 * LenisProvider - Smooth scroll integration
 *
 * Provides premium smooth scroll experience across the site.
 * Respects prefers-reduced-motion and the user's visual-effects preference:
 * smooth scroll is skipped entirely when either calls for calm.
 * Excludes workbench routes and workbench preview mode from smooth scrolling.
 * Exposes Lenis instance for Framer Motion scroll synchronization.
 *
 * Architectural boundary:
 * - isWorkbenchContext is true when pathname starts with /workbench OR workbench=true query param
 * - Lenis is only initialized when NOT in workbench context
 * - This ensures both Workbench UI and Workbench iframe preview have native scroll
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const pathname = usePathname();
  const { resolved } = useVisualEffects();

  useEffect(() => {
    // Authoritative workbench context check
    // True when: pathname starts with /workbench OR workbench=true query param
    const isWorkbenchRoute = pathname.startsWith('/workbench');
    // Use window.location.search to avoid Suspense boundary requirement
    const isWorkbenchPreview = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('workbench') === 'true';
    const isWorkbenchContext = isWorkbenchRoute || isWorkbenchPreview;

    // Disable Lenis for workbench context (both UI and iframe preview)
    if (isWorkbenchContext) {
      return;
    }

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // The visual-effects toggle is a user-level calm switch: "off" means
    // no animation at all, which includes synthetic smooth scrolling.
    if (prefersReducedMotion || resolved === "off") {
      return;
    }

    // Initialize Lenis with conservative settings to prevent touchpad interference
    const lenisInstance = new Lenis({
      lerp: 0.25, // Higher lerp = snappier feel (default 0.1)
      wheelMultiplier: 1.0, // Neutral multiplier to prevent touchpad stopping
      touchMultiplier: 1.0, // Neutral multiplier to prevent touchpad stopping
      duration: 0.8, // Reduced from 1.2 for snappier feel and less momentum interference
    });

    setLenis(lenisInstance);

    // Animation loop with proper cancellation
    let frameId: number;
    function raf(time: number) {
      lenisInstance.raf(time);
      frameId = requestAnimationFrame(raf);
    }

    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenisInstance.destroy();
      setLenis(null);
    };
  }, [pathname, resolved]);

  return (
    <LenisContext.Provider value={{ lenis }}>
      {children}
    </LenisContext.Provider>
  );
}

/**
 * Hook to access Lenis instance for scroll synchronization
 */
export function useLenis() {
  return useContext(LenisContext);
}
