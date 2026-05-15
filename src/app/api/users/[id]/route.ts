import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      bio: true,
      createdAt: true,
      _count: { select: { tracks: true, likes: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id || session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, bio } = await req.json();

  const sanitizedName = name ? String(name).slice(0, 50).replace(/[<>]/g, "") : undefined;
  const sanitizedBio = bio ? String(bio).slice(0, 500).replace(/[<>]/g, "") : undefined;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(sanitizedName ? { name: sanitizedName } : {}),
      ...(sanitizedBio !== undefined ? { bio: sanitizedBio } : {}),
    },
    select: { id: true, name: true, bio: true },
  });

  return NextResponse.json(user);
}
