export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { script } = await req.json();
    if (!script) {
      return NextResponse.json({ error: "script is required" }, { status: 400 });
    }

    // Generate 10 image prompts from the script
    const promptCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            'You are a creative director specializing in comic-book and retro-futuristic visual storytelling. Given a script, generate exactly 10 vivid image prompts that visually illustrate the key moments. Each prompt should specify: bold comic-book outlines, vivid colors, retro-futuristic style, dynamic composition. Return ONLY a JSON object with this exact shape: {"prompts": ["prompt1", "prompt2", ..., "prompt10"]}',
        },
        {
          role: "user",
          content: `Generate 10 comic-book style image prompts for this script:\n\n${script}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = promptCompletion.choices[0].message.content || "{}";
    let prompts: string[] = [];
    try {
      const parsed = JSON.parse(content);
      // Try known keys first, then fall back to any array value in the object
      const candidate = parsed.prompts || parsed.images || parsed.image_prompts || parsed.scenes || parsed.list;
      if (Array.isArray(candidate)) {
        prompts = candidate.map(String);
      } else {
        // Last resort: find first array value
        const firstArray = Object.values(parsed).find(v => Array.isArray(v));
        if (firstArray) prompts = (firstArray as unknown[]).map(String);
      }
    } catch {
      return NextResponse.json({ error: "Failed to parse image prompts" }, { status: 500 });
    }

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ error: "No prompts generated", debug: "GPT returned no parseable array" }, { status: 500 });
    }

    // Limit to 10
    prompts = prompts.slice(0, 10);

    // Call DALL-E 3 for each prompt in parallel
    const imageResults = await Promise.allSettled(
      prompts.map((prompt) =>
        openai.images.generate({
          model: "dall-e-3",
          prompt: `${prompt}. Comic-book style, bold outlines, vivid retro-futuristic colors, dynamic composition.`,
          size: "1024x1024",
          style: "vivid",
          n: 1,
        })
      )
    );

    const images: string[] = [];
    for (const result of imageResults) {
      if (result.status === "fulfilled" && result.value.data?.[0]?.url) {
        images.push(result.value.data[0].url as string);
      } else {
        // Use a placeholder if one fails
        images.push("https://placehold.co/1024x1024/1a1a2e/ffffff?text=Scene");
      }
    }

    return NextResponse.json({ images });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
