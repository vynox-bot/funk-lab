import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, key, bpm, instrument, style, customStyle, bars, genre, customGenre, title, published } = await req.json();

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 503 });
  }

  let prompt = "";
  let durationSeconds = 3;

  if (type === "oneshot") {
    const effectiveStyle = (customStyle && String(customStyle).trim()) ? String(customStyle).trim() : (style ?? "punchy");
    prompt = `A ${effectiveStyle} ${instrument ?? "kick drum"} oneshot sample${key ? ` in the key of ${key}` : ""}${bpm ? ` at ${bpm} BPM` : ""}. High quality, isolated hit, dry, no reverb, no tail.`;
    durationSeconds = 3;
  } else if (type === "loop") {
    const effectiveGenre = (customGenre && String(customGenre).trim()) ? String(customGenre).trim() : (genre ?? "hip-hop");
    const barsNum = Number(bars) || 4;
    const bpmNum = Number(bpm) || 120;
    const secondsPerBar = (60 / bpmNum) * 4;
    durationSeconds = Math.min(Math.max(secondsPerBar * barsNum * 1.05, 2), 22);
    prompt = `A ${effectiveGenre} ${barsNum}-bar loop${key ? ` in the key of ${key}` : ""}${bpm ? ` at ${bpm} BPM` : ""}. Rhythmic groove, seamlessly loopable, high quality production.`;
  } else {
    return NextResponse.json({ error: "Invalid type. Use oneshot or loop" }, { status: 400 });
  }

  const elevenRes = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: prompt.slice(0, 500),
      duration_seconds: parseFloat(durationSeconds.toFixed(2)),
      prompt_influence: 0.3,
    }),
  });

  if (!elevenRes.ok) {
    const err = await elevenRes.text();
    return NextResponse.json({ error: `Sound generation failed: ${err}` }, { status: 500 });
  }

  const audioBuffer = await elevenRes.arrayBuffer();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const bucket = process.env.SUPABASE_BUCKET ?? "funk-lab";

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const filename = `generated/${type}-${session.user.id}-${Date.now()}.mp3`;
  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${filename}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "audio/mpeg",
      "x-upsert": "true",
    },
    body: new Uint8Array(audioBuffer),
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return NextResponse.json({ error: `Storage upload failed: ${err}` }, { status: 500 });
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;

  const track = await prisma.track.create({
    data: {
      title: title.slice(0, 100),
      description: prompt,
      category: "sample",
      audioUrl: publicUrl,
      duration: parseFloat(durationSeconds.toFixed(2)),
      aiGenerated: true,
      published: published !== false,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ track, audioUrl: publicUrl });
}
