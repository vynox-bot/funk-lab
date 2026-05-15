import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const track = await prisma.track.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      _count: { select: { likes: true, comments: true, ratings: true } },
      likes: session?.user?.id ? { where: { userId: session.user.id } } : false,
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      ratings: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  // Increment play count (only for audio tracks)
  if (track.audioUrl) {
    await prisma.track.update({ where: { id }, data: { plays: { increment: 1 } } });
  }

  const averageRating =
    track.ratings.length > 0
      ? Math.round(
          (track.ratings.reduce((s, r) => s + r.value, 0) / track.ratings.length) * 10
        ) / 10
      : null;

  const userRating = session?.user?.id
    ? track.ratings.find((r) => r.userId === session.user?.id) ?? null
    : null;

  return NextResponse.json({ ...track, averageRating, userRating });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const track = await prisma.track.findUnique({ where: { id } });
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (track.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.track.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
