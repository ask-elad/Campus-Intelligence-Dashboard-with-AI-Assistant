import type {
  AcademicsResponse,
  ChatStreamEvent,
  EateriesResponse,
  EventsResponse,
  LibraryInfo,
  LibrarySearchResponse,
  TodaysMenu,
} from "./types";

export const API_BASE_URL: string =
  (import.meta.env.VITE_ORCHESTRATOR_URL as string | undefined) ?? "http://localhost:5000";

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const api = {
  libraryInfo: (signal?: AbortSignal) => getJson<LibraryInfo>("/api/dashboard/library", signal),

  librarySearch: (query: string, signal?: AbortSignal) =>
    getJson<LibrarySearchResponse>(
      `/api/dashboard/library/search?q=${encodeURIComponent(query)}`,
      signal
    ),

  todaysMenu: (signal?: AbortSignal) => getJson<TodaysMenu>("/api/dashboard/todays-menu", signal),

  eateries: (signal?: AbortSignal) =>
    getJson<EateriesResponse>("/api/dashboard/cafeteria/eateries", signal),

  events: (signal?: AbortSignal) => getJson<EventsResponse>("/api/dashboard/events", signal),

  academics: (signal?: AbortSignal) =>
    getJson<AcademicsResponse>("/api/dashboard/academics", signal),
};

/**
 * POST /api/chat returns text/event-stream. Native EventSource only
 * supports GET, so this is streamed manually via fetch + ReadableStream,
 * parsing `data: {...}\n\n` frames as they arrive.
 */
export async function streamChat(
  body: { sessionId: string; message: string },
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flush = (chunk: string) => {
    for (const rawLine of chunk.split("\n")) {
      const line = rawLine.trimStart();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        onEvent(JSON.parse(payload) as ChatStreamEvent);
      } catch {
        // ignore malformed frames
      }
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      flush(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf("\n\n");
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) flush(buffer);
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  const key = "campus-chat-session-id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}
