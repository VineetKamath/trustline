import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#16171a" />
      <circle cx="10" cy="16" r="3.2" fill="#fff" />
      <circle cx="22" cy="16" r="3.2" fill="#8d97ee" />
      <path d="M13.2 16h5.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", className, size = 28 }: { href?: string; className?: string; size?: number }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)} aria-label="Trustline home">
      <LogoMark size={size} />
      <span className="text-[17px] font-semibold tracking-[-0.03em] text-ink">Trustline</span>
    </Link>
  );
}
