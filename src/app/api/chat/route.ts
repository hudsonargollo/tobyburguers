import { NextResponse } from "next/server";
import { answerCustomer, aiEnabled, type ChatTurn } from "@/lib/ai-assistant";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Support chat endpoint. The browser sends the recent conversation (plain
// text); the assistant answers from the live catalog, store settings and
// policies (AI mode with ANTHROPIC_API_KEY, keyword/product search otherwise).
export const dynamic = "force-dynamic";
export const maxDuration = 30; // seconds — room for a tool round-trip on serverless hosts

const MAX_TURNS = 12;
const MAX_CHARS = 600;

export async function GET() {
  return NextResponse.json({ ai: aiEnabled() });
}

export async function POST(request: Request) {
  const ip = await clientIp();
  // Generous for real shoppers, protects the API bill from abuse.
  if (!rateLimit(`chat:${ip}`, 20, 10 * 60_000)) {
    return NextResponse.json(
      { reply: "You're sending messages very quickly — please wait a few minutes, or contact our team directly on /contact.", mode: "basic" },
      { status: 429 }
    );
  }

  let body: { messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const history: ChatTurn[] = raw
    .filter(
      (m): m is ChatTurn =>
        !!m &&
        typeof m === "object" &&
        ((m as ChatTurn).role === "user" || (m as ChatTurn).role === "assistant") &&
        typeof (m as ChatTurn).content === "string" &&
        (m as ChatTurn).content.trim().length > 0
    )
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }));

  // The conversation must start with the customer and end with their question.
  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Send a question" }, { status: 400 });
  }

  const result = await answerCustomer(history);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
