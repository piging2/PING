"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { heroBackgroundDrift } from "@/motion/hero";
import { useMotion } from "@/components/motion-provider";
import { useVisualEffects } from "@/components/effects-provider";

interface BlueprintGridProps {
  className?: string;
  gridSize?: number;
  lineColor?: string;
  /**
   * drift — very slow ambient background drift (heroBackgroundDrift variant).
   * Only active when the user's visual-effects preference is "full" and the
   * OS does not prefer reduced motion. Default false: other sections keep
   * the static fade-in.
   */
  drift?: boolean;
}

/**
 * BlueprintGrid - Subtle blueprint grid pattern that fades in
 *
 * Carpentry personality: Blueprint-style grid fades in behind process sections.
 * Very subtle pattern that adds depth without being distracting.
 *
 * Default: 20px grid, faint blue-gray lines
 */
export function BlueprintGrid({
  className,
  gridSize = 20,
  lineColor = "rgba(100, 120, 140, 0.08)",
  drift = false,
}: BlueprintGridProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { prefersReducedMotion } = useMotion();
  const { resolved } = useVisualEffects();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  const grid = (
    <div
      ref={ref}
      className={cn("absolute inset-0 pointer-events-none", className)}
      aria-hidden="true"
      style={{
        backgroundImage: `
          linear-gradient(to right, ${lineColor} 1px, transparent 1px),
          linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 1s ease-out'
      }}
    />
  );

  const driftActive = drift && !prefersReducedMotion && resolved === "full";
  if (!driftActive) return grid;

  return (
    <motion.div
      variants={heroBackgroundDrift}
      initial="initial"
      animate="animate"
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    >
      {grid}
    </motion.div>
  );
}
