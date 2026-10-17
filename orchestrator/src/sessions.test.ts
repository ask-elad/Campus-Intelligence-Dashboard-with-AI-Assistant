import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getSession, __test__ } from "./sessions.js";

describe("sessions", () => {
  beforeEach(() => {
    __test__.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the same array reference for repeat sessionIds", () => {
    const a = getSession("alice");
    a.push({ role: "user", content: "hi" });
    const b = getSession("alice");
    expect(b).toBe(a);
    expect(b.length).toBe(2); // system prompt + "hi"
  });

  it("creates independent histories per sessionId", () => {
    const a = getSession("alice");
    const b = getSession("bob");
    expect(a).not.toBe(b);
  });

  it("evicts a session older than SESSION_TTL_MS on the next access", () => {
    getSession("stale");
    expect(__test__.has("stale")).toBe(true);

    // Default TTL is 30 min; advance 31 min then trigger an eviction pass via a new access.
    vi.advanceTimersByTime(31 * 60 * 1000);
    getSession("fresh");

    expect(__test__.has("stale")).toBe(false);
    expect(__test__.has("fresh")).toBe(true);
  });
});
