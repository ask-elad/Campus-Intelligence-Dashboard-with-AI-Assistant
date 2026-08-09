import type Groq from "groq-sdk";
import { createGroqClient, buildGroqTools, GROQ_MODEL } from "./llm/groq.js";
import { toolRoutingTable } from "./mcp/clients.js";
import type { DiscoveredTool } from "./types.js";

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

const MAX_TOOL_ITERATIONS = 5;

async function callMcpTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  const client = toolRoutingTable.get(toolName);
  if (!client) {
    return `Error: no server found for tool "${toolName}"`;
  }

  try {
    const result = await client.callTool({ name: toolName, arguments: args });
    const content = result.content as Array<{ type: string; text?: string }>;
    const textParts = content.filter((c) => c.type === "text").map((c) => c.text ?? "");
    return textParts.join("\n") || "(tool returned no text content)";
  } catch (err) {
    return `Error calling tool "${toolName}": ${(err as Error).message}`;
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
      // No more tool calls requested — this is the final answer
      return responseMessage.content ?? "";
    }

    // Execute every requested tool call, feed each result back in
    for (const toolCall of toolCalls) {
      const args = JSON.parse(toolCall.function.arguments || "{}");
      const resultText = await callMcpTool(toolCall.function.name, args);

      messages.push({
        role: "tool",
        content: resultText,
        tool_call_id: toolCall.id,
      });
    }
    // loop again — Groq now sees the tool results and decides what's next
  }

  return "Sorry, I wasn't able to complete this request after several tool calls.";
}