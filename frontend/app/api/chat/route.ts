import { NextRequest } from "next/server";

const ORCH = process.env.ORCHESTRATOR_URL || "http://localhost:4000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const upstream = await fetch(`${ORCH}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: "Orchestrator error" }), { status: 502 });
  }

  // Pipe SSE stream straight through
  const stream = upstream.body;
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
