import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BRAND_BLUEPRINT = `
WHO I AM: Antwon Randolph — Tesla Autopilot Engineer, entrepreneur, husband, father. Building a future where I don't have to grind as hard, using AI.

BRAND: @dum6downai — "Dumb Down AI" — making AI simple, useful, and accessible for everyday people who feel left behind.

TAGLINE: Stop feeling left behind by AI.

AUDIENCE: Everyday people who want to learn AI tools and make money with AI. Not tech people. Regular folks.

VOICE: Calm professor. Clear, direct, plain English. No hype. No shouting. Like a smart friend explaining something. Short sentences. Easy to follow.

DIFFERENTIATOR: I break AI down in a way that feels human. My goal isn't to impress engineers — it's to help everyday people stop feeling left behind.
`;

export async function POST(req: Request) {
  const { topic } = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `You are writing a video script for Antwon Randolph (@dum6downai). Here is his brand blueprint:

${BRAND_BLUEPRINT}

Write a 60-second video script about this topic: "${topic}"

Rules:
- Hook in the FIRST sentence (stat, bold claim, or surprising fact)
- Write exactly how Antwon talks: calm, clear, no fluff, short sentences
- NO em dashes. Use plain hyphens or split into two sentences.
- Explain it like the audience has never heard of this before
- End with a clear call to action (follow for more, comment, try it yourself)
- 150-180 words total (60 seconds at average speaking pace)
- Do NOT use "game-changer", "revolutionary", "unlock", "dive in", "leverage", or other AI cliches

Return ONLY valid JSON:
{"script":"full script text here","hook":"just the opening line","cta":"just the call to action line","wordCount":145}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0].message.content || "{}";
  return NextResponse.json(JSON.parse(text));
}
