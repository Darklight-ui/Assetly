import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const ACTIVE_ORG_COOKIE = "assetly_active_org";

export async function getMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { organization: true },
  });
}

export async function getActiveMembership(userId: string) {
  const store = await cookies();
  const activeOrganizationId = store.get(ACTIVE_ORG_COOKIE)?.value;

  if (activeOrganizationId) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: activeOrganizationId },
      },
      include: { organization: true },
    });
    if (membership) return membership;
  }

  return prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { organization: true },
  });
}

export async function getContext() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  const membership = await getActiveMembership(userId);
  if (!membership) return { response: NextResponse.json({ error: "No organization membership found." }, { status: 403 }) } as const;
  return { userId, membership, organization: membership.organization } as const;
}

export function canManage(role: string) {
  return ["OWNER", "ADMIN", "ASSET_MANAGER"].includes(role);
}

export function canAdminister(role: string) {
  return ["OWNER", "ADMIN"].includes(role);
}
