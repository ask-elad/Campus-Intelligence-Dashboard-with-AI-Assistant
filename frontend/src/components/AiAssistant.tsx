import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import { streamChat, getSessionId } from "@/lib/api";
import { toolLabel } from "@/lib/tool-labels";
import { Markdown } from "./Markdown";
import type { ChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "What's for lunch today?",
  "Any club events this week?",
  "Is the library open now?",
  "When's the next holiday?",
];

export function AiAssistant({
  pendingMessage,
  onConsumedPending,
}: {
  pendingMessage: string | null;
  onConsumedPending: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(getSessionId());

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (pendingMessage) {
      void send(pendingMessage);
      onConsumedPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMessage]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed, steps: [] };
    const assistantId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      userMsg,
      { id: assistantId, role: "assistant", content: "", steps: [], streaming: true },
    ]);
    setInput("");
    setSending(true);

    try {
      await streamChat({ sessionId: sessionId.current, message: trimmed }, (event) => {
        setMessages((m) =>
          m.map((msg) => {
            if (msg.id !== assistantId) return msg;
            if (event.type === "tool_call") {
              return { ...msg, steps: [...msg.steps, toolLabel(event.toolName)] };
            }
            if (event.type === "token") {
              return { ...msg, content: msg.content + event.text };
            }
            if (event.type === "done") {
              return { ...msg, streaming: false };
            }
            if (event.type === "error") {
              return { ...msg, content: msg.content || `Something went wrong: ${event.message}`, streaming: false };
            }
            return msg;
          })
        );
      });
    } catch {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: "Couldn't reach the assistant. Is the orchestrator running?", streaming: false }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="scroll-soft min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-5 text-center">
            <Sparkles className="size-6 text-brass" strokeWidth={1.5} />
            <div>
              <h2 className="font-display text-xl font-medium text-ink">Ask anything campus</h2>
              <p className="mt-1.5 text-sm text-ink-muted">
                Courses, the library, the mess, events — one assistant, four sources.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-brass-dim hover:text-brass"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : ""}>
                {msg.role === "user" ? (
                  <div className="max-w-[85%] rounded-lg rounded-br-sm bg-surface-raised px-4 py-2.5 text-sm text-ink">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[90%]">
                    {msg.steps.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {msg.steps.map((step, i) => (
                          <span
                            key={i}
                            className="font-data rounded-full border border-border-soft bg-surface px-2.5 py-1 text-[0.65rem] text-ink-faint"
                          >
                            {step}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-sm text-ink">
                      {msg.content ? (
                        <Markdown text={msg.content} />
                      ) : msg.streaming ? (
                        <Loader2 className="size-4 animate-spin text-ink-faint" />
                      ) : null}
                      {msg.streaming && msg.content && (
                        <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-brass align-middle" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-border-soft px-4 py-4 sm:px-8"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about courses, the library, events..."
            className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex items-center gap-1 rounded-md bg-brass px-3 py-1.5 text-xs font-medium text-bg transition-opacity disabled:opacity-40"
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <CornerDownLeft className="size-3.5" />}
          </button>
        </div>
      </form>
    </div>
  );
}
