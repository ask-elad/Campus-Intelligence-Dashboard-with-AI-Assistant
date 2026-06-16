import { Response } from "express";
import OpenAI from "openai";
import { llmClient, LLM_MODEL, buildSystemPrompt } from "../llm/provider.js";
import { callTool, serverStatuses, toolOwnerMap } from "../mcpClients/manager.js";

function sseWrite(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function buildToolsForLLM(): OpenAI.Chat.Completions.ChatCompletionTool[] {

  return []; 
}

// ---- Main agent loop ----
export async function runAgentLoop(
  userMessage: string,
  res: Response,
  studentProfile?: { name: string; id: string; branch: string; year: string }
): Promise<void> {
  const { clients } = await import("../mcpClients/manager.js");
  const allTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];

  for (const [serverName, client] of clients.entries()) {
    try {
      const { tools } = await client.listTools();
      for (const tool of tools) {
        allTools.push({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description || "",
            parameters: (tool.inputSchema as Record<string, unknown>) || { type: "object", properties: {} }
          }
        });
      }
    } catch {
    }
  }

  const systemPrompt = buildSystemPrompt(studentProfile);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ];

  const MAX_ITERATIONS = 8;
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await llmClient.chat.completions.create({
        model: LLM_MODEL,
        messages,
        tools: allTools.length > 0 ? allTools : undefined,
        tool_choice: allTools.length > 0 ? "auto" : undefined,
        temperature: 0.3,
        max_tokens: 2048
      });
    } catch (err: any) {
      sseWrite(res, "error", { message: `LLM error: ${err?.message || "Unknown error"}` });
      return;
    }

    const choice = response.choices[0];
    if (!choice) {
      sseWrite(res, "error", { message: "LLM returned no choices." });
      return;
    }

    const assistantMessage = choice.message;

    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      const finalText = assistantMessage.content || "";

      const words = finalText.split(" ");
      const CHUNK_SIZE = 6;
      for (let i = 0; i < words.length; i += CHUNK_SIZE) {
        const chunk = words.slice(i, i + CHUNK_SIZE).join(" ") + (i + CHUNK_SIZE < words.length ? " " : "");
        sseWrite(res, "text", { content: chunk });
        await new Promise(r => setTimeout(r, 20));
      }

      sseWrite(res, "done", {});
      return;
    }

    messages.push({ role: "assistant", content: assistantMessage.content || null, tool_calls: assistantMessage.tool_calls });

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      let toolArgs: Record<string, unknown> = {};
      try {
        toolArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
      }

      sseWrite(res, "tool_call_start", {
        toolCallId: toolCall.id,
        toolName,
        args: toolArgs,
        server: toolOwnerMap.get(toolName) || "unknown"
      });

      let toolResultContent: string;
      try {
        const result = await callTool(toolName, toolArgs);
        toolResultContent = JSON.stringify(result);
        sseWrite(res, "tool_call_end", {
          toolCallId: toolCall.id,
          toolName,
          success: true,
          resultSummary: toolResultContent.slice(0, 200)
        });
      } catch (err: any) {
        toolResultContent = JSON.stringify({ error: err?.message || "Tool call failed" });
        sseWrite(res, "tool_call_end", {
          toolCallId: toolCall.id,
          toolName,
          success: false,
          error: err?.message
        });
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResultContent
      });
    }
  }

  sseWrite(res, "error", { message: "Reached maximum tool-call iterations. Please try rephrasing your question." });
}
