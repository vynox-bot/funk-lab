import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { predictionId, title, lyrics, genre, pitch, tempo, bpm, customStyle, published } =
    await req.json();

  if (!predictionId || typeof predictionId !== "string") {
    return NextResponse.json({ error: "predictionId required" }, { status: 400 });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Music generation not configured" }, { status: 503 });
  }

  // Check prediction status
  const statusRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Token ${token}` },
  });

  if (!statusRes.ok) {
    const err = await statusRes.text();
    return NextResponse.json({ error: `Status check failed: ${err}` }, { status: 500 });
  }

  const prediction = await statusRes.json();

  if (prediction.status === "failed" || prediction.status === "canceled") {
    const reason = prediction.error ?? "Generation failed";
    return NextResponse.json({ status: "failed", error: reason }, { status: 500 });
  }

  if (prediction.status !== "succeeded") {
    return NextResponse.json({ status: "pending" });
  }

  // Succeeded — download audio from Replicate output URL
  const outputUrl: string | undefined = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;

  if (!outputUrl) {
    return NextResponse.json({ error: "No output URL from generation" }, { status: 500 });
  }

  const audioRes = await fetch(outputUrl);
  if (!audioRes.ok) {
    return NextResponse.json({ error: "Failed to download generated audio" }, { status: 500 });
  }
  const audioBuffer = await audioRes.arrayBuffer();

  // Upload to Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const bucket = process.env.SUPABASE_BUCKET ?? "funk-lab";

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const filename = `generated/vocal-${session.user.id}-${Date.now()}.mp3`;
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

  // Create track record
  const track = await prisma.track.create({
    data: {
      title: (title ?? "AI Vocal").slice(0, 100),
      description: `AI Song | ${genre ?? "Pop"} | ${pitch ?? "Normal"} pitch | ${tempo ?? "Medium"} tempo${bpm ? ` | ${bpm} BPM` : ""}\nLyrics: ${(lyrics ?? "").slice(0, 300)}`,
      category: "sample",
      audioUrl: publicUrl,
      aiGenerated: true,
      published: published !== false,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ status: "done", track });
}
