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

  const { content, parentId } = await req.json();
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const sanitized = content.slice(0, 500).replace(/[<>]/g, "");

  const comment = await prisma.comment.create({
    data: { content: sanitized, userId: session.user.id, trackId: id, parentId: parentId ?? null },
    include: {
      user: { select: { id: true, name: true } },
      replies: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
