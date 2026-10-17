import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function getContext() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  const membership = await prisma.membership.findFirst({ where: { userId }, orderBy: { createdAt: "asc" }, include: { organization: true } });
  if (!membership) return { response: NextResponse.json({ error: "No organization membership found." }, { status: 403 }) } as const;
  return { userId, membership, organization: membership.organization } as const;
}
export function canManage(role: string) { return ["OWNER", "ADMIN", "ASSET_MANAGER"].includes(role); }
