import { cn } from "@/lib/utils";
import { DEMO_PROFILE } from "@/config/profile";

export function TopBar({
  view,
  onViewChange,
}: {
  view: "dashboard" | "assistant";
  onViewChange: (v: "dashboard" | "assistant") => void;
}) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-soft px-8">
      <span className="font-data text-xs text-ink-faint">{today}</span>

      <div className="flex items-center gap-1 rounded-full border border-border-soft bg-surface-raised p-1">
        <button
          onClick={() => onViewChange("dashboard")}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
            view === "dashboard" ? "bg-brass text-bg" : "text-ink-muted hover:text-ink"
          )}
        >
          Dashboard
        </button>
        <button
          onClick={() => onViewChange("assistant")}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
            view === "assistant" ? "bg-brass text-bg" : "text-ink-muted hover:text-ink"
          )}
        >
          AI Assistant
        </button>
      </div>

      <span className="text-xs text-ink-muted">
        Welcome, <span className="font-medium text-ink">{DEMO_PROFILE.name.split(" ")[0]}</span>
      </span>
    </header>
  );
}
