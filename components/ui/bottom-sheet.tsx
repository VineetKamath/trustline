"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(min-width: 640px)").matches,
    () => false,
  );
}

const noop = () => () => {};
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/**
 * Bottom sheet on phones (drag down to dismiss), centred dialog on larger
 * screens. Traps scroll, closes on Escape, and restores focus on close.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  className,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  dismissible?: boolean;
  className?: string;
  size?: "md" | "lg";
}) {
  const mounted = useMounted();
  const desktop = useIsDesktop();
  const dragControls = useDragControls();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => panelRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      previousFocus.current?.focus?.();
    };
  }, [open, dismissible, onClose]);

  if (!mounted) return null;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (dismissible && (info.offset.y > 120 || info.velocity.y > 600)) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[rgb(22_23_26/0.36)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => dismissible && onClose()}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface shadow-float outline-none",
              "rounded-t-[28px] sm:rounded-[24px]",
              size === "lg" ? "sm:max-w-[560px]" : "sm:max-w-[460px]",
              className,
            )}
            initial={desktop ? { opacity: 0, y: 16, scale: 0.98 } : { y: "100%" }}
            animate={desktop ? { opacity: 1, y: 0, scale: 1 } : { y: 0 }}
            exit={desktop ? { opacity: 0, y: 12, scale: 0.98 } : { y: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 380, mass: 0.9 }}
            drag={desktop ? false : "y"}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div
              className="flex shrink-0 touch-none justify-center pb-1 pt-3 sm:hidden"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <span className="h-1.5 w-10 rounded-full bg-line-strong" />
            </div>
            {title || dismissible ? (
              <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-2 pt-3 sm:pt-6">
                <div className="min-w-0">
                  {title ? (
                    <h2 id={titleId} className="text-[19px] font-semibold tracking-[-0.02em] text-ink">
                      {title}
                    </h2>
                  ) : null}
                  {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
                </div>
                {dismissible ? (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="-mr-2 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-subtle hover:text-ink"
                  >
                    <X className="size-5" />
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-2">{children}</div>
            {footer ? (
              <div className="safe-bottom shrink-0 border-t border-line bg-surface px-6 pb-4 pt-4">{footer}</div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
