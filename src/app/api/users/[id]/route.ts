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
      website: true,
      twitter: true,
      instagram: true,
      image: true,
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

  const { name, bio, website, twitter, instagram, image } = await req.json();

  const clean = (v: unknown, max: number) =>
    v && typeof v === "string" ? String(v).slice(0, max).replace(/[<>]/g, "") : undefined;

  const sanitizedWebsite = website && typeof website === "string"
    ? website.slice(0, 200).replace(/[<> "']/g, "")
    : undefined;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(clean(name, 50) ? { name: clean(name, 50) } : {}),
      bio: clean(bio, 500) ?? null,
      website: sanitizedWebsite ?? null,
      twitter: clean(twitter, 50) ?? null,
      instagram: clean(instagram, 50) ?? null,
      image: clean(image, 500) ?? null,
    },
    select: { id: true, name: true, bio: true, website: true, twitter: true, instagram: true, image: true },
  });

  return NextResponse.json(user);
}
