"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  FileBadge2,
  Home,
  Inbox,
  LockKeyhole,
  Settings,
  Store,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/layout/logo";
import type { ViewingAs } from "@/lib/demo/personas";
import { DemoSwitcher } from "./demo-switcher";
import { PersonaBar } from "./persona-bar";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const MAIN: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/credentials", label: "Credentials", icon: FileBadge2 },
  { href: "/requests", label: "Requests", icon: Inbox },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/privacy", label: "Privacy", icon: LockKeyhole },
];

const MOBILE: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/credentials", label: "Credentials", icon: FileBadge2 },
  { href: "/requests", label: "Requests", icon: Inbox },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#e9e7f7] text-[14px] font-semibold text-[#3440b8]"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function AppShell({
  user,
  pendingCount,
  demoMode,
  persona,
  children,
}: {
  user: { displayName: string; trustlineId: string };
  pendingCount: number;
  demoMode: boolean;
  persona: ViewingAs | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-canvas px-4 pb-4 pt-6 lg:flex">
        <Logo href="/dashboard" className="px-3" />
        <nav className="mt-10 flex flex-col gap-1" aria-label="Main">
          {MAIN.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium transition-colors",
                  active ? "text-ink" : "text-muted hover:bg-subtle hover:text-ink",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl border border-line bg-surface shadow-card"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                ) : null}
                <Icon className="relative size-[18px]" />
                <span className="relative">{item.label}</span>
                {item.href === "/requests" && pendingCount > 0 ? (
                  <span className="relative ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">
                    {pendingCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-2xl border border-line bg-surface p-3 shadow-card">
          <Link href="/marketplace" className="flex items-center gap-3 rounded-xl p-1 text-[13.5px] text-ink-2 hover:text-ink">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-subtle">
              <Store className="size-[18px]" />
            </span>
            <span>
              <span className="block font-medium text-ink">OneCity</span>
              <span className="text-[12px] text-muted">Demo marketplace</span>
            </span>
          </Link>
        </div>

        <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-subtle",
              isActive(pathname, "/profile") && "bg-surface shadow-card ring-1 ring-line",
            )}
          >
            <Avatar name={user.displayName} />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-medium text-ink">{user.displayName}</span>
              <span className="block font-mono text-[12px] text-muted">{user.trustlineId}</span>
            </span>
          </Link>
          <Link
            href="/settings"
            className={cn(
              "flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-muted transition-colors hover:bg-subtle hover:text-ink",
              isActive(pathname, "/settings") && "text-ink",
            )}
          >
            <Settings className="size-[18px]" /> Settings
          </Link>
        </div>
      </aside>

      {demoMode ? (
        <div className="lg:pl-[248px]">
          <PersonaBar persona={persona} context="Trustline app (their own reputation wallet)" />
        </div>
      ) : null}

      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo href="/dashboard" size={26} />
          <div className="flex items-center gap-1">
            <Link
              href="/requests"
              aria-label={pendingCount > 0 ? `${pendingCount} pending requests` : "Requests"}
              className="relative inline-flex size-11 items-center justify-center rounded-full text-ink-2 hover:bg-subtle"
            >
              <Bell className="size-[20px]" />
              {pendingCount > 0 ? (
                <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full border-2 border-canvas bg-accent" />
              ) : null}
            </Link>
            <Link href="/settings" aria-label="Settings" className="inline-flex size-11 items-center justify-center">
              <Avatar name={user.displayName} size={32} />
            </Link>
          </div>
        </div>
      </header>

      <main className="pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-16 lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid h-[68px] max-w-3xl grid-cols-5 px-1">
          {MOBILE.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center gap-1"
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  {active ? (
                    <motion.span
                      layoutId="bottom-active"
                      className="absolute -inset-x-3.5 -inset-y-1 rounded-full bg-accent-soft"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  ) : null}
                  <Icon className={cn("relative size-[21px]", active ? "text-accent-strong" : "text-muted")} />
                  {item.href === "/requests" && pendingCount > 0 ? (
                    <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                      {pendingCount}
                    </span>
                  ) : null}
                </span>
                <span className={cn("text-[11px] font-medium", active ? "text-ink" : "text-muted")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {demoMode ? <DemoSwitcher /> : null}
    </div>
  );
}
