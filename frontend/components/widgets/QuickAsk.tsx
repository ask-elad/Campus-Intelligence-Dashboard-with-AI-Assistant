"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";

const SUGGESTIONS = [
  "What's for lunch today?",
  "Any upcoming events this week?",
  "Is the library open now?",
  "When is the next holiday?",
  "What are the branch change cutoffs?",
  "Which books are available on algorithms?",
  "What events is SDSLabs organizing?",
  "Explain the attendance policy",
];

export function QuickAsk() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggIdx, setSuggIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSuggIdx(i => (i + 1) % SUGGESTIONS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const go = () => {
    const q = query.trim() || SUGGESTIONS[suggIdx];
    if (q) router.push(`/assistant?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="quick-ask-card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ position: "relative", width: 22, height: 22 }}>
          <div className="pulse-ring" />
          <Sparkles size={14} color="var(--primary)" style={{ position: "relative", zIndex: 1 }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Ask Campus Pulse AI</span>
        <span className="badge badge-blue" style={{ marginLeft: "auto" }}>4 MCP servers</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="input"
          placeholder={SUGGESTIONS[suggIdx]}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && go()}
          style={{ background: "rgba(255,255,255,0.05)", flex: 1 }}
        />
        <button className="btn btn-primary" onClick={go} style={{ flexShrink: 0 }}>
          <ArrowRight size={14} />
          Ask
        </button>
      </div>
      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {SUGGESTIONS.slice(0, 4).map(s => (
          <button key={s} onClick={() => router.push(`/assistant?q=${encodeURIComponent(s)}`)}
            style={{ fontSize: 11, color: "var(--text-3)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              borderRadius: 6, padding: "3px 10px", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--text)"; (e.target as HTMLElement).style.borderColor = "var(--border-2)"; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--text-3)"; (e.target as HTMLElement).style.borderColor = "var(--border)"; }}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
