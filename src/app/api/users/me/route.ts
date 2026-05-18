import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bio } = await req.json();
  const sanitized = bio && typeof bio === "string" ? bio.slice(0, 300).replace(/[<>]/g, "") : undefined;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { ...(sanitized !== undefined ? { bio: sanitized } : {}) },
    select: { id: true, bio: true },
  });

  return NextResponse.json(user);
}
