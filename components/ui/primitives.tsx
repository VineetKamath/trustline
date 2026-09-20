import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[20px] border border-line bg-surface shadow-card", className)} {...props} />;
}

type Tone = "neutral" | "accent" | "verified" | "caution" | "danger" | "ink";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-subtle text-ink-2 border-line",
  accent: "bg-accent-soft text-accent-strong border-accent-line",
  verified: "bg-verified-soft text-verified border-verified-line",
  caution: "bg-caution-soft text-caution border-caution-line",
  danger: "bg-danger-soft text-danger border-danger-line",
  ink: "bg-ink text-white border-ink",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-[12px] font-medium [&_svg]:size-3.5",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[11px] font-semibold uppercase tracking-[0.14em] text-faint", className)}
      {...props}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-[32px]">{title}</h1>
        {description ? <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function Mono({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("font-mono text-[12.5px] tracking-tight", className)} {...props} />;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

const monoTones: Record<string, string> = {
  indigo: "bg-[#eceefd] text-[#3440b8]",
  emerald: "bg-[#e6f3ec] text-[#16704a]",
  amber: "bg-[#fbf0dd] text-[#8e5a0c]",
  sky: "bg-[#e5f1f9] text-[#1d6389]",
  rose: "bg-[#fbe9ec] text-[#a4324a]",
  slate: "bg-[#eceef1] text-[#3d4553]",
};

export function OrgMark({
  monogram,
  tone = "slate",
  size = 40,
  className,
}: {
  monogram: string;
  tone?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[30%] font-semibold tracking-tight",
        monoTones[tone] ?? monoTones.slate,
        className,
      )}
    >
      {monogram}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[20px] border border-dashed border-line-strong px-6 py-12 text-center">
      {icon ? <div className="mb-4 text-faint [&_svg]:size-7">{icon}</div> : null}
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
