"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import { Send, Bot, User, Zap, ChevronDown, ChevronUp, Loader } from "lucide-react";

interface ToolEvent { toolCallId: string; toolName: string; args?: Record<string, unknown>; success?: boolean; resultSummary?: string; error?: string; server?: string; }
interface Message {
  role: "user" | "assistant";
  content: string;
  toolEvents?: ToolEvent[];
  streaming?: boolean;
}

const STARTERS = [
  "What's for dinner tonight?",
  "Which library books on machine learning are available?",
  "List all upcoming events in the next 2 weeks",
  "What is the grading system at IIT Roorkee?",
  "When is the next gazetted holiday?",
  "Tell me about Thomso festival",
  "What are the branch change CPI cutoffs?",
  "Am I following all the attendance rules?",
];

function AssistantInner() {
  const { profile } = useApp();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) { setInput(q); setTimeout(() => sendMessage(q), 100); }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;
    setInput("");
    const userMsg: Message = { role: "user", content };
    const assistantMsg: Message = { role: "assistant", content: "", toolEvents: [], streaming: true };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, studentProfile: profile })
      });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7).trim();
            const dataLine = lines[lines.indexOf(line) + 1];
            if (!dataLine?.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(dataLine.slice(6));
              setMessages(prev => {
                const msgs = [...prev];
                const last = { ...msgs[msgs.length - 1] };
                if (eventType === "text") last.content += data.content;
                else if (eventType === "tool_call_start") {
                  last.toolEvents = [...(last.toolEvents || []), { toolCallId: data.toolCallId, toolName: data.toolName, args: data.args, server: data.server }];
                } else if (eventType === "tool_call_end") {
                  last.toolEvents = (last.toolEvents || []).map(t =>
                    t.toolCallId === data.toolCallId ? { ...t, success: data.success, resultSummary: data.resultSummary, error: data.error } : t
                  );
                } else if (eventType === "done") {
                  last.streaming = false;
                } else if (eventType === "error") {
                  last.content += `\n\n⚠️ ${data.message}`;
                  last.streaming = false;
                }
                msgs[msgs.length - 1] = last;
                return msgs;
              });
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { role: "assistant", content: `Error: ${err.message}`, streaming: false };
        return msgs;
      });
    }
    setIsStreaming(false);
  };

  const toggleTool = (id: string) => {
    setExpandedTools(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - var(--navbar-h))" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-2)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--primary), var(--accent))",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Campus Pulse AI</div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>Library · Cafeteria · Events · Academics</div>
          </div>
          <span className={`badge ${isStreaming ? "badge-amber" : "badge-green"}`} style={{ marginLeft: "auto" }}>
            {isStreaming ? "Thinking…" : "Ready"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.length === 0 && (
          <div style={{ maxWidth: 600, margin: "40px auto 0", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, var(--primary-dim), var(--accent-dim))",
              border: "1px solid rgba(249,115,22,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Zap size={24} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>What can I help you with?</h2>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 20 }}>
              I can answer questions about the library, cafeteria menu, campus events, and academic rules — all in real time.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {STARTERS.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                    background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-2)",
                    transition: "all 0.15s" }}
                  onMouseEnter={e => { const el = e.target as HTMLElement; el.style.borderColor = "var(--border-2)"; el.style.color = "var(--text)"; }}
                  onMouseLeave={e => { const el = e.target as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-2)"; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 4 }}>
            {msg.role === "assistant" && msg.toolEvents && msg.toolEvents.length > 0 && (
              <div style={{ width: "100%", maxWidth: "85%", display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
                {msg.toolEvents.map(t => (
                  <div key={t.toolCallId}>
                    <button className="tool-card" onClick={() => toggleTool(t.toolCallId)}
                      style={{ width: "100%", cursor: "pointer", justifyContent: "space-between", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Zap size={12} color={t.success === false ? "var(--red)" : t.success ? "var(--green)" : "var(--amber)"} />
                        <code style={{ fontSize: 12, color: "var(--accent)" }}>{t.toolName}</code>
                        {t.server && <span className="badge badge-gray">{t.server}</span>}
                        {t.success === undefined && <Loader size={11} color="var(--amber)" style={{ animation: "spin 1s linear infinite" }} />}
                      </div>
                      {expandedTools.has(t.toolCallId) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {expandedTools.has(t.toolCallId) && (
                      <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderTop: "none",
                        borderRadius: "0 0 8px 8px", padding: "8px 12px", fontSize: 11, color: "var(--text-2)" }}>
                        <div style={{ marginBottom: 4 }}><strong>Args:</strong> <code>{JSON.stringify(t.args)}</code></div>
                        {t.resultSummary && <div><strong>Result preview:</strong> {t.resultSummary}…</div>}
                        {t.error && <div style={{ color: "var(--red)" }}><strong>Error:</strong> {t.error}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: msg.role === "user" ? "var(--primary-dim)" : "linear-gradient(135deg, var(--accent-dim), var(--violet-dim))",
                border: `1px solid ${msg.role === "user" ? "rgba(249,115,22,0.3)" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {msg.role === "user" ? <User size={13} color="var(--primary)" /> : <Bot size={13} color="var(--accent)" />}
              </div>
              <div className={`chat-bubble ${msg.role}`}>
                {msg.content || (msg.streaming ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : "")}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 24px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-2)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea ref={inputRef} className="input" style={{ flex: 1, resize: "none", minHeight: 44, maxHeight: 120, lineHeight: 1.5, paddingTop: 11 }}
            placeholder="Ask about library, cafeteria, events, or academics…"
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            rows={1} />
          <button className="btn btn-primary" onClick={() => sendMessage()} disabled={isStreaming || !input.trim()}
            style={{ height: 44, opacity: (isStreaming || !input.trim()) ? 0.5 : 1, flexShrink: 0 }}>
            {isStreaming ? <Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={15} />}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
          Enter to send · Shift+Enter for new line · Querying {profile.name}'s profile
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AssistantPage() {
  return <Suspense><AssistantInner /></Suspense>;
}
