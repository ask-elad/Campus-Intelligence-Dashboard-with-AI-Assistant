import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "What's for lunch today?",
  "Any club events this week?",
  "Is the library open now?",
  "When's the next holiday?",
];

export function AskBar({ onAsk }: { onAsk: (message: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <div className="corner-ticks rounded-xl border border-border bg-surface p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onAsk(value);
        }}
        className="flex items-center gap-3 rounded-full border border-border-soft bg-surface-raised py-1.5 pr-1.5 pl-5"
      >
        <Sparkles className="size-4 shrink-0 text-brass" strokeWidth={1.75} />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask about courses, the library, events..."
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brass text-bg transition-opacity disabled:opacity-40"
        >
          <ArrowUp className="size-4" strokeWidth={2.25} />
        </button>
      </form>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onAsk(s)}
            className="rounded-full border border-border-soft px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-brass-dim hover:text-brass"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
