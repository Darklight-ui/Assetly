import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canManage, getContext } from "@/lib/organization";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable(),
});

export async function GET() {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;

  const categories = await prisma.assetCategory.findMany({
    where: { organizationId: ctx.organization.id },
    include: { _count: { select: { assets: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;
  if (!canManage(ctx.membership.role)) {
    return NextResponse.json({ error: "You do not have permission to manage categories." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid category." }, { status: 400 });
  }

  try {
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.assetCategory.create({
        data: {
          organizationId: ctx.organization.id,
          name: parsed.data.name,
          description: parsed.data.description || null,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          actorId: ctx.userId,
          action: "CREATE",
          entityType: "ASSET_CATEGORY",
          entityId: created.id,
          changes: { after: { name: created.name, description: created.description } },
        },
      });
      return created;
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "A category with this name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to save category." }, { status: 500 });
  }
}
