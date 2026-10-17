import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_ORG_COOKIE } from "@/lib/organization";

const schema = z.object({ organizationId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid workspace." }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: parsed.data.organizationId,
      },
    },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of that workspace." },
      { status: 403 },
    );
  }

  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, membership.organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true, organizationId: membership.organizationId });
}
