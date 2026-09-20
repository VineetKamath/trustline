"use client";

import { ArrowLeftRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Tone, ViewingAs } from "@/lib/demo/personas";
import { DEMO_EVENT } from "./demo-switcher";

const TONES: Record<Tone, string> = {
  indigo: "bg-[#eceefd] text-[#2f3aa6] border-[#d9ddfa]",
  amber: "bg-[#fbf0dd] text-[#7f4f08] border-[#f0dcb8]",
  emerald: "bg-[#e6f3ec] text-[#0f6640] border-[#c9e5d5]",
  slate: "bg-[#eceef1] text-[#343b47] border-[#d8dce2]",
  sky: "bg-[#e5f1f9] text-[#1d5d82] border-[#c9e1f0]",
  rose: "bg-[#fbe9ec] text-[#8e2a40] border-[#f3cfd6]",
};

/**
 * Demo-only strip that states, on every screen, whose eyes you are looking
 * through. Each persona has its own colour so switching is unmistakable.
 */
export function PersonaBar({
  persona,
  context,
  className,
}: {
  persona: ViewingAs | null;
  /** e.g. "Trustline app", "CityStay website", "Verifier console" */
  context: string;
  className?: string;
}) {
  const tone = persona ? TONES[persona.tone] : "bg-subtle text-ink-2 border-line";
  return (
    <div className={cn("border-b font-sans", tone, className)}>
      <div className="mx-auto flex min-h-10 max-w-[1200px] items-center justify-between gap-3 px-4 py-1.5 text-[12.5px] sm:px-6 lg:px-10">
        {/* The bracket explains who you are looking at, so it wraps rather than being cut off. */}
        <p className="min-w-0 leading-snug">
          <span className="font-semibold uppercase tracking-[0.1em] opacity-70">Demo · </span>
          {persona ? (
            <>
              Viewing as <span className="font-semibold">{persona.name}</span>
              <span className="opacity-80"> ({persona.role})</span>
              <span className="hidden opacity-70 lg:inline"> · {context}</span>
            </>
          ) : (
            <>
              Not signed in <span className="opacity-70">· {context}</span>
            </>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Link href="/demo" className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 font-medium hover:bg-black/5">
            <BookOpen className="size-3.5" /> <span className="hidden sm:inline">Guide</span>
          </Link>
          <button
            onClick={() => window.dispatchEvent(new Event(DEMO_EVENT))}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 font-medium hover:bg-black/5"
          >
            <ArrowLeftRight className="size-3.5" /> Switch
          </button>
        </div>
      </div>
    </div>
  );
}
