import Groq from "groq-sdk";
import type { DiscoveredTool } from "../types.js";

export function createGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not set in .env");
  }
  return new Groq({ apiKey });
}

/**
 * Converts our internal DiscoveredTool[] (from MCP's listTools()) into
 * the exact shape Groq's chat.completions.create({ tools }) expects.
 */
export function buildGroqTools(
  discoveredTools: DiscoveredTool[]
): Groq.Chat.Completions.ChatCompletionTool[] {
  return discoveredTools.map((tool) => ({
    type: "function",
    function: {
      name: tool.toolName,
      description: tool.description,
      parameters: tool.inputSchema as Record<string, unknown>,
    },
  }));
}

export const GROQ_MODEL = "llama-3.3-70b-versatile";