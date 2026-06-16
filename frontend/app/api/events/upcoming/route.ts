import { NextRequest, NextResponse } from "next/server";
const ORCH = process.env.ORCHESTRATOR_URL || "http://localhost:4000";
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const up = ORCH + "/api/events/upcoming" + (url.search || "");
    const r = await fetch(up, { cache: "no-store" });
    const d = await r.json();
    return NextResponse.json(d, { status: r.status });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 503 }); }
}
