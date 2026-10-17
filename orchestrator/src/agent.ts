import type Groq from "groq-sdk";
import { createGroqClient, buildGroqTools, GROQ_MODEL } from "./llm/groq.js";
import { callMcpTool as callMcpToolRaw } from "./mcp/clients.js";
import type { DiscoveredTool } from "./types.js";

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

const MAX_TOOL_ITERATIONS = 5;

async function callMcpTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  try {
    const text = await callMcpToolRaw(toolName, args);
    return text || "(tool returned no text content)";
  } catch (err) {
    return `Error calling tool "${toolName}": ${(err as Error).message}`;
  }
}

function parseToolArgs(
  raw: string | undefined
): { ok: true; args: Record<string, unknown> } | { ok: false; error: string } {
  if (!raw) return { ok: true, args: {} };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ok: true, args: parsed as Record<string, unknown> };
    }
    return { ok: false, error: "tool arguments must be a JSON object" };
  } catch (err) {
    return { ok: false, error: `invalid JSON in tool arguments: ${(err as Error).message}` };
  }
}

export async function runAgentLoop(
  userMessage: string,
  allTools: DiscoveredTool[]
): Promise<string> {
  const groq = createGroqClient();
  const groqTools = buildGroqTools(allTools);

  const messages: Message[] = [
    {
      role: "system",
      content:
        "You are a helpful campus assistant for IIT Roorkee. Use the available tools to answer questions about events, cafeteria menus, the library, and academics. Only answer from tool results — don't invent information.",
    },
    { role: "user", content: userMessage },
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      tools: groqTools,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0]?.message;
    if (!responseMessage) {
      throw new Error("Groq returned no message");
    }

    messages.push(responseMessage);

    const toolCalls = responseMessage.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return responseMessage.content ?? "";
    }

    for (const toolCall of toolCalls) {
      const parsed = parseToolArgs(toolCall.function.arguments);
      const resultText = parsed.ok
        ? await callMcpTool(toolCall.function.name, parsed.args)
        : `Error: ${parsed.error}`;

      messages.push({
        role: "tool",
        content: resultText,
        tool_call_id: toolCall.id,
      });
    }
  }

  return "Sorry, I wasn't able to complete this request after several tool calls.";
}

export type AgentEvent =
  | { type: "token"; text: string }
  | { type: "tool_call"; toolName: string }
  | { type: "tool_result"; toolName: string }
  | { type: "error"; code: string; message: string }
  | { type: "done" };

export async function* runAgentLoopStreaming(
  messages: Message[],
  allTools: DiscoveredTool[]
): AsyncGenerator<AgentEvent> {
  const groq = createGroqClient();
  const groqTools = buildGroqTools(allTools);

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      tools: groqTools,
      tool_choice: "auto",
      stream: true,
    });

    let content = "";
    type ToolCallAccumulatorEntry = { id: string; name: string; arguments: string };
    const toolCallAccumulator: Record<number, ToolCallAccumulatorEntry> = {};
    let finishReason: string | null = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        content += delta.content;
        yield { type: "token", text: delta.content };
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallAccumulator[idx]) {
            toolCallAccumulator[idx] = { id: "", name: "", arguments: "" };
          }
          if (tc.id) toolCallAccumulator[idx].id = tc.id;
          if (tc.function?.name) toolCallAccumulator[idx].name += tc.function.name;
          if (tc.function?.arguments) toolCallAccumulator[idx].arguments += tc.function.arguments;
        }
      }

      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason;
      }
    }

    const toolCallsArray = Object.values(toolCallAccumulator);

    if (toolCallsArray.length > 0 && finishReason === "tool_calls") {
      messages.push({
        role: "assistant",
        content: content || null,
        tool_calls: toolCallsArray.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.arguments },
        })),
      } as Message);

      for (const tc of toolCallsArray) {
        yield { type: "tool_call", toolName: tc.name };
        const parsed = parseToolArgs(tc.arguments);
        const resultText = parsed.ok
          ? await callMcpTool(tc.name, parsed.args)
          : `Error: ${parsed.error}`;
        yield { type: "tool_result", toolName: tc.name };

        messages.push({
          role: "tool",
          content: resultText,
          tool_call_id: tc.id,
        });
      }
      continue;
    }

    messages.push({ role: "assistant", content });
    yield { type: "done" };
    return;
  }

  yield {
    type: "error",
    code: "max_iterations",
    message: `Reached the tool-call limit (${MAX_TOOL_ITERATIONS}) without a final answer.`,
  };
  yield { type: "done" };
}
