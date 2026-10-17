import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { streamChat } from "./api";
import type { ChatStreamEvent } from "./types";

/**
 * Build a `Response.body`-like ReadableStream that enqueues the given byte chunks.
 * Lets us simulate SSE frames arriving in arbitrary splits.
 */
function makeFetchResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("streamChat", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("parses complete SSE frames arriving in one chunk", async () => {
    const payload =
      `data: ${JSON.stringify({ type: "token", text: "hello" })}\n\n` +
      `data: ${JSON.stringify({ type: "done" })}\n\n`;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeFetchResponse([payload]));

    const events: ChatStreamEvent[] = [];
    await streamChat({ sessionId: "s", message: "m" }, (e) => events.push(e));

    expect(events).toEqual([
      { type: "token", text: "hello" },
      { type: "done" },
    ]);
  });

  it("handles SSE frames split across arbitrary byte boundaries", async () => {
    const frame1 = `data: ${JSON.stringify({ type: "token", text: "ab" })}\n\n`;
    const frame2 = `data: ${JSON.stringify({ type: "token", text: "cd" })}\n\n`;
    const whole = frame1 + frame2;
    // Split at an awkward offset partway through frame1.
    const splitAt = frame1.length - 5;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeFetchResponse([whole.slice(0, splitAt), whole.slice(splitAt)])
    );

    const events: ChatStreamEvent[] = [];
    await streamChat({ sessionId: "s", message: "m" }, (e) => events.push(e));

    expect(events).toEqual([
      { type: "token", text: "ab" },
      { type: "token", text: "cd" },
    ]);
  });

  it("ignores malformed JSON frames without throwing", async () => {
    const payload =
      `data: not-json\n\n` + `data: ${JSON.stringify({ type: "done" })}\n\n`;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeFetchResponse([payload]));

    const events: ChatStreamEvent[] = [];
    await expect(
      streamChat({ sessionId: "s", message: "m" }, (e) => events.push(e))
    ).resolves.toBeUndefined();
    expect(events).toEqual([{ type: "done" }]);
  });

  it("throws on non-ok HTTP response", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("nope", { status: 400 })
    );

    await expect(
      streamChat({ sessionId: "s", message: "m" }, () => {})
    ).rejects.toThrow(/Chat request failed/);
  });
});
