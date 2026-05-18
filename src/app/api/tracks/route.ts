import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave",
  "audio/ogg", "audio/flac", "audio/aac", "audio/mp4", "audio/x-m4a",
]);
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
]);
const MAX_AUDIO_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const category = formData.get("category") as string | null;
    const durationRaw = formData.get("duration");
    const duration = durationRaw ? Math.round(Number(durationRaw)) : null;
    const tagsRaw = formData.get("tags") as string | null;
    let tags: string[] = [];
    if (tagsRaw) {
      try {
        const parsed = JSON.parse(tagsRaw);
        if (Array.isArray(parsed)) {
          tags = parsed.filter((t): t is string => typeof t === "string" && /^[a-z0-9-]{1,30}$/.test(t)).slice(0, 10);
        }
      } catch { /* ignore */ }
    }

    if (!title || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!["cover", "sample", "rating"].includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const sanitizedTitle = title.slice(0, 200).replace(/[<>]/g, "");
    const sanitizedDesc = description ? description.slice(0, 1000).replace(/[<>]/g, "") : null;

    let audioUrl: string | null = null;
    let imageUrl: string | null = null;

    if (category === "cover") {
      const imageFile = formData.get("image") as File | null;
      if (!imageFile) return NextResponse.json({ error: "Image required for artwork" }, { status: 400 });
      if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
      if (imageFile.size > MAX_IMAGE_SIZE) return NextResponse.json({ error: "Image too large. Max 10MB." }, { status: 400 });
      const ext = imageFile.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") ?? "jpg";
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      imageUrl = await uploadFile(buffer, `${uuidv4()}.${ext}`, "image");
    } else {
      const audioFile = formData.get("audio") as File | null;
      if (!audioFile) return NextResponse.json({ error: "Audio file required" }, { status: 400 });
      if (!ALLOWED_AUDIO_TYPES.has(audioFile.type)) return NextResponse.json({ error: "Invalid audio type" }, { status: 400 });
      if (audioFile.size > MAX_AUDIO_SIZE) return NextResponse.json({ error: "Audio too large. Max 50MB." }, { status: 400 });
      const ext = audioFile.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") ?? "mp3";
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      audioUrl = await uploadFile(buffer, `${uuidv4()}.${ext}`, "audio");
    }

    const track = await prisma.track.create({
      data: {
        title: sanitizedTitle,
        description: sanitizedDesc,
        category,
        audioUrl,
        imageUrl,
        duration: isNaN(duration!) ? null : duration,
        tags,
        userId: session.user.id,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json(track, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

const VALID_SORTS = new Set(["newest", "oldest", "plays", "likes"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search")?.trim();
  const tag = searchParams.get("tag")?.trim();
  const sort = searchParams.get("sort") ?? "newest";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(20, parseInt(searchParams.get("limit") ?? "12"));
  const userId = searchParams.get("userId");

  // Only show private tracks to the owner
  const session = userId ? await auth() : null;
  const isOwnProfile = session?.user?.id === userId;

  const orderBy =
    sort === "oldest"
      ? [{ createdAt: "asc" as const }]
      : sort === "plays"
      ? [{ plays: "desc" as const }]
      : sort === "likes"
      ? [{ likes: { _count: "desc" as const } }]
      : [{ createdAt: "desc" as const }];

  const where = {
    ...(isOwnProfile ? {} : { published: true }),
    ...(category && ["cover", "sample", "rating"].includes(category) ? { category } : {}),
    ...(userId ? { userId } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const [tracks, total] = await Promise.all([
    prisma.track.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { likes: true, comments: true, ratings: true } },
        ratings: { select: { value: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.track.count({ where }),
  ]);

  const result = tracks.map(({ ratings, ...t }) => ({
    ...t,
    averageRating:
      ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r.value, 0) / ratings.length) * 10) / 10
        : null,
  }));

  return NextResponse.json({ tracks: result, total, page, limit });
}
