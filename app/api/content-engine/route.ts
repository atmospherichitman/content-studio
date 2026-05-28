export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const NICHES = {
  "make-money": "making money with AI tools online",
  "ai-tools": "AI tools and productivity hacks",
  "productivity": "productivity and automation with AI",
  "side-hustle": "AI side hustles and passive income",
};

export async function POST(req: NextRequest) {
  try {
    const { action, niche, hook, script } = await req.json();
    const nicheLabel = NICHES[niche as keyof typeof NICHES] || NICHES["make-money"];

    if (action === "hooks") {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You generate viral Instagram Reel hooks about ${nicheLabel}. 
Style: pattern-interrupt, bold claims, curiosity gaps. Like MrBeast meets a finance bro.
No em dashes. No hashtags. Plain text only.
Return JSON: { "hooks": ["hook1", "hook2", "hook3"] }`,
          },
          { role: "user", content: `Give me 3 scroll-stopping hooks about ${nicheLabel}.` },
        ],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(res.choices[0].message.content || "{}");
      return NextResponse.json({ hooks: parsed.hooks || [] });
    }

    if (action === "script") {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `You write 30-second Instagram Reel scripts about ${nicheLabel}.
3-act structure:
- Hook (0-3s): bold claim or shocking stat
- Value Drop (3-25s): 3 quick actionable tips
- CTA (25-30s): "Comment X for..." or "Follow for more"
Max 60 words total. No em dashes. No hashtags. Plain text only.`,
          },
          { role: "user", content: `Write a script using this hook: "${hook}"` },
        ],
      });
      const script = res.choices[0].message.content?.trim() || "";
      return NextResponse.json({ script });
    }

    if (action === "image-prompts") {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You generate DALL-E image prompts for a Dumb Down AI (@dum6downai) Instagram Reel.
Brand style: dark background, neon orange and red accents, bold comic-book outlines, retro-futuristic.
Return JSON: { "prompts": ["prompt1", ..., "prompt10"] } - exactly 10 prompts.`,
          },
          { role: "user", content: `Script: "${script}"\n\nGenerate 10 branded image prompts.` },
        ],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(res.choices[0].message.content || "{}");
      return NextResponse.json({ prompts: parsed.prompts || [] });
    }

    if (action === "caption") {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content: `You write Instagram captions in @theaisurfer style.
Format:
- 1 bold hook line
- 3-4 value bullet lines (use emoji bullets)
- 1 CTA line ("Comment X for...")
- Line break
- 3 niche hashtags, line break, 3 audience hashtags, line break, 3 broad hashtags
No em dashes. Keep it punchy.`,
          },
          { role: "user", content: `Write a caption for this script: "${script}"` },
        ],
      });
      return NextResponse.json({ caption: res.choices[0].message.content?.trim() || "" });
    }

    if (action === "calendar") {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You create 7-day Instagram Reel content calendars about ${nicheLabel}.
Each day: topic, hook, script (60 words max), content type (tutorial/list/story/hot-take).
Return JSON: { "days": [{ "day": 1, "topic": "", "hook": "", "script": "", "type": "" }, ...] }`,
          },
          { role: "user", content: `Create a 7-day content calendar for @dum6downai about ${nicheLabel}.` },
        ],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(res.choices[0].message.content || "{}");
      return NextResponse.json({ days: parsed.days || [] });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
