import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAssistantAnswer } from "@/lib/assistant";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`assistant:${ip}`, 20, 60_000);

  if (!rate.allowed) {
    return NextResponse.json({ answer: "Please slow down a little before asking another question." }, { status: 429 });
  }

  const { message } = (await request.json()) as { message?: string };
  const answer = getAssistantAnswer(message ?? "");

  return NextResponse.json({ answer });
}
