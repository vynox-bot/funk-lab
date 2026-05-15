import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const track = await prisma.track.findUnique({ where: { id } });
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });
  if (track.category !== "rating") {
    return NextResponse.json({ error: "This track does not accept ratings" }, { status: 400 });
  }
  if (track.userId === session.user.id) {
    return NextResponse.json({ error: "You cannot rate your own track" }, { status: 403 });
  }

  const { value, comment } = await req.json();

  if (typeof value !== "number" || value < 0.5 || value > 5 || (value * 2) % 1 !== 0) {
    return NextResponse.json({ error: "Rating must be between 0.5 and 5 in 0.5 steps" }, { status: 400 });
  }

  const sanitizedComment = comment
    ? String(comment).slice(0, 500).replace(/[<>]/g, "")
    : null;

  const existing = await prisma.rating.findUnique({
    where: { userId_trackId: { userId: session.user.id, trackId: id } },
  });

  let rating;
  if (existing) {
    rating = await prisma.rating.update({
      where: { id: existing.id },
      data: { value, comment: sanitizedComment },
      include: { user: { select: { id: true, name: true } } },
    });
  } else {
    rating = await prisma.rating.create({
      data: { value, comment: sanitizedComment, userId: session.user.id, trackId: id },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  const allRatings = await prisma.rating.findMany({ where: { trackId: id }, select: { value: true } });
  const averageRating =
    Math.round((allRatings.reduce((s, r) => s + r.value, 0) / allRatings.length) * 10) / 10;

  return NextResponse.json({ rating, averageRating, total: allRatings.length }, { status: existing ? 200 : 201 });
}
