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
    await prisma.like.create({ data: { userId: session.user.id, trackId: id } });
    const count = await prisma.like.count({ where: { trackId: id } });
    return NextResponse.json({ liked: true, count });
  }
}
