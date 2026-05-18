import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.like.findUnique({
    where: { userId_trackId: { userId: session.user.id, trackId: id } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    const count = await prisma.like.count({ where: { trackId: id } });
    return NextResponse.json({ liked: false, count });
  } else {
    const [, track] = await prisma.$transaction([
      prisma.like.create({ data: { userId: session.user.id, trackId: id } }),
      prisma.track.findUnique({ where: { id }, select: { userId: true } }),
    ]);
    // Notify track owner (not self)
    if (track && track.userId !== session.user.id) {
      await prisma.notification.create({
        data: { type: "like", recipientId: track.userId, actorId: session.user.id, trackId: id },
      });
    }
    const count = await prisma.like.count({ where: { trackId: id } });
    return NextResponse.json({ liked: true, count });
  }
}
