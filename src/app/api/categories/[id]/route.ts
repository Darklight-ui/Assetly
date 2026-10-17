import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canManage, getContext } from "@/lib/organization";

const schema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).nullable(),
  })
  .partial();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;
  if (!canManage(ctx.membership.role)) {
    return NextResponse.json({ error: "You do not have permission to manage categories." }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.assetCategory.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!before) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid category." }, { status: 400 });
  }

  try {
    const category = await prisma.$transaction(async (tx) => {
      const updated = await tx.assetCategory.update({
        where: { id },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description || null }
            : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          actorId: ctx.userId,
          action: "UPDATE",
          entityType: "ASSET_CATEGORY",
          entityId: id,
          changes: {
            before: { name: before.name, description: before.description },
            after: { name: updated.name, description: updated.description },
          },
        },
      });
      return updated;
    });
    return NextResponse.json({ category });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "A category with this name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to update category." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;
  if (!canManage(ctx.membership.role)) {
    return NextResponse.json({ error: "You do not have permission to manage categories." }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.assetCategory.findFirst({
    where: { id, organizationId: ctx.organization.id },
    include: { _count: { select: { assets: true } } },
  });
  if (!before) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        organizationId: ctx.organization.id,
        actorId: ctx.userId,
        action: "DELETE",
        entityType: "ASSET_CATEGORY",
        entityId: id,
        changes: {
          before: {
            name: before.name,
            description: before.description,
            detachedAssets: before._count.assets,
          },
        },
      },
    });
    await tx.assetCategory.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
