import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

const DOMAIN_BADGE: Record<string, string> = {
  library: "bg-library/15 text-library",
  cafeteria: "bg-cafeteria/15 text-cafeteria",
  events: "bg-events/15 text-events",
  academics: "bg-academics/15 text-academics",
};

const STATUS_DOT: Record<string, string> = {
  online: "bg-cafeteria",
  loading: "bg-brass animate-pulse",
  offline: "bg-danger",
};

export type WidgetStatus = "loading" | "online" | "offline";

export function deriveStatus(...queries: Array<{ isPending: boolean; isError: boolean }>): WidgetStatus {
  if (queries.some((q) => q.isError)) return "offline";
  if (queries.some((q) => q.isPending)) return "loading";
  return "online";
}

export function WidgetCard({
  title,
  subtitle,
  icon: Icon,
  domain,
  status = "online",
  children,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  domain: "library" | "cafeteria" | "events" | "academics";
  status?: WidgetStatus;
  children: ReactNode;
}) {
  return (
    <section className="corner-ticks flex h-[30rem] flex-col rounded-xl border border-border bg-surface shadow-sm">
      <header className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
        <div className="flex items-center gap-3.5">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              DOMAIN_BADGE[domain]
            )}
          >
            <Icon className="size-[1.15rem]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg leading-tight font-medium text-ink">{title}</h2>
            <p className="mt-0.5 text-[0.8rem] text-ink-muted">{subtitle}</p>
          </div>
        </div>
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", STATUS_DOT[status])} />
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

export function Tabs({
  tabs,
  defaultTab,
  children,
}: {
  tabs: string[];
  defaultTab: string;
  children: (active: string) => ReactNode;
}) {
  const [active, setActive] = useState(defaultTab);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-5 border-b border-border-soft px-6">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={cn(
              "-mb-px border-b-2 py-2.5 text-sm transition-colors",
              active === t
                ? "border-brass font-medium text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">{children(active)}</div>
    </div>
  );
}

export function WidgetSkeleton() {
  return (
    <div className="space-y-3 px-6 py-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="shimmer h-14 rounded-lg" />
      ))}
    </div>
  );
}

export function WidgetError({
  onRetry,
  description = "The orchestrator didn't respond. Other widgets are unaffected.",
}: {
  onRetry: () => void;
  description?: string;
}) {
  return (
    <div className="px-6 py-5">
      <div className="flex items-start gap-3 rounded-lg border border-danger-border bg-danger-soft px-4 py-4">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Couldn't reach this service</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>
          <button
            onClick={onRetry}
            className="mt-3 flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-brass-dim hover:text-brass"
          >
            <RotateCw className="size-3" strokeWidth={2} />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ children, hints }: { children: ReactNode; hints?: string[] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="text-sm text-ink-faint">{children}</p>
      {hints && hints.length > 0 && (
        <p className="text-sm text-ink-faint">
          try{" "}
          {hints.map((h, i) => (
            <span key={h}>
              <span className="font-data rounded bg-surface-raised px-1.5 py-0.5 text-ink-muted">
                "{h}"
              </span>
              {i < hints.length - 1 ? " or " : ""}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
