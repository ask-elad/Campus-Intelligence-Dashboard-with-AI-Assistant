import type Groq from "groq-sdk";

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

const SYSTEM_PROMPT =
  "You are a helpful campus assistant for IIT Roorkee. Use the available tools to answer questions about events, cafeteria menus, the library, and academics. Only answer from tool results — don't invent information.";

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 30 * 60 * 1000);
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS ?? 1000);

interface Entry {
  messages: Message[];
  lastAccess: number;
}

const sessions = new Map<string, Entry>();

function evictExpired(now: number): void {
  for (const [id, entry] of sessions) {
    if (now - entry.lastAccess > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

function evictLruIfOverCap(): void {
  if (sessions.size <= MAX_SESSIONS) return;
  // Map iteration order is insertion order; we re-insert on access so the
  // oldest-accessed entries sit at the front and are evicted first.
  const overflow = sessions.size - MAX_SESSIONS;
  const victims: string[] = [];
  for (const id of sessions.keys()) {
    if (victims.length >= overflow) break;
    victims.push(id);
  }
  for (const id of victims) sessions.delete(id);
}

/**
 * Returns the message history for a session, creating a fresh one
 * (seeded with the system prompt) if this sessionId hasn't been seen yet.
 * Returns the actual array reference — callers mutate it directly,
 * and those mutations persist in the Map automatically.
 */
export function getSession(sessionId: string): Message[] {
  const now = Date.now();
  evictExpired(now);

  const existing = sessions.get(sessionId);
  if (existing) {
    existing.lastAccess = now;
    // Re-insert to move to the end for LRU ordering.
    sessions.delete(sessionId);
    sessions.set(sessionId, existing);
    return existing.messages;
  }

  const entry: Entry = {
    messages: [{ role: "system", content: SYSTEM_PROMPT }],
    lastAccess: now,
  };
  sessions.set(sessionId, entry);
  evictLruIfOverCap();
  return entry.messages;
}

/** Test helpers — not exported from the public barrel. */
export const __test__ = {
  reset: () => sessions.clear(),
  size: () => sessions.size,
  has: (id: string) => sessions.has(id),
};
