"use client";

import { animate, motion, useInView, useMotionValue, useTransform, type Variants } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/** Number that counts up once when it scrolls into view. */
export function CountUp({
  value,
  duration = 1.1,
  suffix = "",
  className,
  format = (n: number) => Math.round(n).toLocaleString("en-IN"),
}: {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${format(v)}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, value, duration, mv]);

  return (
    <motion.span ref={ref} className={cn("tabular", className)}>
      {text}
    </motion.span>
  );
}

/** Check mark that draws itself. */
export function AnimatedCheck({
  size = 64,
  delay = 0,
  tone = "verified",
  className,
}: {
  size?: number;
  delay?: number;
  tone?: "verified" | "accent" | "ink";
  className?: string;
}) {
  const colors = {
    verified: { ring: "var(--color-verified)", bg: "var(--color-verified-soft)" },
    accent: { ring: "var(--color-accent)", bg: "var(--color-accent-soft)" },
    ink: { ring: "var(--color-ink)", bg: "var(--color-subtle)" },
  }[tone];
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 20, delay }}
      aria-hidden
    >
      <circle cx="32" cy="32" r="30" fill={colors.bg} />
      <motion.circle
        cx="32"
        cy="32"
        r="30"
        fill="none"
        stroke={colors.ring}
        strokeWidth="2.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: delay + 0.05 }}
        style={{ rotate: -90, transformOrigin: "50% 50%" }}
      />
      <motion.path
        d="M20 33.5l8 8 16-17"
        fill="none"
        stroke={colors.ring}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: delay + 0.45 }}
      />
    </motion.svg>
  );
}

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const riseChild: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function Stagger({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "section";
}) {
  const Comp = motion[as];
  return (
    <Comp variants={staggerParent} initial="hidden" animate="show" className={className}>
      {children}
    </Comp>
  );
}

export function Rise({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "section" | "article";
}) {
  const Comp = motion[as];
  return (
    <Comp variants={riseChild} className={className}>
      {children}
    </Comp>
  );
}

/** Fades and lifts content when it scrolls into view (landing page). */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
