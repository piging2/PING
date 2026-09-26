/**
 * FYD family motion vocabulary (product lane, V1).
 *
 * Tiny client island: IntersectionObserver arms the hidden start state
 * and settles to the visible end state. Progressive enhancement by
 * construction:
 * - SSR / no-JS: content renders fully visible, no animation classes.
 * - JS present: the hidden start state is applied only after mount, and
 *   the observer settles it visible on entry. Nothing waits on motion.
 * - prefers-reduced-motion: the family.css global rule collapses every
 *   transition/animation to ~instant.
 *
 * Vocabulary: Reveal, Stagger, ImageReveal, CardHover,
 * SectionTransition, TrustReveal (CountUp), GalleryTransition,
 * CTAEmphasis (EmphaticCta). Transform/opacity only, no random
 * fly-ins, no per-customer animation code.
 */

"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { MotionIntent } from "./hierarchy";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Renderer-internal intents beyond the plan-driven three. */
export type InViewIntent = Exclude<MotionIntent, "none"> | "gallery-transition";

const INTENT_CLASS: Record<InViewIntent, string> = {
  reveal: "fyd-motion-reveal",
  stagger: "fyd-motion-stagger",
  "image-reveal": "fyd-motion-image-reveal",
  "gallery-transition": "fyd-gallery-transition",
};

function useInView<T extends HTMLElement>(): {
  ref: { readonly current: T | null };
  armed: boolean;
  inView: boolean;
} {
  const ref = useRef<T | null>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    setArmed(true);
    const el = ref.current;
    if (!el) {
      setInView(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, armed, inView };
}

function stateClasses(armed: boolean, inView: boolean): string {
  return cx(armed && "is-armed", inView && "is-inview");
}

/**
 * Reveal / Stagger / ImageReveal wrapper. Renders a plain div carrying
 * data-motion for tests and the vocabulary class for family.css.
 * intent "none" (or absent) renders children with no wrapper.
 */
export function InView({
  intent,
  children,
  className,
  style,
  id,
}: {
  intent: InViewIntent;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
}): JSX.Element {
  const { ref, armed, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      id={id}
      data-motion={intent}
      className={cx(INTENT_CLASS[intent], stateClasses(armed, inView), className)}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * CTAEmphasis: the single primary action per conversion section gets a
 * restrained settle emphasis when it enters view, plus a hover lift.
 * Never a loop, never a pulse.
 */
export function EmphaticCta({
  href,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}): JSX.Element {
  const { ref, armed, inView } = useInView<HTMLAnchorElement>();
  return (
    <a
      ref={ref}
      href={href}
      aria-label={ariaLabel}
      data-motion="cta-emphasis"
      className={cx("fyd-cta-emphasis", stateClasses(armed, inView), className)}
    >
      {children}
    </a>
  );
}

/**
 * TrustReveal: numeric trust metrics count up once, on entry, from zero
 * to the evidence-backed final value. The final value is always in the
 * DOM (SSR and no-JS render it directly); the animation only rewrites
 * text while running. Non-numeric values render untouched.
 */
export function CountUp({ value, className }: { value: string; className?: string }): JSX.Element {
  const { ref, armed, inView } = useInView<HTMLSpanElement>();
  const started = useRef(false);
  useEffect(() => {
    if (!inView || started.current) return;
    const el = ref.current;
    if (!el) return;
    const m = /^(\d+(?:\.\d+)?)(.*)$/.exec(value.trim());
    if (!m) return;
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    started.current = true;
    const target = parseFloat(m[1]);
    const suffix = m[2];
    const decimals = m[1].includes(".") ? m[1].split(".")[1].length : 0;
    const duration = 900;
    let raf = 0;
    const t0 =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    const now = () =>
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    const tick = () => {
      const p = Math.min(1, (now() - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        el.textContent = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);
  return (
    <span
      ref={ref}
      className={cx(className, armed && inView && "is-counting")}
      data-motion="trust-reveal"
      data-countup={value}
    >
      {value}
    </span>
  );
}
