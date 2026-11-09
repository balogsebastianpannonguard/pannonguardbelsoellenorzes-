import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`pg-panel rounded-3xl p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && (
            <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold">
              {Icon && (
                <span className="grid size-8 place-items-center rounded-lg bg-mint/15 text-mint">
                  <Icon size={16} aria-hidden />
                </span>
              )}
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES = {
  ok: "bg-emerald-400/12 text-emerald-200 ring-emerald-300/25",
  warning: "bg-amber-400/12 text-amber-200 ring-amber-300/25",
  error: "bg-red-500/12 text-red-200 ring-red-400/25",
  info: "bg-violet/20 text-violet-bright ring-violet-bright/25",
  muted: "bg-white/6 text-white/60 ring-white/10",
} as const;

export type Tone = keyof typeof TONES;

export function Pill({ tone = "muted", children, icon: Icon }: { tone?: Tone; children: ReactNode; icon?: LucideIcon }) {
  return (
    <span
      className={`inline-flex h-fit shrink-0 items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${TONES[tone]}`}
    >
      {Icon && <Icon size={12} aria-hidden />}
      {children}
    </span>
  );
}
