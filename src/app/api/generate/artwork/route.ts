import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, title, description } = await req.json();

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 503 });
  }

  const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt.slice(0, 4000),
      n: 1,
      size: "1024x1024",
    }),
  });

  if (!dalleRes.ok) {
    const err = await dalleRes.text();
    return NextResponse.json({ error: `Image generation failed: ${err}` }, { status: 500 });
  }

  const dalleData = await dalleRes.json();
  const tempUrl: string | undefined = dalleData.data?.[0]?.url;
  if (!tempUrl) {
    return NextResponse.json({ error: "No image returned from DALL-E" }, { status: 500 });
  }

  // Download the image then re-upload to Supabase for a permanent URL
  const imgRes = await fetch(tempUrl);
  if (!imgRes.ok) {
    return NextResponse.json({ error: "Failed to download generated image" }, { status: 500 });
  }
  const imgBuffer = await imgRes.arrayBuffer();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const bucket = process.env.SUPABASE_BUCKET ?? "funk-lab";

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const filename = `generated/artwork-${session.user.id}-${Date.now()}.png`;
  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${filename}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "image/png",
      "x-upsert": "true",
    },
    body: new Uint8Array(imgBuffer),
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return NextResponse.json({ error: `Storage upload failed: ${err}` }, { status: 500 });
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;

  const track = await prisma.track.create({
    data: {
      title: title.slice(0, 100),
      description: description ? String(description).slice(0, 500) : `AI-generated artwork: ${prompt.slice(0, 200)}`,
      category: "cover",
      imageUrl: publicUrl,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ track, imageUrl: publicUrl });
}
