import { LayoutGrid, MessageCircle, Sun, Moon, BookOpen, Utensils, CalendarHeart, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DEMO_PROFILE } from "@/config/profile";
import type { ServerStatus } from "@/hooks/useCampusData";

const SERVERS: Array<{ key: string; label: string; icon: typeof BookOpen }> = [
  { key: "library", label: "library-mcp", icon: BookOpen },
  { key: "cafeteria", label: "cafeteria-mcp", icon: Utensils },
  { key: "events", label: "events-mcp", icon: CalendarHeart },
  { key: "academics", label: "academics-mcp", icon: GraduationCap },
];

const STATUS_DOT: Record<ServerStatus, string> = {
  online: "bg-cafeteria",
  loading: "bg-brass animate-pulse",
  offline: "bg-danger",
};

export function Sidebar({
  view,
  onViewChange,
  statuses,
}: {
  view: "dashboard" | "assistant";
  onViewChange: (v: "dashboard" | "assistant") => void;
  statuses: Record<string, ServerStatus>;
}) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border-soft bg-surface px-5 py-6">
      <div className="flex items-center gap-2.5 px-1">
        <div className="corner-ticks flex size-9 items-center justify-center rounded-lg border border-border bg-brass-soft">
          <span className="font-display text-base text-brass">C</span>
        </div>
        <div>
          <p className="font-display text-sm leading-tight font-medium text-ink">Campus Intelligence</p>
          <p className="font-data text-[0.65rem] tracking-wider text-ink-faint uppercase">IIT Roorkee</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        <button
          onClick={() => onViewChange("dashboard")}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors",
            view === "dashboard" ? "bg-brass-soft text-brass" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
          )}
        >
          <LayoutGrid className="size-4" strokeWidth={1.75} />
          Dashboard
        </button>
        <button
          onClick={() => onViewChange("assistant")}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors",
            view === "assistant" ? "bg-brass-soft text-brass" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
          )}
        >
          <MessageCircle className="size-4" strokeWidth={1.75} />
          AI Assistant
        </button>
      </nav>

      <div className="mt-9">
        <p className="font-data px-3.5 text-[0.65rem] tracking-wider text-ink-faint uppercase">MCP Servers</p>
        <div className="mt-2.5 flex flex-col gap-0.5">
          {SERVERS.map((s) => (
            <div key={s.key} className="flex items-center gap-3 rounded-lg px-3.5 py-2">
              <s.icon className="size-3.5 shrink-0 text-ink-faint" strokeWidth={1.75} />
              <span className="font-data flex-1 text-xs text-ink-muted">{s.label}</span>
              <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[statuses[s.key] ?? "loading"])} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <button
          onClick={() => setDark((d) => !d)}
          className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
        >
          {dark ? <Sun className="size-4" strokeWidth={1.75} /> : <Moon className="size-4" strokeWidth={1.75} />}
          {dark ? "Light mode" : "Dark mode"}
        </button>
        <div className="flex items-center gap-3 border-t border-border-soft px-3.5 pt-4">
          <div className="flex size-9 items-center justify-center rounded-full bg-brass-soft">
            <span className="font-data text-xs font-medium text-brass">{DEMO_PROFILE.initials}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{DEMO_PROFILE.name}</p>
            <p className="font-data truncate text-xs text-ink-faint">
              {DEMO_PROFILE.enrollment} · {DEMO_PROFILE.branchCode}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
