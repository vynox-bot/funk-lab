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

  // Pollinations.ai — free, no API key required
  const encodedPrompt = encodeURIComponent(prompt.slice(0, 2000));
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&nologo=true&seed=${Date.now() % 99999}`;

  const imgRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(90_000) });
  if (!imgRes.ok) {
    return NextResponse.json({ error: "Image generation failed — try again" }, { status: 500 });
  }
  const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
  const imgBuffer = await imgRes.arrayBuffer();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const bucket = process.env.SUPABASE_BUCKET ?? "funk-lab";

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const filename = `generated/artwork-${session.user.id}-${Date.now()}.jpg`;
  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${filename}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType,
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
