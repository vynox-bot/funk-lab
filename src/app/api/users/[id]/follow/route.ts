import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: targetId } = await params;

  if (session.user.id === targetId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: targetId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({
      data: { followerId: session.user.id, followingId: targetId },
    });
    await prisma.notification.create({
      data: { type: "follow", recipientId: targetId, actorId: session.user.id },
    });
  }

  const followerCount = await prisma.follow.count({ where: { followingId: targetId } });

  return NextResponse.json({ following: !existing, followerCount });
}
