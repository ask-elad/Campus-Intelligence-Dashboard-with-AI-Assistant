import type Groq from "groq-sdk";

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

const SYSTEM_PROMPT =
  "You are a helpful campus assistant for IIT Roorkee. Use the available tools to answer questions about events, cafeteria menus, the library, and academics. Only answer from tool results — don't invent information.";

// sessionId -> full message history for that conversation
const sessions = new Map<string, Message[]>();

/**
 * Returns the message history for a session, creating a fresh one
 * (seeded with the system prompt) if this sessionId hasn't been seen yet.
 * Returns the actual array reference — callers mutate it directly,
 * and those mutations persist in the Map automatically.
 */
export function getSession(sessionId: string): Message[] {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, [{ role: "system", content: SYSTEM_PROMPT }]);
  }
  return sessions.get(sessionId)!;
}