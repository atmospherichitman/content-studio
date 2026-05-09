import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET() {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `You are a content strategist for @dum6downai — an Instagram/Facebook page that teaches everyday people how to use AI tools and make money with AI. The creator is a Tesla Autopilot Engineer who explains things simply.

Generate 6 trending content topic ideas that would perform well RIGHT NOW in the AI/make-money niche on Instagram and Facebook. Focus on:
- Specific AI tools people are talking about
- Ways to make money with AI (side hustles, freelancing, products)
- AI news that affects everyday people
- "I tried X AI tool for 30 days" style content

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{"trends":[{"title":"Topic title here","hook":"Opening line to grab attention (under 15 words)","why":"One sentence on why this is trending now"}]}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0].message.content || "{}";
  const parsed = JSON.parse(text);
  return NextResponse.json(parsed);
}
