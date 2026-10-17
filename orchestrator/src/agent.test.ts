import { describe, it, expect, vi, beforeEach } from "vitest";

type Chunk = {
  choices: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
};

function makeStream(chunks: Chunk[]): AsyncIterable<Chunk> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const c of chunks) yield c;
    },
  };
}

/**
 * Each item in `responses` becomes one streamed completion in sequence.
 * The agent loop may call .create() multiple times (once per iteration).
 */
function makeGroqMock(responses: Chunk[][]) {
  let i = 0;
  return {
    chat: {
      completions: {
        create: vi.fn(async () => {
          const chunks = responses[i] ?? [];
          i += 1;
          return makeStream(chunks);
        }),
      },
    },
  };
}

const groqMockState: { client: ReturnType<typeof makeGroqMock> } = {
  client: makeGroqMock([]),
};
const mcpMockState: { impl: (name: string, args: Record<string, unknown>) => Promise<string> } = {
  impl: async () => "default-mcp-result",
};

vi.mock("./llm/groq.js", () => ({
  createGroqClient: () => groqMockState.client,
  buildGroqTools: () => [],
  GROQ_MODEL: "mock-model",
}));

vi.mock("./mcp/clients.js", () => ({
  callMcpTool: (name: string, args: Record<string, unknown>) => mcpMockState.impl(name, args),
}));

// Imported after mocks are registered.
const { runAgentLoopStreaming } = await import("./agent.js");

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const ev of gen) out.push(ev);
  return out;
}

describe("runAgentLoopStreaming", () => {
  beforeEach(() => {
    mcpMockState.impl = async () => "default-mcp-result";
  });

  it("reassembles tool-call arguments streamed across multiple chunks", async () => {
    // Chunks split the id, name, and arguments across the stream.
    const toolCallChunks: Chunk[] = [
      {
        choices: [
          { delta: { tool_calls: [{ index: 0, id: "call_1" }] }, finish_reason: null },
        ],
      },
      {
        choices: [
          { delta: { tool_calls: [{ index: 0, function: { name: "get_" } }] }, finish_reason: null },
        ],
      },
      {
        choices: [
          {
            delta: { tool_calls: [{ index: 0, function: { name: "menu" } }] },
            finish_reason: null,
          },
        ],
      },
      {
        choices: [
          {
            delta: { tool_calls: [{ index: 0, function: { arguments: '{"da' } }] },
            finish_reason: null,
          },
        ],
      },
      {
        choices: [
          {
            delta: { tool_calls: [{ index: 0, function: { arguments: 'y":"mon"}' } }] },
            finish_reason: "tool_calls",
          },
        ],
      },
    ];
    // Second iteration: final answer with no tool calls.
    const finalChunks: Chunk[] = [
      { choices: [{ delta: { content: "Here is the menu." }, finish_reason: "stop" }] },
    ];

    groqMockState.client = makeGroqMock([toolCallChunks, finalChunks]);
    const receivedArgs: Array<Record<string, unknown>> = [];
    mcpMockState.impl = async (name, args) => {
      receivedArgs.push({ name, ...args });
      return "menu-result";
    };

    const events = await collect(runAgentLoopStreaming([], []));

    expect(events).toContainEqual({ type: "tool_call", toolName: "get_menu" });
    expect(events).toContainEqual({ type: "tool_result", toolName: "get_menu" });
    expect(receivedArgs).toEqual([{ name: "get_menu", day: "mon" }]);
    expect(events[events.length - 1]).toEqual({ type: "done" });
  });

  it("emits an error event when MAX_TOOL_ITERATIONS is exceeded", async () => {
    // Every iteration keeps requesting more tool calls — never finishes.
    const infiniteTool: Chunk[] = [
      {
        choices: [
          {
            delta: {
              tool_calls: [
                { index: 0, id: "x", function: { name: "noop", arguments: "{}" } },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      },
    ];
    groqMockState.client = makeGroqMock(Array.from({ length: 10 }, () => infiniteTool));

    const events = await collect(runAgentLoopStreaming([], []));

    const errEv = events.find((e) => e.type === "error");
    expect(errEv).toBeDefined();
    expect(errEv).toMatchObject({ type: "error", code: "max_iterations" });
    expect(events[events.length - 1]).toEqual({ type: "done" });
  });

  it("does not crash when tool arguments are malformed JSON", async () => {
    const malformedTool: Chunk[] = [
      {
        choices: [
          {
            delta: {
              tool_calls: [
                { index: 0, id: "y", function: { name: "noop", arguments: "{bad json" } },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      },
    ];
    const finalChunks: Chunk[] = [
      { choices: [{ delta: { content: "ok" }, finish_reason: "stop" }] },
    ];
    groqMockState.client = makeGroqMock([malformedTool, finalChunks]);

    const mcpCalls: string[] = [];
    mcpMockState.impl = async (name) => {
      mcpCalls.push(name);
      return "should-not-be-called";
    };

    const events = await collect(runAgentLoopStreaming([], []));

    expect(mcpCalls).toEqual([]); // bad args never reach the MCP server
    expect(events).toContainEqual({ type: "tool_result", toolName: "noop" });
    expect(events[events.length - 1]).toEqual({ type: "done" });
  });

  it("surfaces an MCP tool error as a tool_result event with error text", async () => {
    const toolChunks: Chunk[] = [
      {
        choices: [
          {
            delta: {
              tool_calls: [
                { index: 0, id: "z", function: { name: "noop", arguments: "{}" } },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      },
    ];
    const finalChunks: Chunk[] = [
      { choices: [{ delta: { content: "handled" }, finish_reason: "stop" }] },
    ];
    groqMockState.client = makeGroqMock([toolChunks, finalChunks]);
    mcpMockState.impl = async () => {
      throw new Error("mcp exploded");
    };

    const events = await collect(runAgentLoopStreaming([], []));

    expect(events).toContainEqual({ type: "tool_result", toolName: "noop" });
    expect(events[events.length - 1]).toEqual({ type: "done" });
  });
});
