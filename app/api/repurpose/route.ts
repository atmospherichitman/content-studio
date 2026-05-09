import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { script } = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `You are repurposing a video script for @dum6downai (Antwon Randolph - Tesla engineer who teaches everyday people how to use AI and make money with it. Calm professor style. Plain English. No hype.).

Original script:
${script}

Create repurposed versions. Rules:
- NO em dashes (use plain hyphens or split sentences)
- NO AI cliches: game-changer, revolutionary, unlock, dive in, leverage
- Match Antwon's calm, direct voice
- Instagram: max 2200 chars, use line breaks, 5-8 relevant hashtags at end
- Facebook: conversational, slightly longer, no hashtags needed, feels personal
- X thread: 4-5 tweets, each under 280 chars, numbered (1/5 etc), punchy

Return ONLY valid JSON:
{"instagram":"caption here","facebook":"post here","xthread":["tweet 1","tweet 2","tweet 3","tweet 4","tweet 5"]}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0].message.content || "{}";
  return NextResponse.json(JSON.parse(text));
}
