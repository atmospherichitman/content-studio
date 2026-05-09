import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const AVATAR_ID = "6cdb02b951fe481cbf448a82bc714c18";
const VOICE_ID = "69f83cf18dba4061ab7dd5dd4a32d865";

export async function POST(req: Request) {
  const { script } = await req.json();

  if (!HEYGEN_API_KEY) {
    return NextResponse.json({ error: "HEYGEN_API_KEY not set" }, { status: 500 });
  }

  const res = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: {
      "X-Api-Key": HEYGEN_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: AVATAR_ID,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: script,
            voice_id: VOICE_ID,
            speed: 1.0,
          },
        },
      ],
      dimension: { width: 1080, height: 1920 },
      aspect_ratio: "9:16",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data }, { status: res.status });
  }

  return NextResponse.json({ videoId: data.data?.video_id, status: "processing" });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("id");

  if (!videoId || !HEYGEN_API_KEY) {
    return NextResponse.json({ error: "Missing video ID or API key" }, { status: 400 });
  }

  const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
    headers: { "X-Api-Key": HEYGEN_API_KEY },
  });

  const data = await res.json();
  return NextResponse.json(data.data || data);
}
