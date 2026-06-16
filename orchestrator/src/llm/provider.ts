import OpenAI from "openai";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const MODEL = process.env.LLM_MODEL || "llama-3.3-70b-versatile";

if (!GROQ_API_KEY) {
  console.error("[LLM] FATAL: GROQ_API_KEY is not set in environment variables.");
  process.exit(1);
}

export const llmClient = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: GROQ_BASE_URL
});

export const LLM_MODEL = MODEL;

export const SYSTEM_PROMPT = `You are Campus Pulse AI — an intelligent assistant embedded in the IIT Roorkee campus dashboard.

You have access to four real-time data tools:
- **Library tools**: Search books, check availability, get hours, see borrowed books
- **Cafeteria tools**: Today's menu, weekly menu, campus eateries, mess timings
- **Events tools**: Upcoming club events, annual fests (Thomso, Cognizance, Sangram), search events
- **Academics tools**: Academic calendar, holidays, branch cutoffs, handbook rules, grading policy

Your behaviour:
- Always use tools to fetch live data before answering questions about campus resources.
- Provide concise, helpful answers. Use bullet points for lists.
- If data isn't available for a query, say so clearly and suggest alternatives.
- Respond in a friendly, student-centric tone.
- Do not make up information. Only report what the tools return.
- If the student profile is provided, personalise responses (e.g., use their name, filter borrowed books by their ID).
`;

export function buildSystemPrompt(studentProfile?: {
  name: string;
  id: string;
  branch: string;
  year: string;
}): string {
  if (!studentProfile) return SYSTEM_PROMPT;

  return (
    SYSTEM_PROMPT +
    `\n\nCurrent student context:\n` +
    `- Name: ${studentProfile.name}\n` +
    `- Student ID: ${studentProfile.id}\n` +
    `- Branch: ${studentProfile.branch}\n` +
    `- Year: ${studentProfile.year}\n`
  );
}
